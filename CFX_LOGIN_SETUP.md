# CFX OAuth Login einrichten

## 1. CFX OAuth Application erstellen

1. Gehen Sie zu: https://account.cfx.re/applications
2. Klicken Sie auf **"Create new application"**
3. Füllen Sie die Details aus:
   - **Name**: TeamPlaner (oder Ihr Projektname)
   - **Redirect URIs**: `http://localhost:3000/auth/callback`
   - **Scopes**: `openid`, `identify`

4. Nach dem Erstellen erhalten Sie:
   - **Client ID** (z.B. `abc123def456`)
   - **Client Secret** (z.B. `xyz789uvw456`)

## 2. Umgebungsvariablen konfigurieren

Öffnen Sie die `.env` Datei und tragen Sie Ihre CFX-Daten ein:

```env
CFX_CLIENT_ID=ihre_client_id_hier
CFX_CLIENT_SECRET=ihr_client_secret_hier
CFX_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=generieren_sie_hier_einen_zufälligen_string
```

**Wichtig**: Ändern Sie `SESSION_SECRET` zu einem zufälligen String!

## 3. Dependencies installieren

```bash
npm install
```

## 4. Server starten

```bash
npm run dev
```

## 5. Testen

1. Öffnen Sie `http://localhost:3000`
2. Sie werden zum Login-Overlay weitergeleitet
3. Klicken Sie auf "Mit CFX anmelden"
4. Melden Sie sich mit Ihrem CFX-Konto an
5. Sie werden zur Website zurückgeleitet

## Funktionsweise

### Backend (server.js)
- **Session-Management** mit `express-session`
- **Auth-Routen**:
  - `GET /auth/login` - Leitet zu CFX OAuth weiter
  - `GET /auth/callback` - CFX OAuth Callback
  - `GET /auth/logout` - Logout
  - `GET /auth/me` - Aktuelle Session prüfen

### Frontend (auth-manager.js)
- **AuthManager** - Globales Auth-Objekt
- Prüft beim Laden ob Benutzer eingeloggt ist
- Zeigt Login-Overlay wenn nicht authentifiziert
- Speichert Benutzerinformationen

### Geschützte Routen
Alle API-Routen sind mit `requireAuth` Middleware geschützt:
- `/api/tasks/*`
- `/api/team-members/*`
- `/api/projects/*`

## Produktion

Für die Produktion müssen Sie:

1. **Redirect URI** in CFX Application ändern zu Ihrer Domain
2. **.env** anpassen:
   ```env
   CFX_REDIRECT_URI=https://ihre-domain.de/auth/callback
   ```
3. **HTTPS** aktivieren (in server.js: `secure: true` bei Cookie-Einstellungen)
4. **CORS** auf Ihre Domain einschränken

## Troubleshooting

### "Invalid redirect_uri"
- Prüfen Sie ob die Redirect URI in der CFX Application exakt übereinstimmt
- Muss `http://localhost:3000/auth/callback` sein (mit http://)

### "Access denied"
- Prüfen Sie Client ID und Client Secret in der .env
- Stellen Sie sicher dass alle Scopes korrekt sind

### Session funktioniert nicht
- Prüfen Sie ob SESSION_SECRET gesetzt ist
- Cookies müssen aktiviert sein im Browser
