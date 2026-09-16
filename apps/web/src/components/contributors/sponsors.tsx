import Link from "next/link";
import type { SponsorsProps } from "~types/sponsors";

import { SPONSORS_CAPTION } from "@/constants/contributors";

export function Sponsors({ sponsors }: SponsorsProps) {
  if (sponsors.length === 0) {
    return null;
  }

  return (
    <section className="flex w-full flex-col items-center gap-10 px-6 pt-20 antialiased sm:px-12 lg:px-20 lg:pt-35">
      <p className="text-center font-sans text-base/6 font-medium tracking-[-0.01em] text-[#6A6B70] dark:text-white/60">
        {SPONSORS_CAPTION}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 sm:gap-x-16 lg:gap-x-24">
        {sponsors.map((sponsor) => (
          <Link
            className="flex items-center gap-2.5 text-[#1E1E1E] transition-opacity hover:opacity-70 dark:text-white"
            href={sponsor.url}
            key={sponsor.name}
            rel="noopener noreferrer"
            target="_blank"
          >
            <sponsor.logo aria-hidden="true" className="h-7 w-auto" />
            <span className="font-display text-2xl/8 font-semibold tracking-[-0.02em]">
              {sponsor.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
