import { ArrowRight02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { HeroDither } from "@/components/landing/hero-dither";
import type { IntegrationsViewProps } from "@/types/integrations";

import { FeaturedIntegrationCard } from "./featured-integration-card";
import { IntegrationCard } from "./integration-card";

const PILL_BASE =
  "flex shrink-0 cursor-pointer items-center rounded-full px-4 py-1.75 font-medium font-sans text-[0.875rem] leading-[1.29] tracking-[-0.01em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary";
const PILL_ACTIVE = "bg-[#1E1E1E] text-white dark:bg-white dark:text-[#1E1E1E]";
const PILL_INACTIVE =
  "bg-white text-[#1E1E1EA6] [box-shadow:#ECECEC_0_0_0_0.0625rem] hover:text-[#1E1E1E] dark:bg-white/[0.04] dark:text-white/60 dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem] dark:hover:text-white";

export function IntegrationsView({
  integrations,
  categories,
  query,
  activeCategory,
  filtered,
  featured,
  showFeatured,
  onQueryChange,
  onCategoryChange,
}: IntegrationsViewProps) {
  return (
    <div className="flex w-full flex-col items-center">
      <section className="w-full px-6 pt-6 antialiased [font-synthesis:none]">
        <div className="relative isolate overflow-clip rounded-3xl bg-[#EFEAFA] dark:bg-[#2a2140]">
          <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
            <HeroDither />
          </div>
          <div className="relative flex w-full flex-col items-center gap-6 px-6 pt-20 pb-16 lg:pt-24">
            <h1 className="font-display max-w-[47rem] text-center text-[2.5rem] leading-[1.12] font-medium tracking-[-0.015em] text-[#1E1E1E] sm:text-[3.25rem] lg:text-[4rem] dark:text-white">
              Every tool you ship with,{" "}
              <span className="text-primary">plugged</span> into Notra.
            </h1>
            <p className="max-w-[36rem] text-center font-sans text-[1.0625rem] leading-[1.42] font-medium tracking-[-0.005em] text-[#1E1E1EBF] sm:text-[1.1875rem] dark:text-white/70">
              Browse integrations built by the community and reviewed by us.
              Connect any of them to your workspace in one click.
            </p>
            <div className="mt-2 flex w-full max-w-[35rem] items-center justify-between gap-2.5 rounded-full bg-white py-2.5 pr-2.5 pl-5 [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282814_0_0.0625rem_0.1875rem] dark:bg-white/[0.06] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]">
              <div className="flex grow items-center gap-2.5">
                <HugeiconsIcon
                  className="shrink-0 text-[#1E1E1E80] dark:text-white/50"
                  icon={Search01Icon}
                  size={18}
                />
                <input
                  aria-label="Search integrations"
                  className="w-full bg-transparent font-sans text-[1rem] leading-[1.25] tracking-[-0.01em] text-[#1E1E1E] outline-none placeholder:text-[#1E1E1E66] dark:text-white dark:placeholder:text-white/40"
                  onChange={
                    onQueryChange
                      ? (event) => onQueryChange(event.target.value)
                      : undefined
                  }
                  placeholder="Search integrations…"
                  readOnly={!onQueryChange}
                  type="search"
                  value={query}
                />
              </div>
              <a
                className="cta-gradient-primary-flat flex shrink-0 cursor-pointer items-center justify-center rounded-full px-4.5 py-2 font-sans text-[0.875rem] leading-[1.29] font-semibold text-white"
                href="#all-integrations"
              >
                Browse all
              </a>
            </div>
            <div className="flex w-full max-w-[45rem] [scrollbar-width:none] items-center gap-2.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => {
                const isActive = category.id === activeCategory;
                return (
                  <button
                    className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_INACTIVE}`}
                    key={category.id}
                    onClick={
                      onCategoryChange
                        ? () => onCategoryChange(category.id)
                        : undefined
                    }
                    type="button"
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="flex w-[min(100%-3rem,80rem)] flex-col gap-14 pt-14">
        {showFeatured ? (
          <section className="flex flex-col gap-7">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-2">
                <span className="font-sans text-[1.125rem] leading-[1.22] font-medium tracking-[-0.02em] text-[#1E1E1E80] dark:text-white/50">
                  Featured this month
                </span>
                <h2 className="font-sans text-[2.125rem] leading-[1.18] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
                  Editor's picks
                </h2>
              </div>
              <a
                className="text-primary flex shrink-0 cursor-pointer items-center gap-1 font-sans text-[1rem] leading-[1.25] font-medium"
                href="#all-integrations"
              >
                View all {integrations.length}
                <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
              </a>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {featured.map((integration) => (
                <FeaturedIntegrationCard
                  integration={integration}
                  key={integration.id}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section
          className="flex scroll-mt-24 flex-col gap-7"
          id="all-integrations"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="font-sans text-[1.125rem] leading-[1.22] font-medium tracking-[-0.02em] text-[#1E1E1E80] dark:text-white/50">
                Reviewed and live
              </span>
              <h2 className="font-sans text-[2.125rem] leading-[1.18] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white">
                All integrations
              </h2>
            </div>
            <span className="shrink-0 font-sans text-[0.875rem] leading-[1.29] text-[#1E1E1E80] dark:text-white/50">
              Sorted A–Z
            </span>
          </div>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((integration) => (
                <IntegrationCard
                  integration={integration}
                  key={integration.id}
                />
              ))}
            </div>
          ) : (
            <p className="py-14 text-center font-sans text-[0.9375rem] text-[#1E1E1E80] dark:text-white/50">
              No integrations match your search yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
