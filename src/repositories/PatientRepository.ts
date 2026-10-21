import { EntityManager, ILike, Repository } from "typeorm";

import { AppDataSource } from "../database/data-source.js";
import type { IPatientRepository } from "../domain/ports/RepositoryPorts.js";
import { Patient } from "../entities/Patient.js";

export class PatientRepository implements IPatientRepository {
  constructor(
    private readonly defaultManager: EntityManager = AppDataSource.manager,
  ) {}

  private getRepo(manager?: EntityManager): Repository<Patient> {
    return (manager ?? this.defaultManager).getRepository(Patient);
  }

  async findByIdWithLock(
    id: string,
    manager: EntityManager,
  ): Promise<Patient | null> {
    return this.getRepo(manager)
      .createQueryBuilder("patient")
      .where("patient.id = :id", { id })
      .setLock("pessimistic_write")
      .getOne();
  }

  async findById(id: string, manager?: EntityManager): Promise<Patient | null> {
    return this.getRepo(manager).findOne({ where: { id } });
  }

  async findByCpfWithDeleted(
    cpf: string,
    manager?: EntityManager,
  ): Promise<Patient | null> {
    return this.getRepo(manager).findOne({
      where: { cpf },
      withDeleted: true,
    });
  }

  async findAllPaginated(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<[Patient[], number]> {
    const skip = (page - 1) * pageSize;
    const whereCondition = name ? { name: ILike(`%${name}%`) } : {};
    return this.getRepo().findAndCount({
      where: whereCondition,
      skip,
      take: pageSize,
      order: { createdAt: "DESC" },
    });
  }

  create(data: Partial<Patient>, manager?: EntityManager): Patient {
    return this.getRepo(manager).create(data);
  }

  async save(patient: Patient, manager?: EntityManager): Promise<Patient> {
    return this.getRepo(manager).save(patient);
  }

  async softRemove(patient: Patient, manager?: EntityManager): Promise<void> {
    await this.getRepo(manager).softRemove(patient);
  }
}
