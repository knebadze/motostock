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

// `bank.credentials` from the API is already masked (see banks.service.ts's
// toResponse) — existing rows start with an empty `value` on purpose, never
// the mask string, so leaving a row untouched can never resubmit the mask
// as if it were real. `markedForDeletion` lets an existing row be flagged
// for removal without losing track of which key needs an explicit
// delete-signal sent to the backend (see handleSubmit).
type CredentialRow = { key: string; value: string; isExisting: boolean; markedForDeletion: boolean };

function credentialsToRows(credentials: Record<string, string> | null): CredentialRow[] {
  return credentials
    ? Object.keys(credentials).map((key) => ({ key, value: "", isExisting: true, markedForDeletion: false }))
    : [];
}

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
  const [credentialRows, setCredentialRows] = useState<CredentialRow[]>(
    credentialsToRows(bank?.credentials ?? null),
  );
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

  function handleCredentialRowChange(index: number, field: "key" | "value", value: string) {
    setCredentialRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function addCredentialRow() {
    setCredentialRows((current) => [
      ...current,
      { key: "", value: "", isExisting: false, markedForDeletion: false },
    ]);
  }

  // An existing row toggles a "delete on save" flag (still needs to reach
  // the backend as an explicit delete signal); a freshly-added row that was
  // never saved just disappears — there's nothing server-side to tell.
  function removeCredentialRow(index: number) {
    setCredentialRows((current) => {
      const row = current[index];
      if (row.isExisting) {
        return current.map((r, i) => (i === index ? { ...r, markedForDeletion: !r.markedForDeletion } : r));
      }
      return current.filter((_, i) => i !== index);
    });
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
      // A deleted existing row sends "" (the backend's delete signal, see
      // banks.service.ts's mergeCredentials); an untouched existing row
      // (blank value, not marked for deletion) is omitted entirely so it
      // stays whatever it already was — never resent as the mask.
      const credentials = credentialRows.reduce<Record<string, string>>((acc, row) => {
        const trimmedKey = row.key.trim();
        if (!trimmedKey) return acc;
        if (row.markedForDeletion) {
          acc[trimmedKey] = "";
        } else if (row.value !== "") {
          acc[trimmedKey] = row.value;
        }
        return acc;
      }, {});
      const hasCredentialEdits = Object.keys(credentials).length > 0;

      const input = {
        key: key.trim(),
        name: { ka: nameKa.trim(), en: nameEn.trim(), ru: nameRu.trim() },
        isActive,
        supportsInstallment,
        supportsSplitPayment,
        // Editing: omit the field entirely when nothing changed, so the
        // backend's merge leaves existing credentials alone. Creating:
        // there's nothing to merge with, so send null explicitly when empty.
        credentials: hasCredentialEdits ? credentials : isEditing ? undefined : null,
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

        <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">API ქრედენშიალები</p>
              <p className="text-xs text-muted-foreground">
                შეივსება მოგვიანებით, როცა ბანკის რეალური ინტეგრაცია დაინერგება (მაგ. merchant
                id, API key/secret).
              </p>
            </div>
            <button
              type="button"
              onClick={addCredentialRow}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              + ველის დამატება
            </button>
          </div>

          {credentialRows.length > 0 && (
            <div className="flex flex-col gap-2">
              {credentialRows.map((row, index) => (
                <div key={index} className={`flex items-center gap-2 ${row.markedForDeletion ? "opacity-50" : ""}`}>
                  {row.isExisting ? (
                    <span className="w-1/3 truncate rounded-lg border border-border bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                      {row.key}
                    </span>
                  ) : (
                    <input
                      value={row.key}
                      onChange={(event) => handleCredentialRowChange(index, "key", event.target.value)}
                      placeholder="მაგ. merchantId"
                      className="w-1/3 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                    />
                  )}
                  <input
                    value={row.value}
                    onChange={(event) => handleCredentialRowChange(index, "value", event.target.value)}
                    disabled={row.markedForDeletion}
                    placeholder={
                      row.markedForDeletion
                        ? "წაიშლება შენახვისას"
                        : row.isExisting
                          ? "•••••••• — დატოვეთ ცარიელი უცვლელად დასატოვებლად"
                          : "მნიშვნელობა"
                    }
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => removeCredentialRow(index)}
                    aria-label={row.markedForDeletion ? "წაშლის გაუქმება" : "ველის წაშლა"}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted ${
                      row.markedForDeletion ? "text-primary" : "text-muted-foreground hover:text-red-600"
                    }`}
                  >
                    {row.markedForDeletion ? "↺" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )}
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
