import { workosErrorSchema } from "@notra/schemas/dashboard/auth/workos-error";
import { NotFoundException } from "@workos-inc/node";

export interface WorkOSErrorInfo {
  code: string | null;
  message: string;
  email: string | null;
  pendingAuthenticationToken: string | null;
  organizationIds: string[];
  authenticationFactors: WorkOSAuthenticationFactorRef[];
  userId: string | null;
}

interface WorkOSAuthenticationFactorRef {
  id: string;
  type: string;
}

export function readWorkOSError(error: unknown): WorkOSErrorInfo {
  const parsed = workosErrorSchema.safeParse(error);

  if (!parsed.success) {
    return {
      code: null,
      message: "Something went wrong",
      email: null,
      pendingAuthenticationToken: null,
      organizationIds: [],
      authenticationFactors: [],
      userId: null,
    };
  }

  const { code, message, rawData } = parsed.data;

  return {
    code: rawData?.code ?? code ?? null,
    message: rawData?.message ?? message ?? "Something went wrong",
    email: rawData?.email ?? rawData?.user?.email ?? null,
    pendingAuthenticationToken: rawData?.pending_authentication_token ?? null,
    organizationIds:
      rawData?.organizations?.map((organization) => organization.id) ?? [],
    authenticationFactors:
      rawData?.authentication_factors?.map((factor) => ({
        id: factor.id,
        type: factor.type,
      })) ?? [],
    userId: rawData?.user?.id ?? null,
  };
}

export function isWorkOSNotFound(error: unknown): boolean {
  return error instanceof NotFoundException;
}
