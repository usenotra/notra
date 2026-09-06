"use client";

import {
  GEO_CONVERSION_PATHS_DESCRIPTION,
  GEO_CONVERSION_PATHS_LABEL,
  GEO_CONVERSION_PATHS_PLACEHOLDER,
  GEO_MAX_ALIASES,
  GEO_MAX_CONVERSION_PATHS,
  GEO_SCAN_DEFAULT_INTERVAL_HOURS,
  GEO_SCAN_SIZE_DANGER,
  GEO_SCAN_SIZE_WARN,
  GEO_SETTINGS_AUTO_SAVE_MS,
} from "@notra/geo-core/constants/geo";
import type { GeoSettingsUpsertInput } from "@notra/geo-core/types/geo";
import { normalizeConversionPaths } from "@notra/geo-core/utils/geo-conversion-paths";
import { resolveTrackedEngines } from "@notra/geo-core/utils/geo-engines";
import { trackedGeoLanguages } from "@notra/geo-core/utils/geo-language-rows";
import {
  calcGeoScanSize,
  type GeoScanSizeSeverity,
  geoScanSizeSeverity,
} from "@notra/geo-core/utils/geo-scan";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useAsyncDebouncer } from "@tanstack/react-pacer";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { GeoEnginePicker } from "@/components/geo/geo-engine-picker";
import { GeoLanguagePicker } from "@/components/geo/geo-language-picker";
import {
  GeoScanFrequencySelect,
  GeoScanSchedule,
} from "@/components/geo/geo-scan-schedule";
import { GeoTagList } from "@/components/geo/geo-tag-list";
import { useGeoSettingsUpsert } from "@/lib/hooks/use-geo";
import { useHasZdrEntitlement } from "@/lib/hooks/use-plan";
import type { GeoSettingsFormProps } from "@/types/geo";

function scanSizeNoteClassName(severity: GeoScanSizeSeverity): string {
  if (severity === "danger") {
    return "text-destructive text-xs tabular-nums";
  }
  if (severity === "warn") {
    return "text-xs text-amber-600 tabular-nums dark:text-amber-500";
  }
  return "text-muted-foreground text-xs tabular-nums";
}

function scanSizeWarningSuffix(severity: GeoScanSizeSeverity): string {
  if (severity === "danger") {
    return ` ${GEO_SCAN_SIZE_DANGER}`;
  }
  if (severity === "warn") {
    return ` ${GEO_SCAN_SIZE_WARN}`;
  }
  return "";
}

export function GeoSettingsForm({
  organizationId,
  settings,
  catalog,
  promptCount,
}: GeoSettingsFormProps) {
  const id = useId();
  const [companyName, setCompanyName] = useState(
    () => settings?.companyName ?? ""
  );
  const [aliases, setAliases] = useState(() => settings?.aliases ?? []);
  const [conversionPaths, setConversionPaths] = useState(() =>
    normalizeConversionPaths(settings?.conversionPaths ?? [])
  );
  const [competitors] = useState(() => settings?.competitors ?? []);
  const [languages, setLanguages] = useState(() =>
    trackedGeoLanguages(settings?.languages ?? [])
  );
  const [engines, setEngines] = useState<string[]>(() =>
    resolveTrackedEngines(catalog, settings?.engines)
  );
  const [enforceZdr, setEnforceZdr] = useState(
    () => settings?.enforceZdr ?? true
  );
  const [nonZdrApproved, setNonZdrApproved] = useState<string[]>(
    () => settings?.nonZdrApprovedEngines ?? []
  );
  const [enabled, setEnabled] = useState(() => settings?.enabled ?? true);
  const [scanIntervalHours, setScanIntervalHours] = useState(
    () => settings?.scanIntervalHours ?? GEO_SCAN_DEFAULT_INTERVAL_HOURS
  );
  const { hasZdr: canEnforceZdr, isLoading: planLoading } =
    useHasZdrEntitlement();
  const upsert = useGeoSettingsUpsert(organizationId, { silentSuccess: true });
  const [savedAt, setSavedAt] = useState<Date | null>(() =>
    settings?.updatedAt ? new Date(settings.updatedAt) : null
  );
  const lastSaved = useRef<string | undefined>(undefined);
  const nameMissing = companyName.trim().length === 0;

  const debouncer = useAsyncDebouncer(
    async (input: GeoSettingsUpsertInput) => {
      await upsert.mutateAsync(input);
      lastSaved.current = JSON.stringify(input);
      setSavedAt(new Date());
    },
    {
      wait: GEO_SETTINGS_AUTO_SAVE_MS,
      throwOnError: false,
    },
    (state) => ({
      isExecuting: state.isExecuting,
      isPending: state.isPending,
    })
  );
  const debouncerRef = useRef(debouncer);

  useEffect(() => {
    debouncerRef.current = debouncer;
  }, [debouncer]);

  useEffect(() => {
    if (planLoading) {
      return;
    }

    const input: GeoSettingsUpsertInput = toGeoSettingsPayload({
      organizationId,
      companyName,
      aliases,
      competitors,
      conversionPaths,
      languages,
      engines,
      enforceZdr,
      nonZdrApprovedEngines: nonZdrApproved,
      enabled,
      scanIntervalHours,
      canEnforceZdr,
    });
    const serialized = JSON.stringify(input);
    const runner = debouncerRef.current;

    if (lastSaved.current === undefined) {
      lastSaved.current = JSON.stringify(
        toGeoSettingsPayload({
          organizationId,
          companyName: settings?.companyName ?? "",
          aliases: settings?.aliases ?? [],
          competitors: settings?.competitors ?? [],
          conversionPaths: normalizeConversionPaths(
            settings?.conversionPaths ?? []
          ),
          languages: trackedGeoLanguages(settings?.languages ?? []),
          engines: resolveTrackedEngines(catalog, settings?.engines),
          enforceZdr: settings?.enforceZdr ?? true,
          nonZdrApprovedEngines: settings?.nonZdrApprovedEngines ?? [],
          enabled: settings?.enabled ?? true,
          scanIntervalHours:
            settings?.scanIntervalHours ?? GEO_SCAN_DEFAULT_INTERVAL_HOURS,
          canEnforceZdr,
        })
      );
    }

    if (input.companyName.length === 0) {
      runner.cancel();
      return;
    }

    if (serialized === lastSaved.current) {
      runner.cancel();
      return;
    }

    runner.maybeExecute(input).catch(() => undefined);
  }, [
    aliases,
    catalog,
    companyName,
    competitors,
    conversionPaths,
    enabled,
    engines,
    enforceZdr,
    canEnforceZdr,
    languages,
    nonZdrApproved,
    organizationId,
    planLoading,
    scanIntervalHours,
    settings,
  ]);

  useEffect(() => {
    return () => {
      debouncerRef.current.flush().catch(() => undefined);
    };
  }, []);

  const isSaving = debouncer.state.isPending || debouncer.state.isExecuting;
  const scanSize = calcGeoScanSize({
    promptCount: promptCount ?? 0,
    engineCount: engines.length,
    languageCount: languages.length,
  });
  const scanSizeSeverity = geoScanSizeSeverity(scanSize);
  const scanSizeNoteClass = scanSizeNoteClassName(scanSizeSeverity);
  const scanSizeText = `About ${scanSize.toLocaleString()} checks per scan (${promptCount?.toLocaleString()} prompts × ${engines.length.toLocaleString()} engines × ${Math.max(1, languages.length).toLocaleString()} languages).${scanSizeWarningSuffix(scanSizeSeverity)}`;
  let saveStatus: string | null = null;
  if (nameMissing && savedAt) {
    saveStatus = "Add a company name to save";
  } else if (isSaving) {
    saveStatus = "Saving...";
  } else if (savedAt) {
    saveStatus = "Saved";
  }

  return (
    <div className="w-full space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">GEO Settings</h1>
          <p className="text-muted-foreground">
            How your brand is identified and where prompts are scanned.
          </p>
        </div>
        {saveStatus ? (
          <p
            aria-live="polite"
            className="text-muted-foreground pt-2 text-xs tabular-nums"
          >
            {saveStatus}
          </p>
        ) : null}
      </header>
      <div className="space-y-6">
        <TitleCard as="section" heading="Brand" headingAs="h2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${id}-name`}>Company name</Label>
              <p className="text-muted-foreground text-xs">
                The primary name we match in answers.
              </p>
              <Input
                aria-invalid={nameMissing && savedAt !== null}
                id={`${id}-name`}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Notra"
                value={companyName}
              />
            </div>
            <GeoTagList
              description="Other spellings, product names, or the bare domain."
              id={`${id}-aliases`}
              label="Aliases"
              max={GEO_MAX_ALIASES}
              onChange={setAliases}
              placeholder="usenotra"
              values={aliases}
            />
          </div>
        </TitleCard>
        <SettingsSection
          description={GEO_CONVERSION_PATHS_DESCRIPTION}
          title={GEO_CONVERSION_PATHS_LABEL}
        >
          <GeoTagList
            id={`${id}-conversion-paths`}
            label={GEO_CONVERSION_PATHS_LABEL}
            labeled={false}
            max={GEO_MAX_CONVERSION_PATHS}
            onChange={(values) =>
              setConversionPaths(normalizeConversionPaths(values))
            }
            placeholder={GEO_CONVERSION_PATHS_PLACEHOLDER}
            values={conversionPaths}
          />
        </SettingsSection>
        <SettingsSection
          description="Languages your prompts are scanned in. English is on by default."
          title="Languages"
        >
          <GeoLanguagePicker
            labeled={false}
            onChange={setLanguages}
            selected={languages}
          />
        </SettingsSection>
        <TitleCard as="section" heading="Models" headingAs="h2">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-muted-foreground text-sm text-pretty">
                  Each enabled provider runs on every prompt, on the frequency
                  you set here.
                </p>
                {promptCount !== undefined ? (
                  <p className={scanSizeNoteClass} role="note">
                    {scanSizeText}
                  </p>
                ) : null}
              </div>
              <GeoScanFrequencySelect
                id={id}
                intervalHours={scanIntervalHours}
                onIntervalChange={setScanIntervalHours}
              />
            </div>
            <GeoEnginePicker
              canEnforceZdr={canEnforceZdr}
              catalog={catalog}
              enforceZdr={enforceZdr}
              labeled={false}
              nonZdrApproved={nonZdrApproved}
              onChange={setEngines}
              onEnforceZdrChange={setEnforceZdr}
              onNonZdrApprovedChange={setNonZdrApproved}
              planLoading={planLoading}
              scheduleRow={
                <GeoScanSchedule
                  enabled={enabled}
                  id={id}
                  intervalHours={scanIntervalHours}
                  onEnabledChange={setEnabled}
                />
              }
              selected={engines}
            />
          </div>
        </TitleCard>
      </div>
    </div>
  );
}

function toGeoSettingsPayload({
  canEnforceZdr,
  ...input
}: GeoSettingsUpsertInput & {
  canEnforceZdr: boolean;
}): GeoSettingsUpsertInput {
  return {
    ...input,
    companyName: input.companyName.trim(),
    enforceZdr: canEnforceZdr && input.enforceZdr,
  };
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <TitleCard as="section" heading={title} headingAs="h2">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
        {children}
      </div>
    </TitleCard>
  );
}
