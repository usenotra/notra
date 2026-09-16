import { ArrowLeft01Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import Link from "next/link";

import {
  MCP_USE_CASES_BUILD_YOUR_OWN_URL,
  MCP_USE_CASES_PATH,
} from "@/constants/mcp-use-cases";
import type { McpUseCaseDetailViewProps } from "@/types/mcp-use-cases";
import { getMcpUseCaseCategory } from "@/utils/mcp-use-cases";

import { McpUseCaseCard } from "./use-case-card";
import { McpUseCaseCategoryPill } from "./use-case-category-pill";
import { McpUseCasePromptBlock } from "./use-case-prompt-block";

export function McpUseCaseDetailView({
  entry,
  related,
}: McpUseCaseDetailViewProps) {
  const category = getMcpUseCaseCategory(entry.category);

  return (
    <div className="flex w-full flex-col items-center pb-14">
      <div className="flex w-[min(100%-3rem,64rem)] flex-col gap-10 pt-24 lg:pt-28">
        <Link
          className="inline-flex w-max cursor-pointer items-center gap-1.5 font-sans text-[0.875rem] leading-[1.29] font-medium whitespace-nowrap text-[#1E1E1E80] transition-colors hover:text-[#1E1E1E] dark:text-white/50 dark:hover:text-white"
          href={MCP_USE_CASES_PATH}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          <span>All use cases</span>
        </Link>

        <header className="flex flex-col items-center gap-5 text-center">
          <McpUseCaseCategoryPill icon={category.icon} label={category.label} />
          <h1 className="font-display max-w-[46rem] text-[2.5rem] leading-[1.08] font-medium tracking-[-0.015em] text-balance text-[#1E1E1E] sm:text-[3.25rem] lg:text-[4rem] lg:leading-[1.12] dark:text-white">
            {entry.title}
          </h1>
          {entry.author ? (
            <p className="font-sans text-[0.9375rem] leading-[1.33] text-[#1E1E1EA6] dark:text-white/60">
              By{" "}
              {entry.author.url ? (
                <a
                  className="font-medium text-[#1E1E1E] hover:underline dark:text-white"
                  href={entry.author.url}
                  rel="noopener"
                  target="_blank"
                >
                  {entry.author.name}
                </a>
              ) : (
                <span className="font-medium text-[#1E1E1E] dark:text-white">
                  {entry.author.name}
                </span>
              )}
            </p>
          ) : null}
          <p className="max-w-[36rem] font-sans text-[1.0625rem] leading-[1.42] font-medium tracking-[-0.005em] text-balance text-[#1E1E1EBF] sm:text-[1.1875rem] dark:text-white/70">
            {entry.tagline}
          </p>
          <div className="flex w-full flex-col items-stretch gap-3 pt-1 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <CtaButton
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<Link href="/mcp" />}
              variant="primary"
            >
              Connect Notra MCP
            </CtaButton>
            <CtaButton
              className="w-full sm:w-auto"
              nativeButton={false}
              render={
                <a
                  href={MCP_USE_CASES_BUILD_YOUR_OWN_URL}
                  rel="noopener"
                  target="_blank"
                />
              }
              variant="light"
            >
              Build your own workflow
              <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
            </CtaButton>
          </div>
        </header>

        <McpUseCasePromptBlock entry={entry} />

        <section className="mx-auto flex w-full max-w-[44rem] flex-col gap-6 pt-6">
          <h2 className="font-display text-center text-[2rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-[#1E1E1E] md:text-[2.5rem]/12 dark:text-white">
            What this use case can do for you
          </h2>
          <div className="flex flex-col gap-5">
            {entry.body.map((paragraph) => (
              <p
                className="font-sans text-[1.0625rem] leading-[1.6] tracking-[-0.005em] text-[#1E1E1EBF] dark:text-white/70"
                key={paragraph}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {related.length > 0 ? (
          <section className="flex flex-col gap-7 pt-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-sans text-[1.75rem] leading-[1.21] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
                Related use cases
              </h2>
              <Link
                className="text-primary flex shrink-0 cursor-pointer items-center gap-1 font-sans text-[0.9375rem] leading-[1.25] font-medium"
                href={MCP_USE_CASES_PATH}
              >
                View all
                <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => (
                <McpUseCaseCard key={entry.slug} entry={entry} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
