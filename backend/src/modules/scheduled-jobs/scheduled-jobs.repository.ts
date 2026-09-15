import { prisma } from "../../config/prisma.js";
import type { Prisma, ScheduledJobKey, ScheduledJobStatus, ScheduledJobTrigger } from "../../generated/prisma/index.js";

// User has no `name` column (only firstName/lastName) — same reasoning as
// fina-sync.repository.ts's triggeredBySelect/withTriggeredByName.
const triggeredBySelect = { id: true, firstName: true, lastName: true } as const;

function withTriggeredByName<
  T extends { triggeredBy: { id: number; firstName: string; lastName: string } | null },
>(row: T) {
  return {
    ...row,
    triggeredBy: row.triggeredBy
      ? { id: row.triggeredBy.id, name: `${row.triggeredBy.firstName} ${row.triggeredBy.lastName}` }
      : null,
  };
}

export const scheduledJobsRepository = {
  // Written up front, before the job itself runs — see
  // scheduled-jobs.service.ts's runScheduledJob and ScheduledJobStatus's own
  // RUNNING comment.
  async createRunningRun(data: { jobKey: ScheduledJobKey; trigger: ScheduledJobTrigger; triggeredById: number | null }) {
    const row = await prisma.scheduledJobRun.create({
      data: { ...data, status: "RUNNING", finishedAt: null },
      include: { triggeredBy: { select: triggeredBySelect } },
    });
    return withTriggeredByName(row);
  },

  async finishRun(
    id: number,
    data: {
      status: ScheduledJobStatus;
      finishedAt: Date;
      itemsAffected: number | null;
      detail: Prisma.InputJsonValue | undefined;
      errorMessage: string | null;
    },
  ) {
    const row = await prisma.scheduledJobRun.update({
      where: { id },
      data,
      include: { triggeredBy: { select: triggeredBySelect } },
    });
    return withTriggeredByName(row);
  },

  async listRuns(filters: { jobKey?: ScheduledJobKey }, skip: number, take: number) {
    const rows = await prisma.scheduledJobRun.findMany({
      where: filters.jobKey ? { jobKey: filters.jobKey } : undefined,
      orderBy: { startedAt: "desc" },
      skip,
      take,
      include: { triggeredBy: { select: triggeredBySelect } },
    });
    return rows.map(withTriggeredByName);
  },

  count(filters: { jobKey?: ScheduledJobKey }) {
    return prisma.scheduledJobRun.count({
      where: filters.jobKey ? { jobKey: filters.jobKey } : undefined,
    });
  },

  // One findFirst per key rather than a raw DISTINCT ON query — only 5 keys,
  // so the extra round trips are negligible and this stays plain Prisma.
  async findLatestRunPerJob(keys: ScheduledJobKey[]) {
    const rows = await Promise.all(
      keys.map((jobKey) =>
        prisma.scheduledJobRun.findFirst({
          where: { jobKey },
          orderBy: { startedAt: "desc" },
          include: { triggeredBy: { select: triggeredBySelect } },
        }),
      ),
    );
    const byKey = new Map<ScheduledJobKey, ReturnType<typeof withTriggeredByName> | null>();
    keys.forEach((key, index) => {
      const row = rows[index];
      byKey.set(key, row ? withTriggeredByName(row) : null);
    });
    return byKey;
  },
};
