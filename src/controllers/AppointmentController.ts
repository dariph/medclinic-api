import type { Request, Response } from "express";

import { AuthUser } from "../domain/AuthUser.js";
import type {
  CreateAppointmentDTO,
  FindAllAppointmentsQueryDTO,
  UpdateStatusDTO,
} from "../dtos/AppDTOs.js";
import { AppointmentService } from "../services/AppointmentService.js";
import { AppError } from "../utils/AppError.js";

export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  private getAuthenticatedUser(req: Request): AuthUser {
    if (!req.user) {
      throw new AppError("NAO_AUTENTICADO");
    }
    return req.user;
  }

  async create(req: Request, res: Response): Promise<Response> {
    const { doctorId, patientId, startsAt } = req.body as CreateAppointmentDTO;
    const appointment = await this.appointmentService.create(
      doctorId,
      patientId,
      startsAt,
    );
    return res.status(201).json(appointment);
  }

  async findAll(req: Request, res: Response): Promise<Response> {
    const user = this.getAuthenticatedUser(req);
    const queryParams = req.query as unknown as FindAllAppointmentsQueryDTO;
    const result = await this.appointmentService.findAll(user, queryParams);
    return res.json(result);
  }

  async findById(req: Request, res: Response): Promise<Response> {
    const user = this.getAuthenticatedUser(req);
    const { id } = req.params as { id: string };
    const appointment = await this.appointmentService.findById(id, user);
    return res.json(appointment);
  }

  async updateStatus(req: Request, res: Response): Promise<Response> {
    const user = this.getAuthenticatedUser(req);
    const { id } = req.params as { id: string };
    const { status } = req.body as UpdateStatusDTO;
    const updatedAppointment = await this.appointmentService.updateStatus(
      id,
      status,
      user,
    );
    return res.json(updatedAppointment);
  }
}
