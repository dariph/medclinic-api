import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { User } from "./User.js";

export interface WorkShift {
  weekDay: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

@Entity("doctors")
export class Doctor {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  crm!: string;

  @OneToOne(() => User, { cascade: true })
  @JoinColumn()
  user!: User;

  @Column({ type: "jsonb", default: [] })
  shifts!: WorkShift[];
}
