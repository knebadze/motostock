"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { updateTerms, type Terms } from "@/lib/api/terms";
import { ApiRequestError } from "@/lib/api/client";

export function TermsManager({ initialTerms }: { initialTerms: Terms }) {
  const [contentKa, setContentKa] = useState(initialTerms.content.ka);
  const [contentEn, setContentEn] = useState(initialTerms.content.en);
  const [contentRu, setContentRu] = useState(initialTerms.content.ru);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    try {
      await updateTerms({
        content: { ka: contentKa, en: contentEn, ru: contentRu },
      });
      toast.success("წესები და პირობები განახლდა");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">წესები და პირობები</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ეს ტექსტი გამოჩნდება საიტის საჯარო „წესები და პირობები” გვერდზე.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">ტექსტი (ქართულად)</label>
          <RichTextEditor value={contentKa} onChange={setContentKa} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">ტექსტი (ინგლისურად)</label>
          <RichTextEditor value={contentEn} onChange={setContentEn} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">ტექსტი (რუსულად)</label>
          <RichTextEditor value={contentRu} onChange={setContentRu} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "ინახება..." : "შენახვა"}
        </button>
      </form>
    </div>
  );
}
