"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";
import { Toggle } from "@/components/shared/Toggle";
import { ApiRequestError } from "@/lib/api/client";
import { getMonitoringStatus, sendSentryTestEvent, type MonitoringStatus, type Settings } from "@/lib/api/settings";
import { SENTRY_DSN } from "@/lib/sentry-shared";

function StatusRow({ ok, label, hint }: { ok: boolean | null; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={ok == null ? "text-muted-foreground" : ok ? "text-green-600" : "text-amber-600"}>
        {ok == null ? "…" : ok ? "✓" : "✗"}
      </span>
      <div>
        <p className="font-medium text-foreground">{label}</p>
        {ok === false && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

// Sentry error monitoring. The keys themselves live in environment variables
// (backend SENTRY_DSN, frontend NEXT_PUBLIC_SENTRY_DSN at build time) — this
// tab only switches reporting on/off and shows whether those keys exist.
// Alert emails come from Sentry itself, to the Sentry account's members.
export function MonitoringSettingsTab({
  settings,
  saving,
  onSave,
}: {
  settings: Settings;
  saving: boolean;
  onSave: (next: Settings) => Promise<void>;
}) {
  const [status, setStatus] = useState<MonitoringStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const frontendConfigured = Boolean(SENTRY_DSN);

  useEffect(() => {
    getMonitoringStatus()
      .then(setStatus)
      .catch(() => toast.error("მონიტორინგის სტატუსის ჩატვირთვა ვერ მოხერხდა"));
  }, []);

  const anyConfigured = frontendConfigured || status?.sentryConfigured === true;

  async function handleTest() {
    setTesting(true);
    try {
      await sendSentryTestEvent();
      if (frontendConfigured) {
        Sentry.captureException(new Error("Motostock Sentry test event (browser, sent from admin settings)"));
      }
      toast.success(
        settings.sentryEnabled
          ? "სატესტო შეცდომა გაიგზავნა — რამდენიმე წამში გამოჩნდება Sentry-ში"
          : "სატესტო შეცდომა გაიგზავნა, მაგრამ მონიტორინგი გამორთულია — Sentry-ში არ გამოჩნდება",
      );
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "სატესტო შეცდომის გაგზავნა ვერ მოხერხდა");
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">შეცდომების მონიტორინგი (Sentry)</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ჩართვის შემთხვევაში სერვერის და მომხმარებლების ბრაუზერის შეცდომები იგზავნება Sentry-ში. პირადი
              მონაცემები (პაროლი, cookie, ტელეფონი, ელფოსტა, მისამართი) არ იგზავნება. გამორთვა მოქმედებს
              მაშინვე, გადატვირთვის გარეშე.
            </p>
          </div>
          <Toggle
            checked={settings.sentryEnabled}
            onChange={(next) => onSave({ ...settings, sentryEnabled: next })}
            disabled={saving || !status?.sentryConfigured}
            label="შეცდომების მონიტორინგი (Sentry)"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border p-5">
        <p className="font-medium text-foreground">კონფიგურაცია</p>
        <div className="mt-3 flex flex-col gap-3">
          <StatusRow
            ok={status ? status.sentryConfigured : null}
            label="სერვერი (backend)"
            hint="სერვერის გარემოს ცვლადებში არ არის SENTRY_DSN — ჩართვა შეუძლებელია, სანამ არ დაემატება."
          />
          <StatusRow
            ok={frontendConfigured}
            label="ვებსაიტი (ბრაუზერი)"
            hint="NEXT_PUBLIC_SENTRY_DSN არ იყო მითითებული frontend-ის build-ის დროს — ბრაუზერის შეცდომები არ დაიჭირება."
          />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          შეტყობინებები ელფოსტაზე მოდის თავად Sentry-დან — იმ მისამართებზე, რომლებიც Sentry-ის ანგარიშის წევრები
          არიან (sentry.io → Alerts).
        </p>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !anyConfigured}
          className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text disabled:opacity-50"
        >
          {testing ? "იგზავნება..." : "სატესტო შეცდომის გაგზავნა"}
        </button>
      </div>
    </>
  );
}
