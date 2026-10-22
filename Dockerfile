# ---------- Estágio 1: build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Copia só os manifestos para aproveitar o cache
COPY package*.json ./
RUN npm ci

# Copia o código e compila o TypeScript
COPY . .
RUN npm run build

# ---------- Estágio 2: execução ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
# COPY --from=builder /app/migrations ./migrations

USER node
EXPOSE 3000

# Ajuste conforme o resultado do "ls -R dist"
CMD ["node", "dist/server.js"]