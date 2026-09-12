"use client";

import { Framer } from "@notra/ui/components/ui/svgs/framer";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { Google } from "@notra/ui/components/ui/svgs/google";
import { Granola } from "@notra/ui/components/ui/svgs/granola";
import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { Raycast } from "@notra/ui/components/ui/svgs/raycast";
import { Slack } from "@notra/ui/components/ui/svgs/slack";

import type { IntegrationConfig } from "@/types/integrations/catalog";

const INPUT_SOURCES: readonly IntegrationConfig[] = [
  {
    id: "github",
    name: "GitHub",
    description:
      "Connect GitHub repositories for changelogs, blog posts, and draft pull requests",
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
    available: true,
    category: "input",
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "Chat with your Notra agent in Slack threads, mirrored live into the dashboard",
    icon: <Slack />,
    accentColor: "#611F69",
    href: "slack",
    available: true,
    category: "input",
  },
  {
    id: "granola",
    name: "Granola",
    description:
      "Pull meeting notes, transcripts, and AI summaries from Granola for automated content",
    icon: <Granola />,
    accentColor: "#B2C248",
    href: "granola",
    available: true,
    category: "input",
  },
  {
    id: "google-search-console",
    name: "Google Search Console",
    description:
      "Turn the search queries you already rank for into AI prompt suggestions for GEO tracking",
    icon: <Google />,
    accentColor: "#4285F4",
    href: "google-search-console",
    available: true,
    category: "input",
  },
];

const OUTPUT_SOURCES: readonly IntegrationConfig[] = [
  {
    id: "framer",
    name: "Framer",
    description: "Import content into Framer automatically",
    icon: <Framer />,
    accentColor: "#0055FF",
    href: "framer",
    available: true,
    category: "output",
  },
];

const EXTENSION_SOURCES: readonly IntegrationConfig[] = [
  {
    id: "raycast",
    name: "Raycast",
    description: "Quickly access and search your Notra content from Raycast",
    icon: <Raycast />,
    accentColor: "#FF6363",
    href: "raycast",
    available: true,
    category: "extension",
    connectLabel: "Setup Guide",
  },
];

export const ALL_INTEGRATIONS = [
  ...INPUT_SOURCES,
  ...OUTPUT_SOURCES,
  ...EXTENSION_SOURCES,
];
