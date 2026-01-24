import { db } from "@notra/db/drizzle";
import { members } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "./session";

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
	organizationId: string,
): Promise<OrganizationAuth> {
	if (!process.env.DATABASE_URL) {
		return {
			success: false,
			response: NextResponse.json(
				{ error: "Database unavailable" },
				{ status: 503 },
			),
		};
	}

	const { user } = await getServerSession({
		headers: request.headers,
	});

	if (!user) {
		return {
			success: false,
			response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}

	const membership = await db.query.members.findFirst({
		where: and(
			eq(members.userId, user.id),
			eq(members.organizationId, organizationId),
		),
		columns: {
			id: true,
			role: true,
		},
	});

	if (!membership) {
		return {
			success: false,
			response: NextResponse.json(
				{ error: "You do not have access to this organization" },
				{ status: 403 },
			),
		};
	}

	return {
		success: true,
		context: {
			user,
			organizationId,
			membership,
		},
	};
}
