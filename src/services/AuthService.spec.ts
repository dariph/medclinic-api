import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "./AuthService.js";
import { AuthUser } from "../domain/AuthUser.js";
import type { IUserRepository } from "../domain/ports/RepositoryPorts.js";
import type { User } from "../entities/User.js";

describe("AuthService & AuthUser", () => {
  let authService: AuthService;
  let userRepository: IUserRepository;

  const validUserId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-key-medclinic";
    process.env.JWT_EXPIRES_IN = "1h";

    userRepository = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    authService = new AuthService(userRepository);
  });

  describe("authenticate", () => {
    it("deve autenticar com sucesso e devolver accessToken quando credenciais forem válidas", async () => {
      const hashedPassword = await bcrypt.hash("SenhaForte@123", 10);
      const mockUser: User = {
        id: validUserId,
        name: "Admin",
        email: "admin@medclinic.com",
        password: hashedPassword,
        roles: ["admin"],
        createdAt: new Date(),
      };

      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);

      const result = await authService.authenticate({
        email: "admin@medclinic.com",
        password: "SenhaForte@123",
      });

      expect(result.accessToken).toBeDefined();
      const payload = authService.validateToken(result.accessToken);
      expect(payload.id).toBe(validUserId);
      expect(payload.roles).toEqual(["admin"]);
    });

    it("deve rejeitar com CREDENCIAIS_INVALIDAS quando e-mail ou senha estiverem vazios", async () => {
      await expect(
        authService.authenticate({ email: "", password: "" }),
      ).rejects.toMatchObject({ errorType: "CREDENCIAIS_INVALIDAS" });
    });

    it("deve rejeitar com CREDENCIAIS_INVALIDAS quando usuário não existir", async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      await expect(
        authService.authenticate({
          email: "inexistente@medclinic.com",
          password: "SenhaForte@123",
        }),
      ).rejects.toMatchObject({ errorType: "CREDENCIAIS_INVALIDAS" });
    });

    it("deve rejeitar com CREDENCIAIS_INVALIDAS quando a senha estiver incorreta", async () => {
      const hashedPassword = await bcrypt.hash("SenhaCorreta@123", 10);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: validUserId,
        name: "Admin",
        email: "admin@medclinic.com",
        password: hashedPassword,
        roles: ["admin"],
        createdAt: new Date(),
      });

      await expect(
        authService.authenticate({
          email: "admin@medclinic.com",
          password: "SenhaErrada",
        }),
      ).rejects.toMatchObject({ errorType: "CREDENCIAIS_INVALIDAS" });
    });
  });

  describe("validateToken", () => {
    it("deve lançar NAO_AUTENTICADO para token inválido ou malformado", () => {
      expect(() => authService.validateToken("token-invalido")).toThrow();
    });

    it("deve lançar NAO_AUTENTICADO quando o payload do token não tiver formato esperado", () => {
      const badToken = jwt.sign(
        { id: "nao-e-uuid", roles: "invalido" },
        "test-secret-key-medclinic",
      );
      expect(() => authService.validateToken(badToken)).toThrow();
    });
  });

  describe("AuthUser helpers", () => {
    it("deve identificar perfis admin, secretary, doctor e isOnlyDoctor corretamente", () => {
      const docUser = new AuthUser(validUserId, ["doctor"]);
      expect(docUser.isDoctor()).toBe(true);
      expect(docUser.isAdmin()).toBe(false);
      expect(docUser.isSecretary()).toBe(false);
      expect(docUser.isOnlyDoctor()).toBe(true);

      const secUser = new AuthUser(validUserId, ["secretary"]);
      expect(secUser.isSecretary()).toBe(true);
      expect(secUser.isOnlyDoctor()).toBe(false);
    });
  });
});
