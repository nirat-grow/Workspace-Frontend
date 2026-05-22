import { useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';

export const useSocket = (projectId, callbacks) => {
  const socket = useSocketContext();

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit('join_project', projectId);

    if (callbacks.onTaskCreated) socket.on('task:created', callbacks.onTaskCreated);
    if (callbacks.onTaskUpdated) socket.on('task:updated', callbacks.onTaskUpdated);
    if (callbacks.onTaskDeleted) socket.on('task:deleted', callbacks.onTaskDeleted);
    if (callbacks.onTaskStatusChanged) socket.on('task:status_changed', callbacks.onTaskStatusChanged);
    if (callbacks.onCommentAdded) socket.on('comment:added', callbacks.onCommentAdded);

    return () => {
      socket.emit('leave_project', projectId);
      
      if (callbacks.onTaskCreated) socket.off('task:created', callbacks.onTaskCreated);
      if (callbacks.onTaskUpdated) socket.off('task:updated', callbacks.onTaskUpdated);
      if (callbacks.onTaskDeleted) socket.off('task:deleted', callbacks.onTaskDeleted);
      if (callbacks.onTaskStatusChanged) socket.off('task:status_changed', callbacks.onTaskStatusChanged);
      if (callbacks.onCommentAdded) socket.off('comment:added', callbacks.onCommentAdded);
    };
  }, [socket, projectId, callbacks]);

  return socket;
};
