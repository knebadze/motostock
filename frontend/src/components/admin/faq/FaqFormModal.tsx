"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { Toggle } from "@/components/shared/Toggle";
import { createFaq, updateFaq, type Faq } from "@/lib/api/faq";
import { ApiRequestError } from "@/lib/api/client";
import { faqFormSchema } from "@/lib/validation/faq";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function FaqFormModal({
  open,
  onClose,
  onSaved,
  faq,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  faq: Faq | null;
}) {
  const isEditing = faq !== null;

  const [questionKa, setQuestionKa] = useState(faq?.question.ka ?? "");
  const [questionEn, setQuestionEn] = useState(faq?.question.en ?? "");
  const [questionRu, setQuestionRu] = useState(faq?.question.ru ?? "");
  const [answerKa, setAnswerKa] = useState(faq?.answer.ka ?? "");
  const [answerEn, setAnswerEn] = useState(faq?.answer.en ?? "");
  const [answerRu, setAnswerRu] = useState(faq?.answer.ru ?? "");
  const [isActive, setIsActive] = useState(faq?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const result = faqFormSchema.safeParse({
      question: { ka: questionKa, en: questionEn, ru: questionRu },
      answer: { ka: answerKa, en: answerEn, ru: answerRu },
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
        question: { ka: questionKa.trim(), en: questionEn.trim(), ru: questionRu.trim() },
        answer: { ka: answerKa, en: answerEn, ru: answerRu },
        isActive,
      };

      if (isEditing) {
        await updateFaq(faq.id, input);
      } else {
        await createFaq(input);
      }

      toast.success(isEditing ? "კითხვა განახლდა" : "კითხვა დაემატა");
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
    <Modal open={open} onClose={onClose} title={isEditing ? "კითხვის რედაქტირება" : "ახალი კითხვა"} size="xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">კითხვა</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="faq-question-ka" className="text-xs text-muted-foreground">
              ქართულად
            </label>
            <input
              id="faq-question-ka"
              value={questionKa}
              onChange={(event) => setQuestionKa(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["question.ka"]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="faq-question-en" className="text-xs text-muted-foreground">
              ინგლისურად
            </label>
            <input
              id="faq-question-en"
              value={questionEn}
              onChange={(event) => setQuestionEn(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["question.en"]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="faq-question-ru" className="text-xs text-muted-foreground">
              რუსულად
            </label>
            <input
              id="faq-question-ru"
              value={questionRu}
              onChange={(event) => setQuestionRu(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors["question.ru"]} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">პასუხი (ქართულად)</label>
          <RichTextEditor value={answerKa} onChange={setAnswerKa} />
          <FieldError message={errors["answer.ka"]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">პასუხი (ინგლისურად)</label>
          <RichTextEditor value={answerEn} onChange={setAnswerEn} />
          <FieldError message={errors["answer.en"]} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">პასუხი (რუსულად)</label>
          <RichTextEditor value={answerRu} onChange={setAnswerRu} />
          <FieldError message={errors["answer.ru"]} />
        </div>

        <label className="flex items-center gap-3 text-sm font-medium">
          <Toggle checked={isActive} onChange={setIsActive} />
          აქტიურია (გამოჩნდება საიტზე)
        </label>

        <FormActions onCancel={onClose} loading={loading} />
      </form>
    </Modal>
  );
}
