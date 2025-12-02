# 📡 API Documentation - WhatsApp Integration

## Introducción

Esta documentación describe todas las APIs disponibles para interactuar con el sistema de WhatsApp. Incluye la API original (`/api`) y la nueva API v1 (`/api/v1`) con funcionalidades extendidas para webhooks.

---

## Autenticación

Todas las APIs requieren autenticación mediante un token Bearer en el header.

```
Authorization: Bearer <API_TOKEN>
```

El token API se configura en **Configuraciones > API Token** del panel de administración.

---

# API Original (`/api`)

## Enviar Mensaje

Envía un mensaje de texto o multimedia a un número de WhatsApp.

```
POST /api/send
```

### Headers
| Header | Valor | Requerido |
|--------|-------|-----------|
| Authorization | Bearer {token} | ✅ |
| Content-Type | multipart/form-data | ✅ (si envía archivos) |

### Body (form-data o JSON)
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| number | string | Número de teléfono (solo dígitos, con código de país) | ✅ |
| body | string | Texto del mensaje | ❌ (requerido si no hay media) |
| whatsappId | number | ID de la conexión de WhatsApp a usar | ❌ |
| queueId | number | ID de la cola a asignar | ❌ |
| userId | number | ID del usuario a asignar | ❌ |
| tagsId | number | ID del tag a asignar | ❌ |
| medias | file[] | Archivos multimedia a enviar | ❌ |
| quotedMsg | object/string | Mensaje a citar (reply) | ❌ |

### Ejemplo cURL - Mensaje de texto
```bash
curl -X POST "http://localhost:8080/api/send" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "595991234567",
    "body": "Hola, este es un mensaje de prueba"
  }'
```

### Ejemplo cURL - Con multimedia
```bash
curl -X POST "http://localhost:8080/api/send" \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "number=595991234567" \
  -F "body=Mira esta imagen" \
  -F "medias=@/path/to/image.jpg"
```

---

## Listar Colas

Obtiene la lista de colas disponibles.

```
GET /api/queue/list
```

### Respuesta
```json
[
  {
    "id": 1,
    "name": "Soporte",
    "color": "#4CAF50"
  },
  {
    "id": 2,
    "name": "Ventas",
    "color": "#2196F3"
  }
]
```

---

# API v1 (`/api/v1`)

API extendida con más funcionalidades para integración con webhooks.

---

## 🎫 TICKETS

### Listar Tickets

Obtiene una lista de tickets con filtros opcionales.

```
GET /api/v1/tickets
```

### Query Parameters
| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| status | string | Filtrar por estado: `open`, `pending`, `closed` | ❌ |
| whatsappId | number | Filtrar por conexión de WhatsApp | ❌ |
| queueId | number | Filtrar por cola | ❌ |
| page | number | Número de página (default: 1) | ❌ |
| limit | number | Registros por página (default: 20) | ❌ |

### Ejemplo
```bash
curl -X GET "http://localhost:8080/api/v1/tickets?status=open&page=1&limit=10" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Respuesta
```json
{
  "tickets": [
    {
      "id": 1,
      "status": "open",
      "lastMessage": "Hola, necesito ayuda",
      "contact": {
        "id": 1,
        "name": "Juan Pérez",
        "number": "595991234567",
        "profilePicUrl": "https://..."
      },
      "whatsapp": {
        "id": 1,
        "name": "WhatsApp Principal",
        "number": "595981234567"
      }
    }
  ],
  "count": 50,
  "hasMore": true,
  "page": 1,
  "limit": 10
}
```

---

### Obtener Ticket

Obtiene los detalles de un ticket específico.

```
GET /api/v1/tickets/:ticketId
```

### Ejemplo
```bash
curl -X GET "http://localhost:8080/api/v1/tickets/123" \
  -H "Authorization: Bearer TU_TOKEN"
```

---

### Crear Ticket

Crea un nuevo ticket para un contacto.

```
POST /api/v1/tickets
```

### Body
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| number | string | Número de teléfono | ✅ |
| whatsappId | number | ID de la conexión de WhatsApp | ❌ |
| queueId | number | ID de la cola a asignar | ❌ |
| userId | number | ID del usuario a asignar | ❌ |
| tagsId | number | ID del tag a asignar | ❌ |

### Ejemplo
```bash
curl -X POST "http://localhost:8080/api/v1/tickets" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "595991234567",
    "whatsappId": 2,
    "queueId": 1
  }'
```

### Respuesta
```json
{
  "message": "Ticket created successfully",
  "ticket": {
    "id": 124,
    "status": "open",
    "queueId": 1,
    "whatsappId": 2,
    "contact": {
      "id": 45,
      "name": "595991234567",
      "number": "595991234567"
    }
  }
}
```

---

### Actualizar Ticket

Actualiza el estado, usuario o cola de un ticket.

```
PUT /api/v1/tickets/:ticketId
```

### Body
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| status | string | Nuevo estado: `open`, `pending`, `closed` | ❌ |
| userId | number | ID del usuario a asignar | ❌ |
| queueId | number | ID de la cola a asignar | ❌ |

### Ejemplo
```bash
curl -X PUT "http://localhost:8080/api/v1/tickets/123" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }'
```

---

## 💬 MENSAJES

### Listar Mensajes de un Ticket

Obtiene los mensajes de un ticket con paginación.

```
GET /api/v1/tickets/:ticketId/messages
```

### Query Parameters
| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| page | number | Número de página (default: 1) | ❌ |

### Ejemplo
```bash
curl -X GET "http://localhost:8080/api/v1/tickets/123/messages?page=1" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Respuesta
```json
{
  "messages": [
    {
      "id": "3EB0ABC123",
      "body": "Hola, necesito ayuda",
      "fromMe": false,
      "mediaUrl": null,
      "mediaType": "chat",
      "createdAt": "2024-12-01T10:30:00Z",
      "contact": {
        "id": 1,
        "name": "Juan Pérez"
      }
    }
  ],
  "ticketId": 123,
  "count": 45,
  "hasMore": true,
  "page": 1
}
```

---

### Enviar Mensaje de Texto

Envía un mensaje de texto a un ticket existente.

```
POST /api/v1/tickets/:ticketId/messages
```

### Body
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| body | string | Texto del mensaje | ✅ |
| quotedMsgId | string | ID del mensaje a citar | ❌ |

### Ejemplo
```bash
curl -X POST "http://localhost:8080/api/v1/tickets/123/messages" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Gracias por contactarnos"
  }'
```

### Respuesta
```json
{
  "message": "Message sent successfully",
  "data": {
    "messageId": "3EB0DEF456",
    "body": "Gracias por contactarnos",
    "ticketId": 123,
    "timestamp": 1701432600,
    "fromMe": true,
    "mediaUrl": null
  }
}
```

---

### Enviar Multimedia (Archivo)

Envía archivos multimedia a un ticket existente.

```
POST /api/v1/tickets/:ticketId/messages/media
```

### Body (form-data)
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| medias | file[] | Archivos a enviar | ✅ |
| body | string | Texto/caption del mensaje | ❌ |
| quotedMsgId | string | ID del mensaje a citar | ❌ |

### Ejemplo
```bash
curl -X POST "http://localhost:8080/api/v1/tickets/123/messages/media" \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "medias=@/path/to/image.jpg" \
  -F "body=Aquí está la imagen que solicitaste"
```

### Respuesta
```json
{
  "message": "Media message(s) sent successfully",
  "data": [
    {
      "messageId": "3EB0GHI789",
      "body": "Aquí está la imagen que solicitaste",
      "ticketId": 123,
      "timestamp": 1701432600,
      "fromMe": true,
      "hasMedia": true,
      "mediaUrl": "http://localhost:8080/public/1701432600000.jpg",
      "mediaType": "image",
      "filename": "image.jpg"
    }
  ]
}
```

---

### Enviar Multimedia desde URL

Envía multimedia descargándola desde una URL externa.

```
POST /api/v1/tickets/:ticketId/messages/media-url
```

### Body
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| mediaUrl | string | URL del archivo multimedia | ✅ |
| body | string | Texto/caption del mensaje | ❌ |
| quotedMsgId | string | ID del mensaje a citar | ❌ |
| filename | string | Nombre del archivo | ❌ |

### Ejemplo
```bash
curl -X POST "http://localhost:8080/api/v1/tickets/123/messages/media-url" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mediaUrl": "https://example.com/image.jpg",
    "body": "Esta imagen es de internet",
    "filename": "imagen_descargada.jpg"
  }'
```

### Respuesta
```json
{
  "message": "Media message sent successfully",
  "data": {
    "messageId": "3EB0JKL012",
    "body": "Esta imagen es de internet",
    "ticketId": 123,
    "timestamp": 1701432600,
    "fromMe": true,
    "hasMedia": true,
    "mediaUrl": "http://localhost:8080/public/1701432600000.jpg",
    "mediaType": "image",
    "sourceUrl": "https://example.com/image.jpg",
    "filename": "imagen_descargada.jpg"
  }
}
```

---

### Responder a un Mensaje (Reply)

Responde a un mensaje específico citándolo.

```
POST /api/v1/messages/:messageId/reply
```

### Body (JSON o form-data para multimedia)
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| body | string | Texto del mensaje | ❌ (requerido si no hay media) |
| medias | file[] | Archivos multimedia | ❌ |
| mediaUrl | string | URL de multimedia | ❌ |
| filename | string | Nombre del archivo (para URL) | ❌ |

### Ejemplo - Respuesta de texto
```bash
curl -X POST "http://localhost:8080/api/v1/messages/3EB0ABC123/reply" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Esta es mi respuesta a tu mensaje"
  }'
```

### Ejemplo - Respuesta con multimedia desde URL
```bash
curl -X POST "http://localhost:8080/api/v1/messages/3EB0ABC123/reply" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Aquí está el documento",
    "mediaUrl": "https://example.com/document.pdf",
    "filename": "documento.pdf"
  }'
```

### Ejemplo - Respuesta con archivo
```bash
curl -X POST "http://localhost:8080/api/v1/messages/3EB0ABC123/reply" \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "body=Aquí está la imagen" \
  -F "medias=@/path/to/image.jpg"
```

---

## 📤 ENVÍO DIRECTO

### Enviar Mensaje Directo a Número

Envía un mensaje a un número creando un ticket si no existe.

```
POST /api/v1/send
```

### Body (JSON o form-data)
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| number | string | Número de teléfono (solo dígitos) | ✅ |
| body | string | Texto del mensaje | ❌ (requerido si no hay media) |
| whatsappId | number | ID de la conexión de WhatsApp | ❌ |
| queueId | number | ID de la cola a asignar | ❌ |
| userId | number | ID del usuario a asignar | ❌ |
| tagsId | number | ID del tag a asignar | ❌ |
| quotedMsgId | string | ID del mensaje a citar | ❌ |
| closeTicket | boolean | Cerrar ticket después de enviar | ❌ |
| medias | file[] | Archivos multimedia | ❌ |
| mediaUrl | string | URL de multimedia | ❌ |
| filename | string | Nombre del archivo (para URL) | ❌ |

### Ejemplo - Mensaje de texto
```bash
curl -X POST "http://localhost:8080/api/v1/send" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "595991234567",
    "body": "Hola, te contactamos desde el sistema",
    "whatsappId": 2,
    "queueId": 1
  }'
```

### Ejemplo - Con multimedia desde URL
```bash
curl -X POST "http://localhost:8080/api/v1/send" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "595991234567",
    "body": "Te envío esta imagen",
    "mediaUrl": "https://example.com/promo.jpg",
    "whatsappId": 2,
    "closeTicket": true
  }'
```

### Ejemplo - Con archivo adjunto
```bash
curl -X POST "http://localhost:8080/api/v1/send" \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "number=595991234567" \
  -F "body=Aquí está el contrato" \
  -F "whatsappId=2" \
  -F "queueId=1" \
  -F "medias=@/path/to/contract.pdf"
```

### Respuesta
```json
{
  "message": "Message(s) sent successfully",
  "ticketId": 125,
  "contactId": 46,
  "data": [
    {
      "messageId": "3EB0MNO345",
      "body": "Hola, te contactamos desde el sistema",
      "ticketId": 125,
      "timestamp": 1701432600,
      "fromMe": true,
      "hasMedia": false,
      "mediaUrl": null
    }
  ]
}
```

---

## 👥 CONTACTOS

### Obtener Contacto

Obtiene información de un contacto por su número.

```
GET /api/v1/contacts/:number
```

### Ejemplo
```bash
curl -X GET "http://localhost:8080/api/v1/contacts/595991234567" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Respuesta
```json
{
  "id": 1,
  "name": "Juan Pérez",
  "number": "595991234567",
  "email": "juan@example.com",
  "profilePicUrl": "https://...",
  "isGroup": false,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-12-01T10:30:00Z"
}
```

---

### Validar Contacto

Verifica si un número está registrado en WhatsApp.

```
POST /api/v1/contacts/validate
```

### Body
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| number | string | Número a validar | ✅ |
| whatsappId | number | ID de conexión para validar | ❌ |

### Ejemplo
```bash
curl -X POST "http://localhost:8080/api/v1/contacts/validate" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "595991234567",
    "whatsappId": 2
  }'
```

### Respuesta (válido)
```json
{
  "valid": true,
  "number": "595991234567",
  "profilePicUrl": "https://..."
}
```

### Respuesta (no válido)
```json
{
  "valid": false,
  "number": "595991234567",
  "profilePicUrl": null
}
```

---

### Crear o Actualizar Contacto

Crea o actualiza un contacto en el sistema.

```
POST /api/v1/contacts
```

### Body
| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| number | string | Número de teléfono | ✅ |
| name | string | Nombre del contacto | ❌ |
| email | string | Email del contacto | ❌ |
| whatsappId | number | ID de conexión para validar | ❌ |

### Ejemplo
```bash
curl -X POST "http://localhost:8080/api/v1/contacts" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "595991234567",
    "name": "María García",
    "email": "maria@example.com"
  }'
```

---

## 📱 CONEXIONES

### Listar Conexiones

Obtiene todas las conexiones de WhatsApp.

```
GET /api/v1/connections
```

### Ejemplo
```bash
curl -X GET "http://localhost:8080/api/v1/connections" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Respuesta
```json
[
  {
    "id": 1,
    "name": "WhatsApp Principal",
    "number": "595981234567",
    "status": "CONNECTED",
    "isDefault": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-12-01T10:00:00Z"
  },
  {
    "id": 2,
    "name": "WhatsApp Ventas",
    "number": "595982345678",
    "status": "CONNECTED",
    "isDefault": false,
    "createdAt": "2024-06-01T00:00:00Z",
    "updatedAt": "2024-12-01T10:00:00Z"
  }
]
```

---

### Obtener Estado de Conexión

Obtiene el estado detallado de una conexión específica.

```
GET /api/v1/connections/:connectionId
```

### Ejemplo
```bash
curl -X GET "http://localhost:8080/api/v1/connections/1" \
  -H "Authorization: Bearer TU_TOKEN"
```

### Respuesta
```json
{
  "id": 1,
  "name": "WhatsApp Principal",
  "number": "595981234567",
  "status": "CONNECTED",
  "isDefault": true,
  "battery": "85",
  "plugged": true,
  "isConnected": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-12-01T10:00:00Z"
}
```

---

# 🔔 WEBHOOKS

## Configuración

Los webhooks se configuran por conexión de WhatsApp en **Conexiones > Editar > Webhook**.

### Campos de configuración:
- **Webhook URL**: URL donde se enviarán los eventos
- **Webhook Habilitado**: Activar/desactivar webhook
- **Eventos**: Seleccionar qué eventos enviar

## Eventos Disponibles

| Evento | Descripción |
|--------|-------------|
| message_received | Mensaje recibido del contacto |
| message_sent | Mensaje enviado desde el sistema |
| message_ack | Actualización de estado del mensaje (entregado, leído) |
| connection_update | Cambio de estado de la conexión |
| ticket_created | Nuevo ticket creado |
| ticket_updated | Ticket actualizado |
| ticket_closed | Ticket cerrado |
| contact_created | Nuevo contacto creado |
| contact_updated | Contacto actualizado |

## Estructura del Payload

Todos los eventos siguen esta estructura base:

```json
{
  "event": "message_received",
  "timestamp": "2024-12-01T10:30:00Z",
  "connectionId": 1,
  "connectionName": "WhatsApp Principal",
  "connectionNumber": "595981234567",
  "data": { ... }
}
```

## Ejemplos de Payloads

### message_received / message_sent

```json
{
  "event": "message_received",
  "timestamp": "2024-12-01T10:30:00Z",
  "connectionId": 1,
  "connectionName": "WhatsApp Principal",
  "connectionNumber": "595981234567",
  "data": {
    "messageId": "3EB0ABC123DEF456",
    "body": "Hola, necesito información",
    "fromMe": false,
    "mediaType": "chat",
    "hasMedia": false,
    "timestamp": 1701432600,
    "ticketId": 123,
    "contact": {
      "id": 45,
      "name": "Juan Pérez",
      "number": "595991234567"
    },
    "media": null
  }
}
```

### message_received (con multimedia)

```json
{
  "event": "message_received",
  "timestamp": "2024-12-01T10:30:00Z",
  "connectionId": 1,
  "connectionName": "WhatsApp Principal",
  "connectionNumber": "595981234567",
  "data": {
    "messageId": "3EB0ABC123DEF456",
    "body": "Te envío la foto",
    "fromMe": false,
    "mediaType": "image",
    "hasMedia": true,
    "timestamp": 1701432600,
    "ticketId": 123,
    "contact": {
      "id": 45,
      "name": "Juan Pérez",
      "number": "595991234567"
    },
    "media": {
      "url": "http://localhost:8080/public/1701432600000.jpg",
      "mimeType": "image",
      "type": "image"
    }
  }
}
```

### ticket_created

```json
{
  "event": "ticket_created",
  "timestamp": "2024-12-01T10:30:00Z",
  "connectionId": 1,
  "connectionName": "WhatsApp Principal",
  "data": {
    "ticketId": 123,
    "status": "pending",
    "contact": {
      "id": 45,
      "name": "Juan Pérez",
      "number": "595991234567"
    }
  }
}
```

### connection_update

```json
{
  "event": "connection_update",
  "timestamp": "2024-12-01T10:30:00Z",
  "connectionId": 1,
  "connectionName": "WhatsApp Principal",
  "data": {
    "status": "CONNECTED",
    "qrcode": null
  }
}
```

## Headers del Webhook

Los webhooks incluyen headers adicionales para identificación:

| Header | Descripción |
|--------|-------------|
| Content-Type | application/json |
| X-Webhook-Event | Nombre del evento |
| X-Connection-Id | ID de la conexión |

---

# 📋 Resumen de Endpoints

## API Original (`/api`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/send | Enviar mensaje |
| GET | /api/queue/list | Listar colas |

## API v1 (`/api/v1`)

### Tickets
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /tickets | Listar tickets |
| GET | /tickets/:ticketId | Obtener ticket |
| POST | /tickets | Crear ticket |
| PUT | /tickets/:ticketId | Actualizar ticket |

### Mensajes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /tickets/:ticketId/messages | Listar mensajes |
| POST | /tickets/:ticketId/messages | Enviar texto |
| POST | /tickets/:ticketId/messages/media | Enviar archivo |
| POST | /tickets/:ticketId/messages/media-url | Enviar desde URL |
| POST | /messages/:messageId/reply | Responder mensaje |

### Envío Directo
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /send | Enviar a número |

### Contactos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /contacts/:number | Obtener contacto |
| POST | /contacts | Crear/actualizar contacto |
| POST | /contacts/validate | Validar número |

### Conexiones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /connections | Listar conexiones |
| GET | /connections/:connectionId | Estado de conexión |

---

# ⚠️ Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Parámetros inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

## Ejemplo de Error
```json
{
  "error": "ERR_TICKET_NOT_FOUND",
  "message": "Ticket not found"
}
```

---

# 🔧 Ejemplos de Integración

## Node.js

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:8080/api/v1';
const TOKEN = 'tu_token_aqui';

// Enviar mensaje
async function sendMessage(number, body) {
  const response = await axios.post(`${API_URL}/send`, {
    number,
    body
  }, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}

// Enviar imagen desde URL
async function sendImage(number, imageUrl, caption) {
  const response = await axios.post(`${API_URL}/send`, {
    number,
    body: caption,
    mediaUrl: imageUrl
  }, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}
```

## Python

```python
import requests

API_URL = 'http://localhost:8080/api/v1'
TOKEN = 'tu_token_aqui'

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# Enviar mensaje
def send_message(number, body):
    response = requests.post(
        f'{API_URL}/send',
        json={'number': number, 'body': body},
        headers=headers
    )
    return response.json()

# Enviar imagen desde URL
def send_image(number, image_url, caption=''):
    response = requests.post(
        f'{API_URL}/send',
        json={
            'number': number,
            'body': caption,
            'mediaUrl': image_url
        },
        headers=headers
    )
    return response.json()
```

## PHP

```php
<?php
$apiUrl = 'http://localhost:8080/api/v1';
$token = 'tu_token_aqui';

function sendMessage($number, $body) {
    global $apiUrl, $token;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "$apiUrl/send");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $token",
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'number' => $number,
        'body' => $body
    ]));
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}
?>
```

---

*Documentación generada el 01/12/2024*
