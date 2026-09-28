import React, { useState, useMemo, useEffect } from 'react';
import { 
  Eye, Search, X, Users, CheckCircle2, Clock, 
  AlertTriangle, ShieldAlert, Wifi, PlusCircle, 
  RotateCcw, Send, Check, MessageSquare, Volume2,
  Unlock, Lock, FileSpreadsheet, RefreshCw, Key
} from 'lucide-react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { getAllClasses, formatClassLabel, matchClass, matchStatusActive, STANDARD_CLASSES } from '../../lib/utils';
import { 
  CBT_MONITOR_KEY, 
  CBT_VIOLATION_KEY, 
  CbtLiveParticipant, 
  addCbtExtraTime, 
  forceFinishCbtExam, 
  unlockAndResetCbtStudent,
  resetCbtStudent 
} from '../../utils/cbtMonitorHelper';
import { buildLockedExamToken } from '../../utils/cbtTokenHelper';
import { exportToExcel } from '../../lib/excel';
import Swal from 'sweetalert2';

interface StudentSessionStatus {
  id: string;
  nisn: string;
  name: string;
  class: string;
  ip: string;
  device: string;
  loginTime: string;
  totalSoal: number;
  terjawab: number;
  sisaMenit: number;
  status: 'Mengerjakan' | 'Selesai' | 'Peringatan' | 'Terkunci' | 'Belum Login';
  pelanggaranCount: number;
  pelanggaranList: {
    waktu: string;
    tipe: string;
    keterangan: string;
  }[];
  nilaiAkhir?: number;
}

export default function ProktorPengawasanTab() {
  const { students } = useStore();
  const rawUjian = db.get('ujian_cbt');
  const ujianList = (Array.isArray(rawUjian) ? rawUjian : []).filter((u: any) => {
    const t = String(u.Tanggal || u.tgl || u.tanggal || u.tglDisplay || '');
    return !t.includes('10-01') && !t.includes('01 Okt') && !t.includes('2026-10-01');
  });

  const activeStudents = useMemo(() => {
    return students.filter(s => matchStatusActive(s?.status));
  }, [students]);

  const availableClasses = useMemo(() => {
    return Array.from(new Set([...getAllClasses(activeStudents), ...STANDARD_CLASSES])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [activeStudents]);

  const [selectedSession, setSelectedSession] = useState<string>(() => {
    if (ujianList.length > 0) {
      return `${ujianList[0].id} - ${ujianList[0].mapel} (${ujianList[0].kelas})`;
    }
    return '';
  });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Cheating Detail Inspection Modal State
  const [inspectStudent, setInspectStudent] = useState<StudentSessionStatus | null>(null);

  // Broadcast Message State
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Quick Action Notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Extract selected Exam ID from dropdown
  const selectedExamId = useMemo(() => {
    if (!selectedSession) return '';
    return selectedSession.split(' - ')[0].trim();
  }, [selectedSession]);

  // Extract selected Exam Object
  const currentExamObj = useMemo(() => {
    if (!selectedExamId) return null;
    return ujianList.find((u: any) => String(u.id).trim() === selectedExamId) || null;
  }, [selectedExamId, ujianList]);

  // Active Token for current exam
  const currentExamToken = useMemo(() => {
    if (!currentExamObj) return '-';
    if (currentExamObj.token) return currentExamObj.token;
    return buildLockedExamToken(currentExamObj.kelas || '7A', currentExamObj.mapel || 'Bahasa Indonesia');
  }, [currentExamObj]);

  // Real-time synchronization tick from db
  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    const handleDbChange = () => setSyncTick(t => t + 1);
    window.addEventListener('storage', handleDbChange);
    window.addEventListener('erp-db-updated', handleDbChange);
    window.addEventListener('cbt-student-unlocked', handleDbChange);
    const interval = setInterval(() => setSyncTick(t => t + 1), 2000);
    return () => {
      window.removeEventListener('storage', handleDbChange);
      window.removeEventListener('erp-db-updated', handleDbChange);
      window.removeEventListener('cbt-student-unlocked', handleDbChange);
      clearInterval(interval);
    };
  }, []);

  // Compute live list of students from real database state (cbt_live_monitoring, exam_results, violations)
  const studentList = useMemo<StudentSessionStatus[]>(() => {
    const active = (students || []).filter(s => matchStatusActive(s?.status));
    const liveMonitor: CbtLiveParticipant[] = (db.get(CBT_MONITOR_KEY) || []) as CbtLiveParticipant[];
    const examResults: any[] = (db.get('cbt_exam_results') || db.get('hasil_ujian') || []) as any[];
    const violationLogs: any[] = (db.get(CBT_VIOLATION_KEY) || []) as any[];

    // Map by studentId or NISN
    const monitorMap = new Map<string, CbtLiveParticipant>();
    if (Array.isArray(liveMonitor)) {
      liveMonitor.forEach(p => {
        if (p.studentId) monitorMap.set(p.studentId, p);
        if (p.nisn) monitorMap.set(p.nisn, p);
      });
    }

    const resultsMap = new Map<string, any>();
    if (Array.isArray(examResults)) {
      examResults.forEach(r => {
        const sId = r.studentId || r.siswaId || r.nisn;
        if (sId) resultsMap.set(sId, r);
      });
    }

    const violationsMap = new Map<string, any[]>();
    if (Array.isArray(violationLogs)) {
      violationLogs.forEach(v => {
        const sId = v.studentId || v.nisn;
        if (sId) {
          if (!violationsMap.has(sId)) violationsMap.set(sId, []);
          violationsMap.get(sId)!.push(v);
        }
      });
    }

    return active.map((s) => {
      const live = monitorMap.get(s.id) || (s.nisn ? monitorMap.get(s.nisn) : undefined);
      const finishedResult = resultsMap.get(s.id) || (s.nisn ? resultsMap.get(s.nisn) : undefined);
      const studentViolations = violationsMap.get(s.id) || (s.nisn ? violationsMap.get(s.nisn) || [] : []);
      const recordedViolationsCount = studentViolations.length;

      // Determine actual live status
      if (finishedResult) {
        return {
          id: s.id,
          nisn: s.nisn || '-',
          name: s.name,
          class: s.class || 'Kelas 4',
          ip: live?.ip || '192.168.1.102',
          device: live?.device || 'Chrome (OS Terverifikasi)',
          loginTime: live?.loginTime || finishedResult.submittedAt?.slice(11, 19) || '10:00:00',
          totalSoal: finishedResult.totalSoal || live?.totalSoal || 20,
          terjawab: finishedResult.totalSoal || live?.terjawab || 20,
          sisaMenit: 0,
          status: 'Selesai' as const,
          pelanggaranCount: live?.pelanggaranCount || recordedViolationsCount || 0,
          pelanggaranList: live?.pelanggaranList || studentViolations,
          nilaiAkhir: finishedResult.nilaiAkhir ?? finishedResult.nilaiMentah ?? finishedResult.nilai ?? finishedResult.score
        };
      }

      if (live) {
        const isRecent = Boolean(live.lastHeartbeat);
        const effectiveViolations = Math.max(live.pelanggaranCount || 0, recordedViolationsCount);
        let st: 'Mengerjakan' | 'Selesai' | 'Peringatan' | 'Terkunci' | 'Belum Login' = 'Mengerjakan';

        if (live.status === 'Selesai') {
          st = 'Selesai';
        } else if (effectiveViolations >= 3 || live.status === 'Terkunci' || live.isLockedBySystem) {
          st = 'Terkunci';
        } else if (effectiveViolations > 0 || live.status === 'Peringatan') {
          st = 'Peringatan';
        } else if (!isRecent) {
          st = 'Belum Login';
        }

        return {
          id: s.id,
          nisn: s.nisn || live.nisn || '-',
          name: s.name,
          class: s.class || live.class || 'Kelas 4',
          ip: live.ip || '192.168.1.100',
          device: live.device || 'Chrome Terpantau',
          loginTime: live.loginTime || '-',
          totalSoal: live.totalSoal || 20,
          terjawab: live.terjawab || 0,
          sisaMenit: Math.max(0, Math.ceil(live.sisaDetik / 60)),
          status: st,
          pelanggaranCount: effectiveViolations,
          pelanggaranList: (live.pelanggaranList && live.pelanggaranList.length > 0) ? live.pelanggaranList : studentViolations
        };
      }

      return {
        id: s.id,
        nisn: s.nisn || '-',
        name: s.name,
        class: s.class || 'Kelas 4',
        ip: '-',
        device: '-',
        loginTime: '-',
        totalSoal: 20,
        terjawab: 0,
        sisaMenit: 90,
        status: recordedViolationsCount >= 3 ? 'Terkunci' : recordedViolationsCount > 0 ? 'Peringatan' : 'Belum Login',
        pelanggaranCount: recordedViolationsCount,
        pelanggaranList: studentViolations
      };
    });
  }, [students, syncTick]);

  const filteredStudents = useMemo(() => {
    return studentList.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchesQ = !searchTerm || s.name.toLowerCase().includes(q) || s.nisn.includes(q) || s.ip.includes(q);
      const matchesStatus = !filterStatus || s.status === filterStatus;
      const matchesKelas = !filterKelas || matchClass(s.class, filterKelas);
      return matchesQ && matchesStatus && matchesKelas;
    });
  }, [studentList, searchTerm, filterStatus, filterKelas]);

  // Statistics
  const totalPeserta = studentList.length;
  const sedangMengerjakan = studentList.filter(s => s.status === 'Mengerjakan').length;
  const sudahSelesai = studentList.filter(s => s.status === 'Selesai').length;
  const belumLogin = studentList.filter(s => s.status === 'Belum Login').length;
  const peringatan = studentList.filter(s => s.status === 'Peringatan').length;
  const terkunci = studentList.filter(s => s.status === 'Terkunci').length;

  // Real Proctor Action Handlers connected directly to DB
  const handleAddExtraTime = (studentId: string, name: string) => {
    addCbtExtraTime(studentId, selectedExamId, 10);
    setSyncTick(t => t + 1);
    showToast(`+10 Menit waktu pengerjaan berhasil dikirim ke perangkat ${name}`);
  };

  const handleForceFinish = (studentId: string, name: string) => {
    Swal.fire({
      title: `Selesaikan Ujian ${name}?`,
      text: 'Jawaban yang sudah diisi siswa akan langsung disimpan dan dinilai, lalu sesi ujian di perangkat siswa akan ditutup.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Selesaikan Paksa',
      cancelButtonText: 'Batal'
    }).then((res) => {
      if (res.isConfirmed) {
        forceFinishCbtExam(studentId, selectedExamId);
        setSyncTick(t => t + 1);
        showToast(`Sesi ujian ${name} diselesaikan paksa & lembar jawaban disimpan.`);
      }
    });
  };

  const handleUnlockAndResetStudent = (studentId: string, name: string) => {
    unlockAndResetCbtStudent(studentId, selectedExamId);
    setSyncTick(t => t + 1);
    if (inspectStudent && inspectStudent.id === studentId) {
      setInspectStudent(null);
    }
    Swal.fire({
      icon: 'success',
      title: 'Ujian Berhasil Dibuka Kembali!',
      html: `
        <div class="text-left text-xs space-y-2 text-slate-600">
          <p>Kunci pengerjaan ujian untuk siswa <b>${name}</b> telah dibuka kembali oleh proktor.</p>
          <p class="text-emerald-700 font-bold">Semua jawaban yang telah diisi tetap aman dan siswa dapat langsung melanjutkan ujian di perangkatnya.</p>
        </div>
      `,
      confirmButtonColor: '#0891b2'
    });
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    
    const broadcasts = (db.get('cbt_proctor_broadcast') || []) as any[];
    const newBroadcast = {
      id: `BC-${Date.now()}`,
      examId: selectedExamId,
      message: broadcastText.trim(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      sender: 'Proktor Ruang CBT'
    };
    db.set('cbt_proctor_broadcast', [newBroadcast, ...(Array.isArray(broadcasts) ? broadcasts : [])]);
    window.dispatchEvent(new CustomEvent('cbt-proctor-broadcast', { detail: newBroadcast }));

    setBroadcastSent(true);
    showToast(`Pesan siaran resmi berhasil dikirim ke seluruh layar peserta.`);
    setTimeout(() => {
      setBroadcastSent(false);
      setBroadcastText('');
    }, 2500);
  };

  const handleExportProctorMonitor = () => {
    const dataToExport = filteredStudents.map((s, idx) => ({
      No: idx + 1,
      Nama_Peserta: s.name,
      NISN: s.nisn,
      Kelas: formatClassLabel(s.class, true),
      IP_Address: s.ip,
      Perangkat: s.device,
      Waktu_Masuk: s.loginTime,
      Soal_Terjawab: `${s.terjawab}/${s.totalSoal}`,
      Sisa_Menit: s.status === 'Selesai' ? '-' : s.sisaMenit,
      Status_Ujian: s.status,
      Jumlah_Pelanggaran: s.pelanggaranCount,
      Nilai_Akhir: s.nilaiAkhir ?? '-'
    }));

    exportToExcel(dataToExport, `MONITORING_PROKTOR_CBT_${selectedExamId || 'SEMUA'}_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Session Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold border border-cyan-100">
              <Eye size={18} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Dashboard Pengawas & Proktor (Live Monitor)</h2>
              <p className="text-xs text-slate-500 font-medium">
                Monitoring status pengerjaan siswa secara langsung (Mengerjakan, Selesai, Peringatan Tab/Curang, & Terkunci).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Active Token Pill for Selected Session */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-2xl text-xs font-bold text-amber-900">
            <Key size={14} className="text-amber-600 shrink-0" />
            <span>Token Sesi:</span>
            <span className="font-mono font-black text-amber-800 bg-white px-2 py-0.5 rounded-lg border border-amber-300">
              {currentExamToken}
            </span>
          </div>

          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 max-w-xs"
          >
            {ujianList.length === 0 ? (
              <option value="">Belum Ada Sesi Ujian Aktif</option>
            ) : (
              ujianList.map((u: any) => (
                <option key={u.id} value={`${u.id} - ${u.mapel} (${u.kelas})`}>
                  {u.id} - {u.mapel} ({u.kelas})
                </option>
              ))
            )}
          </select>

          <button
            onClick={handleExportProctorMonitor}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 transition flex items-center gap-1.5 active:scale-95 shadow-2xs"
            title="Ekspor rekap monitoring proktor ke Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* 5 Real-Time KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500">Total Peserta</span>
          <div className="text-2xl font-black text-slate-900">{totalPeserta}</div>
          <span className="text-[10px] text-slate-400">Siswa Terdaftar</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Mengerjakan
          </span>
          <div className="text-2xl font-black text-emerald-600">{sedangMengerjakan}</div>
          <span className="text-[10px] text-slate-400">Online Live</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-indigo-600">Selesai Submit</span>
          <div className="text-2xl font-black text-indigo-600">{sudahSelesai}</div>
          <span className="text-[10px] text-slate-400">Telah Mengumpulkan</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
            <AlertTriangle size={13} /> Peringatan
          </span>
          <div className="text-2xl font-black text-amber-600">{peringatan}</div>
          <span className="text-[10px] text-slate-400">Pindah Tab (1-2x)</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
            <ShieldAlert size={13} /> Terkunci
          </span>
          <div className="text-2xl font-black text-rose-600">{terkunci}</div>
          <span className="text-[10px] text-slate-400">3x Pelanggaran (Lock)</span>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500">Belum Login</span>
          <div className="text-2xl font-black text-slate-600">{belumLogin}</div>
          <span className="text-[10px] text-slate-400">Offline / Belum Masuk</span>
        </div>
      </div>

      {/* Broadcast to Students Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-sm border border-slate-700 space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-cyan-400" />
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-300">
            Kirim Pesan Siaran (Broadcast) Proktor ke Layar Seluruh Peserta
          </h3>
        </div>

        <form onSubmit={handleSendBroadcast} className="flex flex-col sm:flex-row items-center gap-2.5">
          <input
            type="text"
            value={broadcastText}
            onChange={(e) => setBroadcastText(e.target.value)}
            placeholder="Ketik instruksi pengawas, misal: 'Waktu tersisa 15 menit lagi, seluruh butir soal wajib terisi lengkap sebelum submit'..."
            className="flex-1 w-full px-4 py-2.5 bg-slate-800/90 border border-slate-600 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={broadcastSent || !broadcastText.trim()}
            className="w-full sm:w-auto px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {broadcastSent ? <Check size={15} /> : <Send size={15} />}
            <span>{broadcastSent ? 'Terkirim!' : 'Kirim Siaran'}</span>
          </button>
        </form>
      </div>

      {/* Live Student Grid & Control Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama peserta, NISN, IP address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
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
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{formatClassLabel(c, true)}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            >
              <option value="">Semua Status Siswa</option>
              <option value="Mengerjakan">Sedang Mengerjakan</option>
              <option value="Selesai">Selesai Submit</option>
              <option value="Peringatan">Peringatan (1-2x Pindah Tab)</option>
              <option value="Terkunci">Terkunci (3x Pelanggaran)</option>
              <option value="Belum Login">Belum Login</option>
            </select>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
              {filteredStudents.length} Peserta
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-4">NISN & Nama Peserta</th>
                <th className="p-3.5">Rombel</th>
                <th className="p-3.5">IP & Perangkat</th>
                <th className="p-3.5">Waktu Masuk</th>
                <th className="p-3.5">Progres Pengerjaan</th>
                <th className="p-3.5 text-center">Sisa Waktu</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-4 text-center">Kontrol Proktor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <Users size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Peserta Sesuai Filter</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const percent = Math.round((s.terjawab / s.totalSoal) * 100);
                  const isLocked = s.status === 'Terkunci';
                  const hasWarning = s.status === 'Peringatan' || s.pelanggaranCount > 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4">
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn}</div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{formatClassLabel(s.class, true)}</td>
                      <td className="p-3.5 font-mono text-slate-600">
                        <div className="text-slate-800 font-semibold">{s.ip}</div>
                        <div className="text-[10px] text-slate-400">{s.device}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">{s.loginTime}</td>
                      <td className="p-3.5 w-48">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-700">{s.terjawab}/{s.totalSoal} Soal</span>
                          <span className={percent === 100 ? 'text-emerald-600' : 'text-cyan-700'}>{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              percent === 100 ? 'bg-emerald-500' : isLocked ? 'bg-rose-500' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-800">
                        {s.status === 'Selesai' ? '-' : `${s.sisaMenit}m`}
                      </td>
                      <td className="p-3.5 text-center">
                        {isLocked ? (
                          <button
                            onClick={() => setInspectStudent(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black text-[10px] bg-rose-100 text-rose-800 border border-rose-300 animate-pulse hover:bg-rose-200 transition cursor-pointer"
                            title="Klik untuk melihat log kecurangan dan membuka kunci"
                          >
                            <Lock size={11} />
                            <span>Terkunci ({s.pelanggaranCount}x)</span>
                          </button>
                        ) : hasWarning ? (
                          <button
                            onClick={() => setInspectStudent(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition cursor-pointer"
                            title="Klik untuk melihat detail peringatan"
                          >
                            <AlertTriangle size={11} />
                            <span>Peringatan ({s.pelanggaranCount}x)</span>
                          </button>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            s.status === 'Mengerjakan' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            s.status === 'Selesai' ? 'bg-indigo-100 text-indigo-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {s.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Button Buka Kunci Siswa */}
                          <button
                            onClick={() => handleUnlockAndResetStudent(s.id, s.name)}
                            className={`p-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1 ${
                              isLocked 
                                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs animate-bounce' 
                                : hasWarning
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Buka Kunci Ujian / Reset Sesi Siswa"
                          >
                            <Unlock size={13} />
                            {isLocked && <span className="text-[10px]">Buka Kunci</span>}
                          </button>

                          {/* Button Tambah Waktu */}
                          <button
                            onClick={() => handleAddExtraTime(s.id, s.name)}
                            disabled={s.status === 'Selesai'}
                            className="p-1.5 bg-cyan-50 hover:bg-cyan-100 disabled:opacity-40 text-cyan-700 rounded-lg font-bold text-xs transition"
                            title="Tambah Waktu Pengerjaan +10 Menit"
                          >
                            <PlusCircle size={13} />
                          </button>

                          {/* Button Selesaikan Paksa */}
                          <button
                            onClick={() => handleForceFinish(s.id, s.name)}
                            disabled={s.status === 'Selesai'}
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 text-slate-600 rounded-lg font-bold text-xs transition"
                            title="Selesaikan Paksa (Force Submit)"
                          >
                            <CheckCircle2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION MODAL: CHEATING LOGS & QUICK UNLOCK */}
      {inspectStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Log Pelanggaran Integritas Ujian
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {inspectStudent.name} (NISN: {inspectStudent.nisn}) • {formatClassLabel(inspectStudent.class, true)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectStudent(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Status Keamanan:</span>
                Terdeteksi <b>{inspectStudent.pelanggaranCount} kali</b> pelanggaran keamanan sistem CBT.
                {inspectStudent.pelanggaranCount >= 3 && (
                  <span className="text-rose-700 font-bold block mt-0.5">
                    Layar siswa saat ini terkunci otomatis oleh sistem.
                  </span>
                )}
              </div>
            </div>

            {/* Violation Timeline List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(!inspectStudent.pelanggaranList || inspectStudent.pelanggaranList.length === 0) ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Belum ada rekaman kronologi pelanggaran mendetail.
                </div>
              ) : (
                inspectStudent.pelanggaranList.map((v, vIdx) => (
                  <div key={vIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-700 uppercase text-[10px] tracking-wider">
                        {v.tipe || 'PELANGGARAN_KEAMANAN'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{v.waktu}</span>
                    </div>
                    <p className="text-slate-700">{v.keterangan || 'Berpindah tab atau meninggalkan jendela ujian aktif.'}</p>
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleUnlockAndResetStudent(inspectStudent.id, inspectStudent.name)}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md active:scale-95"
              >
                <Unlock size={14} />
                <span>Buka Kunci Ujian Siswa Sekarang</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
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
