"use client";

import { MessageResponse } from "@notra/ui/components/ai-elements/message";
import { PerplexityFavicon } from "@notra/ui/components/brainless/perplexity/perplexity-favicon";
import type { ComponentProps } from "react";

import type { CommentBodyProps } from "@/types/comments";

function CommentLink({ children, href }: ComponentProps<"a">) {
  let url: URL;
  try {
    url = new URL(href ?? "");
  } catch {
    return <span>{children}</span>;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return <span>{children}</span>;
  }
  return (
    <a
      href={url.href}
      target="_blank"
      rel="noopener noreferrer"
      title={url.href}
      className="bg-muted/60 hover:bg-muted decoration-border inline items-baseline rounded-md px-1 py-0.5 text-sm font-medium underline underline-offset-4 transition-colors"
    >
      <PerplexityFavicon
        domain={url.hostname}
        className="mr-1 inline-block size-3.5 align-[-2px]"
      />
      {children}
    </a>
  );
}

const commentComponents = { a: CommentLink };

export function CommentBody({ body }: CommentBodyProps) {
  return (
    <MessageResponse
      mode="static"
      components={commentComponents}
      className="mt-1 h-auto text-sm leading-6 [&_ol]:my-2 [&_p]:my-2 [&_p]:whitespace-pre-wrap [&_ul]:my-2"
    >
      {body}
    </MessageResponse>
  );
}
