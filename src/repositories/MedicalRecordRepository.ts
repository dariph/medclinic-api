import { EntityManager, Repository } from "typeorm";

import { AppDataSource } from "../database/data-source.js";
import type { IMedicalRecordRepository } from "../domain/ports/RepositoryPorts.js";
import { MedicalRecord } from "../entities/MedicalRecord.js";

export class MedicalRecordRepository implements IMedicalRecordRepository {
  constructor(
    private readonly defaultManager: EntityManager = AppDataSource.manager,
  ) {}

  private getRepo(manager?: EntityManager): Repository<MedicalRecord> {
    return (manager ?? this.defaultManager).getRepository(MedicalRecord);
  }

  create(data: Partial<MedicalRecord>, manager?: EntityManager): MedicalRecord {
    return this.getRepo(manager).create(data);
  }

  async save(
    record: MedicalRecord,
    manager?: EntityManager,
  ): Promise<MedicalRecord> {
    return this.getRepo(manager).save(record);
  }

  async findByPatientPaginated(
    patientId: string,
    page: number,
    pageSize: number,
  ): Promise<[MedicalRecord[], number]> {
    return this.getRepo().findAndCount({
      where: { patient: { id: patientId } },
      relations: ["doctor"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }
}
