"use client";

import { UserCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@notra/ui/components/ui/avatar";
import { useTranslations } from "use-intl";

import { cn } from "@/lib/utils";
import type { GeoShelfMemberAvatarProps } from "@/types/geo-shelf";
import { getUserAvatarUrl } from "@/utils/avatar";
import { shelfMemberInitial } from "@/utils/geo-shelf";

const AVATAR_SIZE = {
  sm: "size-4",
  md: "size-6",
} as const;

export function ShelfMemberAvatar({
  member,
  className,
  fallbackLabel: fallbackLabelProp,
  showLabel = true,
  size = "md",
}: GeoShelfMemberAvatarProps) {
  const tCommon = useTranslations("common");
  const fallbackLabel = fallbackLabelProp ?? tCommon("labels.unassigned");
  const label = member ? member.name || member.email : fallbackLabel;
  const markClass = AVATAR_SIZE[size];
  return (
    <span
      className={cn(
        "inline-flex items-center",
        showLabel ? "min-w-0 gap-2" : "shrink-0",
        !member && "text-muted-foreground",
        className
      )}
      title={member?.email ?? fallbackLabel}
    >
      {member ? (
        <Avatar className={cn("shrink-0", markClass)}>
          <AvatarImage
            alt={label}
            src={getUserAvatarUrl(member.image, member.email)}
          />
          <AvatarFallback className="text-[0.625rem]">
            {shelfMemberInitial(member)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <span
          className={cn(
            "border-border inline-flex shrink-0 items-center justify-center rounded-full border border-dashed",
            markClass
          )}
        >
          <HugeiconsIcon
            className={size === "sm" ? "size-2.5" : "size-3.5"}
            icon={UserCircleIcon}
          />
        </span>
      )}
      {showLabel ? (
        <span className={cn("truncate", size === "sm" ? "text-xs" : "text-sm")}>
          {label}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
