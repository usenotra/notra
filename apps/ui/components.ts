import { defineComponents } from "blume";

import DuotoneTooltip from "./src/components/duotone-tooltip.astro";
import SiteFooter from "./src/components/site-footer.astro";
import SiteLogo from "./src/components/site-logo.astro";

export default defineComponents({
  layout: { Footer: SiteFooter, Logo: SiteLogo },
  mdx: {
    DuotoneTooltip,
    PreviewToaster: {
      client: "only",
      component: "./src/components/preview-toaster.tsx",
    },
  },
});
