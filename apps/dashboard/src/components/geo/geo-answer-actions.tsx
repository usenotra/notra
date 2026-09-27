"use client";

import { ArrowUpRight01Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { GeoAnswerActionsProps } from "@/types/geo";
import { copyTextToClipboard } from "@/utils/copy-to-clipboard";
import { getSafeReferenceSourceUrl } from "@/utils/reference-source-url";

export function GeoAnswerActions({ text, sources }: GeoAnswerActionsProps) {
  const t = useTranslations("geo.geoAnswerActions");
  const links = sources.flatMap((source) => {
    const href = getSafeReferenceSourceUrl(source.url);
    return href ? [{ href, domain: source.domain, title: source.title }] : [];
  });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <Button
        aria-label={t("copy")}
        className="text-muted-foreground h-7 gap-1.5 px-2"
        onClick={() => copyTextToClipboard(text, t("copied"))}
        size="sm"
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon aria-hidden="true" icon={Copy01Icon} size={14} />
        {t("copy")}
      </Button>
      {links.length > 0 ? (
        <ul
          aria-label={t("openSources")}
          className="flex flex-wrap items-center gap-1.5"
        >
          {links.map((link) => (
            <li key={link.href}>
              <a
                aria-label={t("openSource", {
                  title: link.title,
                  domain: link.domain,
                })}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs outline-none focus-visible:ring-2"
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="max-w-[10rem] truncate">{link.domain}</span>
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={ArrowUpRight01Icon}
                  size={12}
                />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
