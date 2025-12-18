"use client";

import { useKaliaImprovements } from "@/lib/contexts/kalia-improvements-context";
import { X, MessageCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

const ROTATING_TEXTS = [
  "¿Algo no funciona?",
  "¿Tenés una sugerencia?",
  "Escribime directo",
];

type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

const CORNER_POSITIONS: Record<Corner, string> = {
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-right": "top-16 right-4", // top-16 para no tapar navbar
  "top-left": "top-16 left-4",
};

export function ChatButton() {
  const { isOpen, toggleChat, messages, ticketCreated } = useKaliaImprovements();
  const [textIndex, setTextIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [corner, setCorner] = useState<Corner>("bottom-right");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  // Rotate text every 4 seconds
  useEffect(() => {
    if (isOpen || isMinimized) return;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setTextIndex((prev) => (prev + 1) % ROTATING_TEXTS.length);
        setIsAnimating(false);
      }, 200);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, isMinimized]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Solo iniciar drag con click izquierdo y sin modificadores
    if (e.button !== 0) return;
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(false);
  }, []);

  // Handle drag end - determine which corner to snap to
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const deltaX = Math.abs(e.clientX - dragStart.x);
    const deltaY = Math.abs(e.clientY - dragStart.y);
    
    // Si movió más de 20px, es un drag
    if (deltaX > 20 || deltaY > 20) {
      setIsDragging(true);
      
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      const isLeft = e.clientX < windowWidth / 2;
      const isTop = e.clientY < windowHeight / 2;
      
      let newCorner: Corner;
      if (isTop && isLeft) newCorner = "top-left";
      else if (isTop && !isLeft) newCorner = "top-right";
      else if (!isTop && isLeft) newCorner = "bottom-left";
      else newCorner = "bottom-right";
      
      setCorner(newCorner);
      
      // Prevenir que se abra el chat después de arrastrar
      e.preventDefault();
      e.stopPropagation();
    }
  }, [dragStart]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Solo abrir chat si no fue un drag
    const deltaX = Math.abs(e.clientX - dragStart.x);
    const deltaY = Math.abs(e.clientY - dragStart.y);
    
    if (deltaX < 20 && deltaY < 20) {
      toggleChat();
    }
  }, [dragStart, toggleChat]);

  // Show badge if there's a conversation in progress
  const showBadge = !isOpen && messages.length > 0 && !ticketCreated;

  if (isOpen) {
    return null; // El X está en el modal
  }

  // Minimizado: solo mostrar un punto pequeño que se puede expandir
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`
          fixed ${CORNER_POSITIONS[corner]} z-50
          w-10 h-10
          flex items-center justify-center
          bg-neutral-900 hover:bg-neutral-800
          text-white
          rounded-full
          shadow-lg hover:shadow-xl
          transition-all duration-200
          border border-neutral-700
          opacity-60 hover:opacity-100
        `}
        aria-label="Mostrar chat de feedback"
      >
        <MessageCircle className="w-4 h-4" />
        {showBadge && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
        )}
      </button>
    );
  }

  return (
    <div
      ref={buttonRef}
      className={`fixed ${CORNER_POSITIONS[corner]} z-50 flex items-center gap-1`}
    >
      {/* Botón principal - arrastrable */}
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        className="
          flex items-center gap-2
          px-4 py-2.5
          bg-neutral-900 hover:bg-neutral-800
          text-white text-sm
          rounded-full
          shadow-lg hover:shadow-xl
          transition-all duration-200
          border border-neutral-700
          cursor-grab active:cursor-grabbing
          select-none
        "
        role="button"
        aria-label="Abrir chat de feedback (arrastrar para mover)"
      >
        <MessageCircle className="w-4 h-4 flex-shrink-0" />
        <span 
          className={`
            transition-all duration-200 
            ${isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}
          `}
        >
          {ROTATING_TEXTS[textIndex]}
        </span>
        {showBadge && (
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Botón minimizar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsMinimized(true);
        }}
        className="
          w-6 h-6
          flex items-center justify-center
          bg-neutral-800 hover:bg-neutral-700
          text-neutral-400 hover:text-white
          rounded-full
          transition-all duration-200
          border border-neutral-600
        "
        aria-label="Minimizar"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
