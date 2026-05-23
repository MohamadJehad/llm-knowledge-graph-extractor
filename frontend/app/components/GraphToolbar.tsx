'use client';

// app/components/GraphToolbar.tsx
// Editorial-style toolbar sitting above the graph canvas:
// layout switcher, search, zoom controls, PNG export + a chip bar
// for filtering the controlled-vocabulary relations.

interface Props {
  layout: string;
  onLayoutChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  relations: string[];
  hiddenRelations: Set<string>;
  onToggleRelation: (rel: string) => void;
  onShowAllRelations: () => void;
  hideDates: boolean;
  onToggleHideDates: () => void;
  showAllLabels: boolean;
  onToggleShowAllLabels: () => void;
  hiddenNodes: { id: string; label: string }[];
  onUnhideNode: (id: string) => void;
  onShowAllHidden: () => void;
  // Complexity slider (1..numComplexityLevels). Lower levels = fewer entities.
  complexityLevel: number;
  numComplexityLevels: number;
  visibleEntityCount: number;
  totalEntityCount: number;
  onComplexityChange: (level: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onExportPNG: () => void;
}

const LAYOUTS = [
  { id: 'cose', label: 'Force' },
  { id: 'concentric', label: 'Concentric' },
  { id: 'breadthfirst', label: 'Hierarchy' },
  { id: 'circle', label: 'Circle' },
  { id: 'grid', label: 'Grid' },
];

export default function GraphToolbar(props: Props) {
  const anyHidden = props.hiddenRelations.size > 0;

  return (
    <div className="graph-toolbar">
      <div className="toolbar-row">
        <div className="layout-segment" role="tablist" aria-label="Graph layout">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              className={`layout-btn ${props.layout === l.id ? 'active' : ''}`}
              onClick={() => props.onLayoutChange(l.id)}
              aria-pressed={props.layout === l.id}
              title={`${l.label} layout`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="toolbar-search-wrap">
          <span className="toolbar-search-icon" aria-hidden>⌕</span>
          <input
            className="toolbar-search"
            placeholder="Search entities…"
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            aria-label="Search entities"
          />
          {props.search && (
            <button
              className="toolbar-search-clear"
              onClick={() => props.onSearchChange('')}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="toolbar-actions">
          <button
            onClick={props.onToggleShowAllLabels}
            title={props.showAllLabels ? 'Hide edge labels (cleaner)' : 'Show every edge label'}
            className={`toggle-btn ${props.showAllLabels ? 'active' : ''}`}
            aria-pressed={props.showAllLabels}
          >
            {props.showAllLabels ? 'labels: all' : 'labels: hover'}
          </button>
          <button
            onClick={props.onToggleHideDates}
            title={props.hideDates ? 'Show date nodes' : 'Hide date nodes (paper-ready view)'}
            className={`toggle-btn ${props.hideDates ? 'active' : ''}`}
            aria-pressed={props.hideDates}
          >
            {props.hideDates ? 'dates: off' : 'dates: on'}
          </button>
          <button onClick={props.onZoomOut} title="Zoom out" className="icon-btn" aria-label="Zoom out">−</button>
          <button onClick={props.onZoomIn} title="Zoom in" className="icon-btn" aria-label="Zoom in">+</button>
          <button onClick={props.onFit} title="Fit graph to screen" className="icon-btn" aria-label="Fit to screen">⊡</button>
          <button onClick={props.onExportPNG} title="Download as PNG" className="png-btn">PNG</button>
        </div>
      </div>

      {props.totalEntityCount > 0 && props.numComplexityLevels > 1 && (
        <div className="toolbar-row toolbar-complexity">
          <span
            className="relation-filter-label"
            title="Show only the most important entities. Level 1 = most central + most-mentioned only; max level = full graph."
          >
            Complexity
          </span>
          <div className="complexity-segment" aria-label="Graph complexity">
            {Array.from({ length: props.numComplexityLevels }, (_, i) => i + 1).map((level) => (
              <button
                key={level}
                className={`complexity-btn ${props.complexityLevel === level ? 'active' : ''}`}
                onClick={() => props.onComplexityChange(level)}
                aria-pressed={props.complexityLevel === level}
                title={`Level ${level} of ${props.numComplexityLevels}`}
              >
                {level}
              </button>
            ))}
          </div>
          <span className="complexity-count">
            <strong>{props.visibleEntityCount}</strong> of {props.totalEntityCount} entities
          </span>
        </div>
      )}

      {props.relations.length > 0 && (
        <div className="toolbar-row toolbar-relations">
          <span className="relation-filter-label">Relations</span>
          <div className="relation-chips">
            {props.relations.map((rel) => {
              const hidden = props.hiddenRelations.has(rel);
              return (
                <button
                  key={rel}
                  className={`relation-chip ${hidden ? 'hidden-chip' : ''}`}
                  onClick={() => props.onToggleRelation(rel)}
                  title={hidden ? `Show ${rel.replace(/_/g, ' ')}` : `Hide ${rel.replace(/_/g, ' ')}`}
                  aria-pressed={!hidden}
                >
                  {rel.replace(/_/g, ' ')}
                </button>
              );
            })}
            {anyHidden && (
              <button
                className="relation-reset"
                onClick={props.onShowAllRelations}
                title="Show all relations"
              >
                show all
              </button>
            )}
          </div>
        </div>
      )}

      {props.hiddenNodes.length > 0 && (
        <div className="toolbar-row toolbar-hidden-entities">
          <span className="relation-filter-label">Hidden ({props.hiddenNodes.length})</span>
          <div className="relation-chips">
            {props.hiddenNodes.map((n) => (
              <button
                key={n.id}
                className="hidden-entity-chip"
                onClick={() => props.onUnhideNode(n.id)}
                title={`Show ${n.label} again`}
              >
                {n.label} <span className="hidden-entity-restore">↺</span>
              </button>
            ))}
            <button
              className="relation-reset"
              onClick={props.onShowAllHidden}
              title="Show all hidden entities"
            >
              show all
            </button>
          </div>
        </div>
      )}

      <div className="graph-tips">
        Hover <span>·</span> highlight ego network <span>·</span> Click <span>·</span> inspect <span>·</span> Drag <span>·</span> pan <span>·</span> Scroll <span>·</span> zoom
      </div>
    </div>
  );
}
