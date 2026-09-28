import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, LayoutTemplate, Radio, History, 
  Sparkles, RefreshCw, Smartphone
} from 'lucide-react';
import { ensureWaSeedData } from '../data/whatsappSeed';
import WaGeneratorTab from '../components/whatsapp/WaGeneratorTab';
import WaTemplatesTab from '../components/whatsapp/WaTemplatesTab';
import WaBroadcastTab from '../components/whatsapp/WaBroadcastTab';
import WaLogsTab from '../components/whatsapp/WaLogsTab';

export default function WhatsappGatewayPage() {
  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'templates' | 'broadcast' | 'logs'>('generator');

  useEffect(() => {
    ensureWaSeedData();
  }, []);

  const subTabs = [
    { id: 'generator', label: 'Generator Pesan Cepat', icon: Smartphone },
    { id: 'templates', label: 'Kelola Template Pesan', icon: LayoutTemplate },
    { id: 'broadcast', label: 'Broadcast Massal Rombel', icon: Radio },
    { id: 'logs', label: 'Riwayat & Log Audit', icon: History },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-bold">
              <Sparkles size={14} className="text-emerald-300" />
              <span>Otomasi Komunikasi Sekolah & Wali Murid Terpadu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Modul WhatsApp Gateway & Generator
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Otomasi notifikasi presensi harian, rincian tagihan keuangan/administrasi, undangan resmi wali murid, informasi e-rapor, serta broadcast massal terpersonalisasi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                ensureWaSeedData();
                window.location.reload();
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/20 transition flex items-center gap-2 backdrop-blur-sm cursor-pointer"
            >
              <RefreshCw size={15} />
              <span>Muat Ulang Data</span>
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
                  ? 'bg-emerald-600 text-white shadow-xs'
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
        {activeSubTab === 'generator' && <WaGeneratorTab />}
        {activeSubTab === 'templates' && <WaTemplatesTab />}
        {activeSubTab === 'broadcast' && <WaBroadcastTab />}
        {activeSubTab === 'logs' && <WaLogsTab />}
      </div>
    </div>
  );
}
