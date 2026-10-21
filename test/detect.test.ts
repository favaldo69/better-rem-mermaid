import { test } from "node:test";
import assert from "node:assert/strict";
import { detectMermaid, looksLikeMermaidSource } from "../src/lib/detect.ts";

const codeBlock = (text: string, language?: string) => ({
  i: "m" as const,
  text,
  code: true,
  ...(language === undefined ? {} : { language }),
});

test("detects a code block explicitly tagged as mermaid", () => {
  const result = detectMermaid([codeBlock("flowchart TD\n A-->B", "mermaid")]);
  assert.ok(result);
  assert.equal(result.reason, "language");
  assert.equal(result.source, "flowchart TD\n A-->B");
});

test("language matching is case-insensitive and accepts aliases", () => {
  for (const language of ["Mermaid", "MERMAID", "mmd", "mermaid-js"]) {
    const result = detectMermaid([codeBlock("graph LR\n A-->B", language)]);
    assert.ok(result, `expected ${language} to be detected`);
    assert.equal(result.reason, "language");
  }
});

test("ignores a code block in another language even if the text looks like mermaid", () => {
  // Explicitly tagging a block as something else must win over the heuristic.
  assert.equal(detectMermaid([codeBlock("flowchart TD\n A-->B", "javascript")]), undefined);
});

test("does not treat non-code rich text as a diagram", () => {
  assert.equal(detectMermaid([{ i: "m", text: "flowchart TD" }]), undefined);
});

test("ignores an unlabeled code block that is not mermaid when heuristic is on", () => {
  assert.equal(detectMermaid([codeBlock("const x = 1;\nconsole.log(x);")]), undefined);
});

test("detects an unlabeled mermaid block via the heuristic", () => {
  const result = detectMermaid([codeBlock("flowchart TD\n A-->B")]);
  assert.ok(result);
  assert.equal(result.reason, "heuristic");
});

test("heuristic can be disabled", () => {
  assert.equal(detectMermaid([codeBlock("flowchart TD\n A-->B")], { allowHeuristic: false }), undefined);
});

test("treats RemNote's 'No Language' marker as unlabeled", () => {
  const result = detectMermaid([codeBlock("sequenceDiagram\n A->>B: hi", "No Language")]);
  assert.ok(result);
  assert.equal(result.reason, "heuristic");
});

test("concatenates split code elements", () => {
  const result = detectMermaid([codeBlock("flowchart TD", "mermaid"), codeBlock("  A-->B", "mermaid")]);
  assert.ok(result);
  assert.equal(result.source, "flowchart TD\n  A-->B");
});

test("handles empty, null and text-less rich text", () => {
  assert.equal(detectMermaid(undefined), undefined);
  assert.equal(detectMermaid([]), undefined);
  assert.equal(detectMermaid([codeBlock("   ", "mermaid")]), undefined);
  assert.equal(detectMermaid([null as any]), undefined);
});

test("ignores mermaid directives and front matter when checking the header", () => {
  assert.equal(looksLikeMermaidSource('%%{init: {"theme":"dark"}}%%\nflowchart TD\n A-->B'), true);
  assert.equal(looksLikeMermaidSource("---\ntitle: My diagram\n---\nflowchart LR\n A-->B"), true);
  assert.equal(looksLikeMermaidSource("graph TD; A-->B"), true);
  assert.equal(looksLikeMermaidSource("just some prose"), false);
});

test("recognises a representative range of diagram types", () => {
  const headers = [
    "flowchart TD",
    "graph LR",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram-v2",
    "erDiagram",
    "journey",
    "gantt",
    "pie title X",
    "mindmap",
    "timeline",
    "gitGraph",
    "quadrantChart",
  ];
  for (const header of headers) {
    const result = detectMermaid([codeBlock(`${header}\n X`)]);
    assert.ok(result, `expected "${header}" to be detected`);
  }
});
