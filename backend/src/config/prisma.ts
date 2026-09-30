import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/index.js";
import { env } from "./env.js";
import { logger } from "../lib/logger.js";

// Constructed explicitly (rather than handing @prisma/adapter-pg a bare
// connection string) so the pool itself is both observable and tunable —
// pg.Pool's undocumented-by-Prisma default is `max: 10`, otherwise silent.
// Raised to 30: a single storefront page load (homepage's hero+sections
// fan-out, or a category page's parallel product/facet/filter calls) can
// already need 10-15 concurrent connections on its own, so the old default
// left barely any headroom for more than one visitor at a time before
// queries start queuing. A query stuck with `waitingCount > 0` means every
// connection is already checked out — the exact signature of a connection
// leak (something acquiring a client and never releasing it back), as
// opposed to an ordinary slow query; the monitor below watches for that
// regardless of how high `max` is set.
export const pool = new Pool({ connectionString: env.DATABASE_URL, max: 30 });

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
