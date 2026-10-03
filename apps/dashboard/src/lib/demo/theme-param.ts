import { createSerializer, parseAsStringLiteral } from "nuqs/server";

import { DEMO_THEME_PARAM, DEMO_THEMES } from "@/constants/demo";

export const demoThemeParser = parseAsStringLiteral(DEMO_THEMES);

export const serializeDemoTheme = createSerializer({
  [DEMO_THEME_PARAM]: demoThemeParser,
});
