import {
  MAX_MCP_HEADERS,
  mcpFormUrlSchema,
  mcpHeaderNameSchema,
} from "@notra/schemas/dashboard/integrations";
import * as z from "zod";

import type { CommonTranslator } from "@/types/i18n";
import type { IntegrationsSharedTranslator } from "@/types/integrations";
import type { McpFormTranslator } from "@/types/integrations/mcp";

const MCP_NAME_MAX_LENGTH = 120;
const MCP_DESCRIPTION_MAX_LENGTH = 1000;
const MCP_HEADER_NAME_MAX_LENGTH = 128;
const MCP_HEADER_VALUE_MAX_LENGTH = 4096;

export function createMcpHeaderNameSchema(t: McpFormTranslator) {
  return z
    .string()
    .trim()
    .max(MCP_HEADER_NAME_MAX_LENGTH, t("headerNameTooLong"))
    .refine(
      (value) => mcpHeaderNameSchema.safeParse(value).success,
      t("headerNameInvalid")
    );
}

export function createMcpHeaderValueSchema(t: McpFormTranslator) {
  return z
    .string()
    .trim()
    .max(MCP_HEADER_VALUE_MAX_LENGTH, t("headerValueTooLong"));
}

export function createMcpServerFormFieldsSchema(
  t: McpFormTranslator,
  tCommon: CommonTranslator
) {
  return z.object({
    authType: z.enum(["none", "headers", "oauth"]),
    name: z
      .string()
      .trim()
      .min(1, tCommon("labels.nameIsRequired"))
      .max(MCP_NAME_MAX_LENGTH),
    url: z
      .string()
      .trim()
      .min(1, t("urlRequired"))
      .refine(
        (value) => mcpFormUrlSchema.safeParse(value).success,
        t("urlInvalid")
      ),
    description: z
      .string()
      .trim()
      .max(MCP_DESCRIPTION_MAX_LENGTH, t("descriptionTooLong")),
    headers: z
      .array(
        z.object({
          name: createMcpHeaderNameSchema(t),
          value: createMcpHeaderValueSchema(t),
        })
      )
      .max(MAX_MCP_HEADERS, t("tooManyHeaders", { max: MAX_MCP_HEADERS })),
  });
}

export function createMcpServerFormSchema(
  t: McpFormTranslator,
  tCommon: CommonTranslator,
  tShared: IntegrationsSharedTranslator
) {
  return createMcpServerFormFieldsSchema(t, tCommon).superRefine(
    (value, ctx) => {
      if (value.authType !== "headers") {
        return;
      }

      let hasCompleteHeader = false;
      value.headers.forEach((row, index) => {
        const hasName = row.name.trim() !== "";
        const hasValue = row.value.trim() !== "";
        hasCompleteHeader ||= hasName && hasValue;
        if (hasName !== hasValue) {
          ctx.addIssue({
            code: "custom",
            message: t("headerPairRequired"),
            path: ["headers", index, hasValue ? "name" : "value"],
          });
        }
      });
      if (!hasCompleteHeader) {
        ctx.addIssue({
          code: "custom",
          message: tShared("addAtLeastOneAuthentication"),
          path: ["headers"],
        });
      }
    }
  );
}
