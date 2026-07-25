# Filtro preventivo de destinatarios durante un timelock de Zapo

## Objetivo

Proteger una conexión de WhatsApp cuando Zapo informa un `reachoutTimelock`
activo, sin interrumpir la atención de conversaciones que ya tienen una
interacción comprobada con el número actualmente vinculado.

Regla comercial propuesta:

> Durante el timelock permitimos conversaciones con interacción comprobada y
> detenemos contactos nuevos o conversaciones únicamente salientes.

Este documento deja preparada la decisión funcional y técnica para una
implementación posterior. El bloqueo automático todavía no está implementado.

## Qué sabemos mediante Zapo

Zapo consulta dos controles independientes de WhatsApp:

1. **Message capping**
   - `totalQuota`
   - `usedQuota`
   - `cappingStatus`
   - inicio y fin del ciclo
2. **Reachout timelock**
   - `isActive`
   - `enforcementType`
   - `enforcementEndsAt`

Una cuenta puede recibir `totalQuota: -1` y `cappingStatus: NONE`, pero tener
un timelock activo. Por eso el estado general debe priorizar el timelock:

```text
timelock activo → Pausado
```

WhatsApp no informa mediante Zapo:

- La fórmula exacta que activa la pausa.
- La cantidad de reportes o bloqueos.
- El límite total cuando `totalQuota` es `-1`.
- El número exacto de contactos que ocasionó el timelock.

Las señales observables sugieren que influyen el alcance a contactos nuevos,
la frecuencia, la falta de respuestas, los bloqueos, los reportes y otros
patrones de comportamiento. No debemos presentar ninguna de estas señales
como la causa confirmada de una pausa concreta.

## Evidencia disponible por conexión

El almacenamiento interno de Zapo utiliza las tablas MySQL con prefijo
`zapo_` y separa cada conexión mediante:

```text
session_id = whatsapp-{whatsappId}
```

Fuentes principales:

| Tabla | Uso |
|---|---|
| `zapo_mailbox_messages` | Histórico y mensajes entrantes de la sesión |
| `zapo_mailbox_threads` | Conversaciones sincronizadas |
| `zapo_mailbox_contacts` | Relación entre teléfono, PN JID y LID |
| `zapo_privacy_tokens` | Tokens de contactos confiables recibidos de WhatsApp |

No se deben utilizar solamente `Contacts`, `Tickets` o `Messages` de la
aplicación para autorizar un envío durante un timelock. Esos registros pueden
permanecer después de reutilizar una conexión con otro número.

### Caso observado en producción

Para la conexión `whatsapp-38` se observaron:

```text
Conversaciones individuales: 880
Con mensajes recibidos:       441
Únicamente salientes:         439
Mensajes almacenados:       2.207
```

Los 2.207 `message_bytes` se pudieron decodificar correctamente como
`proto.Message`. La visualización con caracteres extraños en herramientas SQL
es normal porque la columna es un `LONGBLOB` protobuf, no texto plano.

La distribución de 441 conversaciones con interacción y 439 únicamente
salientes es una señal operativa útil, pero no demuestra por sí sola la causa
del timelock.

## Clasificación propuesta

### Conversación con interacción comprobada

Se considera evidencia favorable cuando, para la sesión actual:

- Existe un token confiable y vigente en el almacenamiento Zapo; o
- Existe al menos un mensaje recibido (`from_me = 0`) del destinatario.

El token confiable es la evidencia más fuerte. La existencia de un mensaje
recibido funciona como respaldo cuando el historial fue sincronizado.

### Conversación únicamente saliente

Existe uno o más mensajes enviados (`from_me = 1`) y ningún mensaje recibido
para el destinatario dentro de la sesión actual.

No debe considerarse segura durante un timelock: haber enviado anteriormente
no demuestra que el usuario haya respondido ni que WhatsApp permita volver a
contactarlo.

### Contacto nuevo o desconocido

No existe token confiable ni historial recibido para el destinatario en la
sesión actual. Durante el timelock debe rechazarse preventivamente.

## Regla de decisión

```text
¿El reachoutTimelock está activo?
│
├── No → continuar con el flujo normal de envío.
│
└── Sí
    │
    ├── ¿Existe token confiable vigente?
    │   └── Sí → permitir el intento.
    │
    ├── ¿Existe un mensaje recibido en la sesión actual?
    │   └── Sí → permitir como conversación con interacción.
    │
    └── Sin evidencia
        └── rechazar como contacto nuevo o únicamente saliente.
```

Permitir el intento no garantiza que WhatsApp lo acepte. WhatsApp continúa
siendo la autoridad final y puede rechazar un destinatario aunque nuestro
filtro encuentre interacción previa.

## Normalización del destinatario

Antes de clasificar un destinatario debe resolverse su identidad para la
sesión actual:

1. Normalizar el número telefónico.
2. Consultar el mapeo vigente de la conexión.
3. Relacionar `@s.whatsapp.net` y `@lid` mediante
   `zapo_mailbox_contacts`.
4. Buscar tokens e historial usando los identificadores vigentes.

Sin esta normalización, un mismo usuario podría contarse dos veces o una
conversación válida podría aparecer como desconocida después de un cambio de
PN JID a LID.

`Contacts.remoteJid` no debe ser la fuente principal porque el contacto de la
aplicación es global y puede conservar un LID perteneciente a un número
vinculado anteriormente.

## Reutilización de conexiones

Al reutilizar una conexión:

- Se debe limpiar el almacenamiento interno Zapo de su `session_id`.
- Se conservan los contactos, tickets y mensajes funcionales de la aplicación.
- El nuevo histórico Zapo debe poblarse desde la cuenta recién vinculada.
- El filtro solamente debe considerar evidencia de la nueva sesión.

Si la sincronización inicial todavía no terminó, la ausencia de historial
puede ser un falso negativo. La política más segura durante un timelock es
rechazar el destinatario desconocido y explicar que no se encontró
interacción válida para la conexión actual.

## Estado actual y requisito previo

Actualmente:

- Los mensajes entrantes se guardan en el mailbox Zapo.
- Una respuesta puede mover un chat de `Sin respuesta` a `Con interacción`.
- El resumen de la tarjeta se actualiza después de los refrescos de salud.
- Los envíos nuevos realizados mediante `session.message.send()` no se
  incorporan inmediatamente a `zapo_mailbox_messages`.

Antes de usar los conteos como control dinámico es necesario elegir una de
estas alternativas:

1. Persistir después de cada envío aceptado por WhatsApp un registro saliente
   mínimo en el mailbox Zapo:
   - `session_id`
   - `message_id`
   - `thread_jid`
   - `from_me = 1`
   - `timestamp_ms`
2. Crear una tabla propia de alcance por conexión y generación de cuenta.

La segunda alternativa ofrece mayor aislamiento y auditoría, pero requiere
identificar explícitamente cada reutilización de la conexión. La primera es
más pequeña y permite que una sincronización posterior complete el mensaje.

## Alcance de la implementación pendiente

El filtro debe aplicarse en un punto común a todos los envíos Zapo para evitar
que una ruta lo omita:

- API de envío directo.
- Mensajes enviados por agentes.
- Bots y respuestas automáticas.
- Colas.
- Reenvíos.
- Texto y archivos.

Debe definirse si las respuestas automáticas a un mensaje entrante quedan
siempre permitidas. La recomendación inicial es permitirlas porque existe una
interacción entrante comprobada.

### Respuesta sugerida de la API

```json
{
  "status": 409,
  "error": "ZAPO_TIMELOCK_NEW_RECIPIENT_BLOCKED",
  "message": "La conexión está pausada por WhatsApp y no se encontró una interacción previa válida con este destinatario.",
  "connectionId": 38,
  "recipient": "595...",
  "timelockEndsAt": "2026-07-31T12:40:00-03:00"
}
```

La respuesta debe ser diferenciable de un error técnico para que el cliente
pueda reintentar después del fin de la pausa.

## API, socket y webhook

La salud de la conexión puede exponer:

```json
{
  "chatHistory": {
    "individualChats": 880,
    "withInbound": 441,
    "outboundOnly": 439
  },
  "outreach": {
    "status": "paused"
  },
  "reachoutTimelock": {
    "isActive": true,
    "enforcementEndsAt": 1785501600
  }
}
```

Cuando cambie la clasificación de un chat:

- Actualizar la tarjeta mediante socket.
- Incluir el resumen en `connection_health`.
- Emitir el webhook únicamente cuando cambien valores relevantes.

También conviene evaluar un evento específico para rechazos preventivos:

```text
connection_outreach_blocked
```

con conexión, destinatario normalizado, motivo y fin del timelock.

## Experiencia de usuario

Durante la pausa, la tarjeta debe mostrar:

- Estado general: `Pausado`.
- Tiempo restante calculado dinámicamente.
- Fecha final informada por WhatsApp.
- Conversaciones con interacción.
- Conversaciones sin respuesta.
- Cupo numérico como no disponible cuando WhatsApp retorna `-1`.

No se debe mostrar el valor técnico `cappingStatus: NONE` como si contradijera
la pausa. El valor puede mantenerse en API y webhook para diagnóstico.

Mensaje comercial recomendado:

> WhatsApp pausó temporalmente el contacto a chats nuevos. Las conversaciones
> con interacción comprobada pueden seguir atendiéndose; los destinatarios
> nuevos o sin respuesta serán detenidos para proteger la conexión.

## Decisiones pendientes con usuarios

Antes de activar el bloqueo se debe validar:

- Qué tipos de mensajes consideran críticos.
- Si deben existir excepciones por rol.
- Si un supervisor puede autorizar un envío puntual.
- Cómo se informa el rechazo al agente.
- Cómo debe responder un sistema externo que consume la API.
- Si el modo inicial debe advertir o bloquear.
- Cuánto histórico mínimo consideran suficiente.
- Qué hacer mientras el histórico inicial está sincronizando.
- Si quieren un límite preventivo propio fuera del timelock.

Un límite preventivo propio no se informa a WhatsApp y debe mostrarse separado
de los estados recibidos mediante Zapo.

## Implementación gradual recomendada

### Fase 1: observación

- Clasificar cada intento sin bloquearlo.
- Registrar `allowed_existing`, `outbound_only` o `unknown`.
- Medir falsos positivos y comportamiento por conexión.

### Fase 2: advertencia

- Advertir al agente o consumidor API.
- Permitir una excepción auditada cuando el negocio lo requiera.

### Fase 3: protección

- Bloquear nuevos y únicamente salientes durante un timelock.
- Permitir interacción comprobada.
- Emitir métricas, socket y webhook.

## Pruebas mínimas

| Escenario | Resultado esperado durante timelock |
|---|---|
| Token confiable vigente | Permitir |
| Mensaje entrante previo en la sesión | Permitir |
| Únicamente mensajes salientes | Rechazar |
| Contacto completamente nuevo | Rechazar |
| Mismo teléfono resuelto como LID | No duplicar y aplicar su historial |
| Conexión reutilizada con otro número | No usar el historial anterior |
| Historial todavía sincronizando | Rechazo seguro o política explícita |
| Fin estimado alcanzado sin confirmación | Mantener protección |
| WhatsApp confirma `isActive: false` | Retirar el filtro |

## Criterio de finalización

La funcionalidad estará completa cuando:

- Todos los envíos Zapo atraviesen el mismo filtro.
- La identidad del destinatario se resuelva por sesión.
- Los salientes nuevos se contabilicen inmediatamente.
- Las respuestas cambien correctamente la clasificación.
- La reutilización no mezcle cuentas.
- API, tarjeta, socket y webhook sean consistentes.
- Existan registros de auditoría y pruebas automatizadas.
- La política haya sido validada con los usuarios afectados.
