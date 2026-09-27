import { ORPCError, toORPCError } from "@orpc/client";
import { ValidationError } from "@orpc/server";
import { getTranslations } from "next-intl/server";

async function localizedMessage(
  orpcError: ORPCError<string, unknown>
): Promise<string | null> {
  if (orpcError.code === "INTERNAL_SERVER_ERROR") {
    const t = await getTranslations("common.errors");
    return t("generic");
  }
  if (orpcError.code === "NOT_FOUND") {
    const t = await getTranslations("errors.server");
    return t("notFound");
  }
  if (orpcError.cause instanceof ValidationError) {
    const t = await getTranslations("errors.actions");
    return t("invalidInput");
  }
  return null;
}

export async function localizeServerFailure(error: unknown): Promise<unknown> {
  const orpcError = toORPCError(error);
  const message = await localizedMessage(orpcError);
  if (!message) {
    return error;
  }
  return new ORPCError(orpcError.code, {
    status: orpcError.status,
    message,
    data: orpcError.data,
    cause: error,
  });
}
