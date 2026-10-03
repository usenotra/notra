import { ManagedRuntime } from "effect";

import { publishBrandAnalysisOutcome } from "../programs/brand-analysis";
import type { BrandAnalysisOutcome } from "../types/brand-analysis";
import { postgresDatabaseLayer } from "./postgres";

const runtime = ManagedRuntime.make(postgresDatabaseLayer);

export const recordBrandAnalysisOutcome = (job: BrandAnalysisOutcome) =>
  runtime.runPromise(publishBrandAnalysisOutcome(job));
