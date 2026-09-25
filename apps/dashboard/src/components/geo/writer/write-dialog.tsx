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
import {
  GEO_WRITE_PANEL_FOOTER_CLASS,
  GEO_WRITE_PANEL_FOOTER_ROW_CLASS,
  GEO_WRITE_PANEL_HEADER_CLASS,
  GEO_WRITE_PANEL_HEADER_ROW_CLASS,
  GEO_WRITE_SIDEBAR_SHORTCUT,
  GEO_WRITER_TOPIC_MIN_LENGTH,
} from "@notra/geo-core/constants/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Label } from "@notra/ui/components/ui/label";
import { cn } from "@notra/ui/lib/utils";
import { AnimatePresence, LazyMotion, m, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/button";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { GEO_WRITE_DIALOG_ENTRIES } from "@/constants/geo-analytics";
import {
  GEO_WRITE_ACTION_HELP,
  GEO_WRITE_ACTION_PENDING,
  GEO_WRITE_CONTENT_SUBTYPES,
  GEO_WRITE_DIALOG_SECTIONS,
  GEO_WRITE_RECOMMENDED_BADGE,
} from "@/constants/geo-writer";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import { useGeoWriterPlan } from "@/lib/hooks/use-geo-writer";
import { useWriterBrandSelection } from "@/lib/hooks/use-writer-brand-selection";
import { useWriterPromptSelection } from "@/lib/hooks/use-writer-prompt-selection";
import type {
  WriteDialogProps,
  WriteDialogSectionId,
} from "@/types/components/geo-writer";
import { existingPageLabel } from "@/utils/geo-gaps";
import { withGeoProject } from "@/utils/geo-paths";
import { geoContentPath } from "@/utils/geo-write-entry";
import {
  recommendedContentSubtype,
  writerBaselineLabel,
} from "@/utils/geo-writer";

import { WriteBrandSelect } from "./write-brand-select";
import { WriteCompetitorChoices } from "./write-competitor-choices";
import { WriteOptionCard } from "./write-option-card";
import { WritePromptInput } from "./write-prompt-input";
import { WriteSectionSidebar } from "./write-section-sidebar";
import { WriteSitemapSection } from "./write-sitemap-section";

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
        organizationId={organizationId}
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
  const { project } = useGeoActiveProject(organizationId);
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
  const {
    prompts,
    topic,
    changeTopic,
    sourceKind,
    sourceId,
    selectPrompt,
    contentSubtype,
    setContentSubtype,
  } = useWriterPromptSelection({ organizationId, open, initial });
  const recommendation = recommendedContentSubtype(topic);
  const baselineLabel = writerBaselineLabel(initial?.baseline);
  const existingPageUrl = initial?.existingPageUrl;
  const promptBadgeLabel = existingPageUrl
    ? `Updating ${existingPageLabel(existingPageUrl)}`
    : baselineLabel;
  const mentionedCompetitors = initial?.mentionedCompetitors ?? [];
  const {
    brandVoiceId,
    setBrandVoiceId,
    voices,
    selectedVoice,
    sitemaps,
    isSitemapPending,
    effectiveSitemapId,
    setSitemapId,
  } = useWriterBrandSelection({
    organizationId,
    projectBrandId: project?.brandSettingsId,
    initialBrandId: initial?.brandVoiceId,
    enabled: open,
  });
  const [competitorIds, setCompetitorIds] = useState<string[]>(
    initial?.competitorIds ?? []
  );
  const [competitorsTouched, setCompetitorsTouched] = useState(
    Boolean(initial?.competitorIds)
  );

  const planMutation = useGeoWriterPlan(organizationId);
  const { competitors } = useGeoCompetitorsDb(organizationId, {
    enabled: open,
  });

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

  const canSubmit =
    topic.trim().length >= GEO_WRITER_TOPIC_MIN_LENGTH &&
    Boolean(project) &&
    !planMutation.isPending;

  const handleSubmit = async (action: WriteAction) => {
    const trimmed = topic.trim();
    if (!canSubmit) {
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
              <WritePromptInput
                badgeLabel={promptBadgeLabel}
                onPromptSelect={selectPrompt}
                onTopicChange={changeTopic}
                prompts={prompts}
                sourceId={sourceId}
                sourceKind={sourceKind}
                topic={topic}
                topicId={`${fieldId}-topic`}
              >
                <WriteSectionHeader
                  description="Pick a tracked prompt or write your own. The article answers this question."
                  htmlFor={`${fieldId}-topic`}
                  id="prompt"
                />
              </WritePromptInput>

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
                <WriteBrandSelect
                  id={`${fieldId}-brand`}
                  onChange={setBrandVoiceId}
                  projectBrandId={project?.brandSettingsId}
                  value={brandVoiceId}
                  voices={voices}
                />
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
                  isPending={isSitemapPending}
                  onSelect={setSitemapId}
                  organizationId={organizationId}
                  selectedSitemapId={effectiveSitemapId}
                  sitemaps={sitemaps}
                  voiceName={selectedVoice?.name ?? null}
                  voiceWebsiteUrl={selectedVoice?.websiteUrl ?? null}
                />
              </section>

              <WriteCompetitorChoices
                competitors={competitors}
                mentionedCompetitors={mentionedCompetitors}
                onChange={(ids) => {
                  setCompetitorsTouched(true);
                  setCompetitorIds(ids);
                }}
                selectedIds={competitorIds}
              >
                <WriteSectionHeader
                  description="Competitors the article can mention when it compares options."
                  id="competitors"
                />
              </WriteCompetitorChoices>
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
