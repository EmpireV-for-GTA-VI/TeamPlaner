const TaskPlannerComponent = {
  data() {
    return {
      showPlanner: false,
      editMode: false,
      boards: [
        { 
          id: 1, 
          title: 'To Do', 
          color: 'blue',
          cards: []
        },
        { 
          id: 2, 
          title: 'In Progress', 
          color: 'yellow',
          cards: []
        },
        { 
          id: 3, 
          title: 'Done', 
          color: 'green',
          cards: []
        }
      ]
    }
  },
  mounted() {
    this.loadFromLocalStorage()
  },
  methods: {
    togglePlanner() {
      this.showPlanner = !this.showPlanner
    },
    addBoard() {
      const title = prompt('Board Name:')
      if (title) {
        const colors = ['blue', 'green', 'purple', 'red', 'orange', 'pink', 'indigo']
        const randomColor = colors[Math.floor(Math.random() * colors.length)]
        this.boards.push({
          id: Date.now(),
          title: title,
          color: randomColor,
          cards: []
        })
        this.saveToLocalStorage()
      }
    },
    deleteBoard(boardId) {
      if (confirm('Board wirklich löschen?')) {
        this.boards = this.boards.filter(b => b.id !== boardId)
        this.saveToLocalStorage()
      }
    },
    addCard(boardId) {
      const title = prompt('Karten-Titel:')
      if (title) {
        const board = this.boards.find(b => b.id === boardId)
        board.cards.push({
          id: Date.now(),
          title: title,
          description: '',
          showDescription: false,
          createdAt: new Date().toISOString()
        })
        this.saveToLocalStorage()
      }
    },
    deleteCard(boardId, cardId) {
      const board = this.boards.find(b => b.id === boardId)
      board.cards = board.cards.filter(c => c.id !== cardId)
      this.saveToLocalStorage()
    },
    toggleDescription(card) {
      card.showDescription = !card.showDescription
    },
    moveCard(cardId, fromBoardId, toBoardId) {
      const fromBoard = this.boards.find(b => b.id === fromBoardId)
      const toBoard = this.boards.find(b => b.id === toBoardId)
      const cardIndex = fromBoard.cards.findIndex(c => c.id === cardId)
      if (cardIndex > -1) {
        const card = fromBoard.cards.splice(cardIndex, 1)[0]
        toBoard.cards.push(card)
        this.saveToLocalStorage()
      }
    },
    saveToLocalStorage() {
      localStorage.setItem('task_planner_boards', JSON.stringify(this.boards))
    },
    loadFromLocalStorage() {
      const saved = localStorage.getItem('task_planner_boards')
      if (saved) {
        this.boards = JSON.parse(saved)
      }
    },
    getBoardColorClass(color) {
      const colors = {
        blue: 'from-blue-400 to-blue-600',
        green: 'from-green-400 to-green-600',
        yellow: 'from-yellow-400 to-yellow-600',
        purple: 'from-purple-400 to-purple-600',
        red: 'from-red-400 to-red-600',
        orange: 'from-orange-400 to-orange-600',
        pink: 'from-pink-400 to-pink-600',
        indigo: 'from-indigo-400 to-indigo-600'
      }
      return colors[color] || colors.blue
    }
  },
  template: `
    <div class="relative">
      <!-- Planner Toggle Button -->
      <button 
        @click="togglePlanner"
        class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        Aufgabenplaner
      </button>
      
      <!-- Fullscreen Planner Modal -->
      <div v-if="showPlanner" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-gray-100 rounded-2xl shadow-2xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
          <!-- Header -->
          <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
            <div class="flex items-center gap-4">
              <h2 class="text-3xl font-bold">📋 Aufgabenplaner</h2>
              <button 
                @click="editMode = !editMode"
                :class="['px-4 py-2 rounded-lg font-semibold transition-colors', editMode ? 'bg-white text-indigo-600' : 'bg-indigo-500 hover:bg-indigo-400']">
                {{ editMode ? '✓ Fertig' : '✏️ Bearbeiten' }}
              </button>
            </div>
            <button 
              @click="togglePlanner"
              class="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg font-semibold transition-colors">
              ✕ Schließen
            </button>
          </div>
          
          <!-- Add Board Button (Edit Mode) -->
          <div v-if="editMode" class="p-4 bg-indigo-50 border-b border-indigo-200">
            <button 
              @click="addBoard"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              + Neues Board
            </button>
          </div>
          
          <!-- Boards Container -->
          <div class="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div class="flex gap-6 h-full">
              <div 
                v-for="board in boards" 
                :key="board.id"
                class="flex-shrink-0 w-80 bg-white rounded-xl shadow-lg flex flex-col">
                
                <!-- Board Header -->
                <div :class="['bg-gradient-to-r', getBoardColorClass(board.color), 'text-white p-4 rounded-t-xl flex justify-between items-center']">
                  <h3 v-if="!editMode" class="text-xl font-bold">{{ board.title }}</h3>
                  <input 
                    v-else 
                    v-model="board.title" 
                    @input="saveToLocalStorage"
                    class="flex-1 bg-white bg-opacity-30 text-white placeholder-white px-3 py-1 rounded font-bold"
                    placeholder="Board Name"
                  />
                  <div class="flex items-center gap-2 ml-2">
                    <span class="bg-white bg-opacity-30 px-3 py-1 rounded-full text-sm font-semibold">
                      {{ board.cards.length }}
                    </span>
                    <button 
                      v-if="editMode"
                      @click="deleteBoard(board.id)"
                      class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm font-semibold">
                      🗑️
                    </button>
                  </div>
                </div>
                
                <!-- Cards Container -->
                <div class="flex-1 overflow-y-auto p-4 space-y-3">
                  <div 
                    v-for="card in board.cards" 
                    :key="card.id"
                    class="bg-gray-50 border-2 border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow group">
                    
                    <div class="flex justify-between items-start mb-2">
                      <h4 v-if="!editMode" class="font-semibold text-gray-800 flex-1">{{ card.title }}</h4>
                      <input 
                        v-else 
                        v-model="card.title" 
                        @input="saveToLocalStorage"
                        class="flex-1 px-2 py-1 border-2 border-gray-300 rounded font-semibold"
                      />
                      <button 
                        v-if="editMode"
                        @click="deleteCard(board.id, card.id)"
                        class="ml-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                        ✕
                      </button>
                    </div>
                    
                    <!-- Description Toggle -->
                    <button 
                      @click="toggleDescription(card)"
                      class="text-sm text-gray-600 hover:text-gray-800 mb-2">
                      {{ card.showDescription ? '▼' : '▶' }} Beschreibung
                    </button>
                    
                    <!-- Description -->
                    <div v-if="card.showDescription" class="mt-2">
                      <textarea 
                        v-model="card.description"
                        @input="saveToLocalStorage"
                        placeholder="Beschreibung hinzufügen..."
                        rows="3"
                        class="w-full p-2 border-2 border-gray-300 rounded text-sm resize-none"
                      ></textarea>
                    </div>
                    
                    <!-- Move Card Controls -->
                    <div v-if="!editMode && boards.length > 1" class="mt-2 flex gap-1 flex-wrap">
                      <button 
                        v-for="targetBoard in boards.filter(b => b.id !== board.id)" 
                        :key="targetBoard.id"
                        @click="moveCard(card.id, board.id, targetBoard.id)"
                        class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">
                        → {{ targetBoard.title }}
                      </button>
                    </div>
                    
                    <div class="text-xs text-gray-400 mt-2">
                      {{ new Date(card.createdAt).toLocaleDateString('de-DE') }}
                    </div>
                  </div>
                  
                  <!-- Add Card Button -->
                  <button 
                    @click="addCard(board.id)"
                    class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold transition-colors">
                    + Neue Karte
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
