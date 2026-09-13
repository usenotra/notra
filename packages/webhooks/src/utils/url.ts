import { Effect } from "effect";
import ipaddr from "ipaddr.js";

import { WebhookValidationError } from "../errors/webhooks";

export function isPublicAddress(address: string) {
  if (!ipaddr.isValid(address)) {
    return false;
  }
  return ipaddr.process(address).range() === "unicast";
}

export const validateEndpointUrl = Effect.fn("webhooks.validateEndpointUrl")(
  function* (value: string) {
    const url = yield* Effect.try({
      try: () => new URL(value),
      catch: () =>
        new WebhookValidationError({ message: "Invalid webhook URL" }),
    });
    const hostname = url.hostname.toLowerCase();
    if (
      value.length > 2048 ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.port ||
      !hostname.includes(".") ||
      hostname.endsWith(".") ||
      hostname.startsWith("[") ||
      ipaddr.isValid(hostname) ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(
        hostname
      )
    ) {
      return yield* new WebhookValidationError({
        message:
          "Webhook URL must use a public HTTPS hostname on port 443, without credentials or a fragment",
      });
    }
    return url.toString();
  }
);
