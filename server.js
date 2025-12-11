const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const { testConnection, initializeDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'change_this_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Bei HTTPS auf true setzen
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 Stunden
    }
}));

// Statische Dateien servieren
app.use(express.static(path.join(__dirname)));

// Auth Middleware
const { attachUser, requireAuth } = require('./middleware/auth');
app.use(attachUser);

// Auth Routes (NICHT geschützt)
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// API Routes importieren (MIT Auth-Schutz)
const tasksRoutes = require('./routes/tasks');
const teamMembersRoutes = require('./routes/teamMembers');
const projectsRoutes = require('./routes/projects');

// Routes registrieren - ALLE mit requireAuth geschützt
app.use('/api/tasks', requireAuth, tasksRoutes);
app.use('/api/team-members', requireAuth, teamMembersRoutes);
app.use('/api/projects', requireAuth, projectsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server läuft' });
});

// Server starten
async function startServer() {
    try {
        // Datenbankverbindung testen
        const connected = await testConnection();
        if (!connected) {
            console.error('Kann Server nicht starten - Keine Datenbankverbindung');
            process.exit(1);
        }

        // Datenbank initialisieren
        await initializeDatabase();

        // Server starten
        app.listen(PORT, () => {
            console.log(`\n🚀 Server läuft auf http://localhost:${PORT}`);
            console.log(`📊 API verfügbar unter http://localhost:${PORT}/api`);
        });
    } catch (err) {
        console.error('Fehler beim Starten des Servers:', err);
        process.exit(1);
    }
}

startServer();
