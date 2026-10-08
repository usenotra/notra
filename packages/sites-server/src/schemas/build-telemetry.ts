import { z } from "zod";

export const guestBuildTelemetrySchema = z.object({
  phases: z.object({
    extract: z.number().finite().nonnegative().optional(),
    compile: z.number().finite().nonnegative().optional(),
    pack: z.number().finite().nonnegative().optional(),
  }),
  sandboxCpuTimeMs: z.number().finite().nonnegative().nullable(),
  sandboxMemoryPeakBytes: z.number().finite().nonnegative().nullable(),
});
