"use client";

import {
  GEO_EMPTY_PROMPT_RESULTS,
  GEO_EMPTY_TIMESERIES,
} from "@notra/geo-core/constants/geo";
import type { GeoEngineFamily } from "@notra/geo-core/types/geo";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { useState } from "react";

import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import type { WriteDialogInitialState } from "@/types/components/geo-writer";
import type {
  EngineFamilyBrandScope,
  EngineFamilyPromptHit,
  EngineFamilySheetProps,
} from "@/types/geo";
import { engineFamilyModeTotals } from "@/utils/geo-charts";
import {
  engineFamilyBrandRows,
  findOwnBrandDomain,
} from "@/utils/geo-competitors";
import { familyImproveInsight } from "@/utils/geo-family-improve";
import { resolveOrganizationId } from "@/utils/geo-overview-organization";
import { geoGapsEngineHref } from "@/utils/geo-paths";
import {
  engineFamilyPromptHits,
  promptTableRowForId,
} from "@/utils/geo-prompts";
import { writeDialogStateFromGap } from "@/utils/geo-write-entry";

export function useEngineFamilySheet({
  family,
  timeseriesPoints = GEO_EMPTY_TIMESERIES,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  organizationSlug,
  companyName,
  aliases,
  competitors,
}: Omit<EngineFamilySheetProps, "family" | "open" | "onOpenChange"> & {
  family: GeoEngineFamily;
}) {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeInitial, setWriteInitial] =
    useState<WriteDialogInitialState | null>(null);
  const { projectId } = useGeoProjectScope();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const organizationId = organizationSlug
    ? resolveOrganizationId(
        organizationSlug,
        activeOrganization,
        getOrganization(organizationSlug)
      )
    : "";
  const { domain: projectDomain } = useGeoActiveProject(organizationId);
  const ownDomain = projectDomain ?? findOwnBrandDomain(aliases ?? []);
  const canWrite = Boolean(organizationSlug) && Boolean(organizationId);
  const name = engineFamilyLabel(family.family);
  const selectedRow = selectedPromptId
    ? promptTableRowForId(selectedPromptId, promptResults)
    : null;
  const selectedEngine =
    selectedRow?.results.find(
      (result) => engineFamilyOf(result.engine) === family.family
    )?.engine ?? null;
  const promptHits = engineFamilyPromptHits(family.family, promptResults);
  const brandScope: EngineFamilyBrandScope = {
    companyName,
    aliases,
    competitors,
    ownDomain,
  };
  const brandRows = engineFamilyBrandRows(
    family.family,
    promptResults,
    brandScope
  );
  const missedCount = promptHits.filter(
    (hit) => !(hit.mentioned || hit.ownedSourceCited)
  ).length;
  const improveInsight = familyImproveInsight({
    familyLabel: name,
    search: engineFamilyModeTotals(family, "search"),
    memory: engineFamilyModeTotals(family, "memory"),
    missed: missedCount,
  });
  const gapsHref =
    canWrite && organizationSlug
      ? geoGapsEngineHref(organizationSlug, family.family, projectId)
      : undefined;

  function handleWrite(hit: EngineFamilyPromptHit) {
    setWriteInitial(
      writeDialogStateFromGap({
        promptId: hit.promptId,
        prompt: hit.prompt,
      })
    );
    setWriteOpen(true);
  }

  return {
    timeseriesPoints,
    organizationSlug,
    organizationId,
    canWrite,
    name,
    selectedRow,
    selectedEngine,
    promptHits,
    brandScope,
    brandRows,
    improveInsight,
    gapsHref,
    writeOpen,
    setWriteOpen,
    writeInitial,
    setSelectedPromptId,
    handleWrite,
  };
}
