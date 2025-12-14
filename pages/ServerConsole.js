// Server Console Komponente - nur für Developer und Projektleitung
const ServerConsoleComponent = {
  data() {
    return {
      logs: [],
      connected: false,
      autoScroll: true,
      filter: 'all', // all, info, warn, error, debug, command
      command: '',
      eventSource: null,
      loading: true,
      error: null,
      maxLogs: 2500,
      
      // Command History
      commandHistory: [],
      historyIndex: -1,
      
      // Search
      searchQuery: '',
      searchMatches: [],
      currentMatchIndex: 0,
      
      // Quick Commands
      quickCommands: [
        { name: 'Status', command: 'status', icon: '📊', color: 'blue' },
        { name: 'Load Items', command: 'loadItems', icon: '📦', color: 'green' },
        { name: 'Sync Players', command: 'bridge:sync', icon: '🔄', color: 'purple' },
        { name: 'Restart Bridge', command: 'restart teamplaner-bridge', icon: '🔌', color: 'yellow' },
        { name: 'Resource List', command: 'list', icon: '📋', color: 'gray' },
      ],
      
      // Custom Commands Modal
      showCustomModal: false,
      customCommand: { name: '', command: '', icon: '⚡', color: 'blue' },
      customCommands: [],
      
      // Server Control
      serverControlEnabled: true, // Kann später aus Config kommen
      
      // Font Size
      fontSize: 12 // Standard: 12px (xs = text-xs)
    }
  },

  computed: {
    logFontStyle() {
      return {
        fontSize: this.fontSize + 'px'
      };
    },
    
    filteredLogs() {
      let filtered = this.logs;
      
      // Filter by level
      if (this.filter !== 'all') {
        filtered = filtered.filter(log => log.level === this.filter);
      }
      
      return filtered;
    },
    
    hasAccess() {
      const user = window.appState?.user;
      if (!user || !user.group) return false;
      const allowedGroups = ['Developer', 'Projektleitung'];
      return allowedGroups.includes(user.group.name);
    }
  },

  async mounted() {
    if (!this.hasAccess) {
      this.error = 'Du hast keine Berechtigung für die Server-Konsole. Nur Developer und Projektleitung haben Zugriff.';
      this.loading = false;
      return;
    }
    
    this.loadCustomCommands();
    this.loadCommandHistory();
    
    // Lade gespeicherte Schriftgröße
    const savedFontSize = localStorage.getItem('console_font_size');
    if (savedFontSize) {
      this.fontSize = parseInt(savedFontSize);
    }
    
    await this.loadInitialLogs();
    this.connectStream();
  },

  beforeUnmount() {
    this.disconnectStream();
  },

  methods: {
    async loadInitialLogs() {
      try {
        const response = await fetch('/api/console/logs?limit=100', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
          this.logs = data.logs;
          this.loading = false;
          this.$nextTick(() => {
            if (this.autoScroll) this.scrollToBottom();
          });
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error('Failed to load logs:', error);
        this.error = 'Fehler beim Laden der Logs: ' + error.message;
        this.loading = false;
      }
    },

    connectStream() {
      try {
        this.eventSource = new EventSource('/api/console/stream');
        
        this.eventSource.onopen = () => {
          this.connected = true;
          console.log('🟢 Console Stream verbunden');
        };
        
        this.eventSource.onmessage = (event) => {
          try {
            const log = JSON.parse(event.data);
            
            // Skip connection messages
            if (log.type === 'connected') return;
            
            this.logs.push(log);
            
            // Begrenze Log-Anzahl
            if (this.logs.length > this.maxLogs) {
              this.logs.shift();
            }
            
            this.$nextTick(() => {
              if (this.autoScroll) this.scrollToBottom();
            });
          } catch (error) {
            console.error('Failed to parse log:', error);
          }
        };
        
        this.eventSource.onerror = () => {
          this.connected = false;
          console.log('🔴 Console Stream disconnected');
          
          // Versuche Reconnect nach 5 Sekunden
          setTimeout(() => {
            if (!this.connected) {
              console.log('🔄 Reconnecting...');
              this.connectStream();
            }
          }, 5000);
        };
      } catch (error) {
        console.error('Failed to connect stream:', error);
        this.connected = false;
      }
    },

    disconnectStream() {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
        this.connected = false;
      }
    },

    async sendCommand() {
      if (!this.command.trim()) return;
      
      try {
        // Füge Command zur History hinzu
        if (this.command.trim() && this.commandHistory[0] !== this.command.trim()) {
          this.commandHistory.unshift(this.command.trim());
          // Behalte nur die letzten 50 Commands
          if (this.commandHistory.length > 50) {
            this.commandHistory.pop();
          }
          localStorage.setItem('console_command_history', JSON.stringify(this.commandHistory));
        }
        
        const response = await fetch('/api/console/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ command: this.command })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error);
        }
        
        this.command = '';
        this.historyIndex = -1;
      } catch (error) {
        console.error('Failed to send command:', error);
        alert('Fehler beim Senden des Befehls: ' + error.message);
      }
    },
    
    handleKeyDown(event) {
      // Pfeil nach oben - vorheriger Command
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.commandHistory.length === 0) return;
        
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
          this.command = this.commandHistory[this.historyIndex];
        }
      }
      // Pfeil nach unten - nächster Command
      else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.command = this.commandHistory[this.historyIndex];
        } else if (this.historyIndex === 0) {
          this.historyIndex = -1;
          this.command = '';
        }
      }
    },
    
    performSearch() {
      this.searchMatches = [];
      this.currentMatchIndex = 0;
      
      if (!this.searchQuery.trim()) return;
      
      const query = this.searchQuery.toLowerCase();
      this.searchMatches = this.filteredLogs
        .map((log, index) => ({ log, index }))
        .filter(({ log }) => log.message.toLowerCase().includes(query));
      
      if (this.searchMatches.length > 0) {
        this.scrollToMatch(0);
      }
    },
    
    nextMatch() {
      if (this.searchMatches.length === 0) return;
      this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
      this.scrollToMatch(this.currentMatchIndex);
    },
    
    prevMatch() {
      if (this.searchMatches.length === 0) return;
      this.currentMatchIndex = (this.currentMatchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
      this.scrollToMatch(this.currentMatchIndex);
    },
    
    scrollToMatch(matchIndex) {
      const match = this.searchMatches[matchIndex];
      if (!match) return;
      
      this.$nextTick(() => {
        const container = this.$refs.logContainer;
        const logElements = container?.querySelectorAll('[data-log-index]');
        if (!logElements) return;
        
        // Entferne alte Hervorhebung
        logElements.forEach(el => {
          el.classList.remove('bg-blue-900', 'border-l-4', 'border-blue-500');
        });
        
        const targetElement = Array.from(logElements).find(el => 
          parseInt(el.getAttribute('data-log-index')) === match.index
        );
        
        if (targetElement) {
          // Füge Hervorhebung für aktuelles Match hinzu
          targetElement.classList.add('bg-blue-900', 'border-l-4', 'border-blue-500');
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    
    highlightSearchText(text) {
      if (!this.searchQuery.trim()) return text;
      
      const query = this.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex
      const regex = new RegExp(`(${query})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-300 text-black font-bold px-1">$1</mark>');
    },
    
    loadCommandHistory() {
      try {
        const saved = localStorage.getItem('console_command_history');
        if (saved) {
          this.commandHistory = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load command history:', e);
      }
    },

    scrollToBottom() {
      const container = this.$refs.logContainer;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    },

    clearLogs() {
      if (confirm('Alle Logs löschen? Dies löscht nur die Anzeige, nicht die Server-Logs.')) {
        this.logs = [];
      }
    },
    
    increaseFontSize() {
      if (this.fontSize < 24) {
        this.fontSize++;
        localStorage.setItem('console_font_size', this.fontSize);
      }
    },
    
    decreaseFontSize() {
      if (this.fontSize > 8) {
        this.fontSize--;
        localStorage.setItem('console_font_size', this.fontSize);
      }
    },

    exportLogs() {
      // Hilfsfunktion: Entfernt ANSI-Escape-Codes und FiveM-Color-Codes
      const stripColors = (text) => {
        return text
          .replace(/\x1b\[[0-9;]*m/g, '') // ANSI Codes entfernen
          .replace(/\^[0-9]/g, '')        // FiveM ^0-^9 entfernen
          .trim();
      };

      // Erstelle human-readable Format
      let text = '╔' + '═'.repeat(78) + '╗\n';
      text += '║' + ' TeamPlaner Server Console - Log Export'.padEnd(78) + '║\n';
      text += '╠' + '═'.repeat(78) + '╣\n';
      text += '║ ' + ('Exportiert am: ' + new Date().toLocaleString('de-DE', { 
        dateStyle: 'full', 
        timeStyle: 'long' 
      })).padEnd(77) + '║\n';
      text += '║ ' + ('Anzahl Einträge: ' + this.logs.length).padEnd(77) + '║\n';
      text += '╚' + '═'.repeat(78) + '╝\n\n';
      
      this.logs.forEach((log, index) => {
        const time = new Date(log.timestamp).toLocaleString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        const levelEmoji = this.getLogIcon(log.level);
        const levelText = log.level.toUpperCase().padEnd(7);
        const sourceText = log.source.padEnd(20);
        
        // Nachricht bereinigen
        const cleanMessage = stripColors(log.message);
        
        // Header der Log-Zeile
        text += `┌─ Log #${(index + 1).toString().padStart(4, '0')} `;
        text += '─'.repeat(80 - 15 - (index + 1).toString().length) + '\n';
        
        // Zeit, Level, Source
        text += `│ 🕐 ${time}  ${levelEmoji} ${levelText}  📁 ${sourceText}\n`;
        
        // Nachricht (mit Zeilenumbruch bei langen Texten)
        text += `│\n`;
        text += `│ ${cleanMessage}\n`;
        text += `│\n`;
        text += '└' + '─'.repeat(79) + '\n\n';
      });
      
      text += '\n╔' + '═'.repeat(78) + '╗\n';
      text += '║' + ' Ende der Log-Datei'.padEnd(78) + '║\n';
      text += '║ ' + ('Exportiert: ' + new Date().toLocaleTimeString('de-DE')).padEnd(77) + '║\n';
      text += '╚' + '═'.repeat(78) + '╝';
      
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `server-logs-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    },

    getLogColor(level) {
      const colors = {
        info: 'text-blue-600',
        warn: 'text-yellow-600',
        error: 'text-red-600',
        debug: 'text-gray-500',
        command: 'text-purple-600'
      };
      return colors[level] || 'text-gray-700';
    },

    getLogIcon(level) {
      const icons = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
        command: '⌨️'
      };
      return icons[level] || '📝';
    },

    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    },
    
    // ANSI Color Code zu HTML Konvertierung (FiveM kompatibel)
    ansiToHtml(text) {
      if (!text) return '';
      
      // Escape HTML zuerst
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      // FiveM Color Codes (^0-^9) - ZUERST konvertieren!
      const fivemColors = {
        '^0': '#000000', // Schwarz
        '^1': '#ff0000', // Rot
        '^2': '#00ff00', // Grün
        '^3': '#ffff00', // Gelb
        '^4': '#0000ff', // Blau
        '^5': '#00ffff', // Cyan
        '^6': '#ff00ff', // Magenta
        '^7': '#ffffff', // Weiß
        '^8': '#ff8800', // Orange
        '^9': '#808080'  // Grau
      };
      
      // Konvertiere FiveM Farb-Codes zu ANSI
      Object.keys(fivemColors).forEach(code => {
        const color = fivemColors[code];
        // Ersetze ^N mit <span style="color: ...">
        const regex = new RegExp(code.replace('^', '\\^'), 'g');
        html = html.replace(regex, `</span><span style="color: ${color}">`);
      });
      
      // Entferne führende </span> wenn vorhanden
      html = html.replace(/^<\/span>/, '');
      
      // ANSI Color Map (16 Standard + 256 Color Palette)
      const ansiColors = {
        // Standard 16 Farben (30-37, 90-97)
        '30': '#000000', '31': '#cd3131', '32': '#0dbc79', '33': '#e5e510',
        '34': '#2472c8', '35': '#bc3fbc', '36': '#11a8cd', '37': '#e5e5e5',
        '90': '#666666', '91': '#f14c4c', '92': '#23d18b', '93': '#f5f543',
        '94': '#3b8eea', '95': '#d670d6', '96': '#29b8db', '97': '#ffffff',
        // Background Farben (40-47, 100-107)
        '40': '#000000', '41': '#cd3131', '42': '#0dbc79', '43': '#e5e510',
        '44': '#2472c8', '45': '#bc3fbc', '46': '#11a8cd', '47': '#e5e5e5',
        '100': '#666666', '101': '#f14c4c', '102': '#23d18b', '103': '#f5f543',
        '104': '#3b8eea', '105': '#d670d6', '106': '#29b8db', '107': '#ffffff'
      };
      
      // 256-color palette (vereinfacht)
      const get256Color = (n) => {
        if (n < 16) {
          // Standard colors
          const baseColors = ['#000000', '#cd3131', '#0dbc79', '#e5e510', '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5',
                             '#666666', '#f14c4c', '#23d18b', '#f5f543', '#3b8eea', '#d670d6', '#29b8db', '#ffffff'];
          return baseColors[n] || '#ffffff';
        } else if (n < 232) {
          // 6x6x6 RGB cube
          n -= 16;
          const r = Math.floor(n / 36);
          const g = Math.floor((n % 36) / 6);
          const b = n % 6;
          return `rgb(${r * 51}, ${g * 51}, ${b * 51})`;
        } else {
          // Grayscale
          const gray = 8 + (n - 232) * 10;
          return `rgb(${gray}, ${gray}, ${gray})`;
        }
      };
      
      let result = '';
      let currentStyles = {
        color: null,
        bgColor: null,
        bold: false,
        dim: false,
        italic: false,
        underline: false
      };
      
      // Parse ANSI escape sequences
      const parts = html.split(/(\x1b\[[0-9;]*m)/);
      
      parts.forEach(part => {
        const match = part.match(/\x1b\[([0-9;]*)m/);
        
        if (match) {
          const codes = match[1] ? match[1].split(';').map(Number) : [0];
          
          codes.forEach((code, i) => {
            if (code === 0) {
              // Reset all
              if (currentStyles.color || currentStyles.bgColor || currentStyles.bold || currentStyles.underline) {
                result += '</span>';
              }
              currentStyles = { color: null, bgColor: null, bold: false, dim: false, italic: false, underline: false };
            } else if (code === 1) {
              currentStyles.bold = true;
            } else if (code === 2) {
              currentStyles.dim = true;
            } else if (code === 3) {
              currentStyles.italic = true;
            } else if (code === 4) {
              currentStyles.underline = true;
            } else if (code >= 30 && code <= 37) {
              currentStyles.color = ansiColors[code.toString()];
            } else if (code >= 40 && code <= 47) {
              currentStyles.bgColor = ansiColors[code.toString()];
            } else if (code >= 90 && code <= 97) {
              currentStyles.color = ansiColors[code.toString()];
            } else if (code >= 100 && code <= 107) {
              currentStyles.bgColor = ansiColors[code.toString()];
            } else if (code === 38 && codes[i + 1] === 5) {
              // 256-color foreground
              currentStyles.color = get256Color(codes[i + 2]);
            } else if (code === 48 && codes[i + 1] === 5) {
              // 256-color background
              currentStyles.bgColor = get256Color(codes[i + 2]);
            }
          });
          
          // Apply styles
          const styles = [];
          if (currentStyles.color) styles.push(`color: ${currentStyles.color}`);
          if (currentStyles.bgColor) styles.push(`background-color: ${currentStyles.bgColor}`);
          if (currentStyles.bold) styles.push('font-weight: bold');
          if (currentStyles.dim) styles.push('opacity: 0.6');
          if (currentStyles.italic) styles.push('font-style: italic');
          if (currentStyles.underline) styles.push('text-decoration: underline');
          
          if (styles.length > 0) {
            result += `<span style="${styles.join('; ')}">`;
          }
        } else if (part) {
          result += part;
        }
      });
      
      // Close any open spans (ANSI)
      if (currentStyles.color || currentStyles.bgColor || currentStyles.bold || currentStyles.underline) {
        result += '</span>';
      }
      
      // Close any open FiveM color spans
      // Zähle <span> vs </span> und schließe fehlende
      const openSpans = (result.match(/<span/g) || []).length;
      const closeSpans = (result.match(/<\/span>/g) || []).length;
      for (let i = 0; i < openSpans - closeSpans; i++) {
        result += '</span>';
      }
      
      return result;
    },
    
    // Quick Commands
    async executeQuickCommand(cmd) {
      this.command = cmd;
      await this.sendCommand();
    },
    
    // Server Control
    async serverAction(action) {
      const confirmMessages = {
        restart: 'Server wirklich neu starten? Alle Spieler werden gekickt!',
        stop: 'Server wirklich stoppen? Der Server wird heruntergefahren!',
        start: 'Server starten?'
      };
      
      if (confirmMessages[action] && !confirm(confirmMessages[action])) {
        return;
      }
      
      try {
        const response = await fetch(`/api/console/server/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error);
        }
        
        alert(data.message || `Server ${action} erfolgreich`);
      } catch (error) {
        console.error(`Server ${action} failed:`, error);
        alert(`Fehler beim Server ${action}: ` + error.message);
      }
    },
    
    // Custom Commands
    openCustomModal() {
      this.customCommand = { name: '', command: '', icon: '⚡', color: 'blue' };
      this.showCustomModal = true;
    },
    
    saveCustomCommand() {
      if (!this.customCommand.name || !this.customCommand.command) {
        alert('Name und Command sind erforderlich!');
        return;
      }
      
      this.customCommands.push({...this.customCommand});
      localStorage.setItem('consoleCustomCommands', JSON.stringify(this.customCommands));
      this.showCustomModal = false;
    },
    
    deleteCustomCommand(index) {
      if (confirm('Custom Command wirklich löschen?')) {
        this.customCommands.splice(index, 1);
        localStorage.setItem('consoleCustomCommands', JSON.stringify(this.customCommands));
      }
    },
    
    loadCustomCommands() {
      const saved = localStorage.getItem('consoleCustomCommands');
      if (saved) {
        try {
          this.customCommands = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load custom commands:', e);
        }
      }
    },
    
    getButtonColor(color) {
      const colors = {
        blue: 'bg-gradient-to-br from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 border border-gray-700',
        green: 'bg-gradient-to-br from-green-800 to-green-900 hover:from-green-700 hover:to-green-800 border border-gray-700',
        purple: 'bg-gradient-to-br from-purple-800 to-purple-900 hover:from-purple-700 hover:to-purple-800 border border-gray-700',
        yellow: 'bg-gradient-to-br from-yellow-800 to-yellow-900 hover:from-yellow-700 hover:to-yellow-800 border border-gray-700',
        red: 'bg-gradient-to-br from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 border border-gray-700',
        gray: 'bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 border border-gray-700',
        orange: 'bg-gradient-to-br from-orange-800 to-orange-900 hover:from-orange-700 hover:to-orange-800 border border-gray-700'
      };
      return colors[color] || colors.gray;
    }
  },

  template: `
    <div class="h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white p-3 flex flex-col overflow-hidden">
      <div class="max-w-[98%] mx-auto flex flex-col h-full">
        <!-- Header -->
        <div class="mb-2 flex-shrink-0">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold flex items-center gap-2">
                <span>🖥️</span>
                <span>Server Konsole</span>
              </h1>
              <p class="text-gray-400 text-xs">Live Server-Logs und Command-Ausführung</p>
            </div>
            
            <div class="flex items-center gap-3">
              <!-- Connection Status -->
              <div class="flex items-center gap-2">
                <span :class="connected ? 'bg-green-500' : 'bg-red-500'" class="w-2.5 h-2.5 rounded-full animate-pulse"></span>
                <span class="text-xs">{{ connected ? 'Live' : 'Offline' }}</span>
              </div>
              
              <!-- Back Button -->
              <router-link to="/" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
                ← Zurück
              </router-link>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="bg-red-900 border border-red-700 rounded-lg p-2 mb-2 flex-shrink-0">
          <p class="text-red-200 text-xs">{{ error }}</p>
        </div>

        <!-- Main Console (nur wenn Zugriff) -->
        <div v-else class="flex-1 flex flex-col overflow-hidden">
          <!-- 3-Spalten Layout: Server Control | Console | Quick Commands -->
          <div class="flex gap-2 h-full overflow-hidden">
            <!-- Linke Spalte: Server Control -->
            <div class="w-48 flex-shrink-0">
              <div v-if="serverControlEnabled" class="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-3 flex flex-col">
                <h3 class="text-sm font-bold text-white flex items-center gap-1.5 mb-3">
                  <span>🎮</span>
                  <span>Server Control</span>
                </h3>
                <div class="space-y-2">
                  <button @click="serverAction('restart')" class="w-full px-2.5 py-2 bg-gradient-to-br from-yellow-800 to-yellow-900 hover:from-yellow-700 hover:to-yellow-800 border border-gray-700 rounded transition-all font-semibold text-white text-xs flex items-center justify-center gap-1.5">
                    <span>🔄</span>
                    <span>Restart</span>
                  </button>
                  <button @click="serverAction('stop')" class="w-full px-2.5 py-2 bg-gradient-to-br from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 border border-gray-700 rounded transition-all font-semibold text-white text-xs flex items-center justify-center gap-1.5">
                    <span>⏹️</span>
                    <span>Stop</span>
                  </button>
                  <button @click="serverAction('start')" class="w-full px-2.5 py-2 bg-gradient-to-br from-green-800 to-green-900 hover:from-green-700 hover:to-green-800 border border-gray-700 rounded transition-all font-semibold text-white text-xs flex items-center justify-center gap-1.5">
                    <span>▶️</span>
                    <span>Start</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Mittlere Spalte: Console -->
            <div class="flex-1 flex flex-col overflow-hidden" style="gap: 20px;">
              <!-- Controls -->
              <div class="bg-gray-800 rounded-lg p-2 flex flex-wrap items-center gap-2 flex-shrink-0">
                <!-- Search -->
                <div class="flex items-center gap-1.5 flex-1">
                  <span class="text-xs text-gray-400">🔍</span>
                  <input 
                    v-model="searchQuery"
                    @input="performSearch"
                    type="text"
                    placeholder="Suche in Logs..."
                    class="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  >
                  <button 
                    v-if="searchMatches.length > 0"
                    @click="prevMatch"
                    class="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    title="Vorheriges"
                  >
                    ⬆️
                  </button>
                  <button 
                    v-if="searchMatches.length > 0"
                    @click="nextMatch"
                    class="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    title="Nächstes"
                  >
                    ⬇️
                  </button>
                  <span v-if="searchQuery && searchMatches.length > 0" class="text-xs text-gray-400">
                    {{ currentMatchIndex + 1 }}/{{ searchMatches.length }}
                  </span>
                  <span v-else-if="searchQuery" class="text-xs text-red-400">
                    Keine Treffer
                  </span>
                </div>

                <!-- Auto Scroll -->
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" v-model="autoScroll" class="w-3 h-3">
                  <span class="text-xs text-gray-400">Auto</span>
                </label>

                <!-- Font Size -->
                <div class="flex items-center gap-1 border-l border-gray-700 pl-2">
                  <span class="text-xs text-gray-400">{{ fontSize }}px</span>
                  <button @click="decreaseFontSize" class="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs" title="Schrift verkleinern">
                    A-
                  </button>
                  <button @click="increaseFontSize" class="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs" title="Schrift vergrößern">
                    A+
                  </button>
                </div>
                
                <!-- Actions -->
                <div class="flex gap-1.5">
                  <button @click="scrollToBottom" class="px-2 py-1 bg-gradient-to-br from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 border border-gray-700 rounded transition-all text-xs" title="Zum Ende">
                    ⬇️
                  </button>
                  <button @click="exportLogs" class="px-2 py-1 bg-gradient-to-br from-green-800 to-green-900 hover:from-green-700 hover:to-green-800 border border-gray-700 rounded transition-all text-xs" title="Export">
                    💾
                  </button>
                  <button @click="clearLogs" class="px-2 py-1 bg-red-600 hover:bg-red-700 rounded transition-colors text-xs" title="Löschen">
                    🗑️
                  </button>
                </div>
              </div>

              <!-- Log Display -->
              <div class="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden" style="height: 50vh; max-height: 50vh;">
                <div v-if="loading" class="flex items-center justify-center h-full">
                  <div class="text-center">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-3"></div>
                    <p class="text-gray-400 text-sm">Lade Logs...</p>
                  </div>
                </div>
                
                <div v-else ref="logContainer" class="h-full overflow-y-auto overflow-x-auto p-3 font-mono space-y-0.5">
                  <div v-if="filteredLogs.length === 0" class="text-center text-gray-500 py-6">
                    Keine Logs verfügbar
                  </div>
                  
                  <div 
                    v-for="(log, index) in filteredLogs" 
                    :key="log.id"
                    :data-log-index="index"
                    class="hover:bg-gray-800 px-1.5 py-0.5 rounded transition-colors whitespace-nowrap"
                    :style="logFontStyle"
                  >
                    <span class="text-gray-500">{{ formatTimestamp(log.timestamp) }}</span>
                    <span class="mx-1.5">{{ getLogIcon(log.level) }}</span>
                    <span :class="getLogColor(log.level)" class="font-semibold">[{{ log.level.toUpperCase() }}]</span>
                    <span class="text-gray-400 mx-1.5">[{{ log.source }}]</span>
                    <span 
                      v-if="log.hasAnsi && !searchQuery" 
                      v-html="ansiToHtml(log.message)" 
                      class="text-gray-200"
                    ></span>
                    <span 
                      v-else-if="searchQuery"
                      v-html="highlightSearchText(log.hasAnsi ? ansiToHtml(log.message) : log.message)"
                      class="text-gray-200"
                    ></span>
                    <span v-else class="text-gray-200">{{ log.message }}</span>
                  </div>
                </div>
              </div>

              <!-- Command Input -->
              <div class="bg-gray-800 rounded-lg p-2 flex-shrink-0">
                <form @submit.prevent="sendCommand" class="flex gap-1.5">
                  <input 
                    v-model="command"
                    @keydown="handleKeyDown"
                    type="text"
                    placeholder="Befehl eingeben... (↑/↓ für History)"
                    class="flex-1 bg-gray-900 border border-gray-700 rounded px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  >
                  <button 
                    type="submit"
                    :disabled="!command.trim()"
                    class="px-3 py-1 bg-gradient-to-br from-purple-800 to-purple-900 hover:from-purple-700 hover:to-purple-800 border border-gray-700 disabled:from-gray-800 disabled:to-gray-900 disabled:cursor-not-allowed rounded transition-all font-semibold text-xs"
                  >
                    Senden
                  </button>
                </form>
              </div>

              <!-- Stats -->
              <div class="bg-gray-800 rounded-lg p-1.5 flex gap-3 text-xs flex-shrink-0">
                <div>
                  <span class="text-gray-400">Gesamt:</span>
                  <span class="ml-1 font-semibold">{{ logs.length }}</span>
                </div>
                <div>
                  <span class="text-gray-400">Angezeigt:</span>
                  <span class="ml-1 font-semibold">{{ filteredLogs.length }}</span>
                </div>
                <div>
                  <span class="text-gray-400">Max:</span>
                  <span class="ml-1 font-semibold">{{ maxLogs }}</span>
                </div>
              </div>
            </div>

            <!-- Rechte Spalte: Quick Commands -->
            <div class="w-64 flex-shrink-0 max-h-full">
              <div class="bg-gray-800 rounded-lg p-2 flex flex-col max-h-full">
                <div class="flex items-center justify-between mb-2 flex-shrink-0">
                  <h3 class="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Quick Commands</span>
                  </h3>
                  <button @click="openCustomModal" class="px-2 py-0.5 bg-gradient-to-br from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 border border-gray-700 rounded text-xs transition-all">
                    ➕
                  </button>
                </div>
                <div class="space-y-1.5 overflow-y-auto pr-1 flex-1 min-h-0">
                  <!-- Predefined Commands -->
                  <button 
                    v-for="cmd in quickCommands" 
                    :key="cmd.command"
                    @click="executeQuickCommand(cmd.command)"
                    :class="getButtonColor(cmd.color)"
                    class="w-full px-2.5 py-2 rounded transition-colors font-semibold text-white text-xs flex items-center gap-1.5"
                  >
                    <span class="text-sm">{{ cmd.icon }}</span>
                    <span class="flex-1 text-left">{{ cmd.name }}</span>
                  </button>
                  
                  <!-- Separator -->
                  <div v-if="customCommands.length > 0" class="border-t border-gray-700 my-1.5 pt-1.5">
                    <p class="text-xs text-gray-500 mb-1 px-1.5">Custom Commands</p>
                  </div>
                  
                  <!-- Custom Commands -->
                  <button 
                    v-for="(cmd, index) in customCommands" 
                    :key="'custom-' + index"
                    @click="executeQuickCommand(cmd.command)"
                    @contextmenu.prevent="deleteCustomCommand(index)"
                    :class="getButtonColor(cmd.color)"
                    class="w-full px-2.5 py-2 rounded transition-colors font-semibold text-white text-xs flex items-center gap-1.5 relative group"
                    :title="'Rechtsklick zum Löschen: ' + cmd.command"
                  >
                    <span class="text-sm">{{ cmd.icon }}</span>
                    <span class="flex-1 text-left">{{ cmd.name }}</span>
                    <span class="text-xs bg-red-600 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      
      <!-- Custom Command Modal -->
      <div v-if="showCustomModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" @click.self="showCustomModal = false">
        <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md" @click.stop>
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
            <h3 class="text-2xl font-bold">⚡ Custom Command erstellen</h3>
          </div>
          
          <div class="p-6 space-y-4">
            <div>
              <label class="block text-gray-300 mb-2 font-semibold">Name</label>
              <input 
                v-model="customCommand.name"
                type="text" 
                placeholder="z.B. Spawn Vehicle"
                class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-gray-300 mb-2 font-semibold">Command</label>
              <input 
                v-model="customCommand.command"
                type="text" 
                placeholder="z.B. spawnvehicle adder"
                class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              >
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-gray-300 mb-2 font-semibold">Icon</label>
                <input 
                  v-model="customCommand.icon"
                  type="text" 
                  placeholder="🚗"
                  class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-center text-2xl"
                >
              </div>
              
              <div>
                <label class="block text-gray-300 mb-2 font-semibold">Farbe</label>
                <select 
                  v-model="customCommand.color"
                  class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="blue">Blau</option>
                  <option value="green">Grün</option>
                  <option value="purple">Lila</option>
                  <option value="yellow">Gelb</option>
                  <option value="red">Rot</option>
                  <option value="orange">Orange</option>
                  <option value="gray">Grau</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="p-6 pt-0 flex gap-2">
            <button 
              @click="saveCustomCommand"
              class="flex-1 px-4 py-2 bg-gradient-to-br from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 border border-gray-700 rounded transition-all font-semibold text-white"
            >
              💾 Speichern
            </button>
            <button 
              @click="showCustomModal = false"
              class="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors font-semibold text-white"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  `
}
