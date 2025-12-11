/**
 * API Helper - Zentrale Stelle für alle Backend-Requests
 * Handhabt automatisch Session-Ablauf und Auth-Fehler
 */

const API_BASE_URL = '/api';

class API {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    /**
     * Generische Request-Methode
     * @param {string} endpoint - API Endpoint (z.B. '/tasks')
     * @param {object} options - Fetch options
     * @returns {Promise<object>}
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const config = {
            credentials: 'include', // Wichtig für Sessions!
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Session abgelaufen oder nicht authentifiziert
            if (response.status === 401) {
                console.warn('Session expired or not authenticated');
                
                // Redirect zu Login (nur wenn nicht bereits dort)
                if (!window.location.hash.includes('/login')) {
                    window.location.hash = '/login';
                }
                
                throw new Error('Authentication required');
            }

            // Andere HTTP-Fehler
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Erfolgreiche Response
            return await response.json();

        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // ==================== AUTH ENDPOINTS ====================

    /**
     * Prüfe ob User eingeloggt ist
     * @returns {Promise<{authenticated: boolean, user?: object}>}
     */
    async checkAuth() {
        try {
            const response = await fetch('/auth/me', {
                credentials: 'include'
            });
            return await response.json();
        } catch (error) {
            console.error('Auth check failed:', error);
            return { authenticated: false };
        }
    }

    /**
     * Logout
     * @returns {Promise<object>}
     */
    async logout() {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        return await response.json();
    }

    // ==================== TASKS ENDPOINTS ====================

    async getTasks() {
        return this.request('/tasks');
    }

    async getTask(id) {
        return this.request(`/tasks/${id}`);
    }

    async createTask(taskData) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    async updateTask(id, taskData) {
        return this.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    }

    async deleteTask(id) {
        return this.request(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== TEAM MEMBERS ENDPOINTS ====================

    async getTeamMembers() {
        return this.request('/team-members');
    }

    async getTeamMember(id) {
        return this.request(`/team-members/${id}`);
    }

    async createTeamMember(memberData) {
        return this.request('/team-members', {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
    }

    async updateTeamMember(id, memberData) {
        return this.request(`/team-members/${id}`, {
            method: 'PUT',
            body: JSON.stringify(memberData)
        });
    }

    async deleteTeamMember(id) {
        return this.request(`/team-members/${id}`, {
            method: 'DELETE'
        });
    }

    // ==================== PROJECTS ENDPOINTS ====================

    async getProjects() {
        return this.request('/projects');
    }

    async getProject(id) {
        return this.request(`/projects/${id}`);
    }

    async createProject(projectData) {
        return this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async updateProject(id, projectData) {
        return this.request(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(projectData)
        });
    }

    async deleteProject(id) {
        return this.request(`/projects/${id}`, {
            method: 'DELETE'
        });
    }
}

// Globale API-Instanz
const api = new API();

// Export für ES6 Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
}
