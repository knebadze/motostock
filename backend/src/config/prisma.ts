import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/index.js";
import { env } from "./env.js";
import { logger } from "../lib/logger.js";

// Constructed explicitly (rather than handing @prisma/adapter-pg a bare
// connection string) purely so the pool itself is observable — pg.Pool's
// undocumented-by-Prisma default is `max: 10`, otherwise silent. A query
// stuck with `waitingCount > 0` means every connection is already checked
// out — the exact signature of a connection leak (something acquiring a
// client and never releasing it back), as opposed to an ordinary slow query.
export const pool = new Pool({ connectionString: env.DATABASE_URL });

setInterval(() => {
  if (pool.waitingCount > 0) {
    logger.warn(
      { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
      "Postgres pool exhausted: queries waiting for a free connection",
    );
  }
}, 2000).unref();

// disposeExternalPool: true — without it, an externally-supplied Pool is
// left running on prisma.$disconnect() (adapter-pg only detaches its own
// error listener in that case), which would silently defeat server.ts's
// graceful-shutdown drain.
const adapter = new PrismaPg(pool, { disposeExternalPool: true });

export const prisma = new PrismaClient({ adapter });
