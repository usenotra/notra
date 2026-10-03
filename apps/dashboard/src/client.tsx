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

// The root route renders from the in-memory catalog, so it has to be there
// before hydration. The document head preloads it, so this rarely waits. On a
// failed fetch the root route retries and surfaces the error itself.
loadDocumentCatalog()
  .catch(() => undefined)
  .finally(hydrate);
