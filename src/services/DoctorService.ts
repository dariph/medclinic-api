import bcrypt from "bcryptjs";

import type {
  IAppointmentRepository,
  IDoctorRepository,
  ITransactionManager,
  IUserRepository,
} from "../domain/ports/RepositoryPorts.js";
import { ScheduleValidator } from "../domain/ScheduleValidator.js";
import type {
  DoctorCalendarResponseDTO,
  DoctorResponseDTO,
} from "../dtos/AppDTOs.js";
import type { WorkShift } from "../entities/Doctor.js";
import { DoctorMapper } from "../mappers/EntityMappers.js";
import { AppError } from "../utils/AppError.js";
import { DateUtils } from "../utils/DateUtils.js";
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from "../utils/pagination.js";

export type { WorkShift };

export interface CreateDoctorInput {
  name: string;
  email: string;
  password: string;
  crm: string;
}

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const MAX_CALENDAR_DAYS = 31;

export class DoctorService {
  constructor(
    private readonly transactionManager: ITransactionManager,
    private readonly doctorRepository: IDoctorRepository,
    private readonly userRepository: IUserRepository,
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async createDoctor(data: CreateDoctorInput): Promise<DoctorResponseDTO> {
    return this.transactionManager.execute(async (manager) => {
      const existingUser = await this.userRepository.findByEmail(
        data.email,
        manager,
      );
      if (existingUser) {
        throw new AppError("EMAIL_JA_CADASTRADO");
      }

      const existingDoctor = await this.doctorRepository.findByCrm(
        data.crm,
        manager,
      );
      if (existingDoctor) {
        throw new AppError("CRM_JA_CADASTRADO");
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = this.userRepository.create(
        {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          roles: ["doctor"],
        },
        manager,
      );
      await this.userRepository.save(user, manager);

      const doctor = this.doctorRepository.create(
        {
          crm: data.crm,
          user,
          shifts: [],
        },
        manager,
      );
      await this.doctorRepository.save(doctor, manager);

      return DoctorMapper.toDTO(doctor);
    });
  }

  async findAll(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<PaginatedResponse<DoctorResponseDTO>> {
    const [doctors, total] = await this.doctorRepository.findAllPaginated(
      page,
      pageSize,
      name,
    );
    const formattedDoctors = doctors.map((doctor) =>
      DoctorMapper.toDTO(doctor),
    );
    return buildPaginatedResponse(formattedDoctors, total, page, pageSize);
  }

  async findById(id: string): Promise<DoctorResponseDTO> {
    const doctor = await this.doctorRepository.findById(id);
    if (!doctor) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }
    return DoctorMapper.toDTO(doctor);
  }

  async getWorkSchedule(doctorId: string): Promise<{ shifts: WorkShift[] }> {
    const doctor = await this.doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }
    return { shifts: doctor.shifts };
  }

  async updateWorkSchedule(
    doctorId: string,
    shifts: WorkShift[],
  ): Promise<{ shifts: WorkShift[] }> {
    const doctor = await this.doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }
    ScheduleValidator.validateShifts(shifts);
    doctor.shifts = shifts;
    await this.doctorRepository.save(doctor);
    return { shifts: doctor.shifts };
  }

  async getCalendar(
    doctorId: string,
    from: string,
    to: string,
  ): Promise<DoctorCalendarResponseDTO> {
    const fromStart = DateUtils.getZonedDate(from, "00:00:00");
    const toStart = DateUtils.getZonedDate(to, "00:00:00");
    if (fromStart > toStart) {
      throw new AppError("DADOS_INVALIDOS");
    }

    const diffDays = Math.round(
      (toStart.getTime() - fromStart.getTime()) / MILLISECONDS_PER_DAY,
    );
    if (diffDays > MAX_CALENDAR_DAYS) {
      throw new AppError("DADOS_INVALIDOS");
    }

    const doctor = await this.doctorRepository.findById(doctorId);
    if (!doctor) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }

    const toEnd = DateUtils.getZonedDate(to, "23:59:59");
    const appointments =
      await this.appointmentRepository.findActiveByDoctorAndPeriod(
        doctorId,
        fromStart,
        toEnd,
      );

    return {
      workSchedule: { shifts: doctor.shifts },
      appointments: appointments.map((app) => ({
        id: app.id,
        patientId: app.patient.id,
        startsAt: app.startsAt,
        endsAt: app.endsAt,
        status: app.status,
      })),
    };
  }
}
