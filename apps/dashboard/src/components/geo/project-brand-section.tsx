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
import { useId, useState } from "react";

import { Button } from "@/components/button";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import type { GeoProjectBrandSectionProps } from "@/types/geo";

export function GeoProjectBrandSection({
  organizationId,
  project,
}: GeoProjectBrandSectionProps) {
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
      setError("Could not change the project identity. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TitleCard as="section" heading="Project brand identity" headingAs="h2">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          This identity supplies the project's brand website and the default
          voice and sitemaps for new articles. You can choose another identity
          for an individual article.
        </p>
        <div className="space-y-2">
          <Label htmlFor={id}>Brand identity</Label>
          <Select
            disabled={isSaving}
            onValueChange={(value) => {
              setSelectedId(value);
              setError(null);
            }}
            value={voiceId}
          >
            <SelectTrigger className="w-full" id={id}>
              <SelectValue placeholder="Select a brand identity">
                {voice?.name ?? "Select a brand identity"}
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
              Changing the identity does not regenerate the company name,
              aliases, competitors, or tracking prompts. Review those settings
              after saving. Existing articles and scan history stay as they are.
              For a different business, create a new project instead.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isSaving} onClick={save}>
                {isSaving ? "Changing identity" : "Change project identity"}
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => {
                  setSelectedId(null);
                  setError(null);
                }}
                variant="outline"
              >
                Cancel
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
