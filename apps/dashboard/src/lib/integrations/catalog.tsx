"use client";

import { Framer } from "@notra/ui/components/ui/svgs/framer";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Marble } from "@notra/ui/components/ui/svgs/marble";
import { Slack } from "@notra/ui/components/ui/svgs/slack";
import { Webflow } from "@notra/ui/components/ui/svgs/webflow";
import type { IntegrationType } from "@/utils/schemas/integrations";

export interface IntegrationConfig {
  id: IntegrationType;
  name: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  href: string;
  available: boolean;
  category: "input" | "output";
}

export const INPUT_SOURCES: readonly IntegrationConfig[] = [
  {
    id: "github",
    name: "GitHub",
    description:
      "Connect GitHub repositories for AI-powered changelogs, blog posts, and tweets",
    icon: <Github />,
    accentColor: "#238636",
    href: "github",
    available: true,
    category: "input",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Sync issues and updates from Linear for automated content",
    icon: <Linear />,
    accentColor: "#5E6AD2",
    href: "linear",
    available: false,
    category: "input",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect Slack workspaces to track updates and announcements",
    icon: <Slack />,
    accentColor: "#4A154B",
    href: "slack",
    available: false,
    category: "input",
  },
];

export const OUTPUT_SOURCES: readonly IntegrationConfig[] = [
  {
    id: "framer",
    name: "Framer",
    description: "Sync content to your Framer site automatically",
    icon: <Framer />,
    accentColor: "#0055FF",
    href: "framer",
    available: false,
    category: "output",
  },
  {
    id: "marble",
    name: "Marble",
    description: "Publish to Marble for seamless content management",
    icon: <Marble />,
    accentColor: "#6366F1",
    href: "marble",
    available: false,
    category: "output",
  },
  {
    id: "webflow",
    name: "Webflow",
    description: "Publish content directly to your Webflow CMS",
    icon: <Webflow />,
    accentColor: "#4353FF",
    href: "webflow",
    available: false,
    category: "output",
  },
];

export const ALL_INTEGRATIONS = [...INPUT_SOURCES, ...OUTPUT_SOURCES];

export const INTEGRATION_CATEGORY_MAP: Record<
  IntegrationType,
  "input" | "output"
> = {
  github: "input",
  linear: "input",
  slack: "input",
  framer: "output",
  marble: "output",
  webflow: "output",
};
