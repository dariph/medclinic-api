import { EntityManager, Repository } from "typeorm";

import { AppDataSource } from "../database/data-source.js";
import { AuthUser } from "../domain/AuthUser.js";
import type { IAppointmentRepository } from "../domain/ports/RepositoryPorts.js";
import type { FindAllAppointmentsQueryDTO } from "../dtos/AppDTOs.js";
import { Appointment, AppointmentStatus } from "../entities/Appointment.js";
import { DateUtils } from "../utils/DateUtils.js";

export class AppointmentRepository implements IAppointmentRepository {
  constructor(
    private readonly defaultManager: EntityManager = AppDataSource.manager,
  ) {}

  private getRepo(manager?: EntityManager): Repository<Appointment> {
    return (manager ?? this.defaultManager).getRepository(Appointment);
  }

  async findConflict(
    relation: "doctor" | "patient",
    id: string,
    startsAt: Date,
    endsAt: Date,
    manager?: EntityManager,
  ): Promise<Appointment | null> {
    return this.getRepo(manager)
      .createQueryBuilder("app")
      .innerJoin(`app.${relation}`, "rel")
      .where("rel.id = :id", { id })
      .andWhere("app.status != :status", {
        status: AppointmentStatus.CANCELLED,
      })
      .andWhere("app.startsAt < :endsAt AND app.endsAt > :startsAt", {
        startsAt,
        endsAt,
      })
      .getOne();
  }

  async findById(
    id: string,
    manager?: EntityManager,
  ): Promise<Appointment | null> {
    return this.getRepo(manager).findOne({
      where: { id },
      relations: ["doctor", "doctor.user", "patient"],
    });
  }

  async findActiveByDoctorAndPeriod(
    doctorId: string,
    fromDate: Date,
    toDate: Date,
    manager?: EntityManager,
  ): Promise<Appointment[]> {
    return this.getRepo(manager)
      .createQueryBuilder("app")
      .innerJoin("app.doctor", "doctor")
      .innerJoinAndSelect("app.patient", "patient")
      .where("doctor.id = :doctorId", { doctorId })
      .andWhere("app.status != :status", {
        status: AppointmentStatus.CANCELLED,
      })
      .andWhere("app.startsAt >= :fromDate AND app.startsAt <= :toDate", {
        fromDate,
        toDate,
      })
      .orderBy("app.startsAt", "ASC")
      .getMany();
  }

  async hasActiveOrDoneLink(
    doctorId: string,
    patientId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const link = await this.getRepo(manager).findOne({
      where: [
        {
          doctor: { id: doctorId },
          patient: { id: patientId },
          status: AppointmentStatus.IN_PROGRESS,
        },
        {
          doctor: { id: doctorId },
          patient: { id: patientId },
          status: AppointmentStatus.DONE,
        },
      ],
    });
    return link !== null;
  }

  async findAll(
    user: AuthUser,
    filters: FindAllAppointmentsQueryDTO,
  ): Promise<[Appointment[], number]> {
    const qb = this.getRepo()
      .createQueryBuilder("app")
      .innerJoinAndSelect("app.doctor", "doctor")
      .innerJoinAndSelect("doctor.user", "doctorUser")
      .innerJoinAndSelect("app.patient", "patient");

    if (user.isOnlyDoctor()) {
      qb.andWhere("doctorUser.id = :authenticatedUserId", {
        authenticatedUserId: user.id,
      });
    }

    if (filters.doctorId) {
      qb.andWhere("doctor.id = :doctorId", { doctorId: filters.doctorId });
    }

    if (filters.patientId) {
      qb.andWhere("patient.id = :patientId", { patientId: filters.patientId });
    }

    if (filters.status) {
      qb.andWhere("app.status = :status", { status: filters.status });
    }

    if (filters.from) {
      const fromDate = DateUtils.getZonedDate(filters.from, "00:00:00");
      qb.andWhere("app.startsAt >= :fromDate", { fromDate });
    }

    if (filters.to) {
      const toDate = DateUtils.getZonedDate(filters.to, "23:59:59");
      qb.andWhere("app.startsAt <= :toDate", { toDate });
    }

    const skip = (filters.page - 1) * filters.pageSize;
    qb.orderBy("app.startsAt", "ASC").skip(skip).take(filters.pageSize);

    return qb.getManyAndCount();
  }

  async save(
    appointment: Appointment,
    manager?: EntityManager,
  ): Promise<Appointment> {
    return this.getRepo(manager).save(appointment);
  }

  create(data: Partial<Appointment>, manager?: EntityManager): Appointment {
    return this.getRepo(manager).create(data);
  }
}
