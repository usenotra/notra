import { object, string } from "zod";

export const geoOrganizationInputSchema = object({
  organizationId: string().min(1),
  projectId: string().min(1).optional(),
});
