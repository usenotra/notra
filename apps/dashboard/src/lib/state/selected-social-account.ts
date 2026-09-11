import type { SocialConnectPlatform } from "@notra/schemas/dashboard/social-accounts";
import { Effect, Fiber, Stream, SubscriptionRef } from "effect";

type SelectedAccountRef = SubscriptionRef.SubscriptionRef<string | null>;

const selectedAccountRefs = new Map<string, SelectedAccountRef>();

function getSelectedAccountRef(
  organizationId: string,
  platform: SocialConnectPlatform
): SelectedAccountRef {
  const key = `${organizationId}:${platform}`;
  const existing = selectedAccountRefs.get(key);
  if (existing) {
    return existing;
  }
  const ref = Effect.runSync(SubscriptionRef.make<string | null>(null));
  selectedAccountRefs.set(key, ref);
  return ref;
}

export function getSelectedSocialAccountId(
  organizationId: string,
  platform: SocialConnectPlatform
): string | null {
  return Effect.runSync(
    SubscriptionRef.get(getSelectedAccountRef(organizationId, platform))
  );
}

export function setSelectedSocialAccountId(
  organizationId: string,
  platform: SocialConnectPlatform,
  accountId: string
): void {
  Effect.runSync(
    SubscriptionRef.set(
      getSelectedAccountRef(organizationId, platform),
      accountId
    )
  );
}

export function subscribeToSelectedSocialAccountId(
  organizationId: string,
  platform: SocialConnectPlatform,
  onChange: () => void
): () => void {
  const fiber = Effect.runFork(
    Stream.runForEach(
      SubscriptionRef.changes(getSelectedAccountRef(organizationId, platform)),
      () => Effect.sync(onChange)
    )
  );
  return () => {
    Effect.runFork(Fiber.interrupt(fiber));
  };
}
