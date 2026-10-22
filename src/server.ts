import "reflect-metadata";
import "express-async-errors";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";

import { AppDataSource } from "./database/data-source.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import { router } from "./routes/routes.js";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(router);
app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("Banco de dados PostgreSQL conectado com sucesso!");

    await AppDataSource.runMigrations();
    console.log("Migrations executadas com sucesso!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor rodando na porta ${String(PORT)} no host 0.0.0.0`);
    });
  } catch (error) {
    console.error("Erro ao iniciar o servidor:", error);
    process.exit(1);
  }
}

void startServer();
