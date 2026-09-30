import { DEMO_CONSOLE_HEADER } from "@notra/utils/constants/demo";

import type { DemoConsoleResponse } from "@/types/demo";

interface DemoConsoleRequest {
  baseUrl: string;
  apiKey: string;
  method: string;
  path: string;
  body: string | null;
}

export function resolveDemoConsolePath(
  path: string,
  projectId: string | null
): string {
  return projectId ? path.replaceAll("{projectId}", projectId) : path;
}

function prettyBody(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Sends a real request to demo-api with the sandbox key. */
export async function sendDemoConsoleRequest(
  request: DemoConsoleRequest
): Promise<DemoConsoleResponse> {
  const startedAt = performance.now();
  try {
    // react-doctor-disable-next-line react-doctor/no-fetch-response-used-without-status-check -- the console shows error payloads as-is, next to the status
    const response = await fetch(`${request.baseUrl}${request.path}`, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        [DEMO_CONSOLE_HEADER]: "1",
        ...(request.body ? { "Content-Type": "application/json" } : {}),
      },
      body: request.body ?? undefined,
    });
    return {
      status: response.status,
      durationMs: performance.now() - startedAt,
      body: prettyBody(await response.text()),
    };
  } catch (error) {
    return {
      status: 0,
      durationMs: performance.now() - startedAt,
      body: error instanceof Error ? error.message : String(error),
    };
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function buildDemoCurl(request: DemoConsoleRequest): string {
  const lines = [
    `curl -X ${request.method} ${shellQuote(`${request.baseUrl}${request.path}`)}`,
    `  -H ${shellQuote(`Authorization: Bearer ${request.apiKey}`)}`,
  ];
  if (request.body) {
    lines.push(
      `  -H 'Content-Type: application/json'`,
      `  -d ${shellQuote(request.body)}`
    );
  }
  return lines.join(" \\\n");
}
