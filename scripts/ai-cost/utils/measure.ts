import { createHash } from "node:crypto";

import type { ProviderCall } from "../types/benchmark";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function jsonBytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value) ?? "", "utf8");
}

export function sharedPrefixBytes(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  let index = 0;
  while (index < a.length && index < b.length && a[index] === b[index]) {
    index++;
  }
  return index;
}

export function measureCall(call: ProviderCall) {
  const system = call.prompt.filter((message) => message.role === "system");
  return {
    promptJsonBytes: jsonBytes(call.prompt),
    systemJsonBytes: jsonBytes(system),
    systemSha256: sha256(JSON.stringify(system)),
    responseFormatJsonBytes: jsonBytes(call.responseFormat),
    toolSchemaJsonBytes: jsonBytes(call.tools),
    providerOptions: call.providerOptions ?? {},
  };
}
