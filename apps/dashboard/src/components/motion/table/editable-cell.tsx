"use client";

import { useTranslations } from "next-intl";

export function EditableCell({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (next: string) => void;
}) {
  const tCommon = useTranslations("common");
  return (
    <input
      aria-label={label}
      className="text-foreground placeholder:text-muted-foreground/40 focus:bg-muted focus:ring-ring -mx-2 w-full min-w-0 appearance-none rounded-md border-0 bg-transparent px-2 py-1 transition-colors outline-none focus:ring-1"
      onChange={(e) => onChange(e.target.value)}
      placeholder={tCommon("labels.empty")}
      size={1}
      value={value}
    />
  );
}
