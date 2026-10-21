import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { MedicalRecordService } from "./MedicalRecordService.js";
import { AuthUser } from "../domain/AuthUser.js";
import type {
  IAppointmentRepository,
  IDoctorRepository,
  IMedicalRecordRepository,
  IPatientRepository,
} from "../domain/ports/RepositoryPorts.js";
import { AppError } from "../utils/AppError.js";

describe("MedicalRecordService", () => {
  let service: MedicalRecordService;

  let recordCreate: Mock;
  let recordSave: Mock;
  let recordFindByPatientPaginated: Mock;
  let patientFindById: Mock;
  let doctorFindByUserId: Mock;
  let hasActiveOrDoneLink: Mock;

  beforeEach(() => {
    recordCreate = vi.fn();
    recordSave = vi.fn();
    recordFindByPatientPaginated = vi.fn();
    patientFindById = vi.fn();
    doctorFindByUserId = vi.fn();
    hasActiveOrDoneLink = vi.fn();

    const mockRecordRepo = {
      create: recordCreate,
      save: recordSave,
      findByPatientPaginated: recordFindByPatientPaginated,
    } as unknown as IMedicalRecordRepository;

    const mockPatientRepo = {
      findById: patientFindById,
    } as unknown as IPatientRepository;

    const mockDoctorRepo = {
      findByUserId: doctorFindByUserId,
    } as unknown as IDoctorRepository;

    const mockAppointmentRepo = {
      hasActiveOrDoneLink,
    } as unknown as IAppointmentRepository;

    service = new MedicalRecordService(
      mockRecordRepo,
      mockPatientRepo,
      mockDoctorRepo,
      mockAppointmentRepo,
    );
  });

  describe("createRecord", () => {
    it("deve lançar ACESSO_NEGADO se não houver vínculo de consulta (RN14)", async () => {
      doctorFindByUserId.mockResolvedValue({ id: "doc-1" });
      patientFindById.mockResolvedValue({ id: "pat-1" });
      hasActiveOrDoneLink.mockResolvedValue(false);

      await expect(
        service.createRecord("pat-1", "user-1", "Sintomas relatados."),
      ).rejects.toBeInstanceOf(AppError);
      expect(recordSave).not.toHaveBeenCalled();
    });

    it("deve lançar DADOS_INVALIDOS se o texto for vazio ou só espaços", async () => {
      await expect(
        service.createRecord("pat-1", "user-1", "   "),
      ).rejects.toThrowError("DADOS_INVALIDOS");
      expect(doctorFindByUserId).not.toHaveBeenCalled();
    });

    it("deve lançar ACESSO_NEGADO se o usuário não for médico", async () => {
      doctorFindByUserId.mockResolvedValue(null);

      await expect(
        service.createRecord("pat-1", "user-1", "Sintomas relatados."),
      ).rejects.toThrowError("ACESSO_NEGADO");
    });

    it("deve lançar RECURSO_NAO_ENCONTRADO se o paciente não existir", async () => {
      doctorFindByUserId.mockResolvedValue({ id: "doc-1" });
      patientFindById.mockResolvedValue(null);

      await expect(
        service.createRecord("pat-1", "user-1", "Sintomas relatados."),
      ).rejects.toThrowError("RECURSO_NAO_ENCONTRADO");
    });

    it("deve salvar o prontuário com o texto sem espaços nas pontas", async () => {
      const doctor = { id: "doc-1" };
      const patient = { id: "pat-1" };
      const record = { id: "rec-1", createdAt: new Date() };
      doctorFindByUserId.mockResolvedValue(doctor);
      patientFindById.mockResolvedValue(patient);
      hasActiveOrDoneLink.mockResolvedValue(true);
      recordCreate.mockReturnValue(record);
      recordSave.mockResolvedValue(record);

      await service.createRecord("pat-1", "user-1", "  Sintomas relatados.  ");

      expect(recordCreate).toHaveBeenCalledWith({
        patient,
        doctor,
        text: "Sintomas relatados.",
      });
      expect(recordSave).toHaveBeenCalledTimes(1);
    });
  });

  describe("findByPatient", () => {
    it("deve lançar RECURSO_NAO_ENCONTRADO se o paciente não existir", async () => {
      patientFindById.mockResolvedValue(null);
      const admin = new AuthUser("admin-1", ["admin"]);

      await expect(
        service.findByPatient("pat-1", admin, 1, 10),
      ).rejects.toThrowError("RECURSO_NAO_ENCONTRADO");
    });

    it("deve lançar ACESSO_NEGADO se o usuário não for admin nem médico", async () => {
      patientFindById.mockResolvedValue({ id: "pat-1" });
      const secretary = new AuthUser("sec-1", ["secretary"]);

      await expect(
        service.findByPatient("pat-1", secretary, 1, 10),
      ).rejects.toThrowError("ACESSO_NEGADO");
    });

    it("deve lançar ACESSO_NEGADO se o médico não tiver vínculo com o paciente", async () => {
      patientFindById.mockResolvedValue({ id: "pat-1" });
      doctorFindByUserId.mockResolvedValue({ id: "doc-1" });
      hasActiveOrDoneLink.mockResolvedValue(false);
      const doctorUser = new AuthUser("user-doc-1", ["doctor"]);

      await expect(
        service.findByPatient("pat-1", doctorUser, 1, 10),
      ).rejects.toThrowError("ACESSO_NEGADO");
      expect(recordFindByPatientPaginated).not.toHaveBeenCalled();
    });

    it("deve permitir que o admin liste os prontuários sem checar vínculo", async () => {
      patientFindById.mockResolvedValue({ id: "pat-1" });
      recordFindByPatientPaginated.mockResolvedValue([[], 0]);
      const admin = new AuthUser("admin-1", ["admin"]);

      await service.findByPatient("pat-1", admin, 1, 10);

      expect(hasActiveOrDoneLink).not.toHaveBeenCalled();
      expect(recordFindByPatientPaginated).toHaveBeenCalledWith("pat-1", 1, 10);
    });
  });
});
