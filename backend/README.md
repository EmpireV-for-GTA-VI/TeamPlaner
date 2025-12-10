# TeamPlaner Backend - 3-Säulen-Architektur

## 🏗️ Architektur-Übersicht

Dieses Backend implementiert eine robuste **3-Säulen-Datenarchitektur** für hochskalierbare Microservices:

### 1. PostgreSQL - Die "Single Source of Truth" (SSOT) 🗄️
**Verantwortung:** Alle persistenten Daten
- User-Profile und Credentials
- Geschäftsdaten (Organizations, Teams, Projects, Boards, Cards)
- Persistente Einstellungen
- Audit Logs

**Features:**
- Vollständiges relationales Schema mit referenzieller Integrität
- Automatische `updated_at` Timestamps via Triggers
- Indizes für Performance-kritische Abfragen
- Views für häufige Queries

### 2. Redis - Der "Beschleuniger" ⚡
**Verantwortung:** Hochperformanter Zugriff
- **Session Management:** Komplette User-Sessions (24h TTL)
- **Settings Cache:** Write-Through Pattern für Settings aus PostgreSQL
- **Rate Limiting:** Schutz vor Brute-Force und API-Missbrauch
- **Temporäre Daten:** Kurzlebige Cache-Einträge

**Patterns:**
- **Write-Through:** Settings werden erst in PostgreSQL, dann in Redis geschrieben
- **Cache-Aside:** Bei Read-Miss wird PostgreSQL abgefragt und gecacht
- **Sliding Expiration:** Sessions werden bei Zugriff automatisch verlängert

### 3. SpiceDB - Der "Wächter" 🛡️
**Verantwortung:** Zentrale Berechtigungsprüfung (ReBAC)
- Relationship-Based Access Control
- Hierarchische Permissions (Organization → Team → Project → Board → Card)
- **KEINE Attribute** (keine E-Mails, Namen etc.) - nur Relationen!
- **Fail-Closed:** Bei Verbindungsproblemen wird Zugriff VERWEIGERT

**Schema:**
```zed
organization (owner, admin, member)
  ↓
team (owner, admin, member)
  ↓
project (owner, admin, member, viewer)
  ↓
board (owner, editor)
  ↓
card (owner, assignee, editor)
```

---

## 📦 Installation

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 7
- SpiceDB (siehe unten)

### 1. Dependencies installieren
```bash
cd backend
npm install
```

### 2. Environment konfigurieren
```bash
cp .env.example .env
# Passe die Werte in .env an
```

### 3. PostgreSQL Setup
```bash
# Datenbank erstellen
psql -U postgres -c "CREATE DATABASE teamplaner;"

# Schema migrieren
npm run db:migrate
```

### 4. Redis Setup
```bash
# Redis starten (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Oder lokal installieren
# Windows: Download von https://redis.io/download
# Linux: sudo apt-get install redis-server
```

### 5. SpiceDB Setup
```bash
# SpiceDB via Docker starten
docker run -d \
  --name spicedb \
  -p 50051:50051 \
  authzed/spicedb serve \
  --grpc-preshared-key "insecure-token" \
  --datastore-engine memory

# Schema hochladen
npm run spicedb:upload-schema
```

### 6. Server starten
```bash
# Development mit Auto-Reload
npm run dev

# Production
npm start
```

---

## 🔑 API Endpoints

### Authentication

#### POST `/api/auth/register`
Registriert einen neuen User
```json
{
  "email": "user@example.com",
  "password": "secure123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST `/api/auth/login`
Login mit Session-Erstellung
```json
{
  "email": "user@example.com",
  "password": "secure123"
}
```
**Response:**
```json
{
  "success": true,
  "user": { ... },
  "sessionId": "uuid",
  "token": "auth-token"
}
```

**Wichtig:** Bei jedem API-Call diese Header mitschicken:
```
X-Session-Id: <sessionId>
Authorization: Bearer <token>
```

#### POST `/api/auth/logout`
Logout (Session löschen)

#### GET `/api/auth/me`
Aktuellen User abrufen

---

### Teams

#### GET `/api/teams`
Alle Teams, die der User sehen darf (basierend auf SpiceDB Permissions)

#### GET `/api/teams/:teamId`
Spezifisches Team abrufen
- **Permission Check:** `view` auf `team:teamId`

#### POST `/api/teams`
Neues Team erstellen
```json
{
  "organizationId": "uuid",
  "name": "Development Team",
  "description": "Backend developers",
  "color": "blue"
}
```
- **Permission Check:** `create_team` auf `organization:organizationId`

#### PUT `/api/teams/:teamId`
Team aktualisieren
- **Permission Check:** `update` auf `team:teamId`

#### DELETE `/api/teams/:teamId`
Team löschen (Soft-Delete)
- **Permission Check:** `delete` auf `team:teamId`

#### POST `/api/teams/:teamId/members`
Mitglied hinzufügen
```json
{
  "userId": "uuid",
  "role": "admin" // oder "member"
}
```
- **Permission Check:** `manage_members` auf `team:teamId`

---

### Projects

#### GET `/api/projects`
Alle Projects die der User sehen darf

#### GET `/api/projects/:projectId`
Spezifisches Project abrufen
- **Permission Check:** `view` auf `project:projectId`

#### POST `/api/projects`
Neues Project erstellen
```json
{
  "teamId": "uuid",
  "name": "Website Relaunch",
  "description": "New company website",
  "status": "active",
  "priority": "high"
}
```
- **Permission Check:** `create_project` auf `team:teamId`

---

### Settings

#### GET `/api/settings/:entityType/:entityId`
Alle Settings einer Entity abrufen
- `entityType`: `user`, `organization`, `team`, `project`

#### GET `/api/settings/:entityType/:entityId/:key`
Spezifisches Setting abrufen (Cache-Aside Pattern)

#### PUT `/api/settings/:entityType/:entityId/:key`
Setting speichern (Write-Through Pattern)
```json
{
  "value": { "theme": "dark", "language": "de" }
}
```

#### DELETE `/api/settings/:entityType/:entityId/:key`
Setting löschen (mit Cache-Invalidierung)

---

## 🔐 Security & Best Practices

### Fail-Closed Strategie
Bei SpiceDB-Ausfällen wird der Zugriff **VERWEIGERT**:
```javascript
if (!this.isConnected && this.failClosed) {
    throw new Error('Permission service unavailable - access denied');
}
```

### Rate Limiting
Alle sensiblen Endpoints sind geschützt:
- Login: 5 Versuche / 5 Minuten
- Register: 5 Versuche / 1 Stunde
- Standard API: 100 Requests / Stunde

### Session Management
- Sessions werden in Redis gespeichert (nicht in DB)
- 24 Stunden TTL mit Sliding Expiration
- Bei Password-Änderung werden alle Sessions gelöscht

### Password Hashing
- bcrypt mit Cost-Factor 12
- Passwörter werden niemals im Klartext gespeichert

### Audit Logging
Alle wichtigen Aktionen werden in PostgreSQL geloggt:
- Login/Logout
- Permission Checks für kritische Operationen
- Datenänderungen (old/new values)

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-10T...",
  "checks": {
    "server": "ok",
    "postgres": "ok",
    "redis": "ok",
    "spicedb": "ok"
  }
}
```

---

## 📊 Datenfluss-Beispiele

### Login-Prozess
1. **Credentials validieren** → PostgreSQL
2. **Rate Limit prüfen** → Redis
3. **Session erstellen** → Redis (24h TTL)
4. **Settings cachen** → PostgreSQL → Redis
5. **Audit Log** → PostgreSQL

### Permission Check
1. **Request mit sessionId + token**
2. **Session validieren** → Redis
3. **Permission prüfen** → SpiceDB (`CheckPermission`)
4. Bei Erfolg: **Daten aus PostgreSQL laden**

### Setting speichern (Write-Through)
1. **Schreibe in PostgreSQL** (SSOT)
2. **Schreibe in Redis** (Cache)
3. Bei Fehler: **Cache invalidieren**

### Setting lesen (Cache-Aside)
1. **Versuche aus Redis** (Cache)
2. Cache Hit? → Return
3. Cache Miss? → **Hole aus PostgreSQL** → **Cache für nächstes Mal**

---

## 🚀 Deployment

### Docker Compose Beispiel
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: teamplaner
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  spicedb:
    image: authzed/spicedb
    command: serve --grpc-preshared-key "your-token" --datastore-engine postgres --datastore-conn-uri "postgres://..."
    ports:
      - "50051:50051"

  backend:
    build: .
    environment:
      DB_HOST: postgres
      REDIS_URL: redis://redis:6379
      SPICEDB_ENDPOINT: spicedb:50051
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
      - spicedb
```

---

## 📚 Weitere Ressourcen

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [SpiceDB Documentation](https://authzed.com/docs)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

## 🤝 Contributing

Dieses Projekt folgt der **Single Source of Truth** Philosophie:
- PostgreSQL ist immer die Wahrheit
- Redis cached nur für Performance
- SpiceDB kennt nur Relationen, keine Attribute

Bei Fragen oder Problemen: Issue öffnen im Repository!
