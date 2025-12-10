# TeamPlaner Backend - Setup und Start
# Windows PowerShell Script

Write-Host "============================================================================" -ForegroundColor Green
Write-Host "   TeamPlaner Backend - 3-Säulen-Architektur Setup" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""

# Prüfe ob Docker läuft
Write-Host "1. Prüfe Docker Installation..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "   ✓ Docker gefunden" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker nicht gefunden!" -ForegroundColor Red
    Write-Host "   Bitte installiere Docker Desktop von: https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# Prüfe ob docker-compose verfügbar ist
Write-Host "2. Prüfe Docker Compose..." -ForegroundColor Yellow
try {
    docker compose version | Out-Null
    Write-Host "   ✓ Docker Compose gefunden" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker Compose nicht gefunden!" -ForegroundColor Red
    exit 1
}

# Wechsle ins Backend-Verzeichnis
$backendPath = Join-Path $PSScriptRoot "backend"
if (Test-Path $backendPath) {
    Set-Location $backendPath
    Write-Host "3. Arbeitsverzeichnis: $backendPath" -ForegroundColor Green
} else {
    Write-Host "✗ Backend-Verzeichnis nicht gefunden!" -ForegroundColor Red
    exit 1
}

# Prüfe ob .env existiert, sonst von .env.example kopieren
Write-Host "4. Prüfe Environment-Konfiguration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "   ✓ .env Datei erstellt (von .env.example)" -ForegroundColor Green
        Write-Host "   ℹ  Bitte passe die Werte in .env bei Bedarf an!" -ForegroundColor Cyan
    } else {
        Write-Host "   ✗ .env.example nicht gefunden!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✓ .env Datei existiert bereits" -ForegroundColor Green
}

# Stoppe eventuell laufende Container
Write-Host ""
Write-Host "5. Stoppe eventuell laufende Container..." -ForegroundColor Yellow
docker compose down 2>$null

# Starte alle Services
Write-Host ""
Write-Host "6. Starte alle Services (PostgreSQL, Redis, SpiceDB, Backend)..." -ForegroundColor Yellow
Write-Host "   Dies kann beim ersten Mal einige Minuten dauern..." -ForegroundColor Cyan
docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Alle Services gestartet" -ForegroundColor Green
} else {
    Write-Host "   ✗ Fehler beim Starten der Services!" -ForegroundColor Red
    exit 1
}

# Warte auf Services
Write-Host ""
Write-Host "7. Warte auf Service-Bereitschaft..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Prüfe Node.js Installation
Write-Host ""
Write-Host "8. Prüfe Node.js Installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✓ Node.js gefunden: $nodeVersion" -ForegroundColor Green
    
    # Prüfe ob node_modules existiert
    Write-Host "   Prüfe und installiere Dependencies..." -ForegroundColor Cyan
    npm install
    
} catch {
    Write-Host "   ✗ Node.js nicht gefunden!" -ForegroundColor Red
    Write-Host "   Bitte installiere Node.js von: https://nodejs.org/" -ForegroundColor Red
    Write-Host "   SpiceDB Schema Upload wird übersprungen..." -ForegroundColor Yellow
}

# SpiceDB Schema hochladen (falls Node.js verfügbar)
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host ""
    Write-Host "9. Lade SpiceDB Schema hoch..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5  # Warte bis SpiceDB ready ist
    
    try {
        npm run spicedb:upload-schema
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ SpiceDB Schema erfolgreich hochgeladen" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠  SpiceDB Schema Upload fehlgeschlagen - versuche es später mit: npm run spicedb:upload-schema" -ForegroundColor Yellow
    }
}

# Health Check
Write-Host ""
Write-Host "10. Führe Health Check durch..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
    $health = $response.Content | ConvertFrom-Json
    
    Write-Host "   ✓ Server: $($health.checks.server)" -ForegroundColor Green
    Write-Host "   ✓ PostgreSQL: $($health.checks.postgres)" -ForegroundColor Green
    Write-Host "   ✓ Redis: $($health.checks.redis)" -ForegroundColor Green
    Write-Host "   ✓ SpiceDB: $($health.checks.spicedb)" -ForegroundColor Green
    
} catch {
    Write-Host "   ⚠  Health Check fehlgeschlagen - Services starten noch..." -ForegroundColor Yellow
    Write-Host "   Versuche es in 30 Sekunden nochmal mit: curl http://localhost:3000/health" -ForegroundColor Cyan
}

# Fertig!
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Green
Write-Host "   ✓ Setup abgeschlossen!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Dein TeamPlaner Backend läuft jetzt auf:" -ForegroundColor Cyan
Write-Host "   • API Server:      http://localhost:3000" -ForegroundColor White
Write-Host "   • Health Check:    http://localhost:3000/health" -ForegroundColor White
Write-Host "   • PostgreSQL:      localhost:5432" -ForegroundColor White
Write-Host "   • Redis:           localhost:6379" -ForegroundColor White
Write-Host "   • SpiceDB:         localhost:50051 (gRPC)" -ForegroundColor White
Write-Host "   • SpiceDB UI:      http://localhost:8443" -ForegroundColor White
Write-Host ""
Write-Host "Nützliche Befehle:" -ForegroundColor Cyan
Write-Host "   docker compose logs -f          # Alle Logs anzeigen" -ForegroundColor White
Write-Host "   docker compose logs -f backend  # Nur Backend Logs" -ForegroundColor White
Write-Host "   docker compose ps               # Status aller Services" -ForegroundColor White
Write-Host "   docker compose down             # Alle Services stoppen" -ForegroundColor White
Write-Host "   docker compose restart backend  # Backend neu starten" -ForegroundColor White
Write-Host ""
Write-Host "Teste die API:" -ForegroundColor Cyan
Write-Host '   curl -X POST http://localhost:3000/api/auth/register \' -ForegroundColor White
Write-Host '     -H "Content-Type: application/json" \' -ForegroundColor White
Write-Host '     -d ''{"email":"test@test.com","password":"test1234","firstName":"Test","lastName":"User"}''' -ForegroundColor White
Write-Host ""
Write-Host "Dokumentation:" -ForegroundColor Cyan
Write-Host "   backend/README.md                    # Haupt-Dokumentation" -ForegroundColor White
Write-Host "   backend/ARCHITECTURE.md              # Architektur-Diagramme" -ForegroundColor White
Write-Host "   backend/IMPLEMENTATION_SUMMARY.md    # Feature-Übersicht" -ForegroundColor White
Write-Host "   backend/PROJECT_OVERVIEW.md          # Projekt-Struktur" -ForegroundColor White
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Green
Write-Host ""
