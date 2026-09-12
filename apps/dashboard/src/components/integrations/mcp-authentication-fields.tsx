"use client";

import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MAX_MCP_HEADERS,
  mcpHeaderNameSchema,
  mcpHeaderValueSchema,
} from "@notra/schemas/dashboard/integrations";
import { Field, FieldLabel } from "@notra/ui/components/ui/field";
import { Input } from "@notra/ui/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";

import { Button } from "@/components/button";
import { MCP_AUTH_OPTIONS } from "@/constants/mcp";
import { getMcpFormErrorMessage } from "@/lib/integrations/mcp";
import type { McpAuthenticationFieldsProps } from "@/types/integrations/mcp";

export function McpAuthenticationFields({
  form,
  headerRowIds,
  invalidateTestResult,
  lockAuthType = false,
  setHeaderRowIds,
}: McpAuthenticationFieldsProps) {
  return (
    <form.Field name="authType">
      {(authTypeField) => (
        <Field>
          <FieldLabel>Authentication</FieldLabel>
          <Tabs
            onValueChange={(value) => {
              if (lockAuthType) {
                return;
              }
              const option = MCP_AUTH_OPTIONS.find(
                (candidate) => candidate.value === value
              );
              if (option) {
                authTypeField.handleChange(option.value);
                invalidateTestResult();
              }
            }}
            value={authTypeField.state.value}
          >
            <TabsList className="grid h-9 w-full grid-cols-3">
              {MCP_AUTH_OPTIONS.map((option) => (
                <TabsTrigger
                  disabled={
                    lockAuthType && option.value !== authTypeField.state.value
                  }
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="none">
              <p className="text-muted-foreground text-sm">
                Connect to a public MCP server without credentials.
              </p>
            </TabsContent>
            <TabsContent value="headers">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-sm">
                    Add an API key, bearer token, or custom headers.
                  </p>
                  <form.Field mode="array" name="headers">
                    {(headersField) => (
                      <Button
                        aria-label="Add authentication header"
                        disabled={
                          headersField.state.value.length >= MAX_MCP_HEADERS
                        }
                        onClick={() => {
                          headersField.pushValue({ name: "", value: "" });
                          setHeaderRowIds((ids) => [
                            ...ids,
                            crypto.randomUUID(),
                          ]);
                        }}
                        size="icon-sm"
                        type="button"
                        variant="outline"
                      >
                        <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
                      </Button>
                    )}
                  </form.Field>
                </div>
                <form.Field mode="array" name="headers">
                  {(headersField) => (
                    <div className="space-y-2">
                      {headersField.state.value.map((_, index) => (
                        <div
                          className="flex items-start gap-2"
                          key={headerRowIds[index]}
                        >
                          <form.Field
                            name={`headers[${index}].name`}
                            validators={{ onChange: mcpHeaderNameSchema }}
                          >
                            {(field) => (
                              <Field className="flex-1">
                                <Input
                                  aria-label={`Authentication header ${index + 1} name`}
                                  autoComplete="off"
                                  onBlur={field.handleBlur}
                                  onChange={(event) => {
                                    field.handleChange(event.target.value);
                                    invalidateTestResult();
                                  }}
                                  placeholder="Authorization"
                                  value={field.state.value}
                                />
                                {field.state.meta.errors[0] ? (
                                  <p className="text-destructive text-sm">
                                    {getMcpFormErrorMessage(
                                      field.state.meta.errors[0]
                                    )}
                                  </p>
                                ) : null}
                              </Field>
                            )}
                          </form.Field>
                          <form.Field
                            name={`headers[${index}].value`}
                            validators={{ onChange: mcpHeaderValueSchema }}
                          >
                            {(field) => (
                              <Field className="flex-[1.3]">
                                <Input
                                  aria-label={`Authentication header ${index + 1} value`}
                                  autoComplete="off"
                                  onBlur={field.handleBlur}
                                  onChange={(event) => {
                                    field.handleChange(event.target.value);
                                    invalidateTestResult();
                                  }}
                                  placeholder="Bearer token"
                                  type="password"
                                  value={field.state.value}
                                />
                                {field.state.meta.errors[0] ? (
                                  <p className="text-destructive text-sm">
                                    {getMcpFormErrorMessage(
                                      field.state.meta.errors[0]
                                    )}
                                  </p>
                                ) : null}
                              </Field>
                            )}
                          </form.Field>
                          <Button
                            aria-label="Remove authentication header"
                            onClick={() => {
                              headersField.removeValue(index);
                              setHeaderRowIds((ids) =>
                                ids.filter(
                                  (_id, rowIndex) => rowIndex !== index
                                )
                              );
                              invalidateTestResult();
                            }}
                            size="icon-sm"
                            type="button"
                            variant="outline"
                          >
                            <HugeiconsIcon
                              className="size-4"
                              icon={MinusSignIcon}
                            />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>
            </TabsContent>
            <TabsContent value="oauth">
              <div className="bg-muted/40 rounded-lg border p-3 text-sm">
                <p className="font-medium">Authorize securely</p>
                <p className="text-muted-foreground mt-1">
                  You will be redirected to the server to approve access. Notra
                  stores an encrypted refresh token and renews access
                  automatically.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </Field>
      )}
    </form.Field>
  );
}
