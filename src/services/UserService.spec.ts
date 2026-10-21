import bcrypt from "bcryptjs";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";

import { UserService } from "./UserService.js";
import type { IUserRepository } from "../domain/ports/RepositoryPorts.js";
import { AppError } from "../utils/AppError.js";

describe("UserService", () => {
  let userService: UserService;

  let findByEmail: Mock;
  let userFindById: Mock;
  let userCreate: Mock;
  let userSave: Mock;

  beforeEach(() => {
    findByEmail = vi.fn();
    userFindById = vi.fn();
    userCreate = vi.fn();
    userSave = vi.fn();

    const mockUserRepository = {
      findByEmail,
      findById: userFindById,
      create: userCreate,
      save: userSave,
    } as unknown as IUserRepository;

    userService = new UserService(mockUserRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createAdminOrSecretary", () => {
    it("deve criar um usuário com a senha criptografada em hash (RNF01)", async () => {
      const mockUser = {
        id: "user-1",
        name: "Joana Secretária",
        email: "joana@medclinic.com",
        password: "hashed-password",
        roles: ["secretary"],
      };
      findByEmail.mockResolvedValue(null);
      userCreate.mockReturnValue(mockUser);
      userSave.mockResolvedValue(mockUser);

      const hashSpy = vi
        .spyOn(bcrypt, "hash")
        .mockResolvedValue("hashed-password" as never);

      const result = await userService.createAdminOrSecretary({
        name: "Joana Secretária",
        email: "joana@medclinic.com",
        password: "SenhaForte@123",
        roles: ["secretary"],
      });

      expect(hashSpy).toHaveBeenCalledWith("SenhaForte@123", 10);
      expect(userCreate).toHaveBeenCalledWith(
        expect.objectContaining({ password: "hashed-password" }),
      );
      expect(result.id).toBe("user-1");
      expect(result).not.toHaveProperty("password");
    });

    it("deve recusar a criação se o e-mail já estiver em uso", async () => {
      findByEmail.mockResolvedValue({ id: "user-existente" });

      await expect(
        userService.createAdminOrSecretary({
          name: "Joana Duplicada",
          email: "joana@medclinic.com",
          password: "SenhaForte@123",
          roles: ["secretary"],
        }),
      ).rejects.toBeInstanceOf(AppError);
      expect(userSave).not.toHaveBeenCalled();
    });

    it("deve recusar a criação se a lista de perfis for vazia", async () => {
      await expect(
        userService.createAdminOrSecretary({
          name: "Sem Perfil",
          email: "semperfil@medclinic.com",
          password: "SenhaForte@123",
          roles: [],
        }),
      ).rejects.toThrowError("DADOS_INVALIDOS");
      expect(findByEmail).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("deve lançar RECURSO_NAO_ENCONTRADO se o usuário não existir", async () => {
      userFindById.mockResolvedValue(null);

      await expect(userService.findById("id-inexistente")).rejects.toThrowError(
        "RECURSO_NAO_ENCONTRADO",
      );
    });

    it("deve retornar o usuário sem expor a senha", async () => {
      userFindById.mockResolvedValue({
        id: "user-1",
        name: "Joana Secretária",
        email: "joana@medclinic.com",
        password: "hashed-password",
        roles: ["secretary"],
      });

      const result = await userService.findById("user-1");

      expect(result.id).toBe("user-1");
      expect(result).not.toHaveProperty("password");
    });
  });
});
