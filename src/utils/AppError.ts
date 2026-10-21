export type DomainErrorCode =
  | "DADOS_INVALIDOS"
  | "NAO_AUTENTICADO"
  | "CREDENCIAIS_INVALIDAS"
  | "ACESSO_NEGADO"
  | "RECURSO_NAO_ENCONTRADO"
  | "EMAIL_JA_CADASTRADO"
  | "CPF_JA_CADASTRADO"
  | "CRM_JA_CADASTRADO"
  | "HORARIO_INDISPONIVEL"
  | "PACIENTE_INDISPONIVEL"
  | "HORARIO_FORA_DA_ESCALA"
  | "TRANSICAO_INVALIDA"
  | "ERRO_INTERNO";

export class AppError extends Error {
  public readonly errorType: DomainErrorCode;

  constructor(errorType: DomainErrorCode, customMessage?: string) {
    super(customMessage ?? errorType);
    this.name = "AppError";
    this.errorType = errorType;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
