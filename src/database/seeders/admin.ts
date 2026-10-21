import "reflect-metadata";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import { User } from "../../entities/User.js";
import { AppDataSource } from "../data-source.js";

dotenv.config();

async function seedAdmin() {
  try {
    await AppDataSource.initialize();

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.error(
        "❌ Erro: ADMIN_EMAIL ou ADMIN_PASSWORD não encontrados no arquivo .env",
      );
      process.exit(1);
    }

    const userRepository = AppDataSource.getRepository(User);

    const existingAdmin = await userRepository.findOne({ where: { email } });
    if (existingAdmin) {
      console.log(`⚠️ Administrador com e-mail ${email} já existe.`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = userRepository.create({
      name: "Admin Principal",
      email: email,
      password: hashedPassword,
      roles: ["admin"],
    });

    await userRepository.save(admin);

    console.log(`✅ Administrador ${email} criado com sucesso!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar o administrador:", error);
    process.exit(1);
  }
}

void seedAdmin();
