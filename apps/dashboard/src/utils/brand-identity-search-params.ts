import { parseAsString, parseAsStringLiteral } from "nuqs";

import { BRAND_IDENTITY_TAB_VALUES } from "@/constants/brand-identity";

export const brandIdentityVoiceParser = parseAsString.withOptions({
  history: "replace",
});

export const brandIdentityViewParser = parseAsStringLiteral(
  BRAND_IDENTITY_TAB_VALUES
).withOptions({ history: "replace" });
