# 🔄 Flujo de Webhooks - Diagrama Arquitectónico

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WHAPI v4 - SISTEMA DE WEBHOOKS                    │
└─────────────────────────────────────────────────────────────────────────────┘

                                    EVENTOS
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ✅ IMPLEMENTADOS (4/9)           │  ⚠️ PENDIENTES (5/9)                    │
│  ─────────────────────            │  ──────────────────                     │
│  • message_received               │  • ticket_created                       │
│  • message_sent                   │  • ticket_updated                       │
│  • message_ack                    │  • ticket_closed                        │
│  • connection_update              │  • contact_created                      │
│                                   │  • contact_updated                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

                                ARQUITECTURA

┌──────────────────────────────────────────────────────────────────────────────┐
│                          CAPAS DE LA APLICACIÓN                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPA 1: LISTENERS (Escuchan eventos)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  wbotMessageListener.ts          wbotMonitor.ts                             │
│  ┌─────────────────────┐         ┌──────────────────┐                      │
│  │ - Mensajes entrantes│         │ - Cambios estado │                      │
│  │ - Mensajes salientes│         │ - Desconexiones  │                      │
│  │ - ACK de mensajes   │         │ - Reconexiones   │                      │
│  └──────────┬──────────┘         └────────┬─────────┘                      │
│             │                              │                                │
│             └──────────────┬───────────────┘                                │
│                            │                                                │
│                            ▼                                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPA 2: SERVICIOS (Procesan eventos)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TicketServices/               ContactServices/                             │
│  ┌──────────────────────┐     ┌──────────────────────┐                     │
│  │ FindOrCreateTicket   │     │ CreateOrUpdateContact│                     │
│  │ UpdateTicket   ⚠️    │     │         ⚠️           │                     │
│  └──────────┬───────────┘     └────────┬─────────────┘                     │
│             │                           │                                   │
│             └───────────┬───────────────┘                                   │
│                         │                                                   │
│                         ▼                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPA 3: WEBHOOK SERVICE (Core del sistema)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SendWebhookEvent.ts                                                        │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                                                               │          │
│  │  1. Obtener configuración de webhook (con cache)             │          │
│  │     ├─ webhookEnabled (global)                               │          │
│  │     ├─ webhookUrls (múltiples webhooks)                      │          │
│  │     └─ events (filtro por evento)                            │          │
│  │                                                               │          │
│  │  2. Verificar evento permitido                               │          │
│  │     └─ Si events[] está vacío → enviar todos                 │          │
│  │        Si events[] tiene valores → filtrar                   │          │
│  │                                                               │          │
│  │  3. Construir payload                                        │          │
│  │     ├─ event: tipo de evento                                 │          │
│  │     ├─ timestamp: ISO 8601                                   │          │
│  │     ├─ connectionId: ID del WhatsApp                         │          │
│  │     ├─ connectionName: Nombre del WhatsApp                   │          │
│  │     └─ data: datos específicos del evento                    │          │
│  │                                                               │          │
│  │  4. Enviar a cada webhook habilitado                         │          │
│  │     ├─ Method: POST                                          │          │
│  │     ├─ Timeout: 10s                                          │          │
│  │     ├─ Headers:                                              │          │
│  │     │   ├─ Content-Type: application/json                    │          │
│  │     │   ├─ X-Webhook-Event: <evento>                         │          │
│  │     │   ├─ X-Webhook-Name: <nombre>                          │          │
│  │     │   └─ X-Connection-Id: <id>                             │          │
│  │     └─ Async: no bloquea la operación principal              │          │
│  │                                                               │          │
│  └───────────────────────────┬───────────────────────────────────┘          │
│                              │                                              │
│                              ▼                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ CAPA 4: DESTINOS (Plataformas externas)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │   n8n    │    │   Make   │    │  Zapier  │    │  Custom  │             │
│  │          │    │          │    │          │    │   API    │             │
│  │  ┌────┐  │    │  ┌────┐  │    │  ┌────┐  │    │  ┌────┐  │             │
│  │  │ ✅ │  │    │  │ ✅ │  │    │  │ ✅ │  │    │  │ ✅ │  │             │
│  │  └────┘  │    │  └────┘  │    │  └────┘  │    │  └────┘  │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                          FLUJO DE UN EVENTO COMPLETO

┌─────────────────────────────────────────────────────────────────────────────┐
│ EJEMPLO: message_received                                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    1. WhatsApp → Cliente recibe mensaje
                   │
                   ▼
    2. wbotMessageListener.ts → Detecta mensaje
                   │
                   ├─ Procesa mensaje
                   ├─ Guarda en BD
                   ├─ Crea/actualiza ticket
                   │
                   ▼
    3. sendMessageReceivedWebhook()
                   │
                   ├─ whatsappId: 1
                   ├─ event: "message_received"
                   └─ data: { messageId, from, body, ... }
                   │
                   ▼
    4. SendWebhookEvent()
                   │
                   ├─ Obtiene config (cache)
                   ├─ Verifica evento permitido
                   ├─ Construye payload
                   │
                   ▼
    5. axios.post() → Envía a cada webhook
                   │
                   ├─ Webhook 1: https://n8n.example.com/webhook/abc
                   ├─ Webhook 2: https://make.example.com/webhook/xyz
                   └─ Webhook 3: https://webhook.site/unique-id
                   │
                   ▼
    6. Plataformas externas → Procesan webhook
                   │
                   └─ Automaciones, integraciones, notificaciones, etc.


                         CONFIGURACIÓN DE WEBHOOKS

┌─────────────────────────────────────────────────────────────────────────────┐
│ Base de datos (tabla Whatsapps)                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  webhookEnabled: boolean (global on/off)                                    │
│  webhookUrls: JSON                                                          │
│    [                                                                        │
│      {                                                                      │
│        "id": "webhook-1",                                                   │
│        "name": "n8n Production",                                            │
│        "url": "https://n8n.example.com/webhook/abc",                        │
│        "enabled": true,                                                     │
│        "events": [                                                          │
│          "message_received",                                                │
│          "message_sent",                                                    │
│          "ticket_created"                                                   │
│        ]                                                                    │
│      },                                                                     │
│      {                                                                      │
│        "id": "webhook-2",                                                   │
│        "name": "Make Integration",                                          │
│        "url": "https://make.example.com/webhook/xyz",                       │
│        "enabled": true,                                                     │
│        "events": []  ← vacío = todos los eventos                            │
│      }                                                                      │
│    ]                                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


                      EJEMPLO DE PAYLOAD ENVIADO

┌─────────────────────────────────────────────────────────────────────────────┐
│ Headers                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Content-Type: application/json                                             │
│  X-Webhook-Event: message_received                                          │
│  X-Webhook-Name: n8n Production                                             │
│  X-Connection-Id: 1                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ Body (JSON)                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  {                                                                          │
│    "event": "message_received",                                             │
│    "timestamp": "2025-12-09T10:30:00.000Z",                                 │
│    "connectionId": 1,                                                       │
│    "connectionName": "WhatsApp Principal",                                  │
│    "connectionNumber": "5491112345678",                                     │
│    "data": {                                                                │
│      "messageId": "3EB0123456789ABCDEF",                                    │
│      "from": "5491198765432@c.us",                                          │
│      "fromName": "Juan Pérez",                                              │
│      "body": "Hola, necesito ayuda",                                        │
│      "type": "chat",                                                        │
│      "ticketId": 42,                                                        │
│      "contactId": 15,                                                       │
│      "contactName": "Juan Pérez",                                           │
│      "isGroup": false,                                                      │
│      "timestamp": 1702117800,                                               │
│      "media": null                                                          │
│    }                                                                        │
│  }                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘


                        CACHE Y OPTIMIZACIÓN

┌─────────────────────────────────────────────────────────────────────────────┐
│ Sistema de Cache                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  • TTL: 60 segundos                                                         │
│  • Almacena: webhooks + globalEnabled por whatsappId                        │
│  • Invalidación: manual al actualizar configuración                         │
│  • Beneficio: evita queries a BD en cada evento                             │
│                                                                             │
│  Map<whatsappId, {                                                          │
│    webhooks: WebhookConfig[],                                               │
│    globalEnabled: boolean,                                                  │
│    expiresAt: timestamp                                                     │
│  }>                                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


                      MONITOREO Y DEBUGGING

┌─────────────────────────────────────────────────────────────────────────────┐
│ Logs                                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ Éxito:                                                                  │
│     "Webhook "n8n Production" sent successfully to                          │
│      https://n8n.example.com/webhook/abc                                    │
│      for event message_received: 200"                                       │
│                                                                             │
│  ❌ Error:                                                                  │
│     "Failed to send webhook "n8n Production" to                             │
│      https://n8n.example.com/webhook/abc                                    │
│      for event message_received: timeout of 10000ms exceeded"               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ Herramientas de Testing                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  • webhook.site - Webhook receiver en la nube                               │
│  • n8n local - Docker compose incluido                                      │
│  • test-webhook-events.js - Script de verificación                          │
│  • Postman/Insomnia - Testing de endpoints                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
