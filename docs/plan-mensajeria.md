# Plan de Mejoras de Mensajeria

## Panorama Actual
- Backoffice y panel sincronizados tras correccion de filtros.
- Sockets reportan eventos `ticket` y `appMessage` sin bloqueos cuando no hay filtros activos.
- Pendientes: refactor de horarios (`verifyQueue`) y manejo resiliente de envios (`SendWhatsAppMessage`).

## Checklist Backend
- [x] Normalizar filtros de `/tickets` para `queueIds`, `tags`, `whatsappIds`, `userIds`.
- [ ] Refactorizar `verifyQueue` usando helper por dia/horario.
- [ ] Manejar errores en `SendWhatsAppMessage` sin `process.exit(1)`.
- [ ] Optimizar cron `ClosedAllOpenTickets` (query paginada + cache de conexiones).

## Checklist Frontend
- [x] Ajustar `TicketsList` para aceptar eventos cuando no hay filtros de cola.
- [ ] Escuchar `session:expired` del backend y mostrar aviso/login.
- [ ] Permitir reconexion ilimitada o backoff progresivo en `socket-io.js`.

## Seguimiento Operativo
1. Validar en staging: crear tickets con y sin cola, confirmar que las listas reaccionan con filtros vacios y activos.
2. Ejecutar suites o smoke tests relevantes: `npm run test` en `backend/` y `frontend/`.
3. Planificar siguientes iteraciones (refactor horarios, manejo de errores, cron optimizado) y marcar cada casilla al completarse.
