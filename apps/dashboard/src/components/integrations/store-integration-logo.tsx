"use client";

import { useTranslations } from "use-intl";

import Image from "@/components/framework/image";
import type { StoreIntegrationLogoProps } from "@/types/integrations/mcp";

export function StoreIntegrationLogo({
  integration,
}: StoreIntegrationLogoProps) {
  const tCommon = useTranslations("common");
  const lightLogo = integration.logoLightUrl ?? integration.logoDarkUrl;
  const darkLogo = integration.logoDarkUrl ?? integration.logoLightUrl;

  if (lightLogo && darkLogo) {
    return (
      <>
        <Image
          alt={tCommon("labels.nameLogo", { name: integration.name })}
          className="size-6 rounded object-contain dark:hidden"
          height={24}
          src={lightLogo}
          width={24}
        />
        <Image
          alt={tCommon("labels.nameLogo", { name: integration.name })}
          className="hidden size-6 rounded object-contain dark:block"
          height={24}
          src={darkLogo}
          width={24}
        />
      </>
    );
  }

  return (
    <span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded text-xs font-medium">
      {integration.name.trim().slice(0, 2).toUpperCase() || "?"}
    </span>
  );
}
