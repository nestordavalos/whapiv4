# 🚀 Corrección de Errores y Despliegue

## 📋 Resumen de Problemas Identificados

### 1. ❌ Error: Cannot find module '/www/wwwroot/imagix4/backend/dist/server.js'

**Causa**: TypeScript estaba compilando la estructura `src/` dentro de `dist/`, generando `dist/src/server.js` en lugar de `dist/server.js`.

**Solución**: Se agregó `rootDir: "./src"` en `tsconfig.json` y se configuraron las opciones `include` y `exclude` para compilar correctamente.

### 2. ⚠️ Error: [wbot] Error al hacer ping: Protocol error (Runtime.callFunctionOn): Session closed

**Causa**: El intervalo de ping seguía ejecutándose después de que la página de puppeteer se cerraba, intentando hacer llamadas a una sesión inexistente.

**Solución**: Se mejoró el manejo de errores en el intervalo de ping para:
- Detectar cuando la página está cerrada
- Limpiar el intervalo automáticamente al detectar errores de sesión cerrada
- Limpiar el intervalo en el evento `disconnected`

## 🔧 Cambios Realizados

### 1. `backend/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es6",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",  // ← NUEVO
    "strict": false,
    "useUnknownInCatchVariables": false,
    "strictPropertyInitialization": false,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],  // ← NUEVO
  "exclude": ["node_modules", "dist", "scripts"],  // ← NUEVO
  ...
}
```

### 2. `backend/src/libs/wbot.ts`

**Mejora en el intervalo de ping:**
```typescript
// 🔁 Verificar conexión cada 60s
wbot.pingInterval = setInterval(async () => {
  try {
    // Verificar si el cliente aún existe y está inicializado
    if (!wbot.pupPage || wbot.pupPage.isClosed()) {
      logger.warn(`[wbot] Página cerrada, limpiando intervalo de ping`);
      if (wbot.pingInterval) clearInterval(wbot.pingInterval);
      return;
    }
    
    const state = await wbot.getState();
    if (state !== "CONNECTED") {
      logger.warn(`[wbot] Estado inusual: ${state}`);
    }
  } catch (pingErr) {
    // Si es un error de protocolo (sesión cerrada), limpiar el intervalo
    if (pingErr.message && pingErr.message.includes("Session closed")) {
      logger.warn(`[wbot] Sesión cerrada detectada, limpiando intervalo de ping`);
      if (wbot.pingInterval) clearInterval(wbot.pingInterval);
      return;
    }
    logger.error(`[wbot] Error al hacer ping: ${pingErr.message}`);
  }
}, 60000);
```

**Mejora en el evento disconnected:**
```typescript
wbot.on("disconnected", async reason => {
  try {
    logger.warn(`Session: ${sessionName} DISCONNECTED - ${reason}`);
    
    // Limpiar el intervalo de ping cuando se desconecta
    if (wbot.pingInterval) {
      clearInterval(wbot.pingInterval);
      wbot.pingInterval = null;
    }
    
    await whatsapp.update({ status: "DISCONNECTED" });
    io.emit("whatsappSession", { action: "update", session: whatsapp });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling disconnected: ${err}`);
  }
});
```

## 📦 Pasos para Desplegar en Producción

### Opción A: Usando el script UPDATE.sh (Recomendado)

```bash
# Conectar al servidor
ssh usuario@tu-servidor

# Ir al directorio del proyecto
cd /www/wwwroot/imagix4

# Ejecutar el script de actualización
bash UPDATE.sh
```

### Opción B: Pasos Manuales

```bash
# 1. Conectar al servidor
ssh usuario@tu-servidor

# 2. Ir al directorio del proyecto
cd /www/wwwroot/imagix4

# 3. Hacer backup (opcional pero recomendado)
cp -r backend/dist backend/dist.backup.$(date +%Y%m%d_%H%M%S)

# 4. Obtener los últimos cambios
git pull origin master

# 5. Actualizar backend
cd backend
rm -rf node_modules dist
npm install
npm run build

# 6. Verificar que server.js está en la ubicación correcta
ls -lh dist/server.js
# Debería mostrar: -rw-r--r-- ... dist/server.js

# 7. Ejecutar migraciones
npx sequelize db:migrate

# 8. Actualizar frontend
cd ../frontend
rm -rf node_modules dist
npm install --force
npm run build

# 9. Reiniciar PM2
pm2 restart all

# 10. Verificar logs
pm2 logs imagix-backend --lines 50
```

## ✅ Verificación Post-Despliegue

### 1. Verificar que el backend está corriendo:
```bash
pm2 status
```

Deberías ver:
```
┌─────┬─────────────────┬─────────┬─────────┐
│ id  │ name            │ status  │ restart │
├─────┼─────────────────┼─────────┼─────────┤
│ 1   │ imagix-backend  │ online  │ 0       │
└─────┴─────────────────┴─────────┴─────────┘
```

### 2. Verificar logs en tiempo real:
```bash
pm2 logs imagix-backend --lines 20
```

**Ya NO deberías ver**:
- ❌ `Error: Cannot find module '/www/wwwroot/imagix4/backend/dist/server.js'`
- ⚠️ `Error al hacer ping: Protocol error (Runtime.callFunctionOn): Session closed` (en exceso)

**Deberías ver**:
- ✅ `Session: <nombre> READY`
- ✅ `Server started on port <puerto>`
- ✅ Logs normales de la aplicación

### 3. Verificar estructura del directorio dist:
```bash
ls -lh /www/wwwroot/imagix4/backend/dist/
```

Deberías ver:
```
-rw-r--r-- app.js
-rw-r--r-- bootstrap.js
-rw-r--r-- server.js       ← Este archivo DEBE estar aquí
-rw-r--r-- swagger.json
drwxr-xr-x config/
drwxr-xr-x controllers/
drwxr-xr-x services/
...
```

### 4. Probar la API:
```bash
curl http://localhost:<puerto>/api/status
```

O desde tu navegador:
```
https://tu-dominio.com/api/status
```

## 🐛 Solución de Problemas

### Si aún ves el error "Cannot find module"

1. Verifica la estructura de dist:
```bash
find /www/wwwroot/imagix4/backend/dist -name "server.js"
```

2. Si el archivo está en `dist/src/server.js`, algo salió mal. Intenta:
```bash
cd /www/wwwroot/imagix4/backend
rm -rf dist
npm run build
ls -lh dist/server.js
```

### Si aún ves errores de ping frecuentes

1. Verifica la configuración de Browserless/Puppeteer
2. Revisa los recursos del servidor (memoria, CPU)
3. Considera aumentar el timeout del ping o deshabilitarlo temporalmente

### Si PM2 no inicia el backend

1. Verifica la configuración de PM2:
```bash
pm2 describe imagix-backend
```

2. Asegúrate de que la ruta del script sea correcta:
```bash
# Debería ser algo como:
script: '/www/wwwroot/imagix4/backend/dist/server.js'
```

3. Reinicia PM2:
```bash
pm2 delete imagix-backend
pm2 start dist/server.js --name imagix-backend
pm2 save
```

## 📝 Notas Adicionales

- **Tiempo estimado de despliegue**: 10-15 minutos
- **Downtime esperado**: ~2-3 minutos durante el reinicio de PM2
- **Backup**: Siempre se recomienda hacer backup antes de actualizar
- **Pruebas**: Prueba en un entorno de staging antes de producción si es posible

## 🆘 Soporte

Si encuentras problemas durante el despliegue:
1. Revisa los logs de PM2: `pm2 logs imagix-backend`
2. Verifica los logs del sistema: `/www/wwwlogs/pm2/imagix-backend-error.log`
3. Consulta este documento para soluciones comunes
