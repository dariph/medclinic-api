import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";

import type { IUserRepository } from "../domain/ports/RepositoryPorts.js";
import type { AuthResponseDTO, LoginDTO } from "../dtos/UserDTO.js";
import { AppError } from "../utils/AppError.js";
import { getEnvVar } from "../utils/env.js";

const tokenPayloadSchema = z.object({
  id: z.uuid(),
  roles: z.array(z.string()),
});

export interface TokenPayload {
  id: string;
  roles: string[];
}

export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async authenticate(data: LoginDTO): Promise<AuthResponseDTO> {
    const { email, password } = data;
    if (!email || !password) {
      throw new AppError("CREDENCIAIS_INVALIDAS");
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user?.password) {
      throw new AppError("CREDENCIAIS_INVALIDAS");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("CREDENCIAIS_INVALIDAS");
    }

    const expiresIn: SignOptions["expiresIn"] =
      (process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"]) ?? "1h";

    const token = jwt.sign(
      {
        id: user.id,
        roles: user.roles,
      },
      getEnvVar("JWT_SECRET"),
      { expiresIn },
    );

    return { accessToken: token };
  }

  validateToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, getEnvVar("JWT_SECRET"));
      const result = tokenPayloadSchema.safeParse(decoded);
      if (!result.success) {
        throw new AppError("NAO_AUTENTICADO");
      }

      return {
        id: result.data.id,
        roles: result.data.roles,
      };
    } catch {
      throw new AppError("NAO_AUTENTICADO");
    }
  }
}
