import type { ContributorsSectionHeaderProps } from "~types/contributors";

export function ContributorsSectionHeader({
  title,
  description,
}: ContributorsSectionHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-4">
      <h2 className="font-display text-center text-[2rem] leading-[1.15] font-medium tracking-[-0.02em] text-black sm:text-[2.25rem] lg:text-[3.0625rem]/14 dark:text-white">
        {title}
      </h2>
      <p className="font-display w-full max-w-206.25 text-center text-lg/7 font-medium tracking-[-0.01em] text-balance text-[#1E1E1EBF] sm:text-xl/7.5 dark:text-white/70">
        {description}
      </p>
    </header>
  );
}
