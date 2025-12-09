# 🔧 Guía de Implementación: Eventos de Webhook Pendientes

Esta guía proporciona instrucciones paso a paso para implementar los eventos de webhook que actualmente están pendientes.

---

## 📦 1. Eventos de Tickets

### 1.1 ticket_created

**Archivo:** `backend/src/services/TicketServices/FindOrCreateTicketService.ts`

**Paso 1:** Importar la función de webhook
```typescript
// Al inicio del archivo, agregar:
import { sendTicketCreatedWebhook } from "../WebhookService/SendWebhookEvent";
```

**Paso 2:** Implementar el envío después de crear el ticket
```typescript
// Buscar la línea donde se crea el ticket (aproximadamente línea 108):
ticket = await Ticket.create({
  contactId: groupContact ? groupContact.id : contact.id,
  status: initialStatus,
  isGroup: !!groupContact,
  isBot: true,
  unreadMessages,
  whatsappId
});

// AGREGAR DESPUÉS:
// Enviar webhook de ticket creado
try {
  await sendTicketCreatedWebhook(whatsappId, {
    ticketId: ticket.id,
    contactId: ticket.contactId,
    contactNumber: contact.number,
    contactName: contact.name,
    status: ticket.status,
    isGroup: ticket.isGroup,
    isBot: ticket.isBot,
    unreadMessages: ticket.unreadMessages,
    createdAt: ticket.createdAt,
    queueId: ticket.queueId || null,
    userId: ticket.userId || null
  });
} catch (err) {
  // No bloquear la creación del ticket si falla el webhook
  logger.error("Error sending ticket_created webhook:", err);
}
```

---

### 1.2 ticket_updated y ticket_closed

**Archivo:** `backend/src/services/TicketServices/UpdateTicketService.ts`

**Paso 1:** Importar las funciones de webhook
```typescript
// Al inicio del archivo, agregar:
import { 
  sendTicketUpdatedWebhook,
  sendTicketClosedWebhook
} from "../WebhookService/SendWebhookEvent";
```

**Paso 2:** Implementar el envío después de actualizar el ticket
```typescript
// Buscar la línea después del reload del ticket (aproximadamente línea 190):
await ticket.reload({
  include: [
    // ... includes existentes
  ]
});

// AGREGAR DESPUÉS del reload:
// Preparar datos comunes para los webhooks
const webhookData = {
  ticketId: ticket.id,
  contactId: ticket.contactId,
  contactNumber: ticket.contact?.number,
  contactName: ticket.contact?.name,
  oldStatus,
  newStatus: ticket.status,
  oldUserId,
  newUserId: ticket.userId,
  queueId: ticket.queueId,
  isGroup: ticket.isGroup,
  updatedAt: new Date(),
  changes: {
    status: status !== undefined,
    userId: userId !== undefined,
    queueId: queueId !== undefined,
    useIntegration: useIntegration !== undefined
  }
};

// Webhook específico para cierre de tickets
if (status === "closed" && oldStatus !== "closed") {
  try {
    await sendTicketClosedWebhook(ticket.whatsappId, {
      ...webhookData,
      closedAt: new Date(),
      closedBy: ticket.userId,
      duration: Math.floor((new Date().getTime() - ticket.createdAt.getTime()) / 1000), // duración en segundos
      messageCount: await Message.count({ where: { ticketId: ticket.id } })
    });
  } catch (err) {
    logger.error("Error sending ticket_closed webhook:", err);
  }
}

// Webhook general de actualización (para cualquier cambio que no sea cierre)
if (oldStatus !== ticket.status || oldUserId !== ticket.userId) {
  try {
    await sendTicketUpdatedWebhook(ticket.whatsappId, webhookData);
  } catch (err) {
    logger.error("Error sending ticket_updated webhook:", err);
  }
}
```

**Paso 3:** Agregar import de Message si no existe
```typescript
// Al inicio del archivo, verificar que existe:
import Message from "../../models/Message";
```

---

## 📇 2. Eventos de Contactos

### 2.1 contact_created y contact_updated

**Archivo:** `backend/src/services/ContactServices/CreateOrUpdateContactService.ts`

**Paso 1:** Importar las funciones de webhook
```typescript
// Al inicio del archivo, agregar:
import { 
  sendContactCreatedWebhook,
  sendContactUpdatedWebhook
} from "../WebhookService/SendWebhookEvent";
```

**Paso 2:** Modificar la interfaz Request para incluir whatsappId (opcional)
```typescript
interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  extraInfo?: ExtraInfo[];
  whatsappId?: number; // AGREGAR ESTA LÍNEA
}
```

**Paso 3:** Modificar la función para recibir whatsappId
```typescript
const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  extraInfo = [],
  whatsappId // AGREGAR ESTE PARÁMETRO
}: Request): Promise<Contact> => {
```

**Paso 4:** Implementar webhooks en la creación
```typescript
// Buscar donde se crea el contacto (aproximadamente línea 41):
} else {
  contact = await Contact.create({
    name,
    number,
    profilePicUrl,
    email,
    isGroup,
    extraInfo
  });

  io.emit("contact", {
    action: "create",
    contact
  });

  // AGREGAR DESPUÉS:
  // Enviar webhook de contacto creado
  if (whatsappId) {
    try {
      await sendContactCreatedWebhook(whatsappId, {
        contactId: contact.id,
        name: contact.name,
        number: contact.number,
        email: contact.email,
        isGroup: contact.isGroup,
        profilePicUrl: contact.profilePicUrl,
        createdAt: contact.createdAt,
        extraInfo: contact.extraInfo
      });
    } catch (err) {
      logger.error("Error sending contact_created webhook:", err);
    }
  }
}
```

**Paso 5:** Implementar webhooks en la actualización
```typescript
// Buscar donde se actualiza el contacto (aproximadamente línea 34):
if (contact) {
  contact.update({ profilePicUrl });

  io.emit("contact", {
    action: "update",
    contact
  });

  // AGREGAR DESPUÉS:
  // Enviar webhook de contacto actualizado
  if (whatsappId) {
    try {
      await sendContactUpdatedWebhook(whatsappId, {
        contactId: contact.id,
        name: contact.name,
        number: contact.number,
        email: contact.email,
        isGroup: contact.isGroup,
        profilePicUrl: contact.profilePicUrl,
        updatedAt: new Date(),
        changes: {
          profilePicUrl: true
        }
      });
    } catch (err) {
      logger.error("Error sending contact_updated webhook:", err);
    }
  }
}
```

**Paso 6:** Importar logger si no existe
```typescript
import { logger } from "../../utils/logger";
```

---

## 🔄 3. Actualizar Llamadas a CreateOrUpdateContactService

Después de modificar `CreateOrUpdateContactService`, debes actualizar todas las llamadas a este servicio para incluir el `whatsappId`.

### 3.1 Ubicaciones donde se usa el servicio:

```bash
# Buscar todas las referencias:
grep -r "CreateOrUpdateContactService" backend/src/
```

### 3.2 Ejemplo de actualización en wbotMessageListener.ts

**Antes:**
```typescript
const contact = await CreateOrUpdateContactService({
  name: msgContact.name || msgContact.pushname || number,
  number,
  profilePicUrl: profilePicUrl,
  isGroup: msg.from.includes("@g.us")
});
```

**Después:**
```typescript
const contact = await CreateOrUpdateContactService({
  name: msgContact.name || msgContact.pushname || number,
  number,
  profilePicUrl: profilePicUrl,
  isGroup: msg.from.includes("@g.us"),
  whatsappId: wbot.id // AGREGAR ESTA LÍNEA
});
```

---

## 🧪 4. Pruebas

### 4.1 Probar Eventos de Tickets

**Script de prueba:**
```typescript
// test-ticket-webhooks.ts
import axios from 'axios';

const API_URL = 'http://localhost:8080';
const API_TOKEN = 'tu-token-aqui';

async function testTicketWebhooks() {
  // 1. Crear ticket
  console.log('Creando ticket...');
  const createResponse = await axios.post(
    `${API_URL}/api/v1/tickets`,
    {
      number: '5491112345678',
      whatsappId: 1
    },
    {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    }
  );
  const ticketId = createResponse.data.ticket.id;
  console.log(`Ticket creado: ${ticketId}`);

  // 2. Actualizar ticket
  console.log('Actualizando ticket...');
  await axios.put(
    `${API_URL}/api/v1/tickets/${ticketId}`,
    {
      status: 'open',
      userId: 1
    },
    {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    }
  );
  console.log('Ticket actualizado');

  // 3. Cerrar ticket
  console.log('Cerrando ticket...');
  await axios.put(
    `${API_URL}/api/v1/tickets/${ticketId}`,
    {
      status: 'closed'
    },
    {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    }
  );
  console.log('Ticket cerrado');
}

testTicketWebhooks().catch(console.error);
```

### 4.2 Probar Eventos de Contactos

**Script de prueba:**
```typescript
// test-contact-webhooks.ts
import axios from 'axios';

const API_URL = 'http://localhost:8080';
const API_TOKEN = 'tu-token-aqui';

async function testContactWebhooks() {
  // 1. Crear contacto
  console.log('Creando contacto...');
  const createResponse = await axios.post(
    `${API_URL}/api/v1/contacts`,
    {
      name: 'Test Contact',
      number: '5491112345678',
      email: 'test@example.com'
    },
    {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    }
  );
  const contactId = createResponse.data.id;
  console.log(`Contacto creado: ${contactId}`);

  // 2. Actualizar contacto
  console.log('Actualizando contacto...');
  await axios.put(
    `${API_URL}/api/v1/contacts/${contactId}`,
    {
      name: 'Test Contact Updated'
    },
    {
      headers: { Authorization: `Bearer ${API_TOKEN}` }
    }
  );
  console.log('Contacto actualizado');
}

testContactWebhooks().catch(console.error);
```

---

## 🔍 5. Verificación

### 5.1 Verificar en logs del backend

```bash
# Ver logs en tiempo real
cd backend
npm run dev

# Los webhooks deberían aparecer como:
# "Webhook sent successfully to <url> for event ticket_created: 200"
```

### 5.2 Usar webhook.site para pruebas

1. Ir a https://webhook.site
2. Copiar tu URL única
3. Configurarla en el WhatsApp del sistema
4. Realizar acciones (crear ticket, enviar mensaje, etc.)
5. Ver los webhooks recibidos en tiempo real

### 5.3 Usar n8n para pruebas locales

```yaml
# docker-compose para n8n
version: '3'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
```

---

## 📝 6. Checklist de Implementación

### Tickets
- [ ] Importar funciones en FindOrCreateTicketService
- [ ] Implementar ticket_created
- [ ] Probar creación de tickets
- [ ] Importar funciones en UpdateTicketService
- [ ] Implementar ticket_updated
- [ ] Implementar ticket_closed
- [ ] Probar actualización de tickets
- [ ] Probar cierre de tickets
- [ ] Verificar logs del backend
- [ ] Verificar webhooks recibidos

### Contactos
- [ ] Importar funciones en CreateOrUpdateContactService
- [ ] Agregar whatsappId a la interfaz Request
- [ ] Implementar contact_created
- [ ] Implementar contact_updated
- [ ] Actualizar llamadas en wbotMessageListener
- [ ] Actualizar llamadas en otros servicios
- [ ] Probar creación de contactos
- [ ] Probar actualización de contactos
- [ ] Verificar logs del backend
- [ ] Verificar webhooks recibidos

---

## 🐛 7. Solución de Problemas Comunes

### Problema: Webhooks no se envían

**Verificar:**
1. `webhookEnabled` está en `true` en la tabla `Whatsapps`
2. `webhookUrls` tiene al menos un webhook configurado
3. El evento está en la lista de eventos permitidos del webhook
4. La URL del webhook es accesible
5. No hay errores en los logs del backend

**Solución:**
```sql
-- Verificar configuración
SELECT id, name, webhookEnabled, webhookUrls 
FROM Whatsapps 
WHERE id = 1;

-- Habilitar webhook
UPDATE Whatsapps 
SET webhookEnabled = 1 
WHERE id = 1;
```

### Problema: Error "Cannot find module"

**Solución:**
```bash
# Verificar que todas las dependencias estén instaladas
cd backend
npm install

# Reiniciar el servidor
npm run dev
```

### Problema: Timeout en webhooks

**Ajustar timeout en SendWebhookEvent.ts:**
```typescript
axios.post(webhook.url, payload, {
  headers: {...},
  timeout: 30000 // Aumentar a 30 segundos
})
```

---

## 📊 8. Monitoreo y Logs

### 8.1 Logs a revisar

```typescript
// Éxito
"Webhook sent successfully to <url> for event <event>: 200"

// Error
"Failed to send webhook to <url> for event <event>: <error>"
```

### 8.2 Métricas recomendadas

- Número de webhooks enviados por evento
- Tasa de éxito/error por webhook
- Tiempo de respuesta promedio
- Eventos más frecuentes

---

## ✅ 9. Validación Final

Después de implementar todos los eventos, ejecutar:

```bash
node test-webhook-events.js
```

**Resultado esperado:**
```
Estado de implementación: 9/9 eventos (100%) ✅

Eventos funcionando: 9
Eventos pendientes: 0
```

---

**¡Implementación completada!** 🎉
