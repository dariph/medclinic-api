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
const databaseUrl = process.env.DATABASE_URL?.trim();

const useSsl =
  process.env.DB_SSL !== undefined
    ? process.env.DB_SSL === "true"
    : databaseUrl
      ? databaseUrl.includes(".render.com")
      : isProduction;

export const AppDataSource = new DataSource({
  type: "postgres",
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: getEnvVar("DB_HOST"),
        port: Number(getEnvVar("DB_PORT")),
        username: getEnvVar("DB_USER"),
        password: getEnvVar("DB_PASS"),
        database: getEnvVar("DB_NAME"),
      }),
  synchronize: false,
  logging: !isProduction,
  entities: [User, Patient, Doctor, Appointment, MedicalRecord],
  migrations: isProduction
    ? ["dist/database/migrations/*.js"]
    : ["src/database/migrations/*.ts"],
  migrationsRun: isProduction,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
