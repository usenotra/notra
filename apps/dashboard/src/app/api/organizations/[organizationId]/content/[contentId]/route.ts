import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, eq } from "drizzle-orm";
import { marked } from "marked";
import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";
import { updateContentSchema } from "@/utils/schemas/content";

const TITLE_REGEX = /^#\s+(.+)$/m;

interface RouteContext {
  params: Promise<{ organizationId: string; contentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, contentId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const post = await db.query.posts.findFirst({
      where: and(
        eq(posts.id, contentId),
        eq(posts.organizationId, organizationId)
      ),
    });

    if (!post) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({
      content: {
        id: post.id,
        title: post.title,
        content: post.content,
        markdown: post.markdown,
        contentType: post.contentType,
        date: post.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId, contentId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const body = await request.json();
    const validationResult = updateContentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }
    const { markdown } = validationResult.data;

    if (typeof markdown !== "string") {
      return NextResponse.json(
        { error: "markdown field is required" },
        { status: 400 }
      );
    }

    const existingPost = await db.query.posts.findFirst({
      where: and(
        eq(posts.id, contentId),
        eq(posts.organizationId, organizationId)
      ),
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const titleMatch = markdown.match(TITLE_REGEX);
    const newTitle = titleMatch?.[1] ?? existingPost.title;

    const newContent = await marked.parse(markdown);

    const [updatedPost] = await db
      .update(posts)
      .set({
        markdown,
        title: newTitle,
        content: newContent,
        updatedAt: new Date(),
      })
      .where(
        and(eq(posts.id, contentId), eq(posts.organizationId, organizationId))
      )
      .returning();

    if (!updatedPost) {
      return NextResponse.json(
        { error: "Failed to update content" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content: {
        id: updatedPost.id,
        title: updatedPost.title,
        content: updatedPost.content,
        markdown: updatedPost.markdown,
        contentType: updatedPost.contentType,
        date: updatedPost.createdAt.toISOString(),
      },
    });
  } catch (_e) {
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 500 }
    );
  }
}
