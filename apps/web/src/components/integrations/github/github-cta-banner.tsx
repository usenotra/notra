import { Megaphone01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link } from "@tanstack/react-router";

import { DeferredDithering } from "@/components/deferred-dithering";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  GITHUB_CTA_BADGE_LABEL,
  GITHUB_CTA_CONTACT_HREF,
  GITHUB_CTA_HEADING,
  GITHUB_CTA_PRIMARY_LABEL,
  GITHUB_CTA_SECONDARY_LABEL,
  GITHUB_CTA_SUBCOPY,
  GITHUB_SIGNUP_SOURCE,
} from "@/constants/github-integration";

export function GithubCtaBanner() {
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
          <div className="flex items-center gap-0.75 rounded-[0.5625rem] bg-[#FFFFFF80] py-1 pr-2 pl-1 [outline:0.0625rem_solid_#F6F8FA80] -outline-offset-1 backdrop-blur-[0.15rem] dark:bg-white/10 dark:[outline:0.0625rem_solid_#FFFFFF1F]">
            <HugeiconsIcon
              className="shrink-0 text-[#1E1E1ECC] dark:text-white/80"
              icon={Megaphone01Icon}
              size={16}
            />
            <span className="font-sans text-xs leading-4 font-medium text-[#1E1E1ECC] dark:text-white/80">
              {GITHUB_CTA_BADGE_LABEL}
            </span>
          </div>
          <div className="flex flex-col items-center gap-4.5">
            <h2 className="font-display max-w-[46.625rem] text-center text-[2.5rem] leading-[114%] font-medium tracking-[-0.125rem] text-balance text-[#1E1E1E] sm:text-[3rem] lg:text-[4rem] dark:text-white">
              {GITHUB_CTA_HEADING}
            </h2>
            <p className="max-w-[33.5rem] text-center font-sans text-lg/5.5 font-medium tracking-[-0.03125rem] text-balance text-[#1E1E1EE6] dark:text-white/85">
              {GITHUB_CTA_SUBCOPY}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-7 sm:flex-row">
          <CtaButton
            className="text-lg"
            nativeButton={false}
            render={<TrackedSignupLink source={GITHUB_SIGNUP_SOURCE} />}
            variant="primary"
          >
            {GITHUB_CTA_PRIMARY_LABEL}
          </CtaButton>
          <CtaButton
            className="text-lg"
            nativeButton={false}
            render={<Link to={GITHUB_CTA_CONTACT_HREF} />}
            variant="light"
          >
            {GITHUB_CTA_SECONDARY_LABEL}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
