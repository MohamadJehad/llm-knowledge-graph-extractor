// src/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { providers, getAvailableProviders } from './providers/index.js';
import { graphToTurtle } from './rdf.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3001;

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List configured providers (auto-detection)
app.get('/api/providers', async (_req, res) => {
  try {
    const list = await getAvailableProviders();
    res.json({ providers: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Main extraction endpoint
app.post('/api/extract', async (req, res) => {
  const { text, provider: providerId, model } = req.body || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Field "text" is required and must be a non-empty string.' });
  }
  if (text.length > 50000) {
    return res.status(400).json({ error: 'Text is too long (max 50,000 characters).' });
  }
  if (!providerId || !providers[providerId]) {
    return res.status(400).json({
      error: `Unknown provider "${providerId}". Available: ${Object.keys(providers).join(', ')}.`,
    });
  }

  const provider = providers[providerId];
  const configured = await Promise.resolve(provider.isConfigured());
  if (!configured) {
    return res.status(400).json({ error: `Provider "${providerId}" is not configured.` });
  }

  const startTime = Date.now();
  try {
    const graph = await provider.extract(text, model);
    const elapsedMs = Date.now() - startTime;
    res.json({
      ...graph,
      meta: {
        provider: providerId,
        model: model || provider.defaultModel,
        elapsedMs,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
      },
    });
  } catch (err) {
    console.error(`[extract:${providerId}]`, err);
    res.status(500).json({
      error: err.message || 'Extraction failed.',
      provider: providerId,
    });
  }
});

// Turtle export — accepts a graph object and returns text/turtle
app.post('/api/export/turtle', (req, res) => {
  const graph = req.body;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return res.status(400).json({ error: 'Body must be a graph with nodes and edges arrays.' });
  }
  try {
    const turtle = graphToTurtle(graph);
    res.set('Content-Type', 'text/turtle; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="knowledge-graph.ttl"');
    res.send(turtle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`KG Extractor API listening on http://localhost:${PORT}`);
});
