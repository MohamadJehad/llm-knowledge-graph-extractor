// app/types.ts
export interface KGNode {
  id: string;
  label: string;
  type: string;
  description: string;
  source_sentences: string[];
}

export interface KGEdge {
  source: string;
  target: string;
  relation: string;
  evidence: string;
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
