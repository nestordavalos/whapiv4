# Optimización de Base de Datos - WhatsApp API v4

## Resumen de Análisis

Este documento describe las optimizaciones realizadas y recomendaciones adicionales para mejorar el rendimiento de la base de datos MySQL.

---

## 1. Índices Agregados

### Migración: `20241202400000-add-performance-indexes.ts`

Se han agregado **30+ índices optimizados** para las consultas más frecuentes:

### Tabla `Tickets` (Más crítica)

| Índice | Columnas | Propósito |
|--------|----------|-----------|
| `idx_tickets_status_contact_whatsapp` | status, contactId, whatsappId | FindOrCreateTicketService - consulta más frecuente |
| `idx_tickets_contact_whatsapp_updated` | contactId, whatsappId, updatedAt | Búsqueda de tickets recientes |
| `idx_tickets_updatedAt` | updatedAt | Filtrado por tiempo |
| `idx_tickets_queue_unread` | queueId, unreadMessages | Tickets no leídos |
| `idx_tickets_isGroup` | isGroup | Filtro de grupos |
| `idx_tickets_status_createdAt` | status, createdAt | Listado con fecha |
| `idx_tickets_typebot_session` | typebotSessionId | Integración Typebot |

### Tabla `Messages`

| Índice | Columnas | Propósito |
|--------|----------|-----------|
| `idx_messages_bodySearch` | bodySearch | Búsqueda de texto |
| `idx_messages_ticket_createdAt` | ticketId, createdAt | Paginación de mensajes |
| `idx_messages_quotedMsgId` | quotedMsgId | Mensajes citados |
| `idx_messages_fromMe` | fromMe | Filtro por origen |
| `idx_messages_ack` | ack | Estado de entrega |
| `idx_messages_read` | read | Estado de lectura |

### Tabla `Contacts`

| Índice | Columnas | Propósito |
|--------|----------|-----------|
| `idx_contacts_name` | name | Búsqueda por nombre |
| `idx_contacts_email` | email | Búsqueda por email |
| `idx_contacts_isGroup` | isGroup | Filtro de grupos |

### Tabla `ContactTags`

| Índice | Columnas | Propósito |
|--------|----------|-----------|
| `idx_contacttags_tagId` | tagId | Filtro por etiqueta |
| `idx_contacttags_contact_tag` | contactId, tagId (UNIQUE) | Prevenir duplicados |

---

## 2. Optimizaciones de Consultas Recomendadas

### 2.1 ListContactsService - Problema de N+1

**Problema actual:**
```typescript
// Múltiples consultas para cada etiqueta
for (const tag of tags) {
  const contactTags = await ContactTag.findAll({ where: { tagId: tag } });
  // ...
}
```

**Solución optimizada:**
```typescript
// Una sola consulta con IN
const contactTags = await ContactTag.findAll({
  where: { tagId: { [Op.in]: tags } },
  attributes: ['contactId', 'tagId']
});

// Agrupar en memoria
const contactsByTag = new Map<number, Set<number>>();
contactTags.forEach(ct => {
  if (!contactsByTag.has(ct.tagId)) {
    contactsByTag.set(ct.tagId, new Set());
  }
  contactsByTag.get(ct.tagId)!.add(ct.contactId);
});

// Intersección eficiente
let result: Set<number> | null = null;
for (const [_, contactIds] of contactsByTag) {
  if (result === null) {
    result = contactIds;
  } else {
    result = new Set([...result].filter(id => contactIds.has(id)));
  }
}
```

### 2.2 ListTicketsService - Optimizar búsqueda de texto

**Problema actual:**
```typescript
// LIKE con wildcard al inicio no usa índice
"$messages.bodySearch$": { [Op.like]: `%${sanitizedSearchParam}%` }
```

**Solución: Usar índice FULLTEXT (MySQL)**
```sql
ALTER TABLE Messages ADD FULLTEXT INDEX idx_messages_body_fulltext (bodySearch);
```

```typescript
// En la consulta
where: {
  [Op.and]: [
    Sequelize.literal(`MATCH(bodySearch) AGAINST('${searchParam}' IN BOOLEAN MODE)`)
  ]
}
```

### 2.3 FindOrCreateTicketService - Múltiples updates

**Problema actual:**
```typescript
// 3-4 updates separados
await ticket.update({ queueId });
await ticket.update({ tagsId });
await ticket.update({ userId });
```

**Solución optimizada:**
```typescript
// Un solo update
const updateData: Partial<Ticket> = {};
if (queueId !== 0 && queueId !== undefined) updateData.queueId = queueId;
if (tagsId !== 0 && tagsId !== undefined) updateData.tagsId = tagsId;
if (userId !== 0 && userId !== undefined) updateData.userId = userId;

if (Object.keys(updateData).length > 0) {
  await ticket.update(updateData);
}
```

### 2.4 ListMessagesService - Consulta innecesaria

**Problema actual:**
```typescript
// Obtiene todos los tickets del contacto para luego buscar mensajes
const tickets = await Ticket.findAll({
  where: { contactId: ticket.contactId, whatsappId: ticket.whatsappId },
  attributes: ["id"]
});
const ticketIds = tickets.map(t => t.id);
```

**Optimización con subquery:**
```typescript
const { count, rows: messages } = await Message.findAndCountAll({
  where: {
    ticketId: {
      [Op.in]: Sequelize.literal(`(
        SELECT id FROM Tickets 
        WHERE contactId = ${ticket.contactId} 
        AND whatsappId = ${ticket.whatsappId}
      )`)
    }
  },
  // ...resto de la consulta
});
```

---

## 3. Configuración MySQL Recomendada

Agregar al archivo `my.cnf` o `my.ini`:

```ini
[mysqld]
# InnoDB Buffer Pool - 70% de RAM disponible para DB
innodb_buffer_pool_size = 2G

# Log buffer para escrituras
innodb_log_buffer_size = 64M

# Tamaño de logs de transacción
innodb_log_file_size = 256M

# Conexiones simultáneas
max_connections = 200

# Cache de consultas (para MySQL < 8.0)
query_cache_type = 1
query_cache_size = 128M

# Sort buffer para ORDER BY
sort_buffer_size = 4M

# Join buffer para JOINs sin índice
join_buffer_size = 4M

# Timeout para conexiones inactivas
wait_timeout = 300
interactive_timeout = 300

# Optimización de índices
innodb_stats_on_metadata = OFF
```

---

## 4. Monitoreo de Consultas Lentas

### Habilitar log de consultas lentas

```ini
[mysqld]
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
log_queries_not_using_indexes = 1
```

### Consulta para ver consultas lentas

```sql
-- Ver índices de una tabla
SHOW INDEX FROM Tickets;

-- Analizar una consulta
EXPLAIN SELECT * FROM Tickets WHERE status = 'pending' AND contactId = 1;

-- Ver consultas en ejecución
SHOW FULL PROCESSLIST;

-- Estadísticas de tablas
SHOW TABLE STATUS LIKE 'Tickets';
```

---

## 5. Mantenimiento Periódico

### Script de mantenimiento (ejecutar semanalmente)

```sql
-- Optimizar tablas principales
OPTIMIZE TABLE Tickets;
OPTIMIZE TABLE Messages;
OPTIMIZE TABLE Contacts;
OPTIMIZE TABLE ContactTags;

-- Actualizar estadísticas de índices
ANALYZE TABLE Tickets;
ANALYZE TABLE Messages;
ANALYZE TABLE Contacts;
```

---

## 6. Ejecución de la Migración

Para aplicar los índices de optimización:

```bash
cd backend
npx sequelize-cli db:migrate
```

Para verificar los índices creados:

```sql
SHOW INDEX FROM Tickets;
SHOW INDEX FROM Messages;
SHOW INDEX FROM Contacts;
SHOW INDEX FROM ContactTags;
```

---

## 7. Estimación de Mejora

| Consulta | Antes | Después | Mejora |
|----------|-------|---------|--------|
| FindOrCreateTicket | ~50ms | ~5ms | 10x |
| ListTickets (100 tickets) | ~200ms | ~30ms | 6-7x |
| ListMessages (paginado) | ~100ms | ~15ms | 6-7x |
| ListContacts con tags | ~300ms | ~50ms | 6x |
| Búsqueda de texto | ~500ms | ~80ms | 6x |

*Estos valores son estimaciones basadas en volumen medio de datos (~50k tickets, ~500k mensajes)*

---

## 8. Próximos Pasos

1. ✅ Ejecutar migración de índices
2. ⏳ Implementar optimizaciones de código (sección 2)
3. ⏳ Configurar MySQL según recomendaciones
4. ⏳ Habilitar log de consultas lentas
5. ⏳ Programar mantenimiento semanal
