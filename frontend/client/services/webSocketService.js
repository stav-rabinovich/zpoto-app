// services/webSocketService.js
// שירות WebSocket לעדכונים בזמן אמת

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  // התחברות לשרת WebSocket
  connect() {
    if (this.socket && this.connected) {
      return this.socket;
    }

    try {
      this.socket = io('http://localhost:4000', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('🔌 WebSocket connected:', this.socket.id);
        this.connected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 WebSocket disconnected');
        this.connected = false;
      });

      this.socket.on('error', (error) => {
        console.error('🔌 WebSocket error:', error);
      });

      return this.socket;
    } catch (error) {
      console.error('🔌 Failed to connect WebSocket:', error);
      return null;
    }
  }

  // הצטרפות לחדר parking (לקבלת עדכוני זמינות)
  joinParkingRoom(parkingId) {
    if (this.socket && this.connected) {
      this.socket.emit('join-parking', parkingId);
      console.log(`🔌 Joined parking room: ${parkingId}`);
    }
  }

  // יציאה מחדר parking
  leaveParkingRoom(parkingId) {
    if (this.socket && this.connected) {
      this.socket.emit('leave-parking', parkingId);
      console.log(`🔌 Left parking room: ${parkingId}`);
    }
  }

  // הצטרפות לחדר חיפוש (לקבלת עדכונים באזור מסוים)
  joinSearchRoom(searchParams) {
    if (this.socket && this.connected) {
      this.socket.emit('join-search', searchParams);
      console.log(`🔌 Joined search room:`, searchParams);
    }
  }

  // יציאה מחדר חיפוש
  leaveSearchRoom(searchParams) {
    if (this.socket && this.connected) {
      this.socket.emit('leave-search', searchParams);
      console.log(`🔌 Left search room:`, searchParams);
    }
  }

  // האזנה לעדכוני זמינות
  onAvailabilityUpdate(callback) {
    if (this.socket) {
      this.socket.on('availability-updated', callback);
    }
  }

  // הסרת מאזין
  offAvailabilityUpdate(callback) {
    if (this.socket) {
      this.socket.off('availability-updated', callback);
    }
  }

  // הוספת מאזין כללי (לתמיכה ברירת מחדל)
  addListener(eventName, callback) {
    if (this.socket) {
      this.socket.on(eventName, callback);
      console.log(`🔌 Added listener for: ${eventName}`);
    }
  }

  // הסרת מאזין כללי
  removeListener(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
      console.log(`🔌 Removed listener for: ${eventName}`);
    }
  }

  // ניתוק
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('🔌 WebSocket service disconnected');
    }
  }

  // בדיקת מצב חיבור
  isConnected() {
    return this.connected && this.socket?.connected;
  }
}

// יצירת instance יחיד
const webSocketService = new WebSocketService();

export default webSocketService;
