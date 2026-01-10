import { v } from "convex/values";
import { query } from "./_generated/server";

export const list = query({
  args: {
    organizationId: v.string(),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    const logs = await ctx.db
      .query("webhookLogs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .collect();

    const totalCount = logs.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedLogs = logs.slice(skip, skip + pageSize);

    return {
      logs: paginatedLogs.map((log) => ({
        id: log._id,
        organizationId: log.organizationId,
        status: log.status,
        method: log.method,
        path: log.path,
        payload: log.payload,
        response: log.response,
        createdAt: new Date(log._creationTime).toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  },
});
