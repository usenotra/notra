import { EngineIcon } from "@/components/feature-pages/engine-icon";
import { RankBadge } from "@/components/feature-pages/rank-badge";
import { StageShell } from "@/components/feature-pages/stage-shell";
import { FEATURE_ENGINES } from "@/constants/feature-pages/engines";
import {
  PERSONAS_HERO_CARDS,
  PERSONAS_HERO_QUESTION,
} from "@/constants/feature-pages/personas";

export function PersonasStage() {
  return (
    <StageShell className="flex flex-col items-center lg:px-16 lg:pt-12 lg:pb-12">
      <div className="flex items-center gap-3 rounded-full border border-white/90 bg-white/92 py-3.5 pr-5.5 pl-4">
        <svg
          aria-hidden="true"
          className="size-7 shrink-0"
          viewBox="0 0 28 28"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="14" cy="14" fill="#F1EBFE" r="14" />
          <path
            d="M14 7.5 L15.4 12.6 L20.5 14 L15.4 15.4 L14 20.5 L12.6 15.4 L7.5 14 L12.6 12.6 Z"
            fill="#8B5CF6"
          />
        </svg>
        <span className="font-sans text-[0.9375rem]/5.5 font-medium text-[#1E1E1E] sm:text-[1.0625rem]/5.5">
          {PERSONAS_HERO_QUESTION}
        </span>
      </div>

      <svg
        aria-hidden="true"
        className="hidden h-19 w-full max-w-268 shrink-0 md:block"
        preserveAspectRatio="none"
        viewBox="0 0 1072 76"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M536 0 C536 40 160 32 160 76"
          fill="none"
          stroke="#1E1E1E59"
          strokeDasharray="3 5"
          strokeLinecap="round"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M536 0 L536 76"
          fill="none"
          stroke="#1E1E1E59"
          strokeDasharray="3 5"
          strokeLinecap="round"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M536 0 C536 40 912 32 912 76"
          fill="none"
          stroke="#1E1E1E59"
          strokeDasharray="3 5"
          strokeLinecap="round"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <ul className="mt-6 grid w-full grid-cols-1 gap-4 md:mt-0 md:grid-cols-3 md:gap-8 lg:gap-14">
        {PERSONAS_HERO_CARDS.map((persona) => {
          const mentioned = persona.rank !== null;

          return (
            <li
              className="flex flex-col overflow-clip rounded-2xl border border-white/90 bg-white"
              key={persona.name}
            >
              <div className="flex items-center gap-3 px-4.5 pt-4.5 pb-3.5">
                <img
                  alt=""
                  className="size-11 shrink-0 rounded-full"
                  height={44}
                  src={persona.avatar}
                  width={44}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="font-sans text-[0.9375rem]/5 font-semibold text-[#1E1E1E]">
                    {persona.name}
                  </span>
                  <span className="font-sans text-[0.8125rem]/4.5 text-[#6B6B6B]">
                    {persona.role}
                  </span>
                </div>
              </div>
              <div className="flex grow flex-col gap-1.5 px-4.5 pb-4.5">
                <span className="font-mono text-[0.6875rem]/3.5 font-medium tracking-[0.08em] text-[#8A8A8A] uppercase">
                  Remembers
                </span>
                <p className="font-sans text-sm/5.25 text-[#1E1E1E]">
                  {persona.remembers}
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-[#EFEFEF] bg-[#FAFAFA] px-4.5 py-3">
                <div className="flex items-center gap-2">
                  <svg
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="8"
                      cy="8"
                      fill="none"
                      r="6.3"
                      stroke={mentioned ? "#3D9A5F" : "#A3A3A3"}
                      strokeWidth="1.4"
                    />
                    <path
                      d="M5.2 8.2 L7.1 10 L10.8 6.3"
                      fill="none"
                      stroke={mentioned ? "#3D9A5F" : "#A3A3A3"}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.4"
                    />
                  </svg>
                  <span
                    className={
                      mentioned
                        ? "font-sans text-[0.8125rem]/4 font-medium text-[#3D9A5F]"
                        : "font-sans text-[0.8125rem]/4 font-medium text-[#6B6B6B]"
                    }
                  >
                    {mentioned ? "Notra mentioned" : "Not mentioned"}
                  </span>
                </div>
                {mentioned ? (
                  <RankBadge rank={persona.rank} size="md" />
                ) : (
                  <span className="rounded-md border border-[#E4E4E4] bg-[#F2F2F2] px-2 py-0.75 font-mono text-xs/4 font-medium text-[#6B6B6B]">
                    None
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col items-center gap-3 pt-10 sm:flex-row sm:gap-4">
        <span className="font-sans text-sm/4.5 font-medium text-[#1E1E1E]/80">
          Asked as each persona on
        </span>
        <ul className="flex flex-wrap items-center justify-center gap-1 rounded-xl bg-white/88 p-1">
          {FEATURE_ENGINES.map(({ engine, label }) => (
            <li
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
              key={engine}
            >
              <EngineIcon className="size-3.5" engine={engine} />
              <span className="font-sans text-[0.8125rem]/4 font-medium text-[#1E1E1E]">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </StageShell>
  );
}
