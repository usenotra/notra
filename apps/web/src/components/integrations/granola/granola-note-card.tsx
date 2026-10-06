import { Granola } from "@notra/ui/components/ui/svgs/granola";
import { cn } from "@notra/ui/lib/utils";

import {
  GRANOLA_NOTE_CHIPS,
  GRANOLA_NOTE_HEADING,
  GRANOLA_NOTE_INPUT_PLACEHOLDER,
  GRANOLA_NOTE_LINES,
  GRANOLA_NOTE_TITLE,
} from "@/constants/granola-integration";

export function GranolaNoteCard() {
  return (
    <div className="relative flex w-full grow basis-0 flex-col gap-3 rounded-[0.875rem] bg-[#191919] px-5 pt-4.5 pb-4 [box-shadow:#28282833_0_0.0625rem_0.125rem,#00000014_0_0_0_0.0625rem] lg:w-auto dark:[box-shadow:#FFFFFF14_0_0_0_0.0625rem]">
      <div className="flex flex-col gap-2.5">
        <span className="pr-8 font-serif text-[1.1875rem] leading-6 text-[#F5F4F0]">
          {GRANOLA_NOTE_TITLE}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {GRANOLA_NOTE_CHIPS.map((chip) => (
            <span
              className="rounded-full border border-[#FFFFFF1A] bg-[#FFFFFF12] px-2.25 py-0.75 font-sans text-[0.6875rem] leading-3.5 text-[#D8D6CF]"
              key={chip}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.75 pt-0.5">
        <div className="flex items-baseline gap-2">
          <span className="w-3 shrink-0 font-sans text-xs leading-4 text-[#8A8A82]">
            #
          </span>
          <span className="font-sans text-[0.8125rem] leading-4.5 font-semibold text-[#EDEBE4]">
            {GRANOLA_NOTE_HEADING}
          </span>
        </div>
        {GRANOLA_NOTE_LINES.map((line) => (
          <div
            className={cn("flex items-baseline gap-2", line.nested && "pl-5")}
            key={line.text}
          >
            <span className="w-3 shrink-0 font-sans text-xs leading-4 text-[#6E6E67]">
              {line.nested ? "◦" : "•"}
            </span>
            <span className="font-sans text-[0.78125rem] leading-4.5 text-[#B9B7AF]">
              {line.text}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-2.5">
        <span className="flex size-8.5 shrink-0 items-center justify-center gap-[0.15625rem] rounded-full border border-[#FFFFFF1F] bg-[#282828]">
          <span className="h-1.5 w-0.75 animate-[granolaBar_1.8s_ease-in-out_infinite] rounded-xs bg-[#B2C248] motion-reduce:animate-none" />
          <span className="h-3 w-0.75 animate-[granolaBar_1.8s_ease-in-out_infinite] rounded-xs bg-[#B2C248] [animation-delay:-0.6s] motion-reduce:animate-none" />
          <span className="h-1.5 w-0.75 animate-[granolaBar_1.8s_ease-in-out_infinite] rounded-xs bg-[#B2C248] [animation-delay:-1.2s] motion-reduce:animate-none" />
        </span>
        <span className="flex h-8.5 grow items-center rounded-full border border-[#FFFFFF14] bg-[#222222] px-3.5 font-sans text-[0.78125rem] leading-4 text-[#79786F]">
          {GRANOLA_NOTE_INPUT_PLACEHOLDER}
        </span>
      </div>
      <div className="absolute -top-5.5 -right-5 hidden h-20.5 w-11.5 flex-col items-center justify-center gap-2.5 rounded-[1.4375rem] border border-[#FFFFFF14] bg-[#282828] [box-shadow:#00000059_0_0.5rem_1.25rem] sm:flex">
        <Granola className="size-4.5 shrink-0" />
        <span className="flex items-center gap-0.75">
          <span className="h-2.25 w-[0.21875rem] animate-[granolaBar_1.8s_ease-in-out_infinite] rounded-xs bg-[#B2C248] motion-reduce:animate-none" />
          <span className="h-4.25 w-[0.21875rem] animate-[granolaBar_1.8s_ease-in-out_infinite] rounded-xs bg-[#B2C248] [animation-delay:-0.6s] motion-reduce:animate-none" />
          <span className="h-2.25 w-[0.21875rem] animate-[granolaBar_1.8s_ease-in-out_infinite] rounded-xs bg-[#B2C248] [animation-delay:-1.2s] motion-reduce:animate-none" />
        </span>
      </div>
    </div>
  );
}
