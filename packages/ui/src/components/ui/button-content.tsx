"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { useState } from "react";

import { cn } from "@notra/ui/lib/utils";

// Each dot rises in a beat after the label starts leaving, then bounces in turn.
const LOADING_DOTS = [
  { bounce: "[animation-delay:0ms]", enter: "[animation-delay:70ms]" },
  { bounce: "[animation-delay:140ms]", enter: "[animation-delay:110ms]" },
  { bounce: "[animation-delay:280ms]", enter: "[animation-delay:150ms]" },
] as const;

interface ButtonContentProps {
  children?: React.ReactNode;
  loading: boolean;
  progress: number | undefined;
}

/* The animated inside of `Button`: the label, the loading dots and the
   progress fill. Kept in its own client module so `button.tsx` stays importable
   from server components that only call `buttonVariants`. */
function ButtonContent({ children, loading, progress }: ButtonContentProps) {
  const hasProgress = progress !== undefined;

  // Swap animations only run after `loading` has changed once, so buttons
  // don't animate their label in on mount.
  const [previousLoading, setPreviousLoading] = useState(loading);
  const [hasSwapped, setHasSwapped] = useState(false);
  if (loading !== previousLoading) {
    setPreviousLoading(loading);
    setHasSwapped(true);
  }

  // Clearing `progress` keeps the bar mounted at 100% until it has faded out.
  const [previousHasProgress, setPreviousHasProgress] = useState(hasProgress);
  const [isCompletingProgress, setIsCompletingProgress] = useState(false);
  if (hasProgress !== previousHasProgress) {
    setPreviousHasProgress(hasProgress);
    setIsCompletingProgress(!hasProgress);
  }
  const showProgress = hasProgress || isCompletingProgress;

  return (
    <>
      {showProgress && (
        // Decorative: a button's content only feeds its accessible name, so the
        // progressbar role (and Base UI's hidden "x") would just garble it.
        // The button reports `aria-busy` instead.
        <ProgressPrimitive.Root
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0",
            isCompletingProgress && "animate-button-progress-out"
          )}
          data-slot="button-progress"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) {
              setIsCompletingProgress(false);
            }
          }}
          render={<span />}
          value={hasProgress ? progress : 100}
        >
          <ProgressPrimitive.Track
            className="absolute inset-0 overflow-hidden"
            render={<span />}
          >
            <ProgressPrimitive.Indicator
              className="absolute inset-y-0 start-0 bg-current/15 transition-[width] duration-slow ease-emphasized motion-reduce:transition-none"
              render={<span />}
            />
          </ProgressPrimitive.Track>
        </ProgressPrimitive.Root>
      )}
      <span
        className={cn(
          "relative inline-flex min-w-0 flex-1 items-center [gap:inherit] [justify-content:inherit] motion-reduce:animate-none",
          loading && "opacity-0",
          hasSwapped &&
            (loading
              ? "animate-button-swap-out"
              : "animate-button-swap-in [animation-delay:70ms]")
        )}
        // Tells the button to clip the swapping layers to its shape.
        data-clip={loading || hasSwapped || showProgress ? "" : undefined}
        data-slot="button-label"
      >
        {children}
      </span>
      {(loading || hasSwapped) && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center gap-[0.2em]",
            !loading &&
              "animate-button-swap-out opacity-0 motion-reduce:animate-none"
          )}
          data-slot="button-loader"
        >
          {LOADING_DOTS.map(({ bounce, enter }) => (
            <span
              className={cn(
                "motion-reduce:animate-none",
                loading && hasSwapped && `animate-button-swap-in ${enter}`
              )}
              key={enter}
            >
              <span
                className={cn(
                  "block size-[0.3em] animate-button-dot rounded-full bg-current motion-reduce:animate-none",
                  bounce,
                  !loading && "[animation-play-state:paused]"
                )}
              />
            </span>
          ))}
        </span>
      )}
    </>
  );
}

export { ButtonContent };
