"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { LocalizedNameFields } from "@/components/shared/LocalizedNameFields";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { Toggle } from "@/components/shared/Toggle";
import { createBank, updateBank, uploadBankLogo, type Bank } from "@/lib/api/banks";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import { bankFormSchema } from "@/lib/validation/banks";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function BankFormModal({
  open,
  onClose,
  onSaved,
  bank,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  bank: Bank | null;
}) {
  const isEditing = bank !== null;

  const [key, setKey] = useState(bank?.key ?? "");
  const [nameKa, setNameKa] = useState(bank?.name.ka ?? "");
  const [nameEn, setNameEn] = useState(bank?.name.en ?? "");
  const [nameRu, setNameRu] = useState(bank?.name.ru ?? "");
  const [isActive, setIsActive] = useState(bank?.isActive ?? true);
  const [supportsInstallment, setSupportsInstallment] = useState(bank?.supportsInstallment ?? false);
  const [supportsSplitPayment, setSupportsSplitPayment] = useState(bank?.supportsSplitPayment ?? false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(resolveMediaUrl(bank?.logoUrl ?? null));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = bankFormSchema.safeParse({
      key,
      name: { ka: nameKa, en: nameEn, ru: nameRu },
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
        key: key.trim(),
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        isActive,
        supportsInstallment,
        supportsSplitPayment,
      };

      const saved = isEditing ? await updateBank(bank.id, input) : await createBank(input);

      if (logoFile) {
        try {
          await uploadBankLogo(saved.id, logoFile);
        } catch {
          toast.error("ბანკი შენახულია, მაგრამ ლოგოს ატვირთვა ვერ მოხერხდა");
          onSaved();
          onClose();
          return;
        }
      }

      toast.success(isEditing ? "ბანკი განახლდა" : "ბანკი დაემატა");
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
    <Modal open={open} onClose={onClose} title={isEditing ? "ბანკის რედაქტირება" : "ახალი ბანკი"} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bank-key" className="text-sm font-medium">
            იდენტიფიკატორი *
          </label>
          <input
            id="bank-key"
            value={key}
            onChange={(event) => setKey(event.target.value.toUpperCase())}
            placeholder="TBC"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            მხოლოდ დიდი ლათინური ასოები/ციფრები/ხაზი (_) — მაგ. TBC, BOG, LIBERTY. მხოლოდ შიდა
            გამოსაყენებელია, მომხმარებელს არ უჩანს.
          </p>
          <FieldError message={errors.key} />
        </div>

        <LocalizedNameFields
          idPrefix="bank-name"
          value={{ ka: nameKa, en: nameEn, ru: nameRu }}
          onChange={(next) => {
            setNameKa(next.ka);
            setNameEn(next.en);
            setNameRu(next.ru);
          }}
          errors={{ ka: errors["name.ka"], en: errors["name.en"], ru: errors["name.ru"] }}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bank-logo" className="text-sm font-medium">
            ლოგო
          </label>
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-16 w-auto rounded-lg border border-border object-contain p-1" />
          )}
          <input
            id="bank-logo"
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-border"
          />
          <p className="text-xs text-muted-foreground">
            რეკომენდებული ზომა 240×120px (გამჭვირვალე PNG)
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-medium">მომავალში დაგეგმილი გადახდის ტიპები</p>
            <p className="text-xs text-muted-foreground">
              ინფორმაციულია — განვადებისა და ნაწილ-ნაწილ გადახდის რეალური ლოგიკა ჯერ არ არის
              ჩართული, ეს მხოლოდ აღნიშნავს, რომელი ბანკი მხარს დაუჭერს, როცა დაინერგება.
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Toggle checked={supportsInstallment} onChange={setSupportsInstallment} />
            განვადება
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <Toggle checked={supportsSplitPayment} onChange={setSupportsSplitPayment} />
            ნაწილ-ნაწილ გადახდა
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <Toggle checked={isActive} onChange={setIsActive} />
          აქტიურია (მომხმარებელს შეუძლია checkout-ზე აირჩიოს)
        </label>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
