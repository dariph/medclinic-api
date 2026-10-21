import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { Doctor } from "./Doctor.js";
import { Patient } from "./Patient.js";

export enum AppointmentStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  CANCELLED = "cancelled",
}

@Entity("appointments")
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Doctor)
  doctor!: Doctor;

  @ManyToOne(() => Patient)
  patient!: Patient;

  @Column({ type: "timestamptz" })
  startsAt!: Date;

  @Column({ type: "timestamptz" })
  endsAt!: Date;

  @Column({
    type: "enum",
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status!: AppointmentStatus;
}
