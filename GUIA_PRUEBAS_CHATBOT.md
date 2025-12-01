# 🚀 Guía Rápida: Probar Mejoras de Chatbot

## ⚡ Pasos para Activar y Probar

### 1️⃣ **Ejecutar Migración de Base de Datos**

```bash
cd backend
npx sequelize-cli db:migrate
```

**Resultado esperado:**
```
== 20251130164223-add-mediaPath-to-chatbot: migrating =======
== 20251130164223-add-mediaPath-to-chatbot: migrated (0.123s)
```

---

### 2️⃣ **Iniciar Backend**

```bash
cd backend
npm run dev
```

**Verificar:** Backend corriendo en `http://localhost:8080`

---

### 3️⃣ **Iniciar Frontend**

```bash
cd frontend
npm start
```

**Verificar:** Frontend corriendo en `http://localhost:3000`

---

### 4️⃣ **Probar la Nueva Interfaz**

#### **Paso a paso:**

1. **Ir a Configuración → Colas (Queues)**

2. **Editar o crear una cola**

3. **Bajar hasta "Opciones para chatbot"**

4. **Click en "Añadir nueva opción"**
   - ✅ Se abre un Accordion (no Stepper)
   - ✅ Formulario completo visible

5. **Completar los campos:**
   ```
   Nombre: Ventas
   Switch: ☐ Transferir a agente humano
   Mensaje: "Hola, ¿en qué puedo ayudarte con ventas?"
   ```

6. **Agregar Multimedia (opcional):**
   - Click en "Seleccionar archivo"
   - Elegir una imagen (ej: logo.png)
   - ✅ Debe aparecer "Cargando..."
   - ✅ Luego chip "Archivo adjunto"
   - ✅ Preview de la imagen

7. **Guardar:**
   - Click en botón "Guardar"
   - ✅ Accordion se cierra
   - ✅ Badge "Media" visible si tiene archivo

8. **Verificar vista colapsada:**
   ```
   ▼ Ventas [Media] [✏️] [🗑️]
   ```

---

## 🧪 **Pruebas Recomendadas**

### ✅ **Prueba 1: Opción Simple**
- Nombre: "Opción 1"
- Mensaje: "Mensaje de prueba"
- Sin multimedia
- **Resultado:** Debe guardarse correctamente

### ✅ **Prueba 2: Con Imagen**
- Nombre: "Con Imagen"
- Mensaje: "Mira esta imagen"
- Multimedia: imagen.jpg (< 20MB)
- **Resultado:** Imagen sube, preview se muestra

### ✅ **Prueba 3: Archivo Grande**
- Intentar subir archivo de 25MB
- **Resultado:** Error "Archivo muy grande. Máximo 20MB"

### ✅ **Prueba 4: Archivo No Permitido**
- Intentar subir archivo .exe o .zip
- **Resultado:** Error "Tipo de archivo no permitido"

### ✅ **Prueba 5: Con Agente**
- Activar switch "Transferir a agente humano"
- **Resultado:** Badge "Agente" aparece en vista colapsada

### ✅ **Prueba 6: Editar Existente**
- Click en ícono de editar (lápiz)
- Cambiar nombre y mensaje
- Guardar
- **Resultado:** Cambios aplicados correctamente

### ✅ **Prueba 7: Eliminar Multimedia**
- En opción con archivo adjunto
- Click en X del chip "Archivo adjunto"
- **Resultado:** Archivo removido, chip desaparece

### ✅ **Prueba 8: Sub-opciones (Recursivo)**
- Crear opción principal
- Guardar
- Dentro de esa opción, agregar sub-opción
- **Resultado:** Árbol de opciones funciona correctamente

---

## 🎨 **Diferencias Visuales Esperadas**

### **ANTES (Stepper):**
```
┌────────────────────────────┐
│ ► 1. Opción 1              │
│   [Edit] [Save] [Delete]   │
│   ↓                        │
│   Message: ...             │
│   [Edit message]           │
│                            │
│ ► 2. Opción 2              │
└────────────────────────────┘
```

### **AHORA (Accordion):**
```
┌────────────────────────────────────┐
│ ▼ Ventas [Agente] [Media] [✏️] [🗑️] │
│  ┌────────────────────────────┐    │
│  │ Nombre: Ventas             │    │
│  │ ☑️ Transferir a agente     │    │
│  │ ─────────────────────      │    │
│  │ Mensaje:                   │    │
│  │ "Hola, ¿en qué..."         │    │
│  │ ─────────────────────      │    │
│  │ Multimedia:                │    │
│  │ [📎] logo.png [x]          │    │
│  │ [img preview]              │    │
│  │                            │    │
│  │ [Cancelar] [💾 Guardar]    │    │
│  └────────────────────────────┘    │
└────────────────────────────────────┘
```

---

## 📊 **Verificar en Base de Datos**

### **Consulta SQL:**
```sql
SELECT id, name, greetingMessage, mediaPath, isAgent 
FROM Chatbots 
WHERE queueId = 1;
```

### **Resultado esperado:**
```
| id | name   | greetingMessage      | mediaPath        | isAgent |
|----|--------|----------------------|------------------|---------|
| 1  | Ventas | "Hola, ¿en qué..."  | 1733004123456.jpg| 0       |
| 2  | Soporte| "Bienvenido..."     | NULL             | 1       |
```

---

## 🐛 **Troubleshooting**

### **Problema 1: "Archivo muy grande" con archivo pequeño**
**Solución:** Verificar que el backend tenga configurado el límite correcto en `upload.ts`

### **Problema 2: No se muestra preview de imagen**
**Solución:** Verificar que `REACT_APP_BACKEND_URL` esté configurado en `.env` del frontend

### **Problema 3: Error 404 al subir archivo**
**Solución:** Verificar que el endpoint `/messages/media-upload` exista y funcione

### **Problema 4: Accordion no se expande**
**Solución:** Refrescar página, verificar consola de errores

### **Problema 5: Cambios no se guardan**
**Solución:** Verificar que el servicio `UpdateChatBotServices` esté correcto

---

## 📸 **Capturas de Pantalla Esperadas**

### **1. Vista Colapsada:**
- Nombre de opción visible
- Badges "Agente" y "Media" si aplica
- Botones editar y eliminar

### **2. Vista Expandida (Editando):**
- Formulario completo
- Switch de agente
- Campo de mensaje multiline
- Botón "Seleccionar archivo"
- Preview de imagen (si aplica)
- Botones Cancelar y Guardar

### **3. Con Archivo Adjunto:**
- Chip "Archivo adjunto" visible
- Botón X para eliminar
- Preview de imagen debajo

---

## 🎯 **Checklist de Funcionalidad**

### **Funcionalidades Básicas:**
- [ ] Crear nueva opción
- [ ] Editar opción existente
- [ ] Eliminar opción
- [ ] Accordion se expande/colapsa

### **Funcionalidades de Multimedia:**
- [ ] Seleccionar archivo
- [ ] Validación de tamaño (20MB)
- [ ] Validación de tipo
- [ ] Upload a servidor
- [ ] Preview de imagen
- [ ] Eliminar archivo
- [ ] Chip "Media" visible

### **Funcionalidades Avanzadas:**
- [ ] Switch "Transferir a agente"
- [ ] Badge "Agente" visible
- [ ] Sub-opciones funcionan
- [ ] Guardar y cerrar accordion
- [ ] Cancelar sin guardar

---

## 💡 **Tips de Uso**

1. **Para agregar imagen de bienvenida:**
   - Crear opción con nombre descriptivo
   - Agregar mensaje de texto
   - Subir imagen representativa

2. **Para menú con imágenes:**
   ```
   Opción 1: Productos [imagen: catalogo.jpg]
   Opción 2: Servicios [imagen: servicios.png]
   Opción 3: Contacto [imagen: contacto.jpg]
   ```

3. **Para tutoriales en video:**
   - Crear opción "Tutorial"
   - Subir video explicativo (MP4)
   - Usuario recibirá video automáticamente

---

## 🚀 **Siguientes Pasos**

1. ✅ Probar todas las funcionalidades básicas
2. ✅ Subir diferentes tipos de archivos
3. ✅ Verificar en BD que `mediaPath` se guarda
4. ✅ Probar en diferentes navegadores
5. ⚠️ Hacer backup de BD antes de migración en producción

---

## 📞 **Si Algo No Funciona**

1. **Revisar logs del backend:**
   ```bash
   cd backend
   npm run dev
   # Ver errores en consola
   ```

2. **Revisar consola del navegador:**
   - F12 → Consola
   - Buscar errores en rojo

3. **Verificar migración:**
   ```bash
   cd backend
   npx sequelize-cli db:migrate:status
   ```

4. **Revisar permisos:**
   - Carpeta `backend/public/` debe tener permisos de escritura

---

*¡Disfruta de las mejoras!* 🎉
