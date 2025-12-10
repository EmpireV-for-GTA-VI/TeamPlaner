const ContactComponent = {
  template: `
    <div class="bg-gray-50 min-h-screen py-12">
      <div class="max-w-5xl mx-auto px-4">
        <h2 class="text-4xl font-bold text-gray-900 mb-4 text-center">Kontakt</h2>
        <p class="text-xl text-gray-600 mb-12 text-center">Nehmen Sie Kontakt mit uns auf!</p>
        
        <div class="grid md:grid-cols-2 gap-8">
          <div class="bg-white rounded-2xl shadow-xl p-8">
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Kontaktinformationen</h3>
            
            <div class="space-y-6">
              <div class="flex items-start">
                <div class="bg-blue-100 rounded-lg p-3 mr-4">
                  <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800 mb-1">Email</h4>
                  <p class="text-gray-600">info@beispiel.de</p>
                  <p class="text-gray-600">support@beispiel.de</p>
                </div>
              </div>
              
              <div class="flex items-start">
                <div class="bg-green-100 rounded-lg p-3 mr-4">
                  <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800 mb-1">Telefon</h4>
                  <p class="text-gray-600">+49 123 456789</p>
                  <p class="text-gray-600">+49 123 987654</p>
                </div>
              </div>
              
              <div class="flex items-start">
                <div class="bg-purple-100 rounded-lg p-3 mr-4">
                  <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800 mb-1">Adresse</h4>
                  <p class="text-gray-600">Musterstraße 123</p>
                  <p class="text-gray-600">12345 Musterstadt</p>
                </div>
              </div>
            </div>
            
            <div class="mt-8 pt-6 border-t border-gray-200">
              <h4 class="font-semibold text-gray-800 mb-3">Öffnungszeiten</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Montag - Freitag</span>
                  <span class="text-gray-800 font-medium">9:00 - 18:00</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Samstag</span>
                  <span class="text-gray-800 font-medium">10:00 - 14:00</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Sonntag</span>
                  <span class="text-gray-800 font-medium">Geschlossen</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-white rounded-2xl shadow-xl p-8">
            <h3 class="text-2xl font-bold text-gray-800 mb-6">Nachricht senden</h3>
            <form class="space-y-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ihr Name">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input type="email" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="ihre@email.de">
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Nachricht</label>
                <textarea rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ihre Nachricht..."></textarea>
              </div>
              <button type="submit" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl">
                Nachricht senden
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
}
