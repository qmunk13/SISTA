import React, { useState } from 'react';
import { Database, Search, ShieldAlert, Layers, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { MASTER_60_TABS } from '../../data/initialData';

export const DatabaseModule: React.FC = () => {
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [searchTab, setSearchTab] = useState<string>('');

  const modulesList = ['ALL', 'SISTEM', 'SISKO', 'ABSENSI', 'NILAI', 'UJIAN', 'SPMB', 'KEUANGAN', 'SARPRAS', 'ARSIP'];

  const filteredTabs = MASTER_60_TABS.filter((t) => {
    const matchMod = filterModule === 'ALL' || t.module === filterModule;
    const matchSearch = t.name.toLowerCase().includes(searchTab.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchTab.toLowerCase());
    return matchMod && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Banner info */}
      <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-md border border-indigo-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-800 text-indigo-200 border border-indigo-700 text-xs font-semibold mb-2">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Master Spreadsheet ID: 1AS8bfr63odj4UCELxWpv_sV0B-xGfZqxqJxfLVBj0Eo
          </div>
          <h2 className="text-xl font-bold tracking-tight">Arsitektur Database Terpusat (60 Tab Master)</h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
            Seluruh data operasional sekolah terintegrasi dalam 60 tabel tab terstruktur pada Google Sheets dengan Google Apps Script backend.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-indigo-950/80 p-3 rounded-lg border border-indigo-800 text-xs font-mono">
          <Layers className="w-4 h-4 text-indigo-300" />
          <span>Total Verified: <strong className="text-emerald-400">60 / 60 Tab Active</strong></span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {modulesList.map((m) => (
            <button
              key={m}
              onClick={() => setFilterModule(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterModule === m
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTab}
            onChange={(e) => setSearchTab(e.target.value)}
            placeholder="Cari nama tab / deskripsi..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid of 60 Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTabs.map((tab) => (
          <div key={tab.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                #{tab.id} - {tab.name}
              </span>
              <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                {tab.module}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">{tab.description}</p>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Kolom Header ({tab.columns.length}):
              </span>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {tab.columns.map((col) => (
                  <span key={col} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
