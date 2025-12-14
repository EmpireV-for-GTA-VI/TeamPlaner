const ProfileComponent = {
    name: 'Profile',
    template: `
        <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div class="max-w-4xl mx-auto">
                <!-- Header -->
                <div class="mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">Mein Profil</h1>
                    <p class="text-gray-600 mt-2">Ihre CFX.re Account Informationen</p>
                </div>

                <!-- Loading -->
                <div v-if="loading" class="bg-white rounded-lg shadow-lg p-8 text-center">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p class="mt-4 text-gray-600">Lade Profildaten...</p>
                </div>

                <!-- Error -->
                <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                    <p class="text-red-800 font-semibold">Fehler beim Laden</p>
                    <p class="text-red-600 mt-2">{{ error }}</p>
                </div>

                <!-- Profile Data -->
                <div v-else-if="user" class="space-y-6">
                    <!-- User Card -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <div class="flex items-center space-x-4">
                            <img 
                                v-if="user.avatar" 
                                :src="user.avatar" 
                                :alt="user.name"
                                class="w-24 h-24 rounded-full border-4 border-blue-500"
                            />
                            <div v-else class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                                {{ user.name ? user.name[0].toUpperCase() : '?' }}
                            </div>
                            
                            <div class="flex-1">
                                <h2 class="text-2xl font-bold text-gray-900">{{ user.displayName || user.name }}</h2>
                                <p class="text-gray-600">@{{ user.name }}</p>
                                
                                <div class="flex items-center gap-2 mt-2">
                                    <span v-if="user.isIngame" class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full animate-pulse">
                                        🎮 Ingame Online
                                    </span>
                                    <span v-if="user.admin" class="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                                        👑 Admin
                                    </span>
                                    <span v-if="user.moderator" class="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                                        🛡️ Moderator
                                    </span>
                                    <span class="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                                        Trust Level {{ user.trust_level }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Basic Info -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Basis-Informationen</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="border-l-4 border-blue-500 pl-4">
                                <p class="text-sm text-gray-600">User ID</p>
                                <p class="text-lg font-semibold text-gray-900">{{ user.id }}</p>
                            </div>
                            <div class="border-l-4 border-green-500 pl-4">
                                <p class="text-sm text-gray-600">CFX Username</p>
                                <p class="text-lg font-semibold text-gray-900">{{ user.cfxUsername }}</p>
                            </div>
                            <div class="border-l-4 border-purple-500 pl-4">
                                <p class="text-sm text-gray-600">Anzeigename</p>
                                <div v-if="!editingUsername" class="flex items-center gap-2">
                                    <p class="text-lg font-semibold text-gray-900">{{ user.displayName }}</p>
                                    <button 
                                        @click="startEditUsername"
                                        class="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        ✏️ Ändern
                                    </button>
                                </div>
                                <div v-else class="space-y-2">
                                    <input 
                                        v-model="newUsername"
                                        type="text"
                                        class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        placeholder="Neuer Username"
                                        :disabled="usernameSaving"
                                    />
                                    <p v-if="usernameError" class="text-red-600 text-sm">{{ usernameError }}</p>
                                    <div class="flex gap-2">
                                        <button 
                                            @click="saveUsername"
                                            :disabled="usernameSaving"
                                            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
                                        >
                                            {{ usernameSaving ? 'Speichern...' : 'Speichern' }}
                                        </button>
                                        <button 
                                            @click="cancelEditUsername"
                                            :disabled="usernameSaving"
                                            class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                                        >
                                            Abbrechen
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="border-l-4 border-indigo-500 pl-4">
                                <p class="text-sm text-gray-600">FiveM ID</p>
                                <p class="text-lg font-semibold text-gray-900">{{ user.fivemId }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Avatar Settings -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Profilbild Einstellungen</h3>
                        
                        <div class="space-y-4">
                            <!-- Current Avatar Preview -->
                            <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <img 
                                    v-if="user.avatarUrl" 
                                    :src="user.avatarUrl" 
                                    :alt="user.displayName"
                                    class="w-20 h-20 rounded-full border-2 border-blue-500"
                                />
                                <div v-else class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                                    {{ user.name ? user.name[0].toUpperCase() : '?' }}
                                </div>
                                <div>
                                    <p class="font-semibold text-gray-900">Aktuelles Profilbild</p>
                                    <p class="text-sm text-gray-600">Quelle: {{ getAvatarSourceLabel(user.avatarSource) }}</p>
                                </div>
                            </div>

                            <!-- Avatar Source Selection -->
                            <div class="space-y-3">
                                <p class="font-medium text-gray-700">Profilbild-Quelle wählen:</p>
                                
                                <!-- CFX Avatar -->
                                <div 
                                    @click="selectAvatarSource('cfx')"
                                    :class="['flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all', 
                                             user.avatarSource === 'cfx' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300']"
                                >
                                    <img 
                                        v-if="user.cfxAvatar" 
                                        :src="user.cfxAvatar" 
                                        class="w-12 h-12 rounded-full"
                                    />
                                    <div class="flex-1">
                                        <p class="font-semibold text-gray-900">CFX.re Avatar</p>
                                        <p class="text-sm text-gray-600">Dein Avatar von forum.cfx.re</p>
                                    </div>
                                    <span v-if="user.avatarSource === 'cfx'" class="text-blue-600 font-bold">✓</span>
                                </div>

                                <!-- Discord Avatar -->
                                <div 
                                    @click="user.discord ? selectAvatarSource('discord') : null"
                                    :class="['flex items-center gap-3 p-4 border-2 rounded-lg transition-all',
                                             !user.discord ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                                             user.avatarSource === 'discord' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300']"
                                >
                                    <img 
                                        v-if="user.discord?.avatar" 
                                        :src="user.discord.avatar" 
                                        class="w-12 h-12 rounded-full"
                                    />
                                    <div v-else class="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                                        D
                                    </div>
                                    <div class="flex-1">
                                        <p class="font-semibold text-gray-900">Discord Avatar</p>
                                        <p v-if="user.discord" class="text-sm text-gray-600">{{ user.discord.username }}</p>
                                        <p v-else class="text-sm text-red-600">Nicht verknüpft</p>
                                    </div>
                                    <a 
                                        v-if="!user.discord"
                                        href="/auth/discord"
                                        class="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                                        @click.stop
                                    >
                                        Discord verknüpfen
                                    </a>
                                    <button 
                                        v-else-if="user.discord"
                                        @click.stop="unlinkDiscord"
                                        class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                    >
                                        Trennen
                                    </button>
                                    <span v-if="user.avatarSource === 'discord'" class="text-purple-600 font-bold">✓</span>
                                </div>

                                <!-- Custom Avatar -->
                                <div 
                                    @click="startCustomAvatar"
                                    :class="['flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all',
                                             user.avatarSource === 'custom' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300']"
                                >
                                    <img 
                                        v-if="user.customAvatar" 
                                        :src="user.customAvatar" 
                                        class="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div v-else class="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                                        🖼️
                                    </div>
                                    <div class="flex-1">
                                        <p class="font-semibold text-gray-900">Custom Avatar</p>
                                        <p class="text-sm text-gray-600">Eigene Bild-URL verwenden</p>
                                    </div>
                                    <span v-if="user.avatarSource === 'custom'" class="text-green-600 font-bold">✓</span>
                                </div>

                                <!-- Custom Avatar URL Input -->
                                <div v-if="editingCustomAvatar" class="p-4 bg-gray-50 rounded-lg space-y-3">
                                    <label class="block text-sm font-medium text-gray-700">Bild-URL eingeben:</label>
                                    <input 
                                        v-model="customAvatarUrl"
                                        type="url"
                                        placeholder="https://example.com/avatar.png"
                                        class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                        :disabled="avatarSaving"
                                    />
                                    <p v-if="avatarError" class="text-red-600 text-sm">{{ avatarError }}</p>
                                    <div class="flex gap-2">
                                        <button 
                                            @click="saveCustomAvatar"
                                            :disabled="avatarSaving || !customAvatarUrl"
                                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            {{ avatarSaving ? 'Speichern...' : 'Speichern' }}
                                        </button>
                                        <button 
                                            @click="cancelCustomAvatar"
                                            :disabled="avatarSaving"
                                            class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                        >
                                            Abbrechen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Organisation/Group/Role -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Rechte & Zugehörigkeit</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="border-l-4 pl-4" :style="{ borderColor: user.organisation?.color || '#3B82F6' }">
                                <p class="text-sm text-gray-600">Organisation</p>
                                <p class="text-lg font-semibold" :style="{ color: user.organisation?.color || '#000' }">
                                    {{ user.organisation?.name || 'Keine' }}
                                </p>
                            </div>
                            <div class="border-l-4 pl-4" :style="{ borderColor: user.group?.color || '#10B981' }">
                                <p class="text-sm text-gray-600">Gruppe</p>
                                <p class="text-lg font-semibold" :style="{ color: user.group?.color || '#000' }">
                                    {{ user.group?.name || 'Keine' }}
                                </p>
                            </div>
                            <div class="border-l-4 pl-4" :style="{ borderColor: user.role?.color || '#8B5CF6' }">
                                <p class="text-sm text-gray-600">Rolle</p>
                                <p class="text-lg font-semibold" :style="{ color: user.role?.color || '#000' }">
                                    {{ user.role?.name || 'Keine' }} 
                                    <span v-if="user.role?.priority" class="text-sm text-gray-500">({{ user.role.priority }})</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Permissions -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Berechtigungen</h3>
                        <div class="space-y-2">
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span class="font-medium">Administrator</span>
                                <span :class="user.isAdmin ? 'text-green-600' : 'text-gray-400'">
                                    {{ user.isAdmin ? '✓ Ja' : '✗ Nein' }}
                                </span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span class="font-medium">Moderator</span>
                                <span :class="user.isModerator ? 'text-green-600' : 'text-gray-400'">
                                    {{ user.isModerator ? '✓ Ja' : '✗ Nein' }}
                                </span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span class="font-medium">Trust Level (CFX)</span>
                                <span class="text-blue-600 font-semibold">{{ user.trustLevel }}</span>
                            </div>
                            <div v-if="user.role?.permissions" class="p-3 bg-blue-50 rounded">
                                <p class="font-medium text-sm text-gray-700 mb-2">Rollen-Permissions:</p>
                                <div class="flex flex-wrap gap-2">
                                    <span 
                                        v-for="perm in parsePermissions(user.role.permissions)" 
                                        :key="perm"
                                        class="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded"
                                    >
                                        {{ perm }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Custom Fields (CFX-spezifisch) -->
                    <div v-if="hasCustomFields" class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">CFX Custom Fields</h3>
                        <div class="bg-gray-50 rounded p-4 overflow-x-auto">
                            <pre class="text-sm text-gray-800">{{ JSON.stringify(user._discourseData?.custom_fields || {}, null, 2) }}</pre>
                        </div>
                    </div>

                    <!-- Raw Data (Development) -->
                    <details class="bg-white rounded-lg shadow-lg p-6">
                        <summary class="cursor-pointer text-lg font-bold text-gray-900 hover:text-blue-600">
                            🔧 Raw User Data (Debug)
                        </summary>
                        <div class="mt-4 bg-gray-900 text-green-400 rounded p-4 overflow-x-auto">
                            <pre class="text-xs">{{ JSON.stringify(user, null, 2) }}</pre>
                        </div>
                    </details>

                    <!-- Actions -->
                    <div class="flex gap-4">
                        <button 
                            @click="$router.push('/home')"
                            class="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Zurück zum Dashboard
                        </button>
                        <button 
                            @click="logout"
                            class="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Abmelden
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            user: null,
            loading: true,
            error: null,
            editingUsername: false,
            newUsername: '',
            usernameSaving: false,
            usernameError: null,
            editingCustomAvatar: false,
            customAvatarUrl: '',
            avatarSaving: false,
            avatarError: null
        };
    },
    computed: {
        hasCustomFields() {
            return this.user && 
                   this.user._discourseData?.custom_fields && 
                   Object.keys(this.user._discourseData.custom_fields).length > 0;
        }
    },
    async mounted() {
        await this.loadProfile();
    },
    methods: {
        async loadProfile() {
            this.loading = true;
            this.error = null;

            try {
                const response = await fetch('/api/profile', {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Not authenticated');
                }

                const data = await response.json();

                if (!data.success || !data.user) {
                    throw new Error('Invalid response');
                }

                this.user = data.user;

                // Update globalen App State (reaktiv)
                if (window.appState && window.appState.user) {
                    Object.assign(window.appState.user, {
                        avatar: data.user.avatarUrl,
                        avatarUrl: data.user.avatarUrl,
                        name: data.user.displayName,
                        displayName: data.user.displayName
                    });
                }

            } catch (error) {
                console.error('Load profile error:', error);
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },

        startEditUsername() {
            this.editingUsername = true;
            this.newUsername = this.user.customUsername || this.user.displayName;
            this.usernameError = null;
        },

        cancelEditUsername() {
            this.editingUsername = false;
            this.newUsername = '';
            this.usernameError = null;
        },

        async saveUsername() {
            if (!this.newUsername || this.newUsername.length < 3) {
                this.usernameError = 'Username muss mindestens 3 Zeichen lang sein';
                return;
            }

            this.usernameSaving = true;
            this.usernameError = null;

            try {
                const response = await fetch('/api/profile/username', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        username: this.newUsername
                    })
                });

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Username konnte nicht aktualisiert werden');
                }

                // Update local user data
                this.user.customUsername = data.user.customUsername;
                this.user.displayName = data.user.displayName;

                // Close edit mode
                this.editingUsername = false;
                this.newUsername = '';

            } catch (error) {
                console.error('Save username error:', error);
                this.usernameError = error.message;
            } finally {
                this.usernameSaving = false;
            }
        },

        parsePermissions(permissionsJson) {
            try {
                return JSON.parse(permissionsJson);
            } catch (e) {
                return [];
            }
        },

        getAvatarSourceLabel(source) {
            const labels = {
                'cfx': 'CFX.re',
                'discord': 'Discord',
                'custom': 'Eigenes Bild'
            };
            return labels[source] || 'Unbekannt';
        },

        async selectAvatarSource(source) {
            if (this.avatarSaving) return;
            
            this.avatarSaving = true;
            this.avatarError = null;

            try {
                const response = await fetch('/api/profile/avatar', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ source })
                });

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Fehler beim Ändern des Avatars');
                }

                // Update local user data
                this.user.avatarUrl = data.user.avatarUrl;
                this.user.avatarSource = data.user.avatarSource;
                this.user.avatar = data.user.avatarUrl; // Für Header-Komponente

                // Update globalen App State (reaktiv)
                if (window.appState && window.appState.user) {
                    Object.assign(window.appState.user, {
                        avatar: data.user.avatarUrl,
                        avatarUrl: data.user.avatarUrl
                    });
                }

            } catch (error) {
                console.error('Avatar source change error:', error);
                this.avatarError = error.message;
            } finally {
                this.avatarSaving = false;
            }
        },

        startCustomAvatar() {
            this.editingCustomAvatar = true;
            this.customAvatarUrl = this.user.customAvatar || '';
            this.avatarError = null;
        },

        cancelCustomAvatar() {
            this.editingCustomAvatar = false;
            this.customAvatarUrl = '';
            this.avatarError = null;
        },

        async saveCustomAvatar() {
            if (!this.customAvatarUrl) {
                this.avatarError = 'Bitte gib eine URL ein';
                return;
            }

            if (!this.customAvatarUrl.startsWith('http')) {
                this.avatarError = 'URL muss mit http:// oder https:// beginnen';
                return;
            }

            this.avatarSaving = true;
            this.avatarError = null;

            try {
                const response = await fetch('/api/profile/avatar', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        source: 'custom',
                        customUrl: this.customAvatarUrl
                    })
                });

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Fehler beim Speichern des Avatars');
                }

                // Update local user data
                this.user.avatarUrl = data.user.avatarUrl;
                this.user.avatarSource = data.user.avatarSource;
                this.user.customAvatar = this.customAvatarUrl;
                this.user.avatar = data.user.avatarUrl; // Für Header-Komponente

                // Update globalen App State (reaktiv)
                if (window.appState && window.appState.user) {
                    Object.assign(window.appState.user, {
                        avatar: data.user.avatarUrl,
                        avatarUrl: data.user.avatarUrl
                    });
                }

                // Close edit mode
                this.editingCustomAvatar = false;
                this.customAvatarUrl = '';

            } catch (error) {
                console.error('Custom avatar save error:', error);
                this.avatarError = error.message;
            } finally {
                this.avatarSaving = false;
            }
        },

        async unlinkDiscord() {
            if (!confirm('Möchtest du Discord wirklich trennen?')) {
                return;
            }

            try {
                const response = await fetch('/auth/discord/unlink', {
                    method: 'POST',
                    credentials: 'include'
                });

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Fehler beim Trennen von Discord');
                }

                // Reload profile
                await this.loadProfile();

            } catch (error) {
                console.error('Discord unlink error:', error);
                alert('Fehler: ' + error.message);
            }
        },

        formatDate(isoString) {
            if (!isoString) return 'Unbekannt';
            const date = new Date(isoString);
            return date.toLocaleString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        async logout() {
            try {
                await fetch('/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                // Redirect to login
                this.$router.push('/login');

            } catch (error) {
                console.error('Logout error:', error);
                alert('Fehler beim Abmelden');
            }
        }
    }
};
