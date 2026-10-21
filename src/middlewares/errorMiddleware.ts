import type { NextFunction, Request, Response } from "express";

import { AppError, type DomainErrorCode } from "../utils/AppError.js";

const ERROR_HTTP_STATUS_MAP: Record<DomainErrorCode, number> = {
  DADOS_INVALIDOS: 400,
  NAO_AUTENTICADO: 401,
  CREDENCIAIS_INVALIDAS: 401,
  ACESSO_NEGADO: 403,
  RECURSO_NAO_ENCONTRADO: 404,
  EMAIL_JA_CADASTRADO: 409,
  CPF_JA_CADASTRADO: 409,
  CRM_JA_CADASTRADO: 409,
  HORARIO_INDISPONIVEL: 409,
  PACIENTE_INDISPONIVEL: 409,
  HORARIO_FORA_DA_ESCALA: 422,
  TRANSICAO_INVALIDA: 422,
  ERRO_INTERNO: 500,
};

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (err instanceof AppError) {
    const statusCode = ERROR_HTTP_STATUS_MAP[err.errorType] || 400;
    return res.status(statusCode).json({
      statusCode,
      error: err.errorType,
      message: err.message,
    });
  }

  if (
    err instanceof SyntaxError &&
    "status" in err &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      statusCode: 400,
      error: "DADOS_INVALIDOS",
      message: "Formato de JSON inválido no corpo da requisição.",
    });
  }

  console.error("Erro interno não tratado:", err);
  return res.status(500).json({
    statusCode: 500,
    error: "ERRO_INTERNO",
    message: "Erro interno do servidor.",
  });
}
