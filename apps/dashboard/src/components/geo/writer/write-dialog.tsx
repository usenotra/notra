"use client";

import {
  Loading03Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
/**
 * WriteDialog is the GEO write entry: a sidebar of sections that jump to
 * one scrolling form (prompt, content type, brand identity, competitors),
 * then Plan or Write. Gaps open this with `writeDialogStateFromGap`.
 * After plan, go to `geoContentPath`. Do not send users to
 * `/geo/write?brief=`.
 */
import type { GeoContentSubtype } from "@notra/ai/types/geo-writer";
import {
  GEO_WRITE_PANEL_FOOTER_CLASS,
  GEO_WRITE_PANEL_FOOTER_ROW_CLASS,
  GEO_WRITE_PANEL_HEADER_CLASS,
  GEO_WRITE_PANEL_HEADER_ROW_CLASS,
  GEO_WRITE_SIDEBAR_SHORTCUT,
  GEO_WRITER_TOPIC_MAX_LENGTH,
  GEO_WRITER_TOPIC_MIN_LENGTH,
} from "@notra/geo-core/constants/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Badge } from "@notra/ui/components/ui/badge";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { cn } from "@notra/ui/lib/utils";
import { AnimatePresence, LazyMotion, m, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/button";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { GEO_WRITE_DIALOG_ENTRIES } from "@/constants/geo-analytics";
import {
  GEO_WRITE_ACTION_HELP,
  GEO_WRITE_ACTION_PENDING,
  GEO_WRITE_CONTENT_SUBTYPES,
  GEO_WRITE_DIALOG_SECTIONS,
  GEO_WRITE_EDIT_NOTE,
  GEO_WRITE_RECOMMENDED_BADGE,
} from "@/constants/geo-writer";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useSitemaps } from "@/lib/hooks/use-brand-sitemaps";
import { useGeoCompetitorsDb, useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import { useGeoWriterPlan } from "@/lib/hooks/use-geo-writer";
import type {
  WriteDialogProps,
  WriteDialogSectionId,
  WriteDialogSourceKind,
} from "@/types/components/geo-writer";
import { existingPageLabel } from "@/utils/geo-gaps";
import { withGeoProject } from "@/utils/geo-paths";
import { geoContentPath } from "@/utils/geo-write-entry";
import {
  recommendedContentSubtype,
  writerBaselineLabel,
  writerCompetitorDetail,
} from "@/utils/geo-writer";

import { WriteBrandOption } from "./write-brand-option";
import { WriteOptionCard } from "./write-option-card";
import { WriteSectionSidebar } from "./write-section-sidebar";
import { WriteSitemapSection } from "./write-sitemap-section";

const MANUAL_PROMPT_VALUE = "manual";
const FOOTER_STATUS_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;
const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default);

type WriteAction = keyof typeof GEO_WRITE_ACTION_PENDING;

const sectionMeta = (id: WriteDialogSectionId) =>
  GEO_WRITE_DIALOG_SECTIONS.find((item) => item.id === id);

export function WriteDialog({
  open,
  onOpenChange,
  organizationId,
  organizationSlug,
  initial,
  entry,
}: WriteDialogProps) {
  const [previousOpen, setPreviousOpen] = useState(open);
  const [session, setSession] = useState(0);
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) {
      setSession((current) => current + 1);
    }
  }

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <WriteDialogForm
        entry={entry}
        initial={initial}
        key={`${session}:${initial?.sourceKind ?? "manual"}:${initial?.sourceId ?? ""}`}
        onOpenChange={onOpenChange}
        open={open}
        organizationId={open ? organizationId : ""}
        organizationSlug={organizationSlug}
      />
    </ResponsiveDialog>
  );
}

function WriteDialogForm({
  open,
  onOpenChange,
  organizationId,
  organizationSlug,
  initial,
  entry,
}: WriteDialogProps) {
  const router = useRouter();
  const { projectId } = useGeoProjectScope();
  const fieldId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] =
    useState<WriteDialogSectionId>("prompt");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingAction, setPendingAction] = useState<WriteAction | null>(null);
  const openedRef = useRef(false);
  const initialSourceKind = initial?.sourceKind ?? "manual";
  const hasInitialTopic = Boolean(initial?.topic);

  useEffect(() => {
    if (!open || openedRef.current) {
      return;
    }
    openedRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_WRITE_DIALOG_OPENED, {
      entry: entry ?? GEO_WRITE_DIALOG_ENTRIES.WRITE_PAGE,
      source_kind: initialSourceKind,
      has_topic: hasInitialTopic,
    });
  }, [entry, hasInitialTopic, initialSourceKind, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== GEO_WRITE_SIDEBAR_SHORTCUT ||
        !(event.metaKey || event.ctrlKey)
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      setSidebarCollapsed((current) => !current);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open]);
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [contentSubtype, setContentSubtype] = useState<GeoContentSubtype>(
    initial?.contentSubtype ??
      recommendedContentSubtype(initial?.topic ?? "").id
  );
  const recommendation = recommendedContentSubtype(topic);
  const baselineLabel = writerBaselineLabel(initial?.baseline);
  const existingPageUrl = initial?.existingPageUrl;
  const promptBadgeLabel = existingPageUrl
    ? `Updating ${existingPageLabel(existingPageUrl)}`
    : baselineLabel;
  const mentionedCompetitors = initial?.mentionedCompetitors ?? [];
  const [brandVoiceId, setBrandVoiceId] = useState<string | null>(
    initial?.brandVoiceId ?? null
  );
  const [sitemapId, setSitemapId] = useState<string | null>(null);
  const [competitorIds, setCompetitorIds] = useState<string[]>(
    initial?.competitorIds ?? []
  );
  const [sourceKind, setSourceKind] = useState<WriteDialogSourceKind>(
    initial?.sourceKind ?? "manual"
  );
  const [sourceId, setSourceId] = useState<string | undefined>(
    initial?.sourceId
  );
  const [competitorsTouched, setCompetitorsTouched] = useState(
    Boolean(initial?.competitorIds)
  );

  const planMutation = useGeoWriterPlan(organizationId);
  const { data: brandData } = useBrandSettings(organizationId);
  const { competitors } = useGeoCompetitorsDb(organizationId, {
    enabled: open,
  });
  const { prompts } = useGeoPromptsDb(organizationId, { enabled: open });
  const sitemapQuery = useSitemaps(organizationId, brandVoiceId ?? "");

  const voices = useMemo(() => brandData?.voices ?? [], [brandData?.voices]);
  const sitemaps = useMemo(
    () => sitemapQuery.data?.sitemaps ?? [],
    [sitemapQuery.data?.sitemaps]
  );
  const selectedVoice = voices.find((voice) => voice.id === brandVoiceId);
  const effectiveSitemapId = sitemaps.some(
    (sitemap) => sitemap.id === sitemapId
  )
    ? sitemapId
    : (sitemaps[0]?.id ?? null);

  useEffect(() => {
    if (brandVoiceId || voices.length === 0) {
      return;
    }
    const fallback =
      voices.find((voice) => voice.isDefault)?.id ?? voices[0]?.id ?? null;
    setBrandVoiceId(fallback);
  }, [brandVoiceId, voices]);

  useEffect(() => {
    if (competitorsTouched || competitors.length === 0) {
      return;
    }
    setCompetitorIds(competitors.map((competitor) => competitor.id));
  }, [competitors, competitorsTouched]);

  const jumpToSection = (id: WriteDialogSectionId) => {
    setActiveSection(id);
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-section="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const trackedPromptMatch =
    sourceKind === "prompt" || sourceKind === "gap"
      ? prompts.find((item) => item.id === sourceId)
      : undefined;
  const selectedPromptValue = trackedPromptMatch?.id ?? MANUAL_PROMPT_VALUE;

  const promptSelectLabel = (value: string): string => {
    if (value === MANUAL_PROMPT_VALUE) {
      return "Write a custom prompt";
    }
    return (
      prompts.find((item) => item.id === value)?.prompt ??
      "Write a custom prompt"
    );
  };

  const handlePromptSelect = (promptKey: string) => {
    if (promptKey === MANUAL_PROMPT_VALUE) {
      setSourceKind("manual");
      setSourceId(undefined);
      return;
    }
    const prompt = prompts.find((item) => item.id === promptKey);
    if (!prompt) {
      return;
    }
    setSourceKind("prompt");
    setSourceId(prompt.id);
    setTopic(prompt.prompt);
  };

  const brandSelectLabel = (value: string): ReactNode => {
    const voice = voices.find((item) => item.id === value);
    if (!voice) {
      return "Select a brand identity";
    }
    return (
      <WriteBrandOption
        isDefault={voice.isDefault}
        name={voice.name}
        websiteUrl={voice.websiteUrl}
      />
    );
  };

  const allCompetitorsSelected =
    competitors.length > 0 && competitorIds.length === competitors.length;
  const selectedCompetitorIds = new Set(competitorIds);

  const canSubmit =
    topic.trim().length >= GEO_WRITER_TOPIC_MIN_LENGTH &&
    !planMutation.isPending;

  const handleSubmit = async (action: WriteAction) => {
    const trimmed = topic.trim();
    if (
      trimmed.length < GEO_WRITER_TOPIC_MIN_LENGTH ||
      planMutation.isPending
    ) {
      return;
    }
    setPendingAction(action);
    const result = await planMutation
      .mutateAsync({
        topic: trimmed,
        autoApprove: action === "write",
        contentSubtype,
        brandVoiceIds: brandVoiceId ? [brandVoiceId] : [],
        competitorIds,
        sitemapId: effectiveSitemapId ?? undefined,
        sourceKind,
        sourceId,
        existingPageUrl,
      })
      .finally(() => setPendingAction(null));
    onOpenChange(false);
    if (result.postId) {
      router.push(geoContentPath(organizationSlug, result.postId));
      return;
    }
    router.push(withGeoProject(`/${organizationSlug}/geo/gaps`, projectId));
  };

  return (
    <ResponsiveDialogContent
      className="flex h-[min(46rem,88svh)] max-h-[88svh] flex-col gap-0 overflow-visible bg-transparent p-0 shadow-none ring-0 sm:max-w-4xl"
      drawerClassName="bg-background p-3 ring-1 ring-foreground/10"
    >
      <div className="flex min-h-0 flex-1 gap-3">
        <WriteSectionSidebar
          activeSection={activeSection}
          collapsed={sidebarCollapsed}
          onJump={jumpToSection}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className={GEO_WRITE_PANEL_HEADER_CLASS}>
            <div
              className={cn(
                GEO_WRITE_PANEL_HEADER_ROW_CLASS,
                "gap-2 pr-12 pl-2"
              )}
            >
              <Button
                aria-expanded={!sidebarCollapsed}
                aria-label={
                  sidebarCollapsed ? "Show sections" : "Hide sections"
                }
                className="hidden size-7 md:inline-flex"
                onClick={() => setSidebarCollapsed((current) => !current)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <HugeiconsIcon
                  className="size-4"
                  icon={
                    sidebarCollapsed ? SidebarRight01Icon : SidebarLeft01Icon
                  }
                  strokeWidth={1.8}
                />
              </Button>
              <ResponsiveDialogTitle className="text-base font-semibold tracking-tight max-md:sr-only">
                Write article
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="sr-only">
                Plan or write an article from a prompt, content type, brand
                identity, and competitors.
              </ResponsiveDialogDescription>
              <div className="flex gap-1 overflow-x-auto md:hidden">
                {GEO_WRITE_DIALOG_SECTIONS.map((item) => (
                  <button
                    className={cn(
                      "shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-sm transition-colors",
                      activeSection === item.id
                        ? "bg-background text-foreground font-medium"
                        : "text-muted-foreground hover:bg-background/60"
                    )}
                    key={item.id}
                    onClick={() => jumpToSection(item.id)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-border bg-background relative -mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border">
            <div
              className="scrollbar-floating divide-border min-h-0 flex-1 divide-y overflow-y-auto scroll-smooth"
              ref={scrollRef}
            >
              <section
                className="scroll-mt-2 space-y-4 px-6 py-6"
                data-section="prompt"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <WriteSectionHeader
                    description="Pick a tracked prompt or write your own. The article answers this question."
                    htmlFor={`${fieldId}-topic`}
                    id="prompt"
                  />
                  {promptBadgeLabel ? (
                    <Badge className="shrink-0 font-normal" variant="outline">
                      {promptBadgeLabel}
                    </Badge>
                  ) : null}
                </div>
                {prompts.length > 0 ? (
                  <Select
                    onValueChange={(value) => {
                      if (value) {
                        handlePromptSelect(value);
                      }
                    }}
                    value={selectedPromptValue}
                  >
                    <SelectTrigger
                      aria-label="Tracked prompt"
                      className="h-10 w-full"
                    >
                      <SelectValue>
                        {(value: string) => (
                          <span
                            className={cn(
                              "truncate",
                              value === MANUAL_PROMPT_VALUE
                                ? "text-muted-foreground"
                                : null
                            )}
                          >
                            {promptSelectLabel(value)}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectItem value={MANUAL_PROMPT_VALUE}>
                        Write a custom prompt
                      </SelectItem>
                      {prompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id}>
                          <span className="line-clamp-2 whitespace-normal">
                            {prompt.prompt}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <Textarea
                  className="min-h-24"
                  id={`${fieldId}-topic`}
                  maxLength={GEO_WRITER_TOPIC_MAX_LENGTH}
                  onChange={(event) => {
                    setTopic(event.target.value);
                    if (sourceKind === "prompt" || sourceKind === "gap") {
                      setSourceKind("manual");
                      setSourceId(undefined);
                    }
                  }}
                  placeholder="e.g. Which tools are best for sharing music demos?"
                  value={topic}
                />
                {sourceId &&
                (sourceKind === "prompt" || sourceKind === "gap") ? (
                  <p className="text-muted-foreground text-xs">
                    {GEO_WRITE_EDIT_NOTE}
                  </p>
                ) : null}
              </section>

              <section
                className="scroll-mt-2 space-y-4 px-6 py-6"
                data-section="type"
              >
                <WriteSectionHeader
                  description={recommendation.reason}
                  id="type"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {GEO_WRITE_CONTENT_SUBTYPES.map((option) => (
                    <WriteOptionCard
                      badge={
                        option.id === recommendation.id
                          ? GEO_WRITE_RECOMMENDED_BADGE
                          : null
                      }
                      description={option.description}
                      icon={
                        <HugeiconsIcon
                          className={cn("size-5", option.iconClass)}
                          icon={option.icon}
                          strokeWidth={1.8}
                        />
                      }
                      key={option.id}
                      label={option.label}
                      onToggle={() => setContentSubtype(option.id)}
                      selected={contentSubtype === option.id}
                    />
                  ))}
                </div>
              </section>

              <section
                className="scroll-mt-2 space-y-4 px-6 py-6"
                data-section="brand"
              >
                <WriteSectionHeader
                  description="The brand whose voice and facts the article uses."
                  htmlFor={voices.length > 0 ? `${fieldId}-brand` : undefined}
                  id="brand"
                />
                {voices.length === 0 ? (
                  <p className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
                    No brand identities yet. The writer will use your GEO
                    project brand.
                  </p>
                ) : (
                  <Select
                    onValueChange={(value) => {
                      setBrandVoiceId(value || null);
                    }}
                    value={brandVoiceId ?? ""}
                  >
                    <SelectTrigger
                      className="h-10 w-full"
                      id={`${fieldId}-brand`}
                    >
                      <SelectValue placeholder="Select a brand identity">
                        {(value: string) => brandSelectLabel(value)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <WriteBrandOption
                            isDefault={voice.isDefault}
                            name={voice.name}
                            websiteUrl={voice.websiteUrl}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </section>

              <section
                className="scroll-mt-2 space-y-4 px-6 py-6"
                data-section="sitemap"
              >
                <WriteSectionHeader
                  description="The writer links to real pages from the brand identity's sitemap."
                  id="sitemap"
                />
                <WriteSitemapSection
                  brandIdentityHref={`/${organizationSlug}/brand/identity`}
                  brandVoiceId={brandVoiceId}
                  isPending={Boolean(brandVoiceId) && sitemapQuery.isPending}
                  onSelect={setSitemapId}
                  organizationId={organizationId}
                  selectedSitemapId={effectiveSitemapId}
                  sitemaps={sitemaps}
                  voiceName={selectedVoice?.name ?? null}
                  voiceWebsiteUrl={selectedVoice?.websiteUrl ?? null}
                />
              </section>

              <section
                className="scroll-mt-2 space-y-4 px-6 py-6"
                data-section="competitors"
              >
                <div className="flex items-start justify-between gap-3">
                  <WriteSectionHeader
                    description="Competitors the article can mention when it compares options."
                    id="competitors"
                  />
                  {competitors.length > 0 ? (
                    <button
                      className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-xs transition-colors"
                      onClick={() => {
                        setCompetitorsTouched(true);
                        setCompetitorIds(
                          allCompetitorsSelected
                            ? []
                            : competitors.map((competitor) => competitor.id)
                        );
                      }}
                      type="button"
                    >
                      {allCompetitorsSelected ? "Clear all" : "Select all"}
                    </button>
                  ) : null}
                </div>
                {competitors.length === 0 ? (
                  <p className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
                    No competitors tracked yet. Add them in GEO settings to
                    mention alternatives.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {competitors.map((competitor) => {
                      const selected = selectedCompetitorIds.has(competitor.id);
                      return (
                        <WriteOptionCard
                          compact
                          description={writerCompetitorDetail(
                            competitor,
                            mentionedCompetitors
                          )}
                          icon={
                            <CompetitorLogo
                              className="size-5"
                              domain={competitor.domain}
                              name={competitor.name}
                            />
                          }
                          key={competitor.id}
                          label={competitor.name}
                          onToggle={() => {
                            setCompetitorsTouched(true);
                            setCompetitorIds((current) =>
                              selected
                                ? current.filter((id) => id !== competitor.id)
                                : [...current, competitor.id]
                            );
                          }}
                          selected={selected}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>

          <WriteDialogFooter
            canSubmit={canSubmit}
            onSubmit={(action) => {
              handleSubmit(action).catch(() => undefined);
            }}
            pendingAction={pendingAction}
          />
        </div>
      </div>
    </ResponsiveDialogContent>
  );
}

function WriteSectionHeader({
  id,
  description,
  htmlFor,
}: {
  id: WriteDialogSectionId;
  description: string;
  htmlFor?: string;
}) {
  const meta = sectionMeta(id);
  if (!meta) {
    return null;
  }
  const heading = (
    <>
      <HugeiconsIcon
        className="text-muted-foreground size-4"
        icon={meta.icon}
        strokeWidth={1.8}
      />
      <span>{meta.label}</span>
      {meta.required ? <span className="text-destructive">*</span> : null}
    </>
  );
  return (
    <div className="space-y-1">
      {htmlFor ? (
        <Label
          className="flex items-center gap-2 text-base font-semibold"
          htmlFor={htmlFor}
        >
          {heading}
        </Label>
      ) : (
        <h3 className="flex items-center gap-2 text-base font-semibold">
          {heading}
        </h3>
      )}
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

function WriteDialogFooter({
  canSubmit,
  onSubmit,
  pendingAction,
}: {
  canSubmit: boolean;
  onSubmit: (action: WriteAction) => void;
  pendingAction: WriteAction | null;
}) {
  const reduceMotion = useReducedMotion();
  const statusText = pendingAction
    ? GEO_WRITE_ACTION_PENDING[pendingAction].status
    : `${GEO_WRITE_ACTION_HELP.plan} ${GEO_WRITE_ACTION_HELP.write}`;
  return (
    <div className={GEO_WRITE_PANEL_FOOTER_CLASS}>
      <div
        className={cn(
          GEO_WRITE_PANEL_FOOTER_ROW_CLASS,
          "justify-between gap-3 px-4"
        )}
      >
        <LazyMotion features={loadMotionFeatures} strict>
          <AnimatePresence initial={false} mode="wait">
            <m.p
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
              className={cn(
                "hidden min-w-0 truncate text-xs sm:block",
                pendingAction ? "text-foreground" : "text-muted-foreground"
              )}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              key={pendingAction ?? "help"}
              transition={FOOTER_STATUS_TRANSITION}
            >
              {statusText}
            </m.p>
          </AnimatePresence>
        </LazyMotion>
        <div className="flex shrink-0 gap-2">
          <WriteActionButton
            action="plan"
            disabled={!canSubmit}
            onClick={() => onSubmit("plan")}
            pendingAction={pendingAction}
            variant="outline"
          >
            Plan
          </WriteActionButton>
          <WriteActionButton
            action="write"
            disabled={!canSubmit}
            onClick={() => onSubmit("write")}
            pendingAction={pendingAction}
          >
            Write
          </WriteActionButton>
        </div>
      </div>
    </div>
  );
}

function WriteActionButton({
  action,
  pendingAction,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "children"> & {
  action: WriteAction;
  pendingAction: WriteAction | null;
  children: ReactNode;
}) {
  const isPending = pendingAction === action;
  return (
    <Button aria-busy={isPending} {...props}>
      {isPending ? (
        <>
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4 animate-spin"
            icon={Loading03Icon}
          />
          {GEO_WRITE_ACTION_PENDING[action].label}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
