import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { Doctor } from "./Doctor.js";
import { Patient } from "./Patient.js";

@Entity("medical_records")
export class MedicalRecord {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Patient)
  patient!: Patient;

  @ManyToOne(() => Doctor)
  doctor!: Doctor;

  @Column({ type: "text" })
  text!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
