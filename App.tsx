
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import ChatWindow from './components/ChatWindow';
import Auth from './components/Auth';
import BottomNav from './components/BottomNav';
import ContactsView from './components/ContactsView';
import SettingsView from './components/SettingsView';
import VaultView from './components/VaultView';
import CallsView from './components/CallsView';
import ConversationsView from './components/ConversationsView';
import GlobalPlayer from './components/GlobalPlayer';
import { firebaseService } from './services/firebase';
import { User, AppTab, ActiveAudio, Message } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(firebaseService.getCurrentUser());
  const [users, setUsers] = useState<User[]>(firebaseService.getUsers());
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('conversations');
  const [activeAudio, setActiveAudio] = useState<ActiveAudio | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const lastMessageCounts = useRef<Record<string, number>>({});
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribe((data) => {
      setUsers(firebaseService.getUsers());
      setCurrentUser(firebaseService.getCurrentUser());

      const allMessages = data.messages as Record<string, Message[]>;
      if (allMessages && currentUser) {
        Object.keys(allMessages).forEach(roomId => {
          const roomMessages = allMessages[roomId];
          const oldCount = lastMessageCounts.current[roomId] || 0;
          
          if (!isFirstLoad.current && roomMessages.length > oldCount) {
            const newMessages = roomMessages.slice(oldCount);
            newMessages.forEach(msg => {
              if (msg.senderId !== currentUser.id) {
                triggerNotification(msg, roomId);
              }
            });
          }
          lastMessageCounts.current[roomId] = roomMessages.length;
        });
        isFirstLoad.current = false;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeTab === 'conversations' && activeChatId) {
      firebaseService.markAsRead(activeChatId);
    }
  }, [activeChatId, activeTab]);

  const triggerNotification = (message: Message, roomId: string) => {
    const notificationsEnabled = localStorage.getItem('notifications_enabled') === 'true';
    const isRoomVisible = activeTab === 'conversations' && activeChatId === roomId && document.visibilityState === 'visible';

    if (notificationsEnabled && Notification.permission === 'granted' && !isRoomVisible) {
      const title = `Mensaje de ${message.senderName}`;
      let body = '';
      if (message.type === 'text' || message.type === 'ai') body = message.text;
      else if (message.type === 'image') body = '📷 Foto';
      else if (message.type === 'audio') body = '🎙️ Mensaje de voz';

      const notification = new Notification(title, {
        body: body,
        icon: `https://picsum.photos/seed/${message.senderId}/128/128`,
        badge: '/favicon.ico'
      });

      notification.onclick = () => {
        window.focus();
        setActiveTab('conversations');
        setActiveChatId(roomId);
      };
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    firebaseService.updateUserStatus(currentUser.id, 'online');
  }, [currentUser?.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    if (activeAudio?.isPlaying) {
      audioRef.current.play().catch(e => console.error("Playback failed", e));
    } else {
      audioRef.current.pause();
    }
  }, [activeAudio?.isPlaying, activeAudio?.src]);

  const handleTimeUpdate = () => {
    if (audioRef.current && activeAudio) {
      setActiveAudio(prev => prev ? { ...prev, currentTime: audioRef.current!.currentTime } : null);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && activeAudio) {
      setActiveAudio(prev => prev ? { ...prev, duration: audioRef.current!.duration } : null);
    }
  };

  const toggleAudioPlayback = () => {
    setActiveAudio(prev => prev ? { ...prev, isPlaying: !prev.isPlaying } : null);
  };

  const stopAudioPlayback = () => {
    setActiveAudio(null);
  };

  const handleAuthSuccess = () => {
    const user = firebaseService.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      firebaseService.updateUserStatus(user.id, 'online');
    }
  };

  const handleLogout = () => {
    firebaseService.logout();
    setCurrentUser(null);
    stopAudioPlayback();
  };

  const startPrivateChat = (userId: string) => {
    if (!currentUser) return;
    const participants = [currentUser.id, userId].sort();
    const privateRoomId = `private_${participants[0]}_${participants[1]}`;
    setActiveChatId(privateRoomId);
    setActiveTab('conversations');
    setIsNewChatModalOpen(false);
  };

  if (!currentUser) {
    return <Auth onLoginSuccess={handleAuthSuccess} />;
  }

  const renderContent = () => {
    if (activeTab === 'conversations') {
        if (activeChatId) {
            return (
                <ChatWindow 
                  currentUser={currentUser} 
                  roomId={activeChatId} 
                  activeAudio={activeAudio}
                  onAudioPlay={(audio) => setActiveAudio({ ...audio as ActiveAudio, currentTime: 0, isPlaying: true, duration: 0 })}
                  onAudioToggle={toggleAudioPlayback}
                  onBack={() => setActiveChatId(null)}
                />
            );
        }
        return (
            <ConversationsView 
                onSelectChat={(id) => setActiveChatId(id)} 
                activeChatId={activeChatId || ''} 
            />
        );
    }

    switch (activeTab) {
      case 'contacts':
        return (
          <ContactsView 
            users={users} 
            currentUser={currentUser} 
            setActiveTab={setActiveTab} 
            setActiveChatId={(id) => {
                setActiveChatId(id);
                setActiveTab('conversations');
            }}
          />
        );
      case 'vault':
        return <VaultView />;
      case 'calls':
        return <CallsView />;
      case 'settings':
        return <SettingsView 
          currentUser={currentUser} 
          onLogout={handleLogout} 
        />;
      default:
        return <ConversationsView 
            onSelectChat={(id) => setActiveChatId(id)} 
            activeChatId={activeChatId || ''} 
        />;
    }
  };

  return (
    <Layout>
      <audio 
        ref={audioRef}
        src={activeAudio?.src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={stopAudioPlayback}
        className="hidden"
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
        <div className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 shrink-0 justify-between transition-colors z-20">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-shield-halved text-blue-600"></i>
            <span className="font-bold italic text-slate-800 dark:text-slate-100 tracking-tighter uppercase text-sm">
              {activeTab === 'conversations' ? (activeChatId ? 'Chat' : 'Mensajes') : activeTab === 'contacts' ? 'Personas' : activeTab === 'vault' ? 'Bóveda' : activeTab === 'calls' ? 'Llamadas' : 'Ajustes'}
            </span>
          </div>
          <button 
            onClick={() => {
              setActiveTab('settings');
              setActiveChatId(null);
            }}
            className="relative group transition-transform active:scale-95 focus:outline-none"
            aria-label="Ir a perfil"
          >
            <img 
              src={currentUser.avatar} 
              className={`w-8 h-8 rounded-full border-2 transition-all ${activeTab === 'settings' ? 'border-blue-600' : 'border-slate-100 dark:border-slate-700'}`} 
              alt="Profile" 
            />
            <div className="absolute inset-0 rounded-full bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>

        {activeAudio && (
          <GlobalPlayer 
            activeAudio={activeAudio} 
            onToggle={toggleAudioPlayback} 
            onClose={stopAudioPlayback} 
          />
        )}
        
        {renderContent()}

        {(activeTab === 'contacts' || (activeTab === 'conversations' && !activeChatId)) && (
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            className="fixed bottom-20 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-40 group"
          >
            <i className="fa-solid fa-plus text-xl group-hover:rotate-90 transition-transform duration-300"></i>
            <div className="absolute -top-12 right-0 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">Nuevo Chat</div>
          </button>
        )}

        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsNewChatModalOpen(false)} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Nueva Conversación</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Selecciona un contacto</p>
                </div>
                <button onClick={() => setIsNewChatModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {users.filter(u => u.id !== currentUser.id).length > 0 ? (
                  users.filter(u => u.id !== currentUser.id).map(user => (
                    <button 
                      key={user.id} 
                      onClick={() => startPrivateChat(user.id)}
                      className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                    >
                      <div className="relative shrink-0">
                        <img src={user.avatar} className="w-12 h-12 rounded-full border border-slate-100 dark:border-slate-800 object-cover group-hover:scale-105 transition-transform" alt={user.name} />
                        <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${user.status === 'online' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{user.name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-200 group-hover:text-blue-600 transition-colors">
                        <i className="fa-solid fa-message text-xs"></i>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-30">
                    <i className="fa-solid fa-user-slash text-4xl mb-4"></i>
                    <p className="font-bold uppercase tracking-widest text-[10px]">No hay contactos disponibles</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </Layout>
  );
};

export default App;
