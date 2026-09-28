import React, { useState } from 'react';
import { UserSession } from '../types/schema';
import { BarChart3, Users, GraduationCap, Wallet, ShieldAlert, Boxes, Download } from 'lucide-react';

interface LaporanModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export function LaporanModule({ userSession, dbData, setDbData, activeSubTab }: LaporanModuleProps) {
  const [subTab, setSubTab] = useState<string>(activeSubTab || 'dashboard');

  React.useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'dashboard_lap') setSubTab('dashboard');
      else setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const items = [
    { id: 'dashboard', label: 'Laporan Dashboard', icon: BarChart3 },
    { id: 'siswa', label: 'Lap. Data Siswa', icon: Users },
    { id: 'akademik', label: 'Lap. Akademik', icon: GraduationCap },
    { id: 'keuangan', label: 'Lap. Keuangan', icon: Wallet },
    { id: 'bk', label: 'Lap. BK & Pelanggaran', icon: ShieldAlert },
    { id: 'sarpras', label: 'Lap. Sarpras (Aset)', icon: Boxes },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex justify-between items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> REKAPITULASI & LAPORAN EKSPOR
          </div>
          <h2 className="text-xl font-black text-slate-800">Hub Laporan Terpadu & Export Excel/PDF</h2>
        </div>
        <button className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Ekspor Semua Laporan
        </button>
      </div>

      <div className="flex overflow-x-auto gap-2">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSubTab(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                subTab === item.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-800 text-sm">Pratinjau & Cetak Laporan Resmi</h3>
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
          Data dikalkulasi secara realtime dari seluruh 56 sheet database.
        </div>
      </div>
    </div>
  );
}
