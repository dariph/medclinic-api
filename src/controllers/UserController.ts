import type { Request, Response } from "express";

import type { CreateUserDTO } from "../dtos/UserDTO.js";
import { UserService } from "../services/UserService.js";
import { AppError } from "../utils/AppError.js";

export class UserController {
  constructor(private readonly userService: UserService) {}

  async getMe(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw new AppError("NAO_AUTENTICADO");
    }
    const user = await this.userService.findById(req.user.id);
    return res.json(user);
  }

  async create(req: Request, res: Response): Promise<Response> {
    const userData = req.body as CreateUserDTO;
    const user = await this.userService.createAdminOrSecretary(userData);
    return res.status(201).json(user);
  }
}
