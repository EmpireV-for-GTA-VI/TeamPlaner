# Verwende Node.js LTS
FROM node:18-alpine

# Arbeitsverzeichnis
WORKDIR /app

# Package files kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm ci --only=production

# Source Code kopieren
COPY . .

# User für Sicherheit
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Port exponieren
EXPOSE 3000

# Health Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Start Command
CMD ["node", "server.js"]
