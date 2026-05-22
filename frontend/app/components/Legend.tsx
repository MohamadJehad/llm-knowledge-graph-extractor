'use client';

// app/components/Legend.tsx
// Floating legend mapping the entity-type colour palette to the
// categories actually present in the current graph (with counts).

import type { KGGraph } from '../types';

function categoryForType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('person')) return 'Person';
  if (t.includes('org') || t.includes('company') || t.includes('institution')) return 'Organization';
  if (t.includes('location') || t.includes('place') || t.includes('country') || t.includes('city')) return 'Location';
  if (t.includes('concept') || t.includes('theory') || t.includes('field') || t.includes('idea')) return 'Concept';
  if (t.includes('event') || t.includes('date')) return 'Event';
  return 'Other';
}

function cssVarForCategory(cat: string): string {
  switch (cat) {
    case 'Person': return '--node-person';
    case 'Organization': return '--node-org';
    case 'Location': return '--node-location';
    case 'Concept': return '--node-concept';
    case 'Event': return '--node-event';
    default: return '--node-default';
  }
}

const CATEGORY_ORDER = ['Person', 'Organization', 'Location', 'Concept', 'Event', 'Other'];

interface Props { graph: KGGraph; }

export default function Legend({ graph }: Props) {
  const counts = new Map<string, number>();
  for (const n of graph.nodes) {
    const cat = categoryForType(n.type);
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  const entries = CATEGORY_ORDER
    .filter((c) => counts.has(c))
    .map((c) => [c, counts.get(c)!] as const);

  if (entries.length === 0) return null;

  return (
    <div className="legend" aria-label="Entity type legend">
      <div className="legend-title">Entities</div>
      <ul className="legend-list">
        {entries.map(([cat, count]) => (
          <li key={cat}>
            <span
              className="legend-swatch"
              style={{ background: `var(${cssVarForCategory(cat)})` }}
            />
            <span className="legend-cat">{cat}</span>
            <span className="legend-count">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
