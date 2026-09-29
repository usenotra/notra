"use client";

import { preferredGeoLanguage } from "@notra/geo-core/utils/geo-locale-language";
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
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { GeoLanguagePicker } from "@/components/geo/geo-language-picker";
import { GeoProjectBrandSelection } from "@/components/geo/project-brand-selection";
import {
  useAnalyzeBrand,
  useBrandAnalysisProgress,
  useBrandSettings,
  useCreateBrandVoice,
} from "@/lib/hooks/use-brand-analysis";
import { useGeoProjectsDb } from "@/lib/hooks/use-geo-db";
import type { GeoProjectCreateDialogProps } from "@/types/geo";
import {
  projectBrandIdentityName,
  projectWebsiteUrl,
  resolveProjectBrandSelection,
} from "@/utils/geo-projects";

function browserGeoLanguages(): string[] {
  return [
    preferredGeoLanguage(
      typeof navigator === "undefined" ? null : navigator.languages
    ),
  ];
}

export function GeoProjectCreateDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: GeoProjectCreateDialogProps) {
  const t = useTranslations("geo.projectCreateDialog");
  const tCommon2 = useTranslations("common");
  const tCommon = useTranslations("common.actions");
  const id = useId();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedBrandSettingsId, setSelectedBrandSettingsId] = useState<
    string | null
  >(null);
  const [languages, setLanguages] = useState(browserGeoLanguages);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createProject } = useGeoProjectsDb(organizationId, { enabled: open });
  const brandQuery = useBrandSettings(organizationId, { enabled: open });
  const createIdentity = useCreateBrandVoice(organizationId);
  const { startPolling } = useBrandAnalysisProgress(organizationId);
  const analyzeIdentity = useAnalyzeBrand(organizationId, startPolling);
  const websiteUrl = projectWebsiteUrl(website);
  const identityName = projectBrandIdentityName(
    name,
    brandQuery.data?.voices ?? []
  );
  const { matches, selectedIdentity } = resolveProjectBrandSelection(
    website,
    brandQuery.data?.voices ?? [],
    selectedBrandSettingsId,
    createIdentity.data?.voice
  );

  const reset = () => {
    setName("");
    setWebsite("");
    setSelectedBrandSettingsId(null);
    setLanguages(browserGeoLanguages());
    setError(null);
    createIdentity.reset();
  };

  const handleCreate = async () => {
    if (isSubmitting) {
      return;
    }
    if (!websiteUrl || !name.trim()) {
      setError(t("invalidInput"));
      return;
    }
    if (!brandQuery.isSuccess || (matches.length > 1 && !selectedIdentity)) {
      setError(t("chooseIdentity"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      let brandSettingsId = selectedIdentity?.id;
      if (!brandSettingsId) {
        const { voice } = await createIdentity.mutateAsync({
          name: identityName,
          websiteUrl,
        });
        brandSettingsId = voice.id;
        setSelectedBrandSettingsId(voice.id);
      }
      const project = await createProject({
        name: name.trim(),
        brandSettingsId,
        languages,
      });
      if (
        !selectedIdentity ||
        createIdentity.data?.voice.id === brandSettingsId
      ) {
        await analyzeIdentity
          .mutateAsync({ url: websiteUrl, voiceId: brandSettingsId })
          .catch(() => {
            toast.error(t("analysisFailed"));
          });
      }
      reset();
      onOpenChange(false);
      onCreated(project.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : tCommon2("labels.failedToCreateProject")
      );
    }
    setIsSubmitting(false);
  };

  return (
    <ResponsiveDialog
      onOpenChange={(next) => {
        if (isSubmitting) {
          return;
        }
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
      open={open}
    >
      <ResponsiveDialogContent className="sm:max-w-sm">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {tCommon2("labels.newProject")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor={`${id}-website`}>
              {tCommon2("labels.website")}
            </Label>
            <Input
              autoComplete="url"
              disabled={isSubmitting}
              id={`${id}-website`}
              inputMode="url"
              onChange={(event) => {
                setWebsite(event.target.value);
                setSelectedBrandSettingsId(null);
                setError(null);
              }}
              placeholder="example.com"
              required
              value={website}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>{t("nameLabel")}</Label>
            <Input
              disabled={isSubmitting}
              id={`${id}-name`}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme"
              required
              value={name}
            />
          </div>
          <div className="space-y-2">
            <Label>{tCommon2("labels.languages")}</Label>
            <GeoLanguagePicker
              disabled={isSubmitting}
              labeled={false}
              onChange={setLanguages}
              selected={languages}
            />
          </div>
          {websiteUrl && brandQuery.isSuccess ? (
            <GeoProjectBrandSelection
              disabled={isSubmitting}
              identities={matches}
              onSelect={setSelectedBrandSettingsId}
              projectName={identityName}
              selectedIdentity={selectedIdentity}
            />
          ) : null}
          {brandQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {t("loadIdentitiesFailed")}{" "}
              <button
                className="underline"
                onClick={() => brandQuery.refetch()}
                type="button"
              >
                {tCommon("tryAgain")}
              </button>
            </p>
          ) : null}
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {error && createIdentity.isSuccess ? (
            <p className="text-muted-foreground text-sm">
              {t("identitySaved")}
            </p>
          ) : null}
          <ResponsiveDialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              type="button"
              variant="outline"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              disabled={isSubmitting || !brandQuery.isSuccess}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : null}
              {isSubmitting ? t("settingUp") : t("create")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
