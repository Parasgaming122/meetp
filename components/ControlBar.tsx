import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorOff, Hand, MessageSquare, PenTool, Settings, Circle, Smile, ChevronUp } from 'lucide-react';

interface ControlBarProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenShareOn: boolean;
  isWhiteboardOn: boolean;
  isChatOpen: boolean;
  isHandRaised: boolean;
  isRecording: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleWhiteboard: () => void;
  onToggleChat: () => void;
  onToggleHand: () => void;
  onToggleRecording: () => void;
  onTriggerReaction: (emoji: string) => void;
  onOpenSettings: () => void;
  onEndCall: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isMicOn,
  isCamOn,
  isScreenShareOn,
  isWhiteboardOn,
  isChatOpen,
  isHandRaised,
  isRecording,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleWhiteboard,
  onToggleChat,
  onToggleHand,
  onToggleRecording,
  onTriggerReaction,
  onOpenSettings,
  onEndCall
}) => {
  const [showReactions, setShowReactions] = useState(false);
  
  const buttonClass = "p-3 md:p-4 rounded-full transition-colors duration-200 flex items-center justify-center relative min-w-[3rem] md:min-w-[4rem]";
  const activeClass = "bg-[#3c4043] hover:bg-[#4a4e51] text-white";
  const inactiveClass = "bg-[#ea4335] hover:bg-[#d93025] text-white"; // Red for off
  const toggleActiveClass = "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"; // Blue for active tools
  
  const presentingClass = "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]";
  
  const reactions = ['💖', '👍', '🎉', '👏', '😂', '😮'];

  return (
    <div className="h-20 bg-[#202124] flex items-center justify-between px-2 md:px-6 border-t border-[#3c4043] relative z-50">
      <div className="hidden md:flex items-center text-white font-medium select-none">
        <span>10:00 AM</span>
        <span className="mx-3 text-[#5f6368]">|</span>
        <span>gen-ai-class-101</span>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2 md:gap-3 overflow-x-auto no-scrollbar px-2 w-full">
        <button 
          onClick={onToggleMic} 
          className={`${buttonClass} ${isMicOn ? activeClass : inactiveClass}`}
          title={`Turn ${isMicOn ? 'off' : 'on'} microphone (Ctrl+D)`}
        >
          {isMicOn ? <Mic size={20} className="md:w-6 md:h-6" /> : <MicOff size={20} className="md:w-6 md:h-6" />}
        </button>

        <button 
          onClick={onToggleCam} 
          className={`${buttonClass} ${isCamOn ? activeClass : inactiveClass}`}
          title={`Turn ${isCamOn ? 'off' : 'on'} camera (Ctrl+E)`}
        >
          {isCamOn ? <Video size={20} className="md:w-6 md:h-6" /> : <VideoOff size={20} className="md:w-6 md:h-6" />}
        </button>

        {/* Reactions */}
        <div className="relative">
            {showReactions && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#303134] p-2 rounded-full flex gap-2 shadow-xl border border-[#5f6368] animate-slideUp mb-2 z-50">
                    {reactions.map(emoji => (
                        <button 
                            key={emoji}
                            onClick={() => { onTriggerReaction(emoji); setShowReactions(false); }}
                            className="text-2xl hover:scale-125 transition-transform p-1"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
            <button 
                onClick={() => setShowReactions(!showReactions)}
                className={`${buttonClass} ${activeClass}`} 
                title="Send reaction"
            >
                <Smile size={20} className="md:w-6 md:h-6" />
                <ChevronUp size={14} className="ml-1 hidden md:block" />
            </button>
        </div>

        <button 
            onClick={onToggleHand}
            className={`${buttonClass} ${isHandRaised ? toggleActiveClass : activeClass}`} 
            title="Raise hand (Ctrl+H)"
        >
             <Hand size={20} className="md:w-6 md:h-6" />
        </button>

        <button 
            onClick={onToggleScreenShare}
            className={`${buttonClass} ${isScreenShareOn ? presentingClass : activeClass}`}
            title={isScreenShareOn ? "Stop presenting" : "Present now"}
        >
          {isScreenShareOn ? <MonitorOff size={20} className="md:w-6 md:h-6" /> : <MonitorUp size={20} className="md:w-6 md:h-6" />}
        </button>
        
        <button 
            onClick={onToggleWhiteboard}
            className={`${buttonClass} ${isWhiteboardOn ? toggleActiveClass : activeClass}`}
            title="Whiteboard"
        >
          <PenTool size={20} className="md:w-6 md:h-6" />
        </button>

        <button 
            onClick={onToggleRecording}
            className={`${buttonClass} ${activeClass} ${isRecording ? 'text-red-500 hover:text-red-400' : ''}`}
            title={isRecording ? "Stop Recording" : "Record Meeting"}
        >
            <Circle size={20} fill={isRecording ? "currentColor" : "none"} className={`md:w-6 md:h-6 ${isRecording ? "animate-pulse" : ""}`} />
        </button>
        
        <button 
            onClick={onOpenSettings}
            className={`${buttonClass} ${activeClass}`}
            title="Settings"
        >
          <Settings size={20} className="md:w-6 md:h-6" />
        </button>

        <button 
            onClick={onToggleChat}
            className={`${buttonClass} ${isChatOpen ? toggleActiveClass : activeClass} md:hidden`}
         >
            <MessageSquare size={20} />
         </button>

        <button 
          onClick={onEndCall} 
          className="p-3 md:p-4 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white flex items-center justify-center w-12 md:w-16 ml-2"
          title="Leave call"
        >
          <PhoneOff size={20} className="md:w-6 md:h-6" fill="currentColor" />
        </button>
      </div>

      <div className="hidden md:flex items-center gap-3">
         <button 
            onClick={onToggleChat}
            className={`${buttonClass} ${isChatOpen ? toggleActiveClass : 'text-white hover:bg-[#3c4043]'}`}
            title="Chat (Ctrl+C)"
         >
            <MessageSquare size={24} />
         </button>
      </div>
    </div>
  );
};