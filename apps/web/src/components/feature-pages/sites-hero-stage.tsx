import {
  CheckmarkCircle02Icon,
  File01Icon,
  Folder01Icon,
  GitBranchIcon,
  GitCommitIcon,
  LockIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";
import {
  AnimatePresence,
  domMax,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { useEffect, useState } from "react";

import { SitesCodeTokens } from "@/components/feature-pages/sites-code-tokens";
import { StageShell } from "@/components/feature-pages/stage-shell";
import {
  SITES_BROWSER_TAB_TITLE,
  SITES_DOMAIN,
  SITES_EDITOR_CLOSING_LINE,
  SITES_EDITOR_FILES,
  SITES_EDITOR_LINES,
  SITES_EDITOR_NEW_LINE,
  SITES_EDITOR_REPO,
  SITES_EDITOR_TABS,
  SITES_HERO_BUILD_TIME,
  SITES_HERO_STATUS_LABELS,
  SITES_HERO_TIMING,
  SITES_POST,
  SITES_POST_PATH,
  SITES_STAGE_IMAGE,
} from "@/constants/feature-pages/sites";
import type {
  SitesCodeLine,
  SitesCodeTone,
  SitesEditorLineProps,
  SitesEditorWindowProps,
  SitesHeroPhaseProps,
  SitesHeroPhase,
  SitesTypingLineProps,
  SitesPostStepProps,
} from "@/types/sites-page";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const NEW_LINE_LENGTH = SITES_EDITOR_NEW_LINE.reduce(
  (total, [, text]) => total + text.length,
  0
);

const EDITOR_ROWS = SITES_EDITOR_LINES.map((line, index) => ({
  id: `line-${index + 1}`,
  number: index + 1,
  line,
}));

function sliceLine(line: SitesCodeLine, count: number): SitesCodeLine {
  const sliced: [SitesCodeTone, string][] = [];
  let remaining = count;

  for (const [tone, text] of line) {
    if (remaining <= 0) {
      break;
    }
    sliced.push([tone, text.slice(0, remaining)]);
    remaining -= text.length;
  }

  return sliced;
}

const NEXT_PHASE: Record<
  Exclude<SitesHeroPhase, "typing">,
  { next: SitesHeroPhase; delay: number }
> = {
  live: { next: "typing", delay: SITES_HERO_TIMING.holdMs },
  push: { next: "build", delay: SITES_HERO_TIMING.pushMs },
  build: { next: "live", delay: SITES_HERO_TIMING.buildMs },
};

function useHeroPhase() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<SitesHeroPhase>("live");

  useEffect(() => {
    if (reduceMotion || phase === "typing") {
      return;
    }

    const { next, delay } = NEXT_PHASE[phase];
    const timer = window.setTimeout(() => setPhase(next), delay);

    return () => window.clearTimeout(timer);
  }, [phase, reduceMotion]);

  return {
    phase: reduceMotion ? "live" : phase,
    finishTyping: () => setPhase("push"),
  } as const;
}

function TypingLine({ onDone }: SitesTypingLineProps) {
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (typed >= NEW_LINE_LENGTH) {
      const timer = window.setTimeout(onDone, SITES_HERO_TIMING.pauseMs);
      return () => window.clearTimeout(timer);
    }

    const delay =
      typed === 0 ? SITES_HERO_TIMING.typeDelayMs : SITES_HERO_TIMING.charMs;
    const timer = window.setTimeout(() => setTyped(typed + 1), delay);

    return () => window.clearTimeout(timer);
  }, [typed, onDone]);

  return (
    <EditorLine added={typed > 0} number={SITES_EDITOR_LINES.length + 1}>
      <SitesCodeTokens line={sliceLine(SITES_EDITOR_NEW_LINE, typed)} />
      <span className="ml-px inline-block h-4 w-0.5 translate-y-0.75 bg-[#C4B5FD]" />
    </EditorLine>
  );
}

function EditorLine({ number, added = false, children }: SitesEditorLineProps) {
  return (
    <span className={cn("relative flex h-5.5", added && "bg-[#86EFAC]/[0.07]")}>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-0.5",
          added ? "bg-[#4ADE80]" : "bg-transparent"
        )}
      />
      <span className="w-10 shrink-0 pr-4 text-right text-[#5B5670] select-none">
        {number}
      </span>
      <span className="whitespace-pre">{children}</span>
    </span>
  );
}

function EditorWindow({ phase, onTypingDone }: SitesEditorWindowProps) {
  const isTyping = phase === "typing";
  const newLineNumber = SITES_EDITOR_LINES.length + 1;

  return (
    <div className="flex w-full flex-col overflow-clip rounded-2xl bg-[#16131D]/95 shadow-[0_2rem_4rem_-1rem_#05020FB3,inset_0_0_0_0.0625rem_#FFFFFF1A,inset_0_0.0625rem_0_#FFFFFF26] backdrop-blur-xl">
      <div className="flex h-10 items-center gap-3 border-b border-white/[0.07] px-4">
        <div aria-hidden="true" className="flex shrink-0 gap-1.5">
          <span className="size-2.5 rounded-full bg-[#FF5F57]/90" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]/90" />
          <span className="size-2.5 rounded-full bg-[#28C840]/90" />
        </div>
        <span className="flex-1 truncate text-center font-sans text-xs text-[#8C86A0]">
          {SITES_EDITOR_REPO}
        </span>
        <span aria-hidden="true" className="w-11 shrink-0" />
      </div>

      <div className="flex min-h-0 flex-1">
        <ul className="hidden w-44 shrink-0 flex-col gap-0.5 border-r border-white/[0.07] px-2 py-3 font-sans text-xs sm:flex">
          {SITES_EDITOR_FILES.map((file) => (
            <li
              className={cn(
                "flex h-6.5 items-center gap-1.5 rounded-md pr-2",
                file.depth > 0 ? "pl-5.5" : "pl-2",
                file.active
                  ? "bg-white/[0.07] text-[#E7E3F0]"
                  : "text-[#8C86A0]"
              )}
              key={`${file.depth}-${file.name}`}
            >
              <HugeiconsIcon
                className={cn(
                  "size-3.5 shrink-0",
                  file.folder ? "text-[#C4B5FD]" : "text-[#5B5670]"
                )}
                icon={file.folder ? Folder01Icon : File01Icon}
              />
              <span className="truncate">{file.name}</span>
            </li>
          ))}
        </ul>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-8.5 border-b border-white/[0.07]">
            {SITES_EDITOR_TABS.map((tab, index) => (
              <span
                className={cn(
                  "flex items-center gap-2 border-r border-white/[0.07] px-3.5 font-mono text-xs whitespace-nowrap",
                  index === 0
                    ? "bg-white/[0.04] text-[#E7E3F0] shadow-[inset_0_0.0625rem_0_#C4B5FD]"
                    : "text-[#8C86A0]"
                )}
                key={tab}
              >
                {tab}
                {index === 0 && isTyping ? (
                  <span className="size-1.5 rounded-full bg-[#E7E3F0]" />
                ) : null}
              </span>
            ))}
          </div>
          <pre className="overflow-x-auto py-3.5 font-mono text-[0.8125rem]/5.5">
            <code className="grid">
              {EDITOR_ROWS.map((row) => (
                <EditorLine key={row.id} number={row.number}>
                  <SitesCodeTokens line={row.line} />
                </EditorLine>
              ))}
              {isTyping ? (
                <TypingLine onDone={onTypingDone} />
              ) : (
                <EditorLine added number={newLineNumber}>
                  <SitesCodeTokens line={SITES_EDITOR_NEW_LINE} />
                </EditorLine>
              )}
              <EditorLine number={newLineNumber + 1}>
                <SitesCodeTokens line={SITES_EDITOR_CLOSING_LINE} />
              </EditorLine>
            </code>
          </pre>
        </div>
      </div>

      <div className="flex h-7 items-center justify-between border-t border-white/[0.07] bg-white/[0.02] px-3 font-sans text-[0.6875rem] text-[#8C86A0]">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon className="size-3" icon={GitBranchIcon} />
            main
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors duration-300",
                phase === "live" ? "bg-[#4ADE80]" : "bg-[#FCD34D]"
              )}
            />
            Notra Sites
          </span>
        </span>
        <span>MDX</span>
      </div>
    </div>
  );
}

function PostStep({ index, title, body }: SitesPostStepProps) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] font-sans text-xs font-medium text-[#1E1E1E] tabular-nums">
        {index + 1}
      </span>
      <span className="flex flex-col pt-0.5">
        <span className="font-sans text-sm/5 font-semibold text-[#1E1E1E]">
          {title}
        </span>
        <span className="font-sans text-[0.8125rem]/5 text-[#6B6B6B]">
          {body}
        </span>
      </span>
    </div>
  );
}

function BrowserWindow({ phase }: SitesHeroPhaseProps) {
  const isLive = phase === "live";

  return (
    <div className="relative flex w-full flex-col overflow-clip rounded-2xl bg-white shadow-[0_2.5rem_5rem_-1.5rem_#05020FCC,0_0_0_0.0625rem_#FFFFFF59]">
      <div className="flex h-10 items-end gap-3 bg-[#F1F0F4] px-3">
        <div aria-hidden="true" className="flex shrink-0 gap-1.5 self-center">
          <span className="size-2.5 rounded-full bg-[#DCDBE0]" />
          <span className="size-2.5 rounded-full bg-[#DCDBE0]" />
          <span className="size-2.5 rounded-full bg-[#DCDBE0]" />
        </div>
        <span className="flex h-8 max-w-56 min-w-0 items-center gap-2 rounded-t-lg bg-white px-3 font-sans text-xs text-[#1E1E1E]">
          <span className="size-3 shrink-0 rounded-[0.2rem] bg-[#16A34A]" />
          <span className="truncate">{SITES_BROWSER_TAB_TITLE}</span>
        </span>
      </div>
      <div className="relative flex h-11 items-center border-b border-[#EFEFEF] px-3">
        <span className="flex h-7.5 min-w-0 flex-1 items-center gap-2 rounded-lg bg-[#F4F4F5] px-3 font-sans text-xs text-[#8A8A8A]">
          <HugeiconsIcon className="size-3 shrink-0" icon={LockIcon} />
          <span className="truncate">
            <span className="text-[#1E1E1E]">{SITES_DOMAIN}</span>
            {SITES_POST_PATH}
          </span>
        </span>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden"
        >
          <div
            className={cn(
              "h-full bg-[#16A34A] ease-out",
              phase === "build"
                ? "w-full opacity-100 transition-[width] duration-[1800ms]"
                : "w-0 opacity-0 transition-opacity duration-300"
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-6 pt-5 sm:px-9">
        <span className="flex items-center gap-2 font-sans text-sm font-semibold text-[#1E1E1E]">
          <span className="size-4 rounded-[0.3rem] bg-[#16A34A]" />
          Acme
        </span>
        <span className="flex gap-4 font-sans text-xs text-[#6B6B6B]">
          <span className="text-[#1E1E1E]">Blog</span>
          <span>Changelog</span>
        </span>
      </div>

      <article
        className={cn(
          "flex flex-col gap-4 px-6 pt-7 pb-8 transition-opacity duration-300 sm:px-9",
          phase === "build" && "opacity-55"
        )}
      >
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-xs text-[#8A8A8A] tabular-nums">
            {SITES_POST.date}
          </span>
          <h2 className="font-sans text-[1.75rem]/8 font-semibold tracking-[-0.02em] text-[#1E1E1E]">
            {SITES_POST.title}
          </h2>
        </div>
        <p className="font-sans text-[0.9375rem]/6 text-[#4A4A4A]">
          {SITES_POST.body}
        </p>
        <div className="flex items-center gap-2.5 rounded-xl border border-[#CDEBD6] bg-[#F0FAF3] px-3.5 py-2.5">
          <HugeiconsIcon
            className="size-4 shrink-0 text-[#16A34A]"
            icon={CheckmarkCircle02Icon}
          />
          <span className="font-sans text-[0.8125rem]/5 text-[#14532D]">
            {SITES_POST.tip}
          </span>
        </div>
        <ol className="flex flex-col pt-1">
          {SITES_POST.steps.map((step, index) => (
            <li key={step.title}>
              <PostStep body={step.body} index={index} title={step.title} />
            </li>
          ))}
          <li aria-hidden={!isLive}>
            <m.div
              animate={
                isLive
                  ? { opacity: 1, y: 0, backgroundColor: "#16A34A00" }
                  : { opacity: 0, y: -6, backgroundColor: "#16A34A1F" }
              }
              className="-mx-2 rounded-lg px-2"
              initial={false}
              transition={{
                opacity: { duration: 0.3, ease: EASE_OUT },
                y: { duration: 0.35, ease: EASE_OUT },
                backgroundColor: isLive
                  ? { delay: 0.6, duration: 1.2 }
                  : { duration: 0 },
              }}
            >
              <PostStep
                body={SITES_POST.newStep.body}
                index={SITES_POST.steps.length}
                title={SITES_POST.newStep.title}
              />
            </m.div>
          </li>
        </ol>
      </article>
    </div>
  );
}

function StatusIcon({ phase }: SitesHeroPhaseProps) {
  if (phase === "live") {
    return <span className="size-2 rounded-full bg-[#16A34A]" />;
  }

  if (phase === "build") {
    return (
      <span className="size-3.5 animate-spin rounded-full border-2 border-[#E4E4E7] border-t-[#16A34A]" />
    );
  }

  return (
    <HugeiconsIcon
      className="size-3.5 text-[#6B6B6B]"
      icon={phase === "push" ? GitCommitIcon : PencilEdit02Icon}
    />
  );
}

function StatusPill({ phase }: SitesHeroPhaseProps) {
  return (
    <m.div
      className="flex h-10 items-center gap-2.5 rounded-full bg-white/95 py-1 pr-4 pl-1.5 shadow-[0_1rem_2.5rem_-0.5rem_#05020F99,0_0_0_0.0625rem_#FFFFFFB3] backdrop-blur"
      layout
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      <m.span
        className={cn(
          "flex size-7 items-center justify-center rounded-full transition-colors duration-300",
          phase === "live" ? "bg-[#EAF6EE]" : "bg-[#F4F4F5]"
        )}
        layout
      >
        <StatusIcon phase={phase} />
      </m.span>
      <AnimatePresence initial={false} mode="popLayout">
        <m.span
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          className="flex items-center gap-2 whitespace-nowrap"
          exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
          initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
          key={phase}
          layout
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          <span
            className={cn(
              "text-[0.8125rem]/4 font-medium text-[#1E1E1E]",
              phase === "push" ? "font-mono text-xs" : "font-sans"
            )}
          >
            {SITES_HERO_STATUS_LABELS[phase]}
          </span>
          {phase === "live" ? (
            <span className="font-mono text-[0.6875rem] text-[#8A8A8A]">
              {SITES_HERO_BUILD_TIME}
            </span>
          ) : null}
        </m.span>
      </AnimatePresence>
    </m.div>
  );
}

export function SitesHeroStage() {
  const { phase, finishTyping } = useHeroPhase();

  return (
    <LazyMotion features={domMax}>
      <StageShell
        className="bg-center lg:px-12 lg:pt-14 lg:pb-14"
        credit={null}
        image={SITES_STAGE_IMAGE}
      >
        <div className="relative mx-auto flex max-w-268 flex-col items-center gap-5 lg:block lg:h-[33rem]">
          <div className="w-full lg:absolute lg:top-0 lg:left-0 lg:w-[58%]">
            <EditorWindow onTypingDone={finishTyping} phase={phase} />
          </div>
          <div className="relative z-20 lg:absolute lg:bottom-0 lg:left-[30%]">
            <StatusPill phase={phase} />
          </div>
          <div className="relative z-10 w-full lg:absolute lg:top-12 lg:right-0 lg:w-[46%]">
            <BrowserWindow phase={phase} />
          </div>
        </div>
      </StageShell>
    </LazyMotion>
  );
}
