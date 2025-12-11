# 🌉 FiveM Bridge Setup Guide

## Was ist die Bridge?

Die TeamPlaner Bridge verbindet deinen FiveM Server mit dem Node.js Backend, sodass du in Echtzeit sehen kannst, welche Web-User gerade ingame online sind.

## 📋 Setup Schritte

### 1. Backend konfigurieren

**a) Bridge Token in `.env` setzen:**
```env
BRIDGE_TOKEN=your_super_secret_bridge_token_12345
```

**b) Server neu starten:**
```bash
npm run dev
```

### 2. FiveM Resource installieren

**a) Resource kopieren:**
```
Kopiere: TeamPlaner/fivem-resources/teamplaner-bridge/
Nach: dein-fivem-server/resources/teamplaner-bridge/
```

**b) Token synchronisieren:**

Öffne `teamplaner-bridge/config.lua` und setze **dasselbe Token**:
```lua
Config.BridgeToken = "your_super_secret_bridge_token_12345"  -- MUSS mit .env übereinstimmen!
```

**c) Backend URL anpassen (falls nötig):**
```lua
Config.BackendURL = "http://localhost:3000"  -- Oder deine Server-IP
```

**d) Resource aktivieren:**

In deiner `server.cfg`:
```
ensure teamplaner-bridge
```

**e) FiveM Server neu starten**

### 3. Testen

**a) FiveM Server Konsole:**
```
[TeamPlaner Bridge] Resource started!
[TeamPlaner Bridge] Backend URL: http://localhost:3000
```

**b) Spieler verbindet sich:**

FiveM Konsole:
```
[TeamPlaner Bridge] Player MaxMustermann (FiveM ID: 12345678) joined and synced
```

Node.js Konsole:
```
🎮 [FiveM Bridge] Player joined: MaxMustermann (ID: 12345678, Source: 1)
✓ Player online: MaxMustermann (FiveM ID: 12345678)
```

**c) Ingame testen:**
```
/getfivemid
```
Sollte deine FiveM ID anzeigen.

**d) Backend API testen:**

Öffne in deinem Browser (während ein Spieler online ist):
```
http://localhost:3000/api/bridge/players
```

Header hinzufügen:
```
X-Bridge-Token: your_super_secret_bridge_token_12345
```

Response sollte sein:
```json
{
  "success": true,
  "count": 1,
  "players": [
    {
      "fivemId": "12345678",
      "source": 1,
      "name": "MaxMustermann",
      "joinedAt": "2025-12-11T10:00:00.000Z"
    }
  ]
}
```

## 🔧 Verwendung im Code

### In Backend Routes (z.B. Tasks API):

```javascript
const playerManager = require('../utils/playerManager');

router.get('/api/tasks', requireAuth, (req, res) => {
    // Prüfe ob User ingame ist
    const userId = req.session.user.id.toString();
    const isIngame = playerManager.isOnline(userId);
    
    if (isIngame) {
        const playerData = playerManager.getPlayer(userId);
        console.log(`User ${req.session.user.name} is ingame as ${playerData.name} (Source: ${playerData.source})`);
    }
    
    // ... Rest der Logik
});
```

### Im Frontend (User Profil):

Der `/auth/me` Endpunkt gibt jetzt automatisch den Ingame-Status zurück:

```javascript
const response = await fetch('/auth/me');
const data = await response.json();

if (data.user.isIngame) {
    console.log('User ist ONLINE auf FiveM!');
    console.log('Server Source:', data.user.ingameData.source);
    console.log('Ingame Name:', data.user.ingameData.name);
    console.log('Joined at:', data.user.ingameData.joinedAt);
}
```

### Profil-Seite aktualisieren:

In `pages/Profile.js` wird automatisch ein Badge angezeigt:

```html
<span v-if="user.isIngame" class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
    🎮 Ingame Online
</span>
```

## 📊 Verfügbare Befehle

### FiveM Server (Ingame)

| Befehl | Beschreibung | Berechtigung |
|--------|--------------|--------------|
| `/getfivemid` | Zeigt deine FiveM ID | Alle |
| `/bridge:sync` | Synchronisiert alle Online-Spieler | Admin |

### Backend API Endpoints

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/bridge/events/join` | POST | FiveM meldet Player Join |
| `/api/bridge/events/leave` | POST | FiveM meldet Player Leave |
| `/api/bridge/players` | GET | Liste aller Online-Spieler |
| `/api/bridge/status` | GET | Bridge Status Check |
| `/api/bridge/players` | DELETE | Lösche alle Online-Spieler |

**Alle Endpoints benötigen den `X-Bridge-Token` Header!**

## 🔒 Sicherheit

### Token ändern (WICHTIG für Produktion!)

**1. Generiere ein sicheres Token:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2. Aktualisiere `.env`:**
```env
BRIDGE_TOKEN=dein_neues_super_sicheres_token_hier
```

**3. Aktualisiere `config.lua`:**
```lua
Config.BridgeToken = "dein_neues_super_sicheres_token_hier"
```

**4. Beide Server neu starten!**

## 🐛 Troubleshooting

### "Invalid bridge token"
→ Token in `config.lua` und `.env` sind unterschiedlich
→ Lösung: Tokens synchronisieren und Server neu starten

### "No FiveM ID found"
→ Spieler hat keinen FiveM Account verknüpft (sehr selten)
→ Lösung: Spieler muss FiveM Account mit CFX.re verknüpfen

### "Connection refused"
→ Backend läuft nicht oder URL ist falsch
→ Lösung: Backend starten, URL in `config.lua` prüfen

### Spieler wird nicht synchronisiert
→ Debug-Modus aktivieren in `config.lua`:
```lua
Config.Debug = true
```
→ FiveM Konsole und Node.js Konsole prüfen

### Backend meldet "Player not found"
→ FiveM Resource wurde nach Backend-Start gestartet
→ Lösung: Ingame `/bridge:sync` ausführen

## 📈 Monitoring

### Anzahl Online-Spieler abrufen:

```javascript
const playerManager = require('./utils/playerManager');

console.log('Online Spieler:', playerManager.getPlayerCount());
console.log('Alle Spieler:', playerManager.getAllPlayers());
```

### Cleanup bei Server-Restart:

```javascript
// Bei Bedarf alle Spieler entfernen
playerManager.clear();
```

## 🎯 Beispiel: Nur Ingame-User dürfen Tasks erstellen

```javascript
router.post('/api/tasks', requireAuth, (req, res) => {
    const userId = req.session.user.id.toString();
    
    // Prüfe ob User ingame ist
    if (!playerManager.isOnline(userId)) {
        return res.status(403).json({
            success: false,
            error: 'You must be online on the FiveM server to create tasks'
        });
    }
    
    // ... Task erstellen
});
```

## ✅ Checkliste

- [ ] `BRIDGE_TOKEN` in `.env` gesetzt
- [ ] Gleicher Token in `config.lua`
- [ ] Backend läuft (`npm run dev`)
- [ ] FiveM Resource kopiert nach `resources/`
- [ ] Resource in `server.cfg` aktiviert
- [ ] FiveM Server neu gestartet
- [ ] Test mit `/getfivemid` ingame
- [ ] Spieler Join/Leave Events in Konsole sichtbar
- [ ] `/api/bridge/players` gibt Daten zurück
