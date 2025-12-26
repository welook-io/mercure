"use client";

import { useKaliaImprovements } from "@/lib/contexts/kalia-improvements-context";
import { ChatButton } from "./chat-button";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { X, MessageSquarePlus, CheckCircle2 } from "lucide-react";

export function KaliaImprovementsChatWidget() {
  const {
    isOpen,
    closeChat,
    messages,
    isLoading,
    error,
    ticketCreated,
    sendMessage,
    resetConversation,
  } = useKaliaImprovements();

  if (!isOpen) {
    return <ChatButton />;
  }

  return (
    <>
      <ChatButton />
      
      {/* Chat Modal */}
      <div className="fixed bottom-20 right-4 w-[380px] max-w-[calc(100vw-32px)] bg-white rounded-lg shadow-xl border border-neutral-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-200 print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-900">
                Feedback & Soporte
              </h3>
              <p className="text-xs text-neutral-500">
                Contanos tu problema o sugerencia
              </p>
            </div>
          </div>
          <button
            onClick={closeChat}
            className="p-1.5 hover:bg-neutral-200 rounded transition-colors"
            aria-label="Cerrar chat"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto">
          {messages.length === 0 && !ticketCreated ? (
            <WelcomeMessage />
          ) : (
            <ChatMessages messages={messages} isLoading={isLoading} />
          )}
        </div>

        {/* Ticket Created Banner */}
        {ticketCreated && (
          <div className="px-4 py-3 bg-green-50 border-t border-green-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  Ticket #{ticketCreated.number} creado
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Gracias por tu feedback. Vamos a revisarlo pronto.
                </p>
                <button
                  onClick={() => {
                    resetConversation();
                  }}
                  className="mt-2 text-xs text-green-700 hover:text-green-800 underline"
                >
                  Reportar otro problema
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Input */}
        {!ticketCreated && (
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        )}
      </div>
    </>
  );
}

function WelcomeMessage() {
  return (
    <div className="p-4 space-y-3">
      <div className="bg-neutral-50 rounded-lg p-3">
        <p className="text-sm text-neutral-700">
          ¡Hola! 👋 Soy el asistente de feedback de Kalia.
        </p>
        <p className="text-sm text-neutral-600 mt-2">
          Contame qué problema encontraste o qué mejora te gustaría sugerir. 
          Voy a hacerte algunas preguntas para entender bien la situación y 
          crear un ticket para el equipo.
        </p>
      </div>
      
      <div className="space-y-1.5">
        <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
          Ejemplos de cómo empezar:
        </p>
        <div className="space-y-1">
          <ExampleChip text="No puedo generar facturas tipo A" />
          <ExampleChip text="Sería útil poder filtrar por fecha" />
          <ExampleChip text="El botón de guardar no funciona" />
        </div>
      </div>
    </div>
  );
}

function ExampleChip({ text }: { text: string }) {
  const { sendMessage } = useKaliaImprovements();
  
  return (
    <button
      onClick={() => sendMessage(text)}
      className="block w-full text-left text-xs px-3 py-2 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:border-neutral-300 transition-colors text-neutral-600"
    >
      &ldquo;{text}&rdquo;
    </button>
  );
}




