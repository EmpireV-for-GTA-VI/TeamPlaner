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
                                <p class="text-sm text-gray-600">Username</p>
                                <p class="text-lg font-semibold text-gray-900">{{ user.name }}</p>
                            </div>
                            <div class="border-l-4 border-purple-500 pl-4">
                                <p class="text-sm text-gray-600">Display Name</p>
                                <p class="text-lg font-semibold text-gray-900">{{ user.displayName || 'Nicht gesetzt' }}</p>
                            </div>
                            <div class="border-l-4 border-indigo-500 pl-4">
                                <p class="text-sm text-gray-600">Login Zeit</p>
                                <p class="text-lg font-semibold text-gray-900">{{ formatDate(user.loginTime) }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Permissions -->
                    <div class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Berechtigungen</h3>
                        <div class="space-y-2">
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span class="font-medium">Administrator</span>
                                <span :class="user.admin ? 'text-green-600' : 'text-gray-400'">
                                    {{ user.admin ? '✓ Ja' : '✗ Nein' }}
                                </span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span class="font-medium">Moderator</span>
                                <span :class="user.moderator ? 'text-green-600' : 'text-gray-400'">
                                    {{ user.moderator ? '✓ Ja' : '✗ Nein' }}
                                </span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <span class="font-medium">Trust Level</span>
                                <span class="text-blue-600 font-semibold">{{ user.trust_level }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Custom Fields (CFX-spezifisch) -->
                    <div v-if="hasCustomFields" class="bg-white rounded-lg shadow-lg p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">CFX Custom Fields</h3>
                        <div class="bg-gray-50 rounded p-4 overflow-x-auto">
                            <pre class="text-sm text-gray-800">{{ JSON.stringify(user.custom_fields, null, 2) }}</pre>
                        </div>
                    </div>

                    <!-- Raw Data (Development) -->
                    <details class="bg-white rounded-lg shadow-lg p-6">
                        <summary class="cursor-pointer text-lg font-bold text-gray-900 hover:text-blue-600">
                            🔧 Raw User Data (Debug)
                        </summary>
                        <div class="mt-4 bg-gray-900 text-green-400 rounded p-4 overflow-x-auto">
                            <pre class="text-xs">{{ JSON.stringify(user._raw, null, 2) }}</pre>
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
            error: null
        };
    },
    computed: {
        hasCustomFields() {
            return this.user && 
                   this.user.custom_fields && 
                   Object.keys(this.user.custom_fields).length > 0;
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
                const response = await fetch('/auth/me', {
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

            } catch (error) {
                console.error('Load profile error:', error);
                this.error = error.message;
            } finally {
                this.loading = false;
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
