export type CommonToastMessageKey =
  | "copied"
  | "clipboardUnsupported"
  | "copyFailed"
  | "linkedinPostCopied"
  | "linkedinPostCopyFailed"
  | "bookingOpenFailed";

export type ImageExportToastMessageKey =
  | "copyLoading"
  | "imageNotReady"
  | "figmaCopied"
  | "figmaCopyFailed"
  | "paperCopied"
  | "paperCopyFailed"
  | "downloadFailed";

export type CommonLabelToastMessageKey = "downloadedImage";

export type ToastMessageProps =
  | { namespace: "common.toasts"; messageKey: CommonToastMessageKey }
  | { namespace: "common.labels"; messageKey: CommonLabelToastMessageKey }
  | {
      namespace: "content.toasts.imageExport";
      messageKey: ImageExportToastMessageKey;
    };
