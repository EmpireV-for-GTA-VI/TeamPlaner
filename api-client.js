// API Client für MariaDB Backend
// Dieser Client kann in allen Pages verwendet werden

const API_BASE_URL = 'http://localhost:3000/api';

class DatabaseAPI {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Generische Fetch-Methode
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // =============== TASKS ===============
    
    // Alle Tasks abrufen
    async getTasks() {
        return this.request('/tasks');
    }

    // Task nach ID abrufen
    async getTask(id) {
        return this.request(`/tasks/${id}`);
    }

    // Neuen Task erstellen
    async createTask(taskData) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    // Task aktualisieren
    async updateTask(id, taskData) {
        return this.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    }

    // Task löschen
    async deleteTask(id) {
        return this.request(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }

    // =============== TEAM MEMBERS ===============
    
    // Alle Team-Mitglieder abrufen
    async getTeamMembers() {
        return this.request('/team-members');
    }

    // Team-Mitglied nach ID abrufen
    async getTeamMember(id) {
        return this.request(`/team-members/${id}`);
    }

    // Neues Team-Mitglied erstellen
    async createTeamMember(memberData) {
        return this.request('/team-members', {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
    }

    // Team-Mitglied aktualisieren
    async updateTeamMember(id, memberData) {
        return this.request(`/team-members/${id}`, {
            method: 'PUT',
            body: JSON.stringify(memberData)
        });
    }

    // Team-Mitglied löschen
    async deleteTeamMember(id) {
        return this.request(`/team-members/${id}`, {
            method: 'DELETE'
        });
    }

    // =============== PROJECTS ===============
    
    // Alle Projekte abrufen
    async getProjects() {
        return this.request('/projects');
    }

    // Projekt nach ID abrufen
    async getProject(id) {
        return this.request(`/projects/${id}`);
    }

    // Neues Projekt erstellen
    async createProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    // Projekt aktualisieren
    async updateProject(id, projectData) {
        return this.request(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    // Projekt löschen
    async deleteProject(id) {
        return this.request(`/projects/${id}`, {
            method: 'DELETE'
        });
    }

    // =============== HEALTH CHECK ===============
    
    // Server-Status prüfen
    async checkHealth() {
        return this.request('/health');
    }
}

// Globale Instanz erstellen
const dbAPI = new DatabaseAPI();

// Export für ES6 Module (falls verwendet)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = dbAPI;
}
