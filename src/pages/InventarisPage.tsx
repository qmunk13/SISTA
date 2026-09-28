import React, { useState, useEffect } from 'react';
import { 
  Package, Building2, Repeat, Wrench, Layers, Boxes
} from 'lucide-react';
import { ensureSarprasSeedData } from '../data/sarprasSeed';
import InventarisDashboardTab from '../components/sarpras/InventarisDashboardTab';
import DaftarBarangSarprasTab from '../components/sarpras/DaftarBarangSarprasTab';
import DenahRuanganAsetTab from '../components/sarpras/DenahRuanganAsetTab';
import MutasiPeminjamanSarprasTab from '../components/sarpras/MutasiPeminjamanSarprasTab';
import PerawatanKondisiRusakTab from '../components/sarpras/PerawatanKondisiRusakTab';
import CustomDropdown from '../components/common/CustomDropdown';

export default function InventarisPage() {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  useEffect(() => {
    ensureSarprasSeedData();
  }, []);

  const subTabs = [
    { id: 'dashboard', label: 'Inventaris Dashboard', icon: Package, count: null },
    { id: 'daftar-barang', label: 'Daftar Barang & Sarpras', icon: Boxes, count: null },
    { id: 'denah-ruangan', label: 'Denah & Ruangan Aset', icon: Building2, count: null },
    { id: 'mutasi-pinjam', label: 'Mutasi & Peminjaman Sarpras', icon: Repeat, count: null },
    { id: 'perawatan-rusak', label: 'Perawatan & Kondisi Rusak', icon: Wrench, count: null },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100/80 shadow-2xs flex-shrink-0">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Inventaris & Sarpras
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pendataan aset barang KIB A-F, denah ruangan sarpras, formulir sirkulasi peminjaman, & perawatan kondisi rusak.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation: Mobile Dropdown Selector & Desktop Pill Tabs */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <CustomDropdown
          id="sarpras-subtab-mobile"
          label="Pilih Sub-Menu Sarpras:"
          value={activeSubTab}
          onChange={(val) => setActiveSubTab(val)}
          options={subTabs.map(tab => ({ value: tab.id, label: tab.label }))}
          placeholder="Pilih Sub-Menu..."
        />
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:flex items-center gap-2 p-1.5 bg-slate-200/60 rounded-2xl w-fit border border-slate-300/40 overflow-x-auto max-w-full">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 whitespace-nowrap ${
                isActive
                  ? 'bg-white text-orange-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-orange-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Contents */}
      {activeSubTab === 'dashboard' && (
        <InventarisDashboardTab onNavigateTab={(tabId) => setActiveSubTab(tabId)} />
      )}

      {activeSubTab === 'daftar-barang' && (
        <DaftarBarangSarprasTab />
      )}

      {activeSubTab === 'denah-ruangan' && (
        <DenahRuanganAsetTab />
      )}

      {activeSubTab === 'mutasi-pinjam' && (
        <MutasiPeminjamanSarprasTab />
      )}

      {activeSubTab === 'perawatan-rusak' && (
        <PerawatanKondisiRusakTab />
      )}
    </div>
  );
}
