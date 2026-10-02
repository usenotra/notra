import {
  Activity01Icon,
  AiBrain01Icon,
  BookOpen01Icon,
  CommandLineIcon,
  FavouriteIcon,
  Megaphone01Icon,
  PaintBoardIcon,
  PuzzleIcon,
  QuillWrite01Icon,
  SparklesIcon,
  UserGroupIcon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export interface MarketingNavCard {
  href: string;
  label: string;
  description: string;
  icon: IconSvgElement;
  external?: boolean;
}

export interface MarketingNavRailItem {
  href: string;
  label: string;
  icon: IconSvgElement;
  external?: boolean;
}

export interface MarketingNavGroup {
  type: "group";
  label: string;
  cardsHeading: string;
  cards: readonly MarketingNavCard[];
  railHeading: string;
  rail: readonly MarketingNavRailItem[];
}

interface MarketingNavLink {
  type: "link";
  href: string;
  label: string;
}

export type MarketingNavEntry = MarketingNavGroup | MarketingNavLink;

export const MARKETING_NAV: readonly MarketingNavEntry[] = [
  {
    type: "group",
    label: "Products",
    cardsHeading: "Product",
    cards: [
      {
        href: "/features",
        label: "Features",
        description: "Prompt tracking, AI traffic and content gaps",
        icon: SparklesIcon,
      },
      {
        href: "/features/marketing/assets",
        label: "Marketing Assets",
        description: "Images and posts for the content you write",
        icon: PaintBoardIcon,
      },
      {
        href: "/integrations",
        label: "Integrations",
        description: "GitHub, Linear, Search Console and more",
        icon: PuzzleIcon,
      },
    ],
    railHeading: "Developers",
    rail: [
      {
        href: "https://www.npmjs.com/package/@usenotra/geo",
        label: "GEO SDK",
        icon: Activity01Icon,
        external: true,
      },
      {
        href: "/mcp",
        label: "MCP Server",
        icon: AiBrain01Icon,
      },
      {
        href: "/mcp/use-cases",
        label: "MCP Use Cases",
        icon: WorkflowSquare01Icon,
      },
      {
        href: "https://docs.usenotra.com/devtools/cli",
        label: "CLI",
        icon: CommandLineIcon,
        external: true,
      },
    ],
  },
  {
    type: "group",
    label: "Resources",
    cardsHeading: "Resources",
    cards: [
      {
        href: "/blog",
        label: "Blog",
        description: "Writing on GEO, AI search and DX",
        icon: QuillWrite01Icon,
      },
      {
        href: "/changelog/notra",
        label: "Changelog",
        description: "Overview of latest Notra changes",
        icon: Megaphone01Icon,
      },
      {
        href: "/contributors",
        label: "Contributors",
        description: "People building Notra in the open",
        icon: UserGroupIcon,
      },
    ],
    railHeading: "More",
    rail: [
      {
        href: "https://docs.usenotra.com",
        label: "Docs",
        icon: BookOpen01Icon,
        external: true,
      },
      {
        href: "https://www.notrareviews.com/",
        label: "Reviews",
        icon: FavouriteIcon,
        external: true,
      },
    ],
  },
  { type: "link", href: "/pricing", label: "Pricing" },
];
