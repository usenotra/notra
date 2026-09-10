import type { users } from "@notra/db/schema";

export type SessionUser = typeof users.$inferSelect;

export interface SessionInfo {
  userId: string;
  activeOrganizationId: string | null;
  impersonatedBy: string | null;
}

export interface AuthSessionData {
  session: SessionInfo;
  user: SessionUser;
}

export interface AuthIdentityData {
  user: SessionUser;
  impersonatedBy: string | null;
}

export interface GetServerSessionParams {
  headers: Headers;
}

export interface ClientSessionData {
  session: SessionInfo;
  user: Pick<
    SessionUser,
    | "id"
    | "name"
    | "email"
    | "emailVerified"
    | "image"
    | "role"
    | "hidePersonalData"
    | "showAgentStats"
    | "createdAt"
  >;
}
