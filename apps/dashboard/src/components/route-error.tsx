import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { ErrorContent } from "@/components/error-content";

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
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
      error={error instanceof Error ? error : new Error(String(error))}
      reset={() => {
        reset();
        void router.invalidate();
      }}
    />
  );
}
