"use client";

import { GSC_OAUTH_AUTHORIZE_PATH } from "@notra/geo-core/constants/google-search-console";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { AddGoogleSearchConsoleIntegrationDialog } from "@/components/integrations/add-google-search-console-integration-dialog";
import { AddGranolaIntegrationDialog } from "@/components/integrations/add-granola-integration-dialog";
import { AddLinearIntegrationDialog } from "@/components/integrations/add-linear-integration-dialog";
import { AddSlackIntegrationDialog } from "@/components/integrations/add-slack-integration-dialog";
import type { IntegrationConnectDialogProps } from "@/types/integrations/catalog";

const GitHubIntegrationDialog = dynamic(
  () =>
    import("@/components/integrations/github/github-integration-dialog").then(
      (module) => module.GitHubIntegrationDialog
    ),
  { ssr: false }
);

export function IntegrationConnectDialog({
  integrationId,
  open,
  onOpenChange,
  organizationId,
  organizationSlug,
}: IntegrationConnectDialogProps) {
  const pathname = usePathname();
  const callbackPath = encodeURIComponent(pathname);
  switch (integrationId) {
    case "github":
      return (
        <GitHubIntegrationDialog
          onOpenChange={onOpenChange}
          open={open}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
        />
      );
    case "linear":
      return (
        <AddLinearIntegrationDialog
          authorizeUrl={`/api/integrations/linear/authorize?organizationId=${organizationId}&callbackPath=${callbackPath}`}
          onOpenChange={onOpenChange}
          open={open}
        />
      );
    case "granola":
      return (
        <AddGranolaIntegrationDialog
          onOpenChange={onOpenChange}
          open={open}
          organizationId={organizationId}
        />
      );
    case "slack":
      return (
        <AddSlackIntegrationDialog
          authorizeUrl={`/api/integrations/slack/authorize?organizationId=${organizationId}&callbackPath=${callbackPath}`}
          onOpenChange={onOpenChange}
          open={open}
        />
      );
    case "google-search-console":
      return (
        <AddGoogleSearchConsoleIntegrationDialog
          authorizeUrl={`${GSC_OAUTH_AUTHORIZE_PATH}?organizationId=${organizationId}&callbackPath=${encodeURIComponent(`/${organizationSlug}/integrations/google-search-console`)}`}
          onOpenChange={onOpenChange}
          open={open}
        />
      );
    default:
      return null;
  }
}
