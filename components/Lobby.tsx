import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Settings, Sparkles, Video as VideoIcon, Keyboard, Copy, Check } from 'lucide-react';
import { generateRoomId } from '../utils/roomUtils';

interface LobbyProps {
  onJoin: (name: string, roomId: string, isAdmin: boolean, aiEnabled: boolean) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'start' | 'join'>('start'); // 'start' = new meeting, 'join' = enter code
  const [generatedRoomId, setGeneratedRoomId] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate a code on mount if user wants to start a meeting
    setGeneratedRoomId(generateRoomId());
  }, []);

  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error("Lobby stream error", e);
      }
    };
    startStream();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
      if (streamRef.current) {
          streamRef.current.getVideoTracks().forEach(t => t.enabled = isVideoOn);
          streamRef.current.getAudioTracks().forEach(t => t.enabled = isMicOn);
      }
  }, [isVideoOn, isMicOn]);

  const handleCopyCode = () => {
      navigator.clipboard.writeText(generatedRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleStartMeeting = () => {
      if (name) onJoin(name, generatedRoomId, true, aiEnabled);
  };

  const handleJoinMeeting = () => {
      if (name && roomId) onJoin(name, roomId, false, true); // Joiners inherit room settings typically, defaulting to true for now
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#202124] text-white p-6 font-sans">
      <div className="flex flex-col lg:flex-row gap-16 items-center max-w-6xl w-full">
        
        {/* Left: Configuration & Join Controls */}
        <div className="flex-1 flex flex-col items-center lg:items-start gap-8 w-full max-w-md">
            <div className="text-center lg:text-left space-y-2">
                <h1 className="text-4xl md:text-5xl font-normal tracking-tight">AI Classroom</h1>
                <p className="text-gray-400 text-lg md:text-xl">
                   Connect, learn, and collaborate with your AI Professor.
                </p>
            </div>

            <div className="w-full space-y-6">
                 {/* Name Input */}
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300 ml-1">Your Name</label>
                    <input 
                        type="text" 
                        placeholder="Enter your name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#3c4043] border border-transparent focus:border-[#8ab4f8] rounded-lg px-4 py-3 text-white text-lg placeholder-gray-500 outline-none transition-all shadow-sm"
                    />
                 </div>

                 {/* Mode Tabs */}
                 <div className="flex p-1 bg-[#303134] rounded-lg">
                    <button 
                        onClick={() => setMode('start')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'start' ? 'bg-[#202124] text-[#8ab4f8] shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        New Meeting
                    </button>
                    <button 
                        onClick={() => setMode('join')}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'join' ? 'bg-[#202124] text-[#8ab4f8] shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Join with Code
                    </button>
                 </div>

                 {/* Action Area */}
                 <div className="min-h-[140px]">
                    {mode === 'start' ? (
                        <div className="space-y-4 animate-fadeIn">
                             <div className="flex items-center justify-between bg-[#303134] p-3 rounded-lg border border-[#5f6368]">
                                 <span className="text-lg font-mono tracking-wider pl-2 text-gray-200">{generatedRoomId}</span>
                                 <button 
                                    onClick={handleCopyCode}
                                    className="p-2 hover:bg-[#3c4043] rounded text-[#8ab4f8] transition-colors"
                                    title="Copy meeting code"
                                 >
                                     {copied ? <Check size={20} /> : <Copy size={20} />}
                                 </button>
                             </div>
                             
                             {/* AI Toggle */}
                             <label className="flex items-center justify-between p-3 bg-[#303134] rounded-lg border border-[#5f6368] cursor-pointer hover:bg-[#3c4043] transition-colors">
                                <div className="flex items-center gap-3">
                                    <Sparkles className={aiEnabled ? "text-[#fbbc04]" : "text-gray-500"} size={20} />
                                    <span className="font-medium">Enable AI Professor</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${aiEnabled ? 'bg-[#8ab4f8]' : 'bg-[#5f6368]'}`}>
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </div>
                                <input type="checkbox" className="hidden" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} />
                             </label>

                             <button 
                                onClick={handleStartMeeting}
                                disabled={!name}
                                className="w-full bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa] disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors text-lg"
                             >
                                <VideoIcon size={20} />
                                Start Meeting
                             </button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="relative">
                                <Keyboard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="abc-defg-hij" 
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    className="w-full bg-[#303134] border border-[#5f6368] focus:border-[#8ab4f8] rounded-lg pl-12 pr-4 py-3 text-white outline-none transition-colors font-mono"
                                />
                            </div>
                            <button 
                                onClick={handleJoinMeeting}
                                disabled={!name || !roomId}
                                className="w-full bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa] disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-3 rounded-lg transition-colors text-lg"
                            >
                                Join Now
                            </button>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 w-full max-w-xl">
           <div className="relative aspect-video bg-[#202124] rounded-2xl overflow-hidden shadow-2xl border border-[#3c4043] group">
               <video 
                  ref={videoRef}
                  autoPlay 
                  muted 
                  className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${isVideoOn ? 'opacity-100' : 'opacity-0'}`}
               />
               
               {/* Video Off Placeholder */}
               <div className={`absolute inset-0 flex flex-col items-center justify-center bg-[#303134] transition-opacity duration-300 ${isVideoOn ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                   <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-4xl font-semibold text-white mb-4">
                       {name ? name.charAt(0).toUpperCase() : <VideoOff size={32} />}
                   </div>
                   <p className="text-gray-400">Camera is off</p>
               </div>

               {/* Overlay Controls */}
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-6 z-10">
                  <button 
                     onClick={() => setIsMicOn(!isMicOn)}
                     className={`p-4 rounded-full border transition-all duration-200 ${isMicOn ? 'bg-[#3c4043] border-transparent hover:bg-[#4a4e51] text-white shadow-lg' : 'bg-[#ea4335] border-[#ea4335] text-white shadow-lg'}`}
                  >
                      {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                  </button>
                  <button 
                     onClick={() => setIsVideoOn(!isVideoOn)}
                     className={`p-4 rounded-full border transition-all duration-200 ${isVideoOn ? 'bg-[#3c4043] border-transparent hover:bg-[#4a4e51] text-white shadow-lg' : 'bg-[#ea4335] border-[#ea4335] text-white shadow-lg'}`}
                  >
                      {isVideoOn ? <VideoIcon size={24} /> : <VideoOff size={24} />}
                  </button>
               </div>
               
               {/* Decorative Sparkle */}
               <div className="absolute top-6 right-6">
                   <Sparkles className="text-[#8ab4f8] animate-pulse" />
               </div>
               
               {/* Audio Visualizer (Simple) */}
               <div className="absolute bottom-6 right-6 flex gap-1 h-6 items-end">
                   {[1,2,3].map(i => (
                       <div key={i} className={`w-1 bg-[#34a853] rounded-t-full transition-all duration-100 ${isMicOn ? 'animate-bounce' : 'h-1'}`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                   ))}
               </div>
           </div>
           
           <div className="flex items-center justify-center gap-2 mt-6 text-[#9aa0a6] text-sm">
                <Settings size={16} />
                <span>Check your audio and video settings</span>
            </div>
        </div>

      </div>
    </div>
  );
};