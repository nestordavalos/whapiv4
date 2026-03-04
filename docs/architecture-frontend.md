# WHAPI v4 — Frontend Architecture

## Overview

The frontend is a **React 17 Single Page Application (SPA)** built with Vite, using Material UI (MUI) v5 for the design system. It communicates with the backend via REST API (Axios) and WebSocket (Socket.IO) for real-time updates. The app is a Progressive Web App (PWA) with service worker support.

## Technology Stack

| Category | Technology | Version | Justification |
|---|---|---|---|
| Framework | React | 17.0.2 | UI library with hooks, stable ecosystem |
| Build Tool | Vite | 5.4.11 | Fast HMR, modern bundler, proxy support |
| UI Library | Material UI (MUI) | 5.15.8 | Comprehensive component library, theming |
| CSS-in-JS | Emotion (@emotion/react) | 11.11.0 | Styled components, MUI styling engine |
| Routing | react-router-dom | 5.2.0 | Client-side routing (Switch/Route pattern) |
| Forms | Formik | 2.2.0 | Form state management, validation integration |
| Validation | Yup | 0.32.8 | Schema-based form validation |
| HTTP Client | Axios | 1.13.2 | REST API calls with interceptors |
| WebSocket | socket.io-client | 4.7.3 | Real-time server events |
| i18n | i18next | 19.8.2 | Multi-language support (pt, en, es) |
| Charts | ECharts + Recharts | 5.2.2 / 2.0.2 | Dashboard visualizations |
| JWT | jwt-decode | 4.0.0 | Token expiration checking |
| Audio | mic-recorder-to-mp3 | 2.2.2 | Voice message recording |
| Notifications | react-toastify | 6.0.9 | Toast notifications |
| QR Code | qrcode.react | 1.0.0 | WhatsApp authentication QR display |
| CSV Export | react-csv | 2.2.2 | Contact/tag data export |
| Virtualization | react-window | 1.8.10 | Efficient large list rendering |
| PWA | vite-plugin-pwa | 1.2.0 | Service worker, offline support |

## Architecture Pattern

### Component-Based with Context + Hooks

```
┌─────────────────────────────────────────────────┐
│                    App.jsx                       │
│  ┌────────────────────────────────────────────┐  │
│  │            BrowserRouter                    │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │         AuthProvider                  │  │  │
│  │  │  ┌────────────────────────────────┐  │  │  │
│  │  │  │     WhatsAppsProvider          │  │  │  │
│  │  │  │  ┌──────────────────────────┐  │  │  │  │
│  │  │  │  │   LoggedInLayout         │  │  │  │  │
│  │  │  │  │  ┌────────┐ ┌─────────┐ │  │  │  │  │
│  │  │  │  │  │ AppBar │ │ Drawer  │ │  │  │  │  │
│  │  │  │  │  └────────┘ └─────────┘ │  │  │  │  │
│  │  │  │  │  ┌────────────────────┐  │  │  │  │  │
│  │  │  │  │  │    Page Routes     │  │  │  │  │  │
│  │  │  │  │  │  (15 pages)        │  │  │  │  │  │
│  │  │  │  │  └────────────────────┘  │  │  │  │  │
│  │  │  │  └──────────────────────────┘  │  │  │  │
│  │  │  └────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### State Management

The application uses **React Context API** with **custom hooks** for state management:

```
┌─────────────────────────────────────┐
│            Global State              │
│                                      │
│  AuthContext                         │
│  ├── user (current user object)      │
│  ├── isAuth (boolean)                │
│  ├── loading (boolean)               │
│  ├── handleLogin(userData)           │
│  └── handleLogout()                  │
│                                      │
│  WhatsAppsContext                     │
│  ├── whatsApps[] (connection list)   │
│  └── loading (boolean)               │
│                                      │
│  ReplyingMessageContext              │
│  ├── replyingMessage (object|null)   │
│  └── setReplyingMessage()            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│          Page-Level State            │
│                                      │
│  useTickets(params) → Hook           │
│  ├── tickets[] (paginated list)      │
│  ├── hasMore (boolean)               │
│  ├── count (total)                   │
│  └── loading (boolean)               │
│                                      │
│  useDashboard() → Hook              │
│  └── find(params) (KPI data)        │
│                                      │
│  useQueues() → Hook                 │
│  └── findAll() (queue list)         │
│                                      │
│  useLocalStorage(key, init) → Hook  │
│  └── [value, setValue] (persisted)   │
└─────────────────────────────────────┘
```

### Real-time Pattern

```
Socket.IO Connection
  │
  ├── useAuth hook
  │   └── Listens for "user" events → updates user state
  │
  ├── useWhatsApps hook
  │   ├── Listens for "whatsapp" → update/delete connections
  │   └── Listens for "whatsappSession" → session status updates
  │
  └── Page-level listeners (in useEffect)
      ├── Tickets page: "ticket" → update ticket list
      ├── Contacts: "contact" → update contact list
      ├── Users: "user" → update user list
      ├── Queues: "queue" → update queue list
      └── Messages: "appMessage" → new/updated messages
```

## Route Map

| Route | Page Component | Auth Required | Description |
|---|---|---|---|
| `/login` | Login | No | Email/password authentication |
| `/signup` | Signup | No | New user registration |
| `/` | Dashboard | Yes | KPIs, charts, agent metrics |
| `/tickets/:ticketId?` | Tickets | Yes | Ticket list + conversation view |
| `/connections` | Connections | Yes | WhatsApp connection management |
| `/contacts` | Contacts | Yes | Contact directory + CSV export |
| `/users` | Users | Yes | User administration |
| `/quickAnswers` | QuickAnswers | Yes | Quick response templates |
| `/Settings` | Settings | Yes | System configuration |
| `/api` | Api | Yes | API documentation text |
| `/apidocs` | ApiDocs | Yes | Swagger UI iframe |
| `/apikey` | ApiKey | Yes | API key display/management |
| `/Queues` | Queues | Yes | Queue/department management |
| `/Tags` | Tags | Yes | Tag management + CSV export |
| `/queue-integrations` | QueueIntegration | Yes | Typebot integration config |

## Data Flow

### REST API Communication

```
Component
  │
  ├── Direct API call: api.get/post/put/delete("/endpoint")
  │   │
  │   ├── Axios interceptor (request)
  │   │   └── Adds "Authorization: Bearer {token}" header
  │   │
  │   ├── Response success → update component state
  │   │
  │   └── Axios interceptor (response error)
  │       ├── 403 → try refresh token → retry original request
  │       └── 401 → force logout → redirect to /login
  │
  └── Via custom hook: useTickets, useDashboard, useQueues
      └── Encapsulates API call + state management
```

### WebSocket Communication

```
socket-io.jsx (Singleton)
  │
  ├── Connection setup
  │   ├── Transport: "websocket" (no polling fallback)
  │   ├── JWT validation before connect (jwtDecode expiry check)
  │   ├── Reconnection: delay 1-30s, infinite attempts
  │   └── Error handler: jwt expired → disconnect + reload
  │
  ├── Events from server → Component listeners
  │   ├── "appMessage" → {action: "create"|"update"|"delete", message, ticket}
  │   ├── "ticket" → {action: "update"|"delete", ticket}
  │   ├── "contact" → {action: "update"|"delete", contact}
  │   ├── "whatsapp" → {action: "update"|"delete", whatsapp}
  │   ├── "whatsappSession" → {action: "update", session}
  │   ├── "user" → {action: "update"|"delete", user}
  │   └── "session:expired" → redirect to /login
  │
  └── Server-side join room
      └── Authenticated users join their user channel
```

## Authentication Flow

```
1. User enters email + password on /login
2. POST /auth/login → backend validates credentials
3. Response: { token, user } + httpOnly cookie with refresh token
4. Token saved to localStorage
5. Axios interceptor adds "Authorization: Bearer {token}" to all requests
6. Socket.IO validates token before connecting
7. On 403 (expired): interceptor calls POST /auth/refresh_token
8. New tokens received → retry original request
9. On 401 (invalid): force logout → clear localStorage → redirect /login
10. On "session:expired" socket event → redirect /login
```

## Permission System

The `Can` component and `rules.jsx` handle role-based access:

```jsx
// rules.jsx defines what each profile can access
const rules = {
  user: { /* limited menu items */ },
  admin: { /* full access */ }
};

// Can component wraps UI elements
<Can role={user.profile} perform="drawer-admin-items:view">
  <AdminOnlyMenuItem />
</Can>
```

User model boolean flags (`allTicket`, `viewConection`, `viewSector`, `viewName`, `viewTags`, `allHistoric`) provide additional granular permissions on top of the profile-based system.

## Internationalization

```
i18next configuration: frontend/src/translate/i18n.js
  │
  ├── pt.js (Portuguese) — 840 lines — Original language
  ├── en.js (English) — 823 lines
  └── es.js (Spanish) — 988 lines — Most complete
```

Usage: `i18n.t("section.key")` throughout components.

## PWA Configuration

| Feature | Details |
|---|---|
| **Name** | T-Chateo |
| **Short Name** | T-chateo |
| **Description** | Sistema de Conversaciones y Mensajería |
| **Theme Color** | #CCC |
| **Strategy** | generateSW (Workbox) |
| **Cache** | Google Fonts (CacheFirst, 30 days) |
| **Display** | standalone |

## Build & Deployment

```
Frontend Dockerfile (Multi-stage):
  │
  ├── Stage 1: node:14 (Build)
  │   ├── npm install
  │   └── npm run build → dist/
  │
  └── Stage 2: nginx:alpine (Serve)
      ├── Copy dist/ to /usr/share/nginx/html
      ├── Copy Nginx config (SPA routing, SSL)
      ├── Run add-env-vars.sh (runtime env injection)
      └── Expose ports 3333 (HTTP) and 443 (HTTPS)
```

Runtime environment variables are injected into the built JS bundle via `window.ENV` object, resolved by `config.jsx`:
1. `window.ENV.REACT_APP_BACKEND_URL` (runtime injection via Nginx)
2. `import.meta.env.VITE_BACKEND_URL` (build-time Vite)
3. `process.env.REACT_APP_BACKEND_URL` (legacy CRA fallback)

## Key UI Patterns

| Pattern | Components | Description |
|---|---|---|
| **CRUD Page** | Users, Queues, Tags, QuickAnswers | Table + Create/Edit Modal + Delete Confirmation |
| **List + Detail** | Tickets | Split view: left panel list, right panel conversation |
| **Socket Reducer** | useWhatsApps, page-level | `useReducer` with actions: LOAD, UPDATE, DELETE, RESET |
| **Modal Dialogs** | *Modal components (15+) | MUI Dialog for forms, confirmations, QR codes |
| **Real-time Badge** | Layout sidebar | Connection status badges, unread counts |
| **Responsive Drawer** | LoggedInLayout | Collapsible sidebar navigation (240px) |
| **Debounced Search** | useTickets, list pages | 200-500ms debounce on search input changes |

---

*Generated: 2026-03-04 | Workflow: document-project (initial_scan, deep)*
