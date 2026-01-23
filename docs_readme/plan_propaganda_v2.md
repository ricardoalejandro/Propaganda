# Plan: Propaganda v2 - CRM WhatsApp estilo Kommo

## 📊 Resumen Ejecutivo

**Objetivo:** Transformar Propaganda en un CRM WhatsApp similar a Kommo, integrado con `difusion.naperu.cloud` como motor de WhatsApp.

**Cambios principales:**
- ❌ Eliminar: worker whatsapp-web.js, lógica antigua
- ✅ Mantener: Infraestructura (Docker, PostgreSQL, Redis, Next.js, Traefik)
- ✅ Integrar: API de difusion.naperu.cloud (go-whatsapp-web-multidevice)
- ✅ Nuevo: Sistema de embudos tipo Kommo

---

## 🎯 Alcance

- [x] Frontend (nuevo diseño)
- [x] Backend (nuevos endpoints)
- [x] Base de Datos (nuevo schema)
- [x] Integración con difusion.naperu.cloud

---

## 📐 Diseño UI/UX - Estilo Kommo

### Layout Principal

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Búsqueda Global | Notificaciones | Usuario          │
├─────────────┬───────────────────────────────────────────────────────┤
│             │                                                        │
│  SIDEBAR    │   CONTENIDO PRINCIPAL                                 │
│             │                                                        │
│  ┌───────┐  │   Según sección activa:                               │
│  │ Home  │  │   - Conexiones (grid de cuentas WA)                   │
│  │ Leads │  │   - Leads (kanban de embudos)                         │
│  │ Inbox │  │   - Inbox (lista de chats + chat activo)              │
│  │ Stats │  │   - Estadísticas                                      │
│  └───────┘  │                                                        │
│             │                                                        │
│  CUENTAS    │                                                        │
│  ┌───────┐  │                                                        │
│  │ +51.. │  │                                                        │
│  │ +51.. │  │                                                        │
│  └───────┘  │                                                        │
└─────────────┴───────────────────────────────────────────────────────┘
```

### Módulo: Conexiones (WhatsApp Accounts)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONEXIONES                                        [+ Nueva Cuenta] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ 🟢 Conectado │  │ 🔴 Desconect │  │ 🟡 Escaneando│               │
│  │              │  │              │  │              │               │
│  │ +51 999...   │  │ +51 888...   │  │    [QR]     │               │
│  │              │  │              │  │              │               │
│  │ Filial: Lima │  │ Filial: Cuz  │  │ Filial: Arq │               │
│  │ Enc: Juan P  │  │ Enc: Maria   │  │ Enc: Carlos │               │
│  │              │  │              │  │              │               │
│  │ [Desconectar]│  │ [Reconectar] │  │ [Cancelar]  │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Módulo: Leads (Kanban estilo Kommo)

```
┌─────────────────────────────────────────────────────────────────────┐
│  EMBUDO: Principal ▼            [+ Crear Embudo]    [Filtros] [⚙️] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  NUEVO  │ │CONTACTO │ │CALIFICA │ │PROPUESTA│ │ CERRADO │       │
│  │   (12)  │ │   (8)   │ │   (5)   │ │   (3)   │ │   (15)  │       │
│  ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤       │
│  │┌───────┐│ │┌───────┐│ │┌───────┐│ │┌───────┐│ │┌───────┐│       │
│  ││Juan P ││ ││Maria L││ ││Carlos ││ ││Ana R  ││ ││Pedro M││       │
│  ││+51999 ││ ││+51888 ││ ││+51777 ││ ││+51666 ││ ││+51555 ││       │
│  ││S/500  ││ ││S/1200 ││ ││S/800  ││ ││S/2500 ││ ││S/1500 ││       │
│  │└───────┘│ │└───────┘│ │└───────┘│ │└───────┘│ │└───────┘│       │
│  │┌───────┐│ │┌───────┐│ │         │ │         │ │┌───────┐│       │
│  ││Rosa T ││ ││Luis V ││ │         │ │         │ ││Sofia G││       │
│  ││+51944 ││ ││+51933 ││ │         │ │         │ ││+51922 ││       │
│  │└───────┘│ │└───────┘│ │         │ │         │ │└───────┘│       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Módulo: Inbox (Chat unificado)

```
┌─────────────────────────────────────────────────────────────────────┐
│  INBOX                      [Todos ▼] [Sin leer (5)] [🔍 Buscar]   │
├─────────────┬───────────────────────────────────────┬───────────────┤
│  CHATS      │   CONVERSACIÓN                        │  PERFIL LEAD │
│             │                                        │               │
│ ┌─────────┐ │  Juan Pérez  🟢                       │ ┌───────────┐ │
│ │🟢 Juan P│ │  +51 999 888 777                      │ │   [IMG]   │ │
│ │Hola qui │ │                                        │ │ Juan Pérez│ │
│ │12:45 (2)│ │  ┌────────────────────┐               │ │+51999...  │ │
│ └─────────┘ │  │ Hola, quisiera     │               │ └───────────┘ │
│ ┌─────────┐ │  │ información...     │  12:30        │               │
│ │🟡 Maria │ │  └────────────────────┘               │ ETAPA:        │
│ │Gracias  │ │                                        │ [Nuevo ▼]     │
│ │11:20    │ │         ┌────────────────────┐        │               │
│ └─────────┘ │         │ Claro, te cuento   │        │ EMBUDO:       │
│ ┌─────────┐ │         │ que tenemos...     │ 12:32  │ [Principal ▼] │
│ │🔵 Carlos│ │         └────────────────────┘        │               │
│ │Ok perfec│ │                                        │ VALOR:        │
│ │10:15    │ │  ┌────────────────────┐               │ [S/ 500    ]  │
│ └─────────┘ │  │ Perfecto! Y el     │               │               │
│             │  │ precio?            │  12:45        │ ORIGEN:       │
│             │  └────────────────────┘               │ +51 999 (Lima)│
│             │                                        │               │
│             ├────────────────────────────────────────│ NOTAS:        │
│             │ [📎] [Escribir mensaje...]    [Enviar]│ [+ Agregar]   │
└─────────────┴───────────────────────────────────────┴───────────────┘
```

---

## 🗄️ Cambios en Base de Datos

### Schema Prisma Nuevo (COMPLETO)

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// MÓDULO: CONEXIONES WHATSAPP
// ============================================

model WhatsAppAccount {
  id          String   @id @default(uuid())
  deviceId    String   @unique // ID del dispositivo en difusion.naperu.cloud
  phoneNumber String?  // Se obtiene después de conectar
  displayName String?  // Nombre mostrado en WA
  status      AccountStatus @default(DISCONNECTED)
  
  // Metadatos personalizados
  filial      String?  // Sucursal/filial
  encargado   String?  // Persona responsable
  
  // Timestamps
  connectedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  conversations Conversation[]
  
  @@index([status])
  @@index([phoneNumber])
}

enum AccountStatus {
  CONNECTED
  DISCONNECTED
  SCANNING
  ERROR
}

// ============================================
// MÓDULO: EMBUDOS (FUNNELS)
// ============================================

model Funnel {
  id          String   @id @default(uuid())
  name        String
  description String?
  color       String   @default("#6366f1") // Color del embudo
  isDefault   Boolean  @default(false) // Embudo principal "Leads"
  position    Int      @default(0) // Orden de los embudos
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  stages      FunnelStage[]
  leads       Lead[]
  
  @@index([isDefault])
}

model FunnelStage {
  id          String   @id @default(uuid())
  funnelId    String
  name        String
  color       String   @default("#94a3b8")
  position    Int      @default(0) // Orden dentro del embudo
  isWon       Boolean  @default(false) // Etapa de "ganado"
  isLost      Boolean  @default(false) // Etapa de "perdido"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  funnel      Funnel   @relation(fields: [funnelId], references: [id], onDelete: Cascade)
  leads       Lead[]
  
  @@index([funnelId])
  @@index([position])
}

// ============================================
// MÓDULO: LEADS / CONTACTOS
// ============================================

model Lead {
  id          String   @id @default(uuid())
  
  // Información del contacto
  phoneNumber String   // Número de WhatsApp (único por embudo)
  name        String?
  profilePic  String?
  
  // Ubicación en embudo
  funnelId    String
  stageId     String
  position    Int      @default(0) // Posición dentro de la etapa
  
  // Datos de negocio
  value       Float?   // Valor monetario del lead
  currency    String   @default("PEN")
  
  // Origen
  sourceAccountId String // Cuenta WA de donde llegó
  
  // Timestamps
  lastContactAt DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  funnel      Funnel   @relation(fields: [funnelId], references: [id])
  stage       FunnelStage @relation(fields: [stageId], references: [id])
  sourceAccount WhatsAppAccount @relation(fields: [sourceAccountId], references: [id])
  conversations Conversation[]
  notes       LeadNote[]
  tags        LeadTag[]
  
  @@unique([phoneNumber, funnelId]) // Un lead único por número+embudo
  @@index([funnelId])
  @@index([stageId])
  @@index([phoneNumber])
  @@index([lastContactAt])
}

model LeadNote {
  id        String   @id @default(uuid())
  leadId    String
  content   String
  createdAt DateTime @default(now())
  
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  
  @@index([leadId])
}

model Tag {
  id        String   @id @default(uuid())
  name      String   @unique
  color     String   @default("#6366f1")
  
  leads     LeadTag[]
}

model LeadTag {
  leadId    String
  tagId     String
  
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@id([leadId, tagId])
}

// ============================================
// MÓDULO: CONVERSACIONES / MENSAJES
// ============================================

model Conversation {
  id           String   @id @default(uuid())
  
  // Identificadores
  accountId    String   // Cuenta WA que maneja esta conversación
  chatJid      String   // JID del chat en WhatsApp
  
  // Info del chat
  isGroup      Boolean  @default(false)
  
  // Contadores
  unreadCount  Int      @default(0)
  lastMessageAt DateTime @default(now())
  
  // Relaciones
  account      WhatsAppAccount @relation(fields: [accountId], references: [id])
  lead         Lead?    @relation(fields: [leadId], references: [id])
  leadId       String?
  messages     Message[]
  
  @@unique([accountId, chatJid])
  @@index([accountId])
  @@index([lastMessageAt])
  @@index([leadId])
}

model Message {
  id             String   @id // ID del mensaje de WhatsApp
  conversationId String
  
  // Contenido
  body           String
  type           String   @default("text") // text, image, video, audio, document, sticker
  
  // Metadata
  fromMe         Boolean
  senderJid      String?  // Quién envió (para grupos)
  senderName     String?
  
  // Media
  hasMedia       Boolean  @default(false)
  mediaUrl       String?
  mediaType      String?
  fileName       String?
  
  // Timestamps
  timestamp      DateTime
  createdAt      DateTime @default(now())
  
  // Relaciones
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
  @@index([timestamp])
}

// ============================================
// CONFIGURACIÓN
// ============================================

model Settings {
  id        String   @id @default("default")
  
  // Configuración de difusion
  difusionUrl       String   @default("https://difusion.naperu.cloud")
  difusionUser      String?
  difusionPassword  String?
  
  // Configuración general
  companyName       String   @default("Mi Empresa")
  defaultCurrency   String   @default("PEN")
  
  updatedAt         DateTime @updatedAt
}
```

---

## 🔌 Backend - Nuevos Endpoints

### 1. Conexiones WhatsApp

```typescript
// GET /api/accounts - Listar cuentas conectadas
// POST /api/accounts - Agregar nueva cuenta (inicia QR)
// GET /api/accounts/:id - Detalle de cuenta
// PUT /api/accounts/:id - Actualizar metadatos (filial, encargado)
// DELETE /api/accounts/:id - Eliminar cuenta
// POST /api/accounts/:id/reconnect - Reconectar cuenta
// GET /api/accounts/:id/qr - Obtener QR para escanear
// GET /api/accounts/:id/status - Estado de conexión
```

### 2. Embudos

```typescript
// GET /api/funnels - Listar embudos
// POST /api/funnels - Crear embudo
// PUT /api/funnels/:id - Actualizar embudo
// DELETE /api/funnels/:id - Eliminar embudo
// PUT /api/funnels/:id/stages/reorder - Reordenar etapas
```

### 3. Leads

```typescript
// GET /api/leads?funnelId=xxx - Listar leads por embudo
// POST /api/leads - Crear lead manualmente
// GET /api/leads/:id - Detalle de lead
// PUT /api/leads/:id - Actualizar lead
// PUT /api/leads/:id/move - Mover lead a otra etapa/embudo
// DELETE /api/leads/:id - Eliminar lead
// POST /api/leads/:id/notes - Agregar nota
```

### 4. Inbox (Conversaciones)

```typescript
// GET /api/conversations - Listar conversaciones
// GET /api/conversations/:id - Detalle con mensajes
// PUT /api/conversations/:id/read - Marcar como leído
// POST /api/conversations/:id/messages - Enviar mensaje
```

### 5. Webhook (recibe de difusion)

```typescript
// POST /api/webhook/difusion - Recibe eventos de difusion.naperu.cloud
//   - Mensajes entrantes
//   - Cambios de estado de conexión
//   - Delivery/Read receipts
```

---

## 🔗 Integración con difusion.naperu.cloud

### Configuración de Webhook en difusion

```bash
# Variables de entorno en difusion.naperu.cloud
WHATSAPP_WEBHOOK=https://propaganda.naperu.cloud/api/webhook/difusion
WHATSAPP_WEBHOOK_SECRET=your-secret-key
WHATSAPP_WEBHOOK_EVENTS=message,message.ack,connection.update
```

### Flujo de Conexión de Cuenta

```
1. Usuario hace clic en "+ Nueva Cuenta"
2. Frontend llama POST /api/accounts
3. Backend llama POST difusion/devices (crear device)
4. Backend obtiene QR de GET difusion/devices/:id/login
5. Frontend muestra QR al usuario
6. Usuario escanea con WhatsApp
7. difusion envía webhook con connection.update
8. Backend actualiza estado a CONNECTED
9. Frontend refleja el cambio en tiempo real (via polling o SSE)
```

### Flujo de Mensaje Entrante

```
1. Mensaje llega a WhatsApp
2. difusion lo recibe y envía webhook a propaganda
3. POST /api/webhook/difusion con payload:
   {
     "event": "message",
     "device_id": "xxx",
     "payload": {
       "from": "51999888777@s.whatsapp.net",
       "body": "Hola!",
       ...
     }
   }
4. Backend busca/crea Lead en embudo "Principal"
5. Backend crea/actualiza Conversation
6. Backend guarda Message
7. Frontend actualiza via polling
```

---

## 🎨 Frontend - Estructura de Archivos

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (redirect a /leads)
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx (sidebar + header)
│   │   ├── connections/
│   │   │   └── page.tsx
│   │   ├── leads/
│   │   │   └── page.tsx
│   │   ├── inbox/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   └── api/
│       ├── accounts/
│       ├── funnels/
│       ├── leads/
│       ├── conversations/
│       └── webhook/
│           └── difusion/route.ts
├── components/
│   ├── ui/ (shadcn)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── AccountsList.tsx
│   ├── connections/
│   │   ├── AccountCard.tsx
│   │   ├── QRModal.tsx
│   │   └── AccountForm.tsx
│   ├── leads/
│   │   ├── FunnelBoard.tsx
│   │   ├── FunnelColumn.tsx
│   │   ├── LeadCard.tsx
│   │   ├── LeadDetail.tsx
│   │   └── FunnelSelector.tsx
│   └── inbox/
│       ├── ChatList.tsx
│       ├── ChatWindow.tsx
│       ├── MessageBubble.tsx
│       └── LeadSidebar.tsx
└── lib/
    ├── prisma.ts
    ├── difusion.ts (cliente API difusion)
    └── utils.ts
```

---

## ✅ Criterios de Aceptación

### Conexiones
- [ ] Puedo agregar una nueva cuenta WhatsApp escaneando QR
- [ ] Veo el estado de conexión en tiempo real (conectado/desconectado)
- [ ] Puedo asignar filial y encargado a cada cuenta
- [ ] Puedo reconectar una cuenta desconectada
- [ ] Puedo eliminar una cuenta

### Leads (Kanban)
- [ ] Veo todos los leads en un tablero Kanban por etapas
- [ ] Puedo arrastrar leads entre etapas
- [ ] Puedo crear embudos personalizados
- [ ] Puedo personalizar las etapas de cada embudo
- [ ] Los nuevos chats entrantes aparecen automáticamente en "Nuevo"
- [ ] Puedo asignar valor monetario a cada lead
- [ ] Puedo agregar notas a un lead

### Inbox
- [ ] Veo todas las conversaciones de todas las cuentas
- [ ] Puedo filtrar por cuenta específica
- [ ] Veo el badge de mensajes sin leer
- [ ] Puedo enviar mensajes de texto
- [ ] Veo el perfil del lead junto al chat
- [ ] Puedo cambiar la etapa del lead desde el inbox

### Integración
- [ ] Los mensajes entrantes de difusion se reflejan en tiempo real
- [ ] Los mensajes enviados desde propaganda llegan a WhatsApp
- [ ] El estado de conexión se sincroniza con difusion

---

## 🚨 Consideraciones y Riesgos

1. **Webhook HMAC**: Validar firma de webhooks de difusion para seguridad
2. **Rate Limiting**: No sobrecargar difusion con muchas requests
3. **Reconexión**: Manejar reconexión automática si se pierde conexión
4. **Concurrencia**: Múltiples cuentas pueden recibir mensajes simultáneamente

---

## 📋 Orden de Implementación

### Fase 1: Limpieza y Base (30 min)
1. Eliminar código antiguo (workers, endpoints viejos)
2. Actualizar schema Prisma
3. Configurar variables de entorno

### Fase 2: Backend Core (2 horas)
1. Crear cliente API difusion
2. Implementar endpoints de accounts
3. Implementar webhook receiver
4. Implementar endpoints de funnels/leads

### Fase 3: Frontend Core (3 horas)
1. Layout principal (sidebar, header)
2. Página de Conexiones
3. Página de Leads (Kanban)
4. Página de Inbox

### Fase 4: Integración (1 hora)
1. Conectar frontend con backend
2. Probar flujo completo
3. Configurar webhook en difusion

### Fase 5: Testing (1 hora)
1. Pruebas E2E con Playwright
2. Verificar en Simple Browser
3. Deploy a producción

---

## ❓ Preguntas Confirmadas

- ✅ NO multi-tenant (un solo entorno)
- ✅ Módulo de conexiones con metadatos (filial, encargado)
- ✅ Embudos estilo Kommo con etapas personalizables
- ✅ Inbox unificado de todas las cuentas

---

¿Aprobado para proceder?
