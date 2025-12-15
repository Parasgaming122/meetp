import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorOff, Hand, MessageSquare, PenTool, Settings, Circle, Smile, MoreVertical, X, Sparkles } from 'lucide-react';

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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const reactions = ['💖', '👍', '🎉', '👏', '😂', '😮'];

  // Base button styles
  const btnBase = "rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95";
  const desktopBtn = `${btnBase} p-3 min-w-[3.5rem] md:min-w-[4rem] h-12 md:h-14`;
  const mobileBtn = `${btnBase} flex-1 h-16 gap-1`;

  const activeColor = "bg-[#3c4043] hover:bg-[#4a4e51] text-white";
  const inactiveColor = "bg-[#ea4335] hover:bg-[#d93025] text-white";
  const mobileActiveText = "text-white";
  const mobileInactiveText = "text-gray-400";
  const toggleActiveColor = "bg-[#8ab4f8] text-[#202124]";

  const MobileMenuItem = ({ icon: Icon, label, onClick, isActive }: any) => (
      <button 
        onClick={() => { onClick(); setShowMobileMenu(false); }}
        className="flex items-center gap-4 w-full p-4 hover:bg-[#3c4043] rounded-lg transition-colors text-left"
      >
          <div className={`p-2 rounded-full ${isActive ? 'bg-[#8ab4f8] text-black' : 'bg-[#3c4043] text-gray-300'}`}>
              <Icon size={20} />
          </div>
          <span className="text-white font-medium text-sm">{label}</span>
      </button>
  );

  return (
    <>
        {/* Mobile "More" Menu (Bottom Sheet) */}
        {showMobileMenu && (
            <div className="fixed inset-0 z-[60] md:hidden">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
                <div className="absolute bottom-0 left-0 right-0 bg-[#202124] rounded-t-2xl p-4 animate-slideUp border-t border-[#3c4043] pb-safe">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-white font-semibold">More Options</span>
                        <button onClick={() => setShowMobileMenu(false)} className="p-1 text-gray-400"><X size={20} /></button>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                        <MobileMenuItem icon={MonitorUp} label={isScreenShareOn ? "Stop Screen Share" : "Share Screen"} onClick={onToggleScreenShare} isActive={isScreenShareOn} />
                        <MobileMenuItem icon={PenTool} label="Whiteboard" onClick={onToggleWhiteboard} isActive={isWhiteboardOn} />
                        <MobileMenuItem icon={Circle} label={isRecording ? "Stop Recording" : "Record Meeting"} onClick={onToggleRecording} isActive={isRecording} />
                        <MobileMenuItem icon={Settings} label="Settings" onClick={onOpenSettings} />
                    </div>
                    {/* Reactions Grid */}
                    <div className="mt-4 pt-4 border-t border-[#3c4043]">
                        <span className="text-xs text-gray-400 font-medium px-2 mb-3 block">REACTIONS</span>
                        <div className="flex justify-between px-2">
                            {reactions.map(emoji => (
                                <button key={emoji} onClick={() => { onTriggerReaction(emoji); setShowMobileMenu(false); }} className="text-2xl hover:scale-125 transition-transform">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Bar Container */}
        <div className="bg-[#202124] border-t border-[#3c4043] relative z-50 pb-safe">
            <div className="flex items-center justify-between px-2 md:px-6 h-16 md:h-20">
            
            {/* Desktop: Left Info */}
            <div className="hidden md:flex items-center text-white font-medium select-none min-w-[200px]">
                <span>10:00 AM</span>
                <span className="mx-3 text-[#5f6368]">|</span>
                <span className="text-gray-300">Classroom</span>
            </div>

            {/* Main Controls - Center */}
            <div className="flex-1 flex items-center justify-center md:gap-3 gap-0 w-full max-w-2xl mx-auto">
                
                {/* Mobile: Mute */}
                <button onClick={onToggleMic} className={`${mobileBtn} md:hidden group`}>
                     <div className={`p-2 rounded-full border ${isMicOn ? 'border-gray-500 text-white' : 'bg-[#ea4335] border-transparent text-white'}`}>
                        {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                     </div>
                     <span className="text-[10px] text-gray-400">Mic</span>
                </button>
                {/* Desktop: Mute */}
                <button onClick={onToggleMic} className={`${desktopBtn} ${isMicOn ? activeColor : inactiveColor} hidden md:flex`} title="Toggle Mic">
                    {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
                </button>


                {/* Mobile: Cam */}
                <button onClick={onToggleCam} className={`${mobileBtn} md:hidden group`}>
                    <div className={`p-2 rounded-full border ${isCamOn ? 'border-gray-500 text-white' : 'bg-[#ea4335] border-transparent text-white'}`}>
                        {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
                    </div>
                    <span className="text-[10px] text-gray-400">Cam</span>
                </button>
                {/* Desktop: Cam */}
                <button onClick={onToggleCam} className={`${desktopBtn} ${isCamOn ? activeColor : inactiveColor} hidden md:flex`} title="Toggle Cam">
                    {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
                </button>


                {/* Mobile: Hand */}
                <button onClick={onToggleHand} className={`${mobileBtn} md:hidden`}>
                    <div className={`p-2 rounded-full border ${isHandRaised ? 'bg-[#8ab4f8] text-black border-transparent' : 'border-gray-500 text-white'}`}>
                        <Hand size={20} />
                    </div>
                    <span className="text-[10px] text-gray-400">Hand</span>
                </button>
                {/* Desktop: Hand */}
                <button onClick={onToggleHand} className={`${desktopBtn} ${isHandRaised ? toggleActiveColor : activeColor} hidden md:flex`} title="Raise Hand">
                    <Hand size={20} />
                </button>


                {/* Mobile: Chat */}
                <button onClick={onToggleChat} className={`${mobileBtn} md:hidden`}>
                    <div className={`p-2 rounded-full border ${isChatOpen ? 'bg-[#8ab4f8] text-black border-transparent' : 'border-gray-500 text-white'}`}>
                        <MessageSquare size={20} />
                    </div>
                    <span className="text-[10px] text-gray-400">Chat</span>
                </button>


                {/* Desktop Tools */}
                <div className="hidden md:flex gap-3">
                     <button onClick={onToggleScreenShare} className={`${desktopBtn} ${isScreenShareOn ? toggleActiveColor : activeColor}`} title="Share Screen">
                        {isScreenShareOn ? <MonitorOff size={20} /> : <MonitorUp size={20} />}
                    </button>
                    <button onClick={onToggleWhiteboard} className={`${desktopBtn} ${isWhiteboardOn ? toggleActiveColor : activeColor}`} title="Whiteboard">
                        <PenTool size={20} />
                    </button>
                    <button onClick={() => setShowReactions(!showReactions)} className={`${desktopBtn} ${activeColor} relative`} title="Reactions">
                        <Smile size={20} />
                        {showReactions && (
                             <div className="absolute bottom-16 bg-[#303134] p-2 rounded-full flex gap-2 shadow-xl border border-[#5f6368] animate-slideUp">
                                {reactions.map(e => (
                                    <button key={e} onClick={(ev) => { ev.stopPropagation(); onTriggerReaction(e); setShowReactions(false); }} className="hover:scale-125 transition">
                                        {e}
                                    </button>
                                ))}
                             </div>
                        )}
                    </button>
                </div>


                {/* Mobile: More */}
                <button onClick={() => setShowMobileMenu(true)} className={`${mobileBtn} md:hidden`}>
                    <div className="p-2 rounded-full border border-gray-500 text-white">
                        <MoreVertical size={20} />
                    </div>
                    <span className="text-[10px] text-gray-400">More</span>
                </button>

            </div>

            {/* Desktop: Right Controls */}
            <div className="hidden md:flex items-center gap-3 min-w-[200px] justify-end">
                <button onClick={onToggleChat} className={`${desktopBtn} ${isChatOpen ? toggleActiveColor : activeColor}`}>
                    <MessageSquare size={20} />
                </button>
                <button onClick={onOpenSettings} className={`${desktopBtn} ${activeColor}`}>
                    <Settings size={20} />
                </button>
                <button onClick={onEndCall} className={`${desktopBtn} bg-[#ea4335] hover:bg-[#d93025] text-white w-20`}>
                    <PhoneOff size={24} />
                </button>
            </div>

            </div>
        </div>
    </>
  );
};