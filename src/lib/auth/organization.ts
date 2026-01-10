import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
import { api } from "../../../convex/_generated/api";
import { getServerSession } from "./session";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}
const convex = new ConvexHttpClient(CONVEX_URL);

type User = NonNullable<Awaited<ReturnType<typeof getServerSession>>["user"]>;

export interface OrganizationContext {
  user: User;
  organizationId: string;
  membership: {
    id: string;
    role: string;
  };
}

interface OrganizationAuthResult {
  success: true;
  context: OrganizationContext;
}

interface OrganizationAuthError {
  success: false;
  response: NextResponse;
}

export type OrganizationAuth = OrganizationAuthResult | OrganizationAuthError;

export async function withOrganizationAuth(
  request: NextRequest,
  organizationId: string
): Promise<OrganizationAuth> {
  const { user } = await getServerSession({
    headers: request.headers,
  });

  if (!user) {
    return {
      success: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const membership = await convex.query(api.auth.getMemberByUserAndOrg, {
    userId: user._id,
    organizationId,
  });

  if (!membership) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "You do not have access to this organization" },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    context: {
      user,
      organizationId,
      membership: {
        id: membership._id,
        role: membership.role,
      },
    },
  };
}
