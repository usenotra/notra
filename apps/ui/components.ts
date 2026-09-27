import { defineComponents } from "blume";

import DuotoneTooltip from "./src/components/duotone-tooltip.astro";
import ThemeHotkey from "./src/components/theme-hotkey.astro";

export default defineComponents({
  layout: { Footer: ThemeHotkey },
  mdx: { DuotoneTooltip },
});
