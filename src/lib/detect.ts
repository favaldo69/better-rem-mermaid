import type { RichTextInterface } from "@remnote/plugin-sdk";

/**
 * Language values (from the RemNote code-block language dropdown) that we treat
 * as Mermaid source. RemNote ships `mermaid` natively; the aliases are for blocks
 * typed by hand or created by other tools.
 */
export const MERMAID_LANGUAGES = ["mermaid", "mmd", "mermaid-js"];

/**
 * RemNote's own marker for "no language selected" in the code block dropdown.
 * A block carrying this value should be considered unlabeled.
 */
const NO_LANGUAGE = "no language";

/**
 * Keywords that start a Mermaid diagram. Only the first word of the source is
 * checked, which is where every Mermaid diagram type declares itself.
 */
const MERMAID_HEADERS = [
  "flowchart",
  "graph",
  "sequencediagram",
  "classdiagram",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "sankey",
  "sankey-beta",
  "gitgraph",
  "quadrantchart",
  "xychart",
  "xychart-beta",
  "block",
  "block-beta",
  "packet",
  "packet-beta",
  "architecture",
  "architecture-beta",
  "radar",
  "radar-beta",
  "requirement",
  "treemap",
  "c4context",
  "c4container",
  "c4component",
  "c4dynamic",
  "c4deployment",
  "zenuml",
  "info",
];

/**
 * Directives that may legally precede the diagram declaration, e.g. `%%{init: ...}%%`
 * or `---\ntitle: x\n---`.
 */
function firstMeaningfulLine(source: string): string {
  const lines = source.split("\n");
  let inFrontmatter = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // YAML front matter block
    if (line === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;
    // Directives, comments
    if (line.startsWith("%%") || line.startsWith("#")) continue;
    return line;
  }
  return "";
}

/**
 * Matches the first token of a diagram declaration against the known headers.
 */
export function looksLikeMermaidSource(source: string): boolean {
  const firstLine = firstMeaningfulLine(source);
  if (!firstLine) return false;
  // Strip semicolons/colons that can trail a declaration (`flowchart TD;`)
  const token = firstLine.split(/[\s;:]/, 1)[0]?.toLowerCase() ?? "";
  if (!token) return false;
  return MERMAID_HEADERS.includes(token);
}

function normalizeLanguage(language: string | undefined): string {
  return (language ?? "").trim().toLowerCase();
}

function isMermaidLanguage(language: string | undefined): boolean {
  const normalized = normalizeLanguage(language);
  return normalized !== "" && normalized !== NO_LANGUAGE && MERMAID_LANGUAGES.includes(normalized);
}

function isUnlabeled(language: string | undefined): boolean {
  const normalized = normalizeLanguage(language);
  return normalized === "" || normalized === NO_LANGUAGE;
}

export interface MermaidDetection {
  /** The diagram source extracted from the code block. */
  source: string;
  /** Why the Rem was treated as a diagram — useful for the UI and for tests. */
  reason: "language" | "heuristic";
}

/**
 * Determine whether a Rem's rich text is a Mermaid code block and, if so, extract
 * its source.
 *
 * A Rem qualifies when it contains a code element whose language is Mermaid. As a
 * fallback (opt-out) an unlabeled code block whose first line declares a Mermaid
 * diagram is accepted, which rescues pasted blocks that lost their language tag.
 *
 * Multiple code elements are concatenated in document order so that a code block
 * that was split by the editor still renders as one diagram.
 */
export function detectMermaid(
  richText: RichTextInterface | undefined,
  options: { allowHeuristic?: boolean } = {}
): MermaidDetection | undefined {
  if (!richText || richText.length === 0) return undefined;
  const allowHeuristic = options.allowHeuristic ?? true;

  const codeElements = richText.filter(
    (element) =>
      element !== null &&
      typeof element === "object" &&
      (element as { code?: boolean }).code === true &&
      typeof (element as { text?: unknown }).text === "string"
  ) as Array<{ text: string; language?: string }>;

  if (codeElements.length === 0) return undefined;

  const explicitlyMermaid = codeElements.filter((element) => isMermaidLanguage(element.language));
  if (explicitlyMermaid.length > 0) {
    const source = explicitlyMermaid.map((element) => element.text).join("\n");
    if (source.trim() === "") return undefined;
    return { source, reason: "language" };
  }

  if (!allowHeuristic) return undefined;

  const unlabeled = codeElements.filter((element) => isUnlabeled(element.language));
  if (unlabeled.length === 0) return undefined;

  const source = unlabeled.map((element) => element.text).join("\n");
  if (source.trim() === "" || !looksLikeMermaidSource(source)) return undefined;
  return { source, reason: "heuristic" };
}
