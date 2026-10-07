export interface InvitationOrganization {
  name: string;
  slug: string;
  logo: string | null;
}

/** Who is looking at the invitation, compared with the address it was sent to. */
export type InvitationViewer =
  | { kind: "signed-out" }
  | { kind: "match" }
  | { kind: "mismatch"; email: string };

export type InvitationUnavailableReason =
  | "missing"
  | "not-found"
  | "expired"
  | "revoked"
  | "accepted";

export type InvitationPageData =
  | { status: "unavailable"; reason: InvitationUnavailableReason }
  | {
      status: "pending";
      token: string;
      email: string;
      role: string;
      organization: InvitationOrganization;
      inviterName: string | null;
      viewer: InvitationViewer;
      /** Where a signed-out visitor goes to sign in or sign up, then come back. */
      authHref: string;
    };

export type InvitationActionResult =
  | { ok: true; organizationSlug: string | null }
  | { ok: false; reason: "signed-out" | "mismatch" | "unavailable" | "failed" };
