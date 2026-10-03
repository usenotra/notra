import type { SiteRedirect } from "@/types/redirects";
import { SHOWCASE_COMPANIES } from "@/utils/showcase";
import { SOCIAL_LINKS } from "@/utils/social-links";

export const SITE_REDIRECTS: SiteRedirect[] = [
  ...SHOWCASE_COMPANIES.map((company) => ({
    source: `/showcase/${company.slug}`,
    destination: `/changelog/${company.slug}`,
    permanent: true,
  })),
  {
    source: "/showcase/:name/:slug",
    destination: "/changelog/:name/:slug",
    permanent: true,
  },
  { source: "/showcase", destination: "/changelog", permanent: true },
  {
    source: "/founder-chat",
    destination: "https://cal.com/dominikkoch",
    permanent: false,
  },
  {
    source: "/founder-call",
    destination: "https://www.usenotra.com/founder-chat",
    permanent: true,
  },
  { source: "/branding", destination: "/brand", permanent: true },
  { source: "/merch", destination: "/free-hat", permanent: true },
  { source: "/discord", destination: SOCIAL_LINKS.discord, permanent: false },
  { source: "/x", destination: SOCIAL_LINKS.x, permanent: false },
  { source: "/linkedin", destination: SOCIAL_LINKS.linkedin, permanent: false },
  { source: "/github", destination: SOCIAL_LINKS.github, permanent: false },
  { source: "/reddit", destination: SOCIAL_LINKS.reddit, permanent: false },
];
