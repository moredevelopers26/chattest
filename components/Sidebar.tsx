
import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { firebaseService } from '../services/firebase';

interface SidebarProps {
  currentUser: User;
  users: User[];
  onLogout: () => void;
  activeChatId: string;
  setActiveChatId: (id: string) => void;
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

const Sidebar: React.FC<SidebarProps> = ({ currentUser, users, onLogout, activeChatId, setActiveChatId }) => {
  const [conversations, setConversations] = useState(firebaseService.getChatList());

  // Fix: Ensure the cleanup function returns void.
  // firebaseService.subscribe returns a function that calls Set.delete, which returns a boolean.
  useEffect(() => {
    const unsubscribe = firebaseService.subscribe(() => {
      setConversations(firebaseService.getChatList());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="w-80 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col hidden md:flex transition-colors">
      {/* User Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          </div>
          <div className="overflow-hidden">
            <h3 className="font-bold text-sm truncate text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Nequi Personal</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{currentUser.name.split(' ')[0]}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <i className="fa-solid fa-plus text-xs"></i>
          </button>
          <button 
            onClick={onLogout}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            title="Logout"
          >
            <i className="fa-solid fa-power-off text-xs"></i>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="px-3 py-4">
          <h4 className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-600 tracking-[0.2em] mb-4">Conversaciones</h4>
          
          <div className="space-y-1">
            {conversations.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-2xl transition-all relative group ${
                  activeChatId === chat.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${
                  activeChatId === chat.id 
                    ? 'bg-white/20' 
                    : (chat.id === 'ai-lab' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-slate-100 dark:bg-slate-800')
                }`}>
                  {chat.avatar ? (
                    <img src={chat.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <i className={`fa-solid ${chat.icon} ${activeChatId === chat.id ? 'text-white' : ''}`}></i>
                  )}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm font-bold truncate ${activeChatId === chat.id ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                      {chat.name}
                    </p>
                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${activeChatId === chat.id ? 'text-white/70' : 'text-slate-400'}`}>
                      {formatChatTime(chat.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${activeChatId === chat.id ? 'text-white/80' : 'text-slate-500 dark:text-slate-500'}`}>
                    {chat.lastMessage}
                  </p>
                </div>

                {chat.unreadCount > 0 && activeChatId !== chat.id && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 animate-in zoom-in-50">
                    {chat.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Contacts Preview */}
        <div className="px-3 py-2">
          <h4 className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-600 tracking-[0.2em] mb-4">Contactos Activos</h4>
          <div className="flex -space-x-2 px-2">
            {users.filter(u => u.id !== currentUser.id).slice(0, 5).map(user => (
              <div key={user.id} className="relative group cursor-pointer" onClick={() => {
                const parts = [currentUser.id, user.id].sort();
                setActiveChatId(`private_${parts[0]}_${parts[1]}`);
              }}>
                <img 
                  src={user.avatar} 
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 object-cover hover:-translate-y-1 transition-transform" 
                  title={user.name}
                />
                <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${user.status === 'online' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
