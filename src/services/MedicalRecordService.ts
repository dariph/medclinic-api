import { AuthUser } from "../domain/AuthUser.js";
import type {
  IAppointmentRepository,
  IDoctorRepository,
  IMedicalRecordRepository,
  IPatientRepository,
} from "../domain/ports/RepositoryPorts.js";
import type { MedicalRecordResponseDTO } from "../dtos/AppDTOs.js";
import { MedicalRecordMapper } from "../mappers/EntityMappers.js";
import { AppError } from "../utils/AppError.js";
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from "../utils/pagination.js";

export class MedicalRecordService {
  constructor(
    private readonly medicalRecordRepository: IMedicalRecordRepository,
    private readonly patientRepository: IPatientRepository,
    private readonly doctorRepository: IDoctorRepository,
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async createRecord(
    patientId: string,
    userId: string,
    text: string,
  ): Promise<MedicalRecordResponseDTO> {
    if (!text || text.trim().length === 0) {
      throw new AppError("DADOS_INVALIDOS");
    }

    const doctor = await this.doctorRepository.findByUserId(userId);
    if (!doctor) {
      throw new AppError("ACESSO_NEGADO");
    }

    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }

    const hasLink = await this.appointmentRepository.hasActiveOrDoneLink(
      doctor.id,
      patientId,
    );
    if (!hasLink) {
      throw new AppError("ACESSO_NEGADO");
    }

    const record = this.medicalRecordRepository.create({
      patient,
      doctor,
      text: text.trim(),
    });
    const saved = await this.medicalRecordRepository.save(record);
    return MedicalRecordMapper.toDTO(saved, patient.id, doctor.id);
  }

  async findByPatient(
    patientId: string,
    user: AuthUser,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<MedicalRecordResponseDTO>> {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }

    if (!user.isAdmin()) {
      if (!user.isDoctor()) {
        throw new AppError("ACESSO_NEGADO");
      }
      const doctor = await this.doctorRepository.findByUserId(user.id);
      if (!doctor) {
        throw new AppError("ACESSO_NEGADO");
      }
      const hasLink = await this.appointmentRepository.hasActiveOrDoneLink(
        doctor.id,
        patientId,
      );
      if (!hasLink) {
        throw new AppError("ACESSO_NEGADO");
      }
    }

    const [records, total] =
      await this.medicalRecordRepository.findByPatientPaginated(
        patientId,
        page,
        pageSize,
      );

    const formattedRecords = records.map((record) =>
      MedicalRecordMapper.toDTO(record, patient.id, record.doctor.id),
    );
    return buildPaginatedResponse(formattedRecords, total, page, pageSize);
  }
}
