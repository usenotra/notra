"use client";

import { cn } from "cn";
import { useState } from "react";

/* True from the first `loading` change until the swap back has finished, so
   buttons don't animate on mount and stop clipping once they're idle again. */
function useLoadingSwap(loading: boolean) {
  const [previousLoading, setPreviousLoading] = useState(loading);
  const [isSwapping, setIsSwapping] = useState(false);
  if (loading !== previousLoading) {
    setPreviousLoading(loading);
    setIsSwapping(true);
  }
  return { finishSwap: () => setIsSwapping(false), isSwapping };
}

function MarketingButtonSpinner({
  entering,
  loading,
  onSwappedOut,
}: {
  entering: boolean;
  loading: boolean;
  onSwappedOut: () => void;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        // Shortened rather than removed under reduced motion: the swap only
        // finishes on `animationend`, which never fires without an animation.
        "pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:[animation-delay:0ms] motion-reduce:[animation-duration:1ms]",
        loading
          ? entering && "animate-button-swap-in [animation-delay:70ms]"
          : "animate-button-swap-out opacity-0"
      )}
      data-slot="marketing-button-spinner"
      onAnimationEnd={(event) => {
        if (!loading && event.target === event.currentTarget) {
          onSwappedOut();
        }
      }}
    >
      <svg
        className="size-[1.125em]! animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]"
        fill="none"
        viewBox="0 0 20 20"
      >
        <circle
          cx="10"
          cy="10"
          r="8"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="2.5"
        />
        <path
          d="M10 2a8 8 0 0 1 8 8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
    </span>
  );
}

/* The animated inside of `MarketingButton`, the same swap as `Button`'s loading
   state with a spinner instead of dots: the label blurs up and out, the
   spinner rises in from below. Kept in its own client module so
   `marketing-button.tsx` stays importable from server code that only calls
   `marketingButtonVariants`. The label is only wrapped while a state is showing. */
function MarketingButtonContent({
  children,
  loading,
}: {
  children?: React.ReactNode;
  loading: boolean;
}) {
  const { finishSwap, isSwapping } = useLoadingSwap(loading);
  const showSpinner = loading || isSwapping;

  return (
    <>
      {showSpinner ? (
        <span
          className={cn(
            "relative inline-flex min-w-0 items-center [justify-content:inherit] [gap:inherit] motion-reduce:animate-none",
            loading && "opacity-0",
            isSwapping &&
              (loading
                ? "animate-button-swap-out"
                : "animate-button-swap-in [animation-delay:70ms]")
          )}
          // Tells the button to clip the swapping layers to its shape.
          data-clip=""
          data-slot="marketing-button-label"
        >
          {children}
        </span>
      ) : (
        children
      )}
      {showSpinner && (
        <MarketingButtonSpinner
          entering={isSwapping}
          loading={loading}
          onSwappedOut={finishSwap}
        />
      )}
    </>
  );
}

export { MarketingButtonContent };
