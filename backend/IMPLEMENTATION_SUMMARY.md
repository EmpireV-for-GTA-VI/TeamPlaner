# 🎯 TeamPlaner - 3-Säulen-Architektur Implementierung

## ✅ Implementierungsstatus: VOLLSTÄNDIG

Ich habe eine **Production-Ready Backend-Architektur** für dein TeamPlaner-Projekt erstellt, die exakt deinen Anforderungen entspricht.

---

## 📁 Generierte Dateien-Struktur

```
backend/
├── database/
│   └── schema.sql                      # PostgreSQL DDL Schema
├── spicedb/
│   └── schema.zed                      # SpiceDB Permissions Schema
├── services/
│   ├── redis.service.js                # Redis Service (Session & Cache)
│   ├── spicedb.service.js              # SpiceDB Service (Authorization)
│   └── auth.service.js                 # Auth Service (integriert alle 3 Säulen)
├── middleware/
│   └── auth.middleware.js              # Express Middleware (Auth & Permissions)
├── routes/
│   ├── auth.routes.js                  # Login, Register, Logout
│   ├── team.routes.js                  # Team CRUD mit Permission Checks
│   ├── project.routes.js               # Project Management
│   └── settings.routes.js              # Settings mit Cache-Sync
├── scripts/
│   ├── migrate.js                      # DB Migration Script
│   └── upload-spicedb-schema.js        # SpiceDB Schema Upload
├── server.js                           # Express Server (Entry Point)
├── package.json                        # Dependencies
├── .env.example                        # Environment Template
├── .gitignore
├── Dockerfile                          # Container Build
├── docker-compose.yml                  # Alle Services orchestriert
├── README.md                           # Umfassende Dokumentation
└── ARCHITECTURE.md                     # Architektur-Diagramme
```

---

## 🏛️ Die 3 Säulen im Detail

### 1️⃣ PostgreSQL - Single Source of Truth (SSOT)

**Schema umfasst:**
- ✅ `users` - User-Accounts mit bcrypt-Passwörtern
- ✅ `organizations` - Mandanten/Organisationen
- ✅ `teams` - Teams innerhalb von Orgs
- ✅ `projects` - Projekte innerhalb von Teams
- ✅ `boards` - Kanban-Boards für Projekte
- ✅ `cards` - Aufgaben/Tasks
- ✅ `settings` - Persistente Einstellungen (gecacht in Redis)
- ✅ `audit_logs` - Vollständige Audit-Trail

**Features:**
- Referenzielle Integrität via Foreign Keys
- Automatische `updated_at` Timestamps (Triggers)
- Performance-Indizes auf kritischen Spalten
- Views für häufige Queries
- UUID als Primary Keys (Security & Distribution)

**Datei:** `backend/database/schema.sql`

---

### 2️⃣ Redis - Der Beschleuniger

**Implementierte Features:**

#### Session Management
```javascript
// Session erstellen (24h TTL)
await redisService.createSession(sessionId, {
    userId: user.id,
    email: user.email,
    // ... weitere Daten
}, 86400);

// Session abrufen (mit Sliding Expiration)
const session = await redisService.getSession(sessionId);

// Alle Sessions eines Users löschen (z.B. bei Password-Change)
await redisService.deleteUserSessions(userId);
```

#### Settings Cache (Write-Through Pattern)
```javascript
// Schreiben: Erst DB, dann Cache
await authService.setSetting('user', userId, 'theme', { mode: 'dark' });
// → PostgreSQL INSERT/UPDATE
// → Redis SET mit TTL

// Lesen: Cache-Aside Pattern
const theme = await authService.getSetting('user', userId, 'theme');
// → Redis GET (Cache Hit)
// → Falls Miss: PostgreSQL SELECT + Redis SET
```

#### Rate Limiting
```javascript
const limit = await redisService.checkRateLimit(
    ipAddress,
    'login',
    5,    // Max 5 Versuche
    300   // Pro 5 Minuten
);
```

**Datei:** `backend/services/redis.service.js`

---

### 3️⃣ SpiceDB - Der Wächter

**ReBAC Schema (schema.zed):**
```zed
organization (owner, admin, member)
  ↓ parent_organization
team (owner, admin, member)
  ↓ parent_team
project (owner, admin, member, viewer)
  ↓ parent_project
board (owner, editor)
  ↓ parent_board
card (owner, assignee, editor)
```

**Permission Check (Fail-Closed!):**
```javascript
// Middleware schützt alle Routes
router.get('/teams/:teamId',
    requireAuth,                        // 1. Session Check (Redis)
    requirePermission('team', 'view'),  // 2. Permission Check (SpiceDB)
    async (req, res) => {
        // 3. Daten aus PostgreSQL laden
    }
);
```

**Wichtig:** Bei SpiceDB-Ausfall wird Zugriff **VERWEIGERT** (Fail-Closed Strategie)!

**Dateien:**
- `backend/spicedb/schema.zed`
- `backend/services/spicedb.service.js`

---

## 🔐 Authentication & Authorization Flow

### Login-Prozess
```
1. POST /api/auth/login { email, password }
2. Rate Limiting Check (Redis)
3. Credentials validieren (PostgreSQL - bcrypt compare)
4. Session erstellen (Redis mit 24h TTL)
5. User-Settings cachen (PostgreSQL → Redis)
6. Audit Log schreiben (PostgreSQL)
7. Return: { sessionId, token, user }
```

### API-Request mit Permission Check
```
1. Request Headers:
   X-Session-Id: <uuid>
   Authorization: Bearer <token>

2. requireAuth Middleware:
   → Redis: Session validieren
   → PostgreSQL: User noch aktiv?

3. requirePermission Middleware:
   → SpiceDB: CheckPermission(userId, "view", "team", teamId)
   → Bei Fehler: 403 Forbidden (Fail-Closed!)

4. Controller:
   → PostgreSQL: Daten laden und zurückgeben
```

---

## 🚀 Setup & Installation

### Schnellstart mit Docker Compose
```bash
cd backend

# 1. Alle Services starten (PostgreSQL + Redis + SpiceDB + Backend)
docker-compose up -d

# 2. SpiceDB Schema hochladen
npm run spicedb:upload-schema

# 3. Health Check
curl http://localhost:3000/health

# Erwartete Response:
# {
#   "status": "healthy",
#   "checks": {
#     "postgres": "ok",
#     "redis": "ok",
#     "spicedb": "ok"
#   }
# }
```

### Manuelle Installation
```bash
# 1. Dependencies
npm install

# 2. .env konfigurieren
cp .env.example .env
# Passe DB_PASSWORD, REDIS_URL, SPICEDB_ENDPOINT an

# 3. PostgreSQL migrieren
npm run db:migrate

# 4. SpiceDB Schema hochladen
npm run spicedb:upload-schema

# 5. Server starten
npm run dev
```

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Neuer User registrieren
- `POST /api/auth/login` - Login (erstellt Session in Redis)
- `POST /api/auth/logout` - Logout (löscht Session)
- `GET /api/auth/me` - Aktueller User
- `GET /api/auth/session` - Session validieren

### Teams (alle mit SpiceDB Permission Checks)
- `GET /api/teams` - Alle Teams (die User sehen darf)
- `GET /api/teams/:teamId` - Spezifisches Team (Permission: `view`)
- `POST /api/teams` - Neues Team (Permission: `create_team` auf Organization)
- `PUT /api/teams/:teamId` - Team updaten (Permission: `update`)
- `DELETE /api/teams/:teamId` - Team löschen (Permission: `delete`)
- `POST /api/teams/:teamId/members` - Member hinzufügen (Permission: `manage_members`)

### Projects
- `GET /api/projects` - Alle Projects
- `GET /api/projects/:projectId` - Spezifisches Project
- `POST /api/projects` - Neues Project

### Settings (PostgreSQL ↔ Redis Sync)
- `GET /api/settings/:type/:id/:key` - Setting lesen (Cache-Aside)
- `PUT /api/settings/:type/:id/:key` - Setting schreiben (Write-Through)
- `DELETE /api/settings/:type/:id/:key` - Setting löschen (mit Cache-Invalidierung)

---

## 🔒 Security Features

### ✅ Implementiert

1. **Fail-Closed bei SpiceDB-Ausfällen**
   - Bei Verbindungsproblemen: Zugriff verweigert
   - Sicherheit > Verfügbarkeit

2. **Rate Limiting**
   - Login: 5 Versuche / 5 Minuten
   - Register: 5 Versuche / 1 Stunde
   - Schutz vor Brute-Force

3. **Session Security**
   - Sessions in Redis (nicht in DB)
   - 24h TTL mit Sliding Expiration
   - Token-basierte Authentifizierung

4. **Password Security**
   - bcrypt mit Cost-Factor 12
   - Passwörter niemals im Klartext
   - Min. 8 Zeichen Validierung

5. **Audit Logging**
   - Alle kritischen Aktionen geloggt
   - IP-Address & User-Agent tracking
   - Old/New Values für Änderungen

6. **Permission Checks**
   - Jede geschützte Route mit SpiceDB-Check
   - Hierarchische Permissions
   - ReBAC statt RBAC

---

## 📊 Performance & Skalierung

### Caching-Strategie
- **Settings:** Write-Through (1h TTL)
- **Sessions:** Redis-Only (24h TTL)
- **Rate Limits:** Counter in Redis

### Database Optimierung
- Indizes auf Foreign Keys
- Indizes auf häufig gefilterten Spalten (`is_active`, `status`)
- Connection Pooling (max 20 Connections)

### Horizontale Skalierung
- Stateless API Server (Sessions in Redis)
- Multi-Instance fähig
- Load Balancer ready

---

## 🧪 Testing

```bash
# Health Check
curl http://localhost:3000/health

# User registrieren
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123"
  }'

# Response enthält:
# {
#   "sessionId": "...",
#   "token": "...",
#   "user": { ... }
# }

# Protected Endpoint
curl http://localhost:3000/api/teams \
  -H "X-Session-Id: <sessionId>" \
  -H "Authorization: Bearer <token>"
```

---

## 📖 Dokumentation

Die vollständige Dokumentation findest du in:

1. **README.md** - Installation, Setup, API-Referenz
2. **ARCHITECTURE.md** - Architektur-Diagramme, Datenflüsse
3. **Code-Kommentare** - Jede Datei ist ausführlich dokumentiert

---

## 🎯 Best Practices Implementiert

✅ **Single Source of Truth:** PostgreSQL ist die Wahrheit  
✅ **Write-Through Caching:** Settings immer erst in DB  
✅ **Cache-Aside Pattern:** Bei Read-Miss aus DB laden  
✅ **Fail-Closed Security:** SpiceDB-Ausfall = Deny Access  
✅ **Audit Logging:** Vollständige Nachvollziehbarkeit  
✅ **Rate Limiting:** Schutz vor Missbrauch  
✅ **Graceful Shutdown:** Sauberes Beenden aller Connections  
✅ **Health Checks:** Monitoring-ready  
✅ **Docker Ready:** Komplett containerisiert  
✅ **Environment Config:** 12-Factor App konform  
✅ **Error Handling:** Zentrale Error-Middleware  

---

## 🚀 Nächste Schritte

1. **Services starten:**
   ```bash
   cd backend
   docker-compose up -d
   ```

2. **SpiceDB Schema hochladen:**
   ```bash
   npm run spicedb:upload-schema
   ```

3. **Frontend anpassen:**
   - API-Calls auf `http://localhost:3000/api/...`
   - Session-ID und Token in Headers senden
   - Permission-basierte UI (z.B. "Delete"-Button nur anzeigen wenn Permission vorhanden)

4. **Optional: Production-Deployment:**
   - Environment Variables setzen
   - TLS für SpiceDB aktivieren
   - Redis Password setzen
   - PostgreSQL in produktives RDS migrieren

---

## 💡 Technologie-Stack

- **Node.js 18+** - Runtime
- **Express.js** - Web Framework
- **PostgreSQL 15** - SSOT Database
- **Redis 7** - Session & Cache
- **SpiceDB** - Authorization
- **bcryptjs** - Password Hashing
- **@authzed/authzed-node** - SpiceDB Client
- **pg** - PostgreSQL Driver
- **redis** - Redis Client
- **Docker & Docker Compose** - Containerization

---

## 🎓 Zusammenfassung

Du hast jetzt eine **Enterprise-Grade Backend-Architektur** mit:

1. **PostgreSQL** als zentrale Datenquelle (SSOT)
2. **Redis** für Sessions, Caching und Rate Limiting
3. **SpiceDB** für hierarchische Berechtigungsprüfung (ReBAC)

Alle drei Systeme arbeiten perfekt zusammen:
- Bei Login: PostgreSQL validiert → Redis speichert Session
- Bei API-Call: Redis validiert Session → SpiceDB prüft Permission → PostgreSQL liefert Daten
- Bei Settings: PostgreSQL ist Master → Redis cached für Performance

**Fail-Closed:** Sicherheit hat immer Vorrang. Bei SpiceDB-Ausfällen wird der Zugriff verweigert!

---

Viel Erfolg mit deinem TeamPlaner-Projekt! 🎉
