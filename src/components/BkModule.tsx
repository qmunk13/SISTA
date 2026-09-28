import React, { useState } from 'react';
import { UserSession } from '../types/schema';
import { ShieldAlert, Heart, Trophy, Compass, FileText } from 'lucide-react';

interface BkModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export function BkModule({ userSession, dbData, setDbData, activeSubTab }: BkModuleProps) {
  const [subTab, setSubTab] = useState<string>(activeSubTab || 'dashboard');

  React.useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'dashboard_bk') setSubTab('dashboard');
      else setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const items = [
    { id: 'dashboard', label: 'BK Dashboard', icon: ShieldAlert },
    { id: 'konseling', label: 'Konseling Siswa', icon: Heart },
    { id: 'pelanggaran', label: 'Catatan Pelanggaran', icon: FileText },
    { id: 'prestasi', label: 'Prestasi Siswa', icon: Trophy },
    { id: 'karir', label: 'Karir & Rekomendasi', icon: Compass },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold uppercase mb-2">
          <ShieldAlert className="w-3.5 h-3.5" /> BIMBINGAN KONSELING & PRESTASI
        </div>
        <h2 className="text-xl font-black text-slate-800">Modul BK, Poin Pelanggaran & Karir Siswa</h2>
      </div>

      <div className="flex overflow-x-auto gap-2">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSubTab(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                subTab === item.id ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-800 text-sm">Summary Bimbingan & Rekomendasi Karir</h3>
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
          Tercatat dalam 56 Google Sheets DB Rombel Tambora.
        </div>
      </div>
    </div>
  );
}
