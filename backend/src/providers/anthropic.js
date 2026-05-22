// src/providers/anthropic.js
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, GRAPH_JSON_SCHEMA, normalizeGraph } from '../schema.js';

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

export const anthropicProvider = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  defaultModel: DEFAULT_MODEL,
  models: [
    'claude-sonnet-4-5-20250929',
    'claude-opus-4-5-20251101',
    'claude-haiku-4-5-20251001',
  ],

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  async extract(text, model = DEFAULT_MODEL) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: 'emit_graph',
          description: 'Emit the extracted knowledge graph as nodes and edges.',
          input_schema: GRAPH_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'emit_graph' },
      messages: [
        { role: 'user', content: `Extract the knowledge graph from the following text:\n\n${text}` },
      ],
    });

    // Find the tool_use block
    const toolUse = response.content.find((b) => b.type === 'tool_use');
    if (!toolUse) {
      throw new Error('Anthropic response did not contain a tool_use block.');
    }
    return normalizeGraph(toolUse.input);
  },
};
