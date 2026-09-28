import React, { useState, useMemo, useEffect } from 'react';
import { triggerPrint } from '../../lib/utils';
import { 
  CheckCircle2, Search, X, Award, Eye, Printer, 
  Download, FileText, BarChart3, TrendingUp, 
  HelpCircle, Check, AlertCircle, ArrowUpDown,
  CloudDownload, RefreshCw
} from 'lucide-react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { getAllClasses, formatClassLabel, matchClass, matchStatusActive, STANDARD_CLASSES } from '../../lib/utils';
import { pullSpecificSheetFromGas } from '../../utils/gasSync';
import Swal from 'sweetalert2';

interface StudentExamResult {
  id: string;
  rank: number;
  nisn: string;
  name: string;
  class: string;
  benar: number;
  salah: number;
  totalSoal: number;
  nilai: number;
  status: 'Tuntas' | 'Remedial';
  waktuSelesai: string;
  jawabanDetail?: Array<{
    no: number;
    jawabanSiswa: string;
    kunci: string;
    isCorrect: boolean;
  }>;
}

// Helper mendeteksi apakah suatu baris data adalah hasil penugasan (BUKAN ujian CBT peserta)
function isAssignmentResult(r: any): boolean {
  if (!r) return false;
  if (r.isTugas === true || r.isPenugasan === true || r.type === 'PENUGASAN') return true;
  const examId = String(r.examId || r.UjianID || r.idUjian || r.id || '');
  const idHasil = String(r.id || r.HasilUjianID || r.idHasil || '');
  const examName = String(r.examName || r.NamaUjian || r.namaUjian || r.mapel || '').toLowerCase();
  
  if (examId.startsWith('TGS') || examId.startsWith('PST') || examId.includes('TUGAS')) return true;
  if (idHasil.includes('TGS') || idHasil.includes('PST') || idHasil.includes('SUB-')) return true;
  if (examName.startsWith('tugas ') || examName.includes('tugas kbm') || examName.includes('penugasan')) return true;
  return false;
}

// Helper to normalize and sanitize exam results from DB
function normalizeStudentResults(rawList: any[]): StudentExamResult[] {
  if (!Array.isArray(rawList)) return [];
  // Khusus Hasil Ujian Peserta: KELUARKAN seluruh hasil penugasan & dummy simulasi agar tidak tercampur!
  const examOnly = rawList.filter(r => 
    !isAssignmentResult(r) && 
    !r.isSimulation && 
    !String(r.id || r.HasilUjianID || '').startsWith('SIM-') &&
    !String(r.examId || r.UjianID || '').startsWith('SIM-')
  );
  const sorted = [...examOnly].sort((a, b) => {
    const scoreA = Number(a.nilai ?? a.Nilai ?? a.score ?? 0) || 0;
    const scoreB = Number(b.nilai ?? b.Nilai ?? b.score ?? 0) || 0;
    return scoreB - scoreA;
  });

  return sorted.map((r: any, idx: number) => {
    const rawNilai = Number(r.nilai ?? r.Nilai ?? r.score ?? 0);
    const nilai = Number.isFinite(rawNilai) ? rawNilai : 0;
    const rawBenar = Number(r.benar ?? r.Benar ?? 0);
    const benar = Number.isFinite(rawBenar) ? rawBenar : 0;
    const rawSalah = Number(r.salah ?? r.Salah ?? 0);
    const salah = Number.isFinite(rawSalah) ? rawSalah : 0;
    const rawTotal = Number(r.totalSoal ?? r.TotalSoal ?? (benar + salah) ?? 0);
    const totalSoal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : 30;

    const id = String(r.id || r.HasilUjianID || `RES-${idx + 1}`);
    const name = String(r.name || r.NamaSiswa || r.studentName || r.nama || `Siswa ${idx + 1}`);
    const nisn = String(r.nisn || r.NISN || '-').replace(/^'+/, '');
    const cls = String(r.class || r.kelas || r.Kelas || '1A');
    const statusVal = r.status || r.Status || r.StatusTuntas || (nilai >= 75 ? 'Tuntas' : 'Remedial');
    const status: 'Tuntas' | 'Remedial' = statusVal === 'Remedial' ? 'Remedial' : 'Tuntas';
    const waktuSelesai = String(r.waktuSelesai || r.WaktuSelesai || r.submittedAt || r.createdAt || '-');

    let jawabanDetail = r.jawabanDetail;
    if (!Array.isArray(jawabanDetail) && r.JawabanDetailJSON) {
      try {
        jawabanDetail = JSON.parse(r.JawabanDetailJSON);
      } catch {
        jawabanDetail = undefined;
      }
    }

    return {
      id,
      rank: idx + 1,
      nisn,
      name,
      class: cls,
      benar,
      salah,
      totalSoal,
      nilai,
      status,
      waktuSelesai,
      jawabanDetail
    };
  });
}

export default function HasilUjianTab() {
  const { settings, students } = useStore();
  const rawUjian = db.get('ujian_cbt');
  const ujianList = (Array.isArray(rawUjian) ? rawUjian : []).filter((u: any) => {
    const t = String(u.Tanggal || u.tgl || u.tanggal || u.tglDisplay || '');
    return !t.includes('10-01') && !t.includes('01 Okt') && !t.includes('2026-10-01');
  });

  const [isPullingResults, setIsPullingResults] = useState(false);

  const activeStudents = useMemo(() => {
    return (students || []).filter(s => matchStatusActive(s?.status));
  }, [students]);

  const inactiveStudentNisns = useMemo(() => {
    return new Set((students || []).filter(s => !matchStatusActive(s?.status)).map(s => String(s.nisn || s.nis || s.id || '').trim().toLowerCase()));
  }, [students]);

  const availableClasses = useMemo(() => {
    return Array.from(new Set([...getAllClasses(activeStudents), ...STANDARD_CLASSES])).filter(Boolean).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [activeStudents]);

  const [selectedSession, setSelectedSession] = useState<string>(() => {
    if (ujianList.length > 0 && ujianList[0]) {
      return `${ujianList[0].id || 'SES-1'} - ${ujianList[0].mapel || 'Ujian'} (${ujianList[0].kelas || '1A'})`;
    }
    return '';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKelas, setFilterKelas] = useState('');

  // Modals
  const [viewLembarModal, setViewLembarModal] = useState<StudentExamResult | null>(null);
  const [printBeritaAcara, setPrintBeritaAcara] = useState(false);

  // Results loaded from DB (no dummy data fallback)
  const [resultsList, setResultsList] = useState<StudentExamResult[]>(() => {
    const fromDb = db.get('cbt_exam_results');
    return normalizeStudentResults(Array.isArray(fromDb) ? fromDb : []);
  });

  // Bersihkan data penugasan dari cbt_exam_results agar tidak tersimpan/tercampur di hasil ujian peserta
  useEffect(() => {
    const current = db.get('cbt_exam_results');
    if (Array.isArray(current)) {
      const pureExams = current.filter(r => !isAssignmentResult(r));
      if (pureExams.length !== current.length) {
        db.set('cbt_exam_results', pureExams);
        db.set('cbt_results', pureExams);
        setResultsList(normalizeStudentResults(pureExams));
      }
    }
  }, []);

  // Listen to erp-db-updated for real-time sheet sync
  useEffect(() => {
    const handleDbUpdate = (e: any) => {
      if (!e?.detail?.key || e.detail.key === 'cbt_exam_results' || e.detail.key === 'cbt_results' || e.detail.key === 'hasil_ujian') {
        const fromDb = db.get('cbt_exam_results');
        const pure = (Array.isArray(fromDb) ? fromDb : []).filter(r => !isAssignmentResult(r));
        setResultsList(normalizeStudentResults(pure));
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, []);

  // Tarik Hasil Ujian Murni Langsung dari Google Spreadsheet (Sheet HASIL_UJIAN)
  const handlePullResultsFromSheets = async () => {
    setIsPullingResults(true);
    try {
      const res = await pullSpecificSheetFromGas('HASIL_UJIAN');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const pureExams = res.data.filter(r => !isAssignmentResult(r));
        db.set('cbt_exam_results', pureExams);
        db.set('cbt_results', pureExams);
        db.set('hasil_ujian', pureExams);
        setResultsList(normalizeStudentResults(pureExams));

        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_exam_results' } }));

        await Swal.fire({
          title: 'Sinkronisasi Berhasil!',
          text: `Berhasil menarik ${pureExams.length} data nilai hasil ujian siswa dari Sheet HASIL_UJIAN.`,
          icon: 'success',
          confirmButtonColor: '#059669'
        });
      } else {
        await Swal.fire({
          title: 'Sheet HASIL_UJIAN Kosong',
          text: 'Belum ada data nilai ujian di Google Spreadsheet atau lembar masih kosong.',
          icon: 'info',
          confirmButtonColor: '#059669'
        });
      }
    } catch (err: any) {
      console.error('Error pulling HASIL_UJIAN:', err);
      Swal.fire({
        title: 'Gagal Menarik Data',
        text: err?.message || 'Terjadi kesalahan saat menghubungi Google Spreadsheet.',
        icon: 'error',
        confirmButtonColor: '#059669'
      });
    } finally {
      setIsPullingResults(false);
    }
  };

  const filteredResults = useMemo(() => {
    return resultsList.filter(r => {
      const rNisn = String(r.nisn || '').trim().toLowerCase();
      const rId = String(r.id || '').trim().toLowerCase();
      if (rNisn && inactiveStudentNisns.has(rNisn)) return false;
      if (rId && inactiveStudentNisns.has(rId)) return false;

      const q = searchTerm.toLowerCase();
      const matchesQ = !searchTerm || (r.name && r.name.toLowerCase().includes(q)) || (r.nisn && r.nisn.includes(q));
      const matchesStatus = !filterStatus || r.status === filterStatus;
      const matchesKelas = !filterKelas || matchClass(r.class, filterKelas);
      return matchesQ && matchesStatus && matchesKelas;
    });
  }, [resultsList, searchTerm, filterStatus, filterKelas, inactiveStudentNisns]);

  // Summary Metrics with NaN guards
  const totalPeserta = resultsList.length;
  const nilaiList = resultsList.map(r => Number(r.nilai) || 0);
  const avgNilaiNumber = totalPeserta > 0
    ? (nilaiList.reduce((acc, curr) => acc + curr, 0) / totalPeserta)
    : 0;
  const avgNilai = Number.isFinite(avgNilaiNumber) ? avgNilaiNumber.toFixed(1) : '0';
  
  const rawHighest = nilaiList.length > 0 ? Math.max(...nilaiList) : 0;
  const highest = Number.isFinite(rawHighest) ? rawHighest : 0;
  
  const rawLowest = nilaiList.length > 0 ? Math.min(...nilaiList) : 0;
  const lowest = Number.isFinite(rawLowest) ? rawLowest : 0;
  
  const totalTuntas = resultsList.filter(r => r.status === 'Tuntas').length;
  const rawTuntasPercent = totalPeserta > 0 ? Math.round((totalTuntas / totalPeserta) * 100) : 0;
  const tuntasPercent = Number.isFinite(rawTuntasPercent) ? rawTuntasPercent : 0;

  const handlePrint = () => {
    triggerPrint();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-900">Rekapitulasi & Hasil Ujian Peserta</h2>
          </div>
          <p className="text-xs text-slate-500">
            Analisis skor, ranking capaian kompetensi, persentase ketuntasan (KKTP), dan koreksi lembar jawaban siswa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {ujianList.length === 0 ? (
              <option value="">Belum Ada Sesi Ujian Selesai</option>
            ) : (
              ujianList.map((u: any, uIdx: number) => {
                const uId = u.id || `sesi-${uIdx}`;
                return (
                  <option key={`opt-ujian-${uId}-${uIdx}`} value={`${u.id || uId} - ${u.mapel || 'Ujian'} (${u.kelas || '1A'})`}>
                    {u.id || uId} - {u.mapel || 'Ujian'} ({u.kelas || '1A'})
                  </option>
                );
              })
            )}
          </select>

          <button
            onClick={handlePullResultsFromSheets}
            disabled={isPullingResults}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Tarik data hasil ujian peserta dari Sheet HASIL_UJIAN"
          >
            <CloudDownload size={15} className={isPullingResults ? 'animate-bounce' : ''} />
            <span>{isPullingResults ? 'Menarik...' : 'Tarik dari Sheet'}</span>
          </button>

          <button
            onClick={() => setPrintBeritaAcara(true)}
            disabled={resultsList.length === 0}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Printer size={15} />
            <span>Cetak Berita Acara</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Nilai Rata-rata</span>
          <div className="text-3xl font-black text-emerald-600">{avgNilai}</div>
          <span className="text-[11px] text-slate-400">Dari {totalPeserta} Peserta</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Nilai Tertinggi</span>
          <div className="text-3xl font-black text-cyan-600">{highest}</div>
          <span className="text-[11px] text-slate-400">Skor Maksimal</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Nilai Terendah</span>
          <div className="text-3xl font-black text-amber-600">{lowest}</div>
          <span className="text-[11px] text-slate-400">Batas Bawah</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Ketuntasan (KKTP &ge;75)</span>
          <div className="text-3xl font-black text-indigo-600">{tuntasPercent}%</div>
          <span className="text-[11px] text-emerald-600 font-bold">{totalTuntas} dari {totalPeserta} Tuntas</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama siswa atau NISN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map((c, cIdx) => (
                <option key={`opt-kelas-${c}-${cIdx}`} value={c}>{formatClassLabel(c, true)}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Semua Ketuntasan</option>
              <option value="Tuntas">Tuntas (KKTP Tercapai)</option>
              <option value="Remedial">Perlu Remedial</option>
            </select>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
              {filteredResults.length} Siswa
            </span>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-4 text-center">Rank</th>
                <th className="p-3.5">NISN & Nama Siswa</th>
                <th className="p-3.5">Rombel</th>
                <th className="p-3.5 text-center">Benar</th>
                <th className="p-3.5 text-center">Salah</th>
                <th className="p-3.5 text-center font-black text-slate-900">Nilai Akhir</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Waktu Selesai</th>
                <th className="p-3.5 pr-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    <Award size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Belum Ada Rekapitulasi Hasil Ujian</p>
                    <p className="text-xs text-slate-400 mt-0.5">Hasil ujian akan otomatis terdata setelah peserta menyelesaikan asesmen online.</p>
                  </td>
                </tr>
              ) : (
                filteredResults.map((r, rIdx) => {
                  const itemKey = r.id ? `res-row-${r.id}-${rIdx}` : `res-row-${r.nisn || rIdx}-${rIdx}`;
                  return (
                    <tr key={itemKey} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 text-center">
                        <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-mono font-black text-xs ${
                          r.rank === 1 ? 'bg-amber-400 text-slate-900 shadow-xs' :
                          r.rank === 2 ? 'bg-slate-300 text-slate-900' :
                          r.rank === 3 ? 'bg-amber-600 text-white' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {r.rank}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 text-sm">{r.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NISN: {r.nisn}</div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{formatClassLabel(r.class, true)}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-700">{r.benar}</td>
                      <td className="p-3.5 text-center font-bold text-rose-600">{r.salah}</td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono font-black text-base text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {r.nilai}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          r.status === 'Tuntas' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{r.waktuSelesai}</td>
                      <td className="p-3.5 pr-4 text-center">
                        <button
                          onClick={() => setViewLembarModal(r)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition flex items-center gap-1 mx-auto"
                          title="Lihat Lembar Jawaban Siswa"
                        >
                          <Eye size={13} />
                          <span>Lembar Jawaban</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL LEMBAR JAWABAN SISWA */}
      {viewLembarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Lembar Jawaban: {viewLembarModal.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    NISN: {viewLembarModal.nisn} • Nilai: <strong className="text-emerald-600">{viewLembarModal.nilai}</strong> ({viewLembarModal.benar} Benar, {viewLembarModal.salah} Salah)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setViewLembarModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Matrix of Questions 1 to 30 */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-700">Analisis Butir Jawaban Siswa</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-bold text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Benar ({viewLembarModal.benar})
                  </span>
                  <span className="flex items-center gap-1 font-bold text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Salah ({viewLembarModal.salah})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {viewLembarModal.jawabanDetail?.map((j, jIdx) => (
                  <div 
                    key={`modal-jawaban-${j.no ?? jIdx}-${jIdx}`}
                    className={`p-3 rounded-2xl border text-center space-y-1 transition ${
                      j.isCorrect 
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                        : 'bg-rose-50/70 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span>No. {j.no ?? jIdx + 1}</span>
                      {j.isCorrect ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-rose-600" />}
                    </div>
                    <div className="font-mono text-base font-black">
                      {j.jawabanSiswa || '-'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Kunci: <strong>{j.kunci || '-'}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setViewLembarModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup Lembar Jawaban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BERITA ACARA PRINT MODAL */}
      {printBeritaAcara && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in print-modal-container">
          <div id="printable-area" className="bg-white rounded-3xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto printable-container print-modal-content print:border-none print:shadow-none print:p-0 print:m-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <h3 className="text-base font-black text-slate-900">Cetak Berita Acara & Daftar Nilai CBT</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer size={15} /> Cetak Dokumen
                </button>
                <button
                  onClick={() => setPrintBeritaAcara(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Official Paper Layout */}
            <div className="p-6 bg-white border border-slate-300 rounded-2xl space-y-6 text-slate-900 text-xs font-serif leading-relaxed printable-card print:border-none print:p-0 print:m-0">
              <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                <h4 className="text-sm font-bold uppercase tracking-widest">{settings.schoolName || 'ROMBEL TAMBORA'}</h4>
                <h5 className="text-base font-extrabold uppercase">BERITA ACARA PELAKSANAAN ASESMEN CBT</h5>
                <p className="text-[11px] font-sans text-slate-600">Tahun Ajaran {settings.tahunPelajaran || '2026/2027'}</p>
              </div>

              <div className="space-y-1 font-sans text-xs">
                <p>Pada hari ini tanggal <strong>{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</strong>, telah dilaksanakan asesmen online dengan rincian:</p>
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div>• Mata Pelajaran: <strong>Pendidikan Pancasila</strong></div>
                  <div>• Kelas / Rombel: <strong>Kelas 1A</strong></div>
                  <div>• Jumlah Peserta Terdaftar: <strong>{totalPeserta} Siswa</strong></div>
                  <div>• Nilai Rata-rata: <strong>{avgNilai} Poin</strong></div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border border-slate-400 font-sans text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400">
                    <th className="p-2 border border-slate-400 text-center">No</th>
                    <th className="p-2 border border-slate-400">NISN</th>
                    <th className="p-2 border border-slate-400">Nama Siswa</th>
                    <th className="p-2 border border-slate-400 text-center">Benar</th>
                    <th className="p-2 border border-slate-400 text-center">Salah</th>
                    <th className="p-2 border border-slate-400 text-center">Nilai</th>
                    <th className="p-2 border border-slate-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsList.slice(0, 10).map((r, idx) => (
                    <tr key={r.id ? `ba-${r.id}-${idx}` : `ba-${r.nisn || idx}-${idx}`}>
                      <td className="p-2 border border-slate-400 text-center">{idx + 1}</td>
                      <td className="p-2 border border-slate-400 font-mono">{r.nisn}</td>
                      <td className="p-2 border border-slate-400 font-bold">{r.name}</td>
                      <td className="p-2 border border-slate-400 text-center">{r.benar}</td>
                      <td className="p-2 border border-slate-400 text-center">{r.salah}</td>
                      <td className="p-2 border border-slate-400 text-center font-bold">{r.nilai}</td>
                      <td className="p-2 border border-slate-400 text-center">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-6 pt-6 font-sans text-xs">
                <div className="space-y-12">
                  <p>Guru Pengawas / Proktor</p>
                  <div>
                    <p className="font-bold underline">( ............................................ )</p>
                    <p className="text-[10px] text-slate-500 font-mono">NIP. -</p>
                  </div>
                </div>
                <div className="space-y-12">
                  <p>Mengetahui, Kepala Sekolah</p>
                  <div>
                    <p className="font-bold underline">{settings.headmasterName || 'Kepala Sekolah'}</p>
                    <p className="text-[10px] text-slate-500 font-mono">NIP. {settings.headmasterNip || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
