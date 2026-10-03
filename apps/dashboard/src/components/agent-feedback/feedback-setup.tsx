"use client";

import {
  GEO_INGEST_DEFAULT_PACKAGE_MANAGER,
  GEO_INGEST_PACKAGE_MANAGER_OPTIONS,
} from "@notra/geo-core/constants/geo";
import type { GeoIngestPackageManager } from "@notra/geo-core/types/geo";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useState } from "react";
import { useTranslations } from "use-intl";

import {
  CodeSnippet,
  CodeSnippetTabs,
  CopyPromptButton,
} from "@/components/geo/code-snippet";
import { GeoPackageManagerIcon } from "@/components/geo/package-manager-icon";
import {
  AGENT_FEEDBACK_DEFAULT_SNIPPET_TAB,
  AGENT_FEEDBACK_SNIPPET_FILENAMES,
  AGENT_FEEDBACK_SNIPPET_TABS,
} from "@/constants/agent-feedback";
import { cn } from "@/lib/utils";
import type {
  AgentFeedbackSetupPanelProps,
  AgentFeedbackSnippetKey,
} from "@/types/agent-feedback";
import { isAgentFeedbackSnippetKey } from "@/utils/agent-feedback";
import { isGeoIngestPackageManager } from "@/utils/geo-ingest";

const PACKAGE_MANAGER_TABS = GEO_INGEST_PACKAGE_MANAGER_OPTIONS.map(
  (option) => ({
    ...option,
    icon: <GeoPackageManagerIcon manager={option.value} />,
  })
);

export function AgentFeedbackSetup({
  setup,
  className,
  showPromptAction = true,
}: AgentFeedbackSetupPanelProps) {
  const t = useTranslations("feedback.setup");
  const tCommon = useTranslations("common");
  const [snippetKey, setSnippetKey] = useState<AgentFeedbackSnippetKey>(
    AGENT_FEEDBACK_DEFAULT_SNIPPET_TAB
  );
  const [packageManager, setPackageManager] = useState<GeoIngestPackageManager>(
    GEO_INGEST_DEFAULT_PACKAGE_MANAGER
  );
  const installCommand =
    GEO_INGEST_PACKAGE_MANAGER_OPTIONS.find(
      (option) => option.value === packageManager
    )?.command ?? GEO_INGEST_PACKAGE_MANAGER_OPTIONS[0].command;

  return (
    <div className={cn("space-y-5", className)}>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">
          {tCommon("labels.installThePackage")}
        </h3>
        <CodeSnippet
          code={installCommand}
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
      <section className="space-y-2">
        <h3 className="text-sm font-medium">{t("feedbackUrl")}</h3>
        <p className="text-muted-foreground text-xs">
          {t("feedbackUrlDescription")}
        </p>
        {setup ? (
          <CodeSnippet
            code={setup.apiUrl}
            label={t("feedbackUrlLabel")}
            variant="command"
          />
        ) : (
          <Skeleton className="h-9 w-full rounded-lg" />
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">{t("addTool")}</h3>
        {setup ? (
          <CodeSnippet
            code={setup.snippets[snippetKey]}
            filename={AGENT_FEEDBACK_SNIPPET_FILENAMES[snippetKey]}
            tabs={
              <CodeSnippetTabs
                label={t("snippet")}
                onValueChange={(value) => {
                  if (isAgentFeedbackSnippetKey(value)) {
                    setSnippetKey(value);
                  }
                }}
                options={AGENT_FEEDBACK_SNIPPET_TABS.map((item) => ({
                  value: item.value,
                  label: t(`snippetTabs.${item.value}`),
                }))}
                value={snippetKey}
              />
            }
          />
        ) : (
          <Skeleton className="h-44 w-full rounded-lg" />
        )}
      </section>
      {showPromptAction ? (
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
            disabled={!setup}
            prompt={setup?.prompt ?? ""}
          />
        </div>
      ) : null}
    </div>
  );
}
