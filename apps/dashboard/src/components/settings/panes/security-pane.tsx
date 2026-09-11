"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import type { SecurityLoadStatus } from "@notra/ui/lib/security-types";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { PasskeysSection } from "@/components/settings/passkeys-section";
import { SettingsPane } from "@/components/settings/settings-pane";
import { TwoFactorSection } from "@/components/settings/two-factor-section";
import { authClient } from "@/lib/auth/client";
import { QUERY_KEYS } from "@/utils/query-keys";

function resolveStatus(
  isPending: boolean,
  isError: boolean
): SecurityLoadStatus {
  if (isPending) {
    return "loading";
  }
  if (isError) {
    return "error";
  }
  return "ready";
}

export function SecuritySettingsPane() {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const user = session?.user;

  const overviewQuery = useQuery({
    queryKey: QUERY_KEYS.AUTH.security,
    queryFn: async () => {
      const result = await authClient.security.getOverview();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: !!user,
  });

  if (!user && isSessionPending) {
    return (
      <SettingsPane>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </SettingsPane>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const status = resolveStatus(overviewQuery.isPending, overviewQuery.isError);
  const refresh = () => overviewQuery.refetch();

  return (
    <SettingsPane>
      <TwoFactorSection
        accountLabel={user.email}
        backupCodesRemaining={overviewQuery.data?.backupCodesRemaining ?? null}
        factors={overviewQuery.data?.totpFactors ?? []}
        onRefresh={refresh}
        status={status}
      />
      <PasskeysSection
        email={user.email}
        onRefresh={refresh}
        passkeys={overviewQuery.data?.passkeys ?? []}
        passkeysAvailable={overviewQuery.data?.passkeysAvailable ?? true}
        status={status}
      />
    </SettingsPane>
  );
}
