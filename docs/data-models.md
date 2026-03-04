# WHAPI v4 — Data Models

## Overview

The database layer uses **Sequelize 5** with **sequelize-typescript** decorators, connecting to **MariaDB 10.6 / MySQL** with `utf8mb4` charset and `utf8mb4_bin` collation. The schema consists of **20 models** managed through **121 migration files** spanning from July 2020 to June 2025.

## Entity Relationship Diagram

```
┌──────────┐     ┌───────────┐     ┌──────────┐
│   User   │────►│  Ticket   │◄────│ Contact  │
│          │     │           │     │          │
│ id       │     │ id        │     │ id       │
│ name     │     │ status    │     │ name     │
│ email    │     │ lastMsg   │     │ number   │
│ profile  │     │ unread    │     │ email    │
│ online   │     │ isGroup   │     │ isGroup  │
│ password │     │ isBot     │     │ profilePic│
│ workHrs  │     │ fromMe    │     └──┬──┬────┘
└──┬──┬────┘     └─┬──┬──┬──┘        │  │
   │  │            │  │  │           │  │
   │  │   ┌────────┘  │  └───────┐   │  ├──►ContactCustomField
   │  │   │           │          │   │  │
   │  │   ▼           ▼          ▼   │  └──►ContactTag◄──►Tag
   │  │  Message    Queue    Whatsapp │
   │  │  │         │         │       │
   │  │  │ id(STR) │ id      │ id    │
   │  │  │ body    │ name    │ name  │
   │  │  │ ack     │ color   │ status│
   │  │  │ fromMe  │ greeting│ qrcode│
   │  │  │ mediaUrl│ workHrs │ webhook│
   │  │  │ quoted  │         │ workHrs│
   │  │  │         │         │ sync  │
   │  │  ▼         │         │       │
   │  │  Msg       │         │       │
   │  │  Reaction  ▼         │       │
   │  │           Chatbot    │       │
   │  │           │ ▲ (self) │       │
   │  │           │ │options │       │
   │  │           ▼          │       │
   │  │     QueueIntegrations│       │
   │  │                      │       │
   │  └──►UserQueue          │       │
   │      (User↔Queue)       │       │
   │                         │       │
   └──────────────────────────┘       │
                                      │
   TicketTraking ──► Ticket,User,WA   │
   DialogChatBots──► Chatbot,Contact  │
   UserRating ──► Ticket, User        │
   Setting (key-value store)          │
   QuickAnswer (shortcut templates)   │
   PendingUpload (S3 retry queue)     │
   WhatsappQueue (WA↔Queue junction)  │
```

## Models Detail

### 1. User

System users (agents, administrators).

| Column | Type | Default | Notes |
|---|---|---|---|
| id | INTEGER | auto | PK, auto-increment |
| name | STRING | — | Display name |
| email | STRING | — | Login credential |
| password | VIRTUAL | — | Not persisted, hashed on write |
| passwordHash | STRING | — | bcrypt hash (salt=8) |
| tokenVersion | INTEGER | 0 | Incremented to invalidate refresh tokens |
| profile | STRING | "admin" | "admin" or "user" |
| whatsappId | INTEGER | — | FK → Whatsapp (default connection) |
| online | BOOLEAN | — | Online status |
| startWork | STRING | "00:00" | Work hours start |
| endWork | STRING | "23:59" | Work hours end |
| allTicket | STRING | — | Permission: view all tickets |
| allHistoric | STRING | — | Permission: view all history |
| viewConection | STRING | — | Permission: view connections |
| viewSector | STRING | — | Permission: view queue assignments |
| viewName | STRING | — | Permission: view agent names |
| viewTags | STRING | — | Permission: view/manage tags |
| isRemoveTags | STRING | — | Permission: remove tags |

**Relationships:** BelongsTo Whatsapp, HasMany Ticket, BelongsToMany Queue (via UserQueue)
**Hooks:** BeforeCreate/BeforeUpdate → `hashPassword` (bcrypt)

### 2. Contact

WhatsApp contacts (customers).

| Column | Type | Default | Notes |
|---|---|---|---|
| id | INTEGER | auto | PK |
| name | STRING | — | Contact display name |
| number | STRING | — | **NOT NULL, UNIQUE** — WhatsApp number |
| email | STRING | "" | Contact email |
| profilePicUrl | STRING | — | WhatsApp profile picture URL |
| isGroup | BOOLEAN | false | Whether this is a group contact |

**Relationships:** HasMany Ticket, HasMany ContactCustomField, BelongsToMany Tag (via ContactTag)

### 3. Ticket

Conversations/support tickets — core entity.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | INTEGER | auto | PK |
| status | STRING | "pending" | "open", "pending", "closed" (indexed) |
| unreadMessages | INTEGER | — | Unread message count |
| lastMessage | STRING | — | Last message preview text |
| isGroup | BOOLEAN | false | Group conversation |
| isBot | BOOLEAN | false | Currently handled by chatbot |
| fromMe | BOOLEAN | false | Initiated by agent |
| isMsgGroup | BOOLEAN | false | Message group flag |
| isFinished | BOOLEAN | false | Ticket completed flag |
| userId | INTEGER | — | FK → User (assigned agent) |
| contactId | INTEGER | — | FK → Contact (customer) |
| whatsappId | INTEGER | — | FK → Whatsapp (connection used) |
| queueId | INTEGER | — | FK → Queue (department) |
| typebotSessionId | STRING | — | Active Typebot session ID |
| typebotStatus | BOOLEAN | false | Typebot is active |
| useIntegration | BOOLEAN | false | Using external integration |
| integrationId | INTEGER | — | FK → QueueIntegrations |

**Indexes:** status, createdAt, userId, contactId, whatsappId, queueId
**Relationships:** BelongsTo User/Contact/Whatsapp/Queue/QueueIntegrations, HasMany Message

### 4. Message

Chat messages — uses STRING primary key (WhatsApp message ID).

| Column | Type | Default | Notes |
|---|---|---|---|
| id | STRING | — | **PK** — WhatsApp message ID |
| body | TEXT (long) | — | Message content |
| bodySearch | STRING | — | Lowercase truncated body for search (indexed) |
| ack | INTEGER | 0 | Delivery status (0=sent, 1=received, 2=read, 3=played) |
| read | BOOLEAN | false | Read by agent |
| fromMe | BOOLEAN | false | Sent by agent (not customer) |
| mediaUrl | STRING | — | Media file URL (dynamic getter: S3/local) |
| mediaType | STRING | — | MIME type indicator |
| dataJson | TEXT (long) | — | Raw WhatsApp message JSON |
| participant | STRING | — | Group message sender |
| isDeleted | BOOLEAN | false | Message was deleted |
| isEdited | BOOLEAN | false | Message was edited |
| quotedMsgId | STRING | — | FK → Message (self) — replied message |
| ticketId | INTEGER | — | FK → Ticket |
| contactId | INTEGER | — | FK → Contact |

**Hooks:** BeforeCreate/BeforeUpdate → `normalizeBody` (lowercase + truncate for search)
**Custom getter:** `mediaUrl` resolves dynamically based on storage configuration

### 5. Whatsapp

WhatsApp connection configurations — complex model with business hours per day.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | INTEGER | auto | PK |
| name | TEXT | — | UNIQUE — Connection display name |
| session | TEXT | — | Session data |
| qrcode | TEXT | — | QR code for authentication |
| status | STRING | — | Connection status |
| number | STRING | — | WhatsApp phone number |
| battery | STRING | — | Phone battery level |
| plugged | BOOLEAN | — | Phone is charging |
| retries | INTEGER | — | Reconnection retry count |
| isDefault | BOOLEAN | false | Default connection |
| isDisplay | BOOLEAN | false | Display in connection list |
| isGroup | BOOLEAN | false | Group-only connection |
| **Messages** | | | |
| greetingMessage | TEXT | — | Welcome message |
| farewellMessage | TEXT | — | Goodbye message |
| ratingMessage | TEXT | "" | NPS rating prompt |
| outOfWorkMessage | TEXT | — | Out-of-hours message |
| inactiveMessage | TEXT | "" | Inactivity warning message |
| **Business Hours** | | | |
| defineWorkHours | BOOLEAN | — | Enable business hours |
| monday..sunday | BOOLEAN | — | Day enabled (7 columns) |
| Start/EndDefineWorkHours{Day} | TEXT | — | Time ranges (28 columns) |
| Start/EndDefineWorkHours{Day}Lunch | TEXT | — | Lunch break times |
| **Features** | | | |
| useNPS | BOOLEAN | false | Enable NPS rating flow |
| sendInactiveMessage | BOOLEAN | false | Auto-send inactivity message |
| timeInactiveMessage | TEXT | "" | Inactivity timeout |
| archiveOnClose | BOOLEAN | false | Archive chat on ticket close |
| **Webhooks** | | | |
| webhookUrls | TEXT | — | JSON array of webhook URLs and config |
| webhookEnabled | BOOLEAN | false | Webhooks active |
| **Sync** | | | |
| syncMaxMessagesPerChat | INTEGER | 50 | Messages to sync per chat |
| syncMaxChats | INTEGER | 100 | Max chats to sync |
| syncMaxMessageAgeHours | INTEGER | 24 | Max message age for sync |
| syncDelayBetweenChats | INTEGER | 100 | Delay between chat syncs (ms) |
| syncMarkAsSeen | BOOLEAN | true | Mark messages as seen on sync |
| syncCreateClosedForRead | BOOLEAN | true | Create closed tickets for read msgs |

**Relationships:** HasMany Ticket, BelongsToMany Queue (via WhatsappQueue)

### 6. Queue

Departments/routing queues for ticket distribution.

| Column | Type | Default | Notes |
|---|---|---|---|
| id | INTEGER | auto | PK |
| name | STRING | — | **NOT NULL, UNIQUE** |
| color | STRING | — | **NOT NULL, UNIQUE** — Hex color for UI |
| greetingMessage | STRING | — | Welcome message for queue |
| startWork | STRING | — | Working hours start |
| endWork | STRING | — | Working hours end |
| absenceMessage | STRING | — | Out-of-hours message |
| integrationId | INTEGER | — | FK → QueueIntegrations |

**Relationships:** BelongsToMany Whatsapp/User, HasMany Chatbot, BelongsTo QueueIntegrations

### 7. Supporting Models

| Model | Purpose | Key Columns |
|---|---|---|
| **TicketTraking** | Time metrics per ticket | ticketId, userId, whatsappId, startedAt, queuedAt, closedAt, finishedAt, ratingAt, rated |
| **MessageReaction** | Emoji reactions on messages | messageId (FK→Message), emoji, senderId, senderName, fromMe |
| **ContactCustomField** | Dynamic fields on contacts | contactId (FK→Contact), name, value |
| **ContactTag** | Contact ↔ Tag junction | contactId (FK→Contact), tagId (FK→Tag) |
| **UserQueue** | User ↔ Queue junction | userId (FK→User), queueId (FK→Queue) |
| **WhatsappQueue** | Whatsapp ↔ Queue junction | whatsappId (FK→Whatsapp), queueId (FK→Queue) |
| **Chatbot** | Self-referential menu tree | name, greetingMessage, queueId, chatbotId (self), isAgent |
| **DialogChatBots** | Chatbot conversation state | awaiting, contactId, queueId, chatbotId |
| **QueueIntegrations** | External integration config (Typebot) | type, name, typebotUrl, typebotSlug, typebotExpires, keywords, delays |
| **Setting** | System key-value store | key (PK string), value |
| **QuickAnswer** | Template quick responses | shortcut (unique text trigger), message (response text) |
| **Tag** | Color-coded labels | name, color |
| **UserRating** | Agent performance rating | ticketId, userId, rate (1-5) |
| **PendingUpload** | S3 upload retry queue | filename, mimeType, size, status (pending/syncing/completed/failed), retryCount, lastError |

## Known Settings Keys

| Key | Purpose | Example Value |
|---|---|---|
| `userApiToken` | External API authentication token | UUID string |
| `timeCreateNewTicket` | Minutes before creating new ticket for same contact | "120" |
| `ASC` | Ticket sort direction | "enabled"/"disabled" |
| `created` | Sort by createdAt vs updatedAt | "enabled"/"disabled" |
| `allTicket` | Default all-ticket visibility | "enabled"/"disabled" |
| `CheckMsgIsGroup` | Process group messages | "enabled"/"disabled" |

## Migration History

- **121 migrations** from `20200717-initial` to `20250610-whatsapp-sync-settings`
- Major milestones:
  - 2020-07: Initial schema (users, contacts, tickets, messages, whatsapps, queues)
  - 2021: Chat bots, tags, contact custom fields, quick answers
  - 2022: Queue integrations (Typebot), ticket tracking, user ratings
  - 2023: Message reactions, work hours expansion
  - 2024-12: S3 storage (pending uploads), security improvements
  - 2025-06: Webhook system, sync settings, message editing

## Database Configuration

```typescript
// backend/src/config/database.ts
{
  dialect: process.env.DB_DIALECT || "mysql",
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT) || 3306,
  charset: "utf8mb4",
  collate: "utf8mb4_bin",
  timezone: "-03:00",
  logging: false
}
```

---

*Generated: 2026-03-04 | Workflow: document-project (initial_scan, deep)*
