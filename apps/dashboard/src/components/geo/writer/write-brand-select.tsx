"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useTranslations } from "use-intl";

import type { WriteBrandSelectProps } from "@/types/components/geo-writer";

import { WriteBrandOption } from "./write-brand-option";

export function WriteBrandSelect({
  id,
  voices,
  value,
  projectBrandId,
  onChange,
}: WriteBrandSelectProps) {
  const t = useTranslations("geo.writer.writeBrandSelect");
  const tGeoShared = useTranslations("geo.shared");
  const selected = voices.find((voice) => voice.id === value);
  if (voices.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed px-3 py-2.5 text-sm">
        {t("empty")}
      </p>
    );
  }
  return (
    <Select
      onValueChange={(value) => onChange(value || null)}
      value={value ?? ""}
    >
      <SelectTrigger className="h-10 w-full" id={id}>
        <SelectValue placeholder={tGeoShared("selectABrandIdentity")}>
          {selected ? (
            <WriteBrandOption
              isDefault={selected.id === projectBrandId}
              name={selected.name}
              websiteUrl={selected.websiteUrl}
            />
          ) : (
            tGeoShared("selectABrandIdentity")
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {voices.map((voice) => (
          <SelectItem key={voice.id} value={voice.id}>
            <WriteBrandOption
              isDefault={voice.id === projectBrandId}
              name={voice.name}
              websiteUrl={voice.websiteUrl}
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
