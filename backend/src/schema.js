// src/schema.js
// Shared extraction schema and system prompt used by all provider adapters.
// Keeping this in one place ensures provider-agnostic behavior.

export const RELATION_VOCABULARY = [
  'works_for',
  'member_of',
  'founded_by',
  'located_in',
  'headquartered_in',
  'part_of',
  'created_by',
  'developed_by',
  'causes',
  'influences',
  'occurred_at',
  'occurred_on',
  'has_property',
  'related_to',
  'opposes',
];

export const SYSTEM_PROMPT = `You are a knowledge graph extraction system. Given a passage of text, identify the entities (people, organizations, locations, concepts, events, etc.) and the typed relationships between them.

RULES:
1. Entity types are OPEN — choose the most natural type for each entity (e.g., Person, Organization, Location, Concept, Event, Date, Product, Technology, Field, Theory).
2. Relations MUST come from this controlled vocabulary ONLY:
   ${RELATION_VOCABULARY.join(', ')}.
   If no specific relation fits, use "related_to".
3. Each entity gets a stable "id" in lowercase_with_underscores (e.g., "albert_einstein", "general_relativity"). Reuse the same id if the same entity is mentioned again.
4. For each entity, include 1–3 verbatim source sentences from the input where it appears.
5. For each edge, include the verbatim sentence that supports the relation as "evidence".
6. Do NOT invent facts not present in the text. If a relation is implied but not stated, prefer the weaker "related_to" or "influences" over a stronger relation.
7. Return ONLY the JSON object — no commentary, no markdown fences.`;

// JSON Schema describing the output structure (used by OpenAI structured outputs,
// Gemini responseSchema, and as documentation for Anthropic tool input_schema).
export const GRAPH_JSON_SCHEMA = {
  type: 'object',
  properties: {
    nodes: {
      type: 'array',
      description: 'Entities extracted from the text.',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Stable canonical id in lowercase_with_underscores.',
          },
          label: {
            type: 'string',
            description: 'Human-readable name as it appears in the text.',
          },
          type: {
            type: 'string',
            description: 'Entity type — open vocabulary (Person, Organization, Concept, etc.).',
          },
          description: {
            type: 'string',
            description: 'One-sentence description grounded in the source text.',
          },
          source_sentences: {
            type: 'array',
            description: 'Verbatim sentences from the input where the entity is mentioned.',
            items: { type: 'string' },
          },
        },
        required: ['id', 'label', 'type', 'description', 'source_sentences'],
        additionalProperties: false,
      },
    },
    edges: {
      type: 'array',
      description: 'Typed relationships between entities.',
      items: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source node id.' },
          target: { type: 'string', description: 'Target node id.' },
          relation: {
            type: 'string',
            enum: RELATION_VOCABULARY,
            description: 'Relation label from the controlled vocabulary.',
          },
          evidence: {
            type: 'string',
            description: 'The verbatim sentence supporting this relation.',
          },
        },
        required: ['source', 'target', 'relation', 'evidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['nodes', 'edges'],
  additionalProperties: false,
};

/**
 * Validate and normalize a raw graph object returned by an LLM.
 * Drops malformed nodes/edges, ensures every edge references a real node,
 * and coerces unknown relations to "related_to".
 */
export function normalizeGraph(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Extraction result is not an object.');
  }
  const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const edges = Array.isArray(raw.edges) ? raw.edges : [];

  // De-duplicate nodes by id, keep the first one seen.
  const nodeMap = new Map();
  for (const n of nodes) {
    if (!n || typeof n.id !== 'string' || typeof n.label !== 'string') continue;
    if (nodeMap.has(n.id)) continue;
    nodeMap.set(n.id, {
      id: n.id,
      label: n.label,
      type: typeof n.type === 'string' ? n.type : 'Entity',
      description: typeof n.description === 'string' ? n.description : '',
      source_sentences: Array.isArray(n.source_sentences)
        ? n.source_sentences.filter((s) => typeof s === 'string')
        : [],
    });
  }

  // Filter edges: must reference existing nodes, coerce unknown relations.
  const cleanEdges = [];
  for (const e of edges) {
    if (!e || typeof e.source !== 'string' || typeof e.target !== 'string') continue;
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue;
    const relation = RELATION_VOCABULARY.includes(e.relation) ? e.relation : 'related_to';
    cleanEdges.push({
      source: e.source,
      target: e.target,
      relation,
      evidence: typeof e.evidence === 'string' ? e.evidence : '',
    });
  }

  return { nodes: Array.from(nodeMap.values()), edges: cleanEdges };
}
