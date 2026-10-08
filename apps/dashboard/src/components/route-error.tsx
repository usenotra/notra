import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { ErrorContent } from "@/components/error-content";
import {
  isChunkLoadError,
  reloadForClientUpdate,
} from "@/utils/chunk-load-error";

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const t = useTranslations("errors.route");
  const tCommon = useTranslations("common");
  const tErrorsShared = useTranslations("errors.shared");
  const chunkLoadFailed = isChunkLoadError(error);

  return (
    <ErrorContent
      className="min-h-[100svh]"
      copy={{
        eyebrow: t("eyebrow"),
        title: chunkLoadFailed ? t("chunkTitle") : tCommon("states.error"),
        description: t(chunkLoadFailed ? "chunkDescription" : "description"),
        reference: (digest) => t("reference", { digest }),
        tryAgain: chunkLoadFailed ? t("reload") : tCommon("actions.tryAgain"),
        goHome: tErrorsShared("goHome"),
      }}
      error={error instanceof Error ? error : new Error(String(error))}
      reset={() => {
        if (chunkLoadFailed) {
          reloadForClientUpdate();
          return;
        }
        reset();
        void router.invalidate();
      }}
    />
  );
}
