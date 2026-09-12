import type { TextSelection } from "@notra/schemas/dashboard/content";
import type { ComponentProps } from "react";

import type { SocialPostAccountSelector } from "@/types/content/social-account-selector";

export interface LinkedInPostAuthor {
  name: string;
  avatar?: string;
  fallback?: string;
  headline?: string;
}

export interface LinkedInPostProps extends ComponentProps<"div"> {
  author: LinkedInPostAuthor;
  accountSelector?: SocialPostAccountSelector;
  content?: string;
  onContentChange?: (value: string) => void;
  onSelectionChange?: (selection: TextSelection | null) => void;
  image?: { src: string; alt: string };
  reactions?: { count: number; types?: Array<"like" | "love" | "celebrate"> };
  comments?: number;
  reposts?: number;
  timestamp?: string;
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onSend?: () => void;
  onClose?: () => void;
  truncate?: boolean;
  truncationLimit?: number;
  defaultExpanded?: boolean;
}
