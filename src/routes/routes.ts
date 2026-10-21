import { Router } from "express";
import type { RequestHandler, Response } from "express";

import { AppointmentController } from "../controllers/AppointmentController.js";
import { AuthController } from "../controllers/AuthController.js";
import { DoctorController } from "../controllers/DoctorController.js";
import { MedicalRecordController } from "../controllers/MedicalRecordController.js";
import { PatientController } from "../controllers/PatientController.js";
import { UserController } from "../controllers/UserController.js";
import { AppDataSource } from "../database/data-source.js";
import { TransactionManager } from "../database/TransactionManager.js";
import { createAuthMiddleware } from "../middlewares/authMiddleware.js";
import { loginLimiter } from "../middlewares/rateLimiter.js";
import { roleMiddleware } from "../middlewares/roleMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import { AppointmentRepository } from "../repositories/AppointmentRepository.js";
import { DoctorRepository } from "../repositories/DoctorRepository.js";
import { MedicalRecordRepository } from "../repositories/MedicalRecordRepository.js";
import { PatientRepository } from "../repositories/PatientRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { createUserSchema, loginSchema } from "../schemas/userSchema.js";
import {
  createAppointmentSchema,
  createDoctorSchema,
  createMedicalRecordSchema,
  createPatientSchema,
  doctorCalendarSchema,
  doctorIdParamValidationSchema,
  findAllAppointmentsSchema,
  idParamValidationSchema,
  listMedicalRecordsSchema,
  listWithNameFilterSchema,
  updateAppointmentStatusSchema,
  updatePatientSchema,
  workScheduleSchema,
} from "../schemas/validationSchemas.js";
import { AppointmentService } from "../services/AppointmentService.js";
import { AuthService } from "../services/AuthService.js";
import { DoctorService } from "../services/DoctorService.js";
import { MedicalRecordService } from "../services/MedicalRecordService.js";
import { PatientService } from "../services/PatientService.js";
import { UserService } from "../services/UserService.js";

const router = Router();
const apiRouter = Router();

// ==========================================
// HELPER DE TIPAGEM DOS HANDLERS
// ==========================================
const handle =
  (fn: (req: never, res: Response) => unknown): RequestHandler =>
  (req, res, next) => {
    try {
      Promise.resolve(fn(req as never, res)).catch(next);
    } catch (error) {
      next(error);
    }
  };

// ==========================================
// INJEÇÃO DE DEPENDÊNCIAS (RP02)
// ==========================================
const transactionManager = new TransactionManager(AppDataSource);
const userRepository = new UserRepository(AppDataSource.manager);
const patientRepository = new PatientRepository(AppDataSource.manager);
const doctorRepository = new DoctorRepository(AppDataSource.manager);
const appointmentRepository = new AppointmentRepository(AppDataSource.manager);
const medicalRecordRepository = new MedicalRecordRepository(
  AppDataSource.manager,
);

const userService = new UserService(userRepository);
const authService = new AuthService(userRepository);
const patientService = new PatientService(patientRepository);
const doctorService = new DoctorService(
  transactionManager,
  doctorRepository,
  userRepository,
  appointmentRepository,
);
const appointmentService = new AppointmentService(
  transactionManager,
  appointmentRepository,
  doctorRepository,
  patientRepository,
);
const medicalRecordService = new MedicalRecordService(
  medicalRecordRepository,
  patientRepository,
  doctorRepository,
  appointmentRepository,
);

const authController = new AuthController(authService);
const userController = new UserController(userService);
const patientController = new PatientController(patientService);
const doctorController = new DoctorController(doctorService);
const appointmentController = new AppointmentController(appointmentService);
const medicalRecordController = new MedicalRecordController(
  medicalRecordService,
);

const authMiddleware = createAuthMiddleware(authService);

// ==========================================
// ROTAS PÚBLICAS
// ==========================================
apiRouter.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

apiRouter.post(
  "/auth/login",
  loginLimiter,
  validate(loginSchema),
  handle(authController.login.bind(authController)),
);

// ==========================================
// MIDDLEWARE DE AUTENTICAÇÃO GLOBAL
// ==========================================
apiRouter.use(authMiddleware);

// ==========================================
// ROTAS DE USUÁRIOS
// ==========================================
apiRouter.get("/users/me", handle(userController.getMe.bind(userController)));

apiRouter.post(
  "/users",
  roleMiddleware(["admin"]),
  validate(createUserSchema),
  handle(userController.create.bind(userController)),
);

// ==========================================
// ROTAS DE PACIENTES
// ==========================================
apiRouter.post(
  "/patients",
  roleMiddleware(["admin", "secretary"]),
  validate(createPatientSchema),
  handle(patientController.create.bind(patientController)),
);

apiRouter.get(
  "/patients",
  validate(listWithNameFilterSchema),
  handle(patientController.findAll.bind(patientController)),
);

apiRouter.get(
  "/patients/:id",
  validate(idParamValidationSchema),
  handle(patientController.findById.bind(patientController)),
);

apiRouter.patch(
  "/patients/:id",
  roleMiddleware(["admin", "secretary"]),
  validate(updatePatientSchema),
  handle(patientController.update.bind(patientController)),
);

apiRouter.delete(
  "/patients/:id",
  roleMiddleware(["admin"]),
  validate(idParamValidationSchema),
  handle(patientController.delete.bind(patientController)),
);

// ==========================================
// ROTAS DE MÉDICOS & ESCALA
// ==========================================
apiRouter.post(
  "/doctors",
  roleMiddleware(["admin"]),
  validate(createDoctorSchema),
  handle(doctorController.create.bind(doctorController)),
);

apiRouter.get(
  "/doctors",
  validate(listWithNameFilterSchema),
  handle(doctorController.findAll.bind(doctorController)),
);

apiRouter.get(
  "/doctors/:id",
  validate(idParamValidationSchema),
  handle(doctorController.findById.bind(doctorController)),
);

apiRouter.put(
  "/doctors/:doctorId/work-schedule",
  roleMiddleware(["admin"]),
  validate(workScheduleSchema),
  handle(doctorController.updateWorkSchedule.bind(doctorController)),
);

apiRouter.get(
  "/doctors/:doctorId/work-schedule",
  validate(doctorIdParamValidationSchema),
  handle(doctorController.getWorkSchedule.bind(doctorController)),
);

apiRouter.get(
  "/doctors/:doctorId/calendar",
  validate(doctorCalendarSchema),
  handle(doctorController.getCalendar.bind(doctorController)),
);

// ==========================================
// ROTAS DE AGENDAMENTOS
// ==========================================
apiRouter.post(
  "/appointments",
  roleMiddleware(["admin", "secretary"]),
  validate(createAppointmentSchema),
  handle(appointmentController.create.bind(appointmentController)),
);

apiRouter.get(
  "/appointments",
  validate(findAllAppointmentsSchema),
  handle(appointmentController.findAll.bind(appointmentController)),
);

apiRouter.get(
  "/appointments/:id",
  validate(idParamValidationSchema),
  handle(appointmentController.findById.bind(appointmentController)),
);

apiRouter.patch(
  "/appointments/:id/status",
  validate(updateAppointmentStatusSchema),
  handle(appointmentController.updateStatus.bind(appointmentController)),
);

// ==========================================
// ROTAS DE PRONTUÁRIOS
// ==========================================
apiRouter.post(
  "/patients/:patientId/medical-records",
  roleMiddleware(["doctor"]),
  validate(createMedicalRecordSchema),
  handle(medicalRecordController.create.bind(medicalRecordController)),
);

apiRouter.get(
  "/patients/:patientId/medical-records",
  roleMiddleware(["doctor", "admin"]),
  validate(listMedicalRecordsSchema),
  handle(medicalRecordController.findByPatient.bind(medicalRecordController)),
);

// ==========================================
// MONTAGEM DO PREFIXO
// ==========================================
router.use("/api/v1", apiRouter);

export { router };
