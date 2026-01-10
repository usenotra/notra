"use server";

import { ConvexHttpClient } from "convex/browser";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LAST_VISITED_ORGANIZATION_COOKIE } from "@/utils/constants";
import { api } from "../../../convex/_generated/api";
import { fetchAuthQuery } from "./auth-server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
}
const convex = new ConvexHttpClient(CONVEX_URL);

export async function validateOrganizationAccess(slug: string) {
  const user = await fetchAuthQuery(api.auth.getCurrentUser, {});

  if (!user) {
    redirect("/login");
  }

  const organization = await convex.query(api.auth.getOrganizationBySlug, {
    slug,
  });

  if (!organization) {
    notFound();
  }

  const membership = await convex.query(api.auth.getMemberByUserAndOrg, {
    userId: user._id,
    organizationId: organization._id,
  });

  if (!membership) {
    notFound();
  }

  return {
    organization: {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
    },
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
    member: {
      id: membership._id,
      role: membership.role,
    },
  };
}

export async function getSession() {
  const user = await fetchAuthQuery(api.auth.getCurrentUser, {});

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
    session: {
      userId: user._id,
    },
  };
}

export async function requireAuth() {
  const user = await fetchAuthQuery(api.auth.getCurrentUser, {});

  if (!user) {
    redirect("/login");
  }

  return {
    session: {
      userId: user._id,
    },
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  };
}

export async function getLastActiveOrganization(userId: string) {
  const cookieStore = await cookies();
  const lastVisitedOrgSlug = cookieStore.get(
    LAST_VISITED_ORGANIZATION_COOKIE
  )?.value;

  if (lastVisitedOrgSlug) {
    const organization = await convex.query(api.auth.getOrganizationBySlug, {
      slug: lastVisitedOrgSlug,
    });

    if (organization) {
      const membership = await convex.query(api.auth.getMemberByUserAndOrg, {
        userId,
        organizationId: organization._id,
      });

      if (membership) {
        return { slug: organization.slug, id: organization._id };
      }
    }
  }

  const membership = await convex.query(api.auth.getFirstMembershipForUser, {
    userId,
  });

  if (membership) {
    const org = await convex.query(api.auth.getOrganizationById, {
      organizationId: membership.organizationId,
    });

    if (org) {
      return { slug: org.slug, id: org._id };
    }
  }

  return;
}
