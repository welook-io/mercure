"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/contexts/kalia-improvements-context";
import { User, Bot, Loader2 } from "lucide-react";

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="p-4 space-y-3">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      
      {isLoading && (
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-3.5 h-3.5 text-neutral-600" />
          </div>
          <div className="bg-neutral-100 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 text-neutral-500 animate-spin" />
              <span className="text-xs text-neutral-500">Escribiendo...</span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-neutral-900" : "bg-neutral-100"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-neutral-600" />
        )}
      </div>

      {/* Message */}
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser
            ? "bg-neutral-900 text-white"
            : "bg-neutral-100 text-neutral-800"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>
        <p
          className={`text-[10px] mt-1 ${
            isUser ? "text-neutral-400" : "text-neutral-400"
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}


