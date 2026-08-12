import { z } from "zod";

export const newsletterCampaignFormSchema = z.object({
  subject: z.string().trim().min(1, "შეავსეთ სათაური").max(200, "მაქს. 200 სიმბოლო"),
  body: z.string().trim().min(1, "შეავსეთ შინაარსი"),
});
