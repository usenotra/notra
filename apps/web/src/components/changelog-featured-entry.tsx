import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ctaButtonVariants } from "@notra/ui/components/shared/cta-button";
import { cn } from "@notra/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ChangelogFeaturedEntryProps } from "~types/changelog";

import { formatChangelogDate } from "@/utils/format-date";

export function ChangelogFeaturedEntry({
  item,
  label = "Latest",
}: ChangelogFeaturedEntryProps) {
  return (
    <Link
      className="group block w-full overflow-clip rounded-3xl bg-[#C8B2EE40] ring-1 ring-[#1E1E1E1A] transition-colors hover:ring-[#1E1E1E33] dark:bg-white/[0.03] dark:ring-white/10 dark:hover:ring-white/20"
      to={item.href}
    >
      <div className="flex flex-col gap-6 px-6 pt-8 pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-12 sm:px-10 sm:pt-10 sm:pb-10">
        <div className="flex flex-col gap-3 sm:max-w-[36rem]">
          <div className="flex items-center gap-2.5">
            <span className="text-primary font-sans text-sm font-semibold">
              {label}
            </span>
            <span className="font-sans text-sm text-[#1E1E1E80] dark:text-white/40">
              {formatChangelogDate(item.date)}
            </span>
          </div>
          <h2 className="font-display group-hover:text-primary text-2xl font-semibold tracking-[-0.02em] text-[#1E1E1E] transition-colors sm:text-4xl dark:text-white">
            {item.title}
          </h2>
          <p className="font-sans text-base leading-[1.6] tracking-[-0.005em] text-[#1E1E1EBF] dark:text-white/70">
            {item.description}
          </p>
        </div>
        {/* Styled like a CtaButton, but a span: the whole card is the link. */}
        <span
          className={cn(
            ctaButtonVariants({ size: "sm" }),
            "font-display self-start px-6 font-semibold sm:self-auto"
          )}
        >
          Read the post
          <HugeiconsIcon className="size-4" icon={ArrowRight01Icon} />
        </span>
      </div>
    </Link>
  );
}
