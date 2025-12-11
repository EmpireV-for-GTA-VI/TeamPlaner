// Auth Helper für Frontend
const AuthManager = {
    user: null,
    authenticated: false,
    
    // Prüfe ob Benutzer eingeloggt ist
    async checkAuth() {
        try {
            const response = await fetch('http://localhost:3000/auth/me', {
                credentials: 'include'
            });
            const data = await response.json();
            
            this.authenticated = data.authenticated;
            this.user = data.user || null;
            
            return data.authenticated;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.authenticated = false;
            this.user = null;
            return false;
        }
    },
    
    // Login durchführen
    login() {
        window.location.href = 'http://localhost:3000/auth/login';
    },
    
    // Logout durchführen
    logout() {
        window.location.href = 'http://localhost:3000/auth/logout';
    },
    
    // Benutzerinformationen abrufen
    getUser() {
        return this.user;
    },
    
    // Prüfe ob authentifiziert
    isAuthenticated() {
        return this.authenticated;
    },
    
    // Zeige Login-Overlay wenn nicht eingeloggt
    requireAuth(callback) {
        this.checkAuth().then(authenticated => {
            if (!authenticated) {
                this.showLoginOverlay();
            } else if (callback) {
                callback();
            }
        });
    },
    
    // Login-Overlay anzeigen
    showLoginOverlay() {
        // Entferne existierendes Overlay
        const existing = document.getElementById('auth-overlay');
        if (existing) existing.remove();
        
        // Erstelle Overlay
        const overlay = document.createElement('div');
        overlay.id = 'auth-overlay';
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            ">
                <div style="
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    text-align: center;
                    max-width: 400px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                ">
                    <h2 style="margin-bottom: 20px; color: #333;">Login erforderlich</h2>
                    <p style="margin-bottom: 30px; color: #666;">
                        Sie müssen sich mit Ihrem CFX-Konto anmelden, um auf diese Website zuzugreifen.
                    </p>
                    <button onclick="AuthManager.login()" style="
                        background: #f40552;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        transition: background 0.3s;
                    " onmouseover="this.style.background='#d6044a'" 
                       onmouseout="this.style.background='#f40552'">
                        Mit CFX anmelden
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
};

// Export für globalen Zugriff
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}
