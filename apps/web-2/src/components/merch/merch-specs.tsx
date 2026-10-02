import { cn } from "@notra/ui/lib/utils";

import { MERCH_SPEC_ROWS } from "@/constants/merch";

export function MerchSpecs() {
  return (
    <section className="w-full px-6 pt-28 lg:pt-32">
      <div className="mx-auto flex w-full max-w-[80rem] flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-display max-w-[50rem] text-center text-[2rem] leading-[1.14] font-medium tracking-[-0.02em] text-[#1E1E1E] sm:text-[2.875rem] dark:text-white">
            Just a <span className="text-primary">good hat</span>.
          </h2>
          <p className="max-w-[40rem] text-center font-sans text-[1.0625rem] leading-[1.3] font-medium tracking-[-0.005em] text-[#1E1E1EBF] sm:text-[1.25rem] dark:text-white/70">
            Unstructured cotton twill, one size, the Notra mark on the front.
            That's it.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="overflow-clip rounded-[0.8125rem] bg-[#F1ECFB40] shadow-[0_0.0625rem_0.125rem_#0A0D1408] ring-1 ring-[#ECECEC] dark:bg-white/5 dark:ring-white/10">
            <img
              decoding="async"
              loading="lazy"
              alt="Side view of the Notra Classic Hat in stone"
              className="h-full max-h-[35rem] w-full object-cover"
              height={1440}
              src="/marketing/merch/flat-side.jpg"
              width={1080}
            />
          </div>
          <dl className="flex flex-col justify-center rounded-[0.8125rem] bg-[#F1ECFB40] px-9 py-6 shadow-[0_0.0625rem_0.125rem_#0A0D1408] ring-1 ring-[#ECECEC] lg:px-12 dark:bg-white/5 dark:ring-white/10">
            {MERCH_SPEC_ROWS.map((row, index) => (
              <div
                className={cn(
                  "flex flex-col gap-1.5 py-4 sm:flex-row sm:items-center sm:gap-6 sm:py-5.5",
                  index < MERCH_SPEC_ROWS.length - 1 &&
                    "border-b border-[#1E1E1E14] dark:border-white/10"
                )}
                key={row.label}
              >
                <dt className="shrink-0 font-sans text-sm leading-5 tracking-[-0.005em] text-[#1E1E1EA6] sm:w-32 sm:text-base dark:text-white/60">
                  {row.label}
                </dt>
                <dd className="font-display text-[1.125rem] leading-[1.22] font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
