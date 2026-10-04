"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@notra/ui/components/ui/alert";
import {
  PermissionOption,
  PermissionRow,
  PermissionSelector,
} from "@notra/ui/components/ui/permission-selector";
import { useTranslations } from "use-intl";

import {
  API_KEY_RESOURCE_COMMON_LABEL_KEYS,
  API_KEY_ACCESS_MODE_OPTIONS,
  API_KEY_TRANSLATED_RESOURCE_IDS,
} from "@/constants/api-keys";
import {
  API_KEY_SCOPE_GROUPS,
  applyScopeLevel,
  deriveScopeLevel,
  getApiKeyScopesForAccessMode,
  sortApiKeyScopes,
} from "@/lib/api-keys/scopes";
import type {
  ApiKeyAccessMode,
  ApiKeyPermissionSelectorProps,
  ApiKeyScopeGroup,
} from "@/types/api-keys";
import { hasOwnKey } from "@/utils/has-own-key";

export function ApiKeyPermissionSelector({
  accessMode,
  value,
  onAccessModeChange,
  onValueChange,
  disabled,
  className,
}: ApiKeyPermissionSelectorProps) {
  const t = useTranslations("apiKeys.permissions");
  const tLabels = useTranslations("common.labels");
  const selected = new Set(value);
  const resourceText = (
    group: ApiKeyScopeGroup,
    field: "label" | "description"
  ) => {
    const id = API_KEY_TRANSLATED_RESOURCE_IDS.find(
      (resourceId) => resourceId === group.id
    );
    if (!id) {
      return group[field];
    }
    if (field === "description") {
      return t(`resources.${id}.description`);
    }
    return hasOwnKey(API_KEY_RESOURCE_COMMON_LABEL_KEYS, id)
      ? tLabels(API_KEY_RESOURCE_COMMON_LABEL_KEYS[id])
      : t(`resources.${id}.label`);
  };
  const selectedMode = API_KEY_ACCESS_MODE_OPTIONS.find(
    (option) => option.value === accessMode
  );

  const handleLevelChange = (group: ApiKeyScopeGroup, levelValue: string) => {
    onValueChange(
      sortApiKeyScopes([...applyScopeLevel(selected, group, levelValue)])
    );
  };

  return (
    <div className="space-y-3">
      <PermissionRow
        className="w-full"
        disabled={disabled}
        indicatorMotion="fade"
        label={t("accessLabel")}
        layout="compact"
        onValueChange={(mode) => {
          const nextMode = mode as ApiKeyAccessMode;
          onAccessModeChange(
            nextMode,
            getApiKeyScopesForAccessMode(nextMode, value)
          );
        }}
        value={accessMode}
      >
        {API_KEY_ACCESS_MODE_OPTIONS.map((option) => (
          <PermissionOption
            className="flex-1 text-xs"
            key={option.value}
            value={option.value}
          >
            {t("accessModeLabel", { mode: option.value })}
          </PermissionOption>
        ))}
      </PermissionRow>

      {accessMode !== "restricted" && selectedMode ? (
        <Alert
          className="border-info/25 bg-info/10 grid-cols-[auto_1fr] gap-x-3 rounded-xl p-4"
          variant="info"
        >
          <HugeiconsIcon
            className="mt-0.5 size-5"
            icon={InformationCircleIcon}
          />
          <AlertTitle className="text-sm font-medium">
            {t("accessModeTitle", { mode: selectedMode.value })}
          </AlertTitle>
          <AlertDescription className="mt-1 text-xs leading-relaxed">
            {t("accessModeDescription", { mode: selectedMode.value })}
          </AlertDescription>
        </Alert>
      ) : null}

      {accessMode === "restricted" ? (
        <div>
          <p className="text-sm font-medium">{t("resourceAccess")}</p>
          <p className="text-muted-foreground text-xs">
            {t("accessModeDescription", { mode: "restricted" })}
          </p>
          <div className="mt-3">
            <PermissionSelector
              className={className}
              label={t("permissionsLabel")}
            >
              {API_KEY_SCOPE_GROUPS.map((group) => (
                <PermissionRow
                  description={resourceText(group, "description")}
                  disabled={disabled}
                  key={group.id}
                  label={resourceText(group, "label")}
                  onValueChange={(levelValue) =>
                    handleLevelChange(group, levelValue)
                  }
                  value={deriveScopeLevel(selected, group)}
                >
                  {group.levels.map((level) => (
                    <PermissionOption
                      key={level.value}
                      tone={level.tone}
                      value={level.value}
                    >
                      {t("scopeLevel", { level: level.value })}
                    </PermissionOption>
                  ))}
                </PermissionRow>
              ))}
            </PermissionSelector>
          </div>
        </div>
      ) : null}
    </div>
  );
}
