// src/providers/index.js
import { anthropicProvider } from './anthropic.js';
import { openaiProvider } from './openai.js';
import { geminiProvider } from './gemini.js';
import { ollamaProvider } from './ollama.js';

export const providers = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
};

/**
 * Returns the list of currently configured providers (for GET /api/providers).
 * Some providers' isConfigured is async (Ollama needs to ping its daemon).
 */
export async function getAvailableProviders() {
  const list = [];
  for (const p of Object.values(providers)) {
    const ok = await Promise.resolve(p.isConfigured());
    if (ok) {
      list.push({
        id: p.id,
        name: p.name,
        defaultModel: p.defaultModel,
        models: p.models,
      });
    }
  }
  return list;
}
