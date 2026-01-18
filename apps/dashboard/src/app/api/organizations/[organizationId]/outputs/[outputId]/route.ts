import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { getOutputById, toggleOutput } from "@/lib/services/github-integration";
import {
  outputIdParamSchema,
  updateOutputBodySchema,
} from "@/utils/schemas/integrations";

interface RouteContext {
  params: Promise<{ organizationId: string; outputId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, outputId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const paramValidation = outputIdParamSchema.safeParse({ outputId });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const output = await getOutputById(outputId);

    if (!output) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
    }

    if (output.repository.integration.organizationId !== organizationId) {
      return NextResponse.json({ error: "Output not found" }, { status: 404 });
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
