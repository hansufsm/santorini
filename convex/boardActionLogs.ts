import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./_lib";

export const list = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sessionToken, limit }) => {
    const caller = await requireRole(ctx.db, sessionToken, "sysadmin");
    if (caller.role !== "sysadmin") {
      throw new Error("Apenas Sysadmin pode acessar os registros de ações da Diretoria.");
    }

    const safeLimit = Math.min(Math.max(limit ?? 100, 1), 500);
    const logs = await ctx.db
      .query("boardActionLogs")
      .withIndex("by_created_at")
      .order("desc")
      .take(safeLimit);

    return logs.map((log: any) => ({
      _id: log._id,
      actorUserId: log.actorUserId,
      actorName: log.actorName,
      actorRole: log.actorRole,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      entityLabel: log.entityLabel,
      summary: log.summary,
      before: log.before,
      after: log.after,
      createdAt: log.createdAt,
    }));
  },
});
