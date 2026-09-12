import type {
  SocialConnectPlatform,
  SocialPublishSurface,
} from "@notra/schemas/dashboard/social-accounts";

import type { BrandSettings } from "@/types/hooks/brand-analysis";

export interface PublishedSocialPost {
  platform: SocialConnectPlatform;
  postUrl: string | null;
  username: string;
  content: string;
}

export interface PostSocialButtonProps {
  platform: SocialConnectPlatform;
  organizationId: string;
  content: string;
  className?: string;
  onContentChange?: (value: string) => void;
  onPublished?: (published: PublishedSocialPost) => void;
  from?: SocialPublishSurface;
}

export interface PublishErrorInfo {
  message: string;
  reconnectRequired: boolean;
  docsUrl: string | null;
}

export interface PostSocialErrorNoticeProps {
  label: string;
  error: PublishErrorInfo;
  slug?: string;
}

export interface AddReferenceControlProps {
  voices: BrandSettings[];
  referencedVoiceIds: string[];
  isPending: boolean;
  onAdd: (voiceId: string, voiceName: string) => void;
  onMissingVoice: () => void;
}

export interface PostSocialIntentButtonProps {
  platform: SocialConnectPlatform;
  content: string;
  className?: string;
}
