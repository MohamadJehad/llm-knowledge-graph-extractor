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

  // Reset graph-view state whenever a new graph is loaded
  useEffect(() => {
    setSearch('');
    setHiddenRelations(new Set());
    setLayout('cose');
    setSelectedNode(null);
  }, [graph]);

  const availableRelations = useMemo(() => {
    if (!graph) return [];
    const seen = new Set<string>();
    for (const e of graph.edges) seen.add(e.relation);
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [graph]);

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
            <strong>Knowledge Engineering · CS585</strong>
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
                search={search}
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
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
