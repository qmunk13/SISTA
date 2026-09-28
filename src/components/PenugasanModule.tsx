import React, { useState } from 'react';
import { UserSession } from '../types/schema';
import { ClipboardList, CheckCircle2, Clock, FileText, Send } from 'lucide-react';

interface PenugasanModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export function PenugasanModule({ userSession, dbData, setDbData, activeSubTab }: PenugasanModuleProps) {
  const [subTab, setSubTab] = useState<string>(activeSubTab || 'dashboard');

  React.useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'dashboard_tugas') setSubTab('dashboard');
      else if (activeSubTab === 'daftar_tugas') setSubTab('daftar');
      else if (activeSubTab === 'penilaian') setSubTab('hasil');
      else setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase mb-2">
            <ClipboardList className="w-3.5 h-3.5" /> MODUL PENUGASAN KBM
          </div>
          <h2 className="text-xl font-black text-slate-800">Manajemen Tugas & Pengumpulan KBM</h2>
          <p className="text-xs text-slate-500">Buat tugas, bagikan ke siswa, dan beri nilai secara online.</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[
          { id: 'dashboard', label: 'Dashboard Tugas' },
          { id: 'daftar', label: 'Daftar Tugas' },
          { id: 'hasil', label: 'Hasil Pengumpulan' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setSubTab(item.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              subTab === item.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-800 text-sm">Status Penyerahan Tugas Siswa</h3>
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
          Seluruh tugas Paket A, B, & C terpantau secara real-time.
        </div>
      </div>
    </div>
  );
}
