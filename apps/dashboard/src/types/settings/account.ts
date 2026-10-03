import type { ReactNode } from "react";

import type { AccountInfo } from "@/types/organizations/actions";

export interface ProfileSectionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface ProfileSectionProps {
  user: ProfileSectionUser;
  onSessionRefetch?: () => void | Promise<void>;
}

export interface LoginDetailsSectionProps {
  email: string;
  hasPasswordAccount: boolean;
}

export interface ConnectedAccountsSectionProps {
  accounts: AccountInfo[];
  hasGoogleLinked: boolean;
  hasGithubLinked: boolean;
  isError: boolean;
  onAccountsChange: () => void;
}

export interface ConnectedAccountRowProps {
  canUnlink: boolean;
  disconnectHint: string | null;
  icon: ReactNode;
  linked: boolean;
  loading: boolean;
  name: string;
  onLink: () => void;
  onUnlink: () => void;
}
