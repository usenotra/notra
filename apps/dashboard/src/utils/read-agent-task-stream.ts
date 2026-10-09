import { agentStreamEventSchema } from "@notra/schemas/dashboard/agent";

import type { AgentTaskStreamResult } from "@/types/agent";

export async function readAgentTaskStream(
  response: Response,
  signal: AbortSignal,
  deadline: number
): Promise<AgentTaskStreamResult> {
  if (!(response.ok && response.body)) {
    return null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let output: unknown;
  let completed = false;
  let failed: string | null = null;
  const cancel = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  const checkDeadline = () => {
    signal.throwIfAborted();
    if (Date.now() >= deadline) {
      throw new DOMException("Agent task deadline exceeded", "TimeoutError");
    }
  };
  const consumeLine = (line: string) => {
    checkDeadline();
    let event;
    try {
      event = agentStreamEventSchema.parse(JSON.parse(line.trim()));
    } catch {
      return;
    }
    if (event.type === "result.completed") {
      output = event.data?.output ?? event.data?.result ?? event.data;
    }
    if (event.type === "session.completed") {
      completed = true;
    }
    if (event.type === "session.failed") {
      failed =
        typeof event.data?.message === "string"
          ? event.data.message
          : "unknown failure";
    }
  };

  signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      checkDeadline();
      const { value, done } = await reader.read();
      checkDeadline();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      let start = 0;
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        consumeLine(buffer.slice(start, newline));
        start = newline + 1;
        newline = buffer.indexOf("\n", start);
      }
      buffer = buffer.slice(start);
      if (done) {
        if (buffer.trim()) {
          consumeLine(buffer);
        }
        break;
      }
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }

  // Keep the existing EOF/failure precedence, including malformed event handling.
  if (failed) {
    return { failed };
  }
  return completed ? { output } : null;
}
