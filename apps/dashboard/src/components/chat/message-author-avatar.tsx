"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { TRANSITION } from "@notra/ui/lib/motion";
import { m, useReducedMotion } from "motion/react";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { MessageAuthorAvatarProps } from "@/types/components/chat-page";
import { getUserAvatarUrl } from "@/utils/avatar";

export function MessageAuthorAvatar({
  author,
  size = "default",
}: MessageAuthorAvatarProps) {
  const t = useTranslations("chat.author");
  const label = author.name ?? t("formerMember");
  const reduceMotion = useReducedMotion();

  return (
    <m.div
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "shrink-0 overflow-hidden",
        size === "sm" ? "size-4" : "mt-1.5 size-8"
      )}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
      transition={TRANSITION.enter}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={label}
              className="block rounded-full"
              type="button"
            />
          }
        >
          <Avatar className={size === "sm" ? "size-4" : "size-8"}>
            <AvatarImage
              alt={label}
              src={getUserAvatarUrl(author.image, author.seed)}
            />
            <AvatarFallback>
              {author.name ? author.name.charAt(0).toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </m.div>
  );
}
