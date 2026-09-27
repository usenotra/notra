"use client";

import { GlobalIcon } from "@hugeicons/core-free-icons";
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
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { useCreateSitemap } from "@/lib/hooks/use-brand-sitemaps";
import {
  getRegistrableHost,
  isUrlWithinBrandHost,
  normalizeSitemapUrl,
} from "@/lib/sitemap/sitemap-url";
import type { AddSitemapDialogProps } from "@/types/hooks/brand-sitemaps";

export function AddSitemapDialog({
  open,
  onOpenChange,
  organizationId,
  voiceId,
  voiceWebsiteUrl,
}: AddSitemapDialogProps) {
  const t = useTranslations("brand.sitemap.addDialog");
  const tCommon2 = useTranslations("common");
  const tBrandShared = useTranslations("brand.shared");
  const tCommon = useTranslations("common.actions");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const createSitemap = useCreateSitemap(organizationId, voiceId);

  const brandHost = getRegistrableHost(voiceWebsiteUrl ?? "");

  const trimmedUrl = url.trim();
  const isOffHost =
    trimmedUrl.length > 0 && !isUrlWithinBrandHost(trimmedUrl, voiceWebsiteUrl);

  const handleClose = () => {
    setUrl("");
    setLabel("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!trimmedUrl) {
      toast.error(t("urlRequired"));
      return;
    }

    if (!isUrlWithinBrandHost(trimmedUrl, voiceWebsiteUrl)) {
      toast.error(
        brandHost ? t("offHostToast", { host: brandHost }) : t("noWebsite")
      );
      return;
    }

    const normalizedUrl = normalizeSitemapUrl(trimmedUrl);
    const trimmedLabel = label.trim() || undefined;

    try {
      await createSitemap.mutateAsync({
        url: normalizedUrl,
        label: trimmedLabel,
      });
      toast.success(tCommon2("labels.sitemapAdded"));
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tCommon2("labels.failedToAddSitemap")
      );
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" && !createSitemap.isPending) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <ResponsiveDialog onOpenChange={handleClose} open={open}>
      <ResponsiveDialogContent className="[&>*]:min-w-0">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {tBrandShared("addSitemap")}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("description")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sitemap-url">
              {tCommon2("labels.sitemapOrSiteUrl")}
            </Label>
            <Input
              aria-invalid={isOffHost}
              id="sitemap-url"
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                brandHost
                  ? `https://${brandHost}/sitemap.xml`
                  : "https://example.com/sitemap.xml"
              }
              value={url}
            />
            {isOffHost ? (
              <p className="text-destructive text-xs">
                {brandHost
                  ? tCommon2("messages.urlsMustStayOnHost", { host: brandHost })
                  : tCommon2("messages.setAWebsiteOnThis")}
              </p>
            ) : (
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <HugeiconsIcon className="size-3.5" icon={GlobalIcon} />
                {brandHost
                  ? t("scopedToHost", { host: brandHost })
                  : t("scopedToWebsite")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sitemap-label">{t("labelLabel")}</Label>
            <Input
              id="sitemap-label"
              onChange={(event) => setLabel(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("labelPlaceholder")}
              value={label}
            />
          </div>
        </div>

        <ResponsiveDialogFooter>
          <Button onClick={handleClose} variant="outline">
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={createSitemap.isPending || !trimmedUrl || isOffHost}
            onClick={handleSubmit}
          >
            {createSitemap.isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                {tCommon2("labels.adding")}
              </>
            ) : (
              tBrandShared("addSitemap")
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
