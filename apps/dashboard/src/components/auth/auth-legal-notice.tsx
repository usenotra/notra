"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

export function AuthLegalNotice() {
  const t = useTranslations("auth.legal");

  return (
    <p className="text-muted-foreground px-8 text-center text-xs">
      {t.rich("agreement", {
        terms: (chunks) => (
          <Link
            className="hover:text-primary underline underline-offset-4"
            href="https://usenotra.com/terms"
            rel="noopener noreferrer"
            target="_blank"
          >
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link
            className="hover:text-primary underline underline-offset-4"
            href="https://usenotra.com/privacy"
            rel="noopener noreferrer"
            target="_blank"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
