
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { firebaseService } from '../services/firebase';

interface SettingsViewProps {
  currentUser: User;
  onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onLogout }) => {
  const [activeOverlay, setActiveOverlay] = useState<'account' | 'security' | 'data' | null>(null);
  const [editName, setEditName] = useState(currentUser.name);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('notifications_enabled') === 'true' && Notification.permission === 'granted';
  });

  const getStorageSize = () => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += (localStorage.getItem(key) || '').length * 2; // Aproximación en bytes (UTF-16)
      }
    }
    return (total / 1024 / 1024).toFixed(2); // Retorna MB
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await firebaseService.updateUserProfile(currentUser.id, {
        name: editName,
        avatar: editAvatar,
        bio: editBio
      });
      setActiveOverlay(null);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Error al actualizar el perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notifications_enabled', 'true');
      } else {
        alert("Permiso de notificaciones denegado. Por favor, actívalo en la configuración de tu navegador.");
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
    }
  };

  const clearHistory = () => {
    if (confirm("¿Estás seguro de que quieres vaciar toda la caché de mensajes? Esto borrará el historial pero no cerrará tus chats.")) {
      firebaseService.clearAllMessages();
      alert("Caché de mensajes vaciada.");
    }
  };

  const clearVault = () => {
    if (confirm("¿Estás seguro de que quieres vaciar tu Bóveda? Perderás todos los elementos guardados allí.")) {
      firebaseService.clearVault();
      alert("Bóveda vaciada.");
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col h-full overflow-hidden transition-colors duration-300 relative">
      <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 shrink-0 transition-colors">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg uppercase tracking-tight">Preferencias</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 text-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-bl-full -mr-16 -mt-16"></div>
          <div className="relative w-28 h-28 mx-auto mb-6">
            <img src={currentUser.avatar} className="w-full h-full rounded-full border-4 border-blue-50 dark:border-blue-900/20 object-cover shadow-inner" />
            <button 
              onClick={() => setActiveOverlay('account')}
              className="absolute bottom-0 right-0 bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-xl hover:scale-110 transition-transform"
            >
              <i className="fa-solid fa-pen text-xs"></i>
            </button>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</h3>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">{currentUser.email}</p>
          {currentUser.bio && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 italic">"{currentUser.bio}"</p>
          )}
        </div>

        {/* Options List */}
        <div className="space-y-4">
          <h4 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-600 tracking-widest ml-4 mb-2">Configuración</h4>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Notifications Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600">
                  <i className="fa-solid fa-bell"></i>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Notificaciones</span>
              </div>
              <button 
                onClick={handleToggleNotifications}
                className={`w-12 h-6 rounded-full transition-all relative ${notificationsEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <button 
              onClick={() => setActiveOverlay('account')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800/50 text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400">
                  <i className="fa-solid fa-user"></i>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Cuenta de Usuario</span>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 text-[10px]"></i>
            </button>

            <button 
              onClick={() => setActiveOverlay('data')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800/50 text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                  <i className="fa-solid fa-database"></i>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Gestión de Datos</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-400">{getStorageSize()} MB</span>
                <i className="fa-solid fa-chevron-right text-slate-300 text-[10px]"></i>
              </div>
            </button>

            <button 
              onClick={() => setActiveOverlay('security')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Seguridad y Privacidad</span>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-300 text-[10px]"></i>
            </button>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 font-bold uppercase tracking-wider py-5 rounded-3xl transition-all flex items-center justify-center space-x-3 border border-red-50 dark:border-red-900/50 shadow-sm"
        >
          <i className="fa-solid fa-power-off"></i>
          <span>Cerrar Sesión</span>
        </button>

        <p className="text-center text-[10px] text-slate-400 font-bold tracking-widest mt-8 italic">Nequi v1.2.6-PRO</p>
      </div>

      {/* Account Overlay */}
      {activeOverlay === 'account' && (
        <div className="absolute inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 shrink-0">
            <button 
              onClick={() => setActiveOverlay(null)}
              className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h3 className="ml-2 font-bold text-slate-800 dark:text-slate-100">Gestión de Cuenta</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-8 flex flex-col space-y-8">
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-32 h-32 mb-6 group">
                <img src={editAvatar} className="w-full h-full rounded-full border-4 border-blue-50 dark:border-blue-900/20 object-cover shadow-xl" />
                <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <i className="fa-solid fa-camera text-white text-xl"></i>
                </div>
              </div>
            </div>

            <div className="space-y-6 max-w-sm mx-auto w-full">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Nombre Público</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1">Estado / Bio</label>
                <textarea 
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Cuéntanos algo sobre ti..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-4 px-6 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-widest ml-1 mb-4">Información del Sistema</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-slate-500">ID de Usuario</span>
                    <span className="text-xs font-mono text-slate-400">#{currentUser.id}</span>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-slate-500">Correo Electrónico</span>
                    <span className="text-xs text-slate-400">{currentUser.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 max-w-sm mx-auto w-full space-y-4">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 text-white font-bold uppercase tracking-wider py-5 rounded-3xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center space-x-3"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Management Overlay */}
      {activeOverlay === 'data' && (
        <div className="absolute inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 shrink-0">
            <button 
              onClick={() => setActiveOverlay(null)}
              className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h3 className="ml-2 font-bold text-slate-800 dark:text-slate-100">Gestión de Datos</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-10">
            <div className="text-center">
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                <i className="fa-solid fa-database text-3xl"></i>
              </div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">Uso de Almacenamiento</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Estado actual del almacenamiento local de la aplicación.</p>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">Ocupado</span>
                  <span className="text-lg font-black text-blue-600">{getStorageSize()} <span className="text-xs uppercase">MB</span></span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${parseFloat(getStorageSize()) > 4 ? 'bg-red-500' : 'bg-blue-600'}`} 
                    style={{ width: `${Math.min(100, (parseFloat(getStorageSize()) / 5) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 text-center uppercase font-bold tracking-widest">Límite estimado del navegador: 5.00 MB</p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={clearHistory}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <i className="fa-solid fa-broom text-blue-500"></i>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Vaciar Caché de Mensajes</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300 text-[10px]"></i>
                </button>
                <button 
                  onClick={clearVault}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <i className="fa-solid fa-vault text-blue-500"></i>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Limpiar Bóveda</span>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300 text-[10px]"></i>
                </button>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                <i className="fa-solid fa-circle-info mr-2"></i>
                Para optimizar el espacio, el sistema comprime las imágenes y videos antes de enviarlos. Si el almacenamiento se llena, se eliminarán automáticamente los archivos multimedia más antiguos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Overlay (Placeholder) */}
      {activeOverlay === 'security' && (
        <div className="absolute inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 shrink-0">
            <button 
              onClick={() => setActiveOverlay(null)}
              className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h3 className="ml-2 font-bold text-slate-800 dark:text-slate-100">Seguridad</h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mb-6">
              <i className="fa-solid fa-shield-halved text-3xl text-blue-600"></i>
            </div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Seguridad Avanzada</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-8">
              Tu cuenta está protegida por cifrado de extremo a extremo y autenticación Nequi ID.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
