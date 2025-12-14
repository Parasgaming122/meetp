import React, { useEffect, useState, useRef } from 'react';
import { GeminiLiveService } from '../services/geminiLiveService';
import { useMediaStream } from '../hooks/useMediaStream';
import { ControlBar } from './ControlBar';
import { ParticipantTile } from './ParticipantTile';
import { ChatSidebar } from './ChatSidebar';
import { Whiteboard } from './Whiteboard';
import { SettingsModal } from './SettingsModal';
import { ChatMessage, ConnectionState, ActiveTool, Participant } from '../types';
import { getRandomColor } from '../utils/roomUtils';
import { GoogleGenAI, Chat } from "@google/genai";

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
  
  // Participants State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const privateChatRef = useRef<Chat | null>(null);
  const videoCaptureInterval = useRef<number | null>(null);
  const captureVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Screen Share Refs
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Initialize Service Instance (connection handled separately)
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
                     return [...prev, {
                         id: Date.now().toString(),
                         sender: isUser ? 'user' : 'ai',
                         text: text,
                         timestamp: new Date(),
                         isPrivate: false
                     }];
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
            // Update AI volume in participants list
            setParticipants(prev => prev.map(p => 
                p.role === 'ai' ? { ...p, audioLevel: vol } : p
            ));
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
          
          // Initialize Private Chat Client
          const ai = new GoogleGenAI({ apiKey });
          privateChatRef.current = ai.chats.create({
              model: 'gemini-2.5-flash',
              config: {
                  systemInstruction: "You are the private teaching assistant version of the professor. Answer the student's questions concisely via text. Do not refer to audio or video capabilities here, this is a text-only private side channel. Be helpful and discreet.",
              }
          });

          // Add AI Participant if not exists
          setParticipants(prev => {
              if (!prev.some(p => p.role === 'ai')) {
                  return [{
                      id: 'ai-prof',
                      name: 'Professor Gemini',
                      role: 'ai',
                      isMuted: false,
                      isCamOn: true,
                      audioLevel: 0
                  }, ...prev];
              }
              return prev;
          });

      } else {
          service.disconnect();
          privateChatRef.current = null;
          
          // Remove AI Participant
          setParticipants(prev => prev.filter(p => p.role !== 'ai'));
          setConnectionState(ConnectionState.DISCONNECTED);
      }
  }, [isAIActive, apiKey]);

  // Initial Participants Setup (Self & Fakes)
  useEffect(() => {
    // 1. Add Self
    const selfParticipant: Participant = {
        id: 'self',
        name: userName,
        role: isAdmin ? 'host' : 'participant',
        isMuted: !isAudioEnabled,
        isCamOn: isVideoEnabled,
        isSelf: true,
        stream: stream
    };
    
    setParticipants(prev => {
        const existingAI = prev.find(p => p.role === 'ai');
        return existingAI ? [existingAI, selfParticipant] : [selfParticipant];
    });

    // 2. If Admin, simulate fake students
    if (isAdmin) {
        const fakeNames = ["Alice Student", "Bob Researcher", "Charlie Dev"];
        fakeNames.forEach((name, index) => {
            setTimeout(() => {
                setParticipants(prev => [
                    ...prev,
                    {
                        id: `sim-${index}`,
                        name: name,
                        role: 'participant',
                        isMuted: index % 2 === 0,
                        isCamOn: false,
                        avatarColor: getRandomColor()
                    }
                ]);
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    sender: 'system',
                    text: `${name} joined the class`,
                    timestamp: new Date(),
                    isPrivate: false
                }]);
            }, 5000 * (index + 1));
        });
    }
  }, [userName, isAdmin]); 

  // Update Self Participant when media state changes or screen share toggles
  useEffect(() => {
      setParticipants(prev => prev.map(p => 
          p.isSelf ? { 
              ...p, 
              stream: activeTool === ActiveTool.SCREEN_SHARE && screenStreamRef.current 
                      ? screenStreamRef.current 
                      : stream,
              isMuted: !isAudioEnabled, 
              isCamOn: isVideoEnabled,
          } : p
      ));
  }, [stream, isAudioEnabled, isVideoEnabled, activeTool]);

  // Logic to handle video stream capture to Gemini
  useEffect(() => {
    if (connectionState === ConnectionState.CONNECTED && isAIActive) {
       // Audio always from mic (stream)
       if (stream) serviceRef.current?.startAudioStream(stream);
       
       // Choose video source based on active tool
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

  const startScreenShare = async () => {
      try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = displayStream;
          
          displayStream.getVideoTracks()[0].onended = () => {
              stopScreenShare();
          };

          setActiveTool(ActiveTool.SCREEN_SHARE);
      } catch (e) {
          console.error("Screen share cancelled", e);
      }
  };

  const stopScreenShare = () => {
      if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
      }
      setActiveTool(ActiveTool.NONE);
  };

  const handleToggleScreenShare = () => {
      if (activeTool === ActiveTool.SCREEN_SHARE) {
          stopScreenShare();
      } else {
          startScreenShare();
      }
  };

  const handleToggleMuteParticipant = (id: string) => {
      setParticipants(prev => prev.map(p => {
          if (p.id === id) {
              return { ...p, isMuted: !p.isMuted };
          }
          return p;
      }));
  };

  const handleToggleCamParticipant = (id: string) => {
      setParticipants(prev => prev.map(p => {
          if (p.id === id) {
              return { ...p, isCamOn: !p.isCamOn };
          }
          return p;
      }));
  };

  const handleRemoveParticipant = (id: string) => {
      setParticipants(prev => {
          const p = prev.find(p => p.id === id);
          if (p) {
              setMessages(m => [...m, {
                  id: Date.now().toString(),
                  sender: 'system',
                  text: `${p.name} was removed from the class`,
                  timestamp: new Date(),
                  isPrivate: false
              }]);
          }
          return prev.filter(p => p.id !== id);
      });
  };

  const handleTogglePin = (id: string) => {
      setPinnedParticipantId(prev => (prev === id ? null : id));
      setParticipants(prev => prev.map(p => ({ ...p, isPinned: p.id === id ? !p.isPinned : false })));
  };

  const handleToggleHand = () => {
      setParticipants(prev => prev.map(p => p.isSelf ? { ...p, isHandRaised: !p.isHandRaised } : p));
  };

  const handleReaction = (emoji: string) => {
      setParticipants(prev => prev.map(p => p.isSelf ? { ...p, reaction: emoji } : p));
      
      // Clear reaction after 2.5 seconds
      setTimeout(() => {
          setParticipants(prev => prev.map(p => p.isSelf ? { ...p, reaction: undefined } : p));
      }, 2500);
  };

  const handleToggleRecording = async () => {
      if (isRecording) {
          // Stop Recording
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          // Start Recording
          try {
              // Capture screen content (standard for web-based meeting recorders)
              const stream = await navigator.mediaDevices.getDisplayMedia({ 
                  video: { displaySurface: 'browser' }, 
                  audio: true 
              });
              
              // Add mic audio to the recording stream if possible (optional enhancement for real app)
              // For now, simple getDisplayMedia
              
              const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
              mediaRecorderRef.current = recorder;
              recordedChunksRef.current = [];

              recorder.ondataavailable = (e) => {
                  if (e.data.size > 0) recordedChunksRef.current.push(e.data);
              };

              recorder.onstop = () => {
                  const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `meeting-recording-${new Date().toISOString()}.webm`;
                  a.click();
                  URL.revokeObjectURL(url);
                  
                  // Stop all tracks in recording stream
                  stream.getTracks().forEach(t => t.stop());
              };

              recorder.start();
              setIsRecording(true);
              
              // Handle user stopping stream via browser UI
              stream.getVideoTracks()[0].onended = () => {
                  setIsRecording(false);
                  recorder.stop();
              };

          } catch (e) {
              console.error("Failed to start recording", e);
              setIsRecording(false);
          }
      }
  };

  const handleSendMessage = async (text: string, isPrivate: boolean) => {
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'user',
          text: text,
          timestamp: new Date(),
          isPrivate: isPrivate
      }]);

      if (isPrivate && isAIActive) {
          if (!privateChatRef.current) return;
          try {
              const response = await privateChatRef.current.sendMessage({ message: text });
              const aiText = response.text;
              
              setMessages(prev => [...prev, {
                  id: Date.now().toString() + '_ai',
                  sender: 'ai',
                  text: aiText || "I couldn't generate a response.",
                  timestamp: new Date(),
                  isPrivate: true
              }]);
          } catch (e) {
              console.error("Private chat error", e);
          }
      }
  };

  const handleWhiteboardCapture = (base64: string) => {
      if (isAIActive) serviceRef.current?.sendVideoFrame(base64);
  };
  
  const handleContextQuery = (query: string, imageData: string) => {
      if (!isAIActive) return;

      // 1. Send the image first so AI sees the context
      serviceRef.current?.sendVideoFrame(imageData);
      
      // 2. Send the text query
      setTimeout(() => {
          const prompt = `I am pointing at the whiteboard. ${query}`;
          serviceRef.current?.sendText(prompt);
          
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              sender: 'user',
              text: `(Pointed at board) ${query}`,
              timestamp: new Date(),
              isPrivate: false
          }]);
      }, 200);
  };

  // View Calculation
  const getGridClass = () => {
      if (pinnedParticipantId) return 'grid-cols-1 md:grid-cols-[3fr_1fr]';
      if (participants.length <= 2) return 'grid-cols-1 md:grid-cols-2';
      if (participants.length <= 4) return 'grid-cols-2';
      return 'grid-cols-2 md:grid-cols-3';
  };
  
  // Sort participants so pinned one is first if pinned exists
  const sortedParticipants = pinnedParticipantId 
      ? [
          ...participants.filter(p => p.id === pinnedParticipantId),
          ...participants.filter(p => p.id !== pinnedParticipantId)
        ]
      : participants;

  return (
    <div className={`flex flex-col h-screen bg-[#202124] relative overflow-hidden transition-all duration-300 ${activeTool === ActiveTool.SCREEN_SHARE ? 'border-[6px] border-[#ea4335]' : ''} ${isRecording ? 'border-[6px] border-red-500/50' : ''}`}>
        
        {/* Screen Share Warning Label */}
        {activeTool === ActiveTool.SCREEN_SHARE && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#ea4335] text-white px-6 py-1 rounded-b-lg font-medium shadow-lg z-50 animate-slideDown">
                You are sharing your screen
            </div>
        )}
        
        {/* Recording Indicator */}
        {isRecording && (
            <div className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-md shadow-lg animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full"></div>
                <span className="text-white text-xs font-bold uppercase tracking-wider">Rec</span>
            </div>
        )}

        {/* Settings Modal */}
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            isAIEnabled={isAIActive}
            onToggleAI={setIsAIActive}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 p-4 min-h-0 relative">
            
            {/* Stage */}
            <div className={`flex-1 flex gap-4 transition-all duration-300 ${isChatOpen ? 'mr-96' : ''}`}>
                
                {/* Top Info Bar (Hidden if Recording to save space or move it) */}
                <div className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-md px-3 py-1 rounded-md text-white text-sm font-medium border border-white/10 flex items-center gap-2">
                    <span className="opacity-70">Room:</span>
                    <span className="font-mono tracking-wide">{roomId}</span>
                </div>

                {/* Grid */}
                {activeTool === ActiveTool.WHITEBOARD ? (
                    <div className="w-full h-full pt-12">
                        <Whiteboard 
                            onCapture={handleWhiteboardCapture} 
                            onContextQuery={handleContextQuery}
                            isAIEnabled={isAIActive}
                        />
                    </div>
                ) : (
                    <div className={`w-full h-full grid gap-4 pt-12 auto-rows-fr transition-all duration-500 ${getGridClass()}`}>
                        {sortedParticipants.map((p, idx) => (
                            <ParticipantTile 
                                key={p.id}
                                participant={p}
                                isAdminView={isAdmin}
                                onToggleMuteParticipant={handleToggleMuteParticipant}
                                onToggleCamParticipant={handleToggleCamParticipant}
                                onRemoveParticipant={handleRemoveParticipant}
                                onTogglePin={handleTogglePin}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <ChatSidebar 
                isOpen={isChatOpen} 
                onClose={() => setIsChatOpen(false)}
                messages={messages}
                onSendMessage={handleSendMessage}
                isAIEnabled={isAIActive}
            />
        </div>

        {/* Status Toast */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
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

        {/* Control Bar */}
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
                if (activeTool === ActiveTool.SCREEN_SHARE) stopScreenShare();
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