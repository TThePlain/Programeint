import { BadRequestException } from "@nestjs/common";
import type { ZodTypeAny, output } from "zod";

// Devolve o tipo de saída do schema: com `.default()`, a entrada é opcional mas a saída não.
export function parseBody<S extends ZodTypeAny>(schema: S, raw: unknown): output<S> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = Object.values(result.error.flatten().fieldErrors).flat()[0];
    throw new BadRequestException(first ?? "Dados inválidos.");
  }
  return result.data;
}
