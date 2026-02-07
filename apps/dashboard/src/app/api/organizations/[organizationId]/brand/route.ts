import { db } from "@notra/db/drizzle";
import { brandSettings } from "@notra/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { updateBrandSettingsSchema } from "@/utils/schemas/brand";

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const settings = await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, organizationId),
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching brand settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const validationResult = updateBrandSettingsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const existing = await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, organizationId),
    });

    if (existing) {
      await db
        .update(brandSettings)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(brandSettings.organizationId, organizationId));
    } else {
      await db.insert(brandSettings).values({
        id: crypto.randomUUID(),
        organizationId,
        ...data,
      });
    }

    const updated = await db.query.brandSettings.findFirst({
      where: eq(brandSettings.organizationId, organizationId),
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error("Error updating brand settings:", error);
    return NextResponse.json(
      { error: "Failed to update brand settings" },
      { status: 500 }
    );
  }
}
