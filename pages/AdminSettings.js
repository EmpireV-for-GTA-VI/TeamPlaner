// Admin Settings Komponente für Organisation/Gruppe/Rolle Verwaltung
const AdminSettingsComponent = {
  data() {
    return {
      showSettings: false,
      activeTab: 'organisations', // organisations, groups, roles
      
      // Daten
      organisations: [],
      groups: [],
      roles: [],
      
      // Modals
      showOrgModal: false,
      showGroupModal: false,
      showRoleModal: false,
      
      // Forms
      orgForm: { id: null, name: '', description: '' },
      groupForm: { id: null, name: '', description: '', organisation_id: null },
      roleForm: { id: null, name: '', description: '', group_id: null },
      
      editingOrg: null,
      editingGroup: null,
      editingRole: null,
      
      loading: false,
      error: null
    }
  },
  
  methods: {
    async toggleSettings() {
      this.showSettings = !this.showSettings;
      if (this.showSettings) {
        await this.loadAllData();
      }
    },
    
    async loadAllData() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadOrganisations(),
          this.loadGroups(),
          this.loadRoles()
        ]);
      } finally {
        this.loading = false;
      }
    },
    
    // ==================== ORGANISATIONEN ====================
    async loadOrganisations() {
      try {
        const res = await fetch('/api/organisations', { credentials: 'include' });
        const data = await res.json();
        if (data.success) this.organisations = data.organisations;
      } catch (e) {
        this.error = 'Fehler beim Laden der Organisationen: ' + e.message;
      }
    },
    
    openOrgModal(org = null) {
      if (org) {
        this.editingOrg = org;
        this.orgForm = { id: org.id, name: org.name, description: org.description || '' };
      } else {
        this.editingOrg = null;
        this.orgForm = { id: null, name: '', description: '' };
      }
      this.showOrgModal = true;
    },
    
    async saveOrganisation() {
      if (!this.orgForm.name) return alert('Bitte Namen eingeben');
      
      try {
        const url = this.editingOrg ? `/api/organisations/${this.orgForm.id}` : '/api/organisations';
        const method = this.editingOrg ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.orgForm)
        });
        
        const data = await res.json();
        if (data.success) {
          this.showOrgModal = false;
          await this.loadOrganisations();
        } else {
          alert('Fehler: ' + data.error);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async deleteOrganisation(id) {
      if (!confirm('Organisation wirklich löschen? Alle zugehörigen Gruppen und Rollen werden ebenfalls gelöscht!')) return;
      
      try {
        const res = await fetch(`/api/organisations/${id}`, { method: 'DELETE', credentials: 'include' });
        if ((await res.json()).success) {
          await this.loadAllData();
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== GRUPPEN ====================
    async loadGroups() {
      try {
        const res = await fetch('/api/groups', { credentials: 'include' });
        const data = await res.json();
        if (data.success) this.groups = data.groups;
      } catch (e) {
        this.error = 'Fehler beim Laden der Gruppen: ' + e.message;
      }
    },
    
    openGroupModal(group = null) {
      if (group) {
        this.editingGroup = group;
        this.groupForm = { id: group.id, name: group.name, description: group.description || '', organisation_id: group.organisation_id };
      } else {
        this.editingGroup = null;
        this.groupForm = { id: null, name: '', description: '', organisation_id: null };
      }
      this.showGroupModal = true;
    },
    
    async saveGroup() {
      if (!this.groupForm.name || !this.groupForm.organisation_id) {
        return alert('Bitte Namen und Organisation auswählen');
      }
      
      try {
        const url = this.editingGroup ? `/api/groups/${this.groupForm.id}` : '/api/groups';
        const method = this.editingGroup ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.groupForm)
        });
        
        const data = await res.json();
        if (data.success) {
          this.showGroupModal = false;
          await this.loadGroups();
        } else {
          alert('Fehler: ' + data.error);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async deleteGroup(id) {
      if (!confirm('Gruppe wirklich löschen? Alle zugehörigen Rollen werden ebenfalls gelöscht!')) return;
      
      try {
        const res = await fetch(`/api/groups/${id}`, { method: 'DELETE', credentials: 'include' });
        if ((await res.json()).success) {
          await this.loadAllData();
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== ROLLEN ====================
    async loadRoles() {
      try {
        const res = await fetch('/api/roles', { credentials: 'include' });
        const data = await res.json();
        if (data.success) this.roles = data.roles;
      } catch (e) {
        this.error = 'Fehler beim Laden der Rollen: ' + e.message;
      }
    },
    
    openRoleModal(role = null) {
      if (role) {
        this.editingRole = role;
        this.roleForm = { id: role.id, name: role.name, description: role.description || '', group_id: role.group_id };
      } else {
        this.editingRole = null;
        this.roleForm = { id: null, name: '', description: '', group_id: null };
      }
      this.showRoleModal = true;
    },
    
    async saveRole() {
      if (!this.roleForm.name || !this.roleForm.group_id) {
        return alert('Bitte Namen und Gruppe auswählen');
      }
      
      try {
        const url = this.editingRole ? `/api/roles/${this.roleForm.id}` : '/api/roles';
        const method = this.editingRole ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.roleForm)
        });
        
        const data = await res.json();
        if (data.success) {
          this.showRoleModal = false;
          await this.loadRoles();
        } else {
          alert('Fehler: ' + data.error);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async deleteRole(id) {
      if (!confirm('Rolle wirklich löschen?')) return;
      
      try {
        const res = await fetch(`/api/roles/${id}`, { method: 'DELETE', credentials: 'include' });
        if ((await res.json()).success) {
          await this.loadRoles();
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== HELPERS ====================
    getOrganisationName(id) {
      const org = this.organisations.find(o => o.id === id);
      return org ? org.name : `ID: ${id}`;
    },
    
    getGroupName(id) {
      const group = this.groups.find(g => g.id === id);
      return group ? group.name : `ID: ${id}`;
    },
    
    getGroupsByOrg(orgId) {
      return this.groups.filter(g => g.organisation_id === orgId);
    },
    
    getRolesByGroup(groupId) {
      return this.roles.filter(r => r.group_id === groupId);
    }
  },
  
  computed: {
    isAdmin() {
      const user = window.appState?.user;
      if (!user || !user.role) return false;
      return user.role.name === 'WebAdmin' || user.role.name === 'Admin';
    }
  },
  
  template: `
    <div>
      <!-- Toggle Button (nur für Admins sichtbar) -->
      <button v-if="isAdmin" 
        @click="toggleSettings" 
        class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2">
        <span class="text-xl">⚙️</span>
        <span class="font-semibold">Admin Einstellungen</span>
      </button>

      <!-- Main Settings Modal -->
      <div v-if="showSettings" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" @click.self="showSettings = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" @click.stop>
          
          <!-- Header -->
          <div class="bg-gradient-to-r from-red-600 to-pink-600 text-white p-6 flex justify-between items-center">
            <div>
              <h2 class="text-3xl font-bold flex items-center gap-3">⚙️ Admin Einstellungen</h2>
              <p class="text-red-100 mt-1">Verwalte Organisationen, Gruppen und Rollen</p>
            </div>
            <button @click="showSettings = false" class="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="bg-gray-100 border-b flex">
            <button @click="activeTab = 'organisations'" :class="['flex-1 px-6 py-4 font-semibold transition-colors', activeTab === 'organisations' ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:bg-gray-50']">
              🏢 Organisationen ({{ organisations.length }})
            </button>
            <button @click="activeTab = 'groups'" :class="['flex-1 px-6 py-4 font-semibold transition-colors', activeTab === 'groups' ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:bg-gray-50']">
              👥 Gruppen ({{ groups.length }})
            </button>
            <button @click="activeTab = 'roles'" :class="['flex-1 px-6 py-4 font-semibold transition-colors', activeTab === 'roles' ? 'bg-white text-red-600 border-b-2 border-red-600' : 'text-gray-600 hover:bg-gray-50']">
              🎭 Rollen ({{ roles.length }})
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-auto p-6">
            <!-- Loading -->
            <div v-if="loading" class="text-center py-12">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              <p class="mt-4 text-gray-600">Lade Daten...</p>
            </div>

            <!-- Organisationen Tab -->
            <div v-else-if="activeTab === 'organisations'">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900">Organisationen verwalten</h3>
                <button @click="openOrgModal()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <span>+</span><span>Neue Organisation</span>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="org in organisations" :key="org.id" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                      <h4 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>🏢</span><span>{{ org.name }}</span>
                      </h4>
                      <p v-if="org.description" class="text-sm text-gray-600 mt-1">{{ org.description }}</p>
                    </div>
                    <div class="flex gap-1">
                      <button @click="openOrgModal(org)" class="text-blue-600 hover:text-blue-700 p-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button @click="deleteOrganisation(org.id)" class="text-red-600 hover:text-red-700 p-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 pt-2 border-t">
                    <p>{{ getGroupsByOrg(org.id).length }} Gruppe(n)</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Gruppen Tab -->
            <div v-else-if="activeTab === 'groups'">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900">Gruppen verwalten</h3>
                <button @click="openGroupModal()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <span>+</span><span>Neue Gruppe</span>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="group in groups" :key="group.id" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                      <h4 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>👥</span><span>{{ group.name }}</span>
                      </h4>
                      <p v-if="group.description" class="text-sm text-gray-600 mt-1">{{ group.description }}</p>
                    </div>
                    <div class="flex gap-1">
                      <button @click="openGroupModal(group)" class="text-blue-600 hover:text-blue-700 p-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button @click="deleteGroup(group.id)" class="text-red-600 hover:text-red-700 p-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                  <div class="text-xs space-y-1 pt-2 border-t">
                    <p class="text-gray-500">🏢 {{ getOrganisationName(group.organisation_id) }}</p>
                    <p class="text-gray-500">{{ getRolesByGroup(group.id).length }} Rolle(n)</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rollen Tab -->
            <div v-else-if="activeTab === 'roles'">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-900">Rollen verwalten</h3>
                <button @click="openRoleModal()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <span>+</span><span>Neue Rolle</span>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="role in roles" :key="role.id" class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                      <h4 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span>🎭</span><span>{{ role.name }}</span>
                      </h4>
                      <p v-if="role.description" class="text-sm text-gray-600 mt-1">{{ role.description }}</p>
                    </div>
                    <div class="flex gap-1">
                      <button @click="openRoleModal(role)" class="text-blue-600 hover:text-blue-700 p-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button @click="deleteRole(role.id)" class="text-red-600 hover:text-red-700 p-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 pt-2 border-t">
                    <p>👥 {{ getGroupName(role.group_id) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Organisation Modal -->
      <div v-if="showOrgModal" class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4" @click.self="showOrgModal = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6" @click.stop>
          <h3 class="text-2xl font-bold mb-4">{{ editingOrg ? 'Organisation bearbeiten' : 'Neue Organisation' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input v-model="orgForm.name" type="text" class="w-full px-3 py-2 border rounded" placeholder="z.B. Whitelisted"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea v-model="orgForm.description" class="w-full px-3 py-2 border rounded" rows="3" placeholder="Optionale Beschreibung..."></textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-6">
            <button @click="saveOrganisation" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold">Speichern</button>
            <button @click="showOrgModal = false" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">Abbrechen</button>
          </div>
        </div>
      </div>

      <!-- Gruppe Modal -->
      <div v-if="showGroupModal" class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4" @click.self="showGroupModal = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6" @click.stop>
          <h3 class="text-2xl font-bold mb-4">{{ editingGroup ? 'Gruppe bearbeiten' : 'Neue Gruppe' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Organisation *</label>
              <select v-model="groupForm.organisation_id" class="w-full px-3 py-2 border rounded">
                <option :value="null">-- Organisation wählen --</option>
                <option v-for="org in organisations" :key="org.id" :value="org.id">{{ org.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input v-model="groupForm.name" type="text" class="w-full px-3 py-2 border rounded" placeholder="z.B. Development"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea v-model="groupForm.description" class="w-full px-3 py-2 border rounded" rows="3" placeholder="Optionale Beschreibung..."></textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-6">
            <button @click="saveGroup" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold">Speichern</button>
            <button @click="showGroupModal = false" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">Abbrechen</button>
          </div>
        </div>
      </div>

      <!-- Rolle Modal -->
      <div v-if="showRoleModal" class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4" @click.self="showRoleModal = false">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6" @click.stop>
          <h3 class="text-2xl font-bold mb-4">{{ editingRole ? 'Rolle bearbeiten' : 'Neue Rolle' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Gruppe *</label>
              <select v-model="roleForm.group_id" class="w-full px-3 py-2 border rounded">
                <option :value="null">-- Gruppe wählen --</option>
                <optgroup v-for="org in organisations" :key="org.id" :label="'🏢 ' + org.name">
                  <option v-for="group in getGroupsByOrg(org.id)" :key="group.id" :value="group.id">{{ group.name }}</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input v-model="roleForm.name" type="text" class="w-full px-3 py-2 border rounded" placeholder="z.B. Senior Developer"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <textarea v-model="roleForm.description" class="w-full px-3 py-2 border rounded" rows="3" placeholder="Optionale Beschreibung..."></textarea>
            </div>
          </div>
          <div class="flex gap-2 mt-6">
            <button @click="saveRole" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold">Speichern</button>
            <button @click="showRoleModal = false" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">Abbrechen</button>
          </div>
        </div>
      </div>
    </div>
  `
};
