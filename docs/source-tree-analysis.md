# WHAPI v4 — Source Tree Analysis

## Repository Root

```
whapiv4/
├── .env.example                         # Environment variables template
├── docker-compose.yaml                  # Main deployment: backend + frontend + mysql
├── docker-compose.browserless.yaml      # Optional: Browserless Chrome service
├── docker-compose.phpmyadmin.yaml       # Optional: phpMyAdmin database UI
├── LICENSE                              # Project license
├── README.md                            # Main project documentation
├── UPDATE.sh                            # Update/deployment script
├── quick-test.sh                        # Quick API testing script
├── test-apis.sh                         # Extended API testing script
├── test-webhook-events.js               # Webhook event testing utility
├── verify-webhook-filters.js            # Webhook filter verification
│
├── backend/                             # ★ BACKEND API (Node.js/TypeScript/Express)
├── frontend/                            # ★ FRONTEND SPA (React/JSX/Vite/MUI)
├── docs/                                # Project documentation (21+ files)
├── _bmad/                               # BMAD Method framework
└── _bmad-output/                        # BMAD planning/implementation artifacts
```

## Backend — Node.js/TypeScript API

```
backend/
├── Dockerfile                           # Node 16 + Chrome (Puppeteer) + dockerize
├── package.json                         # Dependencies & scripts
├── tsconfig.json                        # TypeScript config
├── jest.config.js                       # Jest test config
├── nodemon.json                         # Dev server config (watches src/)
├── prettier.config.js                   # Code formatting
├── sequelizeData.json                   # Sequelize seed data
│
├── public/                              # Static files / local media storage
│
├── scripts/
│   ├── migrate-s3-to-prefix.ts          # S3 migration utility (TypeScript)
│   └── migrate-s3-to-prefix.js          # S3 migration utility (compiled)
│
└── src/                                 # ★ APPLICATION SOURCE
    ├── bootstrap.ts                     # Dotenv loader (ENTRY: loaded first)
    ├── app.ts                           # Express app setup (ENTRY: middleware pipeline)
    ├── server.ts                        # HTTP server start (ENTRY: main)
    ├── swagger.json                     # API documentation spec
    │
    ├── @types/                          # TypeScript type declarations
    │   └── express.d.ts                 # Express Request augmentation (tokenData)
    │
    ├── config/                          # ★ Configuration modules
    │   ├── auth.ts                      # JWT secrets & expiration
    │   ├── database.ts                  # Sequelize/MySQL config
    │   ├── storage.ts                   # Storage provider config (local/S3)
    │   ├── upload.ts                    # Multer file upload config
    │   └── whatsapp.ts                  # WhatsApp session config
    │
    ├── database/                        # ★ Database layer
    │   ├── index.ts                     # Sequelize instance (21 models registered)
    │   ├── migrations/                  # 121 migration files (2020-07 → 2025-06)
    │   └── seeds/                       # 6 seed files (default settings & users)
    │
    ├── models/                          # ★ Sequelize models (20 models)
    │   ├── User.ts                      # System users (agents, admins)
    │   ├── Contact.ts                   # WhatsApp contacts
    │   ├── ContactCustomField.ts        # Dynamic contact fields
    │   ├── ContactTag.ts                # Contact-Tag junction table
    │   ├── Ticket.ts                    # Conversations/tickets
    │   ├── TicketTraking.ts             # Ticket time tracking (metrics)
    │   ├── Message.ts                   # Chat messages
    │   ├── MessageReaction.ts           # Message emoji reactions
    │   ├── Whatsapp.ts                  # WhatsApp connections config
    │   ├── WhatsappQueue.ts             # Connection-Queue junction
    │   ├── Queue.ts                     # Departments/queues
    │   ├── QueueIntegrations.ts         # Queue external integrations (Typebot)
    │   ├── UserQueue.ts                 # User-Queue junction
    │   ├── QuickAnswer.ts              # Template quick responses
    │   ├── Chatbot.ts                   # Chatbot menu nodes (self-referential tree)
    │   ├── DialogChatBots.ts            # Chatbot conversation state tracking
    │   ├── Setting.ts                   # System key-value settings
    │   ├── Tag.ts                       # Color-coded labels
    │   ├── UserRating.ts                # Agent rating/NPS scores
    │   └── PendingUpload.ts             # S3 upload retry queue
    │
    ├── controllers/                     # ★ Request handlers (19 controllers)
    │   ├── ApiController.ts             # External API endpoints
    │   ├── WebhookApiController.ts      # Webhook management API v1
    │   ├── SessionController.ts         # Authentication (login/logout/refresh)
    │   ├── UserController.ts            # User CRUD
    │   ├── ContactController.ts         # Contact CRUD
    │   ├── TicketController.ts          # Ticket CRUD + status management
    │   ├── MessageController.ts         # Message send/list/delete/edit/forward/sync
    │   ├── WhatsAppController.ts        # WhatsApp connection CRUD
    │   ├── WhatsAppSessionController.ts # WhatsApp session control (start/stop/restart)
    │   ├── QueueController.ts           # Queue CRUD
    │   ├── QueueIntegrationController.ts# Queue integration CRUD
    │   ├── QuickAnswerController.ts     # Quick answer CRUD
    │   ├── ChatbotController.ts         # Chatbot CRUD
    │   ├── TagController.ts             # Tag CRUD
    │   ├── SettingController.ts         # System settings
    │   ├── DashbardController.ts        # Dashboard data/KPIs
    │   ├── StorageController.ts         # Storage management + migration
    │   ├── SystemController.ts          # System health/info
    │   └── ImportPhoneContactsController.ts # Bulk contact import
    │
    ├── routes/                          # ★ Route definitions (19 route files)
    │   ├── index.ts                     # Route aggregator
    │   ├── authRoutes.ts                # /auth/*
    │   ├── apiRoutes.ts                 # /api/* (external API)
    │   ├── webhookApiRoutes.ts          # /api/v1/* (webhook API)
    │   ├── userRoutes.ts                # /users/*
    │   ├── contactRoutes.ts             # /contacts/*
    │   ├── ticketRoutes.ts              # /tickets/*
    │   ├── messageRoutes.ts             # /messages/*
    │   ├── whatsappRoutes.ts            # /whatsapp/*
    │   ├── whatsappSessionRoutes.ts     # /whatsappsession/*
    │   ├── queueRoutes.ts              # /queue/*
    │   ├── queueIntegrationRoutes.ts   # /queue-integrations/*
    │   ├── quickAnswerRoutes.ts        # /quickAnswers/*
    │   ├── chatBotRoutes.ts            # /chatBot/*
    │   ├── tagRoutes.ts                # /tags/*
    │   ├── settingRoutes.ts            # /settings/*
    │   ├── dashboardRoutes.ts          # /dashboard/*
    │   ├── storageRoutes.ts            # /storage/*
    │   └── systemRoutes.ts             # /system/*
    │
    ├── services/                        # ★ Business logic layer (18 service directories)
    │   ├── AuthServices/                # JWT token management
    │   ├── UserServices/                # User CRUD + auth
    │   ├── ContactServices/             # Contact CRUD + upsert
    │   ├── TicketServices/              # Ticket lifecycle + permissions
    │   ├── MessageServices/             # Message CRUD + reactions + sync
    │   ├── WhatsappService/             # WhatsApp connection management
    │   ├── QueueService/                # Queue CRUD
    │   ├── QueueIntegrationServices/    # Typebot integration config
    │   ├── QuickAnswerService/          # Quick answers CRUD
    │   ├── ChatBotServices/             # Chatbot tree management
    │   ├── DialogChatBotsServices/      # Chatbot state tracking
    │   ├── TagServices/                 # Tag CRUD + sync
    │   ├── SettingServices/             # Key-value settings
    │   ├── ReportService/               # Dashboard KPIs (raw SQL)
    │   ├── StorageServices/             # S3/local storage abstraction
    │   ├── TypebotServices/             # Typebot API integration
    │   ├── WebhookService/              # Webhook event dispatch
    │   └── WbotServices/                # ★ CORE: WhatsApp bot logic (18 files)
    │       ├── wbotMessageListener.ts   # Main message handler (1453 lines)
    │       ├── wbotMonitor.ts           # Connection monitoring
    │       ├── ChatBotListener.ts       # Chatbot menu processor
    │       ├── SendWhatsAppMessage.ts   # Text message sender (retry logic)
    │       ├── SendWhatsAppMedia.ts     # Media sender (local file)
    │       ├── SendWhatsAppMediaFromBase64.ts  # Media sender (base64)
    │       ├── SendWhatsAppMediaFromUrl.ts     # Media sender (URL)
    │       ├── StartWhatsAppSession.ts         # Session initializer
    │       ├── StartAllWhatsAppsSessions.ts    # Batch session start
    │       ├── wbotCloseTickets.ts             # Auto-close inactive tickets
    │       ├── MessageSyncService.ts           # Reconnection message sync
    │       ├── ForwardWhatsAppMessage.ts       # Message forwarding
    │       ├── EditWhatsAppMessage.ts          # Message editing
    │       ├── DeleteWhatsAppMessage.ts        # Message deletion
    │       ├── ImportContactsService.ts        # Phone contact import
    │       ├── CheckIsValidContact.ts          # WhatsApp number validation
    │       ├── CheckNumber.ts                  # Number normalization
    │       └── GetProfilePicUrl.ts             # Profile picture retrieval
    │
    ├── middleware/                       # Express middleware
    │   ├── isAuth.ts                    # JWT authentication guard
    │   ├── isAuthApi.ts                 # API token authentication guard
    │   └── rateLimiters.ts              # Rate limiting (auth, API, messages)
    │
    ├── libs/                            # Core libraries
    │   ├── socket.ts                    # Socket.IO server initialization
    │   ├── wbot.ts                      # WhatsApp Client factory (original)
    │   ├── wbot-improved.ts             # WhatsApp Client factory (improved)
    │   ├── sessionManager.ts            # Session activity tracking
    │   ├── WhatsAppCircuitBreaker.ts    # Circuit breaker for session failures
    │   ├── WhatsAppHealthChecker.ts     # Session health monitoring
    │   └── WhatsAppReconnectService.ts  # Auto-reconnection service
    │
    ├── helpers/                         # Utility functions (16 files)
    │   ├── CheckContactOpenTickets.ts   # Prevent duplicate tickets
    │   ├── CreateTokens.ts              # JWT token generation
    │   ├── Debounce.ts                  # Debounce utility
    │   ├── GetDefaultWhatsApp.ts        # Default connection resolver
    │   ├── GetTicketWbot.ts             # Get bot for ticket's connection
    │   ├── GetWbotMessage.ts            # Retrieve message from WhatsApp
    │   ├── Mustache.ts                  # Template variable replacement
    │   ├── SerializeUser.ts             # User serialization for responses
    │   ├── SetTicketMessagesAsRead.ts   # Mark messages as read
    │   ├── UpdateDeletedUserOpenTicketsStatus.ts  # Handle deleted user tickets
    │   └── workHours.ts                 # Business hours validation
    │
    ├── errors/
    │   └── AppError.ts                  # Custom error class (statusCode, message)
    │
    ├── utils/
    │   └── logger.ts                    # Pino logger configuration
    │
    └── __tests__/                       # Test files
        ├── __mocks__/                   # Test mocks
        └── unit/                        # Unit tests
```

## Frontend — React SPA

```
frontend/
├── Dockerfile                           # Multi-stage: Node 14 build → Nginx Alpine
├── package.json                         # Dependencies & scripts
├── index.html                           # Vite HTML entry point
├── vite.config.js                       # Vite config (proxy, PWA, MUI resolve)
├── server.js                            # Development server (alternative)
│
├── config/jest/                         # Jest test configuration
├── patches/
│   └── mic-recorder-to-mp3+2.2.2.patch # Audio recording fix (patch-package)
│
├── public/
│   ├── index.html                       # CRA-style HTML (fallback)
│   └── manifest.json                    # PWA manifest
│
├── scripts/                             # Build/deploy scripts
│
└── src/                                 # ★ APPLICATION SOURCE
    ├── index.jsx                        # React entry point (ReactDOM.render)
    ├── App.jsx                          # App root (CssBaseline, Routes)
    ├── config.jsx                       # Runtime config (backend URL resolver)
    ├── config.json                      # Static config (backend URL fallback)
    ├── rules.jsx                        # Permission rules (Can component)
    │
    ├── routes/                          # ★ Route definitions
    │   ├── index.jsx                    # Route map (15 routes)
    │   └── Route.jsx                    # Custom Route with auth check
    │
    ├── context/                         # ★ React Context providers
    │   ├── Auth/AuthContext.jsx          # Auth state (user, login, logout)
    │   ├── ReplyingMessage/             # Reply state for chat
    │   └── WhatsApp/WhatsAppsContext.jsx # WhatsApp connections state
    │
    ├── hooks/                           # ★ Custom hooks (6 hooks)
    │   ├── useAuth/                     # Auth logic + JWT interceptors
    │   ├── useDashboard/                # Dashboard API calls
    │   ├── useLocalStorage/             # Persistent state storage
    │   ├── useQueues/                   # Queue list fetching
    │   ├── useTickets/                  # Ticket list with pagination
    │   └── useWhatsApps/                # WhatsApp connections + socket
    │
    ├── services/                        # ★ API & Socket clients
    │   ├── api.jsx                      # Axios instance (backend URL, credentials)
    │   └── socket-io.jsx               # Socket.IO singleton (JWT, reconnection)
    │
    ├── pages/                           # ★ Page components (15 pages)
    │   ├── Login/                       # Authentication form
    │   ├── Signup/                      # Registration form
    │   ├── Dashboard/                   # KPIs, charts, agent metrics
    │   ├── Tickets/                     # Ticket list + conversation view
    │   ├── Contacts/                    # Contact management + CSV export
    │   ├── Connections/                 # WhatsApp connection management
    │   ├── Users/                       # User administration
    │   ├── Queues/                      # Queue/department management
    │   ├── QueueIntegration/            # Typebot integration config
    │   ├── QuickAnswers/                # Quick response templates
    │   ├── Tags/                        # Tag management
    │   ├── Settings/                    # System settings
    │   ├── Api/                         # API documentation page
    │   ├── ApiDocs/                     # Swagger UI embed
    │   └── ApiKey/                      # API key management
    │
    ├── components/                      # ★ Reusable components (59 components)
    │   ├── MessagesList/                # Chat message renderer
    │   ├── MessageInput/                # Message composer (text, media, audio, emoji)
    │   ├── TicketsList/                 # Ticket list with filters
    │   ├── TicketsManager/              # Ticket tabs (open, pending, closed)
    │   ├── Ticket/                      # Full ticket view (header + messages + input)
    │   ├── ContactModal/                # Contact create/edit dialog
    │   ├── WhatsAppModal/               # WhatsApp connection config dialog
    │   ├── QrcodeModal/                 # QR code scanner for WhatsApp auth
    │   ├── TransferTicketModal/         # Ticket transfer dialog
    │   ├── ForwardMessageModal/         # Message forward dialog
    │   ├── NotificationsPopOver/        # Browser notification manager
    │   └── ... (48 more)               # See component-inventory.md
    │
    ├── layout/                          # ★ App shell
    │   ├── index.jsx                    # LoggedInLayout (AppBar + Drawer)
    │   └── MainListItems.jsx            # Navigation menu items
    │
    ├── translate/                       # ★ Internationalization
    │   ├── i18n.js                      # i18next configuration
    │   └── languages/
    │       ├── pt.js                    # Portuguese (840 lines)
    │       ├── en.js                    # English (823 lines)
    │       └── es.js                    # Spanish (988 lines)
    │
    ├── assets/                          # Static assets (images, logos)
    └── errors/                          # Error handling utilities
```

## Critical Integration Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React SPA)                        │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────────┐    │
│  │ Context  │  │   Hooks      │  │  Components / Pages         │    │
│  │(Auth,WA) │──│(useTickets,  │──│  (MessagesList, Tickets...) │    │
│  └────┬─────┘  │ useWhatsApps)│  └────────────────────────────┘    │
│       │        └──────┬───────┘                                     │
│       └───────────────┼──────────────────────────────────────┐      │
│                       │                                      │      │
│              ┌────────┴────────┐                ┌───────────┴──┐   │
│              │   api.jsx       │                │ socket-io.jsx│   │
│              │  (Axios REST)   │                │ (Socket.IO)  │   │
│              └────────┬────────┘                └──────┬───────┘   │
└───────────────────────┼───────────────────────────────┼────────────┘
                        │ HTTP REST                     │ WebSocket
                        ▼                               ▼
┌───────────────────────┼───────────────────────────────┼────────────┐
│                      BACKEND (Express API)                          │
│  ┌────────────────────┼──────────┐  ┌─────────────────┼─────────┐  │
│  │     Routes         │          │  │   Socket.IO     │         │  │
│  │  (19 route files)  │          │  │   (libs/socket)  │        │  │
│  └─────────┬──────────┘          │  └─────────────────┘         │  │
│            │                     │                               │  │
│  ┌─────────▼──────────┐         │                               │  │
│  │   Controllers      │         │                               │  │
│  │  (19 controllers)  │         │                               │  │
│  └─────────┬──────────┘         │                               │  │
│            │                     │                               │  │
│  ┌─────────▼──────────┐  ┌─────┴─────────────┐                 │  │
│  │    Services         │  │  WbotServices     │                 │  │
│  │  (18 directories)   │  │  (WhatsApp core)  │                 │  │
│  └─────────┬──────────┘  └──────┬─────────────┘                │  │
│            │                     │                               │  │
│  ┌─────────▼──────────┐         ▼                               │  │
│  │   Sequelize ORM    │  ┌──────────────┐  ┌───────────────┐   │  │
│  │   (20 models)      │  │whatsapp-web.js│ │ WebhookService│   │  │
│  └─────────┬──────────┘  │ (Puppeteer)   │ │ (HTTP POST)   │   │  │
│            │              └──────┬────────┘  └───────┬───────┘  │  │
└────────────┼─────────────────────┼───────────────────┼──────────┘  │
             │                     │                   │              │
             ▼                     ▼                   ▼              │
     ┌───────────────┐     ┌────────────┐     ┌──────────────┐      │
     │  MariaDB/MySQL │     │  WhatsApp  │     │External URLs │      │
     │  (121 migrns)  │     │  Web API   │     │(n8n/Make/etc)│      │
     └───────────────┘     └────────────┘     └──────────────┘
```

---

*Generated: 2026-03-04 | Workflow: document-project (initial_scan, deep)*
