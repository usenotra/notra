import {
  AiBrowserIcon,
  Alert02Icon,
  AnalyticsUpIcon,
  Attachment01Icon,
  ChartAnalysisIcon,
  CorporateIcon,
  CreditCardIcon,
  Globe02Icon,
  Notification01Icon,
  PaintBoardIcon,
  Settings01Icon,
  SourceCodeIcon,
  UserCircleIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

import type {
  SettingsNavGroupConfig,
  SettingsSectionId,
} from "@/types/settings/modal";

export const SETTINGS_SECTION_IDS = [
  "account",
  "appearance",
  "general",
  "members",
  "notifications",
  "attachments",
  "billing",
  "usage",
  "usage-alerts",
  "credits",
  "logs",
  ...(process.env.NODE_ENV === "development" ? (["dev"] as const) : []),
  "geo",
  "geo-brand",
  "geo-languages",
  "geo-models",
] as const satisfies readonly SettingsSectionId[];

export const SETTINGS_QUERY_KEY = "settings";

export const SETTINGS_NAV_GROUPS: readonly SettingsNavGroupConfig[] = [
  {
    id: "account",
    items: [
      {
        id: "account",
        icon: UserCircleIcon,
        keywords: [
          "profile",
          "user",
          "email",
          "password",
          "privacy",
          "chat",
          "avatar",
          "login",
          "google",
          "github",
          "name",
          "delete account",
          "security",
          "2fa",
          "mfa",
          "two-factor",
          "authenticator",
          "backup codes",
        ],
      },
      {
        id: "appearance",
        icon: PaintBoardIcon,
        keywords: [
          "appearance",
          "theme",
          "mode",
          "light",
          "dark",
          "system",
          "color scheme",
        ],
      },
    ],
  },
  {
    id: "organization",
    items: [
      {
        id: "general",
        icon: Settings01Icon,
        keywords: [
          "organization",
          "workspace",
          "name",
          "logo",
          "slug",
          "twitter",
          "linkedin",
          "social",
          "domain",
        ],
      },
      {
        id: "members",
        icon: UserGroupIcon,
        keywords: [
          "team",
          "users",
          "invite",
          "people",
          "roles",
          "owner",
          "admin",
          "pending",
        ],
      },
      {
        id: "notifications",
        icon: Notification01Icon,
        keywords: [
          "alerts",
          "email",
          "preferences",
          "digest",
          "recap",
          "marketing",
          "product updates",
        ],
      },
      {
        id: "attachments",
        icon: Attachment01Icon,
        keywords: ["files", "uploads", "media", "pdf", "images", "storage"],
      },
      {
        id: "billing",
        icon: CreditCardIcon,
        keywords: [
          "subscription",
          "plan",
          "invoice",
          "payment",
          "stripe",
          "trial",
          "upgrade",
        ],
      },
      {
        id: "usage",
        icon: ChartAnalysisIcon,
        keywords: [
          "usage",
          "remaining",
          "limits",
          "quota",
          "answers",
          "cycle",
          "breakdown",
        ],
      },
      {
        id: "usage-alerts",
        icon: Alert02Icon,
        keywords: [
          "usage",
          "alerts",
          "threshold",
          "remaining",
          "percentage",
          "limits",
        ],
      },
      {
        id: "credits",
        icon: Wallet01Icon,
        keywords: ["balance", "top up", "topup", "tokens", "ai", "spend"],
        requiresAiCredits: true,
      },
      {
        id: "logs",
        icon: AnalyticsUpIcon,
        keywords: [
          "audit",
          "activity",
          "events",
          "webhooks",
          "history",
          "retention",
          "delivery",
        ],
      },
    ],
  },
  {
    id: "geo",
    items: [
      {
        id: "geo-brand",
        icon: CorporateIcon,
        keywords: [
          "geo",
          "brand",
          "company",
          "aliases",
          "conversion",
          "paths",
          "tracking",
          "project",
          "identity",
        ],
      },
      {
        id: "geo-languages",
        icon: Globe02Icon,
        keywords: [
          "geo",
          "language",
          "locale",
          "translation",
          "english",
          "scan",
        ],
      },
      {
        id: "geo-models",
        icon: AiBrowserIcon,
        keywords: [
          "geo",
          "models",
          "engines",
          "scanning",
          "schedule",
          "zdr",
          "providers",
          "frequency",
          "openai",
          "anthropic",
          "muse",
        ],
      },
    ],
  },
  ...(process.env.NODE_ENV === "development"
    ? [
        {
          id: "dev" as const,
          items: [
            {
              id: "dev" as const,
              icon: SourceCodeIcon,
              keywords: [
                "developer",
                "onboarding",
                "replay",
                "test",
                "sample data",
              ],
            },
          ],
        },
      ]
    : []),
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = "account";
export const DEFAULT_GEO_SETTINGS_SECTION: SettingsSectionId = "geo-brand";

export const LOGS_SETTINGS_SEARCH_KEYS = [
  "q",
  "source",
  "status",
  "page",
] as const;

export const LEGACY_BILLING_TAB_VALUES = ["billing", "usage"] as const;
