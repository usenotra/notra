import { useMemo, useState, useSyncExternalStore } from "react";

import {
  OFFERING_CHECK_API_PATH,
  OFFERING_TURNSTILE_HEADER,
} from "@/constants/offering-check";
import { offeringStreamEventSchema } from "@/schemas/offering-check";
import type {
  OfferingCheckInput,
  OfferingCheckResult,
  OfferingFailureStatus,
  OfferingLiveState,
  OfferingQuestionKind,
  OfferingStreamAction,
  OfferingStreamEvent,
  OfferingThread,
} from "@/types/offering-check";
import { buildOfferingQuestions } from "@/utils/offering-questions";
import { failureStatusFor } from "@/utils/offering-report";

function initialState(input: OfferingCheckInput): OfferingLiveState {
  return {
    status: "checking",
    threads: buildOfferingQuestions(input).map((question) => ({
      question,
      answer: "",
      reasoning: "",
      seconds: null,
      queries: [],
      domains: [],
      result: null,
    })),
    result: null,
  };
}

function settledState(result: OfferingCheckResult): OfferingLiveState {
  return {
    status: "done",
    threads: result.answers.map((answer) => ({
      question: { kind: answer.kind, text: answer.question },
      answer: answer.answer,
      reasoning: answer.reasoning,
      seconds: answer.seconds,
      queries: answer.queries,
      domains: answer.sources.map((source) => source.domain),
      result: answer,
    })),
    result,
  };
}

function updateThread(
  state: OfferingLiveState,
  kind: OfferingQuestionKind,
  update: (thread: OfferingThread) => OfferingThread
): OfferingLiveState {
  return {
    ...state,
    threads: state.threads.map((thread) =>
      thread.question.kind === kind ? update(thread) : thread
    ),
  };
}

function reduce(
  state: OfferingLiveState,
  action: OfferingStreamAction
): OfferingLiveState {
  if (action.type === "failed") {
    return { ...state, status: action.status };
  }
  if (action.type === "verify") {
    return { ...state, status: "verify" };
  }
  if (action.type === "restart") {
    return { ...state, status: "checking" };
  }
  const { event } = action;
  switch (event.type) {
    case "delta":
      return updateThread(state, event.kind, (thread) => ({
        ...thread,
        answer: thread.answer + event.text,
      }));
    case "reasoning":
      return updateThread(state, event.kind, (thread) => ({
        ...thread,
        reasoning: thread.reasoning + event.text,
      }));
    case "search":
      return updateThread(state, event.kind, (thread) => ({
        ...thread,
        queries: [...new Set([...thread.queries, ...event.queries])],
        domains: [...new Set([...thread.domains, ...event.domains])],
      }));
    case "answered":
      return updateThread(state, event.kind, (thread) => ({
        ...thread,
        seconds: event.seconds,
      }));
    case "result":
      return settledState(event.result);
    default:
      return { ...state, status: "error" };
  }
}

async function readEvents(
  response: Response,
  onEvent: (event: OfferingStreamEvent) => void
) {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const parsed = offeringStreamEventSchema.safeParse(
        line.trim().length > 0 ? JSON.parse(line) : null
      );
      if (parsed.success) {
        onEvent(parsed.data);
      }
    }
    if (done) {
      return;
    }
  }
}

async function needsVerification(response: Response): Promise<boolean> {
  if (response.status !== 403) {
    return false;
  }
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  return (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    body.code === "verification"
  );
}

async function streamOfferingCheck(
  input: OfferingCheckInput,
  turnstileToken: string,
  signal: AbortSignal,
  update: (action: OfferingStreamAction) => void,
  canAskAgain: boolean
) {
  const response = await fetch(OFFERING_CHECK_API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(turnstileToken
        ? { [OFFERING_TURNSTILE_HEADER]: turnstileToken }
        : {}),
    },
    body: JSON.stringify(input),
    signal,
  }).catch(() => null);
  if (signal.aborted) {
    return;
  }
  const onFailure = (status: OfferingFailureStatus) =>
    update({ type: "failed", status });
  if (response && (await needsVerification(response))) {
    // A fresh token that still fails means verification is broken, not that
    // the visitor needs another try; asking again would loop forever.
    update(
      canAskAgain ? { type: "verify" } : { type: "failed", status: "error" }
    );
    return;
  }
  if (!response?.ok) {
    onFailure(await failureStatusFor(response));
    return;
  }

  let finished = false;
  await readEvents(response, (event) => {
    finished = finished || event.type === "result" || event.type === "error";
    if (!signal.aborted) {
      update({ type: "event", event });
    }
  }).catch(() => null);
  if (!(finished || signal.aborted)) {
    onFailure("error");
  }
}

/**
 * Starts the check once someone watches it. A missing or spent Turnstile
 * token makes the server ask for verification; `verify` reruns the check
 * with a fresh token from the report page.
 */
function createOfferingStreamStore(
  input: OfferingCheckInput,
  turnstileToken: string
) {
  let state = initialState(input);
  let start: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const update = (action: OfferingStreamAction) => {
    state = reduce(state, action);
    for (const listener of listeners) {
      listener();
    }
  };
  const run = (token: string, canAskAgain: boolean) => {
    controller?.abort();
    controller = new AbortController();
    void streamOfferingCheck(
      input,
      token,
      controller.signal,
      update,
      canAskAgain
    );
  };

  return {
    getSnapshot: () => state,
    verify: (token: string) => {
      update({ type: "restart" });
      run(token, false);
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (!(start || controller)) {
        start = setTimeout(() => {
          start = null;
          run(turnstileToken, true);
        }, 0);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          if (start) {
            clearTimeout(start);
            start = null;
          }
          controller?.abort();
          controller = null;
        }
      };
    },
  };
}

export function useOfferingStream(
  input: OfferingCheckInput,
  turnstileToken: string
): { state: OfferingLiveState; verify: (token: string) => void } {
  const { domain, feature, problem, webSearch } = input;
  // The token from the form is only used for the first request.
  const [initialToken] = useState(turnstileToken);
  const store = useMemo(
    () =>
      createOfferingStreamStore(
        { domain, feature, problem, webSearch },
        initialToken
      ),
    [domain, feature, problem, webSearch, initialToken]
  );
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return { state, verify: store.verify };
}
