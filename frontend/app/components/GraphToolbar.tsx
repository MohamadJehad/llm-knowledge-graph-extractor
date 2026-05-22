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
          <button onClick={props.onZoomOut} title="Zoom out" className="icon-btn" aria-label="Zoom out">−</button>
          <button onClick={props.onZoomIn} title="Zoom in" className="icon-btn" aria-label="Zoom in">+</button>
          <button onClick={props.onFit} title="Fit graph to screen" className="icon-btn" aria-label="Fit to screen">⊡</button>
          <button onClick={props.onExportPNG} title="Download as PNG" className="png-btn">PNG</button>
        </div>
      </div>

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

      <div className="graph-tips">
        Hover <span>·</span> highlight ego network <span>·</span> Click <span>·</span> inspect <span>·</span> Drag <span>·</span> pan <span>·</span> Scroll <span>·</span> zoom
      </div>
    </div>
  );
}
