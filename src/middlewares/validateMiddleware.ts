import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";

import { AppError } from "../utils/AppError.js";

interface ValidatedRequestData {
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, string>;
}

export function validate(schema: ZodType<ValidatedRequestData>) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body as unknown,
        query: req.query,
        params: req.params,
      });

      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.params !== undefined) {
        req.params = parsed.params;
      }
      if (parsed.query !== undefined) {
        Object.defineProperty(req, "query", {
          value: parsed.query,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new AppError(
            "DADOS_INVALIDOS",
            error.issues[0]?.message ?? "Dados de entrada inválidos.",
          ),
        );
      } else {
        next(error);
      }
    }
  };
}
