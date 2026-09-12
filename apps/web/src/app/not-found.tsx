import { CtaButton } from "@notra/ui/components/shared/cta-button";
import type { Metadata } from "next";
import Link from "next/link";

import FooterSection from "@/components/footer-section";
import { MobileNavInert } from "@/components/mobile-nav-inert";
import { Navbar } from "@/components/navbar";
import { NotFoundNumeral } from "@/components/not-found-numeral";
import { NOT_FOUND_HOME_LABEL, NOT_FOUND_MESSAGE } from "@/constants/not-found";

const HOME_CTA_CLASSNAME =
  "h-auto rounded-[2.5625rem] px-6 py-3 font-display font-medium text-[1.125rem] leading-[1.14] tracking-[-0.015em]";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="bg-background relative flex min-h-svh w-full flex-col items-center justify-start overflow-x-clip">
      <div className="relative isolate flex w-full flex-col items-stretch justify-start">
        <Navbar variant="page" />
        <MobileNavInert>
          <main className="flex min-h-[80svh] w-full flex-col items-center justify-center gap-8 px-6 py-16">
            <div className="flex flex-col items-center gap-5">
              <NotFoundNumeral />
              <p className="max-w-[28rem] text-center font-sans text-lg font-medium tracking-[-0.01em] text-pretty text-[#1E1E1EBF] sm:text-xl dark:text-white/70">
                {NOT_FOUND_MESSAGE}
              </p>
            </div>
            <CtaButton
              className={HOME_CTA_CLASSNAME}
              nativeButton={false}
              render={<Link href="/" />}
            >
              {NOT_FOUND_HOME_LABEL}
            </CtaButton>
          </main>
          <FooterSection />
        </MobileNavInert>
      </div>
    </div>
  );
}
