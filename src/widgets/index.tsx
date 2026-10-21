import { declareIndexPlugin, WidgetLocation, type ReactRNPlugin, type RichTextInterface } from "@remnote/plugin-sdk";
import { registerSettings } from "../lib/settings.ts";
import "../style.css";

/**
 * Legacy powerup code. The typo ("memaid") is intentional: it is the code used by
 * every previously published version of this plugin, and changing it would orphan
 * existing diagrams.
 */
export const MERMAID_POWERUP = "memaid_powerup";

/** Language written when tagging a code block as Mermaid. */
const MERMAID_LANGUAGE = "mermaid";

export const TEMPLATES: Record<string, string> = {
  flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -- Yes --> C[Do the thing]
    B -- No --> D[Do something else]
    C --> E[End]
    D --> E`,
  sequence: `sequenceDiagram
    participant U as User
    participant R as RemNote
    U->>R: Paste a Mermaid block
    R-->>U: Render the diagram`,
  class: `classDiagram
    class Note {
      +String title
      +addChild(Note)
    }
    class Diagram {
      +String source
      +render()
    }
    Note <|-- Diagram`,
  er: `erDiagram
    NOTE ||--o{ DIAGRAM : contains
    NOTE {
      string id
      string text
    }
    DIAGRAM {
      string source
    }`,
  state: `stateDiagram-v2
    [*] --> Draft
    Draft --> Published : publish
    Published --> Draft : edit
    Published --> [*]`,
  gantt: `gantt
    title Project plan
    dateFormat YYYY-MM-DD
    section Phase 1
    Research :a1, 2024-01-01, 10d
    Design   :a2, after a1, 5d`,
  pie: `pie title Time spent
    "Writing notes" : 60
    "Making diagrams" : 30
    "Everything else" : 10`,
  mindmap: `mindmap
  root((RemNote))
    Notes
    Flashcards
    Diagrams`,
};

/**
 * Build rich text for a Mermaid code block. `language` is the rich-text format
 * RemNote's code block uses to record the language chosen in its dropdown.
 */
function mermaidCodeBlock(source: string): RichTextInterface {
  return [{ i: "m", text: source, code: true, language: MERMAID_LANGUAGE } as any];
}

/**
 * Return the Rem's rich text with every code block re-tagged as Mermaid, or
 * undefined when the Rem contains no code block that needs changing.
 */
export function retagAsMermaid(
  richText: RichTextInterface
): { text: RichTextInterface; changed: boolean } | undefined {
  let changed = false;
  const text = richText.map((element) => {
    const candidate = element as { code?: boolean; language?: string } | null;
    if (!candidate || typeof candidate !== "object") return element;
    if (candidate.code !== true) return element;
    if (candidate.language === MERMAID_LANGUAGE) return element;
    changed = true;
    return { ...(element as object), language: MERMAID_LANGUAGE } as any;
  });
  if (!changed) return undefined;
  return { text, changed };
}

async function tagFocusedRemAsMermaid(plugin: ReactRNPlugin): Promise<void> {
  const rem = await plugin.focus.getFocusedRem();
  if (!rem) {
    await plugin.app.toast("Select a Rem containing a code block first.");
    return;
  }
  if (!rem.text) {
    await plugin.app.toast("This Rem has no text.");
    return;
  }
  const retagged = retagAsMermaid(rem.text);
  if (!retagged) {
    await plugin.app.toast('No code block found. Use "Mermaid: Insert Diagram" to create one.');
    return;
  }
  await rem.setText(retagged.text);
  await plugin.app.toast("Mermaid diagram enabled for this code block.");
}

async function onActivate(plugin: ReactRNPlugin) {
  await registerSettings(plugin);

  // --- Powerup (legacy path) -------------------------------------------------
  // Register only if missing so we never overwrite the user's powerup.
  const existingPowerup = await plugin.powerup.getPowerupByCode(MERMAID_POWERUP);
  if (!existingPowerup) {
    await plugin.app.registerPowerup({
      name: "Mermaid",
      code: MERMAID_POWERUP,
      description: "Renders a Mermaid diagram from a code block.",
      options: {
        slots: [{ code: "Coding", name: "Code" }],
      } as any,
    });
  }

  // --- Widgets ---------------------------------------------------------------
  // Primary path: any Rem whose code block is tagged with the Mermaid language.
  await plugin.app.registerWidget("mermaid", WidgetLocation.UnderRemEditor, {
    dimensions: { height: "auto", width: "100%" },
  });

  // Legacy path: Rems tagged with the powerup created by earlier versions.
  await plugin.app.registerWidget("mermaid_legacy", WidgetLocation.UnderRemEditor, {
    dimensions: { height: "auto", width: "100%" },
    powerupFilter: MERMAID_POWERUP,
  });

  // --- Commands --------------------------------------------------------------

  const insertDiagram = async (template: string = TEMPLATES.flowchart) => {
    const rem = await plugin.focus.getFocusedRem();
    const child = await plugin.rem.createRem();
    if (!child) return;
    await child.setText(mermaidCodeBlock(template));
    if (rem) await child.setParent(rem);
  };

  // Tag the focused code block as Mermaid — the fast path for
  // "paste code, then turn it into a diagram".
  await plugin.app.registerCommand({
    id: "mermaid-convert-focused",
    name: "Mermaid: Turn Focused Code Block into Diagram",
    description: "Marks the focused Rem's code block as Mermaid so its diagram is rendered.",
    action: async () => tagFocusedRemAsMermaid(plugin),
  });

  await plugin.app.registerCommand({
    id: "mermaid-insert",
    name: "Mermaid: Insert Diagram",
    description: "Creates a new Mermaid diagram below the focused Rem.",
    action: async () => {
      await insertDiagram();
      await plugin.app.toast("Mermaid diagram created. Edit the code block to change it.");
    },
  });

  // Keep the historical `/mermaid` command working.
  await plugin.app.registerCommand({
    id: "mermaid",
    name: "Mermaid",
    description: "Creates a new Mermaid diagram below the focused Rem.",
    action: () => insertDiagram(),
  });

  // One command per diagram type, so templates are discoverable in the Omnibar.
  for (const [type, template] of Object.entries(TEMPLATES)) {
    const label = `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
    await plugin.app.registerCommand({
      id: `mermaid-template-${type}`,
      name: `Mermaid: Insert ${label} Diagram`,
      description: `Creates a new ${type} Mermaid diagram below the focused Rem.`,
      action: () => insertDiagram(template),
    });
  }

  // Migrate a diagram created by an older version of this plugin.
  await plugin.app.registerCommand({
    id: "mermaid-convert-powerup",
    name: "Mermaid: Convert Legacy Diagram to Code Block",
    description: "Removes the Mermaid powerup and marks the code block as Mermaid instead.",
    action: async () => {
      const rem = await plugin.focus.getFocusedRem();
      if (!rem) return;
      const hasPowerup = await rem.hasPowerup(MERMAID_POWERUP);
      if (!hasPowerup) {
        await plugin.app.toast("This Rem doesn't use the legacy Mermaid powerup.");
        return;
      }
      if (rem.text) {
        const retagged = retagAsMermaid(rem.text);
        if (retagged) await rem.setText(retagged.text);
      }
      await rem.removePowerup(MERMAID_POWERUP);
      await plugin.app.toast("Converted to a Mermaid code-block diagram.");
    },
  });
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
