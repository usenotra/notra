import { cn } from "@notra/ui/lib/utils";

import {
  FEATURE_STAGE_IMAGE,
  FEATURE_STAGE_IMAGE_CREDIT,
} from "@/constants/feature-pages/stage";
import type { FeatureStageShellProps } from "@/types/feature-detail-page";

export function StageShell({ className, children }: FeatureStageShellProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-clip rounded-3xl bg-cover bg-top p-4 pb-10 text-left sm:p-8 sm:pb-12 lg:p-16",
        className
      )}
      style={{ backgroundImage: `url(${FEATURE_STAGE_IMAGE})` }}
    >
      {children}
      <p className="absolute right-4 bottom-3 font-sans text-[0.6875rem] text-[#1E1E1E]/60">
        Photo by{" "}
        <a
          className="underline underline-offset-2 hover:text-[#1E1E1E]"
          href={FEATURE_STAGE_IMAGE_CREDIT.authorUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {FEATURE_STAGE_IMAGE_CREDIT.author}
        </a>{" "}
        on{" "}
        <a
          className="underline underline-offset-2 hover:text-[#1E1E1E]"
          href={FEATURE_STAGE_IMAGE_CREDIT.photoUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Pixabay
        </a>
      </p>
    </div>
  );
}
