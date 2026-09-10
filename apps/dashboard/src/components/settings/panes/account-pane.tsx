"use client";

import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ChatSection } from "@/components/settings/chat-section";
import { ConnectedAccountsSection } from "@/components/settings/connected-accounts-section";
import { DeleteAccountSection } from "@/components/settings/delete-account";
import { LoginDetailsSection } from "@/components/settings/login-details-section";
import { OrganizationsSection } from "@/components/settings/organizations-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { SettingsPane } from "@/components/settings/settings-pane";
import { authClient } from "@/lib/auth/client";

export function AccountSettingsPane() {
  const router = useRouter();
  const {
    data: session,
    isPending: isSessionPending,
    refetch: refetchSession,
  } = authClient.useSession();
  const user = session?.user;

  const {
    data: accounts,
    refetch: refetchAccounts,
    isError: isAccountsError,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) {
        throw new Error(result.error.message ?? "Failed to load accounts");
      }
      return result.data ?? [];
    },
    enabled: !!user,
  });

  if (!user && isSessionPending) {
    return (
      <SettingsPane>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </SettingsPane>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const hasGoogleLinked = accounts?.some((a) => a.providerId === "google");
  const hasGithubLinked = accounts?.some((a) => a.providerId === "github");
  const hasPasswordAccount = accounts?.some(
    (a) => a.providerId === "credential"
  );

  return (
    <SettingsPane>
      <ProfileSection
        onSessionRefetch={async () => {
          await refetchSession();
        }}
        user={user}
      />
      <LoginDetailsSection
        email={user.email}
        hasPasswordAccount={hasPasswordAccount ?? false}
      />
      <ConnectedAccountsSection
        accounts={accounts ?? []}
        hasGithubLinked={hasGithubLinked ?? false}
        hasGoogleLinked={hasGoogleLinked ?? false}
        isError={isAccountsError}
        onAccountsChange={refetchAccounts}
      />
      <OrganizationsSection />
      <PrivacySection />
      <ChatSection />
      <DeleteAccountSection />
    </SettingsPane>
  );
}
