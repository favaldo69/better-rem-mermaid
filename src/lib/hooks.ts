import { useTrackerPlugin, type ReactRNPlugin, type RichTextInterface } from "@remnote/plugin-sdk";
import { detectMermaid, type MermaidDetection } from "./detect.ts";
import { readSettings, type MermaidSettings } from "./settings.ts";

/**
 * Read a Rem's rich text inside a tracker scope so the caller re-renders whenever
 * the Rem's text changes.
 */
export function useRemRichText(remId: string | undefined): RichTextInterface | undefined {
  return useTrackerPlugin(async (reactivePlugin) => {
    if (!remId) return undefined;
    const rem = await reactivePlugin.rem.findOne(remId);
    return rem?.text;
  }, [remId]);
}

/**
 * All settings, read in a tracker scope so changing any setting applies live to
 * every open diagram.
 */
export function useMermaidSettings(): MermaidSettings | undefined {
  return useTrackerPlugin(async (reactivePlugin) => readSettings(reactivePlugin as ReactRNPlugin), []);
}

/**
 * Detect a Mermaid diagram in a Rem, honouring the "detect unlabeled blocks"
 * setting.
 */
export function useMermaidDetection(
  richText: RichTextInterface | undefined,
  settings: MermaidSettings | undefined
): MermaidDetection | undefined {
  if (!settings) return undefined;
  return detectMermaid(richText, { allowHeuristic: settings.detectUnlabeled });
}
