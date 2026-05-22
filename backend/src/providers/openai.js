// src/providers/openai.js
import OpenAI from 'openai';
import { SYSTEM_PROMPT, GRAPH_JSON_SCHEMA, normalizeGraph } from '../schema.js';

const DEFAULT_MODEL = 'gpt-4o-2024-08-06';

export const openaiProvider = {
  id: 'openai',
  name: 'OpenAI GPT',
  defaultModel: DEFAULT_MODEL,
  models: ['gpt-4o-2024-08-06', 'gpt-4o-mini', 'gpt-4-turbo'],

  isConfigured() {
    return !!process.env.OPENAI_API_KEY;
  },

  async extract(text, model = DEFAULT_MODEL) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract the knowledge graph from the following text:\n\n${text}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'knowledge_graph',
          strict: true,
          schema: GRAPH_JSON_SCHEMA,
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI response was empty.');

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(`OpenAI returned invalid JSON: ${err.message}`);
    }
    return normalizeGraph(parsed);
  },
};
