````markdown
# 🏥 MedClinic API — Etapa 2: Agendamento, Escala e Prontuário

API REST corporativa desenvolvida em **Node.js, TypeScript, Express.js, TypeORM e PostgreSQL** para gestão clínica completa: controle de acesso baseado em papéis (RBAC) e posse de recurso, gestão de pacientes, cadastro atômico de médicos, escalas de trabalho por turno, agendamento de consultas com controle de concorrência (bloqueio pessimista) e prontuário eletrônico restrito por vínculo de atendimento.

---

## 📌 1. Sobre o Projeto e Escopo da Etapa 2

O **MedClinic API** evoluiu da base de autenticação construída na Etapa 1 para contemplar todo o núcleo operacional e clínico do dia a dia da unidade médica, operando sob o prefixo padronizado `/api/v1`.

### Escopo e Funcionalidades Implementadas

- **Autenticação e Autorização (RBAC & Posse):** Login via JWT retornando `{ accessToken }`, proteção contra criação pública de administradores e controle de acesso para os perfis `admin`, `secretary` e `doctor`.
- **Gestão de Pacientes:** Cadastro com validação estrita de CPF (11 dígitos numéricos e único no banco), listagem paginada com filtro parcial por nome (`ILike`), busca por ID, atualização de nome e remoção lógica (`soft delete` via `deletedAt`).
- **Gestão de Médicos (Cadastro Atômico):** Criação simultânea do usuário de acesso (perfil `doctor`) e do registro profissional (`CRM` único) dentro de uma única transação de banco de dados (garantindo ausência de estado parcial em caso de falha).
- **Escala de Trabalho (`Work Schedule`):** Configuração e consulta de turnos semanais (`weekDay` de `0` a `6`, `startTime`, `endTime` no fuso local `America/Sao_Paulo` e `slotDurationMinutes`), impedindo sobreposição de turnos no mesmo dia e permitindo turnos encostados.
- **Agenda do Médico (`Calendar`):** Entrega da escala do médico combinada com os agendamentos ativos em um intervalo de datas (`from` e `to`, máximo de 31 dias) para montagem de grade pelo front-end.
- **Agendamento de Consultas sob Concorrência:** Validação de horário contra a escala do médico (dia da semana, alinhamento na grade do turno e cabimento completo antes do fim do turno), verificação de conflito de agenda do médico e do paciente e proteção contra condição de corrida (_race condition_) via **transação com bloqueio pessimista (`SELECT ... FOR UPDATE`)**.
- **Ciclo de Vida da Consulta:** Controle de transição de status (`scheduled` ➔ `in_progress` ➔ `done` e `cancelled`) respeitando a autoridade de cada perfil e liberando o horário em caso de cancelamento.
- **Prontuário Médico com Controle por Vínculo:** Registro de evolução clínica exclusivo para médicos que possuam vínculo de atendimento (`in_progress` ou `done`) com o paciente, e leitura restrita ao médico com vínculo ou à administração (`admin`) para fins de auditoria.
- **Padronização de Respostas e Erros:** Listagens paginadas no envelope `{ data, meta }` e tratamento centralizado de erros no envelope `{ statusCode, error, message }`.
- **Qualidade, Testes e CI/CD:** Testes unitários isolados com dublês sobre as portas de repositório (cobertura $\ge$ 80%), containerização multi-stage com Docker e pipelines automatizados de validação de Pull Request e Deploy Contínuo no GitHub Actions.

---

## 🔗 2. Links Oficiais da Entrega

- 🌐 **URL Pública da API (Produção):** `https://medclinic-api-dariph.onrender.com`
- 🩺 **Endpoint de Health Check:** `https://medclinic-api-dariph.onrender.com/api/v1/health`
- 📋 **Board de Gestão do Projeto (Kanban):** `https://github.com/users/dariph/projects/1/views/1`
- 💻 **Repositório GitHub:** `https://github.com/dariph/medclinic-api.git`

---

## 🛠️ 3. Tecnologias Utilizadas

| Tecnologia                       | Papel na Arquitetura                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| **Node.js (v22)**                | Ambiente de execução JavaScript/TypeScript no servidor             |
| **TypeScript**                   | Tipagem estática estrita (`strict: true`, zero uso de `any`)       |
| **Express.js**                   | Framework HTTP para roteamento e cadeia de middlewares             |
| **TypeORM**                      | ORM para mapeamento objeto-relacional, Migrations e QueryBuilder   |
| **PostgreSQL**                   | Banco de dados relacional com suporte a `uuid-ossp`, `jsonb` e SSL |
| **JSON Web Token (JWT)**         | Autenticação stateless com identificação de `id` e `roles`         |
| **bcryptjs**                     | Hashing seguro de senhas com _salt_                                |
| **Zod**                          | Validação de schemas de entrada (`body`, `query` e `params`)       |
| **Vitest & @vitest/coverage-v8** | Executor de testes unitários e aferição de cobertura de código     |
| **Helmet & CORS**                | Segurança de cabeçalhos HTTP e controle de origens                 |
| **express-rate-limit**           | Proteção contra força bruta na rota pública de login               |
| **Docker & GitHub Actions**      | Containerização multi-stage e pipelines de CI/CD                   |

---

## 💻 4. Pré-requisitos e Execução Local

### Pré-requisitos

- **Node.js** v20 ou v22+
- **npm** v10+
- **Docker** e **Docker Compose** (ou instância local do PostgreSQL 14+)
- **Git**

### Passo 1: Clonar o repositório e instalar dependências

```bash
git clone `https://github.com/dariph/medclinic-api.git`
cd Projeto-MedClinic-API
npm install
```
````

### Passo 2: Subir o banco de dados PostgreSQL via Docker Compose

Caso utilize Docker localmente, crie ou execute o `docker-compose.yml` com o comando:

```bash
docker compose up -d

```

_(Exemplo de container PostgreSQL caso não use Compose:)_

```bash
docker run --name medclinic-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=medclinic -p 5432:5432 -d postgres:16-alpine

```

### Passo 3: Configurar as variáveis de ambiente

Copie o arquivo de exemplo `.env.example` para `.env`:

```bash
cp .env.example .env

```

### Passo 4: Executar as Migrations e o Seed do Administrador

```bash
npm run migration:run
npm run seed:admin

```

_(Obs: Na inicialização via `npm run dev` ou `npm start`, o `server.ts` também executa `AppDataSource.runMigrations()`, incluindo a migration `1720000000000-SeedAdmin.ts` caso `ADMIN_EMAIL` e `ADMIN_PASSWORD` estejam definidos no ambiente)._

### Passo 5: Iniciar o servidor

```bash
npm run dev

```

O servidor estará escutando em `http://0.0.0.0:3000` (acessível em `http://localhost:3000/api/v1/health`).

---

## 🔧 5. Variáveis de Ambiente (`.env.example`)

Nenhum segredo é fixo no código ou versionado no repositório. Abaixo estão todas as variáveis exigidas pela aplicação:

| Variável               | Obrigatória | Papel / Descrição                                                                | Exemplo (`.env.example`)     |
| ---------------------- | ----------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `PORT`                 | Não         | Porta HTTP em que a aplicação escuta no host `0.0.0.0` (padrão: `3000`)          | `3000`                       |
| `NODE_ENV`             | Não         | Ambiente de execução (`development`, `test` ou `production`)                     | `development`                |
| `DB_HOST`              | **Sim**     | Host de conexão do banco de dados PostgreSQL                                     | `localhost`                  |
| `DB_PORT`              | **Sim**     | Porta do banco de dados PostgreSQL                                               | `5432`                       |
| `DB_USER`              | **Sim**     | Usuário do banco de dados PostgreSQL                                             | `postgres`                   |
| `DB_PASS`              | **Sim**     | Senha do banco de dados PostgreSQL                                               | `postgres`                   |
| `DB_NAME`              | **Sim**     | Nome do banco de dados PostgreSQL                                                | `medclinic`                  |
| `DB_SSL`               | Não         | Habilita conexão SSL (`true` em bancos gerenciados na nuvem, `false` localmente) | `false`                      |
| `JWT_SECRET`           | **Sim**     | Chave secreta para assinatura e verificação dos tokens JWT                       | `sua_chave_secreta_jwt_aqui` |
| `JWT_EXPIRES_IN`       | Não         | Tempo de expiração do token JWT (padrão: `1h`)                                   | `1h`                         |
| `ADMIN_EMAIL`          | **Sim***    | E-mail do primeiro usuário `admin` criado via migration/script de seed (RP07)    | `admin@medclinic.com`        |
| `ADMIN_PASSWORD`       | **Sim***    | Senha em texto plano (convertida em hash bcrypt pelo seed) do primeiro `admin`   | `SenhaForte@123`             |
| `LOGIN_RATE_LIMIT_MAX` | Não         | Limite máximo de requisições de login por janela de 15 min (padrão: `5000`)      | `5000`                       |

---

## 📜 6. Comandos de Migration, Build, Teste e Execução

| Script                  | Comando                      | Descrição                                                                 |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| **Desenvolvimento**     | `npm run dev`                | Inicia o servidor em modo watch com `tsx`                                 |
| **Build (Compilação)**  | `npm run build`              | Compila o projeto TypeScript (`src/`) para JavaScript (`dist/`) via `tsc` |
| **Produção**            | `npm start`                  | Executa o código compilado em produção (`node dist/server.js`)            |
| **Executar Migrations** | `npm run migration:run`      | Aplica todas as migrations pendentes no PostgreSQL                        |
| **Reverter Migration**  | `npm run migration:revert`   | Desfaz a última migration aplicada no banco de dados                      |
| **Gerar Migration**     | `npm run migration:generate` | Gera uma nova migration baseada nas diferenças das entidades              |
| **Seed Admin**          | `npm run seed:admin`         | Executa o script standalone `src/database/seeders/admin.ts`               |
| **Testes Unitários**    | `npm test`                   | Executa toda a suíte de testes unitários com Vitest (`vitest run`)        |
| **Cobertura de Testes** | `npm run test:cov`           | Executa os testes e valida o limiar mínimo de 80% de cobertura            |

---

## 🧱 7. Arquitetura, Estrutura de Pastas, Decisões de Modelagem e Padrão de Nomes

### 7.1. Estrutura de Pastas

```text
Projeto-MedClinic-API/
├── .github/
│   └── workflows/               # Workflows de CI (pr-workflow.yml) e CD (deploy.yml)
├── src/
│   ├── @types/express/          # Extensão de tipos do Express (req.user: AuthUser)
│   ├── constants/               # Constantes de domínio (AppConstants.ts)
│   ├── controllers/             # Camada HTTP (extrai dados validados e delega aos Services)
│   │   ├── AppointmentController.ts
│   │   ├── AuthController.ts
│   │   ├── DoctorController.ts
│   │   ├── MedicalRecordController.ts
│   │   ├── PatientController.ts
│   │   └── UserController.ts
│   ├── database/                # Configuração do TypeORM, Migrations, Seeders e Transações
│   │   ├── migrations/
│   │   │   ├── 1710000000000-CreateUsersAndClinicTables.ts
│   │   │   └── 1720000000000-SeedAdmin.ts
│   │   ├── seeders/
│   │   │   └── admin.ts
│   │   ├── data-source.ts
│   │   └── TransactionManager.ts
│   ├── domain/                  # Núcleo de regras de domínio e portas (interfaces)
│   │   ├── ports/
│   │   │   └── RepositoryPorts.ts
│   │   ├── AuthUser.ts
│   │   └── ScheduleValidator.ts
│   ├── dtos/                    # Contratos de entrada e saída (AppDTOs.ts, UserDTO.ts)
│   ├── entities/                # Entidades decoradas do TypeORM
│   │   ├── Appointment.ts
│   │   ├── Doctor.ts
│   │   ├── MedicalRecord.ts
│   │   ├── Patient.ts
│   │   └── User.ts
│   ├── mappers/                 # Conversores puros de Entidade para DTO (EntityMappers.ts)
│   ├── middlewares/             # Autenticação, Autorização, Validação Zod, Rate Limit e Erros
│   │   ├── authMiddleware.ts
│   │   ├── errorMiddleware.ts
│   │   ├── rateLimiter.ts
│   │   ├── roleMiddleware.ts
│   │   └── validateMiddleware.ts
│   ├── repositories/            # Implementações concretas de acesso ao banco via TypeORM
│   │   ├── AppointmentRepository.ts
│   │   ├── DoctorRepository.ts
│   │   ├── MedicalRecordRepository.ts
│   │   ├── PatientRepository.ts
│   │   └── UserRepository.ts
│   ├── routes/                  # Definição de rotas e composição de injeção de dependências
│   │   └── routes.ts
│   ├── schemas/                 # Schemas de validação com Zod (userSchema.ts, validationSchemas.ts)
│   ├── services/                # Camada de Regra de Negócio + Testes Unitários (*.spec.ts)
│   │   ├── AppointmentService.ts & AppointmentService.spec.ts
│   │   ├── AuthService.ts        & AuthService.spec.ts
│   │   ├── DoctorService.ts      & DoctorService.spec.ts
│   │   ├── MedicalRecordService.ts & MedicalRecordService.spec.ts
│   │   ├── PatientService.ts     & PatientService.spec.ts
│   │   └── UserService.ts        & UserService.spec.ts
│   ├── utils/                   # Utilitários (AppError.ts, DateUtils.ts, env.ts, pagination.ts)
│   └── server.ts                # Bootstrap da aplicação
├── Dockerfile                   # Build multi-stage para produção
├── .dockerignore
├── .env.example
├── package.json
├── tsconfig.json
└── README.md

```

### 7.2. Fluxo da Arquitetura em Camadas e Princípios SOLID

```text
Requisição HTTP ➔ authMiddleware ➔ roleMiddleware ➔ validateMiddleware (Zod) ➔ Controller ➔ Service (Regra de Negócio) ➔ Repository (TypeORM) ➔ PostgreSQL

```

1. **Isolamento de Controllers:** Nenhum controller importa `typeorm` nem contém lógica de negócio. Eles apenas repassam os dados validados pelo middleware Zod para os Services.
2. **Inversão de Dependência e Injeção via Construtor:** Os Services dependem exclusivamente das interfaces (portas) declaradas em `src/domain/ports/RepositoryPorts.ts` (`IUserRepository`, `IDoctorRepository`, `IPatientRepository`, `IAppointmentRepository`, `IMedicalRecordRepository`, `ITransactionManager`), permitindo testes unitários 100% em memória com dublês.
3. **Separação entre Erros de Domínio e HTTP:** Os Services lançam instâncias de `AppError` contendo apenas códigos semânticos do catálogo (`HORARIO_FORA_DA_ESCALA`, `HORARIO_INDISPONIVEL`, `ACESSO_NEGADO`, etc.). O `errorMiddleware` é o único ponto que traduz esses códigos para HTTP Status (`400`, `401`, `403`, `404`, `409`, `422`, `500`).

### 7.3. Justificativa das Decisões de Modelagem

- **Chaves Primárias em UUID (`uuid-ossp`):** Todas as entidades utilizam UUID v4 para evitar enumeração sequencial de recursos sensíveis (como pacientes e prontuários).
- **Escala de Trabalho em `jsonb` (`Doctor.shifts`):** Como a escala de trabalho é sempre substituída integralmente (`PUT /work-schedule`) e lida junto com os dados do médico (`GET /work-schedule` e `GET /calendar`), armazená-la como um array tipado em coluna `jsonb` elimina _joins_ desnecessários e simplifica a leitura da grade semanal.
- **Persistência de `startsAt` e `endsAt` em `timestamptz`:** Na criação do agendamento, o instante de término (`endsAt`) é calculado a partir do `slotDurationMinutes` vigente no turno e gravado na tabela `appointments` com fuso horário (`TIMESTAMP WITH TIME ZONE`). Assim, caso o médico altere sua escala no futuro, as consultas já marcadas preservam sua duração e horário originais.
- **Controle de Concorrência com Bloqueio Pessimista:** Na criação de consultas (`AppointmentService.create`), a transação executa `findByIdWithLock` aplicando `setLock("pessimistic_write")` (`SELECT ... FOR UPDATE`) sobre o registro do médico e do paciente antes de verificar conflitos de horário. Isso serializa tentativas simultâneas para o mesmo médico/paciente mesmo quando a agenda do dia está vazia, garantindo que apenas uma requisição retorne `201 Created` e a concorrente receba `409 HORARIO_INDISPONIVEL`.
- **Remoção Lógica de Pacientes (`deletedAt`):** Pacientes possuem `@DeleteDateColumn` para preservar a integridade referencial de consultas e prontuários históricos, enquanto deixam de aparecer em buscas por ID e listagens ativas.

### 7.4. Padrão de Nomes Declarado e Aplicado

O projeto aplica rigorosamente as seguintes convenções de nomenclatura sem exceções:

- **Pastas / Diretórios:** `camelCase` ou substantivos no plural em minúsculas (`controllers`, `services`, `repositories`, `middlewares`, `entities`, `dtos`, `schemas`, `mappers`, `utils`, `constants`, `domain`).
- **Arquivos de Classes (Controllers, Services, Repositories, Entities, Domain, Mappers):** `PascalCase` refletindo exatamente o nome da classe exportada (ex.: `AppointmentService.ts`, `AppointmentController.ts`, `AppointmentRepository.ts`, `ScheduleValidator.ts`).
- **Arquivos de Testes Unitários:** `PascalCase` acompanhando o arquivo testado com o sufixo `.spec.ts` (ex.: `AppointmentService.spec.ts`).
- **Arquivos de Middlewares, Schemas e Utilitários Funcionais:** `camelCase` (ex.: `authMiddleware.ts`, `roleMiddleware.ts`, `validateMiddleware.ts`, `validationSchemas.ts`, `pagination.ts`).
- **Classes, Interfaces, Types e Enums:** `PascalCase`, utilizando o prefixo `I` para portas/interfaces de repositório (`IAppointmentRepository`, `ITransactionManager`) e o sufixo `DTO` para objetos de transferência (`AppointmentResponseDTO`, `CreateUserDTO`).
- **Métodos, Funções, Variáveis e Propriedades de JSON/DTO:** `camelCase` (ex.: `createDoctor`, `findAllPaginated`, `startsAt`, `slotDurationMinutes`).
- **Constantes Globais e Códigos de Catálogo de Erro:** `UPPER_SNAKE_CASE` (ex.: `TIME_ZONE`, `ALLOWED_STATUS_TRANSITIONS`, `HORARIO_FORA_DA_ESCALA`).
- **Rotas HTTP:** Substantivos no plural em `kebab-case` sob o prefixo `/api/v1` (ex.: `/api/v1/work-schedule`, `/api/v1/medical-records`).

---

## 🧪 8. Recorte da Cobertura de Testes Automatizados

A suíte de testes unitários foi construída com **Vitest**, utilizando dublês de teste (_mocks/stubs_) sobre as portas de repositório (`RepositoryPorts.ts`), sem qualquer dependência de banco de dados, rede ou variáveis de ambiente externas.

### Quais arquivos entram na conta de cobertura e por quê:

- **Arquivos incluídos no recorte:** Camada de **Regra de Negócio** (`src/services/**/*.ts` e validadores de regra em `src/domain/ScheduleValidator.ts` / `src/domain/AuthUser.ts`), excluindo arquivos de teste (`*.spec.ts`) e arquivos puramente declarativos de interfaces (`RepositoryPorts.ts`).
- **Justificativa técnica:** Conforme determinado na Seção 4.5 do edital, incluir controllers, entidades do TypeORM, DTOs, rotas ou migrations inflaria artificialmente a métrica sem testar regras reais. Concentrar o recorte exclusivamente na camada de Services/Domínio garante que o limiar mínimo de **80% em `lines`, `branches`, `functions` e `statements**` valide de fato todos os caminhos críticos e ramificações de erro (`400`, `401`, `403`, `404`, `409`, `422`), incluindo:

1. Todos os 5 cenários de sobreposição de períodos e horários encostados;
2. Criação de agendamento (sucesso, fora do turno, desalinhado da grade, ultrapassando o fim do turno, conflito de médico e conflito de paciente);
3. Validação de escala (turnos sobrepostos rejeitados e turnos encostados aceitos);
4. Transições válidas e inválidas de status e autoridade por perfil;
5. Controle de acesso ao prontuário por vínculo médico-paciente (`in_progress` / `done`);
6. Autenticação e comparação de hash de senha.

---

## 🌐 9. Resumo dos Endpoints da API (`/api/v1`)

Todas as rotas estão sob o prefixo `/api/v1`. Rotas autenticadas exigem o header `Authorization: Bearer <accessToken>`.

| Método   | Rota (sob `/api/v1`)                   | Perfis Permitidos                   | Status Sucesso   | Descrição Resumida                                                      |
| -------- | -------------------------------------- | ----------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `GET`    | `/health`                              | Público                             | `200 OK`         | Verifica a disponibilidade da API (`{ "status": "ok" }`)                |
| `POST`   | `/auth/login`                          | Público                             | `200 OK`         | Autentica por `email` e `password` e devolve `{ "accessToken": "..." }` |
| `GET`    | `/users/me`                            | Autenticado (qualquer perfil)       | `200 OK`         | Retorna os dados e `roles` do usuário autenticado (sem `password`)      |
| `POST`   | `/users`                               | `admin`                             | `201 Created`    | Cria usuários administrativos ou de secretaria                          |
| `POST`   | `/patients`                            | `admin`, `secretary`                | `201 Created`    | Cadastra paciente com validação de CPF único de 11 dígitos              |
| `GET`    | `/patients`                            | Autenticado (qualquer perfil)       | `200 OK`         | Lista pacientes paginados com filtro opcional `?name=&page=&pageSize=`  |
| `GET`    | `/patients/:id`                        | Autenticado (qualquer perfil)       | `200 OK`         | Consulta paciente ativo pelo ID                                         |
| `PATCH`  | `/patients/:id`                        | `admin`, `secretary`                | `200 OK`         | Atualiza o `name` do paciente                                           |
| `DELETE` | `/patients/:id`                        | `admin`                             | `204 No Content` | Remove logicamente (`soft delete`) o paciente                           |
| `POST`   | `/doctors`                             | `admin`                             | `201 Created`    | Cria médico (`crm`) e usuário (`doctor`) em transação atômica           |
| `GET`    | `/doctors`                             | Autenticado (qualquer perfil)       | `200 OK`         | Lista médicos paginados com filtro opcional `?name=&page=&pageSize=`    |
| `GET`    | `/doctors/:id`                         | Autenticado (qualquer perfil)       | `200 OK`         | Consulta médico pelo ID                                                 |
| `PUT`    | `/doctors/:doctorId/work-schedule`     | `admin`                             | `200 OK`         | Substitui a escala completa de turnos (`shifts`) do médico              |
| `GET`    | `/doctors/:doctorId/work-schedule`     | Autenticado (qualquer perfil)       | `200 OK`         | Consulta a escala de trabalho do médico (`{ "shifts": [...] }`)         |
| `GET`    | `/doctors/:doctorId/calendar`          | Autenticado (qualquer perfil)       | `200 OK`         | Retorna escala e consultas ativas no período `?from=YYYY-MM-DD&to=...`  |
| `POST`   | `/appointments`                        | `admin`, `secretary`                | `201 Created`    | Agenda consulta validando escala e concorrência (lock pessimista)       |
| `GET`    | `/appointments`                        | Autenticado (filtrado por perfil)   | `200 OK`         | Lista agendamentos paginados (médico vê apenas os próprios)             |
| `GET`    | `/appointments/:id`                    | Autenticado (com posse para médico) | `200 OK`         | Consulta agendamento por ID                                             |
| `PATCH`  | `/appointments/:id/status`             | Conforme regra de transição (RN12)  | `200 OK`         | Altera status (`in_progress`, `done`, `cancelled`)                      |
| `POST`   | `/patients/:patientId/medical-records` | `doctor` (com vínculo de consulta)  | `201 Created`    | Registra evolução no prontuário do paciente                             |
| `GET`    | `/patients/:patientId/medical-records` | `doctor` (com vínculo) ou `admin`   | `200 OK`         | Lista histórico de prontuários em ordem decrescente de `createdAt`      |

---

## ❌ 10. Envelope Padronizado e Catálogo de Erros

Toda resposta de erro (de `400` a `500`) segue o contrato estrito:

```json
{
  "statusCode": 409,
  "error": "HORARIO_INDISPONIVEL",
  "message": "HORARIO_INDISPONIVEL"
}
```

| Código de Erro (`error`) | Status HTTP | Situação em que ocorre                                                   |
| ------------------------ | ----------- | ------------------------------------------------------------------------ |
| `DADOS_INVALIDOS`        | `400`       | Corpo, parâmetro de rota ou query fora do formato esperado               |
| `NAO_AUTENTICADO`        | `401`       | Token JWT ausente, malformado, inválido ou expirado                      |
| `CREDENCIAIS_INVALIDAS`  | `401`       | E-mail ou senha incorretos no login                                      |
| `ACESSO_NEGADO`          | `403`       | Usuário autenticado, mas sem perfil ou sem vínculo/posse para a operação |
| `RECURSO_NAO_ENCONTRADO` | `404`       | Usuário, paciente, médico ou agendamento referenciado não existe         |
| `EMAIL_JA_CADASTRADO`    | `409`       | Tentativa de cadastrar e-mail já em uso                                  |
| `CPF_JA_CADASTRADO`      | `409`       | Tentativa de cadastrar CPF já registrado                                 |
| `CRM_JA_CADASTRADO`      | `409`       | Tentativa de cadastrar CRM já registrado                                 |
| `HORARIO_INDISPONIVEL`   | `409`       | O médico já possui agendamento ativo sobrepondo o período solicitado     |
| `PACIENTE_INDISPONIVEL`  | `409`       | O paciente já possui agendamento ativo sobrepondo o período solicitado   |
| `HORARIO_FORA_DA_ESCALA` | `422`       | Horário fora do turno, desalinhado da grade ou que ultrapassa o turno    |
| `TRANSICAO_INVALIDA`     | `422`       | Mudança de status não permitida pelo ciclo de vida da consulta           |

---

## ⚙️ 11. Integração Contínua (CI), Deploy Contínuo (CD) e Docker

- **Dockerfile Multi-Stage:** Possui estágio de `build` (que instala dependências e compila o TypeScript) e estágio de execução enxuto (que instala apenas dependências de produção com `npm ci --omit=dev` e executa `node dist/server.js`).
- **Validação de Pull Request (`.github/workflows/pr-workflow.yml`):** Executado automaticamente em todo Pull Request direcionado à branch `main` em ambiente `ubuntu-latest` com Node.js 22, rodando `npm ci`, `npm run build` e `npm run test:cov` (reprovando o check caso a cobertura fique abaixo de 80%).
- **Publicação Contínua (`.github/workflows/deploy.yml`):** Disparado a cada `push` (merge de PR) na branch `main`, realizando o build e publicação da imagem Docker e acionando o deploy automático na nuvem sem expor segredos no repositório.

---

## 🎓 12. Autor e Informações Acadêmicas

- **Desenvolvedor:** Dari Pinheiro Heirich
- **Curso / Programa:** SCTEC — Back End Node

```

```
