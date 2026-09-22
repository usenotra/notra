import Image from "next/image";
import Link from "next/link";
import type { ContributorsGridProps } from "~types/contributors";

import { formatContributionCount } from "@/utils/github";

export function ContributorsGrid({ contributors }: ContributorsGridProps) {
  if (contributors.length === 0) {
    return (
      <div className="py-8 text-center font-sans text-sm text-[#6A6B70] dark:text-white/60">
        Unable to load contributors right now. Try again later.
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-320 flex-wrap justify-center gap-x-5 gap-y-6">
      {contributors.map((contributor) => {
        const count = formatContributionCount(contributor.contributions);
        const contributionsLabel = `${count} contribution${
          contributor.contributions === 1 ? "" : "s"
        }`;
        return (
          <Link
            aria-label={`${contributor.login}, ${contributionsLabel}`}
            className="group flex w-[8.875rem] flex-col items-center gap-2.5 rounded-[0.8125rem] px-1 py-4 transition-colors hover:bg-[#F3EEFB] dark:hover:bg-white/5"
            href={contributor.html_url}
            key={contributor.id}
            rel="noopener noreferrer"
            target="_blank"
            title={`${contributor.login}, ${contributionsLabel}`}
          >
            <Image
              alt={`Avatar of ${contributor.login}`}
              className="duration-normal size-16 rounded-full ring-1 ring-[#ECECEC] transition-transform group-hover:scale-105 dark:ring-white/10"
              height={128}
              src={contributor.avatar_url}
              width={128}
            />
            <span className="flex flex-col items-center gap-0.5">
              <span className="max-w-full truncate font-sans text-sm/5 font-medium tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
                {contributor.login}
              </span>
              <span className="font-sans text-[0.8125rem]/4.5 text-[#6A6B70] dark:text-white/60">
                {contributionsLabel}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
