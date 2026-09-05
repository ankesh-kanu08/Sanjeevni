import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let ioInstance = null;

const setupSockets = (io) => {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth || {};
      const token = auth.token;

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-password');
          if (user) {
            socket.user = {
              id: String(user._id),
              role: user.role,
              hospital: user.hospital ? String(user.hospital) : null,
              name: user.name
            };
            return next();
          }
        } catch (jwtErr) {
          console.warn('Socket JWT verification failed, falling back to auth parameters:', jwtErr.message);
        }
      }

      if (auth.userId || auth.role) {
        socket.user = {
          id: auth.userId ? String(auth.userId) : null,
          role: auth.role || null,
          hospital: auth.hospitalId ? String(auth.hospitalId) : null
        };
      }

      next();
    } catch (err) {
      console.error('Socket middleware error:', err);
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    if (socket.user) {
      if (socket.user.id) {
        socket.join(`user:${socket.user.id}`);
        console.log(`Socket ${socket.id} joined room user:${socket.user.id}`);
      }
      if (socket.user.role) {
        socket.join(`role:${socket.user.role}`);
        console.log(`Socket ${socket.id} joined room role:${socket.user.role}`);
      }
      if (socket.user.hospital) {
        socket.join(`hospital:${socket.user.hospital}`);
        console.log(`Socket ${socket.id} joined room hospital:${socket.user.hospital}`);
      }
    }
    socket.join('broadcast_alerts');

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emit real-time alert to specific user, role, and general channels
 */
export const emitAlert = (targetUserId, targetRole, alertData) => {
  if (!ioInstance) {
    console.warn('Socket.IO instance not initialized; alert not emitted in real-time');
    return;
  }

  const payload = {
    ...alertData.toObject?.() || alertData,
    timestamp: new Date().toISOString()
  };

  // Emit to specific user if assigned
  if (targetUserId) {
    const userRoom = `user:${String(targetUserId)}`;
    ioInstance.to(userRoom).emit('new_alert', payload);
    console.log(`Emitted alert to ${userRoom}: ${payload.title}`);
  }

  // Emit to target role (e.g. all doctors or workers)
  if (targetRole) {
    const roleRoom = `role:${targetRole}`;
    ioInstance.to(roleRoom).emit('new_alert', payload);
    console.log(`Emitted alert to ${roleRoom}: ${payload.title}`);
  }

  // Also notify admins
  ioInstance.to('role:system_admin').emit('new_alert', payload);
};

/**
 * Emit risk update event to dashboard subscribers
 */
export const emitRiskUpdate = (patientId, riskData) => {
  if (!ioInstance) return;
  const payload = {
    patientId: String(patientId),
    riskData,
    timestamp: new Date().toISOString()
  };
  ioInstance.emit('risk_update', payload);
  console.log(`Emitted risk_update for patient ${patientId}`);
};

export default setupSockets;
