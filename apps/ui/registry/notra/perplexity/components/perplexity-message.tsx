import { cn } from "cn";

import type { PerplexityMessageProps } from "../types/perplexity";

export const PerplexityMessage = ({
  actions,
  children,
  className,
  from,
  search,
  ...props
}: PerplexityMessageProps) => {
  if (from === "user") {
    return (
      <div
        className={cn(
          "group/message flex items-center justify-end gap-3",
          className
        )}
        data-from="user"
        data-slot="perplexity-message"
        {...props}
      >
        {actions ? (
          <div className="opacity-0 transition-opacity duration-150 group-focus-within/message:opacity-100 group-hover/message:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100">
            {actions}
          </div>
        ) : null}
        <div className="bg-pplx-bubble font-pplx text-pplx-fg max-w-[min(36rem,82%)] rounded-2xl px-4 py-2.5 text-base leading-6">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("flex w-full flex-col items-start gap-3.5", className)}
      data-from="assistant"
      data-slot="perplexity-message"
      {...props}
    >
      {search}
      {children ? (
        <div className="font-pplx-serif text-pplx-fg max-w-2xl text-base leading-6.5 font-normal">
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className="-ms-1.5 w-full max-w-2xl">{actions}</div>
      ) : null}
    </div>
  );
};
