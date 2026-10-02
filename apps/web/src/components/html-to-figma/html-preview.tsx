import { useRef, useState } from "react";

import { toSafeHtml } from "@/lib/html-to-figma/sanitize";
import type { HtmlPreviewProps } from "@/types/html-to-figma";

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;

export default function HtmlPreview({ html }: HtmlPreviewProps) {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [scale, setScale] = useState(0);

  const measureRef = (element: HTMLDivElement | null) => {
    observerRef.current?.disconnect();

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const { width, height } = element.getBoundingClientRect();
      setScale(Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT));
    });

    observer.observe(element);
    observerRef.current = observer;
  };

  const trimmed = html.trim();
  const srcDoc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}body{width:${CANVAS_WIDTH}px;height:${CANVAS_HEIGHT}px;display:flex;overflow:hidden;background:#ffffff}</style></head><body>${toSafeHtml(trimmed)}</body></html>`;

  return (
    <div
      className="flex h-full w-full items-center justify-center p-4 sm:p-6"
      ref={measureRef}
    >
      {trimmed ? (
        <div
          className="ring-border overflow-hidden rounded-lg ring-1"
          style={{ width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale }}
        >
          <iframe
            className="origin-top-left border-0"
            sandbox=""
            srcDoc={srcDoc}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `scale(${scale})`,
            }}
            title="HTML preview"
          />
        </div>
      ) : (
        <p className="text-muted-foreground font-mono text-sm">
          Paste HTML to see a preview
        </p>
      )}
    </div>
  );
}
