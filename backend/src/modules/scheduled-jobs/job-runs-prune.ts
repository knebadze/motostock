import { prisma } from "../../config/prisma.js";
import { startOfDayTbilisi, toTbilisiDateOnly } from "../../lib/tbilisi-dates.js";

// Once a month ends, its successful runs are just noise in the admin's run
// history — deletes every SUCCESS run started before the current Tbilisi
// month. FAILED/RUNNING runs are kept: they're the ones worth looking at.
// Cutoff-based (not "everything SUCCESS"), so the boot-time run every job
// also gets is harmless — it never touches the current month.
export async function pruneSuccessfulJobRuns() {
  const monthStart = startOfDayTbilisi(`${toTbilisiDateOnly(new Date()).slice(0, 7)}-01`);
  const { count } = await prisma.scheduledJobRun.deleteMany({
    where: { status: "SUCCESS", startedAt: { lt: monthStart } },
  });
  return count;
}
