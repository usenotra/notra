"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";

import { HeroDither } from "@/components/landing/hero-dither";
import {
  MCP_USE_CASES_ALL_CATEGORY_ID,
  MCP_USE_CASES_EYEBROW,
  MCP_USE_CASES_EYEBROW_ICON,
  MCP_USE_CASES_PRIMARY_CTA,
  MCP_USE_CASES_SECONDARY_CTA,
  MCP_USE_CASES_SHARE_HREF,
  MCP_USE_CASES_SUBHEAD,
} from "@/constants/mcp-use-cases";
import type { McpUseCasesBrowserProps } from "@/types/mcp-use-cases";
import { filterMcpUseCases } from "@/utils/mcp-use-cases";

import { McpUseCaseCard } from "./use-case-card";
import { McpUseCaseCategoryPill } from "./use-case-category-pill";

const PILL_BASE =
  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-1.75 font-medium font-sans text-[0.875rem] leading-[1.29] tracking-[-0.01em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";
const PILL_ACTIVE = "bg-[#1E1E1E] text-white dark:bg-white dark:text-[#1E1E1E]";
const PILL_INACTIVE =
  "bg-white text-[#1E1E1EA6] [box-shadow:#ECECEC_0_0_0_0.0625rem] hover:text-[#1E1E1E] dark:bg-white/[0.04] dark:text-white/60 dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem] dark:hover:text-white";

export function McpUseCasesBrowser({
  useCases,
  categories,
}: McpUseCasesBrowserProps) {
  const [activeCategory, setActiveCategory] = useQueryState(
    "category",
    parseAsString
      .withDefault(MCP_USE_CASES_ALL_CATEGORY_ID)
      .withOptions({ clearOnDefault: true })
  );

  const filtered = filterMcpUseCases(useCases, activeCategory);

  return (
    <div className="flex w-full flex-col items-center">
      <section className="w-full px-6 pt-6 antialiased [font-synthesis:none]">
        <div className="relative isolate overflow-clip rounded-3xl bg-[#EFEAFA] dark:bg-[#2a2140]">
          <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
            <HeroDither />
          </div>
          <div className="relative flex w-full flex-col items-center gap-6 px-6 pt-20 pb-16 lg:pt-24">
            <McpUseCaseCategoryPill
              icon={MCP_USE_CASES_EYEBROW_ICON}
              label={MCP_USE_CASES_EYEBROW}
            />
            <h1 className="font-display max-w-[47rem] text-center text-[2.5rem] leading-[1.12] font-medium tracking-[-0.015em] text-balance text-[#1E1E1E] sm:text-[3.25rem] lg:text-[4rem] dark:text-white">
              Real workflows built with{" "}
              <span className="text-primary">Notra MCP</span>.
            </h1>
            <p className="max-w-[36rem] text-center font-sans text-[1.0625rem] leading-[1.42] font-medium tracking-[-0.005em] text-balance text-[#1E1E1EBF] sm:text-[1.1875rem] dark:text-white/70">
              {MCP_USE_CASES_SUBHEAD}
            </p>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
              <CtaButton
                className="w-full sm:w-auto"
                nativeButton={false}
                render={<Link href="/mcp" />}
                variant="primary"
              >
                {MCP_USE_CASES_PRIMARY_CTA}
              </CtaButton>
              <CtaButton
                className="w-full sm:w-auto"
                nativeButton={false}
                render={<Link href={MCP_USE_CASES_SHARE_HREF} />}
                variant="light"
              >
                {MCP_USE_CASES_SECONDARY_CTA}
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-live="polite"
        className="flex w-[min(100%-3rem,80rem)] flex-col gap-6 pt-10"
      >
        <div
          aria-label="Filter use cases by category"
          className="flex w-full [scrollbar-width:none] items-center gap-2.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
          role="group"
        >
          {categories.map((category) => {
            const isActive = category.id === activeCategory;
            return (
              <button
                aria-pressed={isActive}
                className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_INACTIVE}`}
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                type="button"
              >
                {category.icon ? (
                  <HugeiconsIcon className="size-3.5" icon={category.icon} />
                ) : null}
                {category.label}
              </button>
            );
          })}
        </div>
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((entry) => (
              <McpUseCaseCard key={entry.slug} entry={entry} />
            ))}
          </div>
        ) : (
          <p className="py-14 text-center font-sans text-[0.9375rem] text-[#1E1E1E80] dark:text-white/50">
            No use cases in this category yet.
          </p>
        )}
      </section>
    </div>
  );
}
