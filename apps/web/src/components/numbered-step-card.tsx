import { DeferredDithering } from "@/components/deferred-dithering";
import type { NumberedStepCardProps } from "@/types/numbered-step-card";

export function NumberedStepCard({
  number,
  title,
  body,
}: NumberedStepCardProps) {
  return (
    <li className="relative flex flex-col gap-2.5 overflow-clip rounded-[0.8125rem] bg-[#F1ECFB40] p-9 pb-56 shadow-[0_0.0625rem_0.125rem_#0A0D1408] dark:bg-white/5">
      <h3 className="font-display text-2xl leading-[1.16] font-medium tracking-[-0.015em] text-[#1E1E1E] dark:text-white">
        {title}
      </h3>
      <p className="font-sans text-base leading-[1.4] tracking-[-0.005em] text-[#1E1E1EA6] dark:text-white/60">
        {body}
      </p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[13.8125rem] bg-[linear-gradient(180deg,#C8B2EE00,#C8B2EE99)] dark:bg-[linear-gradient(180deg,#C8B2EE00,#3a2d5c99)]" />
      <span
        aria-hidden="true"
        className="font-display absolute -bottom-12 -left-3 text-[13rem] leading-none font-medium tracking-[-0.02em] text-white [-webkit-text-stroke:0.25rem_#b39ce4] [paint-order:stroke] dark:text-[#241d33] dark:[-webkit-text-stroke:0.25rem_#ffffff40]"
      >
        {number}
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
    </li>
  );
}
