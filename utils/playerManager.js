/**
 * Player Manager
 * Verwaltet aktuell ingame online Spieler
 */

class PlayerManager {
    constructor() {
        // Map: fivemId -> { source, name, joinedAt }
        this.onlinePlayers = new Map();
    }

    /**
     * Spieler als online markieren
     */
    addPlayer(fivemId, playerData) {
        this.onlinePlayers.set(fivemId, {
            source: playerData.source,
            name: playerData.name,
            joinedAt: new Date()
        });
        
        console.log(`✓ Player online: ${playerData.name} (FiveM ID: ${fivemId})`);
    }

    /**
     * Spieler als offline markieren
     */
    removePlayer(fivemId) {
        const player = this.onlinePlayers.get(fivemId);
        
        if (player) {
            this.onlinePlayers.delete(fivemId);
            console.log(`✓ Player offline: ${player.name} (FiveM ID: ${fivemId})`);
            return true;
        }
        
        return false;
    }

    /**
     * Prüfe ob Spieler online ist
     */
    isOnline(fivemId) {
        return this.onlinePlayers.has(fivemId);
    }

    /**
     * Hole Spieler-Daten
     */
    getPlayer(fivemId) {
        return this.onlinePlayers.get(fivemId) || null;
    }

    /**
     * Alle online Spieler
     */
    getAllPlayers() {
        return Array.from(this.onlinePlayers.entries()).map(([fivemId, data]) => ({
            fivemId,
            ...data
        }));
    }

    /**
     * Anzahl online Spieler
     */
    getPlayerCount() {
        return this.onlinePlayers.size;
    }

    /**
     * Lösche alle Spieler (z.B. bei Server-Restart)
     */
    clear() {
        const count = this.onlinePlayers.size;
        this.onlinePlayers.clear();
        console.log(`✓ Cleared ${count} players from online list`);
    }
}

// Singleton Instance
const playerManager = new PlayerManager();

module.exports = playerManager;
