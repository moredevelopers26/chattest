
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, Message, ActiveAudio } from '../types';
import { firebaseService } from '../services/firebase';
import { generateAiResponse } from '../services/gemini';

interface ChatWindowProps {
  currentUser: User;
  roomId: string;
  activeAudio: ActiveAudio | null;
  onAudioPlay: (audio: Partial<ActiveAudio>) => void;
  onAudioToggle: () => void;
  onBack?: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  message: Message;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-0.5 rounded">{part}</span> 
          : part
      )}
    </>
  );
};

// Helper para comprimir imágenes al 60%
const compressImage = (base64: string, quality: number = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Exportar como JPEG con calidad reducida
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

const WaveformVisualizer: React.FC<{ progress: number, isMe: boolean }> = ({ progress, isMe }) => {
  const bars = useMemo(() => [
    20, 40, 60, 30, 70, 45, 90, 50, 65, 35, 80, 55, 40, 75, 25, 60, 45, 85, 40, 30, 50, 20
  ], []);

  return (
    <div className="flex items-center space-x-[2px] h-8 flex-1">
      {bars.map((height, i) => {
        const barProgress = (i / bars.length) * 100;
        const isActive = progress > barProgress;
        return (
          <div 
            key={i} 
            className={`w-[3px] rounded-full transition-all duration-300 ${
              isActive 
                ? (isMe ? 'bg-white scale-y-110 shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'bg-blue-600 scale-y-110 shadow-[0_0_8px_rgba(37,99,235,0.3)]') 
                : (isMe ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-700')
            }`}
            style={{ height: `${height}%` }}
          />
        );
      })}
    </div>
  );
};

const AudioPlayer: React.FC<{ 
  message: Message, 
  isMe: boolean, 
  activeAudio: ActiveAudio | null,
  onPlay: (audio: Partial<ActiveAudio>) => void,
  onToggle: () => void,
}> = ({ message, isMe, activeAudio, onPlay, onToggle }) => {
  const isActive = activeAudio?.id === message.id;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      onToggle();
    } else {
      onPlay({
        id: message.id,
        src: message.text,
        senderName: message.senderName,
        senderAvatar: `https://picsum.photos/seed/${message.senderId}/40/40`,
        isPlaying: true
      });
    }
  };

  const progress = isActive && activeAudio.duration > 0 ? (activeAudio.currentTime / activeAudio.duration) * 100 : 0;
  const remainingTime = isActive ? Math.max(0, activeAudio.duration - activeAudio.currentTime) : 0;

  return (
    <div className="flex flex-col space-y-2 min-w-[240px]">
      <div className="flex items-center space-x-3 py-1">
        <button 
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0 ${
            isMe ? 'bg-white text-blue-600 hover:scale-105' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
          }`}
        >
          <i className={`fa-solid ${isActive && activeAudio.isPlaying ? 'fa-pause' : 'fa-play'} text-sm ${(!isActive || !activeAudio.isPlaying) && 'ml-1'}`}></i>
        </button>
        
        <WaveformVisualizer progress={progress} isMe={isMe} />

        <span className={`text-[10px] font-mono font-bold shrink-0 min-w-[32px] text-right ${isMe ? 'text-white/90' : 'text-blue-600'}`}>
          {remainingTime > 0 ? `-${formatTime(remainingTime)}` : formatTime(0)}
        </span>
      </div>

      <div className={`h-1 rounded-full w-full overflow-hidden ${isMe ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <div 
          className={`h-full transition-all duration-100 ${isMe ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'}`} 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className={`text-[9px] font-mono tabular-nums flex justify-between px-1 ${isMe ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
        <span>{formatTime(isActive ? activeAudio.currentTime : 0)}</span>
        <span>{formatTime(isActive ? activeAudio.duration : 0)}</span>
      </div>
    </div>
  );
};

const RecordingWave: React.FC = () => (
  <div className="flex items-center space-x-1.5 h-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div 
        key={i} 
        className="w-1 bg-white/80 rounded-full animate-bounce"
        style={{ 
          height: `${Math.random() * 60 + 40}%`,
          animationDuration: `${Math.random() * 0.5 + 0.5}s`,
          animationDelay: `${i * 0.1}s`
        }}
      />
    ))}
  </div>
);

const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, roomId, activeAudio, onAudioPlay, onAudioToggle, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTypingAi, setIsTypingAi] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isForwarding, setIsForwarding] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  
  const [swipedMessageId, setSwipedMessageId] = useState<string | null>(null);
  const [pressingMessageId, setPressingMessageId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [hasVibrated, setHasVibrated] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoRecordingTime, setVideoRecordingTime] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);

  const allUsers = useMemo(() => firebaseService.getUsers(), []);
  const activeRoom = useMemo(() => firebaseService.getRoomMetadata(roomId), [roomId]);

  useEffect(() => {
    setMessages(firebaseService.getMessages(roomId));
    setTypingUsers(firebaseService.getTypingUsers(roomId).filter(name => name !== currentUser.name));

    const unsubscribe = firebaseService.subscribe(() => {
      setMessages([...firebaseService.getMessages(roomId)]);
      setTypingUsers(firebaseService.getTypingUsers(roomId).filter(name => name !== currentUser.name));
    });

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [roomId, currentUser.name, cameraStream]);

  useEffect(() => {
    if (scrollRef.current && !searchQuery) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTypingAi, typingUsers, searchQuery]);

  useEffect(() => {
    setSearchQuery('');
    setIsSearchVisible(false);
    setContextMenu(null);
    setReplyTo(null);
    setEditingMessage(null);
    setIsAttachmentMenuOpen(false);
  }, [roomId]);

  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchVisible]);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setIsAttachmentMenuOpen(false);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(m => 
      (m.type === 'text' || m.type === 'ai') && m.text.toLowerCase().includes(query) ||
      m.senderName.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    firebaseService.setTypingStatus(roomId, currentUser.id, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      firebaseService.setTypingStatus(roomId, currentUser.id, false);
    }, 1500);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (editingMessage) {
      firebaseService.updateMessage(roomId, editingMessage.id, inputValue.trim());
      setShowToast({ message: 'Mensaje actualizado', type: 'success' });
      setTimeout(() => setShowToast(null), 2000);
      setEditingMessage(null);
    } else {
      await sendContent(inputValue.trim(), 'text');
    }
    setInputValue('');
  };

  const sendContent = async (content: string, type: Message['type'], fileName?: string, fileSize?: string) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    firebaseService.setTypingStatus(roomId, currentUser.id, false);

    // Si es imagen, aplicar compresión final al 60%
    let finalContent = content;
    if (type === 'image') {
      finalContent = await compressImage(content, 0.6);
    }

    const messagePayload: Partial<Message> = {
      text: finalContent,
      senderId: currentUser.id,
      senderName: currentUser.name,
      type,
      fileName,
      fileSize
    };

    if (replyTo) {
      messagePayload.replyTo = {
        id: replyTo.id,
        text: replyTo.type === 'audio' ? 'Mensaje de voz' : replyTo.type === 'image' ? 'Imagen' : replyTo.type === 'video' ? 'Video' : replyTo.type === 'document' ? replyTo.fileName || 'Archivo' : replyTo.text,
        senderName: replyTo.senderName
      };
      setReplyTo(null);
    }

    firebaseService.sendMessage(roomId, messagePayload);

    if (roomId === 'test-channel') {
      setTimeout(() => {
        let echoText = `He recibido tu ${type} en el área de testeo.`;
        if (type === 'text') echoText = `Echo: ${content}`;

        firebaseService.sendMessage(roomId, {
          text: echoText,
          senderId: 'test-bot',
          senderName: 'Test Bot',
          type: 'text',
          isAiResponse: false
        });
      }, 600);
    }
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleDocumentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, inputType: 'gallery' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      let content = reader.result as string;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const type = inputType === 'gallery' ? (isVideo ? 'video' : 'image') : 'document';
      
      // Comprimir si es imagen de galería
      if (isImage) {
        content = await compressImage(content, 0.6);
      }

      const fileSize = (file.size / 1024).toFixed(1) + ' KB';
      sendContent(content, type, file.name, fileSize);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Camera Logic
  const openCamera = async (mode: 'photo' | 'video' = 'photo') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: mode === 'video' 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setCameraMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("No se pudo acceder a la cámara.");
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setIsVideoRecording(false);
    setVideoRecordingTime(0);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    
    // Capturar a calidad 0.6 directamente
    const base64 = canvas.toDataURL('image/jpeg', 0.6);
    sendContent(base64, 'image');
    closeCamera();
  };

  const startVideoRecording = () => {
    if (!cameraStream) return;
    
    // Configurar compresión de bitrate para el recorder (1.2 Mbps para reducir peso)
    const options = {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 1200000 
    };
    
    const recorder = new MediaRecorder(cameraStream, options);
    videoRecorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        sendContent(reader.result as string, 'video');
      };
      reader.readAsDataURL(blob);
    };

    recorder.start();
    setIsVideoRecording(true);
    timerIntervalRef.current = window.setInterval(() => {
      setVideoRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isVideoRecording) {
      videoRecorderRef.current.stop();
      setIsVideoRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      closeCamera();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          sendContent(base64Audio, 'audio');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (mediaRecorderRef.current && isRecording) {
      if (shouldSend) {
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        const tracks = mediaRecorderRef.current.stream.getTracks();
        tracks.forEach(t => t.stop());
      }
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const triggerVibrate = (duration = 50) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(duration);
    }
  };

  const scrollToMessage = (msgId: string) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const onContextMenu = useCallback((e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    triggerVibrate();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  }, []);

  const handleTouchStart = (e: React.TouchEvent, message: Message) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    setSwipedMessageId(message.id);
    setPressingMessageId(message.id);
    setHasVibrated(false);
    
    longPressTimer.current = window.setTimeout(() => {
      triggerVibrate();
      setContextMenu({ x: touch.clientX, y: touch.clientY, message });
      setPressingMessageId(null);
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touch = e.touches[0];
    const diff = touch.clientX - touchStartX.current;
    if (Math.abs(diff) > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setPressingMessageId(null);
    }
    if (diff > 0) {
      const currentSwipe = Math.min(diff, 100);
      setSwipeX(currentSwipe);
      if (currentSwipe >= 60 && !hasVibrated) {
        triggerVibrate(20);
        setHasVibrated(true);
      } else if (currentSwipe < 60 && hasVibrated) {
        setHasVibrated(false);
      }
    } else {
      setSwipeX(0);
    }
  };

  const handleTouchEnd = (message: Message) => {
    if (swipeX > 60) {
      setReplyTo(message);
      triggerVibrate(30);
      setTimeout(() => mainInputRef.current?.focus(), 100);
    }
    setSwipeX(0);
    setSwipedMessageId(null);
    setPressingMessageId(null);
    touchStartX.current = null;
    setHasVibrated(false);
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const copyToClipboard = async () => {
    if (contextMenu?.message) {
      try {
        await navigator.clipboard.writeText(contextMenu.message.text);
        setShowToast({message: '¡Texto Copiado!', type: 'success'});
        setTimeout(() => setShowToast(null), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
    setContextMenu(null);
  };

  const handleEditMessage = () => {
    if (contextMenu?.message) {
      setEditingMessage(contextMenu.message);
      setInputValue(contextMenu.message.text);
      setReplyTo(null);
      setTimeout(() => mainInputRef.current?.focus(), 100);
    }
    setContextMenu(null);
  };

  const handleForwardStart = () => {
    if (contextMenu?.message) {
      setMessageToForward(contextMenu.message);
      setIsForwarding(true);
    }
    setContextMenu(null);
  };

  const handleSaveToVault = (message?: Message) => {
    const msg = message || contextMenu?.message;
    if (msg) {
      firebaseService.saveToVault(msg);
      triggerVibrate(30);
      setShowToast({message: 'Guardado en la Bóveda', type: 'success'});
      setTimeout(() => setShowToast(null), 2000);
    }
    setContextMenu(null);
  };

  const handleConfirmForward = (targetId: string, targetName: string) => {
    if (!messageToForward) return;
    firebaseService.sendMessage(targetId, {
      text: messageToForward.text,
      senderId: currentUser.id,
      senderName: currentUser.name,
      type: messageToForward.type,
      isAiResponse: messageToForward.isAiResponse,
      fileName: messageToForward.fileName,
      fileSize: messageToForward.fileSize
    });
    setShowToast({message: `Mensaje reenviado a ${targetName}`, type: 'success'});
    setTimeout(() => setShowToast(null), 2000);
    setIsForwarding(false);
    setMessageToForward(null);
  };

  const confirmDeleteMessage = () => {
    if (contextMenu?.message) {
      setMessageToDelete(contextMenu.message);
    }
    setContextMenu(null);
  };

  const deleteMessageFinal = () => {
    if (messageToDelete) {
      firebaseService.deleteMessage(roomId, messageToDelete.id);
      triggerVibrate(40);
      setShowToast({message: 'Mensaje eliminado correctamente', type: 'success'});
      setTimeout(() => setShowToast(null), 2000);
      setMessageToDelete(null);
    }
  };

  const renderStatusIcon = (status?: string) => {
    switch (status) {
      case 'en-espera': return <i className="fa-regular fa-clock text-[8px] ml-1"></i>;
      case 'enviado': return <i className="fa-solid fa-check text-[8px] ml-1 opacity-70"></i>;
      case 'recibido': return <i className="fa-solid fa-check-double text-[8px] ml-1 opacity-70"></i>;
      case 'leido': return <i className="fa-solid fa-check-double text-[8px] ml-1 text-blue-300"></i>;
      default: return null;
    }
  };

  const filteredForwardTargets = useMemo(() => {
    const query = forwardSearch.toLowerCase();
    const rooms = [
      { id: 'global', name: 'Nequi Global', icon: 'fa-globe' },
      { id: 'ai-lab', name: 'Laboratorio AI', icon: 'fa-robot' },
      { id: 'test-channel', name: 'Canal de Prueba', icon: 'fa-flask' },
    ];
    const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(query));
    const filteredUsers = allUsers.filter(u => u.id !== currentUser.id && u.name.toLowerCase().includes(query));
    return { rooms: filteredRooms, users: filteredUsers };
  }, [forwardSearch, allUsers, currentUser.id]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 transition-colors relative overflow-hidden">
      {/* Inputs ocultos */}
      <input type="file" ref={galleryInputRef} onChange={(e) => handleFileChange(e, 'gallery')} accept="image/*,video/*" className="hidden" />
      <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'document')} accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" />

      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-2 rounded-full shadow-lg flex items-center space-x-2 border ${
          showToast?.type === 'success' ? 'bg-blue-600 text-white border-blue-400 shadow-blue-200' : 'bg-slate-800 text-white border-slate-700 shadow-slate-200'
        }`}>
          <i className={`fa-solid ${showToast?.type === 'success' ? 'fa-circle-check' : 'fa-info-circle'}`}></i>
          <span className="text-xs font-bold uppercase tracking-wider">{showToast?.message}</span>
        </div>
      </div>

      <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 justify-between shrink-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors md:hidden">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
          )}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${activeRoom.isPrivate ? '' : (roomId === 'ai-lab' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : roomId === 'test-channel' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600')}`}>
            {activeRoom.isPrivate && activeRoom.avatar ? (
              <img src={activeRoom.avatar} className="w-full h-full object-cover" alt={activeRoom.name} />
            ) : (
              <i className={`fa-solid ${activeRoom.icon}`}></i>
            )}
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{activeRoom.name}</h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">{activeRoom.desc}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsSearchVisible(!isSearchVisible)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isSearchVisible ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            <i className="fa-solid fa-magnifying-glass text-sm"></i>
          </button>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 ${isSearchVisible ? 'h-14 opacity-100' : 'h-0 opacity-0'}`}>
        <div className="px-6 h-full flex items-center space-x-3">
          <i className="fa-solid fa-search text-slate-400 text-xs"></i>
          <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar en el chat..." className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200" />
          <button onClick={() => { setIsSearchVisible(false); setSearchQuery(''); }} className="text-xs font-bold text-blue-600 uppercase tracking-wider">Cerrar</button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {filteredMessages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.id;
          const showAvatar = idx === 0 || filteredMessages[idx-1].senderId !== msg.senderId;
          const isSwiped = swipedMessageId === msg.id;
          const isPressing = pressingMessageId === msg.id;
          const isHighlighted = highlightedMessageId === msg.id;
          const isVaulted = firebaseService.isInVault(msg.id);

          return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`flex flex-col group/msg animate-in fade-in slide-in-from-bottom-2 duration-300 ${isMe ? 'items-end' : 'items-start'} relative transition-all duration-300 ${isHighlighted ? 'animate-pulse bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl' : ''}`}>
              {isSwiped && swipeX > 15 && (
                <div className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center transition-all ${isMe ? 'right-full mr-4' : 'left-0'}`} style={{ opacity: Math.min(swipeX / 60, 1), transform: `scale(${Math.min(swipeX / 60, 1.2)})` }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${swipeX >= 60 ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <i className="fa-solid fa-reply text-xs"></i>
                  </div>
                </div>
              )}
              {showAvatar && !isMe && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 ml-10 mb-1 uppercase tracking-tighter">{msg.senderName}</span>}
              <div className={`flex items-center space-x-2 max-w-[85%] relative transition-all duration-200 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`} style={{ transform: isSwiped ? `translateX(${swipeX}px)` : isPressing ? 'scale(0.96)' : 'none', filter: isPressing ? 'brightness(0.9)' : 'none' }}>
                <div className={`flex items-end space-x-2 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {showAvatar && !isMe && <img src={`https://picsum.photos/seed/${msg.senderId}/40/40`} className="w-8 h-8 rounded-full shrink-0 border border-slate-100 dark:border-slate-800 object-cover" alt={msg.senderName} />}
                  {!showAvatar && !isMe && <div className="w-8 shrink-0"></div>}
                  <div onContextMenu={(e) => onContextMenu(e, msg)} onTouchStart={(e) => handleTouchStart(e, msg)} onTouchMove={handleTouchMove} onTouchEnd={() => handleTouchEnd(msg)} className={`shadow-sm transition-all select-none overflow-hidden touch-none relative ${msg.type === 'image' || msg.type === 'video' ? 'p-1 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800' : 'p-4 rounded-2xl active:scale-[0.98]'} ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100 dark:shadow-none' : msg.isAiResponse || msg.senderId === 'test-bot' ? 'bg-slate-800 dark:bg-blue-950/40 text-slate-100 rounded-tl-none border border-slate-700 dark:border-blue-800/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'}`} style={{ WebkitTouchCallout: 'none' }}>
                    
                    {isVaulted && (
                      <div className={`absolute top-2 right-2 z-10 w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-300 ${isMe ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'}`}>
                        <i className="fa-solid fa-lock text-[8px]"></i>
                      </div>
                    )}

                    {msg.replyTo && (
                      <div onClick={() => scrollToMessage(msg.replyTo!.id)} className={`mb-3 p-2 text-xs rounded-lg border-l-4 overflow-hidden truncate cursor-pointer transition-all hover:brightness-110 active:scale-95 ${isMe ? 'bg-blue-500/30 border-white/50 text-white/80' : 'bg-slate-200/50 dark:bg-slate-700/50 border-blue-500 text-slate-500 dark:text-slate-400'}`}>
                        <div className="flex items-center justify-between mb-0.5"><p className="font-bold text-[10px] uppercase tracking-wider">{msg.replyTo.senderName}</p><i className="fa-solid fa-arrow-up text-[8px] opacity-40"></i></div>
                        <p className="truncate italic">{msg.replyTo.text}</p>
                      </div>
                    )}
                    {(msg.isAiResponse || msg.senderId === 'test-bot') && <div className="mb-2 text-[10px] text-blue-400 font-bold tracking-widest uppercase flex items-center gap-1"><i className={`fa-solid ${msg.senderId === 'test-bot' ? 'fa-flask' : 'fa-sparkles'}`}></i> {msg.senderId === 'test-bot' ? 'Test Response' : 'Respuesta AI'}</div>}
                    
                    {msg.type === 'image' ? (
                      <img src={msg.text} className="max-w-full max-h-[300px] object-cover cursor-pointer rounded-xl pointer-events-none" alt="Chat content" />
                    ) : msg.type === 'video' ? (
                      <video src={msg.text} controls className="max-w-full max-h-[300px] rounded-xl pointer-events-auto" />
                    ) : msg.type === 'document' ? (
                      <div className="flex items-center space-x-3 py-2 min-w-[200px]">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMe ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'}`}>
                          <i className="fa-solid fa-file-pdf text-lg"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{msg.fileName || 'Documento'}</p>
                          <p className={`text-[10px] opacity-60 ${isMe ? 'text-white' : 'text-slate-500'}`}>{msg.fileSize || '---'}</p>
                        </div>
                      </div>
                    ) : msg.type === 'audio' ? (
                      <AudioPlayer message={msg} isMe={isMe} activeAudio={activeAudio} onPlay={onAudioPlay} onToggle={onAudioToggle} />
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap pointer-events-none">{highlightText(msg.text, searchQuery)}</p>
                        <div className="flex items-center justify-end space-x-1 mt-2">
                          <p className={`text-[10px] opacity-60`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          {isMe && renderStatusIcon(msg.status)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Quick Action Buttons (Desktop) */}
                <div className={`hidden md:flex flex-col space-y-2 opacity-0 group-hover/msg:opacity-100 transition-opacity px-2 ${isMe ? 'items-end' : 'items-start'}`}>
                  <button 
                    onClick={() => { setReplyTo(msg); setTimeout(() => mainInputRef.current?.focus(), 100); }} 
                    className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:scale-110 flex items-center justify-center transition-all shadow-sm border border-slate-100 dark:border-slate-700" 
                    title="Citar"
                  >
                    <i className="fa-solid fa-reply text-xs"></i>
                  </button>
                  
                  {(msg.type !== 'text' && msg.type !== 'ai') && (
                    <button 
                      onClick={() => handleSaveToVault(msg)} 
                      disabled={isVaulted}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                        isVaulted 
                          ? 'bg-blue-600 text-white border-blue-600 cursor-default' 
                          : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:scale-110 border-slate-100 dark:border-slate-700'
                      }`}
                      title={isVaulted ? "Guardado en Bóveda" : "Guardar en Bóveda"}
                    >
                      <i className={`fa-solid ${isVaulted ? 'fa-lock' : 'fa-vault'} text-xs`}></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isTypingAi && !searchQuery && (
          <div className="flex items-start space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-blue-900/40 flex items-center justify-center shrink-0"><i className="fa-solid fa-robot text-xs text-blue-400 animate-pulse"></i></div>
            <div className="bg-slate-800 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none flex items-center space-x-2"><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        {replyTo && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-700 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center space-x-3 border-l-4 border-blue-600 pl-3">
              <div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Citando a {replyTo.senderName}</p><p className="text-sm text-slate-500 dark:text-slate-400 truncate italic">{replyTo.type === 'audio' ? 'Mensaje de voz' : replyTo.type === 'image' ? 'Imagen' : replyTo.text}</p></div>
            </div>
            <button onClick={() => setReplyTo(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark"></i></button>
          </div>
        )}

        {editingMessage && (
          <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 backdrop-blur-sm border-t border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center space-x-3 border-l-4 border-indigo-600 pl-3">
              <div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1"><i className="fa-solid fa-pen-to-square"></i> Editando mensaje</p><p className="text-sm text-slate-500 dark:text-slate-400 truncate italic">{editingMessage.text}</p></div>
            </div>
            <button onClick={() => { setEditingMessage(null); setInputValue(''); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark"></i></button>
          </div>
        )}

        {!searchQuery && (
          <div className="p-4">
            <div className="relative max-w-4xl mx-auto flex items-center space-x-2">
              {isRecording && (
                <div className="absolute inset-0 z-10 bg-blue-600 rounded-2xl flex items-center justify-between px-6 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center space-x-6"><div className="flex items-center space-x-3"><div className="w-3 h-3 bg-red-400 rounded-full animate-pulse shadow-lg"></div><span className="text-white font-bold text-base tracking-widest tabular-nums">{formatTime(recordingTime)}</span></div><RecordingWave /></div>
                  <div className="flex items-center space-x-4"><button onClick={() => stopRecording(false)} className="text-white/70 hover:text-white transition-colors"><i className="fa-solid fa-trash-can text-lg"></i></button><button onClick={() => stopRecording(true)} className="bg-white text-blue-600 w-11 h-11 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"><i className="fa-solid fa-check text-lg"></i></button></div>
                </div>
              )}
              
              <div className="relative">
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setIsAttachmentMenuOpen(!isAttachmentMenuOpen); }} 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isAttachmentMenuOpen ? 'bg-blue-600 text-white rotate-45' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`}
                >
                  <i className="fa-solid fa-plus text-lg"></i>
                </button>
                
                {isAttachmentMenuOpen && (
                  <div className="absolute bottom-16 left-0 z-50 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-2xl rounded-3xl p-3 grid grid-cols-2 gap-2 min-w-[220px] animate-in zoom-in-90 slide-in-from-bottom-4 duration-200" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setIsAttachmentMenuOpen(false); openCamera('photo'); }} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-slate-600 dark:text-slate-300">
                      <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center mb-1"><i className="fa-solid fa-camera"></i></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Cámara</span>
                    </button>
                    <button onClick={() => { setIsAttachmentMenuOpen(false); openCamera('video'); }} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-slate-600 dark:text-slate-300">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center mb-1"><i className="fa-solid fa-video"></i></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Video</span>
                    </button>
                    <button onClick={() => { setIsAttachmentMenuOpen(false); handleGalleryClick(); }} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-slate-600 dark:text-slate-300">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center mb-1"><i className="fa-solid fa-image"></i></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Galería</span>
                    </button>
                    <button onClick={() => { setIsAttachmentMenuOpen(false); handleDocumentClick(); }} className="flex flex-col items-center justify-center p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-slate-600 dark:text-slate-300">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mb-1"><i className="fa-solid fa-file-invoice"></i></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Documento</span>
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 transition-all focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 flex items-center">
                <input ref={mainInputRef} type="text" value={inputValue} onChange={handleInputChange} placeholder={editingMessage ? "Actualizar mensaje..." : (roomId === 'ai-lab' ? "Pregunta a Gemini..." : "Escribe un mensaje...")} className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-sm text-slate-800 dark:text-slate-100" />
                <button type="submit" disabled={!inputValue.trim()} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 ${editingMessage ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}><i className={`fa-solid ${editingMessage ? 'fa-check' : 'fa-paper-plane'} text-sm`}></i></button>
              </form>
              
              {!inputValue.trim() && !isRecording && !editingMessage && (<button type="button" onClick={startRecording} className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all active:scale-90"><i className="fa-solid fa-microphone text-lg"></i></button>)}
            </div>
          </div>
        )}
      </div>

      {/* Camera UI */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute top-6 left-0 right-0 px-6 flex items-center justify-between z-10">
            <button onClick={closeCamera} className="w-12 h-12 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-md"><i className="fa-solid fa-xmark text-xl"></i></button>
            <div className="flex bg-black/40 rounded-full p-1 backdrop-blur-md">
              <button onClick={() => setCameraMode('photo')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${cameraMode === 'photo' ? 'bg-white text-black' : 'text-white/60'}`}>Foto</button>
              <button onClick={() => setCameraMode('video')} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${cameraMode === 'video' ? 'bg-white text-black' : 'text-white/60'}`}>Video</button>
            </div>
            <div className="w-12"></div>
          </div>

          <div className="relative w-full max-w-lg aspect-[3/4] overflow-hidden rounded-3xl bg-slate-900">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isVideoRecording && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full flex items-center space-x-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <span className="text-xs font-mono font-bold tracking-tighter">{formatTime(videoRecordingTime)}</span>
              </div>
            )}
          </div>

          <div className="mt-12 flex items-center justify-center w-full px-6">
            {cameraMode === 'photo' ? (
              <button onClick={takePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1"><div className="w-full h-full bg-white rounded-full"></div></button>
            ) : (
              <button 
                onClick={isVideoRecording ? stopVideoRecording : startVideoRecording} 
                className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 transition-all ${isVideoRecording ? 'border-red-600' : ''}`}
              >
                <div className={`transition-all ${isVideoRecording ? 'w-1/2 h-1/2 bg-red-600 rounded-lg' : 'w-full h-full bg-red-600 rounded-full'}`}></div>
              </button>
            )}
          </div>
        </div>
      )}

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/20 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setContextMenu(null)} />
          <div className="fixed z-[110] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl overflow-hidden py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-150" style={{ top: Math.max(20, Math.min(contextMenu.y, window.innerHeight - 250)), left: Math.max(20, Math.min(contextMenu.x - 100, window.innerWidth - 220)) }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setReplyTo(contextMenu.message); setContextMenu(null); setTimeout(() => mainInputRef.current?.focus(), 100); }} className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 transition-colors">
              <i className="fa-solid fa-reply text-blue-500"></i>
              <span className="text-sm font-medium">Responder</span>
            </button>
            
            <button 
              onClick={() => handleSaveToVault()} 
              disabled={firebaseService.isInVault(contextMenu.message.id)}
              className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <i className={`fa-solid ${firebaseService.isInVault(contextMenu.message.id) ? 'fa-lock' : 'fa-vault'} text-blue-600`}></i>
              <span className="text-sm font-medium">{firebaseService.isInVault(contextMenu.message.id) ? 'En Bóveda' : 'Guardar en Bóveda'}</span>
            </button>

            {contextMenu.message.senderId === currentUser.id && (contextMenu.message.type === 'text' || contextMenu.message.type === 'ai') && (
              <button onClick={handleEditMessage} className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 transition-colors">
                <i className="fa-solid fa-pen-to-square text-blue-500"></i>
                <span className="text-sm font-medium">Editar</span>
              </button>
            )}

            <button onClick={handleForwardStart} className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 transition-colors">
              <i className="fa-solid fa-share text-blue-500"></i>
              <span className="text-sm font-medium">Reenviar</span>
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
            <button onClick={confirmDeleteMessage} className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 transition-colors">
              <i className="fa-solid fa-trash-can"></i>
              <span className="text-sm font-medium">Eliminar</span>
            </button>
          </div>
        </>
      )}

      {/* Modals para borrado, reenvio, etc (se mantienen igual que antes) */}
      {messageToDelete && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setMessageToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
                <i className="fa-solid fa-trash-can text-3xl"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">¿Eliminar Mensaje?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="p-6 pt-0 flex flex-col space-y-3">
              <button onClick={deleteMessageFinal} className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-95">Eliminar definitivamente</button>
              <button onClick={() => setMessageToDelete(null)} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-bold py-4 rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isForwarding && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsForwarding(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div><h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Reenviar mensaje</h3></div>
              <button onClick={() => setIsForwarding(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-4 shrink-0"><input type="text" value={forwardSearch} onChange={(e) => setForwardSearch(e.target.value)} placeholder="Buscar..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm" /></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {filteredForwardTargets.rooms.map(room => (<button key={room.id} onClick={() => handleConfirmForward(room.id, room.name)} className="w-full flex items-center space-x-3 p-3 rounded-2xl hover:bg-blue-50 transition-all text-left group"><div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><i className={`fa-solid ${room.icon}`}></i></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1">{room.name}</span></button>))}
               {filteredForwardTargets.users.map(user => (<button key={user.id} onClick={() => handleConfirmForward(user.id, user.name)} className="w-full flex items-center space-x-3 p-3 rounded-2xl hover:bg-blue-50 transition-all text-left group"><img src={user.avatar} className="w-10 h-10 rounded-full object-cover" /><span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1">{user.name}</span></button>))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
