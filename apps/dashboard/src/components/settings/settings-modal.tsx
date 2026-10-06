"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SplitModalContent,
  SplitModalPane,
} from "@notra/ui/components/shared/split-modal";
import { Button } from "@notra/ui/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import { cn } from "@notra/ui/lib/utils";
import { type ComponentType, useId, useState } from "react";
import { useTranslations } from "use-intl";

import { AccountSettingsPane } from "@/components/settings/panes/account-pane";
import { AppearanceSettingsPane } from "@/components/settings/panes/appearance-pane";
import { AttachmentsSettingsPane } from "@/components/settings/panes/attachments-pane";
import { BillingSettingsPane } from "@/components/settings/panes/billing-pane";
import { CreditsSettingsPane } from "@/components/settings/panes/credits-pane";
import { DevSettingsPane } from "@/components/settings/panes/dev-pane";
import { GeneralSettingsPane } from "@/components/settings/panes/general-pane";
import { GeoSettingsPane } from "@/components/settings/panes/geo-pane";
import { LogsSettingsPane } from "@/components/settings/panes/logs-pane";
import { MembersSettingsPane } from "@/components/settings/panes/members-pane";
import { NotificationsSettingsPane } from "@/components/settings/panes/notifications-pane";
import { UsageAlertsSettingsPane } from "@/components/settings/panes/usage-alerts-pane";
import { UsageSettingsPane } from "@/components/settings/panes/usage-pane";
import { WebhooksSettingsPane } from "@/components/settings/panes/webhooks-pane";
import {
  SettingsHeaderProvider,
  useSettingsHeader,
} from "@/components/settings/settings-header-context";
import { SettingsModalNav } from "@/components/settings/settings-modal-nav";
import {
  DEFAULT_SETTINGS_SECTION,
  SETTINGS_NAV_GROUPS,
} from "@/constants/settings";
import { useHasAiCreditsFeature } from "@/lib/hooks/use-plan";
import { useSettingsModal } from "@/lib/hooks/use-settings-modal";
import { useSettingsNavLabels } from "@/lib/hooks/use-settings-nav-labels";
import type {
  SettingsModalBodyProps,
  SettingsModalSessionProps,
  SettingsSectionId,
  StandardSettingsSectionId,
} from "@/types/settings/modal";
import { resolveSettingsSection } from "@/utils/settings-path";
import {
  filterSettingsNavGroups,
  firstSettingsSearchSection,
  settingsSearchContainsSection,
} from "@/utils/settings-search";

// Panes are imported directly: the modal chunk is already warmed while the
// page idles, and lazy panes flashed a skeleton on the first open of each tab.
const STANDARD_SETTINGS_PANES = {
  account: AccountSettingsPane,
  appearance: AppearanceSettingsPane,
  attachments: AttachmentsSettingsPane,
  billing: BillingSettingsPane,
  credits: CreditsSettingsPane,
  dev: DevSettingsPane,
  general: GeneralSettingsPane,
  logs: LogsSettingsPane,
  members: MembersSettingsPane,
  notifications: NotificationsSettingsPane,
  usage: UsageSettingsPane,
  "usage-alerts": UsageAlertsSettingsPane,
  webhooks: WebhooksSettingsPane,
} satisfies Record<StandardSettingsSectionId, ComponentType>;

const GEO_SETTINGS_PANE_SECTIONS = {
  geo: "brand",
  "geo-brand": "brand",
  "geo-languages": "languages",
  "geo-models": "models",
} as const;

function SettingsSectionContent({ section }: { section: SettingsSectionId }) {
  if (section in GEO_SETTINGS_PANE_SECTIONS) {
    const geoSection =
      GEO_SETTINGS_PANE_SECTIONS[
        section as keyof typeof GEO_SETTINGS_PANE_SECTIONS
      ];
    return <GeoSettingsPane section={geoSection} />;
  }

  const Pane = STANDARD_SETTINGS_PANES[section as StandardSettingsSectionId];
  return <Pane />;
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
      <SplitModalContent
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className={cn(
          "flex! max-w-none sm:max-w-none",
          "top-0 right-0 bottom-0 left-0 h-auto w-auto translate-none rounded-none",
          "md:top-1/2 md:right-auto md:bottom-auto md:left-1/2 md:h-[min(44rem,calc(100svh-2rem))] md:w-[min(64rem,calc(100%-1.5rem))] md:-translate-x-1/2 md:-translate-y-1/2",
          // brightness-60 matches the black/40 page dim and, unlike an overlay, also covers the border
          "transition-[box-shadow,filter] data-nested-dialog-open:shadow-[0_0_0_100vmax_rgb(0_0_0/0.4)] data-nested-dialog-open:brightness-60"
        )}
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
      </SplitModalContent>
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
  const labels = useSettingsNavLabels();
  const { hasAiCredits } = useHasAiCreditsFeature();
  const [query, setQuery] = useState("");
  const searchInputId = useId();
  const navGroups = SETTINGS_NAV_GROUPS.map((group) => ({
    ...group,
    label: labels.groups[group.id],
    items: group.items.map((item) => ({
      ...item,
      label: labels.sections[item.id].label,
      description: labels.sections[item.id].description,
    })),
  }));
  const groups = filterSettingsNavGroups(navGroups, query, hasAiCredits);

  const activeSection = resolveSettingsSection(
    section ?? DEFAULT_SETTINGS_SECTION
  );

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    const nextGroups = filterSettingsNavGroups(
      navGroups,
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
  const t = useTranslations("settings");
  const labels = useSettingsNavLabels();
  const { titleAccessory } = useSettingsHeader();

  return (
    <SplitModalPane>
      <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3.5 md:px-5">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <DialogTitle
              className="text-sm leading-none font-medium"
              id={titleId}
            >
              {labels.sections[activeSection].label}
            </DialogTitle>
            {titleAccessory}
          </div>
          <DialogDescription
            className="text-muted-foreground text-xs"
            id={descriptionId}
          >
            {labels.sections[activeSection].modalDescription}
          </DialogDescription>
        </div>
        <Button
          aria-label={t("modal.close")}
          className="shrink-0"
          onClick={closeSettings}
          size="icon-sm"
          variant="ghost"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </header>
      <div className="scrollbar-floating min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm md:px-5 md:pb-4 [&_.text-3xl]:text-2xl [&_.text-lg]:text-sm">
        {isOpen && section ? (
          <SettingsSectionContent key={activeSection} section={activeSection} />
        ) : null}
      </div>
    </SplitModalPane>
  );
}
