import React, { useState, useEffect } from 'react';
import { 
  Newspaper, Megaphone, Calendar, Sparkles, RefreshCw 
} from 'lucide-react';
import { ensureMadingSeedData } from '../data/madingSeed';
import MadingKaryaTab from '../components/mading/MadingKaryaTab';
import MadingPengumumanTab from '../components/mading/MadingPengumumanTab';
import MadingAgendaTab from '../components/mading/MadingAgendaTab';

export default function MadingDigitalPage() {
  const [activeSubTab, setActiveSubTab] = useState<'karya' | 'pengumuman' | 'agenda'>('karya');

  useEffect(() => {
    ensureMadingSeedData();
  }, []);

  const subTabs = [
    { id: 'karya', label: 'Mading Karya & Literasi Siswa', icon: Newspaper },
    { id: 'pengumuman', label: 'Surat Edaran Kedinasan', icon: Megaphone },
    { id: 'agenda', label: 'Kalender & Agenda Sekolah', icon: Calendar },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-rose-200 text-xs font-bold">
              <Sparkles size={14} className="text-rose-300" />
              <span>Pusat Literasi, Kreativitas & Informasi Sekolah</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Modul Papan Mading & Informasi Digital
            </h1>
            <p className="text-rose-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Wadah apresiasi karya tulis, cerpen, puisi, prestasi siswa, papan surat edaran resmi kedinasan, serta timeline kalender agenda akademik sekolah.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                ensureMadingSeedData();
                window.location.reload();
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/20 transition flex items-center gap-2 backdrop-blur-sm cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Muat Ulang Mading</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtabs Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div>
        {activeSubTab === 'karya' && <MadingKaryaTab />}
        {activeSubTab === 'pengumuman' && <MadingPengumumanTab />}
        {activeSubTab === 'agenda' && <MadingAgendaTab />}
      </div>
    </div>
  );
}
