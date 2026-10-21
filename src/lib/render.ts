import mermaid, { type MermaidConfig } from "mermaid";
import DOMPurify from "dompurify";

/**
 * Mermaid keeps its configuration in module-global state, and `render()` is async.
 * Two diagrams rendering concurrently would therefore race and pick up each
 * other's theme, so every render is funnelled through a single promise chain.
 */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  // Keep the chain alive even if a task rejects.
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Domains of the temporary measurement nodes Mermaid appends to `<body>`.
 * They are removed after each render so they don't accumulate.
 */
const SCRATCH_PREFIX = "dmermaid-";

function removeScratchNodes(): void {
  if (typeof document === "undefined") return;
  const node = document.getElementById(`${SCRATCH_PREFIX}${SCRATCH_PREFIX}`);
  node?.parentElement?.removeChild(node);
}

export interface RenderOptions {
  /** Unique id for the <svg> element. */
  id: string;
  /** Mermaid source text. */
  source: string;
  /** Full Mermaid config for this render (theme + security + ...). */
  config: MermaidConfig;
}

export interface RenderSuccess {
  ok: true;
  svg: string;
  /** Bind mermaid's click handlers for `securityLevel: loose`. */
  bindFunctions?: (element: Element) => void;
}

export interface RenderFailure {
  ok: false;
  message: string;
}

export type RenderResult = RenderSuccess | RenderFailure;

/** Normalize whatever Mermaid/JS throws into a readable message. */
function toMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const withMessage = error as { str?: string; message?: string };
    if (typeof withMessage.str === "string" && withMessage.str.trim()) return withMessage.str;
    if (typeof withMessage.message === "string" && withMessage.message.trim()) return withMessage.message;
  }
  return "Unknown Mermaid error.";
}

function FAILURE(message: string): RenderFailure {
  return { ok: false, message };
}

/**
 * Sanitize Mermaid's output before it is inserted into the page.
 *
 * Mermaid returns an SVG string built from the user's diagram source, so it is
 * treated as untrusted HTML. SVG markup is allowed; scripts, event handlers and
 * external references are not.
 */
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true, html: true },
    FORBID_TAGS: ["script", "foreignObject"],
    ADD_TAGS: ["style"],
    // Keep SVG-specific attributes that Mermaid needs.
    ADD_ATTR: ["dominant-baseline", "text-anchor", "marker-end", "marker-start"],
  });
}

/**
 * Validate and render a diagram.
 *
 * Syntax is checked with `parse()` first so that a broken diagram never injects
 * partial DOM into the page and never replaces a previously good diagram.
 */
export function renderDiagram(options: RenderOptions): Promise<RenderResult> {
  return enqueue(async () => {
    const { id, source, config } = options;
    if (!source.trim()) {
      return FAILURE("The diagram source is empty.");
    }

    try {
      mermaid.initialize(config);
    } catch (error) {
      return FAILURE(toMessage(error));
    }

    try {
      const valid = await mermaid.parse(source, { suppressErrors: true });
      if (valid === false) {
        return FAILURE("This is not a valid Mermaid diagram.");
      }
    } catch (error) {
      return FAILURE(toMessage(error));
    }

    try {
      const result = await mermaid.render(id, source);
      return { ok: true, svg: sanitizeSvg(result.svg), bindFunctions: result.bindFunctions };
    } catch (error) {
      return FAILURE(toMessage(error));
    } finally {
      removeScratchNodes();
    }
  });
}

/**
 * Reset Mermaid's global state. Used when the plugin is deactivated.
 */
export function resetMermaid(): void {
  try {
    mermaid.mermaidAPI.reset();
  } catch {
    // Ignore — reset is best-effort.
  }
}

export type { MermaidConfig };
