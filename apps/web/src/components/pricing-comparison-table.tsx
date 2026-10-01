"use client";

import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";
import { Fragment } from "react";

import { PRICING_COMPARISON_PLANS } from "@/constants/pricing-comparison";
import type { PricingCellValueProps } from "@/types/pricing-comparison";
import { COMPARISON_FEATURES } from "@/utils/constants";

function CellValue({ value }: PricingCellValueProps) {
  if (typeof value === "boolean") {
    return value ? (
      <HugeiconsIcon
        className="text-primary mx-auto size-5"
        icon={Tick02Icon}
      />
    ) : (
      <HugeiconsIcon
        className="mx-auto size-5 text-[#1E1E1E40] dark:text-white/25"
        icon={Cancel01Icon}
      />
    );
  }
  return (
    <span className="font-sans text-sm font-normal text-[#1E1E1EBF] dark:text-white/70">
      {value}
    </span>
  );
}

function DesktopComparisonTable() {
  return (
    <div className="hidden w-full max-w-[69rem] overflow-hidden rounded-3xl border border-[#1E1E1E1A] md:block dark:border-white/10">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-[#C8B2EE40] dark:bg-white/[0.05]">
            <th
              className="font-display px-6 py-5 text-base font-medium tracking-[-0.01em] text-[#1E1E1E] dark:text-white"
              scope="col"
            >
              Feature
            </th>
            {PRICING_COMPARISON_PLANS.map((plan) => (
              <th
                className={cn(
                  "font-display px-6 py-5 text-center text-base font-medium tracking-[-0.01em]",
                  plan.isFeatured
                    ? "text-primary"
                    : "text-[#1E1E1E] dark:text-white"
                )}
                key={plan.key}
                scope="col"
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_FEATURES.map((category) => (
            <Fragment key={`category-${category.category}`}>
              <tr>
                <th
                  className="border-t border-[#1E1E1E14] bg-[#C8B2EE1F] px-6 py-2.5 text-left font-sans text-xs font-semibold tracking-[0.08em] text-[#1E1E1E99] uppercase dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white/50"
                  colSpan={PRICING_COMPARISON_PLANS.length + 1}
                  scope="colgroup"
                >
                  {category.category}
                </th>
              </tr>
              {category.features.map((feature) => (
                <tr
                  className="border-t border-[#1E1E1E14] dark:border-white/[0.08]"
                  key={feature.name}
                >
                  <th
                    className="px-6 py-3.5 text-left font-sans text-sm font-medium text-[#1E1E1E] dark:text-white/90"
                    scope="row"
                  >
                    {feature.name}
                  </th>
                  {PRICING_COMPARISON_PLANS.map((plan) => (
                    <td
                      className={cn(
                        "px-6 py-3.5 text-center align-middle",
                        plan.isFeatured && "bg-[#C8B2EE14] dark:bg-white/[0.02]"
                      )}
                      key={`${feature.name}-${plan.key}`}
                    >
                      <CellValue value={feature[plan.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileComparisonCards() {
  return (
    <div className="flex w-full max-w-[26rem] flex-col gap-6 md:hidden">
      {PRICING_COMPARISON_PLANS.map((plan) => (
        <div
          className="overflow-hidden rounded-3xl border border-[#1E1E1E1A] dark:border-white/10"
          key={plan.key}
        >
          <div
            className={cn(
              "border-b border-[#1E1E1E14] px-5 py-4 dark:border-white/[0.08]",
              plan.isFeatured
                ? "bg-[#C8B2EE40] dark:bg-white/[0.05]"
                : "bg-[#C8B2EE26] dark:bg-white/[0.03]"
            )}
          >
            <h3
              className={cn(
                "font-display text-lg font-medium tracking-[-0.01em]",
                plan.isFeatured
                  ? "text-primary"
                  : "text-[#1E1E1E] dark:text-white"
              )}
            >
              {plan.name}
            </h3>
          </div>
          {COMPARISON_FEATURES.map((category) => (
            <div className="flex flex-col" key={category.category}>
              <div className="border-b border-[#1E1E1E14] bg-[#C8B2EE0F] px-5 py-2 dark:border-white/[0.08] dark:bg-white/[0.02]">
                <span className="font-sans text-xs font-semibold tracking-[0.08em] text-[#1E1E1E99] uppercase dark:text-white/50">
                  {category.category}
                </span>
              </div>
              {category.features.map((feature) => (
                <div
                  className="flex items-center justify-between gap-4 border-b border-[#1E1E1E14] px-5 py-3 last:border-b-0 dark:border-white/[0.08]"
                  key={feature.name}
                >
                  <span className="font-sans text-sm font-medium text-[#1E1E1E] dark:text-white/90">
                    {feature.name}
                  </span>
                  <CellValue value={feature[plan.key]} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PricingComparisonTable() {
  return (
    <section className="flex w-full flex-col items-center gap-13.5 px-6 py-24">
      <div className="flex flex-col items-center gap-4">
        <h2 className="font-display max-w-[59rem] text-center text-[2rem] leading-[1.12] font-medium tracking-[-0.02em] text-balance text-[#1E1E1E] sm:text-[2.875rem] sm:leading-13 dark:text-white">
          Compare plans in <span className="text-primary">detail</span>
        </h2>
        <p className="max-w-[43rem] text-center font-sans text-lg leading-7 font-medium text-balance text-[#1E1E1EBF] sm:text-xl dark:text-white/70">
          See exactly what&apos;s included in each plan so you can choose the
          right fit.
        </p>
      </div>

      <DesktopComparisonTable />
      <MobileComparisonCards />
    </section>
  );
}
