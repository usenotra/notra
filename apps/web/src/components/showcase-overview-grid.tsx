import { Link } from "@tanstack/react-router";
import type { ShowcaseOverviewGridProps } from "~types/showcase";

export function ShowcaseOverviewGrid({ companies }: ShowcaseOverviewGridProps) {
  return (
    <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {companies.map((company) => (
        <Link
          className="group focus-visible:outline-ring flex h-full flex-col gap-3 rounded-[1.25rem] border border-[#ECECEC] bg-white p-6 transition-colors hover:border-[#1E1E1E1A] focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-white/10 dark:bg-white/[0.03]"
          params={{ name: company.slug }}
          to="/changelog/$name"
          key={company.slug}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F3FA] ring-1 ring-[#1E1E1E0D] dark:bg-white/5 dark:ring-white/10">
                {company.icon}
              </span>
              <span className="font-display group-hover:text-primary text-lg font-semibold tracking-[-0.015em] text-[#1E1E1E] transition-colors dark:text-white">
                {company.name}
              </span>
            </div>
            <span className="shrink-0 rounded-full px-2.5 py-0.5 font-sans text-xs text-[#1E1E1E80] ring-1 ring-[#1E1E1E1A] dark:text-white/50 dark:ring-white/15">
              {company.entryCount} {company.entryCount === 1 ? "Post" : "Posts"}
            </span>
          </div>
          <p className="line-clamp-3 font-sans text-sm leading-[1.5] text-[#1E1E1EBF] dark:text-white/60">
            {company.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
