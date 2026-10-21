import type { MermaidConfig } from "mermaid";
import { APPEARANCE_FOLLOW, AUTO_THEME } from "./settings.ts";

/**
 * The subset of RemNote design tokens we map onto Mermaid theme variables.
 *
 * These are the documented, theme-able RemNote tokens (see the Custom CSS docs),
 * so any theme plugin that overrides them restyles Mermaid diagrams as well.
 */
export const REMNOTE_TOKENS = {
  backgroundPrimary: "--rn-clr-background-primary",
  backgroundSecondary: "--rn-clr-background-secondary",
  backgroundTertiary: "--rn-clr-background-tertiary",
  contentPrimary: "--rn-clr-content-primary",
  contentSecondary: "--rn-clr-content-secondary",
  contentAccent: "--rn-clr-content-accent",
  borderOpaque: "--rn-clr-border-opaque",
  backgroundAccent: "--rn-clr-background-accent",
} as const;

export type TokenName = keyof typeof REMNOTE_TOKENS;
export type RemNoteTokens = Partial<Record<TokenName, string>>;

/**
 * Detect whether RemNote is currently in dark mode.
 *
 * RemNote toggles a `dark` / `light` class on the document root. We only look at
 * the class (not `prefers-color-scheme`) so that we match what the user sees even
 * if they forced a mode in RemNote that differs from their OS.
 */
export function isRemNoteDark(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  if (root.classList.contains("dark")) return true;
  if (root.classList.contains("light")) return false;
  const body = document.body;
  if (body?.classList.contains("dark")) return true;
  if (body?.classList.contains("light")) return false;
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
}

/**
 * Read the live value of the RemNote design tokens.
 *
 * Tokens are resolved from the computed style so that theme plugins, custom CSS
 * and RemNote's own light/dark switching are all reflected automatically.
 */
export function readRemNoteTokens(element?: HTMLElement | null): RemNoteTokens {
  if (typeof window === "undefined") return {};
  const target = element ?? document.body ?? document.documentElement;
  if (!target) return {};
  const computed = window.getComputedStyle(target);
  const tokens: RemNoteTokens = {};
  for (const [name, cssVar] of Object.entries(REMNOTE_TOKENS) as [TokenName, string][]) {
    const value = computed.getPropertyValue(cssVar).trim();
    if (value) tokens[name] = value;
  }
  return tokens;
}

export interface ThemeInput {
  /** Value of the `mermaid-theme` setting. */
  theme: string;
  /** Value of the `mermaid-appearance` setting. */
  appearance: string;
  /** Raw JSON from the optional `mermaid-theme-variables` setting. */
  userVariables: string;
  /** Live RemNote tokens (only used for the "Match RemNote" theme). */
  tokens: RemNoteTokens;
  /** Whether RemNote is in dark mode (only used for the "Match RemNote" theme). */
  dark: boolean;
}

export interface ThemeResult {
  config: Pick<MermaidConfig, "theme" | "themeVariables">;
  /** Optional notice shown to the user (e.g. invalid JSON). */
  warning?: string;
}

/**
 * Transparently resolve `var(--x)` references. Mermaid computes derived colors
 * in JavaScript and cannot parse CSS variables, so values must be resolved to
 * literal colors before they reach it. Values that still contain `var(` after
 * resolution are dropped rather than handed to Mermaid, which would otherwise
 * throw when deriving shades.
 */
function resolveColorValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes("var(")) return undefined;
  return trimmed;
}

/**
 * Parse the optional user JSON override. Returns `{}` for an empty value (the
 * common case) and reports invalid JSON so the UI can tell the user once.
 */
export function parseUserVariables(raw: string): { value: Record<string, unknown>; warning?: string } {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || trimmed === "{}") return { value: {} };
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { value: {}, warning: "Theme variable overrides must be a JSON object. Ignoring them." };
    }
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { value: {}, warning: "Could not parse theme variable overrides (invalid JSON). Ignoring them." };
  }
}

/**
 * Map RemNote design tokens to Mermaid theme variables.
 */
export function tokensToThemeVariables(tokens: RemNoteTokens, dark: boolean): Record<string, unknown> {
  const pick = (...names: TokenName[]): string | undefined => {
    for (const name of names) {
      const raw = tokens[name];
      if (!raw) continue;
      const resolved = resolveColorValue(raw);
      if (resolved) return resolved;
    }
    return undefined;
  };

  const background = pick("backgroundPrimary");
  const surface = pick("backgroundSecondary", "backgroundPrimary");
  const surfaceAlt = pick("backgroundTertiary", "backgroundSecondary");
  const text = pick("contentPrimary");
  const textSecondary = pick("contentSecondary", "contentPrimary");
  const border = pick("borderOpaque", "contentSecondary");
  const accent = pick("contentAccent", "backgroundAccent");

  const variables: Record<string, unknown> = {};

  const assign = (key: string, value: string | undefined) => {
    if (typeof value === "string") variables[key] = value;
  };

  // Mermaid uses this flag when deriving shades in the `base` theme.
  variables.darkMode = dark;
  assign("background", background);
  assign("primaryColor", surface);
  assign("primaryTextColor", text);
  assign("primaryBorderColor", border);
  assign("secondaryColor", surfaceAlt);
  assign("secondaryTextColor", text);
  assign("secondaryBorderColor", border);
  assign("tertiaryColor", pick("backgroundPrimary"));
  assign("tertiaryTextColor", text);
  assign("tertiaryBorderColor", border);
  assign("lineColor", textSecondary);
  assign("textColor", text);
  assign("nodeTextColor", text);
  assign("mainBkg", surface);
  assign("nodeBkg", surface);
  assign("nodeBorder", border);
  assign("clusterBkg", pick("backgroundTertiary"));
  assign("clusterBorder", border);
  assign("titleColor", text);
  assign("edgeLabelBackground", background);
  assign("noteBkgColor", surfaceAlt);
  assign("noteTextColor", text);
  assign("noteBorderColor", border);
  assign("actorBkg", surface);
  assign("actorBorder", border);
  assign("actorTextColor", text);
  assign("actorLineColor", textSecondary);
  assign("signalColor", textSecondary);
  assign("signalTextColor", text);
  assign("labelBoxBkgColor", surface);
  assign("labelBoxBorderColor", border);
  assign("labelTextColor", text);
  assign("loopTextColor", text);
  assign("activationBorderColor", border);
  assign("activationBkgColor", surfaceAlt);
  assign("sequenceNumberColor", background);
  assign("sectionBkgColor", surface);
  assign("altSectionBkgColor", surfaceAlt);
  assign("sectionBkgColor2", surface);
  assign("taskBorderColor", border);
  assign("taskBkgColor", surface);
  assign("taskTextColor", text);
  assign("taskTextOutsideColor", text);
  assign("taskTextLightColor", text);
  assign("gridColor", border);
  assign("doneTaskBkgColor", surfaceAlt);
  assign("doneTaskBorderColor", border);
  assign("critBorderColor", pick("contentAccent"));
  assign("critBkgColor", surfaceAlt);
  assign("todayLineColor", pick("contentAccent"));
  assign("transitionColor", textSecondary);
  assign("transitionLabelColor", text);
  assign("stateLabelColor", text);
  assign("stateBkg", surface);
  assign("labelBackgroundColor", background);
  assign("compositeBackground", background);
  assign("compositeTitleBackground", surface);
  assign("nodeBorder2", accent);
  assign("classText", text);
  assign("fillType0", surface);
  assign("fillType1", surfaceAlt);
  assign("fillType2", pick("backgroundPrimary"));
  assign("fillType3", surface);
  assign("fillType4", surfaceAlt);
  assign("fillType5", surface);
  assign("fillType6", surfaceAlt);
  assign("fillType7", surface);

  return variables;
}

/**
 * Build the Mermaid config fragment for the current settings.
 *
 * This is the single place where the user's theme choice becomes Mermaid
 * configuration. A built-in theme passes `theme` through untouched; "Match
 * RemNote" resolves RemNote's design tokens into Mermaid theme variables. The
 * optional JSON override is merged last and only when it is non-empty.
 */
export function buildThemeConfig(input: ThemeInput): ThemeResult {
  const { theme, appearance, tokens, dark: remNoteDark } = input;
  const { value: overrides, warning } = parseUserVariables(input.userVariables);

  // Explicit light/dark wins over RemNote's mode, otherwise follow RemNote.
  const dark = appearance === APPEARANCE_FOLLOW ? remNoteDark : appearance === "dark";

  if (theme === AUTO_THEME) {
    const variables = tokensToThemeVariables(tokens, dark);
    return {
      config: {
        theme: "base",
        themeVariables: { ...variables, ...overrides },
      },
      warning,
    };
  }

  // A built-in theme: applied verbatim. No token derivation, no per-diagram work.
  return {
    config: {
      theme: theme as MermaidConfig["theme"],
      ...(Object.keys(overrides).length > 0 ? { themeVariables: overrides } : {}),
    },
    warning,
  };
}
