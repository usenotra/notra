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
    descriptionKey: "github",
    name: "GitHub",
    icon: <Github />,
    accentColor: "#238636",
    href: "github",
    available: true,
    category: "input",
  },
  {
    id: "linear",
    descriptionKey: "linear",
    name: "Linear",
    icon: <Linear />,
    accentColor: "#5E6AD2",
    href: "linear",
    available: true,
    category: "input",
  },
  {
    id: "slack",
    descriptionKey: "slack",
    name: "Slack",
    icon: <Slack />,
    accentColor: "#611F69",
    href: "slack",
    available: true,
    category: "input",
  },
  {
    id: "granola",
    descriptionKey: "granola",
    name: "Granola",
    icon: <Granola />,
    accentColor: "#B2C248",
    href: "granola",
    available: true,
    category: "input",
  },
  {
    id: "google-search-console",
    descriptionKey: "googleSearchConsole",
    name: "Google Search Console",
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
    descriptionKey: "framer",
    name: "Framer",
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
    descriptionKey: "raycast",
    name: "Raycast",
    icon: <Raycast />,
    accentColor: "#FF6363",
    href: "raycast",
    available: true,
    category: "extension",
    connectLabelKey: "setupGuide",
  },
];

export const ALL_INTEGRATIONS = [
  ...INPUT_SOURCES,
  ...OUTPUT_SOURCES,
  ...EXTENSION_SOURCES,
];
