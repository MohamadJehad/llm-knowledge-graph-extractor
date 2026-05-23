'use client';

// app/components/SidePanel.tsx
import type { KGEdge, KGGraph, KGNode } from '../types';

interface Props {
  node: KGNode;
  graph: KGGraph;
  onClose: () => void;
  onHide: () => void;
}

function isFallbackEvidence(evidence: string | undefined): boolean {
  return typeof evidence === 'string' && evidence.trim().startsWith('[FALLBACK]');
}

function formatConfidence(c: number | undefined): string {
  if (typeof c !== 'number') return '';
  return `${Math.round(c * 100)}%`;
}

function confidenceClass(c: number | undefined): string {
  if (typeof c !== 'number') return '';
  if (c >= 0.8) return 'conf-high';
  if (c >= 0.5) return 'conf-mid';
  return 'conf-low';
}

export default function SidePanel({ node, graph, onClose, onHide }: Props) {
  const labelOf = (id: string) => graph.nodes.find((n) => n.id === id)?.label || id;

  const outgoing = graph.edges.filter((e) => e.source === node.id);
  const incoming = graph.edges.filter((e) => e.target === node.id);
  const aliases = node.aliases?.filter((a) => a && a !== node.label) || [];

  const renderEdge = (e: KGEdge, dir: 'out' | 'in', key: string) => {
    const fallback = isFallbackEvidence(e.evidence);
    const conf = formatConfidence(e.confidence);
    const otherLabel = dir === 'out' ? labelOf(e.target) : labelOf(e.source);
    return (
      <li key={key} className={fallback ? 'relation-row is-fallback' : 'relation-row'}>
        {dir === 'out' ? (
          <>
            <span className="relation-arrow">{e.relation.replace(/_/g, ' ')} →</span>{' '}
            <span className="relation-target">{otherLabel}</span>
          </>
        ) : (
          <>
            <span className="relation-target">{otherLabel}</span>{' '}
            <span className="relation-arrow">→ {e.relation.replace(/_/g, ' ')}</span>
          </>
        )}
        {conf && (
          <span className={`relation-conf ${confidenceClass(e.confidence)}`} title="Model confidence">
            {conf}
          </span>
        )}
        {fallback && (
          <span className="relation-fallback-badge" title="Generic related_to fallback (audit)">
            fallback
          </span>
        )}
      </li>
    );
  };

  return (
    <aside className="side-panel" role="complementary">
      <div className="side-panel-actions">
        <button
          className="side-panel-hide"
          onClick={onHide}
          title="Hide this entity from the graph"
        >
          ◌ hide
        </button>
        <button className="side-panel-close" onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>

      <div className="side-panel-type">{node.type}</div>
      <h2 className="side-panel-label">{node.label}</h2>
      {aliases.length > 0 && (
        <div className="side-panel-aliases">
          <span className="alias-label">a.k.a.</span>
          {aliases.map((a, i) => (
            <span key={i} className="alias-pill">{a}</span>
          ))}
        </div>
      )}
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
            {outgoing.map((e, i) => renderEdge(e, 'out', `out-${i}`))}
          </ul>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="side-panel-section">
          <h4>Incoming relations ({incoming.length})</h4>
          <ul className="relation-list">
            {incoming.map((e, i) => renderEdge(e, 'in', `in-${i}`))}
          </ul>
        </div>
      )}
    </aside>
  );
}
