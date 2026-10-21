import { AuthUser } from "../../domain/AuthUser.js";

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUser;
    }
  }
}

export {};
