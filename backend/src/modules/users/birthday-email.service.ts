import { prisma } from "../../config/prisma.js";
import { toTbilisiDateOnly } from "../../lib/tbilisi-dates.js";
import { sendEmailTemplate } from "../email-templates/email-templates.service.js";
import { usersRepository } from "./users.repository.js";

const JOB_KEY = "BIRTHDAY_EMAIL" as const;

// The scheduled-jobs runner (server.ts) fires every registry job once
// immediately at process boot, in addition to the shared 03:00 Tbilisi cron
// — without this guard, a redeploy landing on someone's birthday would send
// them a second congratulation that day. Reuses the existing ScheduledJobRun
// audit trail instead of a new column: if a SUCCESS row for this job already
// exists with a Tbilisi startedAt of today, this run is a no-op. The current
// run's own row (created RUNNING before this function is called — see
// scheduled-jobs.service.ts's runScheduledJob) is still RUNNING at this
// point, so it can never match itself.
async function alreadyRanToday(todayTbilisi: string): Promise<boolean> {
  const lastSuccess = await prisma.scheduledJobRun.findFirst({
    where: { jobKey: JOB_KEY, status: "SUCCESS" },
    orderBy: { startedAt: "desc" },
  });
  return lastSuccess != null && toTbilisiDateOnly(lastSuccess.startedAt) === todayTbilisi;
}

export async function sendBirthdayEmails(): Promise<{ sentCount: number; skipped: boolean }> {
  const todayTbilisi = toTbilisiDateOnly(new Date());
  if (await alreadyRanToday(todayTbilisi)) {
    return { sentCount: 0, skipped: true };
  }

  const [, monthStr, dayStr] = todayTbilisi.split("-");
  const users = await usersRepository.findUsersWithBirthdayToday(Number(monthStr), Number(dayStr));

  for (const user of users) {
    await sendEmailTemplate("BIRTHDAY", user.email, {
      customerName: `${user.firstName} ${user.lastName}`.trim(),
    });
  }

  return { sentCount: users.length, skipped: false };
}
