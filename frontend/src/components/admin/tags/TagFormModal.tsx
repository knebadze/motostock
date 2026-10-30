"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { Toggle } from "@/components/shared/Toggle";
import { createTag, updateTag, type Tag } from "@/lib/api/tags";
import { ApiRequestError } from "@/lib/api/client";

export function TagFormModal({
  open,
  onClose,
  onSaved,
  tag,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  tag: Tag | null;
}) {
  const isEditing = tag !== null;
  const [name, setName] = useState(tag?.name ?? "");
  const [description, setDescription] = useState(tag?.description ?? "");
  const [isActive, setIsActive] = useState(tag?.isActive ?? true);
  const [nameError, setNameError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setNameError("სახელი უნდა იყოს 2–60 სიმბოლო");
      return;
    }
    setNameError(undefined);
    setLoading(true);
    try {
      const input = { name: trimmed, description: description.trim() || null, isActive };
      if (isEditing) await updateTag(tag.id, input);
      else await createTag(input);
      toast.success(isEditing ? "ტეგი განახლდა" : "ტეგი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "ტეგის რედაქტირება" : "ახალი ტეგი"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tag-name" className="text-sm font-medium">
            სახელი *
          </label>
          <input
            id="tag-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="მაგ. ზეთის შეცვლა"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={nameError} />
          <p className="text-xs text-muted-foreground">
            ტეგი კომპლექტს ან დანიშნულებას აღნიშნავს და არა პროდუქტის ტიპს — „ერთად შეძენაში&rdquo;
            ერთმანეთს შესთავაზებს იმ პროდუქტებს, რომლებსაც საერთო ტეგი აქვთ და სხვადასხვა კატეგორიაში
            არიან (მაგ. ძრავის ზეთი + ზეთის ფილტრი).
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="tag-description" className="text-sm font-medium">
            აღწერა
          </label>
          <textarea
            id="tag-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={300}
            rows={2}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-medium">აქტიური</p>
            <p className="mt-1 text-xs text-muted-foreground">
              გამორთული ტეგი პროდუქტებზე რჩება, მაგრამ რეკომენდაციებში არ მონაწილეობს.
            </p>
          </div>
          <Toggle checked={isActive} onChange={setIsActive} label="აქტიური" />
        </div>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
