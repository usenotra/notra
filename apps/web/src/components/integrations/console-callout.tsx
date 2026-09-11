import { CtaButton } from "@notra/ui/components/shared/cta-button";
import Link from "next/link";

import { HeroDither } from "@/components/landing/hero-dither";
import {
  INTEGRATIONS_CONSOLE_URL,
  INTEGRATIONS_DOCS_URL,
} from "@/constants/integrations";

import { ConsoleFormMock } from "./console-form-mock";

const CTA_BUTTON_CLASSNAME =
  "h-auto rounded-[2.5625rem] px-6 py-3 font-display font-medium text-[1.125rem] leading-[1.14] tracking-[-0.015em]";

export function ConsoleCallout() {
  return (
    <section className="w-[min(100%-3rem,80rem)] pt-14 antialiased [font-synthesis:none]">
      <div className="relative isolate flex w-full flex-col items-center gap-12 overflow-clip rounded-3xl bg-[#EFEAFA] px-8 py-16 lg:flex-row lg:justify-between lg:gap-16 lg:px-20 lg:py-20 dark:bg-[#2a2140]">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>
        <div className="relative flex w-full max-w-[31.25rem] flex-col items-start gap-5">
          <h2 className="font-sans text-[2.25rem] leading-[1.13] font-medium tracking-[-0.02em] text-[#1E1E1E] sm:text-[2.875rem] dark:text-white">
            List your integration in the marketplace.
          </h2>
          <p className="font-sans text-[1.0625rem] leading-[1.44] font-medium tracking-[-0.005em] text-[#1E1E1EBF] sm:text-[1.125rem] dark:text-white/70">
            Manage everything from the Notra Console: name, description, logo,
            banner and brand color. Submit for review and go live for every
            workspace.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <CtaButton
              className={CTA_BUTTON_CLASSNAME}
              nativeButton={false}
              render={<Link href={INTEGRATIONS_CONSOLE_URL} />}
              variant="primary"
            >
              Open the Console
            </CtaButton>
            <CtaButton
              className={CTA_BUTTON_CLASSNAME}
              nativeButton={false}
              render={<Link href={INTEGRATIONS_DOCS_URL} />}
              variant="light"
            >
              Read the docs
            </CtaButton>
          </div>
        </div>
        <ConsoleFormMock />
      </div>
    </section>
  );
}
