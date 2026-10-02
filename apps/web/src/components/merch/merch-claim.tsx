import { DeferredDithering } from "@/components/deferred-dithering";
import { MERCH_CLAIM_STEPS } from "@/constants/merch";

export function MerchClaim() {
  return (
    <section className="w-full px-6 pt-28 lg:pt-32">
      <div className="mx-auto flex w-full max-w-[80rem] flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-display max-w-[50rem] text-center text-[2rem] leading-[1.14] font-medium tracking-[-0.02em] text-[#1E1E1E] sm:text-[2.875rem] dark:text-white">
            How to claim your <span className="text-primary">gift</span>.
          </h2>
          <p className="max-w-[40rem] text-center font-sans text-[1.0625rem] leading-[1.3] font-medium tracking-[-0.005em] text-[#1E1E1EBF] sm:text-[1.25rem] dark:text-white/70">
            No checkout, no shipping fees. If you're on a paid plan, just ask.
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {MERCH_CLAIM_STEPS.map((step) => (
              <div
                className="relative flex flex-col gap-2.5 overflow-clip rounded-[0.8125rem] bg-[#F1ECFB40] p-9 pb-40 shadow-[0_0.0625rem_0.125rem_#0A0D1408] dark:bg-white/5"
                key={step.number}
              >
                <h3 className="font-display text-2xl leading-[1.16] font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
                  {step.title}
                </h3>
                <p className="font-sans text-base leading-[1.4] tracking-[-0.005em] text-[#1E1E1EA6] dark:text-white/60">
                  {step.body}
                </p>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[13.8125rem] bg-[linear-gradient(180deg,#C8B2EE00,#C8B2EE99)] dark:bg-[linear-gradient(180deg,#C8B2EE00,#3a2d5c99)]" />
                <span
                  aria-hidden="true"
                  className="font-display absolute -bottom-12 -left-3 text-[13rem] leading-none font-medium tracking-[-0.02em] text-white [-webkit-text-stroke:0.25rem_#b39ce4] [paint-order:stroke] dark:text-[#241d33] dark:[-webkit-text-stroke:0.25rem_#ffffff40]"
                >
                  {step.number}
                </span>
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <DeferredDithering
                    className="absolute bottom-0 left-[-6.375rem] h-[13.8125rem] w-[34.75rem]"
                    colorBack="#00000000"
                    colorFront="#C8B2EE80"
                    scale={1}
                    shape="wave"
                    size={2.9}
                    speed={0.53}
                    type="4x4"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-[0.8125rem] border border-[#ECECEC] dark:border-white/10" />
              </div>
            ))}
          </div>

          <div className="flex justify-center rounded-[0.8125rem] px-9 py-5.5 ring-1 ring-[#ECECEC] dark:ring-white/10">
            <p className="max-w-[56.25rem] text-center font-sans text-[0.9375rem] leading-[1.45] tracking-[-0.005em] text-[#1E1E1EA6] dark:text-white/60">
              The Classic Hat is a gift for paid Notra customers, not a
              free-trial promotion. On a trial? You can't claim one yet. Upgrade
              to any paid plan, reach out, and we'll send one your way. US
              shipping only for now.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
