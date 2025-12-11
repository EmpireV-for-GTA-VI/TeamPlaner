# 🔐 Datenbank & Rechte-System Dokumentation

## Neue Datenbank-Struktur

### 1. **Users Tabelle**
```sql
- id (INT, PK)
- fivem_id (VARCHAR 50, UNIQUE) - FiveM ID von forum.cfx.re
- cfx_username (VARCHAR 100) - Original CFX Username
- custom_username (VARCHAR 100) - Eigener Username (editierbar)
- display_name (VARCHAR 100) - Angezeigter Name
- avatar_url (VARCHAR 500)
- organisation_id (INT, FK) - Zugehörigkeit
- group_id (INT, FK) - Gruppe
- role_id (INT, FK) - Rolle
- discourse_api_key (VARCHAR 255) - Discourse API Key (verschlüsselt speichern!)
- last_login, last_seen (DATETIME)
- trust_level, is_admin, is_moderator (Metadata)
- created_at, updated_at (TIMESTAMP)
```

### 2. **Organisations Tabelle**
```sql
- id (INT, PK)
- name (VARCHAR 100, UNIQUE)
- description (TEXT)
- color (VARCHAR 7) - Hex Color
- is_active (BOOLEAN)
```

### 3. **Groups Tabelle**
```sql
- id (INT, PK)
- organisation_id (INT, FK)
- name (VARCHAR 100)
- description (TEXT)
- color (VARCHAR 7)
- UNIQUE(organisation_id, name) - Eindeutig pro Organisation
```

### 4. **Roles Tabelle**
```sql
- id (INT, PK)
- group_id (INT, FK)
- name (VARCHAR 100)
- description (TEXT)
- color (VARCHAR 7)
- permissions (JSON) - z.B. ["tasks.*", "users.view"]
- priority (INT) - Hierarchie (höher = mehr Rechte)
- UNIQUE(group_id, name) - Eindeutig pro Gruppe
```

## Rechte-Hierarchie

```
Organisation (z.B. "Police Department")
    └── Group (z.B. "SWAT")
            └── Role (z.B. "Team Leader")
                    └── Permissions: ["tasks.*", "users.manage", "reports.create"]
```

### Standard-Struktur (wird automatisch erstellt):
```
Organisation: "Standard" (ID: 1)
    └── Group: "Mitglieder" (ID: 1)
            ├── Role: "User" (Priority: 1)
            │   └── Permissions: ["tasks.view", "profile.edit"]
            ├── Role: "Moderator" (Priority: 50)
            │   └── Permissions: ["tasks.view", "tasks.create", "tasks.edit", "profile.edit"]
            └── Role: "Admin" (Priority: 100)
                └── Permissions: ["*"]
```

## Permission-System

### Wildcard Permissions:
- `"*"` - Alle Rechte (Admin)
- `"tasks.*"` - Alle Task-Rechte (create, edit, delete, view)
- `"users.*"` - Alle User-Rechte

### Spezifische Permissions:
- `"tasks.view"` - Tasks ansehen
- `"tasks.create"` - Tasks erstellen
- `"tasks.edit"` - Tasks bearbeiten
- `"tasks.delete"` - Tasks löschen
- `"users.manage"` - User verwalten (Rechte ändern)
- `"profile.edit"` - Eigenes Profil bearbeiten

## API Endpunkte

### Profil-Verwaltung:

#### GET `/api/profile`
Vollständiges Profil mit Organisation, Group, Role

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "fivemId": "12345678",
    "cfxUsername": "MaxMustermann",
    "customUsername": "Max_M",
    "displayName": "Max_M",
    "avatarUrl": "https://...",
    "organisation": {
      "id": 1,
      "name": "Standard",
      "color": "#3B82F6"
    },
    "group": {
      "id": 1,
      "name": "Mitglieder",
      "color": "#10B981"
    },
    "role": {
      "id": 1,
      "name": "User",
      "color": "#6B7280",
      "permissions": "[\"tasks.view\", \"profile.edit\"]",
      "priority": 1
    },
    "trustLevel": 1,
    "isAdmin": false,
    "isModerator": false,
    "isIngame": true,
    "ingameData": { "source": 1, "name": "Max_M", "joinedAt": "..." }
  }
}
```

#### PUT `/api/profile/username`
Username ändern

**Request:**
```json
{
  "username": "NeuerUsername"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Username updated successfully",
  "user": {
    "customUsername": "NeuerUsername",
    "displayName": "NeuerUsername"
  }
}
```

#### PUT `/api/profile/roles` (Admin only)
Organisation/Group/Role eines Users ändern

**Request:**
```json
{
  "userId": 5,
  "organisationId": 2,
  "groupId": 3,
  "roleId": 4
}
```

**Requires Permission:** `users.manage`

#### GET `/api/profile/permissions`
Alle Permissions des aktuellen Users

**Response:**
```json
{
  "success": true,
  "permissions": ["tasks.view", "tasks.create", "profile.edit"],
  "isAdmin": false,
  "role": "Moderator"
}
```

## UserService Methoden

### `findOrCreateUser(userData)`
Findet oder erstellt User - **verhindert Duplikate!**
- Prüft ob FiveM ID bereits existiert
- Update bei jedem Login (last_login, avatar, etc.)
- Erstellt neue User mit Standard-Rechten (Org: 1, Group: 1, Role: 1)

### `findByFivemId(fivemId)`
Findet User basierend auf FiveM ID (wichtig für Ingame-Sync!)

### `updateCustomUsername(userId, username)`
- Validierung: 3-50 Zeichen
- Prüft auf Duplikate
- Aktualisiert `display_name` automatisch

### `updateUserRoles(userId, { organisationId, groupId, roleId })`
Ändert Zugehörigkeit/Rechte eines Users

### `hasPermission(user, permission)`
Prüft ob User Permission hat
- Admin = `true` (immer)
- Wildcard `*` = `true`
- Wildcard Prefix (`tasks.*`) = matched `tasks.create`
- Exakte Permission

## Verwendung in Routes

### Permission Check:
```javascript
const { requirePermission } = require('./routes/profile');

router.post('/api/tasks', requirePermission('tasks.create'), async (req, res) => {
    // Nur User mit "tasks.create" Permission
});
```

### Manuelle Permission-Prüfung:
```javascript
const userService = require('./services/userService');

if (userService.hasPermission(req.session.user, 'users.manage')) {
    // User darf User verwalten
}
```

## Migrations-Strategie

### Alt → Neu Umstellung:

**1. Alte `users_web` Tabelle wird ersetzt durch neue `users` Tabelle**

**2. Bei Login:**
- User wird in neue Struktur migriert
- FiveM ID = `connected_identifier`
- CFX Username = `cfx_name`
- Standard-Rechte werden zugewiesen

**3. Keine Duplikate mehr:**
- `fivem_id` ist `UNIQUE`
- Bei jedem Login: `UPDATE` statt `INSERT`

## Frontend Integration

### Profil-Seite Features:
- ✅ Username editieren (mit Validierung)
- ✅ Organisation/Group/Role Anzeige (mit Farben)
- ✅ Permissions-Liste
- ✅ Ingame-Status Badge
- ✅ Admin/Moderator Badges

### Header:
- Anzeige: `displayName` (custom oder cfx)
- Klick → Profil-Seite

## Sicherheit

### ⚠️ WICHTIG:
1. **`discourse_api_key` NIEMALS an Frontend senden!**
   - Wird in `userService.formatUser()` als `_apiKey` markiert
   - Im Response entfernt

2. **Permissions server-side validieren!**
   - Niemals Frontend-Permissions vertrauen
   - Immer `requirePermission()` Middleware nutzen

3. **SQL Injection Prevention:**
   - Prepared Statements verwenden
   - Input-Validierung in UserService

## Beispiel: User-Verwaltung

```javascript
// Admin erstellt neue Organisation
INSERT INTO organisations (name, description, color)
VALUES ('Police Department', 'LSPD', '#1E40AF');

// Admin erstellt Gruppe
INSERT INTO `groups` (organisation_id, name, description, color)
VALUES (2, 'SWAT', 'Special Weapons and Tactics', '#DC2626');

// Admin erstellt Role mit Permissions
INSERT INTO roles (group_id, name, permissions, priority, color)
VALUES (2, 'Team Leader', '["tasks.*", "users.manage", "reports.*"]', 80, '#F59E0B');

// User zu Organisation/Group/Role zuweisen
UPDATE users 
SET organisation_id = 2, group_id = 2, role_id = 3
WHERE id = 5;
```

## Testing

### 1. Server starten & DB initialisieren:
```bash
npm run dev
```

### 2. Login durchführen:
- Einloggen via Discourse
- Prüfe Console: "User in DB gespeichert"

### 3. Profil testen:
- Öffne `/profile`
- Username ändern
- Permissions prüfen

### 4. Permission-System testen:
```javascript
// In Browser Console:
fetch('/api/profile/permissions', { credentials: 'include' })
    .then(r => r.json())
    .then(console.log);
```
