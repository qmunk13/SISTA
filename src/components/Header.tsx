import React, { useState } from 'react';
import { Menu, Bell, Calendar, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { User as UserType } from '../types';
import { autoSyncEngine } from '../data/autoSyncEngine';

declare const Swal: any;

interface HeaderProps {
  user: UserType;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export default function Header({ user, onToggleSidebar, onLogout }: HeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      const res = await autoSyncEngine.pullAndApplyAllSheets({ silent: false });
      setIsSyncing(false);
      
      if (res.success) {
        Swal.fire({
          icon: 'success',
          title: 'Sinkronisasi Spreadsheet Berhasil! 🎉',
          text: res.message || 'Data terbaru berhasil disinkronkan langsung dari Google Spreadsheet.',
          confirmButtonColor: '#10b981'
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Info Sinkronisasi',
          text: res.message || 'Tidak ada pembaruan data atau URL belum terkonfigurasi.',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (err: any) {
      setIsSyncing(false);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Sinkronisasi Spreadsheet',
        text: err.message || 'Gagal tersambung dengan Google Spreadsheet.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <div className="hidden sm:block">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ROMBEL ERP</span>
          <h2 className="text-sm font-bold text-slate-800 leading-tight">Sistem Akademik Terpadu</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="hidden sm:flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
          title="Sinkronisasi 2 Arah: Tarik data terbaru dari Google Sheets & sinkronkan data lokal ke Spreadsheet"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron 2 Arah'}</span>
        </button>

        <div className="text-right hidden md:block border-r border-slate-200 pr-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Hari ini</p>
          <p className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 justify-end">
            <Calendar className="w-3.5 h-3.5 text-blue-500" /> {today}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 relative hover:bg-slate-50 transition shadow-sm">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
          </button>

          <div className="flex items-center gap-3 border-l pl-4 border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-inner uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-extrabold text-slate-800 block truncate max-w-[120px]">{user.name}</span>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 uppercase tracking-wide inline-block mt-0.5">{user.role}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
