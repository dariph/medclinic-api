import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  email!: string;

  @Column({ type: "varchar", select: false })
  password!: string;

  @Column({ type: "simple-array", default: "secretary" })
  roles!: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
