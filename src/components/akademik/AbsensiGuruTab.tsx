import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { exportToExcel } from '../../lib/excel';
import { triggerPrint, getTodayDateString } from '../../lib/utils';
import { 
  UserCheck, Search, Filter, Calendar, Clock, QrCode, 
  Printer, CheckCircle2, AlertCircle, Plus, Edit2, Trash2, X, Save,
  FileSpreadsheet
} from 'lucide-react';
import CustomDropdown from '../common/CustomDropdown';

export interface PresensiGuruRecord {
  id: string;
  tanggal: string;
  teacherId: string;
  nama: string;
  nip: string;
  jamMasuk: string;
  jamPulang: string;
  status: 'Tepat Waktu' | 'Terlambat' | 'Izin' | 'Sakit' | 'Tanpa Keterangan';
  metode: 'QR Scanner' | 'Manual / Operator';
  keterangan?: string;
}

export default function AbsensiGuruTab() {
  const { teachers, settings } = useStore();

  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Persisted Records in DB
  const [records, setRecords] = useState<PresensiGuruRecord[]>(() => {
    const saved = db.get('absensi_guru');
    if (Array.isArray(saved)) return saved;
    return [];
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PresensiGuruRecord>>({
    tanggal: selectedDate,
    nama: teachers[0]?.name || '',
    nip: teachers[0]?.nip || '',
    jamMasuk: '06:45:00',
    jamPulang: '14:30:00',
    status: 'Tepat Waktu',
    metode: 'Manual / Operator',
    keterangan: ''
  });

  const saveRecordsToDb = (newList: PresensiGuruRecord[]) => {
    setRecords(newList);
    db.set('absensi_guru', newList);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    const firstT = teachers[0];
    setFormData({
      tanggal: selectedDate,
      teacherId: firstT?.id || '',
      nama: firstT?.name || '',
      nip: firstT?.nip || '',
      jamMasuk: '06:45:00',
      jamPulang: '14:30:00',
      status: 'Tepat Waktu',
      metode: 'Manual / Operator',
      keterangan: 'Presensi manual operator'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (rec: PresensiGuruRecord) => {
    setEditingId(rec.id);
    setFormData({ ...rec });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus catatan presensi guru ini?')) {
      const updated = records.filter(r => r.id !== id);
      saveRecordsToDb(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) {
      alert('Nama guru wajib diisi.');
      return;
    }

    if (editingId) {
      const updated = records.map(r => (r.id === editingId ? { ...r, ...formData } as PresensiGuruRecord : r));
      saveRecordsToDb(updated);
    } else {
      const newItem: PresensiGuruRecord = {
        id: `absg-${Date.now()}`,
        tanggal: formData.tanggal || selectedDate,
        teacherId: formData.teacherId || '',
        nama: formData.nama || '',
        nip: formData.nip || '-',
        jamMasuk: formData.jamMasuk || '07:00:00',
        jamPulang: formData.jamPulang || '-',
        status: (formData.status as any) || 'Tepat Waktu',
        metode: (formData.metode as any) || 'Manual / Operator',
        keterangan: formData.keterangan || ''
      };
      saveRecordsToDb([newItem, ...records]);
    }
    setModalOpen(false);
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchDate = selectedDate ? r.tanggal === selectedDate : true;
      const matchStatus = statusFilter === 'Semua' ? true : r.status === statusFilter;
      const matchSrch = searchTerm 
        ? r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.nip.includes(searchTerm)
        : true;
      return matchDate && matchStatus && matchSrch;
    });
  }, [records, selectedDate, statusFilter, searchTerm]);

  const countHadir = useMemo(() => filteredRecords.filter(r => r.status === 'Tepat Waktu' || r.status === 'Terlambat').length, [filteredRecords]);
  const countTepat = useMemo(() => filteredRecords.filter(r => r.status === 'Tepat Waktu').length, [filteredRecords]);
  const countTelat = useMemo(() => filteredRecords.filter(r => r.status === 'Terlambat').length, [filteredRecords]);
  const countIzinSakit = useMemo(() => filteredRecords.filter(r => r.status === 'Izin' || r.status === 'Sakit').length, [filteredRecords]);

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert("Tidak ada data presensi guru untuk diekspor.");
      return;
    }
    const rows = filteredRecords.map((r, idx) => ({
      No: idx + 1,
      'Tanggal': r.tanggal,
      'Nama Guru / GTK': r.nama,
      'NIP / NUPTK': r.nip || '-',
      'Jam Masuk': r.jamMasuk || '-',
      'Jam Pulang': r.jamPulang || '-',
      'Status Kehadiran': r.status,
      'Metode Absensi': r.metode,
      'Keterangan': r.keterangan || '-'
    }));
    exportToExcel(rows, `Presensi_Guru_GTK_${selectedDate}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div id="printable-area" className="printable-container space-y-6 print:p-0 print:m-0 print:space-y-4 print:w-full print:bg-white text-slate-900">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Rekapitulasi Presensi Tenaga Pendidik & Staf</h2>
              <p className="text-xs text-slate-500 font-medium">
                Pencatatan real-time jam masuk, jam pulang, dan durasi kerja GTK terintegrasi dengan portal QR Code.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
              title="Ekspor Presensi Guru ke Excel"
            >
              <FileSpreadsheet size={15} />
              <span>Ekspor Excel</span>
            </button>
            <button
              onClick={triggerPrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition whitespace-nowrap cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak Rekap</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition active:scale-95 whitespace-nowrap"
            >
              <Plus size={15} />
              <span>+ Input Presensi</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Pilih Tanggal Presensi:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <CustomDropdown
            id="absensi-guru-status-filter"
            label="Filter Status Presensi"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'Semua', label: 'Semua Status' },
              { value: 'Tepat Waktu', label: 'Tepat Waktu (< 07:00)' },
              { value: 'Terlambat', label: 'Terlambat (> 07:00)' },
              { value: 'Izin', label: 'Izin' },
              { value: 'Sakit', label: 'Sakit' },
              { value: 'Tanpa Keterangan', label: 'Tanpa Keterangan' }
            ]}
            placeholder="Pilih Status..."
          />

          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">Cari Nama Guru / NIP:</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ketik nama atau NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Hadir</span>
          <div className="text-2xl font-black text-emerald-600">
            {countHadir} <span className="text-xs text-slate-500 font-normal">Guru/Staf</span>
          </div>
          <p className="text-[10px] text-slate-400">Tanggal {selectedDate}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Tepat Waktu</span>
          <div className="text-2xl font-black text-blue-600">
            {countTepat} <span className="text-xs text-slate-500 font-normal">Orang</span>
          </div>
          <p className="text-[10px] text-slate-400">Sebelum pukul 07:00 WIB</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Terlambat</span>
          <div className="text-2xl font-black text-amber-600">
            {countTelat} <span className="text-xs text-slate-500 font-normal">Orang</span>
          </div>
          <p className="text-[10px] text-slate-400">Setelah pukul 07:00 WIB</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Izin / Sakit</span>
          <div className="text-2xl font-black text-purple-600">
            {countIzinSakit} <span className="text-xs text-slate-500 font-normal">Orang</span>
          </div>
          <p className="text-[10px] text-slate-400">Dengan surat pemberitahuan</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700">Daftar Kehadiran GTK ({filteredRecords.length} Data)</span>
          <span className="text-slate-400">Basis Scanner QR & Logbook</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                <th className="p-3 pl-4 text-center w-12">No</th>
                <th className="p-3">Nama Lengkap & NIP Guru</th>
                <th className="p-3 text-center">Jam Masuk</th>
                <th className="p-3 text-center">Jam Pulang</th>
                <th className="p-3 text-center">Status Kehadiran</th>
                <th className="p-3 text-center">Metode Presensi</th>
                <th className="p-3">Catatan / Keterangan</th>
                <th className="p-3 text-center pr-4 no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Belum Ada Rekap Presensi GTK</p>
                    <p className="text-xs text-slate-400">Lakukan pemindaian di menu "QR Scanner Portal" atau klik input manual.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 pl-4 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div>{r.nama}</div>
                      <div className="text-[10px] font-mono text-slate-400 font-normal">NIP: {r.nip}</div>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {r.jamMasuk || '-'}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/40">
                      {r.jamPulang || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-block ${
                        r.status === 'Tepat Waktu' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        r.status === 'Terlambat' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold inline-flex items-center gap-1">
                        <QrCode size={11} />
                        <span>{r.metode}</span>
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 text-[11px]">
                      {r.keterangan || '-'}
                    </td>
                    <td className="p-3 text-center pr-4 no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          className="p-1 rounded-lg hover:bg-amber-50 text-amber-700 transition"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 rounded-lg hover:bg-rose-50 text-rose-700 transition"
                          title="Hapus"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print-Optimized Layout (Only visible during print) */}
      <div className="hidden print:block printable-container space-y-4">
        <div className="border-b-2 border-black pb-2 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wider">KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH</h2>
          <h1 className="text-base font-black uppercase">{settings.schoolName || 'SISTEM INFORMASI AKADEMIK & KURIKULUM'}</h1>
          <p className="text-[9pt] text-gray-700">{settings.schoolAddress || '-'}</p>
          <div className="border-t border-black mt-2 pt-1">
            <h3 className="text-xs font-black uppercase underline">
              REKAPITULASI PRESENSI & KEHADIRAN GURU / GTK
            </h3>
            <p className="text-[8pt] text-gray-600">
              TANGGAL: {new Date(selectedDate).toLocaleDateString('id-ID', { dateStyle: 'full' })} • STATUS FILTER: {(statusFilter || 'Semua').toUpperCase()}
            </p>
          </div>
        </div>

        <table className="w-full text-left border-collapse border border-black print-table text-[8.5pt]">
          <thead>
            <tr className="bg-slate-200 text-black uppercase font-bold text-center">
              <th className="border border-black p-1 w-8">No</th>
              <th className="border border-black p-1">Nama Lengkap Guru</th>
              <th className="border border-black p-1 w-32">NIP / NUPTK</th>
              <th className="border border-black p-1 w-20">Masuk</th>
              <th className="border border-black p-1 w-20">Pulang</th>
              <th className="border border-black p-1 w-28">Status</th>
              <th className="border border-black p-1">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-black p-4 text-center italic text-gray-500">
                  Tidak ada data presensi GTK pada filter terpilih.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => (
                <tr key={r.id || idx}>
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 font-bold">{r.nama}</td>
                  <td className="border border-black p-1 font-mono text-center">{r.nip || '-'}</td>
                  <td className="border border-black p-1 text-center font-mono">{r.jamMasuk || '-'}</td>
                  <td className="border border-black p-1 text-center font-mono">{r.jamPulang || '-'}</td>
                  <td className="border border-black p-1 text-center font-semibold">{r.status}</td>
                  <td className="border border-black p-1">{r.keterangan || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex justify-between items-center pt-4 text-xs">
          <div>
            <p>Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            <p className="mt-10 font-bold">Koordinator GTK / Petugas Presensi</p>
            <p>................................................</p>
          </div>
          <div className="text-right">
            <p>Mengetahui,</p>
            <p className="mt-10 font-bold">{settings.headmasterName || 'Kepala Sekolah'}</p>
            <p>NIP. {settings.headmasterNip || '-'}</p>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <UserCheck size={16} />
                </div>
                <h3 className="font-black text-slate-900 text-sm">
                  {editingId ? 'Edit Presensi Guru' : 'Input Presensi GTK Manual'}
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Pilih Guru / GTK</label>
                <select
                  value={formData.nama}
                  onChange={(e) => {
                    const selected = teachers.find(t => t.name === e.target.value);
                    setFormData({
                      ...formData,
                      nama: e.target.value,
                      nip: selected?.nip || '-',
                      teacherId: selected?.id || ''
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  required
                >
                  {teachers.map((t, idx) => (
                    <option key={t.id ? `abs-t-${t.id}-${idx}` : `abs-t-${idx}`} value={t.name}>{t.name} ({t.nip || 'NIP -'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Status Kehadiran</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="Tepat Waktu">Tepat Waktu</option>
                    <option value="Terlambat">Terlambat</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Tanpa Keterangan">Tanpa Keterangan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Jam Masuk</label>
                  <input
                    type="time"
                    step="1"
                    value={formData.jamMasuk}
                    onChange={(e) => setFormData({ ...formData, jamMasuk: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Jam Pulang</label>
                  <input
                    type="time"
                    step="1"
                    value={formData.jamPulang}
                    onChange={(e) => setFormData({ ...formData, jamPulang: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Surat dokter terlampir, dinas luar..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-emerald-200"
                >
                  <Save size={14} />
                  <span>Simpan Presensi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
