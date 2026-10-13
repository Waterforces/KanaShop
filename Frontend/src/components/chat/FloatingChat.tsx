import React, { useState, useEffect, useRef } from 'react';
import {
  ChatCircleDots,
  X,
  PaperPlaneTilt,
  Image as ImageIcon,
  Check,
  Checks,
} from '@phosphor-icons/react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../stores/authStore.js';
import { useGuestModalStore } from '../../stores/guestModalStore.js';
import { ChatMessage } from '../../types/index.js';

export const FloatingChat: React.FC = () => {
  const { user } = useAuthStore();
  const { openLoginModal } = useGuestModalStore();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize Socket and fetch history when authenticated
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setUnreadCount(0);
      return;
    }

    // Connect socket
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    // Fetch initial chat messages from REST
    fetch('/api/chat/messages')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(data);
          const unread = data.filter((m: ChatMessage) => m.sender === 'admin' && !m.readByUser).length;
          setUnreadCount(unread);
        }
      })
      .catch((e) => console.error('Fetch messages error:', e));

    socket.on('chat:message', (newMsg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
        }
        const tempIdx = prev.findIndex(
          (m) =>
            m.id.startsWith('temp_') &&
            m.sender === newMsg.sender &&
            (m.text === newMsg.text || (m.imageUrl && m.imageUrl === newMsg.imageUrl))
        );
        if (tempIdx !== -1) {
          const copy = [...prev];
          copy[tempIdx] = newMsg;
          return copy;
        }
        return [...prev, newMsg];
      });
      scrollToBottom();

      if (newMsg.sender === 'admin') {
        if (!isOpenRef.current) {
          setUnreadCount((c) => c + 1);
        } else if (socketRef.current) {
          socketRef.current.emit('chat:read', { userId: user.id });
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
      if (socketRef.current && user) {
        socketRef.current.emit('chat:read', { userId: user.id });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTriggerClick = () => {
    if (!user) {
      // Guest restriction: trigger login modal!
      openLoginModal('chat', 'Please log in to chat with our customer support team.', () => {
        setIsOpen(true);
      });
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const textToSend = inputText.trim();
    setInputText('');

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      sender: 'user',
      senderId: user.id,
      type: 'text',
      text: textToSend,
      createdAt: new Date().toISOString(),
      readByAdmin: false,
      readByUser: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('chat:send', { text: textToSend });
    } else {
      // Fallback REST
      try {
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSend }),
        });
        if (res.ok) {
          const msg = await res.json();
          setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
        }
      } catch (err) {
        console.error('Send error:', err);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
          sender: 'user',
          senderId: user.id,
          type: 'image',
          imageUrl: data.imageUrl,
          createdAt: new Date().toISOString(),
          readByAdmin: false,
          readByUser: true,
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        scrollToBottom();

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('chat:send', { imageUrl: data.imageUrl });
        } else {
          const sendRes = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: data.imageUrl }),
          });
          if (sendRes.ok) {
            const msg = await sendRes.json();
            setMessages((prev) => prev.map((m) => (m.id === tempId ? msg : m)));
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

  return (
    <>
      {/* Floating Trigger in Southeast Corner */}
      <aside
        aria-label="Customer Support Chat"
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end"
      >
        {/* Chat Window */}
        {isOpen && (
          <div
            className="mb-3 w-[360px] sm:w-[380px] h-[520px] rounded-2xl bg-surface border border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 duration-200"
            role="dialog"
            aria-label="KanaShop Live Support Chat"
          >
            {/* Header */}
            <div className="p-4 border-b border-header bg-header text-header flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-header-active border border-header flex items-center justify-center font-bold text-sm">
                    K
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-header"></span>
                </div>
                <div>
                  <h4 className="text-xs font-bold font-heading">Kana Customer Support</h4>
                  <p className="text-[10px] text-header-muted flex items-center gap-1">
                    <span>● Online</span>
                    <span>· Usually replies within 2 mins</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                type="button"
                className="p-1 rounded-full text-header hover:bg-header-active/60 transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Thread (Chronological, newest at bottom) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-muted/30">
              <div className="text-center my-2">
                <span className="px-2.5 py-1 rounded-full bg-surface-muted text-[10px] font-medium text-fg-muted border border-border">
                  Today
                </span>
              </div>

              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-fg-muted">
                  <ChatCircleDots size={40} className="mb-2 opacity-30 text-accent-token" />
                  <p className="text-xs font-semibold text-fg">Hello {user?.fullName || 'there'}!</p>
                  <p className="text-[11px] text-fg-muted mt-1 max-w-[220px]">
                    Have questions about tumbler specs, insulation, or designs? Ask us anything below.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isUser = m.sender === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                          isUser
                            ? 'bg-accent-token text-on-accent rounded-br-xs'
                            : 'bg-surface border border-border text-fg rounded-bl-xs'
                        }`}
                      >
                        {m.imageUrl && (
                          <img
                            src={m.imageUrl}
                            alt="Chat attachment"
                            className="rounded-lg max-h-48 w-full object-cover mb-1.5 border border-black/10"
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
                        {isUser && (
                          <span>
                            {m.readByAdmin ? (
                              <Checks size={12} className="text-accent-token" weight="bold" />
                            ) : (
                              <Check size={12} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendText} className="p-3 border-t border-border bg-surface flex items-center gap-2">
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
                title="Send Photo"
                aria-label="Attach image"
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
                placeholder="Type your message..."
                className="flex-1 py-2 px-3 rounded-xl border border-border bg-surface-muted text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent-token"
              />

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2 rounded-xl bg-accent-token text-on-accent hover:opacity-95 transition-opacity disabled:opacity-40 cursor-pointer shrink-0"
                aria-label="Send message"
              >
                <PaperPlaneTilt size={17} weight="fill" />
              </button>
            </form>
          </div>
        )}

        {/* Southeast Floating Round Button */}
        <button
          onClick={handleTriggerClick}
          type="button"
          className="relative p-3.5 rounded-full bg-accent-token text-on-accent shadow-xl hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer flex items-center justify-center"
          aria-label={isOpen ? 'Close chat with admin' : 'Open live support chat with admin'}
        >
          {isOpen ? <X size={26} weight="bold" /> : <ChatCircleDots size={26} weight="fill" />}

          {/* Unread badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-danger text-white ring-2 ring-surface">
              {unreadCount}
            </span>
          )}
        </button>
      </aside>
    </>
  );
};
