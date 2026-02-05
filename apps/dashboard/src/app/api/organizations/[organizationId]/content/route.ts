import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import { and, desc, eq, gte, type InferSelectModel, lt, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { withOrganizationAuth } from "@/lib/auth/organization";

type Post = InferSelectModel<typeof posts>;

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

interface RouteContext {
  params: Promise<{ organizationId: string }>;
}

interface CursorData {
  createdAt: string;
  id: string;
}

function encodeCursor(createdAt: Date, id: string): string {
  const data: CursorData = { createdAt: createdAt.toISOString(), id };
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    return JSON.parse(decoded) as CursorData;
  } catch {
    return null;
  }
}

function getDateRange(dateParam: string | null): {
  startDate: Date;
  endDate: Date;
} | null {
  if (!dateParam) return null;

  const baseDate = dateParam === "today" ? new Date() : new Date(dateParam);

  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const startDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate()
  );
  const endDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + 1
  );

  return { startDate, endDate };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { organizationId } = await params;
    const auth = await withOrganizationAuth(request, organizationId);

    if (!auth.success) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const dateParam = searchParams.get("date");
    const parsedLimit = limitParam
      ? Number.parseInt(limitParam, 10)
      : DEFAULT_LIMIT;
    const limit = Number.isNaN(parsedLimit)
      ? DEFAULT_LIMIT
      : Math.min(Math.max(1, parsedLimit), MAX_LIMIT);

    const dateRange = getDateRange(dateParam);

    if (dateParam && !dateRange) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const baseFilters = [eq(posts.organizationId, organizationId)];
    if (dateRange) {
      baseFilters.push(
        gte(posts.createdAt, dateRange.startDate),
        lt(posts.createdAt, dateRange.endDate)
      );
    }

    let results: Post[];

    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (!cursorData) {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }

      const cursorDate = new Date(cursorData.createdAt);

      if (Number.isNaN(cursorDate.getTime())) {
        return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
      }

      // Use compound cursor: items with earlier timestamp OR same timestamp with lexicographically smaller id
      results = await db.query.posts.findMany({
        where: and(
          ...baseFilters,
          or(
            lt(posts.createdAt, cursorDate),
            and(eq(posts.createdAt, cursorDate), lt(posts.id, cursorData.id))
          )
        ),
        orderBy: [desc(posts.createdAt), desc(posts.id)],
        limit: limit + 1,
      });
    } else {
      results = await db.query.posts.findMany({
        where: and(...baseFilters),
        orderBy: [desc(posts.createdAt), desc(posts.id)],
        limit: limit + 1,
      });
    }

    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    const lastItem = items.at(-1);
    const nextCursor =
      hasMore && lastItem
        ? encodeCursor(lastItem.createdAt, lastItem.id)
        : null;

    return NextResponse.json({
      posts: items.map((post) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        markdown: post.markdown,
        contentType: post.contentType,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      nextCursor,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
