"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [value]);

  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-neutral-200 bg-white">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí tu mensaje..."
          disabled={disabled}
          rows={1}
          className="
            flex-1 resize-none
            px-3 py-2
            text-sm text-neutral-900
            bg-neutral-50 border border-neutral-200 rounded-lg
            placeholder:text-neutral-400
            focus:outline-none focus:border-neutral-400 focus:bg-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
          style={{ minHeight: "36px", maxHeight: "120px" }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="
            h-9 w-9 flex-shrink-0
            flex items-center justify-center
            bg-neutral-900 text-white rounded-lg
            hover:bg-neutral-800
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
          aria-label="Enviar mensaje"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
        Shift + Enter para nueva línea
      </p>
    </div>
  );
}


