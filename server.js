const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection, initializeDatabase } = require('./database');
const { attachUser, sessionLogger, requireAuth } = require('./middleware/auth');

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

app.use('/api/tasks', requireAuth, tasksRoutes);
app.use('/api/team-members', requireAuth, teamMembersRoutes);
app.use('/api/projects', requireAuth, projectsRoutes);

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
