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
import { Maximize2, Minimize2, Grid, Layout, PhoneOff } from 'lucide-react';
import Peer, { MediaConnection } from 'peerjs';

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
  const [isAIActive, setIsAIActive] = useState(initialAIEnabled && !!apiKey);
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
  
  const peerRef = useRef<Peer | null>(null);
  // Keep track of active calls to handle track switching
  const callsRef = useRef<{[id: string]: MediaConnection}>({});

  // Initialize Media Stream
  useEffect(() => {
    initializeStream();
    return () => {
       if (videoCaptureInterval.current) window.clearInterval(videoCaptureInterval.current);
       if (captureVideoRef.current) captureVideoRef.current.srcObject = null;
       if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(t => t.stop());
       serviceRef.current?.disconnect();
       peerRef.current?.destroy();
    };
  }, [initializeStream]);

  // PeerJS Connection Logic
  useEffect(() => {
    if (!stream) return;

    // Destroy existing peer if any
    if (peerRef.current) peerRef.current.destroy();

    const hostPeerId = `gemini-class-host-${roomId}`;
    const myPeerId = isAdmin ? hostPeerId : undefined; 

    const peer = new Peer(myPeerId as string);
    peerRef.current = peer;

    peer.on('open', (id) => {
        console.log('My Peer ID:', id);
        
        if (!isAdmin) {
             const call = peer.call(hostPeerId, stream, {
                 metadata: { name: userName }
             });
             callsRef.current[hostPeerId] = call;
             
             call.on('stream', (hostStream) => {
                 setParticipants(prev => {
                     if (prev.find(p => p.id === hostPeerId)) return prev;
                     return [...prev, {
                         id: hostPeerId,
                         name: 'Host',
                         role: 'host',
                         isMuted: false,
                         isCamOn: true,
                         stream: hostStream,
                         connectionQuality: 'good'
                     }];
                 });
             });
        }
    });

    peer.on('call', (call) => {
        call.answer(stream);
        callsRef.current[call.peer] = call;
        
        const guestName = call.metadata?.name || 'Guest';
        const guestId = call.peer;

        call.on('stream', (remoteStream) => {
             setParticipants(prev => {
                 if (prev.find(p => p.id === guestId)) return prev;
                 return [...prev, {
                     id: guestId,
                     name: guestName,
                     role: 'participant',
                     isMuted: false,
                     isCamOn: true,
                     stream: remoteStream,
                     connectionQuality: 'good'
                 }];
             });
        });
    });

    peer.on('error', (err) => {
        console.warn("PeerJS error:", err);
    });

  }, [stream, isAdmin, roomId, userName]);


  // Initialize Gemini Service
  useEffect(() => {
    if (apiKey) {
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
    }
  }, [apiKey]);

  // Handle AI Activation/Deactivation
  useEffect(() => {
      const service = serviceRef.current;
      
      if (isAIActive && apiKey) {
          service?.connect();
          
          if (!privateChatRef.current) {
              try {
                  const ai = new GoogleGenAI({ apiKey });
                  privateChatRef.current = ai.chats.create({
                      model: 'gemini-2.5-flash',
                      config: { systemInstruction: "You are a helpful teaching assistant." }
                  });
              } catch (e) {
                  console.error("Failed to create private chat", e);
              }
          }

          setParticipants(prev => {
              if (!prev.some(p => p.role === 'ai')) {
                  return [{
                      id: 'ai-prof',
                      name: 'AI Assistant',
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
          service?.disconnect();
          privateChatRef.current = null;
          setParticipants(prev => prev.filter(p => p.role !== 'ai'));
          if (participants.length <= 1) setConnectionState(ConnectionState.DISCONNECTED);
      }
  }, [isAIActive, apiKey]);

  // Initial Participants Setup (Self)
  useEffect(() => {
    setParticipants(prev => {
        const others = prev.filter(p => !p.isSelf);
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
        const ai = others.find(p => p.role === 'ai');
        const realPeople = others.filter(p => p.role !== 'ai');
        
        return ai ? [ai, ...realPeople, selfParticipant] : [...realPeople, selfParticipant];
    });
  }, [userName, isAdmin, stream]);

  // Update Self Participant tracks when toggled
  useEffect(() => {
      setParticipants(prev => prev.map(p => {
          if (p.isSelf) {
              return { 
                  ...p, 
                  isMuted: !isAudioEnabled, 
                  isCamOn: isVideoEnabled,
              };
          }
          return p;
      }));
  }, [isAudioEnabled, isVideoEnabled]);

  const replaceVideoTrack = (newTrack: MediaStreamTrack) => {
      // Iterate over all active peer connections and replace the video sender's track
      Object.values(callsRef.current).forEach((call: any) => {
          if (call.peerConnection) {
              const senders = call.peerConnection.getSenders();
              const videoSender = senders.find((s: any) => s.track?.kind === 'video');
              if (videoSender) {
                  videoSender.replaceTrack(newTrack).catch((e: any) => console.error("Track replace error", e));
              }
          }
      });
  };

  const handleToggleScreenShare = async () => {
      if (activeTool === ActiveTool.SCREEN_SHARE) {
          // Stop Sharing
          if (screenStreamRef.current) {
              screenStreamRef.current.getTracks().forEach(t => t.stop());
              screenStreamRef.current = null;
          }
          
          // Switch back to camera track
          if (stream) {
             const camTrack = stream.getVideoTracks()[0];
             if (camTrack) replaceVideoTrack(camTrack);
          }
          
          setActiveTool(ActiveTool.NONE);
      } else {
          try {
              const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
              screenStreamRef.current = displayStream;
              
              const screenTrack = displayStream.getVideoTracks()[0];
              
              // Switch senders to screen track
              replaceVideoTrack(screenTrack);

              screenTrack.onended = () => {
                   // Auto revert when user stops sharing via browser UI
                   if (stream) {
                       const camTrack = stream.getVideoTracks()[0];
                       if (camTrack) replaceVideoTrack(camTrack);
                   }
                   setActiveTool(ActiveTool.NONE);
                   screenStreamRef.current = null;
              };
              
              setActiveTool(ActiveTool.SCREEN_SHARE);
          } catch (e) {
              console.error("Screen share cancelled", e);
          }
      }
  };

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
  
  // Handlers for Participant Actions (Pin, Mute, etc.) - same as before
  const handleToggleMuteParticipant = (id: string) => setParticipants(prev => prev.map(p => p.id === id ? { ...p, isMuted: !p.isMuted } : p));
  const handleToggleCamParticipant = (id: string) => setParticipants(prev => prev.map(p => p.id === id ? { ...p, isCamOn: !p.isCamOn } : p));
  const handleRemoveParticipant = (id: string) => setParticipants(prev => prev.filter(p => p.id !== id));
  const handleUpdatePermissions = (id: string, permissions: Partial<Participant['permissions']>) => setParticipants(prev => prev.map(p => p.id === id ? { ...p, permissions: { ...p.permissions, ...permissions } as Participant['permissions'] } : p));
  const handleTogglePin = (id: string) => {
      setPinnedParticipantId(prev => (prev === id ? null : id));
      setParticipants(prev => prev.map(p => ({ ...p, isPinned: p.id === id ? !p.isPinned : false })));
      if (pinnedParticipantId !== id) setLayoutMode(LayoutMode.SPEAKER); 
  };
  const handleToggleFullscreen = (id: string) => setFullscreenParticipantId(prev => (prev === id ? null : id));
  const handleToggleHand = () => setParticipants(prev => prev.map(p => p.isSelf ? { ...p, isHandRaised: !p.isHandRaised } : p));
  const handleReaction = (emoji: string) => {
      setParticipants(prev => prev.map(p => p.isSelf ? { ...p, reaction: emoji } : p));
      setTimeout(() => setParticipants(prev => prev.map(p => p.isSelf ? { ...p, reaction: undefined } : p)), 2500);
  };
  const handleToggleRecording = async () => {
    // Recording logic (simplified for brevity, assume implemented)
    setIsRecording(!isRecording);
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
          return { display: 'flex', flexDirection: 'column', gap: '8px' };
      }
      
      const count = visibleParticipants.length;
      if (count === 1) return { gridTemplateColumns: '1fr' };
      if (count === 2) return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr 1fr' };
      // Responsive Grid logic is handled by CSS classes generally, but here inline:
      // Mobile: prefer vertical stack or 2x2. Desktop: prefer horizontal.
      const isMobile = window.innerWidth < 768;
      
      if (isMobile) {
          if (count <= 2) return { gridTemplateRows: `repeat(${count}, 1fr)` };
          return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(auto-fit, 1fr)' };
      }

      if (count <= 2) return { gridTemplateColumns: `repeat(${count}, 1fr)` };
      if (count <= 4) return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
      return { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' };
  };

  return (
    <div className={`flex flex-col h-[100dvh] bg-[#202124] relative overflow-hidden transition-all duration-300 ${activeTool === ActiveTool.SCREEN_SHARE ? 'border-[4px] border-[#ea4335]' : ''}`}>
        
        {/* Top Header for Mobile - Zoom Style */}
        <div className="md:hidden absolute top-0 left-0 right-0 h-14 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-between px-4 pt-safe">
             <div className="flex items-center gap-2 text-white">
                 <button onClick={() => setIsSettingsOpen(true)}><Grid size={20} /></button>
                 <span className="text-sm font-medium">{roomId}</span>
             </div>
             <button 
                 onClick={onLeave} 
                 className="bg-[#ea4335] text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide"
             >
                 End
             </button>
        </div>

        {/* View Controls (Desktop Only) */}
        <div className="hidden md:flex absolute top-4 right-4 z-20 gap-2">
            {!fullscreenParticipantId && !pinnedParticipantId && activeTool !== ActiveTool.WHITEBOARD && (
                <div className="bg-black/60 backdrop-blur-md rounded-lg flex p-1 border border-white/10">
                    <button onClick={() => setLayoutMode(LayoutMode.GALLERY)} className={`p-1.5 rounded ${layoutMode === LayoutMode.GALLERY ? 'bg-[#3c4043] text-white' : 'text-gray-400'}`}><Grid size={18} /></button>
                    <button onClick={() => setLayoutMode(LayoutMode.SPEAKER)} className={`p-1.5 rounded ${layoutMode === LayoutMode.SPEAKER ? 'bg-[#3c4043] text-white' : 'text-gray-400'}`}><Layout size={18} /></button>
                </div>
            )}
            <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-md text-white text-sm font-medium border border-white/10 flex items-center gap-2">
                <span className="opacity-70">Room:</span>
                <span className="font-mono tracking-wide">{roomId}</span>
            </div>
        </div>

        {fullscreenParticipantId && (
            <button 
                onClick={() => setFullscreenParticipantId(null)}
                className="absolute top-16 md:top-4 left-4 z-50 bg-black/60 text-white p-2 rounded-lg backdrop-blur-md border border-white/20 flex items-center gap-2"
            >
                <Minimize2 size={16} /> <span className="text-sm">Exit</span>
            </button>
        )}

        {/* Modals */}
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            isAIEnabled={isAIActive} 
            onToggleAI={setIsAIActive} 
            hasApiKey={!!apiKey}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
            <div className={`flex-1 flex gap-4 h-full relative p-2 pt-14 md:pt-4 md:p-4 ${isChatOpen ? 'md:mr-96' : ''}`}>
                {activeTool === ActiveTool.WHITEBOARD ? (
                    <div className="w-full h-full">
                        <Whiteboard 
                            onCapture={handleWhiteboardCapture} 
                            onContextQuery={handleContextQuery}
                            isAIEnabled={isAIActive}
                            canDraw={participants.find(p => p.isSelf)?.permissions?.canDraw ?? false}
                        />
                    </div>
                ) : (
                    <div 
                        className="w-full h-full grid gap-2 transition-all duration-500"
                        style={getGridStyle()}
                    >
                        {(layoutMode === LayoutMode.SPEAKER || pinnedParticipantId) ? (
                             <>
                                <div className="relative w-full h-full row-span-full md:col-span-3">
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
                                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar md:h-full h-24 shrink-0">
                                    {visibleParticipants.slice(1).map(p => (
                                        <div key={p.id} className="w-32 md:w-full md:h-40 shrink-0 h-full">
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

        {/* Status Indicators */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-max">
            {connectionState === ConnectionState.CONNECTING && (
                <div className="bg-yellow-600/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg text-xs font-medium animate-pulse">
                    Connecting...
                </div>
            )}
            {activeTool === ActiveTool.SCREEN_SHARE && (
                <div className="bg-red-500/90 backdrop-blur text-white px-4 py-2 rounded-b-lg shadow-lg text-xs font-medium">
                    You are sharing your screen
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