"use client";

import { useTranslations } from "next-intl";

import { ErrorContent } from "@/components/error-content";
import type { RouteErrorProps } from "@/types/components/error";

export default function RouteError({ error, reset }: RouteErrorProps) {
  const t = useTranslations("errors.route");
  const tCommon = useTranslations("common");
  const tErrorsShared = useTranslations("errors.shared");

  return (
    <ErrorContent
      className="min-h-[100svh]"
      copy={{
        eyebrow: t("eyebrow"),
        title: tCommon("states.error"),
        description: t("description"),
        reference: (digest) => t("reference", { digest }),
        tryAgain: tCommon("actions.tryAgain"),
        goHome: tErrorsShared("goHome"),
      }}
      error={error}
      reset={reset}
    />
  );
}
