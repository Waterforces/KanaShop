import React, { useState, useEffect, useRef } from 'react';
import {
  ChatCircleDots,
  PaperPlaneTilt,
  Image as ImageIcon,
  User,
  MagnifyingGlass,
  ArrowSquareOut,
  Checks,
  Check,
} from '@phosphor-icons/react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/authStore.js';
import { ChatMessage, ConversationSummary } from '../../types/index.js';

export const AdminChatPage: React.FC = () => {
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const selectedUserIdRef = useRef<string | null>(selectedUserId);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep selectedUserIdRef in sync with current state
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversations inbox
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/chat/admin/conversations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
        if (!selectedUserIdRef.current && data.length > 0) {
          setSelectedUserId(data[0].userId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Fetch specific thread
  const fetchThread = async (userId: string) => {
    try {
      const res = await fetch(`/api/chat/admin/conversations/${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        scrollToBottom();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Socket setup
  useEffect(() => {
    fetchConversations();

    const socket = io('/', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (selectedUserIdRef.current) {
        socket.emit('chat:read', { userId: selectedUserIdRef.current });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('inbox:update', (updated: ConversationSummary[]) => {
      setConversations(updated);
    });

    socket.on('chat:message', (msg: any) => {
      const currentSelected = selectedUserIdRef.current;
      if (currentSelected && (msg.targetUserId === currentSelected || msg.senderId === currentSelected)) {
        setMessages((prev) => {
          // If message is already present by exact id, update read state
          if (prev.some((m) => m.id === msg.id)) {
            return prev.map((m) => (m.id === msg.id ? msg : m));
          }
          // If there is an optimistic temp placeholder, replace it
          const tempIdx = prev.findIndex(
            (m) =>
              m.id.startsWith('temp_') &&
              m.sender === msg.sender &&
              (m.text === msg.text || (m.imageUrl && m.imageUrl === msg.imageUrl))
          );
          if (tempIdx !== -1) {
            const next = [...prev];
            next[tempIdx] = msg;
            return next;
          }
          return [...prev, msg];
        });
        scrollToBottom();
        socket.emit('chat:read', { userId: currentSelected });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchThread(selectedUserId);
      if (socketRef.current) {
        socketRef.current.emit('chat:read', { userId: selectedUserId });
      }
    }
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedUserId) return;

    const textToSend = inputText.trim();
    setInputText('');

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: 'admin',
      senderId: user?.id || 'admin',
      type: 'text',
      text: textToSend,
      createdAt: new Date().toISOString(),
      readByAdmin: true,
      readByUser: false,
    };

    // 1. Instantly display in UI (0ms latency)
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    // 2. Immediately update inbox preview
    setConversations((prev) =>
      prev.map((c) =>
        c.userId === selectedUserId
          ? {
              ...c,
              lastMessagePreview: textToSend,
              lastSender: 'admin',
              lastMessageAt: new Date().toISOString(),
            }
          : c
      )
    );

    // 3. Emit via socket or fallback to REST
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('chat:send', {
        text: textToSend,
        toUserId: selectedUserId,
      });
    } else {
      try {
        const res = await fetch(`/api/chat/admin/conversations/${selectedUserId}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSend }),
        });
        if (res.ok) {
          const confirmed = await res.json();
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? confirmed : m))
          );
          fetchConversations();
        }
      } catch (e) {
        console.error('Failed to send admin reply:', e);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadRes = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await uploadRes.json();
      if (data.imageUrl) {
        const tempId = `temp_img_${Date.now()}`;
        const optimisticMsg: ChatMessage = {
          id: tempId,
          sender: 'admin',
          senderId: user?.id || 'admin',
          type: 'image',
          imageUrl: data.imageUrl,
          createdAt: new Date().toISOString(),
          readByAdmin: true,
          readByUser: false,
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        scrollToBottom();

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('chat:send', {
            imageUrl: data.imageUrl,
            toUserId: selectedUserId,
          });
        } else {
          const res = await fetch(`/api/chat/admin/conversations/${selectedUserId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: data.imageUrl }),
          });
          if (res.ok) {
            const confirmed = await res.json();
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? confirmed : m))
            );
            fetchConversations();
          }
        }
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.userId === selectedUserId);

  return (
    <div className="h-[calc(100vh-10rem)] rounded-2xl border border-border bg-surface shadow-xs flex overflow-hidden">
      {/* Left Pane: Inbox List (Sorted by most recent activity at top) */}
      <div className="w-80 border-r border-border flex flex-col shrink-0 bg-surface">
        <div className="p-3.5 border-b border-border bg-surface-muted/40">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold font-heading text-fg">Support Conversations</h2>
            <div className="flex items-center gap-1.5" title={isConnected ? 'Real-time WebSocket active' : 'Connecting WebSocket...'}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-warning'}`}></span>
              <span className="text-[10px] font-medium text-fg-muted">{isConnected ? 'Live' : 'Connecting'}</span>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">
              <MagnifyingGlass size={15} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent-token"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-fg-muted">
              No support conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.userId === selectedUserId;
              return (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedUserId(conv.userId)}
                  type="button"
                  className={`w-full p-3.5 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-header/20 border-l-4 border-l-accent-token'
                      : 'hover:bg-surface-muted/50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${conv.fullName}`}
                      alt={conv.fullName}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                    />
                    {conv.unreadForAdmin > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-token ring-2 ring-surface"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-fg truncate">{conv.fullName}</p>
                      <span className="text-[10px] text-fg-muted shrink-0">
                        {new Date(conv.lastMessageAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-fg-muted truncate mt-0.5">
                      {conv.lastSender === 'admin' ? 'You: ' : ''}
                      {conv.lastMessagePreview || 'New conversation'}
                    </p>

                    {conv.unreadForAdmin > 0 && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-accent-token text-on-accent">
                        {conv.unreadForAdmin} new
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Chronological Conversation Thread (Newest at bottom) */}
      <div className="flex-1 flex flex-col bg-bg">
        {selectedConv ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedConv.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedConv.fullName}`}
                  alt={selectedConv.fullName}
                  className="w-9 h-9 rounded-full object-cover border border-border"
                />
                <div>
                  <h3 className="text-xs font-bold text-fg">{selectedConv.fullName}</h3>
                  <p className="text-[10px] text-fg-muted font-mono">@{selectedConv.username} · {selectedConv.userId}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-success/15 text-success">
                  Active Thread
                </span>
              </div>
            </div>

            {/* Chronological Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                const isAdmin = m.sender === 'admin';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                        isAdmin
                          ? 'bg-accent-token text-on-accent rounded-br-xs'
                          : 'bg-surface border border-border text-fg rounded-bl-xs'
                      }`}
                    >
                      {m.imageUrl && (
                        <img
                          src={m.imageUrl}
                          alt="Attachment"
                          className="rounded-lg max-h-56 w-full object-cover mb-1.5 border border-black/10"
                        />
                      )}
                      {m.text && <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>}
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-[9px] text-fg-muted px-1">
                      <span>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isAdmin && (
                        <span>
                          {m.readByUser ? <Checks size={12} weight="bold" /> : <Check size={12} />}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Composer */}
            <form onSubmit={handleSendReply} className="p-3 border-t border-border bg-surface flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="p-2 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                title="Attach photo"
              >
                {uploadingImage ? (
                  <div className="w-4 h-4 border-2 border-accent-token border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <ImageIcon size={19} />
                )}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type response to customer..."
                className="flex-1 py-2 px-3 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="py-2 px-4 rounded-xl bg-accent-token text-on-accent font-bold text-xs hover:opacity-95 transition-opacity disabled:opacity-40 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>Send</span>
                <PaperPlaneTilt size={14} weight="fill" />
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-fg-muted">
            <ChatCircleDots size={44} className="mb-2 opacity-30 text-accent-token" />
            <p className="text-sm font-semibold text-fg">Select a customer conversation</p>
            <p className="text-xs text-fg-muted mt-1 max-w-xs">
              View customer questions, provide advice on tumbler materials, and share photos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
