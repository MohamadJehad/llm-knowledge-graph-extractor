// src/schema.js
// Shared extraction schema and system prompt used by all provider adapters.
// Keeping this in one place ensures provider-agnostic behavior.

export const RELATION_VOCABULARY = [
  // --- original 15 (unchanged for backward compatibility) ---
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
  // --- added in v2: richer biographical / scholarly / scientific relations ---
  'discovered_by', // natural phenomena/elements identified by a scientist
  'born_in', // person born in a location (distinct from located_in for orgs)
  'lived_in', // person lived/worked in a location
  'married_to', // spousal — symmetric (emit both directions)
  'studied_at', // educational affiliation
  'awarded', // person awarded a prize/honour (Person -> Prize)
  'awarded_for', // prize/honour awarded for a reason/work (Prize -> Reason)
  'co_recipient_with', // co-recipients of a shared award (symmetric)
];

export const SYSTEM_PROMPT = `You are a knowledge graph extraction system. Given a passage of text, identify the entities (people, organizations, locations, concepts, events, dates) and the typed relationships between them.

GUIDING PRINCIPLES
- Be SPECIFIC. Always prefer the most precise relation over the generic ones (related_to, has_property). related_to is a last resort, not a default.
- Be FAITHFUL. Every edge must be supported by a verbatim sentence from the text. Do NOT invent facts.
- Be CONSISTENT. If the same entity is referred to by multiple names, create ONE node with the canonical label and list the others under "aliases".

NODE FIELDS
- id: stable canonical id in lowercase_with_underscores (e.g., "marie_curie", "polonium").
- label: the canonical human-readable name as it appears in the text.
- type: open vocabulary type — choose the most natural one (Person, Organization, Location, Concept, Event, Date, Element, Theory, Field, Product, ...).
- description: one-sentence description grounded in the source text.
- source_sentences: 1–3 verbatim sentences from the input where the entity appears.
- aliases: array of alternative names from the text referring to the SAME entity (e.g., birth names, abbreviations, nicknames). Use [] if none.

EDGE FIELDS
- source, target: node ids.
- relation: exactly one token from the controlled vocabulary below.
- evidence: the verbatim source sentence supporting this relation.
- confidence: float in [0.0, 1.0]. 1.0 = the relation is stated explicitly with an unambiguous verb; 0.7 = clearly implied; 0.4 = inferred from context; below 0.4 = uncertain (avoid).

CONTROLLED RELATION VOCABULARY (use exactly these tokens)
  works_for, member_of, founded_by, located_in, headquartered_in, part_of,
  created_by, developed_by, discovered_by, causes, influences,
  occurred_at, occurred_on, has_property, related_to, opposes,
  born_in, lived_in, married_to, studied_at, awarded, awarded_for, co_recipient_with.

WHICH RELATION TO PICK — DECISION RULES
- A PERSON born in a place → born_in (NEVER located_in for people).
- A PERSON living or working in a place → lived_in (NEVER located_in for people).
- An ORGANIZATION sited in a place → located_in or headquartered_in.
- A NATURAL phenomenon, element, particle, law, species identified by a scientist → discovered_by. Use created_by / developed_by ONLY for things humans MADE (products, software, theories, artworks).
- Spouses → married_to (emit one edge in each direction — it is symmetric).
- An educational affiliation (university, school) → studied_at.
- A person who received a prize/honour → awarded with PERSON as source and PRIZE as target.
- The work or reason a prize was given for → awarded_for with PRIZE as source and the work/reason as target.
- Two or more people sharing an award → co_recipient_with between each pair (symmetric — emit both directions).
- An event happening on a date → occurred_on with EVENT as source and DATE as target.
- An event happening at a place → occurred_at with EVENT as source and PLACE as target.
- related_to is ONLY for genuinely non-specific connections that no other relation captures. When you use related_to, the evidence string MUST start with "[FALLBACK] " so we can audit usage.

EVENT REIFICATION (IMPORTANT)
Do NOT attach dates or places directly to people for biographical events. Reify the event as its own node.
  WRONG:  marie_curie --occurred_on--> 1867
  RIGHT:  create node "birth_marie_curie" (type "Event"),
          then:  birth_marie_curie --has_property--> marie_curie  (the subject of the event)
          and:   birth_marie_curie --occurred_on--> 1867
          and:   birth_marie_curie --occurred_at--> warsaw
The same applies for marriages, foundings, publications, etc. Only skip reification if the text mentions the date in passing without enough context to define a stable event entity.

ALIASES / ENTITY RESOLUTION
If the text refers to the same entity by multiple names (e.g., "Maria Skłodowska" and "Marie Curie", or "OpenAI" and "the company"), emit ONE node with the canonical label and list the alternatives under "aliases". Do NOT create two separate nodes for the same referent.

DEDUPLICATION OF GENERIC VS SPECIFIC
If both a generic class (e.g., "Nobel Prize") and specific instances (e.g., "Nobel Prize in Physics", "Nobel Prize in Chemistry") are mentioned, prefer the specific instances as the nodes. If the generic class deserves its own node, use part_of to link the specific instances to it. Do not create a redundant "bare" generic node that duplicates information.

OUTPUT
Return ONLY the JSON object matching the schema — no commentary, no markdown fences, no prose.`;

// JSON Schema describing the output structure (used by OpenAI structured outputs,
// Gemini responseSchema, and as documentation for Anthropic tool input_schema).
// All properties are required so that OpenAI's strict mode is satisfied; the
// model is instructed to return [] / 0.7 for fields it cannot fill in.
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
            description: 'Canonical human-readable name as it appears in the text.',
          },
          type: {
            type: 'string',
            description: 'Entity type — open vocabulary (Person, Organization, Concept, Element, Event, Date, ...).',
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
          aliases: {
            type: 'array',
            description: 'Alternative names referring to the same entity. Use [] if none.',
            items: { type: 'string' },
          },
        },
        required: ['id', 'label', 'type', 'description', 'source_sentences', 'aliases'],
        additionalProperties: false,
      },
    },
    edges: {
      type: 'array',
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
            description: 'The verbatim sentence supporting this relation. If relation is related_to, MUST start with "[FALLBACK] ".',
          },
          confidence: {
            type: 'number',
            description: 'Confidence that the relation is supported by the text: 1.0 = explicit, 0.7 = implied, 0.4 = inferred.',
          },
        },
        required: ['source', 'target', 'relation', 'evidence', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['nodes', 'edges'],
  additionalProperties: false,
};

function normalizeNode(n) {
  if (!n || typeof n.id !== 'string' || typeof n.label !== 'string') return null;
  return {
    id: n.id,
    label: n.label,
    type: typeof n.type === 'string' ? n.type : 'Entity',
    description: typeof n.description === 'string' ? n.description : '',
    source_sentences: Array.isArray(n.source_sentences)
      ? n.source_sentences.filter((s) => typeof s === 'string')
      : [],
    aliases: Array.isArray(n.aliases)
      ? n.aliases.filter((s) => typeof s === 'string' && s.trim().length > 0)
      : [],
  };
}

function clampConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.7;
  return Math.max(0, Math.min(1, value));
}

function normalizeEdge(e, nodeMap) {
  if (!e || typeof e.source !== 'string' || typeof e.target !== 'string') return null;
  if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) return null;
  return {
    source: e.source,
    target: e.target,
    relation: RELATION_VOCABULARY.includes(e.relation) ? e.relation : 'related_to',
    evidence: typeof e.evidence === 'string' ? e.evidence : '',
    confidence: clampConfidence(e.confidence),
  };
}

/**
 * Validate and normalize a raw graph object returned by an LLM.
 * Drops malformed nodes/edges, ensures every edge references a real node,
 * coerces unknown relations to "related_to", and clamps confidence to [0,1].
 */
export function normalizeGraph(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Extraction result is not an object.');
  }
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];

  const nodeMap = new Map();
  for (const n of rawNodes) {
    const normalized = normalizeNode(n);
    if (normalized && !nodeMap.has(normalized.id)) {
      nodeMap.set(normalized.id, normalized);
    }
  }

  const cleanEdges = [];
  for (const e of rawEdges) {
    const normalized = normalizeEdge(e, nodeMap);
    if (normalized) cleanEdges.push(normalized);
  }

  return { nodes: Array.from(nodeMap.values()), edges: cleanEdges };
}
