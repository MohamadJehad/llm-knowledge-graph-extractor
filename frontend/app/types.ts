// app/types.ts
export interface KGNode {
  id: string;
  label: string;
  type: string;
  description: string;
  source_sentences: string[];
  // v2: alternative names referring to the same entity (Maria Skłodowska ≡ Marie Curie).
  aliases?: string[];
}

export interface KGEdge {
  source: string;
  target: string;
  relation: string;
  evidence: string;
  // v2: model confidence in [0,1]. Low-confidence edges render as dashed strokes.
  confidence?: number;
}

export interface KGGraph {
  nodes: KGNode[];
  edges: KGEdge[];
  meta?: {
    provider: string;
    model: string;
    elapsedMs: number;
    nodeCount: number;
    edgeCount: number;
  };
}

export interface ProviderInfo {
  id: string;
  name: string;
  defaultModel: string;
  models: string[];
}
