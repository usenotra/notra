"use client";

import { GEO_LOGO_SIZE_PX } from "@notra/geo-core/constants/geo";
import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";
import { useTranslations } from "use-intl";

import Image from "@/components/framework/image";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import type { CompetitorBrandLogoProps } from "@/types/onboarding";

export function CompetitorBrandLogo({
  name,
  domain,
  logo,
  className,
}: CompetitorBrandLogoProps) {
  const tCommon = useTranslations("common");
  const [failed, setFailed] = useState(false);

  if (!logo || failed) {
    return <CompetitorLogo className={className} domain={domain} name={name} />;
  }

  return (
    <span
      className={cn(
        "bg-muted inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-sm",
        className
      )}
    >
      <Image
        alt={tCommon("labels.nameLogo", { name })}
        className="size-full object-contain"
        height={GEO_LOGO_SIZE_PX}
        onError={() => setFailed(true)}
        src={logo}
        unoptimized
        width={GEO_LOGO_SIZE_PX}
      />
    </span>
  );
}
