const MarketingComponent = {
  data() {
    return {
      searchQuery: '',
      editMode: false,
      activeTopicId: null,
      activeSubcategoryId: null,
      topics: [
        { id: 1, title: 'Kampagnen-Planung', icon: '📊', content: [], subcategories: [] },
        { id: 2, title: 'Social Media', icon: '📱', content: [], subcategories: [] },
        { id: 3, title: 'Content-Strategie', icon: '✍️', content: [], subcategories: [] },
        { id: 4, title: 'Brand Guidelines', icon: '🎨', content: [], subcategories: [] },
        { id: 5, title: 'Analytics', icon: '📈', content: [], subcategories: [] }
      ],
      componentLibrary: [
        { type: 'heading', label: 'Überschrift', icon: '📝' },
        { type: 'paragraph', label: 'Text', icon: '📄' },
        { type: 'list', label: 'Liste', icon: '📋' },
        { type: 'code', label: 'Code', icon: '💻' },
        { type: 'alert', label: 'Hinweis', icon: '⚠️' },
        { type: 'card', label: 'Card', icon: '🎴' }
      ]
    }
  },
  computed: {
    filteredTopics() {
      if (!this.searchQuery) return this.topics
      return this.topics.filter(topic => 
        topic.title.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
    },
    activeTopic() {
      return this.topics.find(t => t.id === this.activeTopicId) || this.topics[0]
    },
    activeSubcategory() {
      if (!this.activeSubcategoryId) return null
      return this.activeTopic.subcategories.find(s => s.id === this.activeSubcategoryId)
    },
    activeContent() {
      return this.activeSubcategory ? this.activeSubcategory.content : this.activeTopic.content
    }
  },
  mounted() {
    this.activeTopicId = this.topics[0].id
    this.loadFromLocalStorage()
  },
  methods: {
    selectTopic(topicId) {
      this.activeTopicId = topicId
      this.activeSubcategoryId = null
    },
    selectSubcategory(subcategoryId) {
      this.activeSubcategoryId = subcategoryId
    },
    addSubcategory() {
      const title = prompt('Unterkategorie Name:')
      if (title) {
        this.activeTopic.subcategories.push({
          id: Date.now(),
          title: title,
          content: []
        })
        this.saveToLocalStorage()
      }
    },
    deleteSubcategory(subcategoryId) {
      if (confirm('Unterkategorie wirklich löschen?')) {
        const index = this.activeTopic.subcategories.findIndex(s => s.id === subcategoryId)
        if (index > -1) {
          this.activeTopic.subcategories.splice(index, 1)
          if (this.activeSubcategoryId === subcategoryId) {
            this.activeSubcategoryId = null
          }
          this.saveToLocalStorage()
        }
      }
    },
    addComponent(type) {
      const newComponent = {
        id: Date.now(),
        type: type,
        content: type === 'heading' ? 'Neue Überschrift' : 
                type === 'paragraph' ? 'Neuer Textabsatz...' :
                type === 'list' ? ['Punkt 1', 'Punkt 2'] :
                type === 'code' ? 'const example = "code";' :
                type === 'alert' ? 'Wichtiger Hinweis' :
                'Card Inhalt'
      }
      this.activeContent.push(newComponent)
      this.saveToLocalStorage()
    },
    removeComponent(componentId) {
      const index = this.activeContent.findIndex(c => c.id === componentId)
      if (index > -1) {
        this.activeContent.splice(index, 1)
        this.saveToLocalStorage()
      }
    },
    addNewTopic() {
      const title = prompt('Neues Thema:')
      if (title) {
        this.topics.push({
          id: Date.now(),
          title: title,
          icon: '📄',
          content: []
        })
        this.saveToLocalStorage()
      }
    },
    saveToLocalStorage() {
      localStorage.setItem('marketing_docs', JSON.stringify(this.topics))
    },
    loadFromLocalStorage() {
      const saved = localStorage.getItem('marketing_docs')
      if (saved) {
        this.topics = JSON.parse(saved)
      }
    }
  },
  template: `
    <div class="min-h-screen bg-gray-50 flex">
      <!-- Sidebar -->
      <div class="w-80 bg-white shadow-xl border-r border-gray-200 flex flex-col">
        <div class="p-4 border-b border-gray-200">
          <h2 class="text-2xl font-bold text-gray-800 mb-4">📢 Marketing</h2>
          
          <!-- Search -->
          <div class="relative">
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Themen durchsuchen..." 
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          
          <button 
            @click="addNewTopic"
            class="mt-3 w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors">
            + Neues Thema
          </button>
        </div>
        
        <!-- Topics List -->
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
          <div v-for="topic in filteredTopics" :key="topic.id" class="space-y-1">
            <div 
              @click="selectTopic(topic.id)"
              :class="['p-3 rounded-lg cursor-pointer transition-all', activeTopicId === topic.id && !activeSubcategoryId ? 'bg-purple-50 border-2 border-purple-500' : 'hover:bg-gray-50 border-2 border-transparent']">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <span class="text-2xl mr-3">{{ topic.icon }}</span>
                  <span class="font-semibold text-gray-800">{{ topic.title }}</span>
                </div>
                <span v-if="topic.subcategories.length > 0" class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                  {{ topic.subcategories.length }}
                </span>
              </div>
            </div>
            
            <!-- Subcategories -->
            <div v-if="activeTopicId === topic.id && topic.subcategories.length > 0" class="ml-6 space-y-1">
              <div 
                v-for="subcategory in topic.subcategories" 
                :key="subcategory.id"
                @click.stop="selectSubcategory(subcategory.id)"
                :class="['p-2 rounded-lg cursor-pointer transition-all text-sm', activeSubcategoryId === subcategory.id ? 'bg-purple-100 border-2 border-purple-400' : 'hover:bg-gray-100 border-2 border-transparent']">
                <div class="flex items-center justify-between">
                  <span class="font-medium text-gray-700">└ {{ subcategory.title }}</span>
                  <button 
                    v-if="editMode"
                    @click.stop="deleteSubcategory(subcategory.id)"
                    class="text-red-500 hover:text-red-700 text-xs">
                    ✕
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Add Subcategory Button -->
            <div v-if="activeTopicId === topic.id && editMode" class="ml-6">
              <button 
                @click.stop="addSubcategory"
                class="w-full text-left p-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg">
                + Unterkategorie hinzufügen
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Main Content -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-4xl mx-auto p-8">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">{{ activeTopic.title }}</h1>
              <h2 v-if="activeSubcategory" class="text-xl text-gray-600 mt-1">{{ activeSubcategory.title }}</h2>
            </div>
            <button 
              @click="editMode = !editMode"
              :class="['px-4 py-2 rounded-lg font-semibold transition-colors', editMode ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']">
              {{ editMode ? '✓ Bearbeiten beenden' : '✏️ Bearbeiten' }}
            </button>
          </div>
          
          <!-- Component Library (nur im Edit Mode) -->
          <div v-if="editMode" class="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
            <h3 class="font-bold text-gray-800 mb-3">Komponenten hinzufügen:</h3>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="comp in componentLibrary" 
                :key="comp.type"
                @click="addComponent(comp.type)"
                class="bg-white hover:bg-purple-100 border-2 border-purple-300 px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
                {{ comp.icon }} {{ comp.label }}
              </button>
            </div>
          </div>
          
          <!-- Content Display/Edit -->
          <div class="space-y-4">
            <div v-if="activeContent.length === 0" class="text-center py-12 text-gray-400">
              <p class="text-lg">Noch keine Inhalte vorhanden.</p>
              <p class="text-sm mt-2">Klicke auf "Bearbeiten" um Inhalte hinzuzufügen.</p>
            </div>
            
            <div v-for="component in activeContent" :key="component.id" class="relative group">
              <!-- Heading -->
              <div v-if="component.type === 'heading'">
                <h2 v-if="!editMode" class="text-2xl font-bold text-gray-800 mb-2">{{ component.content }}</h2>
                <input v-else v-model="component.content" @input="saveToLocalStorage" class="w-full text-2xl font-bold p-2 border-2 border-gray-300 rounded-lg" />
              </div>
              
              <!-- Paragraph -->
              <div v-else-if="component.type === 'paragraph'" class="bg-white rounded-lg p-4">
                <p v-if="!editMode" class="text-gray-700 leading-relaxed">{{ component.content }}</p>
                <textarea v-else v-model="component.content" @input="saveToLocalStorage" rows="3" class="w-full p-2 border-2 border-gray-300 rounded-lg"></textarea>
              </div>
              
              <!-- List -->
              <div v-else-if="component.type === 'list'" class="bg-white rounded-lg p-4">
                <ul v-if="!editMode" class="list-disc list-inside space-y-1">
                  <li v-for="(item, idx) in component.content" :key="idx" class="text-gray-700">{{ item }}</li>
                </ul>
                <div v-else>
                  <input v-for="(item, idx) in component.content" :key="idx" v-model="component.content[idx]" @input="saveToLocalStorage" class="w-full mb-2 p-2 border-2 border-gray-300 rounded-lg" />
                </div>
              </div>
              
              <!-- Code -->
              <div v-else-if="component.type === 'code'" class="bg-gray-900 rounded-lg p-4">
                <pre v-if="!editMode" class="text-green-400 font-mono text-sm">{{ component.content }}</pre>
                <textarea v-else v-model="component.content" @input="saveToLocalStorage" rows="3" class="w-full p-2 bg-gray-800 text-green-400 font-mono rounded-lg"></textarea>
              </div>
              
              <!-- Alert -->
              <div v-else-if="component.type === 'alert'" class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p v-if="!editMode" class="text-yellow-800 font-semibold">⚠️ {{ component.content }}</p>
                <input v-else v-model="component.content" @input="saveToLocalStorage" class="w-full p-2 border-2 border-yellow-400 rounded-lg bg-white" />
              </div>
              
              <!-- Card -->
              <div v-else-if="component.type === 'card'" class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6">
                <p v-if="!editMode" class="text-gray-800">{{ component.content }}</p>
                <textarea v-else v-model="component.content" @input="saveToLocalStorage" rows="2" class="w-full p-2 border-2 border-purple-300 rounded-lg"></textarea>
              </div>
              
              <!-- Delete Button (nur im Edit Mode) -->
              <button 
                v-if="editMode"
                @click="removeComponent(component.id)"
                class="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                🗑️ Löschen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};