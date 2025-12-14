import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, Users, ChevronDown } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatSidebarProps {
  messages: ChatMessage[];
  isOpen: boolean;
  isAIEnabled: boolean;
  onClose: () => void;
  onSendMessage: (text: string, isPrivate: boolean) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ messages, isOpen, isAIEnabled, onClose, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  // If AI is disabled, force public mode
  useEffect(() => {
      if (!isAIEnabled) setIsPrivateMode(false);
  }, [isAIEnabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue, isPrivateMode);
      setInputValue('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-[#202124] border-l border-[#3c4043] flex flex-col h-full absolute right-0 top-0 z-20 shadow-2xl">
      <div className="p-4 border-b border-[#3c4043] flex items-center justify-between">
        <h2 className="text-white font-medium text-lg">In-call messages</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-[#3c4043] p-3 rounded-lg text-sm text-gray-300 text-center">
            Messages are visible to everyone in the call, unless marked as private.
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-bold text-sm text-white flex items-center gap-1">
                {msg.isPrivate && <Lock size={12} className="text-[#fbbc04]" />}
                {msg.sender === 'user' ? 'You' : (msg.sender === 'ai' ? 'Professor AI' : 'System')}
                {msg.isPrivate && <span className="text-[10px] font-normal text-[#fbbc04] ml-1">(Private)</span>}
              </span>
              <span className="text-xs text-gray-400">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className={`px-4 py-2 rounded-lg max-w-[90%] text-sm border ${
                msg.isPrivate 
                    ? 'bg-[#202124] border-[#fbbc04]/50 text-gray-100' // Private Style
                    : msg.sender === 'user' 
                        ? 'bg-[#8ab4f8] text-[#202124] border-transparent' // Public User Style
                        : 'bg-[#3c4043] text-white border-transparent' // Public Other Style
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#3c4043] bg-[#202124]">
        {/* Recipient Selector */}
        <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-400">To:</span>
            <button 
                onClick={() => isAIEnabled && setIsPrivateMode(!isPrivateMode)}
                disabled={!isAIEnabled}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    !isAIEnabled
                        ? 'bg-[#3c4043] text-gray-500 cursor-not-allowed'
                        : isPrivateMode 
                            ? 'bg-[#fbbc04]/20 text-[#fbbc04] hover:bg-[#fbbc04]/30' 
                            : 'bg-[#8ab4f8]/20 text-[#8ab4f8] hover:bg-[#8ab4f8]/30'
                }`}
            >
                {isPrivateMode ? <Lock size={12} /> : <Users size={12} />}
                {isPrivateMode ? 'Professor AI (Private)' : 'Everyone'}
                <ChevronDown size={12} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isPrivateMode ? "Ask a private question..." : "Send a message to everyone"}
            className={`w-full bg-[#3c4043] text-white rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 transition-all ${
                isPrivateMode ? 'focus:ring-[#fbbc04] placeholder-gray-500' : 'focus:ring-[#8ab4f8]'
            }`}
          />
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full disabled:text-gray-500 disabled:hover:bg-transparent transition-colors ${
                isPrivateMode ? 'text-[#fbbc04] hover:bg-[#303134]' : 'text-[#8ab4f8] hover:bg-[#303134]'
            }`}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};