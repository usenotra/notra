import "zod/compile";
import { z } from "zod";

export const companyLogoInputSchema = z.object({
  query: z.string().trim().min(1).max(255),
  searchByName: z.boolean().default(false),
});
