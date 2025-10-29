// services/websocket.js
// שירות WebSocket לעדכונים בזמן אמת

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  // התחברות לשרת WebSocket
  connect(serverUrl = 'http://10.0.0.23:4000') {
    if (this.socket && this.isConnected) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    console.log('🔌 Connecting to WebSocket server:', serverUrl);
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error);
      this.isConnected = false;
    });

    // מאזין לעדכוני זמינות
    this.socket.on('availability-update', (data) => {
      console.log('📡 Received availability update:', data);
      this.notifyListeners('availability-update', data);
    });

    // מאזין לעדכוני חניות כלליים
    this.socket.on('parking-availability-changed', (data) => {
      console.log('📡 Received parking update:', data);
      this.notifyListeners('parking-update', data);
    });
  }

  // ניתוק מהשרת
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // הצטרפות לחדר חניה ספציפית
  joinParkingRoom(parkingId) {
    if (this.socket && this.isConnected) {
      console.log(`📍 Joining parking room: ${parkingId}`);
      this.socket.emit('join-parking', parkingId.toString());
    }
  }

  // הצטרפות לחדר חיפוש
  joinSearchRoom(searchArea) {
    if (this.socket && this.isConnected) {
      console.log('🔍 Joining search room:', searchArea);
      this.socket.emit('join-search', searchArea);
    }
  }

  // הוספת מאזין לאירועים
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    
    console.log(`👂 Added listener for ${eventType}, total: ${this.listeners.get(eventType).size}`);
  }

  // הסרת מאזין
  removeListener(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
      console.log(`👂 Removed listener for ${eventType}`);
    }
  }

  // הודעה לכל המאזינים
  notifyListeners(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  // בדיקת סטטוס חיבור
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// יצירת instance יחיד (Singleton)
const webSocketService = new WebSocketService();

export default webSocketService;
