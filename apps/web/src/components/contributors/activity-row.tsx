import { cn } from "@notra/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import type { ActivityRowProps } from "~types/contributors";

import { formatGitHubDate } from "@/utils/github";

export function ActivityRow({
  href,
  title,
  number,
  badgeLabel,
  badgeClassName,
  authorLogin,
  authorAvatarUrl,
  createdAt,
  isLast,
}: ActivityRowProps) {
  return (
    <Link
      className={cn(
        "group flex items-start gap-3 px-4.5 py-4 transition-colors hover:bg-[#F8F6FC] dark:hover:bg-white/5",
        !isLast && "border-b border-[#ECECEC] dark:border-white/10"
      )}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Image
        alt={`Avatar of ${authorLogin}`}
        className="mt-0.5 size-6 shrink-0 rounded-full"
        height={48}
        src={authorAvatarUrl}
        width={48}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 font-sans text-xs/4 font-medium",
              badgeClassName
            )}
          >
            {badgeLabel}
          </span>
          <span className="font-sans text-[0.8125rem]/4.5 text-[#6A6B70] dark:text-white/60">
            #{number}
          </span>
        </span>
        <span className="group-hover:text-primary line-clamp-2 font-sans text-[0.9375rem]/5.5 font-medium tracking-[-0.01em] text-[#1E1E1E] transition-colors dark:text-white">
          {title}
        </span>
        <span className="font-sans text-[0.8125rem]/4.5 text-[#6A6B70] dark:text-white/60">
          by {authorLogin} · {formatGitHubDate(createdAt)}
        </span>
      </span>
    </Link>
  );
}
