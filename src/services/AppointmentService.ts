import { AppConstants } from "../constants/AppConstants.js";
import { AuthUser } from "../domain/AuthUser.js";
import type {
  IAppointmentRepository,
  IDoctorRepository,
  IPatientRepository,
  ITransactionManager,
} from "../domain/ports/RepositoryPorts.js";
import { ScheduleValidator } from "../domain/ScheduleValidator.js";
import type {
  AppointmentResponseDTO,
  FindAllAppointmentsQueryDTO,
} from "../dtos/AppDTOs.js";
import { Appointment, AppointmentStatus } from "../entities/Appointment.js";
import { AppointmentMapper } from "../mappers/EntityMappers.js";
import { AppError } from "../utils/AppError.js";
import { DateUtils } from "../utils/DateUtils.js";
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from "../utils/pagination.js";

export type { AppointmentResponseDTO };

const ALLOWED_STATUS_TRANSITIONS: Readonly<
  Record<AppointmentStatus, readonly AppointmentStatus[]>
> = {
  [AppointmentStatus.SCHEDULED]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.IN_PROGRESS]: [
    AppointmentStatus.DONE,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.DONE]: [],
  [AppointmentStatus.CANCELLED]: [],
};

export class AppointmentService {
  constructor(
    private readonly transactionManager: ITransactionManager,
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly doctorRepo: IDoctorRepository,
    private readonly patientRepo: IPatientRepository,
  ) {}

  private validateStatusTransition(
    currentStatus: AppointmentStatus,
    targetStatus: AppointmentStatus,
  ): void {
    const allowedTargets = ALLOWED_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTargets.includes(targetStatus)) {
      throw new AppError("TRANSICAO_INVALIDA");
    }
  }

  private validateTransitionAuthority(
    appointment: Appointment,
    targetStatus: AppointmentStatus,
    user: AuthUser,
  ): void {
    if (user.isAdmin()) {
      return;
    }

    const isResponsibleDoctor =
      user.isDoctor() && appointment.doctor.user.id === user.id;
    if (isResponsibleDoctor) {
      return;
    }

    const isSecretaryCancellingScheduled =
      user.isSecretary() &&
      appointment.status === AppointmentStatus.SCHEDULED &&
      targetStatus === AppointmentStatus.CANCELLED;
    if (isSecretaryCancellingScheduled) {
      return;
    }

    throw new AppError("ACESSO_NEGADO");
  }

  async create(
    doctorId: string,
    patientId: string,
    startsAtStr: string,
  ): Promise<AppointmentResponseDTO> {
    return this.transactionManager.execute(async (manager) => {
      const doctor = await this.doctorRepo.findByIdWithLock(doctorId, manager);
      if (!doctor) {
        throw new AppError("RECURSO_NAO_ENCONTRADO");
      }

      const patient = await this.patientRepo.findByIdWithLock(
        patientId,
        manager,
      );
      if (!patient) {
        throw new AppError("RECURSO_NAO_ENCONTRADO");
      }

      const rawStartsAt = new Date(startsAtStr);
      if (Number.isNaN(rawStartsAt.getTime())) {
        throw new AppError("DADOS_INVALIDOS");
      }

      const validShift = ScheduleValidator.findValidShift(
        doctor.shifts,
        rawStartsAt,
      );
      if (!validShift) {
        throw new AppError("HORARIO_FORA_DA_ESCALA");
      }

      const startsAt = DateUtils.normalizeStartAt(rawStartsAt);
      const endsAt = new Date(
        startsAt.getTime() +
          validShift.slotDurationMinutes * AppConstants.MILLISECONDS_IN_MINUTE,
      );

      const docConflict = await this.appointmentRepo.findConflict(
        "doctor",
        doctorId,
        startsAt,
        endsAt,
        manager,
      );
      if (docConflict) {
        throw new AppError("HORARIO_INDISPONIVEL");
      }

      const patConflict = await this.appointmentRepo.findConflict(
        "patient",
        patientId,
        startsAt,
        endsAt,
        manager,
      );
      if (patConflict) {
        throw new AppError("PACIENTE_INDISPONIVEL");
      }

      const appointment = this.appointmentRepo.create(
        {
          doctor,
          patient,
          startsAt,
          endsAt,
          status: AppointmentStatus.SCHEDULED,
        },
        manager,
      );

      await this.appointmentRepo.save(appointment, manager);
      return AppointmentMapper.toDTO(appointment);
    });
  }

  async findById(id: string, user: AuthUser): Promise<AppointmentResponseDTO> {
    const appointment = await this.appointmentRepo.findById(id);
    if (!appointment) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }

    if (user.isOnlyDoctor() && appointment.doctor.user.id !== user.id) {
      throw new AppError("ACESSO_NEGADO");
    }

    return AppointmentMapper.toDTO(appointment);
  }

  async findAll(
    user: AuthUser,
    queryParams: FindAllAppointmentsQueryDTO,
  ): Promise<PaginatedResponse<AppointmentResponseDTO>> {
    const [appointments, total] = await this.appointmentRepo.findAll(
      user,
      queryParams,
    );

    const formattedData = appointments.map((appointment) =>
      AppointmentMapper.toDTO(appointment),
    );

    return buildPaginatedResponse(
      formattedData,
      total,
      queryParams.page,
      queryParams.pageSize,
    );
  }

  async updateStatus(
    id: string,
    targetStatus: AppointmentStatus,
    user: AuthUser,
  ): Promise<AppointmentResponseDTO> {
    const appointment = await this.appointmentRepo.findById(id);
    if (!appointment) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }

    this.validateStatusTransition(appointment.status, targetStatus);
    this.validateTransitionAuthority(appointment, targetStatus, user);

    appointment.status = targetStatus;
    await this.appointmentRepo.save(appointment);

    return AppointmentMapper.toDTO(appointment);
  }
}
