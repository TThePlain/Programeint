import { z } from "zod";

export const studyStartSchema = z.object({
  nodeSlug: z.string().trim().min(1).max(64),
});

export const studyCheckSchema = z.object({
  questionId: z.string().uuid(),
  choiceId: z.string().min(1).max(40),
});

export const reviewAnswerSchema = z.object({
  questionId: z.string().uuid(),
  choiceId: z.string().min(1).max(40),
});
