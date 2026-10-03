import { defineHandler } from "nitro";
import { getRun, resumeHook, start } from "workflow/api";
import { getWorld } from "workflow/runtime";

import { durableProbe } from "./flow";

export default defineHandler(async (event) => {
  const url = new URL(event.req.url);
  const action = url.searchParams.get("action");
  const token = url.searchParams.get("token");
  const runId = url.searchParams.get("runId");
  if (
    ((action === "start" || action === "resume") && !token) ||
    (action === "status" && !runId)
  ) {
    return new Response("Missing workflow identifier", { status: 400 });
  }
  if (action === "start" && token) {
    const run = await start(durableProbe, [
      token,
      new Date("2026-10-02T00:00:00.000Z"),
    ]);
    return Response.json({ runId: run.runId });
  }
  if (action === "resume" && token) {
    const hook = await resumeHook(token, "approved");
    return Response.json({ runId: hook.runId });
  }
  if (action === "status" && runId) {
    const run = getRun(runId);
    const status = await run.status;
    const hooks = await getWorld().hooks.list({ runId });
    const steps = await getWorld().steps.list({ runId });
    return Response.json({
      status,
      hooks: hooks.data.length,
      steps: steps.data.map((step) => ({ status: step.status })),
      result: status === "completed" ? await run.returnValue : null,
    });
  }
  return Response.json({ ready: true });
});
