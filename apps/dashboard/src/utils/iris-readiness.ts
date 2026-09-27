import type { IrisReadinessItem, IrisTranslator } from "@/types/iris";

interface IrisReadinessInput {
  organizationSlug: string;
  slackReady: boolean;
  githubConnected: boolean;
  t: IrisTranslator;
  manageLabel: string;
  connectLabel: string;
}

export function buildIrisReadiness({
  organizationSlug,
  slackReady,
  githubConnected,
  t,
  manageLabel,
  connectLabel,
}: IrisReadinessInput): IrisReadinessItem[] {
  return [
    {
      key: "github",
      label: t("readiness.sources.label"),
      description: githubConnected
        ? t("readiness.sources.ready")
        : t("readiness.sources.missing"),
      ready: githubConnected,
      href: `/${organizationSlug}/integrations/github`,
      actionLabel: githubConnected ? manageLabel : connectLabel,
    },
    {
      key: "slack",
      label: t("readiness.slack.label"),
      description: slackReady
        ? t("readiness.slack.ready")
        : t("readiness.slack.missing"),
      ready: slackReady,
      href: `/${organizationSlug}/integrations/slack`,
      actionLabel: slackReady ? manageLabel : connectLabel,
    },
  ];
}
