"use client";

import { type CSSProperties, type ElementType, memo, useId } from "react";
import { cn } from "@notra/ui/lib/utils";

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 1.7,
  spread = 4,
}: TextShimmerProps) => {
  const textId = `text-shimmer-${useId().replaceAll(":", "")}`;

  return (
    <Component
      className={cn("text-shimmer", className)}
      style={
        {
          "--text-shimmer-duration": `${duration}s`,
          "--text-shimmer-firefox-mask": `-moz-element(#${textId})`,
          "--text-shimmer-spread": `${spread}ch`,
        } as CSSProperties
      }
    >
      <span className="text-shimmer__text" id={textId}>
        {children}
      </span>
      {/* Keyed by the text: Chrome keeps painting the old glyph mask when the text changes in place. */}
      <span
        aria-hidden="true"
        className="text-shimmer__mask"
        inert
        key={children}
      >
        {children}
      </span>
    </Component>
  );
};

export const Shimmer = memo(ShimmerComponent);
