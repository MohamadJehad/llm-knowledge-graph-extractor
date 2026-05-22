'use client';

// app/components/SidePanel.tsx
import type { KGGraph, KGNode } from '../types';

interface Props {
  node: KGNode;
  graph: KGGraph;
  onClose: () => void;
}

export default function SidePanel({ node, graph, onClose }: Props) {
  const labelOf = (id: string) => graph.nodes.find((n) => n.id === id)?.label || id;

  const outgoing = graph.edges.filter((e) => e.source === node.id);
  const incoming = graph.edges.filter((e) => e.target === node.id);

  return (
    <aside className="side-panel" role="complementary">
      <button className="side-panel-close" onClick={onClose} aria-label="Close panel">
        ✕
      </button>

      <div className="side-panel-type">{node.type}</div>
      <h2 className="side-panel-label">{node.label}</h2>
      <div className="side-panel-id">id: {node.id}</div>

      {node.description && (
        <div className="side-panel-section">
          <h4>Description</h4>
          <p>{node.description}</p>
        </div>
      )}

      {node.source_sentences.length > 0 && (
        <div className="side-panel-section">
          <h4>Source sentences</h4>
          {node.source_sentences.map((s, i) => (
            <blockquote key={i} className="evidence-quote">
              {s}
            </blockquote>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="side-panel-section">
          <h4>Outgoing relations ({outgoing.length})</h4>
          <ul className="relation-list">
            {outgoing.map((e, i) => (
              <li key={`out-${i}`}>
                <span className="relation-arrow">{e.relation.replace(/_/g, ' ')} →</span>{' '}
                <span className="relation-target">{labelOf(e.target)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="side-panel-section">
          <h4>Incoming relations ({incoming.length})</h4>
          <ul className="relation-list">
            {incoming.map((e, i) => (
              <li key={`in-${i}`}>
                <span className="relation-target">{labelOf(e.source)}</span>{' '}
                <span className="relation-arrow">→ {e.relation.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
