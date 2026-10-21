import type { NextFunction, Request, Response } from "express";

import { AppError } from "../utils/AppError.js";

export function roleMiddleware(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("NAO_AUTENTICADO");
    }

    const hasPermission = req.user.roles.some((role: string) =>
      allowedRoles.includes(role),
    );
    if (!hasPermission) {
      throw new AppError("ACESSO_NEGADO");
    }

    next();
  };
}
