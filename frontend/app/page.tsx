'use client';

// app/page.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { KGGraph, KGNode, ProviderInfo } from './types';
import SidePanel from './components/SidePanel';
import GraphToolbar from './components/GraphToolbar';
import Legend from './components/Legend';
import type { GraphCanvasHandle } from './components/GraphCanvas';
import { SAMPLE_TEXTS } from './samples';

// Cytoscape needs the DOM, so we load it client-only.
const GraphCanvas = dynamic(() => import('./components/GraphCanvas'), { ssr: false });

export default function Home() {
  const [text, setText] = useState('');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerId, setProviderId] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [graph, setGraph] = useState<KGGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
  const [providersLoaded, setProvidersLoaded] = useState(false);

  // Graph view state
  const [layout, setLayout] = useState<string>('cose');
  const [search, setSearch] = useState<string>('');
  const [hiddenRelations, setHiddenRelations] = useState<Set<string>>(new Set());
  const [hideDates, setHideDates] = useState<boolean>(false);
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);
  // User-driven per-entity hide list (independent of the dates filter).
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());
  // Complexity slider: 1..numLevels (numLevels depends on graph size).
  // Lower levels keep only the most central/most-mentioned entities; the
  // highest level shows the full graph. Reset to max whenever a new graph
  // loads so the user starts from "show me everything."
  const [complexityLevel, setComplexityLevel] = useState<number>(5);
  // The canvas hands us back an imperative handle via onReady; we hold it in
  // a ref so toolbar callbacks can call into it without re-rendering.
  const canvasRef = useRef<GraphCanvasHandle | null>(null);
  const handleCanvasReady = useCallback((h: GraphCanvasHandle | null) => {
    canvasRef.current = h;
  }, []);

  // Fetch available providers on mount
  useEffect(() => {
    fetch('/api/providers')
      .then((r) => r.json())
      .then((data) => {
        const list: ProviderInfo[] = data.providers || [];
        setProviders(list);
        if (list.length > 0) {
          setProviderId(list[0].id);
          setModel(list[0].defaultModel);
        }
      })
      .catch((err) => setError(`Failed to load providers: ${err.message}`))
      .finally(() => setProvidersLoaded(true));
  }, []);

  const currentProvider = useMemo(
    () => providers.find((p) => p.id === providerId),
    [providers, providerId],
  );

  // When provider changes, reset model to its default
  useEffect(() => {
    if (currentProvider) setModel(currentProvider.defaultModel);
  }, [currentProvider]);

  // Reset graph-view state whenever a new graph is loaded.
  // Smart default layout: if the graph has a clear "hub" (one node connected
  // to ≥40% of all others), use Concentric — it renders hub-and-spoke graphs
  // much more legibly than Force.
  useEffect(() => {
    setSearch('');
    setHiddenRelations(new Set());
    setHideDates(false);
    setShowAllLabels(false);
    setHiddenNodeIds(new Set());
    setSelectedNode(null);
    if (!graph) return;
    const degree: Record<string, number> = {};
    for (const e of graph.edges) {
      degree[e.source] = (degree[e.source] || 0) + 1;
      degree[e.target] = (degree[e.target] || 0) + 1;
    }
    const maxDeg = Math.max(0, ...Object.values(degree));
    const hubRatio = maxDeg / Math.max(1, graph.nodes.length - 1);
    setLayout(hubRatio >= 0.4 ? 'concentric' : 'cose');
    // Start each new graph at maximum complexity (show everything).
    const levels = Math.min(7, Math.max(3, Math.ceil(graph.nodes.length / 5)));
    setComplexityLevel(levels);
  }, [graph]);

  const availableRelations = useMemo(() => {
    if (!graph) return [];
    const seen = new Set<string>();
    for (const e of graph.edges) seen.add(e.relation);
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [graph]);

  // ---- Complexity (importance-ranked entity filtering) ----------------------
  // We rank entities by `degree + 2 × mention_count`. Highly-connected,
  // frequently-mentioned entities rank highest. The slider's top level shows
  // them all; lower levels keep only the top-K rank.
  const entityRanking = useMemo(() => {
    if (!graph) return [] as { id: string; score: number }[];
    const degree: Record<string, number> = {};
    for (const e of graph.edges) {
      degree[e.source] = (degree[e.source] || 0) + 1;
      degree[e.target] = (degree[e.target] || 0) + 1;
    }
    return graph.nodes
      .map((n) => ({
        id: n.id,
        score:
          (degree[n.id] || 0) +
          2 * (Array.isArray(n.source_sentences) ? n.source_sentences.length : 0),
      }))
      .sort((a, b) => b.score - a.score);
  }, [graph]);

  // Number of complexity levels scales with graph size: 3 for tiny graphs,
  // up to 7 for large ones. Stable for a given graph.
  const numLevels = useMemo(() => {
    if (!graph) return 5;
    return Math.min(7, Math.max(3, Math.ceil(graph.nodes.length / 5)));
  }, [graph]);

  // How many entities to keep visible at the current level.
  const visibleEntityCount = useMemo(() => {
    if (!graph) return 0;
    if (complexityLevel >= numLevels) return graph.nodes.length;
    const ratio = complexityLevel / numLevels;
    // Always show at least 3 (or the whole graph if it's smaller).
    return Math.max(Math.min(3, graph.nodes.length), Math.ceil(graph.nodes.length * ratio));
  }, [graph, complexityLevel, numLevels]);

  // The set of node IDs hidden purely because of the complexity slider.
  const complexityHiddenIds = useMemo(() => {
    const hidden = new Set<string>();
    if (!graph) return hidden;
    if (complexityLevel >= numLevels) return hidden;
    const visible = new Set(entityRanking.slice(0, visibleEntityCount).map((e) => e.id));
    for (const n of graph.nodes) {
      if (!visible.has(n.id)) hidden.add(n.id);
    }
    return hidden;
  }, [graph, complexityLevel, numLevels, visibleEntityCount, entityRanking]);

  // Effective hidden set passed to the canvas = manual hides + complexity hides.
  const effectiveHiddenIds = useMemo(() => {
    if (complexityHiddenIds.size === 0) return hiddenNodeIds;
    const merged = new Set(hiddenNodeIds);
    complexityHiddenIds.forEach((id) => merged.add(id));
    return merged;
  }, [hiddenNodeIds, complexityHiddenIds]);

  const handleExtract = async () => {
    if (!text.trim() || !providerId) return;
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    setGraph(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, provider: providerId, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setGraph(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!graph) return;
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knowledge-graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTurtle = async () => {
    if (!graph) return;
    try {
      const res = await fetch('/api/export/turtle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: graph.nodes, edges: graph.edges }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'knowledge-graph.ttl';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSampleClick = (sampleText: string) => {
    setText(sampleText);
  };

  const handleNodeClick = useCallback((node: KGNode) => {
    setSelectedNode(node);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const toggleRelation = (rel: string) => {
    setHiddenRelations((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
  };

  const showAllRelations = () => setHiddenRelations(new Set());

  const hideNodeById = (id: string) => {
    setHiddenNodeIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    // The selected entity is the one being hidden — close the panel so the
    // user doesn't see details of an off-screen node.
    setSelectedNode(null);
  };

  const unhideNodeById = (id: string) => {
    setHiddenNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const showAllHidden = () => setHiddenNodeIds(new Set());

  const hiddenNodesList = useMemo(() => {
    if (!graph || hiddenNodeIds.size === 0) return [];
    return graph.nodes
      .filter((n) => hiddenNodeIds.has(n.id))
      .map((n) => ({ id: n.id, label: n.label }));
  }, [graph, hiddenNodeIds]);

  const hasGraph = graph && graph.nodes.length > 0;

  return (
    <div className="app">
      <header className="masthead">
        <h1 className="masthead-title">
          Knowledge Graph <em>Extractor</em>
        </h1>
        <div className="masthead-meta">
          <div>LLM-powered · multi-provider</div>
          <div>
            <strong>Knowledge Engineering · CSCE526301</strong>
          </div>
        </div>
      </header>

      <div className="workspace">
        <section className="input-column">
          <h2>Input text</h2>

          {providersLoaded && providers.length === 0 && (
            <div className="no-providers">
              <strong>No providers configured.</strong>
              <br />
              Add at least one API key to <code>backend/.env</code> (Anthropic,
              OpenAI, or Gemini) — or install Ollama and run a local model. See
              the README.
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an article, abstract, report, or meeting notes here…"
          />

          <div className="controls">
            <div className="control-row">
              <label htmlFor="provider">Provider</label>
              <select
                id="provider"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                disabled={providers.length === 0}
              >
                {providers.length === 0 && <option>— none configured —</option>}
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-row">
              <label htmlFor="model">Model</label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!currentProvider}
              >
                {currentProvider?.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn-extract"
              onClick={handleExtract}
              disabled={loading || !text.trim() || !providerId}
            >
              {loading ? 'Extracting…' : 'Extract knowledge graph'}
            </button>
          </div>

          <div className="sample-texts">
            <h3>Try a sample</h3>
            <div className="sample-list">
              {SAMPLE_TEXTS.map((s) => (
                <button
                  key={s.title}
                  className="sample-btn"
                  onClick={() => handleSampleClick(s.text)}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="graph-column">
          <div className="graph-header">
            <div className="graph-stats">
              {graph ? (
                <>
                  <strong>{graph.nodes.length}</strong> entities ·{' '}
                  <strong>{graph.edges.length}</strong> relations
                  {graph.meta && (
                    <>
                      {' '}
                      · <strong>{graph.meta.provider}</strong> ·{' '}
                      {(graph.meta.elapsedMs / 1000).toFixed(1)}s
                    </>
                  )}
                </>
              ) : (
                'No graph yet'
              )}
            </div>
            <div className="export-buttons">
              <button onClick={handleExportJson} disabled={!graph}>
                JSON
              </button>
              <button onClick={handleExportTurtle} disabled={!graph}>
                Turtle (RDF)
              </button>
            </div>
          </div>

          {hasGraph && (
            <GraphToolbar
              layout={layout}
              onLayoutChange={setLayout}
              search={search}
              onSearchChange={setSearch}
              relations={availableRelations}
              hiddenRelations={hiddenRelations}
              onToggleRelation={toggleRelation}
              onShowAllRelations={showAllRelations}
              hideDates={hideDates}
              onToggleHideDates={() => setHideDates((v) => !v)}
              showAllLabels={showAllLabels}
              onToggleShowAllLabels={() => setShowAllLabels((v) => !v)}
              hiddenNodes={hiddenNodesList}
              onUnhideNode={unhideNodeById}
              onShowAllHidden={showAllHidden}
              complexityLevel={complexityLevel}
              numComplexityLevels={numLevels}
              visibleEntityCount={visibleEntityCount}
              totalEntityCount={graph?.nodes.length ?? 0}
              onComplexityChange={setComplexityLevel}
              onZoomIn={() => canvasRef.current?.zoomIn()}
              onZoomOut={() => canvasRef.current?.zoomOut()}
              onFit={() => canvasRef.current?.fit()}
              onExportPNG={() => canvasRef.current?.exportPNG()}
            />
          )}

          {error && <div className="error-banner">⚠ {error}</div>}

          <div className="cy-host">
            {!graph && !loading && (
              <div className="empty-state">
                <div className="empty-state-glyph">∴</div>
                <h3>Awaiting input</h3>
                <p>
                  Paste text on the left and click <em>Extract</em> to render
                  entities and their relationships as a graph.
                </p>
              </div>
            )}

            {loading && (
              <div className="loading">
                <div className="loading-orbit" aria-hidden>
                  <span /><span /><span />
                </div>
                <div className="loading-text">Extracting knowledge</div>
              </div>
            )}

            {hasGraph && graph && (
              <GraphCanvas
                graph={graph}
                layoutName={layout}
                hiddenRelations={hiddenRelations}
                hiddenNodeIds={effectiveHiddenIds}
                search={search}
                hideDates={hideDates}
                showAllLabels={showAllLabels}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                onReady={handleCanvasReady}
              />
            )}

            {hasGraph && graph && <Legend graph={graph} />}

            {graph?.nodes.length === 0 && !loading && (
              <div className="empty-state">
                <div className="empty-state-glyph">⌀</div>
                <h3>No entities found</h3>
                <p>The model returned an empty graph for this text. Try a longer or more entity-rich passage.</p>
              </div>
            )}

            {selectedNode && graph && (
              <SidePanel
                node={selectedNode}
                graph={graph}
                onClose={() => setSelectedNode(null)}
                onHide={() => hideNodeById(selectedNode.id)}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
