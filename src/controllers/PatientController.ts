import type { Request, Response } from "express";

import { PatientService } from "../services/PatientService.js";

export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  async create(req: Request, res: Response): Promise<Response> {
    const { name, cpf } = req.body as { name: string; cpf: string };
    const patient = await this.patientService.create({ name, cpf });
    return res.status(201).json(patient);
  }

  async findAll(req: Request, res: Response): Promise<Response> {
    const { page, pageSize, name } = req.query as unknown as {
      page: number;
      pageSize: number;
      name?: string;
    };
    const result = await this.patientService.findAll(page, pageSize, name);
    return res.json(result);
  }

  async findById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const patient = await this.patientService.findById(id);
    return res.json(patient);
  }

  async update(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const { name } = req.body as { name: string };
    const patient = await this.patientService.update(id, name);
    return res.json(patient);
  }

  async delete(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    await this.patientService.delete(id);
    return res.status(204).send();
  }
}
