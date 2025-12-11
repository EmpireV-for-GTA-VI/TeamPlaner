// Vue und VueRouter sind global verfügbar über CDN
const { createApp } = Vue
const { createRouter, createWebHashHistory } = VueRouter

// Router-Konfiguration mit allen Seiten und Dokumentations-Unterseiten
const routes = [
  { path: '/', component: HomeComponent },
  { path: '/about', component: AboutComponent },
  { path: '/contact', component: ContactComponent },
  { path: '/documentation', component: DocumentationComponent },
  { path: '/documentations/development', component: DevelopmentComponent },
  { path: '/documentations/marketing', component: MarketingComponent},
  { path: '/documentations/support', component: SupportComponent}
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Haupt-App-Komponente mit persistenter Navigation (Tailwind-styled)
const App = {
  data() {
    return {
      user: null,
      authenticated: false
    }
  },
  template: `
    <div class="min-h-screen flex flex-col">
      <header class="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 class="text-3xl font-bold">Meine Vue-Website</h1>
          <div v-if="authenticated" class="flex items-center gap-4">
            <span class="text-sm">Willkommen, {{ user.cfx_name }}</span>
            <button @click="logout" 
              class="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <nav class="bg-gray-800 shadow-md sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex justify-between items-center">
            <div class="flex space-x-1">
              <router-link to="/" 
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
            </div>
            <div class="py-2">
              <task-planner></task-planner>
            </div>
          </div>
        </div>
      </nav>
      
      <!-- Der Inhalt der aktuellen Seite wird hier angezeigt -->
      <main class="flex-grow">
        <router-view />
      </main>
      
      <footer class="bg-gray-800 text-white mt-auto">
        <div class="max-w-7xl mx-auto px-4 py-6 text-center">
          <p>&copy; 2025 Meine Vue-Website. Alle Rechte vorbehalten.</p>
        </div>
      </footer>
    </div>
  `,
  async mounted() {
    // Prüfe beim Laden der App ob Benutzer eingeloggt ist
    await this.checkAuth();
  },
  methods: {
    async checkAuth() {
      this.authenticated = await AuthManager.checkAuth();
      this.user = AuthManager.getUser();
      
      if (!this.authenticated) {
        AuthManager.showLoginOverlay();
      }
    },
    logout() {
      AuthManager.logout();
    }
  }
}

// App erstellen und mounten
const app = createApp(App)
app.component('task-planner', TaskPlannerComponent)
app.use(router)
app.mount('#app')
