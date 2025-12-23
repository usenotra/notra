import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  getOutputById,
  toggleOutput,
  validateUserOrgAccess,
} from "@/lib/services/github-integration";
import {
  outputIdParamSchema,
  updateOutputBodySchema,
} from "@/utils/schemas/integrations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ outputId: string }> }
) {
  try {
    const { session, user } = await getServerSession({
      headers: request.headers,
    });

    if (!(user && session?.activeOrganizationId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paramsData = await params;
    const paramValidation = outputIdParamSchema.safeParse(paramsData);

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { outputId } = paramValidation.data;
    const output = await getOutputById(outputId);

    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    const hasAccess = await validateUserOrgAccess(
      user.id,
      output.repository.integration.organizationId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const bodyValidation = updateOutputBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: bodyValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { enabled } = bodyValidation.data;
    const updated = await toggleOutput(outputId, enabled);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating output:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
