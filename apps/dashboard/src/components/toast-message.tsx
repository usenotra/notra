"use client";

import { useTranslations } from "use-intl";

import type { ToastMessageProps } from "@/types/components/toast-message";

export function ToastMessage(props: ToastMessageProps) {
  const tCommon = useTranslations("common.toasts");
  const tLabels = useTranslations("common.labels");
  const tImageExport = useTranslations("content.toasts.imageExport");
  if (props.namespace === "common.toasts") {
    return tCommon(props.messageKey);
  }
  if (props.namespace === "common.labels") {
    return tLabels(props.messageKey);
  }
  return tImageExport(props.messageKey);
}
