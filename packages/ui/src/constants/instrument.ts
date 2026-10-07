/** Header and body classes for each dualtone `InstrumentModule` layout. */
export const INSTRUMENT_SURFACE_CLASSES = {
  panel: {
    header: "min-h-24 content-start rounded-t-[14px] pt-4 pb-9",
    content:
      "border-border bg-card shadow-lift relative -mt-5 flex flex-1 flex-col rounded-[14px] border p-6",
  },
  table: {
    header: "h-[4.25rem] content-center items-center rounded-t-[14px] pb-5",
    content:
      "border-border bg-card shadow-lift relative -mt-5 flex flex-1 flex-col rounded-[14px] border p-4",
  },
  bare: {
    header: "px-1",
    content: "flex flex-1 flex-col p-0",
  },
} as const;
