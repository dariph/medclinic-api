import { EntityManager, ILike, Repository } from "typeorm";

import { AppDataSource } from "../database/data-source.js";
import type { IDoctorRepository } from "../domain/ports/RepositoryPorts.js";
import { Doctor } from "../entities/Doctor.js";

export class DoctorRepository implements IDoctorRepository {
  constructor(
    private readonly defaultManager: EntityManager = AppDataSource.manager,
  ) {}

  private getRepo(manager?: EntityManager): Repository<Doctor> {
    return (manager ?? this.defaultManager).getRepository(Doctor);
  }

  async findByIdWithLock(
    id: string,
    manager: EntityManager,
  ): Promise<Doctor | null> {
    return this.getRepo(manager)
      .createQueryBuilder("doctor")
      .where("doctor.id = :id", { id })
      .setLock("pessimistic_write")
      .getOne();
  }

  async findById(id: string, manager?: EntityManager): Promise<Doctor | null> {
    return this.getRepo(manager).findOne({
      where: { id },
      relations: ["user"],
    });
  }

  async findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<Doctor | null> {
    return this.getRepo(manager).findOne({
      where: { user: { id: userId } },
      relations: ["user"],
    });
  }

  async findByCrm(
    crm: string,
    manager?: EntityManager,
  ): Promise<Doctor | null> {
    return this.getRepo(manager).findOne({
      where: { crm },
    });
  }

  async findAllPaginated(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<[Doctor[], number]> {
    const skip = (page - 1) * pageSize;
    const whereCondition = name ? { user: { name: ILike(`%${name}%`) } } : {};
    return this.getRepo().findAndCount({
      where: whereCondition,
      relations: ["user"],
      skip,
      take: pageSize,
    });
  }

  create(data: Partial<Doctor>, manager?: EntityManager): Doctor {
    return this.getRepo(manager).create(data);
  }

  async save(doctor: Doctor, manager?: EntityManager): Promise<Doctor> {
    return this.getRepo(manager).save(doctor);
  }
}
