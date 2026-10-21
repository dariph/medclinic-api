import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsersAndClinicTables1710000000000 implements MigrationInterface {
  name = "CreateUsersAndClinicTables1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "email" varchar(100) NOT NULL,
        "password" varchar NOT NULL,
        "roles" text NOT NULL DEFAULT 'secretary',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "cpf" varchar(11) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_patients_cpf" UNIQUE ("cpf"),
        CONSTRAINT "PK_patients_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "crm" varchar(50) NOT NULL,
        "shifts" jsonb NOT NULL DEFAULT '[]',
        "userId" uuid,
        CONSTRAINT "UQ_doctors_crm" UNIQUE ("crm"),
        CONSTRAINT "REL_doctors_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_doctors_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_doctors_users" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."appointments_status_enum" AS ENUM('scheduled', 'in_progress', 'done', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endsAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'scheduled',
        "doctorId" uuid,
        "patientId" uuid,
        CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_appointments_doctors" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_appointments_patients" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "medical_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "text" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "patientId" uuid,
        "doctorId" uuid,
        CONSTRAINT "PK_medical_records_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_medical_records_patients" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_medical_records_doctors" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "medical_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."appointments_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "doctors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
