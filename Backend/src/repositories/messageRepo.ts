import fs from 'fs/promises';
import path from 'path';
import { ENV } from '../config/env.js';
import { JsonStore } from '../storage/jsonStore.js';
import {
  ChatMessage,
  ConversationSummary,
  UserChatFile,
} from '../types/index.js';
import { AccountRepo } from './accountRepo.js';

interface ConversationIndexSchema {
  conversations: ConversationSummary[];
}

export class MessageRepo {
  private static getMessageDir(): string {
    return path.join(ENV.DATA_DIR, 'message_data');
  }

  private static getUserFilePath(userId: string): string {
    return path.join(this.getMessageDir(), `${userId}.json`);
  }

  private static getIndexFilePath(): string {
    return path.join(this.getMessageDir(), '_index.json');
  }

  /**
   * Get all messages for a specific user thread (chronological order)
   */
  static async getMessages(userId: string): Promise<ChatMessage[]> {
    const fallback: UserChatFile = { userId, messages: [] };
    const data = await JsonStore.read<UserChatFile>(this.getUserFilePath(userId), fallback);
    return data.messages;
  }

  /**
   * Append a new message to user file and update _index.json
   */
  static async appendMessage(
    userId: string,
    message: ChatMessage
  ): Promise<ChatMessage> {
    const fallback: UserChatFile = { userId, messages: [] };

    // 1. Update user chat file
    await JsonStore.update<UserChatFile>(
      this.getUserFilePath(userId),
      fallback,
      (current) => {
        current.messages.push(message);
        return current;
      }
    );

    // 2. Update index summary
    const indexFallback: ConversationIndexSchema = { conversations: [] };
    const userAccount = await AccountRepo.findById(userId);

    await JsonStore.update<ConversationIndexSchema>(
      this.getIndexFilePath(),
      indexFallback,
      (current) => {
        let conv = current.conversations.find((c) => c.userId === userId);
        const preview =
          message.type === 'image'
            ? '📷 [Image attachment]'
            : message.text?.slice(0, 60) || '';

        if (!conv) {
          conv = {
            userId,
            username: userAccount?.username || userId,
            fullName: userAccount?.fullName || 'User',
            photoUrl: userAccount?.photoUrl || '',
            lastMessageAt: message.createdAt,
            lastMessagePreview: preview,
            lastSender: message.sender,
            unreadForAdmin: message.sender === 'user' ? 1 : 0,
            unreadForUser: message.sender === 'admin' ? 1 : 0,
          };
          current.conversations.push(conv);
        } else {
          conv.lastMessageAt = message.createdAt;
          conv.lastMessagePreview = preview;
          conv.lastSender = message.sender;
          if (message.sender === 'user') {
            conv.unreadForAdmin += 1;
          } else {
            conv.unreadForUser += 1;
          }
          if (userAccount) {
            conv.username = userAccount.username;
            conv.fullName = userAccount.fullName;
            conv.photoUrl = userAccount.photoUrl;
          }
        }

        // Sort conversations: most recent active first
        current.conversations.sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );

        return current;
      }
    );

    return message;
  }

  /**
   * Mark messages as read by admin or by user
   */
  static async markAsRead(userId: string, reader: 'admin' | 'user'): Promise<void> {
    const fallback: UserChatFile = { userId, messages: [] };

    await JsonStore.update<UserChatFile>(
      this.getUserFilePath(userId),
      fallback,
      (current) => {
        for (const msg of current.messages) {
          if (reader === 'admin') msg.readByAdmin = true;
          if (reader === 'user') msg.readByUser = true;
        }
        return current;
      }
    );

    const indexFallback: ConversationIndexSchema = { conversations: [] };
    await JsonStore.update<ConversationIndexSchema>(
      this.getIndexFilePath(),
      indexFallback,
      (current) => {
        const conv = current.conversations.find((c) => c.userId === userId);
        if (conv) {
          if (reader === 'admin') conv.unreadForAdmin = 0;
          if (reader === 'user') conv.unreadForUser = 0;
        }
        return current;
      }
    );
  }

  /**
   * Get all conversation summaries sorted by most recently active
   */
  static async getConversations(): Promise<ConversationSummary[]> {
    const indexFallback: ConversationIndexSchema = { conversations: [] };
    const data = await JsonStore.read<ConversationIndexSchema>(
      this.getIndexFilePath(),
      indexFallback
    );
    return data.conversations.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }

  /**
   * Delete conversation messages file and remove from _index.json
   */
  static async deleteConversation(userId: string): Promise<void> {
    try {
      await fs.unlink(this.getUserFilePath(userId));
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        console.error('Error deleting chat file for user:', userId, err);
      }
    }

    const indexFallback: ConversationIndexSchema = { conversations: [] };
    await JsonStore.update<ConversationIndexSchema>(
      this.getIndexFilePath(),
      indexFallback,
      (current) => {
        current.conversations = current.conversations.filter((c) => c.userId !== userId);
        return current;
      }
    );
  }
}
