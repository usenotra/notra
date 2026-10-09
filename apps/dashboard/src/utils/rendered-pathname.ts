import type { RouterState } from "@tanstack/react-router";

export function renderedPathname(
  state: Pick<RouterState, "matches" | "location" | "resolvedLocation">
): string {
  const pathname = state.matches.at(-1)?.pathname ?? state.location.pathname;
  const location =
    state.location.pathname === pathname
      ? state.location
      : state.resolvedLocation;

  return location?.pathname === pathname
    ? (location.maskedLocation ?? location).pathname
    : pathname;
}
