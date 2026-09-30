"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import type { PostSocialErrorNoticeProps } from "@/types/content/post-social";

export function PostSocialErrorNotice({
  label,
  error,
  slug,
}: PostSocialErrorNoticeProps) {
  const t = useTranslations("content.postSocial");
  return (
    <div className="space-y-1">
      <p className="text-destructive text-sm">{error.message}</p>
      {error.docsUrl && (
        <p className="text-muted-foreground text-sm">
          {t("rejectsDuplicates", { platform: label })}{" "}
          <a
            className="text-primary underline underline-offset-2"
            href={error.docsUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t("readDocs", { platform: label })}
          </a>
        </p>
      )}
      {error.reconnectRequired && slug && (
        <p className="text-muted-foreground text-sm">
          {t("reconnectPrompt")}{" "}
          <Link
            className="text-primary underline underline-offset-2"
            href={`/${slug}/settings/general`}
          >
            {t("reconnectInSettings")}
          </Link>
        </p>
      )}
    </div>
  );
}
