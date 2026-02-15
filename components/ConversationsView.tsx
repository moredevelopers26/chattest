
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { firebaseService } from '../services/firebase';

interface ConversationsViewProps {
  onSelectChat: (roomId: string) => void;
  activeChatId: string;
}

const formatChatTime = (timestamp: number) => {
  if (timestamp === 0) return '';
  const date = new Date(timestamp);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  }
  
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};

const ConversationsView: React.FC<ConversationsViewProps> = ({ onSelectChat, activeChatId }) => {
  const [conversations, setConversations] = useState(firebaseService.getChatList());
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [actionMenuRoom, setActionMenuRoom] = useState<{id: string, name: string, isChannel: boolean} | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const isLongPressActive = useRef(false);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribe(() => {
      setConversations(firebaseService.getChatList());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const triggerVibrate = useCallback((duration = 40) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(duration);
    }
  }, []);

  const handlePressStart = (roomId: string, roomName: string) => {
    isLongPressActive.current = false;
    setPressingId(roomId);
    
    longPressTimer.current = window.setTimeout(() => {
      isLongPressActive.current = true;
      triggerVibrate();
      const isChannel = ['global', 'ai-lab', 'test-channel'].includes(roomId);
      setActionMenuRoom({ id: roomId, name: roomName, isChannel });
      setPressingId(null);
    }, 600);
  };

  const handlePressEnd = (roomId: string) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setPressingId(null);
    
    if (!isLongPressActive.current) {
      onSelectChat(roomId);
    }
  };

  const handleDeleteConversation = () => {
    if (actionMenuRoom) {
      const typeLabel = actionMenuRoom.isChannel ? 'el canal' : 'la conversación';
      if (confirm(`¿Estás seguro de que quieres eliminar ${typeLabel} "${actionMenuRoom.name}"? Se borrará el historial y se ocultará de esta lista.`)) {
        firebaseService.deleteConversation(actionMenuRoom.id);
        triggerVibrate(60);
      }
      setActionMenuRoom(null);
    }
  };

  return (
    <div className="flex-1 bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden transition-colors">
      <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 shrink-0 bg-white dark:bg-slate-900 justify-between">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg uppercase tracking-tight italic italic">Mensajes</h2>
        <div className="flex items-center space-x-2">
          <button className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">
            <i className="fa-solid fa-filter text-xs"></i>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2">
        <div className="flex items-center justify-between mb-4 ml-2">
          <h4 className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-600 tracking-[0.2em]">Chats Recientes</h4>
          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest hidden md:inline">Mantén presionado para borrar</span>
        </div>
        
        {conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map(chat => (
              <button
                key={chat.id}
                onMouseDown={() => handlePressStart(chat.id, chat.name)}
                onMouseUp={() => handlePressEnd(chat.id)}
                onMouseLeave={() => setPressingId(null)}
                onTouchStart={() => handlePressStart(chat.id, chat.name)}
                onTouchEnd={() => handlePressEnd(chat.id)}
                className={`w-full flex items-center space-x-4 p-4 rounded-3xl transition-all relative group touch-none select-none ${
                  activeChatId === chat.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 dark:shadow-none translate-x-1' 
                  : pressingId === chat.id 
                    ? 'bg-slate-200 dark:bg-slate-700 scale-[0.97]'
                    : 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                style={{ WebkitTouchCallout: 'none' }}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm transition-transform ${
                  pressingId === chat.id ? 'scale-90' : 'scale-100'
                } ${
                  activeChatId === chat.id 
                    ? 'bg-white/20' 
                    : (['global', 'ai-lab', 'test-channel'].includes(chat.id) ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700')
                }`}>
                  {chat.avatar ? (
                    <img src={chat.avatar} className="w-full h-full object-cover" alt={chat.name} />
                  ) : (
                    <i className={`fa-solid ${chat.icon} text-xl ${activeChatId === chat.id ? 'text-white' : ''}`}></i>
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-base font-bold truncate ${activeChatId === chat.id ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                      {chat.name}
                    </p>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${activeChatId === chat.id ? 'text-white/70' : 'text-slate-400'}`}>
                      {formatChatTime(chat.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${activeChatId === chat.id ? 'text-white/80' : 'text-slate-500 dark:text-slate-500'}`}>
                    {chat.lastMessage}
                  </p>
                </div>

                {chat.unreadCount > 0 && activeChatId !== chat.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 animate-in zoom-in-50">
                    {chat.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
            <i className="fa-solid fa-comments text-5xl mb-4 text-slate-300"></i>
            <p className="font-bold uppercase tracking-widest text-xs">No hay conversaciones aún</p>
            <p className="text-[10px] mt-2">Inicia un chat desde la pestaña Personas</p>
          </div>
        )}
      </div>

      {actionMenuRoom && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActionMenuRoom(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                <i className={`fa-solid ${actionMenuRoom.isChannel ? 'fa-hashtag' : 'fa-comment-dots'} text-2xl`}></i>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic italic">{actionMenuRoom.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Opciones de {actionMenuRoom.isChannel ? 'canal' : 'conversación'}
              </p>
            </div>
            
            <div className="p-4 space-y-2">
              <button 
                onClick={handleDeleteConversation}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition-colors text-left font-bold"
              >
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                  <i className="fa-solid fa-trash-can"></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm">Eliminar {actionMenuRoom.isChannel ? 'Canal' : 'Chat'}</p>
                  <p className="text-[8px] uppercase tracking-widest opacity-60">
                    {actionMenuRoom.isChannel ? 'Limpiar historial y ocultar' : 'Borrar todo el historial'}
                  </p>
                </div>
              </button>
              
              <button 
                onClick={() => setActionMenuRoom(null)}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsView;
