# TeamPlaner - MariaDB Datenbankanbindung

## 🚀 Installation und Start

### 1. Node.js Dependencies installieren
```bash
npm install
```

### 2. MariaDB Datenbank erstellen
Stellen Sie sicher, dass MariaDB läuft und erstellen Sie eine Datenbank:
```sql
CREATE DATABASE teamplaner CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Umgebungsvariablen konfigurieren
Bearbeiten Sie die `.env` Datei und passen Sie die Datenbankverbindung an:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=IhrPasswort
DB_NAME=teamplaner
```

### 4. Server starten
```bash
npm start
```

Oder für Entwicklung mit Auto-Reload:
```bash
npm run dev
```

Der Server läuft auf `http://localhost:3000`

## 📁 Projektstruktur

```
TeamPlaner/
├── server.js              # Express Server
├── database.js            # MariaDB Connection Pool
├── api-client.js          # Frontend API Client
├── .env                   # Umgebungsvariablen
├── package.json           # Node.js Dependencies
├── routes/
│   ├── tasks.js          # Task API Routen
│   ├── teamMembers.js    # Team-Mitglieder API Routen
│   └── projects.js       # Projekt API Routen
└── pages/                # Frontend Pages
```

## 🔌 API Endpunkte

### Tasks
- `GET /api/tasks` - Alle Tasks abrufen
- `GET /api/tasks/:id` - Task nach ID
- `POST /api/tasks` - Neuen Task erstellen
- `PUT /api/tasks/:id` - Task aktualisieren
- `DELETE /api/tasks/:id` - Task löschen

### Team Members
- `GET /api/team-members` - Alle Team-Mitglieder
- `GET /api/team-members/:id` - Team-Mitglied nach ID
- `POST /api/team-members` - Neues Team-Mitglied
- `PUT /api/team-members/:id` - Team-Mitglied aktualisieren
- `DELETE /api/team-members/:id` - Team-Mitglied löschen

### Projects
- `GET /api/projects` - Alle Projekte
- `GET /api/projects/:id` - Projekt nach ID
- `POST /api/projects` - Neues Projekt
- `PUT /api/projects/:id` - Projekt aktualisieren
- `DELETE /api/projects/:id` - Projekt löschen

## 💻 Frontend Verwendung

Der `dbAPI` Client ist global verfügbar und kann in allen Pages verwendet werden:

### Beispiel: Tasks abrufen
```javascript
async function loadTasks() {
    try {
        const response = await dbAPI.getTasks();
        console.log(response.data); // Array von Tasks
    } catch (error) {
        console.error('Fehler:', error);
    }
}
```

### Beispiel: Neuen Task erstellen
```javascript
async function createNewTask() {
    try {
        const newTask = {
            title: 'Neue Aufgabe',
            description: 'Beschreibung der Aufgabe',
            status: 'pending',
            assignee: 'Max Mustermann'
        };
        const response = await dbAPI.createTask(newTask);
        console.log('Task erstellt:', response.data);
    } catch (error) {
        console.error('Fehler:', error);
    }
}
```

### Beispiel: Task aktualisieren
```javascript
async function updateExistingTask(taskId) {
    try {
        const updatedData = {
            title: 'Aktualisierte Aufgabe',
            description: 'Neue Beschreibung',
            status: 'completed',
            assignee: 'Anna Schmidt'
        };
        await dbAPI.updateTask(taskId, updatedData);
    } catch (error) {
        console.error('Fehler:', error);
    }
}
```

### Beispiel: In Vue Component
```javascript
const TaskPlanner = {
    template: `
        <div>
            <h2>Tasks</h2>
            <ul>
                <li v-for="task in tasks" :key="task.id">
                    {{ task.title }} - {{ task.status }}
                </li>
            </ul>
        </div>
    `,
    data() {
        return {
            tasks: []
        };
    },
    async mounted() {
        const response = await dbAPI.getTasks();
        this.tasks = response.data;
    }
};
```

## 🗄️ Datenbank-Schema

### Tasks Tabelle
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- title (VARCHAR 255)
- description (TEXT)
- status (ENUM: 'pending', 'in-progress', 'completed')
- assignee (VARCHAR 100)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Team Members Tabelle
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- name (VARCHAR 100)
- email (VARCHAR 150, UNIQUE)
- role (VARCHAR 50)
- created_at (TIMESTAMP)
```

### Projects Tabelle
```sql
- id (INT, AUTO_INCREMENT, PRIMARY KEY)
- name (VARCHAR 200)
- description (TEXT)
- start_date (DATE)
- end_date (DATE)
- status (VARCHAR 50)
- created_at (TIMESTAMP)
```

## ⚠️ Wichtige Hinweise

1. **CORS**: Der Server ist für lokale Entwicklung konfiguriert. Für Produktion sollten CORS-Einstellungen angepasst werden.

2. **Sicherheit**: Für Produktionsumgebungen sollten Sie:
   - Passwörter hashen
   - JWT-Authentifizierung implementieren
   - Input-Validierung hinzufügen
   - SQL-Injection-Schutz verstärken (bereits durch Prepared Statements)

3. **Frontend**: Öffnen Sie `index.html` in einem Browser und stellen Sie sicher, dass der Backend-Server läuft.

4. **Datenbank**: Die Tabellen werden automatisch beim ersten Start erstellt.
