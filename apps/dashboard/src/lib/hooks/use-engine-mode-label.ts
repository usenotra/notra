import { useTranslations } from "use-intl";

import { engineAnswerMode, formatEngineFamily } from "@/utils/geo-charts";

export function useEngineModeLabel() {
  const t = useTranslations("geo.shared.engineMode");
  return (engine: string) => {
    const family = formatEngineFamily(engine);
    return engineAnswerMode(engine)
      ? t("engineWithoutSearch", { engine: family })
      : family;
  };
}
