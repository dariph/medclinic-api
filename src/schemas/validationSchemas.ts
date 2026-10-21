import { z } from "zod";

import { AppointmentStatus } from "../entities/Appointment.js";

const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidCalendarDate(dateStr: string): boolean {
  if (!ISO_DATE_ONLY_REGEX.test(dateStr)) return false;
  const date = new Date(`${dateStr}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().startsWith(dateStr)
  );
}

// ==========================================
// SCHEMAS ATÔMICOS DE PARAMS, QUERY E BODY
// ==========================================

export const uuidParamSchema = z.object({
  id: z.uuid({ error: "id deve ser um UUID válido" }),
});

export const doctorIdParamSchema = z.object({
  doctorId: z.uuid({ error: "doctorId deve ser um UUID válido" }),
});

export const patientIdParamSchema = z.object({
  patientId: z.uuid({ error: "patientId deve ser um UUID válido" }),
});

export const appointmentIdParamSchema = uuidParamSchema;

export const paginationQuerySchema = z.object({
  page: z.coerce
    .number({ error: "Parâmetro de paginação inválido." })
    .int({ error: "Parâmetro de paginação deve ser inteiro positivo." })
    .min(1, { error: "Página deve ser maior ou igual a 1." })
    .default(1),
  pageSize: z.coerce
    .number({ error: "Parâmetro de paginação inválido." })
    .int({ error: "Parâmetro de paginação deve ser inteiro positivo." })
    .min(1, { error: "pageSize deve ser maior ou igual a 1." })
    .max(100, { error: "pageSize máximo é 100." })
    .default(20),
});

export const nameFilterPaginationQuerySchema = paginationQuerySchema.extend({
  name: z.string().optional(),
});

export const createPatientBodySchema = z.object({
  name: z
    .string({ error: "Nome é obrigatório" })
    .trim()
    .min(1, { error: "Nome não pode ser vazio" }),
  cpf: z
    .string({ error: "CPF é obrigatório" })
    .length(11, { error: "O CPF deve ter exatamente 11 dígitos" })
    .regex(/^\d+$/, { error: "O CPF deve conter apenas números" }),
});

export const updatePatientBodySchema = z.object({
  name: z
    .string({ error: "Nome é obrigatório" })
    .trim()
    .min(1, { error: "Nome não pode ser vazio" }),
});

export const createDoctorBodySchema = z.object({
  name: z
    .string({ error: "Nome é obrigatório" })
    .trim()
    .min(1, { error: "Nome não pode ser vazio" }),
  email: z.email({ error: "Formato de e-mail inválido" }),
  password: z
    .string({ error: "Senha é obrigatória" })
    .min(6, { error: "A senha deve ter no mínimo 6 caracteres" }),
  crm: z
    .string({ error: "CRM é obrigatório" })
    .trim()
    .min(1, { error: "CRM não pode ser vazio" }),
});

export const workScheduleBodySchema = z.object({
  shifts: z.array(
    z.object({
      weekDay: z.number().int().min(0).max(6),
      startTime: z
        .string()
        .regex(TIME_HH_MM_REGEX, { error: "Formato inválido (HH:MM)" }),
      endTime: z
        .string()
        .regex(TIME_HH_MM_REGEX, { error: "Formato inválido (HH:MM)" }),
      slotDurationMinutes: z.number().int().positive(),
    }),
  ),
});

export const calendarQuerySchema = z.object({
  from: z.string().refine(isValidCalendarDate, {
    error: "from deve estar no formato YYYY-MM-DD",
  }),
  to: z.string().refine(isValidCalendarDate, {
    error: "to deve estar no formato YYYY-MM-DD",
  }),
});

export const createAppointmentBodySchema = z.object({
  doctorId: z.uuid({ error: "doctorId deve ser um UUID válido" }),
  patientId: z.uuid({ error: "patientId deve ser um UUID válido" }),
  startsAt: z.iso.datetime({
    offset: true,
    error: "startsAt deve ser uma data ISO 8601 válida com fuso horário",
  }),
});

export const updateStatusBodySchema = z.object({
  status: z.enum(AppointmentStatus, {
    error: "Status inválido ou fora do catálogo permitido",
  }),
});

export const findAllAppointmentsQuerySchema = z
  .object({
    doctorId: z.uuid().optional(),
    patientId: z.uuid().optional(),
    status: z.enum(AppointmentStatus).optional(),
    from: z
      .string()
      .refine(isValidCalendarDate, {
        error: "from deve estar no formato YYYY-MM-DD",
      })
      .optional(),
    to: z
      .string()
      .refine(isValidCalendarDate, {
        error: "to deve estar no formato YYYY-MM-DD",
      })
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return data.from <= data.to;
      }
      return true;
    },
    {
      error: "O parâmetro 'from' não pode ser posterior a 'to'",
    },
  );

export const createMedicalRecordBodySchema = z.object({
  text: z
    .string({ error: "text é obrigatório" })
    .trim()
    .min(1, { error: "text não pode ser vazio" }),
});

// ==========================================
// SCHEMAS COMPOSTOS PARA O MIDDLEWARE HTTP
// ==========================================

export const idParamValidationSchema = z.object({
  params: uuidParamSchema,
});

export const doctorIdParamValidationSchema = z.object({
  params: doctorIdParamSchema,
});

export const patientIdParamValidationSchema = z.object({
  params: patientIdParamSchema,
});

export const listWithNameFilterSchema = z.object({
  query: nameFilterPaginationQuerySchema,
});

export const listMedicalRecordsSchema = z.object({
  params: patientIdParamSchema,
  query: paginationQuerySchema,
});

export const createPatientSchema = z.object({
  body: createPatientBodySchema,
});

export const updatePatientSchema = z.object({
  params: uuidParamSchema,
  body: updatePatientBodySchema,
});

export const createDoctorSchema = z.object({
  body: createDoctorBodySchema,
});

export const workScheduleSchema = z.object({
  params: doctorIdParamSchema,
  body: workScheduleBodySchema,
});

export const doctorCalendarSchema = z.object({
  params: doctorIdParamSchema,
  query: calendarQuerySchema,
});

export const createAppointmentSchema = z.object({
  body: createAppointmentBodySchema,
});

export const findAllAppointmentsSchema = z.object({
  query: findAllAppointmentsQuerySchema,
});

export const updateAppointmentStatusSchema = z.object({
  params: appointmentIdParamSchema,
  body: updateStatusBodySchema,
});

export const createMedicalRecordSchema = z.object({
  params: patientIdParamSchema,
  body: createMedicalRecordBodySchema,
});
