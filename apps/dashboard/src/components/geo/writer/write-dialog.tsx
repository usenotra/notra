"use client";

import { Cancel01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
/**
 * WriteDialog is the GEO write entry: a sidebar of sections that jump to
 * one scrolling form (prompt, content type, brand identity, competitors),
 * then Plan or Write. Gaps open this with `writeDialogStateFromGap`.
 * After plan, go to `geoContentPath`. Do not send users to
 * `/geo/write?brief=`.
 */
import { GEO_WRITER_TOPIC_MIN_LENGTH } from "@notra/geo-core/constants/geo";
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
      className="flex h-[min(44rem,88svh)] max-h-[88svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl md:flex-row"
      showCloseButton={false}
    >
      <nav
        aria-label="Write sections"
        className="hidden w-56 shrink-0 flex-col gap-1 border-r p-2 pt-3 md:flex"
      >
        <p className="text-muted-foreground px-2 pt-1 text-[11px] font-medium uppercase">
          Overview
        </p>
        {GEO_WRITE_DIALOG_SECTIONS.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              aria-current={active ? "location" : undefined}
              className={cn(
                "duration-fast hover:bg-muted/80 flex min-h-8 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={item.id}
              onClick={() => jumpToSection(item.id)}
              type="button"
            >
              <HugeiconsIcon
                className="size-4 shrink-0"
                icon={item.icon}
                strokeWidth={active ? 2 : 1.5}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3.5 md:px-5">
          <div className="min-w-0 space-y-1">
            <ResponsiveDialogTitle className="text-sm leading-none font-medium">
              Write article
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Plan or write an article from a prompt, content type, brand
              identity, and competitors.
            </ResponsiveDialogDescription>
            <div className="flex gap-1 overflow-x-auto pt-2 md:hidden">
              {GEO_WRITE_DIALOG_SECTIONS.map((item) => (
                <button
                  className={cn(
                    "shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-sm transition-colors",
                    activeSection === item.id
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/60"
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
          <Button
            aria-label="Close"
            className="shrink-0"
            onClick={() => onOpenChange(false)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </Button>
        </header>

        <div
          className="scrollbar-floating divide-border min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain scroll-smooth"
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
            <WriteSectionHeader description={recommendation.reason} id="type" />
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

        <WriteDialogFooter
          canSubmit={canSubmit}
          onSubmit={(action) => {
            handleSubmit(action).catch(() => undefined);
          }}
          pendingAction={pendingAction}
        />
      </section>
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
    <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-t px-4 py-2.5 md:px-5">
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
