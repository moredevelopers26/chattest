
import React from 'react';
import { AppTab } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'conversations' as AppTab, icon: 'fa-message', label: 'Mensajes' },
    { id: 'contacts' as AppTab, icon: 'fa-user-group', label: 'Personas' },
    { id: 'vault' as AppTab, icon: 'fa-lock', label: 'Bóveda' },
    { id: 'calls' as AppTab, icon: 'fa-phone-flip', label: 'Llamadas' },
    { id: 'settings' as AppTab, icon: 'fa-gear', label: 'Ajustes' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-2 py-2 pb-safe-area-inset-bottom z-50 flex justify-around items-center transition-colors duration-300 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center space-y-1 py-2 px-2 min-w-[64px] rounded-xl transition-all duration-300 relative ${
            activeTab === tab.id
              ? 'text-blue-600'
              : 'text-slate-400 dark:text-slate-600 hover:text-blue-400'
          }`}
        >
          <div className={`text-xl transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'scale-100'}`}>
            <i className={`fa-solid ${tab.icon}`}></i>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-wider">{tab.label}</span>
          {activeTab === tab.id && (
            <div className="absolute bottom-0 w-6 h-0.5 bg-blue-600 rounded-full"></div>
          )}
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
