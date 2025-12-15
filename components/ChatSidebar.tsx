import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Lock, Users, ChevronDown, User, Sparkles } from 'lucide-react';
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
    <div className="w-full md:w-96 bg-[#202124] border-l border-[#3c4043] flex flex-col h-full absolute right-0 top-0 z-20 shadow-2xl animate-slideLeft">
      <div className="p-4 border-b border-[#3c4043] flex items-center justify-between bg-[#202124]">
        <h2 className="text-white font-medium text-lg flex items-center gap-2">
            Messages
            <span className="bg-[#3c4043] text-xs px-2 py-0.5 rounded-full text-gray-300">{messages.length}</span>
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#3c4043]">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#202124]">
        <div className="bg-[#303134] p-3 rounded-lg text-xs text-gray-400 text-center border border-[#3c4043]">
            Messages are visible to everyone in the call, unless marked as private to Professor AI.
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} group`}>
            <div className="flex items-baseline gap-2 mb-1 px-1">
              <span className={`font-medium text-xs flex items-center gap-1 ${msg.sender === 'ai' ? 'text-purple-300' : 'text-gray-300'}`}>
                {msg.isPrivate && <Lock size={10} className="text-[#fbbc04]" />}
                {msg.sender === 'user' ? 'You' : (msg.sender === 'ai' ? 'Professor AI' : 'System')}
              </span>
              <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div className={`px-4 py-2.5 rounded-2xl max-w-[90%] text-sm leading-relaxed shadow-sm break-words ${
                msg.sender === 'system' ? 'bg-transparent text-gray-400 italic text-center w-full' :
                msg.isPrivate 
                    ? 'bg-[#3c4043] border border-[#fbbc04]/30 text-gray-100 rounded-tr-sm' 
                    : msg.sender === 'user' 
                        ? 'bg-[#8ab4f8] text-[#202124] font-medium rounded-tr-sm' 
                        : 'bg-[#303134] text-white border border-[#3c4043] rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#3c4043] bg-[#202124] shrink-0">
        {/* Recipient Selector */}
        <div className="flex items-center gap-2 mb-3">
            <button 
                onClick={() => isAIEnabled && setIsPrivateMode(false)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                    !isPrivateMode 
                    ? 'bg-[#8ab4f8]/10 border-[#8ab4f8]/30 text-[#8ab4f8]' 
                    : 'bg-transparent border-transparent text-gray-500 hover:bg-[#303134]'
                }`}
            >
                <Users size={12} /> Everyone
            </button>
            <button 
                onClick={() => isAIEnabled && setIsPrivateMode(true)}
                disabled={!isAIEnabled}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                    !isAIEnabled
                        ? 'opacity-50 cursor-not-allowed text-gray-600'
                        : isPrivateMode 
                            ? 'bg-[#fbbc04]/10 border-[#fbbc04]/30 text-[#fbbc04]' 
                            : 'bg-transparent border-transparent text-gray-500 hover:bg-[#303134]'
                }`}
            >
                {isPrivateMode ? <Lock size={12} /> : <Sparkles size={12} />} 
                Professor (Private)
            </button>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isPrivateMode ? "Ask privately..." : "Send a message..."}
            className={`w-full bg-[#303134] text-white rounded-full pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:ring-1 transition-all border border-transparent ${
                isPrivateMode ? 'focus:ring-[#fbbc04]/50 focus:border-[#fbbc04]/30 placeholder-gray-500' : 'focus:ring-[#8ab4f8]/50 focus:border-[#8ab4f8]/30'
            }`}
          />
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full disabled:text-gray-600 disabled:hover:bg-transparent transition-colors ${
                isPrivateMode ? 'text-[#fbbc04] hover:bg-[#fbbc04]/10' : 'text-[#8ab4f8] hover:bg-[#8ab4f8]/10'
            }`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};