import React from 'react';
import { X, Sparkles, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAIEnabled: boolean;
  onToggleAI: (enabled: boolean) => void;
  hasApiKey: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  isAIEnabled, 
  onToggleAI,
  hasApiKey
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#303134] w-full max-w-md rounded-2xl shadow-2xl border border-[#5f6368] overflow-hidden transform transition-all scale-100">
        <div className="p-6 border-b border-[#5f6368] flex items-center justify-between">
            <h2 className="text-xl font-medium text-white flex items-center gap-2">
                <Cpu size={24} className="text-[#8ab4f8]" />
                Classroom Settings
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>
        
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-white font-medium flex items-center gap-2">
                        <Sparkles size={16} className="text-[#fbbc04]" />
                        AI Features
                    </h3>
                    <p className="text-sm text-gray-400">
                        Enable Professor Gemini, real-time feedback, and smart whiteboard tools.
                    </p>
                </div>
                
                <label className={`relative inline-flex items-center cursor-pointer mt-1 ${!hasApiKey ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isAIEnabled}
                        onChange={(e) => hasApiKey && onToggleAI(e.target.checked)}
                        disabled={!hasApiKey}
                    />
                    <div className="w-11 h-6 bg-[#5f6368] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8ab4f8]"></div>
                </label>
            </div>

            {hasApiKey ? (
                !isAIEnabled && (
                    <div className="bg-[#ea4335]/10 border border-[#ea4335]/30 rounded-lg p-3 text-sm text-[#ea4335]">
                        Disabling AI features will remove the AI Professor from the call and disable smart whiteboard queries.
                    </div>
                )
            ) : (
                <div className="bg-[#fbbc04]/10 border border-[#fbbc04]/30 rounded-lg p-3 text-sm text-[#fbbc04]">
                    AI features are unavailable because no API Key was provided when joining. Reload to add a key.
                </div>
            )}
        </div>

        <div className="p-4 bg-[#202124] border-t border-[#5f6368] flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa] font-medium rounded-lg transition-colors"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};