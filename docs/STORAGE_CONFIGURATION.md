# Storage Configuration Guide

Este documento describe cómo configurar el almacenamiento de archivos multimedia en el sistema. El sistema soporta tres tipos de almacenamiento:

- **Local**: Almacenamiento en el servidor (default)
- **S3**: Amazon Web Services S3
- **S3 Compatible**: Servicios compatibles con S3 (MinIO, DigitalOcean Spaces, Cloudflare R2, Backblaze B2, etc.)

## Índice

1. [Configuración Básica](#configuración-básica)
2. [Configuración AWS S3](#configuración-aws-s3)
3. [Configuración S3 Compatible](#configuración-s3-compatible)
4. [Fallback y Sincronización](#fallback-y-sincronización)
5. [Migración de Archivos](#migración-de-archivos)
6. [API de Storage](#api-de-storage)
7. [Ejemplos de Configuración](#ejemplos-de-configuración)

---

## Configuración Básica

Las variables de entorno se configuran en el archivo `.env` del backend:

```env
# Tipo de almacenamiento: local | s3 | s3_compatible
STORAGE_TYPE=local

# Habilitar fallback a local cuando S3 no esté disponible
STORAGE_FALLBACK_TO_LOCAL=true
```

---

## Configuración AWS S3

Para usar Amazon S3 como almacenamiento:

```env
STORAGE_TYPE=s3
STORAGE_S3_BUCKET=mi-bucket-whatsapp
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY=AKIAXXXXXXXXXXXXXXXX
STORAGE_S3_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Crear bucket en AWS S3

1. Accede a la consola de AWS S3
2. Crea un nuevo bucket
3. Configura los permisos CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

4. Configura la política del bucket para acceso público de lectura:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::mi-bucket-whatsapp/*"
    }
  ]
}
```

---

## Configuración S3 Compatible

### MinIO

```env
STORAGE_TYPE=s3_compatible
STORAGE_S3_BUCKET=whatsapp-media
STORAGE_S3_REGION=us-east-1
STORAGE_S3_ACCESS_KEY=minioadmin
STORAGE_S3_SECRET_KEY=minioadmin
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_FORCE_PATH_STYLE=true
```

### DigitalOcean Spaces

```env
STORAGE_TYPE=s3_compatible
STORAGE_S3_BUCKET=mi-space
STORAGE_S3_REGION=nyc3
STORAGE_S3_ACCESS_KEY=DOXXXXXXXXXXXXXXXX
STORAGE_S3_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STORAGE_S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
STORAGE_S3_FORCE_PATH_STYLE=false
STORAGE_S3_PUBLIC_URL=https://mi-space.nyc3.cdn.digitaloceanspaces.com
```

### Cloudflare R2

```env
STORAGE_TYPE=s3_compatible
STORAGE_S3_BUCKET=whatsapp-media
STORAGE_S3_REGION=auto
STORAGE_S3_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STORAGE_S3_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STORAGE_S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
STORAGE_S3_FORCE_PATH_STYLE=true
STORAGE_S3_PUBLIC_URL=https://mi-dominio.com
```

### Backblaze B2

```env
STORAGE_TYPE=s3_compatible
STORAGE_S3_BUCKET=whatsapp-media
STORAGE_S3_REGION=us-west-004
STORAGE_S3_ACCESS_KEY=keyID
STORAGE_S3_SECRET_KEY=applicationKey
STORAGE_S3_ENDPOINT=https://s3.us-west-004.backblazeb2.com
STORAGE_S3_FORCE_PATH_STYLE=false
```

---

## Fallback y Sincronización

Cuando `STORAGE_FALLBACK_TO_LOCAL=true` y el almacenamiento S3 no está disponible:

1. Los archivos se guardan localmente en `/public`
2. Se registran en la tabla `PendingUploads`
3. Un servicio de sincronización automático (cada 5 minutos) intenta subir los archivos pendientes
4. Una vez sincronizados, se marcan como `completed`

### Estados de sincronización

- `pending`: Archivo guardado localmente, pendiente de subir
- `syncing`: Subida en progreso
- `completed`: Archivo subido exitosamente a S3
- `failed`: Error en la subida (se reintentará hasta 5 veces)

---

## Migración de Archivos

La API incluye endpoints para migrar archivos entre almacenamientos.

### Migrar de Local a S3

```bash
# Iniciar migración (en segundo plano)
POST /storage/migration/to-s3
{
  "dryRun": false,
  "deleteLocalAfterMigration": false
}
```

### Migrar de S3 a Local

```bash
POST /storage/migration/to-local
{
  "dryRun": false
}
```

### Verificar migración

```bash
GET /storage/migration/verify
```

### Limpiar archivos locales después de migración

```bash
POST /storage/migration/cleanup
```

---

## API de Storage

### Endpoints de Estado

```bash
# Obtener estado del storage
GET /storage/status

# Respuesta:
{
  "type": "s3",
  "fallbackEnabled": true,
  "isPrimaryHealthy": true,
  "localDirectory": "./public",
  "s3Configured": true
}
```

### Endpoints de Migración

```bash
# Estado de migración
GET /storage/migration/status

# Iniciar migración a S3
POST /storage/migration/to-s3
Body: { "dryRun": boolean, "deleteLocalAfterMigration": boolean }

# Iniciar migración a local
POST /storage/migration/to-local
Body: { "dryRun": boolean }

# Cancelar migración
POST /storage/migration/cancel

# Verificar migración
GET /storage/migration/verify

# Limpiar archivos locales migrados
POST /storage/migration/cleanup
```

### Endpoints de Sincronización

```bash
# Estado de sincronización
GET /storage/sync/status

# Forzar sincronización manual
POST /storage/sync/trigger
Body: { "deleteLocalAfterSync": boolean }

# Reintentar archivo específico
POST /storage/sync/retry/:filename

# Lista de archivos pendientes
GET /storage/sync/pending

# Limpiar registros completados
DELETE /storage/sync/completed
```

### Endpoints de Archivos

```bash
# Listar archivos locales
GET /storage/local/files
```

---

## Ejemplos de Configuración

### Configuración mínima para producción con AWS S3

```env
STORAGE_TYPE=s3
STORAGE_S3_BUCKET=prod-whatsapp-media
STORAGE_S3_REGION=sa-east-1
STORAGE_S3_ACCESS_KEY=AKIAXXXXXXXXXXXXXXXX
STORAGE_S3_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STORAGE_FALLBACK_TO_LOCAL=true
```

### Configuración para desarrollo con MinIO

```yaml
# docker-compose.minio.yaml
version: '3.8'
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  minio_data:
```

```env
STORAGE_TYPE=s3_compatible
STORAGE_S3_BUCKET=whatsapp-dev
STORAGE_S3_ACCESS_KEY=minioadmin
STORAGE_S3_SECRET_KEY=minioadmin
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_FORCE_PATH_STYLE=true
```

---

## Solución de Problemas

### El archivo no se muestra en el chat

1. Verificar que la URL del archivo sea accesible públicamente
2. Verificar los permisos CORS del bucket
3. Revisar `STORAGE_S3_PUBLIC_URL` si se usa CDN

### Los archivos no se sincronizan

1. Verificar credenciales de S3
2. Revisar logs del servidor
3. Verificar tabla `PendingUploads`
4. Forzar sincronización manual: `POST /storage/sync/trigger`

### Error de conexión a S3

1. Verificar `STORAGE_S3_ENDPOINT` para servicios S3-compatible
2. Verificar `STORAGE_S3_FORCE_PATH_STYLE` (true para MinIO)
3. Verificar conectividad de red al endpoint

---

## Estructura de Archivos

```
backend/src/
├── config/
│   └── storage.ts              # Configuración de storage
├── models/
│   └── PendingUpload.ts        # Modelo para archivos pendientes
├── services/
│   └── StorageServices/
│       ├── StorageProvider.ts      # Interface abstracta
│       ├── LocalStorageProvider.ts # Implementación local
│       ├── S3StorageProvider.ts    # Implementación S3
│       ├── StorageService.ts       # Servicio principal con fallback
│       ├── StorageMigrationService.ts # Servicio de migración
│       └── StorageSyncService.ts   # Servicio de sincronización
├── controllers/
│   └── StorageController.ts    # Controlador de API
└── routes/
    └── storageRoutes.ts        # Rutas de API
```
