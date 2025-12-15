import React, { useEffect, useState, useRef, useMemo } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { useMediaStream } from '../hooks/useMediaStream';
import { ControlBar } from './ControlBar';
import { ParticipantTile } from './ParticipantTile';
import { ChatSidebar } from './ChatSidebar';
import { Whiteboard } from './Whiteboard';
import { SettingsModal } from './SettingsModal';
import { ChatMessage, ConnectionState, ActiveTool, Participant, LayoutMode } from '../types';
import { GoogleGenAI, Chat } from "@google/genai";
import { Maximize2, Minimize2, Grid, Layout } from 'lucide-react';

interface ClassroomProps {
  apiKey: string;
  userName: string;
  roomId: string;
  isAdmin: boolean;
  initialAIEnabled: boolean;
  onLeave: () => void;
}

export const Classroom: React.FC<ClassroomProps> = ({ apiKey, userName, roomId, isAdmin, initialAIEnabled, onLeave }) => {
  const { stream, initializeStream, isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } = useMediaStream();
  
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeTool, setActiveTool] = useState<ActiveTool>(ActiveTool.NONE);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIActive, setIsAIActive] = useState(initialAIEnabled);
  const [isRecording, setIsRecording] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(LayoutMode.GALLERY);
  
  // Participants State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [fullscreenParticipantId, setFullscreenParticipantId] = useState<string | null>(null);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const privateChatRef = useRef<Chat | null>(null);
  const videoCaptureInterval = useRef<number | null>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Initialize Service Instance
  useEffect(() => {
    initializeStream();
    serviceRef.current = new GeminiLiveService(apiKey);
    
    const service = serviceRef.current;
    service.setCallbacks(
        () => {}, 
        (text, isUser, isFinal) => {
            if (text.trim().length === 0) return;
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.sender === (isUser ? 'user' : 'ai') && !isFinal && !lastMsg.isPrivate) {
                     return [...prev.slice(0, -1), { ...lastMsg, text: text }];
                }
                return [...prev, {
                    id: Date.now().toString(),
                    sender: isUser ? 'user' : 'ai',
                    text: text,
                    timestamp: new Date(),
                    isPrivate: false
                }];
            });
        },
        (status) => setConnectionState(status),
        (vol) => {
            setParticipants(prev => prev.map(p => p.role === 'ai' ? { ...p, audioLevel: vol } : p));
        }
    );

    return () => {
      service.disconnect();
      if (videoCaptureInterval.current) window.clearInterval(videoCaptureInterval.current);
      if (captureVideoRef.current) captureVideoRef.current.srcObject = null;
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [apiKey, initializeStream]);

  // Handle AI Activation/Deactivation
  useEffect(() => {
      const service = serviceRef.current;
      if (!service) return;

      if (isAIActive) {
          service.connect();
          const ai = new GoogleGenAI({ apiKey });
          privateChatRef.current = ai.chats.create({
              model: 'gemini-2.5-flash',
              config: { systemInstruction: "You are the private teaching assistant version of the professor. Answer concisely." }
          });

          setParticipants(prev => {
              if (!prev.some(p => p.role === 'ai')) {
                  return [{
                      id: 'ai-prof',
                      name: 'Professor Gemini',
                      role: 'ai',
                      isMuted: false,
                      isCamOn: true,
                      audioLevel: 0,
                      connectionQuality: 'good'
                  }, ...prev];
              }
              return prev;
          });
      } else {
          service.disconnect();
          privateChatRef.current = null;
          setParticipants(prev => prev.filter(p => p.role !== 'ai'));
          setConnectionState(ConnectionState.DISCONNECTED);
      }
  }, [isAIActive, apiKey]);

  // Initial Participants Setup
  useEffect(() => {
    const selfParticipant: Participant = {
        id: 'self',
        name: userName,
        role: isAdmin ? 'host' : 'participant',
        isMuted: !isAudioEnabled,
        isCamOn: isVideoEnabled,
        isSelf: true,
        stream: stream,
        permissions: { canDraw: isAdmin, canShareScreen: isAdmin },
        connectionQuality: 'good'
    };
    
    setParticipants(prev => {
        const existingAI = prev.find(p => p.role === 'ai');
        const others = prev.filter(p => p.role !== 'ai' && !p.isSelf);
        return existingAI ? [existingAI, ...others, selfParticipant] : [...others, selfParticipant];
    });
  }, [userName, isAdmin]); 

  // Update Self Participant
  useEffect(() => {
      setParticipants(prev => prev.map(p => {
          if (p.isSelf) {
              let effectiveStream = stream;
              if (activeTool === ActiveTool.SCREEN_SHARE && screenStreamRef.current) {
                  const videoTrack = screenStreamRef.current.getVideoTracks()[0];
                  const audioTracks = stream?.getAudioTracks() || [];
                  if (videoTrack) effectiveStream = new MediaStream([videoTrack, ...audioTracks]);
              }
              return { 
                  ...p, 
                  stream: effectiveStream,
                  isMuted: !isAudioEnabled, 
                  isCamOn: isVideoEnabled,
              };
          }
          return p;
      }));
  }, [stream, isAudioEnabled, isVideoEnabled, activeTool]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'd': e.preventDefault(); toggleAudio(); break;
                case 'e': e.preventDefault(); toggleVideo(); break;
                case 'h': e.preventDefault(); handleToggleHand(); break;
                case 'c': e.preventDefault(); setIsChatOpen(prev => !prev); break;
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAudio, toggleVideo]);

  // Video Capture Logic
  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED && isAIActive) {
       if (stream) serviceRef.current?.startAudioStream(stream);
       
       if (activeTool === ActiveTool.SCREEN_SHARE && screenStreamRef.current) {
           startVideoCapture(screenStreamRef.current);
       } else if (activeTool === ActiveTool.NONE && stream) {
           startVideoCapture(stream);
       } else {
           if (videoCaptureInterval.current) {
               window.clearInterval(videoCaptureInterval.current);
               videoCaptureInterval.current = null;
           }
       }
    }
  }, [stream, connectionState, activeTool, isAIActive]);

  const startVideoCapture = (mediaStream: MediaStream) => {
      if (videoCaptureInterval.current) window.clearInterval(videoCaptureInterval.current);
      
      let video = captureVideoRef.current;
      if (!video) {
          video = document.createElement('video');
          video.autoplay = true;
          video.playsInline = true;
          video.muted = true;
          video.style.display = 'none';
          captureVideoRef.current = video;
      }
      
      video.srcObject = mediaStream;
      video.play().catch(e => console.warn("Frame capture video play error:", e));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      videoCaptureInterval.current = window.setInterval(() => {
         if (!serviceRef.current || !video || video.readyState < 2) return;
         try {
             const targetWidth = 640;
             const scale = Math.min(1, targetWidth / video.videoWidth);
             canvas.width = video.videoWidth * scale;
             canvas.height = video.videoHeight * scale;
             ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
             const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
             serviceRef.current.sendVideoFrame(base64);
         } catch (e) {}
      }, 1000);
  };

  const handleToggleScreenShare = async () => {
      if (activeTool === ActiveTool.SCREEN_SHARE) {
          if (screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach(t => t.stop());
              screenStreamRef.current = null;
          }
          setActiveTool(ActiveTool.NONE);
      } else {
          try {
              const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
              screenStreamRef.current = displayStream;
              displayStream.getVideoTracks()[0].onended = () => {
                  setActiveTool(ActiveTool.NONE);
                  screenStreamRef.current = null;
              };
              setActiveTool(ActiveTool.SCREEN_SHARE);
          } catch (e) {
              console.error("Screen share cancelled", e);
          }
      }
  };

  const handleToggleMuteParticipant = (id: string) => {
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, isMuted: !p.isMuted } : p));
  };

  const handleToggleCamParticipant = (id: string) => {
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, isCamOn: !p.isCamOn } : p));
  };

  const handleRemoveParticipant = (id: string) => {
      setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePermissions = (id: string, permissions: Partial<Participant['permissions']>) => {
      setParticipants(prev => prev.map(p => p.id === id ? { ...p, permissions: { ...p.permissions, ...permissions } as Participant['permissions'] } : p));
  };

  const handleTogglePin = (id: string) => {
      setPinnedParticipantId(prev => (prev === id ? null : id));
      setParticipants(prev => prev.map(p => ({ ...p, isPinned: p.id === id ? !p.isPinned : false })));
      if (pinnedParticipantId !== id) setLayoutMode(LayoutMode.SPEAKER); // Auto switch to speaker mode on pin
  };

  const handleToggleFullscreen = (id: string) => {
      setFullscreenParticipantId(prev => (prev === id ? null : id));
  }

  const handleToggleHand = () => {
      setParticipants(prev => prev.map(p => p.isSelf ? { ...p, isHandRaised: !p.isHandRaised } : p));
  };

  const handleReaction = (emoji: string) => {
      setParticipants(prev => prev.map(p => p.isSelf ? { ...p, reaction: emoji } : p));
      setTimeout(() => setParticipants(prev => prev.map(p => p.isSelf ? { ...p, reaction: undefined } : p)), 2500);
  };

  const handleToggleRecording = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: true });
              const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
              mediaRecorderRef.current = recorder;
              recordedChunksRef.current = [];

              recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
              recorder.onstop = () => {
                  const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `recording-${new Date().toISOString()}.webm`; a.click();
                  stream.getTracks().forEach(t => t.stop());
              };

              recorder.start();
              setIsRecording(true);
              stream.getVideoTracks()[0].onended = () => { setIsRecording(false); recorder.stop(); };
          } catch (e) { console.error("Rec error", e); setIsRecording(false); }
      }
  };

  const handleSendMessage = async (text: string, isPrivate: boolean) => {
      const newMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text, timestamp: new Date(), isPrivate };
      setMessages(prev => [...prev, newMsg]);

      if (isPrivate && isAIActive && privateChatRef.current) {
          try {
              const response = await privateChatRef.current.sendMessage({ message: text });
              setMessages(prev => [...prev, { id: Date.now().toString() + '_ai', sender: 'ai', text: response.text || "...", timestamp: new Date(), isPrivate: true }]);
          } catch (e) {}
      }
  };

  const handleWhiteboardCapture = (base64: string) => { if (isAIActive) serviceRef.current?.sendVideoFrame(base64); };
  
  const handleContextQuery = (query: string, imageData: string) => {
      if (!isAIActive) return;
      serviceRef.current?.sendVideoFrame(imageData);
      setTimeout(() => {
          serviceRef.current?.sendText(`I am pointing at the whiteboard. ${query}`);
          setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: `(Pointed at board) ${query}`, timestamp: new Date(), isPrivate: false }]);
      }, 200);
  };

  // Optimized View Logic
  const visibleParticipants = useMemo(() => {
      if (fullscreenParticipantId) return participants.filter(p => p.id === fullscreenParticipantId);
      if (pinnedParticipantId) return [
          ...participants.filter(p => p.id === pinnedParticipantId),
          ...participants.filter(p => p.id !== pinnedParticipantId)
      ];
      return participants;
  }, [participants, fullscreenParticipantId, pinnedParticipantId]);

  const getGridStyle = () => {
      if (fullscreenParticipantId) return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
      if (pinnedParticipantId || layoutMode === LayoutMode.SPEAKER) {
          return {
             display: 'grid',
             gridTemplateColumns: '3fr 1fr',
             gridTemplateRows: '1fr',
             gap: '1rem'
          };
      }
      
      const count = visibleParticipants.length;
      if (count === 1) return { gridTemplateColumns: '1fr' };
      if (count === 2) return { gridTemplateColumns: '1fr 1fr' };
      if (count <= 4) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
      if (count <= 6) return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' };
      if (count <= 9) return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' };
      return { gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' };
  };

  return (
    <div className={`flex flex-col h-screen bg-[#202124] relative overflow-hidden transition-all duration-300 ${activeTool === ActiveTool.SCREEN_SHARE ? 'border-[4px] border-[#ea4335]' : ''} ${isRecording ? 'border-[4px] border-red-500/50' : ''}`}>
        
        {/* Indicators */}
        {activeTool === ActiveTool.SCREEN_SHARE && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#ea4335] text-white px-4 py-1 rounded-b-lg font-medium shadow-lg z-50 animate-slideDown text-sm whitespace-nowrap">
                You are sharing your screen
            </div>
        )}
        {isRecording && (
            <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-md shadow-lg animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-white text-[10px] font-bold uppercase tracking-wider">Rec</span>
            </div>
        )}

        {/* Modals */}
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} isAIEnabled={isAIActive} onToggleAI={setIsAIActive} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-2 md:p-4 min-h-0 relative">
            <div className={`flex-1 flex gap-4 transition-all duration-300 ${isChatOpen ? 'md:mr-96' : ''} h-full relative`}>
                
                {/* View Controls */}
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                    {/* Layout Toggle */}
                    {!fullscreenParticipantId && !pinnedParticipantId && activeTool !== ActiveTool.WHITEBOARD && (
                        <div className="bg-black/60 backdrop-blur-md rounded-lg flex p-1 border border-white/10">
                            <button 
                                onClick={() => setLayoutMode(LayoutMode.GALLERY)}
                                className={`p-1.5 rounded ${layoutMode === LayoutMode.GALLERY ? 'bg-[#3c4043] text-white' : 'text-gray-400 hover:text-white'}`}
                                title="Gallery View"
                            >
                                <Grid size={18} />
                            </button>
                            <button 
                                onClick={() => setLayoutMode(LayoutMode.SPEAKER)}
                                className={`p-1.5 rounded ${layoutMode === LayoutMode.SPEAKER ? 'bg-[#3c4043] text-white' : 'text-gray-400 hover:text-white'}`}
                                title="Speaker View"
                            >
                                <Layout size={18} />
                            </button>
                        </div>
                    )}
                    
                    <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-md text-white text-xs md:text-sm font-medium border border-white/10 flex items-center gap-2 pointer-events-none">
                        <span className="opacity-70">Room:</span>
                        <span className="font-mono tracking-wide">{roomId}</span>
                    </div>
                </div>

                {fullscreenParticipantId && (
                    <button 
                        onClick={() => setFullscreenParticipantId(null)}
                        className="absolute top-4 left-4 z-50 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-md border border-white/20 flex items-center gap-2 transition-all"
                    >
                        <Minimize2 size={16} />
                        <span className="text-sm font-medium">Exit Fullscreen</span>
                    </button>
                )}

                {activeTool === ActiveTool.WHITEBOARD ? (
                    <div className="w-full h-full pt-0 md:pt-12">
                        <Whiteboard 
                            onCapture={handleWhiteboardCapture} 
                            onContextQuery={handleContextQuery}
                            isAIEnabled={isAIActive}
                            canDraw={participants.find(p => p.isSelf)?.permissions?.canDraw ?? false}
                        />
                    </div>
                ) : (
                    <div 
                        className="w-full h-full grid gap-2 md:gap-4 pt-0 md:pt-12 transition-all duration-500"
                        style={getGridStyle()}
                    >
                        {(layoutMode === LayoutMode.SPEAKER || pinnedParticipantId) ? (
                             <>
                                {/* Main Stage */}
                                <div className="relative w-full h-full row-span-full">
                                    <ParticipantTile 
                                        participant={visibleParticipants[0]}
                                        isAdminView={isAdmin}
                                        isFullscreen={visibleParticipants[0].id === fullscreenParticipantId}
                                        onToggleMuteParticipant={handleToggleMuteParticipant}
                                        onToggleCamParticipant={handleToggleCamParticipant}
                                        onRemoveParticipant={handleRemoveParticipant}
                                        onTogglePin={handleTogglePin}
                                        onToggleFullscreen={handleToggleFullscreen}
                                        onUpdatePermissions={handleUpdatePermissions}
                                    />
                                </div>
                                {/* Sidebar for others */}
                                <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar max-h-full">
                                    {visibleParticipants.slice(1).map(p => (
                                        <div key={p.id} className="h-40 shrink-0">
                                            <ParticipantTile 
                                                participant={p}
                                                isAdminView={isAdmin}
                                                onTogglePin={handleTogglePin}
                                            />
                                        </div>
                                    ))}
                                </div>
                             </>
                        ) : (
                            // Gallery Grid
                            visibleParticipants.map((p) => (
                                <ParticipantTile 
                                    key={p.id}
                                    participant={p}
                                    isAdminView={isAdmin}
                                    isFullscreen={p.id === fullscreenParticipantId}
                                    onToggleMuteParticipant={handleToggleMuteParticipant}
                                    onToggleCamParticipant={handleToggleCamParticipant}
                                    onRemoveParticipant={handleRemoveParticipant}
                                    onTogglePin={handleTogglePin}
                                    onToggleFullscreen={handleToggleFullscreen}
                                    onUpdatePermissions={handleUpdatePermissions}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            <ChatSidebar 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)}
                messages={messages}
                onSendMessage={handleSendMessage}
                isAIEnabled={isAIActive}
            />
        </div>

        <div className="absolute top-16 md:top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-max">
            {connectionState === ConnectionState.CONNECTING && (
                <div className="bg-yellow-600/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-pulse">
                    Connecting to Class...
                </div>
            )}
            {connectionState === ConnectionState.ERROR && (
                <div className="bg-red-600/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
                    Connection Error. Please refresh.
                </div>
            )}
        </div>

        <ControlBar 
            isMicOn={isAudioEnabled}
            isCamOn={isVideoEnabled}
            isScreenShareOn={activeTool === ActiveTool.SCREEN_SHARE}
            isWhiteboardOn={activeTool === ActiveTool.WHITEBOARD}
            isChatOpen={isChatOpen}
            isHandRaised={participants.find(p => p.isSelf)?.isHandRaised || false}
            isRecording={isRecording}
            onToggleMic={toggleAudio}
            onToggleCam={toggleVideo}
            onToggleScreenShare={handleToggleScreenShare}
            onToggleWhiteboard={() => {
                if (activeTool === ActiveTool.SCREEN_SHARE) handleToggleScreenShare();
                setActiveTool(activeTool === ActiveTool.WHITEBOARD ? ActiveTool.NONE : ActiveTool.WHITEBOARD);
            }}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onToggleHand={handleToggleHand}
            onToggleRecording={handleToggleRecording}
            onTriggerReaction={handleReaction}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onEndCall={onLeave}
        />
    </div>
  );
};