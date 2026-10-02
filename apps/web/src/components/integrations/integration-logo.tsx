import { cn } from "@notra/ui/lib/utils";

import type { IntegrationLogoProps } from "@/types/integrations";

export function IntegrationLogo({
  integration,
  size,
  className,
  fill = false,
}: IntegrationLogoProps) {
  const light = integration.logoLightUrl ?? integration.logoDarkUrl;
  const dark = integration.logoDarkUrl ?? integration.logoLightUrl;
  const alt = `${integration.name} logo`;
  const fit = fill ? "object-cover" : "object-contain";
  const boxClass = fill ? "h-full w-full" : "";
  const boxStyle = fill
    ? undefined
    : { width: `${size / 16}rem`, height: `${size / 16}rem` };

  if (!(light && dark)) {
    return (
      <span
        className={cn("flex items-center justify-center", boxClass, className)}
        style={{ ...boxStyle, color: integration.brandColor ?? "#7C3AED" }}
      >
        <span className="font-sans text-[0.9em] font-semibold">
          {integration.name.charAt(0).toUpperCase()}
        </span>
      </span>
    );
  }

  if (light === dark) {
    return (
      <span className={cn(boxClass, className)} style={boxStyle}>
        <img
          decoding="async"
          loading="lazy"
          alt={alt}
          className={`block h-full w-full ${fit}`}
          height={size}
          src={light}
          width={size}
        />
      </span>
    );
  }

  return (
    <span className={cn(boxClass, className)} style={boxStyle}>
      <img
        decoding="async"
        loading="lazy"
        alt={alt}
        className={`block h-full w-full ${fit} dark:hidden`}
        height={size}
        src={light}
        width={size}
      />
      <img
        decoding="async"
        loading="lazy"
        alt={alt}
        className={`hidden h-full w-full ${fit} dark:block`}
        height={size}
        src={dark}
        width={size}
      />
    </span>
  );
}
