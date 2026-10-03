import type { ParsedLocation } from "@tanstack/react-router";

export interface RouteModal {
  kind: "account" | "competitor" | "framer" | "raycast";
  organizationSlug: string;
  name: string;
}

export type ModalBackgroundLocation = Pick<
  ParsedLocation,
  "pathname" | "search" | "hash"
>;

declare module "@tanstack/react-router" {
  interface HistoryState {
    notraModal?: RouteModal;
  }
}
