import { CtaButton } from "@notra/ui/components/shared/cta-button";

import { DeferredDithering } from "@/components/deferred-dithering";
import { TrackedSignupLink } from "@/components/tracked-signup-link";
import {
  FEEDBACK_MD_DOCS_URL,
  FEEDBACK_MD_UPSELL_HEADING,
  FEEDBACK_MD_UPSELL_PRIMARY_LABEL,
  FEEDBACK_MD_UPSELL_SECONDARY_LABEL,
  FEEDBACK_MD_UPSELL_SIGNUP_SOURCE,
  FEEDBACK_MD_UPSELL_SUBCOPY,
} from "@/lib/feedback-md/constants";

export function FeedbackMdUpsell() {
  return (
    <section className="w-full px-6">
      <div className="relative mx-auto flex w-full max-w-[87rem] flex-col items-center gap-10 overflow-clip rounded-[1.5625rem] bg-[#C8B2EE40] px-6 py-16 antialiased md:py-20 dark:bg-[#231d3a]">
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
        <div className="relative flex w-full max-w-[53.3125rem] flex-col items-center gap-4.5">
          <h2 className="font-display max-w-[46.625rem] text-center text-[2.25rem] leading-[114%] font-medium tracking-[-0.1rem] text-balance text-[#1E1E1E] sm:text-[3rem] lg:text-[3.5rem] dark:text-white">
            {FEEDBACK_MD_UPSELL_HEADING}
          </h2>
          <p className="max-w-[36rem] text-center font-sans text-lg/6 font-medium tracking-[-0.03125rem] text-balance text-[#1E1E1EE6] dark:text-white/85">
            {FEEDBACK_MD_UPSELL_SUBCOPY}
          </p>
        </div>
        <div className="relative grid w-full grid-cols-2 items-center gap-4 sm:flex sm:w-auto sm:gap-7">
          <CtaButton
            className="w-full min-w-0 px-3 text-lg sm:w-auto sm:px-6"
            nativeButton={false}
            render={
              <TrackedSignupLink source={FEEDBACK_MD_UPSELL_SIGNUP_SOURCE} />
            }
            variant="primary"
          >
            {FEEDBACK_MD_UPSELL_PRIMARY_LABEL}
          </CtaButton>
          <CtaButton
            className="w-full min-w-0 px-3 text-lg sm:w-auto sm:px-6"
            nativeButton={false}
            render={
              <a href={FEEDBACK_MD_DOCS_URL}>
                {FEEDBACK_MD_UPSELL_SECONDARY_LABEL}
              </a>
            }
            variant="light"
          />
        </div>
      </div>
    </section>
  );
}
