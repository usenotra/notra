"use client";

import { GEO_LOGO_SIZE_PX } from "@notra/geo-core/constants/geo";
import { projectLogoSources } from "@notra/geo-core/geo/logo";
import { brandEngineIconKey } from "@notra/geo-core/utils/geo-engine-icon";
import { cn } from "@notra/ui/lib/utils";
import Image from "next/image";
import { useState } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { useCompanyLogo } from "@/lib/hooks/use-onboarding";
import type { GeoProjectLogoProps } from "@/types/geo";

function ProjectLogoInner({
  name,
  domain,
  logo,
  className,
  fallbackClassName,
}: GeoProjectLogoProps & { logo: string | null }) {
  const sources = projectLogoSources(domain, name.toLowerCase(), logo);
  const [sourceIndex, setSourceIndex] = useState(0);
  const activeIndex = Math.min(sourceIndex, sources.length - 1);
  const src = sources[activeIndex] ?? sources.at(-1) ?? "";
  const isFallback = activeIndex === sources.length - 1;

  return (
    <span
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm",
        className,
        isFallback && fallbackClassName
      )}
      data-slot="avatar"
    >
      <Image
        alt={`${name} logo`}
        className="size-full object-contain"
        height={GEO_LOGO_SIZE_PX}
        onError={() => {
          setSourceIndex((current) =>
            Math.min(current + 1, sources.length - 1)
          );
        }}
        src={src}
        unoptimized
        width={GEO_LOGO_SIZE_PX}
      />
    </span>
  );
}

function RemoteProjectLogo({
  name,
  domain,
  className,
  fallbackClassName,
}: GeoProjectLogoProps) {
  const { data } = useCompanyLogo(domain);
  const logo = data?.url ?? null;

  return (
    <ProjectLogoInner
      className={className}
      domain={domain}
      fallbackClassName={fallbackClassName}
      key={`${domain ?? ""}:${name}:${logo ?? ""}`}
      logo={logo}
      name={name}
    />
  );
}

export function ProjectLogo({
  name,
  domain,
  className,
  fallbackClassName,
}: GeoProjectLogoProps) {
  const engine = brandEngineIconKey(name, domain);
  if (engine) {
    return (
      <span
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center",
          className
        )}
      >
        <EngineIcon className="size-full" engine={engine} />
      </span>
    );
  }
  return (
    <RemoteProjectLogo
      className={className}
      domain={domain}
      fallbackClassName={fallbackClassName}
      name={name}
    />
  );
}
