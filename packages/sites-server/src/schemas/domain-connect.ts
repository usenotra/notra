import z from "zod";

import { DOMAIN_CONNECT_TEMPLATE_VERSION } from "../constants/domain-connect";

export const domainConnectSettingsSchema = z.object({
  providerId: z.string().min(1),
  providerName: z.string().min(1),
  providerDisplayName: z.string().min(1).optional(),
  urlSyncUX: z.url({ protocol: /^https$/ }).optional(),
  urlAPI: z.url({ protocol: /^https$/ }),
});

export const domainConnectTemplateSchema = z.object({
  version: z.number().int().min(DOMAIN_CONNECT_TEMPLATE_VERSION),
  records: z
    .array(
      z.object({
        type: z.string(),
        host: z.string(),
        data: z.string().optional(),
        pointsTo: z.string().optional(),
      })
    )
    .length(3),
});
