import bcrypt from "bcryptjs";

import type { IUserRepository } from "../domain/ports/RepositoryPorts.js";
import type { CreateUserDTO, UserResponseDTO } from "../dtos/UserDTO.js";
import { UserMapper } from "../mappers/EntityMappers.js";
import { AppError } from "../utils/AppError.js";

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async createAdminOrSecretary(data: CreateUserDTO): Promise<UserResponseDTO> {
    const { name, email, password, roles } = data;

    if (!Array.isArray(roles) || roles.length === 0) {
      throw new AppError("DADOS_INVALIDOS");
    }

    const userExists = await this.userRepository.findByEmail(email);
    if (userExists) {
      throw new AppError("EMAIL_JA_CADASTRADO");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      roles,
    });

    await this.userRepository.save(user);
    return UserMapper.toDTO(user);
  }

  async findById(id: string): Promise<UserResponseDTO> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }

    return UserMapper.toDTO(user);
  }
}
