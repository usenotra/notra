import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Run, RunResult, SDKAgent } from "@cursor/sdk";
import { requireApiKey } from "@notra/utils/require-api-key";
import { Effect } from "effect";

import {
  GEO_ANSWER_SYSTEM_PROMPT,
  GEO_CURSOR_API_KEY_ENV,
  GEO_CURSOR_MODEL_ID,
} from "../constants/geo";

const CURSOR_TEMP_DIR_PREFIX = "geo-cursor-";

async function cancelRun(run: Run): Promise<void> {
  try {
    await run.cancel();
  } catch {
    // The run may already be terminal; nothing left to cancel.
  }
}

function readRunText(result: RunResult): string {
  if (result.status !== "finished") {
    const detail = result.error?.message ?? "no error detail";
    throw new Error(`Cursor run ${result.status}: ${detail}`);
  }
  const text = result.result?.trim() ?? "";
  if (text.length === 0) {
    throw new Error("Cursor run finished without an answer");
  }
  return text;
}

async function disposeAgent(agent: SDKAgent): Promise<void> {
  try {
    await agent[Symbol.asyncDispose]();
  } catch {
    // Disposal failures must never mask the real run error.
  }
}

/**
 * Ask Cursor's Composer model a GEO scan prompt.
 *
 * Cursor is not reachable through any AI gateway, so the agent runs locally
 * against a throwaway working directory that is removed afterwards.
 *
 * The agent is created with `tools: []` — no built-in tools at all, so the
 * model can only reply with text. That is the security boundary for running an
 * untrusted scan prompt on our own host: never add tools here, and never grant
 * shell, file or web access to this agent.
 */
export function askCursorEngine(promptText: string) {
  let cwdPromise: Promise<string> | undefined;
  let agentPromise: Promise<SDKAgent> | undefined;
  let runPromise: Promise<Run> | undefined;
  let completed = false;

  return Effect.tryPromise(async (signal) => {
    const apiKey = requireApiKey(GEO_CURSOR_API_KEY_ENV);
    cwdPromise = mkdtemp(join(tmpdir(), CURSOR_TEMP_DIR_PREFIX));
    const cwd = await cwdPromise;
    if (signal.aborted) {
      throw new Error("Cursor run aborted before agent creation");
    }

    // Loaded per run: importing the SDK costs ~0.7 s of startup CPU, which
    // every server cold start paid although only Cursor scans use it.
    const { Agent, JsonlLocalAgentStore } = await import("@cursor/sdk");
    agentPromise = Agent.create({
      apiKey,
      model: { id: GEO_CURSOR_MODEL_ID },
      tools: [],
      local: { cwd, store: new JsonlLocalAgentStore(cwd) },
    });
    const agent = await agentPromise;
    if (signal.aborted) {
      throw new Error("Cursor run aborted before it was sent");
    }

    // The SDK has no separate system prompt, so it is prefixed to the message.
    runPromise = agent.send(`${GEO_ANSWER_SYSTEM_PROMPT}\n\n${promptText}`);
    const run = await runPromise;
    const result = await run.wait();
    completed = true;
    return readRunText(result);
  }).pipe(
    Effect.ensuring(
      Effect.promise(async () => {
        const run = await runPromise?.catch(() => undefined);
        if (run && !completed) {
          await cancelRun(run);
        }

        const agent = await agentPromise?.catch(() => undefined);
        if (agent) {
          await disposeAgent(agent);
        }

        const cwd = await cwdPromise?.catch(() => undefined);
        if (cwd) {
          // Best effort: cleanup failures must not mask the run error.
          await rm(cwd, { recursive: true, force: true }).catch(
            () => undefined
          );
        }
      })
    )
  );
}
