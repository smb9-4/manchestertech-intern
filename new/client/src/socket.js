import { io } from 'socket.io-client';
import { getToken } from './api';
let socket = null;
export function connectSocket() {
  if (socket) return socket;
  socket = io(import.meta.env.VITE_API_URL || '/', {
    auth: { token: getToken() },
    transports: ['websocket'],
  });
  return socket;
}
export function disconnectSocket() { socket?.disconnect(); socket = null; }
export const getSocket = () => socket;
