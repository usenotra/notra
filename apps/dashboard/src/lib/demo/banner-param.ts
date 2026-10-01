import { parseAsStringLiteral } from "nuqs";

import { DEMO_BANNER_OFF, DEMO_BANNER_ON } from "@/constants/demo";

export const demoBannerParser = parseAsStringLiteral([
  DEMO_BANNER_ON,
  DEMO_BANNER_OFF,
]);
