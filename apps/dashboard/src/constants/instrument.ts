/** Header and body classes for each dualtone `InstrumentModule` layout. */
export const INSTRUMENT_SURFACE_CLASSES = {
  panel: {
    header:
      "border-shell-border bg-shell min-h-24 content-start rounded-t-2xl border border-b-0 pt-4 pb-9",
    content:
      "border-border bg-card shadow-lift relative -mt-5 flex flex-1 flex-col rounded-2xl border p-6",
  },
  table: {
    header:
      "border-shell-border bg-shell h-[4.25rem] content-center items-center rounded-t-2xl border border-b-0 pb-5",
    content:
      "border-border bg-card shadow-lift relative -mt-5 flex flex-1 flex-col rounded-2xl border p-4",
  },
  bare: {
    header: "px-1",
    content: "flex flex-1 flex-col p-0",
  },
} as const;
