import bcrypt from "bcryptjs";
import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedAdmin1720000000000 implements MigrationInterface {
  name = "SeedAdmin1720000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn(
        "ADMIN_EMAIL ou ADMIN_PASSWORD não definidos. Ignorando seed do admin.",
      );
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await queryRunner.query(
      `INSERT INTO users (name, email, password, roles) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
      ["Admin Principal", email, hash, "admin"],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.ADMIN_EMAIL;
    if (email) {
      await queryRunner.query(`DELETE FROM users WHERE email = $1`, [email]);
    }
  }
}
