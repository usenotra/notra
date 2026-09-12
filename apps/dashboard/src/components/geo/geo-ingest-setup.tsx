"use client";

import { AiMagicIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_INGEST_DEFAULT_FRAMEWORK,
  GEO_INGEST_DEFAULT_PACKAGE_MANAGER,
  GEO_INGEST_FRAMEWORK_OPTIONS,
  GEO_INGEST_PACKAGE_MANAGER_OPTIONS,
  GEO_INGEST_TOKEN_ENV,
} from "@notra/geo-core/constants/geo";
import type {
  GeoIngestFramework,
  GeoIngestPackageManager,
} from "@notra/geo-core/types/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
import { useEffect, useRef, useState } from "react";

import { ApiKeyRevealField } from "@/components/api-keys/api-key-reveal-field";
import { Button } from "@/components/button";
import { CodeSnippet, useCopyCode } from "@/components/geo/code-snippet";
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
} from "@/utils/geo-ingest";

export function GeoIngestSetup({ setup, className }: GeoIngestSetupPanelProps) {
  const [framework, setFramework] = useState(GEO_INGEST_DEFAULT_FRAMEWORK);
  const [packageManager, setPackageManager] = useState(
    GEO_INGEST_DEFAULT_PACKAGE_MANAGER
  );
  const snippet = geoIngestSnippet(setup, framework);
  const installCommand = geoIngestInstallCommand(packageManager);
  const agentPrompt = geoIngestAgentPrompt(setup, framework, packageManager);
  const { copied, copy } = useCopyCode(agentPrompt);
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
        <div className="flex flex-wrap items-center justify-between gap-2 pe-1">
          <h3 className="text-sm font-medium">Install the package</h3>
          <Tabs
            className="shrink-0 gap-0"
            onValueChange={(value) =>
              setPackageManager(value as GeoIngestPackageManager)
            }
            value={packageManager}
          >
            <TabsList aria-label="Package manager">
              {GEO_INGEST_PACKAGE_MANAGER_OPTIONS.map((option) => (
                <TabsTrigger
                  aria-label={option.label}
                  className="gap-1 px-2 text-xs"
                  key={option.value}
                  value={option.value}
                >
                  <GeoPackageManagerIcon manager={option.value} />
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <CodeSnippet
          code={installCommand}
          onCopy={() => trackCopied(TRAFFIC_INSTALL_COPY_KINDS.INSTALL_COMMAND)}
          variant="command"
        />
      </section>
      {token ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Set your token</h3>
          <p className="text-muted-foreground text-xs">
            Add this as {GEO_INGEST_TOKEN_ENV} on every domain this project
            tracks.
          </p>
          <ApiKeyRevealField value={token} />
        </section>
      ) : null}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 pe-1">
          <h3 className="text-sm font-medium">Add the proxy</h3>
          <Tabs
            className="shrink-0 gap-0"
            onValueChange={(value) => setFramework(value as GeoIngestFramework)}
            value={framework}
          >
            <TabsList aria-label="Framework">
              {GEO_INGEST_FRAMEWORK_OPTIONS.map((option) => (
                <TabsTrigger
                  className="px-2 text-xs"
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <CodeSnippet
          code={snippet}
          filename={file}
          onCopy={() => trackCopied(TRAFFIC_INSTALL_COPY_KINDS.PROXY_SNIPPET)}
        />
      </section>
      <div className="space-y-2">
        <div aria-hidden className="flex items-center gap-3 py-1">
          <span className="bg-border/80 h-px flex-1" />
          <span className="text-muted-foreground text-xs">or</span>
          <span className="bg-border/80 h-px flex-1" />
        </div>
        <Button
          className="text-muted-foreground mx-auto flex w-fit"
          onClick={() => {
            trackCopied(TRAFFIC_INSTALL_COPY_KINDS.AGENT_PROMPT);
            return copy();
          }}
          size="sm"
          variant="ghost"
        >
          <HugeiconsIcon icon={copied ? Tick01Icon : AiMagicIcon} size={14} />
          {copied ? "Prompt copied" : "Copy agent prompt"}
        </Button>
      </div>
    </div>
  );
}
