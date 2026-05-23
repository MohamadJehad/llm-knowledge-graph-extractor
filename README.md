# LLM-Powered Knowledge Graph Extractor

> Master's course project for **CS585 — Knowledge Engineering** at the American University in Cairo, Egypt.
> Author: *Mohamad Jehad Motaz Khachfa* (ID 800241913).

A web application that takes any text and returns an interactive knowledge graph. The classic problem behind it is the **Knowledge Acquisition Bottleneck** — building knowledge bases by hand is slow and expensive. Large Language Models can now do most of this work in a single API call, and this project shows one way to make their output useful.

It supports four LLM providers: **Anthropic Claude**, **OpenAI GPT**, **Google Gemini**, and **Ollama** (local models). The UI auto-detects which providers are configured and only shows those in the dropdown menu.

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

- **Backend** (`/backend`): Node.js + Express, pluggable provider adapters that all return a normalized `{ nodes, edges }` graph.
- **Frontend** (`/frontend`): Next.js + Cytoscape.js, with an interactive graph and a click-to-inspect side panel.
- **Knowledge model**: open entity types (the LLM decides) plus a **controlled vocabulary of 23 relations**. A hybrid choice grounded in the literature (Pan et al. 2024).
- **Export**: JSON or RDF/Turtle (`.ttl`) for Semantic Web interoperability.

---

## Quick start

You need **Node.js 20+** installed.

### 1. Install

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Set up at least one provider

Copy `backend/.env.example` to `backend/.env` and add any one of the API keys below. The UI only shows providers that have a key configured.

```bash
cd backend
cp .env.example .env
# then edit .env
```

### 3. Run it

In two terminals:

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
# then open http://localhost:3000
```

---

## Getting API keys

I tested the project mostly with Claude and Gemini. Any one provider is enough to make it work.

**Anthropic (Claude)** — go to https://console.anthropic.com, sign in, then add a small amount of credits under Settings → Billing and create an API key under Settings → API Keys. Paste it into `.env` as `ANTHROPIC_API_KEY`. One thing to remember: the Claude.ai Pro subscription is not the same as API access, they are billed separately.

**OpenAI (GPT)** — go to https://platform.openai.com/api-keys, create a new key, and add billing if you do not have it yet. Paste it as `OPENAI_API_KEY`.

**Google (Gemini)** — go to https://aistudio.google.com/app/apikey and click "Create API key". The free tier is generous and enough for this project. Paste it as `GEMINI_API_KEY`. I also had some account problems with Gemini during testing, so the free tier limit can also cause failures sometimes.

**Ollama (local, free)** — install from https://ollama.com/download, then run `ollama pull llama3.1`. The backend auto-detects Ollama on the default port, so no `.env` change is needed. Local models give clearly lower quality graphs than Claude or GPT, but they are good enough to try it out.

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
              "description": "...", "source_sentences": ["..."], "aliases": ["..."] }],
  "edges": [{ "source": "marie_curie", "target": "polonium",
              "relation": "discovered_by", "evidence": "...", "confidence": 0.95 }],
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
│   │       ├── GraphToolbar.tsx   # Layout switcher, filters, complexity slider
│   │       └── SidePanel.tsx      # Click-to-inspect detail panel
│   ├── next.config.mjs            # Proxies /api/* → backend
│   └── package.json
├── samples/                        # Sample texts for evaluation
├── paper/                          # LaTeX paper + PowerPoint slides
└── README.md
```

---

## Knowledge engineering rationale

This project touches three of the main CS585 topics:

1. **Knowledge Acquisition Bottleneck** — it replaces the manual, interview-based knowledge elicitation with an automated LLM-based extraction.
2. **Knowledge Representation** — it uses a property-graph model with a controlled relation vocabulary, and also exports to RDF/Turtle for Semantic Web interoperability.
3. **Knowledge Graphs** — it produces an interactive, navigable graph that is similar in spirit to tools like Neo4j's LLM Graph Builder.

The choice of **open entity types + controlled relations** is a deliberate decision motivated by Pan et al. (2024): entity types in real text are open-ended, but relation labels need to be controlled, otherwise the same relation comes out under different names in different runs (label drift), which makes the graph hard to query.

See `paper/main.tex` for the full write-up and the qualitative evaluation.
