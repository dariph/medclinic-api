import type { NextFunction, Request, Response } from "express";

import { AuthUser } from "../domain/AuthUser.js";
import { AuthService } from "../services/AuthService.js";
import { AppError } from "../utils/AppError.js";

export function createAuthMiddleware(authService: AuthService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError("NAO_AUTENTICADO");
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new AppError("NAO_AUTENTICADO");
    }

    try {
      const payload = authService.validateToken(token);
      req.user = new AuthUser(payload.id, payload.roles);
    } catch {
      throw new AppError("NAO_AUTENTICADO");
    }

    next();
  };
}
