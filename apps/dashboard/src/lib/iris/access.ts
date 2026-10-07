import { getTranslations } from "@/lib/i18n/server";
import { isIrisEnabledForOrganization } from "@/lib/iris/flag";
import { forbidden } from "@/lib/orpc/utils/errors";

export async function assertIrisEnabled(organizationId: string): Promise<void> {
  const enabled = await isIrisEnabledForOrganization(organizationId);
  if (!enabled) {
    const t = await getTranslations("iris.unavailable");
    throw forbidden(t("description"));
  }
}
