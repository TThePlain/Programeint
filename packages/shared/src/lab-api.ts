import { z } from "zod";

export const labSaveSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1).max(80),
        content: z.string().max(32_768),
      }),
    )
    .min(1)
    .max(8),
});
