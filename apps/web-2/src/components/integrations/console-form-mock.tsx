import { Linear } from "@notra/ui/components/ui/svgs/linear";
import { useState } from "react";

const BANNER_GRADIENT =
  "bg-[linear-gradient(120deg,#5e6ad2_0%,#7c86dd_55%,#9aa4e8_100%)]";
const PURPLE_GRADIENT = "cta-gradient-primary-flat";
const INPUT_RING =
  "[box-shadow:#E4E4E4_0_0_0_0.0625rem] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]";

export function ConsoleFormMock() {
  const [closed, setClosed] = useState(false);

  return (
    <div className="relative hidden w-[35rem] shrink-0 lg:block">
      <div className="relative flex flex-col overflow-clip rounded-2xl bg-white [box-shadow:#E7E3F2_0_0_0_0.0625rem,#2828281F_0_1.5rem_3rem_-0.75rem] dark:bg-[#161320] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]">
        <div className="flex items-center gap-3 bg-[#FAFAFA] px-4 py-3 [box-shadow:#F0F0F0_0_-0.0625rem_0_inset] dark:bg-white/[0.03] dark:[box-shadow:#FFFFFF12_0_-0.0625rem_0_inset]">
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              aria-hidden={closed}
              aria-label="Close tab"
              className={`size-2.5 rounded-full bg-[#FF5F57] [box-shadow:#00000014_0_0_0_0.0625rem_inset] outline-none ${closed ? "" : "focus-visible:ring-primary cursor-pointer transition-[filter] hover:brightness-95 focus-visible:ring-2"}`}
              disabled={closed}
              onClick={() => setClosed(true)}
              type="button"
            />
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-[#FEBC2E] [box-shadow:#00000014_0_0_0_0.0625rem_inset]"
            />
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-[#28C840] [box-shadow:#00000014_0_0_0_0.0625rem_inset]"
            />
          </div>
          <div
            aria-hidden="true"
            className="flex grow items-center justify-center rounded-lg bg-white px-3 py-1.25 [box-shadow:#ECECEC_0_0_0_0.0625rem] dark:bg-white/[0.06] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]"
          >
            <span className="font-sans text-[0.75rem] leading-[1.33] text-[#1E1E1E80] dark:text-white/50">
              console.usenotra.com/integrations
            </span>
          </div>
        </div>
        <div className="relative">
          <div
            aria-hidden="true"
            className={`duration-slow transition-opacity ${closed ? "pointer-events-none opacity-0" : "opacity-100"}`}
            inert={closed}
          >
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[0.75rem] leading-[1.33] font-medium text-[#1E1E1E80] dark:text-white/50">
                    Banner
                  </span>
                  <span className="font-sans text-[0.6875rem] leading-[1.27] text-[#1E1E1E66] dark:text-white/40">
                    3:1 · PNG or SVG · max 4 MB
                  </span>
                </div>
                <div
                  className={`relative flex h-[8.125rem] items-center justify-center overflow-clip rounded-xl ${BANNER_GRADIENT}`}
                >
                  <Linear className="size-10" />
                  <span className="absolute right-2.5 bottom-2.5 flex items-center rounded-full bg-white/90 px-3 py-1.25">
                    <span className="font-sans text-[0.75rem] leading-[1.25] font-medium text-[#1E1E1E]">
                      Replace
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <MockField label="Name" value="Linear" />
                <MockField label="Author" value="Linear Orbit, Inc." />
              </div>
              <MockField
                label="Description"
                value="Shipped issues and project updates turn into progress posts your audience actually reads."
              />
              <div className="flex justify-end gap-8">
                <div className="flex shrink-0 flex-col gap-1.5">
                  <span className="font-sans text-[0.75rem] leading-[1.33] font-medium text-[#1E1E1E80] dark:text-white/50">
                    Brand color
                  </span>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex items-center gap-2 rounded-[0.625rem] px-3 py-2.25 ${INPUT_RING}`}
                    >
                      <span className="size-4 shrink-0 rounded-[0.3125rem] bg-[#5E6AD2]" />
                      <span className="font-mono text-[0.75rem] leading-[1.33] text-[#1E1E1E] dark:text-white">
                        #5E6AD2
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-5 shrink-0 rounded-[0.4375rem] bg-[#5E6AD2] [box-shadow:#FFFFFF_0_0_0_0.0625rem_inset,#7C3AED_0_0_0_0.125rem]" />
                      <span className="size-5 shrink-0 rounded-[0.4375rem] bg-[#8B93E8]" />
                      <span className="size-5 shrink-0 rounded-[0.4375rem] bg-[#3C478F]" />
                      <span className="size-5 shrink-0 rounded-[0.4375rem] bg-[#1E1E1E] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]" />
                    </div>
                  </div>
                </div>
                <div className="flex w-[11.25rem] shrink-0 flex-col gap-1.5">
                  <span className="font-sans text-[0.75rem] leading-[1.33] font-medium text-[#1E1E1E80] dark:text-white/50">
                    Logo
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex size-[2.375rem] items-center justify-center rounded-[0.625rem] bg-[#EEF0FB] [box-shadow:#E4E4E4_0_0_0_0.0625rem] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]">
                      <Linear className="size-5" />
                    </span>
                    <span className="flex size-[2.375rem] items-center justify-center rounded-[0.625rem] bg-[#1E1E1E]">
                      <Linear className="size-5" />
                    </span>
                    <span className="flex size-[2.375rem] items-center justify-center rounded-[0.625rem] border border-dashed border-[#D4D4D4] dark:border-white/20">
                      <span className="font-sans text-[1rem] leading-none text-[#1E1E1E66] dark:text-white/40">
                        +
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 bg-[#FAFAFA] px-5 py-3.5 [box-shadow:#F0F0F0_0_0.0625rem_0_inset] dark:bg-white/[0.03] dark:[box-shadow:#FFFFFF12_0_0.0625rem_0_inset]">
              <span className="flex items-center rounded-full bg-white px-4 py-2 font-sans text-[0.8125rem] leading-[1.23] font-medium text-[#1E1E1E] [box-shadow:#ECECEC_0_0_0_0.0625rem] dark:bg-white/[0.06] dark:text-white dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]">
                Save draft
              </span>
              <span
                className={`flex items-center rounded-full px-4 py-2 font-sans text-[0.8125rem] leading-[1.23] font-semibold text-white ${PURPLE_GRADIENT}`}
              >
                Submit for review
              </span>
            </div>
          </div>
          <div
            className={`duration-slow absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 transition-opacity dark:bg-[#161320] ${closed ? "opacity-100" : "pointer-events-none opacity-0"}`}
            inert={!closed}
          >
            <span
              aria-hidden="true"
              className="font-display text-[3.5rem] leading-[1] font-medium tracking-[-0.02em] text-[#1E1E1E] dark:text-white"
            >
              404
            </span>
            <span className="font-sans text-[0.9375rem] leading-[1.4] text-[#1E1E1EA6] dark:text-white/60">
              This integration went missing.
            </span>
            <button
              className="focus-visible:ring-primary mt-2 flex cursor-pointer items-center rounded-full bg-white px-3.5 py-1.5 font-sans text-[0.8125rem] leading-[1.23] font-medium text-[#1E1E1E] [box-shadow:#ECECEC_0_0_0_0.0625rem] transition-colors outline-none hover:bg-[#FAFAFA] focus-visible:ring-2 dark:bg-white/[0.06] dark:text-white dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem] dark:hover:bg-white/[0.1]"
              onClick={() => setClosed(false)}
              type="button"
            >
              Reopen tab
            </button>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className={`duration-slow absolute bottom-[-2rem] left-[-2.5rem] flex w-[16.875rem] flex-col overflow-clip rounded-2xl bg-white [box-shadow:#ECECEC_0_0_0_0.0625rem,#28282826_0_1rem_2rem_-0.5rem] transition-opacity dark:bg-[#161320] dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem] ${closed ? "pointer-events-none opacity-0" : "opacity-100"}`}
        inert={closed}
      >
        <div
          className={`flex h-[4.75rem] items-center justify-center ${BANNER_GRADIENT}`}
        >
          <Linear className="size-7" />
        </div>
        <div className="flex flex-col gap-2 px-4 pt-3.5 pb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-px">
              <span className="font-sans text-[0.9375rem] leading-[1.27] font-semibold tracking-[-0.01em] text-[#1E1E1E] dark:text-white">
                Linear
              </span>
              <span className="font-sans text-[0.75rem] leading-[1.25] text-[#1E1E1EA6] dark:text-white/60">
                by Linear Orbit, Inc.
              </span>
            </div>
            <span
              className={`flex items-center rounded-full px-3 py-1.25 font-sans text-[0.75rem] leading-[1.25] font-semibold text-white ${PURPLE_GRADIENT}`}
            >
              Connect
            </span>
          </div>
          <span className="font-sans text-[0.75rem] leading-[1.4] text-[#1E1E1EBF] dark:text-white/70">
            Shipped issues and project updates turn into progress posts.
          </span>
        </div>
      </div>
    </div>
  );
}

function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex grow flex-col gap-1.5">
      <span className="font-sans text-[0.75rem] leading-[1.33] font-medium text-[#1E1E1E80] dark:text-white/50">
        {label}
      </span>
      <div className="flex rounded-[0.625rem] px-3 py-2.25 [box-shadow:#E4E4E4_0_0_0_0.0625rem] dark:[box-shadow:#FFFFFF1F_0_0_0_0.0625rem]">
        <span className="font-sans text-[0.8125rem] leading-[1.46] text-[#1E1E1E] dark:text-white/80">
          {value}
        </span>
      </div>
    </div>
  );
}
