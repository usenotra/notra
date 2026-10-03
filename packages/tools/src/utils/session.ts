import type { SessionContext } from "eve/context";

export function getSessionAttribute(
  ctx: Pick<SessionContext, "session">,
  name: string
): string | null {
  const value =
    ctx.session.auth.current?.attributes[name] ??
    ctx.session.auth.initiator?.attributes[name];
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function requireSessionAttribute(
  ctx: SessionContext,
  name: string
): string {
  const value = getSessionAttribute(ctx, name);
  if (!value) {
    throw new Error(
      `The "${name}" session attribute is missing. It must be provided by the trusted caller when the session is created.`
    );
  }
  return value;
}

export function getBooleanSessionAttribute(
  ctx: Pick<SessionContext, "session">,
  name: string
): boolean {
  return getSessionAttribute(ctx, name) === "true";
}

export function getJsonSessionAttribute<T>(
  ctx: SessionContext,
  name: string,
  parse: (value: unknown) => T
): T | null {
  const raw = getSessionAttribute(ctx, name);
  if (!raw) {
    return null;
  }
  return parse(JSON.parse(raw));
}
