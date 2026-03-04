# WHAPI v4 — Backend Architecture

## Overview

The backend is a **Node.js/TypeScript REST API** built with Express, following a layered architecture pattern (Routes → Controllers → Services → Models). It serves as both the API server for the frontend SPA and the WhatsApp Web client host (via Puppeteer/whatsapp-web.js).

## Technology Stack

| Category | Technology | Version | Justification |
|---|---|---|---|
| Runtime | Node.js | 16 | LTS, required for whatsapp-web.js compatibility |
| Language | TypeScript | 4.9.5 | Type safety for complex business logic |
| Framework | Express | 4.17.1 | Lightweight HTTP server, middleware ecosystem |
| ORM | Sequelize + sequelize-typescript | 5.22.3 / 1.1.0 | Decorator-based models, MySQL support, migrations |
| Database | MariaDB / MySQL | 10.6 | Relational data with JSON support, utf8mb4 |
| WebSocket | Socket.IO | 4.7.3 | Real-time bidirectional events (tickets, messages) |
| WhatsApp | whatsapp-web.js (fork) | custom | Web scraping-based WhatsApp client via Puppeteer |
| Auth | jsonwebtoken + bcryptjs | 8.5.1 / 2.4.3 | JWT access/refresh tokens, password hashing |
| Queue | Bull | 4.10.4 | Redis-based job queue for background tasks |
| Storage | @aws-sdk/client-s3 | 3.940.0 | S3-compatible object storage abstraction |
| Security | Helmet + express-rate-limit | 8.1.0 / 8.2.1 | HTTP headers hardening, request throttling |
| Monitoring | Sentry + Pino | 5.29.2 / 8.11.0 | Error tracking, structured JSON logging |
| Validation | Yup | 0.32.8 | Schema validation for user inputs |
| Templates | Mustache | 4.2.0 | Variable interpolation in messages |
| Testing | Jest + Supertest | 26.x | Unit and integration tests |

## Architecture Pattern

### Layered Architecture

```
HTTP Request
    │
    ▼
┌─────────────────────┐
│   Middleware Layer   │  isAuth, isAuthApi, rateLimiters, multer, cors, helmet
│   (Express pipes)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Routes Layer      │  19 route files — URL → Controller mapping
│   (routes/*.ts)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Controllers Layer  │  19 controllers — Request parsing, response formatting
│  (controllers/*.ts) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Services Layer    │  18 service directories — Business logic, validation
│   (services/*/*.ts) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Models Layer     │  20 Sequelize models — Data access, relationships
│   (models/*.ts)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Database Layer    │  MariaDB/MySQL — 121 migrations, 6 seeds
│   (database/*.ts)   │
└─────────────────────┘
```

### Parallel Processing Layers

```
┌──────────────────────────────────┐
│        WhatsApp Layer            │
│  ┌────────────┐  ┌────────────┐ │
│  │ wbot.ts    │  │ wbot-      │ │
│  │ (factory)  │  │ improved.ts│ │
│  └─────┬──────┘  └─────┬──────┘ │
│        │               │        │
│  ┌─────▼───────────────▼──────┐ │
│  │  WbotServices/             │ │
│  │  ├── wbotMessageListener   │ │  ← Main event loop (messages, acks, reactions)
│  │  ├── wbotMonitor           │ │  ← Connection state monitoring
│  │  ├── ChatBotListener       │ │  ← Chatbot menu processor
│  │  └── SendWhatsApp*         │ │  ← Message senders (text, media, base64, URL)
│  └────────────────────────────┘ │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│      Real-time Layer             │
│  ┌────────────────────────────┐  │
│  │  Socket.IO Server          │  │
│  │  (libs/socket.ts)          │  │
│  │                            │  │
│  │  Events emitted:           │  │
│  │  • appMessage:create       │  │
│  │  • appMessage:update       │  │
│  │  • appMessage:delete       │  │
│  │  • ticket (update/delete)  │  │
│  │  • contact (update/delete) │  │
│  │  • whatsapp (update/delete)│  │
│  │  • whatsappSession         │  │
│  │  • user (update/delete)    │  │
│  │  • session:expired         │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│      Webhook Layer               │
│  ┌────────────────────────────┐  │
│  │  WebhookService/           │  │
│  │  SendWebhookEvent          │  │
│  │                            │  │
│  │  9 event types:            │  │
│  │  • message_received        │  │
│  │  • message_sent            │  │
│  │  • message_ack             │  │
│  │  • connection_update       │  │
│  │  • ticket_created          │  │
│  │  • ticket_updated          │  │
│  │  • ticket_closed           │  │
│  │  • contact_created         │  │
│  │  • contact_updated         │  │
│  │                            │  │
│  │  Features:                 │  │
│  │  • In-memory cache (60s)   │  │
│  │  • Per-connection config   │  │
│  │  • Event filtering         │  │
│  │  • Fire-and-forget         │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

## Entry Points & Bootstrap Sequence

```
1. bootstrap.ts      → Load dotenv environment variables
2. app.ts            → Create Express app
                       ├── CORS middleware
                       ├── Helmet security headers
                       ├── Rate limiters (auth, API, messages)
                       ├── JSON/URLEncoded body parsers
                       ├── Static file serving (/public)
                       ├── Sentry error tracking
                       ├── API routes (/auth, /api, /api/v1, ...)
                       └── Global error handler (AppError)
3. server.ts         → Start HTTP server
                       ├── Initialize Sequelize (database connection)
                       ├── Mount Swagger UI (/api-docs)
                       ├── Initialize Socket.IO
                       ├── Schedule cron jobs (ticket auto-close)
                       ├── Start all WhatsApp sessions
                       ├── Initialize StorageSyncService
                       └── Listen on port 3333
```

## Authentication System

### JWT Token Flow

```
Login (POST /auth/login)
  │
  ├── AuthUserService validates email + password (bcrypt)
  ├── Checks business hours (startWork/endWork)
  ├── Generates access token (JWT_SECRET, 15min)
  ├── Generates refresh token (JWT_REFRESH_SECRET, 7 days)
  ├── Sets refresh token in httpOnly cookie
  └── Returns { token, user }

API Request
  │
  ├── isAuth middleware extracts Bearer token
  ├── Verifies JWT, extracts { id, profile, companyId }
  └── Attaches tokenData to req

Token Refresh (POST /auth/refresh_token)
  │
  ├── Reads jrt cookie
  ├── FindUserFromToken validates refresh token
  ├── Checks tokenVersion (invalidation)
  └── Issues new access + refresh tokens

API Token Auth (External API)
  │
  ├── isAuthApi middleware extracts Bearer token
  ├── Looks up token in Settings table
  └── Grants access if found
```

### User Roles & Permissions

| Field | Purpose |
|---|---|
| `profile` | "admin" or "user" — controls access to management features |
| `allTicket` | Can view all tickets (not just own queue) |
| `allHistoric` | Can view all ticket history |
| `viewConection` | Can view connections page |
| `viewSector` | Can view queue assignments |
| `viewName` | Can view agent names |
| `viewTags` | Can view and manage tags |
| `startWork` / `endWork` | Working hours restriction |

## WhatsApp Session Management

### Session Lifecycle

```
CreateWhatsAppService
  │
  └── Database record created
        │
StartWhatsAppSession
  │
  ├── initWbot() → Create puppeteer Client
  │   ├── ChromiumArgs for Docker
  │   ├── LocalAuth strategy (session persistence)
  │   └── Event handlers setup
  │
  ├── wbotMessageListener() → Attach message handlers
  │   ├── "message" → handleMessage (incoming)
  │   ├── "message_create" → handleMessage (outgoing, fromMe)
  │   ├── "message_ack" → handleMsgAck
  │   ├── "message_edit" → HandleMessageEditService
  │   └── "message_reaction" → HandleMessageReactionService
  │
  └── wbotMonitor() → Attach state handlers
      ├── "change_state" → track connection state
      ├── "disconnected" → auto-reconnect logic
      └── Socket.IO events → whatsappSession updates
```

### Resilience Patterns

| Pattern | Implementation |
|---|---|
| **Circuit Breaker** | `WhatsAppCircuitBreaker.ts` — Prevents repeated connection attempts on failing sessions |
| **Health Checker** | `WhatsAppHealthChecker.ts` — Periodic session health validation |
| **Auto-Reconnect** | `WhatsAppReconnectService.ts` — Automatic re-establishment of dropped connections |
| **Retry with Backoff** | `SendWhatsAppMessage.ts` — 3 attempts with exponential backoff + jitter for message delivery |
| **Message Sync** | `MessageSyncService.ts` — Re-sync missed messages after reconnection (configurable per connection) |

## Storage Architecture

### Strategy Pattern

```
StorageService (Singleton)
  │
  ├── Primary: S3StorageProvider (if configured)
  │   ├── AWS S3
  │   ├── MinIO
  │   ├── DigitalOcean Spaces
  │   ├── Cloudflare R2
  │   └── Backblaze B2
  │
  ├── Fallback: LocalStorageProvider (always available)
  │   └── backend/public/ directory
  │
  └── PendingUpload queue
      └── StorageSyncService (periodic retry)
```

### Upload Flow

```
1. File received (multer / base64 / URL)
2. StorageService.upload() attempts S3
3. If S3 fails → save to local + create PendingUpload record
4. StorageSyncService periodically retries PendingUploads
5. On success → optionally delete local copy
```

## Cron Jobs

| Job | Schedule | Purpose |
|---|---|---|
| `ClosedAllOpenTickets` | Configurable | Auto-close tickets inactive for N hours. Sends inactivity message, triggers NPS rating flow, processes in batches |

## Service Catalog Summary

| Service | Files | Key Responsibility |
|---|---|---|
| **WbotServices** | 18 | Core WhatsApp integration: message handling, session management, chatbot routing |
| **TicketServices** | 7 | Ticket lifecycle: create, update, close, permissions, tracking |
| **MessageServices** | 5 | Message CRUD, reactions, edit, sync |
| **ContactServices** | 8 | Contact management, upsert, tags |
| **WebhookService** | 2 | Event dispatch to external URLs |
| **StorageServices** | 7 | S3/local storage abstraction, migration, sync |
| **TypebotServices** | 1 | External chatbot integration |
| **UserServices** | 6 | User CRUD, authentication |
| **WhatsappService** | 8 | WhatsApp connection management |
| **QueueService** | 5 | Queue/department CRUD |
| **ChatBotServices** | 6 | Chatbot tree management |
| **TagServices** | 8 | Tag CRUD, contact sync |
| **SettingServices** | 4 | Key-value configuration |
| **ReportService** | 1 | Dashboard KPIs (raw SQL) |
| **QuickAnswerService** | 6 | Quick response templates |
| **QueueIntegrationServices** | 5 | Typebot config management |
| **DialogChatBotsServices** | 5 | Chatbot conversation state |
| **AuthServices** | 2 | Token validation/refresh |

## Key Design Patterns

| Pattern | Usage |
|---|---|
| **Service Layer** | All business logic in service classes, controllers are thin |
| **Strategy Pattern** | Storage providers (S3/Local) with common interface |
| **Singleton** | StorageService, Socket.IO instance |
| **Circuit Breaker** | WhatsApp session failure protection |
| **Observer** | Socket.IO events for real-time updates |
| **Fire-and-Forget** | Webhook dispatch (non-blocking) |
| **FindOrCreate** | Messages and contacts (idempotent creation) |
| **Self-Referential Tree** | Chatbot menu structure (Chatbot model references itself) |
| **Decorator** | Sequelize-typescript model decorators |
| **Middleware Pipeline** | Express middleware chain (auth, rate limit, validation) |

## Security Architecture

| Measure | Details |
|---|---|
| **Helmet** | HTTP security headers (CSP, HSTS, etc.) |
| **Rate Limiting** | Separate limiters for auth (5/15min), API, and messages |
| **JWT** | Short-lived access (15min) + long-lived refresh (7d, httpOnly cookie) |
| **CORS** | Configurable origin whitelist |
| **File Validation** | Upload size limits, MIME type checking |
| **Input Validation** | Yup schemas on user/queue/contact creation |
| **API Token** | Separate token-based auth for external API |
| **Password Hashing** | bcryptjs for user passwords |

---

*Generated: 2026-03-04 | Workflow: document-project (initial_scan, deep)*
