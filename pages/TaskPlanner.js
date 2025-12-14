// Erweiterter Task Planner mit Board-Navigation, Tags, Zuweisungen, Subtasks und Medien
const TaskPlannerComponent = {
  data() {
    return {
      // Boards & Navigation
      boards: [],
      currentBoard: null,
      loading: false,
      error: null,
      
      // Modals
      showBoardModal: false,
      showCategoryModal: false,
      showCardDetailModal: false,
      showTagModal: false,
      
      // Forms
      boardForm: { name: '', description: '', color: '#3B82F6', icon: '📋', is_public: false },
      categoryForm: { name: '', color: '#6B7280' },
      tagForm: { name: '', color: '#3B82F6' },
      cardForm: { title: '', description: '' },
      
      // Permissions Modal (NEU: Granular)
      showPermissionsModal: false,
      showCardModal: false,
      editingBoard: null,
      boardPermissions: [], // Gespeicherte Permissions vom Server
      allGroups: [],
      allRoles: [],
      expandedGroups: {}, // Welche Gruppen sind ausgeklappt
      selectedPermissions: [], // Array von {type, targetId, targetName, rights}
      editingPermission: null, // Aktuelle Permission die bearbeitet wird
      
      // Card Detail Modal Data
      selectedCard: null,
      cardTags: [],
      cardSubtasks: [],
      cardMedia: [],
      cardAssignedUsers: [],
      allUsers: [],
      availableTags: [],
      
      // Original-Daten beim Öffnen des Modals
      originalCardTags: [],
      originalCardUsers: [],
      
      // Card Editing
      editingDescription: false,
      newSubtaskTitle: '',
      newMediaUrl: '',
      newMediaType: 'image',
      
      // Drag & Drop
      draggedCard: null,
      draggedFromCategory: null,
      dragOverIndex: null,
      draggedBoard: null,
      dragOverBoardIndex: null,
      
      // Board Transfer
      transferTargetBoard: null
    }
  },
  
  async mounted() {
    await this.loadBoards();
    await this.loadAllUsers();
    await this.loadAllGroups();
    await this.loadAllRoles();
  },
  
  computed: {
    otherBoards() {
      if (!this.currentBoard) return [];
      return this.boards.filter(b => b.id !== this.currentBoard.id);
    }
  },
  
  methods: {
    // ==================== BOARDS ====================
    
    async loadBoards() {
      this.loading = true;
      try {
        const res = await fetch('/api/boards', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.boards = data.boards;
          if (this.boards.length > 0 && !this.currentBoard) {
            await this.selectBoard(this.boards[0].id);
          }
        }
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    
    async selectBoard(id) {
      this.loading = true;
      try {
        const res = await fetch(`/api/boards/${id}`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.currentBoard = data.board;
          await this.loadBoardTags(id);
        }
      } catch (e) {
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },
    
    openBoardModal() {
      this.boardForm = { name: '', description: '', color: '#3B82F6', icon: '📋' };
      this.showBoardModal = true;
    },
    
    async saveBoard() {
      if (!this.boardForm.name) return alert('Bitte Namen eingeben');
      try {
        const res = await fetch('/api/boards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.boardForm)
        });
        const data = await res.json();
        if (data.success) {
          this.showBoardModal = false;
          await this.loadBoards();
          if (data.board) await this.selectBoard(data.board.id);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async loadAllGroups() {
      try {
        const res = await fetch('/api/groups', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.allGroups = data.groups;
        }
      } catch (e) {
        console.error('Fehler beim Laden der Gruppen:', e);
      }
    },
    
    async loadAllRoles() {
      try {
        const res = await fetch('/api/roles', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.allRoles = data.roles;
        }
      } catch (e) {
        console.error('Fehler beim Laden der Rollen:', e);
      }
    },
    
    openPermissionsModal(board) {
      this.editingBoard = board;
      this.showPermissionsModal = true;
      this.loadBoardPermissions(board.id);
    },
    
    async loadBoardPermissions(boardId) {
      try {
        const res = await fetch(`/api/boards/${boardId}/permissions`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.boardPermissions = data.permissions;
          // Kopiere in selectedPermissions für Bearbeitung
          this.selectedPermissions = JSON.parse(JSON.stringify(data.permissions));
        }
      } catch (e) {
        console.error('Fehler beim Laden der Berechtigungen:', e);
      }
    },
    
    toggleGroup(groupId) {
      this.expandedGroups[groupId] = !this.expandedGroups[groupId];
    },
    
    addPermission(type, targetId, targetName) {
      // Prüfe ob bereits existiert
      const exists = this.selectedPermissions.some(p => 
        p.type === type && p.targetId === targetId
      );
      if (!exists) {
        this.selectedPermissions.push({
          type,
          targetId,
          targetName,
          rights: {
            can_view: true,
            can_create_card: false,
            can_edit_card: false,
            can_delete_card: false,
            can_move_card: false,
            can_create_category: false,
            can_edit_category: false,
            can_delete_category: false,
            can_manage_permissions: false
          }
        });
      }
    },
    
    removePermission(index) {
      this.selectedPermissions.splice(index, 1);
    },
    
    async savePermissions() {
      try {
        const res = await fetch(`/api/boards/${this.editingBoard.id}/permissions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ permissions: this.selectedPermissions })
        });
        const data = await res.json();
        if (data.success) {
          this.showPermissionsModal = false;
          alert('Berechtigungen gespeichert!');
        } else {
          alert('Fehler: ' + data.error);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async deleteBoard(id) {
      if (!confirm('Board wirklich löschen?')) return;
      try {
        await fetch(`/api/boards/${id}`, { method: 'DELETE', credentials: 'include' });
        this.currentBoard = null;
        await this.loadBoards();
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== CATEGORIES ====================
    
    openCategoryModal() {
      this.categoryForm = { name: '', color: '#6B7280' };
      this.showCategoryModal = true;
    },
    
    async saveCategory() {
      if (!this.categoryForm.name) return alert('Bitte Namen eingeben');
      try {
        const res = await fetch(`/api/boards/${this.currentBoard.id}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.categoryForm)
        });
        if ((await res.json()).success) {
          this.showCategoryModal = false;
          await this.selectBoard(this.currentBoard.id);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async deleteCategory(id) {
      if (!confirm('Kategorie löschen? Alle Karten darin gehen verloren!')) return;
      try {
        await fetch(`/api/boards/categories/${id}`, { method: 'DELETE', credentials: 'include' });
        await this.selectBoard(this.currentBoard.id);
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== CARDS ====================
    
    openCardModal(categoryId) {
      this.cardForm = { title: '', description: '', categoryId: categoryId };
      this.showCardModal = true;
    },
    
    openCardModalForBoard() {
      if (!this.currentBoard || !this.currentBoard.categories || this.currentBoard.categories.length === 0) {
        alert('Bitte erstelle zuerst eine Kategorie!');
        return;
      }
      // Nutze die erste Kategorie als Standard
      this.openCardModal(this.currentBoard.categories[0].id);
    },
    
    async addCard() {
      if (!this.cardForm.title) return alert('Bitte Titel eingeben');
      
      try {
        const res = await fetch(`/api/boards/categories/${this.cardForm.categoryId}/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            title: this.cardForm.title,
            description: this.cardForm.description 
          })
        });
        if ((await res.json()).success) {
          this.showCardModal = false;
          await this.selectBoard(this.currentBoard.id);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async openCardDetail(card) {
      this.selectedCard = card;
      this.showCardDetailModal = true;
      
      // Lade Karten-Details
      await Promise.all([
        this.loadCardSubtasks(card.id),
        this.loadCardMedia(card.id)
      ]);
      
      // Speichere Original-Daten als Kopien
      this.originalCardTags = JSON.parse(JSON.stringify(card.tags || []));
      this.originalCardUsers = JSON.parse(JSON.stringify(card.assigned_users || []));
      
      // Tags und Zuweisungen als Kopien (nicht Referenzen!)
      this.cardTags = JSON.parse(JSON.stringify(card.tags || []));
      this.cardAssignedUsers = JSON.parse(JSON.stringify(card.assigned_users || []));
    },
    
    async updateCardDescription() {
      if (!this.selectedCard) return;
      
      try {
        await fetch(`/api/boards/cards/${this.selectedCard.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ description: this.selectedCard.description })
        });
        this.editingDescription = false;
        await this.selectBoard(this.currentBoard.id);
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async deleteCard(cardId) {
      if (!confirm('Karte wirklich löschen?')) return;
      
      try {
        await fetch(`/api/boards/cards/${cardId}`, { method: 'DELETE', credentials: 'include' });
        this.showCardDetailModal = false;
        this.selectedCard = null;
        await this.selectBoard(this.currentBoard.id);
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== TAGS ====================
    
    async loadBoardTags(boardId) {
      try {
        const res = await fetch(`/api/boards/${boardId}/tags`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.availableTags = data.tags;
        }
      } catch (e) {
        console.error('Fehler beim Laden der Tags:', e);
      }
    },
    
    openTagModal() {
      this.tagForm = { name: '', color: '#3B82F6' };
      this.showTagModal = true;
    },
    
    async saveTag() {
      if (!this.tagForm.name) return alert('Bitte Namen eingeben');
      
      try {
        const res = await fetch(`/api/boards/${this.currentBoard.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(this.tagForm)
        });
        if ((await res.json()).success) {
          this.showTagModal = false;
          await this.loadBoardTags(this.currentBoard.id);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    toggleCardTag(tagId) {
      const hasTag = this.cardTags.some(t => t.id === tagId);
      
      if (hasTag) {
        this.cardTags = this.cardTags.filter(t => t.id !== tagId);
      } else {
        const tag = this.availableTags.find(t => t.id === tagId);
        if (tag) this.cardTags.push(tag);
      }
    },
    
    hasTag(tagId) {
      return this.cardTags.some(t => t.id === tagId);
    },
    
    // ==================== ASSIGNMENTS ====================
    
    async loadAllUsers() {
      try {
        const res = await fetch('/api/boards/users', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.allUsers = data.users;
        }
      } catch (e) {
        console.error('Fehler beim Laden der Benutzer:', e);
      }
    },
    
    toggleCardAssignment(userId) {
      const isAssigned = this.cardAssignedUsers.some(u => u.id === userId);
      
      if (isAssigned) {
        this.cardAssignedUsers = this.cardAssignedUsers.filter(u => u.id !== userId);
      } else {
        const user = this.allUsers.find(u => u.id === userId);
        if (user) this.cardAssignedUsers.push(user);
      }
    },
    
    isAssigned(userId) {
      return this.cardAssignedUsers.some(u => u.id === userId);
    },
    
    async saveCardChanges() {
      if (!this.selectedCard) return;
      
      try {
        // Nutze die beim Öffnen gespeicherten Original-Daten
        const originalTags = this.originalCardTags.map(t => t.id);
        const currentTags = this.cardTags.map(t => t.id);
        const originalUsers = this.originalCardUsers.map(u => u.id);
        const currentUsers = this.cardAssignedUsers.map(u => u.id);
        
        // Tags: Entfernen
        const tagsToRemove = originalTags.filter(id => !currentTags.includes(id));
        for (const tagId of tagsToRemove) {
          await fetch(`/api/boards/cards/${this.selectedCard.id}/tags/${tagId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
        }
        
        // Tags: Hinzufügen
        const tagsToAdd = currentTags.filter(id => !originalTags.includes(id));
        for (const tagId of tagsToAdd) {
          await fetch(`/api/boards/cards/${this.selectedCard.id}/tags/${tagId}`, {
            method: 'POST',
            credentials: 'include'
          });
        }
        
        // Users: Entfernen
        const usersToRemove = originalUsers.filter(id => !currentUsers.includes(id));
        for (const userId of usersToRemove) {
          await fetch(`/api/boards/cards/${this.selectedCard.id}/assign/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
          });
        }
        
        // Users: Hinzufügen
        const usersToAdd = currentUsers.filter(id => !originalUsers.includes(id));
        for (const userId of usersToAdd) {
          await fetch(`/api/boards/cards/${this.selectedCard.id}/assign/${userId}`, {
            method: 'POST',
            credentials: 'include'
          });
        }
        
        // Board neu laden
        await this.selectBoard(this.currentBoard.id);
        
        // Modal schließen
        this.showCardDetailModal = false;
        this.selectedCard = null;
      } catch (e) {
        alert('Fehler beim Speichern: ' + e.message);
      }
    },
    
    // ==================== SUBTASKS ====================
    
    async loadCardSubtasks(cardId) {
      try {
        const res = await fetch(`/api/boards/cards/${cardId}/subtasks`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.cardSubtasks = data.subtasks;
        }
      } catch (e) {
        console.error('Fehler beim Laden der Subtasks:', e);
      }
    },
    
    async addSubtask() {
      if (!this.newSubtaskTitle.trim()) return;
      
      try {
        const res = await fetch(`/api/boards/cards/${this.selectedCard.id}/subtasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: this.newSubtaskTitle })
        });
        if ((await res.json()).success) {
          this.newSubtaskTitle = '';
          await this.loadCardSubtasks(this.selectedCard.id);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async toggleSubtask(subtaskId, isCompleted) {
      try {
        await fetch(`/api/boards/subtasks/${subtaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ is_completed: !isCompleted })
        });
        await this.loadCardSubtasks(this.selectedCard.id);
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async deleteSubtask(subtaskId) {
      if (!confirm('Subtask löschen?')) return;
      
      try {
        await fetch(`/api/boards/subtasks/${subtaskId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        await this.loadCardSubtasks(this.selectedCard.id);
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== MEDIA ====================
    
    async loadCardMedia(cardId) {
      try {
        const res = await fetch(`/api/boards/cards/${cardId}/media`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          this.cardMedia = data.media;
        }
      } catch (e) {
        console.error('Fehler beim Laden der Medien:', e);
      }
    },
    
    async addMedia() {
      if (!this.newMediaUrl.trim()) return;
      
      try {
        const res = await fetch(`/api/boards/cards/${this.selectedCard.id}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: this.newMediaType,
            url: this.newMediaUrl,
            filename: this.newMediaUrl.split('/').pop()
          })
        });
        if ((await res.json()).success) {
          this.newMediaUrl = '';
          await this.loadCardMedia(this.selectedCard.id);
        }
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    async deleteMedia(mediaId) {
      if (!confirm('Medium löschen?')) return;
      
      try {
        await fetch(`/api/boards/media/${mediaId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        await this.loadCardMedia(this.selectedCard.id);
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== BOARD TRANSFER ====================
    
    async transferCard(cardId, targetBoardId) {
      if (!confirm(`Karte zu "${this.boards.find(b => b.id === targetBoardId)?.name}" verschieben?`)) return;
      
      try {
        await fetch(`/api/boards/cards/${cardId}/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ target_board_id: targetBoardId })
        });
        this.showCardDetailModal = false;
        this.selectedCard = null;
        await this.selectBoard(this.currentBoard.id);
        alert('Karte erfolgreich verschoben!');
      } catch (e) {
        alert('Fehler: ' + e.message);
      }
    },
    
    // ==================== DRAG & DROP ====================
    
    // Board Drag & Drop
    onBoardDragStart(board, index) {
      this.draggedBoard = board;
      this.dragOverBoardIndex = null;
    },
    
    onBoardDragOver(e, index) {
      e.preventDefault();
      e.stopPropagation();
      if (this.draggedBoard && this.boards[index].id !== this.draggedBoard.id) {
        this.dragOverBoardIndex = index;
      }
    },
    
    onBoardDragLeave() {
      this.dragOverBoardIndex = null;
    },
    
    async onBoardDrop(targetBoard, targetIndex) {
      if (!this.draggedBoard || this.draggedBoard.id === targetBoard.id) {
        this.draggedBoard = null;
        this.dragOverBoardIndex = null;
        return;
      }
      
      try {
        console.log(`🎯 Moving board ${this.draggedBoard.id} to index ${targetIndex}`);
        
        await fetch(`/api/boards/${this.draggedBoard.id}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ position: targetIndex })
        });
        
        await this.loadBoards();
      } catch (e) {
        alert('Fehler beim Verschieben des Boards: ' + e.message);
      } finally {
        this.draggedBoard = null;
        this.dragOverBoardIndex = null;
      }
    },
    
    // Card Drag & Drop
    onDragStart(card, categoryId) {
      this.draggedCard = card;
      this.draggedFromCategory = categoryId;
    },
    
    onDragOver(e) {
      e.preventDefault();
    },
    
    onDragOverCard(e, index) {
      e.preventDefault();
      e.stopPropagation();
      this.dragOverIndex = index;
    },
    
    onDragLeaveCard() {
      this.dragOverIndex = null;
    },
    
    async onDropOnCard(targetCard, targetCategoryId, targetIndex) {
      if (!this.draggedCard || this.draggedCard.id === targetCard.id) {
        this.draggedCard = null;
        this.draggedFromCategory = null;
        this.dragOverIndex = null;
        return;
      }
      
      try {
        // Verwende den targetIndex direkt, da das die Position im Array ist
        console.log(`🎯 Dropping card ${this.draggedCard.id} on card ${targetCard.id} at index ${targetIndex}`);
        
        await fetch(`/api/boards/cards/${this.draggedCard.id}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            categoryId: targetCategoryId,
            position: targetIndex  // Verwende den Array-Index als Position
          })
        });
        
        await this.selectBoard(this.currentBoard.id);
      } catch (e) {
        alert('Fehler: ' + e.message);
      } finally {
        this.draggedCard = null;
        this.draggedFromCategory = null;
        this.dragOverIndex = null;
      }
    },
    
    async onDrop(categoryId) {
      if (!this.draggedCard) {
        return;
      }
      
      // Wenn auf die gleiche Kategorie gedroppt wird, nichts tun
      // (wird durch onDropOnCard gehandhabt)
      if (categoryId === this.draggedFromCategory) {
        this.draggedCard = null;
        this.draggedFromCategory = null;
        this.dragOverIndex = null;
        return;
      }
      
      try {
        // Am Ende der Kategorie einfügen
        const category = this.currentBoard.categories.find(c => c.id === categoryId);
        const cards = category?.cards || [];
        const newPosition = cards.length > 0 ? Math.max(...cards.map(c => c.position || 0)) + 1 : 0;
        
        await fetch(`/api/boards/cards/${this.draggedCard.id}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            categoryId: categoryId,
            position: newPosition
          })
        });
        
        await this.selectBoard(this.currentBoard.id);
      } catch (e) {
        alert('Fehler: ' + e.message);
      } finally {
        this.draggedCard = null;
        this.draggedFromCategory = null;
        this.dragOverIndex = null;
      }
    },
    
    // ==================== HELPERS ====================
    
    getRolesForGroup(groupId) {
      return this.allRoles.filter(role => role.group_id === groupId);
    },
    
    getSubtaskProgress(card) {
      const total = (card.open_subtasks || 0) + (card.completed_subtasks || 0);
      if (total === 0) return null;
      return {
        completed: card.completed_subtasks || 0,
        total: total,
        percentage: Math.round(((card.completed_subtasks || 0) / total) * 100)
      };
    }
  },
  
  template: `
    <div class="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      <!-- Header -->
      <div class="bg-gray-800 border-b border-gray-700 px-6 py-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <h1 class="text-3xl font-bold flex items-center gap-3">
              <span>📋</span>
              <span>Task Planner</span>
            </h1>
            <div class="flex gap-3">
              <button @click="openTagModal" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2">
                <span>🏷️</span>
                <span>Tags verwalten</span>
              </button>
              <button @click="openBoardModal" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                <span>➕</span>
                <span>Neues Board</span>
              </button>
            </div>
          </div>
          <div v-if="currentBoard" class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">{{ currentBoard.icon || '📋' }}</span>
              <div>
                <h2 class="text-lg font-bold">{{ currentBoard.name }}</h2>
                <p v-if="currentBoard.description" class="text-xs text-gray-400">{{ currentBoard.description }}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="openCategoryModal" class="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm">
                ➕ Kategorie
              </button>
              <button @click="deleteBoard(currentBoard.id)" class="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Main Content -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Board Navigation Sidebar -->
        <div class="w-64 bg-gray-800 border-r border-gray-700 flex-shrink-0 p-4">
          <h2 class="text-sm font-semibold text-gray-400 uppercase mb-3">Boards</h2>
          
          <!-- Scrollable Board List -->
          <div class="overflow-y-auto" style="height: calc(100vh - 240px); max-height: 600px;">
            <div v-if="loading && boards.length === 0" class="text-center py-8 text-gray-500">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
            </div>
            <div v-else-if="boards.length === 0" class="text-center py-8 text-gray-500">
              <p class="text-sm">Keine Boards vorhanden</p>
            </div>
            <transition-group v-else name="board-list" tag="div" class="space-y-2">
              <div 
                v-for="(board, index) in boards" 
                :key="board.id"
                draggable="true"
                @dragstart="onBoardDragStart(board, index)"
                @dragover="onBoardDragOver($event, index)"
                @dragleave="onBoardDragLeave"
                @drop.stop="onBoardDrop(board, index)"
                :class="[
                  'p-3 rounded-lg transition-all relative',
                  currentBoard?.id === board.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600',
                  draggedBoard?.id === board.id ? 'opacity-50 cursor-grabbing' : 'cursor-grab',
                  dragOverBoardIndex === index && draggedBoard?.id !== board.id ? 'border-2 border-blue-400 shadow-lg shadow-blue-500/50' : ''
                ]"
              >
                <!-- Drop Indikator -->
                <div 
                  v-if="dragOverBoardIndex === index && draggedBoard?.id !== board.id" 
                  class="absolute -top-1 left-0 right-0 h-0.5 bg-blue-400 shadow-lg shadow-blue-500/50 z-10"
                ></div>
                
                <div class="flex items-center gap-2 cursor-pointer" @click="selectBoard(board.id)">
                  <span class="text-xl">{{ board.icon || '📋' }}</span>
                  <span class="font-medium text-sm flex-1 truncate">{{ board.name }}</span>
                </div>
                <div v-if="currentBoard?.id === board.id" class="mt-2 flex items-center justify-between">
                  <span class="text-xs text-blue-200">{{ board.card_count || 0 }} Karten</span>
                  <button 
                    @click.stop="openPermissionsModal(board)" 
                    class="text-xs px-2 py-1 bg-blue-700 hover:bg-blue-800 rounded"
                    title="Berechtigungen"
                  >
                    🔒
                  </button>
                </div>
              </div>
            </transition-group>
          </div>
        </div>
        
        <!-- Board Content -->
        <div class="flex-1 overflow-hidden flex flex-col">
          <div v-if="!currentBoard" class="flex items-center justify-center h-full">
            <div class="text-center text-gray-500">
              <p class="text-xl mb-2">Kein Board ausgewählt</p>
              <p class="text-sm">Wähle ein Board aus oder erstelle ein neues</p>
            </div>
          </div>
          
          <div v-else class="flex flex-col h-full">
            
            <!-- Categories & Cards -->
            <div class="flex-1 overflow-x-auto overflow-y-hidden p-6">
              <div class="flex gap-4 h-full">
                <div 
                  v-for="category in currentBoard.categories" 
                  :key="category.id"
                  class="bg-gray-800 rounded-lg p-2 flex-shrink-0 flex flex-col"
                  style="width: 320px; height: calc(100vh - 240px); max-height: 600px;"
                  @dragover="onDragOver"
                  @drop="onDrop(category.id)"
                >
                  <!-- Category Header -->
                  <div class="flex items-center justify-between mb-1.5 flex-shrink-0">
                    <h3 class="font-bold text-sm flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: category.color }"></span>
                      <span>{{ category.name }}</span>
                      <span class="text-xs text-gray-400">({{ category.cards?.length || 0 }})</span>
                    </h3>
                    <button @click="deleteCategory(category.id)" class="text-red-400 hover:text-red-300 text-xs">
                      🗑️
                    </button>
                  </div>
                  
                  <!-- Cards -->
                  <transition-group name="card-list" tag="div" class="flex-1 overflow-y-auto mb-1.5" style="display: flex; flex-direction: column; gap: 6px;">
                    <div
                      v-for="(card, index) in category.cards"
                      :key="card.id"
                      class="relative"
                    >
                      <!-- Drop Indikator (blaue Linie oben) -->
                      <div 
                        v-if="dragOverIndex === index && draggedCard?.id !== card.id" 
                        class="absolute -top-1 left-0 right-0 h-0.5 bg-blue-400 shadow-lg shadow-blue-500/50 z-10"
                      ></div>
                      
                      <div
                        @click="openCardDetail(card)"
                        draggable="true"
                        @dragstart="onDragStart(card, category.id)"
                        @dragover="onDragOverCard($event, index)"
                        @dragleave="onDragLeaveCard"
                        @drop.stop="onDropOnCard(card, category.id, index)"
                        :class="[
                          'bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-all border',
                          draggedCard?.id === card.id ? 'opacity-50 cursor-grabbing' : 'cursor-grab',
                          dragOverIndex === index && draggedCard?.id !== card.id ? 'border-blue-400 shadow-lg shadow-blue-500/30' : 'border-gray-600'
                        ]"
                      >
                      <!-- Card Title -->
                      <h4 class="font-medium mb-3 text-sm text-white">{{ card.title }}</h4>
                      
                      <!-- Tags -->
                      <div v-if="card.tags && card.tags.length" class="flex flex-wrap gap-1 mb-3">
                        <span 
                          v-for="tag in card.tags" 
                          :key="tag.id"
                          class="text-xs px-2 py-1 rounded-full"
                          :style="{ backgroundColor: tag.color, color: 'white' }"
                        >
                          {{ tag.name }}
                        </span>
                      </div>
                      
                      <!-- Bottom Row: Task Count & Assigned Users -->
                      <div class="flex items-center justify-between">
                        <!-- Task/Subtask Icon & Count -->
                        <div class="flex items-center gap-2">
                          <div v-if="card.description" class="text-gray-300" title="Beschreibung vorhanden">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path>
                            </svg>
                          </div>
                          <div v-if="getSubtaskProgress(card)" class="flex items-center gap-1 text-xs text-gray-300">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                            </svg>
                            <span class="font-medium">{{ getSubtaskProgress(card).completed }}/{{ getSubtaskProgress(card).total }}</span>
                          </div>
                        </div>
                        
                        <!-- Assigned Users with Avatars -->
                        <div v-if="card.assigned_users && card.assigned_users.length" class="flex -space-x-2">
                          <template v-for="user in card.assigned_users.slice(0, 3)" :key="user.id">
                            <img 
                              v-if="user.avatar_url"
                              :src="user.avatar_url"
                              :alt="user.display_name"
                              :title="user.display_name"
                              class="w-7 h-7 rounded-full border-2 border-gray-700 object-cover"
                            />
                            <div 
                              v-else
                              class="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs border-2 border-gray-700 font-semibold text-white"
                              :title="user.display_name"
                            >
                              {{ user.display_name.charAt(0).toUpperCase() }}
                            </div>
                          </template>
                          <div v-if="card.assigned_users.length > 3" class="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-xs border-2 border-gray-700 font-semibold text-gray-200">
                            +{{ card.assigned_users.length - 3 }}
                          </div>
                        </div>
                      </div>
                      </div>
                    </div>
                  </transition-group>
                  
                  <!-- Add Card Button -->
                  <button 
                    @click="openCardModal(category.id)"
                    class="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm flex-shrink-0"
                  >
                    ➕ Karte hinzufügen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Board Modal -->
      <div v-if="showBoardModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md">
          <h2 class="text-xl font-bold mb-4">Neues Board</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Name</label>
              <input v-model="boardForm.name" type="text" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Board-Name">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Beschreibung</label>
              <textarea v-model="boardForm.description" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" rows="3" placeholder="Beschreibung (optional)"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Icon</label>
                <input v-model="boardForm.icon" type="text" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" placeholder="📋">
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-1">Farbe</label>
                <input v-model="boardForm.color" type="color" class="w-full bg-gray-700 rounded-lg px-3 py-2">
              </div>
            </div>
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="boardForm.is_public" type="checkbox" class="w-4 h-4">
                <span class="text-sm text-gray-300">Öffentlich (für alle sichtbar)</span>
              </label>
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button @click="showBoardModal = false" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Abbrechen
            </button>
            <button @click="saveBoard" class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Erstellen
            </button>
          </div>
        </div>
      </div>
      
      <!-- Card Creation Modal -->
      <div v-if="showCardModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md">
          <h2 class="text-xl font-bold mb-4">Neue Karte</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Titel</label>
              <input v-model="cardForm.title" type="text" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Karten-Titel">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Beschreibung (optional)</label>
              <textarea v-model="cardForm.description" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" rows="3" placeholder="Beschreibung..."></textarea>
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button @click="showCardModal = false" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Abbrechen
            </button>
            <button @click="addCard" class="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
              Erstellen
            </button>
          </div>
        </div>
      </div>
      
      <!-- Permissions Modal (NEU: Granular mit Ausklappbaren Gruppen) -->
      <div v-if="showPermissionsModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 rounded-xl p-6 w-full max-w-6xl max-h-[90vh] flex flex-col relative">
          <button @click="showPermissionsModal = false" class="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none z-10">
            ✕
          </button>
          
          <div class="flex-shrink-0 mb-4">
            <h2 class="text-2xl font-bold mb-1">Board-Berechtigungen</h2>
            <p class="text-sm text-gray-400">Verwalte detaillierte Zugriffsrechte für "{{ editingBoard?.name }}"</p>
            <p class="text-xs text-green-400 mt-1">📍 Organisation: Team (automatisch)</p>
          </div>
          
          <div class="flex gap-4 flex-1 overflow-hidden">
            <!-- Linke Seite: Auswahl von Gruppen/Rollen/Users -->
            <div class="w-1/2 bg-gray-750 rounded-lg p-4 overflow-y-auto">
              <h3 class="font-semibold mb-3 text-lg">Ziele hinzufügen</h3>
              
              <!-- Gruppen (ausklappbar) -->
              <div class="space-y-2">
                <div v-for="group in allGroups" :key="'g-'+group.id" class="bg-gray-700 rounded-lg">
                  <div 
                    @click="toggleGroup(group.id)"
                    class="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div class="flex items-center gap-2">
                      <span>{{ expandedGroups[group.id] ? '▼' : '▶' }}</span>
                      <span class="font-medium">👥 {{ group.name }}</span>
                    </div>
                    <button 
                      @click.stop="addPermission('group', group.id, group.name)"
                      class="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    >
                      + Gruppe
                    </button>
                  </div>
                  
                  <!-- Rollen dieser Gruppe (wenn ausgeklappt) -->
                  <div v-if="expandedGroups[group.id]" class="ml-6 pb-2 pr-2 space-y-1">
                    <div 
                      v-for="role in getRolesForGroup(group.id)" 
                      :key="'r-'+role.id"
                      class="flex items-center justify-between bg-gray-600 rounded px-3 py-2 hover:bg-gray-550"
                    >
                      <span class="text-sm">🎭 {{ role.name }}</span>
                      <button 
                        @click="addPermission('role', role.id, role.name)"
                        class="px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs"
                      >
                        + Rolle
                      </button>
                    </div>
                    <p v-if="getRolesForGroup(group.id).length === 0" class="text-xs text-gray-500 italic px-3 py-1">
                      Keine Rollen
                    </p>
                  </div>
                </div>
              </div>
              
              <!-- Users -->
              <div class="mt-4">
                <h4 class="font-semibold mb-2 text-sm text-gray-400">Einzelne Benutzer</h4>
                <div class="space-y-1 max-h-40 overflow-y-auto">
                  <div 
                    v-for="user in allUsers" 
                    :key="'u-'+user.id"
                    class="flex items-center justify-between bg-gray-700 rounded px-3 py-2 hover:bg-gray-600"
                  >
                    <span class="text-sm">👤 {{ user.display_name }}</span>
                    <button 
                      @click="addPermission('user', user.id, user.display_name)"
                      class="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                    >
                      + User
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Rechte Seite: Berechtigungen konfigurieren -->
            <div class="w-1/2 bg-gray-750 rounded-lg p-4 overflow-y-auto">
              <h3 class="font-semibold mb-3 text-lg">Berechtigungen konfigurieren</h3>
              
              <div v-if="selectedPermissions.length === 0" class="text-center py-8 text-gray-500">
                <p class="text-sm">Keine Berechtigungen konfiguriert</p>
                <p class="text-xs mt-1">Füge Gruppen, Rollen oder Benutzer hinzu</p>
              </div>
              
              <div v-else class="space-y-3">
                <div 
                  v-for="(perm, index) in selectedPermissions" 
                  :key="index"
                  class="bg-gray-700 rounded-lg p-3"
                >
                  <!-- Header mit Name und Löschen -->
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <span v-if="perm.type === 'group'">👥</span>
                      <span v-else-if="perm.type === 'role'">🎭</span>
                      <span v-else>👤</span>
                      <span class="font-medium">{{ perm.targetName }}</span>
                      <span class="text-xs text-gray-400">({{ perm.type }})</span>
                    </div>
                    <button 
                      @click="removePermission(index)"
                      class="text-red-400 hover:text-red-300 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  <!-- Rechte-Checkboxen -->
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" v-model="perm.rights.can_view" class="w-4 h-4">
                      <span>👁️ Board sehen</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" v-model="perm.rights.can_create_card" class="w-4 h-4">
                      <span>➕ Karte erstellen</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" v-model="perm.rights.can_edit_card" class="w-4 h-4">
                      <span>✏️ Karte bearbeiten</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" v-model="perm.rights.can_delete_card" class="w-4 h-4">
                      <span>🗑️ Karte löschen</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" v-model="perm.rights.can_move_card" class="w-4 h-4">
                      <span>🔄 Karte verschieben</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" v-model="perm.rights.can_create_category" class="w-4 h-4">
                      <span>📁 Kategorie erstellen</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" v-model="perm.rights.can_edit_category" class="w-4 h-4">
                      <span>✏️ Kategorie bearbeiten</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" v-model="perm.rights.can_delete_category" class="w-4 h-4">
                      <span>🗑️ Kategorie löschen</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer col-span-2">
                      <input type="checkbox" v-model="perm.rights.can_manage_permissions" class="w-4 h-4">
                      <span>🔒 Berechtigungen verwalten</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer Buttons -->
          <div class="flex gap-3 mt-4 pt-4 border-t border-gray-700 flex-shrink-0">
            <button @click="showPermissionsModal = false" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Abbrechen
            </button>
            <button @click="savePermissions" class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold">
              💾 Speichern
            </button>
          </div>
        </div>
      </div>
      
      <!-- Category Modal -->
      <div v-if="showCategoryModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md">
          <h2 class="text-xl font-bold mb-4">Neue Kategorie</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Name</label>
              <input v-model="categoryForm.name" type="text" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Kategorie-Name">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Farbe</label>
              <input v-model="categoryForm.color" type="color" class="w-full bg-gray-700 rounded-lg px-3 py-2">
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button @click="showCategoryModal = false" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Abbrechen
            </button>
            <button @click="saveCategory" class="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
              Erstellen
            </button>
          </div>
        </div>
      </div>
      
      <!-- Tag Modal -->
      <div v-if="showTagModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md">
          <h2 class="text-xl font-bold mb-4">Neuer Tag</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-1">Name</label>
              <input v-model="tagForm.name" type="text" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" placeholder="Tag-Name">
            </div>
            <div>
              <label class="block text-sm text-gray-400 mb-1">Farbe</label>
              <input v-model="tagForm.color" type="color" class="w-full bg-gray-700 rounded-lg px-3 py-2">
            </div>
            <div v-if="availableTags.length" class="border-t border-gray-700 pt-4">
              <p class="text-sm text-gray-400 mb-2">Vorhandene Tags:</p>
              <div class="flex flex-wrap gap-2">
                <span 
                  v-for="tag in availableTags" 
                  :key="tag.id"
                  class="px-3 py-1 rounded-full text-sm"
                  :style="{ backgroundColor: tag.color, color: 'white' }"
                >
                  {{ tag.name }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button @click="showTagModal = false" class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
              Abbrechen
            </button>
            <button @click="saveTag" class="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
              Erstellen
            </button>
          </div>
        </div>
      </div>
      
      <!-- Card Detail Modal -->
      <div v-if="showCardDetailModal && selectedCard" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 class="text-2xl font-bold">{{ selectedCard.title }}</h2>
            <button @click="showCardDetailModal = false" class="text-gray-400 hover:text-white text-2xl">×</button>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Description -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-semibold">📝 Beschreibung</h3>
                <button @click="editingDescription = !editingDescription" class="text-sm text-blue-400 hover:text-blue-300">
                  {{ editingDescription ? 'Abbrechen' : 'Bearbeiten' }}
                </button>
              </div>
              <div v-if="editingDescription">
                <textarea v-model="selectedCard.description" class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" rows="4"></textarea>
                <button @click="updateCardDescription" class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                  Speichern
                </button>
              </div>
              <p v-else class="text-gray-300">{{ selectedCard.description || 'Keine Beschreibung' }}</p>
            </div>
            
            <!-- Tags -->
            <div>
              <h3 class="text-lg font-semibold mb-2">🏷️ Tags</h3>
              <div class="flex flex-wrap gap-2">
                <button 
                  v-for="tag in availableTags" 
                  :key="tag.id"
                  @click="toggleCardTag(tag.id)"
                  :class="[
                    'px-3 py-1 rounded-full text-sm transition-all',
                    hasTag(tag.id) ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100'
                  ]"
                  :style="{ backgroundColor: tag.color, color: 'white' }"
                >
                  {{ tag.name }}
                </button>
              </div>
            </div>
            
            <!-- Assigned Users -->
            <div>
              <h3 class="text-lg font-semibold mb-2">👤 Zugewiesene Benutzer</h3>
              
              <!-- Currently Assigned Users -->
              <div v-if="cardAssignedUsers.length" class="mb-3 flex flex-wrap gap-2">
                <div 
                  v-for="user in cardAssignedUsers" 
                  :key="user.id"
                  class="flex items-center gap-2 bg-blue-600 rounded-lg px-3 py-2"
                >
                  <img 
                    v-if="user.avatar_url"
                    :src="user.avatar_url"
                    :alt="user.display_name"
                    class="w-6 h-6 rounded-full object-cover"
                  />
                  <div 
                    v-else
                    class="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-semibold"
                  >
                    {{ user.display_name.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-sm">{{ user.display_name }}</span>
                  <button 
                    @click="toggleCardAssignment(user.id)"
                    class="ml-2 text-white hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <!-- Dropdown to Add Users -->
              <div>
                <label class="block text-sm text-gray-400 mb-2">Benutzer hinzufügen</label>
                <select 
                  @change="e => { if(e.target.value) { toggleCardAssignment(parseInt(e.target.value)); e.target.value = ''; } }"
                  class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="">Benutzer auswählen...</option>
                  <option 
                    v-for="user in allUsers.filter(u => !isAssigned(u.id))" 
                    :key="user.id"
                    :value="user.id"
                  >
                    {{ user.display_name }}
                  </option>
                </select>
              </div>
            </div>
            
            <!-- Subtasks -->
            <div>
              <h3 class="text-lg font-semibold mb-2">✓ Subtasks</h3>
              <div class="space-y-2 mb-3">
                <div 
                  v-for="subtask in cardSubtasks" 
                  :key="subtask.id"
                  class="flex items-center gap-3 bg-gray-700 rounded-lg px-3 py-2"
                >
                  <input 
                    type="checkbox" 
                    :checked="subtask.is_completed"
                    @change="toggleSubtask(subtask.id, subtask.is_completed)"
                    class="w-5 h-5"
                  >
                  <span :class="{ 'line-through text-gray-500': subtask.is_completed }" class="flex-1">
                    {{ subtask.title }}
                  </span>
                  <button @click="deleteSubtask(subtask.id)" class="text-red-400 hover:text-red-300">
                    🗑️
                  </button>
                </div>
              </div>
              <div class="flex gap-2">
                <input 
                  v-model="newSubtaskTitle" 
                  @keypress.enter="addSubtask"
                  type="text" 
                  placeholder="Neuer Subtask..." 
                  class="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-white"
                >
                <button @click="addSubtask" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">
                  ➕
                </button>
              </div>
            </div>
            
            <!-- Media -->
            <div>
              <h3 class="text-lg font-semibold mb-2">🖼️ Medien</h3>
              <div v-if="cardMedia.length" class="grid grid-cols-3 gap-3 mb-3">
                <div v-for="media in cardMedia" :key="media.id" class="relative group">
                  <img v-if="media.type === 'image'" :src="media.url" class="w-full h-32 object-cover rounded-lg">
                  <video v-else :src="media.url" class="w-full h-32 object-cover rounded-lg"></video>
                  <button 
                    @click="deleteMedia(media.id)" 
                    class="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div class="flex gap-2">
                <select v-model="newMediaType" class="bg-gray-700 rounded-lg px-3 py-2 text-white">
                  <option value="image">Bild</option>
                  <option value="video">Video</option>
                </select>
                <input 
                  v-model="newMediaUrl" 
                  @keypress.enter="addMedia"
                  type="text" 
                  placeholder="URL eingeben..." 
                  class="flex-1 bg-gray-700 rounded-lg px-3 py-2 text-white"
                >
                <button @click="addMedia" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                  ➕
                </button>
              </div>
            </div>
            
            <!-- Board Transfer -->
            <div v-if="otherBoards.length">
              <h3 class="text-lg font-semibold mb-2">🔀 Board Transfer</h3>
              <p class="text-sm text-gray-400 mb-3">Karte zu einem anderen Board verschieben:</p>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  v-for="board in otherBoards" 
                  :key="board.id"
                  @click="transferCard(selectedCard.id, board.id)"
                  class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-left flex items-center gap-2"
                >
                  <span class="text-xl">{{ board.icon || '📋' }}</span>
                  <span class="text-sm">{{ board.name }}</span>
                </button>
              </div>
            </div>
            
            <!-- Save & Delete Buttons -->
            <div class="border-t border-gray-700 pt-4 flex gap-3">
              <button @click="saveCardChanges" class="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-semibold">
                💾 Änderungen speichern
              </button>
              <button @click="deleteCard(selectedCard.id)" class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};

// CSS für Animationen
if (typeof document !== 'undefined' && !document.getElementById('taskplanner-animations')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'taskplanner-animations';
  styleTag.textContent = `
    /* Board List Animationen */
    .board-list-move {
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .board-list-enter-active,
    .board-list-leave-active {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .board-list-enter-from {
      opacity: 0;
      transform: translateX(-30px);
    }
    
    .board-list-leave-to {
      opacity: 0;
      transform: translateX(30px);
    }
    
    /* Card List Animationen */
    .card-list-move {
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .card-list-enter-active,
    .card-list-leave-active {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .card-list-enter-from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    
    .card-list-leave-to {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
  `;
  document.head.appendChild(styleTag);
}

// CSS für Animationen
if (typeof document !== 'undefined' && !document.getElementById('taskplanner-animations')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'taskplanner-animations';
  styleTag.textContent = `
    /* Board List Animationen */
    .board-list-move {
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .board-list-enter-active,
    .board-list-leave-active {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .board-list-enter-from {
      opacity: 0;
      transform: translateX(-30px);
    }
    
    .board-list-leave-to {
      opacity: 0;
      transform: translateX(30px);
    }
    
    /* Card List Animationen */
    .card-list-move {
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .card-list-enter-active,
    .card-list-leave-active {
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .card-list-enter-from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    
    .card-list-leave-to {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
  `;
  document.head.appendChild(styleTag);
}
