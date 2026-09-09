"use client";

import { useEffect, useState } from "react";

type EngineIconHtmlRenderer = (engine: string, darkSurface?: boolean) => string;

const EMPTY_RENDERER: EngineIconHtmlRenderer = () => "";

let cachedRenderer: EngineIconHtmlRenderer | null = null;
let rendererPromise: Promise<EngineIconHtmlRenderer> | null = null;

/**
 * The renderer serialises React icon components to markup and therefore pulls in
 * `react-dom/server` (~59 kB gz). It is loaded after hydration so it stays out of
 * the first-load chunks of the GEO routes; until it resolves, chart tooltips
 * render without their engine icon.
 */
function loadRenderer(): Promise<EngineIconHtmlRenderer> {
  rendererPromise ??= import("@/utils/engine-icon-html")
    .then((module) => {
      cachedRenderer = module.engineIconHtml;
      return module.engineIconHtml;
    })
    .catch(() => {
      rendererPromise = null;
      return EMPTY_RENDERER;
    });
  return rendererPromise;
}

export function useEngineIconHtml(): EngineIconHtmlRenderer {
  const [renderer, setRenderer] = useState<EngineIconHtmlRenderer | null>(
    () => cachedRenderer
  );

  useEffect(() => {
    if (renderer) {
      return;
    }

    let active = true;
    void loadRenderer().then((loaded) => {
      if (active) {
        setRenderer(() => loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [renderer]);

  return renderer ?? EMPTY_RENDERER;
}
