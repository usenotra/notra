import { db } from "@notra/db/drizzle";
import { members } from "@notra/db/schema";
import { and, count, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface OwnedOrganization {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	memberCount: number;
	nextOwnerCandidate: {
		id: string;
		name: string;
		email: string;
		role: string;
	} | null;
}

export async function GET(request: NextRequest) {
	try {
		const { user } = await getServerSession({ headers: request.headers });

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get all organizations where the user is an owner
		const ownedMemberships = await db.query.members.findMany({
			where: and(eq(members.userId, user.id), eq(members.role, "owner")),
			with: {
				organizations: true,
			},
		});

		const ownedOrganizations: OwnedOrganization[] = [];

		for (const membership of ownedMemberships) {
			const org = membership.organizations;

			// Get member count for this organization
			const [memberCountResult] = await db
				.select({ count: count() })
				.from(members)
				.where(eq(members.organizationId, org.id));

			const memberCount = memberCountResult?.count ?? 0;

			// Find next owner candidate (prefer admins, then any member)
			let nextOwnerCandidate: OwnedOrganization["nextOwnerCandidate"] = null;

			if (memberCount > 1) {
				// First try to find an admin
				const adminCandidate = await db.query.members.findFirst({
					where: and(
						eq(members.organizationId, org.id),
						ne(members.userId, user.id),
						eq(members.role, "admin"),
					),
					with: {
						users: true,
					},
				});

				if (adminCandidate?.users) {
					nextOwnerCandidate = {
						id: adminCandidate.users.id,
						name: adminCandidate.users.name,
						email: adminCandidate.users.email,
						role: adminCandidate.role,
					};
				} else {
					// Fall back to any other member
					const memberCandidate = await db.query.members.findFirst({
						where: and(
							eq(members.organizationId, org.id),
							ne(members.userId, user.id),
						),
						with: {
							users: true,
						},
					});

					if (memberCandidate?.users) {
						nextOwnerCandidate = {
							id: memberCandidate.users.id,
							name: memberCandidate.users.name,
							email: memberCandidate.users.email,
							role: memberCandidate.role,
						};
					}
				}
			}

			ownedOrganizations.push({
				id: org.id,
				name: org.name,
				slug: org.slug,
				logo: org.logo,
				memberCount,
				nextOwnerCandidate,
			});
		}

		return NextResponse.json({ ownedOrganizations });
	} catch (error) {
		console.error("Error fetching owned organizations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch organizations" },
			{ status: 500 },
		);
	}
}
