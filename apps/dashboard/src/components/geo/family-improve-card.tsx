"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_FAMILY_IMPROVE_CTA_GAPS } from "@notra/geo-core/constants/geo";
import Link from "next/link";

import { buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";
import type { FamilyImproveCardProps } from "@/types/geo";

export function FamilyImproveCard({
  insight,
  gapsHref,
}: FamilyImproveCardProps) {
  return (
    <section className="bg-muted/50 @container/improve rounded-2xl px-4 py-3">
      <div className="flex flex-col items-start gap-3 @min-[24rem]/improve:flex-row @min-[24rem]/improve:items-center @min-[24rem]/improve:gap-4">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className="text-sm font-medium">{insight.title}</h3>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
            {insight.body}
          </p>
        </div>
        {gapsHref ? (
          <Link
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "shrink-0"
            )}
            href={gapsHref}
          >
            {GEO_FAMILY_IMPROVE_CTA_GAPS}
            <HugeiconsIcon data-icon="inline-end" icon={ArrowRight01Icon} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
