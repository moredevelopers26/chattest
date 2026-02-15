
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  bio?: string;
  lastSeen?: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  type: 'text' | 'image' | 'ai' | 'audio' | 'video' | 'document';
  fileName?: string;
  fileSize?: string;
  status?: 'en-espera' | 'enviado' | 'recibido' | 'leido';
  isAiResponse?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

export interface VaultItem {
  id: string;
  name: string;
  timestamp: number;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  content: string; // El contenido base64 o texto
  senderName: string;
  fileName?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  type: 'public' | 'private' | 'ai';
  members: string[];
  lastMessage?: string;
}

export enum AuthView {
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
}

export type AppTab = 'conversations' | 'contacts' | 'vault' | 'calls' | 'settings';

export interface ActiveAudio {
  id: string;
  src: string;
  senderName: string;
  senderAvatar: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}
