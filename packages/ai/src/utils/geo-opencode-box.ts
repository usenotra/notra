import {
  GEO_OPENCODE_BOX_API_BASE_URL,
  GEO_OPENCODE_BOX_DELETE_ATTEMPTS,
  GEO_OPENCODE_BOX_MANAGEMENT_TIMEOUT_MS,
  GEO_OPENCODE_BOX_MODEL_ID,
  GEO_OPENCODE_BOX_NAME_PREFIX,
  GEO_OPENCODE_BOX_POLL_INTERVAL_MS,
  GEO_OPENCODE_BOX_RECOVERY_ATTEMPTS,
  GEO_OPENCODE_BOX_RECOVERY_TIMEOUT_MS,
  GEO_OPENCODE_BOX_RETRY_DELAY_MS,
  GEO_OPENCODE_MILLISECONDS_PER_SECOND,
  GEO_OPENCODE_MILLISECOND_TIMESTAMP_MINIMUM,
  GEO_OPENCODE_STALE_BOX_AGE_MS,
} from "@notra/ai/constants/geo-opencode";
import type {
  GeoOpenCodeBoxRetryOptions,
  GeoOpenCodeStaleBoxCandidate,
} from "@notra/ai/types/geo-opencode";
import { Agent, Box, BoxError, type BoxData } from "@upstash/box";

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isNotFoundBoxError(error: unknown) {
  return error instanceof BoxError && error.statusCode === 404;
}

function isRetryableBoxError(error: unknown) {
  if (error instanceof BoxError && error.statusCode !== undefined) {
    return (
      error.statusCode === 408 ||
      error.statusCode === 429 ||
      error.statusCode >= 500
    );
  }
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.message.includes("fetch failed") ||
    error.message.includes("ECONNRESET") ||
    error.message.includes("UND_ERR")
  );
}

function abortReason(signal: AbortSignal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error("OpenCode box operation was cancelled");
}

function geoOpenCodeBoxOperation(timeoutMs: number) {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => {
    timeoutController.abort(
      new DOMException("The box operation timed out", "TimeoutError")
    );
  }, timeoutMs);
  return {
    signal: timeoutController.signal,
    dispose: () => clearTimeout(timeout),
  };
}

function waitForGeoOpenCodeBoxDelay(signal: AbortSignal, milliseconds: number) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortReason(signal));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function geoOpenCodeBoxErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string") {
      return payload.error;
    }
  } catch {
    // Fall through to the status-only error used by the SDK.
  }
  return `Request failed with status ${response.status}`;
}

async function getGeoOpenCodeBoxByName(
  name: string,
  apiKey: string,
  signal: AbortSignal
) {
  const response = await fetch(
    `${GEO_OPENCODE_BOX_API_BASE_URL}/v2/box/${encodeURIComponent(name)}`,
    {
      headers: { "X-Box-Api-Key": apiKey },
      signal,
    }
  );
  if (!response.ok) {
    throw new BoxError(
      await geoOpenCodeBoxErrorMessage(response),
      response.status
    );
  }
  return (await response.json()) as BoxData;
}

async function listGeoOpenCodeBoxes(apiKey: string, signal: AbortSignal) {
  const response = await fetch(`${GEO_OPENCODE_BOX_API_BASE_URL}/v2/box`, {
    headers: { "X-Box-Api-Key": apiKey },
    signal,
  });
  if (!response.ok) {
    throw new BoxError(
      await geoOpenCodeBoxErrorMessage(response),
      response.status
    );
  }
  return (await response.json()) as BoxData[];
}

async function requestGeoOpenCodeBoxDeletion(
  boxId: string,
  apiKey: string,
  signal: AbortSignal
) {
  const response = await fetch(`${GEO_OPENCODE_BOX_API_BASE_URL}/v2/box`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Box-Api-Key": apiKey,
    },
    body: JSON.stringify({ ids: [boxId] }),
    signal,
  });
  if (!response.ok) {
    throw new BoxError(
      await geoOpenCodeBoxErrorMessage(response),
      response.status
    );
  }
}

export async function createGeoOpenCodeBox(
  name: string,
  apiKey: string,
  modelApiKey: string,
  signal: AbortSignal,
  timeoutMs: number,
  model = GEO_OPENCODE_BOX_MODEL_ID,
  agent: Agent = Agent.OpenCode
) {
  const headers = { "X-Box-Api-Key": apiKey };
  let boxId: string | undefined;
  let creationMayHaveSucceeded = true;
  try {
    const response = await fetch(`${GEO_OPENCODE_BOX_API_BASE_URL}/v2/box`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        runtime: "node",
        agent,
        model,
        agent_api_key: modelApiKey,
      }),
      signal,
    });
    if (!response.ok) {
      creationMayHaveSucceeded = false;
      throw new BoxError(
        await geoOpenCodeBoxErrorMessage(response),
        response.status
      );
    }

    let data = (await response.json()) as BoxData;
    if (typeof data.id !== "string") {
      throw new BoxError("Box creation returned no box ID");
    }
    boxId = data.id;
    while (data.status === "creating") {
      await waitForGeoOpenCodeBoxDelay(
        signal,
        GEO_OPENCODE_BOX_POLL_INTERVAL_MS
      );
      const pollResponse = await fetch(
        `${GEO_OPENCODE_BOX_API_BASE_URL}/v2/box/${boxId}`,
        { headers, signal }
      );
      if (pollResponse.ok) {
        data = (await pollResponse.json()) as BoxData;
      }
    }
    if (data.status === "error") {
      throw new BoxError("Box creation failed");
    }

    return new Box(data, {
      baseUrl: GEO_OPENCODE_BOX_API_BASE_URL,
      headers,
      timeout: timeoutMs,
      debug: false,
      isAgentConfigured: Boolean(data.agent),
    });
  } catch (createError) {
    if (!(boxId || creationMayHaveSucceeded)) {
      throw createError;
    }
    try {
      if (boxId) {
        await deleteGeoOpenCodeBox(boxId, apiKey);
      } else {
        await recoverAndDeleteGeoOpenCodeBox(name, apiKey);
      }
    } catch (cleanupError) {
      throw new AggregateError(
        [createError, cleanupError],
        "OpenCode box creation and recovery cleanup failed"
      );
    }
    throw createError;
  }
}

export function createGeoOpenCodeBoxName() {
  return `${GEO_OPENCODE_BOX_NAME_PREFIX}${crypto.randomUUID()}`;
}

export async function withGeoOpenCodeBoxRetry<T>(
  callback: () => Promise<T>,
  options: GeoOpenCodeBoxRetryOptions = {}
) {
  const attempts = options.attempts ?? GEO_OPENCODE_BOX_DELETE_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? GEO_OPENCODE_BOX_RETRY_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (options.signal?.aborted) {
      throw abortReason(options.signal);
    }
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      const retryable =
        isRetryableBoxError(error) ||
        (options.retryNotFound === true && isNotFoundBoxError(error));
      if (attempt === attempts || !retryable) {
        break;
      }
      const delayMs = retryDelayMs * attempt;
      if (options.signal) {
        await waitForGeoOpenCodeBoxDelay(options.signal, delayMs);
      } else {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

export async function deleteGeoOpenCodeBox(boxId: string, apiKey: string) {
  const operation = geoOpenCodeBoxOperation(
    GEO_OPENCODE_BOX_MANAGEMENT_TIMEOUT_MS
  );
  try {
    await withGeoOpenCodeBoxRetry(
      () => requestGeoOpenCodeBoxDeletion(boxId, apiKey, operation.signal),
      { signal: operation.signal }
    );
  } catch (error) {
    if (!isNotFoundBoxError(error)) {
      throw error;
    }
  } finally {
    operation.dispose();
  }
}

export async function recoverAndDeleteGeoOpenCodeBox(
  name: string,
  apiKey: string
) {
  const operation = geoOpenCodeBoxOperation(
    GEO_OPENCODE_BOX_RECOVERY_TIMEOUT_MS
  );
  let box: BoxData;
  try {
    box = await withGeoOpenCodeBoxRetry(
      () => getGeoOpenCodeBoxByName(name, apiKey, operation.signal),
      {
        attempts: GEO_OPENCODE_BOX_RECOVERY_ATTEMPTS,
        retryNotFound: true,
        signal: operation.signal,
      }
    );
  } catch (error) {
    if (isNotFoundBoxError(error)) {
      return false;
    }
    throw error;
  } finally {
    operation.dispose();
  }
  await deleteGeoOpenCodeBox(box.id, apiKey);
  return true;
}

function timestampMilliseconds(timestamp: number) {
  return timestamp < GEO_OPENCODE_MILLISECOND_TIMESTAMP_MINIMUM
    ? timestamp * GEO_OPENCODE_MILLISECONDS_PER_SECOND
    : timestamp;
}

export function isStaleGeoOpenCodeBox(
  box: GeoOpenCodeStaleBoxCandidate,
  now = Date.now()
) {
  return (
    box.name?.startsWith(GEO_OPENCODE_BOX_NAME_PREFIX) === true &&
    now - timestampMilliseconds(box.created_at) >= GEO_OPENCODE_STALE_BOX_AGE_MS
  );
}

export async function deleteStaleGeoOpenCodeBoxIds(
  boxIds: readonly string[],
  deleteBox: (boxId: string) => Promise<void>
) {
  const errors: unknown[] = [];
  let deleted = 0;
  for (const boxId of boxIds) {
    try {
      await deleteBox(boxId);
      deleted += 1;
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, "Failed to delete stale OpenCode boxes");
  }
  return deleted;
}

export async function deleteStaleGeoOpenCodeBoxes() {
  const apiKey = process.env.UPSTASH_BOX_API_KEY?.trim();
  if (!apiKey) {
    return 0;
  }
  const operation = geoOpenCodeBoxOperation(
    GEO_OPENCODE_BOX_MANAGEMENT_TIMEOUT_MS
  );
  let boxes: BoxData[];
  try {
    boxes = await withGeoOpenCodeBoxRetry(
      () => listGeoOpenCodeBoxes(apiKey, operation.signal),
      { signal: operation.signal }
    );
  } finally {
    operation.dispose();
  }
  const staleBoxes = boxes.filter((box) => isStaleGeoOpenCodeBox(box));
  return deleteStaleGeoOpenCodeBoxIds(
    staleBoxes.map((box) => box.id),
    (boxId) => deleteGeoOpenCodeBox(boxId, apiKey)
  );
}
