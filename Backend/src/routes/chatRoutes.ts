import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MessageRepo } from '../repositories/messageRepo.js';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { uploadChat, verifyUploadMagicBytes } from '../middleware/upload.js';
import { ChatMessage } from '../types/index.js';

export const chatRouter = Router();

/**
 * User: Get own chat history
 */
chatRouter.get(
  '/messages',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const messages = await MessageRepo.getMessages(req.user!.id);
      await MessageRepo.markAsRead(req.user!.id, 'user');
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch messages.' });
    }
  }
);

/**
 * User: Upload image for chat
 */
chatRouter.post(
  '/upload',
  requireAuth,
  uploadChat.single('image'),
  verifyUploadMagicBytes,
  (req: AuthenticatedRequest, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ error: 'No image uploaded.' });
      return;
    }
    const imageUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  }
);

/**
 * User: Send a message to Admin
 */
chatRouter.post(
  '/send',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { text, imageUrl } = req.body;

      if (!text && !imageUrl) {
        res.status(400).json({ error: 'Message cannot be empty.' });
        return;
      }

      const message: ChatMessage = {
        id: `msg_${Date.now()}_${uuidv4().slice(0, 6)}`,
        sender: 'user',
        senderId: user.id,
        type: imageUrl ? 'image' : 'text',
        text: text?.trim(),
        imageUrl: imageUrl || undefined,
        createdAt: new Date().toISOString(),
        readByAdmin: false,
        readByUser: true,
      };

      await MessageRepo.appendMessage(user.id, message);

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${user.id}`).emit('chat:message', message);
        io.to('admins').emit('chat:message', { ...message, targetUserId: user.id });
        const updatedConversations = await MessageRepo.getConversations();
        io.to('admins').emit('inbox:update', updatedConversations);
      }

      res.status(201).json(message);
    } catch (err: any) {
      console.error('Send message error:', err);
      res.status(500).json({ error: 'Failed to send message.' });
    }
  }
);

/**
 * Admin: Get conversations inbox (sorted by most recently active first)
 */
chatRouter.get(
  '/admin/conversations',
  requireAuth,
  requireAdmin,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const conversations = await MessageRepo.getConversations();
      res.json(conversations);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch conversations.' });
    }
  }
);

/**
 * Admin: Get user's conversation thread (chronological, newest at bottom)
 */
chatRouter.get(
  '/admin/conversations/:userId',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const messages = await MessageRepo.getMessages(req.params.userId);
      await MessageRepo.markAsRead(req.params.userId, 'admin');
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch messages for user.' });
    }
  }
);

/**
 * Admin: Send reply to user
 */
chatRouter.post(
  '/admin/conversations/:userId/reply',
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { text, imageUrl } = req.body;
      const targetUserId = req.params.userId;

      if (!text && !imageUrl) {
        res.status(400).json({ error: 'Message cannot be empty.' });
        return;
      }

      const message: ChatMessage = {
        id: `msg_${Date.now()}_${uuidv4().slice(0, 6)}`,
        sender: 'admin',
        senderId: req.user!.id,
        type: imageUrl ? 'image' : 'text',
        text: text?.trim(),
        imageUrl: imageUrl || undefined,
        createdAt: new Date().toISOString(),
        readByAdmin: true,
        readByUser: false,
      };

      await MessageRepo.appendMessage(targetUserId, message);

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${targetUserId}`).emit('chat:message', message);
        io.to('admins').emit('chat:message', { ...message, targetUserId });
        const updatedConversations = await MessageRepo.getConversations();
        io.to('admins').emit('inbox:update', updatedConversations);
      }

      res.status(201).json(message);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to send admin reply.' });
    }
  }
);
