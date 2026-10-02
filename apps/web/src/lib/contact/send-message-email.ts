import { createHash } from "node:crypto";

import { ContactMessageEmail } from "@notra/email/emails/contact";
import type { ContactMessageEmailProps } from "@notra/email/types/contact";
import { EMAIL_CONFIG } from "@notra/email/utils/config";
import { sendDevEmail } from "@notra/email/utils/dev";
import { getResend } from "@notra/email/utils/resend";
import { Data, Effect } from "effect";

import { CONTACT_RECIPIENT } from "@/constants/contact";
import type { ContactMessageInput } from "@/types/contact";

const HEADER_NEWLINE_REGEX = /[\r\n]+/g;

class ContactMessageEmailError extends Data.TaggedError(
  "ContactMessageEmailError"
)<{
  readonly message: string;
  readonly cause: unknown;
}> {}

function getRecipient(): string {
  return process.env.CONTACT_EMAIL_TO || CONTACT_RECIPIENT;
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(HEADER_NEWLINE_REGEX, " ").trim();
}

function buildPlainText(message: ContactMessageEmailProps): string {
  return [
    `From: ${message.name} <${message.email}>`,
    message.company ? `Company: ${message.company}` : null,
    "",
    message.message,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildIdempotencyKey(
  message: ContactMessageEmailProps,
  recipient: string
): string {
  const hash = createHash("sha256");

  for (const value of [
    recipient,
    message.name,
    message.email,
    message.company ?? "",
    message.message,
  ]) {
    hash.update(value);
    hash.update("\0");
  }

  return `notra:contact:${hash.digest("hex")}`;
}

export const sendContactMessageEmail = Effect.fn("sendContactMessageEmail")(
  function* (input: ContactMessageInput) {
    const to = getRecipient();
    const message: ContactMessageEmailProps = {
      name: input.name,
      email: input.email,
      company: input.company,
      message: input.message,
    };
    const subject = `New contact message from ${sanitizeHeaderValue(message.name)}`;
    const idempotencyKey = buildIdempotencyKey(message, to);
    const text = buildPlainText(message);

    const resend = getResend();

    if (!resend) {
      if (process.env.NODE_ENV === "production") {
        return yield* Effect.fail(
          new ContactMessageEmailError({
            message: "Email service is not configured",
            cause: new Error("RESEND_API_KEY is not set"),
          })
        );
      }

      yield* Effect.tryPromise({
        try: () =>
          sendDevEmail({
            from: EMAIL_CONFIG.from,
            replyTo: message.email,
            to,
            subject,
            text,
          }),
        catch: (cause) =>
          new ContactMessageEmailError({
            message: "Failed to log development contact email",
            cause,
          }),
      });

      return { success: true } as const;
    }

    const result = yield* Effect.tryPromise({
      try: () =>
        resend.emails.send(
          {
            from: EMAIL_CONFIG.from,
            replyTo: message.email,
            to,
            subject,
            react: ContactMessageEmail(message),
            text,
            tags: [{ name: "category", value: "contact" }],
          },
          { idempotencyKey }
        ),
      catch: (cause) =>
        new ContactMessageEmailError({
          message: "Failed to send contact message email",
          cause,
        }),
    });

    if (result.error) {
      return yield* Effect.fail(
        new ContactMessageEmailError({
          message: result.error.message,
          cause: result.error,
        })
      );
    }

    return { success: true } as const;
  }
);
