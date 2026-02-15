
import React from 'react';

const CallsView: React.FC = () => {
  const callHistory = [
    { id: '1', name: 'Gemini AI', type: 'incoming', date: 'Hoy, 10:45 AM', duration: '12m 30s', missed: false },
    { id: '2', name: 'Jane Doe', type: 'outgoing', date: 'Ayer, 8:20 PM', duration: '5m 12s', missed: false },
    { id: '3', name: 'John Smith', type: 'incoming', date: 'May 18, 2:15 PM', duration: '0s', missed: true },
    { id: '4', name: 'Alice Wonder', type: 'outgoing', date: 'May 17, 11:00 AM', duration: '45m 02s', missed: false },
  ];

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col h-full overflow-hidden transition-colors relative">
      <div className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 shrink-0 bg-white dark:bg-slate-900">
        <div className="flex items-center space-x-3 text-blue-600">
          <i className="fa-solid fa-phone-flip"></i>
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg uppercase tracking-tight">Historial</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl flex flex-col items-center justify-center group hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm">
             <i className="fa-solid fa-phone text-blue-600 mb-2 text-xl"></i>
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">Voz</span>
          </button>
          <button className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-3xl flex flex-col items-center justify-center group hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shadow-sm">
             <i className="fa-solid fa-video text-blue-600 mb-2 text-xl"></i>
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">Video</span>
          </button>
        </div>

        <h4 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider ml-4 mb-2">Llamadas Recientes</h4>
        <div className="space-y-1">
          {callHistory.map((call) => (
            <div 
              key={call.id} 
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800 group cursor-pointer shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img src={`https://picsum.photos/seed/${call.id}/40/40`} className="w-12 h-12 rounded-full border border-slate-100 dark:border-slate-800 object-cover" />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 ${call.missed ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                    <i className={`fa-solid ${call.type === 'incoming' ? 'fa-arrow-down-left' : 'fa-arrow-up-right'} text-[8px]`}></i>
                  </div>
                </div>
                <div>
                  <p className={`text-sm font-bold tracking-tight ${call.missed ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                    {call.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                    {call.date} {call.duration !== '0s' && `• ${call.duration}`}
                  </p>
                </div>
              </div>
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition-all">
                <i className="fa-solid fa-circle-info"></i>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CallsView;
