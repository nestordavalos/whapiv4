# WHAPI v4

Plataforma de atención y tickets sobre WhatsApp inspirada en Whaticket, con backend Node/TypeScript y frontend React (Vite). Aquí encontrarás cómo preparar el entorno, correr el proyecto y aplicar migraciones/semillas de la base de datos.

## Requisitos
- Node.js 18+ y npm (LTS recomendado; Vite 5 requiere >=18).  
- MariaDB/MySQL 10.6+ (por defecto se usa `whapi`).  
- Google Chrome/Chromium instalado (el backend usa `CHROME_BIN` para WhatsApp Web).  
- Docker y Docker Compose (opcional pero recomendado para levantar todo rápido).  
- Puertos libres: backend `8080`, frontend `3333`, base de datos `3306` (ajusta en los `.env` si necesitas otros).

## Estructura rápida
- `backend`: API Express + Sequelize + jobs de WhatsApp.  
- `frontend`: SPA React + Vite.  
- `docker-compose.yaml`: levanta backend, frontend y MariaDB.  
- `docker-compose.browserless.yaml`: agrega Browserless/Chrome remoto (opcional).  
- `docker-compose.phpmyadmin.yaml`: agrega phpMyAdmin (opcional).  
- `.env.example` (raíz), `backend/.env.example`, `frontend/.env`: plantillas de configuración.

## Arranque rápido con Docker
1) Clona el repositorio y entra a la carpeta raíz.  
2) Copia los `.env` de ejemplo y completa valores mínimos (dominios/puertos/secretos):  
   - `cp .env.example .env` (variables para Docker: `MYSQL_*`, `BACKEND_URL`, `FRONTEND_URL`, puertos).  
   - `cp backend/.env.example backend/.env` (config DB, JWT, storage y ajustes de WhatsApp).  
   - Crea/edita `frontend/.env` (o `.env.local`) con:
     ```bash
     VITE_BACKEND_URL=http://localhost:8080
     VITE_PAGE_TITLE=WHAPI
     VITE_PORT=3000
     ```
3) Levanta los contenedores base (backend, frontend, MySQL):  
   ```bash
   docker compose up -d
   ```
   - Con Browserless: `docker compose -f docker-compose.yaml -f docker-compose.browserless.yaml up -d`  
   - Con phpMyAdmin: `docker compose -f docker-compose.yaml -f docker-compose.phpmyadmin.yaml up -d`
4) Aplica migraciones y semillas (si el backend ya está arriba):  
   ```bash
   docker compose exec backend npx sequelize db:migrate
   docker compose exec backend npx sequelize db:seed:all
   ```
5) Accesos locales por defecto: backend `http://localhost:8080`, frontend `http://localhost:3333`.

## Instalación manual (sin Docker)
### Backend (`backend/`)
1) Crea la base de datos:
   ```bash
   CREATE DATABASE whapi CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
   ```
2) Copia el env y completa los campos clave (DB, JWT, URLs, `CHROME_BIN`, storage):
   ```bash
   cp backend/.env.example backend/.env
   ```
3) Instala dependencias y compila:
   ```bash
   cd backend
   npm install
   npm run build
   ```
4) Ejecuta migraciones y semillas:
   ```bash
   npx sequelize db:migrate
   npx sequelize db:seed:all
   ```
5) Levanta el servicio:  
   - Desarrollo: `npm run dev` (hot reload).  
   - Producción: `node dist/server.js` (tras `npm run build`) o administra con PM2.

### Frontend (`frontend/`)
1) Define el backend en `frontend/.env`:
   ```bash
   VITE_BACKEND_URL=http://localhost:8080
   VITE_PAGE_TITLE=WHAPI
   VITE_PORT=3000
   ```
2) Instala y ejecuta:
   ```bash
   cd frontend
   npm install
   npm run dev -- --host --port %VITE_PORT%   # servidor de desarrollo
   # ó build de producción:
   npm run build && npm run preview
   ```

## Migraciones y datos de ejemplo
- Aplicar migraciones: `npx sequelize db:migrate`  
- Revertir última: `npx sequelize db:migrate:undo`  
- Semillas iniciales: `npx sequelize db:seed:all`  
- Usuario creado por la semilla por defecto: `admin@admin.com` / contraseña `admin` (cámbiala al ingresar).

## Variables importantes
- Raíz (`.env`): `MYSQL_*`, `BACKEND_URL`, `FRONTEND_URL`, puertos para compose.  
- Backend (`backend/.env`): `DB_*`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `USER_LIMIT`, `CONNECTIONS_LIMIT`, `STORAGE_*`, parámetros `WHATSAPP_*`, `CHROME_BIN`.  
- Frontend (`frontend/.env`): `VITE_BACKEND_URL`, `VITE_PAGE_TITLE`, `VITE_PORT`.

## Scripts útiles
- Backend: `npm run dev`, `npm run build`, `npm test`, `npm run lint`.  
- Frontend: `npm run dev`, `npm run build`, `npm run lint`.  
- Detener y limpiar Docker: `docker compose down` (agrega `-v` si quieres borrar volúmenes de datos).

## Notas
- Ajusta `PROXY_PORT`/`FRONTEND_SERVER_NAME`/`BACKEND_SERVER_NAME` si servirás detrás de Nginx/SSL.  
- Si cambias el almacenamiento a S3/S3 compatible, revisa la sección `STORAGE_*` en `backend/.env`.  
- Para ejecutar con Browserless remoto, define `CHROME_WS` o usa el `docker-compose.browserless.yaml` incluido.
