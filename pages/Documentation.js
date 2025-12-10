const DocumentationComponent = {
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto p-6">
        <h2 class="text-4xl font-bold text-gray-900 mb-2">Dokumentation</h2>
        <p class="text-xl text-gray-600 mb-8">Vollständige Dokumentation und Ressourcen</p>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Support Card -->
          <router-link to="/documentations/support" 
            class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 p-6">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-gray-800 mb-2">Support</h3>
              <p class="text-gray-600">Hilfe und Support-Dokumentation.</p>
              <div class="mt-4 flex items-center text-blue-600 font-semibold">
                Mehr erfahren
                <svg class="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>
          
          <!-- Development Card -->
          <router-link to="/documentations/development" 
            class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <div class="bg-gradient-to-br from-green-500 to-green-600 p-6">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
              </svg>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-gray-800 mb-2">Development</h3>
              <p class="text-gray-600">Entwicklerdokumentation und Anleitungen.</p>
              <div class="mt-4 flex items-center text-green-600 font-semibold">
                Mehr erfahren
                <svg class="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>
          
          <!-- Marketing Card -->
          <router-link to="/documentations/marketing" 
            class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
            <div class="bg-gradient-to-br from-purple-500 to-purple-600 p-6">
              <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
              </svg>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-gray-800 mb-2">Marketing</h3>
              <p class="text-gray-600">Marketing-Ressourcen und Kampagnen-Dokumentation.</p>
              <div class="mt-4 flex items-center text-purple-600 font-semibold">
                Mehr erfahren
                <svg class="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>
        </div>
        
        <!-- Quick Links Section -->
        <div class="mt-12 bg-white rounded-xl shadow-lg p-8">
          <h3 class="text-2xl font-bold text-gray-800 mb-6">Schnellzugriff</h3>
          <div class="grid md:grid-cols-3 gap-6">
            <div class="flex items-start">
              <div class="bg-blue-100 rounded-lg p-3 mr-4">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-800 mb-1">Changelog</h4>
                <p class="text-sm text-gray-600">Alle Updates und Änderungen</p>
              </div>
            </div>
            
            <div class="flex items-start">
              <div class="bg-green-100 rounded-lg p-3 mr-4">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-800 mb-1">FAQ</h4>
                <p class="text-sm text-gray-600">Häufig gestellte Fragen</p>
              </div>
            </div>
            
            <div class="flex items-start">
              <div class="bg-purple-100 rounded-lg p-3 mr-4">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"/>
                </svg>
              </div>
              <div>
                <h4 class="font-semibold text-gray-800 mb-1">Community</h4>
                <p class="text-sm text-gray-600">Diskussionen und Support</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}