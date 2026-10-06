import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { SITE_SHARE_LINK_DAYS } from "@/constants/sites";
import { dashboardOrpc } from "@/lib/orpc/query";
import type { SitePreviewRow, SiteScope } from "@/types/sites";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { toErrorMessage } from "@/utils/error-message";

export function useSitePreviewLinks({ organizationId, siteId }: SiteScope) {
  const t = useTranslations("sites.previewsPage");

  const openPreview = async (row: SitePreviewRow) => {
    if (row.visibility !== "protected") {
      window.open(row.url, "_blank", "noopener,noreferrer");
      return;
    }
    const popup = window.open("", "_blank");
    try {
      const { url } = await dashboardOrpc.sites.previews.accessUrl.call({
        organizationId,
        siteId,
        previewKey: row.previewKey,
        kind: "member",
      });
      if (popup) {
        popup.opener = null;
        popup.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      popup?.close();
      toast.error(toErrorMessage(error, t("openFailed")));
    }
  };

  const copyShareLink = async (row: SitePreviewRow) => {
    try {
      const { url } = await dashboardOrpc.sites.previews.accessUrl.call({
        organizationId,
        siteId,
        previewKey: row.previewKey,
        kind: "share",
      });
      await copyTextToClipboard(
        url,
        t("shareCopied", { days: SITE_SHARE_LINK_DAYS })
      );
    } catch (error) {
      toast.error(toErrorMessage(error, t("shareFailed")));
    }
  };

  return { openPreview, copyShareLink };
}
