
import { User, Message, ChatRoom, VaultItem } from '../types';

class MockFirebaseService {
  private users: User[] = JSON.parse(localStorage.getItem('chat_users') || '[]');
  private messages: Record<string, Message[]> = JSON.parse(localStorage.getItem('chat_messages') || '{}');
  private vaultItems: VaultItem[] = JSON.parse(localStorage.getItem('chat_vault') || '[]');
  private currentUser: User | null = JSON.parse(localStorage.getItem('chat_current_user') || 'null');
  private hiddenRooms: string[] = JSON.parse(localStorage.getItem('chat_hidden_rooms') || '[]');
  private typingUsers: Record<string, Record<string, boolean>> = {};
  private lastSeenTimestamps: Record<string, number> = JSON.parse(localStorage.getItem('chat_last_seen') || '{}');
  private listeners: Set<(data: any) => void> = new Set();

  constructor() {
    if (this.users.length === 0) {
      this.users = [
        { 
          id: 'ai-system', 
          name: 'Gemini Assistant', 
          email: 'ai@gemini.com', 
          avatar: 'https://picsum.photos/seed/ai/200/200', 
          status: 'online',
          bio: 'Inteligencia Artificial lista para ayudarte.',
          lastSeen: Date.now() 
        },
        { 
          id: 'user-1', 
          name: 'Jane Doe', 
          email: 'jane@example.com', 
          avatar: 'https://picsum.photos/seed/jane/200/200', 
          status: 'online',
          bio: 'Amante de la tecnología y el café.',
          lastSeen: Date.now() - 1000 * 60 * 5 
        },
        { 
          id: 'user-2', 
          name: 'John Smith', 
          email: 'john@example.com', 
          avatar: 'https://picsum.photos/seed/john/200/200', 
          status: 'away',
          bio: 'Programando el futuro.',
          lastSeen: Date.now() - 1000 * 60 * 60 * 2 
        }
      ];
      this.saveUsers();
    }
  }

  // Método centralizado para guardar en localStorage con manejo de errores
  private safeSave(key: string, data: any): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn(`Storage quota exceeded for key: ${key}. Attempting to prune data...`);
        this.pruneData();
        // Reintentar una vez más tras el podado
        try {
          localStorage.setItem(key, JSON.stringify(data));
          return true;
        } catch (retryError) {
          console.error("Critical: Storage failed even after pruning.");
          return false;
        }
      }
      return false;
    }
  }

  // Elimina los mensajes multimedia más antiguos para liberar espacio significativamente
  private pruneData() {
    console.log("Pruning strategy: Removing oldest media messages...");
    
    // Obtener todos los mensajes en una lista plana para ordenar por tiempo
    let allMediaMessages: { roomId: string, msgIndex: number, timestamp: number, type: string }[] = [];
    
    Object.keys(this.messages).forEach(roomId => {
      this.messages[roomId].forEach((msg, index) => {
        if (msg.type === 'image' || msg.type === 'video' || msg.type === 'audio') {
          allMediaMessages.push({ roomId, msgIndex: index, timestamp: msg.timestamp, type: msg.type });
        }
      });
    });

    // Ordenar por antigüedad (más antiguos primero)
    allMediaMessages.sort((a, b) => a.timestamp - b.timestamp);

    // Eliminar el 30% de los mensajes multimedia más antiguos
    const toDelete = allMediaMessages.slice(0, Math.max(5, Math.floor(allMediaMessages.length * 0.3)));
    
    // Agrupar por roomId para borrar de forma eficiente
    const groupedDeletions: Record<string, number[]> = {};
    toDelete.forEach(item => {
      if (!groupedDeletions[item.roomId]) groupedDeletions[item.roomId] = [];
      groupedDeletions[item.roomId].push(item.msgIndex);
    });

    Object.keys(groupedDeletions).forEach(roomId => {
      // Borrar de atrás hacia adelante para no romper los índices
      const indices = groupedDeletions[roomId].sort((a, b) => b - a);
      indices.forEach(idx => {
        this.messages[roomId].splice(idx, 1);
      });
    });

    // Guardar los cambios tras el podado
    localStorage.setItem('chat_messages', JSON.stringify(this.messages));
    this.notify();
  }

  private saveUsers() {
    this.safeSave('chat_users', this.users);
  }

  private saveMessages() {
    this.safeSave('chat_messages', this.messages);
  }

  private saveVault() {
    this.safeSave('chat_vault', this.vaultItems);
  }

  private saveLastSeen() {
    this.safeSave('chat_last_seen', this.lastSeenTimestamps);
  }

  private saveHiddenRooms() {
    this.safeSave('chat_hidden_rooms', this.hiddenRooms);
  }

  // Métodos de limpieza manual para el usuario
  public clearAllMessages() {
    this.messages = {};
    this.saveMessages();
    this.notify();
  }

  public clearVault() {
    this.vaultItems = [];
    this.saveVault();
    this.notify();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getUsers(): User[] {
    return this.users;
  }

  async login(email: string): Promise<User> {
    const user = this.users.find(u => u.email === email);
    if (user) {
      user.status = 'online';
      user.lastSeen = Date.now();
      this.currentUser = user;
      localStorage.setItem('chat_current_user', JSON.stringify(user));
      this.saveUsers();
      this.notify();
      return user;
    }
    throw new Error("User not found");
  }

  async signup(name: string, email: string): Promise<User> {
    const newUser: User = {
      id: Math.random().toString(36).substring(7),
      name,
      email,
      avatar: `https://picsum.photos/seed/${name}/200/200`,
      status: 'online',
      bio: '¡Hola! Estoy usando Nequi.',
      lastSeen: Date.now()
    };
    this.users.push(newUser);
    this.saveUsers();
    this.currentUser = newUser;
    localStorage.setItem('chat_current_user', JSON.stringify(newUser));
    this.notify();
    return newUser;
  }

  async logout() {
    if (this.currentUser) {
      this.updateUserStatus(this.currentUser.id, 'offline');
    }
    this.currentUser = null;
    localStorage.removeItem('chat_current_user');
    this.notify();
  }

  async updateUserStatus(userId: string, status: 'online' | 'offline' | 'away') {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].status = status;
      this.users[userIndex].lastSeen = Date.now();
      this.saveUsers();
      this.notify();
    }
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");
    
    this.users[userIndex] = { ...this.users[userIndex], ...data };
    
    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser = { ...this.currentUser, ...data };
      localStorage.setItem('chat_current_user', JSON.stringify(this.currentUser));
    }
    
    this.saveUsers();
    this.notify();
    return this.users[userIndex];
  }

  getMessages(roomId: string): Message[] {
    return this.messages[roomId] || [];
  }

  getRoomMetadata(roomId: string) {
    if (roomId === 'global') return { name: 'Chat Global', icon: 'fa-globe', desc: 'Con todos' };
    if (roomId === 'ai-lab') return { name: 'Laboratorio AI', icon: 'fa-robot', desc: 'Gemini Playground' };
    if (roomId === 'test-channel') return { name: 'Pruebas', icon: 'fa-flask', desc: 'Canal interno' };
    
    if (roomId.startsWith('private_')) {
      const parts = roomId.split('_');
      const otherUserId = parts.find(id => id !== this.currentUser?.id && id !== 'private');
      const otherUser = this.users.find(u => u.id === otherUserId);
      return { 
        name: otherUser?.name || 'Chat Privado', 
        icon: 'fa-user', 
        desc: otherUser?.status === 'online' ? 'En línea' : 'Chat privado',
        isPrivate: true,
        avatar: otherUser?.avatar
      };
    }
    
    return { name: 'Chat', icon: 'fa-comment', desc: '' };
  }

  markAsRead(roomId: string) {
    this.lastSeenTimestamps[roomId] = Date.now();
    this.saveLastSeen();
    this.unhideRoom(roomId);
    this.notify();
  }

  getUnreadCount(roomId: string): number {
    const roomMessages = this.messages[roomId] || [];
    const lastSeen = this.lastSeenTimestamps[roomId] || 0;
    return roomMessages.filter(m => m.timestamp > lastSeen && m.senderId !== this.currentUser?.id).length;
  }

  getChatList() {
    const baseRooms = ['global', 'ai-lab', 'test-channel'];
    
    const activeRooms = Object.keys(this.messages).filter(roomId => {
      if (this.hiddenRooms.includes(roomId)) return false;
      if (baseRooms.includes(roomId)) return true;
      if (roomId.startsWith('private_')) {
        return roomId.includes(this.currentUser?.id || '');
      }
      return false;
    });

    baseRooms.forEach(room => {
      if (!activeRooms.includes(room) && !this.hiddenRooms.includes(room)) {
        activeRooms.push(room);
      }
    });

    return activeRooms.map(roomId => {
      const meta = this.getRoomMetadata(roomId);
      const roomMessages = this.messages[roomId] || [];
      const lastMsg = roomMessages[roomMessages.length - 1];
      const unreadCount = this.getUnreadCount(roomId);

      return {
        id: roomId,
        ...meta,
        lastMessage: lastMsg ? (lastMsg.type === 'text' || lastMsg.type === 'ai' ? lastMsg.text : `[${lastMsg.type.toUpperCase()}]`) : meta.desc,
        timestamp: lastMsg ? lastMsg.timestamp : 0,
        unreadCount
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  }

  sendMessage(roomId: string, message: Partial<Message>) {
    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      text: message.text || '',
      senderId: message.senderId || '',
      senderName: message.senderName || '',
      timestamp: Date.now(),
      type: message.type || 'text',
      fileName: message.fileName,
      fileSize: message.fileSize,
      status: 'enviado',
      isAiResponse: message.isAiResponse || false,
      replyTo: message.replyTo
    };
    if (!this.messages[roomId]) this.messages[roomId] = [];
    this.messages[roomId].push(newMessage);
    this.unhideRoom(roomId);
    this.saveMessages();
    this.notify();
    return newMessage;
  }

  private unhideRoom(roomId: string) {
    if (this.hiddenRooms.includes(roomId)) {
      this.hiddenRooms = this.hiddenRooms.filter(id => id !== roomId);
      this.saveHiddenRooms();
    }
  }

  updateMessage(roomId: string, messageId: string, newText: string) {
    if (!this.messages[roomId]) return;
    const msg = this.messages[roomId].find(m => m.id === messageId);
    if (msg) { msg.text = newText; this.saveMessages(); this.notify(); }
  }

  deleteMessage(roomId: string, messageId: string) {
    if (!this.messages[roomId]) return;
    this.messages[roomId] = this.messages[roomId].filter(m => m.id !== messageId);
    this.saveMessages();
    this.notify();
  }

  deleteConversation(roomId: string) {
    if (this.messages[roomId]) {
      delete this.messages[roomId];
      this.saveMessages();
    }
    if (!this.hiddenRooms.includes(roomId)) {
      this.hiddenRooms.push(roomId);
      this.saveHiddenRooms();
    }
    this.notify();
  }

  setTypingStatus(roomId: string, userId: string, isTyping: boolean) {
    if (!this.typingUsers[roomId]) this.typingUsers[roomId] = {};
    this.typingUsers[roomId][userId] = isTyping;
    this.notify();
  }

  getTypingUsers(roomId: string): string[] {
    const roomTyping = this.typingUsers[roomId] || {};
    return Object.entries(roomTyping)
      .filter(([_, typing]) => typing)
      .map(([userId]) => this.users.find(u => u.id === userId)?.name || 'Alguien');
  }

  getVaultItems(): VaultItem[] {
    return this.vaultItems;
  }

  isInVault(messageId: string): boolean {
    return this.vaultItems.some(item => item.id === messageId);
  }

  saveToVault(message: Message) {
    const exists = this.vaultItems.some(item => item.id === message.id);
    if (exists) return;

    const newItem: VaultItem = {
      id: message.id,
      name: message.type === 'image' ? 'Foto de Chat' : message.type === 'audio' ? 'Audio de Chat' : message.type === 'video' ? 'Video de Chat' : message.type === 'document' ? (message.fileName || 'Archivo') : 'Nota de Chat',
      timestamp: Date.now(),
      type: (message.type === 'ai' || message.type === 'text') ? 'text' : message.type,
      content: message.text,
      senderName: message.senderName,
      fileName: message.fileName
    };

    this.vaultItems.unshift(newItem);
    this.saveVault();
    this.notify();
  }

  deleteFromVault(itemId: string) {
    this.vaultItems = this.vaultItems.filter(item => item.id !== itemId);
    this.saveVault();
    this.notify();
  }

  subscribe(callback: (data: any) => void) {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  private notify() {
    this.listeners.forEach(cb => cb({
      messages: this.messages,
      typing: this.typingUsers,
      users: this.users,
      vault: this.vaultItems,
      currentUser: this.currentUser,
      lastSeen: this.lastSeenTimestamps,
      hiddenRooms: this.hiddenRooms
    }));
  }
}

export const firebaseService = new MockFirebaseService();
