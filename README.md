# Propaganda CRM

Sistema de CRM y Chat de WhatsApp de alto rendimiento construido con Next.js 14, PostgreSQL y Redis.

## Requisitos Previos

- Docker y Docker Compose
- Un número de teléfono con WhatsApp para escanear el QR

## Estructura del Proyecto

- **App**: Next.js 14 (Frontend + API Routes)
- **Worker**: Proceso Node.js independiente para mantener la conexión de WhatsApp
- **Base de Datos**: PostgreSQL 15
- **Caché**: Redis 7

## Instalación en VPS

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/ricardoalejandro/Propaganda.git
   cd Propaganda
   ```

2. **Configurar variables de entorno**:
   Copiar `.env.example` a `.env` (si existe) o crear `.env` con:
   ```env
   DATABASE_URL="postgresql://admin:admin123@postgres:5432/propaganda?schema=public"
   REDIS_URL="redis://redis:6379"
   WHATSAPP_SESSION_PATH="/app/.wwebjs_auth"
   NODE_ENV="production"
   ```

3. **Iniciar con Docker Compose**:
   ```bash
   docker-compose up -d --build
   ```

4. **Verificar logs**:
   ```bash
   docker-compose logs -f app
   ```
   Busca el mensaje "QR Code received" o el código QR en la terminal si no se muestra en la web.

5. **Acceder a la aplicación**:
   Abre tu navegador en `http://TU-IP-VPS:3000`.

## Solución de Problemas

- **Error de permisos Docker**: Asegúrate de que tu usuario esté en el grupo docker: `sudo usermod -aG docker $USER`.
- **QR no carga**: Revisa los logs de la aplicación para ver si el worker está generando el QR.
- **Base de datos**: Si hay errores de conexión, verifica que el contenedor `postgres` esté saludable (`docker ps`).

## Desarrollo Local

1. Instalar dependencias: `npm install`
2. Iniciar base de datos: `docker-compose up -d postgres redis`
3. Generar cliente Prisma: `npx prisma generate`
4. Sincronizar DB: `npx prisma db push`
5. Iniciar app: `npm run dev`
6. Iniciar worker (en otra terminal): `npm run whatsapp`
