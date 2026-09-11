import type { TextSelection } from "@notra/schemas/dashboard/content";
import type { ComponentProps, ReactNode } from "react";

import type { SocialPostAccountSelector } from "@/types/content/social-account-selector";

export interface TwitterPostAuthor {
  name: string;
  avatar?: string;
  fallback?: string;
  handle?: string;
  verified?: boolean;
  verifiedType?: string | null;
}

export interface XVerificationBadgeProps {
  verified: boolean;
  verifiedType: string | null;
  className?: string;
}

export interface TwitterPostMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "destructive";
}

export interface TwitterPostProps extends ComponentProps<"div"> {
  author: TwitterPostAuthor;
  accountSelector?: SocialPostAccountSelector;
  content?: string;
  onContentChange?: (value: string) => void;
  onSelectionChange?: (selection: TextSelection | null) => void;
  timestamp?: string;
  menuItems?: TwitterPostMenuItem[];
}
