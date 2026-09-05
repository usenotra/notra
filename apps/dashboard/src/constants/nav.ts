import {
  Activity01Icon,
  AiBrowserIcon,
  AiChat01Icon,
  Analytics01Icon,
  AnalyticsUpIcon,
  Attachment01Icon,
  Calendar03Icon,
  ChartAnalysisIcon,
  Comment01Icon,
  CreditCardIcon,
  Home01Icon,
  Key01Icon,
  Layers01Icon,
  MagicWand01Icon,
  Message01Icon,
  NoteIcon,
  Notification03Icon,
  PaintBoardIcon,
  PencilEdit01Icon,
  PlugIcon,
  PlusSignIcon,
  RainbowIcon,
  Robot01Icon,
  SearchList01Icon,
  Settings01Icon,
  UserCircleIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import {
  GEO_AGENT_READINESS_NAV_LINK,
  GEO_GAPS_NAV_LINK,
  GEO_PROMPTS_NAV_LINK,
  GEO_WRITER_NAV_LINK,
} from "@notra/geo-core/constants/geo";
import { GEO_PERSONAS_NAV_LINK } from "@notra/geo-core/constants/geo-personas";
import { DURATION } from "@notra/ui/lib/motion";

import { AGENT_FEEDBACK_NAV_LINK } from "@/constants/agent-feedback";
import { IRIS_NAV_LINK } from "@/constants/iris";
import type { PostStatus } from "@/schemas/content";
import type {
  NavGroupKey,
  NavMainItem,
  NavPrimaryActionConfig,
  NavSettingsItem,
  NavVisibility,
  SidebarMode,
  SidebarModeOption,
} from "@/types/components/nav";

export const HOME_NAV_LINK = "";
export const CHAT_NAV_LINK = "/chat";
export const CONTENT_NAV_LINK = "/content";
export const ANALYTICS_NAV_LINK = "/analytics";
export const BRAND_IDENTITY_NAV_LINK = "/brand/identity";
export const SCHEDULES_NAV_LINK = "/automation/schedules";
export const EVENTS_NAV_LINK = "/automation/events";
export const INTEGRATIONS_NAV_LINK = "/integrations";
export const SKILLS_NAV_LINK = "/skills";
export const API_KEYS_NAV_LINK = "/api-keys";
export const GEO_OVERVIEW_NAV_LINK = "/geo";
export const GEO_TRAFFIC_NAV_LINK = "/geo/traffic";
export const GEO_COMPETITORS_NAV_LINK = "/geo/competitors";
export const GEO_SHELF_SPACE_NAV_LINK = "/geo/shelf-space";
export const GEO_SETTINGS_NAV_LINK = "/geo/settings";

export const SIDEBAR_DEFAULT_MODE: SidebarMode = "geo";
export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MIN_WIDTH = 240;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_RESIZE_STEP = 8;
export const SIDEBAR_WIDTH_COOKIE_NAME = "sidebar_width";

export const SIDEBAR_MODES: SidebarModeOption[] = [
  {
    id: "geo",
    label: "GEO",
    description: "Measure visibility",
    icon: AiBrowserIcon,
  },
  {
    id: "studio",
    label: "Studio",
    description: "Create content",
    icon: NoteIcon,
  },
];

export const SIDEBAR_MODE_HOME_LINKS: Record<SidebarMode, string> = {
  geo: GEO_OVERVIEW_NAV_LINK,
  studio: HOME_NAV_LINK,
};

export const GEO_ROUTE_SECTIONS: ReadonlySet<string> = new Set([
  "geo",
  "feedback",
]);

export const SHARED_ROUTE_PREFIXES: readonly string[] = [
  "content",
  "automation/schedules",
];

export const STUDIO_ROUTE_SECTIONS: ReadonlySet<string> = new Set([
  "chat",
  "collection",
  "analytics",
  "brand",
  "automation",
  "iris",
]);

export const NAV_CATEGORY_LABELS: Record<NavGroupKey, string> = {
  visibility: "Visibility",
  improve: "Improve",
  automation: "Automation",
  utility: "Utility",
};

export const NAV_MAIN_ITEMS: NavMainItem[] = [
  { link: HOME_NAV_LINK, icon: Home01Icon, label: "Home" },
  { link: CHAT_NAV_LINK, icon: Message01Icon, label: "Chat", badge: "Beta" },
  { link: CONTENT_NAV_LINK, icon: NoteIcon, label: "Content" },
  { link: ANALYTICS_NAV_LINK, icon: Analytics01Icon, label: "Analytics" },
  {
    link: AGENT_FEEDBACK_NAV_LINK,
    icon: Comment01Icon,
    label: "Feedback",
    badge: "Beta",
  },
  {
    link: BRAND_IDENTITY_NAV_LINK,
    icon: PaintBoardIcon,
    label: "Brand Identity",
  },
  { link: IRIS_NAV_LINK, icon: RainbowIcon, label: "Iris" },
  { link: SCHEDULES_NAV_LINK, icon: Calendar03Icon, label: "Schedules" },
  { link: EVENTS_NAV_LINK, icon: Notification03Icon, label: "Events" },
  { link: INTEGRATIONS_NAV_LINK, icon: PlugIcon, label: "Integrations" },
  { link: GEO_OVERVIEW_NAV_LINK, icon: AiBrowserIcon, label: "Overview" },
  { link: GEO_TRAFFIC_NAV_LINK, icon: Activity01Icon, label: "Traffic" },
  { link: GEO_PROMPTS_NAV_LINK, icon: AiChat01Icon, label: "Prompts" },
  {
    link: GEO_PERSONAS_NAV_LINK,
    icon: UserGroupIcon,
    label: "Personas",
    badge: "Beta",
  },
  { link: GEO_GAPS_NAV_LINK, icon: SearchList01Icon, label: "Content Gaps" },
  { link: GEO_SHELF_SPACE_NAV_LINK, icon: Layers01Icon, label: "Shelf Space" },
  {
    link: GEO_AGENT_READINESS_NAV_LINK,
    icon: Robot01Icon,
    label: "Agent Readiness",
  },
  {
    link: GEO_COMPETITORS_NAV_LINK,
    icon: ChartAnalysisIcon,
    label: "Competitors",
  },
  { link: GEO_WRITER_NAV_LINK, icon: PencilEdit01Icon, label: "Write" },
  { link: GEO_SETTINGS_NAV_LINK, icon: Settings01Icon, label: "Settings" },
  { link: SKILLS_NAV_LINK, icon: MagicWand01Icon, label: "Skills" },
  { link: API_KEYS_NAV_LINK, icon: Key01Icon, label: "API Keys" },
];

export const NAV_GEO_VISIBILITY_LINKS: readonly string[] = [
  GEO_OVERVIEW_NAV_LINK,
  GEO_TRAFFIC_NAV_LINK,
  GEO_PROMPTS_NAV_LINK,
  GEO_PERSONAS_NAV_LINK,
  GEO_COMPETITORS_NAV_LINK,
  AGENT_FEEDBACK_NAV_LINK,
];

export const NAV_GEO_IMPROVE_LINKS: readonly string[] = [
  GEO_GAPS_NAV_LINK,
  GEO_SHELF_SPACE_NAV_LINK,
  GEO_AGENT_READINESS_NAV_LINK,
  GEO_WRITER_NAV_LINK,
  CONTENT_NAV_LINK,
  SCHEDULES_NAV_LINK,
  GEO_SETTINGS_NAV_LINK,
];

export const NAV_GEO_LINKS: readonly string[] = [
  ...NAV_GEO_VISIBILITY_LINKS,
  ...NAV_GEO_IMPROVE_LINKS,
];

export const NAV_STUDIO_LINKS: readonly string[] = [
  HOME_NAV_LINK,
  CHAT_NAV_LINK,
  CONTENT_NAV_LINK,
  ANALYTICS_NAV_LINK,
  BRAND_IDENTITY_NAV_LINK,
];

export const NAV_AUTOMATION_LINKS: readonly string[] = [
  IRIS_NAV_LINK,
  SCHEDULES_NAV_LINK,
  EVENTS_NAV_LINK,
];

export const NAV_STUDIO_ALL_LINKS: readonly string[] = [
  ...NAV_STUDIO_LINKS,
  ...NAV_AUTOMATION_LINKS,
];

export const NAV_UTILITY_LINKS: readonly string[] = [
  INTEGRATIONS_NAV_LINK,
  SKILLS_NAV_LINK,
  API_KEYS_NAV_LINK,
];

export const DEFAULT_NAV_VISIBILITY: NavVisibility = {
  iris: true,
  analytics: true,
};

export const NAV_PRIMARY_ACTIONS: Record<SidebarMode, NavPrimaryActionConfig> =
  {
    geo: { label: "New content", icon: PencilEdit01Icon },
    studio: { label: "New post", icon: PlusSignIcon },
  };

// Shared sidebar panel swap (GEO <-> Studio, main <-> chat/settings/brand).
// Both layers travel their own side while the outgoing one blurs out and the
// incoming one resolves — the blur is what lets them overlap for the full
// window without the two lists colliding into an unreadable double image, so
// neither layer has to wait for the other.
//
// Two things these classes have to get right:
//   1. Tailwind v4 compiles `translate-x-*` to the standalone `translate`
//      property, not to `transform`. Transitioning `transform` animates nothing
//      and the panels snap sideways — `translate` has to be named explicitly.
//   2. Every nav label is split into one <span> per character for the collapse
//      animation. Without an up-front compositor layer the browser re-rasterises
//      all of them on every frame of the fade, which is what makes it stutter.
//
// The outgoing layer eases *out*, not in. Accelerating away is the tempting
// reading of a swoosh, but a single timing function drives opacity and blur too,
// and an ease-in barely moves them for the first half of the window — the old
// panel then sits there sharp and opaque long enough to read as a ghost behind
// the new one. Easing out dumps opacity and smears the blur in the first frames,
// so the leftovers are gone before the eye lands on them.
const SIDEBAR_MODE_SWOOSH_IN = "ease-[cubic-bezier(0.16,1,0.3,1)]";
const SIDEBAR_MODE_SWOOSH_OUT = "ease-emphasized";
const SIDEBAR_MODE_ENTER_TIMING = `duration-slow ${SIDEBAR_MODE_SWOOSH_IN}`;
const SIDEBAR_MODE_EXIT_TIMING = `duration-fast ${SIDEBAR_MODE_SWOOSH_OUT}`;

/** Derived from the `duration-fast` token used on the exit classes above. */
export const SIDEBAR_MODE_EXIT_MS = DURATION.fast * 1000;

/** Base class for a layer that participates in the mode swoosh. */
export const SIDEBAR_MODE_FADE_CLASS =
  "transition-[opacity,translate,filter] will-change-[opacity,translate,filter] motion-reduce:translate-x-0 motion-reduce:blur-none motion-reduce:transition-opacity";

/** Applied to the layer belonging to the mode that is now active. */
export const SIDEBAR_MODE_ENTER_CLASS = `z-10 translate-x-0 opacity-100 blur-[0px] ${SIDEBAR_MODE_ENTER_TIMING}`;

/** Applied to the hidden layer of the left-hand (GEO) mode. */
export const SIDEBAR_MODE_EXIT_LEFT_CLASS = `pointer-events-none z-0 -translate-x-5 opacity-0 blur-[8px] ${SIDEBAR_MODE_EXIT_TIMING}`;

/** Applied to the hidden layer of the right-hand (Studio) mode. */
export const SIDEBAR_MODE_EXIT_RIGHT_CLASS = `pointer-events-none z-0 translate-x-5 opacity-0 blur-[8px] ${SIDEBAR_MODE_EXIT_TIMING}`;

/** Indicator that slides between the two tabs of the mode switch. */
export const SIDEBAR_MODE_PILL_CLASS = `pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-md bg-background ring-1 ring-border transition-[translate] will-change-[translate] duration-slow ${SIDEBAR_MODE_SWOOSH_IN} motion-reduce:transition-none`;

export const SIDEBAR_MODE_PANEL_CLASS = `flex min-h-0 w-full flex-col ${SIDEBAR_MODE_FADE_CLASS}`;

/** Collapses the primary-action row when the active mode has no action to offer. */
export const SIDEBAR_MODE_SLOT_CLASS = `grid transition-[grid-template-rows,opacity] duration-slow ${SIDEBAR_MODE_SWOOSH_IN} motion-reduce:transition-none`;

export const NAV_RECENT_LABEL = "Recent";
export const NAV_RECENT_LIMIT = 3;
export const NAV_RECENT_SKELETON_IDS = ["first", "second", "third"] as const;
export const NAV_RECENT_TITLE_CLASS = "min-w-0 max-w-[8.5rem] flex-1 truncate";
export const NAV_PROJECTS_MENU_LABEL = "Projects";
export const NAV_NEW_PROJECT_LABEL = "New project";

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  published: "Published",
};

export const POST_STATUS_DOT_CLASS: Record<PostStatus, string> = {
  draft: "bg-muted-foreground/50",
  published: "bg-success",
};

export const SETTINGS_ACCOUNT_NAV_ITEMS: NavSettingsItem[] = [
  { label: "Account", url: "settings/account", icon: UserCircleIcon },
];

export const SETTINGS_ORGANIZATION_NAV_ITEMS: NavSettingsItem[] = [
  { label: "General", url: "settings/general", icon: Settings01Icon },
  { label: "Members", url: "settings/members", icon: UserGroupIcon },
  {
    label: "Notifications",
    url: "settings/notifications",
    icon: Notification03Icon,
  },
  {
    label: "Attachments",
    url: "settings/attachments",
    icon: Attachment01Icon,
  },
  { label: "Billing & Usage", url: "settings/billing", icon: CreditCardIcon },
  {
    label: "Credits",
    url: "settings/credits",
    icon: Wallet01Icon,
    requiresAiCredits: true,
  },
  { label: "Logs", url: "settings/logs", icon: AnalyticsUpIcon },
];
