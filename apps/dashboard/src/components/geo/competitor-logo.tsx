"use client";

import { GEO_LOGO_SIZE_PX } from "@notra/geo-core/constants/geo";
import { findCompetitorDomain } from "@notra/geo-core/geo/domain";
import { competitorLogoSources } from "@notra/geo-core/geo/logo";
import { brandEngineIconKey } from "@notra/geo-core/utils/geo-engine-icon";
import { cn } from "@notra/ui/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { useCompanyLogo } from "@/lib/hooks/use-onboarding";
import type { CompetitorLogoProps } from "@/types/geo";

function KnownEngineLogo({
  engine,
  className,
  onSettled,
}: {
  engine: string;
  className?: string;
  onSettled?: () => void;
}) {
  useEffect(() => {
    onSettled?.();
  }, [onSettled]);

  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center",
        className
      )}
    >
      <EngineIcon className="size-full" engine={engine} />
    </span>
  );
}

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

function RemoteCompetitorLogo({
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

export function CompetitorLogo({
  name,
  domain = null,
  competitors,
  className,
  onSettled,
}: CompetitorLogoProps) {
  const engine = brandEngineIconKey(
    name,
    domain ?? findCompetitorDomain(competitors, name)
  );
  if (engine) {
    return (
      <KnownEngineLogo
        className={className}
        engine={engine}
        onSettled={onSettled}
      />
    );
  }
  return (
    <RemoteCompetitorLogo
      className={className}
      competitors={competitors}
      domain={domain}
      name={name}
      onSettled={onSettled}
    />
  );
}
