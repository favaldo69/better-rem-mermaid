import { test } from "node:test";
import assert from "node:assert/strict";
import { buildThemeConfig, parseUserVariables, tokensToThemeVariables } from "../src/lib/theme.ts";

const tokens = {
  backgroundPrimary: "#1e1e1e",
  backgroundSecondary: "#2b2b2b",
  backgroundTertiary: "#333333",
  contentPrimary: "#ffffff",
  contentSecondary: "#cccccc",
  contentAccent: "#768dff",
  borderOpaque: "#444444",
  backgroundAccent: "#4a5bd4",
};

const baseInput = {
  theme: "auto",
  appearance: "follow",
  userVariables: "",
  tokens,
  dark: true,
};

test("a built-in theme is passed through verbatim", () => {
  const { config } = buildThemeConfig({ ...baseInput, theme: "forest" });
  assert.equal(config.theme, "forest");
  // No token derivation for built-in themes.
  assert.equal(config.themeVariables, undefined);
});

test("every selectable built-in theme is accepted", () => {
  for (const theme of ["default", "base", "dark", "forest", "neutral", "neo", "neo-dark", "redux"]) {
    const { config } = buildThemeConfig({ ...baseInput, theme });
    assert.equal(config.theme, theme);
  }
});

test("'auto' resolves to the base theme plus RemNote tokens", () => {
  const { config } = buildThemeConfig(baseInput);
  assert.equal(config.theme, "base");
  const variables = config.themeVariables as Record<string, unknown>;
  assert.equal(variables.primaryColor, tokens.backgroundSecondary);
  assert.equal(variables.primaryTextColor, tokens.contentPrimary);
  assert.equal(variables.lineColor, tokens.contentSecondary);
  assert.equal(variables.background, tokens.backgroundPrimary);
  assert.equal(variables.darkMode, true);
});

test("appearance: light/dark overrides RemNote's mode under 'auto'", () => {
  const light = buildThemeConfig({ ...baseInput, appearance: "light" });
  assert.equal((light.config.themeVariables as Record<string, unknown>).darkMode, false);
  const dark = buildThemeConfig({ ...baseInput, dark: false, appearance: "dark" });
  assert.equal((dark.config.themeVariables as Record<string, unknown>).darkMode, true);
});

test("empty or '{}' overrides are a no-op", () => {
  for (const raw of ["", "   ", "{}"]) {
    const { config, warning } = buildThemeConfig({ ...baseInput, userVariables: raw });
    assert.equal(warning, undefined);
    // Exactly the auto-derived variables, no merge artifacts.
    assert.equal(config.theme, "base");
  }
  const builtIn = buildThemeConfig({ ...baseInput, theme: "neutral", userVariables: "" });
  assert.equal(builtIn.config.themeVariables, undefined);
});

test("invalid JSON is ignored with a warning and the theme still applies", () => {
  const { config, warning } = buildThemeConfig({ ...baseInput, userVariables: "{ not json" });
  assert.ok(warning);
  assert.equal(config.theme, "base");
  const builtIn = buildThemeConfig({ ...baseInput, theme: "dark", userVariables: "nope" });
  assert.equal(builtIn.config.theme, "dark");
  assert.ok(builtIn.warning);
});

test("non-object JSON is rejected", () => {
  const result = parseUserVariables("[1,2,3]");
  assert.deepEqual(result.value, {});
  assert.ok(result.warning);
});

test("user overrides are merged last and win", () => {
  const { config } = buildThemeConfig({ ...baseInput, userVariables: '{"primaryColor":"#ff8800"}' });
  const variables = config.themeVariables as Record<string, unknown>;
  assert.equal(variables.primaryColor, "#ff8800");
  // Other derived values survive the merge.
  assert.equal(variables.primaryTextColor, tokens.contentPrimary);
});

test("overrides also apply on top of a built-in theme", () => {
  const { config } = buildThemeConfig({ ...baseInput, theme: "forest", userVariables: '{"fontSize":"18px"}' });
  assert.equal(config.theme, "forest");
  assert.deepEqual(config.themeVariables, { fontSize: "18px" });
});

test("unresolvable CSS variables are dropped rather than sent to Mermaid", () => {
  const variables = tokensToThemeVariables(
    { backgroundPrimary: "var(--rn-clr-background-primary)", contentPrimary: "#fff" },
    false
  );
  assert.equal(variables.background, undefined);
  assert.equal(variables.primaryTextColor, "#fff");
});

test("works with no tokens at all (e.g. tokens not yet resolvable)", () => {
  const { config } = buildThemeConfig({ ...baseInput, tokens: {} });
  assert.equal(config.theme, "base");
  assert.equal((config.themeVariables as Record<string, unknown>).darkMode, true);
});
