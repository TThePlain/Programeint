import { z } from "zod";
import { TUTOR_HELP_LEVELS } from "./tutor";

export const tutorAskSchema = z.object({
  content: z.string().trim().min(2).max(2000),
  helpLevel: z
    .number()
    .int()
    .refine((n): n is (typeof TUTOR_HELP_LEVELS)[number] => (TUTOR_HELP_LEVELS as readonly number[]).includes(n), {
      message: "Nível de ajuda inválido (0–6).",
    })
    .default(2),
  includeLabCode: z.boolean().default(true),
});
