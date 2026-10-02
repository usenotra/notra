import HtmlExportTool from "@/components/html-to-figma/html-export-tool";
import { MarketingHeroWash } from "@/components/marketing-hero-wash";
import type { HtmlExportShellProps } from "@/types/html-to-figma";

export default function HtmlExportShell({
  target,
  title,
  subtitle,
}: HtmlExportShellProps) {
  return (
    <div className="flex w-full flex-col items-center gap-10 pb-24 antialiased [font-synthesis:none]">
      <MarketingHeroWash subtitle={subtitle} title={title} />

      <section className="mx-auto w-[min(100%-2rem,72rem)] rounded-3xl border border-[#1E1E1E14] bg-[linear-gradient(in_oklab_180deg,oklab(95.1%_0.011_-0.018_/_15%)_0%,oklab(93.7%_0.019_-0.031_/_75%)_100%)] p-4 sm:p-6 dark:border-white/10 dark:bg-white/[0.02] dark:bg-none">
        <HtmlExportTool target={target} />
      </section>
    </div>
  );
}
