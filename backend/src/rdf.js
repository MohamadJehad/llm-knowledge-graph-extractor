// src/rdf.js
// Minimal RDF/Turtle serializer for our knowledge graph.
// Produces a self-contained Turtle file using a custom kg: namespace plus
// rdf:, rdfs:, and xsd: for type/label conventions.

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

function safeId(id) {
  // Turtle local names should match a fairly restricted charset; we use
  // lowercase_with_underscores already, but defensively replace anything else.
  return String(id).replace(/[^a-zA-Z0-9_]/g, '_');
}

function safeRelation(r) {
  return String(r).replace(/[^a-zA-Z0-9_]/g, '_');
}

export function graphToTurtle(graph) {
  const lines = [PREFIXES];

  for (const node of graph.nodes) {
    const subj = `kg:${safeId(node.id)}`;
    lines.push(`${subj} a kg:${safeId(node.type || 'Entity')} ;`);
    lines.push(`    rdfs:label "${escapeLiteral(node.label)}" ;`);
    if (node.description) {
      lines.push(`    rdfs:comment "${escapeLiteral(node.description)}" ;`);
    }
    const sentences = node.source_sentences || [];
    if (sentences.length === 0) {
      // Close with a period
      lines[lines.length - 1] = lines[lines.length - 1].replace(/ ;$/, ' .');
    } else {
      const last = sentences.length - 1;
      sentences.forEach((s, i) => {
        const sep = i === last ? '.' : ';';
        lines.push(`    kg:source_sentence "${escapeLiteral(s)}" ${sep}`);
      });
    }
    lines.push('');
  }

  for (const edge of graph.edges) {
    const s = `kg:${safeId(edge.source)}`;
    const p = `rel:${safeRelation(edge.relation)}`;
    const o = `kg:${safeId(edge.target)}`;
    if (edge.evidence) {
      // RDF reification for evidence — emit a blank-node statement carrying the evidence.
      lines.push(`${s} ${p} ${o} .`);
      lines.push('[] a rdf:Statement ;');
      lines.push(`    rdf:subject ${s} ;`);
      lines.push(`    rdf:predicate ${p} ;`);
      lines.push(`    rdf:object ${o} ;`);
      lines.push(`    kg:evidence "${escapeLiteral(edge.evidence)}" .`);
      lines.push('');
    } else {
      lines.push(`${s} ${p} ${o} .`);
    }
  }

  return lines.join('\n');
}
