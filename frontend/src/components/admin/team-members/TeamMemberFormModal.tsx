"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { Select } from "@/components/shared/Select";
import { Toggle } from "@/components/shared/Toggle";
import {
  createTeamMember,
  updateTeamMember,
  uploadTeamMemberImage,
  type TeamMember,
} from "@/lib/api/team-members";
import type { LookupItem } from "@/lib/api/lookups";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { TEAM_MEMBER_NAME_MAX_LENGTH, teamMemberFormSchema } from "@/lib/validation/team-members";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

function CharCount({ value, max }: { value: string; max: number }) {
  const isNearLimit = value.length > max * 0.9;
  return (
    <span className={`text-xs ${isNearLimit ? "text-amber-600" : "text-muted-foreground"}`}>
      {value.length}/{max}
    </span>
  );
}

export function TeamMemberFormModal({
  open,
  onClose,
  onSaved,
  member,
  positions,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  member: TeamMember | null;
  positions: LookupItem[];
}) {
  const isEditing = member !== null;

  const [nameKa, setNameKa] = useState(member?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(member?.name.en ?? "");
  const [nameRu, setNameRu] = useState(member?.name.ru ?? "");
  const [positionId, setPositionId] = useState(member ? String(member.positionId) : "");
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveMediaUrl(member?.imageUrl ?? null));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const positionOptions = positions.map((position) => ({
    value: String(position.id),
    label: position.nameKa,
  }));

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = teamMemberFormSchema.safeParse({
      name: { ka: nameKa, en: nameEn, ru: nameRu },
      positionId,
    });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      toast.error("გთხოვთ შეასწოროთ ველები");
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const input = {
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        positionId: Number(positionId),
        isActive,
      };

      const saved = isEditing ? await updateTeamMember(member.id, input) : await createTeamMember(input);

      if (imageFile) {
        try {
          await uploadTeamMemberImage(saved.id, imageFile);
        } catch {
          toast.error("წევრი შენახულია, მაგრამ სურათის ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "წევრი განახლდა" : "წევრი დაემატა");
      onSaved();
      onClose();
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "შენახვა ვერ მოხერხდა";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "წევრის რედაქტირება" : "ახალი წევრი"} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="team-name-ka" className="text-sm font-medium">
                სახელი (ქართულად) *
              </label>
              <CharCount value={nameKa} max={TEAM_MEMBER_NAME_MAX_LENGTH} />
            </div>
            <input
              id="team-name-ka"
              value={nameKa}
              maxLength={TEAM_MEMBER_NAME_MAX_LENGTH}
              onChange={(event) => setNameKa(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["name.ka"]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="team-name-en" className="text-sm font-medium">
                სახელი (ინგლისურად) *
              </label>
              <CharCount value={nameEn} max={TEAM_MEMBER_NAME_MAX_LENGTH} />
            </div>
            <input
              id="team-name-en"
              value={nameEn}
              maxLength={TEAM_MEMBER_NAME_MAX_LENGTH}
              onChange={(event) => setNameEn(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["name.en"]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="team-name-ru" className="text-sm font-medium">
                სახელი (რუსულად) *
              </label>
              <CharCount value={nameRu} max={TEAM_MEMBER_NAME_MAX_LENGTH} />
            </div>
            <input
              id="team-name-ru"
              value={nameRu}
              maxLength={TEAM_MEMBER_NAME_MAX_LENGTH}
              onChange={(event) => setNameRu(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["name.ru"]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="team-position" className="text-sm font-medium">
              თანამდებობა *
            </label>
            <Select
              id="team-position"
              options={positionOptions}
              value={positionId}
              onChange={setPositionId}
              searchable
              placeholder="აირჩიეთ თანამდებობა"
            />
            <FieldError message={errors.positionId} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="team-image" className="text-sm font-medium">
            ფოტო
          </label>
          <p className="text-xs text-muted-foreground">
            რეკომენდებული ზომა: 600×600px (კვადრატული), მაქს. 5MB, ფორმატი: jpg/png/webp.
          </p>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="size-32 rounded-full border border-border object-cover" />
          )}
          <input
            id="team-image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <Toggle checked={isActive} onChange={setIsActive} />
          აქტიურია
        </label>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
