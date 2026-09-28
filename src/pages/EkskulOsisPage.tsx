import React, { useState, useEffect } from 'react';
import { 
  Users, Award, CalendarCheck, Shield, Sparkles, RefreshCw, UserPlus 
} from 'lucide-react';
import { ensureEkskulSeedData } from '../data/ekskulOsisSeed';
import EkskulMasterTab from '../components/ekskul/EkskulMasterTab';
import EkskulAnggotaTab from '../components/ekskul/EkskulAnggotaTab';
import EkskulPresensiTab from '../components/ekskul/EkskulPresensiTab';
import EkskulNilaiTab from '../components/ekskul/EkskulNilaiTab';
import OsisKepengurusanTab from '../components/ekskul/OsisKepengurusanTab';

export default function EkskulOsisPage() {
  const [activeSubTab, setActiveSubTab] = useState<'master' | 'anggota' | 'presensi' | 'nilai' | 'osis'>('master');

  useEffect(() => {
    ensureEkskulSeedData();
  }, []);

  const subTabs = [
    { id: 'master', label: 'Unit Ekstrakurikuler', icon: Users },
    { id: 'anggota', label: 'Keanggotaan Siswa', icon: UserPlus },
    { id: 'presensi', label: 'Presensi Sesi Latihan', icon: CalendarCheck },
    { id: 'nilai', label: 'Penilaian Rapor Merdeka', icon: Award },
    { id: 'osis', label: 'Organisasi OSIS & Proker', icon: Shield },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-bold">
              <Sparkles size={14} className="text-blue-300" />
              <span>Pengembangan Bakat, Minat & Kepemimpinan Siswa</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Modul Ekstrakurikuler & OSIS
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Manajemen jadwal latihan, pendaftaran anggota, absensi pertemuan rutin, integrasi deskripsi nilai capaian rapor, serta struktur program kerja OSIS.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                ensureEkskulSeedData();
                window.location.reload();
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/20 transition flex items-center gap-2 backdrop-blur-sm cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Sinkronisasi Data</span>
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
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Component */}
      <div>
        {activeSubTab === 'master' && <EkskulMasterTab />}
        {activeSubTab === 'anggota' && <EkskulAnggotaTab />}
        {activeSubTab === 'presensi' && <EkskulPresensiTab />}
        {activeSubTab === 'nilai' && <EkskulNilaiTab />}
        {activeSubTab === 'osis' && <OsisKepengurusanTab />}
      </div>
    </div>
  );
}
