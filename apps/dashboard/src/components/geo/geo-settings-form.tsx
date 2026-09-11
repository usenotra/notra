"use client";

import {
  GEO_CONVERSION_PATHS_DESCRIPTION,
  GEO_CONVERSION_PATHS_LABEL,
  GEO_CONVERSION_PATHS_PLACEHOLDER,
  GEO_MAX_ALIASES,
  GEO_MAX_CONVERSION_PATHS,
  GEO_MAX_DOMAINS,
  GEO_PROJECT_DOMAINS_DESCRIPTION,
  GEO_PROJECT_DOMAINS_LABEL,
  GEO_PROJECT_DOMAINS_PLACEHOLDER,
  GEO_SCAN_DEFAULT_INTERVAL_HOURS,
  GEO_SCAN_SIZE_MESSAGES,
  GEO_SETTINGS_AUTO_SAVE_MS,
} from "@notra/geo-core/constants/geo";
import type { GeoSettingsUpsertInput } from "@notra/geo-core/types/geo";
import { normalizeConversionPaths } from "@notra/geo-core/utils/geo-conversion-paths";
import { resolveTrackedEngines } from "@notra/geo-core/utils/geo-engines";
import { trackedGeoLanguages } from "@notra/geo-core/utils/geo-language-rows";
import { normalizeProjectDomains } from "@notra/geo-core/utils/geo-project-domains";
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
import { useGeoScanEstimate } from "@/lib/hooks/use-geo-scan-estimate";
import { useHasZdrEntitlement } from "@/lib/hooks/use-plan";
import { cn } from "@/lib/utils";
import type {
  GeoBrandSectionProps,
  GeoLanguagesSectionProps,
  GeoModelsSectionProps,
  GeoSettingsAutosaveInput,
  GeoSettingsFormProps,
} from "@/types/geo";

export function GeoSettingsForm({
  organizationId,
  settings,
  catalog,
  promptCount,
  hideHeader = false,
  section,
}: GeoSettingsFormProps) {
  const id = useId();
  const [companyName, setCompanyName] = useState(
    () => settings?.companyName ?? ""
  );
  const [aliases, setAliases] = useState(() => settings?.aliases ?? []);
  const [conversionPaths, setConversionPaths] = useState(() =>
    normalizeConversionPaths(settings?.conversionPaths ?? [])
  );
  const [domains, setDomains] = useState(() =>
    normalizeProjectDomains(settings?.domains ?? [])
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
  const nameMissing = companyName.trim().length === 0;
  const { savedAt } = useGeoSettingsAutosave({
    aliases,
    canEnforceZdr,
    catalog,
    companyName,
    competitors,
    conversionPaths,
    domains,
    enabled,
    engines,
    enforceZdr,
    languages,
    nonZdrApproved,
    organizationId,
    planLoading,
    scanIntervalHours,
    settings,
  });

  const { scanSize, warningSeverity } = useGeoScanEstimate({
    organizationId,
    promptCount,
    engines,
    languages,
  });
  const scanSizeNote =
    scanSize === null
      ? null
      : {
          className: cn("text-xs tabular-nums", {
            "text-muted-foreground": warningSeverity === null,
            "text-warning": warningSeverity === "warn",
            "text-destructive": warningSeverity === "danger",
          }),
          text: `About ${scanSize.toLocaleString()} checks per scan, including web-search checks and conversation turns.${warningSeverity ? ` ${GEO_SCAN_SIZE_MESSAGES[warningSeverity]}` : ""}`,
        };

  const showBrand = section === undefined || section === "brand";
  const showLanguages = section === undefined || section === "languages";
  const showModels = section === undefined || section === "models";

  return (
    <div className="w-full space-y-6">
      {hideHeader ? null : (
        <header className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">GEO Settings</h1>
            <p className="text-muted-foreground">
              How your brand is identified and where prompts are scanned.
            </p>
          </div>
        </header>
      )}
      <div className="space-y-6">
        {showBrand ? (
          <GeoBrandSection
            aliases={aliases}
            companyName={companyName}
            conversionPaths={conversionPaths}
            domains={domains}
            id={id}
            nameMissing={nameMissing}
            onAliasesChange={setAliases}
            onCompanyNameChange={setCompanyName}
            onConversionPathsChange={(values) =>
              setConversionPaths(normalizeConversionPaths(values))
            }
            onDomainsChange={(values) =>
              setDomains(normalizeProjectDomains(values))
            }
            savedAt={savedAt}
          />
        ) : null}
        {showLanguages ? (
          <GeoLanguagesSection
            languages={languages}
            onLanguagesChange={setLanguages}
          />
        ) : null}
        {showModels ? (
          <GeoModelsSection
            canEnforceZdr={canEnforceZdr}
            catalog={catalog}
            enabled={enabled}
            engines={engines}
            enforceZdr={enforceZdr}
            id={id}
            nonZdrApproved={nonZdrApproved}
            onEnabledChange={setEnabled}
            onEnginesChange={setEngines}
            onEnforceZdrChange={setEnforceZdr}
            onNonZdrApprovedChange={setNonZdrApproved}
            onScanIntervalHoursChange={setScanIntervalHours}
            planLoading={planLoading}
            scanIntervalHours={scanIntervalHours}
            scanSizeNote={scanSizeNote}
          />
        ) : null}
      </div>
    </div>
  );
}

function useGeoSettingsAutosave({
  aliases,
  canEnforceZdr,
  catalog,
  companyName,
  competitors,
  conversionPaths,
  domains,
  enabled,
  engines,
  enforceZdr,
  languages,
  nonZdrApproved,
  organizationId,
  planLoading,
  scanIntervalHours,
  settings,
}: GeoSettingsAutosaveInput) {
  const upsert = useGeoSettingsUpsert(organizationId, { silentSuccess: true });
  const [savedAt, setSavedAt] = useState<Date | null>(() =>
    settings?.updatedAt ? new Date(settings.updatedAt) : null
  );
  const lastSaved = useRef<string | undefined>(undefined);
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
      domains,
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
          domains: normalizeProjectDomains(settings?.domains ?? []),
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
    domains,
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

  return {
    isSaving: debouncer.state.isPending || debouncer.state.isExecuting,
    savedAt,
  };
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

function GeoBrandSection({
  aliases,
  companyName,
  conversionPaths,
  domains,
  id,
  nameMissing,
  onAliasesChange,
  onCompanyNameChange,
  onConversionPathsChange,
  onDomainsChange,
  savedAt,
}: GeoBrandSectionProps) {
  return (
    <>
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
              onChange={(event) => onCompanyNameChange(event.target.value)}
              placeholder="Notra"
              value={companyName}
            />
          </div>
          <GeoTagList
            description="Other spellings, product names, or the bare domain."
            id={`${id}-aliases`}
            label="Aliases"
            max={GEO_MAX_ALIASES}
            onChange={onAliasesChange}
            placeholder="usenotra"
            values={aliases}
          />
        </div>
      </TitleCard>
      <SettingsSection
        description={GEO_PROJECT_DOMAINS_DESCRIPTION}
        title={GEO_PROJECT_DOMAINS_LABEL}
      >
        <GeoTagList
          id={`${id}-domains`}
          label={GEO_PROJECT_DOMAINS_LABEL}
          labeled={false}
          max={GEO_MAX_DOMAINS}
          onChange={onDomainsChange}
          placeholder={GEO_PROJECT_DOMAINS_PLACEHOLDER}
          values={domains}
        />
      </SettingsSection>
      <SettingsSection
        description={GEO_CONVERSION_PATHS_DESCRIPTION}
        title={GEO_CONVERSION_PATHS_LABEL}
      >
        <GeoTagList
          id={`${id}-conversion-paths`}
          label={GEO_CONVERSION_PATHS_LABEL}
          labeled={false}
          max={GEO_MAX_CONVERSION_PATHS}
          onChange={onConversionPathsChange}
          placeholder={GEO_CONVERSION_PATHS_PLACEHOLDER}
          values={conversionPaths}
        />
      </SettingsSection>
    </>
  );
}

function GeoLanguagesSection({
  languages,
  onLanguagesChange,
}: GeoLanguagesSectionProps) {
  return (
    <SettingsSection
      description="Languages your prompts are scanned in. English is on by default."
      title="Languages"
    >
      <GeoLanguagePicker
        labeled={false}
        onChange={onLanguagesChange}
        selected={languages}
      />
    </SettingsSection>
  );
}

function GeoModelsSection({
  canEnforceZdr,
  catalog,
  enabled,
  engines,
  enforceZdr,
  id,
  nonZdrApproved,
  onEnabledChange,
  onEnginesChange,
  onEnforceZdrChange,
  onNonZdrApprovedChange,
  onScanIntervalHoursChange,
  planLoading,
  scanIntervalHours,
  scanSizeNote,
}: GeoModelsSectionProps) {
  return (
    <TitleCard
      action={
        <GeoScanFrequencySelect
          id={id}
          intervalHours={scanIntervalHours}
          onIntervalChange={onScanIntervalHoursChange}
        />
      }
      as="section"
      heading="Models"
      headingAs="h2"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm text-pretty">
            Each enabled provider runs on every prompt, on the frequency you set
            here.
          </p>
          {scanSizeNote ? (
            <p className={scanSizeNote.className} role="note">
              {scanSizeNote.text}
            </p>
          ) : null}
        </div>
        <GeoEnginePicker
          canEnforceZdr={canEnforceZdr}
          catalog={catalog}
          enforceZdr={enforceZdr}
          labeled={false}
          nonZdrApproved={nonZdrApproved}
          onChange={onEnginesChange}
          onEnforceZdrChange={onEnforceZdrChange}
          onNonZdrApprovedChange={onNonZdrApprovedChange}
          planLoading={planLoading}
          scheduleRow={
            <GeoScanSchedule
              enabled={enabled}
              id={id}
              intervalHours={scanIntervalHours}
              onEnabledChange={onEnabledChange}
            />
          }
          selected={engines}
        />
      </div>
    </TitleCard>
  );
}
