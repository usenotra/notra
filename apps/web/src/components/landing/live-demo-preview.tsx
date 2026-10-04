import { useTheme } from "next-themes";

import {
  LIVE_DEMO_PREVIEW_ALT,
  LIVE_DEMO_PREVIEW_DARK_SRC,
  LIVE_DEMO_PREVIEW_SRC,
  LIVE_DEMO_PREVIEW_THEME_SCRIPT,
} from "@/constants/landing/live-demo";

export function LiveDemoPreview() {
  const { resolvedTheme } = useTheme();
  let previewMedia = "(prefers-color-scheme: dark)";
  if (resolvedTheme) {
    previewMedia = resolvedTheme === "dark" ? "all" : "not all";
  }

  return (
    <>
      <picture>
        <source
          media={previewMedia}
          srcSet={LIVE_DEMO_PREVIEW_DARK_SRC}
          suppressHydrationWarning
          type="image/webp"
        />
        <img
          decoding="async"
          loading={resolvedTheme ? "eager" : "lazy"}
          alt={LIVE_DEMO_PREVIEW_ALT}
          className="pointer-events-none absolute inset-0 size-full object-cover object-top-left"
          fetchPriority="high"
          height={1250}
          src={LIVE_DEMO_PREVIEW_SRC}
          suppressHydrationWarning
          width={2000}
        />
      </picture>
      <script>{LIVE_DEMO_PREVIEW_THEME_SCRIPT}</script>
    </>
  );
}
