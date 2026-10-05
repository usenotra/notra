import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../src/styles/globals.css";
import { RedirectFixture } from "./redirect";
import { ShelfFixture } from "./shelf";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing browser fixture root");
}
createRoot(root).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).get("test") === "redirect" ? (
      <RedirectFixture />
    ) : (
      <ShelfFixture />
    )}
  </StrictMode>
);
