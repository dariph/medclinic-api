import type {
  AppointmentResponseDTO,
  DoctorResponseDTO,
  MedicalRecordResponseDTO,
  PatientResponseDTO,
} from "../dtos/AppDTOs.js";
import type { UserResponseDTO } from "../dtos/UserDTO.js";
import type { Appointment } from "../entities/Appointment.js";
import type { Doctor } from "../entities/Doctor.js";
import type { MedicalRecord } from "../entities/MedicalRecord.js";
import type { Patient } from "../entities/Patient.js";
import type { User } from "../entities/User.js";

export class UserMapper {
  static toDTO(user: User): UserResponseDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: Array.isArray(user.roles)
        ? user.roles
        : [user.roles].filter(Boolean),
    };
  }
}

export class PatientMapper {
  static toDTO(patient: Patient): PatientResponseDTO {
    return {
      id: patient.id,
      name: patient.name,
      cpf: patient.cpf,
      createdAt: patient.createdAt,
    };
  }
}

export class DoctorMapper {
  static toDTO(doctor: Doctor): DoctorResponseDTO {
    return {
      id: doctor.id,
      crm: doctor.crm,
      user: UserMapper.toDTO(doctor.user),
    };
  }
}

export class AppointmentMapper {
  static toDTO(appointment: Appointment): AppointmentResponseDTO {
    return {
      id: appointment.id,
      doctorId: appointment.doctor.id,
      patientId: appointment.patient.id,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
    };
  }
}

export class MedicalRecordMapper {
  static toDTO(
    record: MedicalRecord,
    patientId: string,
    doctorId: string,
  ): MedicalRecordResponseDTO {
    return {
      id: record.id,
      patientId,
      doctorId,
      text: record.text,
      createdAt: record.createdAt,
    };
  }
}
