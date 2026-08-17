import { z } from "zod";

export const TEAM_MEMBER_NAME_MAX_LENGTH = 60;
export const TEAM_MEMBER_ROLE_MAX_LENGTH = 60;

export const teamMemberFormSchema = z.object({
  name: z.object({
    ka: z.string().trim().min(1, "შეავსეთ სახელი (ქართულად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
    en: z.string().trim().min(1, "შეავსეთ სახელი (ინგლისურად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
    ru: z.string().trim().min(1, "შეავსეთ სახელი (რუსულად)").max(TEAM_MEMBER_NAME_MAX_LENGTH),
  }),
  role: z.object({
    ka: z.string().trim().min(1, "შეავსეთ თანამდებობა (ქართულად)").max(TEAM_MEMBER_ROLE_MAX_LENGTH),
    en: z.string().trim().min(1, "შეავსეთ თანამდებობა (ინგლისურად)").max(TEAM_MEMBER_ROLE_MAX_LENGTH),
    ru: z.string().trim().min(1, "შეავსეთ თანამდებობა (რუსულად)").max(TEAM_MEMBER_ROLE_MAX_LENGTH),
  }),
});
