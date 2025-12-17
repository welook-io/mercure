"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

export interface PageContext {
  url?: string;
  title?: string;
  module?: string;
  additionalInfo?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface TicketInfo {
  id: string;
  number: number;
}

interface KaliaImprovementsContextValue {
  // Chat state
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;

  // Page context - para que cada página nutra info
  pageContext: PageContext;
  setPageContext: (context: Partial<PageContext>) => void;

  // Conversation state
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  ticketCreated: TicketInfo | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  resetConversation: () => void;
}

// ============================================================================
// Context
// ============================================================================

const KaliaImprovementsContext = createContext<KaliaImprovementsContextValue | null>(
  null
);

// ============================================================================
// Provider
// ============================================================================

interface KaliaImprovementsProviderProps {
  children: ReactNode;
}

export function KaliaImprovementsProvider({
  children,
}: KaliaImprovementsProviderProps) {
  const pathname = usePathname();

  // Chat visibility
  const [isOpen, setIsOpen] = useState(false);

  // Page context
  const [pageContext, setPageContextState] = useState<PageContext>({});

  // Conversation
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketCreated, setTicketCreated] = useState<TicketInfo | null>(null);

  // Auto-detect URL when pathname changes
  useEffect(() => {
    setPageContextState((prev) => ({
      ...prev,
      url: pathname,
    }));
  }, [pathname]);

  // Chat visibility handlers
  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  // Set page context (merge with existing)
  const setPageContext = useCallback((context: Partial<PageContext>) => {
    setPageContextState((prev) => ({
      ...prev,
      ...context,
    }));
  }, []);

  // Reset conversation
  const resetConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setTicketCreated(null);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (messageContent: string) => {
      if (!messageContent.trim() || isLoading) return;

      setIsLoading(true);
      setError(null);

      // Add user message optimistically
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: messageContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch("/api/kalia-improvements/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            message: messageContent,
            page_context: pageContext,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error enviando mensaje");
        }

        const data = await response.json();

        // Update conversation ID if new
        if (data.conversation_id && !conversationId) {
          setConversationId(data.conversation_id);
        }

        // Add assistant message
        if (data.message) {
          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.message,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }

        // Check if ticket was created
        if (data.ticket) {
          setTicketCreated({
            id: data.ticket.id,
            number: data.ticket.number,
          });
        }
      } catch (err) {
        console.error("Error sending message:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, pageContext, isLoading]
  );

  const value: KaliaImprovementsContextValue = {
    isOpen,
    openChat,
    closeChat,
    toggleChat,
    pageContext,
    setPageContext,
    conversationId,
    messages,
    isLoading,
    error,
    ticketCreated,
    sendMessage,
    resetConversation,
  };

  return (
    <KaliaImprovementsContext.Provider value={value}>
      {children}
    </KaliaImprovementsContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useKaliaImprovements(): KaliaImprovementsContextValue {
  const context = useContext(KaliaImprovementsContext);
  if (!context) {
    throw new Error(
      "useKaliaImprovements must be used within a KaliaImprovementsProvider"
    );
  }
  return context;
}

