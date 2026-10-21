import {
  usePlugin,
  renderWidget,
  AppEvents,
  useAPIEventListener,
  useRunAsync,
  useTrackerPlugin,
  type WidgetLocation,
} from "@remnote/plugin-sdk";
import { useEffect, useState, useRef, useCallback } from "react";
import mermaid from "mermaid";
import { debounce } from "debounce";
import { nanoid } from "nanoid";

const MERMAID_WIDGET = "mermaid_widget";
const MERMAID_WIDGET_RENDERER = "mermaid_widget_renderer";

export const MermaidWidget = () => {
  const plugin = usePlugin();
  const [id] = useState(nanoid());

  const widgetRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<HTMLDivElement | null>(null);

  // The theme comes from a plugin setting, so it applies to every diagram and
  // updates live when the user changes it.
  const theme = useTrackerPlugin(async (p) => await p.settings.getSetting<string>("mermaid-theme"), []);

  const widgetContext = useRunAsync(() => plugin.widget.getWidgetContext<WidgetLocation.UnderRemEditor>(), []);

  const getRemText = useCallback(
    async (remId: string) => {
      const rem = await plugin.rem.findOne(remId);
      const text = await plugin.richText.toString(rem?.text || []);
      return text?.toString() || "";
    },
    [plugin]
  );

  const renderMermaid = useCallback(async () => {
    const remId = widgetContext?.remId;
    const text = remId && (await getRemText(remId));
    if (text && rendererRef.current) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          // "base" derives its colours from CSS variables below, so diagrams
          // follow the active RemNote theme (including third-party themes).
          theme: (theme ?? "base") as any,
          securityLevel: "loose",
          themeVariables:
            theme === "base" || theme === undefined
              ? {
                  primaryColor: "var(--rn-clr-background-secondary)",
                  primaryTextColor: "var(--rn-clr-content-primary)",
                  primaryBorderColor: "var(--rn-clr-border-opaque)",
                  lineColor: "var(--rn-clr-content-secondary)",
                  secondaryColor: "var(--rn-clr-background-tertiary)",
                  tertiaryColor: "var(--rn-clr-background-primary)",
                }
              : undefined,
        });
        const { svg } = await mermaid.render(MERMAID_WIDGET + id, text);
        rendererRef.current.innerHTML = svg;
      } catch (e) {
        console.log("Mermaid failed to render: ", e);
      }
    }
  }, [widgetContext?.remId, id, getRemText, theme]);

  useAPIEventListener(
    AppEvents.RemChanged,
    widgetContext?.remId,
    debounce(() => renderMermaid(), 500)
  );

  useEffect(() => {
    if (widgetContext?.remId && widgetRef.current && rendererRef.current) {
      renderMermaid();
    }
  }, [widgetContext?.remId, renderMermaid, theme]);

  return (
    <div>
      {/* className="border-2 border-stone-200 dark:border-stone-600 rounded p-2 ml-6" */}
      <div ref={widgetRef} id={MERMAID_WIDGET + id} />
      <div ref={rendererRef} id={MERMAID_WIDGET_RENDERER + id} />
    </div>
  );
};

renderWidget(MermaidWidget);
