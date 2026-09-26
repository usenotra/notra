import { MAX_BRAND_GUIDELINE_PDF_FILE_SIZE } from "@notra/schemas/constants/dashboard/upload";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_BRAND_GUIDELINE_PDF_PAGES = 100;

export const PDF_TEXT_EXTRACTION_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

// Note: withTimeout is Promise.race and does not abort the underlying pdfjs
// work; on timeout the parse/extract continues in the background. The timeout
// bounds how long we wait, not peak CPU. Callers must enforce
// MAX_BRAND_GUIDELINE_PDF_FILE_SIZE before calling (attach does), and this
// runs synchronously in the oRPC request: a 20MB/100-page PDF can burn up to
// ~60s of server CPU. Follow-up: move extraction to a background job/workflow
// step with a route max-duration; see attachBrandGuidelineSourcePdf.
export async function extractPdfText(data: Uint8Array) {
  if (data.byteLength > MAX_BRAND_GUIDELINE_PDF_FILE_SIZE) {
    throw new Error(
      `Brand guideline PDF must be less than ${MAX_BRAND_GUIDELINE_PDF_FILE_SIZE / 1024 / 1024}MB`
    );
  }
  const loading = getDocumentProxy(data);
  let document: Awaited<typeof loading> | undefined;
  try {
    document = await withTimeout(
      loading,
      PDF_TEXT_EXTRACTION_TIMEOUT_MS,
      "PDF parsing"
    );
  } catch (error) {
    const timedOut =
      error instanceof Error && error.message.endsWith("timed out");
    if (timedOut) {
      loading
        .then((lateDocument) => {
          const destroy = (lateDocument as { destroy?: () => unknown }).destroy;
          return destroy?.call(lateDocument);
        })
        .catch((destroyError) => {
          console.error("Failed to destroy timed-out PDF document", {
            error: destroyError,
          });
        });
    }
    throw error;
  }
  try {
    const numPages = (document as { numPages?: unknown }).numPages;
    if (
      typeof numPages === "number" &&
      numPages > MAX_BRAND_GUIDELINE_PDF_PAGES
    ) {
      throw new Error(
        `This PDF has ${numPages} pages. Export a shorter guideline under ${MAX_BRAND_GUIDELINE_PDF_PAGES} pages and try again.`
      );
    }
    const extracted = await withTimeout(
      extractText(document, { mergePages: true }),
      PDF_TEXT_EXTRACTION_TIMEOUT_MS,
      "PDF text extraction"
    );
    return Array.isArray(extracted.text)
      ? extracted.text.join("\n")
      : extracted.text;
  } finally {
    // Extraction may still be in flight after a timeout; a rejecting destroy()
    // must not mask the original timeout error.
    try {
      await (document as { destroy?: () => unknown }).destroy?.();
    } catch (error) {
      console.error("Failed to destroy PDF document", { error });
    }
  }
}
