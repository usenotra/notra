"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  CorporateIcon,
  Github01Icon,
  LinkSquare02Icon,
  Loading03Icon,
  Message01Icon,
  NoteIcon,
  QuotesIcon,
  SearchIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Shimmer } from "@notra/ui/components/ai-elements/shimmer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { Kbd } from "@notra/ui/components/ui/kbd";
import { cn } from "@notra/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { useFeedback } from "@/components/dashboard/feedback-context";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  COMMAND_ROUTE_LABEL_KEYS,
  COMMAND_SECTION_LABEL_KEYS,
} from "@/constants/command-palette";
import { COMMAND_PALETTE_AI_ERROR_ACTION } from "@/constants/studio-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useActiveProject } from "@/lib/hooks/use-active-project";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import { useNavVisibility } from "@/lib/hooks/use-nav-visibility";
import { useHasAiCreditsFeature } from "@/lib/hooks/use-plan";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";
import { dashboardOrpc } from "@/lib/orpc/query";
import type {
  AiResult,
  CommandPaletteNavigatingLabelKey,
  CommandPaletteDialogProps,
  CommandPalettePanelProps,
  CommandPaletteSearchData,
  CommandPaletteTranslator,
  CommandSection,
  EntityHit,
  EntityHitSection,
  EntityHitsBySection,
} from "@/types/components/command-palette";
import type { CommonTranslator } from "@/types/i18n";
import { truncateSnippet } from "@/utils/format";
import { isGeoDashboardPath, withGeoProject } from "@/utils/geo-paths";

import { useCommandPalette } from "./command-palette-context";
import {
  COMMAND_ROUTES,
  COMMAND_SECTIONS,
  isCommandRouteAvailable,
  isCommandRouteVisible,
} from "./registry";

const APPLE_PLATFORM_PATTERN = /Mac|iPhone|iPad|iPod/i;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_LENGTH = 2;
const REFERENCE_SNIPPET_MAX = 80;

const REFERENCE_TYPE_BRAND_LABEL: Record<string, string> = {
  twitter_post: "Twitter",
  linkedin_post: "LinkedIn",
};
const BRAILLE_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
] as const;
const BRAILLE_INTERVAL_MS = 80;
const ENTITY_SECTION_ORDER: readonly EntityHitSection[] = [
  "posts",
  "brandVoices",
  "references",
  "integrations",
];

function referenceTypeLabel(
  type: string,
  t: CommandPaletteTranslator,
  tCommon: CommonTranslator
): string {
  const brandLabel = REFERENCE_TYPE_BRAND_LABEL[type];
  if (brandLabel) {
    return brandLabel;
  }
  if (type === "blog_post") {
    return tCommon("labels.blog");
  }
  if (type === "custom") {
    return tCommon("labels.customOwn");
  }
  return t("entities.reference");
}

const GROUPED_ROUTES = (() => {
  const groups: Record<CommandSection, typeof COMMAND_ROUTES> = {
    Navigation: [],
    GEO: [],
    Workspace: [],
    Automation: [],
    Manage: [],
    Settings: [],
  };
  for (const route of COMMAND_ROUTES) {
    groups[route.section].push(route);
  }
  return groups;
})();

const emptySubscribe = () => () => undefined;

let cachedIsApplePlatform: boolean | null = null;

function readIsApplePlatform(): boolean {
  if (cachedIsApplePlatform === null) {
    const platform = navigator.platform || navigator.userAgent;
    cachedIsApplePlatform = APPLE_PLATFORM_PATTERN.test(platform);
  }
  return cachedIsApplePlatform;
}

const getServerIsApplePlatform = () => true;

function collectEntityHits(
  data: CommandPaletteSearchData | undefined,
  slug: string,
  isProjectResolved: boolean,
  debouncedQuery: string,
  t: CommandPaletteTranslator,
  tCommon: CommonTranslator
): EntityHit[] {
  if (!(data && slug && isProjectResolved)) {
    return [];
  }
  const hits: EntityHit[] = [];
  for (const post of data.posts) {
    hits.push({
      key: `post:${post.id}`,
      label: post.title,
      sublabel:
        post.status === "published"
          ? tCommon("labels.published")
          : tCommon("labels.draft"),
      icon: NoteIcon,
      path: `/${slug}/content/${post.id}`,
      keywords: ["post", "content", post.slug ?? "", debouncedQuery],
    });
  }
  for (const voice of data.voices) {
    const parts = [voice.companyName, voice.websiteUrl]
      .filter(Boolean)
      .join(" · ");
    hits.push({
      key: `voice:${voice.id}`,
      label: voice.name,
      sublabel: parts || tCommon("labels.brandVoice"),
      icon: CorporateIcon,
      path: `/${slug}/brand/identity`,
      keywords: [
        "brand",
        "voice",
        "identity",
        voice.websiteUrl ?? "",
        debouncedQuery,
      ],
    });
  }
  for (const reference of data.references) {
    const typeLabel = referenceTypeLabel(reference.type, t, tCommon);
    hits.push({
      key: `reference:${reference.id}`,
      label: truncateSnippet(reference.content, REFERENCE_SNIPPET_MAX),
      sublabel: reference.note
        ? `${typeLabel} · ${truncateSnippet(reference.note, 40)}`
        : typeLabel,
      icon: QuotesIcon,
      path: `/${slug}/brand/identity`,
      keywords: ["reference", "brand", typeLabel.toLowerCase(), debouncedQuery],
    });
  }
  for (const integration of data.githubIntegrations) {
    const repoLabel =
      integration.owner && integration.repo
        ? `${integration.owner}/${integration.repo}`
        : undefined;
    hits.push({
      key: `github:${integration.id}`,
      label: integration.displayName,
      sublabel: repoLabel ? `GitHub · ${repoLabel}` : "GitHub",
      icon: Github01Icon,
      path: `/${slug}/integrations/github/${integration.id}`,
      keywords: ["github", "integration", repoLabel ?? "", debouncedQuery],
    });
  }
  for (const integration of data.linearIntegrations) {
    const sub = [integration.linearOrganizationName, integration.linearTeamName]
      .filter(Boolean)
      .join(" · ");
    hits.push({
      key: `linear:${integration.id}`,
      label: integration.displayName,
      sublabel: sub ? `Linear · ${sub}` : "Linear",
      icon: LinkSquare02Icon,
      path: `/${slug}/integrations/linear/${integration.id}`,
      keywords: ["linear", "integration", debouncedQuery],
    });
  }
  for (const account of data.socialAccounts) {
    hits.push({
      key: `social:${account.id}`,
      label: account.displayName,
      sublabel: `${account.provider} · @${account.username}`,
      icon: UserCircleIcon,
      path: `/${slug}/integrations`,
      keywords: [
        "social",
        "account",
        account.provider,
        account.username,
        debouncedQuery,
      ],
    });
  }
  return hits;
}

function groupEntityHits(
  entityHits: readonly EntityHit[]
): EntityHitsBySection {
  const groups: EntityHitsBySection = {
    posts: [],
    brandVoices: [],
    references: [],
    integrations: [],
  };
  for (const hit of entityHits) {
    if (hit.key.startsWith("post:")) {
      groups.posts.push(hit);
    } else if (hit.key.startsWith("voice:")) {
      groups.brandVoices.push(hit);
    } else if (hit.key.startsWith("reference:")) {
      groups.references.push(hit);
    } else {
      groups.integrations.push(hit);
    }
  }
  return groups;
}

async function requestCommandPaletteAi(
  query: string,
  slug: string,
  signal: AbortSignal
): Promise<AiResult | "aborted" | "error"> {
  try {
    const response = await fetch("/api/command-palette/navigate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, slug }),
      signal,
    });
    if (signal.aborted) {
      return "aborted";
    }
    if (!response.ok) {
      return "error";
    }
    return (await response.json()) as AiResult;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return "aborted";
    }
    return "error";
  }
}

function BrailleSpinner({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFrame((prev) => (prev + 1) % BRAILLE_FRAMES.length);
    }, BRAILLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      aria-hidden="true"
      className={cn("inline-block font-mono tabular-nums", className)}
    >
      {BRAILLE_FRAMES[frame]}
    </span>
  );
}

export function CommandPalette() {
  const t = useTranslations("commandPalette");
  const tCommon = useTranslations("common");
  const { open, setOpen, openSourceRef } = useCommandPalette();
  const { activeOrganization } = useOrganizationsContext();
  const { hasAiCredits } = useHasAiCreditsFeature();
  const { openSettings } = useSettingsModal();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const isApplePlatform = useSyncExternalStore(
    emptySubscribe,
    readIsApplePlatform,
    getServerIsApplePlatform
  );
  const [aiState, setAiState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "navigating"; labelKey: CommandPaletteNavigatingLabelKey }
    | { status: "error" }
  >({ status: "idle" });
  const [, startNavigation] = useTransition();
  const { openFeedback: triggerFeedback } = useFeedback();
  const abortRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);
  const lastTrackedSearchRef = useRef<string | null>(null);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      trackEvent(POSTHOG_EVENTS.COMMAND_PALETTE_OPENED, {
        source: openSourceRef.current ?? "button",
      });
    }
    if (!open && wasOpenRef.current) {
      abortRef.current?.abort();
      abortRef.current = null;
      setQuery("");
      setAiState({ status: "idle" });
      openSourceRef.current = null;
      lastTrackedSearchRef.current = null;
    }
    wasOpenRef.current = open;
  }, [open, openSourceRef]);

  const slug = activeOrganization?.slug ?? "";
  const organizationId = activeOrganization?.id ?? "";
  const [projectParam] = useGeoProjectQueryState();
  const { projectId: activeProjectId, isResolved: isProjectResolved } =
    useActiveProject();
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    const id = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const searchEnabled =
    debouncedQuery.length >= SEARCH_MIN_LENGTH &&
    organizationId.length > 0 &&
    open &&
    aiState.status === "idle";

  const searchResults = useQuery({
    ...dashboardOrpc.search.global.queryOptions({
      input: {
        organizationId,
        projectId: activeProjectId ?? undefined,
        query: debouncedQuery,
      },
    }),
    enabled: searchEnabled && isProjectResolved,
    staleTime: 15_000,
  });

  const entityHits = collectEntityHits(
    searchResults.data,
    slug,
    isProjectResolved,
    debouncedQuery,
    t,
    tCommon
  );

  const entityHitCount = entityHits.length;
  const hasSearchData = searchResults.data !== undefined;

  useEffect(() => {
    if (
      !(searchEnabled && hasSearchData) ||
      lastTrackedSearchRef.current === debouncedQuery
    ) {
      return;
    }
    lastTrackedSearchRef.current = debouncedQuery;
    trackEvent(POSTHOG_EVENTS.COMMAND_PALETTE_SEARCH, {
      query_length: debouncedQuery.length,
      result_count: entityHitCount,
    });
  }, [debouncedQuery, entityHitCount, hasSearchData, searchEnabled]);

  const entityHitsBySection = groupEntityHits(entityHits);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const scopedPath = (path: string) =>
    isGeoDashboardPath(path)
      ? withGeoProject(path, projectParam ?? undefined)
      : path;

  const navigate = (path: string) => {
    handleOpenChange(false);
    router.push(scopedPath(path));
  };

  const navigateFromAi = (
    path: string,
    labelKey: CommandPaletteNavigatingLabelKey
  ) => {
    setAiState({ status: "navigating", labelKey });
    startNavigation(() => {
      router.push(scopedPath(path));
    });
    handleOpenChange(false);
  };

  const openFeedback = () => {
    trackEvent(POSTHOG_EVENTS.COMMAND_PALETTE_RESULT_SELECTED, {
      kind: "route",
      id: "feedback",
    });
    handleOpenChange(false);
    triggerFeedback();
  };

  const openChatWithQuery = (text: string) => {
    if (!slug) {
      return;
    }
    trackEvent(POSTHOG_EVENTS.COMMAND_PALETTE_RESULT_SELECTED, {
      kind: "ai",
      id: "chat",
      query_length: text.length,
    });
    const qs = text ? `?q=${encodeURIComponent(text)}` : "";
    navigate(`/${slug}/chat${qs}`);
  };

  const runAiSearch = async () => {
    const trimmed = query.trim();
    if (!(trimmed && slug)) {
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAiState({ status: "loading" });
    const startedAt = Date.now();
    const result = await requestCommandPaletteAi(
      trimmed,
      slug,
      controller.signal
    );
    if (result === "aborted") {
      return;
    }
    if (result === "error") {
      trackEvent(POSTHOG_EVENTS.COMMAND_PALETTE_AI_NAVIGATE, {
        action: COMMAND_PALETTE_AI_ERROR_ACTION,
        latency_ms: Date.now() - startedAt,
        query_length: trimmed.length,
      });
      setAiState({ status: "error" });
      return;
    }
    trackEvent(POSTHOG_EVENTS.COMMAND_PALETTE_AI_NAVIGATE, {
      action: result.action,
      latency_ms: Date.now() - startedAt,
      query_length: trimmed.length,
    });
    if (result.action === "navigate" && result.path) {
      navigateFromAi(result.path, "opening");
      return;
    }
    if (result.action === "chat") {
      const qs = trimmed ? `?q=${encodeURIComponent(trimmed)}` : "";
      navigateFromAi(`/${slug}/chat${qs}`, "openingChat");
      return;
    }
    setAiState({ status: "error" });
  };

  if (!slug) {
    return null;
  }

  return (
    <CommandPaletteDialog
      abortRef={abortRef}
      aiState={aiState}
      entityHitsBySection={entityHitsBySection}
      handleOpenChange={handleOpenChange}
      hasAiCredits={hasAiCredits}
      isApplePlatform={isApplePlatform}
      navigate={navigate}
      open={open}
      openChatWithQuery={openChatWithQuery}
      openFeedback={openFeedback}
      openSettings={openSettings}
      query={query}
      runAiSearch={runAiSearch}
      setAiState={setAiState}
      setQuery={setQuery}
      slug={slug}
    />
  );
}

function CommandPaletteDialog({
  abortRef,
  aiState,
  entityHitsBySection,
  handleOpenChange,
  hasAiCredits,
  isApplePlatform,
  navigate,
  open,
  openChatWithQuery,
  openFeedback,
  openSettings,
  query,
  runAiSearch,
  setAiState,
  setQuery,
  slug,
}: CommandPaletteDialogProps) {
  const t = useTranslations("commandPalette");
  const tCommon = useTranslations("common");
  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const isLoading =
    aiState.status === "loading" || aiState.status === "navigating";
  const isNavigatingAi = aiState.status === "navigating";
  const aiModifierLabel = isApplePlatform ? "⌘" : "Ctrl";

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="border-border/60 top-[18%] w-[calc(100%-2rem)] max-w-[45rem]! translate-y-0 gap-0 overflow-hidden rounded-xl! border p-0! shadow-2xl sm:max-w-[45rem]!"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{tCommon("labels.commandPalette")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <CommandPrimitive
          className="bg-popover text-popover-foreground flex size-full flex-col"
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.metaKey || event.ctrlKey) &&
              hasQuery
            ) {
              event.preventDefault();
              runAiSearch().catch(() => undefined);
            }
          }}
          shouldFilter={aiState.status === "idle"}
        >
          <div className="border-border/60 flex h-12 items-center gap-2.5 border-b px-4">
            <HugeiconsIcon
              className="text-muted-foreground size-4 shrink-0"
              icon={SearchIcon}
              strokeWidth={2}
            />
            <CommandPrimitive.Input
              className={cn(
                "text-foreground flex-1 bg-transparent text-sm outline-none",
                "placeholder:text-muted-foreground/70",
                isLoading && "text-muted-foreground"
              )}
              onValueChange={(value) => {
                setQuery(value);
                if (aiState.status !== "idle") {
                  abortRef.current?.abort();
                  abortRef.current = null;
                  setAiState({ status: "idle" });
                }
              }}
              placeholder={t("placeholder")}
              value={query}
            />
            {hasQuery ? (
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Kbd>{aiModifierLabel}</Kbd>
                <Kbd>↵</Kbd>
                <span>{t("forAi")}</span>
              </div>
            ) : null}
          </div>

          <CommandPalettePanel
            aiModifierLabel={aiModifierLabel}
            aiState={aiState}
            entityHitsBySection={entityHitsBySection}
            handleOpenChange={handleOpenChange}
            hasAiCredits={hasAiCredits}
            isLoading={isLoading}
            isNavigatingAi={isNavigatingAi}
            navigate={navigate}
            openChatWithQuery={openChatWithQuery}
            openFeedback={openFeedback}
            openSettings={openSettings}
            query={query}
            runAiSearch={runAiSearch}
            slug={slug}
            trimmedQuery={trimmedQuery}
          />

          <div className="border-border/60 bg-muted/30 text-muted-foreground flex h-9 shrink-0 items-center justify-between gap-3 border-t px-3 text-[11px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Kbd>
                  <HugeiconsIcon
                    className="size-2.5"
                    icon={ArrowUp01Icon}
                    strokeWidth={2}
                  />
                </Kbd>
                <Kbd>
                  <HugeiconsIcon
                    className="size-2.5"
                    icon={ArrowDown01Icon}
                    strokeWidth={2}
                  />
                </Kbd>
                <span className="ml-0.5">{t("footer.navigate")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Kbd>↵</Kbd>
                <span className="ml-0.5">{tCommon("actions.select")}</span>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                <Kbd className="px-1 text-[9.5px]">esc</Kbd>
                <span className="ml-0.5">{tCommon("actions.close")}</span>
              </div>
            </div>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}

function CommandPalettePanel({
  aiModifierLabel,
  aiState,
  entityHitsBySection,
  handleOpenChange,
  hasAiCredits,
  isLoading,
  isNavigatingAi,
  navigate,
  openChatWithQuery,
  openFeedback,
  openSettings,
  query,
  runAiSearch,
  slug,
  trimmedQuery,
}: CommandPalettePanelProps) {
  return (
    <div className="overflow-hidden">
      {isLoading ? (
        <CommandPaletteLoading
          aiState={aiState}
          isNavigatingAi={isNavigatingAi}
          trimmedQuery={trimmedQuery}
        />
      ) : null}
      <CommandPaletteList
        aiModifierLabel={aiModifierLabel}
        aiState={aiState}
        entityHitsBySection={entityHitsBySection}
        handleOpenChange={handleOpenChange}
        hasAiCredits={hasAiCredits}
        isLoading={isLoading}
        navigate={navigate}
        openChatWithQuery={openChatWithQuery}
        openFeedback={openFeedback}
        openSettings={openSettings}
        query={query}
        runAiSearch={runAiSearch}
        slug={slug}
        trimmedQuery={trimmedQuery}
      />
    </div>
  );
}

function CommandPaletteLoading({
  aiState,
  isNavigatingAi,
  trimmedQuery,
}: {
  aiState: CommandPalettePanelProps["aiState"];
  isNavigatingAi: boolean;
  trimmedQuery: string;
}) {
  const t = useTranslations("commandPalette");
  const tCommon = useTranslations("common");
  return (
    <div className="flex h-[14rem] flex-col items-center justify-center px-6 text-center">
      <div className="text-foreground grid grid-cols-[1.125rem_auto_1.125rem] items-center gap-2 text-sm">
        <BrailleSpinner className="text-[18px] leading-none" />
        <Shimmer as="span" className="font-medium">
          {aiState.status === "navigating"
            ? t(`ai.${aiState.labelKey}`)
            : tCommon("labels.thinking")}
        </Shimmer>
        <span aria-hidden="true" />
      </div>
      <p className="text-muted-foreground mt-3 max-w-xs text-xs">
        {isNavigatingAi
          ? t("ai.almostThere")
          : t("ai.figuringOut", { query: trimmedQuery })}
      </p>
    </div>
  );
}

function CommandPaletteList({
  aiModifierLabel,
  aiState,
  entityHitsBySection,
  handleOpenChange,
  hasAiCredits,
  isLoading,
  navigate,
  openChatWithQuery,
  openFeedback,
  openSettings,
  query,
  runAiSearch,
  slug,
  trimmedQuery,
}: Omit<CommandPalettePanelProps, "isNavigatingAi">) {
  const navVisibility = useNavVisibility();
  const t = useTranslations("commandPalette");
  const tCommon = useTranslations("common");
  const hasQuery = trimmedQuery.length > 0;
  return (
    <CommandPrimitive.List
      className={cn(
        "max-h-[24rem] scroll-py-2 overflow-y-auto overscroll-contain p-1.5",
        isLoading && "hidden"
      )}
    >
      <CommandPrimitive.Empty className="px-3 py-10">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="border-border bg-muted/40 flex size-10 items-center justify-center rounded-full border border-dashed">
            <HugeiconsIcon
              className="text-muted-foreground size-4"
              icon={SparklesIcon}
              strokeWidth={2}
            />
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium wrap-anywhere">
              {t("empty.title", { query: trimmedQuery })}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("empty.description")}
            </p>
          </div>
          <div className="flex w-full flex-col gap-1.5">
            <button
              className="group border-border/80 bg-background hover:border-border hover:bg-muted/60 duration-fast flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all disabled:opacity-60"
              disabled={isLoading}
              onClick={runAiSearch}
              type="button"
            >
              <HugeiconsIcon
                className={cn(
                  "text-muted-foreground group-hover:text-foreground size-4 transition-colors",
                  isLoading && "animate-spin motion-reduce:animate-none"
                )}
                icon={isLoading ? Loading03Icon : SparklesIcon}
                strokeWidth={2}
              />
              <span className="flex-1 font-medium">
                {isLoading ? tCommon("labels.thinking") : t("ai.navigate")}
              </span>
              <div className="flex items-center gap-1">
                <Kbd>{aiModifierLabel}</Kbd>
                <Kbd>↵</Kbd>
              </div>
            </button>
            <button
              className="group border-border/80 bg-background hover:border-border hover:bg-muted/60 duration-fast flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all"
              onClick={() => openChatWithQuery(trimmedQuery)}
              type="button"
            >
              <HugeiconsIcon
                className="text-muted-foreground group-hover:text-foreground size-4 transition-colors"
                icon={Message01Icon}
                strokeWidth={2}
              />
              <span className="flex-1 font-medium">{t("ai.askChat")}</span>
              <HugeiconsIcon
                className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5"
                icon={ArrowRight01Icon}
                strokeWidth={2}
              />
            </button>
          </div>
          {aiState.status === "error" ? (
            <p className="text-destructive text-xs">{t("ai.failed")}</p>
          ) : null}
        </div>
      </CommandPrimitive.Empty>

      {COMMAND_SECTIONS.map((section) => {
        const items = GROUPED_ROUTES[section].filter(
          (route) =>
            isCommandRouteAvailable(route, hasAiCredits) &&
            isCommandRouteVisible(route, navVisibility)
        );
        if (items.length === 0) {
          return null;
        }
        return (
          <CommandPrimitive.Group
            className="text-foreground [&_[cmdk-group-heading]]:text-muted-foreground px-1 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
            heading={tCommon(COMMAND_SECTION_LABEL_KEYS[section])}
            key={section}
          >
            {items.map((item) => {
              const label = tCommon(
                `labels.${COMMAND_ROUTE_LABEL_KEYS[item.id]}`
              );
              return (
                <CommandPrimitive.Item
                  className={cn(
                    "group/item relative flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors outline-none select-none",
                    "data-[selected=true]:bg-muted data-[selected=true]:text-foreground",
                    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                  )}
                  key={item.id}
                  keywords={[item.label, ...item.keywords]}
                  onSelect={() => {
                    trackEvent(POSTHOG_EVENTS.COMMAND_PALETTE_RESULT_SELECTED, {
                      kind: "route",
                      id: item.id,
                    });
                    if (item.settingsSection) {
                      handleOpenChange(false);
                      openSettings(item.settingsSection);
                      return;
                    }
                    navigate(item.path(slug));
                  }}
                  value={label}
                >
                  <HugeiconsIcon
                    className="text-muted-foreground group-data-[selected=true]/item:text-foreground size-4 shrink-0 transition-colors"
                    icon={item.icon}
                    strokeWidth={2}
                  />
                  <span className="flex-1 truncate">{label}</span>
                  <HugeiconsIcon
                    className="text-muted-foreground size-3 opacity-0 transition-opacity group-data-[selected=true]/item:opacity-60"
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                  />
                </CommandPrimitive.Item>
              );
            })}
          </CommandPrimitive.Group>
        );
      })}

      {ENTITY_SECTION_ORDER.map((section) => {
        const items = entityHitsBySection[section];
        if (!items || items.length === 0) {
          return null;
        }
        return (
          <CommandPrimitive.Group
            className="text-foreground [&_[cmdk-group-heading]]:text-muted-foreground px-1 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
            heading={
              section === "brandVoices"
                ? t("entitySections.brandVoices")
                : tCommon(`labels.${section}`)
            }
            key={section}
          >
            {items.map((hit) => (
              <CommandPrimitive.Item
                className={cn(
                  "group/item relative flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors outline-none select-none",
                  "data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                )}
                key={hit.key}
                keywords={hit.keywords}
                onSelect={() => {
                  trackEvent(POSTHOG_EVENTS.COMMAND_PALETTE_RESULT_SELECTED, {
                    kind: "entity",
                    entity_type: hit.key.split(":")[0] ?? null,
                  });
                  navigate(hit.path);
                }}
                value={`${hit.key}__${hit.label}`}
              >
                <HugeiconsIcon
                  className="text-muted-foreground group-data-[selected=true]/item:text-foreground size-4 shrink-0 transition-colors"
                  icon={hit.icon}
                  strokeWidth={2}
                />
                <span className="flex-1 truncate">{hit.label}</span>
                {hit.sublabel ? (
                  <span className="text-muted-foreground max-w-[40%] truncate text-[11px]">
                    {hit.sublabel}
                  </span>
                ) : null}
                <HugeiconsIcon
                  className="text-muted-foreground size-3 opacity-0 transition-opacity group-data-[selected=true]/item:opacity-60"
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                />
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.Group>
        );
      })}

      <CommandPrimitive.Group
        className="text-foreground [&_[cmdk-group-heading]]:text-muted-foreground px-1 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
        heading={tCommon("labels.actions")}
      >
        <CommandPrimitive.Item
          className="group/item data-[selected=true]:bg-muted data-[selected=true]:text-foreground relative flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors outline-none select-none"
          keywords={["feedback", "bug", "report", "idea", "feature"]}
          onSelect={openFeedback}
          value="__action_feedback"
        >
          <HugeiconsIcon
            className="text-muted-foreground group-data-[selected=true]/item:text-foreground size-4 shrink-0 transition-colors"
            icon={Message01Icon}
            strokeWidth={2}
          />
          <span className="flex-1 truncate">
            {tCommon("labels.sendFeedback")}
          </span>
          <HugeiconsIcon
            className="text-muted-foreground size-3 opacity-0 transition-opacity group-data-[selected=true]/item:opacity-60"
            icon={ArrowRight01Icon}
            strokeWidth={2}
          />
        </CommandPrimitive.Item>
      </CommandPrimitive.Group>

      {hasQuery ? (
        <CommandPrimitive.Group
          className="text-foreground [&_[cmdk-group-heading]]:text-muted-foreground px-1 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
          heading={t("sections.ai")}
        >
          <CommandPrimitive.Item
            className="group/item data-[selected=true]:bg-muted data-[selected=true]:text-foreground relative flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors outline-none select-none"
            keywords={["ai", "ask", "natural language"]}
            onSelect={runAiSearch}
            value={`__ai_navigate_${query}`}
          >
            <HugeiconsIcon
              className={cn(
                "text-muted-foreground group-data-[selected=true]/item:text-foreground size-4 shrink-0 transition-colors",
                isLoading && "animate-spin motion-reduce:animate-none"
              )}
              icon={isLoading ? Loading03Icon : SparklesIcon}
              strokeWidth={2}
            />
            <span className="flex-1 truncate">
              {isLoading
                ? tCommon("labels.thinking")
                : t("ai.navigateQuery", { query: trimmedQuery })}
            </span>
            <div className="flex items-center gap-1">
              <Kbd>{aiModifierLabel}</Kbd>
              <Kbd>↵</Kbd>
            </div>
          </CommandPrimitive.Item>
          <CommandPrimitive.Item
            className="group/item data-[selected=true]:bg-muted data-[selected=true]:text-foreground relative flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors outline-none select-none"
            keywords={["chat", "conversation", "message"]}
            onSelect={() => openChatWithQuery(trimmedQuery)}
            value={`__ai_chat_${query}`}
          >
            <HugeiconsIcon
              className="text-muted-foreground group-data-[selected=true]/item:text-foreground size-4 shrink-0 transition-colors"
              icon={Message01Icon}
              strokeWidth={2}
            />
            <span className="flex-1 truncate">{t("ai.askChatAbout")}</span>
            <HugeiconsIcon
              className="text-muted-foreground size-3 opacity-0 transition-opacity group-data-[selected=true]/item:opacity-60"
              icon={ArrowRight01Icon}
              strokeWidth={2}
            />
          </CommandPrimitive.Item>
        </CommandPrimitive.Group>
      ) : null}
    </CommandPrimitive.List>
  );
}
