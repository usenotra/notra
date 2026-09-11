import { CONTACT_TURNSTILE_ACTION } from "@/constants/turnstile";
import {
  turnstileTokenSchema,
  turnstileVerificationSchema,
} from "@/schemas/turnstile";

export async function verifyContactTurnstile(token: unknown): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  const hostnames = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter(Boolean);

  if (
    !secret?.trim() ||
    hostnames.length === 0 ||
    !turnstileTokenSchema.safeParse(token).success
  ) {
    return false;
  }

  if (
    process.env.NODE_ENV === "production" &&
    hostnames.some(
      (hostname) =>
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1"
    )
  ) {
    return false;
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          secret,
          response: turnstileTokenSchema.parse(token),
        }),
      }
    );
    if (!response.ok) {
      return false;
    }

    const result = turnstileVerificationSchema.safeParse(await response.json());
    return (
      result.success &&
      result.data.action === CONTACT_TURNSTILE_ACTION &&
      hostnames.includes(result.data.hostname)
    );
  } catch {
    return false;
  }
}
