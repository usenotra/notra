import { createElement } from "react";

import { ToastMessage } from "@/components/toast-message";
import type {
  CommonLabelToastMessageKey,
  CommonToastMessageKey,
  ImageExportToastMessageKey,
} from "@/types/components/toast-message";

export function commonToastMessage(messageKey: CommonToastMessageKey) {
  return createElement(ToastMessage, {
    namespace: "common.toasts",
    messageKey,
  });
}

export function commonLabelToastMessage(
  messageKey: CommonLabelToastMessageKey
) {
  return createElement(ToastMessage, {
    namespace: "common.labels",
    messageKey,
  });
}

export function imageExportToastMessage(
  messageKey: ImageExportToastMessageKey
) {
  return createElement(ToastMessage, {
    namespace: "content.toasts.imageExport",
    messageKey,
  });
}
