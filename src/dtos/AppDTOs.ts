import type { UserResponseDTO } from "./UserDTO.js";
import type { AppointmentStatus } from "../entities/Appointment.js";
import type { WorkShift } from "../entities/Doctor.js";

export interface CreateAppointmentDTO {
  doctorId: string;
  patientId: string;
  startsAt: string;
}

export interface UpdateStatusDTO {
  status: AppointmentStatus;
}

export interface FindAllAppointmentsQueryDTO {
  doctorId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface PatientResponseDTO {
  id: string;
  name: string;
  cpf: string;
  createdAt: Date;
}

export interface DoctorResponseDTO {
  id: string;
  crm: string;
  user: UserResponseDTO;
}

export interface CalendarAppointmentItemDTO {
  id: string;
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
}

export interface DoctorCalendarResponseDTO {
  workSchedule: {
    shifts: WorkShift[];
  };
  appointments: CalendarAppointmentItemDTO[];
}

export interface AppointmentResponseDTO {
  id: string;
  doctorId: string;
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
}

export interface MedicalRecordResponseDTO {
  id: string;
  patientId: string;
  doctorId: string;
  text: string;
  createdAt: Date;
}
