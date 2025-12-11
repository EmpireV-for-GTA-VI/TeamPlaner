# MariaDB Authentifizierungsproblem beheben

## Problem
Der Benutzer 'webPanda' ist mit einem inkompatiblen Authentifizierungs-Plugin konfiguriert.

## Lösung

### Option 1: Benutzer mit mysql_native_password Plugin neu erstellen

Öffnen Sie HeidiSQL, phpMyAdmin oder MySQL Workbench und führen Sie aus:

```sql
-- Alten Benutzer löschen (falls vorhanden)
DROP USER IF EXISTS 'webPanda'@'localhost';

-- Neuen Benutzer mit kompatiblem Plugin erstellen
CREATE USER 'webPanda'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('5rXTS9KQ');

-- Berechtigungen erteilen
GRANT ALL PRIVILEGES ON users_web.* TO 'webPanda'@'localhost';
FLUSH PRIVILEGES;
```

### Option 2: Bestehenden Benutzer ändern

```sql
-- Plugin des bestehenden Benutzers ändern
ALTER USER 'webPanda'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('5rXTS9KQ');
FLUSH PRIVILEGES;
```

### Option 3: In MariaDB-Konfiguration (my.ini / my.cnf)

Fügen Sie folgende Zeilen unter [mysqld] hinzu:
```ini
[mysqld]
default-authentication-plugin=mysql_native_password
```

Dann MariaDB neu starten.

## Testen

Nach der Änderung führen Sie aus:
```bash
node test-connection.js
```
