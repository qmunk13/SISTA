import React, { useState } from 'react';
import { 
  ShieldAlert, HeartHandshake, AlertTriangle, Award, Compass
} from 'lucide-react';
import BkDashboardTab from '../components/bk/BkDashboardTab';
import KonselingTab from '../components/bk/KonselingTab';
import PelanggaranTab from '../components/bk/PelanggaranTab';
import PrestasiTab from '../components/bk/PrestasiTab';
import KarirRekomendasiTab from '../components/bk/KarirRekomendasiTab';
import CustomDropdown from '../components/common/CustomDropdown';

export default function BkPage() {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'konseling' | 'pelanggaran' | 'prestasi' | 'karir'>('dashboard');

  const subTabs = [
    { id: 'dashboard', label: 'BK Dashboard', icon: ShieldAlert },
    { id: 'konseling', label: 'Konseling Siswa', icon: HeartHandshake },
    { id: 'pelanggaran', label: 'Catatan Pelanggaran & Poin', icon: AlertTriangle },
    { id: 'prestasi', label: 'Prestasi Siswa', icon: Award },
    { id: 'karir', label: 'Karir & Rekomendasi', icon: Compass },
  ];

  const handleSubTabChange = (tabId: string) => {
    setActiveSubTab(tabId as any);
    window.scrollTo({ top: 0, behavior: 'instant' });
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80 shadow-2xs shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Bimbingan Konseling & Prestasi
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Layanan bimbingan siswa, pendataan poin pelanggaran/sanksi, pendataan kejuaraan prestasi, & rekomendasi minat bakat.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation: Mobile Dropdown */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <CustomDropdown
          id="bk-subtab-mobile"
          label="Pilih Sub-Menu BK & Prestasi:"
          value={activeSubTab}
          onChange={(val) => handleSubTabChange(val)}
          options={subTabs.map(tab => ({ value: tab.id, label: tab.label }))}
          placeholder="Pilih Sub-Menu..."
        />
      </div>

      {/* Sub Tabs: Desktop Pill Tabs */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-rose-600 border border-slate-200/80'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab View Rendering */}
      {activeSubTab === 'dashboard' && (
        <BkDashboardTab onNavigate={(tab) => handleSubTabChange(tab)} />
      )}

      {activeSubTab === 'konseling' && (
        <KonselingTab />
      )}

      {activeSubTab === 'pelanggaran' && (
        <PelanggaranTab />
      )}

      {activeSubTab === 'prestasi' && (
        <PrestasiTab />
      )}

      {activeSubTab === 'karir' && (
        <KarirRekomendasiTab />
      )}
    </div>
  );
}
