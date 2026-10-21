import { useCallback, useEffect, useRef, useState } from "react";
import type { MermaidConfig } from "mermaid";
import { nanoid } from "nanoid";
import { renderDiagram } from "../lib/render.ts";
import { buildThemeConfig, isRemNoteDark, readRemNoteTokens } from "../lib/theme.ts";
import { useMermaidDetection, useRemRichText } from "../lib/hooks.ts";
import type { MermaidSettings } from "../lib/settings.ts";
import "../style/widget.css";

const DEBOUNCE_MS = 250;

interface DiagramProps {
  remId: string;
  settings: MermaidSettings;
  /** Theme override id, or undefined to use the user's setting. */
  themeOverride?: string;
  /**
   * Diagram source to render instead of detecting one from the Rem. Used by the
   * legacy renderer, whose diagrams are plain tagged code blocks.
   */
  sourceOverride?: string;
}

function buildConfig(settings: MermaidSettings, themeOverride: string | undefined): MermaidConfig {
  const { config } = buildThemeConfig({
    theme: themeOverride ?? settings.theme,
    appearance: settings.appearance,
    userVariables: settings.themeVariables,
    tokens: readRemNoteTokens(),
    dark: isRemNoteDark(),
  });

  return {
    startOnLoad: false,
    securityLevel: settings.securityLevel as MermaidConfig["securityLevel"],
    theme: config.theme,
    themeVariables: config.themeVariables,
    flowchart: { useMaxWidth: false, htmlLabels: false },
    sequence: { useMaxWidth: false },
    gantt: { useMaxWidth: false },
    er: { useMaxWidth: false },
    class: { useMaxWidth: false },
    state: { useMaxWidth: false },
  } as MermaidConfig;
}

/**
 * Renders one diagram. Split out from the widget so the debounced renderer can be
 * created once per diagram.
 */
export const MermaidDiagram = ({ remId, settings, themeOverride, sourceOverride }: DiagramProps) => {
  const [id] = useState(() => `mermaid-${nanoid(8).replace(/[^a-zA-Z0-9_-]/g, "")}`);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [hasRendered, setHasRendered] = useState(false);
  const [showFull, setShowFull] = useState(false);

  // Incrementing a generation lets us drop results that arrive after a newer
  // render was requested (fast typing produces overlapping renders).
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const richText = useRemRichText(remId);
  const detection = useMermaidDetection(richText, settings);
  const source = sourceOverride ?? detection?.source;

  const doRender = useCallback(async () => {
    if (!source) return;
    const generation = ++generationRef.current;

    const result = await renderDiagram({
      id,
      source,
      config: buildConfig(settings, themeOverride),
    });

    // A newer render started while this one was in flight — discard it.
    if (generation !== generationRef.current) return;

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError(undefined);
    if (containerRef.current) {
      containerRef.current.innerHTML = result.svg;
      const svg = containerRef.current.querySelector("svg");
      if (svg) {
        svg.style.maxWidth = "100%";
        if (settings.scale !== 1) {
          const width = Number.parseFloat(svg.getAttribute("width") ?? "");
          if (Number.isFinite(width)) svg.setAttribute("width", String(width * settings.scale));
        }
      }
      result.bindFunctions?.(containerRef.current);
    }
    setHasRendered(true);
  }, [source, id, settings, themeOverride]);

  // (Re)schedule a debounced render whenever the source, settings or theme change.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!source) {
      setHasRendered(false);
      setError(undefined);
      if (containerRef.current) containerRef.current.innerHTML = "";
      return undefined;
    }

    timerRef.current = setTimeout(() => {
      void doRender();
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [source, doRender]);

  // Re-render when RemNote switches between light and dark mode.
  useEffect(() => {
    const observer = new MutationObserver(() => void doRender());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [doRender]);

  useEffect(
    () => () => {
      generationRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const failed = !!error || !hasRendered;

  if (!source) return null;

  return (
    <div
      className="mermaid-diagram"
      data-mermaid-diagram
      data-mermaid-reason={sourceOverride ? "legacy" : detection?.reason}
      data-mermaid-hide-source={settings.hideSource ? "true" : "false"}
      /* The stylesheet only collapses the source block when this is "ok". */
      data-mermaid-state={failed ? "error" : "ok"}
    >
      {error ? (
        <div className="mermaid-diagram__error" role="alert">
          <div className="mermaid-diagram__error-title">Could not render this Mermaid diagram</div>
          <pre className="mermaid-diagram__error-message">{error}</pre>
        </div>
      ) : null}

      <div
        className="mermaid-diagram__canvas"
        ref={containerRef}
        style={
          settings.maxHeight > 0 && !showFull
            ? { maxHeight: `${settings.maxHeight}px`, overflow: "hidden" }
            : undefined
        }
      />

      {settings.maxHeight > 0 && hasRendered && !error ? (
        <button type="button" className="mermaid-diagram__toggle" onClick={() => setShowFull((previous) => !previous)}>
          {showFull ? "Collapse diagram" : "Show full diagram"}
        </button>
      ) : null}
    </div>
  );
};
