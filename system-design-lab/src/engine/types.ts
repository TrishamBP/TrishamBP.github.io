export type NodeKind =
  | "client" | "edge" | "gateway" | "presentation" | "product"
  | "service" | "db" | "cache" | "queue" | "external";

export type NodeShape = "rect" | "circle" | "cylinder" | "phone" | "bar";

/** Everything the explanation panel shows for one component. */
export interface NodeInfo {
  does: string;
  why: string;
  stores?: string;
  onFail: string;
  onTraffic: string;
  api?: string[];
  deps?: string[];
  db?: string;
}

export interface DNode {
  id: string;
  label: string;
  sub?: string;
  kind: NodeKind;
  shape?: NodeShape;
  x: number; // centre
  y: number;
  w?: number;
  h?: number;
  hidden?: boolean;
  info?: NodeInfo;
}

export interface DEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  /** Bend as a fraction of edge length (+ bends left of travel direction). */
  curve?: number;
  hidden?: boolean;
}

export type Tone = "req" | "res" | "err" | "evt";

export interface Packet {
  edge: string;
  reverse?: boolean;
  label?: string;
  tone?: Tone;
  /** Portion of the step during which this packet travels, 0..1. */
  at?: [number, number];
}

export interface Step {
  title: string;
  caption: string;
  /** Longer text shown when "Explain this step" is on. */
  detail?: string[];
  active?: string[];
  packets?: Packet[];
  duration?: number; // ms at 1x
  /** Optional step payload, e.g. an HTTP message to show in the inspector. */
  wire?: { label: string; body: string }[];
}

export type NodeStatus = "ok" | "hot" | "down" | "dim" | "degraded";
