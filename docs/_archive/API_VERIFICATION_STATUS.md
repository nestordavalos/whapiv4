# 📋 Resumen de Verificación de APIs - WhatsApp v4

## Estado Actual de las APIs

### ✅ APIs Implementadas

#### 1. **API Original (`/api`)**

| Método | Endpoint | Descripción | Controller |
|--------|----------|-------------|------------|
| POST | `/api/send` | Enviar mensaje con/sin multimedia | ApiController.index |
| GET | `/api/queue/list` | Listar colas disponibles | ApiController.list |

**Autenticación:** Bearer Token (middleware: `isAuthApi`)

---

#### 2. **API v1 - TICKETS (`/api/v1/tickets`)**

| Método | Endpoint | Descripción | Controller |
|--------|----------|-------------|------------|
| GET | `/api/v1/tickets` | Listar tickets con filtros | WebhookApiController.listTickets |
| GET | `/api/v1/tickets/:ticketId` | Obtener ticket específico | WebhookApiController.showTicket |
| POST | `/api/v1/tickets` | Crear nuevo ticket | WebhookApiController.createTicket |
| PUT | `/api/v1/tickets/:ticketId` | Actualizar ticket | WebhookApiController.updateTicket |

**Parámetros de Query para listar:**
- `status`: `open`, `pending`, `closed`
- `whatsappId`: ID de conexión
- `queueId`: ID de cola
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 20)

---

#### 3. **API v1 - MESSAGES (`/api/v1/tickets/:ticketId/messages`)**

| Método | Endpoint | Descripción | Controller |
|--------|----------|-------------|------------|
| GET | `/api/v1/tickets/:ticketId/messages` | Listar mensajes de un ticket | WebhookApiController.listMessages |
| POST | `/api/v1/tickets/:ticketId/messages` | Enviar mensaje de texto | WebhookApiController.sendMessage |
| POST | `/api/v1/tickets/:ticketId/messages/media` | Enviar mensaje con multimedia | WebhookApiController.sendMediaMessage |
| POST | `/api/v1/tickets/:ticketId/messages/media-url` | Enviar multimedia desde URL | WebhookApiController.sendMediaFromUrl |
| POST | `/api/v1/messages/:messageId/reply` | Responder a un mensaje | WebhookApiController.replyToMessage |

---

#### 4. **API v1 - DIRECT SEND (`/api/v1/send`)**

| Método | Endpoint | Descripción | Controller |
|--------|----------|-------------|------------|
| POST | `/api/v1/send` | Enviar mensaje directo a número (crea ticket si no existe) | WebhookApiController.sendDirectMessage |

---

#### 5. **API v1 - CONTACTS (`/api/v1/contacts`)**

| Método | Endpoint | Descripción | Controller |
|--------|----------|-------------|------------|
| GET | `/api/v1/contacts/:number` | Obtener información de contacto | WebhookApiController.getContact |
| POST | `/api/v1/contacts` | Crear o actualizar contacto | WebhookApiController.createOrUpdateContact |
| POST | `/api/v1/contacts/validate` | Validar si número existe en WhatsApp | WebhookApiController.validateContact |

---

#### 6. **API v1 - CONNECTIONS (`/api/v1/connections`)**

| Método | Endpoint | Descripción | Controller |
|--------|----------|-------------|------------|
| GET | `/api/v1/connections` | Listar conexiones de WhatsApp | WebhookApiController.listConnections |
| GET | `/api/v1/connections/:connectionId` | Obtener estado de conexión | WebhookApiController.getConnectionStatus |

---

## 🔒 Autenticación

Todas las APIs requieren autenticación mediante Bearer Token:

```bash
Authorization: Bearer YOUR_API_TOKEN
```

El token se configura en: **Configuraciones > API Token** del panel de administración.

---

## 📝 Verificaciones Necesarias

### Checklist de Pruebas

- [ ] **Autenticación**
  - [ ] Rechaza requests sin token
  - [ ] Rechaza requests con token inválido
  - [ ] Acepta requests con token válido

- [ ] **API Original (`/api`)**
  - [ ] `/api/send` - Envío de mensajes de texto
  - [ ] `/api/send` - Envío de mensajes con multimedia
  - [ ] `/api/queue/list` - Listado de colas

- [ ] **API v1 - Tickets**
  - [ ] `GET /api/v1/tickets` - Listar todos
  - [ ] `GET /api/v1/tickets?status=open` - Filtro por estado
  - [ ] `GET /api/v1/tickets/:id` - Obtener específico
  - [ ] `POST /api/v1/tickets` - Crear nuevo
  - [ ] `PUT /api/v1/tickets/:id` - Actualizar

- [ ] **API v1 - Messages**
  - [ ] `GET /api/v1/tickets/:id/messages` - Listar mensajes
  - [ ] `POST /api/v1/tickets/:id/messages` - Enviar texto
  - [ ] `POST /api/v1/tickets/:id/messages/media` - Enviar multimedia
  - [ ] `POST /api/v1/tickets/:id/messages/media-url` - Multimedia desde URL
  - [ ] `POST /api/v1/messages/:id/reply` - Responder mensaje

- [ ] **API v1 - Direct Send**
  - [ ] `POST /api/v1/send` - Envío directo a número

- [ ] **API v1 - Contacts**
  - [ ] `GET /api/v1/contacts/:number` - Obtener contacto
  - [ ] `POST /api/v1/contacts` - Crear/actualizar
  - [ ] `POST /api/v1/contacts/validate` - Validar número

- [ ] **API v1 - Connections**
  - [ ] `GET /api/v1/connections` - Listar conexiones
  - [ ] `GET /api/v1/connections/:id` - Estado de conexión

---

## 🔍 Estructura de Respuestas Esperadas

### Tickets List Response
```json
{
  "tickets": [...],
  "count": 50,
  "hasMore": true,
  "page": 1,
  "limit": 20
}
```

### Messages List Response
```json
{
  "messages": [...],
  "ticketId": 123,
  "count": 100,
  "hasMore": true,
  "page": 1
}
```

### Send Message Response
```json
{
  "message": "Message sent successfully",
  "data": {
    "messageId": "...",
    "body": "...",
    "ticketId": 123,
    "timestamp": 1234567890,
    "fromMe": true,
    "mediaUrl": null
  }
}
```

---

## 🐛 Problemas Potenciales a Verificar

1. **Autenticación**
   - ¿El middleware `isAuthApi` valida correctamente el token?
   - ¿Se rechazan requests sin token o con token inválido?

2. **Validaciones**
   - ¿Se validan los campos requeridos con Yup?
   - ¿Se retornan mensajes de error claros?

3. **Relaciones de BD**
   - ¿Los includes de Sequelize están correctos?
   - ¿Se cargan correctamente Contact, Whatsapp, Queue, etc?

4. **Manejo de Errores**
   - ¿AppError se maneja correctamente?
   - ¿Los códigos HTTP son apropiados?

5. **Funcionalidad de WhatsApp**
   - ¿Los servicios de WbotServices funcionan?
   - ¿Se envían mensajes correctamente?
   - ¿Se manejan multimedia correctamente?

6. **Paginación**
   - ¿La paginación funciona en todos los endpoints?
   - ¿Los valores de page/limit se validan?

---

## 🚀 Cómo Ejecutar las Pruebas

### Opción 1: Script Bash Completo
```bash
# Editar el token en test-apis.sh línea 7
nano test-apis.sh

# Dar permisos de ejecución
chmod +x test-apis.sh

# Ejecutar
./test-apis.sh
```

### Opción 2: Pruebas Manuales con curl

```bash
# Configurar variables
export BASE_URL="http://localhost:8080"
export API_TOKEN="YOUR_TOKEN_HERE"

# Test básico
curl -X GET "$BASE_URL/api/v1/tickets?limit=5" \
  -H "Authorization: Bearer $API_TOKEN"

# Test de autenticación
curl -X GET "$BASE_URL/api/v1/tickets" \
  -H "Authorization: Bearer INVALID_TOKEN"
```

### Opción 3: Usando Postman/Insomnia
1. Importar colección desde `docs/API_DOCUMENTATION.md`
2. Configurar variable de entorno `API_TOKEN`
3. Ejecutar tests de la colección

---

## 📊 Estado del Backend

**Puerto:** 8080  
**URL Base:** http://localhost:8080  
**Documentación Swagger:** http://localhost:8080/api-docs  

**Servicios Requeridos:**
- ✅ MySQL (puerto 3306)
- ✅ Node.js (v14+)
- ⚠️ WhatsApp Web conectado

---

## 📌 Próximos Pasos

1. Ejecutar el script de verificación (`test-apis.sh`)
2. Revisar los resultados y anotar los endpoints con problemas
3. Verificar logs del backend para errores específicos
4. Probar funcionalidad de envío de mensajes con conexión activa
5. Validar estructura de respuestas
6. Documentar cualquier comportamiento inesperado
