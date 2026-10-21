import { rateLimit } from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 5000,
  message: {
    statusCode: 429,
    error: "DADOS_INVALIDOS",
    message: "Muitas tentativas de login. Tente novamente mais tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
