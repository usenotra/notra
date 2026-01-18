import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import {
  configureOutput,
  getRepositoryById,
} from "@/lib/services/github-integration";
import {
  configureOutputBodySchema,
  repositoryIdParamSchema,
} from "@/utils/schemas/integrations";

interface RouteContext {
  params: Promise<{ organizationId: string; repositoryId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, repositoryId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const paramValidation = repositoryIdParamSchema.safeParse({ repositoryId });

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const repository = await getRepositoryById(repositoryId);

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    if (repository.integration.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const bodyValidation = configureOutputBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: bodyValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { outputType, enabled, config } = bodyValidation.data;

    const output = await configureOutput({
      repositoryId,
      outputType,
      enabled,
      config,
    });

    return NextResponse.json(output);
  } catch (error) {
    console.error("Error configuring output:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
