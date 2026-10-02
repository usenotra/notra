import { Discord } from "@notra/ui/components/ui/svgs/discord";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linkedin } from "@notra/ui/components/ui/svgs/linkedin";
import { Reddit } from "@notra/ui/components/ui/svgs/reddit";
import { XTwitter } from "@notra/ui/components/ui/svgs/twitter";
import { Youtube } from "@notra/ui/components/ui/svgs/youtube";

import type {
  FooterDitheringConfig,
  FooterLink,
  FooterLinkColumn,
  FooterSocialLink,
} from "@/types/landing/footer";
import { SOCIAL_LINKS } from "@/utils/social-links";

export const FOOTER_TAGLINE =
  "Find out what AI engines say about you, and fix it.";

export const FOOTER_DITHERING: FooterDitheringConfig = {
  speed: 0.57,
  shape: "wave",
  type: "4x4",
  size: 2.9,
  scale: 0.73,
  colorBack: "#00000000",
  colorFront: "#8B5CF64D",
};

export const FOOTER_SOCIAL_LINKS: readonly FooterSocialLink[] = [
  { label: "X", href: SOCIAL_LINKS.x, Icon: XTwitter },
  { label: "YouTube", href: SOCIAL_LINKS.youtube, Icon: Youtube },
  { label: "LinkedIn", href: SOCIAL_LINKS.linkedin, Icon: Linkedin },
  { label: "Discord", href: SOCIAL_LINKS.discord, Icon: Discord },
  { label: "GitHub", href: SOCIAL_LINKS.github, Icon: Github },
  { label: "Reddit", href: SOCIAL_LINKS.reddit, Icon: Reddit },
];

export const FOOTER_LINK_COLUMNS: readonly FooterLinkColumn[] = [
  {
    groups: [
      {
        title: "Product",
        links: [
          { label: "Features", href: "/features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Changelog", href: "/changelog/notra" },
          { label: "Examples", href: "/changelog" },
        ],
      },
      {
        title: "Integrations",
        links: [
          { label: "Marketplace", href: "/integrations" },
          {
            label: "Framer",
            href: "https://www.framer.com/marketplace/plugins/notra/",
            external: true,
          },
          {
            label: "Raycast",
            href: "https://www.raycast.com/dominikdev/notra",
            external: true,
          },
        ],
      },
    ],
  },
  {
    groups: [
      {
        title: "Developers",
        links: [
          {
            label: "Docs",
            href: "https://docs.usenotra.com",
            external: true,
          },
          {
            label: "CLI",
            href: "https://docs.usenotra.com/devtools/cli",
            external: true,
          },
          {
            label: "MCP Server",
            href: "/mcp",
          },
        ],
      },
      {
        title: "Sources",
        links: [
          {
            label: "GitHub",
            href: SOCIAL_LINKS.github,
            external: true,
          },
          {
            label: "Linear",
            href: "https://linear.app",
            external: true,
          },
          { label: "Slack (soon)" },
        ],
      },
    ],
  },
  {
    groups: [
      {
        title: "Company",
        links: [
          { label: "Brand Assets", href: "/brand" },
          {
            label: "Reviews",
            href: "https://www.notrareviews.com/",
            external: true,
          },
          { label: "Contact", href: "/contact" },
        ],
      },
      {
        title: "Community",
        links: [
          { label: "OSS Program", href: "/oss-program" },
          { label: "Contributors", href: "/contributors" },
        ],
      },
      {
        title: "Free Tools",
        links: [
          { label: "GitHub Star Video Generator", href: "/repo-star-video" },
          { label: "AI Crawler IP Checker", href: "/ip-checker" },
        ],
      },
    ],
  },
];

export const FOOTER_LEGAL_LINKS: readonly FooterLink[] = [
  { label: "Privacy", href: "/privacy" },
  { label: "Legal", href: "/legal" },
  { label: "Terms", href: "/terms" },
];
