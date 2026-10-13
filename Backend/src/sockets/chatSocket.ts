import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env.js';
import { MessageRepo } from '../repositories/messageRepo.js';
import { AccountRepo } from '../repositories/accountRepo.js';
import { ChatMessage } from '../types/index.js';

export function setupChatSockets(io: Server) {
  // Socket.IO authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      if (!token && socket.handshake.headers.cookie) {
        const match = socket.handshake.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
        if (match) token = match[1];
      }

      if (!token) {
        // Allow guest to connect socket for public events, but not for authenticated chat
        socket.data.isGuest = true;
        return next();
      }

      const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
        userId: string;
        role: string;
        iat?: number;
      };
      const user = await AccountRepo.findById(decoded.userId);
      if (!user || user.status === 'banned') {
        socket.data.isGuest = true;
        return next();
      }

      // Check suspension
      if (user.status === 'suspended' && user.suspendedUntil) {
        const now = new Date();
        const suspendedUntil = new Date(user.suspendedUntil);
        if (now < suspendedUntil) {
          socket.data.isGuest = true;
          return next();
        }
      }

      // Invalidate if password changed after token issuance
      if (user.passwordChangedAt && decoded.iat) {
        const changedAtSec = Math.floor(
          new Date(user.passwordChangedAt).getTime() / 1000
        );
        if (decoded.iat < changedAtSec) {
          socket.data.isGuest = true;
          return next();
        }
      }

      socket.data.user = user;
      socket.data.isGuest = false;
      next();
    } catch {
      socket.data.isGuest = true;
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    if (user) {
      // Join user room
      socket.join(`user:${user.id}`);

      // If admin, join admin channel
      if (user.role === 'admin') {
        socket.join('admins');
      }

      console.log(`[Socket] User connected: ${user.username} (${user.role})`);
    }

    /**
     * User sends chat message to Admin
     */
    socket.on(
      'chat:send',
      async (data: { text?: string; imageUrl?: string; toUserId?: string }) => {
        if (!user) {
          socket.emit('error', { message: 'Authentication required to chat.' });
          return;
        }

        const isUserSender = user.role !== 'admin' || !data.toUserId;
        const targetUserId = isUserSender ? user.id : data.toUserId!;

        const message: ChatMessage = {
          id: `msg_${Date.now()}_${uuidv4().slice(0, 6)}`,
          sender: isUserSender ? 'user' : 'admin',
          senderId: user.id,
          type: data.imageUrl ? 'image' : 'text',
          text: data.text?.trim(),
          imageUrl: data.imageUrl,
          createdAt: new Date().toISOString(),
          readByAdmin: !isUserSender,
          readByUser: isUserSender,
        };

        // Persist into message_data
        await MessageRepo.appendMessage(targetUserId, message);

        // Emit to user room
        io.to(`user:${targetUserId}`).emit('chat:message', message);

        // Emit to all admin sockets
        io.to('admins').emit('chat:message', {
          ...message,
          targetUserId,
        });

        // Broadcast updated conversation list to admins for live re-sort
        const updatedConversations = await MessageRepo.getConversations();
        io.to('admins').emit('inbox:update', updatedConversations);
      }
    );

    /**
     * Mark messages read
     */
    socket.on('chat:read', async (data: { userId?: string }) => {
      if (!user) return;
      const reader = user.role === 'admin' ? 'admin' : 'user';
      const targetUserId = user.role === 'admin' ? (data?.userId || '') : user.id;
      if (!targetUserId) return;

      await MessageRepo.markAsRead(targetUserId, reader);

      if (reader === 'admin') {
        const updatedConversations = await MessageRepo.getConversations();
        io.to('admins').emit('inbox:update', updatedConversations);
      }
    });

    socket.on('disconnect', () => {
      // Disconnect
    });
  });
}
