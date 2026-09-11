import { CtaButton } from "@notra/ui/components/shared/cta-button";
import Image from "next/image";
import Link from "next/link";

import { HeroDither } from "@/components/landing/hero-dither";
import { MerchHeroCallouts } from "@/components/merch/merch-hero-callouts";

const CTA_BUTTON_CLASSNAME =
  "h-auto rounded-[2.5625rem] px-6 py-3 font-display font-medium text-[1.125rem] leading-[1.14] tracking-[-0.015em]";

export function MerchHero() {
  return (
    <section className="relative w-full overflow-x-clip px-6 pt-6 antialiased [font-synthesis:none]">
      <div className="relative isolate rounded-3xl bg-[#C8B2EE40] dark:bg-[#2a2140]">
        <div className="pointer-events-none absolute inset-0 overflow-clip rounded-3xl">
          <HeroDither />
        </div>

        <div className="relative flex w-full flex-col items-center">
          <div className="flex flex-col items-center gap-8 px-6 pt-28 pb-2 sm:gap-10 sm:pt-24 lg:pt-[7.5rem]">
            <div className="flex flex-col items-center gap-7">
              <h1 className="font-display max-w-[56.875rem] text-center text-[2.5rem] leading-[1.08] font-medium tracking-[-0.015em] text-[#1E1E1E] sm:text-[3.25rem] lg:text-[4.75rem] lg:leading-[1.12] dark:text-white">
                Free hat? No, <span className="text-primary">Cap</span>!
              </h1>
              <p className="max-w-[42.875rem] text-center font-sans text-[1.0625rem] leading-[1.14] font-medium tracking-[-0.005em] text-[#1E1E1EBF] sm:text-[1.25rem] dark:text-white/70">
                The Notra Classic Hat, a thank-you for building with us. If your
                workspace is on a paid plan, it's yours. Reach out and we'll put
                one in the mail.
              </p>
            </div>

            <div className="flex flex-col items-center gap-5">
              <div className="flex flex-col items-center gap-7 sm:flex-row">
                <CtaButton
                  className={CTA_BUTTON_CLASSNAME}
                  nativeButton={false}
                  render={<Link href="/contact" />}
                  variant="primary"
                >
                  Claim your gift
                </CtaButton>
                <CtaButton
                  className={CTA_BUTTON_CLASSNAME}
                  nativeButton={false}
                  render={<Link href="/contact" />}
                  variant="light"
                >
                  Talk to us
                </CtaButton>
              </div>
              <p className="max-w-[26rem] text-center font-sans text-sm leading-5 tracking-[-0.005em] text-[#1E1E1EA6] dark:text-white/60">
                Paid workspaces only, free trials don't count. US shipping for
                now.
              </p>
            </div>
          </div>

          <div className="relative mx-auto mt-4 h-[18rem] w-full max-w-[87rem] sm:h-[30rem] lg:h-[36rem] xl:h-[45rem]">
            <Image
              alt="The Notra Classic Hat in stone with the embroidered Notra mark"
              className="absolute -bottom-24 left-1/2 z-10 w-[clamp(19rem,60vw,24rem)] -translate-x-1/2 -rotate-6 drop-shadow-[0_1.5rem_2.5rem_#1E1E1E40] sm:top-5 sm:bottom-auto sm:w-[27.5rem] sm:-rotate-12 lg:-top-10 lg:w-[36rem] xl:-top-27.5 xl:w-[48.75rem]"
              height={1600}
              preload
              sizes="(max-width: 40rem) min(60vw, 24rem), (max-width: 64rem) 27.5rem, (max-width: 80rem) 36rem, 48.75rem"
              src="/marketing/merch/hat-front.png"
              width={1200}
            />

            <MerchHeroCallouts />
          </div>
        </div>
      </div>
    </section>
  );
}
