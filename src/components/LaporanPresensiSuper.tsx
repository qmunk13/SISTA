import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Share2,
  Send,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Users,
  Clock,
  Printer
} from 'lucide-react';
import { User, AbsensiRecord } from '../types';
import { getKelasList, getAbsensiRecords, getSiswaList, getTodayDateString } from '../lib/storage';
import {
  exportMultiPeriodExcel,
  exportMultiPeriodPDF,
  generateWhatsAppReportText,
  openWhatsAppWithText
} from '../lib/exportUtils';

interface LaporanPresensiSuperProps {
  currentUser: User;
}

export const LaporanPresensiSuper: React.FC<LaporanPresensiSuperProps> = ({ currentUser }) => {
  const [periodeType, setPeriodeType] = useState<'hari' | 'minggu' | 'bulan' | 'semester' | 'tahun'>('hari');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>('1');
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2026/2027');
  
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [showWAModal, setShowWAModal] = useState<boolean>(false);

  const classes = getKelasList();
  const allRecords = getAbsensiRecords();
  const allSiswa = getSiswaList();

  // Helper date calculations
  const calculatePeriodDateRange = () => {
    let start = '';
    let end = '';
    let label = '';

    if (periodeType === 'hari') {
      start = selectedDate;
      end = selectedDate;
      label = `Hari Ini (${selectedDate})`;
    } else if (periodeType === 'minggu') {
      const d = new Date(selectedDate);
      const day = d.getDay();
      const diffStart = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const startDateObj = new Date(d.setDate(diffStart));
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(startDateObj.getDate() + 6); // Sunday

      start = startDateObj.toISOString().split('T')[0];
      end = endDateObj.toISOString().split('T')[0];
      label = `Mingguan (${start} s/d ${end})`;
    } else if (periodeType === 'bulan') {
      const m = parseInt(selectedMonth, 10);
      const y = parseInt(selectedYear, 10);
      const lastDay = new Date(y, m, 0).getDate();
      start = `${y}-${selectedMonth}-01`;
      end = `${y}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      label = `Bulan ${monthNames[m - 1]} ${y}`;
    } else if (periodeType === 'semester') {
      const startYear = parseInt(selectedTahunAjaran.split('/')[0] || selectedYear, 10);
      if (selectedSemester === '1') {
        start = `${startYear}-07-01`;
        end = `${startYear}-12-31`;
        label = `Semester 1 / Ganjil (${selectedTahunAjaran})`;
      } else {
        start = `${startYear + 1}-01-01`;
        end = `${startYear + 1}-06-30`;
        label = `Semester 2 / Genap (${selectedTahunAjaran})`;
      }
    } else if (periodeType === 'tahun') {
      const startYear = parseInt(selectedTahunAjaran.split('/')[0] || selectedYear, 10);
      start = `${startYear}-07-01`;
      end = `${startYear + 1}-06-30`;
      label = `Tahun Ajaran ${selectedTahunAjaran}`;
    }

    return { start, end, label };
  };

  const periodInfo = calculatePeriodDateRange();

  // Filter records
  const filteredRecords = allRecords.filter(r => {
    const dateMatch = r.tanggal >= periodInfo.start && r.tanggal <= periodInfo.end;
    const classMatch = !selectedKelas || r.kelas === selectedKelas;
    const searchMatch = !searchQuery ||
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nisn.includes(searchQuery);
    return dateMatch && classMatch && searchMatch;
  });

  // Calculate stats
  const hadirCount = filteredRecords.filter(r => r.status === 'Hadir').length;
  const sakitCount = filteredRecords.filter(r => r.status === 'Sakit').length;
  const izinCount = filteredRecords.filter(r => r.status === 'Izin').length;
  const alpaCount = filteredRecords.filter(r => r.status === 'Alpa' || r.status === 'Belum Absen').length;
  const totalCatatan = filteredRecords.length;
  const persentase = totalCatatan > 0 ? Math.round((hadirCount / totalCatatan) * 100) : 0;

  const waPreviewText = generateWhatsAppReportText(
    periodInfo.label,
    selectedKelas || 'Semua Kelas',
    filteredRecords,
    allSiswa.length
  );

  const handleDownloadExcel = () => {
    exportMultiPeriodExcel(periodInfo.label, selectedKelas || 'Semua Kelas', filteredRecords);
  };

  const handleDownloadPDF = () => {
    exportMultiPeriodPDF(periodInfo.label, selectedKelas || 'Semua Kelas', filteredRecords);
  };

  const handleSendWA = () => {
    openWhatsAppWithText(waPreviewText, targetPhone);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <span>Laporan Presensi Lengkap & Export</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ekspor rekapitulasi kehadiran per Hari, Minggu, Bulan, Semester, dan Tahun Ajaran untuk Semua Kelas & Siswa.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowWAModal(true)}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Kirim WhatsApp</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            className="px-3.5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Periode Selector & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Periode Type Bar */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Pilih Periode Laporan</label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'hari', label: 'Per Hari' },
              { id: 'minggu', label: 'Per Minggu' },
              { id: 'bulan', label: 'Per Bulan' },
              { id: 'semester', label: 'Per Semester' },
              { id: 'tahun', label: 'Per Tahun Ajaran' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodeType(p.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodeType === p.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Period Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 items-end">
          {periodeType === 'hari' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              />
            </div>
          )}

          {periodeType === 'minggu' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Hari dalam Minggu</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              />
            </div>
          )}

          {periodeType === 'bulan' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="01">Januari</option>
                  <option value="02">Februari</option>
                  <option value="03">Maret</option>
                  <option value="04">April</option>
                  <option value="05">Mei</option>
                  <option value="06">Juni</option>
                  <option value="07">Juli</option>
                  <option value="08">Agustus</option>
                  <option value="09">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Desember</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tahun</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>
            </>
          )}

          {periodeType === 'semester' && (
            <>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="1">Semester 1 (Ganjil: Juli - Des)</option>
                  <option value="2">Semester 2 (Genap: Jan - Juni)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tahun Ajaran</label>
                <select
                  value={selectedTahunAjaran}
                  onChange={e => setSelectedTahunAjaran(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="2026/2027">2026 / 2027 (Aktif)</option>
                  <option value="2025/2026">2025 / 2026</option>
                  <option value="2027/2028">2027 / 2028</option>
                </select>
              </div>
            </>
          )}

          {periodeType === 'tahun' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tahun Ajaran</label>
              <select
                value={selectedTahunAjaran}
                onChange={e => setSelectedTahunAjaran(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="2026/2027">2026 / 2027 (Aktif)</option>
                <option value="2025/2026">2025 / 2026</option>
                <option value="2027/2028">2027 / 2028</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Kelas</label>
            <select
              value={selectedKelas}
              onChange={e => setSelectedKelas(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => (
                <option key={c} value={c}>Kelas {c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cari Nama / NISN</label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Hadir</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{hadirCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Sakit</p>
          <p className="text-2xl font-black text-sky-600 mt-1">{sakitCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Izin</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{izinCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Alpa</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{alpaCount}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">% Kehadiran</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{persentase}%</p>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="font-bold text-xs text-slate-700">
            {periodInfo.label} • {selectedKelas ? `Kelas ${selectedKelas}` : 'Semua Kelas'} ({filteredRecords.length} records)
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Akurasi Realtime</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jam Datang</th>
                <th className="py-3 px-4">Jam Pulang</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Keterangan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada data presensi untuk filter periode ini.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{r.tanggal}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{r.nisn}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{r.nama}</td>
                    <td className="py-3 px-4 font-medium">{r.kelas}</td>
                    <td className="py-3 px-4 font-mono">{r.jamDatang || '-'}</td>
                    <td className="py-3 px-4 font-mono">{r.jamPulang || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'Sakit'
                            ? 'bg-sky-100 text-sky-800'
                            : r.status === 'Izin'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                      {r.alasan || r.keterangan || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WHATSAPP MODAL */}
      {showWAModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>Kirim Laporan ke WhatsApp</span>
              </h3>
              <button
                onClick={() => setShowWAModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp Tujuan (Opsional)</label>
              <input
                type="text"
                value={targetPhone}
                onChange={e => setTargetPhone(e.target.value)}
                placeholder="Contoh: 081234567890 (kosongkan untuk pilih di WA)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pratinjau Pesan WhatsApp</label>
              <textarea
                value={waPreviewText}
                readOnly
                rows={10}
                className="w-full bg-slate-900 text-slate-200 font-mono text-[11px] p-3 rounded-xl border border-slate-800 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowWAModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={() => {
                  handleSendWA();
                  setShowWAModal(false);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Buka WhatsApp Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
