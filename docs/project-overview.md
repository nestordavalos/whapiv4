# WHAPI v4 — Project Overview

## Executive Summary

WHAPI v4 is a **multi-channel customer support / conversational CRM platform** built on top of WhatsApp Web. It provides a complete helpdesk solution where multiple agents can manage customer conversations through WhatsApp, with support for automated chatbots, queue-based routing, tagging, quick responses, and a comprehensive API with webhooks for external integrations.

The project is a **brownfield codebase** forked from the open-source Press-Ticket project (Portuguese origin), significantly extended with new features including S3 storage, webhook system, security hardening, Typebot integration, and improved session management.

## Project Identity

| Attribute | Value |
|---|---|
| **Project Name** | WHAPI v4 (WhatsApp API v4) |
| **PWA Name** | T-Chateo — Sistema de Conversaciones y Mensajería |
| **Type** | Multi-part Monorepo (Backend API + Frontend SPA) |
| **Primary Language** | TypeScript (Backend), JavaScript/JSX (Frontend) |
| **Target Users** | Customer support teams, businesses with WhatsApp-based communication |
| **Origin** | Fork of Press-Ticket (open-source, Portuguese) |
| **License** | See LICENSE file |

## Technology Stack Summary

| Layer | Technology | Version |
|---|---|---|
| **Backend Runtime** | Node.js | 16 |
| **Backend Language** | TypeScript | 4.9.5 |
| **Backend Framework** | Express | 4.17.1 |
| **ORM** | Sequelize + sequelize-typescript | 5.22.3 / 1.1.0 |
| **Database** | MariaDB / MySQL | 10.6 |
| **Frontend Framework** | React (JSX) | 17.0.2 |
| **Frontend Build** | Vite | 5.4.11 |
| **UI Library** | Material UI (MUI) | 5.15.8 |
| **WebSocket** | Socket.IO | 4.7.3 |
| **WhatsApp Client** | whatsapp-web.js (Puppeteer) | fork |
| **Storage** | Local / AWS S3 / S3-compatible | — |
| **Job Queue** | Bull (Redis-based) | 4.10.4 |
| **Authentication** | JWT (access + refresh tokens) | — |
| **Containerization** | Docker Compose | 3 services |
| **Reverse Proxy** | Nginx (frontend container) | Alpine |
| **Error Tracking** | Sentry | 5.29.2 |
| **Logging** | Pino | 8.11.0 |
| **i18n** | i18next | 19.8.2 |
| **API Docs** | Swagger UI Express | 4.3.0 |
| **Testing** | Jest + Supertest | 26.x |

## Architecture Type

**Layered Client-Server Architecture** with real-time WebSocket communication:

- **Frontend**: Single Page Application (SPA) served via Nginx, communicates with backend via REST API and WebSocket
- **Backend**: Express API server with middleware pipeline, service layer pattern, Sequelize ORM, and WhatsApp Web client integration
- **Database**: MariaDB/MySQL relational database with 20 models and 121 migrations
- **Real-time**: Socket.IO for bidirectional communication (ticket updates, message delivery, session status)
- **External**: Webhook system for third-party integrations (n8n, Make, Zapier)

## Repository Structure

```
whapiv4/                      # Monorepo root
├── backend/                  # Node.js/TypeScript API (Part: backend)
├── frontend/                 # React SPA (Part: frontend)
├── docs/                     # Project documentation (21 files)
├── docker-compose.yaml       # Main deployment (3 services)
├── docker-compose.*.yaml     # Optional services (phpMyAdmin, Browserless)
└── _bmad/                    # BMAD Method framework (agents, workflows)
```

## Key Features

### Core Functionality
- **Multi-session WhatsApp**: Connect multiple WhatsApp numbers simultaneously
- **Ticket System**: Queue-based conversation management with status tracking (open, pending, closed)
- **Agent Assignment**: Manual and automatic agent routing via queues
- **Business Hours**: Granular per-connection and per-queue schedules (including lunch breaks)
- **Chatbot**: Tree-based menu system with numbered options and automatic routing
- **Typebot Integration**: External chatbot engine with session management

### Communication
- **Text Messages**: Send/receive with retry logic and exponential backoff
- **Media Support**: Images, audio, video, documents (local upload, base64, URL)
- **Message Editing**: Edit sent messages within 15-minute window
- **Message Forwarding**: Forward messages between contacts with media support
- **Message Reactions**: Emoji reactions with real-time sync
- **Quick Answers**: Shortcut-based template responses
- **Message Variables**: Dynamic variables in templates (contact name, ticket info, etc.)

### Data & Organization
- **Contacts**: Full CRUD with custom fields, tags, and CSV export/import
- **Tags**: Color-coded labels for contacts and ticket filtering
- **Queue System**: Department-based routing with chatbot and integration support
- **Dashboard**: KPIs, NPS scoring, agent performance metrics, and charts

### Integration & API
- **External API**: REST endpoints for programmatic access (authentication, tickets, messages, contacts)
- **Webhooks**: 9 event types with per-connection configuration and filtering
- **Swagger UI**: Built-in API documentation browser
- **Postman Collection**: Pre-built collection with environment setup

### Infrastructure
- **S3 Storage**: AWS S3, MinIO, DigitalOcean Spaces, Cloudflare R2, Backblaze B2 with automatic fallback
- **Docker Deployment**: Multi-container setup with health checks and auto-migration
- **Session Management**: Circuit breaker, health checker, auto-reconnection
- **Security**: Helmet, rate limiting, JWT, CORS, file upload validation
- **Monitoring**: Sentry error tracking, Pino structured logging

## Known Technical Debt / Observations

1. **Mixed Languages**: Documentation in Spanish (new), Portuguese (inherited), and English (technical)
2. **Legacy Installation Guides**: 4 Portuguese guides from Press-Ticket that don't reflect current Docker setup
3. **Superseded Documentation**: Some webhook docs are outdated (4/9 status superseded by 9/9 complete)
4. **Frontend React Version**: Using React 17 (not latest), with class-style MUI (`@mui/styles`)
5. **Sequelize Version**: Using v5 (v6/v7 available with significant improvements)
6. **No Formal Testing Coverage**: Jest configured but limited test coverage observed
7. **Raw SQL in Reports**: Dashboard service uses raw SQL queries instead of ORM

---

*Generated: 2026-03-04 | Workflow: document-project (initial_scan, deep)*
