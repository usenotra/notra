import { defineComponents } from "blume";

import DuotoneTooltip from "./src/components/duotone-tooltip.astro";
import SiteFooter from "./src/components/site-footer.astro";

export default defineComponents({
  layout: { Footer: SiteFooter },
  mdx: {
    DuotoneTooltip,
    RegistryInstall: {
      client: "load",
      component: "./src/components/registry-install.tsx",
    },
    PreviewToaster: {
      client: "only",
      component: "./src/components/preview-toaster.tsx",
    },
  },
});
