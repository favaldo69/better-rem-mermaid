import type { ReactRNPlugin } from "@remnote/plugin-sdk";

/**
 * Every setting the plugin exposes. Keep ids stable — they are persisted per user.
 */
export const SETTING_IDS = {
  theme: "mermaid-theme",
  appearance: "mermaid-appearance",
  themeVariables: "mermaid-theme-variables",
  hideSource: "mermaid-hide-source",
  detectUnlabeled: "mermaid-detect-unlabeled",
  scale: "mermaid-scale",
  maxHeight: "mermaid-max-height",
  securityLevel: "mermaid-security-level",
} as const;

/**
 * Value used to indicate "derive the theme from the active RemNote theme".
 */
export const AUTO_THEME = "auto";
export const APPEARANCE_FOLLOW = "follow";
export const SECURITY_STRICT = "strict";

/**
 * Built-in Mermaid themes, in the order they appear in the dropdown.
 * `auto` is first because it is the default.
 */
export const THEME_OPTIONS: { key: string; label: string; value: string }[] = [
  { key: "0", label: "Match RemNote", value: AUTO_THEME },
  { key: "1", label: "Default", value: "default" },
  { key: "2", label: "Base", value: "base" },
  { key: "3", label: "Dark", value: "dark" },
  { key: "4", label: "Forest", value: "forest" },
  { key: "5", label: "Neutral", value: "neutral" },
  { key: "6", label: "Neo", value: "neo" },
  { key: "7", label: "Neo Dark", value: "neo-dark" },
  { key: "8", label: "Redux", value: "redux" },
];

export const APPEARANCE_OPTIONS: { key: string; label: string; value: string }[] = [
  { key: "0", label: "Follow RemNote (light/dark)", value: APPEARANCE_FOLLOW },
  { key: "1", label: "Always light", value: "light" },
  { key: "2", label: "Always dark", value: "dark" },
];

export const SECURITY_OPTIONS: { key: string; label: string; value: string }[] = [
  { key: "0", label: "Strict (recommended)", value: "strict" },
  { key: "1", label: "Antiscript", value: "antiscript" },
  { key: "2", label: "Loose (unsafe — allows HTML labels and click handlers)", value: "loose" },
];

export interface MermaidSettings {
  theme: string;
  appearance: string;
  themeVariables: string;
  hideSource: boolean;
  detectUnlabeled: boolean;
  scale: number;
  maxHeight: number;
  securityLevel: string;
}

export const DEFAULT_SETTINGS: MermaidSettings = {
  theme: AUTO_THEME,
  appearance: APPEARANCE_FOLLOW,
  themeVariables: "",
  hideSource: true,
  detectUnlabeled: true,
  scale: 1,
  maxHeight: 0,
  securityLevel: "strict",
};

/**
 * Register all settings. Called once from `onActivate`.
 */
export async function registerSettings(plugin: ReactRNPlugin): Promise<void> {
  await plugin.settings.registerDropdownSetting({
    id: SETTING_IDS.theme,
    title: "Diagram theme",
    description:
      "The theme applied to every diagram. 'Match RemNote' follows your active RemNote theme (including third-party themes); the others are Mermaid's built-in themes.",
    defaultValue: DEFAULT_SETTINGS.theme,
    options: THEME_OPTIONS,
  });

  await plugin.settings.registerDropdownSetting({
    id: SETTING_IDS.appearance,
    title: "Diagram appearance",
    description: "Only used when the theme is 'Match RemNote'. Choose whether diagrams follow RemNote's light/dark mode.",
    defaultValue: DEFAULT_SETTINGS.appearance,
    options: APPEARANCE_OPTIONS,
  });

  await plugin.settings.registerStringSetting({
    id: SETTING_IDS.themeVariables,
    title: "Theme variable overrides (optional)",
    description:
      "Advanced. Optional JSON object of Mermaid CSS variables merged over the selected theme, e.g. {\"primaryColor\": \"#ff8800\"}. Leave empty to use the theme as-is.",
    defaultValue: DEFAULT_SETTINGS.themeVariables,
    multiline: true,
  });

  await plugin.settings.registerBooleanSetting({
    id: SETTING_IDS.hideSource,
    title: "Hide the source code block",
    description:
      "Collapse the Mermaid code block while its diagram is displayed. The source reappears when you move the caret into that Rem.",
    defaultValue: DEFAULT_SETTINGS.hideSource,
  });

  await plugin.settings.registerBooleanSetting({
    id: SETTING_IDS.detectUnlabeled,
    title: "Detect unlabeled Mermaid blocks",
    description:
      "Also render code blocks that have no language set but whose first line declares a Mermaid diagram (e.g. 'flowchart TD').",
    defaultValue: DEFAULT_SETTINGS.detectUnlabeled,
  });

  await plugin.settings.registerNumberSetting({
    id: SETTING_IDS.scale,
    title: "Diagram scale",
    description: "Multiplier applied to the rendered diagram size. 1 = original size.",
    defaultValue: DEFAULT_SETTINGS.scale,
  });

  await plugin.settings.registerNumberSetting({
    id: SETTING_IDS.maxHeight,
    title: "Maximum diagram height (px)",
    description: "Taller diagrams are collapsed behind a 'Show full diagram' button. 0 disables the limit.",
    defaultValue: DEFAULT_SETTINGS.maxHeight,
  });

  await plugin.settings.registerDropdownSetting({
    id: SETTING_IDS.securityLevel,
    title: "Mermaid security level",
    description:
      "Controls whether diagram HTML labels and click handlers are allowed. Keep this on 'Strict' unless you specifically need HTML labels.",
    defaultValue: DEFAULT_SETTINGS.securityLevel,
    options: SECURITY_OPTIONS,
  });
}

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

/**
 * Read and normalize settings. Values come from user-editable fields, so every
 * value is validated against the set of options we registered.
 */
export async function readSettings(plugin: ReactRNPlugin): Promise<MermaidSettings> {
  const [theme, appearance, themeVariables, hideSource, detectUnlabeled, scale, maxHeight, securityLevel] =
    await Promise.all([
      plugin.settings.getSetting<string>(SETTING_IDS.theme),
      plugin.settings.getSetting<string>(SETTING_IDS.appearance),
      plugin.settings.getSetting<string>(SETTING_IDS.themeVariables),
      plugin.settings.getSetting<boolean>(SETTING_IDS.hideSource),
      plugin.settings.getSetting<boolean>(SETTING_IDS.detectUnlabeled),
      plugin.settings.getSetting<number>(SETTING_IDS.scale),
      plugin.settings.getSetting<number>(SETTING_IDS.maxHeight),
      plugin.settings.getSetting<string>(SETTING_IDS.securityLevel),
    ]);

  const themeValue = THEME_OPTIONS.some((option) => option.value === theme) ? theme : DEFAULT_SETTINGS.theme;
  const appearanceValue = APPEARANCE_OPTIONS.some((option) => option.value === appearance)
    ? appearance
    : DEFAULT_SETTINGS.appearance;
  const securityValue = SECURITY_OPTIONS.some((option) => option.value === securityLevel)
    ? securityLevel
    : DEFAULT_SETTINGS.securityLevel;

  return {
    theme: themeValue,
    appearance: appearanceValue,
    themeVariables: typeof themeVariables === "string" ? themeVariables : "",
    hideSource: hideSource !== false,
    detectUnlabeled: detectUnlabeled !== false,
    scale: clampNumber(scale, DEFAULT_SETTINGS.scale, 0.1, 10),
    maxHeight: clampNumber(maxHeight, DEFAULT_SETTINGS.maxHeight, 0, 20000),
    securityLevel: securityValue,
  };
}
