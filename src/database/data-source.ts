import "reflect-metadata";
import dotenv from "dotenv";
import { DataSource } from "typeorm";

import { Appointment } from "../entities/Appointment.js";
import { Doctor } from "../entities/Doctor.js";
import { MedicalRecord } from "../entities/MedicalRecord.js";
import { Patient } from "../entities/Patient.js";
import { User } from "../entities/User.js";
import { getEnvVar } from "../utils/env.js";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const useSsl =
  process.env.DB_SSL !== undefined
    ? process.env.DB_SSL === "true"
    : isProduction;

export const AppDataSource = new DataSource({
  type: "postgres",
  host: getEnvVar("DB_HOST"),
  port: Number(getEnvVar("DB_PORT")),
  username: getEnvVar("DB_USER"),
  password: getEnvVar("DB_PASS"),
  database: getEnvVar("DB_NAME"),
  synchronize: false,
  logging: !isProduction,
  entities: [User, Patient, Doctor, Appointment, MedicalRecord],
  migrations: ["dist/database/migrations/*.js", "src/database/migrations/*.ts"],
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
