import { NumberedStepCard } from "@/components/numbered-step-card";
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
          <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {MERCH_CLAIM_STEPS.map((step) => (
              <NumberedStepCard
                body={step.body}
                key={step.number}
                number={step.number}
                title={step.title}
              />
            ))}
          </ol>

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
