import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import useAuth from '../hooks/useAuth';
import toast from 'react-hot-toast';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let newSocket;
    if (isAuthenticated && token) {
      newSocket = io('', {
        auth: { token }
      });

      newSocket.on('connect', () => {
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
      });

      newSocket.on('alert', (data) => {
        toast.error(`Alert: ${data.message || 'Deterioration detected!'}`);
        setNotifications((prev) => [data, ...prev]);
      });

      newSocket.on('risk_update', (data) => {
        toast.success(`Risk updated for patient ${data.patientName}`);
        setNotifications((prev) => [data, ...prev]);
      });

      setSocket(newSocket);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, connected, notifications }}>
      {children}
    </SocketContext.Provider>
  );
};
