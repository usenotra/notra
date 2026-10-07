import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { m, useReducedMotion } from "motion/react";

import {
  CRAWLER_CATEGORY_COPY,
  IP_CHECKER_MOTION,
} from "@/constants/ip-checker";
import { formatListDate } from "@/lib/ip-checker/format";
import type { IpCheckResultCardProps } from "@/types/ip-checker";

import { CrawlerAgentTag } from "./crawler-agent-tag";

const cardClass =
  "flex flex-col gap-4 rounded-2xl border border-[#1E1E1E14] bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.03]";
const metaClass =
  "font-sans text-[0.8125rem]/5 text-[#1E1E1E99] dark:text-white/50";
const rowCellClass =
  "flex items-center [li:not(:last-child)>&]:border-b [li:not(:last-child)>&]:border-[#1E1E1E0D] dark:[li:not(:last-child)>&]:border-white/10";
const monoClass = "font-mono text-[0.8125rem]/5 text-[#1E1E1E] dark:text-white";
const listButtonClass =
  "inline-flex h-9 shrink-0 items-center gap-1 self-start rounded-full border border-[#1E1E1E14] bg-white px-3.5 font-sans text-[0.8125rem]/5 font-medium text-[#1E1E1E] transition-colors hover:border-[#8B5CF6] hover:text-[#8B5CF6] dark:border-white/12 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#A78BFA] dark:hover:text-[#A78BFA]";

export function IpCheckResultCard({ result }: IpCheckResultCardProps) {
  const reduceMotion = useReducedMotion();
  const cardMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: IP_CHECKER_MOTION.enter },
        exit: { opacity: 0, transition: IP_CHECKER_MOTION.exit },
      };

  const coverage =
    result.listsUnavailable.length > 0 ? (
      <p className={metaClass}>
        Checked {result.listsChecked} of {result.listsTotal} vendor lists. Could
        not reach {result.listsUnavailable.join(", ")} right now, so this check
        is incomplete.
      </p>
    ) : null;
  const incomplete = result.listsUnavailable.length > 0;

  if (result.easterEgg) {
    return (
      <m.div aria-live="polite" className={cardClass} {...cardMotion}>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#1E1E1E14] bg-[#F7F5FB] dark:border-white/10 dark:bg-white/[0.06]">
            <EngineIcon
              className="size-5"
              engine={result.easterEgg.iconEngine}
            />
          </span>
          <h3 className="font-display grow text-[1.125rem]/6 font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
            {result.easterEgg.title}
          </h3>
          <span className={`${monoClass} hidden shrink-0 sm:inline`}>
            {result.ip}
          </span>
        </div>
        <p className="font-sans text-[0.875rem]/5.5 text-pretty text-[#1E1E1EBF] dark:text-white/70">
          {result.easterEgg.body}
        </p>
      </m.div>
    );
  }

  if (result.matches.length === 0) {
    return (
      <m.div aria-live="polite" className={cardClass} {...cardMotion}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-display text-[1.125rem]/6 font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
            {incomplete
              ? "Not in any AI crawler range we could check"
              : "Not in any published AI crawler range"}
          </h3>
          <span className={monoClass}>{result.ip}</span>
        </div>
        <p className="font-sans text-[0.875rem]/5.5 text-pretty text-[#1E1E1EBF] dark:text-white/70">
          None of the {result.listsChecked} vendor lists we reached include this
          address. It can still be a bot, because many agents fetch from
          ordinary cloud or residential addresses, and some spoof a crawler user
          agent.
        </p>
        {coverage}
      </m.div>
    );
  }

  return (
    <m.div aria-live="polite" className="flex flex-col gap-3" {...cardMotion}>
      {result.matches.map((match) => (
        <div className={cardClass} key={match.sourceId}>
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#1E1E1E14] bg-[#F7F5FB] dark:border-white/10 dark:bg-white/[0.06]">
              <EngineIcon className="size-5" engine={match.iconEngine} />
            </span>
            <div className="flex min-w-0 grow flex-col">
              <h3 className="font-display text-[1.125rem]/6 font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
                {match.vendor}
              </h3>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className={monoClass}>{match.range}</span>
                <span className={metaClass}>
                  Updated {formatListDate(match.listUpdatedAt)}
                </span>
              </p>
            </div>
            <a
              className={listButtonClass}
              href={match.listUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Official list
              <HugeiconsIcon className="size-3.5" icon={ArrowUpRight01Icon} />
            </a>
          </div>

          {match.agents.length > 1 ? (
            <p className={metaClass}>
              {match.vendor} publishes one range list for all{" "}
              {match.agents.length} crawlers, so the address alone cannot tell
              them apart. The user agent on the same log line does.
            </p>
          ) : null}

          <ul className="grid grid-cols-1 border-t border-[#1E1E1E0D] sm:grid-cols-[auto_1fr] dark:border-white/10">
            {match.agents.map((agent) => (
              <li className="contents" key={agent.name}>
                <span className={`${rowCellClass} pt-2.5 sm:py-2.5 sm:pr-4`}>
                  <CrawlerAgentTag agent={agent} />
                </span>
                <span
                  className={`${rowCellClass} pb-2.5 font-sans text-[0.875rem]/5.5 text-[#1E1E1EBF] sm:py-2.5 dark:text-white/70`}
                >
                  {CRAWLER_CATEGORY_COPY[agent.category].usage}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {coverage}
    </m.div>
  );
}
