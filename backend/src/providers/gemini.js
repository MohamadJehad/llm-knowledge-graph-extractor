// src/providers/gemini.js
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { SYSTEM_PROMPT, RELATION_VOCABULARY, normalizeGraph } from '../schema.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';

// Gemini's SchemaType uses different enum constants from raw JSON Schema, so we
// build an equivalent schema using its SDK types. Mirrors GRAPH_JSON_SCHEMA.
const GEMINI_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    nodes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          label: { type: SchemaType.STRING },
          type: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          source_sentences: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
          aliases: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
          },
        },
        required: ['id', 'label', 'type', 'description', 'source_sentences', 'aliases'],
      },
    },
    edges: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          source: { type: SchemaType.STRING },
          target: { type: SchemaType.STRING },
          relation: {
            type: SchemaType.STRING,
            enum: RELATION_VOCABULARY,
          },
          evidence: { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER },
        },
        required: ['source', 'target', 'relation', 'evidence', 'confidence'],
      },
    },
  },
  required: ['nodes', 'edges'],
};

export const geminiProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  defaultModel: DEFAULT_MODEL,
  models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],

  isConfigured() {
    return !!process.env.GEMINI_API_KEY;
  },

  async extract(text, model = DEFAULT_MODEL) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const generativeModel = genAI.getGenerativeModel({
      model,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: GEMINI_SCHEMA,
      },
    });

    const result = await generativeModel.generateContent(
      `Extract the knowledge graph from the following text:\n\n${text}`,
    );
    const responseText = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      throw new Error(`Gemini returned invalid JSON: ${err.message}`);
    }
    return normalizeGraph(parsed);
  },
};
