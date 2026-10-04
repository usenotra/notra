import { createHash, randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

import { render } from "react-email";

import {
  BREW_API_BASE_URL,
  BREW_CONTACTS_BATCH_SIZE,
  BREW_CONTACTS_PAGE_SIZE,
  BREW_EMAIL_TRIGGERS,
  BREW_IDEMPOTENCY_HASH_LENGTH,
  BREW_MAX_RETRIES,
  BREW_REQUEST_TIMEOUT_MS,
  BREW_RETRY_BASE_DELAY_MS,
  BREW_RETRY_JITTER_MS,
  BREW_RETRY_MAX_DELAY_MS,
  HTTP_NOT_FOUND,
  HTTP_TOO_MANY_REQUESTS,
} from "../constants/brew";
import type {
  BrewContact,
  BrewContactInput,
  BrewContactsPage,
  BrewContactsBatchResponse,
  BrewEmailError,
  BrewErrorBody,
  BrewRequestInit,
  BrewResponse,
  BrewTriggerFireResponse,
  EmailResult,
  SendBrewEmailOptions,
} from "../types/brew";
import { logDevEmail } from "./dev";

const BODY_REGEX = /<body([^>]*)>([\s\S]*)<\/body>/i;

export function isBrewConfigured(): boolean {
  return Boolean(process.env.BREW_API_KEY);
}

async function brewFetch<T>(
  apiKey: string,
  path: string,
  { method, body, idempotencyKey }: BrewRequestInit
): Promise<BrewResponse<T>> {
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` };
  // Organization-scoped keys must name the brand; brand-scoped keys ignore it.
  if (process.env.BREW_BRAND_ID) {
    headers["X-Brand-Id"] = process.env.BREW_BRAND_ID;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${BREW_API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(BREW_REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    return {
      ok: false,
      error: {
        name: "network_error",
        message: cause instanceof Error ? cause.message : String(cause),
        retryable: true,
      },
    };
  }

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const { error } = (json ?? {}) as BrewErrorBody;
    const code = error?.code ?? `http_${response.status}`;
    const retryAfterSeconds = Number(response.headers.get("Retry-After"));

    return {
      ok: false,
      error: {
        name: code,
        message: error?.message ?? `Brew responded with ${response.status}`,
        status: response.status,
        retryable:
          response.status === HTTP_TOO_MANY_REQUESTS ||
          response.status >= 500 ||
          code === "IDEMPOTENCY_IN_PROGRESS",
        retryAfterMs:
          retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : undefined,
      },
    };
  }

  return { ok: true, data: json as T };
}

/**
 * Calls the Brew API, retrying rate limits, outages and network errors with
 * exponential backoff. A POST without its own idempotency key gets one for
 * all its attempts, so a retry after a lost response replays instead of
 * creating a second resource.
 */
export async function brewRequest<T>(
  path: string,
  requestInit: BrewRequestInit
): Promise<BrewResponse<T>> {
  const init: BrewRequestInit =
    requestInit.method === "POST" && !requestInit.idempotencyKey
      ? { ...requestInit, idempotencyKey: `notra:${randomUUID()}` }
      : requestInit;
  const apiKey = process.env.BREW_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: {
        name: "brew_not_configured",
        message: "BREW_API_KEY is not set",
        retryable: false,
      },
    };
  }

  for (let attempt = 0; ; attempt += 1) {
    const result = await brewFetch<T>(apiKey, path, init);
    // Waiting out a longer Retry-After would hold the request open for
    // minutes; the caller's own retry (workflow step, nightly cron) is better.
    const retryAfterMs = result.ok ? 0 : (result.error.retryAfterMs ?? 0);
    if (
      result.ok ||
      !result.error.retryable ||
      attempt >= BREW_MAX_RETRIES ||
      retryAfterMs > BREW_RETRY_MAX_DELAY_MS
    ) {
      return result;
    }

    const backoffMs =
      BREW_RETRY_BASE_DELAY_MS * 2 ** attempt +
      Math.random() * BREW_RETRY_JITTER_MS;
    await sleep(
      Math.max(Math.min(backoffMs, BREW_RETRY_MAX_DELAY_MS), retryAfterMs)
    );
  }
}

/**
 * The Brew design wraps the HTML in its own document, so only hand over the
 * body. Every template is inline-styled, so the head carries nothing to keep.
 */
function toBodyHtml(html: string): string {
  const match = BODY_REGEX.exec(html);
  if (!match) {
    return html;
  }

  const [, attributes, content] = match;
  return `<div${attributes}>${content}</div>`;
}

/** Brew caps keys at 100 chars, and hashing keeps PII out of the header. */
function toIdempotencyKey(
  category: SendBrewEmailOptions["category"],
  key: string
): string {
  const hash = createHash("sha256")
    .update(key)
    .digest("hex")
    .slice(0, BREW_IDEMPOTENCY_HASH_LENGTH);
  return `notra:${category}:${hash}`;
}

/**
 * Sends one email through the category's Brew trigger. Without a Brew key the
 * email is printed to the console outside production.
 */
export async function sendBrewEmail(
  options: SendBrewEmailOptions
): Promise<EmailResult> {
  if (!isBrewConfigured() && process.env.NODE_ENV !== "production") {
    return logDevEmail(options);
  }

  const { category, to, subject, react, idempotencyKey } = options;
  const html = toBodyHtml(await render(react));
  const result = await brewRequest<BrewTriggerFireResponse>(
    `/automations/triggers/${BREW_EMAIL_TRIGGERS[category]}/fire`,
    {
      method: "POST",
      body: { payload: { email: to, message: { subject, html } } },
      idempotencyKey: toIdempotencyKey(category, idempotencyKey),
    }
  );

  if (!result.ok) {
    return { data: null, error: result.error };
  }

  // A 2xx means Brew accepted the fire, even when the body is unreadable
  // (null). Reporting that as a failure would make callers send twice.
  const fired: Partial<BrewTriggerFireResponse> | null = result.data;
  const notStartedReason = fired?.notStarted?.[0]?.reason;

  if (fired?.automationRunIds?.length === 0 && notStartedReason) {
    return {
      data: null,
      error: {
        name: "no_run_started",
        message: `Brew did not start a ${category} send: ${notStartedReason}`,
        retryable: false,
      },
    };
  }

  // Like a provider suppression list: accepted, nothing delivered, no retry.
  if ((fired?.counts?.skipped ?? 0) > 0) {
    console.warn(`[Brew] ${category} email skipped, recipient is suppressed`);
  }

  return {
    data: { id: fired?.triggerInstanceId ?? "unknown" },
    error: null,
  };
}

/**
 * Upserts contacts. A no-op without a Brew key. One contact uses the single
 * write (100/min), more go in batches (10/min), per Brew's rate-limit policies.
 */
export async function upsertBrewContacts(
  contacts: BrewContactInput[]
): Promise<{ failed: number; errors: BrewEmailError[] }> {
  let failed = 0;
  const errors: BrewEmailError[] = [];
  if (!isBrewConfigured()) {
    return { failed, errors };
  }

  if (contacts.length === 1) {
    const result = await brewRequest<unknown>("/contacts", {
      method: "POST",
      body: contacts[0],
    });
    return result.ok
      ? { failed, errors }
      : { failed: 1, errors: [result.error] };
  }

  for (
    let start = 0;
    start < contacts.length;
    start += BREW_CONTACTS_BATCH_SIZE
  ) {
    const batch = contacts.slice(start, start + BREW_CONTACTS_BATCH_SIZE);
    const result = await brewRequest<BrewContactsBatchResponse>("/contacts", {
      method: "POST",
      body: { contacts: batch },
    });

    if (!result.ok) {
      failed += batch.length;
      errors.push(result.error);
      continue;
    }

    const response: BrewContactsBatchResponse | null = result.data;
    for (const rowError of response?.errors ?? []) {
      failed += 1;
      errors.push({
        name: rowError.code ?? "contact_upsert_failed",
        message: `${rowError.email ?? "unknown"}: ${rowError.message ?? ""}`,
        retryable: false,
      });
    }
  }

  return { failed, errors };
}

/** Lists every Brew contact, page by page. */
export async function listBrewContacts(): Promise<BrewResponse<BrewContact[]>> {
  const contacts: BrewContact[] = [];
  let cursor: string | null = null;

  do {
    const query: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const result: BrewResponse<BrewContactsPage> =
      await brewRequest<BrewContactsPage>(
        `/contacts?limit=${BREW_CONTACTS_PAGE_SIZE}${query}`,
        { method: "GET" }
      );
    if (!result.ok) {
      return result;
    }
    contacts.push(...result.data.data);
    cursor = result.data.pagination.cursor;
  } while (cursor);

  return { ok: true, data: contacts };
}

/**
 * Deletes a contact. A no-op without a Brew key or when Brew has no such
 * contact (never synced); throws when Brew refuses.
 */
export async function deleteBrewContact(email: string): Promise<void> {
  if (!isBrewConfigured()) {
    return;
  }

  const result = await brewRequest<unknown>(
    `/contacts/${encodeURIComponent(email)}`,
    { method: "DELETE" }
  );

  if (!result.ok && result.error.status !== HTTP_NOT_FOUND) {
    throw new Error(
      `Failed to delete Brew contact: ${result.error.name} ${result.error.message}`
    );
  }
}
