"use client";

import { MCP_URL_PROTOCOL_REGEX } from "@notra/schemas/dashboard/integrations";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import { Textarea } from "@notra/ui/components/ui/textarea";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { buildMcpUrl, getMcpFormErrorMessage } from "@/lib/integrations/mcp";
import { createMcpServerFormFieldsSchema } from "@/schemas/mcp-server-form";
import type { McpServerDetailsFieldsProps } from "@/types/integrations/mcp";

export function McpServerDetailsFields({
  form,
  invalidateTestResult,
  readOnly = false,
}: McpServerDetailsFieldsProps) {
  const t = useTranslations("integrations.mcp.form");
  const tCommon = useTranslations("common");
  const addMcpServerFormFieldsSchema = useMemo(
    () => createMcpServerFormFieldsSchema(t, tCommon),
    [t, tCommon]
  );

  if (readOnly) {
    return (
      <form.Subscribe selector={(state) => state.values}>
        {(values) => (
          <div className="space-y-2">
            <Field>
              <FieldLabel>{t("serverUrl")}</FieldLabel>
              <p className="text-muted-foreground text-sm break-all">
                {buildMcpUrl(values.url)}
              </p>
            </Field>
            {values.description ? (
              <p className="text-muted-foreground text-sm">
                {values.description}
              </p>
            ) : null}
          </div>
        )}
      </form.Subscribe>
    );
  }

  return (
    <>
      <form.Field
        name="name"
        validators={{
          onBlur: addMcpServerFormFieldsSchema.shape.name,
          onChange: addMcpServerFormFieldsSchema.shape.name,
          onSubmit: addMcpServerFormFieldsSchema.shape.name,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="mcp-name">
              {tCommon("labels.name")}{" "}
              <span className="text-destructive -ml-1">*</span>
            </FieldLabel>
            <Input
              autoComplete="off"
              disabled={readOnly}
              id="mcp-name"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={t("namePlaceholder")}
              value={field.state.value}
            />
            {field.state.meta.errors[0] ? (
              <p className="text-destructive text-sm">
                {getMcpFormErrorMessage(
                  field.state.meta.errors[0],
                  tCommon("labels.invalidValue")
                )}
              </p>
            ) : null}
          </Field>
        )}
      </form.Field>

      <form.Field
        name="url"
        validators={{
          onBlur: addMcpServerFormFieldsSchema.shape.url,
          onChange: addMcpServerFormFieldsSchema.shape.url,
          onSubmit: addMcpServerFormFieldsSchema.shape.url,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="mcp-url">
              {t("serverUrl")} <span className="text-destructive -ml-1">*</span>
            </FieldLabel>
            <div
              className={`focus-within:border-ring focus-within:ring-ring/50 flex w-full flex-row items-center rounded-lg border transition-colors ${field.state.meta.errors.length > 0 ? "border-destructive" : "border-border"}`}
            >
              <label
                className="border-border text-muted-foreground border-r px-2.5 py-1.5 text-sm transition-colors"
                htmlFor="mcp-url"
              >
                https://
              </label>
              <input
                autoComplete="off"
                className="flex-1 bg-transparent px-2.5 py-1.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={readOnly}
                id="mcp-url"
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(
                    event.target.value.replace(MCP_URL_PROTOCOL_REGEX, "")
                  );
                  invalidateTestResult();
                }}
                placeholder="mcp.example.com/mcp"
                value={field.state.value}
              />
            </div>
            {field.state.meta.errors[0] ? (
              <p className="text-destructive text-sm">
                {getMcpFormErrorMessage(
                  field.state.meta.errors[0],
                  tCommon("labels.invalidValue")
                )}
              </p>
            ) : (
              <FieldDescription>{t("urlDescription")}</FieldDescription>
            )}
          </Field>
        )}
      </form.Field>

      <form.Field
        name="description"
        validators={{
          onChange: addMcpServerFormFieldsSchema.shape.description,
        }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="mcp-description">{t("useCase")}</FieldLabel>
            <Textarea
              className="max-h-[10rem] overflow-y-auto"
              disabled={readOnly}
              id="mcp-description"
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder={t("useCasePlaceholder")}
              rows={3}
              value={field.state.value}
            />
            {field.state.meta.errors[0] ? (
              <p className="text-destructive text-sm">
                {getMcpFormErrorMessage(
                  field.state.meta.errors[0],
                  tCommon("labels.invalidValue")
                )}
              </p>
            ) : null}
          </Field>
        )}
      </form.Field>
    </>
  );
}
