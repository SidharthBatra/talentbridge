import { io, type Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

/** Opens the /notifications socket authenticated with the given access token. */
export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;
  socket?.disconnect();

  socket = io(`${WS_URL}/notifications`, {
    auth: { token: accessToken },
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
