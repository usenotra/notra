import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

import { loadDocumentCatalog } from "@/lib/i18n/catalog";

function hydrate() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>
    );
  });
}

// React streams late Suspense content as hidden nodes plus inline `$RS`
// scripts that move them into place. If hydration starts mid-stream and falls
// back to a client render, React clears the body and the `$RS` scripts still
// arriving throw on the missing nodes. Waiting for the parsed document avoids
// that; the stream is one response, so this costs little.
const documentParsed = new Promise<void>((resolve) => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => resolve(), {
      once: true,
    });
  } else {
    resolve();
  }
});

// The root route renders from the in-memory catalog, so it has to be there
// before hydration. The document head preloads it, so this rarely waits. On a
// failed fetch the root route retries and surfaces the error itself.
Promise.all([
  loadDocumentCatalog().catch(() => undefined),
  documentParsed,
]).finally(hydrate);
