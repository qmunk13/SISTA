import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Shield, Sliders, Globe, Calendar, 
  Newspaper, Image, FileInput, Database, Download, FileSpreadsheet
} from 'lucide-react';
import Settings from './Settings';
import MasterDatabaseViewer from '../components/MasterDatabaseViewer';
import RoleAccessMatrix from '../components/RoleAccessMatrix';
import KonfigurasiUmumTab from '../components/pengaturan/KonfigurasiUmumTab';
import CmsPublikTab from '../components/pengaturan/CmsPublikTab';
import JadwalKegiatanTab from '../components/pengaturan/JadwalKegiatanTab';
import KelolaBeritaTab from '../components/pengaturan/KelolaBeritaTab';
import MediaUnduhanTab from '../components/pengaturan/MediaUnduhanTab';
import KonfigurasiFormTab from '../components/pengaturan/KonfigurasiFormTab';
import { MASTER_TABLES_60 } from '../data/masterDatabase60';
import { downloadMenuStructureExcel } from '../data/menuDataStructureExport';
import CustomDropdown from '../components/common/CustomDropdown';

export default function PengaturanPage() {
  const [activeSubTab, setActiveSubTab] = useState('database-master');

  const totalSheets = MASTER_TABLES_60.length;

  const subTabs = [
    { id: 'database-master', label: `Master Database (${totalSheets} Tabel)`, icon: Database },
    { id: 'settings', label: 'Integrasi & Sync GAS', icon: SettingsIcon },
    { id: 'hak-akses', label: 'Hak Akses & Role', icon: Shield },
    { id: 'konfigurasi-umum', label: 'Konfigurasi Umum', icon: Sliders },
    { id: 'cms-publik', label: 'CMS Portal Publik', icon: Globe },
    { id: 'jadwal-kegiatan', label: 'Jadwal & Kalender Kerja', icon: Calendar },
    { id: 'kelola-berita', label: 'Kelola Berita & Pengumuman', icon: Newspaper },
    { id: 'media-unduhan', label: 'Media Galeri & Unduhan', icon: Image },
    { id: 'konfigurasi-form', label: 'Konfigurasi Form SPMB', icon: FileInput },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Title & Direct Download Excel Action */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs flex-shrink-0">
            <SettingsIcon size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Pengaturan System & Profil
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pengaturan URL integrasi Google Apps Script, matriks hak akses pengguna, konfigurasi CMS publik, & kustomisasi formulir.
            </p>
          </div>
        </div>

        <button
          onClick={downloadMenuStructureExcel}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/20 transition cursor-pointer border border-emerald-500 w-full lg:w-auto"
          title="Download file Excel pemetaan struktur menu dan sheet spreadsheet"
        >
          <FileSpreadsheet size={18} />
          <span>DOWNLOAD EXCEL STRUKTUR DATA (.XLSX)</span>
        </button>
      </div>

      {/* Sub-Navigation: Mobile Dropdown Selector & Desktop Pill Tabs */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <CustomDropdown
          id="pengaturan-subtab-mobile"
          label="Pilih Sub-Menu Pengaturan:"
          value={activeSubTab}
          onChange={(val) => setActiveSubTab(val)}
          options={subTabs.map(tab => ({ value: tab.id, label: tab.label }))}
          placeholder="Pilih Sub-Menu..."
        />
      </div>

      {/* Sub Tabs */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-indigo-600 border border-slate-200/80'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeSubTab === 'database-master' && <MasterDatabaseViewer />}
      {activeSubTab === 'settings' && <Settings />}
      {activeSubTab === 'hak-akses' && <RoleAccessMatrix />}
      {activeSubTab === 'konfigurasi-umum' && <KonfigurasiUmumTab />}
      {activeSubTab === 'cms-publik' && <CmsPublikTab />}
      {activeSubTab === 'jadwal-kegiatan' && <JadwalKegiatanTab />}
      {activeSubTab === 'kelola-berita' && <KelolaBeritaTab />}
      {activeSubTab === 'media-unduhan' && <MediaUnduhanTab />}
      {activeSubTab === 'konfigurasi-form' && <KonfigurasiFormTab />}
    </div>
  );
}
