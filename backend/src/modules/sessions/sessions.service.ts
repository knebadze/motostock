import { ApiError } from "../../lib/ApiError.js";
import { resolvePage } from "../../lib/pagination.js";
import { sessionRepository } from "../auth/session.repository.js";
import type { ListSessionsQuery } from "./sessions.schema.js";

type SessionRow = {
  id: number;
  user: { id: number; firstName: string; lastName: string; email: string };
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
};

function toResponse(row: SessionRow) {
  return {
    id: row.id,
    user: { id: row.user.id, name: `${row.user.firstName} ${row.user.lastName}`, email: row.user.email },
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
  };
}

// Admin "active sessions" list — see session.prisma's comment for what a
// Session row actually represents (one issued login, revoked by deleting
// the row). Ordered newest-active-first (see session.repository.ts) so a
// genuinely abandoned session sinks to the bottom instead of being mixed in
// with ones still in active use.
export async function listSessions(query: ListSessionsQuery) {
  const { page, pageSize, skip, take } = resolvePage(query);

  const [rows, total] = await Promise.all([
    sessionRepository.findManyForAdmin(query.search, skip, take),
    sessionRepository.countForAdmin(query.search),
  ]);

  return { items: rows.map(toResponse), total, page, pageSize };
}

// Revokes one device/browser's session server-side — the next request that
// token makes gets rejected by resolveAuthenticatedUser's session lookup,
// forcing that device to log in again. Existence-checked (unlike
// session.repository.ts's own delete, which stays a quiet no-op for
// logout's best-effort use) so a double-click in the admin UI surfaces a
// clean 404 instead of silently doing nothing.
export async function revokeSession(id: number) {
  const existing = await sessionRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "სესია ვერ მოიძებნა");
  }
  await sessionRepository.delete(id);
}
