import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

/**
 * Responses of the WorkOS Widgets `UserProfile` API we call directly. Only
 * the fields we read are declared; everything else passes through.
 */

const widgetsPasskeySchema = z.looseObject({
  id: z.string(),
  name: z.string().nullish(),
  createdAt: z.string().nullish(),
});

export const widgetsAuthenticationInformationSchema = z.looseObject({
  data: z
    .looseObject({
      verificationMethods: z
        .looseObject({
          Passkey: z
            .looseObject({
              isSetUp: z.boolean(),
              passKeys: z.array(widgetsPasskeySchema).default([]),
            })
            .nullish(),
        })
        .optional(),
    })
    .optional(),
});

export const widgetsSendVerificationSchema = z.looseObject({
  authenticationChallenge: z.string(),
});

export const widgetsVerifySchema = z.looseObject({
  elevatedAccessToken: z.string(),
  expiresAt: z.string().optional(),
});

export const widgetsRegisterPasskeySchema = z.looseObject({
  challengeId: z.string(),
  options: z.record(z.string(), z.unknown()),
});

export const widgetsSuccessSchema = z.looseObject({
  success: z.boolean().optional(),
});
