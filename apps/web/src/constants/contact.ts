import type { ContactResourceLink } from "@/types/contact";

export const CONTACT_RECIPIENT = "hello@usenotra.com";

export const CONTACT_RATE_LIMITS = {
  verificationIpMinute: {
    requests: 10,
    window: "1m",
    windowMs: 60 * 1000,
  },
  verificationGlobalMinute: {
    requests: 100,
    window: "1m",
    windowMs: 60 * 1000,
  },
  ipHourly: {
    requests: 2,
    window: "1h",
    windowMs: 60 * 60 * 1000,
  },
  ipDaily: {
    requests: 5,
    window: "1d",
    windowMs: 24 * 60 * 60 * 1000,
  },
  emailDaily: {
    requests: 2,
    window: "1d",
    windowMs: 24 * 60 * 60 * 1000,
  },
  globalHourly: {
    requests: 20,
    window: "1h",
    windowMs: 60 * 60 * 1000,
  },
} as const;

export const CONTACT_MESSAGE_MIN_LENGTH = 10;
export const CONTACT_MESSAGE_MAX_LENGTH = 2000;

export const CONTACT_RESPONSE_TIME =
  "Within one business day, often the same hour.";

export const CONTACT_PURPOSE =
  "Sales, support, security disclosures, and general questions.";

export const CONTACT_FORM_ASSURANCE =
  "A real human writes back. No ticket numbers.";

export const CONTACT_RESOURCE_LINKS: readonly ContactResourceLink[] = [
  {
    href: "https://docs.usenotra.com",
    label: "Documentation",
    description: "Guides, API reference, and setup walkthroughs.",
    icon: "documentation",
    external: true,
  },
  {
    href: "https://docs.usenotra.com/devtools/mcp",
    label: "MCP server",
    description: "Connect Notra to your agents and editors.",
    icon: "mcp",
    external: true,
  },
  {
    href: "/oss-program",
    label: "OSS program",
    description: "Free Notra Pro for open source maintainers.",
    icon: "oss",
    external: false,
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "Plans and limits for every team size.",
    icon: "pricing",
    external: false,
  },
];
