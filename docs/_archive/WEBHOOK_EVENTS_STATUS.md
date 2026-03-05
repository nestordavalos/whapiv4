# 📊 Estado de Eventos de Webhook

**Fecha de verificación:** 9 de diciembre de 2025  
**Estado general:** 4/9 eventos implementados (44%)

---

## ✅ Eventos Funcionando Correctamente

Los siguientes eventos **SÍ están implementados y funcionando**:

### 1. 🟢 message_received
- **Estado:** ✅ Implementado y funcionando
- **Ubicación:** `backend/src/services/WbotServices/wbotMessageListener.ts` (línea ~994)
- **Trigger:** Se envía cuando llega un mensaje al bot
- **Función:** `sendMessageReceivedWebhook()`
- **Payload incluye:**
  - Información del mensaje (id, body, tipo)
  - Información del contacto
  - Información del ticket
  - URL de media (si aplica)

### 2. 🟢 message_sent
- **Estado:** ✅ Implementado y funcionando
- **Ubicación:** `backend/src/services/WbotServices/wbotMessageListener.ts` (línea ~992)
- **Trigger:** Se envía cuando el bot envía un mensaje
- **Función:** `sendMessageSentWebhook()`
- **Payload incluye:**
  - Información del mensaje enviado
  - Información del destinatario
  - Información del ticket

### 3. 🟢 message_ack
- **Estado:** ✅ Implementado y funcionando
- **Ubicación:** `backend/src/services/WbotServices/wbotMessageListener.ts` (línea ~1259)
- **Trigger:** Se envía cuando cambia el estado de un mensaje (enviado, entregado, leído)
- **Función:** `sendMessageAckWebhook()`
- **Payload incluye:**
  - messageId
  - ack (código de estado)
  - ackName (ERROR, PENDING, SERVER, DEVICE, READ)
  - ticketId
  - body del mensaje

### 4. 🟢 connection_update
- **Estado:** ✅ Implementado y funcionando
- **Ubicación:** `backend/src/services/WbotServices/wbotMonitor.ts` (líneas ~28 y ~48)
- **Trigger:** Se envía cuando cambia el estado de conexión de WhatsApp
- **Función:** `sendConnectionUpdateWebhook()`
- **Eventos capturados:**
  - Cambio de estado de conexión
  - Desconexión
- **Payload incluye:**
  - status (estado de conexión)
  - reason (razón de desconexión)
  - sessionName
  - timestamp

---

## ⚠️ Eventos Pendientes de Implementación

Los siguientes eventos **están definidos pero NO implementados**:

### 5. 🟡 ticket_created
- **Estado:** ⚠️ Definido pero no implementado
- **Función disponible:** `sendTicketCreatedWebhook()` ✅
- **Ubicación requerida:** `backend/src/services/TicketServices/FindOrCreateTicketService.ts`
- **Línea sugerida:** ~108 (después de crear el ticket)
- **Implementación requerida:**
```typescript
// Después de: ticket = await Ticket.create({...})
if (whatsapp) {
  await sendTicketCreatedWebhook(whatsappId, {
    ticketId: ticket.id,
    contactId: ticket.contactId,
    status: ticket.status,
    isGroup: ticket.isGroup,
    createdAt: ticket.createdAt
  });
}
```

### 6. 🟡 ticket_updated
- **Estado:** ⚠️ Definido pero no implementado
- **Función disponible:** `sendTicketUpdatedWebhook()` ✅
- **Ubicación requerida:** `backend/src/services/TicketServices/UpdateTicketService.ts`
- **Línea sugerida:** ~195 (después de reload del ticket)
- **Implementación requerida:**
```typescript
// Después del reload del ticket
if (ticket.whatsappId) {
  await sendTicketUpdatedWebhook(ticket.whatsappId, {
    ticketId: ticket.id,
    oldStatus,
    newStatus: ticket.status,
    oldUserId,
    newUserId: ticket.userId,
    queueId: ticket.queueId,
    updatedAt: ticket.updatedAt
  });
}
```

### 7. 🟡 ticket_closed
- **Estado:** ⚠️ Definido pero no implementado
- **Función disponible:** `sendTicketClosedWebhook()` ✅
- **Ubicación requerida:** `backend/src/services/TicketServices/UpdateTicketService.ts`
- **Línea sugerida:** ~100 (cuando status === "closed")
- **Implementación requerida:**
```typescript
// Cuando se cierra un ticket
if (status === "closed" && oldStatus !== "closed") {
  await sendTicketClosedWebhook(ticket.whatsappId, {
    ticketId: ticket.id,
    contactId: ticket.contactId,
    userId: ticket.userId,
    closedAt: moment().toDate(),
    duration: moment().diff(ticket.createdAt, 'seconds')
  });
}
```

### 8. 🟡 contact_created
- **Estado:** ⚠️ Definido pero no implementado
- **Función disponible:** `sendContactCreatedWebhook()` ✅
- **Ubicación requerida:** `backend/src/services/ContactServices/CreateOrUpdateContactService.ts`
- **Línea sugerida:** ~47 (después de crear el contacto)
- **Implementación requerida:**
```typescript
// Después de: contact = await Contact.create({...})
// Necesitamos el whatsappId como parámetro adicional
if (whatsappId) {
  await sendContactCreatedWebhook(whatsappId, {
    contactId: contact.id,
    name: contact.name,
    number: contact.number,
    isGroup: contact.isGroup,
    createdAt: contact.createdAt
  });
}
```

### 9. 🟡 contact_updated
- **Estado:** ⚠️ Definido pero no implementado
- **Función disponible:** `sendContactUpdatedWebhook()` ✅
- **Ubicación requerida:** `backend/src/services/ContactServices/CreateOrUpdateContactService.ts`
- **Línea sugerida:** ~35 (después de actualizar el contacto)
- **Implementación requerida:**
```typescript
// Después de: contact.update({ profilePicUrl })
if (whatsappId) {
  await sendContactUpdatedWebhook(whatsappId, {
    contactId: contact.id,
    name: contact.name,
    number: contact.number,
    profilePicUrl: contact.profilePicUrl,
    updatedAt: new Date()
  });
}
```

---

## 🏗️ Arquitectura del Sistema de Webhooks

### Componentes Principales

#### 1. Servicio Principal
**Archivo:** `backend/src/services/WebhookService/SendWebhookEvent.ts`

**Características:**
- ✅ Cache de configuración (TTL: 1 minuto)
- ✅ Soporte para múltiples webhooks por conexión
- ✅ Filtrado de eventos por webhook
- ✅ Timeout de 10 segundos
- ✅ Headers HTTP personalizados
- ✅ Manejo de errores con Sentry

**Funciones exportadas:**
```typescript
- sendMessageReceivedWebhook()    ✅ Implementado
- sendMessageSentWebhook()        ✅ Implementado  
- sendMessageAckWebhook()         ✅ Implementado
- sendConnectionUpdateWebhook()   ✅ Implementado
- sendTicketCreatedWebhook()      ⚠️ No implementado
- sendTicketUpdatedWebhook()      ⚠️ No implementado
- sendTicketClosedWebhook()       ⚠️ No implementado
- sendContactCreatedWebhook()     ⚠️ No implementado
- sendContactUpdatedWebhook()     ⚠️ No implementado
```

#### 2. Estructura del Payload

```typescript
interface WebhookPayload {
  event: WebhookEventType;           // Tipo de evento
  timestamp: string;                 // ISO 8601
  connectionId: number;              // ID de la conexión WhatsApp
  connectionName: string;            // Nombre de la conexión
  connectionNumber?: string;         // Número de WhatsApp
  data: Record<string, any>;         // Datos específicos del evento
}
```

#### 3. Headers HTTP

Cada webhook incluye los siguientes headers:
```
Content-Type: application/json
X-Webhook-Event: <tipo_de_evento>
X-Webhook-Name: <nombre_del_webhook>
X-Connection-Id: <id_de_conexion>
```

### Configuración de Webhooks

Los webhooks se configuran por conexión de WhatsApp:

```typescript
interface WebhookConfig {
  id: string;                        // ID único del webhook
  name: string;                      // Nombre descriptivo
  url: string;                       // URL de destino
  enabled: boolean;                  // Estado activo/inactivo
  events: WebhookEventType[];        // Eventos a enviar
}
```

**Almacenamiento:** 
- Campo `webhookUrls` en la tabla `Whatsapps` (JSON)
- Campo `webhookEnabled` para habilitar/deshabilitar globalmente

---

## 📋 Lista de Verificación para Implementación

### Para Eventos de Tickets:

- [ ] Importar funciones de webhook en servicios de tickets
- [ ] Agregar `sendTicketCreatedWebhook()` en `FindOrCreateTicketService.ts`
- [ ] Agregar `sendTicketUpdatedWebhook()` en `UpdateTicketService.ts`
- [ ] Agregar `sendTicketClosedWebhook()` en `UpdateTicketService.ts` (cuando status === "closed")
- [ ] Probar creación de tickets
- [ ] Probar actualización de tickets
- [ ] Probar cierre de tickets

### Para Eventos de Contactos:

- [ ] Importar funciones de webhook en servicios de contactos
- [ ] Modificar `CreateOrUpdateContactService.ts` para recibir `whatsappId`
- [ ] Agregar `sendContactCreatedWebhook()` al crear nuevo contacto
- [ ] Agregar `sendContactUpdatedWebhook()` al actualizar contacto
- [ ] Actualizar llamadas al servicio para incluir `whatsappId`
- [ ] Probar creación de contactos
- [ ] Probar actualización de contactos

---

## 🧪 Pruebas Recomendadas

### 1. Prueba de Mensajes (✅ Funcionando)
```bash
# Enviar mensaje de prueba y verificar webhooks:
# - message_received
# - message_sent  
# - message_ack (cuando cambie el estado)
```

### 2. Prueba de Conexión (✅ Funcionando)
```bash
# Desconectar/reconectar WhatsApp y verificar:
# - connection_update
```

### 3. Prueba de Tickets (⚠️ Pendiente)
```bash
# Crear, actualizar y cerrar ticket:
# - ticket_created
# - ticket_updated
# - ticket_closed
```

### 4. Prueba de Contactos (⚠️ Pendiente)
```bash
# Crear y actualizar contacto:
# - contact_created
# - contact_updated
```

---

## 📝 Ejemplos de Payloads

### Message Received
```json
{
  "event": "message_received",
  "timestamp": "2025-12-09T10:30:00.000Z",
  "connectionId": 1,
  "connectionName": "WhatsApp Principal",
  "connectionNumber": "5491112345678",
  "data": {
    "messageId": "3EB0123456789ABCDEF",
    "from": "5491198765432@c.us",
    "body": "Hola, necesito ayuda",
    "type": "chat",
    "ticketId": 42,
    "contactId": 15,
    "contactName": "Juan Pérez",
    "media": null
  }
}
```

### Connection Update
```json
{
  "event": "connection_update",
  "timestamp": "2025-12-09T10:30:00.000Z",
  "connectionId": 1,
  "connectionName": "WhatsApp Principal",
  "connectionNumber": "5491112345678",
  "data": {
    "status": "CONNECTED",
    "sessionName": "WhatsApp Principal",
    "timestamp": "2025-12-09T10:30:00.000Z"
  }
}
```

---

## 🔒 Sistema de Filtrado y Validación

### ✅ Validaciones Implementadas

El sistema incluye **3 niveles de validación** para garantizar que los webhooks se envíen solo cuando corresponde:

#### Nivel 1: Validación Global (webhookEnabled)
```typescript
if (!config.globalEnabled) {
  return false; // No enviar ningún webhook
}
```
- **Campo:** `Whatsapps.webhookEnabled` (boolean)
- **Función:** Habilitar/deshabilitar todo el sistema de webhooks para esa conexión
- **Configuración:** Desde el frontend, toggle principal en WhatsAppModal

#### Nivel 2: Validación Individual por Webhook
```typescript
const isEnabled = webhook.enabled && webhook.url;
```
- **Campo:** `webhook.enabled` (boolean) dentro del JSON
- **Función:** Activar/desactivar webhooks específicos sin afectar otros
- **Configuración:** Toggle individual por cada webhook en el frontend

#### Nivel 3: Filtrado por Eventos
```typescript
const eventAllowed = 
  !webhook.events || 
  webhook.events.length === 0 || 
  webhook.events.includes(event);
```
- **Campo:** `webhook.events` (array de strings)
- **Función:** Permitir solo eventos específicos por webhook
- **Lógica especial:** Si `events[]` está vacío, se envían **TODOS** los eventos

### 📊 Tabla de Decisión

| Global Enable | Webhook Individual | Evento en lista? | ¿Se envía? |
|--------------|-------------------|------------------|------------|
| ❌ false     | ✅ true          | ✅ SÍ           | ❌ NO (global off) |
| ✅ true      | ❌ false         | ✅ SÍ           | ❌ NO (webhook off) |
| ✅ true      | ✅ true          | ❌ NO           | ❌ NO (evento filtrado) |
| ✅ true      | ✅ true          | ✅ SÍ           | ✅ **SÍ - ENVÍA** |
| ✅ true      | ✅ true          | [] (vacío)      | ✅ **SÍ - ENVÍA (todos)** |

### 🎛️ Configuración en Frontend

El usuario puede configurar desde la interfaz:

1. **Toggle Global** (`webhookEnabled`)
   - Activa/desactiva todo el sistema de webhooks
   - Ubicación: WhatsAppModal → sección Webhooks

2. **Toggle Individual** (por webhook)
   - Activa/desactiva webhooks específicos
   - Útil para pausar temporalmente sin borrar configuración

3. **Selección de Eventos** (chips/checkboxes)
   - Seleccionar qué eventos enviar a cada webhook
   - Dejar vacío = enviar todos los eventos disponibles

### 🔐 Seguridad y Performance

- **Cache:** Configuración cacheada por 60 segundos (evita queries repetidas)
- **Async:** Webhooks se envían de forma asíncrona (no bloquean operaciones)
- **Timeout:** 10 segundos por webhook (previene colgadas)
- **Error Handling:** Errores capturados con Sentry (no afectan flujo principal)

---

## 🎯 Conclusión

### Estado Actual
- **44% de eventos implementados** (4 de 9)
- **Sistema base funcionando correctamente**
- **Infraestructura completa y robusta**
- **✅ Sistema de filtrado completo y validado**

### Eventos Críticos Funcionando
✅ Mensajes entrantes y salientes  
✅ Estado de mensajes (ACK)  
✅ Estado de conexión  
✅ **Filtrado por evento funcionando**  
✅ **Activación/desactivación por webhook funcionando**

### Próximos Pasos
1. Implementar eventos de tickets (alta prioridad)
2. Implementar eventos de contactos (media prioridad)
3. Agregar tests automatizados
4. Documentar integración con n8n/Make/Zapier

### Recomendación
Los eventos actuales cubren los casos de uso más comunes (mensajería y conectividad). La implementación de eventos de tickets y contactos es recomendada para tener un sistema completo de notificaciones, pero no es crítica para el funcionamiento básico del sistema.

**El sistema de filtrado y validación está 100% funcional**, garantizando que los webhooks solo se envíen cuando el usuario lo configura explícitamente.

---

## 🧪 Scripts de Verificación

- **`test-webhook-events.js`** - Verifica implementación de eventos
- **`verify-webhook-filters.js`** - Verifica sistema de filtrado y validación

Ejecutar: `node verify-webhook-filters.js`

---

**Última actualización:** 9 de diciembre de 2025
