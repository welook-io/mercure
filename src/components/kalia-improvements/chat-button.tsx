"use client";

import { useKaliaImprovements } from "@/lib/contexts/kalia-improvements-context";
import { MessageSquarePlus, X } from "lucide-react";

export function ChatButton() {
  const { isOpen, toggleChat, messages, ticketCreated } = useKaliaImprovements();

  // Show badge if there's a conversation in progress
  const showBadge = !isOpen && messages.length > 0 && !ticketCreated;

  return (
    <button
      onClick={toggleChat}
      className={`
        fixed bottom-4 right-4 z-50
        w-12 h-12 rounded-full
        flex items-center justify-center
        transition-all duration-200
        shadow-lg hover:shadow-xl
        ${isOpen 
          ? "bg-neutral-700 hover:bg-neutral-600" 
          : "bg-neutral-900 hover:bg-neutral-800"
        }
      `}
      aria-label={isOpen ? "Cerrar chat de feedback" : "Abrir chat de feedback"}
    >
      {isOpen ? (
        <X className="w-5 h-5 text-white" />
      ) : (
        <>
          <MessageSquarePlus className="w-5 h-5 text-white" />
          {showBadge && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">
                {messages.length > 9 ? "9+" : messages.length}
              </span>
            </span>
          )}
        </>
      )}
    </button>
  );
}

