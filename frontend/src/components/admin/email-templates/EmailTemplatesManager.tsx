"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tabs } from "@/components/shared/Tabs";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { updateEmailTemplate, type EmailTemplate } from "@/lib/api/email-templates";
import { ApiRequestError } from "@/lib/api/client";

const TYPE_LABELS: Record<EmailTemplate["key"], string> = {
  ORDER_PLACED: "შეკვეთის მიღება",
  ORDER_CONFIRMED: "დადასტურება",
  ORDER_SHIPPED: "გზაშია",
  ORDER_DELIVERED: "ჩაბარება",
  ORDER_CANCELLED: "გაუქმება",
};

const inputClassName =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function EmailTemplateForm({
  template,
  onSaved,
}: {
  template: EmailTemplate;
  onSaved: (template: EmailTemplate) => void;
}) {
  const [subjectKa, setSubjectKa] = useState(template.subject.ka);
  const [subjectEn, setSubjectEn] = useState(template.subject.en);
  const [subjectRu, setSubjectRu] = useState(template.subject.ru);
  const [bodyKa, setBodyKa] = useState(template.body.ka);
  const [bodyEn, setBodyEn] = useState(template.body.en);
  const [bodyRu, setBodyRu] = useState(template.body.ru);
  const [saving, setSaving] = useState(false);

  const dirty =
    subjectKa !== template.subject.ka ||
    subjectEn !== template.subject.en ||
    subjectRu !== template.subject.ru ||
    bodyKa !== template.body.ka ||
    bodyEn !== template.body.en ||
    bodyRu !== template.body.ru;

  async function handleSave() {
    if (!subjectKa.trim() || !subjectEn.trim() || !subjectRu.trim()) {
      toast.error("სათაური სამივე ენაზეა საჭირო");
      return;
    }
    if (!bodyKa.trim() || !bodyEn.trim() || !bodyRu.trim()) {
      toast.error("ტექსტი სამივე ენაზეა საჭირო");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateEmailTemplate(template.id, {
        subject: { ka: subjectKa.trim(), en: subjectEn.trim(), ru: subjectRu.trim() },
        body: { ka: bodyKa, en: bodyEn, ru: bodyRu },
      });
      onSaved(updated);
      toast.success("შენახულია");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
        ხელმისაწვდომი placeholder-ები: <code>{"{{customerName}}"}</code>, <code>{"{{orderCode}}"}</code>,{" "}
        <code>{"{{total}}"}</code> — ავტომატურად ჩანაცვლდება რეალური მონაცემით გაგზავნისას.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">სათაური (ქართულად)</label>
          <input value={subjectKa} onChange={(event) => setSubjectKa(event.target.value)} className={inputClassName} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">სათაური (ინგლისურად)</label>
          <input value={subjectEn} onChange={(event) => setSubjectEn(event.target.value)} className={inputClassName} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">სათაური (რუსულად)</label>
          <input value={subjectRu} onChange={(event) => setSubjectRu(event.target.value)} className={inputClassName} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">ტექსტი (ქართულად)</label>
        <RichTextEditor value={bodyKa} onChange={setBodyKa} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">ტექსტი (ინგლისურად)</label>
        <RichTextEditor value={bodyEn} onChange={setBodyEn} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">ტექსტი (რუსულად)</label>
        <RichTextEditor value={bodyRu} onChange={setBodyRu} />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving}
        className="self-start rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "ინახება..." : "შენახვა"}
      </button>
    </div>
  );
}

export function EmailTemplatesManager({
  initialTemplates,
}: {
  initialTemplates: EmailTemplate[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);

  function updateOne(updated: EmailTemplate) {
    setTemplates((current) =>
      current.map((template) => (template.id === updated.id ? updated : template)),
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">იმეილის შაბლონები</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ეს ტექსტები ავტომატურად ეგზავნება მომხმარებელს შეკვეთის გაფორმებისა და სტატუსის ცვლილების დროს.
      </p>

      <div className="mt-6">
        <Tabs
          tabs={templates.map((template) => ({
            key: template.key,
            label: TYPE_LABELS[template.key],
            content: <EmailTemplateForm template={template} onSaved={updateOne} />,
          }))}
        />
      </div>
    </div>
  );
}
