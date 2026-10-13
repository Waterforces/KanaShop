import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { setupChatSockets } from './sockets/chatSocket.js';
import { startOrderCleanupService } from './services/orderCleanupService.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const isAllowed =
        requestOrigin === ENV.FRONTEND_URL ||
        requestOrigin.includes('localhost') ||
        requestOrigin.includes('127.0.0.1') ||
        /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(requestOrigin);

      if (isAllowed || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

app.set('io', io);
setupChatSockets(io);
startOrderCleanupService(io);

server.listen(ENV.PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 KanaShop Backend running on http://localhost:${ENV.PORT}`);
  console.log(`📡 Realtime Socket.IO chat ready on port ${ENV.PORT}`);
  console.log(`📂 Data directory: ${ENV.DATA_DIR}`);
  console.log(`======================================================\n`);
});
