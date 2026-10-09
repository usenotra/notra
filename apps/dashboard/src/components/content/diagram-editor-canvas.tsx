"use client";

import "@excalidraw/excalidraw/index.css";
import { Excalidraw, restoreElements } from "@excalidraw/excalidraw";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useTheme } from "next-themes";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { DIAGRAM_EDITOR_VIEWPORT_ZOOM } from "@/constants/diagram-editor";
import type { DiagramEditorCanvasProps } from "@/types/components/diagram-editor";
import { waitForDiagramFonts } from "@/utils/diagram-editor-fonts";

// Loaded only through lazyComponent: Excalidraw is client-only and large.
export default function DiagramEditorCanvas({
  scene,
  onReady,
}: DiagramEditorCanvasProps) {
  const { resolvedTheme } = useTheme();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const reportReady = useEffectEvent(onReady);
  // The scene is JSON from our API; restoreElements is Excalidraw's own
  // validator and fills in anything an older scene is missing.
  const [elements] = useState(() =>
    restoreElements(
      scene.elements as unknown as ImportedDataState["elements"],
      null,
      { repairBindings: true }
    )
  );

  useEffect(() => {
    const api = apiRef.current;
    if (!(sceneLoaded && api)) {
      return;
    }
    let cancelled = false;
    let frame: number | undefined;

    // The API arrives in Excalidraw's constructor, before scene/font loading.
    // Its first non-loading change is the safe point to await the scene fonts.
    waitForDiagramFonts().then(() => {
      if (cancelled) {
        return;
      }
      api.scrollToContent(undefined, {
        fitToViewport: true,
        viewportZoomFactor: DIAGRAM_EDITOR_VIEWPORT_ZOOM,
        maxZoom: 1,
        animate: false,
      });
      // Excalidraw paints the fitted canvas on the next animation frame.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          setRevealed(true);
          reportReady(api);
        });
      });
    });

    return () => {
      cancelled = true;
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, [sceneLoaded]);

  return (
    <div className="relative size-full">
      {revealed ? null : (
        <Skeleton className="absolute inset-0 z-10 size-full rounded-lg" />
      )}
      <div
        className={revealed ? "size-full" : "invisible size-full"}
        inert={!revealed}
      >
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api;
          }}
          initialData={{
            elements,
            appState: {
              viewBackgroundColor:
                scene.appState?.viewBackgroundColor ?? "#ffffff",
            },
          }}
          onChange={
            sceneLoaded
              ? undefined
              : (_, appState) => {
                  if (!appState.isLoading) {
                    setSceneLoaded(true);
                  }
                }
          }
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
              saveToActiveFile: false,
            },
            // Notra cannot render images in a diagram; they would be dropped on save.
            tools: { image: false },
          }}
        />
      </div>
    </div>
  );
}
