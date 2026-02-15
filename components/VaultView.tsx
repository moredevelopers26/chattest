
import React, { useState, useEffect } from 'react';
import { VaultItem } from '../types';
import { firebaseService } from '../services/firebase';

const VaultView: React.FC = () => {
  const [items, setItems] = useState<VaultItem[]>(firebaseService.getVaultItems());
  const [activeItem, setActiveItem] = useState<VaultItem | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribe((data) => {
      if (data.vault) setItems(data.vault);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Seguro que quieres eliminar este elemento de la bóveda?')) {
      firebaseService.deleteFromVault(id);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex-1 bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center transition-colors duration-500">
        <div className="relative mb-8">
          <div className="absolute inset-0 scale-150 bg-blue-50 dark:bg-blue-900/10 rounded-full animate-ping opacity-20"></div>
          <div className="w-28 h-28 bg-blue-50 dark:bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center relative z-10 border border-blue-100 dark:border-blue-500/20 shadow-2xl shadow-blue-100 dark:shadow-none">
            <i className="fa-solid fa-lock text-5xl text-blue-600 dark:text-blue-500"></i>
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter uppercase italic">Bóveda Cifrada</h2>
        <div className="w-12 h-1 bg-blue-600 rounded-full mb-6"></div>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mb-10 leading-relaxed font-medium">Tus elementos multimedia guardados están protegidos con cifrado de grado militar <span className="text-blue-600 font-bold">AES-256</span>.</p>
        <button onClick={() => setIsUnlocked(true)} className="group relative bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest px-10 py-5 rounded-2xl shadow-2xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 overflow-hidden">
          <span className="relative z-10 flex items-center space-x-3"><span>Desbloquear Bóveda</span><i className="fa-solid fa-shield-halved text-xs"></i></span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col h-full overflow-hidden transition-colors relative">
      <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 shrink-0 bg-white dark:bg-slate-900 justify-between">
        <div className="flex items-center space-x-3 text-blue-600">
          <i className="fa-solid fa-shield-halved"></i>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg uppercase tracking-tight">Bóveda Multimedia</h2>
        </div>
        <button onClick={() => setIsUnlocked(false)} className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-500">Cerrar</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><i className="fa-solid fa-folder-open text-2xl"></i></div>
            <p className="text-sm font-medium">No hay elementos guardados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setActiveItem(item)}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:ring-2 hover:ring-blue-500/50 transition-all cursor-pointer"
              >
                {item.type === 'image' ? (
                  <div className="aspect-square">
                    <img src={item.content} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="aspect-square flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-2xl flex items-center justify-center mb-3 text-blue-600">
                      <i className={`fa-solid ${item.type === 'audio' ? 'fa-microphone-lines' : item.type === 'video' ? 'fa-video' : 'fa-file-lines'} text-xl`}></i>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 text-center line-clamp-1">{item.name}</p>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">{item.senderName}</p>
                  </div>
                )}
                <button onClick={(e) => handleDelete(e, item.id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md text-white/60 hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeItem && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300">
          <div className="h-16 flex items-center px-4 justify-between bg-black/40 backdrop-blur-md border-b border-white/5 z-20">
            <button onClick={() => setActiveItem(null)} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-white/10"><i className="fa-solid fa-arrow-left"></i></button>
            <div className="text-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">{activeItem.name}</h3>
              <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest">De {activeItem.senderName}</p>
            </div>
            <button onClick={() => { if(confirm('¿Eliminar?')) { firebaseService.deleteFromVault(activeItem.id); setActiveItem(null); } }} className="w-10 h-10 rounded-full flex items-center justify-center text-red-400 bg-white/10"><i className="fa-solid fa-trash-can text-sm"></i></button>
          </div>

          <div className="flex-1 flex items-center justify-center p-6">
            {activeItem.type === 'image' ? (
              <img src={activeItem.content} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
            ) : activeItem.type === 'video' ? (
              <video src={activeItem.content} controls className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl w-full max-w-sm text-center">
                <i className={`fa-solid ${activeItem.type === 'document' ? 'fa-file-lines' : 'fa-microphone'} text-5xl text-blue-600 mb-6`}></i>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{activeItem.name}</h4>
                <p className="text-slate-400 text-sm mb-8">Elemento seguro cifrado.</p>
                {activeItem.type === 'audio' && <audio src={activeItem.content} controls className="w-full" />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultView;
