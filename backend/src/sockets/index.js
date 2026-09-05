let ioInstance = null;

const setupSockets = (io) => {
  ioInstance = io;

  io.use((socket, next) => {
    if (socket.handshake.auth && socket.handshake.auth.token) {
      socket.user = { id: socket.handshake.auth.userId, role: socket.handshake.auth.role };
      return next();
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      socket.join(`role:${socket.user.role}`);
      if (socket.user.hospital) socket.join(`hospital:${socket.user.hospital}`);
    }

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

export const emitAlert = (targetUserId, targetRole, alertData) => {
  if (!ioInstance) return;
  if (targetUserId) {
    ioInstance.to(`user:${targetUserId}`).emit('new_alert', alertData);
  } else if (targetRole) {
    ioInstance.to(`role:${targetRole}`).emit('new_alert', alertData);
  }
};

export const emitRiskUpdate = (patientId, riskData) => {
  if (!ioInstance) return;
  ioInstance.emit('risk_update', { patientId, riskData });
};

export default setupSockets;
