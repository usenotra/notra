import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect } from "react";

import {
  LEGACY_BILLING_TAB_VALUES,
  SETTINGS_QUERY_KEY,
  SETTINGS_SECTION_IDS,
} from "@/constants/settings";
import type { SettingsSectionId } from "@/types/settings/modal";

const settingsSectionParser = parseAsStringLiteral(
  SETTINGS_SECTION_IDS
).withOptions({
  history: "push",
  scroll: false,
});

const legacyBillingTabParser = parseAsStringLiteral(LEGACY_BILLING_TAB_VALUES);

export function useSettingsModal() {
  const [section, setSection] = useQueryState(
    SETTINGS_QUERY_KEY,
    settingsSectionParser
  );
  const [legacyTab, setLegacyTab] = useQueryState(
    "tab",
    legacyBillingTabParser
  );

  useEffect(() => {
    if (legacyTab === null) {
      return;
    }
    if (legacyTab === "usage" && section === "billing") {
      void setSection("usage", { history: "replace" });
    }
    void setLegacyTab(null, { history: "replace" });
  }, [legacyTab, section, setLegacyTab, setSection]);

  function openSettings(next: SettingsSectionId = "account") {
    setSection(next);
  }

  function closeSettings() {
    setSection(null);
  }

  return {
    section,
    isOpen: section !== null,
    setSection,
    openSettings,
    closeSettings,
  };
}
