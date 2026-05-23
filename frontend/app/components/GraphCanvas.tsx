'use client';

// app/components/GraphCanvas.tsx
// Cytoscape host with:
//  - degree-based node sizing (more central entities render larger)
//  - hover + click ego-network highlighting (closed neighborhood)
//  - switchable layouts (Force / Concentric / Hierarchy / Circle / Grid)
//  - relation filter (per-edge hide/show)
//  - search-and-focus
//  - imperative handle (fit / zoom / PNG export) delivered via onReady callback,
//    which works reliably through next/dynamic where forwardRef is brittle.
import { useEffect, useRef } from 'react';
import cytoscape, { Core, EventObject, NodeSingular } from 'cytoscape';
import type { KGGraph, KGNode } from '../types';

export interface GraphCanvasHandle {
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  exportPNG: () => void;
}

interface Props {
  graph: KGGraph;
  layoutName: string;
  hiddenRelations: Set<string>;
  hiddenNodeIds: Set<string>;
  search: string;
  hideDates: boolean;
  showAllLabels: boolean;
  onNodeClick: (node: KGNode) => void;
  onBackgroundClick: () => void;
  onReady?: (handle: GraphCanvasHandle | null) => void;
}

// Treat a node as a "date" if its label looks like a year/date OR its type
// is explicitly Date. Used by the hide-dates toggle.
function isPureDateNode(label: string, type: string): boolean {
  const lbl = String(label || '').trim();
  if (/^\d{3,4}(-\d{1,2})?(-\d{1,2})?$/.test(lbl)) return true;
  return (type || '').toLowerCase() === 'date';
}

// Heuristic for an event-reification node introduced by the v2 prompt.
// These are infrastructure nodes (birth_/marriage_/founding_/discovery_/award_…)
// and we render them smaller and quieter than real entities.
const EVENT_ID_PREFIX = /^(birth_|death_|marriage_|founding_|discovery_|award_|publication_|move_|moves_|movement_)/i;
const EVENT_LABEL_PREFIX = /^(birth of|death of|marriage of|founding of|discovery of|award of|publication of|move(?:ment)? of|moves to|moved to)\b/i;

function isEventReificationNode(id: string, label: string, type: string): boolean {
  const t = (type || '').toLowerCase();
  if (t === 'event') return true;
  if (EVENT_ID_PREFIX.test(id || '')) return true;
  if (EVENT_LABEL_PREFIX.test(label || '')) return true;
  return false;
}

function colorForType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('person')) return 'var(--node-person)';
  if (t.includes('org') || t.includes('company') || t.includes('institution')) {
    return 'var(--node-org)';
  }
  if (t.includes('location') || t.includes('place') || t.includes('country') || t.includes('city')) {
    return 'var(--node-location)';
  }
  if (t.includes('concept') || t.includes('theory') || t.includes('field') || t.includes('idea')) {
    return 'var(--node-concept)';
  }
  if (t.includes('event') || t.includes('date')) return 'var(--node-event)';
  return 'var(--node-default)';
}

function resolveCssVar(varExpr: string): string {
  if (typeof window === 'undefined') return '#4a4640';
  const match = varExpr.match(/var\((--[^)]+)\)/);
  if (!match) return varExpr;
  return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || '#4a4640';
}

function alive(cy: Core | null | undefined): cy is Core {
  if (!cy) return false;
  const destroyed = (cy as any).destroyed;
  if (typeof destroyed === 'function') return !destroyed.call(cy);
  return true;
}

function layoutOptions(name: string, graph: KGGraph): any {
  const base = { animate: true, animationDuration: 700, padding: 50, fit: true };
  // Density-aware scaling: small graphs want tight layouts; large graphs need
  // proportionally more space. The exponent is gentle (1/3 power) so distances
  // don't blow up on bigger graphs.
  const N = Math.max(graph.nodes.length, 1);
  const sizeBoost = Math.max(1, Math.cbrt(N / 12));
  switch (name) {
    case 'cose':
      return {
        ...base,
        name: 'cose',
        nodeRepulsion: 11000 * sizeBoost,
        idealEdgeLength: 140 * sizeBoost,
        edgeElasticity: 70,
        gravity: 0.28,
        numIter: 1200,
        nodeDimensionsIncludeLabels: true,
      };
    case 'concentric':
      return {
        ...base,
        name: 'concentric',
        concentric: (n: any) => n.degree(),
        levelWidth: () => 2,
        minNodeSpacing: 55 * sizeBoost,
        nodeDimensionsIncludeLabels: true,
      };
    case 'breadthfirst': {
      const degree: Record<string, number> = {};
      for (const e of graph.edges) {
        degree[e.source] = (degree[e.source] || 0) + 1;
        degree[e.target] = (degree[e.target] || 0) + 1;
      }
      let root: string | undefined;
      let maxDeg = -1;
      for (const n of graph.nodes) {
        const d = degree[n.id] || 0;
        if (d > maxDeg) { maxDeg = d; root = n.id; }
      }
      return {
        ...base,
        name: 'breadthfirst',
        directed: true,
        roots: root ? `#${cssEscape(root)}` : undefined,
        spacingFactor: 1.4,
      };
    }
    case 'circle':
      return { ...base, name: 'circle', spacingFactor: 1.2 };
    case 'grid':
      return { ...base, name: 'grid', spacingFactor: 1.1 };
    default:
      return { ...base, name: 'cose' };
  }
}

function cssEscape(s: string): string {
  if (typeof window !== 'undefined' && (window as any).CSS?.escape) {
    return (window as any).CSS.escape(s);
  }
  return s.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
}

function dimNonNeighbors(cy: Core, node: NodeSingular) {
  if (!alive(cy)) return;
  const nbh = node.closedNeighborhood();
  cy.elements().addClass('dimmed');
  nbh.removeClass('dimmed');
  nbh.edges().addClass('highlighted');
}

function clearAllStates(cy: Core) {
  if (!alive(cy)) return;
  cy.elements().removeClass('dimmed highlighted');
}

export default function GraphCanvas({
  graph,
  layoutName,
  hiddenRelations,
  hiddenNodeIds,
  search,
  hideDates,
  showAllLabels,
  onNodeClick,
  onBackgroundClick,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const layoutRef = useRef<any>(null);
  // Tracks which layout the current cy was last laid out with.
  // Used so the [layoutName] effect can skip the initial run after init.
  const lastAppliedLayoutRef = useRef<string>(layoutName);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Init / re-init when the graph identity changes
  useEffect(() => {
    if (!containerRef.current) return;

    // Compute degree → node size mapping
    const degree: Record<string, number> = {};
    for (const e of graph.edges) {
      degree[e.source] = (degree[e.source] || 0) + 1;
      degree[e.target] = (degree[e.target] || 0) + 1;
    }
    const degValues = graph.nodes.map((n) => degree[n.id] || 0);
    const maxDeg = degValues.length ? Math.max(...degValues) : 1;
    const minDeg = degValues.length ? Math.min(...degValues) : 0;
    const sizeFor = (id: string): number => {
      const d = degree[id] || 0;
      if (maxDeg === minDeg) return 36;
      const norm = (d - minDeg) / (maxDeg - minDeg);
      return 28 + norm * 32;
    };

    const elements = [
      ...graph.nodes.map((n) => {
        const isEvent = isEventReificationNode(n.id, n.label, n.type);
        // Event reifications (e.g., "Birth of Maria Skłodowska") are connector
        // nodes — render them smaller and quieter so they don't compete with
        // the real entities.
        const baseSize = sizeFor(n.id);
        const size = isEvent ? Math.min(baseSize * 0.65, 26) : baseSize;
        return {
          data: {
            id: n.id,
            label: n.label,
            type: n.type,
            color: resolveCssVar(colorForType(n.type)),
            size,
            degree: degree[n.id] || 0,
            isEvent: isEvent ? 1 : 0,
            raw: n,
          },
        };
      }),
      ...graph.edges.map((e, idx) => {
        const confidence = typeof e.confidence === 'number' ? e.confidence : 0.7;
        const isFallback =
          typeof e.evidence === 'string' && e.evidence.trim().startsWith('[FALLBACK]');
        return {
          data: {
            id: `e_${idx}_${e.source}_${e.target}`,
            source: e.source,
            target: e.target,
            label: e.relation.replace(/_/g, ' '),
            relation: e.relation,
            confidence,
            // Cytoscape selectors compare strings/numbers but not booleans well;
            // store as 1/0 so the [isFallback = 1] selector works.
            isFallback: isFallback ? 1 : 0,
            raw: e,
          },
        };
      }),
    ];

    const ink = resolveCssVar('var(--ink)') || '#1a1814';
    const inkSoft = resolveCssVar('var(--ink-soft)') || '#4a4640';
    const inkFaint = resolveCssVar('var(--ink-faint)') || '#8a857d';
    const bgPaper = resolveCssVar('var(--bg-paper)') || '#fbf8f1';
    const accent = resolveCssVar('var(--accent)') || '#b91c1c';

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: ([
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: ink,
            'font-family': 'Crimson Pro, Georgia, serif',
            'font-size': 13,
            'font-weight': 500,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'text-wrap': 'wrap',
            'text-max-width': 110,
            // Paper-coloured halo behind labels so they stay legible when
            // an edge passes underneath.
            'text-background-color': bgPaper,
            'text-background-opacity': 0.85,
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            width: 'data(size)',
            height: 'data(size)',
            'border-width': 2.5,
            'border-color': bgPaper,
            'overlay-padding': 6,
            'transition-property': 'opacity, border-color, border-width, width, height',
            'transition-duration': 220,
          },
        },
        // Event-reification nodes (Birth of X, Marriage of Y, …) are structural
        // connectors. Render them smaller and quieter so the real entities pop.
        {
          selector: 'node[isEvent = 1]',
          style: {
            'background-opacity': 0.55,
            'border-style': 'dashed',
            'border-color': inkFaint,
            'border-width': 1.5,
            'font-style': 'italic',
            'font-size': 11,
            color: inkSoft,
          },
        },
        {
          selector: 'node.dimmed',
          style: { opacity: 0.18, 'text-opacity': 0.25 },
        },
        {
          selector: 'node.matched',
          style: {
            'border-color': accent,
            'border-width': 4,
            'z-index': 20,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': ink,
            'border-width': 4,
            'z-index': 25,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.3,
            'line-color': inkFaint,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': inkFaint,
            'arrow-scale': 1.1,
            // Edge labels are HIDDEN by default — they're the main source of
            // visual clutter when the graph is dense. We only show a label
            // when the edge is highlighted (hovered/selected ego network) or
            // when the user toggles "labels: on" via the toolbar.
            label: '',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': 10,
            color: inkSoft,
            'text-background-color': bgPaper,
            'text-background-opacity': 0.92,
            'text-background-padding': '3px',
            'text-rotation': 'autorotate',
            'transition-property': 'opacity, line-color, width, target-arrow-color',
            'transition-duration': 220,
          },
        },
        // Reveal edge labels for the hovered/selected ego network and when
        // the user explicitly toggles all labels on.
        {
          selector: 'edge.highlighted, edge:selected, edge.show-label',
          style: { label: 'data(label)' },
        },
        {
          selector: 'edge.dimmed',
          style: { opacity: 0.07, 'text-opacity': 0 },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': accent,
            'target-arrow-color': accent,
            width: 2.4,
            'z-index': 10,
            color: ink,
          },
        },
        {
          selector: 'edge:selected',
          style: { 'line-color': ink, 'target-arrow-color': ink, width: 2 },
        },
        // Low-confidence edges render as dashed lines.
        {
          selector: 'edge[confidence < 0.6]',
          style: { 'line-style': 'dashed' },
        },
        // Generic `related_to` fallbacks are rendered as a quieter dotted line —
        // they remain visible but read as "soft" knowledge.
        {
          selector: 'edge[isFallback = 1]',
          style: {
            'line-style': 'dotted',
            'line-color': inkFaint,
            'target-arrow-color': inkFaint,
            color: inkFaint,
            'font-style': 'italic',
          },
        },
        {
          selector: '.hidden-edge, .hidden-by-node',
          style: { display: 'none' },
        },
        {
          selector: 'node.hidden-node',
          style: { display: 'none' },
        },
      ] as any),
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.2,
    });

    cyRef.current = cy;
    lastAppliedLayoutRef.current = layoutName;

    // Event handlers — every callback guards against a destroyed cy so that
    // React Strict Mode's double-mount (which can fire queued events on a
    // disposed instance) doesn't crash.
    cy.on('tap', 'node', (evt: EventObject) => {
      if (!alive(cy)) return;
      const node = evt.target as NodeSingular;
      const data = node.data();
      if (data?.raw) onNodeClick(data.raw as KGNode);
      clearAllStates(cy);
      dimNonNeighbors(cy, node);
    });

    cy.on('tap', (evt: EventObject) => {
      if (!alive(cy)) return;
      if (evt.target === cy) {
        clearAllStates(cy);
        onBackgroundClick();
      }
    });

    cy.on('mouseover', 'node', (evt: EventObject) => {
      if (!alive(cy)) return;
      if (cy.$('node:selected').length > 0) return;
      if (cy.$('node.matched').length > 0) return;
      dimNonNeighbors(cy, evt.target as NodeSingular);
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';
    });
    cy.on('mouseout', 'node', () => {
      if (!alive(cy)) return;
      if (cy.$('node:selected').length > 0) return;
      if (cy.$('node.matched').length > 0) return;
      clearAllStates(cy);
      if (containerRef.current) containerRef.current.style.cursor = '';
    });

    // Run initial layout
    const layout = cy.layout(layoutOptions(layoutName, graph));
    layoutRef.current = layout;
    layout.run();

    // Hand the parent a stable handle bound to this cy instance. We use
    // cytoscape's synchronous viewport methods (cy.fit / cy.zoom) rather
    // than cy.animate, because the latter's argument shape is easy to get
    // wrong and silently no-ops. Sync calls update the viewport immediately
    // and never fail silently.
    const stopAllAnimations = () => {
      try { layoutRef.current?.stop?.(); } catch { /* noop */ }
      try { cy.stop(true, false); } catch { /* noop */ }
      try { cy.elements().stop(true, false); } catch { /* noop */ }
    };
    const zoomCentered = (factor: number) => {
      const container = cy.container();
      const minZ = cy.minZoom();
      const maxZ = cy.maxZoom();
      let target = cy.zoom() * factor;
      if (typeof minZ === 'number') target = Math.max(target, minZ);
      if (typeof maxZ === 'number') target = Math.min(target, maxZ);
      if (container) {
        cy.zoom({
          level: target,
          renderedPosition: {
            x: container.clientWidth / 2,
            y: container.clientHeight / 2,
          },
        });
      } else {
        cy.zoom(target);
      }
    };
    const handle: GraphCanvasHandle = {
      fit: () => {
        if (!alive(cy)) return;
        stopAllAnimations();
        cy.fit(undefined, 40);
      },
      zoomIn: () => {
        if (!alive(cy)) return;
        stopAllAnimations();
        zoomCentered(1.3);
      },
      zoomOut: () => {
        if (!alive(cy)) return;
        stopAllAnimations();
        zoomCentered(1 / 1.3);
      },
      exportPNG: () => {
        if (!alive(cy)) return;
        stopAllAnimations();
        try {
          const bg = resolveCssVar('var(--bg-paper)') || '#fbf8f1';
          const png = cy.png({ bg, scale: 2, full: true } as any);
          const a = document.createElement('a');
          a.href = png;
          a.download = 'knowledge-graph.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          // PNG export can throw if cy is mid-render; surface but don't crash.
          // eslint-disable-next-line no-console
          console.error('PNG export failed:', err);
        }
      },
    };
    onReadyRef.current?.(handle);

    return () => {
      try { layoutRef.current?.stop?.(); } catch { /* noop */ }
      try { cy.elements().stop(true, false); } catch { /* noop */ }
      try { cy.stop(true, false); } catch { /* noop */ }
      try { cy.removeAllListeners(); } catch { /* noop */ }
      onReadyRef.current?.(null);
      try { cy.destroy(); } catch { /* noop */ }
      cyRef.current = null;
      layoutRef.current = null;
    };
    // We intentionally only depend on graph identity here — layoutName,
    // hiddenRelations, and search are applied by their own effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Re-run layout when the user picks a different one (skip the run that
  // matches the layout the init effect already applied).
  useEffect(() => {
    if (lastAppliedLayoutRef.current === layoutName) return;
    const cy = cyRef.current;
    if (!alive(cy)) return;
    lastAppliedLayoutRef.current = layoutName;
    try { layoutRef.current?.stop?.(); } catch { /* noop */ }
    try { cy.stop(true, false); } catch { /* noop */ }
    try { cy.elements().stop(true, false); } catch { /* noop */ }
    const layout = cy.layout(layoutOptions(layoutName, graph));
    layoutRef.current = layout;
    layout.run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutName]);

  // Apply relation filter.
  useEffect(() => {
    const cy = cyRef.current;
    if (!alive(cy)) return;
    cy.edges().removeClass('hidden-edge');
    hiddenRelations.forEach((rel) => {
      cy.edges(`[relation = "${rel}"]`).addClass('hidden-edge');
    });
  }, [hiddenRelations]);

  // Toggle the "show all edge labels" mode. Default is off, which keeps the
  // canvas legible; the user opts in when they want to inspect every relation.
  useEffect(() => {
    const cy = cyRef.current;
    if (!alive(cy)) return;
    if (showAllLabels) cy.edges().addClass('show-label');
    else cy.edges().removeClass('show-label');
  }, [showAllLabels]);

  // Unified node-visibility effect: combines the "hide dates" toggle and the
  // user's per-entity hide list. Both write to the same `.hidden-node` class
  // so we recompute the full set whenever either input changes — otherwise
  // toggling one would clobber the other.
  useEffect(() => {
    const cy = cyRef.current;
    if (!alive(cy)) return;
    cy.nodes().removeClass('hidden-node');
    cy.edges().removeClass('hidden-by-node');
    const toHide = cy.nodes().filter((n) => {
      if (hiddenNodeIds.has(String(n.id()))) return true;
      if (hideDates && isPureDateNode(n.data('label'), n.data('type'))) return true;
      return false;
    });
    if (toHide.length === 0) return;
    toHide.addClass('hidden-node');
    toHide.connectedEdges().addClass('hidden-by-node');
  }, [hideDates, hiddenNodeIds]);

  // Apply search highlight + zoom-to-matches.
  useEffect(() => {
    const cy = cyRef.current;
    if (!alive(cy)) return;
    cy.nodes().removeClass('matched');
    const q = search.trim().toLowerCase();
    if (!q) {
      if (cy.$('node:selected').length === 0) clearAllStates(cy);
      return;
    }
    const matched = cy.nodes().filter((n) => {
      const lbl = String(n.data('label') || '').toLowerCase();
      const typ = String(n.data('type') || '').toLowerCase();
      return lbl.includes(q) || typ.includes(q);
    });
    if (matched.length === 0) {
      clearAllStates(cy);
      return;
    }
    matched.addClass('matched');
    cy.elements().addClass('dimmed');
    matched.removeClass('dimmed');
    matched.connectedEdges().removeClass('dimmed');
    matched.connectedEdges().connectedNodes().removeClass('dimmed');
    try { cy.fit(matched, 80); } catch { /* noop */ }
  }, [search]);

  return <div ref={containerRef} className="cy-canvas" />;
}
