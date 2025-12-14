const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
require('dotenv').config();

const { testConnection, initializeDatabase, executeQuery } = require('./database');
const { attachUser, sessionLogger, requireAuth, requireBridgeAuth } = require('./middleware/auth');

// Express App initialisieren
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

// CORS - nur für localhost Development
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : `http://localhost:${PORT}`,
    credentials: true
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Management
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS in Production
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Tage
        sameSite: 'lax'
    },
    name: 'teamplaner.sid' // Custom Session Cookie Name
}));

// Passport Initialize
app.use(passport.initialize());
app.use(passport.session());

// Passport Serialization (optional, nur für Discord)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Session Logging (Development)
app.use(sessionLogger);

// User zu Response hinzufügen
app.use(attachUser);

// ==================== STATISCHE DATEIEN ====================

// Statische Dateien (Frontend)
app.use(express.static(path.join(__dirname), {
    index: 'index.html',
    extensions: ['html', 'htm']
}));

// ==================== ROUTES ====================

// Auth Routes (Discourse User API) - NICHT geschützt
const discourseAuthRoutes = require('./routes/discourse-auth');
app.use('/auth', discourseAuthRoutes);

// Discord OAuth Routes - Protected by Session Auth
const discordRoutes = require('./routes/discord');
app.use('/auth', discordRoutes);

// FiveM Bridge Routes - Protected by Bridge Token
const bridgeRoutes = require('./routes/bridge');
app.use('/api/bridge', bridgeRoutes);

// Profile Routes - Protected by Session Auth
const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);

// API Routes - MIT Auth-Schutz
const tasksRoutes = require('./routes/tasks');
const teamMembersRoutes = require('./routes/teamMembers');
const projectsRoutes = require('./routes/projects');
const boardsRoutes = require('./routes/boards');

app.use('/api/tasks', requireAuth, tasksRoutes);
app.use('/api/team-members', requireAuth, teamMembersRoutes);
app.use('/api/projects', requireAuth, projectsRoutes);
app.use('/api/boards', boardsRoutes); // Hat eigene Auth

// ==================== ADMIN: ORGANISATIONEN ====================
app.get('/api/organisations', requireAuth, async (req, res) => {
    try {
        const result = await executeQuery('SELECT id, name, description FROM organisations ORDER BY name');
        res.json({ success: true, organisations: result.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/organisations', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Organisationen erstellen' });
    }
    
    try {
        const { name, description } = req.body;
        const result = await executeQuery('INSERT INTO organisations (name, description) VALUES (?, ?)', [name, description]);
        res.json({ success: true, id: result.data.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/organisations/:id', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Organisationen bearbeiten' });
    }
    
    try {
        const { name, description } = req.body;
        await executeQuery('UPDATE organisations SET name = ?, description = ? WHERE id = ?', [name, description, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/organisations/:id', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Organisationen löschen' });
    }
    
    try {
        await executeQuery('DELETE FROM organisations WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ADMIN: GRUPPEN ====================
app.get('/api/groups', requireAuth, async (req, res) => {
    try {
        const result = await executeQuery('SELECT id, name, description, organisation_id FROM groups WHERE organisation_id = 2 ORDER BY name');
        res.json({ success: true, groups: result.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/groups', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Gruppen erstellen' });
    }
    
    try {
        const { name, description, organisation_id } = req.body;
        const result = await executeQuery('INSERT INTO groups (name, description, organisation_id) VALUES (?, ?, ?)', [name, description, organisation_id]);
        res.json({ success: true, id: result.data.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/groups/:id', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Gruppen bearbeiten' });
    }
    
    try {
        const { name, description, organisation_id } = req.body;
        await executeQuery('UPDATE groups SET name = ?, description = ?, organisation_id = ? WHERE id = ?', [name, description, organisation_id, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/groups/:id', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Gruppen löschen' });
    }
    
    try {
        await executeQuery('DELETE FROM groups WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ADMIN: ROLLEN ====================
app.get('/api/roles', requireAuth, async (req, res) => {
    try {
        const result = await executeQuery(`
            SELECT r.id, r.name, r.description, r.group_id 
            FROM roles r
            INNER JOIN groups g ON r.group_id = g.id
            WHERE g.organisation_id = 2
            ORDER BY r.name
        `);
        res.json({ success: true, roles: result.data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== SERVER CONSOLE ====================
const serverLogs = [];
const MAX_LOGS = 2500;
let sseClients = [];

// Command Queue für FiveM Server
const commandQueue = [];
const MAX_QUEUE_SIZE = 50;

// FiveM Server Process Management
let fivemServerProcess = null;
let serverStarting = false;

// Middleware: Prüfe Server-Console Berechtigung
function requireConsoleAccess(req, res, next) {
    const user = req.session?.user;
    if (!user || !user.group) {
        return res.status(403).json({ success: false, error: 'Keine Berechtigung' });
    }
    
    const allowedGroups = ['Developer', 'Projektleitung'];
    if (!allowedGroups.includes(user.group.name)) {
        return res.status(403).json({ success: false, error: 'Nur Developer und Projektleitung haben Zugriff' });
    }
    
    next();
}

// POST: Empfange Log von Bridge
app.post('/api/console/log', requireBridgeAuth, async (req, res) => {
    try {
        const { level, message, source, timestamp } = req.body;
        
        const logEntry = {
            id: Date.now(),
            level: level || 'info',
            message: message || '',
            source: source || 'server',
            timestamp: timestamp || new Date().toISOString(),
            receivedAt: new Date().toISOString(),
            hasAnsi: /\x1b\[[\d;]*m|\^[0-9]/.test(message || '') // Flag für ANSI und FiveM Codes
        };
        
        // Speichere Log (max 2500)
        serverLogs.push(logEntry);
        if (serverLogs.length > MAX_LOGS) {
            serverLogs.shift();
        }
        
        // Sende an alle SSE-Clients
        sseClients.forEach(client => {
            client.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET: Hole letzte Logs
app.get('/api/console/logs', requireAuth, requireConsoleAccess, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = serverLogs.slice(-limit);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET: SSE Stream für Live-Logs
app.get('/api/console/stream', requireAuth, requireConsoleAccess, (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    // Füge Client zur Liste hinzu
    sseClients.push(res);
    
    // Sende initiale Nachricht
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Live-Stream verbunden' })}\n\n`);
    
    // Entferne Client bei Disconnect
    req.on('close', () => {
        sseClients = sseClients.filter(client => client !== res);
    });
});

// POST: Sende Befehl an Server
app.post('/api/console/command', requireAuth, requireConsoleAccess, async (req, res) => {
    try {
        const { command } = req.body;
        
        if (!command || command.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Command ist leer' });
        }
        
        // Log Command
        const logEntry = {
            id: Date.now(),
            level: 'command',
            message: `> ${command}`,
            source: 'web',
            timestamp: new Date().toISOString(),
            user: req.session.user.displayName
        };
        
        serverLogs.push(logEntry);
        sseClients.forEach(client => {
            client.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        });
        
        // Füge Command zur Queue hinzu (FiveM holt sich diese ab)
        commandQueue.push({
            id: Date.now(),
            command: command.trim(),
            user: req.session.user.displayName,
            timestamp: new Date().toISOString()
        });
        
        // Begrenze Queue-Größe
        if (commandQueue.length > MAX_QUEUE_SIZE) {
            commandQueue.shift();
        }
        
        res.json({ success: true, message: 'Command an Server gesendet' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET: Bridge holt Commands ab (Polling)
app.get('/api/console/commands', requireBridgeAuth, (req, res) => {
    try {
        // Sende alle Commands und leere die Queue
        const commands = [...commandQueue];
        commandQueue.length = 0;
        
        res.json({ success: true, commands });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST: Server Control Actions (restart, stop, start)
app.post('/api/console/server/:action', requireAuth, requireConsoleAccess, async (req, res) => {
    try {
        const { action } = req.params;
        const allowedActions = ['restart', 'stop', 'start'];
        
        if (!allowedActions.includes(action)) {
            return res.status(400).json({ success: false, error: 'Ungültige Aktion' });
        }
        
        // Log Action
        const logEntry = {
            id: Date.now(),
            level: 'warn',
            message: `⚠️ SERVER ${action.toUpperCase()} ausgelöst von ${req.session.user.displayName}`,
            source: 'web-control',
            timestamp: new Date().toISOString()
        };
        
        serverLogs.push(logEntry);
        sseClients.forEach(client => {
            client.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        });
        
        switch(action) {
            case 'restart':
                // Erst stoppen
                commandQueue.push({
                    id: Date.now(),
                    command: 'quit',
                    user: `${req.session.user.displayName} [RESTART]`,
                    timestamp: new Date().toISOString()
                });
                
                // Nach 5 Sekunden automatisch neu starten
                setTimeout(() => {
                    startFiveMServer();
                }, 5000);
                
                return res.json({ 
                    success: true, 
                    message: 'Server wird neu gestartet.'
                });
                
            case 'stop':
                commandQueue.push({
                    id: Date.now(),
                    command: 'quit',
                    user: `${req.session.user.displayName} [STOP]`,
                    timestamp: new Date().toISOString()
                });
                
                // Beende auch den lokalen Prozess falls vorhanden
                if (fivemServerProcess) {
                    fivemServerProcess.kill();
                    fivemServerProcess = null;
                }
                
                return res.json({ 
                    success: true, 
                    message: 'Server wird gestoppt.'
                });
                
            case 'start':
                const result = await startFiveMServer();
                return res.json(result);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// FiveM Server Start Funktion
async function startFiveMServer() {
    if (serverStarting) {
        return { success: false, error: 'Server startet bereits!' };
    }
    
    if (fivemServerProcess) {
        return { success: false, error: 'Server läuft bereits!' };
    }
    
    const serverCwd = process.env.FIVEM_SERVER_CWD;  // Working Directory (server-data)
    const serverExe = process.env.FIVEM_SERVER_EXE;  // Voller Pfad zu FXServer.exe
    const serverCfg = process.env.FIVEM_SERVER_CFG || 'server.cfg';
    
    if (!serverCwd || !fs.existsSync(serverCwd)) {
        return { 
            success: false, 
            error: 'FiveM Server Working Directory nicht konfiguriert! Bitte setze FIVEM_SERVER_CWD in .env' 
        };
    }
    
    if (!serverExe || !fs.existsSync(serverExe)) {
        return { 
            success: false, 
            error: `FXServer.exe nicht gefunden! Pfad: ${serverExe || 'nicht gesetzt'}` 
        };
    }
    
    serverStarting = true;
    
    console.log(`Starte FiveM Server: ${serverExe}`);
    console.log(`Working Directory: ${serverCwd}`);
    console.log(`Config: ${serverCfg}`);
    
    try {
        // Starte FXServer.exe mit +exec server.cfg
        // Working Directory ist server-data, FXServer.exe liegt in artifacts
        fivemServerProcess = spawn(serverExe, ['+exec', serverCfg], {
            cwd: serverCwd,
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false,
            windowsHide: false  // Zeige Console-Fenster (optional)
        });
        
        // Buffer für mehrzeilige Ausgaben
        let stdoutBuffer = '';
        let stderrBuffer = '';
        
        // Log die Server Ausgabe (stdout)
        fivemServerProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutBuffer += output;
            
            // Verarbeite komplette Zeilen
            const lines = stdoutBuffer.split(/\r?\n/);
            stdoutBuffer = lines.pop() || ''; // Behalte unvollständige Zeile
            
            lines.forEach(line => {
                if (line.trim()) {
                    // Erkenne Log-Level aus FiveM Ausgabe
                    let level = 'info';
                    if (line.includes('[ERROR]') || line.includes('Error:')) {
                        level = 'error';
                    } else if (line.includes('[WARN]') || line.includes('Warning:')) {
                        level = 'warn';
                    } else if (line.includes('[DEBUG]')) {
                        level = 'debug';
                    }
                    
                    // Konvertiere ANSI-Farben zu HTML (behalte ANSI-Codes für Frontend)
                    const log = {
                        id: Date.now() + Math.random(), // Unique ID auch bei schnellen Logs
                        level: level,
                        message: line, // Behalte ANSI-Codes im String
                        source: 'fivem-console',
                        timestamp: new Date().toISOString(),
                        hasAnsi: /\x1b\[[\d;]*m|\^[0-9]/.test(line) // Flag für ANSI-Codes UND FiveM ^N Codes
                    };
                    
                    serverLogs.push(log);
                    if (serverLogs.length > MAX_LOGS) serverLogs.shift();
                    
                    // Broadcast an alle Clients
                    sseClients.forEach(client => {
                        try {
                            client.write(`data: ${JSON.stringify(log)}\n\n`);
                        } catch (e) {
                            // Client disconnected, wird später entfernt
                        }
                    });
                    
                    // Optional: Auch in Node Console loggen (ohne ANSI)
                    if (level === 'error') {
                        console.error(`[FiveM] ${line}`);
                    }
                }
            });
        });
        
        // Log Fehler-Ausgabe (stderr)
        fivemServerProcess.stderr.on('data', (data) => {
            const output = data.toString();
            stderrBuffer += output;
            
            const lines = stderrBuffer.split(/\r?\n/);
            stderrBuffer = lines.pop() || '';
            
            lines.forEach(line => {
                if (line.trim()) {
                    const log = {
                        id: Date.now() + Math.random(),
                        level: 'error',
                        message: line,
                        source: 'fivem-error',
                        timestamp: new Date().toISOString(),
                        hasAnsi: /\x1b\[[\d;]*m|\^[0-9]/.test(line) // Flag für ANSI und FiveM Codes
                    };
                    
                    serverLogs.push(log);
                    if (serverLogs.length > MAX_LOGS) serverLogs.shift();
                    
                    sseClients.forEach(client => {
                        try {
                            client.write(`data: ${JSON.stringify(log)}\n\n`);
                        } catch (e) {
                            // Client disconnected
                        }
                    });
                    
                    console.error(`[FiveM ERROR] ${line}`);
                }
            });
        });
        
        fivemServerProcess.on('close', (code) => {
            console.log(`🔴 FiveM Server beendet mit Code: ${code}`);
            const log = {
                id: Date.now(),
                level: 'warn',
                message: `FiveM Server beendet (Exit Code: ${code})`,
                source: 'system',
                timestamp: new Date().toISOString()
            };
            serverLogs.push(log);
            if (serverLogs.length > MAX_LOGS) serverLogs.shift();
            
            sseClients.forEach(client => {
                client.write(`data: ${JSON.stringify(log)}\n\n`);
            });
            
            fivemServerProcess = null;
            serverStarting = false;
        });
        
        fivemServerProcess.on('error', (error) => {
            console.error('❌ FiveM Server Fehler:', error);
            fivemServerProcess = null;
            serverStarting = false;
        });
        
        serverStarting = false;
        
        const successLog = {
            id: Date.now(),
            level: 'info',
            message: '✅ FiveM Server wird gestartet...',
            source: 'system',
            timestamp: new Date().toISOString()
        };
        serverLogs.push(successLog);
        if (serverLogs.length > MAX_LOGS) serverLogs.shift();
        
        sseClients.forEach(client => {
            client.write(`data: ${JSON.stringify(successLog)}\n\n`);
        });
        
        return { 
            success: true, 
            message: 'FiveM Server wird gestartet. Bitte warte ca. 30 Sekunden...',
            pid: fivemServerProcess.pid
        };
    } catch (error) {
        serverStarting = false;
        fivemServerProcess = null;
        console.error('❌ Fehler beim Starten des Servers:', error);
        return { success: false, error: error.message };
    }
}

app.post('/api/roles', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Rollen erstellen' });
    }
    
    try {
        const { name, description, group_id } = req.body;
        const result = await executeQuery('INSERT INTO roles (name, description, group_id) VALUES (?, ?, ?)', [name, description, group_id]);
        res.json({ success: true, id: result.data.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/roles/:id', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Rollen bearbeiten' });
    }
    
    try {
        const { name, description, group_id } = req.body;
        await executeQuery('UPDATE roles SET name = ?, description = ?, group_id = ? WHERE id = ?', [name, description, group_id, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/roles/:id', requireAuth, async (req, res) => {
    if (!['Admin', 'WebAdmin'].includes(req.session.user.role?.name)) {
        return res.status(403).json({ success: false, error: 'Nur Admins können Rollen löschen' });
    }
    
    try {
        await executeQuery('DELETE FROM roles WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health Check (öffentlich)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ==================== ERROR HANDLING ====================

// 404 Handler für API-Routen
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        path: req.path 
    });
});

// Alle anderen Routen -> index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ==================== SERVER START ====================

async function startServer() {
    try {
        // 1. Datenbankverbindung testen
        console.log('🔌 Verbinde mit Datenbank...');
        const connected = await testConnection();
        
        if (!connected) {
            console.error('❌ Datenbankverbindung fehlgeschlagen');
            process.exit(1);
        }
        
        // 2. Datenbank initialisieren
        await initializeDatabase();
        
        // 3. Server starten
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(50));
            console.log('🚀 TeamPlaner Server gestartet!');
            console.log('='.repeat(50));
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🔐 Auth: Discourse User API (forum.cfx.re)`);
            console.log(`🗄️  DB: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
            console.log(`🌍 ENV: ${process.env.NODE_ENV || 'development'}`);
            console.log('='.repeat(50) + '\n');
            
            // Warnungen
            const fs = require('fs');
            const keypairPath = require('path').join(__dirname, 'keypair.pem');
            if (!fs.existsSync(keypairPath)) {
                console.log('⚠️  WARNUNG: keypair.pem nicht gefunden!');
                console.log('   Führe aus: node generate-keypair.js\n');
            }
            
            if (process.env.SESSION_SECRET === 'super_secret_session_key_change_me_in_production_12345') {
                console.log('⚠️  WARNUNG: Standard SESSION_SECRET wird verwendet!');
                console.log('   Bitte ändern für Produktion!\n');
            }
            
            // FiveM Bridge Hinweis
            console.log('💡 TIPP: Nach einem Backend-Restart musst du ingame `/bridge:sync` ausführen,');
            console.log('   damit der Ingame-Status wieder angezeigt wird!\n');
        });
        
    } catch (err) {
        console.error('❌ Server Start Fehler:', err);
        process.exit(1);
    }
}

// Server starten
startServer();

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM empfangen, fahre Server herunter...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT empfangen, fahre Server herunter...');
    process.exit(0);
});
