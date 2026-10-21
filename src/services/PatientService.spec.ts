import { beforeEach, describe, expect, it, vi } from "vitest";

import { PatientService } from "./PatientService.js";
import type { IPatientRepository } from "../domain/ports/RepositoryPorts.js";
import type { Patient } from "../entities/Patient.js";

describe("PatientService", () => {
  let patientService: PatientService;
  let patientRepo: IPatientRepository;

  const mockPatient: Patient = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Carlos Pereira",
    cpf: "12345678901",
    createdAt: new Date("2026-10-10T10:00:00Z"),
  };

  beforeEach(() => {
    patientRepo = {
      findByIdWithLock: vi.fn(),
      findById: vi.fn(),
      findByCpfWithDeleted: vi.fn(),
      findAllPaginated: vi.fn(),
      create: vi.fn((data: Partial<Patient>) => ({
        ...mockPatient,
        ...data,
      })),
      save: vi.fn(async (p: Patient) => p),
      softRemove: vi.fn(async () => undefined),
    };

    patientService = new PatientService(patientRepo);
  });

  it("deve cadastrar paciente com CPF único com sucesso", async () => {
    vi.mocked(patientRepo.findByCpfWithDeleted).mockResolvedValue(null);

    const result = await patientService.create({
      name: "Carlos Pereira",
      cpf: "12345678901",
    });

    expect(result.cpf).toBe("12345678901");
    expect(patientRepo.save).toHaveBeenCalledTimes(1);
  });

  it("deve recusar CPF duplicado com CPF_JA_CADASTRADO", async () => {
    vi.mocked(patientRepo.findByCpfWithDeleted).mockResolvedValue(mockPatient);

    await expect(
      patientService.create({ name: "Outro", cpf: "12345678901" }),
    ).rejects.toMatchObject({ errorType: "CPF_JA_CADASTRADO" });
  });

  it("deve listar pacientes paginados com filtro de nome", async () => {
    vi.mocked(patientRepo.findAllPaginated).mockResolvedValue([
      [mockPatient],
      1,
    ]);

    const result = await patientService.findAll(1, 20, "Carlos");
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it("deve buscar paciente por ID com sucesso e lançar 404 quando não existir", async () => {
    vi.mocked(patientRepo.findById).mockResolvedValueOnce(mockPatient);
    const found = await patientService.findById(mockPatient.id);
    expect(found.id).toBe(mockPatient.id);

    vi.mocked(patientRepo.findById).mockResolvedValueOnce(null);
    await expect(patientService.findById("inexistente")).rejects.toMatchObject({
      errorType: "RECURSO_NAO_ENCONTRADO",
    });
  });

  it("deve atualizar paciente existente e lançar 404 para paciente inexistente", async () => {
    vi.mocked(patientRepo.findById).mockResolvedValueOnce({ ...mockPatient });
    const updated = await patientService.update(mockPatient.id, "Carlos Silva");
    expect(updated.name).toBe("Carlos Silva");

    vi.mocked(patientRepo.findById).mockResolvedValueOnce(null);
    await expect(
      patientService.update("inexistente", "Nome"),
    ).rejects.toMatchObject({ errorType: "RECURSO_NAO_ENCONTRADO" });
  });

  it("deve remover paciente (softRemove) com sucesso e lançar 404 se inexistente", async () => {
    vi.mocked(patientRepo.findById).mockResolvedValueOnce(mockPatient);
    await expect(
      patientService.delete(mockPatient.id),
    ).resolves.toBeUndefined();
    expect(patientRepo.softRemove).toHaveBeenCalledWith(mockPatient);

    vi.mocked(patientRepo.findById).mockResolvedValueOnce(null);
    await expect(patientService.delete("inexistente")).rejects.toMatchObject({
      errorType: "RECURSO_NAO_ENCONTRADO",
    });
  });
});
