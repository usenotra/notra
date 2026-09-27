"use client";

import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";
import type { AddReferenceControlProps } from "@/types/content/post-social";

export function AddReferenceControl({
  voices,
  referencedVoiceIds,
  isPending,
  onAdd,
  onMissingVoice,
}: AddReferenceControlProps) {
  const t = useTranslations("content.postSocial");
  const tCommon = useTranslations("common");
  if (voices.length === 0) {
    return (
      <Button onClick={onMissingVoice} variant="outline">
        {t("addAsReference")}
      </Button>
    );
  }

  const referencedVoiceIdSet = new Set(referencedVoiceIds);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline" }))}
        disabled={isPending}
      >
        {isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {t("addAsReference")}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {voices.map((voice) => {
          const alreadyAdded = referencedVoiceIdSet.has(voice.id);
          return (
            <DropdownMenuItem
              disabled={alreadyAdded}
              key={voice.id}
              onClick={() => onAdd(voice.id, voice.name)}
            >
              <span className="min-w-0 truncate" title={voice.name}>
                {voice.name}
              </span>
              {voice.isDefault && (
                <span className="text-muted-foreground shrink-0 text-xs">
                  {tCommon("labels.default")}
                </span>
              )}
              {alreadyAdded && (
                <HugeiconsIcon className="ml-auto size-4" icon={Tick02Icon} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
