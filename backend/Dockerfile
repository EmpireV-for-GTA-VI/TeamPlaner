# Verwende Node.js LTS
FROM node:18-alpine

# Arbeitsverzeichnis erstellen und Rechte setzen
WORKDIR /app

# User für Sicherheit anlegen (Alpine Syntax)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Abhängigkeiten kopieren
COPY package*.json ./

# Dependencies installieren (als root, damit npm global/system rights hat falls nötig)
RUN npm install --only=production

# WICHTIG: Source Code kopieren UND Eigentümer ändern
# Dies stellt sicher, dass der User 'nodejs' Schreibrechte hat, falls nötig.
COPY --chown=nodejs:nodejs . .

# Auf den sicheren User wechseln
USER nodejs

# Port exponieren
EXPOSE 3000

# Health Check (ist gut so)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Start Command
CMD ["node", "server.js"]