"use client";

import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_BRIEF_MAX_CHECKLIST,
  GEO_BRIEF_MAX_CLAIMS,
  GEO_BRIEF_MAX_LINKS,
  GEO_BRIEF_MAX_QUESTIONS,
  GEO_BRIEF_MAX_SECTIONS,
  GEO_BRIEF_MAX_TITLE_LENGTH,
  GEO_BRIEF_MIN_SECTIONS,
} from "@notra/ai/constants/geo-writer";
import { BLOG_POST_SUBTYPES } from "@notra/db/constants/content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { AnimatePresence, LazyMotion, m, useReducedMotion } from "motion/react";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/button";
import { PlanText } from "@/components/content/plan-text";
import {
  CONTENT_PLAN_CHECKS_ADD,
  CONTENT_PLAN_CHECKS_LABEL,
  CONTENT_PLAN_CHECKS_PLACEHOLDER,
  CONTENT_PLAN_FAQ_ADD,
  CONTENT_PLAN_FAQ_LABEL,
  CONTENT_PLAN_FAQ_PLACEHOLDER,
  CONTENT_PLAN_LINK_ANCHOR_PLACEHOLDER,
  CONTENT_PLAN_LINK_URL_PLACEHOLDER,
  CONTENT_PLAN_LINK_WHY_PLACEHOLDER,
  CONTENT_PLAN_LINKS_ADD,
  CONTENT_PLAN_LINKS_LABEL,
  CONTENT_PLAN_POINT_ADD,
  CONTENT_PLAN_POINT_PLACEHOLDER,
  CONTENT_PLAN_SAVE_DEBOUNCE_MS,
} from "@/constants/content-plan";
import type {
  ContentPlanViewProps,
  KeyedContentPlan,
  KeyedPlanLink,
  PlanLineListProps,
} from "@/types/content/plan";
import {
  briefsEqual,
  completePlanLink,
  createPlanId,
  emptyPlanSection,
  formatPlanSubtypeLabel,
  fromKeyedPlan,
  removeAt,
  replaceAt,
  toKeyedPlan,
  toPlanLine,
  toSavableBrief,
} from "@/utils/content-plan";
import { isBlogPostSubtype } from "@/utils/content-subtype";

const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default);

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const ITEM_TRANSITION = {
  duration: 0.15,
  ease: EASE_OUT,
} as const;

const ITEM_EXIT_TRANSITION = {
  duration: 0.1,
  ease: EASE_OUT,
} as const;

const INSTANT_TRANSITION = { duration: 0 } as const;

function PlanField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase">
        {label}
      </p>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function AddItemButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="text-muted-foreground hover:text-foreground inline-flex min-h-9 w-full items-center gap-2 rounded-md px-1 text-sm transition-[color,transform] duration-150 ease-out active:scale-[0.96]"
      onClick={onClick}
      type="button"
    >
      <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
      {label}
    </button>
  );
}

function RemoveItemButton({
  label,
  onClick,
  onMouseDown,
}: {
  label: string;
  onClick: () => void;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Button
      aria-label={label}
      className="text-muted-foreground size-7 shrink-0 opacity-0 transition-opacity duration-150 ease-out group-focus-within/item:opacity-100 group-hover/item:opacity-100 focus-visible:opacity-100 active:scale-[0.96]"
      onClick={onClick}
      onMouseDown={onMouseDown}
      size="sm"
      type="button"
      variant="ghost"
    >
      <HugeiconsIcon className="size-3.5" icon={Cancel01Icon} />
    </Button>
  );
}

function PlanBullet() {
  return (
    <span
      aria-hidden="true"
      className="bg-muted-foreground mt-2.5 size-1 shrink-0 rounded-full"
    />
  );
}

function PlanAddSlot({
  addLabel,
  atMax,
  draftRow,
  drafting,
  onStart,
  readOnly,
}: {
  addLabel: string;
  atMax: boolean;
  draftRow: ReactNode;
  drafting: boolean;
  onStart: () => void;
  readOnly: boolean;
}) {
  if (readOnly || atMax) {
    return null;
  }
  if (drafting) {
    return draftRow;
  }
  return <AddItemButton label={addLabel} onClick={onStart} />;
}

function PlanLineList({
  addLabel,
  itemAriaLabel,
  itemClassName = "text-sm leading-relaxed",
  items,
  maxItems,
  onCommit,
  onItemsChange,
  placeholder,
  readOnly,
  removeAriaLabel,
  showBullet = false,
}: PlanLineListProps) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? INSTANT_TRANSITION : ITEM_TRANSITION;
  const exitTransition = reduceMotion
    ? INSTANT_TRANSITION
    : ITEM_EXIT_TRANSITION;
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const atMax = items.length >= maxItems;

  const cancelDraft = () => {
    setDrafting(false);
    setDraft("");
  };

  const startDraft = () => {
    if (readOnly || atMax) {
      return;
    }
    setDraft("");
    setDrafting(true);
  };

  const commitDraft = (keepDrafting: boolean) => {
    const text = draft.trim();
    if (!text) {
      cancelDraft();
      return;
    }
    const nextItems = [...items, toPlanLine(text)];
    onItemsChange(nextItems);
    if (!keepDrafting || nextItems.length >= maxItems) {
      cancelDraft();
      return;
    }
    setDraft("");
  };

  return (
    <div className="space-y-1">
      <ul className="space-y-1">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, index) => (
            <m.li
              animate={{ opacity: 1 }}
              className="group/item flex min-h-9 items-start gap-1"
              exit={{ opacity: 0, transition: exitTransition }}
              initial={{ opacity: 0 }}
              key={item.id}
              transition={transition}
            >
              {showBullet ? <PlanBullet /> : null}
              <PlanText
                aria-label={itemAriaLabel(index)}
                className={itemClassName}
                itemId={item.id}
                onChange={(text) =>
                  onItemsChange(replaceAt(items, index, { ...item, text }))
                }
                onCommit={() => {
                  if (!item.text.trim()) {
                    onItemsChange(removeAt(items, index));
                  }
                  onCommit();
                }}
                onEnter={() => {
                  if (item.text.trim() && index === items.length - 1) {
                    startDraft();
                    return;
                  }
                  onCommit();
                }}
                placeholder={placeholder}
                readOnly={readOnly}
                value={item.text}
              />
              {readOnly ? null : (
                <RemoveItemButton
                  label={removeAriaLabel(index)}
                  onClick={() => onItemsChange(removeAt(items, index))}
                />
              )}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      <PlanAddSlot
        addLabel={addLabel}
        atMax={atMax}
        draftRow={
          <div className="group/item flex min-h-9 items-start gap-1">
            {showBullet ? <PlanBullet /> : null}
            <PlanText
              aria-label={itemAriaLabel(items.length)}
              autoFocus
              className={itemClassName}
              onChange={setDraft}
              onCommit={() => commitDraft(false)}
              onEnter={() => commitDraft(true)}
              onEscape={cancelDraft}
              placeholder={placeholder}
              value={draft}
            />
            <RemoveItemButton
              label="Cancel"
              onClick={cancelDraft}
              onMouseDown={(event) => event.preventDefault()}
            />
          </div>
        }
        drafting={drafting}
        onStart={startDraft}
        readOnly={readOnly}
      />
    </div>
  );
}

function PlanLinkList({
  links,
  onCommit,
  onLinksChange,
  readOnly,
}: {
  links: KeyedPlanLink[];
  onCommit: () => void;
  onLinksChange: (links: KeyedPlanLink[]) => void;
  readOnly: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? INSTANT_TRANSITION : ITEM_TRANSITION;
  const exitTransition = reduceMotion
    ? INSTANT_TRANSITION
    : ITEM_EXIT_TRANSITION;
  const [draftUrl, setDraftUrl] = useState("");
  const [drafting, setDrafting] = useState(false);
  const atMax = links.length >= GEO_BRIEF_MAX_LINKS;

  const cancelDraft = () => {
    setDrafting(false);
    setDraftUrl("");
  };

  const startDraft = () => {
    if (readOnly || atMax) {
      return;
    }
    setDraftUrl("");
    setDrafting(true);
  };

  const commitDraft = () => {
    const completed = completePlanLink({
      url: draftUrl,
      anchor: "",
      why: "",
    });
    if (!completed) {
      cancelDraft();
      return;
    }
    onLinksChange([...links, { id: createPlanId(), ...completed }]);
    cancelDraft();
  };

  return (
    <div className="space-y-1">
      <ul className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {links.map((link, index) => (
            <m.li
              animate={{ opacity: 1 }}
              className="group/item space-y-1"
              exit={{ opacity: 0, transition: exitTransition }}
              initial={{ opacity: 0 }}
              key={link.id}
              transition={transition}
            >
              <div className="flex items-start gap-1">
                <PlanText
                  aria-label={`Link ${index + 1} text`}
                  className="text-sm font-medium"
                  itemId={link.id}
                  onChange={(anchor) =>
                    onLinksChange(replaceAt(links, index, { ...link, anchor }))
                  }
                  onCommit={onCommit}
                  placeholder={CONTENT_PLAN_LINK_ANCHOR_PLACEHOLDER}
                  readOnly={readOnly}
                  value={link.anchor}
                />
                {readOnly ? null : (
                  <RemoveItemButton
                    label={`Remove link ${index + 1}`}
                    onClick={() => onLinksChange(removeAt(links, index))}
                  />
                )}
              </div>
              <PlanText
                aria-label={`Link ${index + 1} URL`}
                className="text-muted-foreground text-sm"
                onChange={(url) =>
                  onLinksChange(replaceAt(links, index, { ...link, url }))
                }
                onCommit={onCommit}
                placeholder={CONTENT_PLAN_LINK_URL_PLACEHOLDER}
                readOnly={readOnly}
                value={link.url}
              />
              <PlanText
                aria-label={`Link ${index + 1} reason`}
                className="text-muted-foreground text-sm leading-relaxed"
                onChange={(why) =>
                  onLinksChange(replaceAt(links, index, { ...link, why }))
                }
                onCommit={onCommit}
                placeholder={CONTENT_PLAN_LINK_WHY_PLACEHOLDER}
                readOnly={readOnly}
                value={link.why}
              />
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      <PlanAddSlot
        addLabel={CONTENT_PLAN_LINKS_ADD}
        atMax={atMax}
        draftRow={
          <div className="group/item flex min-h-9 items-start gap-1">
            <PlanText
              aria-label="Link URL"
              autoFocus
              className="text-sm"
              onChange={setDraftUrl}
              onCommit={commitDraft}
              onEnter={commitDraft}
              onEscape={cancelDraft}
              placeholder={CONTENT_PLAN_LINK_URL_PLACEHOLDER}
              value={draftUrl}
            />
            <RemoveItemButton
              label="Cancel"
              onClick={cancelDraft}
              onMouseDown={(event) => event.preventDefault()}
            />
          </div>
        }
        drafting={drafting}
        onStart={startDraft}
        readOnly={readOnly}
      />
    </div>
  );
}

export function ContentPlanView({
  brief,
  isWriting = false,
  onChange,
  onDirtyChange,
}: ContentPlanViewProps) {
  const readOnly = isWriting || !onChange;
  const [draft, setDraft] = useState(() => toKeyedPlan(brief));
  const briefRef = useRef(brief);

  const commit = (next = draft) => {
    const savable = toSavableBrief(next);
    if (!savable || !onChange) {
      return;
    }
    if (briefsEqual(savable, brief)) {
      return;
    }
    onChange(savable);
  };

  useEffect(() => {
    const previousServer = briefRef.current;
    setDraft((current) => {
      const currentPlain = fromKeyedPlan(current);
      if (briefsEqual(currentPlain, brief)) {
        return current;
      }
      if (briefsEqual(currentPlain, previousServer)) {
        return toKeyedPlan(brief);
      }
      const savable = toSavableBrief(current);
      if (savable && briefsEqual(savable, brief)) {
        return current;
      }
      return current;
    });
    briefRef.current = brief;
  }, [brief]);

  useEffect(() => {
    if (readOnly) {
      return;
    }
    const timer = window.setTimeout(() => {
      const savable = toSavableBrief(draft);
      if (!savable || !onChange) {
        return;
      }
      if (briefsEqual(savable, brief)) {
        return;
      }
      onChange(savable);
    }, CONTENT_PLAN_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [brief, draft, onChange, readOnly]);

  const savableDraft = toSavableBrief(draft);
  const isDirty = savableDraft === null || !briefsEqual(savableDraft, brief);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const update = (next: KeyedContentPlan) => {
    setDraft(next);
  };

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <div
        aria-busy={isWriting}
        className="mx-auto w-full max-w-3xl space-y-12"
      >
        <PlanText
          aria-label="Title"
          className="text-xl leading-tight font-semibold tracking-tight text-pretty"
          maxLength={GEO_BRIEF_MAX_TITLE_LENGTH}
          onChange={(workingTitle) => update({ ...draft, workingTitle })}
          onCommit={() => commit()}
          placeholder="Title"
          readOnly={readOnly}
          value={draft.workingTitle}
        />

        <section className="space-y-6">
          <PlanField label="Target prompt">
            <PlanText
              aria-label="Target prompt"
              onChange={(targetPrompt) => update({ ...draft, targetPrompt })}
              onCommit={() => commit()}
              placeholder="The question a buyer would ask"
              readOnly={readOnly}
              value={draft.targetPrompt}
            />
          </PlanField>
          <div className="grid gap-6 sm:grid-cols-2">
            <PlanField label="Intent">
              <PlanText
                aria-label="Intent"
                onChange={(intent) => update({ ...draft, intent })}
                onCommit={() => commit()}
                placeholder="Why someone is searching for this"
                readOnly={readOnly}
                value={draft.intent}
              />
            </PlanField>
            <PlanField label="Audience">
              <PlanText
                aria-label="Audience"
                onChange={(audience) => update({ ...draft, audience })}
                onCommit={() => commit()}
                placeholder="Who this is for"
                readOnly={readOnly}
                value={draft.audience}
              />
            </PlanField>
            <PlanField label="Type">
              {readOnly ? (
                <p>{formatPlanSubtypeLabel(draft.contentSubtype)}</p>
              ) : (
                <Select
                  onValueChange={(value) => {
                    if (
                      typeof value !== "string" ||
                      !isBlogPostSubtype(value)
                    ) {
                      return;
                    }
                    const next = { ...draft, contentSubtype: value };
                    update(next);
                    commit(next);
                  }}
                  value={draft.contentSubtype}
                >
                  <SelectTrigger
                    aria-label="Content type"
                    className="h-auto min-h-0 w-fit gap-1 border-0 bg-transparent p-0 shadow-none dark:bg-transparent dark:hover:bg-transparent"
                    size="sm"
                  >
                    <SelectValue>
                      {(value) =>
                        typeof value === "string"
                          ? formatPlanSubtypeLabel(value)
                          : "Choose a type"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {BLOG_POST_SUBTYPES.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {formatPlanSubtypeLabel(subtype)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </PlanField>
            <PlanField label="Job to be done">
              <PlanText
                aria-label="Job to be done"
                onChange={(jobToBeDone) => update({ ...draft, jobToBeDone })}
                onCommit={() => commit()}
                placeholder="What the article should help them do"
                readOnly={readOnly}
                value={draft.jobToBeDone}
              />
            </PlanField>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase">
            Outline
          </h2>
          <div className="space-y-8">
            {draft.sections.map((section, index) => (
              <article className="flex gap-4" key={section.id}>
                <span
                  aria-hidden="true"
                  className="text-muted-foreground mt-0.5 w-6 shrink-0 font-mono text-xs leading-6"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="group/item flex items-start gap-1">
                    <PlanText
                      aria-label={`Section ${index + 1} heading`}
                      className="text-base leading-snug font-medium"
                      onChange={(heading) =>
                        update({
                          ...draft,
                          sections: replaceAt(draft.sections, index, {
                            ...section,
                            heading,
                          }),
                        })
                      }
                      onCommit={() => commit()}
                      placeholder="Section heading"
                      readOnly={readOnly}
                      value={section.heading}
                    />
                    {readOnly ||
                    draft.sections.length <= GEO_BRIEF_MIN_SECTIONS ? null : (
                      <RemoveItemButton
                        label={`Remove section ${index + 1}`}
                        onClick={() =>
                          update({
                            ...draft,
                            sections: removeAt(draft.sections, index),
                          })
                        }
                      />
                    )}
                  </div>
                  <PlanText
                    aria-label={`Section ${index + 1} goal`}
                    className="text-muted-foreground text-sm leading-relaxed"
                    onChange={(goal) =>
                      update({
                        ...draft,
                        sections: replaceAt(draft.sections, index, {
                          ...section,
                          goal,
                        }),
                      })
                    }
                    onCommit={() => commit()}
                    placeholder="What the reader should take away"
                    readOnly={readOnly}
                    value={section.goal}
                  />
                  <PlanLineList
                    addLabel={CONTENT_PLAN_POINT_ADD}
                    itemAriaLabel={(claimIndex) =>
                      `Section ${index + 1} point ${claimIndex + 1}`
                    }
                    itemClassName="text-muted-foreground text-sm leading-relaxed"
                    items={section.claims}
                    maxItems={GEO_BRIEF_MAX_CLAIMS}
                    onCommit={() => commit()}
                    onItemsChange={(claims) =>
                      update({
                        ...draft,
                        sections: replaceAt(draft.sections, index, {
                          ...section,
                          claims,
                        }),
                      })
                    }
                    placeholder={CONTENT_PLAN_POINT_PLACEHOLDER}
                    readOnly={readOnly}
                    removeAriaLabel={(claimIndex) =>
                      `Remove point ${claimIndex + 1}`
                    }
                    showBullet
                  />
                </div>
              </article>
            ))}
          </div>
          {readOnly ||
          draft.sections.length >= GEO_BRIEF_MAX_SECTIONS ? null : (
            <AddItemButton
              label="Add section"
              onClick={() =>
                update({
                  ...draft,
                  sections: [...draft.sections, emptyPlanSection()],
                })
              }
            />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase">
            {CONTENT_PLAN_FAQ_LABEL}
          </h2>
          <PlanLineList
            addLabel={CONTENT_PLAN_FAQ_ADD}
            itemAriaLabel={(index) => `FAQ ${index + 1}`}
            items={draft.questionsToAnswer}
            maxItems={GEO_BRIEF_MAX_QUESTIONS}
            onCommit={() => commit()}
            onItemsChange={(questionsToAnswer) =>
              update({ ...draft, questionsToAnswer })
            }
            placeholder={CONTENT_PLAN_FAQ_PLACEHOLDER}
            readOnly={readOnly}
            removeAriaLabel={(index) => `Remove question ${index + 1}`}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase">
            {CONTENT_PLAN_LINKS_LABEL}
          </h2>
          <PlanLinkList
            links={draft.internalLinks}
            onCommit={() => commit()}
            onLinksChange={(internalLinks) =>
              update({ ...draft, internalLinks })
            }
            readOnly={readOnly}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-muted-foreground text-[0.6875rem] font-medium tracking-wide uppercase">
            {CONTENT_PLAN_CHECKS_LABEL}
          </h2>
          <PlanLineList
            addLabel={CONTENT_PLAN_CHECKS_ADD}
            itemAriaLabel={(index) => `Check ${index + 1}`}
            items={draft.acceptanceChecklist}
            maxItems={GEO_BRIEF_MAX_CHECKLIST}
            onCommit={() => commit()}
            onItemsChange={(acceptanceChecklist) =>
              update({ ...draft, acceptanceChecklist })
            }
            placeholder={CONTENT_PLAN_CHECKS_PLACEHOLDER}
            readOnly={readOnly}
            removeAriaLabel={(index) => `Remove check ${index + 1}`}
          />
        </section>
      </div>
    </LazyMotion>
  );
}
