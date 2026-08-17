import { ApiError } from "../../lib/ApiError.js";
import { faqRepository } from "./faq.repository.js";
import type { CreateFaqInput, ReorderFaqInput, UpdateFaqInput } from "./faq.schema.js";

type FaqRow = {
  id: number;
  questionKa: string;
  questionEn: string;
  questionRu: string;
  answerKa: string;
  answerEn: string;
  answerRu: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function toResponse(row: FaqRow) {
  return {
    id: row.id,
    question: { ka: row.questionKa, en: row.questionEn, ru: row.questionRu },
    answer: { ka: row.answerKa, en: row.answerEn, ru: row.answerRu },
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listFaqs(onlyActive?: boolean) {
  const rows = await faqRepository.findMany(onlyActive);
  return rows.map(toResponse);
}

export async function getFaq(id: number) {
  const row = await faqRepository.findById(id);
  if (!row) {
    throw new ApiError(404, "კითხვა ვერ მოიძებნა");
  }
  return toResponse(row);
}

export async function createFaq(input: CreateFaqInput) {
  const row = await faqRepository.create({
    questionKa: input.question.ka,
    questionEn: input.question.en,
    questionRu: input.question.ru,
    answerKa: input.answer.ka,
    answerEn: input.answer.en,
    answerRu: input.answer.ru,
    isActive: input.isActive ?? true,
  });
  return toResponse(row);
}

export async function updateFaq(id: number, input: UpdateFaqInput) {
  const existing = await faqRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კითხვა ვერ მოიძებნა");
  }

  const row = await faqRepository.update(id, {
    ...(input.question !== undefined
      ? { questionKa: input.question.ka, questionEn: input.question.en, questionRu: input.question.ru }
      : {}),
    ...(input.answer !== undefined
      ? { answerKa: input.answer.ka, answerEn: input.answer.en, answerRu: input.answer.ru }
      : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  });
  return toResponse(row);
}

export async function reorderFaqs(input: ReorderFaqInput) {
  const existing = await faqRepository.findMany();
  const existingIds = new Set(existing.map((row) => row.id));

  if (input.ids.length !== existing.length || !input.ids.every((id) => existingIds.has(id))) {
    throw new ApiError(400, "მითითებული კითხვების სია არ ემთხვევა არსებულს");
  }

  await faqRepository.reorder(input.ids);
  return listFaqs();
}

export async function deleteFaq(id: number) {
  const existing = await faqRepository.findById(id);
  if (!existing) {
    throw new ApiError(404, "კითხვა ვერ მოიძებნა");
  }

  await faqRepository.delete(id);
}
