// src/rdf.js
// Minimal RDF/Turtle serializer for our knowledge graph.
// Produces a self-contained Turtle file using a custom kg: namespace plus
// rdf:, rdfs:, and xsd: for type/label conventions. Edges with evidence or
// confidence are reified as rdf:Statement blank nodes so the provenance and
// quality metadata survive the export.

const PREFIXES = `@prefix kg: <http://kg-extractor.local/entity/> .
@prefix rel: <http://kg-extractor.local/relation/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
`;

function escapeLiteral(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function safeLocal(s) {
  // Turtle local names need a restricted charset; we use lowercase_with_underscores
  // already, but defensively replace anything else.
  return String(s).replace(/[^a-zA-Z0-9_]/g, '_');
}

// Terminate a list of "predicate object" triples with `;` for all but the last
// (which gets `.`), indented under the subject line.
function emitObjectList(lines, predicateObjectPairs) {
  predicateObjectPairs.forEach((triple, i) => {
    const terminator = i === predicateObjectPairs.length - 1 ? '.' : ';';
    lines.push(`    ${triple} ${terminator}`);
  });
}

function serializeNode(lines, node) {
  const subj = `kg:${safeLocal(node.id)}`;
  const triples = [`a kg:${safeLocal(node.type || 'Entity')}`];
  triples.push(`rdfs:label "${escapeLiteral(node.label)}"`);
  if (node.description) {
    triples.push(`rdfs:comment "${escapeLiteral(node.description)}"`);
  }
  for (const alias of node.aliases || []) {
    triples.push(`kg:alias "${escapeLiteral(alias)}"`);
  }
  for (const sentence of node.source_sentences || []) {
    triples.push(`kg:source_sentence "${escapeLiteral(sentence)}"`);
  }
  lines.push(subj);
  emitObjectList(lines, triples);
  lines.push('');
}

function serializeEdge(lines, edge) {
  const s = `kg:${safeLocal(edge.source)}`;
  const p = `rel:${safeLocal(edge.relation)}`;
  const o = `kg:${safeLocal(edge.target)}`;
  const hasEvidence = !!edge.evidence;
  const hasConfidence = typeof edge.confidence === 'number';

  // Always emit the bare triple
  lines.push(`${s} ${p} ${o} .`);

  // If we have provenance/quality metadata, attach a reified statement.
  if (hasEvidence || hasConfidence) {
    const triples = [
      'a rdf:Statement',
      `rdf:subject ${s}`,
      `rdf:predicate ${p}`,
      `rdf:object ${o}`,
    ];
    if (hasEvidence) {
      triples.push(`kg:evidence "${escapeLiteral(edge.evidence)}"`);
    }
    if (hasConfidence) {
      triples.push(`kg:confidence "${edge.confidence.toFixed(2)}"^^xsd:decimal`);
    }
    lines.push('[]');
    emitObjectList(lines, triples);
    lines.push('');
  }
}

export function graphToTurtle(graph) {
  const lines = [PREFIXES];
  for (const node of graph.nodes) serializeNode(lines, node);
  for (const edge of graph.edges) serializeEdge(lines, edge);
  return lines.join('\n');
}
