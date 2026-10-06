/** Throwing wrappers around the app's Brew client, for the Brew scripts. */
import type { BrewRequestInit } from "../src/types/brew";
import { brewRequest } from "../src/utils/brew";

// Brew swaps `#unsubscribe` for a signed per-recipient link on marketing sends.
export const BREW_UNSUBSCRIBE_FOOTER =
  '<p style="margin:0 0 32px;text-align:center;font-family:sans-serif;font-size:12px;color:#717175">Don\'t want these emails? <a href="#unsubscribe" style="color:#717175;text-decoration:underline">Unsubscribe</a></p>';

export async function api<T>(
  method: BrewRequestInit["method"],
  path: string,
  body?: unknown
): Promise<T> {
  const result = await brewRequest<T>(path, { method, body });
  if (!result.ok) {
    throw new Error(
      `${method} ${path} → ${result.error.name}: ${result.error.message}`
    );
  }
  return result.data;
}

export async function list<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let cursor: string | null = null;

  do {
    const separator = path.includes("?") ? "&" : "?";
    const query = cursor
      ? `${separator}cursor=${encodeURIComponent(cursor)}`
      : "";
    const page: { data: T[]; pagination: { cursor: string | null } } =
      await api("GET", `${path}${query}`);
    rows.push(...page.data);
    cursor = page.pagination.cursor;
  } while (cursor !== null);

  return rows;
}

/** Puts the designs in the named email group, creating it when missing. */
export async function ensureEmailGroup(name: string, emailIds: string[]) {
  const groups = await list<{ groupId: string; groupName: string }>(
    "/email-groups"
  );
  const group = groups.find((row) => row.groupName === name);

  if (group) {
    await api("PATCH", `/email-groups/${group.groupId}`, { emailIds });
  } else {
    await api("POST", "/email-groups", { name, emailIds });
  }
}
