// src/providers/ollama.js
// Local models via the Ollama HTTP API. Auto-detects whether Ollama is running
// at OLLAMA_HOST (default http://localhost:11434).
import { SYSTEM_PROMPT, normalizeGraph } from '../schema.js';

const DEFAULT_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

function host() {
  return process.env.OLLAMA_HOST || DEFAULT_HOST;
}

export const ollamaProvider = {
  id: 'ollama',
  name: 'Ollama (local)',
  defaultModel: DEFAULT_MODEL,
  // Models list is dynamic — populated by isConfigured() at startup.
  models: [DEFAULT_MODEL],

  async isConfigured() {
    // Considered configured if the Ollama daemon responds on /api/tags.
    try {
      const res = await fetch(`${host()}/api/tags`, {
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return false;
      const data = await res.json();
      const tags = (data.models || []).map((m) => m.name);
      if (tags.length > 0) {
        this.models = tags;
        // If the configured default isn't installed, fall back to the first available.
        if (!tags.includes(this.defaultModel)) {
          this.defaultModel = tags[0];
        }
      }
      return tags.length > 0;
    } catch {
      return false;
    }
  },

  async extract(text, model) {
    const useModel = model || this.defaultModel;
    const res = await fetch(`${host()}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: useModel,
        format: 'json',
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract the knowledge graph from the following text. Return ONLY a JSON object with "nodes" and "edges" arrays.\n\n${text}`,
          },
        ],
        options: { temperature: 0 },
      }),
    });
    if (!res.ok) {
      throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const content = data.message?.content;
    if (!content) throw new Error('Ollama response was empty.');

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(`Ollama returned invalid JSON: ${err.message}`);
    }
    return normalizeGraph(parsed);
  },
};
