import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import Link from "next/link";

import { HeroDither } from "@/components/landing/hero-dither";
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
      <section className="w-full px-6 pt-6 antialiased [font-synthesis:none]">
        <div className="relative isolate overflow-clip rounded-3xl bg-[#EFEAFA] dark:bg-[#2a2140]">
          <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
            <HeroDither />
          </div>
          <div className="relative flex w-full flex-col items-center gap-6 px-6 pt-20 pb-16 lg:pt-24">
            <McpUseCaseCategoryPill
              icon={category.icon}
              label={category.label}
            />
            <h1 className="font-display max-w-[47rem] text-center text-[2.5rem] leading-[1.12] font-medium tracking-[-0.015em] text-balance text-[#1E1E1E] sm:text-[3.25rem] lg:text-[4rem] dark:text-white">
              {entry.title}
            </h1>
            {entry.author ? (
              <p className="-mt-2 font-sans text-[0.9375rem] leading-[1.33] text-[#1E1E1EA6] dark:text-white/60">
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
            <p className="max-w-[36rem] text-center font-sans text-[1.0625rem] leading-[1.42] font-medium tracking-[-0.005em] text-balance text-[#1E1E1EBF] sm:text-[1.1875rem] dark:text-white/70">
              {entry.tagline}
            </p>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
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
          </div>
        </div>
      </section>

      <div className="flex w-[min(100%-3rem,64rem)] flex-col gap-14 pt-10">
        <McpUseCasePromptBlock entry={entry} />

        <section className="mx-auto flex w-full max-w-[44rem] flex-col gap-6">
          <h2 className="font-display text-[2rem] leading-[1.15] font-medium tracking-[-0.02em] text-balance text-[#1E1E1E] md:text-[2.5rem]/12 dark:text-white">
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
          <section className="flex flex-col gap-7">
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
              {related.map((item) => (
                <McpUseCaseCard entry={item} key={item.slug} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
