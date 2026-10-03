/**
 * The competitor detail sheet's code. Lives outside hooks and components:
 * React Compiler can't compile a function that contains `import()`.
 */
export function loadCompetitorDetailView() {
  return import("@/components/geo/competitor-detail-view");
}
