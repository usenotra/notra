import type {
  members,
  organizations,
  socialConnections,
} from "@notra/db/schema";

export interface ActionError {
  message: string;
  code?: string;
}

/** Discriminated on `error`: checking it narrows `data` to `T`. */
export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError };

export type OrganizationRow = typeof organizations.$inferSelect;
export type MemberRow = typeof members.$inferSelect;
export type SocialConnectionRow = typeof socialConnections.$inferSelect;

export interface InvitationSummary {
  id: string;
  email: string;
  role: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: Date;
  createdAt: Date;
  acceptInvitationUrl: string;
}

export interface MemberWithUser extends MemberRow {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface FullOrganization extends OrganizationRow {
  members: MemberWithUser[];
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  logo?: string;
  keepCurrentActiveOrganization?: boolean;
}

export interface UpdateOrganizationInput {
  organizationId: string;
  data: {
    name?: string;
    slug?: string;
    logo?: string;
  };
}

export interface SetActiveOrganizationInput {
  organizationId?: string;
  organizationSlug?: string;
}

export interface InviteMemberInput {
  email: string;
  role: "member" | "admin" | "owner";
  organizationId?: string;
}

export interface InvitationActionInput {
  invitationId: string;
}

export interface UpdateMemberRoleInput {
  memberId: string;
  role: "member" | "admin" | "owner";
  organizationId?: string;
}

export interface RemoveMemberInput {
  memberIdOrEmail: string;
  organizationId?: string;
}

export interface ListMembersInput {
  query?: {
    organizationId?: string;
  };
}

export interface MembersListResult {
  members: MemberWithUser[];
  total: number;
}

export interface AccountInfo {
  id: string;
  providerId: string;
  accountId: string;
  scopes: string[];
  createdAt: Date;
}
