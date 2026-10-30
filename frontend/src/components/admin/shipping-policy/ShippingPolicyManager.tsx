"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { updateShippingPolicy, type ShippingPolicy } from "@/lib/api/shipping-policy";
import { ApiRequestError } from "@/lib/api/client";
import { revalidatePublicCache } from "@/lib/api/revalidate";

export function ShippingPolicyManager({ initialShippingPolicy }: { initialShippingPolicy: ShippingPolicy }) {
  const [contentKa, setContentKa] = useState(initialShippingPolicy.content.ka);
  const [contentEn, setContentEn] = useState(initialShippingPolicy.content.en);
  const [contentRu, setContentRu] = useState(initialShippingPolicy.content.ru);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setSaving(true);
    try {
      await updateShippingPolicy({
        content: { ka: contentKa, en: contentEn, ru: contentRu },
      });
      await revalidatePublicCache("shipping-policy");
      toast.success("მიწოდება და დაბრუნება განახლდა");
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">მიწოდება და დაბრუნება</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        ეს ტექსტი გამოჩნდება საიტის საჯარო „მიწოდება და დაბრუნება” გვერდზე.
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
