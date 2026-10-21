import { z } from "zod";

export const createUserBodySchema = z.object({
  name: z
    .string({ error: "Nome é obrigatório." })
    .trim()
    .min(1, { error: "Nome não pode ser vazio." }),
  email: z.email({ error: "E-mail inválido." }),
  password: z
    .string({ error: "Senha é obrigatória." })
    .min(6, { error: "Mínimo 6 caracteres." }),
  roles: z
    .array(z.enum(["admin", "secretary", "doctor"]))
    .nonempty({ error: "Pelo menos um perfil é necessário." }),
});

export const loginBodySchema = z.object({
  email: z.email({ error: "E-mail inválido." }),
  password: z
    .string({ error: "Senha é obrigatória." })
    .min(1, { error: "Senha é obrigatória." }),
});

export const createUserSchema = z.object({
  body: createUserBodySchema,
});

export const loginSchema = z.object({
  body: loginBodySchema,
});
