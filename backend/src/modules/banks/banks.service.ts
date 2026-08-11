import { ApiError } from "../../lib/ApiError.js";
import { saveUploadedImage } from "../../lib/storage.js";
import { banksRepository } from "./banks.repository.js";
import type { CreateBankInput, ReorderBanksInput, UpdateBankInput } from "./banks.schema.js";

type BankRow = {
  id: number;
  key: string;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  logoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  supportsInstallment: boolean;
  supportsSplitPayment: boolean;
  credentials: unknown;
  createdAt: Date;
  updatedAt: Date;
};

// Never return a real credential value once saved — same "write-only
// secret" convention as a password field. The admin form shows this mask
// per configured key so it knows what's set without the value ever
// leaving the DB again; updateBank below merges new values in by key
// instead of a full replace, precisely so leaving a masked field alone
// doesn't have to mean resubmitting (and thus overwriting with) the mask.
const CREDENTIAL_MASK = "••••••••";

function maskCredentials(credentials: Record<string, string> | null): Record<string, string> | null {
  if (!credentials) return null;
  return Object.fromEntries(Object.keys(credentials).map((key) => [key, CREDENTIAL_MASK]));
}

// Strips blank-value entries (the frontend never intentionally sends one,
// but treating "" as "no value" defensively here too keeps createBank and
// updateBank's merge logic sharing one meaning for an empty string).
function cleanCredentials(credentials: Record<string, string> | null | undefined): Record<string, string> | null {
  if (!credentials) return null;
  const cleaned = Object.fromEntries(Object.entries(credentials).filter(([, value]) => value !== ""));
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

// Merges incoming credential edits into the existing (unmasked, DB) values
// by key, rather than replacing the whole object — an admin editing one
// field, or leaving others untouched, never has to round-trip (and thus
// risk resaving) a masked value it never actually received. A key mapped
// to "" is an explicit delete-this-field signal from the form.
function mergeCredentials(
  existing: Record<string, string> | null,
  incoming: Record<string, string> | null | undefined,
): Record<string, string> | null | undefined {
  if (incoming === undefined) return undefined;
  if (incoming === null) return null;

  const merged = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === "") {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function toResponse(row: BankRow) {
  return {
    id: row.id,
    key: row.key,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    logoUrl: row.logoUrl,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    supportsInstallment: row.supportsInstallment,
    supportsSplitPayment: row.supportsSplitPayment,
    credentials: maskCredentials((row.credentials as Record<string, string> | null) ?? null),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// What the checkout page gets — never includes credentials. Exported for
// orders.service.ts's resolveBank to reuse the same shape when embedding
// the chosen bank on a placed order's response.
export function toPublicResponse(row: BankRow) {
  return {
    id: row.id,
    key: row.key,
    name: { ka: row.nameKa, en: row.nameEn, ru: row.nameRu },
    logoUrl: row.logoUrl,
  };
}

async function assertKeyAvailable(key: string, excludeId?: number) {
  const existing = await banksRepository.findByKey(key);
  if (existing && existing.id !== excludeId) {
    throw new ApiError(400, "ეს იდენტიფიკატორი უკვე გამოყენებულია");
  }
}

export async function listBanks(onlyActive?: boolean) {
  const rows = await banksRepository.findMany(onlyActive);
  return rows.map(toResponse);
}

export async function listPublicBanks() {
  const rows = await banksRepository.findMany(true);
  return rows.map(toPublicResponse);
}

export async function getBank(id: number) {
  const row = await banksRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "ბანკი ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createBank(input: CreateBankInput) {
  await assertKeyAvailable(input.key);

  const row = await banksRepository.create({
    key: input.key,
    nameKa: input.name.ka,
    nameEn: input.name.en,
    nameRu: input.name.ru,
    isActive: input.isActive ?? true,
    supportsInstallment: input.supportsInstallment ?? false,
    supportsSplitPayment: input.supportsSplitPayment ?? false,
    credentials: cleanCredentials(input.credentials),
  });
  return toResponse(row);
}

export async function updateBank(id: number, input: UpdateBankInput) {
  const existing = await banksRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ბანკი ვერ მოიძებნა");
  }
  if (input.key !== undefined && input.key !== existing.key) {
    await assertKeyAvailable(input.key, id);
  }

  const mergedCredentials = mergeCredentials(
    (existing.credentials as Record<string, string> | null) ?? null,
    input.credentials,
  );

  const row = await banksRepository.update(id, {
    ...(input.key !== undefined ? { key: input.key } : {}),
    ...(input.name !== undefined
      ? { nameKa: input.name.ka, nameEn: input.name.en, nameRu: input.name.ru }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.supportsInstallment !== undefined
      ? { supportsInstallment: input.supportsInstallment }
      : {}),
    ...(input.supportsSplitPayment !== undefined
      ? { supportsSplitPayment: input.supportsSplitPayment }
      : {}),
    ...(mergedCredentials !== undefined ? { credentials: mergedCredentials } : {}),
  });
  return toResponse(row);
}

export async function setBankLogo(id: number, file: Express.Multer.File) {
  const existing = await banksRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ბანკი ვერ მოიძებნა");
  }

  const logoUrl = await saveUploadedImage("banks", file);
  const row = await banksRepository.updateLogo(id, logoUrl);
  return toResponse(row);
}

export async function reorderBanks(input: ReorderBanksInput) {
  const existing = await banksRepository.findMany();
  const existingIds = new Set(existing.map((row) => row.id));

  if (input.ids.length !== existing.length || !input.ids.every((id) => existingIds.has(id))) {
    throw new ApiError(400, "მითითებული ბანკების სია არ ემთხვევა არსებულს");
  }

  await banksRepository.reorder(input.ids);
  return listBanks();
}

export async function deleteBank(id: number) {
  const existing = await banksRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "ბანკი ვერ მოიძებნა");
  }

  await banksRepository.delete(id);
}
