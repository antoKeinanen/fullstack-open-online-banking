import { parse as parseDate } from "date-fns";
import { z } from "zod";

import { isOverYears } from "../lib";

export const signUpFormSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phoneNumber: z.e164(),
    homeAddress: z.string().min(1),
    postCode: z.string().length(5),
    city: z.string().min(1),
    birthDay: z.string().regex(/^\d+$/),
    birthMonth: z.string().regex(/^\d+$/),
    birthYear: z.string().regex(/^\d+$/),
    isResident: z.boolean().refine((v) => v === true, "Required"),
    isTruth: z.boolean().refine((v) => v === true, "Required"),
  })

  .superRefine(({ birthDay, birthMonth, birthYear }, ctx) => {
    const birthDate = parseDate(
      `${birthDay}/${birthMonth}/${birthYear}`,
      "dd/MM/yyyy",
      new Date(),
    );

    if (isNaN(birthDate.getTime())) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
        path: ["birthDay"],
      });
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
        path: ["birthMonth"],
      });
      ctx.addIssue({
        code: "custom",
        message: "Invalid date",
        path: ["birthYear"],
      });
      return;
    }

    if (!isOverYears(18, birthDate)) {
      ctx.addIssue({
        code: "custom",
        message: "You must be at least 18 years old",
        path: ["birthDay"],
      });
      ctx.addIssue({
        code: "custom",
        message: "You must be at least 18 years old",
        path: ["birthMonth"],
      });
      ctx.addIssue({
        code: "custom",
        message: "You must be at least 18 years old",
        path: ["birthYear"],
      });
    }
  });
export type SignUpFormValues = z.infer<typeof signUpFormSchema>;
