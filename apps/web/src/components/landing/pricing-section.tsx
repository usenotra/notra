"use client";

import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { SPRING } from "@notra/ui/lib/motion";
import { cn } from "@notra/ui/lib/utils";
import {
  AnimatePresence,
  domMax,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { PricingGiftIcon } from "@/components/landing/pricing-icons";
import { PricingProShader } from "@/components/landing/pricing-pro-shader";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  PRICING_ANNUAL_BADGE,
  PRICING_BILLING_OPTIONS,
  PRICING_DEFAULT_BILLING,
  PRICING_HEADING,
  PRICING_PLANS,
  PRICING_SUBHEADING,
  TRACKED_ENGINES,
  TRACKED_ENGINES_CAPTION,
} from "@/constants/landing/pricing";
import { PRICING_ICONS } from "@/constants/landing/pricing-icons";
import type {
  BillingPeriod,
  LandingPricingSectionProps,
  PricingBillingToggleProps,
  PricingCardProps,
} from "@/types/landing/pricing";

function PricingBillingToggle({
  value,
  onValueChange,
}: PricingBillingToggleProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(180deg,#FFFFFF,#F2F2F2)] p-1.75 shadow-[0_0.0625rem_0.125rem_#28282814,0_0_0_0.0625rem_#ECECEC] dark:bg-white/[0.06] dark:bg-none dark:shadow-[0_0_0_0.0625rem] dark:shadow-white/10">
      {PRICING_BILLING_OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "focus-visible:ring-ring/50 relative flex h-8 cursor-pointer touch-manipulation items-center justify-center rounded-full px-3.5 py-1.75 font-sans text-base leading-6 tracking-[-0.01em] focus-visible:ring-[0.1875rem]",
              isActive ? "text-white" : "text-[#1E1E1E] dark:text-white"
            )}
            key={option.value}
            onClick={() => onValueChange(option.value)}
            type="button"
          >
            {isActive ? (
              <m.span
                className="cta-gradient-primary absolute inset-0 rounded-full"
                layoutId="pricing-billing-thumb"
                style={{
                  boxShadow:
                    "0 0.0625rem 0.125rem #28282814, 0 0 0 0.0625rem #1E1E1E40",
                }}
                transition={
                  shouldReduceMotion ? { duration: 0 } : SPRING.snappy
                }
              />
            ) : null}
            <span className="duration-normal relative z-10 transition-colors">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TrackedEnginesRow() {
  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-center font-sans text-sm font-medium tracking-[-0.01em] text-[#1E1E1E99] dark:text-white/50">
        {TRACKED_ENGINES_CAPTION}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-5">
        {TRACKED_ENGINES.map((engine) =>
          engine.darkSrc ? (
            <span className="inline-flex" key={engine.name} title={engine.name}>
              <Image
                alt={engine.name}
                className="h-7 w-auto dark:hidden"
                height={28}
                src={engine.src}
                unoptimized
                width={engine.width}
              />
              <Image
                alt={engine.name}
                className="hidden h-7 w-auto dark:block"
                height={28}
                src={engine.darkSrc}
                unoptimized
                width={engine.width}
              />
            </span>
          ) : (
            <Image
              alt={engine.name}
              className="h-7 w-auto"
              height={28}
              key={engine.name}
              src={engine.src}
              title={engine.name}
              unoptimized
              width={engine.width}
            />
          )
        )}
      </div>
    </div>
  );
}

function PricingCard({ plan, billingPeriod }: PricingCardProps) {
  const isFeatured = plan.variant === "featured";
  const showBadge = Boolean(plan.hasAnnualBadge) && billingPeriod === "yearly";

  const ctaLink =
    plan.cta.kind === "signup" ? (
      <TrackedSignupLink href={plan.cta.href} source={plan.cta.source} />
    ) : (
      <Link href={plan.cta.href} />
    );

  return (
    <article
      className={cn(
        "relative flex h-184 w-full flex-col overflow-clip rounded-3xl lg:order-none",
        isFeatured
          ? "order-first bg-[#8B5CF6]"
          : "bg-[#F7F7F7] dark:bg-white/[0.04]"
      )}
    >
      {isFeatured && <PricingProShader />}

      <div className="relative z-10 flex h-full flex-col">
        <div
          className={cn(
            "m-1.75 flex h-34 flex-col gap-2 rounded-2xl px-4.25 py-8.25",
            isFeatured
              ? "border border-white/5 bg-white/10 shadow-[inset_0_0_1.29375rem_#FFFFFF1A]"
              : "bg-white shadow-[0_0.125rem_0.3125rem_#00000008] dark:bg-white/[0.04]"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h3
              className={cn(
                "font-display text-[1.375rem] leading-7 font-medium tracking-[0.01em]",
                isFeatured
                  ? "font-semibold text-white"
                  : "text-black dark:text-white"
              )}
            >
              {plan.name}
            </h3>
            <AnimatePresence initial={false}>
              {showBadge ? (
                <m.span
                  animate={{ y: 0, opacity: 1 }}
                  className={cn(
                    "flex items-center gap-0.75 overflow-clip rounded-full py-1 pr-2 pl-1.25 font-sans text-[0.8125rem] leading-[1.125rem] font-medium outline -outline-offset-1 [backdrop-filter:blur(0.15rem)]",
                    isFeatured
                      ? "bg-white/20 text-white outline-[#F6F8FA80]"
                      : "bg-[#8B5CF6BF] text-white outline-[#1E1E1E0D]"
                  )}
                  exit={{ y: "-0.75rem", opacity: 0 }}
                  initial={{ y: "-0.75rem", opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <PricingGiftIcon className="size-4 shrink-0" />
                  {PRICING_ANNUAL_BADGE}
                </m.span>
              ) : null}
            </AnimatePresence>
          </div>
          <p
            className={cn(
              "font-sans text-[0.9375rem] leading-[1.125rem] font-normal tracking-[-0.015em]",
              isFeatured ? "text-white/70" : "text-[#6B6B6B] dark:text-white/60"
            )}
          >
            {plan.description}
          </p>
        </div>

        <div className="flex flex-1 flex-col px-6 pt-4.5">
          <div className="flex flex-col items-start gap-3.25">
            <AnimatePresence initial={false} mode="wait">
              <m.div
                animate={{ y: 0, opacity: 1 }}
                className="flex items-baseline gap-2"
                exit={{ y: "0.75rem", opacity: 0 }}
                initial={{ y: "0.75rem", opacity: 0 }}
                key={plan.price[billingPeriod]}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <span
                  className={cn(
                    "font-display text-[2.625rem] leading-13 font-normal tracking-[-0.01em]",
                    isFeatured ? "text-white" : "text-[#1E1E1E] dark:text-white"
                  )}
                >
                  {plan.price[billingPeriod]}
                </span>
                {plan.priceSuffix ? (
                  <span
                    className={cn(
                      "font-sans text-sm leading-[1.125rem] font-normal tracking-[-0.015em]",
                      isFeatured
                        ? "text-white/70"
                        : "text-[#1E1E1EB3] dark:text-white/60"
                    )}
                  >
                    {plan.priceSuffix[billingPeriod]}
                  </span>
                ) : null}
              </m.div>
            </AnimatePresence>

            <CtaButton
              className="w-full"
              nativeButton={false}
              render={ctaLink}
              variant={isFeatured ? "light" : "primary"}
            >
              <span>{plan.cta.label}</span>
              {plan.cta.showArrow ? (
                <HugeiconsIcon className="size-4" icon={ArrowRight02Icon} />
              ) : null}
            </CtaButton>
          </div>

          <div
            className={cn(
              "mt-8 h-px w-full",
              isFeatured ? "bg-white/20" : "bg-black/20 dark:bg-white/15"
            )}
          />

          <ul className="mt-10.5 flex flex-col gap-3">
            {plan.features.map((feature) => {
              const Icon = PRICING_ICONS[feature.icon];

              return (
                <li className="flex items-center gap-2" key={feature.label}>
                  <span
                    className={cn(
                      "shrink-0",
                      isFeatured
                        ? "text-white"
                        : "text-[#1E1E1EBF] dark:text-white/60"
                    )}
                  >
                    <Icon className="size-6" />
                  </span>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "font-sans text-sm leading-[1.125rem] font-normal",
                        isFeatured
                          ? "text-white"
                          : "text-[#1E1E1EBF] dark:text-white/70"
                      )}
                    >
                      {feature.label}
                    </span>
                    {feature.subtitle ? (
                      <span
                        className={cn(
                          "font-sans text-xs leading-4 font-normal",
                          isFeatured
                            ? "text-white/90"
                            : "text-[#1E1E1E99] dark:text-white/50"
                        )}
                      >
                        {feature.subtitle}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function LandingPricingSection({
  showHeader = true,
}: LandingPricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    PRICING_DEFAULT_BILLING
  );

  return (
    <LazyMotion features={domMax}>
      <section
        className={cn(
          "flex w-full flex-col items-center gap-13.5 px-6 pb-24",
          // Without its own header the section sits right under the page hero.
          showHeader ? "pt-24" : "pt-6"
        )}
        id="pricing"
      >
        {showHeader ? (
          <div className="flex flex-col items-center gap-6">
            <h2 className="font-display max-w-[59rem] text-center text-[2rem] leading-[1.12] font-medium tracking-[-0.02em] text-balance text-[#1E1E1E] sm:text-[2.875rem] sm:leading-13 dark:text-white">
              {PRICING_HEADING}
            </h2>
            <p className="max-w-[43rem] text-center font-sans text-lg leading-7 font-medium text-balance text-[#1E1E1EBF] sm:text-xl dark:text-white/70">
              {PRICING_SUBHEADING}
            </p>
          </div>
        ) : null}

        <div className="flex w-full flex-col items-center gap-6">
          <PricingBillingToggle
            onValueChange={setBillingPeriod}
            value={billingPeriod}
          />

          <div className="grid w-full max-w-96 grid-cols-1 gap-4 lg:max-w-[80rem] lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <PricingCard
                billingPeriod={billingPeriod}
                key={plan.id}
                plan={plan}
              />
            ))}
          </div>
        </div>

        <TrackedEnginesRow />
      </section>
    </LazyMotion>
  );
}
