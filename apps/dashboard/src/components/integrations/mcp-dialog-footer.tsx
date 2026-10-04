"use client";

import { ResponsiveDialogClose } from "@notra/ui/components/shared/responsive-dialog";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { McpDialogFooterProps } from "@/types/integrations/mcp";

export function McpDialogFooter({
  authType,
  canSubmit,
  status,
  onCancel,
  onTest,
}: McpDialogFooterProps) {
  const t = useTranslations("integrations.mcp.footer");
  const tIntegrationsShared = useTranslations("integrations.shared");
  const tCommon = useTranslations("common");
  const isCreating = status === "creating";
  const isRedirecting = status === "redirecting";
  const isTesting = status === "testing";
  const isPending = isCreating || isRedirecting;
  let submitLabel =
    authType === "oauth" ? t("connectAndAuthorize") : t("addServer");
  if (isCreating) {
    submitLabel = tCommon("labels.adding");
  } else if (isRedirecting) {
    submitLabel = tIntegrationsShared("redirecting");
  }

  return (
    <>
      {authType !== "oauth" ? (
        <Button
          className="sm:mr-auto"
          disabled={isTesting}
          onClick={onTest}
          type="button"
          variant="outline"
        >
          {isTesting ? t("testing") : t("testConnection")}
        </Button>
      ) : (
        <div className="sm:mr-auto" />
      )}
      <ResponsiveDialogClose
        disabled={isPending}
        onClick={onCancel}
        render={<Button type="button" variant="outline" />}
      >
        {tCommon("actions.cancel")}
      </ResponsiveDialogClose>
      <Button disabled={!canSubmit || isPending} type="submit">
        {submitLabel}
      </Button>
    </>
  );
}
