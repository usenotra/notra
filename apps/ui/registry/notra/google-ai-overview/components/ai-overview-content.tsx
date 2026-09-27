import { cn } from "cn";
import type { ComponentProps } from "react";

export const AIOverviewContent = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    className={cn("max-w-177 wrap-break-word", className)}
    data-slot="ai-overview-content"
    {...props}
  />
);

export const AIOverviewParagraph = ({
  className,
  ...props
}: ComponentProps<"p">) => (
  <p
    className={cn("mb-4 last:mb-0", className)}
    data-slot="ai-overview-paragraph"
    {...props}
  />
);

export const AIOverviewHeading = ({
  children,
  className,
  ...props
}: ComponentProps<"h3">) => (
  <h3
    className={cn(
      "text-aio-heading mt-6 mb-3 text-xl leading-7 font-semibold tracking-normal first:mt-0",
      className
    )}
    data-slot="ai-overview-heading"
    {...props}
  >
    {children}
  </h3>
);

export const AIOverviewList = ({
  className,
  ...props
}: ComponentProps<"ul">) => (
  <ul
    className={cn("mt-3 mb-4 list-disc ps-4.5 [&_ul]:list-[circle]", className)}
    data-slot="ai-overview-list"
    {...props}
  />
);

export const AIOverviewListItem = ({
  className,
  ...props
}: ComponentProps<"li">) => (
  <li
    className={cn("mb-3 ps-1", className)}
    data-slot="ai-overview-list-item"
    {...props}
  />
);

export const AIOverviewLink = ({
  children,
  className,
  rel = "noopener noreferrer",
  target = "_blank",
  ...props
}: ComponentProps<"a">) => (
  <a
    className={cn(
      "text-aio-link decoration-aio-link font-medium underline decoration-1 underline-offset-[0.0625rem]",
      className
    )}
    data-slot="ai-overview-link"
    rel={rel}
    target={target}
    {...props}
  >
    {children}
  </a>
);
