"use strict";
// services/websocket.service.ts
// שירות WebSocket לעדכונים בזמן אמת של זמינות חניות
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocket = initializeWebSocket;
exports.broadcastAvailabilityUpdate = broadcastAvailabilityUpdate;
exports.broadcastParkingUpdate = broadcastParkingUpdate;
exports.getWebSocketInstance = getWebSocketInstance;
const socket_io_1 = require("socket.io");
let io = null;
/**
 * אתחול WebSocket server
 */
function initializeWebSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*", // בפרודקשן צריך להגביל
            methods: ["GET", "POST"]
        }
    });
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);
        // הצטרפות לחדר של חניה ספציפית (לעדכוני זמינות)
        socket.on('join-parking', (parkingId) => {
            socket.join(`parking-${parkingId}`);
            console.log(`📍 Client ${socket.id} joined parking room: ${parkingId}`);
        });
        // הצטרפות לחדר חיפוש כללי (לעדכוני תוצאות חיפוש)
        socket.on('join-search', (searchArea) => {
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
function broadcastAvailabilityUpdate(parkingId, availability) {
    if (!io) {
        console.warn('⚠️ WebSocket not initialized');
        return;
    }
    const updateData = {
        type: 'availability-updated',
        parkingId,
        availability,
        timestamp: new Date().toISOString()
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
function broadcastParkingUpdate(parkingId, updateType) {
    if (!io) {
        console.warn('⚠️ WebSocket not initialized');
        return;
    }
    const updateData = {
        type: 'parking-updated',
        parkingId,
        updateType,
        timestamp: new Date().toISOString()
    };
    io.emit('parking-update', updateData);
    console.log(`📡 Broadcasted parking update: ${updateType} for parking ${parkingId}`);
}
/**
 * קבלת instance של WebSocket (לשימוש בשירותים אחרים)
 */
function getWebSocketInstance() {
    return io;
}
