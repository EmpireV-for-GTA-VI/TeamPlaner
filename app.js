// Vue und VueRouter sind global verfügbar über CDN
const { createApp } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

// ==================== GLOBALER STATE ====================
// Verwende Vue's reactive für bessere Reaktivität
const appState = Vue.reactive({
    user: null,
    authenticated: false,
    loading: true
});

// Mache appState global verfügbar
window.appState = appState;

// ==================== ROUTER KONFIGURATION ====================
const routes = [
    // Public Routes
    { 
        path: '/login', 
        component: LoginComponent,
        meta: { requiresAuth: false, hideForAuth: true }
    },
    
    // Protected Routes
    { 
        path: '/', 
        redirect: '/home' 
    },
    { 
        path: '/home', 
        component: HomeComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/about', 
        component: AboutComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/contact', 
        component: ContactComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/documentation', 
        component: DocumentationComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/documentations/development', 
        component: DevelopmentComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/documentations/marketing', 
        component: MarketingComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/documentations/support', 
        component: SupportComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/profile', 
        component: ProfileComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/console', 
        component: ServerConsoleComponent,
        meta: { requiresAuth: true }
    },
    { 
        path: '/tasks', 
        component: TaskPlannerComponent,
        meta: { requiresAuth: true }
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// ==================== ROUTER GUARD ====================
/**
 * Navigation Guard - Prüft Auth vor jeder Route
 */
router.beforeEach(async (to, from, next) => {
    const requiresAuth = to.meta.requiresAuth !== false;
    const hideForAuth = to.meta.hideForAuth === true;
    
    // Beim ersten Laden: Auth-Status prüfen
    if (appState.loading) {
        try {
            const authData = await api.checkAuth();
            appState.authenticated = authData.authenticated;
            appState.user = authData.user || null;
        } catch (error) {
            console.error('Auth check failed:', error);
            appState.authenticated = false;
            appState.user = null;
        } finally {
            appState.loading = false;
        }
    }
    
    // Route benötigt Auth, aber User ist nicht eingeloggt
    if (requiresAuth && !appState.authenticated) {
        console.log('🔒 Access denied - redirecting to login');
        next('/login');
        return;
    }
    
    // User ist eingeloggt und versucht Login-Seite zu öffnen
    if (hideForAuth && appState.authenticated) {
        console.log('✓ Already authenticated - redirecting to home');
        next('/home');
        return;
    }
    
    // Alles OK
    next();
});

// ==================== HAUPT-APP KOMPONENTE ====================
const App = {
    data() {
        return {
            user: appState.user,
            authenticated: appState.authenticated,
            loading: appState.loading
        };
    },
    
    watch: {
        // Synchronisiere mit globalem State
        '$route'() {
            this.user = appState.user;
            this.authenticated = appState.authenticated;
            this.loading = appState.loading;
        }
    },
    template: `
        <div class="h-screen flex flex-col bg-gradient-to-b from-gray-900 to-gray-700">
            <!-- Loading Screen -->
            <div v-if="loading" class="min-h-screen flex items-center justify-center bg-gray-900">
                <div class="text-center">
                    <svg class="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-gray-600">Lade TeamPlaner...</p>
                </div>
            </div>

            <!-- Authenticated Layout -->
            <template v-else-if="authenticated">
                <!-- Header -->
                <header class="bg-[radial-gradient(900px_450px_at_20%_0%,rgba(147,51,234,1),transparent_60%),radial-gradient(900px_450px_at_20%_0%,rgba(92,125,255,0.35),transparent_60%),radial-gradient(900px_450px_at_80%_0%,rgba(201,92,255,0.22),transparent_60%),linear-gradient(90deg,rgba(79,70,229,1)_0%,rgba(124,58,237,1)_25%,rgba(172,89,246,1)_50%,rgba(162,44,152,1)_75%,rgba(147,51,234,1)_100%)] text-white shadow-lg">
                    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                        <h1 class="text-3xl font-bold">TeamPlaner</h1>
                        <div class="flex items-center gap-4">
                            <div class="flex items-center gap-2 cursor-pointer hover:bg-green-700 px-3 py-2 rounded transition-colors" @click="$router.push('/profile')">
                                <div v-if="user.avatar" class="w-8 h-8 rounded-full bg-white overflow-hidden">
                                    <img :src="user.avatar" :alt="user.name" class="w-full h-full object-cover" />
                                </div>
                                <div v-else class="w-8 h-8 rounded-full bg-white text-green-600 flex items-center justify-center font-bold">
                                    {{ user.name ? user.name[0].toUpperCase() : '?' }}
                                </div>
                                <span class="text-sm font-medium">{{ user.name }}</span>
                            </div>
                            <button @click="handleLogout" 
                                class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm transition-colors">
                                Logout
                            </button>
                        </div>
                    </div>
                </header>
                
                <!-- Navigation -->
                <nav class="bg-gray-800 shadow-md sticky top-0 z-40">
                    <div class="max-w-7xl mx-auto px-4">
                        <div class="flex justify-between items-center">
                            <div class="flex space-x-1">
                                <router-link to="/home" 
                                    class="px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg">
                                    Home
                                </router-link>
                                <router-link to="/about" 
                                    class="px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg">
                                    Über uns
                                </router-link>
                                <router-link to="/contact" 
                                    class="px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg">
                                    Kontakt
                                </router-link>
                                <router-link to="/documentation" 
                                    class="px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg">
                                    Dokumentation
                                </router-link>
                                <router-link v-if="user?.organisation?.id === 2" to="/tasks" 
                                    class="px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg">
                                    📋 Aufgaben
                                </router-link>
                                <router-link v-if="user?.group?.name === 'Developer' || user?.group?.name === 'Projektleitung'" to="/console" 
                                    class="px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg">
                                    🖥️ Konsole
                                </router-link>
                            </div>
                        </div>
                    </div>
                </nav>
                
                <!-- Main Content -->
                <main :class="$route.path === '/tasks' ? 'flex-grow overflow-hidden' : 'flex-grow overflow-y-auto'">
                    <router-view />
                </main>
            </template>

            <!-- Public Layout (Login) -->
            <template v-else>
                <router-view />
            </template>
        </div>
    `,
    
    methods: {
        async handleLogout() {
            try {
                await api.logout();
                
                // Update State
                appState.authenticated = false;
                appState.user = null;
                this.authenticated = false;
                this.user = null;
                
                // Redirect zu Login
                this.$router.push('/login');
                
            } catch (error) {
                console.error('Logout failed:', error);
                alert('Logout fehlgeschlagen. Bitte versuchen Sie es erneut.');
            }
        }
    },
    
    mounted() {
        // Handle Login Success Callback
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('login') === 'success') {
            // Reload auth state
            api.checkAuth().then(data => {
                if (data.authenticated) {
                    appState.authenticated = true;
                    appState.user = data.user;
                    this.authenticated = true;
                    this.user = data.user;
                }
            });
        }
    }
};

// ==================== APP ERSTELLEN UND MOUNTEN ====================
const app = createApp(App);
app.component('task-planner', TaskPlannerComponent);
app.component('admin-settings', AdminSettingsComponent);
app.component('server-console', ServerConsoleComponent);
app.use(router);
app.mount('#app');
