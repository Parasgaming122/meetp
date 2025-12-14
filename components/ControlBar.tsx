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
  
  const buttonClass = "p-4 rounded-full transition-colors duration-200 flex items-center justify-center relative";
  const activeClass = "bg-[#3c4043] hover:bg-[#4a4e51] text-white";
  const inactiveClass = "bg-[#ea4335] hover:bg-[#d93025] text-white"; // Red for off
  const toggleActiveClass = "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"; // Blue for active tools
  
  // Specific style for screen share active (Presenting)
  const presentingClass = "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]";
  
  const reactions = ['💖', '👍', '🎉', '👏', '😂', '😮'];

  return (
    <div className="h-20 bg-[#202124] flex items-center justify-between px-6 border-t border-[#3c4043] relative z-50">
      <div className="flex items-center text-white font-medium select-none">
        <span>10:00 AM</span>
        <span className="mx-3 text-[#5f6368]">|</span>
        <span>gen-ai-class-101</span>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleMic} 
          className={`${buttonClass} ${isMicOn ? activeClass : inactiveClass}`}
          title={isMicOn ? "Turn off microphone" : "Turn on microphone"}
        >
          {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
        </button>

        <button 
          onClick={onToggleCam} 
          className={`${buttonClass} ${isCamOn ? activeClass : inactiveClass}`}
          title={isCamOn ? "Turn off camera" : "Turn on camera"}
        >
          {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
        </button>

        {/* Reactions */}
        <div className="relative">
            {showReactions && (
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#303134] p-2 rounded-full flex gap-2 shadow-xl border border-[#5f6368] animate-slideUp mb-2">
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
                <Smile size={24} />
                <ChevronUp size={14} className="ml-1" />
            </button>
        </div>

        <button 
            onClick={onToggleHand}
            className={`${buttonClass} ${isHandRaised ? toggleActiveClass : activeClass}`} 
            title="Raise hand"
        >
             <Hand size={24} />
        </button>

        <button 
            onClick={onToggleScreenShare}
            className={`${buttonClass} ${isScreenShareOn ? presentingClass : activeClass}`}
            title={isScreenShareOn ? "Stop presenting" : "Present now"}
        >
          {isScreenShareOn ? <MonitorOff size={24} /> : <MonitorUp size={24} />}
        </button>
        
        <button 
            onClick={onToggleWhiteboard}
            className={`${buttonClass} ${isWhiteboardOn ? toggleActiveClass : activeClass}`}
            title="Whiteboard"
        >
          <PenTool size={24} />
        </button>

        <button 
            onClick={onToggleRecording}
            className={`${buttonClass} ${activeClass} ${isRecording ? 'text-red-500 hover:text-red-400' : ''}`}
            title={isRecording ? "Stop Recording" : "Record Meeting"}
        >
            <Circle size={24} fill={isRecording ? "currentColor" : "none"} className={isRecording ? "animate-pulse" : ""} />
        </button>
        
        <button 
            onClick={onOpenSettings}
            className={`${buttonClass} ${activeClass}`}
            title="Settings"
        >
          <Settings size={24} />
        </button>

        <button 
          onClick={onEndCall} 
          className="p-4 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white flex items-center justify-center w-16 ml-2"
          title="Leave call"
        >
          <PhoneOff size={24} fill="currentColor" />
        </button>
      </div>

      <div className="flex items-center gap-3">
         <button 
            onClick={onToggleChat}
            className={`${buttonClass} ${isChatOpen ? toggleActiveClass : 'text-white hover:bg-[#3c4043]'}`}
         >
            <MessageSquare size={24} />
         </button>
      </div>
    </div>
  );
};