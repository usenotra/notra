import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

export const RETURN_TO_MAX_LENGTH = 2048;

export const returnToSchema = z.string().max(RETURN_TO_MAX_LENGTH).nullish();
