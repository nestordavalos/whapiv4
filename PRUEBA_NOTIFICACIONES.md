# 🔔 Guía Rápida: Probar Notificaciones Push

## ✅ Lo que ya funciona:
- ✅ **Sonido de notificación** - Se reproduce cuando llega un mensaje

## 🔧 Para activar las Notificaciones Push:

### Paso 1: Abrir la Aplicación
Abre el navegador en: **http://localhost:3000/**

### Paso 2: Habilitar Permisos

**Opción A - Automático:**
1. Haz clic en el **icono de campana** (🔔) en la barra superior
2. El navegador mostrará un diálogo pidiendo permisos
3. Haz clic en **"Permitir"** o **"Allow"**

**Opción B - Manual (si no aparece el diálogo):**
1. Haz clic en el **icono de candado** 🔒 en la barra de direcciones
2. Busca **"Notificaciones"**
3. Selecciona **"Permitir"**

### Paso 3: Verificar en la Consola (F12)

Abre la consola del navegador y deberías ver:

```
🖱️ Click en icono de notificaciones
📊 Estado actual de permisos: default
⚠️ Solicitando permisos de notificación...
📋 Usuario respondió: granted
✅ ¡Permisos concedidos! Las notificaciones push ahora funcionarán.
```

### Paso 4: Probar con un Mensaje Real

1. **Envía un mensaje** de WhatsApp a tu número conectado
2. **Deberías ver en la consola:**

```
🔔 Preparando notificación para ticket 123
📊 Estado de permisos: granted
🔍 Verificando permisos... granted
✅ Creando notificación push...
Intentando reproducir sonido de notificación
✓ Sonido de notificación reproducido
✓ Notificación push creada exitosamente
```

3. **Deberías recibir:**
   - 🔊 **Sonido de alerta**
   - 🔔 **Notificación push del navegador** (aparecerá en la esquina)
   - 📊 **Badge actualizado** con el contador

## 🐛 Si las Notificaciones Push NO aparecen:

### Verificación 1: Estado de Permisos
En la consola, ejecuta:
```javascript
console.log("Permisos:", Notification.permission);
```

**Resultados posibles:**
- `granted` ✅ = Todo bien, las notificaciones deberían funcionar
- `default` ⚠️ = Necesitas hacer clic en el icono de campana y aceptar
- `denied` 🚫 = Bloqueadas, debes habilitarlas en configuración del navegador

### Verificación 2: Probar Manualmente
En la consola del navegador:
```javascript
// Probar si las notificaciones funcionan
if (Notification.permission === "granted") {
    new Notification("Prueba", {
        body: "Si ves esto, las notificaciones funcionan!",
        icon: "/logo.jpeg"
    });
} else {
    console.log("Permisos no concedidos:", Notification.permission);
}
```

### Verificación 3: Configuración del Navegador

**Chrome/Edge:**
1. Ve a `chrome://settings/content/notifications`
2. Busca `localhost:3000` en la lista
3. Debe estar en **"Permitidos"**

**Firefox:**
1. Ve a `about:preferences#privacy`
2. Busca "Permisos" → "Notificaciones" → "Configuración"
3. Verifica que `localhost:3000` tenga permisos

### Verificación 4: Sistema Operativo

**Windows 10/11:**
1. Ve a Configuración → Sistema → Notificaciones
2. Asegúrate de que las notificaciones estén activadas
3. Verifica que tu navegador tenga permisos para mostrar notificaciones

**No Molestar:**
- Verifica que el modo "No molestar" esté desactivado

## 🎯 Indicadores Visuales

En el icono de notificaciones (campana):
- 🔔 **Campana normal** = Notificaciones funcionando
- 🔕 **Campana tachada** = Notificaciones bloqueadas
- **Tooltip al pasar el mouse** = Muestra el estado actual

## 📱 Notas Importantes

1. **Primera interacción:** El navegador requiere que hagas clic en la página antes de reproducir sonidos
2. **HTTPS:** En producción, las notificaciones solo funcionan con HTTPS (localhost está exento)
3. **Pestaña en segundo plano:** Las notificaciones funcionan incluso si la pestaña no está activa
4. **Cierre de sesión:** Los permisos se mantienen incluso después de cerrar el navegador

## 🔍 Debug Completo

Si nada funciona, ejecuta este script en la consola para obtener un reporte completo:

```javascript
console.log("=== DIAGNÓSTICO DE NOTIFICACIONES ===");
console.log("Soporte:", "Notification" in window ? "✅ Soportado" : "❌ No soportado");
console.log("Permisos:", Notification.permission);
console.log("URL:", window.location.href);
console.log("Protocolo:", window.location.protocol);
console.log("===================================");

// Intentar solicitar permisos
if (Notification.permission === "default") {
    Notification.requestPermission().then(p => {
        console.log("Respuesta del usuario:", p);
    });
}
```

---

**Última actualización:** Diciembre 4, 2025
