import type { EntityManager } from "typeorm";

import type { FindAllAppointmentsQueryDTO } from "../../dtos/AppDTOs.js";
import type { Appointment } from "../../entities/Appointment.js";
import type { Doctor } from "../../entities/Doctor.js";
import type { MedicalRecord } from "../../entities/MedicalRecord.js";
import type { Patient } from "../../entities/Patient.js";
import type { User } from "../../entities/User.js";
import type { AuthUser } from "../AuthUser.js";

export interface ITransactionManager {
  execute<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T>;
}

export interface IUserRepository {
  findByEmail(email: string, manager?: EntityManager): Promise<User | null>;
  findById(id: string, manager?: EntityManager): Promise<User | null>;
  create(data: Partial<User>, manager?: EntityManager): User;
  save(user: User, manager?: EntityManager): Promise<User>;
}

export interface IPatientRepository {
  findByIdWithLock(id: string, manager: EntityManager): Promise<Patient | null>;
  findById(id: string, manager?: EntityManager): Promise<Patient | null>;
  findByCpfWithDeleted(
    cpf: string,
    manager?: EntityManager,
  ): Promise<Patient | null>;
  findAllPaginated(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<[Patient[], number]>;
  create(data: Partial<Patient>, manager?: EntityManager): Patient;
  save(patient: Patient, manager?: EntityManager): Promise<Patient>;
  softRemove(patient: Patient, manager?: EntityManager): Promise<void>;
}

export interface IDoctorRepository {
  findByIdWithLock(id: string, manager: EntityManager): Promise<Doctor | null>;
  findById(id: string, manager?: EntityManager): Promise<Doctor | null>;
  findByUserId(userId: string, manager?: EntityManager): Promise<Doctor | null>;
  findByCrm(crm: string, manager?: EntityManager): Promise<Doctor | null>;
  findAllPaginated(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<[Doctor[], number]>;
  create(data: Partial<Doctor>, manager?: EntityManager): Doctor;
  save(doctor: Doctor, manager?: EntityManager): Promise<Doctor>;
}

export interface IAppointmentRepository {
  findConflict(
    relation: "doctor" | "patient",
    id: string,
    startsAt: Date,
    endsAt: Date,
    manager?: EntityManager,
  ): Promise<Appointment | null>;
  findById(id: string, manager?: EntityManager): Promise<Appointment | null>;
  findActiveByDoctorAndPeriod(
    doctorId: string,
    fromDate: Date,
    toDate: Date,
    manager?: EntityManager,
  ): Promise<Appointment[]>;
  hasActiveOrDoneLink(
    doctorId: string,
    patientId: string,
    manager?: EntityManager,
  ): Promise<boolean>;
  findAll(
    user: AuthUser,
    filters: FindAllAppointmentsQueryDTO,
  ): Promise<[Appointment[], number]>;
  save(appointment: Appointment, manager?: EntityManager): Promise<Appointment>;
  create(data: Partial<Appointment>, manager?: EntityManager): Appointment;
}

export interface IMedicalRecordRepository {
  create(data: Partial<MedicalRecord>, manager?: EntityManager): MedicalRecord;
  save(record: MedicalRecord, manager?: EntityManager): Promise<MedicalRecord>;
  findByPatientPaginated(
    patientId: string,
    page: number,
    pageSize: number,
  ): Promise<[MedicalRecord[], number]>;
}
