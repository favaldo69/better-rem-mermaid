import { declareIndexPlugin, ReactRNPlugin, RichTextInterface, WidgetLocation } from "@remnote/plugin-sdk";
import "../style.css";

export const MERMAID_POWERUP = "memaid_powerup";

const STYLE = `
/* Collapse the Mermaid source block; reveal it while the Rem has focus. */
[data-rem-container-tags~=mermaid] .rn-code-node {
  min-height: 0;
  max-height: 1.75rem;
  overflow: hidden;
  opacity: .45;
  transition: opacity .12s ease;
}
[data-rem-container-tags~=mermaid] rem-container--focused .rn-code-node,
[data-rem-container-tags~=mermaid].rem-container--focused .rn-code-node {
  max-height: none;
  overflow: visible;
  opacity: 1;
}
`;

const SAMPLE_MERMAID: RichTextInterface = [
  {
    text: `
flowchart TD
  Start
    `.trim(),
    i: "m",
    code: true,
  },
];

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.app.registerPowerup({
    name: "Mermaid",
    code: MERMAID_POWERUP,
    description: "A Mermaid plugin",
    options: { slots: [{ code: "Coding", name: "Code" }] },
  });

  await plugin.app.registerWidget("mermaid", WidgetLocation.UnderRemEditor, {
    dimensions: { height: "auto", width: "100%" },
    powerupFilter: MERMAID_POWERUP,
  });

  await plugin.settings.registerDropdownSetting({
    id: "mermaid-theme",
    title: "Diagram theme",
    description: "Theme used for every Mermaid diagram.",
    defaultValue: "base",
    options: [
      { key: "0", label: "Match RemNote", value: "base" },
      { key: "1", label: "Default", value: "default" },
      { key: "2", label: "Dark", value: "dark" },
      { key: "3", label: "Forest", value: "forest" },
      { key: "4", label: "Neutral", value: "neutral" },
      { key: "5", label: "Neo", value: "neo" },
    ],
  });

  await plugin.app.registerCommand({
    id: "mermaid",
    name: "Mermaid",
    action: async () => {
      const rem = await plugin.focus.getFocusedRem();
      await rem?.addPowerup(MERMAID_POWERUP);
      await rem?.setText(SAMPLE_MERMAID);
    },
  });
  await plugin.app.registerCSS("mermaidcss", STYLE);
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
