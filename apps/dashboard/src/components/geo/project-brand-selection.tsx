"use client";

import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "next-intl";
import { useId } from "react";

import type { GeoProjectBrandSelectionProps } from "@/types/geo";

export function GeoProjectBrandSelection({
  identities,
  selectedIdentity,
  projectName,
  disabled,
  onSelect,
}: GeoProjectBrandSelectionProps) {
  const t = useTranslations("geo.projectBrandSelection");
  const tGeoShared = useTranslations("geo.shared");
  const id = useId();

  return (
    <div className="space-y-2">
      {identities.length > 0 ? (
        <>
          <Label htmlFor={id}>{tGeoShared("projectBrandIdentity")}</Label>
          <Select
            disabled={disabled}
            onValueChange={onSelect}
            value={selectedIdentity?.id ?? ""}
          >
            <SelectTrigger className="w-full" id={id}>
              <SelectValue placeholder={t("placeholder")}>
                {selectedIdentity?.name ?? t("placeholder")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {identities.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {selectedIdentity
              ? t("usesExisting", { url: selectedIdentity.websiteUrl ?? "" })
              : t("multipleMatches")}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          {projectName.trim()
            ? t("willCreateNamed", { name: projectName.trim() })
            : t("willCreateUnnamed")}
        </p>
      )}
      <p className="text-muted-foreground text-xs">{t("articlesNote")}</p>
    </div>
  );
}
