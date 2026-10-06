import { ContactMessageEmail } from "@notra/email/emails/contact";
import type { ContactMessageEmailProps } from "@notra/email/types/contact";
import { sendBrewEmail } from "@notra/email/utils/brew";
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

// NUL-separated so different field splits never produce the same key.
function buildIdempotencyKey(
  message: ContactMessageEmailProps,
  recipient: string
): string {
  return [
    recipient,
    message.name,
    message.email,
    message.company ?? "",
    message.message,
  ].join("\0");
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

    const result = yield* Effect.tryPromise({
      try: () =>
        sendBrewEmail({
          category: "contact",
          to,
          subject,
          react: ContactMessageEmail(message),
          idempotencyKey,
        }),
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
