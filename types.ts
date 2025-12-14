export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'system' | 'ai';
  text: string;
  timestamp: Date;
  isPrivate?: boolean;
}

export interface AudioVolume {
  level: number; // 0 to 1
}

export enum ActiveTool {
  NONE = 'NONE',
  WHITEBOARD = 'WHITEBOARD',
  SCREEN_SHARE = 'SCREEN_SHARE',
}

export interface Participant {
  id: string;
  name: string;
  role: 'host' | 'participant' | 'ai';
  isMuted: boolean;
  isCamOn: boolean;
  isSelf?: boolean;
  stream?: MediaStream | null;
  audioLevel?: number;
  avatarColor?: string; // Hex color for avatar background
  isHandRaised?: boolean;
  isPinned?: boolean;
  reaction?: string; // Emoji character
}