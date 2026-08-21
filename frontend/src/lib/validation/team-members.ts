import { z } from "zod";
import { requiredSelectString } from "./common";

export const TEAM_MEMBER_NAME_MAX_LENGTH = 60;

export const teamMemberFormSchema = z.object({
  name: z.object({
    ka: z.string().trim().min(1, "შეავსეთ სახელი (ქართულად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
    en: z.string().trim().min(1, "შეავსეთ სახელი (ინგლისურად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
    ru: z.string().trim().min(1, "შეავსეთ სახელი (რუსულად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
  }),
  positionId: requiredSelectString("აირჩიეთ თანამდებობა"),
});
