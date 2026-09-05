import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';

export const SocketContext = createContext();

const NOTIFICATIONS_STORAGE_KEY = 'Sanjeevni_notifications';

// Web Audio synthesizer chime for alerts
const playAlertChime = (isUrgent = false) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = isUrgent ? 'sawtooth' : 'sine';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(isUrgent ? 880 : 587.33, now); // A5 or D5
    osc1.frequency.exponentialRampToValueAtTime(isUrgent ? 1174.66 : 880, now + 0.15); // D6 or A5

    osc2.frequency.setValueAtTime(isUrgent ? 440 : 440, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isUrgent ? 0.6 : 0.4));

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
  } catch (err) {
    // Audio context may be restricted before user gesture
  }
};

export const SocketProvider = ({ children }) => {
  const { token, user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Save notifications to storage
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch (e) {
      // ignore
    }
  }, [notifications]);

  const recentAlertsRef = useRef(new Set());

  const addNotification = useCallback((data) => {
    const alertId = String(data._id || data.id || `${data.patientId}_${data.title}_${data.timestamp}`);
    if (alertId && recentAlertsRef.current.has(alertId)) {
      return; // Ignore duplicate
    }
    recentAlertsRef.current.add(alertId);
    setTimeout(() => {
      recentAlertsRef.current.delete(alertId);
    }, 12000);

    const notificationItem = {
      id: alertId,
      title: data.title || (data.riskLevel ? `${data.riskLevel} Risk Alert` : 'System Notification'),
      message: data.message || 'Attention required for patient.',
      riskLevel: data.riskLevel || 'MEDIUM',
      patientName: data.patient?.user?.name || data.patientName || 'Patient',
      patientId: data.patient?._id || data.patientId,
      timestamp: data.timestamp || new Date().toISOString(),
      read: false
    };

    setNotifications(prev => [notificationItem, ...prev]);

    const isHigh = data.riskLevel === 'HIGH';
    playAlertChime(isHigh);

    if (isHigh) {
      toast.error(`URGENT ALERT: ${notificationItem.patientName} — ${notificationItem.title}`, {
        duration: 8000,
        icon: '🚨'
      });
    } else {
      toast(`${notificationItem.title}: ${notificationItem.message}`, {
        icon: '🔔',
        duration: 5000
      });
    }
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(item => item.id === id ? { ...item, read: true } : item)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  }, []);

  useEffect(() => {
    let newSocket = null;
    if (isAuthenticated && token) {
      const userId = user?._id || user?.id;
      const role = user?.role;
      const hospitalId = user?.hospital?._id || user?.hospital;

      newSocket = io(window.location.origin, {
        auth: { token, userId, role, hospitalId },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Socket.IO real-time connection established');
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      // Listen only to new_alert with deduplication
      newSocket.on('new_alert', (data) => {
        addNotification(data);
      });

      newSocket.on('risk_update', (data) => {
        toast(`Risk Trajectory Updated: ${data.patientName || 'Patient'}`, {
          icon: '📈',
          duration: 4000
        });
      });

      setSocket(newSocket);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, token, user, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
