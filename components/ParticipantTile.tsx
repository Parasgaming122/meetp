import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, LogOut, Shield, Sparkles, Video, VideoOff, Hand, Pin, PinOff, Maximize2, Minimize2, MoreVertical, PenTool, Wifi } from 'lucide-react';
import { Participant } from '../types';

interface ParticipantTileProps {
  participant: Participant;
  isAdminView?: boolean;
  isFullscreen?: boolean;
  onToggleMuteParticipant?: (id: string) => void;
  onToggleCamParticipant?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onToggleFullscreen?: (id: string) => void;
  onUpdatePermissions?: (id: string, permissions: Partial<Participant['permissions']>) => void;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isAdminView,
  isFullscreen,
  onToggleMuteParticipant,
  onToggleCamParticipant,
  onRemoveParticipant,
  onTogglePin,
  onToggleFullscreen,
  onUpdatePermissions
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const { name, isSelf, stream, audioLevel = 0, isMuted, isCamOn, role, avatarColor, isHandRaised, isPinned, reaction, permissions, connectionQuality } = participant;
  
  const isAi = role === 'ai';

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleInteraction = () => {
    setShowControls(prev => !prev);
    if (!showControls) {
        setTimeout(() => {
            if (!showAdminMenu) setShowControls(false);
        }, 3000);
    }
  };

  return (
    <div 
        className={`relative w-full h-full bg-[#3c4043] rounded-xl overflow-hidden shadow-lg border transition-all duration-300 group ${isPinned ? 'border-[#8ab4f8] shadow-blue-500/20' : 'border-[#5f6368]'}`}
        onClick={handleInteraction}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => { if(!showAdminMenu) setShowControls(false); }}
    >
      
      {/* Video / Content Layer */}
      {stream && isCamOn && !isAi ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isSelf}
          playsInline
          className={`w-full h-full object-cover ${isSelf && !participant.isPinned ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar / AI Visualizer */
        <div className="flex flex-col items-center justify-center gap-4 w-full h-full bg-[#202124]">
           {isAi ? (
             <div className="flex items-end gap-1 h-8 md:h-12">
                <div className="w-2 md:w-3 bg-[#4285f4] rounded-t-full transition-all duration-75" style={{ height: `${20 + audioLevel * 80}%` }}></div>
                <div className="w-2 md:w-3 bg-[#ea4335] rounded-t-full transition-all duration-75" style={{ height: `${30 + audioLevel * 60}%` }}></div>
                <div className="w-2 md:w-3 bg-[#fbbc04] rounded-t-full transition-all duration-75" style={{ height: `${40 + audioLevel * 100}%` }}></div>
                <div className="w-2 md:w-3 bg-[#34a853] rounded-t-full transition-all duration-75" style={{ height: `${25 + audioLevel * 70}%` }}></div>
             </div>
           ) : (
             <div 
                className="w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center text-2xl md:text-4xl font-semibold text-white shadow-lg select-none"
                style={{ backgroundColor: avatarColor || '#5f6368' }}
             >
                {name.charAt(0).toUpperCase()}
             </div>
           )}
        </div>
      )}
      
      {/* Floating Reaction */}
      {reaction && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl md:text-6xl animate-bounceAndFade z-40 drop-shadow-lg pointer-events-none">
              {reaction}
          </div>
      )}

      {/* Name Tag & Badges */}
      <div className={`absolute bottom-2 left-2 md:bottom-4 md:left-4 right-14 bg-black/40 px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-white text-xs md:text-sm font-medium flex items-center gap-2 backdrop-blur-md border border-white/5 z-20 transition-all duration-300 ${showControls ? 'opacity-0' : 'opacity-100'}`}>
        <span className="truncate drop-shadow-sm max-w-[100px] md:max-w-none">{name} {isSelf && "(You)"}</span>
        
        {role === 'host' && (
            <div className="flex items-center justify-center bg-blue-500/20 p-0.5 rounded-full shrink-0" title="Host">
                <Shield size={10} className="text-blue-400" fill="currentColor" />
            </div>
        )}
        
        {isAi && (
            <div className="flex items-center justify-center bg-purple-500/20 p-0.5 rounded-full shrink-0 animate-pulse" title="AI Assistant">
                <Sparkles size={10} className="text-purple-300" fill="currentColor" />
            </div>
        )}

        {/* Connection Quality */}
        {!isAi && connectionQuality && (
            <div className="ml-auto hidden md:block" title={`Connection: ${connectionQuality}`}>
                <Wifi size={12} className={`${connectionQuality === 'good' ? 'text-green-400' : connectionQuality === 'fair' ? 'text-yellow-400' : 'text-red-400'}`} />
            </div>
        )}
      </div>

      {/* Top Indicators */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-2 z-20">
          {isHandRaised && (
              <div className="bg-[#fbbc04] text-[#202124] p-1.5 md:p-2 rounded-full shadow-md animate-pulse">
                  <Hand size={16} className="md:w-5 md:h-5" />
              </div>
          )}
          {isPinned && !isFullscreen && (
              <div className="bg-[#8ab4f8] text-[#202124] p-1 md:p-1.5 rounded-full shadow-md">
                  <Pin size={12} className="md:w-3.5 md:h-3.5" fill="currentColor" />
              </div>
          )}
      </div>

      {/* Top Right Indicators */}
      <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col gap-2 z-20">
          {(isMuted && !isAi) && (
            <div className="bg-[#ea4335] p-1.5 md:p-2 rounded-full shadow-md border border-white/10">
               <MicOff size={14} className="text-white md:w-4 md:h-4" />
            </div>
          )}
      </div>

      {/* Controls Overlay */}
      {!isAi && (
        <div className={`absolute inset-0 bg-black/60 transition-opacity duration-200 flex items-center justify-center gap-2 md:gap-4 backdrop-blur-[2px] z-30 ${showControls || showAdminMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
             <button 
                onClick={(e) => { e.stopPropagation(); onTogglePin?.(participant.id); }}
                className="p-3 md:p-4 rounded-full bg-[#3c4043] hover:bg-[#5f6368] text-white transition-all transform active:scale-95 shadow-lg border border-gray-500"
            >
                {isPinned ? <PinOff size={20} /> : <Pin size={20} />}
            </button>

            <button 
                onClick={(e) => { e.stopPropagation(); onToggleFullscreen?.(participant.id); }}
                className="hidden md:block p-3 md:p-4 rounded-full bg-[#3c4043] hover:bg-[#5f6368] text-white transition-all transform active:scale-95 shadow-lg border border-gray-500"
            >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>

            {isAdminView && !isSelf && (
                <div className="relative">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowAdminMenu(!showAdminMenu); }}
                        className="p-3 md:p-4 rounded-full bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124] transition-all transform active:scale-95 shadow-lg border border-transparent"
                    >
                        <MoreVertical size={20} />
                    </button>
                    
                    {/* Admin Dropdown */}
                    {showAdminMenu && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[#303134] border border-[#5f6368] rounded-lg shadow-xl overflow-hidden animate-fadeIn flex flex-col z-50">
                             <button 
                                onClick={(e) => { e.stopPropagation(); onToggleMuteParticipant?.(participant.id); setShowAdminMenu(false); }}
                                className="px-4 py-3 text-left text-sm text-white hover:bg-[#3c4043] flex items-center gap-2"
                             >
                                 {isMuted ? <Mic size={16} className="text-green-400" /> : <MicOff size={16} className="text-red-400" />}
                                 {isMuted ? "Unmute Audio" : "Mute Audio"}
                             </button>
                             <div className="h-px bg-[#5f6368] my-1"></div>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveParticipant?.(participant.id); setShowAdminMenu(false); }}
                                className="px-4 py-3 text-left text-sm text-red-400 hover:bg-[#3c4043] flex items-center gap-2"
                             >
                                 <LogOut size={16} />
                                 Remove User
                             </button>
                        </div>
                    )}
                </div>
            )}
        </div>
      )}
      
      {/* Speaking Border */}
      {audioLevel > 0.05 && !isMuted && (
        <div className="absolute inset-0 border-4 border-[#8ab4f8] rounded-xl z-10 pointer-events-none transition-opacity duration-150"></div>
      )}
    </div>
  );
};