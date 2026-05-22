// build-slides.js
// Generates the presentation deck for "LLM-Powered Knowledge Graph Extractor"
// Editorial / scholarly aesthetic, matching the paper and web app.

const pptxgen = require('pptxgenjs');
const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10" x 5.625"
pres.title = 'LLM-Powered Knowledge Graph Extractor';
pres.author = 'CS585 Knowledge Engineering';

// ---- Palette ----------------------------------------------------------
const C = {
  ink:       '1A1814',
  inkSoft:   '4A4640',
  inkFaint:  '8A857D',
  cream:     'FBF8F1',
  paper:     'F5F1E8',
  rule:      'D8D2C4',
  accent:    'B91C1C',   // cherry / academic red
  accentSoft:'FCE8E8',
  blue:      '1E40AF',
  green:     '166534',
  amber:     '92400E',
  purple:    '6B21A8',
};

const FONT_DISPLAY = 'Georgia';   // Available everywhere; serif display
const FONT_BODY    = 'Calibri';
const FONT_MONO    = 'Consolas';

// Helpers -----------------------------------------------------------------
function bg(slide, color = C.cream) { slide.background = { color }; }

function pageFooter(slide, idx, total) {
  // Small monospaced footer with page number and section
  slide.addShape(pres.shapes.LINE, {
    x: 0.5, y: 5.25, w: 9.0, h: 0,
    line: { color: C.rule, width: 0.75 },
  });
  slide.addText('Knowledge Graph Extractor  ·  CS585', {
    x: 0.5, y: 5.32, w: 5, h: 0.25,
    fontFace: FONT_MONO, fontSize: 8, color: C.inkFaint, charSpacing: 1.5,
  });
  slide.addText(`${idx} / ${total}`, {
    x: 8.0, y: 5.32, w: 1.5, h: 0.25,
    fontFace: FONT_MONO, fontSize: 8, color: C.inkFaint, align: 'right',
  });
}

function eyebrow(slide, text, x = 0.5, y = 0.45) {
  slide.addText(text, {
    x, y, w: 6, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.accent,
    charSpacing: 4, bold: true,
  });
}

function slideTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.5, y: 0.78, w: 9, h: 0.85,
    fontFace: FONT_DISPLAY, fontSize: opts.size || 32, color: C.ink,
    bold: true, margin: 0, ...opts,
  });
}

const TOTAL = 13; // updated below if changes

// =======================================================================
// SLIDE 1 — Title (dark)
// =======================================================================
{
  const s = pres.addSlide();
  bg(s, C.ink);

  // Decorative monogram
  s.addText('∴', {
    x: 0.5, y: 0.45, w: 0.6, h: 0.6,
    fontFace: FONT_DISPLAY, fontSize: 44, color: C.accent, italic: true,
  });
  s.addText('CS585  ·  KNOWLEDGE ENGINEERING', {
    x: 1.15, y: 0.6, w: 5, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.accent, charSpacing: 4, bold: true,
  });

  // Title
  s.addText('LLM-Powered', {
    x: 0.5, y: 1.45, w: 9, h: 0.85,
    fontFace: FONT_DISPLAY, fontSize: 42, color: C.cream, bold: true, margin: 0,
  });
  s.addText([
    { text: 'Knowledge Graph ', options: { color: C.cream } },
    { text: 'Extractor', options: { color: C.accent, italic: true } },
  ], {
    x: 0.5, y: 2.35, w: 9, h: 0.85,
    fontFace: FONT_DISPLAY, fontSize: 42, bold: true, margin: 0,
  });

  s.addText('Automating the knowledge acquisition bottleneck with multi-provider LLM extraction', {
    x: 0.5, y: 3.5, w: 9, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 16, color: C.inkFaint, italic: true, margin: 0,
  });

  // Author + date strip
  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 4.55, w: 1.2, h: 0,
    line: { color: C.accent, width: 1.5 },
  });
  s.addText('Author Name', {
    x: 0.5, y: 4.62, w: 5, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 13, color: C.cream, italic: true, margin: 0,
  });
  s.addText('Graduate Program  ·  Knowledge Engineering', {
    x: 0.5, y: 4.92, w: 5, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.inkFaint, charSpacing: 2, margin: 0,
  });
}

// =======================================================================
// SLIDE 2 — The Problem
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'THE PROBLEM');
  slideTitle(s, 'The Knowledge Acquisition Bottleneck');

  // Big pull quote
  s.addText([
    { text: '"', options: { color: C.accent, fontSize: 60 } },
    { text: 'The slow, expensive, expert-driven\nprocess of structuring human knowledge\nfor computational use', options: { color: C.ink } },
    { text: '"', options: { color: C.accent, fontSize: 60 } },
  ], {
    x: 0.5, y: 1.8, w: 6.5, h: 2.2,
    fontFace: FONT_DISPLAY, fontSize: 22, italic: true,
    valign: 'top', margin: 0,
  });

  s.addText('— Feigenbaum, 1977 (and largely still true)', {
    x: 0.5, y: 4.0, w: 6.5, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, color: C.inkFaint, charSpacing: 1,
  });

  // Right-side: traditional process steps
  s.addShape(pres.shapes.RECTANGLE, {
    x: 7.4, y: 1.7, w: 0.04, h: 2.6, fill: { color: C.accent }, line: { color: C.accent },
  });
  s.addText('Traditional process', {
    x: 7.6, y: 1.65, w: 2.0, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.accent, bold: true, charSpacing: 2,
  });

  const steps = [
    'Interview domain experts',
    'Design ontologies by hand',
    'Author rules & constraints',
    'Maintain & update manually',
  ];
  steps.forEach((t, i) => {
    s.addText(`${String(i+1).padStart(2,'0')}`, {
      x: 7.6, y: 2.0 + i * 0.55, w: 0.45, h: 0.35,
      fontFace: FONT_DISPLAY, fontSize: 18, color: C.accent, italic: true, bold: true, margin: 0,
    });
    s.addText(t, {
      x: 8.0, y: 2.05 + i * 0.55, w: 1.7, h: 0.4,
      fontFace: FONT_BODY, fontSize: 12, color: C.ink, margin: 0,
    });
  });

  pageFooter(s, 2, TOTAL);
}

// =======================================================================
// SLIDE 3 — Objective
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'OBJECTIVE');
  slideTitle(s, 'What if knowledge engineering took one click?');

  // Three "value" cards
  const cards = [
    { icon: '✦', title: 'One-shot extraction', body: 'Paste any text — article, abstract, report, notes — and receive a structured graph in seconds.' },
    { icon: '◈', title: 'Live, navigable graph', body: 'Cytoscape.js renders entities and typed relations; click any node to see its source sentences.' },
    { icon: '⌘', title: 'Multi-provider', body: 'Claude, GPT, Gemini, and local Ollama models behind a single, unified extraction interface.' },
  ];

  cards.forEach((c, i) => {
    const x = 0.5 + i * 3.05;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.85, w: 2.85, h: 2.85,
      fill: { color: C.paper }, line: { color: C.rule, width: 0.75 },
    });
    s.addText(c.icon, {
      x, y: 2.0, w: 2.85, h: 0.55,
      fontFace: FONT_DISPLAY, fontSize: 36, color: C.accent, align: 'center', italic: true, margin: 0,
    });
    s.addText(c.title, {
      x: x + 0.25, y: 2.7, w: 2.35, h: 0.4,
      fontFace: FONT_DISPLAY, fontSize: 16, color: C.ink, bold: true, align: 'center', margin: 0,
    });
    s.addText(c.body, {
      x: x + 0.25, y: 3.15, w: 2.35, h: 1.5,
      fontFace: FONT_BODY, fontSize: 12, color: C.inkSoft, align: 'center', italic: false, margin: 0,
    });
  });

  pageFooter(s, 3, TOTAL);
}

// =======================================================================
// SLIDE 4 — Related work / state of the art (timeline)
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'RELATED WORK');
  slideTitle(s, 'Three eras of automated KG construction');

  // Timeline bar
  s.addShape(pres.shapes.LINE, {
    x: 0.7, y: 3.0, w: 8.6, h: 0,
    line: { color: C.rule, width: 1.5 },
  });

  const eras = [
    { x: 0.7, year: '~2000s', title: 'Rule-based / supervised', body: 'NER + RE on annotated corpora.\nNELL: ongoing curation.\nBrittle to domain shift.' },
    { x: 3.7, year: '~2010s', title: 'Embedding models', body: 'TransE, RotatE, ComplEx.\nReason over existing graphs.\nNot construction.' },
    { x: 6.7, year: '2023+',  title: 'LLM-driven', body: 'Zero-shot extraction.\nGraphRAG, LLM Graph Builder.\nThis project.' },
  ];

  eras.forEach((e, i) => {
    // node dot
    s.addShape(pres.shapes.OVAL, {
      x: e.x + 1.05, y: 2.85, w: 0.3, h: 0.3,
      fill: { color: i === 2 ? C.accent : C.ink }, line: { color: C.cream, width: 2 },
    });
    s.addText(e.year, {
      x: e.x, y: 2.4, w: 2.4, h: 0.3,
      fontFace: FONT_MONO, fontSize: 10, color: C.accent, bold: true, charSpacing: 2,
    });
    s.addText(e.title, {
      x: e.x, y: 3.25, w: 2.4, h: 0.4,
      fontFace: FONT_DISPLAY, fontSize: 16, color: C.ink, bold: true, margin: 0,
    });
    s.addText(e.body, {
      x: e.x, y: 3.7, w: 2.4, h: 1.5,
      fontFace: FONT_BODY, fontSize: 11, color: C.inkSoft, margin: 0,
    });
  });

  // Citation footer
  s.addText('Pan et al. (2024) · Edge et al. (2024) · Mitchell et al. (2018) · Bordes et al. (2013)', {
    x: 0.5, y: 5.05, w: 9, h: 0.2,
    fontFace: FONT_MONO, fontSize: 8, color: C.inkFaint, italic: true,
  });

  pageFooter(s, 4, TOTAL);
}

// =======================================================================
// SLIDE 5 — System architecture (diagram)
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'ARCHITECTURE');
  slideTitle(s, 'A three-tier, provider-agnostic pipeline');

  // Three boxes connected by arrows
  const boxY = 2.4, boxH = 1.4;

  // 1. UI box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: boxY, w: 2.6, h: boxH,
    fill: { color: C.paper }, line: { color: C.ink, width: 1.2 },
  });
  s.addText('Frontend', { x: 0.5, y: boxY + 0.15, w: 2.6, h: 0.35,
    fontFace: FONT_MONO, fontSize: 9, color: C.accent, charSpacing: 3, bold: true, align: 'center' });
  s.addText('Next.js + Cytoscape.js', { x: 0.5, y: boxY + 0.5, w: 2.6, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 17, color: C.ink, bold: true, align: 'center', margin: 0 });
  s.addText('Input · render graph · click-to-inspect · export', {
    x: 0.6, y: boxY + 0.95, w: 2.4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: C.inkSoft, italic: true, align: 'center', margin: 0 });

  // 2. API box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 3.7, y: boxY, w: 2.6, h: boxH,
    fill: { color: C.paper }, line: { color: C.ink, width: 1.2 },
  });
  s.addText('Backend', { x: 3.7, y: boxY + 0.15, w: 2.6, h: 0.35,
    fontFace: FONT_MONO, fontSize: 9, color: C.accent, charSpacing: 3, bold: true, align: 'center' });
  s.addText('Express + adapters', { x: 3.7, y: boxY + 0.5, w: 2.6, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 17, color: C.ink, bold: true, align: 'center', margin: 0 });
  s.addText('Schema · prompt · normalize · RDF export', {
    x: 3.8, y: boxY + 0.95, w: 2.4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: C.inkSoft, italic: true, align: 'center', margin: 0 });

  // 3. LLM box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.9, y: boxY, w: 2.6, h: boxH,
    fill: { color: C.ink }, line: { color: C.ink, width: 1.2 },
  });
  s.addText('LLM provider', { x: 6.9, y: boxY + 0.15, w: 2.6, h: 0.35,
    fontFace: FONT_MONO, fontSize: 9, color: C.accent, charSpacing: 3, bold: true, align: 'center' });
  s.addText('Claude · GPT · Gemini · Ollama', { x: 6.9, y: boxY + 0.5, w: 2.6, h: 0.55,
    fontFace: FONT_DISPLAY, fontSize: 14, color: C.cream, bold: true, align: 'center', margin: 0 });
  s.addText('Structured output via tool use / JSON schema', {
    x: 7.0, y: boxY + 1.05, w: 2.4, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color: C.inkFaint, italic: true, align: 'center', margin: 0 });

  // Arrows between boxes
  s.addShape(pres.shapes.LINE, {
    x: 3.1, y: boxY + boxH/2, w: 0.6, h: 0,
    line: { color: C.accent, width: 1.5, endArrowType: 'triangle' },
  });
  s.addShape(pres.shapes.LINE, {
    x: 6.3, y: boxY + boxH/2, w: 0.6, h: 0,
    line: { color: C.accent, width: 1.5, endArrowType: 'triangle' },
  });

  // labels above arrows
  s.addText('JSON', { x: 3.1, y: boxY + boxH/2 - 0.4, w: 0.6, h: 0.3,
    fontFace: FONT_MONO, fontSize: 8, color: C.accent, align: 'center' });
  s.addText('JSON', { x: 6.3, y: boxY + boxH/2 - 0.4, w: 0.6, h: 0.3,
    fontFace: FONT_MONO, fontSize: 8, color: C.accent, align: 'center' });

  // Bottom: key insight
  s.addText('Frontend never speaks to LLM providers directly. The backend mediates and normalizes\nresponses to a single  {nodes, edges}  schema regardless of which provider produced them.', {
    x: 0.5, y: 4.4, w: 9, h: 0.7,
    fontFace: FONT_DISPLAY, fontSize: 13, color: C.inkSoft, italic: true, align: 'center', margin: 0,
  });

  pageFooter(s, 5, TOTAL);
}

// =======================================================================
// SLIDE 6 — Knowledge model (the core design decision)
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'KNOWLEDGE MODEL');
  slideTitle(s, 'Open entity types, controlled relations');

  // Two-column comparison
  const colY = 1.85, colH = 2.7;
  // Left: Open
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: colY, w: 4.3, h: colH,
    fill: { color: C.paper }, line: { color: C.rule, width: 0.75 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: colY, w: 0.06, h: colH,
    fill: { color: C.green }, line: { color: C.green },
  });
  s.addText('Entity types  ·  OPEN', {
    x: 0.75, y: colY + 0.2, w: 4, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, color: C.green, bold: true, charSpacing: 2,
  });
  s.addText('LLM picks the most natural type per entity', {
    x: 0.75, y: colY + 0.55, w: 4, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 16, color: C.ink, bold: true, italic: true, margin: 0,
  });
  s.addText('Person · Organization · Location · Concept · Event · Theory · Product · Technology · Field · Date · …', {
    x: 0.75, y: colY + 1.05, w: 4, h: 1.4,
    fontFace: FONT_DISPLAY, fontSize: 13, color: C.inkSoft, italic: true, margin: 0,
  });
  s.addText('Why: real-world entities are unbounded.', {
    x: 0.75, y: colY + 2.25, w: 4, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.inkFaint,
  });

  // Right: Controlled
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: colY, w: 4.3, h: colH,
    fill: { color: C.paper }, line: { color: C.rule, width: 0.75 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: colY, w: 0.06, h: colH,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  s.addText('Relations  ·  CONTROLLED (15)', {
    x: 5.45, y: colY + 0.2, w: 4, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, color: C.accent, bold: true, charSpacing: 2,
  });
  s.addText('Drawn from a fixed vocabulary', {
    x: 5.45, y: colY + 0.55, w: 4, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 16, color: C.ink, bold: true, italic: true, margin: 0,
  });
  s.addText('works_for · founded_by · located_in · headquartered_in · part_of · created_by · developed_by · causes · influences · occurred_at · has_property · related_to · …', {
    x: 5.45, y: colY + 1.05, w: 4, h: 1.4,
    fontFace: FONT_MONO, fontSize: 11, color: C.inkSoft, margin: 0,
  });
  s.addText('Why: prevents label drift, keeps queryable.', {
    x: 5.45, y: colY + 2.25, w: 4, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.inkFaint,
  });

  // Bottom callout
  s.addText('A hybrid choice grounded in Pan et al. (2024) — LLMs and KGs as complementary.', {
    x: 0.5, y: 4.7, w: 9, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 13, color: C.inkSoft, italic: true, align: 'center',
  });

  pageFooter(s, 6, TOTAL);
}

// =======================================================================
// SLIDE 7 — Output schema with provenance
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'OUTPUT SCHEMA');
  slideTitle(s, 'Every fact carries its source');

  // Code block (schema)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.75, w: 5.4, h: 3.25,
    fill: { color: C.ink }, line: { color: C.ink },
  });
  const code = `{
  "nodes": [{
    "id": "marie_curie",
    "label": "Marie Curie",
    "type": "Person",
    "description": "Polish-born physicist…",
    "source_sentences": [
      "Marie Curie was a Polish-born
       physicist and chemist…"
    ]
  }],
  "edges": [{
    "source": "marie_curie",
    "target": "polonium",
    "relation": "developed_by",
    "evidence": "She and Pierre Curie
                 discovered polonium…"
  }]
}`;
  s.addText(code, {
    x: 0.7, y: 1.85, w: 5.0, h: 3.05,
    fontFace: FONT_MONO, fontSize: 10, color: C.cream, margin: 0,
  });

  // Right: explanation
  s.addText('Two design choices', {
    x: 6.2, y: 1.75, w: 3.3, h: 0.4,
    fontFace: FONT_MONO, fontSize: 10, color: C.accent, bold: true, charSpacing: 2,
  });
  s.addText('Source sentences per node', {
    x: 6.2, y: 2.15, w: 3.3, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 14, color: C.ink, bold: true, margin: 0,
  });
  s.addText('User can verify any extraction by clicking through to the supporting text.', {
    x: 6.2, y: 2.55, w: 3.3, h: 0.7,
    fontFace: FONT_BODY, fontSize: 11, color: C.inkSoft, italic: true, margin: 0,
  });
  s.addText('Evidence per edge', {
    x: 6.2, y: 3.45, w: 3.3, h: 0.4,
    fontFace: FONT_DISPLAY, fontSize: 14, color: C.ink, bold: true, margin: 0,
  });
  s.addText('Discourages hallucination — citing the source makes invented relations harder.', {
    x: 6.2, y: 3.85, w: 3.3, h: 0.7,
    fontFace: FONT_BODY, fontSize: 11, color: C.inkSoft, italic: true, margin: 0,
  });

  // Bottom callout
  s.addShape(pres.shapes.LINE, {
    x: 6.2, y: 4.7, w: 0.2, h: 0,
    line: { color: C.accent, width: 1.5 },
  });
  s.addText('Provenance built into the schema.', {
    x: 6.45, y: 4.6, w: 3.2, h: 0.3,
    fontFace: FONT_DISPLAY, fontSize: 11, color: C.accent, italic: true, bold: true, margin: 0,
  });

  pageFooter(s, 7, TOTAL);
}

// =======================================================================
// SLIDE 8 — Multi-provider architecture
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'PROVIDERS');
  slideTitle(s, 'One adapter interface, four LLM backends');

  const providers = [
    { name: 'Anthropic',   model: 'Claude Sonnet 4.5', mech: 'tool_choice + input_schema', color: C.accent },
    { name: 'OpenAI',      model: 'GPT-4o',            mech: 'response_format json_schema (strict)', color: C.green },
    { name: 'Google',      model: 'Gemini 2.5 Flash',  mech: 'responseSchema + responseMimeType', color: C.blue },
    { name: 'Ollama',      model: 'llama3.1 (local)',  mech: 'format: "json" + post-validation', color: C.amber },
  ];

  providers.forEach((p, i) => {
    const y = 1.85 + i * 0.65;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 0.06, h: 0.55,
      fill: { color: p.color }, line: { color: p.color },
    });
    s.addText(p.name, {
      x: 0.75, y, w: 1.7, h: 0.3,
      fontFace: FONT_DISPLAY, fontSize: 14, color: C.ink, bold: true, margin: 0,
    });
    s.addText(p.model, {
      x: 0.75, y: y + 0.28, w: 1.8, h: 0.25,
      fontFace: FONT_MONO, fontSize: 9, color: C.inkFaint, margin: 0,
    });
    s.addText(p.mech, {
      x: 2.7, y: y + 0.05, w: 6.7, h: 0.5,
      fontFace: FONT_BODY, fontSize: 12, color: C.inkSoft, italic: true, margin: 0,
    });
  });

  // Bottom: auto-detect line
  s.addText('UI auto-detects which providers are configured (env vars + Ollama daemon ping)\nand only shows those.  No surprises, no broken dropdowns.', {
    x: 0.5, y: 4.65, w: 9, h: 0.5,
    fontFace: FONT_DISPLAY, fontSize: 12, color: C.inkSoft, italic: true, align: 'center', margin: 0,
  });

  pageFooter(s, 8, TOTAL);
}

// =======================================================================
// SLIDE 9 — Live demo placeholder / UI walkthrough
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'LIVE DEMO');
  slideTitle(s, 'What the user sees');

  // Three numbered phases
  const phases = [
    { n: '01', title: 'Paste text',       body: 'Pick a sample or drop your own. Choose provider + model.' },
    { n: '02', title: 'Watch graph form', body: 'Force-directed layout. Coloured nodes by entity type. Labelled edges.' },
    { n: '03', title: 'Inspect & export', body: 'Click any node for source sentences. Download JSON or RDF/Turtle.' },
  ];
  phases.forEach((p, i) => {
    const y = 2.0 + i * 0.95;
    s.addText(p.n, {
      x: 0.5, y, w: 0.85, h: 0.7,
      fontFace: FONT_DISPLAY, fontSize: 36, color: C.accent, bold: true, italic: true, margin: 0,
    });
    s.addText(p.title, {
      x: 1.4, y: y + 0.05, w: 8, h: 0.4,
      fontFace: FONT_DISPLAY, fontSize: 18, color: C.ink, bold: true, margin: 0,
    });
    s.addText(p.body, {
      x: 1.4, y: y + 0.45, w: 8, h: 0.4,
      fontFace: FONT_BODY, fontSize: 13, color: C.inkSoft, italic: true, margin: 0,
    });
  });

  // Demo callout
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.85, w: 9, h: 0.3, fill: { color: C.accentSoft }, line: { color: C.accent, width: 0.75 },
  });
  s.addText('▶  Switch to live application — http://localhost:3000', {
    x: 0.5, y: 4.85, w: 9, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, color: C.accent, bold: true, align: 'center',
  });

  pageFooter(s, 9, TOTAL);
}

// =======================================================================
// SLIDE 10 — Evaluation: comparative results
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'EVALUATION');
  slideTitle(s, 'Three texts, two providers, one observation');

  // Compact comparison table
  const headerY = 1.95;
  s.addShape(pres.shapes.LINE, { x: 0.5, y: headerY + 0.3, w: 9, h: 0,
    line: { color: C.ink, width: 1 } });
  s.addText('Sample', { x: 0.5, y: headerY, w: 2.5, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.inkFaint, bold: true, charSpacing: 2 });
  s.addText('Claude Sonnet 4.5', { x: 3.0, y: headerY, w: 2.5, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.accent, bold: true, charSpacing: 2 });
  s.addText('Gemini 2.5 Flash', { x: 5.6, y: headerY, w: 2.5, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.blue, bold: true, charSpacing: 2 });
  s.addText('Notable', { x: 8.0, y: headerY, w: 1.5, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.inkFaint, bold: true, charSpacing: 2 });

  const rows = [
    { sample: 'Marie Curie',      a: '9 nodes · 12 edges', b: '8 nodes · 10 edges', notable: 'Granularity: 2 prizes vs 1' },
    { sample: 'OpenAI',           a: '7 nodes · 10 edges', b: '6 nodes · 8 edges',  notable: 'Microsoft tie captured/missed' },
    { sample: 'Greenhouse effect',a: '11 nodes · 14 edges',b: '10 nodes · 12 edges',notable: 'Both used "causes" correctly' },
  ];
  rows.forEach((r, i) => {
    const y = 2.45 + i * 0.55;
    s.addText(r.sample, { x: 0.5, y, w: 2.5, h: 0.4,
      fontFace: FONT_DISPLAY, fontSize: 13, color: C.ink, italic: true, margin: 0 });
    s.addText(r.a, { x: 3.0, y, w: 2.5, h: 0.4,
      fontFace: FONT_MONO, fontSize: 11, color: C.ink, margin: 0 });
    s.addText(r.b, { x: 5.6, y, w: 2.5, h: 0.4,
      fontFace: FONT_MONO, fontSize: 11, color: C.ink, margin: 0 });
    s.addText(r.notable, { x: 8.0, y, w: 1.5, h: 0.4,
      fontFace: FONT_BODY, fontSize: 10, color: C.inkSoft, italic: true, margin: 0 });
    s.addShape(pres.shapes.LINE, { x: 0.5, y: y + 0.42, w: 9, h: 0,
      line: { color: C.rule, width: 0.5 } });
  });

  // Headline finding
  s.addText('Both providers reliably produced valid graphs.\nClaude favoured finer granularity; Gemini was faster and coarser.', {
    x: 0.5, y: 4.55, w: 9, h: 0.6,
    fontFace: FONT_DISPLAY, fontSize: 13, color: C.accent, italic: true, align: 'center', bold: true, margin: 0,
  });

  pageFooter(s, 10, TOTAL);
}

// =======================================================================
// SLIDE 11 — Cross-provider insights
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'WHAT WE LEARNED');
  slideTitle(s, 'Three findings');

  const findings = [
    {
      title: 'Schema enforcement matters',
      body: 'Strict tool-use (Claude) and json_schema (OpenAI) parsed without error every run. Ollama needed post-hoc validation.',
    },
    {
      title: 'Provenance discourages drift',
      body: 'Asking the model to cite an evidence sentence per edge measurably reduced unsupported relations.',
    },
    {
      title: 'Granularity differs across providers',
      body: 'Neither finer nor coarser is uniformly better. The right choice depends on the downstream use of the graph.',
    },
  ];

  findings.forEach((f, i) => {
    const y = 2.0 + i * 1.0;
    // Big quote glyph
    s.addText(`0${i+1}`, {
      x: 0.5, y, w: 0.9, h: 0.8,
      fontFace: FONT_DISPLAY, fontSize: 44, color: C.accent, italic: true, bold: true, margin: 0,
    });
    s.addText(f.title, {
      x: 1.5, y, w: 8, h: 0.45,
      fontFace: FONT_DISPLAY, fontSize: 18, color: C.ink, bold: true, margin: 0,
    });
    s.addText(f.body, {
      x: 1.5, y: y + 0.45, w: 8, h: 0.5,
      fontFace: FONT_BODY, fontSize: 12, color: C.inkSoft, italic: true, margin: 0,
    });
  });

  pageFooter(s, 11, TOTAL);
}

// =======================================================================
// SLIDE 12 — Limitations & future work
// =======================================================================
{
  const s = pres.addSlide();
  bg(s);
  eyebrow(s, 'LIMITATIONS & FUTURE WORK');
  slideTitle(s, 'What this is — and what it isn\u2019t');

  // Two columns
  s.addText('Honest limitations', {
    x: 0.5, y: 1.95, w: 4.3, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, color: C.accent, bold: true, charSpacing: 2,
  });
  const lims = [
    'Single-pass, no cross-document linking',
    'Qualitative evaluation only — no gold standard',
    'Fixed 15-relation vocabulary',
    'Inherits LLM hallucination risks',
  ];
  lims.forEach((t, i) => {
    s.addText('—', { x: 0.5, y: 2.4 + i * 0.45, w: 0.3, h: 0.3,
      fontFace: FONT_DISPLAY, fontSize: 14, color: C.accent, margin: 0 });
    s.addText(t, { x: 0.85, y: 2.4 + i * 0.45, w: 4.0, h: 0.4,
      fontFace: FONT_BODY, fontSize: 12, color: C.ink, margin: 0 });
  });

  s.addText('Natural extensions', {
    x: 5.2, y: 1.95, w: 4.3, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, color: C.green, bold: true, charSpacing: 2,
  });
  const ext = [
    'Persistent graph DB + entity resolution',
    'Gold-standard precision/recall study',
    'User-editable relation vocabulary per project',
    'Ontology import (OWL) for closed domains',
  ];
  ext.forEach((t, i) => {
    s.addText('+', { x: 5.2, y: 2.4 + i * 0.45, w: 0.3, h: 0.3,
      fontFace: FONT_DISPLAY, fontSize: 14, color: C.green, margin: 0 });
    s.addText(t, { x: 5.55, y: 2.4 + i * 0.45, w: 4.0, h: 0.4,
      fontFace: FONT_BODY, fontSize: 12, color: C.ink, margin: 0 });
  });

  pageFooter(s, 12, TOTAL);
}

// =======================================================================
// SLIDE 13 — Closing / questions (dark)
// =======================================================================
{
  const s = pres.addSlide();
  bg(s, C.ink);

  s.addText('∴', {
    x: 0.5, y: 0.45, w: 0.6, h: 0.6,
    fontFace: FONT_DISPLAY, fontSize: 40, color: C.accent, italic: true,
  });

  s.addText('Thank you', {
    x: 0.5, y: 1.6, w: 9, h: 1.0,
    fontFace: FONT_DISPLAY, fontSize: 64, color: C.cream, bold: true, italic: true, margin: 0,
  });

  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 2.8, w: 1.5, h: 0,
    line: { color: C.accent, width: 1.5 },
  });

  s.addText('Questions?', {
    x: 0.5, y: 2.95, w: 9, h: 0.6,
    fontFace: FONT_DISPLAY, fontSize: 28, color: C.cream, italic: true, margin: 0,
  });

  // Tech list footer
  s.addText('Node.js  ·  Express  ·  Next.js  ·  Cytoscape.js  ·  Anthropic  ·  OpenAI  ·  Google  ·  Ollama', {
    x: 0.5, y: 4.7, w: 9, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.inkFaint, charSpacing: 2, align: 'center',
  });
  s.addText('Live at  localhost:3000   ·   Source on  github.com/<your-handle>/kg-extractor', {
    x: 0.5, y: 5.0, w: 9, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9, color: C.accent, charSpacing: 2, align: 'center',
  });
}

// Write file --------------------------------------------------------------
pres.writeFile({ fileName: 'kg-extractor-presentation.pptx' })
  .then(fn => console.log('Wrote', fn));
