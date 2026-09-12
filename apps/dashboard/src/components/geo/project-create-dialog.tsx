"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@notra/ui/components/shared/responsive-dialog";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Loader2Icon } from "lucide-react";
import { useId, useState } from "react";

import { AddIdentityDialog } from "@/app/(dashboard)/[slug]/brand/identity/components/add-identity-dialog";
import { Button } from "@/components/button";
import { useBrandSettings } from "@/lib/hooks/use-brand-analysis";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import type { GeoProjectCreateDialogProps } from "@/types/geo";

export function GeoProjectCreateDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: GeoProjectCreateDialogProps) {
  const nameId = useId();
  const brandId = useId();
  const [name, setName] = useState("");
  const [selectedBrandSettingsId, setSelectedBrandSettingsId] = useState<
    string | null
  >(null);
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
  const { createProject, isCreating } = useGeoProjectsDb(organizationId);
  const brandSettingsQuery = useBrandSettings(organizationId);

  const voices = brandSettingsQuery.data?.voices ?? [];
  const brandSettingsId =
    selectedBrandSettingsId ??
    voices.find((voice) => voice.isDefault)?.id ??
    voices.at(0)?.id ??
    null;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("");
      setSelectedBrandSettingsId(null);
    }
    onOpenChange(next);
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || !brandSettingsId || isCreating) {
      return;
    }
    const project = await createProject({
      name: trimmed,
      brandSettingsId,
    });
    setName("");
    setSelectedBrandSettingsId(null);
    onOpenChange(false);
    onCreated(project.id);
  };

  return (
    <>
      <ResponsiveDialog onOpenChange={handleOpenChange} open={open}>
        <ResponsiveDialogContent className="sm:max-w-sm">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>New project</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              We’ll analyze the brand’s website, find competitors, generate
              prompts, and start tracking it automatically.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="space-y-4 px-4 sm:px-0">
            <div className="space-y-2">
              <Label htmlFor={nameId}>Project name</Label>
              <Input
                autoFocus
                id={nameId}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="Acme"
                value={name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={brandId}>Brand identity</Label>
              <div className="flex gap-2">
                <Select
                  disabled={voices.length === 0}
                  onValueChange={(value) =>
                    setSelectedBrandSettingsId(value ?? null)
                  }
                  value={brandSettingsId ?? ""}
                >
                  <SelectTrigger className="min-w-0 flex-1" id={brandId}>
                    <SelectValue placeholder="Select a brand identity">
                      {(value: string | null) => {
                        if (voices.length === 0) {
                          return "No brand identity yet";
                        }
                        return (
                          voices.find((voice) => voice.id === value)?.name ??
                          "Select a brand identity"
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false}>
                    {voices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {voices.length > 0 && (
                  <Button
                    aria-label="Create brand identity"
                    onClick={() => setIdentityDialogOpen(true)}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  </Button>
                )}
              </div>
              {voices.length === 0 && (
                <Button
                  className="w-full justify-center gap-2"
                  onClick={() => setIdentityDialogOpen(true)}
                  size="lg"
                  type="button"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={16} />
                  Create brand identity
                </Button>
              )}
              <p className="text-muted-foreground text-xs">
                {voices.length === 0
                  ? "You need a brand identity to track this project. Create one to continue."
                  : "Link a brand identity to this project, or create a new one."}
              </p>
            </div>
          </div>
          <ResponsiveDialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                name.trim().length === 0 || !brandSettingsId || isCreating
              }
              onClick={handleCreate}
              type="button"
            >
              {isCreating && <Loader2Icon className="size-4 animate-spin" />}
              {isCreating ? "Setting up project" : "Create project"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <AddIdentityDialog
        onCreated={(voice) => setSelectedBrandSettingsId(voice.id)}
        onOpenChange={setIdentityDialogOpen}
        open={identityDialogOpen}
        organizationId={organizationId}
        startPolling={() => undefined}
      />
    </>
  );
}
