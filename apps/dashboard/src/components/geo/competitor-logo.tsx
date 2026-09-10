"use client";

import { GEO_LOGO_SIZE_PX } from "@notra/geo-core/constants/geo";
import { findCompetitorDomain } from "@notra/geo-core/geo/domain";
import { competitorLogoSources } from "@notra/geo-core/geo/logo";
import { cn } from "@notra/ui/lib/utils";
import Image from "next/image";
import { useState } from "react";

import { useCompanyLogo } from "@/lib/hooks/use-onboarding";
import type { CompetitorLogoProps } from "@/types/geo";

function CompetitorLogoFallback({
  name,
  className,
}: {
  name: string;
  className: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(className, "bg-muted text-[0.625rem] leading-none")}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function CompetitorLogoInner({
  name,
  domain,
  logo,
  className,
  onSettled,
}: CompetitorLogoProps & { logo: string | null }) {
  const sources = competitorLogoSources(domain ?? null, logo);
  const [sourceIndex, setSourceIndex] = useState(0);
  const src = sources[sourceIndex] ?? null;

  const shellClassName = cn(
    "inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-sm",
    className
  );

  if (!src) {
    return <CompetitorLogoFallback className={shellClassName} name={name} />;
  }

  return (
    <span className={cn(shellClassName, "bg-muted")}>
      <Image
        alt={`${name} logo`}
        className="size-full object-contain"
        height={GEO_LOGO_SIZE_PX}
        onError={() => {
          if (sourceIndex + 1 < sources.length) {
            setSourceIndex((current) => current + 1);
            return;
          }
          onSettled?.();
          setSourceIndex(sources.length);
        }}
        onLoad={() => onSettled?.()}
        src={src}
        unoptimized
        width={GEO_LOGO_SIZE_PX}
      />
    </span>
  );
}

export function CompetitorLogo({
  name,
  domain = null,
  competitors,
  className,
  onSettled,
}: CompetitorLogoProps) {
  const trackedDomain = domain ?? findCompetitorDomain(competitors, name);
  const { data } = useCompanyLogo(trackedDomain, name);
  const resolvedDomain = trackedDomain ?? data?.domain ?? null;
  const logo = data?.url ?? null;

  return (
    <CompetitorLogoInner
      className={className}
      domain={resolvedDomain}
      key={`${resolvedDomain ?? ""}:${name}:${logo ?? ""}`}
      logo={logo}
      name={name}
      onSettled={onSettled}
    />
  );
}
