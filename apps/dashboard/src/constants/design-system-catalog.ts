import type {
  DesignSystemCatalogEntry,
  DesignSystemCategory,
  DesignSystemPageLink,
} from "@/types/design-system-catalog";

export const DESIGN_SYSTEM_PATH = "/design-system";

export const DESIGN_SYSTEM_CATEGORIES: DesignSystemCategory[] = [
  {
    id: "foundations",
    label: "Foundations",
    description: "Tokens every component is built from.",
    items: [
      { id: "colors", label: "Colors" },
      { id: "motion", label: "Motion" },
    ],
  },
  {
    id: "components",
    label: "Components",
    description: "Primitives from @notra/ui, one card per component family.",
    items: [
      { id: "buttons", label: "Buttons & Badges" },
      { id: "forms", label: "Forms & Inputs" },
      { id: "navigation", label: "Navigation & Overlays" },
      { id: "feedback", label: "Feedback & Status" },
      { id: "spinner", label: "Spinner" },
      { id: "braille-loader", label: "Braille Loader" },
      { id: "confirm-dialog", label: "Confirm Dialog" },
      { id: "copy-button", label: "Copy Button" },
      { id: "icon-tabs", label: "Icon Tabs" },
      { id: "instrument-module", label: "Instrument Module" },
      { id: "data-display", label: "Data Display" },
      { id: "utility", label: "Utility Elements" },
    ],
  },
  {
    id: "patterns",
    label: "Patterns",
    description: "Composed dashboard pieces built on the components above.",
    items: [
      { id: "rich-interactions", label: "Rich Interactions" },
      { id: "composer", label: "Composer" },
      { id: "chat-queue", label: "Chat Queue" },
      { id: "identity", label: "Identity & Layout" },
      { id: "social", label: "Social Previews" },
      { id: "onboarding", label: "Onboarding" },
      { id: "geo-range-picker", label: "GEO Range Picker" },
      { id: "write-dialog", label: "Write Dialog" },
      { id: "page-heading", label: "Page Heading" },
    ],
  },
  {
    id: "ai-surfaces",
    label: "AI Surfaces",
    description:
      "Pixel-faithful skins of the assistants and terminals we render answers in.",
    items: [
      {
        id: "claude-code",
        label: "Claude Code",
        children: [
          { id: "claude-session", label: "Full session" },
          { id: "claude-header", label: "Header" },
          { id: "claude-messages", label: "Messages" },
          { id: "claude-todos", label: "Todos" },
          { id: "claude-tools", label: "Tool calls" },
          { id: "claude-status", label: "Status" },
          { id: "claude-modes", label: "Prompt modes" },
          { id: "claude-effort", label: "Prompt effort" },
          { id: "claude-playground", label: "Playground" },
        ],
      },
      {
        id: "codex",
        label: "Codex",
        children: [
          { id: "codex-session", label: "Full session" },
          { id: "codex-header", label: "Header" },
          { id: "codex-messages", label: "Messages" },
          { id: "codex-exec", label: "Exec and explored" },
          { id: "codex-composer", label: "Composer" },
        ],
      },
      {
        id: "opencode",
        label: "OpenCode",
        children: [
          { id: "opencode-session", label: "Full session" },
          { id: "opencode-home", label: "Home" },
          { id: "opencode-activity", label: "Activity" },
          { id: "opencode-composer", label: "Composer" },
          { id: "opencode-sidebar", label: "Sidebar" },
        ],
      },
      {
        id: "chatgpt",
        label: "ChatGPT",
        children: [
          { id: "chatgpt-thread", label: "Thread" },
          { id: "chatgpt-user", label: "User" },
          { id: "chatgpt-assistant", label: "Assistant" },
          { id: "chatgpt-models", label: "Models" },
          { id: "chatgpt-playground", label: "Playground" },
        ],
      },
      {
        id: "claude-chat",
        label: "Claude",
        children: [
          { id: "claude-chat-thread", label: "Thread" },
          { id: "claude-chat-user", label: "User" },
          { id: "claude-chat-assistant", label: "Assistant" },
          { id: "claude-chat-models", label: "Models" },
          { id: "claude-chat-playground", label: "Playground" },
        ],
      },
      {
        id: "gemini",
        label: "Gemini",
        children: [
          { id: "gemini-thread", label: "Thread" },
          { id: "gemini-user", label: "User" },
          { id: "gemini-assistant", label: "Assistant" },
          { id: "gemini-models", label: "Models" },
          { id: "gemini-playground", label: "Playground" },
        ],
      },
      {
        id: "perplexity",
        label: "Perplexity",
        children: [
          { id: "perplexity-thread", label: "Thread" },
          { id: "perplexity-user", label: "User" },
          { id: "perplexity-assistant", label: "Assistant" },
          { id: "perplexity-models", label: "Composer" },
          { id: "perplexity-playground", label: "Playground" },
        ],
      },
    ],
  },
];

export const DESIGN_SYSTEM_PAGES: DesignSystemPageLink[] = [
  { href: "/design-system/icons", label: "Icons" },
  { href: "/design-system/auth-flow", label: "Auth flow" },
  { href: "/design-system/2fa-preview", label: "Two-factor" },
  { href: "/design-system/code-research", label: "Code research" },
  { href: "/design-system/geo-traffic", label: "GEO traffic" },
  { href: "/design-system/scan-filters", label: "Scans table" },
  { href: "/design-system/webhooks", label: "Webhooks" },
  { href: "/design-system/break-ui", label: "Break UI" },
];

function buildCatalog(): DesignSystemCatalogEntry[] {
  const entries: DesignSystemCatalogEntry[] = [];
  let sectionIndex = 0;
  for (const category of DESIGN_SYSTEM_CATEGORIES) {
    for (const item of category.items) {
      sectionIndex += 1;
      entries.push({
        id: item.id,
        label: item.label,
        href: `${DESIGN_SYSTEM_PATH}#${item.id}`,
        categoryId: category.id,
        number: String(sectionIndex).padStart(2, "0"),
        depth: 0,
        parentLabel: null,
      });
      for (const child of item.children ?? []) {
        entries.push({
          id: child.id,
          label: child.label,
          href: `${DESIGN_SYSTEM_PATH}#${child.id}`,
          categoryId: category.id,
          number: null,
          depth: 1,
          parentLabel: item.label,
        });
      }
    }
  }
  return entries;
}

export const DESIGN_SYSTEM_CATALOG = buildCatalog();

export const DESIGN_SYSTEM_CATALOG_BY_ID: Record<
  string,
  DesignSystemCatalogEntry
> = Object.fromEntries(DESIGN_SYSTEM_CATALOG.map((entry) => [entry.id, entry]));

export const DESIGN_SYSTEM_CATEGORY_BY_ID: Record<
  string,
  DesignSystemCategory
> = Object.fromEntries(
  DESIGN_SYSTEM_CATEGORIES.map((category) => [category.id, category])
);
