import { z } from "zod";
import { requiredSelectString } from "./common";

export const TEAM_MEMBER_NAME_MAX_LENGTH = 60;
export const TEAM_MEMBER_DESCRIPTION_MAX_LENGTH = 1000;

export const teamMemberFormSchema = z.object({
  name: z.object({
    ka: z.string().trim().min(1, "შეავსეთ სახელი (ქართულად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
    en: z.string().trim().min(1, "შეავსეთ სახელი (ინგლისურად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
    ru: z.string().trim().min(1, "შეავსეთ სახელი (რუსულად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
  }),
  positionId: requiredSelectString("აირჩიეთ თანამდებობა"),
  description: z.object({
    ka: z.string().trim().max(TEAM_MEMBER_DESCRIPTION_MAX_LENGTH, "მაქს. 1000 სიმბოლო"),
    en: z.string().trim().max(TEAM_MEMBER_DESCRIPTION_MAX_LENGTH, "მაქს. 1000 სიმბოლო"),
    ru: z.string().trim().max(TEAM_MEMBER_DESCRIPTION_MAX_LENGTH, "მაქს. 1000 სიმბოლო"),
  }),
});
