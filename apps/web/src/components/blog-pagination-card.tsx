import { ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card } from "@notra/ui/components/ui/card";
import Link from "next/link";
import type { BlogPaginationCardProps } from "~types/blog";

import { BlogAuthorAvatar } from "@/components/blog-author-avatar";

export function BlogPaginationCard({
  link,
  direction,
  align,
}: BlogPaginationCardProps) {
  const isPrevious = direction === "previous";
  const isRight = align === "right";
  const label = isPrevious ? "Previous" : "Next";
  const icon = isRight ? ArrowRight02Icon : ArrowLeft02Icon;
  const containerAlignment = isRight
    ? "items-end text-right"
    : "items-start text-left";
  const authorRowDirection = isRight ? "flex-row-reverse" : "flex-row";

  return (
    <Link className="group block h-full" href={link.href}>
      <Card
        className={`hover:ring-primary/40 h-full gap-3 p-5 transition-colors hover:bg-[#C8B2EE26] dark:hover:bg-white/[0.04] ${containerAlignment}`}
      >
        <span className="flex items-center gap-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
          {isRight ? (
            <>
              {label}
              <HugeiconsIcon
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                icon={icon}
                strokeWidth={2}
              />
            </>
          ) : (
            <>
              <HugeiconsIcon
                className="size-3.5 transition-transform group-hover:-translate-x-0.5"
                icon={icon}
                strokeWidth={2}
              />
              {label}
            </>
          )}
        </span>
        <h3 className="font-display group-hover:text-primary line-clamp-2 text-base leading-snug font-medium tracking-[-0.01em] text-[#1E1E1E] transition-colors dark:text-white">
          {link.title}
        </h3>
        {link.author ? (
          <div
            className={`text-muted-foreground mt-auto flex items-center gap-2 font-sans text-sm ${authorRowDirection}`}
          >
            <BlogAuthorAvatar
              image={link.author.image}
              name={link.author.name}
              size={24}
            />
            <span>{link.author.name}</span>
          </div>
        ) : null}
      </Card>
    </Link>
  );
}
