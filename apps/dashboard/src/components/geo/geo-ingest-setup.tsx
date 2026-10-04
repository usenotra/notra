"use client";

import {
  GEO_INGEST_DEFAULT_FRAMEWORK,
  GEO_INGEST_DEFAULT_PACKAGE_MANAGER,
  GEO_INGEST_FRAMEWORK_OPTIONS,
  GEO_INGEST_PACKAGE_MANAGER_OPTIONS,
  GEO_INGEST_TOKEN_ENV,
} from "@notra/geo-core/constants/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { ApiKeyRevealField } from "@/components/api-keys/api-key-reveal-field";
import {
  CodeSnippet,
  CodeSnippetTabs,
  CopyPromptButton,
} from "@/components/geo/code-snippet";
import { GeoPackageManagerIcon } from "@/components/geo/package-manager-icon";
import { TRAFFIC_INSTALL_COPY_KINDS } from "@/constants/geo-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import type { TrafficInstallCopyKind } from "@/types/analytics/geo-events";
import type { GeoIngestSetupPanelProps } from "@/types/geo";
import {
  geoIngestAgentPrompt,
  geoIngestInstallCommand,
  geoIngestSnippet,
  isGeoIngestFramework,
  isGeoIngestPackageManager,
} from "@/utils/geo-ingest";

const PACKAGE_MANAGER_TABS = GEO_INGEST_PACKAGE_MANAGER_OPTIONS.map(
  (option) => ({
    ...option,
    icon: <GeoPackageManagerIcon manager={option.value} />,
  })
);

export function GeoIngestSetup({ setup, className }: GeoIngestSetupPanelProps) {
  const t = useTranslations("geo.geoIngestSetup");
  const tCommon = useTranslations("common");
  const [framework, setFramework] = useState(GEO_INGEST_DEFAULT_FRAMEWORK);
  const [packageManager, setPackageManager] = useState(
    GEO_INGEST_DEFAULT_PACKAGE_MANAGER
  );
  const snippet = geoIngestSnippet(setup, framework);
  const installCommand = geoIngestInstallCommand(packageManager);
  const agentPrompt = geoIngestAgentPrompt(setup, framework, packageManager);
  const file =
    GEO_INGEST_FRAMEWORK_OPTIONS.find((option) => option.value === framework)
      ?.file ?? "proxy.ts";
  const token = setup?.token ?? "";
  const viewedRef = useRef(false);
  const hasToken = token.length > 0;

  useEffect(() => {
    if (viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.TRAFFIC_INSTALL_SNIPPET_VIEWED, {
      framework,
      package_manager: packageManager,
      has_token: hasToken,
    });
  }, [framework, hasToken, packageManager]);

  const trackCopied = (kind: TrafficInstallCopyKind) => {
    trackEvent(POSTHOG_EVENTS.TRAFFIC_INSTALL_SNIPPET_COPIED, {
      framework,
      package_manager: packageManager,
      kind,
    });
  };

  return (
    <div className={cn("space-y-5", className)}>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">
          {tCommon("labels.installThePackage")}
        </h3>
        <CodeSnippet
          code={installCommand}
          onCopy={() => trackCopied(TRAFFIC_INSTALL_COPY_KINDS.INSTALL_COMMAND)}
          tabs={
            <CodeSnippetTabs
              label={tCommon("labels.packageManager")}
              onValueChange={(value) => {
                if (isGeoIngestPackageManager(value)) {
                  setPackageManager(value);
                }
              }}
              options={PACKAGE_MANAGER_TABS}
              value={packageManager}
            />
          }
        />
      </section>
      {token ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">{t("tokenTitle")}</h3>
          <p className="text-muted-foreground text-xs">
            {t("tokenDescription", { env: GEO_INGEST_TOKEN_ENV })}
          </p>
          <ApiKeyRevealField value={token} />
        </section>
      ) : null}
      <section className="space-y-2">
        <h3 className="text-sm font-medium">{t("proxyTitle")}</h3>
        <CodeSnippet
          code={snippet}
          filename={file}
          onCopy={() => trackCopied(TRAFFIC_INSTALL_COPY_KINDS.PROXY_SNIPPET)}
          tabs={
            <CodeSnippetTabs
              label={t("framework")}
              onValueChange={(value) => {
                if (isGeoIngestFramework(value)) {
                  setFramework(value);
                }
              }}
              options={GEO_INGEST_FRAMEWORK_OPTIONS}
              value={framework}
            />
          }
        />
      </section>
      <div className="space-y-2">
        <div aria-hidden className="flex items-center gap-3 py-1">
          <span className="bg-border/80 h-px flex-1" />
          <span className="text-muted-foreground text-xs">
            {tCommon("labels.or")}
          </span>
          <span className="bg-border/80 h-px flex-1" />
        </div>
        <CopyPromptButton
          className="mx-auto flex w-fit"
          onCopy={() => trackCopied(TRAFFIC_INSTALL_COPY_KINDS.AGENT_PROMPT)}
          prompt={agentPrompt}
        />
      </div>
    </div>
  );
}
