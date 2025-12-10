const AboutComponent = {
  template: `
    <div class="bg-gray-50 min-h-screen py-12">
      <div class="max-w-5xl mx-auto px-4">
        <h2 class="text-4xl font-bold text-gray-900 mb-4 text-center">Über uns</h2>
        <p class="text-xl text-gray-600 mb-12 text-center">Willkommen auf der Über-uns-Seite!</p>
        
        <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <p class="text-lg text-gray-700 leading-relaxed mb-6">
            Hier finden Sie Informationen über unser Projekt und unser Team. Wir entwickeln moderne
            Webanwendungen mit den neuesten Technologien.
          </p>
          
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Unsere Stärken</h3>
          <div class="grid md:grid-cols-2 gap-4">
            <div class="flex items-start">
              <svg class="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <div>
                <h4 class="font-semibold text-gray-800">Moderne Vue.js Architektur</h4>
                <p class="text-gray-600 text-sm">Neueste Standards und Best Practices</p>
              </div>
            </div>
            
            <div class="flex items-start">
              <svg class="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <div>
                <h4 class="font-semibold text-gray-800">Responsive Design</h4>
                <p class="text-gray-600 text-sm">Optimiert für alle Geräte</p>
              </div>
            </div>
            
            <div class="flex items-start">
              <svg class="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <div>
                <h4 class="font-semibold text-gray-800">Einfache Navigation</h4>
                <p class="text-gray-600 text-sm">Intuitiv und benutzerfreundlich</p>
              </div>
            </div>
            
            <div class="flex items-start">
              <svg class="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <div>
                <h4 class="font-semibold text-gray-800">Modulare Komponenten-Struktur</h4>
                <p class="text-gray-600 text-sm">Wartbar und erweiterbar</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="grid md:grid-cols-3 gap-6">
          <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div class="text-4xl font-bold mb-2">5+</div>
            <div class="text-blue-100">Jahre Erfahrung</div>
          </div>
          <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div class="text-4xl font-bold mb-2">100+</div>
            <div class="text-green-100">Projekte</div>
          </div>
          <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div class="text-4xl font-bold mb-2">50+</div>
            <div class="text-purple-100">Zufriedene Kunden</div>
          </div>
        </div>
      </div>
    </div>
  `
}
