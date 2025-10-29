// services/websocket.service.ts
// שירות WebSocket לעדכונים בזמן אמת של זמינות חניות

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

/**
 * אתחול WebSocket server
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // בפרודקשן צריך להגביל
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // הצטרפות לחדר של חניה ספציפית (לעדכוני זמינות)
    socket.on('join-parking', (parkingId: string) => {
      socket.join(`parking-${parkingId}`);
      console.log(`📍 Client ${socket.id} joined parking room: ${parkingId}`);
    });

    // הצטרפות לחדר חיפוש כללי (לעדכוני תוצאות חיפוש)
    socket.on('join-search', (searchArea: { lat: number; lng: number; radius: number }) => {
      const roomName = `search-${Math.round(searchArea.lat * 1000)}-${Math.round(searchArea.lng * 1000)}`;
      socket.join(roomName);
      console.log(`🔍 Client ${socket.id} joined search room: ${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  console.log('🌐 WebSocket server initialized');
  return io;
}

/**
 * שליחת עדכון זמינות לכל הלקוחות המעוניינים בחניה ספציפית
 */
export function broadcastAvailabilityUpdate(parkingId: number, availability: any) {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  const updateData = {
    type: 'availability-updated',
    parkingId,
    availability,
    timestamp: new Date().toISOString(),
  };

  // שליחה לחדר החניה הספציפית
  io.to(`parking-${parkingId}`).emit('availability-update', updateData);

  // שליחה לכל חדרי החיפוש (יסננו בצד הלקוח)
  io.emit('parking-availability-changed', updateData);

  console.log(`📡 Broadcasted availability update for parking ${parkingId}`);
}

/**
 * שליחת עדכון כללי על שינוי בחניות (לרענון תוצאות חיפוש)
 */
export function broadcastParkingUpdate(
  parkingId: number,
  updateType: 'availability' | 'status' | 'deleted'
) {
  if (!io) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  const updateData = {
    type: 'parking-updated',
    parkingId,
    updateType,
    timestamp: new Date().toISOString(),
  };

  io.emit('parking-update', updateData);
  console.log(`📡 Broadcasted parking update: ${updateType} for parking ${parkingId}`);
}

/**
 * קבלת instance של WebSocket (לשימוש בשירותים אחרים)
 */
export function getWebSocketInstance(): SocketIOServer | null {
  return io;
}
