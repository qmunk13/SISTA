import React, { useState, useEffect, useMemo } from 'react';
import { 
  Key, RefreshCw, Copy, Check, ShieldCheck, 
  Clock, AlertCircle, Users, Unlock, Eye, Sparkles, CloudDownload,
  AlertTriangle, RotateCcw, Zap, Filter
} from 'lucide-react';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { formatClassLabel, matchStatusActive } from '../../lib/utils';
import { buildLockedExamToken } from '../../utils/cbtTokenHelper';
import { deduplicateTokens } from '../../utils/cbtScheduleSync';
import { pullSpecificSheetFromGas } from '../../utils/gasSync';
import { unlockAndResetCbtStudent, CBT_MONITOR_KEY, CBT_VIOLATION_KEY, CbtLiveParticipant } from '../../utils/cbtMonitorHelper';
import Swal from 'sweetalert2';

interface TokenItem {
  id: string;
  sesiId: string;
  mapel: string;
  kelas: string;
  token: string;
  waktuDibuat: string;
  kedaluwarsa: string;
  status: 'Aktif' | 'Kedaluwarsa' | 'Dinonaktifkan';
  proktor: string;
}

export default function TokenUjianTab() {
  const { students } = useStore();
  const [copied, setCopied] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Persisted Token History in DB - Sourced PURELY from Google Spreadsheet (Sheet TOKEN)
  const [tokenList, setTokenList] = useState<TokenItem[]>(() => {
    const saved = db.get('cbt_token_history');
    const existing = Array.isArray(saved) ? saved : [];
    return deduplicateTokens(existing);
  });

  const [currentToken, setCurrentToken] = useState(() => {
    const saved = db.get('cbt_token_history');
    const active = Array.isArray(saved) ? saved.find((t: any) => t.status === 'Aktif') : null;
    return active?.token || 'BELUM AKTIF';
  });

  const [tokenDuration, setTokenDuration] = useState('30'); // Menit
  const [secondsRemaining, setSecondsRemaining] = useState(1800); // 30 mins
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState(false);

  // Reset / Unlock Siswa Terkunci
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterType, setStudentFilterType] = useState<'all' | 'locked' | 'warning'>('all');
  const [resetSuccessId, setResetSuccessId] = useState<string | null>(null);

  // Specific Mapel & Kelas Selector for Token Generation
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [availableMapel, setAvailableMapel] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // Filter for Token Table
  const [filterMapel, setFilterMapel] = useState('');
  const [filterKelas, setFilterKelas] = useState('');

  // Sync tick for live monitoring and violations
  const [monitorTick, setMonitorTick] = useState(0);

  useEffect(() => {
    const handleDb = () => setMonitorTick(t => t + 1);
    window.addEventListener('erp-db-updated', handleDb);
    window.addEventListener('storage', handleDb);
    window.addEventListener('cbt-student-unlocked', handleDb);
    return () => {
      window.removeEventListener('erp-db-updated', handleDb);
      window.removeEventListener('storage', handleDb);
      window.removeEventListener('cbt-student-unlocked', handleDb);
    };
  }, []);

  useEffect(() => {
    // 1. Load subjects from db (synonym for MAPEL / subjects)
    const rawMapel = db.get('subjects') || db.get('academic_subjects') || db.get('MAPEL') || [];
    let mapelNames: string[] = [];
    if (Array.isArray(rawMapel)) {
      mapelNames = rawMapel
        .map((m: any) => m.nama || m.name || m.namaMapel || m.Nama || m.MataPelajaran)
        .filter((n: any): n is string => Boolean(n));
    }
    if (mapelNames.length === 0) {
      mapelNames = ['Bahasa Indonesia', 'Matematika', 'IPAS', 'Pendidikan Pancasila', 'Bahasa Inggris', 'PJOK', 'Seni Budaya', 'Pendidikan Agama Islam'];
    }
    setAvailableMapel(Array.from(new Set(mapelNames)));
    if (!selectedMapel && mapelNames.length > 0) {
      setSelectedMapel(mapelNames[0]);
    }

    // 2. Load classes
    const classes = Array.from(
      new Set(
        (students || [])
          .map(s => s?.class)
          .filter(Boolean)
          .map(c => String(c).trim())
      )
    );
    const clsList = classes.length > 0 ? classes : ['7A', '7B', '8A', '8B', '9A', '9B'];
    setAvailableClasses(clsList);
    if (!selectedKelas && clsList.length > 0) {
      setSelectedKelas(clsList[0]);
    }
  }, [students]);

  useEffect(() => {
    const handleDbUpdate = (e: any) => {
      if (!e?.detail?.key || e.detail.key === 'cbt_token_history' || e.detail.key === 'ujian_cbt') {
        const saved = db.get('cbt_token_history');
        const existing = Array.isArray(saved) ? saved : [];
        const dedup = deduplicateTokens(existing);
        setTokenList(dedup);
        const active = dedup.find((t: any) => t.status === 'Aktif');
        if (active?.token) {
          setCurrentToken(active.token);
        }
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, []);

  const saveTokensToDb = (list: TokenItem[]) => {
    setTokenList(list);
    db.set('cbt_token_history', list);
    db.set('cbt_tokens', list);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'cbt_token_history' } }));
  };

  // Timer countdown & Auto-release token berkala
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          if (isAutoRefreshActive) {
            handleGenerateNewToken(true);
            return Number(tokenDuration) * 60;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAutoRefreshActive, tokenDuration, selectedMapel, selectedKelas]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  // Sinkronkan token aktif setiap kali kombinasi kelas atau mapel berganti
  useEffect(() => {
    if (selectedKelas && selectedMapel) {
      const locked = buildLockedExamToken(selectedKelas, selectedMapel);
      setCurrentToken(locked);
    }
  }, [selectedKelas, selectedMapel]);

  // Generate / Rilis Token Baru (Berkala / Manual)
  const handleGenerateNewToken = (isAuto: boolean = false, randomMode: boolean = false) => {
    const mapelName = selectedMapel || availableMapel[0] || 'Bahasa Indonesia';
    const kelasName = selectedKelas || availableClasses[0] || '7A';

    let tokenCode = buildLockedExamToken(kelasName, mapelName);
    if (randomMode) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      tokenCode = rand;
    }

    setCurrentToken(tokenCode);
    setSecondsRemaining(Number(tokenDuration) * 60);

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
    const expDate = new Date(now.getTime() + Number(tokenDuration) * 60000);
    const expStr = `${expDate.getHours().toString().padStart(2, '0')}:${expDate.getMinutes().toString().padStart(2, '0')} WIB`;

    const newTokenItem: TokenItem = {
      id: `tok-${Date.now()}`,
      sesiId: `SES-${kelasName}-${mapelName.substring(0, 3).toUpperCase()}`,
      mapel: mapelName,
      kelas: kelasName,
      token: tokenCode,
      waktuDibuat: timeStr,
      kedaluwarsa: expStr,
      status: 'Aktif',
      proktor: 'Admin Proktor CBT'
    };

    saveTokensToDb([newTokenItem, ...tokenList]);

    // Update sesi CBT di database agar token langsung tersinkron
    try {
      const savedUjian = db.get('ujian_cbt') || db.get('cbt_exams') || [];
      if (Array.isArray(savedUjian)) {
        const updatedUjian = savedUjian.map((u: any) => {
          if (
            (String(u.mapel || '').toLowerCase() === mapelName.toLowerCase() || mapelName === 'Semua Mapel') &&
            (String(u.kelas || '').toLowerCase() === kelasName.toLowerCase() || kelasName === 'Semua Kelas')
          ) {
            return { ...u, token: tokenCode };
          }
          return u;
        });
        db.set('ujian_cbt', updatedUjian);
        db.set('cbt_exams', updatedUjian);
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'ujian_cbt' } }));
      }
    } catch {
      // safe fallback
    }

    if (!isAuto) {
      Swal.fire({
        icon: 'success',
        title: 'Token Resmi Berhasil Dirilis!',
        html: `
          <div class="text-left text-xs space-y-2 text-slate-600">
            <p>Kode Token Aktif: <b class="font-mono text-base text-amber-700 font-black">${tokenCode}</b></p>
            <p>Untuk: <b>${mapelName} (${formatClassLabel(kelasName, true)})</b></p>
            <p>Masa Berlaku: <b>${tokenDuration} Menit</b> (sampai ${expStr})</p>
            <p class="text-emerald-700 font-semibold">Token telah disinkronkan ke seluruh sesi ujian peserta.</p>
          </div>
        `,
        confirmButtonColor: '#0891b2'
      });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePullTokensFromGoogleSheets = async () => {
    setIsPulling(true);
    try {
      const res = await pullSpecificSheetFromGas('TOKEN');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const rawTokens = res.data.map((r: any, idx: number) => {
          const id = String(r.TokenID || r.id || `tok-${idx + 1}`).trim();
          const token = String(r.KodeToken || r.token || r.Kode || '').trim();
          const mapel = String(r.Mapel || r.mapel || 'Mata Pelajaran').trim();
          const kelas = String(r.Kelas || r.kelas || 'Semua Kelas').trim();
          const status = (String(r.Status || 'Aktif').trim() as any) || 'Aktif';
          const waktuDibuat = String(r.WaktuDibuat || r.waktuDibuat || '19:30 WIB').trim();
          const kedaluwarsa = String(r.Kedaluwarsa || r.kedaluwarsa || '22:00 WIB').trim();
          const proktor = String(r.Proktor || r.proktor || 'Admin CBT').trim();
          const sesiId = String(r.UjianID || r.ujianId || r.sesiId || '').trim();

          return {
            id,
            token,
            mapel,
            kelas,
            status,
            waktuDibuat,
            kedaluwarsa,
            proktor,
            sesiId
          };
        });

        const deduped = deduplicateTokens(rawTokens);
        setTokenList(deduped);
        saveTokensToDb(deduped);
        const active = deduped.find((t: any) => t.status === 'Aktif');
        if (active) setCurrentToken(active.token);

        Swal.fire({
          title: 'Token Tersinkron dari Google Sheet!',
          text: `Berhasil menarik ${deduped.length} token resmi langsung dari Sheet TOKEN.`,
          icon: 'success',
          confirmButtonColor: '#0891b2'
        });
      } else {
        Swal.fire({
          title: 'Sheet TOKEN Masih Kosong',
          text: 'Tidak ada baris data token di Google Spreadsheet sheet TOKEN.',
          icon: 'info',
          confirmButtonColor: '#0891b2'
        });
      }
    } catch (err: any) {
      console.error('Error pull tokens:', err);
      Swal.fire({
        title: 'Gagal Menarik Token',
        text: err?.message || 'Terjadi kesalahan koneksi ke Google Spreadsheet.',
        icon: 'error',
        confirmButtonColor: '#0891b2'
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleToggleStatus = (id: string) => {
    const updated = tokenList.map(t => {
      if (t.id === id) {
        const next = t.status === 'Aktif' ? 'Dinonaktifkan' : 'Aktif';
        return { ...t, status: next as any };
      }
      return t;
    });
    saveTokensToDb(updated);
  };

  // Buka Kembali Ujian Siswa yang Terkunci / Reset Login
  const handleResetStudentLogin = (studentId: string, name?: string) => {
    unlockAndResetCbtStudent(studentId);
    setResetSuccessId(studentId);
    setTimeout(() => setResetSuccessId(null), 3000);
    Swal.fire({
      icon: 'success',
      title: 'Ujian Berhasil Dibuka Kembali!',
      html: `
        <div class="text-left text-xs space-y-1.5 text-slate-600">
          <p>Kunci akses ujian untuk siswa <b>${name || 'Peserta'}</b> telah dibuka oleh proktor.</p>
          <p class="text-emerald-700 font-bold">Semua lembar jawaban yang telah diisi sebelumnya tetap tersimpan utuh dan peserta dapat segera melanjutkan pengerjaan.</p>
        </div>
      `,
      confirmButtonColor: '#0891b2'
    });
  };

  // Real-time lock & violation stats for student list
  const studentStatusMap = useMemo(() => {
    const liveMonitor: CbtLiveParticipant[] = (db.get(CBT_MONITOR_KEY) || []) as CbtLiveParticipant[];
    const violationLogs: any[] = (db.get(CBT_VIOLATION_KEY) || []) as any[];

    const map = new Map<string, { status: string; violations: number }>();
    if (Array.isArray(liveMonitor)) {
      liveMonitor.forEach(p => {
        if (p.studentId) map.set(p.studentId, { status: p.status, violations: p.pelanggaranCount || 0 });
        if (p.nisn) map.set(p.nisn, { status: p.status, violations: p.pelanggaranCount || 0 });
      });
    }

    if (Array.isArray(violationLogs)) {
      violationLogs.forEach(v => {
        const sId = v.studentId || v.nisn;
        if (sId) {
          const prev = map.get(sId) || { status: 'Belum Login', violations: 0 };
          map.set(sId, { ...prev, violations: prev.violations + 1 });
        }
      });
    }

    return map;
  }, [monitorTick]);

  const filteredStudents = (students || []).filter(s => {
    if (!matchStatusActive(s?.status)) return false;
    const stat = studentStatusMap.get(s.id) || (s.nisn ? studentStatusMap.get(s.nisn) : undefined);
    const violations = stat?.violations || 0;
    const isLocked = violations >= 3 || stat?.status === 'Terkunci';
    const hasWarning = violations > 0 || stat?.status === 'Peringatan';

    if (studentFilterType === 'locked' && !isLocked) return false;
    if (studentFilterType === 'warning' && !hasWarning) return false;

    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    return (s.name && String(s.name).toLowerCase().includes(q)) || 
           (s.nisn && String(s.nisn).includes(q)) || 
           (s.class && String(s.class).toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner with Big Live Token */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Card */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col justify-between space-y-6 lg:col-span-2">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                <ShieldCheck size={14} /> Token Resmi CBT
              </div>
              <h2 className="text-xl font-black">Distribusi & Rilis Token Sesi Ujian</h2>
              <p className="text-xs text-amber-100 font-medium">
                Kendalikan token berkala peserta untuk memulai pengerjaan butir soal secara tersinkronisasi.
              </p>
            </div>

            <div className="bg-black/20 backdrop-blur-xs px-4 py-2 rounded-2xl border border-white/20 text-right self-start sm:self-auto">
              <span className="text-[10px] text-amber-200 uppercase font-bold block">Kedaluwarsa Dalam</span>
              <span className="font-mono text-xl font-black tracking-wider flex items-center gap-1.5 text-white">
                <Clock size={16} className="text-amber-200 animate-pulse" /> {formatTimer(secondsRemaining)}
              </span>
            </div>
          </div>

          {/* Token Big Box */}
          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold text-amber-200 uppercase tracking-widest block">
                Kode Token Aktif
              </span>
              <div className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-white drop-shadow-sm mt-1">
                {currentToken}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopy}
                className="flex-1 sm:flex-initial px-4 py-3 bg-white text-slate-900 rounded-xl font-black text-xs shadow-md hover:bg-amber-50 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                <span>{copied ? 'Tersalin!' : 'Salin Token'}</span>
              </button>

              <button
                onClick={() => handleGenerateNewToken(false, false)}
                className="flex-1 sm:flex-initial px-4 py-3 bg-slate-950/40 hover:bg-slate-950/60 text-white rounded-xl font-black text-xs border border-white/20 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
                title="Rilis Token Resmi untuk Kelas dan Mapel Terpilih"
              >
                <Key size={16} />
                <span>Rilis Token Kelas</span>
              </button>

              <button
                onClick={() => handleGenerateNewToken(false, true)}
                className="px-3.5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs active:scale-95 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                title="Reset & Buat Token Acak 6 Karakter Baru"
              >
                <RotateCcw size={15} />
                <span>Reset Acak</span>
              </button>
            </div>
          </div>

          {/* Target Mapel, Rombel, Settings Duration, & Auto-Refresh Toggle */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs text-amber-100">
            <div>
              <label className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block mb-1">Mata Pelajaran (Sheet MAPEL)</label>
              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
              >
                <option value="Semua Mapel" className="text-slate-900">Semua Mata Pelajaran</option>
                {availableMapel.map(m => (
                  <option key={m} value={m} className="text-slate-900">{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block mb-1">Rombel / Kelas</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
              >
                <option value="Semua Kelas" className="text-slate-900">Semua Kelas</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls} className="text-slate-900">{formatClassLabel(cls, true)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block mb-1">Masa Berlaku Token</label>
              <select
                value={tokenDuration}
                onChange={(e) => {
                  setTokenDuration(e.target.value);
                  setSecondsRemaining(Number(e.target.value) * 60);
                }}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
              >
                <option value="15" className="text-slate-900">15 Menit</option>
                <option value="30" className="text-slate-900">30 Menit</option>
                <option value="60" className="text-slate-900">60 Menit (1 Jam)</option>
                <option value="120" className="text-slate-900">120 Menit (2 Jam)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-amber-200 uppercase tracking-wider block mb-1">Otomatis Rilis Berkala</label>
              <button
                type="button"
                onClick={() => setIsAutoRefreshActive(!isAutoRefreshActive)}
                className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isAutoRefreshActive 
                    ? 'bg-emerald-500 text-white shadow-xs' 
                    : 'bg-white/20 text-amber-100 hover:bg-white/30'
                }`}
              >
                <Zap size={13} className={isAutoRefreshActive ? 'animate-bounce' : ''} />
                <span>{isAutoRefreshActive ? 'Aktif (Otomatis)' : 'Manual (Klik)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security / Token Policy Widget */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Sparkles size={18} />
              </div>
              <h3 className="text-sm font-black text-slate-900">Protokol Keamanan & Integritas Token</h3>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>Token wajib diinput peserta saat halaman asesmen dibuka untuk verifikasi kehadiran.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>Rilis berkala menjamin token diperbarui berkala sehingga mencegah kebocoran sesi ujian.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>Siswa yang terkunci karena pelanggaran dapat dibuka kembali oleh proktor di bawah ini.</span>
              </li>
            </ul>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <span>Pastikan proktor berada di ruang kelas sebelum mengumumkan token ke siswa.</span>
          </div>
        </div>
      </div>

      {/* Riwayat & Alokasi Token Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Riwayat Distribusi Token (Spesifik Mapel & Kelas)</h3>
            <p className="text-xs text-slate-500 font-medium">Tersinkron dengan sheet TOKEN dan jadwal sesi ujian CBT</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePullTokensFromGoogleSheets}
              disabled={isPulling}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95 shadow-2xs cursor-pointer"
              title="Tarik seluruh token resmi langsung dari Sheet TOKEN Google Spreadsheet"
            >
              <RefreshCw size={13} className={isPulling ? 'animate-spin' : ''} />
              <span>{isPulling ? 'Menarik...' : 'Tarik dari Sheet TOKEN'}</span>
            </button>

            <select
              value={filterMapel}
              onChange={(e) => setFilterMapel(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 max-w-[160px]"
            >
              <option value="">Semua Mapel</option>
              {availableMapel.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{formatClassLabel(c, true)}</option>
              ))}
            </select>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {tokenList.filter(t => (!filterMapel || t.mapel === filterMapel) && (!filterKelas || t.kelas === filterKelas)).length} Token
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-4">Sesi & Mapel</th>
                <th className="p-3.5">Rombel / Kelas</th>
                <th className="p-3.5 font-mono text-center">Kode Token</th>
                <th className="p-3.5">Waktu Dibuat</th>
                <th className="p-3.5">Kedaluwarsa</th>
                <th className="p-3.5">Proktor Pembuat</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {tokenList.filter(t => (!filterMapel || t.mapel === filterMapel) && (!filterKelas || t.kelas === filterKelas)).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Key size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600 text-sm">Belum Ada Token Sesuai Filter</p>
                    <p className="text-xs text-slate-400 mt-0.5">Pilih mapel & kelas lalu klik tombol "Rilis Token Kelas" di atas.</p>
                  </td>
                </tr>
              ) : (
                tokenList.filter(t => (!filterMapel || t.mapel === filterMapel) && (!filterKelas || t.kelas === filterKelas)).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-4">
                      <div className="font-bold text-slate-900 text-sm">{t.mapel}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{t.sesiId}</div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{formatClassLabel(t.kelas, true)}</td>
                    <td className="p-3.5 text-center">
                      <span className="font-mono font-black text-sm text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                        {t.token}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{t.waktuDibuat}</td>
                    <td className="p-3.5 font-mono text-slate-600">{t.kedaluwarsa}</td>
                    <td className="p-3.5 text-slate-800">{t.proktor}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        t.status === 'Aktif' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : t.status === 'Kedaluwarsa'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(t.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                          t.status === 'Aktif'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {t.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Buka Kunci Siswa Terkunci & Reset Sesi Login Peserta */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                <Unlock size={17} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Buka Kembali Ujian Siswa yang Terkunci (Reset Login)</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Buka kunci login untuk siswa yang terkunci otomatis (3x pelanggaran) atau koneksi terputus agar dapat melanjutkan ujian.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStudentFilterType('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  studentFilterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStudentFilterType('locked')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  studentFilterType === 'locked' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                🔒 Terkunci
              </button>
              <button
                onClick={() => setStudentFilterType('warning')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  studentFilterType === 'warning' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                ⚠️ Peringatan
              </button>
            </div>

            <div className="w-full sm:w-60">
              <input
                type="text"
                placeholder="Cari nama siswa / NISN..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-2xl">
              <Users size={24} className="mx-auto mb-1 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Tidak ada siswa yang sesuai filter saat ini.</p>
            </div>
          ) : (
            filteredStudents.slice(0, 9).map((s) => {
              const stat = studentStatusMap.get(s.id) || (s.nisn ? studentStatusMap.get(s.nisn) : undefined);
              const violations = stat?.violations || 0;
              const isLocked = violations >= 3 || stat?.status === 'Terkunci';
              const hasWarning = violations > 0 || stat?.status === 'Peringatan';

              return (
                <div 
                  key={s.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 transition ${
                    isLocked 
                      ? 'bg-rose-50/70 border-rose-200' 
                      : hasWarning
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-slate-50 border-slate-200/80 hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs truncate max-w-[130px]">{s.name}</span>
                      {isLocked ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-200 text-rose-800">
                          Terkunci
                        </span>
                      ) : hasWarning ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-200 text-amber-800">
                          {violations}x
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      NISN: {s.nisn || '-'} • {formatClassLabel(s.class, true)}
                    </div>
                  </div>

                  {resetSuccessId === s.id ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg flex items-center gap-1 shrink-0">
                      <Check size={11} /> Dibuka!
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResetStudentLogin(s.id, s.name)}
                      className={`px-3 py-1.5 font-black text-[10px] rounded-xl transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs ${
                        isLocked 
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      <Unlock size={11} />
                      <span>Buka Kunci</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
