import React, { useState, useEffect } from 'react';
import { 
  FileText, FolderArchive, Mail, Send, FileCode 
} from 'lucide-react';
import { ensureDokumenSeedData } from '../data/dokumenSeed';
import DokumenDashboardTab from '../components/dokumen/DokumenDashboardTab';
import ArsipDigitalTab from '../components/dokumen/ArsipDigitalTab';
import SuratMasukTab from '../components/dokumen/SuratMasukTab';
import SuratKeluarTab from '../components/dokumen/SuratKeluarTab';
import TemplateSuratTab from '../components/dokumen/TemplateSuratTab';
import CustomDropdown from '../components/common/CustomDropdown';

export default function DokumenSuratPage() {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');

  useEffect(() => {
    ensureDokumenSeedData();
  }, []);

  const subTabs = [
    { id: 'dashboard', label: 'Dokumen Dashboard', icon: FileText },
    { id: 'arsip-digital', label: 'Arsip Digital Sekolah', icon: FolderArchive },
    { id: 'surat-masuk', label: 'Surat Masuk & Disposisi', icon: Mail },
    { id: 'surat-keluar', label: 'Surat Keluar Resmi', icon: Send },
    { id: 'template-surat', label: 'Master Template Surat', icon: FileCode },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100/80 shadow-2xs flex-shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Dokumen & Persuratan Digital
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manajemen arsip digital resmi, pencatatan surat masuk & disposisi, penomoran surat keluar, & template naskah dinas.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation: Mobile Dropdown Selector & Desktop Pill Tabs */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <CustomDropdown
          id="dokumen-subtab-mobile"
          label="Pilih Sub-Menu Surat & Dokumen:"
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

      {/* Tab Contents */}
      {activeSubTab === 'dashboard' && (
        <DokumenDashboardTab onNavigateTab={(tab) => setActiveSubTab(tab)} />
      )}

      {activeSubTab === 'arsip-digital' && (
        <ArsipDigitalTab />
      )}

      {activeSubTab === 'surat-masuk' && (
        <SuratMasukTab />
      )}

      {activeSubTab === 'surat-keluar' && (
        <SuratKeluarTab />
      )}

      {activeSubTab === 'template-surat' && (
        <TemplateSuratTab />
      )}
    </div>
  );
}

