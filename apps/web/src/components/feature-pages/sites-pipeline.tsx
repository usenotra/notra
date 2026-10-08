import { Tick02Icon, Undo02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Github } from "@notra/ui/components/ui/svgs/github";
import { cn } from "@notra/ui/lib/utils";
import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react";

import { SitesCodeTokens } from "@/components/feature-pages/sites-code-tokens";
import {
  SITES_DEPLOYMENTS,
  SITES_DOMAIN,
  SITES_PIPELINE_BUILD_LINES,
  SITES_PIPELINE_BUILD_TIME,
  SITES_PIPELINE_PUSH_LINES,
} from "@/constants/feature-pages/sites";
import type { SitesPipelineCardProps } from "@/types/sites-page";

const PUSH_ROWS = SITES_PIPELINE_PUSH_LINES.map((line, index) => ({
  id: `push-${index}`,
  line,
}));

const CARD_CLASS =
  "flex min-w-0 flex-1 flex-col overflow-clip rounded-2xl border border-[#ECECEC] bg-white shadow-[0_0.0625rem_0.125rem_#0A0D1408] dark:border-white/10 dark:bg-white/[0.03]";

function PipelineCard({ step, title, meta, children }: SitesPipelineCardProps) {
  return (
    <div className={CARD_CLASS}>
      <div className="flex h-12 items-center justify-between gap-3 border-b border-[#F0F0F0] px-4 dark:border-white/8">
        <span className="flex items-center gap-2.5">
          <span className="flex size-5 items-center justify-center rounded-full bg-[#F1ECFB] font-mono text-[0.6875rem] font-medium text-[#6D45D9] dark:bg-[#8B5CF6]/20 dark:text-[#C4B5FD]">
            {step}
          </span>
          <span className="font-sans text-sm font-semibold text-[#1E1E1E] dark:text-white">
            {title}
          </span>
        </span>
        {meta}
      </div>
      {children}
    </div>
  );
}

function Connector() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center max-lg:h-8 max-lg:rotate-90 lg:w-8"
    >
      <LazyMotion features={domAnimation}>
        <svg className="h-2 w-8 overflow-visible" viewBox="0 0 32 8">
          <m.line
            animate={reduceMotion ? undefined : { strokeDashoffset: [0, -12] }}
            stroke="#B39CE4"
            strokeDasharray="4 8"
            strokeLinecap="round"
            strokeWidth="2"
            transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
            x1="0"
            x2="32"
            y1="4"
            y2="4"
          />
        </svg>
      </LazyMotion>
    </div>
  );
}

export function SitesPipeline() {
  return (
    <div className="flex flex-col items-stretch lg:flex-row">
      <PipelineCard
        meta={<Github aria-hidden="true" className="size-4" />}
        step="1"
        title="You push"
      >
        <pre className="flex-1 bg-[#18151F] px-4 py-4 font-mono text-xs/5.5">
          {PUSH_ROWS.map((row) => (
            <span className="block min-h-5.5" key={row.id}>
              <SitesCodeTokens line={row.line} />
            </span>
          ))}
        </pre>
      </PipelineCard>

      <Connector />

      <PipelineCard
        meta={
          <span className="rounded-md border border-[#ECECEC] px-1.5 py-0.5 font-mono text-[0.6875rem] text-[#6B6B6B] dark:border-white/10 dark:text-white/60">
            {SITES_PIPELINE_BUILD_TIME}
          </span>
        }
        step="2"
        title="Notra builds"
      >
        <ul className="flex flex-1 flex-col gap-2.5 px-4 py-4">
          {SITES_PIPELINE_BUILD_LINES.map((line) => (
            <li
              className="flex items-center gap-2.5 font-sans text-[0.8125rem] text-[#4A4A4A] dark:text-white/70"
              key={line.label}
            >
              <HugeiconsIcon
                className="size-3.5 shrink-0 text-[#2F7D4B] dark:text-[#6FCF8F]"
                icon={Tick02Icon}
              />
              <span className="min-w-0 flex-1 truncate">{line.label}</span>
              <span className="shrink-0 font-mono text-[0.6875rem] text-[#A3A3A3] tabular-nums dark:text-white/40">
                {line.time}
              </span>
            </li>
          ))}
        </ul>
      </PipelineCard>

      <Connector />

      <PipelineCard
        meta={
          <span className="font-mono text-[0.6875rem] text-[#6B6B6B] dark:text-white/60">
            {SITES_DOMAIN}
          </span>
        }
        step="3"
        title="It's live"
      >
        <ul className="flex flex-1 flex-col py-1.5">
          {SITES_DEPLOYMENTS.map((deployment) => (
            <li
              className="flex items-center gap-3 px-4 py-2.25"
              key={deployment.commit}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  deployment.live
                    ? "bg-[#4FAE73] shadow-[0_0_0_0.1875rem_#4FAE7326]"
                    : "bg-[#D4D4D8] dark:bg-white/20"
                )}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-sans text-[0.8125rem]/5 font-medium text-[#1E1E1E] dark:text-white">
                  {deployment.message}
                </span>
                <span className="font-mono text-[0.6875rem]/4 text-[#8A8A8A] dark:text-white/50">
                  {deployment.commit} · {deployment.age}
                </span>
              </span>
              {deployment.live ? (
                <span className="rounded-md border border-[#CBE8D4] bg-[#EAF6EE] px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium text-[#2F7D4B] dark:border-[#4FAE73]/30 dark:bg-[#4FAE73]/10 dark:text-[#6FCF8F]">
                  Live
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-md border border-[#ECECEC] px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium text-[#6B6B6B] dark:border-white/10 dark:text-white/60">
                  <HugeiconsIcon className="size-3" icon={Undo02Icon} />
                  Restore
                </span>
              )}
            </li>
          ))}
        </ul>
      </PipelineCard>
    </div>
  );
}
