import type { Request, Response } from "express";

import type { WorkShift } from "../entities/Doctor.js";
import {
  type CreateDoctorInput,
  DoctorService,
} from "../services/DoctorService.js";

export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  async create(req: Request, res: Response): Promise<Response> {
    const body = req.body as CreateDoctorInput;
    const doctor = await this.doctorService.createDoctor(body);
    return res.status(201).json(doctor);
  }

  async findAll(req: Request, res: Response): Promise<Response> {
    const { page, pageSize, name } = req.query as unknown as {
      page: number;
      pageSize: number;
      name?: string;
    };
    const result = await this.doctorService.findAll(page, pageSize, name);
    return res.json(result);
  }

  async findById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params as { id: string };
    const doctor = await this.doctorService.findById(id);
    return res.json(doctor);
  }

  async updateWorkSchedule(req: Request, res: Response): Promise<Response> {
    const { doctorId } = req.params as { doctorId: string };
    const { shifts } = req.body as { shifts: WorkShift[] };
    const result = await this.doctorService.updateWorkSchedule(
      doctorId,
      shifts,
    );
    return res.json(result);
  }

  async getWorkSchedule(req: Request, res: Response): Promise<Response> {
    const { doctorId } = req.params as { doctorId: string };
    const schedule = await this.doctorService.getWorkSchedule(doctorId);
    return res.json(schedule);
  }

  async getCalendar(req: Request, res: Response): Promise<Response> {
    const { doctorId } = req.params as { doctorId: string };
    const { from, to } = req.query as { from: string; to: string };
    const calendar = await this.doctorService.getCalendar(doctorId, from, to);
    return res.json(calendar);
  }
}
