
import React from 'react';
import { ActiveAudio } from '../types';

interface GlobalPlayerProps {
  activeAudio: ActiveAudio;
  onToggle: () => void;
  onClose: () => void;
}

const GlobalPlayer: React.FC<GlobalPlayerProps> = ({ activeAudio, onToggle, onClose }) => {
  const progress = (activeAudio.currentTime / (activeAudio.duration || 1)) * 100;

  return (
    <div className="w-full px-4 py-3 bg-blue-50/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-blue-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300 z-30 shrink-0">
      <div className="max-w-4xl mx-auto flex items-center space-x-4">
        <div className="relative shrink-0">
          <img src={activeAudio.senderAvatar} className="w-10 h-10 rounded-full border border-white dark:border-slate-700 shadow-sm" />
          <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] border-2 border-white dark:border-slate-900">
            <i className="fa-solid fa-microphone"></i>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mb-1">
            Reproduciendo audio de {activeAudio.senderName}
          </p>
          <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-100 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={onToggle}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md active:scale-90"
          >
            <i className={`fa-solid ${activeAudio.isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
          </button>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalPlayer;
