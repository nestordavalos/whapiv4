# 📮 Configuración de Postman para WhatsApp API

Esta guía te ayudará a configurar y usar la colección de Postman para probar la API de WhatsApp.

## 📥 Archivos Incluidos

- **WhatsApp_API_Collection.postman_collection.json** - Colección completa con todos los endpoints
- **WhatsApp_API.postman_environment.json** - Variables de entorno configurables

## 🚀 Importar en Postman

### Opción 1: Importar desde archivos

1. Abre Postman
2. Haz clic en **Import** (arriba a la izquierda)
3. Arrastra los archivos JSON o selecciónalos:
   - `WhatsApp_API_Collection.postman_collection.json`
   - `WhatsApp_API.postman_environment.json`
4. Haz clic en **Import**

### Opción 2: Importar desde URL (si están en un repositorio)

1. En Postman, haz clic en **Import**
2. Selecciona la pestaña **Link**
3. Pega la URL del archivo raw de GitHub
4. Haz clic en **Continue** > **Import**

## ⚙️ Configurar el Environment

1. En Postman, selecciona el environment **"WhatsApp API - Local"** del dropdown (arriba a la derecha)
2. Haz clic en el ícono del ojo 👁️ junto al dropdown
3. Haz clic en **Edit**
4. Configura las variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `BASE_URL` | URL base de tu API | `http://localhost:8080` |
| `API_TOKEN` | Tu token de API | Obtenerlo desde el panel de administración |
| `TEST_NUMBER` | Número de prueba | `595991234567` |
| `WHATSAPP_ID` | ID de conexión de WhatsApp | `1` o `2` |
| `QUEUE_ID` | ID de la cola | `1` |
| `TICKET_ID` | ID del ticket (se puede guardar de las respuestas) | `123` |
| `MESSAGE_ID` | ID del mensaje (se puede guardar de las respuestas) | `3EB0ABC123` |

5. Haz clic en **Save**

## 🔑 Obtener tu API Token

1. Accede al panel de administración de WhatsApp
2. Ve a **Configuraciones** > **API Token**
3. Copia el token
4. Pégalo en la variable `API_TOKEN` del environment

## 📂 Estructura de la Colección

La colección está organizada en carpetas:

### 1. **API Original (/api)**
- Enviar Mensaje de Texto
- Enviar Mensaje con Multimedia
- Listar Colas

### 2. **Tickets**
- Listar Tickets
- Obtener Ticket
- Crear Ticket
- Actualizar Ticket

### 3. **Mensajes**
- Listar Mensajes de Ticket
- Enviar Mensaje de Texto
- Enviar Multimedia (Archivo)
- Enviar Multimedia desde URL
- **Enviar Multimedia desde Base64** ⭐ (Nuevo)
- Responder Mensaje (Texto)
- Responder Mensaje (URL)
- Responder Mensaje (Archivo)
- **Responder Mensaje (Base64)** ⭐ (Nuevo)

### 4. **Envío Directo**
- Enviar a Número (Texto)
- Enviar a Número (URL)
- Enviar a Número (Archivo)
- **Enviar a Número (Base64)** ⭐ (Nuevo)

### 5. **Contactos**
- Obtener Contacto
- Validar Contacto
- Crear o Actualizar Contacto

### 6. **Conexiones**
- Listar Conexiones
- Obtener Estado de Conexión

## 🎯 Ejemplos de Uso

### Enviar imagen desde Base64

1. Convierte tu imagen a base64 (puedes usar https://base64.guru/converter/encode/image)
2. Abre el request **"Enviar Multimedia desde Base64"**
3. Reemplaza el `base64Data` con tu imagen en base64
4. Ajusta el `mimeType` según tu archivo:
   - Imagen PNG: `image/png`
   - Imagen JPEG: `image/jpeg`
   - PDF: `application/pdf`
   - Video MP4: `video/mp4`
5. Haz clic en **Send**

#### Ejemplo de body para Base64:

```json
{
  "base64Data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "mimeType": "image/png",
  "body": "Esta es una imagen de prueba",
  "filename": "test.png",
  "quotedMsgId": null
}
```

**Nota:** El `base64Data` puede incluir o no el prefijo `data:image/png;base64,`. El sistema lo limpiará automáticamente.

### Enviar archivo adjunto

1. Abre el request **"Enviar Multimedia (Archivo)"**
2. En la pestaña **Body**, selecciona **form-data**
3. En el campo `medias`, selecciona tu archivo
4. Haz clic en **Send**

### Enviar desde URL

1. Abre el request **"Enviar Multimedia desde URL"**
2. Reemplaza el `mediaUrl` con tu URL
3. Haz clic en **Send**

## 💡 Tips

### Guardar IDs automáticamente

Puedes configurar scripts en Postman para guardar automáticamente los IDs de las respuestas:

1. En un request que cree un ticket, ve a la pestaña **Tests**
2. Agrega este script:

```javascript
// Guardar el ticketId en las variables de entorno
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    if (jsonData.ticketId) {
        pm.environment.set("TICKET_ID", jsonData.ticketId);
    }
    if (jsonData.data && jsonData.data[0] && jsonData.data[0].messageId) {
        pm.environment.set("MESSAGE_ID", jsonData.data[0].messageId);
    }
}
```

### Tipos MIME comunes

| Tipo de Archivo | MIME Type |
|-----------------|-----------|
| PNG | `image/png` |
| JPEG/JPG | `image/jpeg` |
| GIF | `image/gif` |
| WebP | `image/webp` |
| PDF | `application/pdf` |
| Word (docx) | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Excel (xlsx) | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| MP4 | `video/mp4` |
| MP3 | `audio/mpeg` |
| WAV | `audio/wav` |

### Convertir archivos a Base64

**Opción 1 - Online:**
- https://base64.guru/converter/encode/image
- https://www.base64encode.org/

**Opción 2 - Node.js:**
```javascript
const fs = require('fs');
const base64 = fs.readFileSync('imagen.png', 'base64');
console.log(base64);
```

**Opción 3 - Python:**
```python
import base64

with open('imagen.png', 'rb') as f:
    base64_data = base64.b64encode(f.read()).decode('utf-8')
    print(base64_data)
```

**Opción 4 - Bash:**
```bash
base64 -i imagen.png
```

## 🔧 Troubleshooting

### Error 401 - Unauthorized
- Verifica que el `API_TOKEN` esté configurado correctamente
- Verifica que el token no haya expirado

### Error 404 - Not Found
- Verifica que el `BASE_URL` sea correcto
- Verifica que los IDs de ticket/mensaje existan

### Error 400 - Base64 inválido
- Verifica que el base64 esté correctamente formateado
- Verifica que el `mimeType` sea correcto para el tipo de archivo

### La imagen no se visualiza
- Verifica que el base64 esté completo (sin cortes)
- Verifica que el `mimeType` coincida con el tipo de archivo real
- Intenta con una imagen más pequeña primero

## 📚 Recursos Adicionales

- [Documentación completa de la API](./API_DOCUMENTATION.md)
- [Postman Documentation](https://learning.postman.com/docs/getting-started/introduction/)
- [Base64 Encoding Guide](https://developer.mozilla.org/en-US/docs/Glossary/Base64)

## 🆘 Soporte

Si encuentras problemas:
1. Revisa la documentación de la API
2. Verifica los logs del backend
3. Usa el Postman Console (View > Show Postman Console) para ver detalles de las requests

---

*Última actualización: Enero 2026*
