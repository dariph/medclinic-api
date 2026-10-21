import type { EntityManager } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DoctorService } from "./DoctorService.js";
import type {
  IAppointmentRepository,
  IDoctorRepository,
  ITransactionManager,
  IUserRepository,
} from "../domain/ports/RepositoryPorts.js";
import { ScheduleValidator } from "../domain/ScheduleValidator.js";
import { Appointment, AppointmentStatus } from "../entities/Appointment.js";
import { Doctor, type WorkShift } from "../entities/Doctor.js";
import { Patient } from "../entities/Patient.js";
import { User } from "../entities/User.js";

describe("DoctorService & ScheduleValidator", () => {
  let doctorService: DoctorService;
  let transactionManager: ITransactionManager;
  let doctorRepo: IDoctorRepository;
  let userRepo: IUserRepository;
  let appointmentRepo: IAppointmentRepository;

  const mockUser: User = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Dra. Helena",
    email: "helena@medclinic.com",
    password: "hashed_password",
    roles: ["doctor"],
    createdAt: new Date("2026-10-01T10:00:00Z"),
  };

  const mockDoctor: Doctor = {
    id: "22222222-2222-4222-8222-222222222222",
    crm: "CRM-SC-12345",
    user: mockUser,
    shifts: [
      {
        weekDay: 2,
        startTime: "08:00",
        endTime: "12:00",
        slotDurationMinutes: 30,
      },
    ],
  };

  beforeEach(() => {
    transactionManager = {
      execute: vi.fn(
        async <T>(op: (manager: EntityManager) => Promise<T>): Promise<T> =>
          op({} as EntityManager),
      ),
    };

    doctorRepo = {
      findByIdWithLock: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      findByCrm: vi.fn(),
      findAllPaginated: vi.fn(),
      create: vi.fn((data: Partial<Doctor>) => ({
        ...mockDoctor,
        ...data,
      })),
      save: vi.fn(async (doc: Doctor) => doc),
    };

    userRepo = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn((data: Partial<User>) => ({
        ...mockUser,
        ...data,
      })),
      save: vi.fn(async (u: User) => u),
    };

    appointmentRepo = {
      findConflict: vi.fn(),
      findById: vi.fn(),
      findActiveByDoctorAndPeriod: vi.fn(),
      hasActiveOrDoneLink: vi.fn(),
      findAll: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
    };

    doctorService = new DoctorService(
      transactionManager,
      doctorRepo,
      userRepo,
      appointmentRepo,
    );
  });

  describe("createDoctor", () => {
    it("deve criar médico e usuário na mesma transação com sucesso", async () => {
      vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(doctorRepo.findByCrm).mockResolvedValue(null);

      const result = await doctorService.createDoctor({
        name: "Dra. Helena",
        email: "helena@medclinic.com",
        password: "Password@123",
        crm: "CRM-SC-12345",
      });

      expect(result.crm).toBe("CRM-SC-12345");
      expect(result.user.email).toBe("helena@medclinic.com");
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(doctorRepo.save).toHaveBeenCalledTimes(1);
    });

    it("deve recusar criação quando e-mail já estiver cadastrado (EMAIL_JA_CADASTRADO)", async () => {
      vi.mocked(userRepo.findByEmail).mockResolvedValue(mockUser);

      await expect(
        doctorService.createDoctor({
          name: "Dra. Helena",
          email: "helena@medclinic.com",
          password: "Password@123",
          crm: "CRM-SC-12345",
        }),
      ).rejects.toMatchObject({ errorType: "EMAIL_JA_CADASTRADO" });
    });

    it("deve recusar criação quando CRM já estiver cadastrado (CRM_JA_CADASTRADO)", async () => {
      vi.mocked(userRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(doctorRepo.findByCrm).mockResolvedValue(mockDoctor);

      await expect(
        doctorService.createDoctor({
          name: "Dra. Helena",
          email: "novo@medclinic.com",
          password: "Password@123",
          crm: "CRM-SC-12345",
        }),
      ).rejects.toMatchObject({ errorType: "CRM_JA_CADASTRADO" });
    });
  });

  describe("findAll & findById", () => {
    it("deve listar médicos paginados", async () => {
      vi.mocked(doctorRepo.findAllPaginated).mockResolvedValue([
        [mockDoctor],
        1,
      ]);

      const result = await doctorService.findAll(1, 20, "Helena");
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("deve retornar médico por ID existente", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue(mockDoctor);
      const result = await doctorService.findById(mockDoctor.id);
      expect(result.id).toBe(mockDoctor.id);
    });

    it("deve lançar RECURSO_NAO_ENCONTRADO ao buscar médico inexistente", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue(null);
      await expect(doctorService.findById("id-invalido")).rejects.toMatchObject(
        {
          errorType: "RECURSO_NAO_ENCONTRADO",
        },
      );
    });
  });

  describe("getWorkSchedule & updateWorkSchedule", () => {
    it("deve retornar a escala de trabalho do médico", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue(mockDoctor);
      const result = await doctorService.getWorkSchedule(mockDoctor.id);
      expect(result.shifts).toHaveLength(1);
    });

    it("deve lançar RECURSO_NAO_ENCONTRADO em getWorkSchedule se médico não existir", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue(null);
      await expect(
        doctorService.getWorkSchedule("inexistente"),
      ).rejects.toMatchObject({ errorType: "RECURSO_NAO_ENCONTRADO" });
    });

    it("deve lançar RECURSO_NAO_ENCONTRADO em updateWorkSchedule se médico não existir", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue(null);
      await expect(
        doctorService.updateWorkSchedule("inexistente", []),
      ).rejects.toMatchObject({ errorType: "RECURSO_NAO_ENCONTRADO" });
    });

    it("deve aceitar turnos encostados no mesmo dia (08:00-12:00 e 12:00-18:00)", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue({
        ...mockDoctor,
        shifts: [],
      });

      const adjacentShifts: WorkShift[] = [
        {
          weekDay: 2,
          startTime: "08:00",
          endTime: "12:00",
          slotDurationMinutes: 30,
        },
        {
          weekDay: 2,
          startTime: "12:00",
          endTime: "18:00",
          slotDurationMinutes: 30,
        },
      ];

      const result = await doctorService.updateWorkSchedule(
        mockDoctor.id,
        adjacentShifts,
      );
      expect(result.shifts).toHaveLength(2);
    });

    it("deve rejeitar turnos sobrepostos no mesmo dia com DADOS_INVALIDOS", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue(mockDoctor);

      const overlappingShifts: WorkShift[] = [
        {
          weekDay: 2,
          startTime: "08:00",
          endTime: "12:00",
          slotDurationMinutes: 30,
        },
        {
          weekDay: 2,
          startTime: "11:30",
          endTime: "14:00",
          slotDurationMinutes: 30,
        },
      ];

      await expect(
        doctorService.updateWorkSchedule(mockDoctor.id, overlappingShifts),
      ).rejects.toMatchObject({ errorType: "DADOS_INVALIDOS" });
    });
  });

  describe("ScheduleValidator - casos de borda", () => {
    it("deve rejeitar quando shifts não for array, weekDay inválido, hora inválida, duração <= 0 ou startTime >= endTime", () => {
      expect(() => {
        ScheduleValidator.validateShifts(null as unknown as WorkShift[]);
      }).toThrow();
      expect(() => {
        ScheduleValidator.validateShifts([
          {
            weekDay: 7,
            startTime: "08:00",
            endTime: "12:00",
            slotDurationMinutes: 30,
          },
        ]);
      }).toThrow();
      expect(() => {
        ScheduleValidator.validateShifts([
          {
            weekDay: 1,
            startTime: "25:00",
            endTime: "12:00",
            slotDurationMinutes: 30,
          },
        ]);
      }).toThrow();
      expect(() => {
        ScheduleValidator.validateShifts([
          {
            weekDay: 1,
            startTime: "08:00",
            endTime: "12:00",
            slotDurationMinutes: 0,
          },
        ]);
      }).toThrow();
      expect(() => {
        ScheduleValidator.validateShifts([
          {
            weekDay: 1,
            startTime: "12:00",
            endTime: "08:00",
            slotDurationMinutes: 30,
          },
        ]);
      }).toThrow();
    });

    it("findValidShift deve retornar undefined se os segundos ou milissegundos não forem zero", () => {
      const dateWithSeconds = new Date("2026-10-13T11:00:15.000Z");
      const shift = ScheduleValidator.findValidShift(
        mockDoctor.shifts,
        dateWithSeconds,
      );
      expect(shift).toBeUndefined();
    });
  });

  describe("getCalendar", () => {
    it("deve retornar a escala e os agendamentos ativos no período", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue(mockDoctor);
      const mockPatient: Patient = {
        id: "33333333-3333-4333-8333-333333333333",
        name: "Carlos",
        cpf: "12345678901",
        createdAt: new Date(),
      };
      const mockApp: Appointment = {
        id: "44444444-4444-4444-8444-444444444444",
        doctor: mockDoctor,
        patient: mockPatient,
        startsAt: new Date("2026-10-13T11:00:00.000Z"),
        endsAt: new Date("2026-10-13T11:30:00.000Z"),
        status: AppointmentStatus.SCHEDULED,
      };
      vi.mocked(appointmentRepo.findActiveByDoctorAndPeriod).mockResolvedValue([
        mockApp,
      ]);

      const calendar = await doctorService.getCalendar(
        mockDoctor.id,
        "2026-10-12",
        "2026-10-16",
      );

      expect(calendar.workSchedule.shifts).toHaveLength(1);
      expect(calendar.appointments).toHaveLength(1);
      expect(calendar.appointments[0]?.id).toBe(mockApp.id);
    });

    it("deve rejeitar se from for posterior a to ou se intervalo for maior que 31 dias", async () => {
      await expect(
        doctorService.getCalendar(mockDoctor.id, "2026-10-20", "2026-10-10"),
      ).rejects.toMatchObject({ errorType: "DADOS_INVALIDOS" });

      await expect(
        doctorService.getCalendar(mockDoctor.id, "2026-10-01", "2026-11-15"),
      ).rejects.toMatchObject({ errorType: "DADOS_INVALIDOS" });
    });

    it("deve lançar RECURSO_NAO_ENCONTRADO se médico não existir ao consultar calendário", async () => {
      vi.mocked(doctorRepo.findById).mockResolvedValue(null);
      await expect(
        doctorService.getCalendar("inexistente", "2026-10-12", "2026-10-16"),
      ).rejects.toMatchObject({ errorType: "RECURSO_NAO_ENCONTRADO" });
    });
  });
});
