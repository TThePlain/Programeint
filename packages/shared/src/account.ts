import { z } from "zod";
import { passwordSchema } from "./auth";

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Confirma a senha para apagar a conta."),
  confirm: z
    .string()
    .trim()
    .refine((value) => value === "APAGAR", {
      message: 'Escreve APAGAR para confirmar a exclusão permanente.',
    }),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/** Reexport para formulários que também pedem passwordSchema. */
export { passwordSchema };
