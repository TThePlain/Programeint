import { z } from "zod";

export const diagnosisAnswerSchema = z.object({
  questionId: z.string().uuid(),
  choiceId: z.string().min(1).max(40),
});
