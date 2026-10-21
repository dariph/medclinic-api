import type { Request, Response } from "express";

import { MedicalRecordService } from "../services/MedicalRecordService.js";
import { AppError } from "../utils/AppError.js";

export class MedicalRecordController {
  constructor(private readonly medicalRecordService: MedicalRecordService) {}

  async create(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw new AppError("NAO_AUTENTICADO");
    }
    const { patientId } = req.params as { patientId: string };
    const { text } = req.body as { text: string };
    const record = await this.medicalRecordService.createRecord(
      patientId,
      req.user.id,
      text,
    );
    return res.status(201).json(record);
  }

  async findByPatient(req: Request, res: Response): Promise<Response> {
    if (!req.user) {
      throw new AppError("NAO_AUTENTICADO");
    }
    const { patientId } = req.params as { patientId: string };
    const { page, pageSize } = req.query as unknown as {
      page: number;
      pageSize: number;
    };
    const result = await this.medicalRecordService.findByPatient(
      patientId,
      req.user,
      page,
      pageSize,
    );
    return res.json(result);
  }
}
