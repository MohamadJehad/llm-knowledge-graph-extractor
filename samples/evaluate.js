// samples/evaluate.js
// Comparative evaluation: runs every configured provider against every sample
// text and saves the outputs for inclusion in the paper.
//
// Usage (after `cd backend && npm install` and configuring backend/.env):
//   node samples/evaluate.js
//
// Outputs are written to samples/results/<provider>_<sample>.json

import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { providers, getAvailableProviders } from '../backend/src/providers/index.js';

// Load .env from backend/ so the same keys work
import { config } from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../backend/.env') });

const RESULTS_DIR = resolve(__dirname, 'results');
mkdirSync(RESULTS_DIR, { recursive: true });

const SAMPLES = [
  {
    id: 'einstein',
    title: 'Scientific biography',
    text: `Albert Einstein was a German-born theoretical physicist who developed the theory of relativity, one of the two pillars of modern physics. Born in Ulm in 1879, Einstein moved to Switzerland as a young man and later worked at the Swiss Patent Office in Bern. In 1905, while still a patent examiner, he published four groundbreaking papers including the special theory of relativity. He was awarded the Nobel Prize in Physics in 1921 for his discovery of the photoelectric effect. After fleeing Nazi Germany in 1933, Einstein joined the Institute for Advanced Study in Princeton, where he worked until his death in 1955.`,
  },
  {
    id: 'openai',
    title: 'Business / technology',
    text: `OpenAI is an artificial intelligence research laboratory headquartered in San Francisco. The company was founded in December 2015 by Sam Altman, Elon Musk, Greg Brockman, Ilya Sutskever, and several other researchers. OpenAI developed the GPT series of large language models, with GPT-4 being released in 2023. Microsoft has invested billions of dollars in OpenAI and integrates its models into products like Copilot and Azure. In 2022, OpenAI launched ChatGPT, a conversational AI application that reached 100 million users within two months.`,
  },
  {
    id: 'greenhouse',
    title: 'Concept-heavy science',
    text: `The greenhouse effect is a natural process in which gases in Earth's atmosphere trap heat from the Sun. Carbon dioxide, methane, and water vapor are the main greenhouse gases. Since the Industrial Revolution, human activities such as burning fossil fuels and deforestation have increased atmospheric carbon dioxide concentrations significantly. This enhanced greenhouse effect causes global warming, which leads to rising sea levels and more frequent extreme weather. The Intergovernmental Panel on Climate Change, established by the United Nations in 1988, assesses scientific evidence on climate change.`,
  },
];

const summary = [];
const available = await getAvailableProviders();
console.log(`Configured providers: ${available.map((p) => p.id).join(', ') || '(none)'}\n`);

for (const provInfo of available) {
  const provider = providers[provInfo.id];
  for (const sample of SAMPLES) {
    process.stdout.write(`[${provInfo.id}] ${sample.id}... `);
    const start = Date.now();
    try {
      const graph = await provider.extract(sample.text);
      const latency = Date.now() - start;
      const out = {
        provider: provInfo.id,
        model: provInfo.defaultModel,
        sample_id: sample.id,
        sample_title: sample.title,
        latency_ms: latency,
        node_count: graph.nodes.length,
        edge_count: graph.edges.length,
        graph,
      };
      writeFileSync(
        resolve(RESULTS_DIR, `${provInfo.id}_${sample.id}.json`),
        JSON.stringify(out, null, 2),
      );
      summary.push({
        provider: provInfo.id,
        sample: sample.id,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        ms: latency,
      });
      console.log(`✓ ${graph.nodes.length}n / ${graph.edges.length}e in ${latency}ms`);
    } catch (err) {
      console.error(`✗ ${err.message}`);
      summary.push({ provider: provInfo.id, sample: sample.id, error: err.message });
    }
  }
}

writeFileSync(resolve(RESULTS_DIR, '_summary.json'), JSON.stringify(summary, null, 2));
console.log('\nResults written to samples/results/');
console.table(summary);
