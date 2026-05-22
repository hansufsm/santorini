import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const roleValidator = v.union(
  v.literal("sysadmin"),
  v.literal("admin"),
  v.literal("viewer")
);

// ─── AUTENTICAR ───────────────────────────────────────────────────────────────
// Recebe e-mail e hash SHA-256 da senha; retorna dados públicos do usuário ou null.
export const authenticate = query({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user || !user.active) return null;
    if (user.passwordHash !== args.passwordHash) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },
});

// ─── LISTAR USUÁRIOS (sem hash) ────────────────────────────────────────────────
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  },
});

// ─── CRIAR USUÁRIO ────────────────────────────────────────────────────────────
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existing) throw new Error("E-mail já cadastrado");
    const now = Date.now();
    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      role: args.role,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── ATUALIZAR USUÁRIO ────────────────────────────────────────────────────────
export const updateUser = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    role: v.optional(roleValidator),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (fields.name       !== undefined) patch.name         = fields.name;
    if (fields.passwordHash !== undefined) patch.passwordHash = fields.passwordHash;
    if (fields.role       !== undefined) patch.role         = fields.role;
    if (fields.active     !== undefined) patch.active       = fields.active;
    await ctx.db.patch(id, patch);
  },
});

// ─── EXCLUIR USUÁRIO ──────────────────────────────────────────────────────────
export const deleteUser = mutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── SEED SYSADMIN ────────────────────────────────────────────────────────────
// Idempotente: cria o primeiro sysadmin apenas se nenhum existir ainda.
export const seedSysAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "sysadmin"))
      .first();
    if (existing) return { created: false, message: "Sysadmin já existe" };
    const now = Date.now();
    const id = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      passwordHash: args.passwordHash,
      role: "sysadmin",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    return { created: true, id };
  },
});
