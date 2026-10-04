"use client";

import type { DemoRequestEvent } from "@notra/db/types/demo";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { DemoPlaygroundContext } from "@/components/demo/demo-playground-context";
import { DemoPlaygroundSheet } from "@/components/demo/demo-playground-sheet";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  useDemoRequestStream,
  useDemoSandbox,
} from "@/lib/hooks/use-demo-sandbox";
import { useRouter } from "@/lib/navigation";
import type { DemoPlaygroundTab } from "@/types/demo";
import { demoEntityHref } from "@/utils/demo-entity-href";

interface DemoPlaygroundProviderProps {
  children: React.ReactNode;
}

/**
 * Public demo only: owns the API playground sheet and the live request feed.
 * Requests from outside the dashboard (curl, CLI, MCP, the console) get a
 * toast that links to what they changed.
 */
export function DemoPlaygroundProvider({
  children,
}: DemoPlaygroundProviderProps) {
  const t = useTranslations("demo.playground");
  const router = useRouter();
  const { activeOrganization } = useOrganizationsContext();
  const slug = activeOrganization?.slug ?? "";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DemoPlaygroundTab>("console");
  const { data: sandbox } = useDemoSandbox(true);

  const handleRequest = useCallback(
    (event: DemoRequestEvent) => {
      if (event.source === "ui") {
        return;
      }
      const entity = event.affected[0];
      const href = entity && slug ? demoEntityHref(slug, entity) : null;
      toast(`${event.method} ${event.path}`, {
        description: entity?.label
          ? t("toastChanged", { status: event.status, label: entity.label })
          : t("toastStatus", { status: event.status }),
        action: href
          ? { label: t("view"), onClick: () => router.push(href) }
          : {
              label: t("openFeed"),
              onClick: () => {
                setTab("requests");
                setOpen(true);
              },
            },
      });
    },
    [router, slug, t]
  );

  useDemoRequestStream(sandbox?.organizationId ?? null, handleRequest);

  const value = useMemo(
    () => ({
      openPlayground: (next: DemoPlaygroundTab = "console") => {
        setTab(next);
        setOpen(true);
      },
    }),
    []
  );

  return (
    <DemoPlaygroundContext value={value}>
      {children}
      <DemoPlaygroundSheet
        onOpenChange={setOpen}
        onTabChange={setTab}
        open={open}
        sandbox={sandbox ?? null}
        tab={tab}
      />
    </DemoPlaygroundContext>
  );
}
