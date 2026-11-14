"""Numerical checks for the SwarmEvolve engineering article (arXiv:2611.08483).

numpy-only, seeded, deterministic. Each check prints PASS/FAIL plus the number
quoted in the article. Run:  python -I scripts/swarmevolve_verify.py
"""
import numpy as np

rng = np.random.default_rng(0)
ok = True


def report(name, cond, detail=""):
    global ok
    ok &= bool(cond)
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {detail}")


# ---------------------------------------------------------------- RoPE ----
def rope_matrix(pos, dim, base=10000.0):
    """Block-diagonal 2x2 rotation R_pos (dim even)."""
    R = np.zeros((dim, dim))
    for i in range(dim // 2):
        theta = pos * base ** (-2 * i / dim)
        c, s = np.cos(theta), np.sin(theta)
        R[2 * i:2 * i + 2, 2 * i:2 * i + 2] = [[c, -s], [s, c]]
    return R


d = 64
q, k = rng.normal(size=d), rng.normal(size=d)
i, j = 7, 31
lhs = (rope_matrix(i, d) @ q) @ (rope_matrix(j, d) @ k)
rhs = q @ (rope_matrix(j - i, d) @ k)
report("Eq.1 RoPE relative property", abs(lhs - rhs) < 1e-9, f"|diff|={abs(lhs-rhs):.2e}")

# Shifting a cached block: key at pos t rotated by R_delta == key at pos t+delta
delta = 1234
errs = [np.abs(rope_matrix(delta, d) @ (rope_matrix(t, d) @ k) - rope_matrix(t + delta, d) @ k).max()
        for t in range(40)]
report("Block shift R_delta*R_t = R_{t+delta}", max(errs) < 1e-9, f"max err={max(errs):.2e}")

# -------------------------------------------------- Ridge alignment Wa ----
V, dh, lam = 3000, 48, 1e-2
W_out = rng.normal(size=(V, dh))
W_in = W_out @ rng.normal(size=(dh, dh)) * 0.3 + 0.6 * rng.normal(size=(V, dh))
Wa = W_in.T @ W_out @ np.linalg.inv(W_out.T @ W_out + lam * np.eye(dh))
# same thing via augmented least squares (ridge == lstsq on [X; sqrt(lam) I])
X = np.vstack([W_out, np.sqrt(lam) * np.eye(dh)])
Y = np.vstack([W_in, np.zeros((dh, dh))])
Wa_ls = np.linalg.lstsq(X, Y, rcond=None)[0].T
report("Eq.2 closed-form ridge == lstsq", np.allclose(Wa, Wa_ls, atol=1e-8),
       f"max err={np.abs(Wa-Wa_ls).max():.2e}")

rho = np.linalg.norm(W_in, axis=1).mean()
h = W_out[17]
e_next = Wa @ h
e_next = rho * e_next / np.linalg.norm(e_next)
cos_to_true = e_next @ W_in[17] / (np.linalg.norm(e_next) * np.linalg.norm(W_in[17]))
report("Eq.2 latent step lands near the token's input embedding", cos_to_true > 0.9,
       f"cos={cos_to_true:.3f}, |e|={np.linalg.norm(e_next):.3f} (rho={rho:.3f})")


# ---------------------------------------------------- Novelty filter ----
def novelty_filter(H, keep):
    """H: (J, T, d) last hidden states. Eq. 4-5. Returns kept indices in order."""
    hbar = H.mean(axis=1)                       # Eq. 4
    mu = hbar.mean(axis=0)
    Z = hbar - mu
    Z /= np.linalg.norm(Z, axis=1, keepdims=True)
    kept = [int(np.argmin(np.linalg.norm(hbar - mu, axis=1)))]
    min_d = 1 - Z @ Z[kept[0]]
    min_d[kept[0]] = -np.inf
    while len(kept) < keep:                     # Eq. 5 greedy farthest point
        nxt = int(np.argmax(min_d))
        kept.append(nxt)
        min_d = np.minimum(min_d, 1 - Z @ Z[nxt])
        min_d[kept] = -np.inf
    return kept


# 45 agents = 5 parent-program clusters x 9 agents, 40 latent steps, dim 32.
# Cluster sizes are unbalanced on purpose: one "redundant" cluster is very tight.
J, T, dz = 45, 40, 32
centers = rng.normal(size=(5, dz)) * 3
spreads = [0.4, 0.4, 0.4, 0.4, 0.05]   # cluster 4 = near-duplicate agents
labels = np.repeat(np.arange(5), 9)
H = np.stack([centers[c] + spreads[c] * rng.normal(size=(T, dz)) + 0.0 * t
              for t, c in enumerate(labels)])
kept = novelty_filter(H, 30)
per_cluster = np.bincount(labels[kept], minlength=5)
report("Eq.5 keeps every parent-program cluster", (per_cluster > 0).all(),
       f"kept per cluster={per_cluster.tolist()}")
rand_cov = []
for s in range(2000):
    pick = rng.choice(J, 30, replace=False)
    rand_cov.append((np.bincount(labels[pick], minlength=5) > 0).all())
print(f"       random 30-of-45 also covers all 5 clusters in {np.mean(rand_cov):.1%} of draws")
# Greedy farthest-point is a 2-approximation for k-center (Gonzalez 1985): check radius
Zc = H.mean(1) - H.mean(1).mean(0)
Zc /= np.linalg.norm(Zc, axis=1, keepdims=True)
cover = lambda S: (1 - Zc @ Zc[S].T).min(axis=1).max()
r_greedy = cover(kept)
r_rand = np.median([cover(rng.choice(J, 30, replace=False)) for _ in range(500)])
report("Greedy cover radius <= random-subset cover radius", r_greedy <= r_rand,
       f"greedy={r_greedy:.4f} random median={r_rand:.4f}")
print(f"       dropped from tight cluster 4: {9 - per_cluster[4]} of 9")


# ------------------------------- Attention over concatenated KV blocks ----
def attn(qv, K, Vv):
    s = K @ qv / np.sqrt(len(qv))
    w = np.exp(s - s.max())
    return (w / w.sum()) @ Vv, np.log(np.exp(s - s.max()).sum()) + s.max()


dk = 64
qv = rng.normal(size=dk)
blocks = [(rng.normal(size=(n, dk)), rng.normal(size=(n, dk))) for n in (12, 41, 41, 41, 300, 20)]
Kc = np.vstack([b[0] for b in blocks])
Vc = np.vstack([b[1] for b in blocks])
full, _ = attn(qv, Kc, Vc)
parts = [attn(qv, Kb, Vb) for Kb, Vb in blocks]
lse = np.array([p[1] for p in parts])
gate = np.exp(lse - lse.max()); gate /= gate.sum()
mix = sum(g * p[0] for g, p in zip(gate, parts))
report("Eq.3/6 concat-KV attention == LSE-gated mixture of per-block attention",
       np.allclose(full, mix, atol=1e-10), f"max err={np.abs(full-mix).max():.2e}")
print(f"       block gates={np.round(gate, 3).tolist()}")

# ---------------------------------------- KV memory arithmetic (Derived) ----
def kv_bytes_per_token(layers, kv_heads, head_dim, bytes_per=2):
    return 2 * layers * kv_heads * head_dim * bytes_per


q8 = kv_bytes_per_token(36, 8, 128)      # Qwen3-8B config, bf16 KV
q32 = kv_bytes_per_token(64, 8, 128)     # Qwen3-32B config, bf16 KV
lat_tokens = 450 * 40
print(f"[INFO] Qwen3-8B KV/token = {q8/1024:.0f} KiB; 450x40 latent positions = "
      f"{lat_tokens:,} tokens = {lat_tokens*q8/2**30:.2f} GiB")
print(f"[INFO] Qwen3-32B KV/token = {q32/1024:.0f} KiB; same latent positions = "
      f"{lat_tokens*q32/2**30:.2f} GiB (bf16 KV)")

# ------------------------------------------------ Throughput arithmetic ----
progs = {"SwarmEvolve": 734, "OpenEvolve": 158, "ShinkaEvolve": 99, "CodeEvolve": 81}
for k_, v in progs.items():
    print(f"[INFO] {k_:12s} {v:4d} programs/h -> {3600/v:5.1f} s per program; "
          f"ratio vs ours {734/v:4.1f}x")

print("\nALL PASS" if ok else "\nSOME CHECK FAILED")
