import type { ZodType } from "zod";

import { AppError } from "./AppError.js";

export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(
      "DADOS_INVALIDOS",
      result.error.issues[0]?.message ?? "Dados de entrada inválidos.",
    );
  }
  return result.data;
}
