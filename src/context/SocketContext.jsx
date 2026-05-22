import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');
      const joinUserRoom = () => {
        if (user?.id) {
          newSocket.emit('join_user', user.id);
        }
      };

      newSocket.on('connect', joinUserRoom);
      if (newSocket.connected) {
        joinUserRoom();
      }

      setSocket(newSocket);

      return () => {
        newSocket.off('connect', joinUserRoom);
        newSocket.close();
      };
    } else {
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => useContext(SocketContext);
