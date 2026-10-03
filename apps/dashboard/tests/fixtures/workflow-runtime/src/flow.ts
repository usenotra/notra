import { createHook } from "workflow";

export async function durableProbe(token: string, createdAt: Date) {
  "use workflow";

  const prepared = await prepareValue(createdAt);
  using hook = createHook<string>({ token });
  const approval = await hook;
  return await finishValue(prepared, approval);
}

async function prepareValue(createdAt: Date) {
  "use step";

  const { appendFile } = await import("node:fs/promises");
  await appendFile("step-executions.txt", "prepare\n");
  return new Map([["createdAt", createdAt]]);
}

async function finishValue(prepared: Map<string, Date>, approval: string) {
  "use step";

  const { appendFile } = await import("node:fs/promises");
  await appendFile("step-executions.txt", "finish\n");
  return {
    approved: approval,
    createdAt: prepared.get("createdAt")?.toISOString(),
    restoredMap: prepared instanceof Map,
    restoredDate: prepared.get("createdAt") instanceof Date,
  };
}
