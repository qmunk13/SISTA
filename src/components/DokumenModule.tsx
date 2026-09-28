import React, { useState } from 'react';
import { UserSession } from '../types/schema';
import { FileSpreadsheet, Folder, Inbox, Send, FileText } from 'lucide-react';

interface DokumenModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export function DokumenModule({ userSession, dbData, setDbData, activeSubTab }: DokumenModuleProps) {
  const [subTab, setSubTab] = useState<string>(activeSubTab || 'dashboard');

  React.useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'dashboard_doc') setSubTab('dashboard');
      else setSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const items = [
    { id: 'dashboard', label: 'Dokumen Dashboard', icon: FileSpreadsheet },
    { id: 'arsip', label: 'Arsip Digital', icon: Folder },
    { id: 'masuk', label: 'Surat Masuk', icon: Inbox },
    { id: 'keluar', label: 'Surat Keluar', icon: Send },
    { id: 'template', label: 'Template Surat', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase mb-2">
          <FileSpreadsheet className="w-3.5 h-3.5" /> DOKUMEN & SURAT RESMI
        </div>
        <h2 className="text-xl font-black text-slate-800">Manajemen Arsip Digital & Tata Persuratan</h2>
      </div>

      <div className="flex overflow-x-auto gap-2">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setSubTab(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                subTab === item.id ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
        <h3 className="font-bold text-slate-800 text-sm">Repositori Dokumen Resmi Sekolah</h3>
        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
          Penomoran otomatis surat masuk/keluar terhubung dengan database Google Sheets.
        </div>
      </div>
    </div>
  );
}
