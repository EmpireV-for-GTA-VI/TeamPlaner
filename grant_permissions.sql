-- Berechtigungen für webPanda auf die spielplatz Datenbank erteilen

-- Alle Berechtigungen auf die Datenbank 'spielplatz' geben
GRANT ALL PRIVILEGES ON spielplatz.* TO 'webPanda'@'localhost';
FLUSH PRIVILEGES;

-- Optional: Prüfen welche Berechtigungen der User hat
SHOW GRANTS FOR 'webPanda'@'localhost';
