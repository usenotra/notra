import {
  SMOKE_REQUEST_ATTEMPTS,
  SMOKE_REQUEST_TIMEOUT_MS,
} from "../constants/smoke";

export async function smokeRequest<T>(
  baseUrl: string,
  path: string,
  deadline: number,
  init?: RequestInit
): Promise<T> {
  for (let attempt = 0; attempt < SMOKE_REQUEST_ATTEMPTS; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error("Runner request deadline exceeded.");
    }
    let response: Response | undefined;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        redirect: "manual",
        signal: AbortSignal.timeout(
          Math.min(SMOKE_REQUEST_TIMEOUT_MS, remainingMs)
        ),
      });
    } catch {
      // POST /scans carries the same idempotency key on every attempt.
    }
    if (response && response.status !== 503) {
      if (!response.ok) {
        throw new Error(`Runner request failed with HTTP ${response.status}.`);
      }
      try {
        return (await response.json()) as T;
      } catch {
        throw new Error("Runner returned invalid JSON.");
      }
    }
    if (attempt === SMOKE_REQUEST_ATTEMPTS - 1) {
      throw new Error(
        response
          ? "Runner remains unavailable (HTTP 503)."
          : "Runner network request failed."
      );
    }
    await Bun.sleep(
      Math.min(250 * (attempt + 1), Math.max(0, deadline - Date.now()))
    );
  }
  throw new Error("Runner request failed.");
}
