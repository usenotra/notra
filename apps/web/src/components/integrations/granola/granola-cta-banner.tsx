import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link } from "@tanstack/react-router";

import { DeferredDithering } from "@/components/deferred-dithering";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  GRANOLA_CTA_CONTACT_HREF,
  GRANOLA_CTA_HEADING,
  GRANOLA_CTA_PRIMARY_LABEL,
  GRANOLA_CTA_SECONDARY_LABEL,
  GRANOLA_CTA_SUBCOPY,
  GRANOLA_SIGNUP_SOURCE,
} from "@/constants/granola-integration";

export function GranolaCtaBanner() {
  return (
    <div className="relative mx-auto flex min-h-[27.4375rem] w-full max-w-[87rem] shrink-0 items-center justify-center overflow-clip rounded-3xl bg-[#C8B2EE40] px-6 py-16 antialiased dark:bg-[#231d3a]">
      <DeferredDithering
        className="absolute -top-66.25 left-[-5.368rem] h-264.5 w-403.25"
        colorBack="#00000000"
        colorFront="#8B5CF62D"
        scale={0.53}
        shape="wave"
        size={2.9}
        speed={0.7}
        type="4x4"
      />
      <div className="relative flex w-full max-w-[53.3125rem] flex-col items-center gap-10.5">
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-4.5">
            <h2 className="font-display max-w-[46.625rem] text-center text-[2.5rem] leading-[114%] font-medium tracking-[-0.125rem] text-balance text-[#1E1E1E] sm:text-[3rem] lg:text-[4rem] dark:text-white">
              {GRANOLA_CTA_HEADING}
            </h2>
            <p className="max-w-[33.5rem] text-center font-sans text-lg/5.5 font-medium tracking-[-0.03125rem] text-balance text-[#1E1E1EE6] dark:text-white/85">
              {GRANOLA_CTA_SUBCOPY}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-7 sm:flex-row">
          <CtaButton
            className="text-lg"
            nativeButton={false}
            render={<TrackedSignupLink source={GRANOLA_SIGNUP_SOURCE} />}
            variant="primary"
          >
            {GRANOLA_CTA_PRIMARY_LABEL}
          </CtaButton>
          <CtaButton
            className="text-lg"
            nativeButton={false}
            render={<Link to={GRANOLA_CTA_CONTACT_HREF} />}
            variant="light"
          >
            {GRANOLA_CTA_SECONDARY_LABEL}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
