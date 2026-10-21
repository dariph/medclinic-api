import type { Request, Response } from "express";

import type { LoginDTO } from "../dtos/UserDTO.js";
import { AuthService } from "../services/AuthService.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async login(req: Request, res: Response): Promise<Response> {
    const loginData = req.body as LoginDTO;
    const authResponse = await this.authService.authenticate(loginData);
    return res.json(authResponse);
  }
}
