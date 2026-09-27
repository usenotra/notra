import { useTranslations } from "next-intl";

import type { ChatModelOption } from "@/types/components/chat-input";

export function useChatModelLabels() {
  const t = useTranslations("chat.models");
  return {
    description: (model: ChatModelOption) =>
      model.description ? t(`descriptions.${model.description}`) : "",
    pricing: (model: ChatModelOption) => {
      if (model.pricing === null) {
        return "";
      }
      if (model.pricing === "varies") {
        return t("pricingVaries");
      }
      return t("pricing", {
        input: model.pricing.input,
        output: model.pricing.output,
      });
    },
  };
}
