# 🚀 Guía de Implementación - Mejoras WhatsApp

## 1️⃣ ACTIVAR LIMPIEZA DE ARCHIVOS

### Opción A: Automática (Recomendado)

Edita `backend/src/server.ts` y agrega después de `initIO(server)`:

```typescript
import FileCleanupService from "./services/FileCleanupService";

// Iniciar limpieza automática
FileCleanupService.start(); // Default: 3 AM diariamente, archivos > 7 días
```

### Opción B: Personalizada

```typescript
import FileCleanupService from "./services/FileCleanupService";

// Limpiar cada 12 horas, archivos mayores a 3 días
FileCleanupService.start("0 */12 * * *", 72);
```

### Opción C: Manual (Para ejecutar una vez)

Crea un script temporal `backend/src/scripts/cleanup.ts`:

```typescript
import "../bootstrap";
import { cleanupOldFiles, cleanupOrphanFiles } from "../utils/fileCleanup";
import { logger } from "../utils/logger";

async function main() {
  logger.info("Iniciando limpieza manual...");
  
  // Limpiar archivos antiguos (> 7 días)
  await cleanupOldFiles(168);
  
  // Limpiar archivos sin referencia en BD
  await cleanupOrphanFiles();
  
  logger.info("Limpieza completada!");
  process.exit(0);
}

main().catch(err => {
  logger.error("Error en limpieza:", err);
  process.exit(1);
});
```

Ejecutar:
```bash
cd backend
npx ts-node src/scripts/cleanup.ts
```

---

## 2️⃣ CONFIGURAR VARIABLES DE ENTORNO

Edita `backend/.env`:

```env
# ===== CONFIGURACIÓN DE UPLOADS =====
# Tamaño máximo por archivo (en bytes)
MAX_FILE_SIZE=20971520  # 20MB

# Número máximo de archivos por mensaje
MAX_FILES_PER_MESSAGE=10

# ===== LIMPIEZA DE ARCHIVOS =====
# Activar limpieza automática
FILE_CLEANUP_ENABLED=true

# Expresión cron para limpieza (3 AM diariamente)
FILE_CLEANUP_CRON=0 3 * * *

# Edad máxima de archivos en horas (7 días)
FILE_MAX_AGE_HOURS=168
```

---

## 3️⃣ PROBAR LAS MEJORAS

### Test 1: Sistema de Colas

```bash
# Listar colas (ahora incluye relaciones)
curl -X GET http://localhost:3000/queue \
  -H "Authorization: Bearer YOUR_TOKEN"

# Intentar eliminar cola con tickets activos (debe fallar)
curl -X DELETE http://localhost:3000/queue/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Upload de Multimedia

```bash
# Subir archivo válido
curl -X POST http://localhost:3000/messages/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "medias=@test.jpg" \
  -F "body=Hola con imagen"

# Intentar subir archivo no permitido (debe fallar)
curl -X POST http://localhost:3000/messages/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "medias=@malicious.exe"
```

### Test 3: Frontend - Emoji Picker

1. Abre la aplicación web
2. Selecciona un ticket abierto
3. Click en el botón de emoji 😊
4. Click fuera del picker
5. ✅ Debe cerrarse correctamente

---

## 4️⃣ MONITOREO Y LOGS

### Ver logs de limpieza de archivos

```bash
# En producción
tail -f backend/logs/app.log | grep FileCleanup

# En desarrollo
# Los logs aparecerán en la consola con formato:
# [FileCleanup] Limpieza completada. Archivos eliminados: 5, Errores: 0
```

### Verificar archivos en public/

```bash
# Listar archivos ordenados por fecha
ls -lth backend/public/

# Contar archivos
find backend/public/ -type f | wc -l

# Ver tamaño total
du -sh backend/public/
```

---

## 5️⃣ COMANDOS ÚTILES

### Reiniciar backend

```bash
cd backend
npm run dev
```

### Compilar TypeScript

```bash
cd backend
npm run build
```

### Ver errores de compilación

```bash
cd backend
npm run watch
```

### Ejecutar tests (si existen)

```bash
cd backend
npm test
```

---

## 6️⃣ TROUBLESHOOTING

### Problema: Error al subir archivos grandes

**Solución:** Aumentar límite en `nginx.conf`:
```nginx
client_max_body_size 25M;
```

### Problema: Limpieza elimina archivos necesarios

**Solución:** Aumentar `FILE_MAX_AGE_HOURS` en `.env`:
```env
FILE_MAX_AGE_HOURS=336  # 14 días
```

### Problema: Error "Type not allowed"

**Solución:** Agregar MIME type en `backend/src/config/upload.ts`:
```typescript
const allowedMimeTypes = [
  // ... tipos existentes
  "nuevo/mimetype"
];
```

---

## 7️⃣ ROLLBACK (Si hay problemas)

Si necesitas revertir los cambios:

```bash
cd backend

# Revertir archivos específicos
git checkout HEAD -- src/services/QueueService/UpdateQueueService.ts
git checkout HEAD -- src/services/QueueService/ListQueuesService.ts
git checkout HEAD -- src/services/QueueService/DeleteQueueService.ts
git checkout HEAD -- src/config/upload.ts
git checkout HEAD -- src/services/WbotServices/SendWhatsAppMedia.ts
git checkout HEAD -- src/controllers/MessageController.ts

# Eliminar archivos nuevos
rm src/utils/fileCleanup.ts
rm src/services/FileCleanupService.ts
```

---

## 8️⃣ PRÓXIMOS PASOS RECOMENDADOS

### Corto Plazo (1-2 semanas)
- [ ] Activar FileCleanupService
- [ ] Monitorear logs de errores
- [ ] Ejecutar limpieza manual inicial
- [ ] Probar uploads de diferentes tipos de archivos

### Mediano Plazo (1 mes)
- [ ] Agregar tests automatizados para QueueService
- [ ] Implementar métricas de uso de disco
- [ ] Documentar endpoints en Swagger
- [ ] Agregar límites por usuario/sesión

### Largo Plazo (3+ meses)
- [ ] Migrar archivos a storage cloud (S3, CloudFlare R2)
- [ ] Implementar compresión automática de imágenes
- [ ] Agregar preview de archivos en el panel
- [ ] Sistema de respaldo de archivos importantes

---

## 📊 MÉTRICAS A MONITOREAR

```bash
# Uso de disco
df -h

# Espacio usado por public/
du -sh backend/public/

# Archivos en public/
find backend/public/ -type f | wc -l

# Archivos mayores a 10MB
find backend/public/ -type f -size +10M

# Archivos más antiguos
find backend/public/ -type f -mtime +7
```

---

## ✅ CHECKLIST FINAL

Antes de pasar a producción:

- [ ] Todas las mejoras compiladas sin errores
- [ ] Tests de integración pasados
- [ ] FileCleanupService configurado y probado
- [ ] Variables de entorno configuradas
- [ ] Backup de base de datos realizado
- [ ] Logs monitoreados por 1 semana
- [ ] Documentación actualizada
- [ ] Equipo informado de los cambios

---

## 🆘 SOPORTE

Si encuentras problemas:

1. Revisa los logs: `backend/logs/`
2. Verifica las variables de entorno
3. Consulta `ANALISIS_Y_MEJORAS.md`
4. Revisa issues en el repositorio

---

*Última actualización: 30 de Noviembre, 2025*
