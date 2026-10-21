import type { EntityManager } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppointmentService } from "./AppointmentService.js";
import { AuthUser } from "../domain/AuthUser.js";
import type {
  IAppointmentRepository,
  IDoctorRepository,
  IPatientRepository,
  ITransactionManager,
} from "../domain/ports/RepositoryPorts.js";
import { Appointment, AppointmentStatus } from "../entities/Appointment.js";
import type { Doctor } from "../entities/Doctor.js";
import type { Patient } from "../entities/Patient.js";
import type { User } from "../entities/User.js";

describe("AppointmentService", () => {
  let service: AppointmentService;
  let transactionManager: ITransactionManager;
  let appointmentRepo: IAppointmentRepository;
  let doctorRepo: IDoctorRepository;
  let patientRepo: IPatientRepository;

  const doctorUser: User = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Dr. House",
    email: "house@medclinic.com",
    password: "hash",
    roles: ["doctor"],
    createdAt: new Date(),
  };

  const mockDoctor: Doctor = {
    id: "22222222-2222-4222-8222-222222222222",
    crm: "CRM-SC-999",
    user: doctorUser,
    shifts: [
      {
        weekDay: 2, // Terça-feira (2026-10-13)
        startTime: "08:00",
        endTime: "12:00",
        slotDurationMinutes: 30,
      },
    ],
  };

  const mockPatient: Patient = {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Paciente Teste",
    cpf: "12345678901",
    createdAt: new Date(),
  };

  let existingDoctorAppointments: Appointment[] = [];
  let existingPatientAppointments: Appointment[] = [];

  const hasOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
    aStart < bEnd && bStart < aEnd;

  beforeEach(() => {
    existingDoctorAppointments = [];
    existingPatientAppointments = [];

    transactionManager = {
      execute: vi.fn(
        async <T>(op: (manager: EntityManager) => Promise<T>): Promise<T> =>
          op({} as EntityManager),
      ),
    };

    doctorRepo = {
      findByIdWithLock: vi.fn(async () => mockDoctor),
      findById: vi.fn(async () => mockDoctor),
      findByUserId: vi.fn(),
      findByCrm: vi.fn(),
      findAllPaginated: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
    };

    patientRepo = {
      findByIdWithLock: vi.fn(async () => mockPatient),
      findById: vi.fn(async () => mockPatient),
      findByCpfWithDeleted: vi.fn(),
      findAllPaginated: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      softRemove: vi.fn(),
    };

    appointmentRepo = {
      findConflict: vi.fn(async (relation, _id, startsAt, endsAt) => {
        const list =
          relation === "doctor"
            ? existingDoctorAppointments
            : existingPatientAppointments;
        return (
          list.find(
            (a) =>
              a.status !== AppointmentStatus.CANCELLED &&
              hasOverlap(a.startsAt, a.endsAt, startsAt, endsAt),
          ) ?? null
        );
      }),
      findById: vi.fn(),
      findActiveByDoctorAndPeriod: vi.fn(),
      hasActiveOrDoneLink: vi.fn(),
      findAll: vi.fn(async () => [[], 0]),
      create: vi.fn((data: Partial<Appointment>) => ({
        id: "44444444-4444-4444-8444-444444444444",
        doctor: mockDoctor,
        patient: mockPatient,
        startsAt: data.startsAt!,
        endsAt: data.endsAt!,
        status: data.status ?? AppointmentStatus.SCHEDULED,
      })),
      save: vi.fn(async (app: Appointment) => app),
    };

    service = new AppointmentService(
      transactionManager,
      appointmentRepo,
      doctorRepo,
      patientRepo,
    );
  });

  describe("Criação de agendamento e sobreposições", () => {
    it("deve criar agendamento com sucesso em horário válido", async () => {
      const result = await service.create(
        mockDoctor.id,
        mockPatient.id,
        "2026-10-13T10:00:00-03:00",
      );
      expect(result.status).toBe(AppointmentStatus.SCHEDULED);
    });

    it("deve recusar se médico ou paciente não existirem (404)", async () => {
      vi.mocked(doctorRepo.findByIdWithLock).mockResolvedValueOnce(null);
      await expect(
        service.create(
          "inexistente",
          mockPatient.id,
          "2026-10-13T10:00:00-03:00",
        ),
      ).rejects.toMatchObject({ errorType: "RECURSO_NAO_ENCONTRADO" });

      vi.mocked(patientRepo.findByIdWithLock).mockResolvedValueOnce(null);
      await expect(
        service.create(
          mockDoctor.id,
          "inexistente",
          "2026-10-13T10:00:00-03:00",
        ),
      ).rejects.toMatchObject({ errorType: "RECURSO_NAO_ENCONTRADO" });
    });

    it("deve recusar horários fora da escala ou com conflitos", async () => {
      // Fora da escala
      await expect(
        service.create(
          mockDoctor.id,
          mockPatient.id,
          "2026-10-13T15:00:00-03:00",
        ),
      ).rejects.toMatchObject({ errorType: "HORARIO_FORA_DA_ESCALA" });

      // Conflito médico
      existingDoctorAppointments = [
        {
          id: "app-1",
          doctor: mockDoctor,
          patient: mockPatient,
          startsAt: new Date("2026-10-13T10:00:00-03:00"),
          endsAt: new Date("2026-10-13T10:30:00-03:00"),
          status: AppointmentStatus.SCHEDULED,
        },
      ];
      await expect(
        service.create(
          mockDoctor.id,
          mockPatient.id,
          "2026-10-13T10:00:00-03:00",
        ),
      ).rejects.toMatchObject({ errorType: "HORARIO_INDISPONIVEL" });

      // Conflito paciente
      existingDoctorAppointments = [];
      existingPatientAppointments = [...existingDoctorAppointments];
      // simula conflito paciente
      vi.mocked(appointmentRepo.findConflict)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "pat-conf" } as never);

      await expect(
        service.create(
          mockDoctor.id,
          mockPatient.id,
          "2026-10-13T10:00:00-03:00",
        ),
      ).rejects.toMatchObject({ errorType: "PACIENTE_INDISPONIVEL" });
    });
  });

  describe("findById & findAll (Cobertura de linhas 161 a 192)", () => {
    const sampleApp: Appointment = {
      id: "44444444-4444-4444-8444-444444444444",
      doctor: mockDoctor,
      patient: mockPatient,
      startsAt: new Date("2026-10-13T10:00:00-03:00"),
      endsAt: new Date("2026-10-13T10:30:00-03:00"),
      status: AppointmentStatus.SCHEDULED,
    };

    it("deve buscar por ID com sucesso (admin e médico responsável) e barrar médico alheio (403)", async () => {
      vi.mocked(appointmentRepo.findById).mockResolvedValue(sampleApp);

      // Admin acessa
      const adminUser = new AuthUser("admin-id", ["admin"]);
      const resAdmin = await service.findById(sampleApp.id, adminUser);
      expect(resAdmin.id).toBe(sampleApp.id);

      // Médico dono acessa
      const ownerUser = new AuthUser(doctorUser.id, ["doctor"]);
      const resOwner = await service.findById(sampleApp.id, ownerUser);
      expect(resOwner.id).toBe(sampleApp.id);

      // Médico alheio tenta acessar -> ACESSO_NEGADO (403)
      const otherDoctor = new AuthUser("outro-doc-id", ["doctor"]);
      await expect(
        service.findById(sampleApp.id, otherDoctor),
      ).rejects.toMatchObject({ errorType: "ACESSO_NEGADO" });

      // Inexistente -> 404
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce(null);
      await expect(
        service.findById("inexistente", adminUser),
      ).rejects.toMatchObject({ errorType: "RECURSO_NAO_ENCONTRADO" });
    });

    it("deve listar agendamentos com findAll paginado", async () => {
      vi.mocked(appointmentRepo.findAll).mockResolvedValue([[sampleApp], 1]);
      const adminUser = new AuthUser("admin-id", ["admin"]);

      const result = await service.findAll(adminUser, {
        page: 1,
        pageSize: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("updateStatus (Cobertura completa de transições e autoridades)", () => {
    const baseApp = (): Appointment => ({
      id: "app-id",
      doctor: mockDoctor,
      patient: mockPatient,
      startsAt: new Date("2026-10-13T10:00:00-03:00"),
      endsAt: new Date("2026-10-13T10:30:00-03:00"),
      status: AppointmentStatus.SCHEDULED,
    });

    it("deve permitir todas as transições e autoridades válidas", async () => {
      const docAuth = new AuthUser(doctorUser.id, ["doctor"]);
      const adminAuth = new AuthUser("admin-id", ["admin"]);
      const secAuth = new AuthUser("sec-id", ["secretary"]);

      // 1. scheduled -> in_progress (médico ou admin)
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce(baseApp());
      let res = await service.updateStatus(
        "app-id",
        AppointmentStatus.IN_PROGRESS,
        docAuth,
      );
      expect(res.status).toBe(AppointmentStatus.IN_PROGRESS);

      // 2. in_progress -> done (médico ou admin)
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce({
        ...baseApp(),
        status: AppointmentStatus.IN_PROGRESS,
      });
      res = await service.updateStatus(
        "app-id",
        AppointmentStatus.DONE,
        adminAuth,
      );
      expect(res.status).toBe(AppointmentStatus.DONE);

      // 3. scheduled -> cancelled (admin, secretária ou médico)
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce(baseApp());
      res = await service.updateStatus(
        "app-id",
        AppointmentStatus.CANCELLED,
        secAuth,
      );
      expect(res.status).toBe(AppointmentStatus.CANCELLED);

      // 4. in_progress -> cancelled (admin ou médico)
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce({
        ...baseApp(),
        status: AppointmentStatus.IN_PROGRESS,
      });
      res = await service.updateStatus(
        "app-id",
        AppointmentStatus.CANCELLED,
        docAuth,
      );
      expect(res.status).toBe(AppointmentStatus.CANCELLED);
    });

    it("deve recusar transições inválidas, sem autoridade ou agendamento inexistente", async () => {
      const secAuth = new AuthUser("sec-id", ["secretary"]);
      const docAuth = new AuthUser(doctorUser.id, ["doctor"]);

      // Inexistente -> 404
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce(null);
      await expect(
        service.updateStatus(
          "inexistente",
          AppointmentStatus.CANCELLED,
          docAuth,
        ),
      ).rejects.toMatchObject({ errorType: "RECURSO_NAO_ENCONTRADO" });

      // Transição não permitida (scheduled -> done) -> 422 TRANSICAO_INVALIDA
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce(baseApp());
      await expect(
        service.updateStatus("app-id", AppointmentStatus.DONE, docAuth),
      ).rejects.toMatchObject({ errorType: "TRANSICAO_INVALIDA" });

      // Secretária tentando cancelar consulta in_progress -> 403 ACESSO_NEGADO
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce({
        ...baseApp(),
        status: AppointmentStatus.IN_PROGRESS,
      });
      await expect(
        service.updateStatus("app-id", AppointmentStatus.CANCELLED, secAuth),
      ).rejects.toMatchObject({ errorType: "ACESSO_NEGADO" });

      // Secretária tentando iniciar consulta (scheduled -> in_progress) -> 403 ACESSO_NEGADO
      vi.mocked(appointmentRepo.findById).mockResolvedValueOnce(baseApp());
      await expect(
        service.updateStatus("app-id", AppointmentStatus.IN_PROGRESS, secAuth),
      ).rejects.toMatchObject({ errorType: "ACESSO_NEGADO" });
    });
  });
});
