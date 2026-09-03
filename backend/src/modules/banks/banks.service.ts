import { ApiError } from "../../lib/ApiError.js";
import { deleteUploadedImage, saveUploadedImage } from "../../lib/storage.js";
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
  createdAt: Date;
  updatedAt: Date;
};

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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// What the checkout page gets — display fields only, no admin-only ones
// (sortOrder, isActive, timestamps). Exported for orders.service.ts's
// resolveBank to reuse the same shape when embedding the chosen bank on a
// placed order's response.
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
  void deleteUploadedImage(existing.logoUrl);
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
  void deleteUploadedImage(existing.logoUrl);
}
