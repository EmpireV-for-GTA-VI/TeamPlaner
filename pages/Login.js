// Login Page Component
const LoginComponent = {
    data() {
        return {
            loading: false,
            error: null
        };
    },
    template: `
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                <!-- Logo/Header -->
                <div class="text-center mb-8">
                    <div class="inline-block p-4 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mb-4">
                        <svg class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z">
                            </path>
                        </svg>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-800">TeamPlaner</h1>
                    <p class="text-gray-600 mt-2">Sicheres Login mit FiveM</p>
                </div>

                <!-- Error Message -->
                <div v-if="error" class="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
                    <p class="font-semibold">Fehler</p>
                    <p class="text-sm">{{ error }}</p>
                </div>

                <!-- Info Box -->
                <div class="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                    <p class="text-sm text-blue-800">
                        <span class="font-semibold">🔐 Sicher:</span> 
                        Login über forum.cfx.re mit Discourse User API. Keine Client ID/Secret erforderlich!
                    </p>
                </div>

                <!-- Login Button -->
                <button 
                    @click="handleLogin" 
                    :disabled="loading"
                    class="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 
                           text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition-all duration-200 
                           hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                           flex items-center justify-center gap-3"
                >
                    <svg v-if="!loading" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    <svg v-else class="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span v-if="loading">Verbinde mit CFX.re...</span>
                    <span v-else>Mit FiveM anmelden</span>
                </button>

                <!-- Footer Info -->
                <div class="mt-8 text-center text-sm text-gray-500">
                    <p>Noch kein FiveM Account?</p>
                    <a href="https://forum.cfx.re/signup" target="_blank" 
                       class="text-blue-600 hover:text-blue-800 font-semibold">
                        Jetzt registrieren →
                    </a>
                </div>

                <!-- Tech Info (Development) -->
                <div class="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-400 text-center">
                    <p>Powered by Discourse User API (forum.cfx.re)</p>
                    <p class="mt-1">Ihre Daten sind sicher und verschlüsselt</p>
                </div>
            </div>
        </div>
    `,
    methods: {
        async handleLogin() {
            this.loading = true;
            this.error = null;

            try {
                // Redirect direkt zu Backend (Backend macht dann Redirect zu forum.cfx.re)
                window.location.href = '/auth/redirect';

            } catch (error) {
                console.error('Login error:', error);
                this.error = 'Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es erneut.';
                this.loading = false;
            }
        }
    }
};
