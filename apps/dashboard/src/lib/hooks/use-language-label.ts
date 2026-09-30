import { useTranslations } from "next-intl";

import { isSupportedLanguage } from "@/utils/languages";

export function useLanguageLabel() {
  const t = useTranslations("common.languages");
  const label = (language: string) =>
    isSupportedLanguage(language) ? t(language) : language;
  return <Language extends string>(language: Language): string =>
    label(language);
}
