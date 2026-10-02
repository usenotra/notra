import { Link } from "@tanstack/react-router";
import type { ChangelogRowProps } from "~types/changelog";

import { formatChangelogDate } from "@/utils/format-date";

export function ChangelogRow({ item }: ChangelogRowProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
      <div className="flex shrink-0 items-baseline gap-3 pt-0 sm:w-37.5 sm:flex-col sm:gap-1 sm:pt-6">
        <span className="font-display text-[0.9375rem] leading-[1.33] font-medium tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
          {formatChangelogDate(item.date)}
        </span>
      </div>
      <Link
        className="group flex grow flex-col justify-center gap-2 rounded-[1.25rem] bg-white px-6 py-6 ring-1 ring-[#ECECEC] transition-colors hover:ring-[#1E1E1E1A] sm:px-7 dark:bg-white/[0.03] dark:ring-white/10 dark:hover:ring-white/20"
        to={item.href}
      >
        <h3 className="font-display group-hover:text-primary text-xl leading-[1.3] font-semibold tracking-[-0.015em] text-[#1E1E1E] transition-colors dark:text-white">
          {item.title}
        </h3>
        <p className="font-sans text-sm leading-[1.5] tracking-[-0.005em] text-[#1E1E1EBF] dark:text-white/70">
          {item.description}
        </p>
      </Link>
    </div>
  );
}
