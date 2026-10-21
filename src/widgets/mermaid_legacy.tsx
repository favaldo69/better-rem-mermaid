import { renderWidget, usePlugin, useRunAsync, type WidgetLocation } from "@remnote/plugin-sdk";
import { useMermaidSettings, useRemRichText } from "../lib/hooks.ts";
import { MermaidDiagram } from "./diagram.tsx";
import "../style/widget.css";

/**
 * Renderer for diagrams created by earlier versions of this plugin, which keep
 * their source in a plain (unlabeled) code block tagged with the Mermaid powerup.
 *
 * It reuses the primary renderer so legacy diagrams automatically pick up the
 * selected theme and every other setting. Users can migrate such a Rem to the new
 * code-block form with the "Mermaid: Convert Legacy Diagram" command.
 */
export const MermaidLegacyWidget = () => {
  const plugin = usePlugin();
  const widgetContext = useRunAsync(() => plugin.widget.getWidgetContext<WidgetLocation.UnderRemEditor>(), []);
  const settings = useMermaidSettings();
  const remId = widgetContext?.remId;
  const richText = useRemRichText(remId);

  if (!remId || !settings) return null;

  // Only the text of code blocks; a powerup-tagged Rem may also have a title.
  const codeText = (richText ?? [])
    .filter((element) => {
      const candidate = element as { code?: boolean; text?: unknown } | null;
      return candidate?.code === true && typeof candidate.text === "string";
    })
    .map((element) => (element as { text: string }).text)
    .join("\n");

  if (!codeText.trim()) return null;

  // Reuse the diagram renderer by handing it the source directly through a shim
  // object so legacy Rem keep working exactly like the new ones.
  return <MermaidDiagram remId={remId} settings={settings} sourceOverride={codeText} />;
};

renderWidget(MermaidLegacyWidget);

export default MermaidLegacyWidget;
