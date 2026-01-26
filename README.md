# Propaganda

Repositorio limpio - Proyecto en desarrollo.
- **QR no carga**: Revisa los logs de la aplicación para ver si el worker está generando el QR.
- **Base de datos**: Si hay errores de conexión, verifica que el contenedor `postgres` esté saludable (`docker ps`).

## Desarrollo Local

1. Instalar dependencias: `npm install`
2. Iniciar base de datos: `docker-compose up -d postgres redis`
3. Generar cliente Prisma: `npx prisma generate`
4. Sincronizar DB: `npx prisma db push`
5. Iniciar app: `npm run dev`
6. Iniciar worker (en otra terminal): `npm run whatsapp`
