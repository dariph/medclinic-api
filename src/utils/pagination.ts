import { AppError } from "./AppError.js";

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: unknown;
  pageSize?: unknown;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: unknown, defaultValue: number): number {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    throw new AppError("DADOS_INVALIDOS", "Parâmetro de paginação inválido.");
  }
  const strValue = String(value).trim();
  if (!/^\d+$/.test(strValue)) {
    throw new AppError(
      "DADOS_INVALIDOS",
      "Parâmetro de paginação deve ser inteiro positivo.",
    );
  }
  const parsed = Number.parseInt(strValue, 10);
  if (parsed < 1) {
    throw new AppError(
      "DADOS_INVALIDOS",
      "Página deve ser maior ou igual a 1.",
    );
  }
  return parsed;
}

export function paginateParams(query: PaginationQuery): {
  page: number;
  pageSize: number;
} {
  const page = parsePositiveInt(query.page, DEFAULT_PAGE);
  const pageSize = parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE);
  if (pageSize > MAX_PAGE_SIZE) {
    throw new AppError("DADOS_INVALIDOS", "pageSize máximo é 100.");
  }
  return { page, pageSize };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
