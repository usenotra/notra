import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Link } from "@tanstack/react-router";

import { DeferredDithering } from "@/components/deferred-dithering";

export function MerchCtaBanner() {
  return (
    <div className="relative mx-auto flex min-h-[27.4375rem] w-full max-w-[87rem] shrink-0 items-center justify-center overflow-clip rounded-[1.5625rem] bg-[#C8B2EE40] px-6 py-16 antialiased dark:bg-[#231d3a]">
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
        <div className="flex flex-col items-center gap-4.5">
          <h2 className="font-display max-w-[46.625rem] text-center text-[2.5rem] leading-[114%] font-medium tracking-[-0.125rem] text-balance text-[#1E1E1E] sm:text-[3rem] lg:text-[4rem] dark:text-white">
            Consider it a <span className="text-primary">gift</span>.
          </h2>
          <p className="max-w-[33.5rem] text-center font-sans text-lg/5.5 font-medium tracking-[-0.03125rem] text-balance text-[#1E1E1EE6] dark:text-white/85">
            One Classic Hat per paid workspace, shipped free anywhere in the US.
            Tell us where to send it.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-7">
          <CtaButton
            className="text-lg"
            nativeButton={false}
            render={<Link to="/contact" />}
            variant="primary"
          >
            Claim your gift
          </CtaButton>
          <CtaButton
            className="text-lg"
            nativeButton={false}
            render={<Link to="/contact" />}
            variant="light"
          >
            Contact us
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
