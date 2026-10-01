/* ---------------------------------------------------------------------------
   Neural Compute Core — component data
   ---------------------------------------------------------------------------
   Single source of truth for the homepage 3D machine. The scene builders in
   modules.js look components up by `id`; the inspector panel, system map,
   hover labels, keyboard navigation and camera focus all read from here.

   Fields
     id            — stable key, also the scene builder name
     name          — display name
     description   — 1–2 sentence explanation shown in the inspector
     technologies  — real-world tools that implement this part of the stack
     category      — scene-hierarchy group: CORE | COMPUTE | MEMORY | NETWORK |
                     RETRIEVAL | AGENTS | OBSERVABILITY
     mapGroup      — system-map group: COMPUTE | MEMORY | INFERENCE |
                     RETRIEVAL | AGENTS | INFRASTRUCTURE
     position      — [x, y, z] origin of the component group in world space
     cameraTarget  — { position, target } camera pose used when selected
     color         — accent colour of the component's emissive parts
     metadata      — key/value facts shown in the inspector
   ------------------------------------------------------------------------ */

export const SCENE_GROUPS = [
  "CORE",
  "COMPUTE",
  "MEMORY",
  "NETWORK",
  "RETRIEVAL",
  "AGENTS",
  "OBSERVABILITY",
];

export const MAP_GROUPS = [
  { id: "COMPUTE", label: "Compute", cameraTarget: { position: [0.6, 6.2, -10.4], target: [0, 1.6, -2.0] } },
  { id: "MEMORY", label: "Memory", cameraTarget: { position: [-10.2, 4.4, 4.6], target: [-4.1, 1.2, -0.3] } },
  { id: "INFERENCE", label: "Inference", cameraTarget: { position: [-1.6, 3.8, 10.4], target: [0, 1.8, 1.0] } },
  { id: "RETRIEVAL", label: "Retrieval", cameraTarget: { position: [11.2, 4.6, 3.4], target: [3.9, 1.6, 0.0] } },
  { id: "AGENTS", label: "Agents", cameraTarget: { position: [6.4, 6.6, 7.6], target: [2.2, 4.2, 1.8] } },
  { id: "INFRASTRUCTURE", label: "Infrastructure", cameraTarget: { position: [9.0, 10.5, 12.0], target: [0, 0.8, 0] } },
];

const COOL = "#e8ecf5";
const BLUE = "#6fb2ff";
const SOFT_BLUE = "#9cc8ff";

export const componentsData = [
  {
    id: "llm-inference",
    name: "LLM Inference Engine",
    description:
      "The heart of the machine: transformer forward passes that turn a prompt into tokens. Every request, retrieved document and agent step ends up here.",
    technologies: ["vLLM", "SGLang", "TensorRT-LLM", "PagedAttention", "Continuous batching"],
    category: "CORE",
    mapGroup: "INFERENCE",
    position: [0, 0.3, 0],
    cameraTarget: { position: [3.4, 3.4, 6.4], target: [0, 2.1, 0] },
    color: COOL,
    metadata: {
      Workload: "Transformer forward pass",
      Batching: "Continuous / in-flight",
      Bottleneck: "Compute in prefill, bandwidth in decode",
      "Key metrics": "TTFT · TPOT · tokens/s",
    },
  },
  {
    id: "attention",
    name: "Attention Layers",
    description:
      "Multi-head attention rings. Each node is a head comparing the current query against cached keys, which is why long context gets expensive.",
    technologies: ["FlashAttention", "GQA / MQA", "RoPE", "Sliding-window attention"],
    category: "CORE",
    mapGroup: "INFERENCE",
    position: [0, 0.3, 0],
    cameraTarget: { position: [-2.6, 4.4, 5.0], target: [0, 2.3, 0] },
    color: SOFT_BLUE,
    metadata: {
      Cost: "O(n²) in prefill · O(n) per decode step",
      Heads: "3 rings × 8 heads shown",
      Trick: "Tile in SRAM, never materialise n×n",
      Variant: "Grouped-query attention shrinks the KV",
    },
  },
  {
    id: "prefill",
    name: "Prefill Stage",
    description:
      "Processes the whole prompt in one parallel pass. Thousands of tokens hit the GPUs at once, saturating tensor cores and filling the KV cache in a burst.",
    technologies: ["Chunked prefill", "Tensor cores", "BF16 / FP8 GEMM", "Prefix caching"],
    category: "CORE",
    mapGroup: "INFERENCE",
    position: [-2.5, 0.3, 1.7],
    cameraTarget: { position: [-3.6, 2.9, 6.0], target: [-2.5, 1.5, 1.7] },
    color: BLUE,
    metadata: {
      Bound: "Compute-bound",
      Parallelism: "All prompt tokens at once",
      Drives: "Time to first token (TTFT)",
      Scheduling: "Chunked so decode is not starved",
    },
  },
  {
    id: "decode",
    name: "Decode Stage",
    description:
      "Generates one token per step. Each step re-reads cached keys and values from HBM to emit a single token, so memory bandwidth sets the pace, not FLOPs.",
    technologies: ["Speculative decoding", "CUDA Graphs", "Continuous batching", "Paged KV reads"],
    category: "CORE",
    mapGroup: "INFERENCE",
    position: [2.5, 0.3, 1.7],
    cameraTarget: { position: [3.8, 2.9, 6.0], target: [2.5, 1.5, 1.7] },
    color: BLUE,
    metadata: {
      Bound: "Memory-bandwidth-bound",
      Parallelism: "One token per sequence per step",
      Drives: "Time per output token (TPOT)",
      Lever: "Batch more sequences per step",
    },
  },
  {
    id: "model-serving",
    name: "Model Serving Gateway",
    description:
      "The front door: an OpenAI-compatible API that admits requests, queues them into batches and streams generated tokens back to the client.",
    technologies: ["OpenAI-compatible API", "Triton Inference Server", "KServe", "Ray Serve", "SSE streaming"],
    category: "CORE",
    mapGroup: "INFERENCE",
    position: [0, 0.3, 3.1],
    cameraTarget: { position: [1.8, 2.2, 7.4], target: [0, 0.8, 3.1] },
    color: COOL,
    metadata: {
      Protocol: "HTTP · gRPC · server-sent events",
      Scheduler: "Continuous batching queue",
      SLOs: "p50 / p99 latency, TTFT",
      Scaling: "Replica autoscaling on queue depth",
    },
  },
  {
    id: "gpu-compute",
    name: "GPU Compute Cluster",
    description:
      "Eight accelerators running the matrix multiplications behind every layer. They light up hardest in prefill and throttle down while decode waits on memory.",
    technologies: ["NVIDIA H100 / H200", "AMD Instinct MI300X", "Tensor cores", "NVLink"],
    category: "COMPUTE",
    mapGroup: "COMPUTE",
    position: [0, 0.3, 0],
    cameraTarget: { position: [2.4, 5.6, -9.4], target: [0, 1.3, -2.4] },
    color: COOL,
    metadata: {
      Devices: "8× accelerators",
      Parallelism: "Tensor + pipeline parallel",
      Precision: "BF16 · FP8 · INT4",
      "Peak load": "Prefill",
    },
  },
  {
    id: "cpu-control",
    name: "CPU Control Plane",
    description:
      "The scheduler on top: tokenization, request routing, batch formation and kernel launches. Its heartbeat keeps the GPUs fed.",
    technologies: ["Python asyncio", "Rust tokenizers", "Kubernetes", "gRPC"],
    category: "COMPUTE",
    mapGroup: "COMPUTE",
    position: [0, 3.95, 0],
    cameraTarget: { position: [2.8, 7.2, 4.4], target: [0, 4.1, 0] },
    color: SOFT_BLUE,
    metadata: {
      Role: "Schedule · tokenize · launch",
      Risk: "CPU overhead starving the GPUs",
      Fix: "CUDA Graphs, async scheduling",
      Heartbeat: "Scheduler tick",
    },
  },
  {
    id: "cuda-kernel",
    name: "CUDA Kernel Layer",
    description:
      "The grid of streaming multiprocessors under the GPUs. Fused kernels decide how well the hardware is used: tiling, occupancy and memory movement.",
    technologies: ["CUDA", "Triton", "CUTLASS", "FlashAttention kernels", "ROCm / HIP"],
    category: "COMPUTE",
    mapGroup: "COMPUTE",
    position: [0, 0.3, -2.0],
    cameraTarget: { position: [0.6, 4.6, -6.4], target: [0, 0.4, -2.0] },
    color: BLUE,
    metadata: {
      Unit: "Warps on streaming multiprocessors",
      Goal: "Fuse ops, minimise HBM round-trips",
      Profiling: "Nsight Systems · Nsight Compute",
      Wave: "Each pulse is a kernel launch",
    },
  },
  {
    id: "hbm",
    name: "High-Bandwidth Memory",
    description:
      "Stacked DRAM beside the GPUs holding weights and the KV cache. During decode its bandwidth is the speed limit for every generated token.",
    technologies: ["HBM3 / HBM3e", "Weight quantization", "KV cache quantization"],
    category: "MEMORY",
    mapGroup: "MEMORY",
    position: [-3.9, 0.3, -0.5],
    cameraTarget: { position: [-8.0, 3.4, 2.6], target: [-3.9, 0.9, -0.5] },
    color: SOFT_BLUE,
    metadata: {
      Holds: "Model weights + KV cache",
      Bandwidth: "Terabytes per second per GPU",
      "Per decode step": "Weights + the sequence's KV are read",
      "Glows during": "Decode",
    },
  },
  {
    id: "kv-cache",
    name: "KV Cache",
    description:
      "Keys and values for every token already processed, split into fixed-size blocks. Prefill fills it in a burst; decode appends a block entry per token and re-reads the rest.",
    technologies: ["PagedAttention", "Prefix caching", "RadixAttention", "FP8 KV"],
    category: "MEMORY",
    mapGroup: "MEMORY",
    position: [-4.4, 0.3, 1.7],
    cameraTarget: { position: [-5.4, 2.0, 5.8], target: [-4.4, 1.15, 1.7] },
    color: BLUE,
    metadata: {
      "Block states": "Free → populated → active",
      Growth: "Linear in sequence length",
      Policy: "Paged allocation, freed on completion",
      Limits: "Batch size and context length",
    },
  },
  {
    id: "network-fabric",
    name: "Network Fabric",
    description:
      "The interconnect ring. NVLink inside the node, InfiniBand or RoCE between nodes; tensor-parallel all-reduces and KV transfers travel here.",
    technologies: ["NVLink / NVSwitch", "InfiniBand", "RoCE v2", "NCCL"],
    category: "NETWORK",
    mapGroup: "INFRASTRUCTURE",
    position: [0, 0.3, 0],
    cameraTarget: { position: [7.2, 6.4, 9.6], target: [0, 0.3, 0] },
    color: SOFT_BLUE,
    metadata: {
      Collectives: "All-reduce · all-gather",
      "Disaggregated serving": "Prefill → decode KV transfer",
      Risk: "Bandwidth-limited scaling",
      Topology: "Ring + spokes to every module",
    },
  },
  {
    id: "rag",
    name: "RAG Context Assembler",
    description:
      "Turns retrieved chunks into a prompt: reranks candidates, keeps the most relevant documents and packs them into the context window.",
    technologies: ["LlamaIndex", "LangChain", "Cross-encoder rerankers", "Hybrid BM25 + dense"],
    category: "RETRIEVAL",
    mapGroup: "RETRIEVAL",
    position: [4.1, 2.75, -0.6],
    cameraTarget: { position: [8.0, 4.4, 2.8], target: [4.1, 3.0, -0.6] },
    color: COOL,
    metadata: {
      Flow: "Query → embed → search → rerank → context",
      Output: "Grounded prompt for the LLM",
      Tunables: "Chunk size, top-k, rerank depth",
      Selected: "Top 3 of 6 candidates",
    },
  },
  {
    id: "vector-db",
    name: "Vector Database",
    description:
      "A lattice of embeddings. Approximate nearest-neighbour search lights up the handful of vectors closest to the query.",
    technologies: ["FAISS", "Milvus", "Qdrant", "pgvector", "HNSW · IVF-PQ"],
    category: "RETRIEVAL",
    mapGroup: "RETRIEVAL",
    position: [4.3, 0.3, -0.4],
    cameraTarget: { position: [8.6, 2.6, 2.6], target: [4.3, 1.1, -0.4] },
    color: BLUE,
    metadata: {
      Index: "HNSW graph / IVF-PQ",
      Query: "Top-k ANN search",
      "Trade-off": "Recall vs latency vs memory",
      Highlight: "Nearest neighbours per query",
    },
  },
  {
    id: "embedding",
    name: "Embedding Engine",
    description:
      "Encodes queries and documents into dense vectors so meaning can be compared with simple distance math.",
    technologies: ["Sentence Transformers", "BGE / E5", "OpenAI embeddings", "ONNX Runtime"],
    category: "RETRIEVAL",
    mapGroup: "RETRIEVAL",
    position: [4.4, 0.3, 1.9],
    cameraTarget: { position: [7.6, 2.4, 5.0], target: [4.4, 1.3, 1.9] },
    color: SOFT_BLUE,
    metadata: {
      Output: "768–3072-dimension vectors",
      Similarity: "Cosine / dot product",
      Modes: "Offline batch + online query",
      Spin: "Faster when encoding",
    },
  },
  {
    id: "agent-orchestration",
    name: "Agent Orchestrator",
    description:
      "Plans multi-step work. The hub picks a tool, calls it, reads the result and loops back through the model until the task is done.",
    technologies: ["LangGraph", "CrewAI", "Model Context Protocol (MCP)", "Function calling"],
    category: "AGENTS",
    mapGroup: "AGENTS",
    position: [2.2, 4.3, 1.8],
    cameraTarget: { position: [5.0, 5.6, 6.2], target: [2.2, 4.3, 1.8] },
    color: COOL,
    metadata: {
      Loop: "Plan → act → observe → repeat",
      Tools: "Search · code · SQL · API · browser",
      Flow: "User → agent → tool → data → model → response",
      Risks: "Runaway loops, tool errors, cost",
    },
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    description:
      "Ingests, cleans and chunks raw data, then streams it into the embedding engine and storage so retrieval always has fresh knowledge.",
    technologies: ["Apache Kafka", "Apache Spark", "Airflow", "dbt"],
    category: "NETWORK",
    mapGroup: "INFRASTRUCTURE",
    position: [3.7, 0.3, 3.6],
    cameraTarget: { position: [5.6, 2.2, 7.4], target: [3.7, 0.6, 3.6] },
    color: BLUE,
    metadata: {
      Stages: "Ingest → clean → chunk → embed",
      Mode: "Batch + streaming",
      Guarantees: "Idempotent, replayable",
      Feeds: "Embedding engine",
    },
  },
  {
    id: "observability",
    name: "Observability Mast",
    description:
      "Live telemetry. The panels plot GPU utilization, KV cache occupancy and token rate from the simulation running in this scene.",
    technologies: ["Prometheus", "Grafana", "OpenTelemetry", "DCGM exporter", "Langfuse"],
    category: "OBSERVABILITY",
    mapGroup: "INFRASTRUCTURE",
    position: [4.5, 0.3, -2.8],
    cameraTarget: { position: [7.4, 2.8, 1.0], target: [4.5, 1.7, -2.8] },
    color: COOL,
    metadata: {
      Signals: "Metrics · traces · logs",
      Panels: "GPU util · KV usage · tokens/s",
      "LLM metrics": "TTFT, TPOT, cache hit rate",
      Alerts: "SLO burn rate",
    },
  },
  {
    id: "distributed-storage",
    name: "Distributed Storage",
    description:
      "Durable home for model weights, checkpoints, document corpora and offloaded KV. Load speed here decides cold-start time.",
    technologies: ["Amazon S3", "Ceph", "Lustre", "GPUDirect Storage", "Parquet"],
    category: "MEMORY",
    mapGroup: "INFRASTRUCTURE",
    position: [-4.4, 0.3, -2.6],
    cameraTarget: { position: [-8.2, 3.0, -0.6], target: [-4.4, 1.0, -2.6] },
    color: SOFT_BLUE,
    metadata: {
      Holds: "Weights, checkpoints, corpora",
      "Hot path": "Model load and KV offload",
      Throughput: "Parallel striped reads",
      "Agent role": "Data the tools read from",
    },
  },
];

/* Scroll-story chapters. `p` is the scroll progress at which the camera pose
   is fully reached; poses are spherical around `target` (degrees). */
export const storyKeyframes = [
  { p: 0.0, target: [0, 1.9, 0], az: 38, el: 21, dist: 15.5 },
  { p: 0.11, target: [0, 1.9, 0], az: 38, el: 21, dist: 15.5 },
  { p: 0.27, target: [0, 1.5, -1.8], az: 160, el: 27, dist: 12.4 },
  { p: 0.45, target: [-1.4, 1.5, 1.4], az: -18, el: 16, dist: 11.2 },
  { p: 0.63, target: [3.0, 2.4, 0.6], az: 64, el: 17, dist: 11.6 },
  { p: 0.8, target: [0, 1.8, 0], az: -24, el: 30, dist: 19.5 },
  { p: 0.85, target: [0, 1.8, 0], az: -24, el: 30, dist: 19.5 },
  /* Handoff (see main.js `out`): the camera pulls back and rises while the
     scene fades into black. */
  { p: 1.0, target: [0, 1.4, 0], az: -38, el: 38, dist: 31 },
];

export const storyChapters = [
  {
    from: 0.0,
    to: 0.18,
    index: "00",
    title: "The full machine",
    body: "Eighteen modules of a production LLM system, from GPUs and HBM to retrieval and agents, running one live inference loop.",
    focus: null,
  },
  {
    from: 0.18,
    to: 0.36,
    index: "01",
    title: "Compute",
    body: "Eight GPUs on a CUDA kernel grid, fed by a CPU control plane. Watch them flare during prefill and idle down during decode.",
    focus: ["gpu-compute", "cuda-kernel", "cpu-control", "network-fabric"],
  },
  {
    from: 0.36,
    to: 0.54,
    index: "02",
    title: "Prefill → KV cache → decode",
    body: "Prefill is compute-bound: the whole prompt in one burst fills the KV cache. Decode is memory-bound: one token per step, re-reading every cached block from HBM.",
    focus: ["prefill", "decode", "kv-cache", "hbm", "llm-inference", "attention", "model-serving"],
  },
  {
    from: 0.54,
    to: 0.72,
    index: "03",
    title: "Retrieval & agents",
    body: "Query → embed → vector search → rerank → context → LLM. The agent hub routes work through tools and data before the model answers.",
    focus: ["rag", "vector-db", "embedding", "agent-orchestration", "data-pipeline", "distributed-storage"],
  },
  {
    from: 0.72,
    to: 1.01,
    index: "04",
    title: "One system",
    body: "Inference, memory, retrieval and orchestration only work as a whole. That is the engineering I do. Keep scrolling to see the work.",
    focus: null,
  },
];
