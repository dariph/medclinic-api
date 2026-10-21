import type { IPatientRepository } from "../domain/ports/RepositoryPorts.js";
import type { PatientResponseDTO } from "../dtos/AppDTOs.js";
import { PatientMapper } from "../mappers/EntityMappers.js";
import { AppError } from "../utils/AppError.js";
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from "../utils/pagination.js";

export class PatientService {
  constructor(private readonly patientRepository: IPatientRepository) {}

  async create(data: {
    name: string;
    cpf: string;
  }): Promise<PatientResponseDTO> {
    const existingPatient = await this.patientRepository.findByCpfWithDeleted(
      data.cpf,
    );
    if (existingPatient) {
      throw new AppError("CPF_JA_CADASTRADO");
    }

    const patient = this.patientRepository.create(data);
    const saved = await this.patientRepository.save(patient);
    return PatientMapper.toDTO(saved);
  }

  async findAll(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<PaginatedResponse<PatientResponseDTO>> {
    const [patients, total] = await this.patientRepository.findAllPaginated(
      page,
      pageSize,
      name,
    );
    const formatted = patients.map((p) => PatientMapper.toDTO(p));
    return buildPaginatedResponse(formatted, total, page, pageSize);
  }

  async findById(id: string): Promise<PatientResponseDTO> {
    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }
    return PatientMapper.toDTO(patient);
  }

  async update(id: string, name: string): Promise<PatientResponseDTO> {
    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }
    patient.name = name;
    const updated = await this.patientRepository.save(patient);
    return PatientMapper.toDTO(updated);
  }

  async delete(id: string): Promise<void> {
    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw new AppError("RECURSO_NAO_ENCONTRADO");
    }
    await this.patientRepository.softRemove(patient);
  }
}
