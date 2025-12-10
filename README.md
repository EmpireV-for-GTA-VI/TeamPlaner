# 🚀 TeamPlaner - Full-Stack Application

## Enterprise-Grade Team Management mit 3-Säulen-Architektur

Dieses Projekt kombiniert ein **Vue.js Frontend** mit einem **hochskalierbaren Node.js Backend**, das auf einer robusten 3-Säulen-Datenarchitektur basiert.

---

## 📁 Projekt-Struktur

```
TeamPlaner/
├── 📁 frontend/                          # Vue.js SPA
│   ├── index.html                        # Entry Point
│   ├── app.js                            # Vue Router & App
│   ├── style.css                         # Styles
│   └── pages/                            # Vue Components
│       ├── Home.js
│       ├── TaskPlanner.js
│       └── ...
│
└── 📁 backend/                           # Node.js/Express API
    ├── 🗄️  database/                     # PostgreSQL Schema
    ├── 🛡️  spicedb/                      # Authorization Schema
    ├── ⚡  services/                     # Business Logic
    ├── 🚦  middleware/                   # Auth & Permissions
    ├── 🛣️  routes/                        # API Endpoints
    ├── 📜  scripts/                      # Setup Scripts
    ├── 🐳  docker-compose.yml            # Service Orchestration
    └── 📖  README.md                     # Ausführliche Doku
```

---

## 🏛️ Backend: 3-Säulen-Architektur

### 1. PostgreSQL - Single Source of Truth (SSOT) 🗄️
Alle persistenten Daten: Users, Teams, Projects, Settings, Audit Logs

### 2. Redis - Session & Cache Layer ⚡
Hochperformanter Zugriff auf Sessions, gecachte Settings, Rate Limiting

### 3. SpiceDB - Authorization & Permissions 🛡️
Relationship-Based Access Control (ReBAC) mit Fail-Closed Security

---

## ⚡ Quick Start

### Option 1: Automatisches Setup (empfohlen)

```powershell
# Im Projekt-Root-Verzeichnis ausführen
.\START.ps1
```

Das Script führt automatisch aus:
- ✅ Docker-Prüfung
- ✅ Alle Services starten (PostgreSQL, Redis, SpiceDB, Backend)
- ✅ Environment Setup (.env)
- ✅ SpiceDB Schema Upload
- ✅ Health Check

### Option 2: Manuelles Setup

```powershell
# Backend starten
cd backend
docker-compose up -d

# Dependencies installieren
npm install

# SpiceDB Schema hochladen
npm run spicedb:upload-schema

# Health Check
curl http://localhost:3000/health
```

---

## 🌐 Services & Ports

Nach dem Start sind folgende Services verfügbar:

| Service       | URL                            | Beschreibung                |
|---------------|--------------------------------|-----------------------------|
| Frontend      | `http://localhost:8080`        | Vue.js SPA                  |
| Backend API   | `http://localhost:3000`        | REST API                    |
| PostgreSQL    | `localhost:5432`               | Datenbank                   |
| Redis         | `localhost:6379`               | Cache & Sessions            |
| SpiceDB gRPC  | `localhost:50051`              | Authorization Service       |
| SpiceDB UI    | `http://localhost:8443`        | SpiceDB Dashboard           |
| Health Check  | `http://localhost:3000/health` | Service Status              |

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Neuer User
- `POST /api/auth/login` - Login (erstellt Session)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current User

### Teams (mit Permission Checks)
- `GET /api/teams` - Alle Teams
- `POST /api/teams` - Neues Team erstellen
- `PUT /api/teams/:id` - Team aktualisieren
- `DELETE /api/teams/:id` - Team löschen
- `POST /api/teams/:id/members` - Member hinzufügen

### Projects
- `GET /api/projects` - Alle Projects
- `POST /api/projects` - Neues Project

### Settings (Cache Sync)
- `GET /api/settings/:type/:id/:key` - Setting lesen
- `PUT /api/settings/:type/:id/:key` - Setting schreiben

---

## 🧪 API Testing

```bash
# 1. User registrieren
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123",
    "firstName": "Test",
    "lastName": "User"
  }'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "secure123"
  }'

# Response: { "sessionId": "...", "token": "...", ... }

# 3. Protected Endpoint aufrufen
curl http://localhost:3000/api/teams \
  -H "X-Session-Id: <sessionId>" \
  -H "Authorization: Bearer <token>"
```

---

## 📖 Dokumentation

Ausführliche Dokumentation findest du in:

- **[backend/README.md](backend/README.md)** - Installation, API-Referenz
- **[backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)** - Architektur-Diagramme & Datenflüsse
- **[backend/IMPLEMENTATION_SUMMARY.md](backend/IMPLEMENTATION_SUMMARY.md)** - Feature-Übersicht
- **[backend/PROJECT_OVERVIEW.md](backend/PROJECT_OVERVIEW.md)** - Vollständige Datei-Struktur

---

## 🔒 Security Features

✅ **Fail-Closed:** Bei SpiceDB-Ausfall wird Zugriff verweigert  
✅ **Rate Limiting:** Schutz vor Brute-Force (5 Login-Versuche / 5 Min)  
✅ **bcrypt Hashing:** Passwörter mit Cost-Factor 12  
✅ **Session Security:** Token-basiert in Redis (24h TTL)  
✅ **Audit Logging:** Alle kritischen Aktionen werden geloggt  
✅ **Permission Checks:** Jede geschützte Route mit SpiceDB-Prüfung  

---

## 🛠️ Nützliche Befehle

```bash
# Services Status
docker-compose ps

# Logs anzeigen
docker-compose logs -f              # Alle Services
docker-compose logs -f backend      # Nur Backend

# Services neu starten
docker-compose restart backend

# Services stoppen
docker-compose down

# Alles neu bauen
docker-compose up -d --build

# DB Migration
cd backend
npm run db:migrate

# SpiceDB Schema neu laden
npm run spicedb:upload-schema
```

---

## 🚀 Development Workflow

### Backend Development
```bash
cd backend

# Development mit Auto-Reload
npm run dev

# Production Mode
npm start
```

### Frontend Development
```bash
# Öffne index.html in Browser
# Oder mit Live Server (VS Code Extension)
```

---

## 📊 Tech Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript Framework
- **Vue Router** - Client-side Routing
- **Tailwind CSS** - Utility-first CSS

### Backend
- **Node.js 18+** - JavaScript Runtime
- **Express.js** - Web Framework
- **PostgreSQL 15** - Relationale Datenbank (SSOT)
- **Redis 7** - In-Memory Cache & Sessions
- **SpiceDB** - Authorization Service (ReBAC)
- **bcryptjs** - Password Hashing
- **Docker & Docker Compose** - Containerization

---

## 🎯 Key Features

### Backend
✅ 3-Säulen-Architektur (PostgreSQL + Redis + SpiceDB)  
✅ Relationship-Based Access Control (ReBAC)  
✅ Session Management mit Sliding Expiration  
✅ Settings Cache (Write-Through & Cache-Aside)  
✅ Rate Limiting  
✅ Audit Logging  
✅ Graceful Shutdown  
✅ Health Checks  
✅ Docker-Ready  

### Frontend
✅ Vue.js 3 mit Composition API  
✅ Client-side Routing  
✅ Kanban Task Planner  
✅ Responsive Design (Tailwind CSS)  
✅ LocalStorage Persistence  

---

## 🤝 Contributing

Dieses Projekt folgt Best Practices für Enterprise-Grade Applications:

- **Single Source of Truth:** PostgreSQL ist immer die Wahrheit
- **Fail-Closed Security:** Sicherheit > Verfügbarkeit
- **Cache Invalidation:** Automatisch bei Updates
- **Audit Logging:** Vollständige Nachvollziehbarkeit

---

## 📝 License

MIT License - siehe LICENSE Datei

---

## 💡 Support

Bei Fragen oder Problemen:
1. Prüfe die Dokumentation in `backend/README.md`
2. Schau in die `backend/ARCHITECTURE.md` für Architektur-Details
3. Öffne ein Issue im Repository

---

**Viel Erfolg mit deinem TeamPlaner-Projekt! 🎉**
