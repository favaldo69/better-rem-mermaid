import { renderWidget, usePlugin, useRunAsync, type WidgetLocation } from "@remnote/plugin-sdk";
import { MermaidDiagram } from "./diagram.tsx";
import { useMermaidSettings } from "../lib/hooks.ts";
import "../style/widget.css";

/**
 * Mounted under every Rem. Renders nothing unless the Rem is a Mermaid code block,
 * so it is effectively free everywhere else.
 */
export const MermaidWidget = () => {
  const plugin = usePlugin();
  const widgetContext = useRunAsync(() => plugin.widget.getWidgetContext<WidgetLocation.UnderRemEditor>(), []);
  const settings = useMermaidSettings();
  const remId = widgetContext?.remId;

  if (!remId || !settings) return null;

  return <MermaidDiagram remId={remId} settings={settings} />;
};

renderWidget(MermaidWidget);

export default MermaidWidget;
