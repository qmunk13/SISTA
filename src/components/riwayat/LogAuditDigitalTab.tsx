import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { AuditLogItem, ensureAuditLogSeedData } from '../../data/auditSeed';
import { 
  ShieldCheck, Search, Filter, Download, Trash2, RefreshCw, 
  Calendar, User, Layers, Eye, CheckCircle2, AlertTriangle, AlertCircle, X
} from 'lucide-react';
import { exportToExcel } from '../../lib/excel';
import { logActivity } from '../../lib/auditLogger';

export default function LogAuditDigitalTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModul, setFilterModul] = useState('');
  const [filterAksi, setFilterAksi] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [detailItem, setDetailItem] = useState<AuditLogItem | null>(null);

  const [logs, setLogs] = useState<AuditLogItem[]>(() => {
    ensureAuditLogSeedData();
    return db.get<AuditLogItem>('audit_logs') || [];
  });

  const refreshLogs = () => {
    const fromDb = db.get<AuditLogItem>('audit_logs') || [];
    setLogs(fromDb);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !searchTerm ||
        item.user.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.target.toLowerCase().includes(q) ||
        item.rincian.toLowerCase().includes(q) ||
        item.timestamp.toLowerCase().includes(q);

      const matchModul = !filterModul || item.modul === filterModul;
      const matchAksi = !filterAksi || item.aksi === filterAksi;
      const matchStatus = !filterStatus || item.status === filterStatus;

      return matchSearch && matchModul && matchAksi && matchStatus;
    });
  }, [logs, searchTerm, filterModul, filterAksi, filterStatus]);

  // Export to Excel
  const handleExport = () => {
    const rows = filteredLogs.map((l, idx) => ({
      No: idx + 1,
      'ID Log': l.id,
      'Waktu Kejadian': l.timestamp,
      'Pengguna / Aktor': l.user,
      Role: l.role,
      Modul: l.modul,
      'Tipe Aksi': l.aksi,
      Target: l.target,
      'Rincian Aktivitas': l.rincian,
      'IP Address': l.ipAddress || '-',
      Status: l.status
    }));

    exportToExcel(rows, `Digital_Audit_Logs_${new Date().toISOString().split('T')[0]}`);

    logActivity({
      modul: 'Sistem & Keamanan',
      aksi: 'EKSPOR',
      target: 'Ekspor Audit Log Keamanan',
      rincian: `Mengekspor ${filteredLogs.length} rekaman jejak digital log audit ke format Excel.`
    });
  };

  const handleClearLogs = () => {
    if (confirm('Apakah Anda yakin ingin mengosongkan riwayat audit log? Tindakan ini akan dicatat ke sistem audit baru.')) {
      db.set('audit_logs', []);
      setLogs([]);
      logActivity({
        modul: 'Sistem & Keamanan',
        aksi: 'HAPUS',
        target: 'Pembersihan Riwayat Audit Log',
        rincian: 'Administrator mengosongkan riwayat digital audit log lama.'
      });
      refreshLogs();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-violet-600" size={22} />
            Riwayat Digital & Audit Trail Sistem
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Seluruh aktivitas pencatatan, perubahan data siswa, transaksi keuangan, penerbitan surat, peminjaman sarpras, dan CBT tercatat secara otomatis dan transparan.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={refreshLogs}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            title="Refresh Data Log"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={handleExport}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition active:scale-95"
          >
            <Download size={15} />
            <span>Ekspor Log Excel</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition"
            title="Bersihkan Log"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari user, target, aktivitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            />
          </div>

          <select
            value={filterModul}
            onChange={(e) => setFilterModul(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            <option value="">Semua Modul Aplikasi</option>
            <option value="Kesiswaan">Kesiswaan</option>
            <option value="Akademik">Akademik</option>
            <option value="Keuangan">Keuangan</option>
            <option value="Sarpras & Aset">Sarpras & Aset</option>
            <option value="Dokumen & Surat">Dokumen & Surat</option>
            <option value="SPMB">SPMB</option>
            <option value="CBT & Ujian">CBT & Ujian</option>
            <option value="Bimbingan Konseling">Bimbingan Konseling</option>
            <option value="Master Data">Master Data</option>
            <option value="Sistem & Keamanan">Sistem & Keamanan</option>
          </select>

          <select
            value={filterAksi}
            onChange={(e) => setFilterAksi(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            <option value="">Semua Jenis Aksi</option>
            <option value="TAMBAH">TAMBAH</option>
            <option value="EDIT">EDIT</option>
            <option value="HAPUS">HAPUS</option>
            <option value="LOGIN">LOGIN</option>
            <option value="EKSPOR">EKSPOR</option>
            <option value="IMPORT">IMPORT</option>
            <option value="CETAK">CETAK</option>
            <option value="DISPOSISI">DISPOSISI</option>
            <option value="VERIFIKASI">VERIFIKASI</option>
            <option value="SINKRONISASI">SINKRONISASI</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            <option value="">Semua Status Log</option>
            <option value="SUKSES">SUKSES</option>
            <option value="PERINGATAN">PERINGATAN</option>
            <option value="GAGAL">GAGAL</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 font-medium">
          <span>Menampilkan <strong>{filteredLogs.length}</strong> rekam jejak digital aktivitas</span>
          {(searchTerm || filterModul || filterAksi || filterStatus) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterModul('');
                setFilterAksi('');
                setFilterStatus('');
              }}
              className="text-violet-600 hover:text-violet-700 font-bold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase tracking-wider text-slate-600">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Waktu (WIB)</th>
                <th className="py-3.5 px-4">Pengguna / Aktor</th>
                <th className="py-3.5 px-4">Modul</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
                <th className="py-3.5 px-4">Target & Rincian</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <ShieldCheck size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Rekam Jejak Ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-800 block whitespace-nowrap">
                        {item.timestamp}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        IP: {item.ipAddress || '192.168.1.1'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-black text-slate-900 group-hover:text-violet-700 transition">
                        {item.user}
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 block w-fit mt-0.5">
                        {item.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">
                        {item.modul}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border ${
                        item.aksi === 'TAMBAH'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.aksi === 'EDIT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : item.aksi === 'HAPUS'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : item.aksi === 'LOGIN'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : item.aksi === 'DISPOSISI'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {item.aksi}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-bold text-slate-900">
                        {item.target}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {item.rincian}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        item.status === 'SUKSES'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'PERINGATAN'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setDetailItem(item)}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-violet-50 text-slate-600 hover:text-violet-600 transition"
                        title="Lihat Detail Log"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Log */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Rincian Riwayat Digital</h3>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Waktu Kejadian</span>
                <span className="font-mono font-bold text-slate-800">{detailItem.timestamp}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Aktor / Pengguna</span>
                <span className="font-black text-slate-800">{detailItem.user}</span>
                <span className="text-[10px] text-slate-500 block">{detailItem.role}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">Modul & Aksi</span>
                <span className="font-black text-slate-800">{detailItem.modul}</span>
                <span className="text-[10px] font-bold text-violet-600 block">{detailItem.aksi}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] text-slate-400 block">IP / Status</span>
                <span className="font-mono text-slate-700 block">{detailItem.ipAddress || '192.168.1.1'}</span>
                <span className="font-black text-emerald-600 block">{detailItem.status}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Target Entitas:</span>
              <div className="font-bold text-slate-900">{detailItem.target}</div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase mt-2">Keterangan Aktivitas:</span>
              <p className="text-slate-700 leading-relaxed">{detailItem.rincian}</p>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
