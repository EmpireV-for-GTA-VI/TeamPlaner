const HomeComponent = {
  template: `
    <div class="bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <div class="max-w-6xl mx-auto px-4 py-12">
        <div class="text-center mb-12">
          <h2 class="text-5xl font-bold text-gray-900 mb-4">Willkommen auf der Startseite</h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">Dies ist die Hauptseite unserer Vue.js Anwendung mit modernem Tailwind CSS Design.</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8 mb-12">
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow">
            <div class="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Schnell</h3>
            <p class="text-gray-600">Blitzschnelle Performance mit Vue 3</p>
          </div>
          
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow">
            <div class="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Sicher</h3>
            <p class="text-gray-600">Moderne Sicherheitsstandards</p>
          </div>
          
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl transition-shadow">
            <div class="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Flexibel</h3>
            <p class="text-gray-600">Anpassbar und erweiterbar</p>
          </div>
        </div>
        
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Über diese Seite</h3>
          <p class="text-gray-700 leading-relaxed mb-4">
            Diese Single-Page-Application (SPA) wurde mit <span class="font-semibold text-green-600">Vue 3</span> und 
            <span class="font-semibold text-blue-600">Vue Router</span> erstellt. Das Design nutzt 
            <span class="font-semibold text-cyan-600">Tailwind CSS</span> für modernes, responsives Styling.
          </p>
          <p class="text-gray-700 leading-relaxed">
            Nutze die Navigation oben, um zwischen den verschiedenen Seiten zu wechseln und die Dokumentation zu erkunden.
          </p>
        </div>
      </div>
    </div>
  `
}
