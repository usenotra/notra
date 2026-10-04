import type { getServerSession } from "@/lib/auth/session";

export type AuthSession = Awaited<ReturnType<typeof getServerSession>>;

export type User = NonNullable<
  Awaited<ReturnType<typeof getServerSession>>["user"]
>;

export type AuthenticatedUser = NonNullable<AuthSession["user"]>;

export interface OrganizationMembership {
  id: string;
  role: string;
}

/** A membership a page loader already resolved for the signed-in user. */
export type LoadedMembership = OrganizationMembership & { userId: string };

export interface OrganizationAuthDependencies {
  getServerSession: typeof getServerSession;
  findMembership: (params: {
    organizationId: string;
    userId: string;
  }) => Promise<OrganizationMembership | undefined>;
  hasDatabaseUrl: () => boolean;
}

export interface OrganizationContext {
  user: User;
  organizationId: string;
  membership: {
    id: string;
    role: string;
  };
}

export interface OrganizationAuthResult {
  success: true;
  context: OrganizationContext;
}

export interface OrganizationAuthError {
  success: false;
  response: Response;
}

export type OrganizationAuth = OrganizationAuthResult | OrganizationAuthError;
