
import React, { useState } from 'react';
import { User, AppTab } from '../types';
import { firebaseService } from '../services/firebase';

interface ContactsViewProps {
  users: User[];
  currentUser: User;
  setActiveTab: (tab: AppTab) => void;
  setActiveChatId: (id: string) => void;
}

const ContactsView: React.FC<ContactsViewProps> = ({ users, currentUser, setActiveTab, setActiveChatId }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    
    return new Date(timestamp).toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-amber-500';
      case 'offline': return 'bg-slate-400';
      default: return 'bg-slate-300';
    }
  };

  const channels = [
    { id: 'global', name: 'Nequi Global', icon: 'fa-globe', desc: 'Canal general' },
    { id: 'ai-lab', name: 'Laboratorio AI', icon: 'fa-robot', desc: 'Gemini experiments' },
    { id: 'test-channel', name: 'Canal de Prueba', icon: 'fa-flask', desc: 'Testing channel' },
  ];

  const handleChannelClick = (channelId: string) => {
    // Al abrirlo desde aquí, firebaseService.markAsRead se encargará de hacerlo visible
    firebaseService.markAsRead(channelId);
    setActiveChatId(channelId);
    setActiveTab('conversations');
  };

  const startPrivateChat = (userId: string) => {
    const participants = [currentUser.id, userId].sort();
    const roomId = `private_${participants[0]}_${participants[1]}`;
    firebaseService.markAsRead(roomId);
    setActiveChatId(roomId);
    setActiveTab('conversations');
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-white dark:bg-slate-900 flex flex-col h-full overflow-hidden transition-colors relative">
      <div className="px-6 pt-4 pb-2 shrink-0">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 transition-colors"></i>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar contactos o correos..." 
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 outline-none transition-all text-slate-800 dark:text-slate-100 shadow-sm"
          />
        </div>
      </div>

      <div className="h-12 flex items-center px-6 shrink-0">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg uppercase tracking-tight italic italic">Personas</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h4 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-3 ml-2">Canales Disponibles</h4>
          <div className="grid grid-cols-1 gap-2">
            {channels.map((channel) => (
              <button 
                key={channel.id}
                onClick={() => handleChannelClick(channel.id)}
                className="w-full flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-blue-400 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <i className={`fa-solid ${channel.icon}`}></i>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{channel.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">{channel.desc}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[10px] text-slate-300 group-hover:text-blue-500 pr-2"></i>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-3 ml-2">Miembros del equipo</h4>
          <div className="space-y-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  onClick={() => setSelectedUser(user)}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img src={user.avatar} className="w-12 h-12 rounded-full border border-slate-100 dark:border-slate-800 object-cover" />
                      <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${user.id === currentUser.id || user.status === 'online' ? 'bg-green-500' : getStatusColor(user.status)}`}></div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {user.name} {user.id === currentUser.id && <span className="text-[10px] font-normal text-slate-400 ml-1">(Tú)</span>}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                        {user.id === currentUser.id || user.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(user.lastSeen)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-300 dark:text-slate-700 group-hover:text-blue-500 transition-colors">
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <i className="fa-solid fa-user-slash text-2xl mb-2"></i>
                <p className="text-sm">No se encontraron contactos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="absolute inset-0 z-[60] bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 animate-in slide-in-from-right">
          <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 shrink-0">
            <button 
              onClick={() => setSelectedUser(null)}
              className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 transition-colors"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h3 className="ml-2 font-bold text-slate-800 dark:text-slate-100 uppercase italic tracking-tighter italic">Perfil</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-[2rem] border-4 border-blue-50 dark:border-blue-900/30 p-1 shadow-xl">
                <img src={selectedUser.avatar} className="w-full h-full rounded-[1.8rem] object-cover" />
              </div>
              <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 ${getStatusColor(selectedUser.status)}`}></div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 text-center mb-1 uppercase tracking-tight">{selectedUser.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 font-mono text-xs">{selectedUser.email}</p>

            <div className="w-full max-w-sm space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                  <i className="fa-solid fa-circle-info text-sm"></i>
                  <span className="text-sm font-medium">Estado</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white ${getStatusColor(selectedUser.status)}`}>
                  {selectedUser.status}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
                  <i className="fa-solid fa-clock text-sm"></i>
                  <span className="text-sm font-medium">Última vez</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold">
                  {formatLastSeen(selectedUser.lastSeen)}
                </span>
              </div>
            </div>

            <div className="w-full max-w-sm mt-10 grid grid-cols-2 gap-4">
              <button 
                onClick={() => startPrivateChat(selectedUser.id)}
                className="flex flex-col items-center justify-center p-6 rounded-[2.5rem] bg-blue-600 text-white hover:bg-blue-700 transition-all group shadow-xl shadow-blue-100 dark:shadow-none"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2 group-active:scale-95 transition-transform">
                  <i className="fa-solid fa-message"></i>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Mensaje</span>
              </button>
              
              <button className="flex flex-col items-center justify-center p-6 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-all group">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center mb-2 shadow-sm group-active:scale-95 transition-transform">
                  <i className="fa-solid fa-phone"></i>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Llamar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsView;
