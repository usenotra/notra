"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useTranslations } from "use-intl";

import { DemoApiConsole } from "@/components/demo/demo-api-console";
import { DemoMissions } from "@/components/demo/demo-missions";
import { DemoRequestFeed } from "@/components/demo/demo-request-feed";
import type { DemoPlaygroundTab, DemoSandboxInfo } from "@/types/demo";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";

interface DemoPlaygroundSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: DemoPlaygroundTab;
  onTabChange: (tab: DemoPlaygroundTab) => void;
  sandbox: DemoSandboxInfo | null;
}

function isPlaygroundTab(value: unknown): value is DemoPlaygroundTab {
  return value === "console" || value === "requests" || value === "missions";
}

export function DemoPlaygroundSheet({
  open,
  onOpenChange,
  tab,
  onTabChange,
  sandbox,
}: DemoPlaygroundSheetProps) {
  const t = useTranslations("demo.playground");

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="sm:max-w-xl" side="right" variant="inset">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
          {sandbox ? (
            <button
              className="text-muted-foreground self-start font-mono text-xs"
              onClick={() =>
                copyTextToClipboard(sandbox.anonymousId, t("idCopied"))
              }
              type="button"
            >
              {t("demoId", { id: sandbox.anonymousId })}
            </button>
          ) : null}
        </SheetHeader>
        <Tabs
          className="flex min-h-0 flex-1 flex-col"
          onValueChange={(value) => {
            if (isPlaygroundTab(value)) {
              onTabChange(value);
            }
          }}
          value={tab}
        >
          <div className="px-4 pt-3">
            <TabsList>
              <TabsTrigger value="console">{t("tabs.console")}</TabsTrigger>
              <TabsTrigger value="requests">{t("tabs.requests")}</TabsTrigger>
              <TabsTrigger value="missions">{t("tabs.missions")}</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            className="min-h-0 flex-1 overflow-y-auto"
            value="console"
          >
            <div className="p-4">
              <DemoApiConsole sandbox={sandbox} />
            </div>
          </TabsContent>
          <TabsContent
            className="min-h-0 flex-1 overflow-y-auto"
            value="requests"
          >
            <div className="p-4">
              <DemoRequestFeed enabled={open} sandbox={sandbox} />
            </div>
          </TabsContent>
          <TabsContent
            className="min-h-0 flex-1 overflow-y-auto"
            value="missions"
          >
            <div className="p-4">
              <DemoMissions
                onOpenConsole={() => onTabChange("console")}
                sandbox={sandbox}
              />
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
