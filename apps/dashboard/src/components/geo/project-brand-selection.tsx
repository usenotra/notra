"use client";

import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { useId } from "react";

import type { GeoProjectBrandSelectionProps } from "@/types/geo";

export function GeoProjectBrandSelection({
  identities,
  selectedIdentity,
  projectName,
  disabled,
  onSelect,
}: GeoProjectBrandSelectionProps) {
  const id = useId();

  return (
    <div className="space-y-2">
      {identities.length > 0 ? (
        <>
          <Label htmlFor={id}>Project brand identity</Label>
          <Select
            disabled={disabled}
            onValueChange={onSelect}
            value={selectedIdentity?.id ?? ""}
          >
            <SelectTrigger className="w-full" id={id}>
              <SelectValue placeholder="Choose an identity">
                {selectedIdentity?.name ?? "Choose an identity"}
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
              ? `Uses the existing identity and website: ${selectedIdentity.websiteUrl}`
              : "Several identities use this website. Choose one for this project."}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          We will create a brand identity named{" "}
          {projectName.trim() || "after this project"} and analyze this website
          to fill it in. The analysis runs in the background.
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        New articles use the project identity. You can choose another identity
        for an individual article.
      </p>
    </div>
  );
}
