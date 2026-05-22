'use client';

// app/components/GraphCanvas.tsx
import { useEffect, useRef } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import type { KGGraph, KGNode } from '../types';

interface Props {
  graph: KGGraph;
  onNodeClick: (node: KGNode) => void;
  onBackgroundClick: () => void;
}

// Map open-vocabulary entity types to a small palette of node colors.
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

// Resolve a CSS variable to its computed value (Cytoscape needs concrete colors).
function resolveCssVar(varExpr: string): string {
  if (typeof window === 'undefined') return '#4a4640';
  const match = varExpr.match(/var\((--[^)]+)\)/);
  if (!match) return varExpr;
  return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || '#4a4640';
}

export default function GraphCanvas({ graph, onNodeClick, onBackgroundClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Build elements
    const elements = [
      ...graph.nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          color: resolveCssVar(colorForType(n.type)),
          raw: n,
        },
      })),
      ...graph.edges.map((e, idx) => ({
        data: {
          id: `e_${idx}_${e.source}_${e.target}`,
          source: e.source,
          target: e.target,
          label: e.relation.replace(/_/g, ' '),
          raw: e,
        },
      })),
    ];

    const ink = resolveCssVar('var(--ink)') || '#1a1814';
    const inkSoft = resolveCssVar('var(--ink-soft)') || '#4a4640';
    const inkFaint = resolveCssVar('var(--ink-faint)') || '#8a857d';
    const bgPaper = resolveCssVar('var(--bg-paper)') || '#fbf8f1';

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      // Cytoscape's TS types are stricter than the runtime accepts; cast to any.
      style: ([
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            color: ink,
            'font-family': 'Crimson Pro, Georgia, serif',
            'font-size': 14,
            'font-weight': 500,
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'text-wrap': 'wrap',
            'text-max-width': 140,
            width: 36,
            height: 36,
            'border-width': 2,
            'border-color': bgPaper,
            'overlay-padding': 6,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': ink,
            'border-width': 3,
            width: 44,
            height: 44,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.4,
            'line-color': inkFaint,
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': inkFaint,
            'arrow-scale': 1.2,
            label: 'data(label)',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': 10,
            color: inkSoft,
            'text-background-color': bgPaper,
            'text-background-opacity': 0.9,
            'text-background-padding': '3px',
            'text-rotation': 'autorotate',
          },
        },
        {
          selector: 'edge:selected',
          style: { 'line-color': ink, 'target-arrow-color': ink, width: 2 },
        },
      ] as any),
      layout: {
        name: 'cose',
        animate: false,
        nodeRepulsion: 8000,
        idealEdgeLength: 120,
        edgeElasticity: 100,
        gravity: 0.4,
        padding: 40,
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    });

    cy.on('tap', 'node', (evt: EventObject) => {
      const data = evt.target.data();
      if (data?.raw) onNodeClick(data.raw as KGNode);
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) onBackgroundClick();
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph, onNodeClick, onBackgroundClick]);

  return <div ref={containerRef} className="cy-canvas" />;
}
