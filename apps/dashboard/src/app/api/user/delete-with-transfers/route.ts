import { db } from "@notra/db/drizzle";
import { members, organizations } from "@notra/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

interface TransferAction {
	orgId: string;
	action: "transfer" | "delete";
}

interface DeleteWithTransfersRequest {
	transfers: TransferAction[];
}

export async function POST(request: NextRequest) {
	try {
		const { user } = await getServerSession({ headers: request.headers });

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = (await request.json()) as DeleteWithTransfersRequest;
		const { transfers } = body;

		if (!transfers || !Array.isArray(transfers)) {
			return NextResponse.json(
				{ error: "Invalid request body" },
				{ status: 400 },
			);
		}

		// Process each organization
		for (const transfer of transfers) {
			const { orgId, action } = transfer;

			// Wrap ownership transfer logic in a transaction to prevent race conditions
			await db.transaction(async (tx) => {
				// Re-verify ownership within the transaction to ensure atomicity
				const membership = await tx.query.members.findFirst({
					where: and(
						eq(members.organizationId, orgId),
						eq(members.userId, user.id),
						eq(members.role, "owner"),
					),
				});

				if (!membership) {
					throw new Error(`You are not the owner of organization ${orgId}`);
				}

				if (action === "transfer") {
					// Find the next owner candidate (prefer admin, then any member)
					let newOwner = await tx.query.members.findFirst({
						where: and(
							eq(members.organizationId, orgId),
							ne(members.userId, user.id),
							eq(members.role, "admin"),
						),
					});

					if (!newOwner) {
						newOwner = await tx.query.members.findFirst({
							where: and(
								eq(members.organizationId, orgId),
								ne(members.userId, user.id),
							),
						});
					}

					if (!newOwner) {
						throw new Error(
							`No other members to transfer ownership to for organization ${orgId}`,
						);
					}

					// Transfer ownership: update the new owner's role to owner
					await tx
						.update(members)
						.set({ role: "owner" })
						.where(eq(members.id, newOwner.id));

					// Remove the current user from the organization
					await tx
						.delete(members)
						.where(
							and(
								eq(members.organizationId, orgId),
								eq(members.userId, user.id),
							),
						);
				} else if (action === "delete") {
					// Delete the organization (cascades will handle members, integrations, etc.)
					await tx.delete(organizations).where(eq(organizations.id, orgId));
				}
			});
		}

		// Now delete the user account
		// The actual deletion will be handled by Better Auth's deleteUser
		// We just return success and let the client call deleteUser
		return NextResponse.json({
			success: true,
			message: "Organizations processed. You can now delete your account.",
		});
	} catch (error) {
		console.error("Error processing delete with transfers:", error);

		// Handle transaction errors with appropriate status codes
		if (error instanceof Error) {
			const errorMessage = error.message;

			if (errorMessage.includes("You are not the owner")) {
				return NextResponse.json({ error: errorMessage }, { status: 403 });
			}

			if (errorMessage.includes("No other members to transfer ownership")) {
				return NextResponse.json({ error: errorMessage }, { status: 400 });
			}
		}

		return NextResponse.json(
			{ error: "Failed to process request" },
			{ status: 500 },
		);
	}
}
