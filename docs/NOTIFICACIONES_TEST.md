# Guía de Prueba de Notificaciones Push y Sonido

## Mejoras Implementadas

Se han realizado las siguientes mejoras en el sistema de notificaciones:

### 1. **Gestión de Permisos Mejorada**
- ✅ Detección automática de soporte de notificaciones en el navegador
- ✅ Solicitud de permisos con feedback claro en consola
- ✅ Manejo de estados: `granted`, `denied`, `default`, `unsupported`
- ✅ Actualización del estado visual según permisos

### 2. **Reproducción de Sonido Robusta**
- ✅ Inicialización correcta del objeto Audio
- ✅ Pre-carga del archivo de audio
- ✅ Volumen configurado al 80%
- ✅ Desbloqueo automático del audio tras interacción del usuario
- ✅ Reintentos automáticos si falla la reproducción
- ✅ Logs detallados para debugging

### 3. **Indicadores Visuales**
- ✅ Icono cambia a 🔕 cuando las notificaciones están bloqueadas
- ✅ Tooltip informativo sobre el estado de las notificaciones
- ✅ Contador de mensajes sin leer en badge

### 4. **Manejo de Errores**
- ✅ Try-catch en todas las operaciones críticas
- ✅ Fallback: si falla la notificación visual, reproduce el sonido
- ✅ Logs descriptivos en consola para debugging

## Cómo Probar

### Paso 1: Iniciar la Aplicación

```bash
# En la terminal del frontend
cd frontend
npm run dev
```

La aplicación debería iniciarse en `http://localhost:3000` o `http://localhost:3001`

### Paso 2: Verificar Permisos de Notificaciones

1. **Abrir la Consola del Navegador** (F12)
2. **Hacer clic en cualquier parte de la página** (esto desbloquea el audio)
3. **Hacer clic en el icono de notificaciones** (campana con badge)
4. **Observar en la consola:**
   - `"Audio de notificación inicializado"`
   - `"Audio desbloqueado exitosamente"` (tras el primer clic)

### Paso 3: Conceder Permisos

Si es la primera vez:
1. El navegador mostrará un diálogo solicitando permisos
2. Hacer clic en **"Permitir"** o **"Allow"**
3. Verificar en consola: `"Permisos de notificación concedidos"`

### Paso 4: Probar Notificaciones

#### Opción A: Recibir un Mensaje Real
1. Envía un mensaje de WhatsApp a tu número conectado
2. Deberías ver/escuchar:
   - 🔔 **Notificación push del navegador** con el mensaje
   - 🔊 **Sonido de alerta**
   - 📊 **Actualización del badge** con el contador

#### Opción B: Probar con Consola (Desarrollo)
Ejecuta esto en la consola del navegador:

```javascript
// Simular notificación
const audio = new Audio('/src/assets/sound.mp3');
audio.volume = 0.8;
audio.play().then(() => console.log('Sonido reproducido'));

// Simular notificación push
if (Notification.permission === "granted") {
    new Notification("Mensaje de prueba", {
        body: "Este es un mensaje de prueba",
        icon: "/logo.jpeg",
        tag: "test",
    });
}
```

### Paso 5: Verificar Estados de Error

#### Test 1: Notificaciones Bloqueadas
1. Ve a la configuración del navegador
2. Bloquea las notificaciones para el sitio
3. Recarga la página
4. **Resultado esperado:**
   - Icono cambia a 🔕 (NotificationsOff)
   - Tooltip muestra: "Notificaciones bloqueadas..."
   - Consola muestra: `"Notificaciones bloqueadas por el usuario"`
   - El **sonido sigue funcionando** aunque las notificaciones estén bloqueadas

#### Test 2: Navegador sin Soporte (Raro)
Si el navegador no soporta notificaciones:
- Icono 🔕 permanente
- Tooltip: "Este navegador no soporta notificaciones"
- Solo funcionará el sonido

## Verificación en Consola

Durante el uso normal, deberías ver logs como:

```
Audio de notificación inicializado
Audio desbloqueado exitosamente
Preparando notificación desktop y audio para ticket 123
✓ Sonido de notificación reproducido
```

En caso de problemas:

```
Error reproduciendo sonido: NotAllowedError
✓ Sonido reproducido en segundo intento
```

## Configuración del Navegador

### Chrome/Edge
1. Ve a `chrome://settings/content/notifications`
2. Asegúrate de que el sitio esté en "Permitidos"

### Firefox
1. Ve a `about:preferences#privacy`
2. Busca "Permisos" → "Notificaciones" → "Configuración"
3. Verifica que el sitio tenga permisos

### Safari
1. Ve a Preferencias → Sitios web → Notificaciones
2. Permite notificaciones para el sitio

## Resolución de Problemas

### El sonido no se reproduce
1. ✅ Verifica que el archivo existe: `frontend/src/assets/sound.mp3`
2. ✅ Revisa que el volumen del sistema no esté en 0
3. ✅ Haz clic en la página antes de esperar notificaciones (política de autoplay)
4. ✅ Verifica la consola para errores

### Las notificaciones no aparecen
1. ✅ Verifica los permisos del navegador
2. ✅ Comprueba que el navegador esté en primer plano
3. ✅ Revisa la configuración de "No molestar" del sistema operativo
4. ✅ En Windows: Configuración → Sistema → Notificaciones

### El badge no se actualiza
1. ✅ Verifica la conexión del socket
2. ✅ Revisa la consola para eventos `appMessage`
3. ✅ Comprueba que el ticket pertenezca a tu cola/usuario

## Archivos Modificados

- `frontend/src/components/NotificationsPopOver/index.jsx`
  - Mejorada gestión de permisos
  - Reproducción de audio más robusta
  - Indicadores visuales de estado
  - Manejo de errores mejorado

## Logs de Debugging

Para ver todos los logs relacionados con notificaciones, filtra en la consola por:
- `notification`
- `audio`
- `sound`

## Características Adicionales

- 🔁 **Reintento automático** si falla la reproducción de audio
- 📱 **Soporte para touch events** (móviles)
- 🎵 **Volumen preconfigurado** al 80%
- ⚡ **Pre-carga de audio** para respuesta instantánea
- 🔍 **Logs detallados** para debugging
- 🛡️ **Fallback garantizado**: siempre intenta reproducir sonido aunque falle la notificación visual

## Compatibilidad

- ✅ Chrome/Edge 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Opera 67+
- ⚠️ IE11 no soportado (navegador obsoleto)

## Notas Importantes

1. **Primer clic requerido**: Los navegadores bloquean el autoplay de audio hasta que el usuario interactúe con la página
2. **HTTPS requerido**: Las notificaciones push solo funcionan en HTTPS (excepto localhost)
3. **Permisos persistentes**: Una vez concedidos, los permisos se mantienen hasta que el usuario los revoque
4. **Background tabs**: Algunas notificaciones pueden no mostrarse si la pestaña está en segundo plano por mucho tiempo

---

**Fecha de actualización**: Diciembre 2025  
**Versión**: 1.0
