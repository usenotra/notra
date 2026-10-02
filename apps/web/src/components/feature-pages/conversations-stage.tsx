import { EngineIcon } from "@/components/feature-pages/engine-icon";
import { RankBadge } from "@/components/feature-pages/rank-badge";
import { StageShell } from "@/components/feature-pages/stage-shell";
import {
  CONVERSATIONS_THREAD_META,
  CONVERSATIONS_THREAD_TITLE,
  CONVERSATIONS_THREAD_TURNS,
} from "@/constants/feature-pages/conversations";

export function ConversationsStage() {
  return (
    <StageShell
      className="flex flex-col items-center justify-center gap-7 bg-[position:50%_40%] lg:flex-row"
      image="/features/stage/dusk.jpg"
    >
      <div className="flex w-full max-w-155 flex-col overflow-clip rounded-2xl border border-white/90 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#EFEFEF] px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-[0.9375rem]/5 font-semibold text-[#1E1E1E]">
              {CONVERSATIONS_THREAD_TITLE}
            </span>
            <span className="font-sans text-[0.8125rem]/4 text-[#6B6B6B]">
              {CONVERSATIONS_THREAD_META}
            </span>
          </div>
          <div className="flex items-center rounded-[0.625rem] border border-[#E4E4E4] p-0.75">
            <div className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 shadow-[0_0.0625rem_0.125rem_#0000001A]">
              <EngineIcon className="size-3.5" engine="chatgpt" />
              <span className="font-sans text-[0.8125rem]/4 font-medium text-[#1E1E1E]">
                ChatGPT
              </span>
            </div>
          </div>
        </div>
        <ol className="flex flex-col gap-5.5 px-5 pt-5.5 pb-6">
          {CONVERSATIONS_THREAD_TURNS.map((turn) => (
            <li className="flex flex-col gap-3" key={turn.question}>
              <div className="flex justify-end">
                <p className="rounded-3xl bg-[#EEEFF4] px-4 py-2.5 font-sans text-[0.9375rem]/5 text-[#1E1E1E]">
                  {turn.question}
                </p>
              </div>
              <div className="flex items-start justify-between gap-5">
                <div className="flex flex-col gap-1">
                  <span className="font-sans text-xs/4 text-[#8A8A8A]">
                    {turn.searched}
                  </span>
                  <p className="font-sans text-[0.9375rem]/5.5 text-[#1E1E1E]">
                    {turn.answer}
                  </p>
                </div>
                <RankBadge rank={turn.rank} size="md" />
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex w-full max-w-98 flex-col gap-4.5 rounded-2xl border border-white/90 bg-white/90 p-5.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-[0.9375rem]/5 font-semibold text-[#1E1E1E]">
            Position, turn by turn
          </span>
          <span className="font-sans text-[0.8125rem]/4.5 text-[#6B6B6B]">
            Where each brand lands after every follow-up
          </span>
        </div>
        <svg
          aria-label="Notra climbs from #2 to #1 while Profound drops from #1 to #4 over three turns"
          className="h-auto w-full"
          role="img"
          viewBox="0 0 348 208"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            fill="#8A8A8A"
            fontFamily="JetBrains Mono, monospace"
            fontSize="11"
          >
            <text x="0" y="24">
              #1
            </text>
            <text x="0" y="70">
              #2
            </text>
            <text x="0" y="116">
              #3
            </text>
            <text x="0" y="162">
              #4
            </text>
          </g>
          <g stroke="#E6E3EE">
            <path d="M36 20 H340" />
            <path d="M36 66 H340" />
            <path d="M36 112 H340" />
            <path d="M36 158 H340" />
          </g>
          <path
            d="M60 20 L188 112 L316 158"
            fill="none"
            stroke="#A3A3A3"
            strokeDasharray="4 5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <g fill="#FFFFFF" stroke="#A3A3A3" strokeWidth="2">
            <circle cx="60" cy="20" r="4.5" />
            <circle cx="188" cy="112" r="4.5" />
            <circle cx="316" cy="158" r="4.5" />
          </g>
          <path
            d="M60 66 L188 20 L316 20"
            fill="none"
            stroke="#8B5CF6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          <g fill="#8B5CF6">
            <circle cx="60" cy="66" r="5" />
            <circle cx="188" cy="20" r="5" />
            <circle cx="316" cy="20" r="5" />
          </g>
          <g
            fill="#6B6B6B"
            fontFamily="Inter, sans-serif"
            fontSize="12"
            textAnchor="middle"
          >
            <text x="60" y="200">
              Turn 1
            </text>
            <text x="188" y="200">
              Turn 2
            </text>
            <text x="316" y="200">
              Turn 3
            </text>
          </g>
        </svg>
        <div className="flex items-center gap-4.5 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="h-0.75 w-3.5 shrink-0 rounded-xs bg-[#8B5CF6]" />
            <span className="font-sans text-[0.8125rem]/4 font-medium text-[#1E1E1E]">
              Notra
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 shrink-0 border-t-2 border-dashed border-[#A3A3A3]" />
            <span className="font-sans text-[0.8125rem]/4 text-[#6B6B6B]">
              Profound
            </span>
          </div>
        </div>
      </div>
    </StageShell>
  );
}
