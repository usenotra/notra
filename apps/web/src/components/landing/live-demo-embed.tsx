import { ArrowExpand01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import {
  LIVE_DEMO_CLOSE_LABEL,
  LIVE_DEMO_EMBED_URL,
  LIVE_DEMO_FALLBACK_URL,
  LIVE_DEMO_IFRAME_SANDBOX,
  LIVE_DEMO_IFRAME_TITLE,
  LIVE_DEMO_LOAD_TIMEOUT_MS,
  LIVE_DEMO_LOADING_LABEL,
  LIVE_DEMO_OPEN_LABEL,
  LIVE_DEMO_ORIGIN,
  LIVE_DEMO_PREVIEW_ALT,
  LIVE_DEMO_PREVIEW_DARK_SRC,
  LIVE_DEMO_PREVIEW_SRC,
  LIVE_DEMO_READY_MESSAGE,
  LIVE_DEMO_STALLED_ACTION,
  LIVE_DEMO_STALLED_LABEL,
  LIVE_DEMO_THEME_MESSAGE,
  LIVE_DEMO_THEME_PARAM,
} from "@/constants/landing/live-demo";

function openStandaloneDemo() {
  window.open(LIVE_DEMO_FALLBACK_URL, "_blank", "noopener");
}

export function LiveDemoEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // The iframe mounts on the first click; the preview stays on top until the
  // demo has finished its entry redirects so fullscreen never opens blank.
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { resolvedTheme } = useTheme();
  const [initialTheme, setInitialTheme] = useState<string>();
  const [listening, setListening] = useState(false);
  const src = initialTheme
    ? `${LIVE_DEMO_EMBED_URL}&${LIVE_DEMO_THEME_PARAM}=${initialTheme}`
    : LIVE_DEMO_EMBED_URL;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin === LIVE_DEMO_ORIGIN &&
        event.source === iframeRef.current?.contentWindow &&
        event.data?.type === LIVE_DEMO_READY_MESSAGE
      ) {
        setListening(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!listening || !resolvedTheme) {
      return;
    }
    iframeRef.current?.contentWindow?.postMessage(
      { type: LIVE_DEMO_THEME_MESSAGE, theme: resolvedTheme },
      LIVE_DEMO_ORIGIN
    );
  }, [listening, resolvedTheme]);

  useEffect(() => {
    if (!mounted || ready) {
      return;
    }
    const timeout = window.setTimeout(
      () => setStalled(true),
      LIVE_DEMO_LOAD_TIMEOUT_MS
    );
    return () => window.clearTimeout(timeout);
  }, [mounted, ready]);

  useEffect(() => {
    const sync = () =>
      setExpanded(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const openStalledDemo = () => {
    openStandaloneDemo();
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
  };

  const openFullscreen = async () => {
    const container = containerRef.current;
    if (!container?.requestFullscreen) {
      openStandaloneDemo();
      return;
    }
    setInitialTheme((current) => current ?? resolvedTheme);
    setMounted(true);
    try {
      await container.requestFullscreen();
    } catch {
      openStandaloneDemo();
    }
  };

  return (
    <div className="h-[36rem] w-full max-w-[64rem] lg:h-auto lg:flex-1">
      <div
        className="group border-border bg-background relative size-full overflow-hidden rounded-2xl border lg:rounded-b-none lg:border-b-0 [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
        ref={containerRef}
      >
        {mounted ? (
          <iframe
            allow="clipboard-write"
            className="size-full"
            inert={!(expanded && ready)}
            onLoad={() => setReady(true)}
            ref={iframeRef}
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox={LIVE_DEMO_IFRAME_SANDBOX}
            src={src}
            title={LIVE_DEMO_IFRAME_TITLE}
          />
        ) : null}
        {ready ? null : (
          <>
            <img
              decoding="async"
              loading="lazy"
              alt={LIVE_DEMO_PREVIEW_ALT}
              className="pointer-events-none absolute inset-0 size-full object-cover object-top-left dark:hidden"
              fetchPriority="high"
              src={LIVE_DEMO_PREVIEW_SRC}
            />
            <img
              decoding="async"
              loading="lazy"
              alt={LIVE_DEMO_PREVIEW_ALT}
              className="pointer-events-none absolute inset-0 hidden size-full object-cover object-top-left dark:block"
              fetchPriority="high"
              src={LIVE_DEMO_PREVIEW_DARK_SRC}
            />
          </>
        )}
        {mounted && !ready ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/30">
            <span
              aria-live="polite"
              className="bg-foreground text-background rounded-full px-5 py-2.5 text-sm font-medium"
              role="status"
            >
              {stalled ? LIVE_DEMO_STALLED_LABEL : LIVE_DEMO_LOADING_LABEL}
            </span>
            {stalled ? (
              <button
                className="bg-background text-foreground pointer-events-auto cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium"
                onClick={openStalledDemo}
                type="button"
              >
                {LIVE_DEMO_STALLED_ACTION}
              </button>
            ) : null}
          </div>
        ) : null}
        {expanded ? (
          <button
            aria-label={LIVE_DEMO_CLOSE_LABEL}
            className="bg-foreground text-background absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-full"
            onClick={() => document.exitFullscreen()}
            type="button"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        ) : (
          <button
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30 focus-visible:bg-black/30"
            onClick={openFullscreen}
            type="button"
          >
            <span className="bg-foreground text-background flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100">
              <HugeiconsIcon icon={ArrowExpand01Icon} size={16} />
              {LIVE_DEMO_OPEN_LABEL}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
