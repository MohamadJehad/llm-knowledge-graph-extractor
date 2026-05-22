# LLM-Powered Knowledge Graph Extractor

A web application that automates the extraction of structured knowledge from unstructured text using Large Language Models, addressing the **Knowledge Acquisition Bottleneck**. Paste any article, abstract, report, or notes — and instantly visualize the entities and relationships as an interactive knowledge graph.

Supports four LLM providers out of the box: **Anthropic Claude**, **OpenAI GPT**, **Google Gemini**, and **Ollama** (local models). The UI auto-detects which providers are configured and only shows those.

---

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Next.js UI    │  HTTP   │  Express API     │  HTTP   │  LLM (one of │
│   (Cytoscape)   │ ──────► │  /api/extract    │ ──────► │  Claude /    │
│                 │ ◄────── │  /api/providers  │ ◄────── │  GPT / Gemini│
└─────────────────┘  JSON   │  /api/export/ttl │   JSON  │  / Ollama)   │
                            └──────────────────┘         └──────────────┘
```

- **Backend** (`/backend`): Node.js + Express, pluggable provider adapters, all returning a normalized `{ nodes, edges }` graph.
- **Frontend** (`/frontend`): Next.js + Cytoscape.js, interactive graph with click-to-inspect side panel.
- **Knowledge model**: open entity types (LLM decides), **controlled relation vocabulary** (15 relations) — a hybrid choice grounded in the literature.
- **Export**: JSON or RDF/Turtle (`.ttl`) for Semantic Web interoperability.

---

## Quick start

You need **Node.js 20+** installed.

### 1. Clone and install

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure at least one provider

Copy `backend/.env.example` to `backend/.env` and fill in any one (or more) of the keys below. The UI auto-detects which providers have keys and only shows those.

```bash
cd backend
cp .env.example .env
# then edit .env
```

### 3. Run

In two terminals:

```bash
# terminal 1
cd backend && npm run dev
# → "KG Extractor API listening on http://localhost:3001"

# terminal 2
cd frontend && npm run dev
# → open http://localhost:3000
```

---

## Getting API keys

### Anthropic (Claude) — recommended

> **Note:** Your Claude.ai Pro/Max subscription is **separate** from API access. You need API credits, billed separately.

1. Go to **https://console.anthropic.com**.
2. Sign in (you can reuse your Claude.ai email — it creates a separate API workspace).
3. **Settings → Billing → Add credits** (minimum $5; that covers hundreds of extractions for this project).
4. **Settings → API Keys → Create Key**. Copy the `sk-ant-...` key.
5. Paste into `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

**Cost**: Claude Sonnet 4.5 costs roughly $0.01–$0.03 per extraction on typical paragraphs. $5 of credits = several hundred extractions.

### OpenAI (GPT)

1. Go to **https://platform.openai.com/api-keys**.
2. Sign in, click **Create new secret key**, copy the `sk-...` key.
3. Add billing if you haven't already (Settings → Billing).
4. Paste into `backend/.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```

### Google (Gemini) — has a free tier

1. Go to **https://aistudio.google.com/app/apikey**.
2. Sign in with a Google account, click **Create API key**.
3. Paste into `backend/.env`:
   ```
   GEMINI_API_KEY=...
   ```

Gemini's free tier is generous and works fine for this project.

### Ollama (local, completely free)

1. Install Ollama from **https://ollama.com/download**.
2. Pull a model that supports JSON output well:
   ```bash
   ollama pull llama3.1
   # or: qwen2.5, mistral, gemma2
   ```
3. Make sure the daemon is running (`ollama serve` if not auto-started).
4. The backend auto-detects Ollama on `http://localhost:11434`. No `.env` change needed unless you customized the host.

> **Note**: Local models produce noticeably lower-quality knowledge graphs than commercial APIs — useful for the comparison section in the paper, but you'll want at least one commercial provider for the demo.

---

## API reference

### `GET /api/providers`
Returns the list of configured providers.
```json
{
  "providers": [
    { "id": "anthropic", "name": "Anthropic Claude",
      "defaultModel": "claude-sonnet-4-5-20250929",
      "models": ["claude-sonnet-4-5-20250929", "claude-opus-4-5-20251101", "..."] }
  ]
}
```

### `POST /api/extract`
**Body**: `{ "text": "...", "provider": "anthropic", "model": "claude-sonnet-4-5-20250929" }`
**Returns**: a normalized graph plus extraction metadata.
```json
{
  "nodes": [{ "id": "marie_curie", "label": "Marie Curie", "type": "Person",
              "description": "...", "source_sentences": ["..."] }],
  "edges": [{ "source": "marie_curie", "target": "polonium",
              "relation": "developed_by", "evidence": "..." }],
  "meta": { "provider": "anthropic", "model": "...", "elapsedMs": 4321,
            "nodeCount": 7, "edgeCount": 11 }
}
```

### `POST /api/export/turtle`
**Body**: a graph object (`{ nodes, edges }`).
**Returns**: `text/turtle` file download.

---

## Project structure

```
kg-extractor/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app
│   │   ├── schema.js              # Shared prompt + JSON schema + normalizer
│   │   ├── rdf.js                 # Turtle serializer
│   │   └── providers/
│   │       ├── index.js           # Provider registry + auto-detection
│   │       ├── anthropic.js       # Claude (tool use)
│   │       ├── openai.js          # GPT (structured outputs)
│   │       ├── gemini.js          # Gemini (responseSchema)
│   │       └── ollama.js          # Ollama (format=json)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Main page
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── types.ts
│   │   ├── samples.ts             # Sample texts for quick testing
│   │   └── components/
│   │       ├── GraphCanvas.tsx    # Cytoscape host
│   │       └── SidePanel.tsx      # Click-to-inspect detail panel
│   ├── next.config.mjs            # Proxies /api/* → backend
│   └── package.json
├── samples/                        # Sample texts for evaluation
├── paper/                          # LaTeX paper (LNCS)
├── slides/                         # PowerPoint presentation
└── README.md
```

---

## Knowledge engineering rationale

This system directly addresses three core CS585 concepts:

1. **Knowledge Acquisition Bottleneck** — replaces manual interview-based knowledge elicitation with automated LLM-based extraction.
2. **Knowledge Representation** — uses a property-graph model with a controlled relation vocabulary; exports to RDF/Turtle for Semantic Web interoperability.
3. **Knowledge Graphs** — produces an interactive, navigable graph in the same style as systems like Neo4j's LLM Graph Builder.

The choice of **open entity types + controlled relations** is a deliberate design decision motivated by Pan et al. (2024): entity types in real text are unbounded, but relation labels must be controlled to keep the graph queryable and avoid label drift.

See `paper/main.pdf` for the full write-up and qualitative evaluation across providers.
