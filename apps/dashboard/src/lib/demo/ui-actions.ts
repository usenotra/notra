import { extractDemoAffected } from "@notra/ai/utils/demo-affected";
import { recordDemoRequest } from "@notra/ai/utils/demo-request-log";
import { isDemoMode } from "@notra/utils/demo-mode";
import { after } from "next/server";

import { DEMO_UI_ACTIONS } from "@/constants/demo-ui-actions";

const PLACEHOLDER = /\{(\w+)\}/g;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function fillPath(template: string, input: Record<string, unknown>): string {
  return template.replace(PLACEHOLDER, (match, key: string) => {
    const value = input[key] ?? (key.endsWith("Id") ? input.id : undefined);
    return typeof value === "string" || typeof value === "number"
      ? encodeURIComponent(String(value))
      : match;
  });
}

function stringify(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Public demo: records a successful dashboard mutation in the visitor's
 * request feed, as its public API equivalent when one exists, so every click
 * doubles as an API example. Runs after the response is sent.
 */
export function logDemoUiAction(input: {
  path: readonly string[];
  input: unknown;
  output: unknown;
  durationMs: number;
}) {
  if (!isDemoMode()) {
    return;
  }
  const action = DEMO_UI_ACTIONS[input.path.join(".")];
  if (!action) {
    return;
  }
  const args = isRecord(input.input) ? input.input : {};
  const organizationId = args.organizationId;
  if (typeof organizationId !== "string") {
    return;
  }

  const method = action.path ? action.method : "RPC";
  const path = action.path
    ? fillPath(action.path, args)
    : `/rpc/${input.path.join("/")}`;
  const { organizationId: _organizationId, ...body } = args;
  const responseBody = stringify(input.output);

  after(() =>
    recordDemoRequest({
      organizationId,
      source: "ui",
      method,
      path,
      status: 200,
      durationMs: input.durationMs,
      requestBody: stringify(body),
      responseBody,
      affected: extractDemoAffected(path, responseBody),
    })
  );
}
