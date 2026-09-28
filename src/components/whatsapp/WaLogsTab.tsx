import React, { useState, useEffect } from 'react';
import { History, Search, Filter, CheckCircle, Clock, Trash2, Smartphone } from 'lucide-react';
import { WaMessageLog } from '../../types';
import { db } from '../../data/db';

export default function WaLogsTab() {
  const [logs, setLogs] = useState<WaMessageLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = () => {
    setLogs(db.get<WaMessageLog>('wa_message_logs'));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = () => {
    if (confirm('Bersihkan seluruh riwayat pengiriman pesan WhatsApp?')) {
      db.set('wa_message_logs', []);
      setLogs([]);
    }
  };

  const filteredLogs = logs.filter(l => {
    const q = searchQuery.toLowerCase();
    return (
      l.penerimaNama.toLowerCase().includes(q) ||
      l.penerimaNomor.includes(q) ||
      l.kategori.toLowerCase().includes(q) ||
      l.pesan.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari penerima, nomor HP, atau isi pesan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
            Total: {logs.length} Pesan
          </span>
          <button
            onClick={handleClearLogs}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Hapus Log</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Waktu & ID</th>
                <th className="py-3.5 px-4">Penerima & Kontak</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Ringkasan Pesan</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    Belum ada riwayat pengiriman pesan WhatsApp
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900 block">{log.waktu}</span>
                      <span className="text-[10px] text-slate-400">{log.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block">{log.penerimaNama}</strong>
                      <span className="font-mono text-[10px] text-emerald-800 font-bold">{log.penerimaNomor}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[10px]">
                        {log.kategori}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="line-clamp-2 text-slate-600 text-[11px] leading-relaxed">{log.pesan}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {log.petugas}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
