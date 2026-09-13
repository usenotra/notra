"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { cn } from "@notra/ui/lib/utils";
import dynamic from "next/dynamic";
import { useId, useState } from "react";
import type { ReactNode } from "react";

import {
  SettingsHeaderProvider,
  useSettingsHeader,
} from "@/components/settings/settings-header-context";
import { SettingsModalNav } from "@/components/settings/settings-modal-nav";
import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_NAV_GROUPS,
  SETTINGS_SECTION_DESCRIPTIONS,
  SETTINGS_SECTION_LABELS,
} from "@/constants/settings";
import { useHasAiCreditsFeature } from "@/lib/hooks/use-plan";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";
import type {
  SettingsModalBodyProps,
  SettingsModalSessionProps,
  SettingsSectionId,
} from "@/types/settings/modal";
import { resolveSettingsSection } from "@/utils/settings-path";
import {
  filterSettingsNavGroups,
  firstSettingsSearchSection,
  settingsSearchContainsSection,
} from "@/utils/settings-search";

function SettingsPaneFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-36 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

const AccountSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/account-pane").then((mod) => ({
      default: mod.AccountSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const GeneralSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/general-pane").then((mod) => ({
      default: mod.GeneralSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const MembersSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/members-pane").then((mod) => ({
      default: mod.MembersSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const NotificationsSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/notifications-pane").then((mod) => ({
      default: mod.NotificationsSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const AttachmentsSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/attachments-pane").then((mod) => ({
      default: mod.AttachmentsSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const BillingSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/billing-pane").then((mod) => ({
      default: mod.BillingSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const UsageSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/usage-pane").then((mod) => ({
      default: mod.UsageSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const CreditsSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/credits-pane").then((mod) => ({
      default: mod.CreditsSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const IntegrationsSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/integrations-pane").then((mod) => ({
      default: mod.IntegrationsSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const WebhooksSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/webhooks-pane").then((mod) => ({
      default: mod.WebhooksSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const LogsSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/logs-pane").then((mod) => ({
      default: mod.LogsSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);
const GeoSettingsPane = dynamic(
  () =>
    import("@/components/settings/panes/geo-pane").then((mod) => ({
      default: mod.GeoSettingsPane,
    })),
  { loading: SettingsPaneFallback }
);

function SettingsSectionContent({ section }: { section: SettingsSectionId }) {
  const panes: Record<SettingsSectionId, ReactNode> = {
    account: <AccountSettingsPane />,
    general: <GeneralSettingsPane />,
    members: <MembersSettingsPane />,
    notifications: <NotificationsSettingsPane />,
    attachments: <AttachmentsSettingsPane />,
    billing: <BillingSettingsPane />,
    usage: <UsageSettingsPane />,
    credits: <CreditsSettingsPane />,
    integrations: <IntegrationsSettingsPane />,
    webhooks: <WebhooksSettingsPane />,
    logs: <LogsSettingsPane />,
    geo: <GeoSettingsPane section="brand" />,
    "geo-brand": <GeoSettingsPane section="brand" />,
    "geo-languages": <GeoSettingsPane section="languages" />,
    "geo-models": <GeoSettingsPane section="models" />,
  };
  return panes[section];
}

export function SettingsModal() {
  const { section, isOpen, setSection, closeSettings } = useSettingsModal();
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          closeSettings();
        }
      }}
      open={isOpen}
    >
      <DialogContent
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className={cn(
          "flex! h-[min(44rem,calc(100svh-2rem))] w-[min(64rem,calc(100%-1.5rem))] max-w-none flex-col overflow-hidden p-0 sm:max-w-none",
          "gap-0 rounded-2xl"
        )}
        showCloseButton={false}
      >
        {isOpen ? (
          <SettingsModalSession
            closeSettings={closeSettings}
            descriptionId={descriptionId}
            section={section}
            setSection={setSection}
            titleId={titleId}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SettingsModalSession({
  closeSettings,
  descriptionId,
  section,
  setSection,
  titleId,
}: SettingsModalSessionProps) {
  const { hasAiCredits } = useHasAiCreditsFeature();
  const [query, setQuery] = useState("");
  const searchInputId = useId();
  const groups = filterSettingsNavGroups(
    SETTINGS_NAV_GROUPS,
    query,
    hasAiCredits
  );

  const activeSection = resolveSettingsSection(
    section ?? DEFAULT_SETTINGS_SECTION
  );

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    const nextGroups = filterSettingsNavGroups(
      SETTINGS_NAV_GROUPS,
      nextQuery,
      hasAiCredits
    );
    if (nextQuery.trim().length === 0) {
      return;
    }
    if (settingsSearchContainsSection(nextGroups, activeSection)) {
      return;
    }
    const next = firstSettingsSearchSection(nextGroups);
    if (next) {
      setSection(next, { history: "replace" });
    }
  }

  return (
    <SettingsHeaderProvider>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <SettingsModalNav
          activeSection={activeSection}
          groups={groups}
          onQueryChange={handleQueryChange}
          onSelect={(next) => setSection(next, { history: "replace" })}
          query={query}
          searchInputId={searchInputId}
        />
        <SettingsModalBody
          activeSection={activeSection}
          closeSettings={closeSettings}
          descriptionId={descriptionId}
          isOpen
          section={section}
          titleId={titleId}
        />
      </div>
    </SettingsHeaderProvider>
  );
}

function SettingsModalBody({
  activeSection,
  closeSettings,
  descriptionId,
  isOpen,
  section,
  titleId,
}: SettingsModalBodyProps) {
  const { titleAccessory } = useSettingsHeader();

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-3.5">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <DialogTitle
              className="text-sm leading-none font-medium"
              id={titleId}
            >
              {SETTINGS_SECTION_LABELS[activeSection]}
            </DialogTitle>
            {titleAccessory}
          </div>
          <DialogDescription
            className="text-muted-foreground text-xs"
            id={descriptionId}
          >
            {SETTINGS_SECTION_DESCRIPTIONS[activeSection]}
          </DialogDescription>
        </div>
        <Button
          aria-label="Close settings"
          className="shrink-0"
          onClick={closeSettings}
          size="icon-sm"
          variant="ghost"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-sm [&_.text-3xl]:text-2xl [&_.text-lg]:text-sm">
        {isOpen && section ? (
          <SettingsSectionContent key={activeSection} section={activeSection} />
        ) : null}
      </div>
    </section>
  );
}
