import { useTranslations } from "use-intl";

import { API_KEY_EXPIRATION_OPTIONS } from "@/constants/api-keys";

export function useApiKeyExpirationItems() {
  const t = useTranslations("apiKeys");
  return Object.fromEntries(
    API_KEY_EXPIRATION_OPTIONS.map((option) => [
      option.value,
      t("expirationOption", { value: option.value }),
    ])
  );
}
