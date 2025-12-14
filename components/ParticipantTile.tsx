import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, LogOut, Shield, Sparkles, Video, VideoOff, Hand, Pin, PinOff } from 'lucide-react';
import { Participant } from '../types';

interface ParticipantTileProps {
  participant: Participant;
  isAdminView?: boolean; // If true, enables admin controls on this tile
  onToggleMuteParticipant?: (id: string) => void;
  onToggleCamParticipant?: (id: string) => void;
  onRemoveParticipant?: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isAdminView,
  onToggleMuteParticipant,
  onToggleCamParticipant,
  onRemoveParticipant,
  onTogglePin
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { name, isSelf, stream, audioLevel = 0, isMuted, isCamOn, role, avatarColor, isHandRaised, isPinned, reaction } = participant;
  
  const isAi = role === 'ai';

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative w-full h-full bg-[#3c4043] rounded-xl overflow-hidden shadow-lg border transition-all duration-300 group ${isPinned ? 'border-[#8ab4f8] shadow-blue-500/20' : 'border-[#5f6368]'}`}>
      
      {/* Video / Content Layer */}
      {stream && isCamOn && !isAi ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isSelf} // Mute self locally
          playsInline
          className={`w-full h-full object-cover ${isSelf ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar / AI Visualizer */
        <div className="flex flex-col items-center justify-center gap-4 w-full h-full bg-[#202124]">
           {isAi ? (
             <div className="flex items-end gap-1 h-12">
                <div className="w-3 bg-[#4285f4] rounded-t-full transition-all duration-75" style={{ height: `${20 + audioLevel * 80}%` }}></div>
                <div className="w-3 bg-[#ea4335] rounded-t-full transition-all duration-75" style={{ height: `${30 + audioLevel * 60}%` }}></div>
                <div className="w-3 bg-[#fbbc04] rounded-t-full transition-all duration-75" style={{ height: `${40 + audioLevel * 100}%` }}></div>
                <div className="w-3 bg-[#34a853] rounded-t-full transition-all duration-75" style={{ height: `${25 + audioLevel * 70}%` }}></div>
             </div>
           ) : (
             <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-semibold text-white shadow-lg"
                style={{ backgroundColor: avatarColor || '#5f6368' }}
             >
                {name.charAt(0).toUpperCase()}
             </div>
           )}
        </div>
      )}
      
      {/* Floating Reaction */}
      {reaction && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounceAndFade z-40 drop-shadow-lg pointer-events-none">
              {reaction}
          </div>
      )}

      {/* Name Tag & Role Badge */}
      <div className="absolute bottom-4 left-4 bg-black/40 px-3 py-1.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 backdrop-blur-md border border-white/5 z-20 transition-all duration-300">
        <span className="truncate max-w-[140px] drop-shadow-sm">{name} {isSelf && "(You)"}</span>
        
        {role === 'host' && (
            <div className="flex items-center justify-center bg-blue-500/20 p-1 rounded-full" title="Meeting Host">
                <Shield size={14} className="text-blue-400" fill="currentColor" />
            </div>
        )}
        
        {isAi && (
            <div className="flex items-center justify-center bg-purple-500/20 p-1 rounded-full animate-pulse" title="AI Professor">
                <Sparkles size={14} className="text-purple-300" fill="currentColor" />
            </div>
        )}
      </div>

      {/* Hand Raised Indicator (Top Left) */}
      {isHandRaised && (
          <div className="absolute top-4 left-4 bg-[#fbbc04] text-[#202124] p-2 rounded-full shadow-md z-20 animate-pulse">
              <Hand size={20} />
          </div>
      )}

      {/* Pinned Indicator (Top Left, under hand if exists) */}
      {isPinned && (
          <div className={`absolute left-4 bg-[#8ab4f8] text-[#202124] p-1.5 rounded-full shadow-md z-20 ${isHandRaised ? 'top-16' : 'top-4'}`}>
              <Pin size={14} fill="currentColor" />
          </div>
      )}

      {/* Mute Indicator (Top Right) */}
      {(isMuted && !isAi) && (
        <div className="absolute top-4 right-4 bg-[#ea4335] p-2 rounded-full shadow-md z-10 border border-white/10">
           <MicOff size={16} className="text-white" />
        </div>
      )}

      {/* Admin Controls Overlay (Hover) */}
      {!isAi && (
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-sm z-30">
            {/* Pin Button (Everyone) */}
             <button 
                onClick={() => onTogglePin?.(participant.id)}
                className="p-4 rounded-full bg-[#3c4043] hover:bg-[#5f6368] text-white transition-all transform hover:scale-110 shadow-lg border border-gray-500"
                title={isPinned ? "Unpin" : "Pin participant"}
            >
                {isPinned ? <PinOff size={24} /> : <Pin size={24} />}
            </button>

            {isAdminView && !isSelf && (
                <>
                    <button 
                        onClick={() => onToggleMuteParticipant?.(participant.id)}
                        className={`p-4 rounded-full transition-all transform hover:scale-110 shadow-lg border ${
                            isMuted 
                            ? 'bg-[#34a853] hover:bg-[#34a853]/90 border-transparent text-white' // Green for Unmute
                            : 'bg-[#ea4335] hover:bg-[#d93025] border-red-400 text-white' // Red for Mute
                        }`}
                        title={isMuted ? "Unmute participant" : "Mute participant"}
                    >
                        {isMuted ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>
                    <button 
                        onClick={() => onToggleCamParticipant?.(participant.id)}
                        className={`p-4 rounded-full transition-all transform hover:scale-110 shadow-lg border ${
                            isCamOn 
                            ? 'bg-[#34a853] hover:bg-[#34a853]/90 border-transparent text-white' 
                            : 'bg-[#ea4335] hover:bg-[#d93025] border-red-400 text-white' 
                        }`}
                        title={isCamOn ? "Turn off camera" : "Turn on camera"}
                    >
                        {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
                    </button>
                    <button 
                        onClick={() => onRemoveParticipant?.(participant.id)}
                        className="p-4 rounded-full bg-[#3c4043] hover:bg-[#5f6368] text-white transition-all transform hover:scale-110 shadow-lg border border-gray-500"
                        title="Remove from class"
                    >
                        <LogOut size={24} />
                    </button>
                </>
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