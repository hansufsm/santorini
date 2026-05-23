/**
 * _lib.ts — Helpers internos compartilhados entre módulos Convex
 *
 * Prefixo _ = arquivo de helper (não expõe funções públicas no Convex).
 * Importe daqui em vez de importar de auth.ts para evitar que auth.ts
 * seja tratado como módulo de helper em vez de módulo de funções.
 */

// Hierarquia de papéis (índice maior = mais permissões)
export const ROLE_HIERARCHY = ["morador", "associado", "diretoria", "sysadmin"] as const;
export type Role = (typeof ROLE_HIERARCHY)[number];

/**
 * Usuários criados antes da introdução de `status` usam o campo legado
 * `active: boolean`. Durante a migração, tratamos `active: true` como
 * `status: "ativo"` para que o deploy não bloqueie o login do sysadmin.
 */
export function getEffectiveUserStatus(user: any): "ativo" | "inativo" {
  if (user.status === "ativo" || user.status === "inativo") {
    return user.status;
  }
  return user.active === true ? "ativo" : "inativo";
}

export function isUserActive(user: any): boolean {
  return getEffectiveUserStatus(user) === "ativo" && user.deletedAt === undefined;
}

/**
 * Verifica se o sessionToken é válido e se o usuário tem o papel mínimo exigido.
 * Lança erro se a sessão for inválida ou o papel insuficiente.
 * Retorna o usuário autenticado para uso pelo chamador.
 */
export async function requireRole(
  db: any,
  sessionToken: string,
  minRole: Role
) {
  // Buscar sessão pelo token
  const session = await db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Sessão expirada ou inválida. Faça login novamente.");
  }

  // Buscar o usuário da sessão
  const user = await db.get(session.userId);

  if (!user || !isUserActive(user)) {
    throw new Error("Usuário inativo ou não encontrado.");
  }

  // Verificar se o papel do usuário é suficiente
  const userRank = ROLE_HIERARCHY.indexOf(user.role as Role);
  const minRank  = ROLE_HIERARCHY.indexOf(minRole);

  if (userRank < minRank) {
    throw new Error(
      `Permissão insuficiente. Papel atual: ${user.role}. Necessário: ${minRole}.`
    );
  }

  // Retorna o usuário para que o chamador possa usar seus dados (ex: _id, role)
  return user;
}
