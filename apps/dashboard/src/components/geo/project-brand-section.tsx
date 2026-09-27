"use client";

import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Button } from "@/components/button";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import type { GeoProjectBrandSectionProps } from "@/types/geo";

export function GeoProjectBrandSection({
  organizationId,
  project,
}: GeoProjectBrandSectionProps) {
  const t = useTranslations("geo.projectBrandSection");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const id = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data } = useBrandSettings(organizationId);
  const { updateProjectBrand } = useGeoProjectsDb(organizationId);
  const voiceId = selectedId ?? project.brandSettingsId;
  const voice = data?.voices.find((item) => item.id === voiceId);
  const hasChange = voiceId !== project.brandSettingsId;

  const save = async () => {
    if (!hasChange || !voice || isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updateProjectBrand(project.id, voice.id);
      setSelectedId(null);
    } catch {
      setError(t("changeFailed"));
    }
    setIsSaving(false);
  };

  return (
    <TitleCard
      as="section"
      heading={tGeoShared("projectBrandIdentity")}
      headingAs="h2"
    >
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t("description")}</p>
        <div className="space-y-2">
          <Label htmlFor={id}>{tCommon2("labels.brandIdentity")}</Label>
          <Select
            disabled={isSaving}
            onValueChange={(value) => {
              setSelectedId(value);
              setError(null);
            }}
            value={voiceId}
          >
            <SelectTrigger className="w-full" id={id}>
              <SelectValue placeholder={tGeoShared("selectABrandIdentity")}>
                {voice?.name ?? tGeoShared("selectABrandIdentity")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {data?.voices.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {voice?.websiteUrl ? (
            <p className="text-muted-foreground text-xs break-all">
              {voice.websiteUrl}
            </p>
          ) : null}
        </div>
        {hasChange || isSaving ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {t("changeWarning")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isSaving} onClick={save}>
                {isSaving ? t("changing") : t("change")}
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => {
                  setSelectedId(null);
                  setError(null);
                }}
                variant="outline"
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </TitleCard>
  );
}
