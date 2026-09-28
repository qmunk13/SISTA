import React, { useMemo } from 'react';
import { db } from '../../data/db';
import { BkKonseling, BkPelanggaran, BkPrestasi, BkKarir } from '../../data/bkSeed';
import { 
  HeartHandshake, AlertTriangle, Award, Compass, ArrowRight, ShieldCheck, 
  TrendingUp, Users, AlertCircle, CheckCircle2, Clock, Sparkles,
  Flame, BookOpen, Star, FileText, ChevronRight, UserCheck
} from 'lucide-react';

interface BkDashboardTabProps {
  onNavigate?: (tabId: string) => void;
  onNavigateTab?: (tabId: string) => void;
}

export default function BkDashboardTab({ onNavigate, onNavigateTab }: BkDashboardTabProps) {
  const navigate = (tabId: string) => {
    if (onNavigate) onNavigate(tabId);
    else if (onNavigateTab) onNavigateTab(tabId);
  };

  // Load data from DB
  const konselingList = useMemo(() => db.get<BkKonseling>('bk_konseling') || [], []);
  const pelanggaranList = useMemo(() => db.get<BkPelanggaran>('bk_pelanggaran') || [], []);
  const prestasiList = useMemo(() => db.get<BkPrestasi>('bk_prestasi') || [], []);
  const karirList = useMemo(() => db.get<BkKarir>('bk_karir') || [], []);

  // 1. KPI Calculations
  const totalKonseling = konselingList.length;
  const konselingSelesai = konselingList.filter(k => k.status === 'SELESAI').length;
  const konselingProses = konselingList.filter(k => k.status === 'DALAM PROSES' || k.status === 'TERJADWAL').length;

  const totalPelanggaran = pelanggaranList.length;
  const totalPoinMinus = pelanggaranList.reduce((acc, p) => acc + Math.abs(Number(p.poin) || 0), 0);
  const kasusPerluAtensi = pelanggaranList.filter(p => p.status === 'MENUNGGU ORTU' || p.klasifikasi === 'Berat' || p.klasifikasi === 'Sangat Berat').length;

  const totalPrestasi = prestasiList.length;
  const totalPoinReward = prestasiList.reduce((acc, p) => acc + (Number(p.poinReward) || 0), 0);
  const prestasiNasionalProv = prestasiList.filter(p => p.tingkat === 'Nasional' || p.tingkat === 'Internasional' || p.tingkat === 'Provinsi').length;

  const totalKarir = karirList.length;
  const karirTerpetakan = karirList.filter(k => k.status === 'TERPETAKAN' || k.status === 'SELESAI REKOMENDASI').length;

  // 2. Urgent / Disciplinary Alerts
  const highRiskDiscipline = useMemo(() => {
    // Group violations by student
    const map = new Map<string, { nama: string; kelas: string; totalPoin: number; count: number; status: string }>();
    pelanggaranList.forEach(p => {
      const curr = map.get(p.namaSiswa) || { nama: p.namaSiswa, kelas: p.kelas, totalPoin: 0, count: 0, status: p.status };
      curr.totalPoin += Math.abs(Number(p.poin) || 0);
      curr.count += 1;
      curr.status = p.status;
      map.set(p.namaSiswa, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.totalPoin - a.totalPoin).slice(0, 4);
  }, [pelanggaranList]);

  // 3. Top Performing Students (Honor Roll of Awards)
  const topPrestasiStudents = useMemo(() => {
    const map = new Map<string, { nama: string; kelas: string; totalReward: number; awards: string[] }>();
    prestasiList.forEach(p => {
      const curr = map.get(p.namaSiswa) || { nama: p.namaSiswa, kelas: p.kelas, totalReward: 0, awards: [] };
      curr.totalReward += Number(p.poinReward) || 0;
      curr.awards.push(`${p.capaian} - ${p.namaEvent}`);
      map.set(p.namaSiswa, curr);
    });
    return Array.from(map.values()).sort((a, b) => b.totalReward - a.totalReward).slice(0, 4);
  }, [prestasiList]);

  // 4. Breakdown by Category (Konseling)
  const konselingCategories = useMemo(() => {
    const counts: Record<string, number> = {
      'Bimbingan Belajar': 0,
      'Individu': 0,
      'Bimbingan Karir': 0,
      'Konsultasi Ortu': 0,
      'Bimbingan Pribadi-Sosial': 0,
    };
    konselingList.forEach(k => {
      if (counts[k.jenisKonseling] !== undefined) counts[k.jenisKonseling]++;
      else counts['Individu']++;
    });
    return counts;
  }, [konselingList]);

  // 5. Breakdown by Classification (Pelanggaran)
  const pelanggaranSeverity = useMemo(() => {
    return {
      ringan: pelanggaranList.filter(p => p.klasifikasi === 'Ringan').length,
      sedang: pelanggaranList.filter(p => p.klasifikasi === 'Sedang').length,
      berat: pelanggaranList.filter(p => p.klasifikasi === 'Berat' || p.klasifikasi === 'Sangat Berat').length,
    };
  }, [pelanggaranList]);

  // 6. Breakdown by Field (Prestasi)
  const prestasiFields = useMemo(() => {
    const counts: Record<string, number> = {
      'Akademik / Sains': 0,
      'Olahraga': 0,
      'Seni & Budaya': 0,
      'Keagamaan & Tahfidz': 0,
      'Riset & Teknologi': 0,
    };
    prestasiList.forEach(p => {
      if (counts[p.bidang] !== undefined) counts[p.bidang]++;
      else counts['Akademik / Sains']++;
    });
    return counts;
  }, [prestasiList]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Konseling Siswa */}
        <div 
          onClick={() => navigate('konseling')}
          className="p-5 rounded-3xl border border-rose-200/90 bg-rose-50/70 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-rose-600 flex items-center justify-center font-bold shadow-2xs border border-rose-100">
              <HeartHandshake size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full text-rose-700 border border-rose-200/60">
              Konseling Aktif
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              {totalKonseling} Sesi
            </div>
            <div className="text-xs font-bold text-rose-800/80 mt-1 flex items-center justify-between">
              <span>{konselingSelesai} Selesai • {konselingProses} Berjalan</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* 2. Catatan Pelanggaran & Poin */}
        <div 
          onClick={() => navigate('pelanggaran')}
          className="p-5 rounded-3xl border border-amber-200/90 bg-amber-50/70 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-amber-600 flex items-center justify-center font-bold shadow-2xs border border-amber-100">
              <AlertTriangle size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full text-amber-800 border border-amber-200/60">
              Kedisiplinan
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              {totalPelanggaran} Kasus
            </div>
            <div className="text-xs font-bold text-amber-800/80 mt-1 flex items-center justify-between">
              <span>-{totalPoinMinus} Poin • {kasusPerluAtensi} Atensi</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* 3. Prestasi Siswa */}
        <div 
          onClick={() => navigate('prestasi')}
          className="p-5 rounded-3xl border border-emerald-200/90 bg-emerald-50/70 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-emerald-600 flex items-center justify-center font-bold shadow-2xs border border-emerald-100">
              <Award size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full text-emerald-800 border border-emerald-200/60">
              Juara & Reward
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              {totalPrestasi} Prestasi
            </div>
            <div className="text-xs font-bold text-emerald-800/80 mt-1 flex items-center justify-between">
              <span>+{totalPoinReward} Reward • {prestasiNasionalProv} Prov/Nas</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* 4. Karir & Rekomendasi */}
        <div 
          onClick={() => navigate('karir')}
          className="p-5 rounded-3xl border border-blue-200/90 bg-blue-50/70 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-blue-600 flex items-center justify-center font-bold shadow-2xs border border-blue-100">
              <Compass size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full text-blue-800 border border-blue-200/60">
              Bimbingan Karir
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              {totalKarir} Asesmen
            </div>
            <div className="text-xs font-bold text-blue-800/80 mt-1 flex items-center justify-between">
              <span>{karirTerpetakan} Terpetakan Studi Lanjut</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Disciplinary Attention & Honor Roll Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atensi Kedisiplinan Khusus */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Flame size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Perhatian Kedisiplinan Siswa
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Siswa dengan akumulasi poin minus tertinggi memerlukan pembinaan
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('pelanggaran')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 transition flex items-center gap-1"
            >
              <span>Kelola</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            {highRiskDiscipline.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                <p className="font-bold text-slate-600 text-xs">Seluruh Siswa Tertib</p>
                <p className="text-[11px] text-slate-400">Tidak ada Siswa dengan akumulasi poin minus tinggi.</p>
              </div>
            ) : (
              highRiskDiscipline.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 hover:bg-amber-50/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-black text-slate-900 text-xs">{item.nama}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{item.kelas} • {item.count} Kasus</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-xs">
                      -{item.totalPoin} Poin
                    </span>
                    <div className="text-[10px] text-amber-700 font-bold mt-1 uppercase">{item.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Honor Roll: Prestasi & Bintang Prestasi */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Star size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Bintang Prestasi & Reward
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Siswa dengan perolehan medali dan poin reward kejuaraan tertinggi
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('prestasi')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1"
            >
              <span>Daftar</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            {topPrestasiStudents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                <Award size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="font-bold text-slate-600 text-xs">Belum Ada Data Prestasi</p>
                <p className="text-[11px] text-slate-400">Input data kejuaraan siswa di sub-menu Prestasi.</p>
              </div>
            ) : (
              topPrestasiStudents.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 hover:bg-emerald-50/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </span>
                    <div>
                      <div className="font-black text-slate-900 text-xs">{item.nama}</div>
                      <div className="text-[11px] text-slate-500 font-medium truncate max-w-xs">{item.kelas} • {item.awards[0]}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs">
                      +{item.totalReward} Poin
                    </span>
                    <div className="text-[10px] text-emerald-700 font-bold mt-1">{item.awards.length} Kejuaraan</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Analytics & Categorization Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Analitik Layanan Konseling */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <HeartHandshake size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Distribusi Layanan Konseling
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Fokus pendampingan psikologis dan bimbingan siswa
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('konseling')}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 transition flex items-center gap-1"
            >
              <span>Detail</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {(Object.entries(konselingCategories) as [string, number][]).map(([cat, count]) => {
              const countNum = Number(count) || 0;
              const pct = totalKonseling > 0 ? Math.round((countNum / totalKonseling) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{cat}</span>
                    <span className="font-mono font-bold text-slate-900">{countNum} Sesi ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${Math.max(pct, countNum > 0 ? 8 : 0)}%` }} 
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Tuntas & Selesai</div>
                <div className="font-black font-mono text-emerald-900 text-sm mt-0.5">{konselingSelesai} Sesi</div>
              </div>
            </div>
            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 flex items-center gap-2.5">
              <Clock size={18} className="text-amber-600 shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Dalam Proses</div>
                <div className="font-black font-mono text-amber-900 text-sm mt-0.5">{konselingProses} Sesi</div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Analitik Bidang Prestasi & Kejuaraan */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Award size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Distribusi Bidang Prestasi
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Capaian medali, kejuaraan, dan piagam siswa
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('prestasi')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1"
            >
              <span>Detail</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {(Object.entries(prestasiFields) as [string, number][]).map(([bidang, count]) => {
              const countNum = Number(count) || 0;
              const pct = totalPrestasi > 0 ? Math.round((countNum / totalPrestasi) * 100) : 0;
              return (
                <div key={bidang} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{bidang}</span>
                    <span className="font-mono font-bold text-slate-900">{countNum} Juara ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${Math.max(pct, countNum > 0 ? 8 : 0)}%` }} 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center gap-2.5">
              <Sparkles size={18} className="text-indigo-600 shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">Tingkat Prov/Nasional</div>
                <div className="font-black font-mono text-indigo-900 text-sm mt-0.5">{prestasiNasionalProv} Kejuaraan</div>
              </div>
            </div>
            <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 flex items-center gap-2.5">
              <Star size={18} className="text-amber-600 shrink-0" />
              <div>
                <div className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Total Poin Karakter</div>
                <div className="font-black font-mono text-amber-900 text-sm mt-0.5">+{totalPoinReward} Poin</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel 3: Severity Pelanggaran & Jalur Karir Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Tingkat Pelanggaran Tata Tertib
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Proporsi pelanggaran ringan, sedang, dan berat
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('pelanggaran')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 transition flex items-center gap-1"
            >
              <span>Detail</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-600">Ringan (5-15 Poin)</span>
              <div className="text-2xl font-black font-mono text-slate-900">{pelanggaranSeverity.ringan}</div>
              <div className="text-[10px] text-slate-500">Teguran & Edukatif</div>
            </div>
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800">Sedang (16-30 Poin)</span>
              <div className="text-2xl font-black font-mono text-amber-900">{pelanggaranSeverity.sedang}</div>
              <div className="text-[10px] text-amber-700">Wali Kelas / BK</div>
            </div>
            <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200 text-center space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-800">Berat (30+ Poin)</span>
              <div className="text-2xl font-black font-mono text-rose-900">{pelanggaranSeverity.berat}</div>
              <div className="text-[10px] text-rose-700">Panggilan Ortu / SP</div>
            </div>
          </div>
        </div>

        {/* Panel 4: Quick Action & Guidance Services */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-rose-400 flex items-center justify-center font-bold backdrop-blur-xs">
                <Compass size={18} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Akses Layanan BK Cepat
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Bimbingan konseling berorientasi pada pengembangan potensi karakter, pemulihan emosional, dan persiapan masa depan siswa.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={() => navigate('konseling')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition border border-white/10 group"
            >
              <div className="text-xs font-black text-rose-300 group-hover:text-rose-200">Sesi Konseling &rarr;</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Catat sesi & solusi</div>
            </button>

            <button
              onClick={() => navigate('karir')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition border border-white/10 group"
            >
              <div className="text-xs font-black text-blue-300 group-hover:text-blue-200">Minat & Karir &rarr;</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Pemetaan & studi lanjut</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
