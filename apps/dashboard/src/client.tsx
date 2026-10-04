import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

import { loadDocumentCatalog } from "@/lib/i18n/catalog";
import type {
  StreamedDocumentHost,
  StreamedSegmentMove,
} from "@/types/framework-runtime";

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

// Hydration starts while the document may still be streaming. React moves late
// Suspense segments into place with inline `$RS` calls; if a hydration
// mismatch makes React re-render the whole document on the client, the nodes
// those calls target are gone and `$RS` would throw. Skip such calls: the
// client render already shows that content. The accessor also covers an
// `$RS` the stream defines after this runs.
function guardStreamedSegments() {
  const host = window as StreamedDocumentHost;
  let move: StreamedSegmentMove | undefined = host.$RS;
  const guardedMove: StreamedSegmentMove = (segmentId, placeholderId) => {
    if (
      document.getElementById(segmentId) &&
      document.getElementById(placeholderId)
    ) {
      move?.(segmentId, placeholderId);
    }
  };
  Object.defineProperty(host, "$RS", {
    configurable: true,
    get: () => guardedMove,
    set: (next: StreamedSegmentMove) => {
      move = next;
    },
  });
}

guardStreamedSegments();

// The root route renders from the in-memory catalog, so it has to be there
// before hydration. The document head preloads it, so this rarely waits. On a
// failed fetch the root route retries and surfaces the error itself.
loadDocumentCatalog()
  .catch(() => undefined)
  .finally(hydrate);
