import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  configureOutput,
  getRepositoryById,
  validateUserOrgAccess,
} from "@/lib/services/github-integration";
import {
  configureOutputBodySchema,
  repositoryIdParamSchema,
} from "@/utils/schemas/integrations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  try {
    const session = await getServerSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paramsData = await params;
    const paramValidation = repositoryIdParamSchema.safeParse(paramsData);

    if (!paramValidation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: paramValidation.error.issues,
        },
        { status: 400 }
      );
    }

    const { repositoryId } = paramValidation.data;
    const repository = await getRepositoryById(repositoryId);

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 }
      );
    }

    const hasAccess = await validateUserOrgAccess(
      session.user.id,
      repository.integration.organizationId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
