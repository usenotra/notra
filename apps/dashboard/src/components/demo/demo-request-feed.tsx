"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { DemoRequestEvent } from "@notra/db/types/demo";
import { Badge } from "@notra/ui/components/ui/badge";
import { Button } from "@notra/ui/components/ui/button";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useDemoRequestDetail,
  useDemoRequests,
} from "@/lib/hooks/use-demo-sandbox";
import type { DemoSandboxInfo } from "@/types/demo";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { buildDemoCurl } from "@/utils/demo-console";
import { demoEntityHref } from "@/utils/demo-entity-href";

interface DemoRequestFeedProps {
  enabled: boolean;
  sandbox: DemoSandboxInfo | null;
}

const ERROR_STATUS = 400;

function RequestDetail({
  event,
  sandbox,
}: {
  event: DemoRequestEvent;
  sandbox: DemoSandboxInfo | null;
}) {
  const t = useTranslations("demo.feed");
  const { data, isLoading } = useDemoRequestDetail(event.id);
  const isApiPath = event.path.startsWith("/v");

  if (isLoading) {
    return <p className="text-muted-foreground text-xs">{t("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      {event.source === "ui" && isApiPath && sandbox?.apiKey ? (
        <div className="bg-muted/60 flex items-center justify-between gap-2 rounded-md px-2 py-1.5">
          <span className="text-xs">{t("sameViaApi")}</span>
          <Button
            onClick={() =>
              copyTextToClipboard(
                buildDemoCurl({
                  baseUrl: sandbox.apiBaseUrl,
                  apiKey: sandbox.apiKey ?? "",
                  method: event.method,
                  path: event.path,
                  body: data?.requestBody ?? null,
                }),
                t("curlCopied")
              )
            }
            size="xs"
            variant="ghost"
          >
            <HugeiconsIcon icon={Copy01Icon} />
            {t("copyCurl")}
          </Button>
        </div>
      ) : null}
      {data?.requestBody ? (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            {t("request")}
          </span>
          <pre className="bg-muted/40 max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs">
            {data.requestBody}
          </pre>
        </div>
      ) : null}
      {data?.responseBody ? (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">
            {t("response")}
          </span>
          <pre className="bg-muted/40 max-h-48 overflow-auto rounded-md border p-2 font-mono text-xs">
            {data.responseBody}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function DemoRequestFeed({ enabled, sandbox }: DemoRequestFeedProps) {
  const t = useTranslations("demo.feed");
  const format = useFormatter();
  const { activeOrganization } = useOrganizationsContext();
  const slug = activeOrganization?.slug ?? "";
  const { data: events, isLoading } = useDemoRequests(enabled);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("loading")}</p>;
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-dashed p-4 text-center">
        <p className="text-sm font-medium">{t("emptyTitle")}</p>
        <p className="text-muted-foreground text-sm">{t("emptyDescription")}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {events.map((event) => {
        const expanded = expandedId === event.id;
        const entity = event.affected[0];
        const href = entity && slug ? demoEntityHref(slug, entity) : null;
        return (
          <li className="px-3 py-2" key={event.id}>
            <button
              aria-expanded={expanded}
              className="flex w-full items-center gap-2 text-left"
              onClick={() => setExpandedId(expanded ? null : event.id)}
              type="button"
            >
              <Badge variant="outline">{t(`sources.${event.source}`)}</Badge>
              <span className="shrink-0 font-mono text-xs">{event.method}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {event.path}
              </span>
              <span
                className={`font-mono text-xs tabular-nums ${
                  event.status >= ERROR_STATUS
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {event.status}
              </span>
              <time
                className="text-muted-foreground shrink-0 text-xs tabular-nums"
                dateTime={event.createdAt}
              >
                {format.dateTime(new Date(event.createdAt), {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
            </button>
            {entity?.label ? (
              <p className="text-muted-foreground truncate pt-1 text-xs">
                {href ? (
                  <Link className="underline underline-offset-2" href={href}>
                    {entity.label}
                  </Link>
                ) : (
                  entity.label
                )}
              </p>
            ) : null}
            {expanded ? (
              <RequestDetail event={event} sandbox={sandbox} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
