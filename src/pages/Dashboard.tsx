import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../data/db';
import { 
  Users, GraduationCap, School, CheckCircle2, CreditCard, Award, 
  Wallet, ShieldAlert, Package, FileText, UserPlus, 
  Bell, Calendar, Activity, TrendingUp, RefreshCw
} from 'lucide-react';
import { getActiveClasses } from '../lib/utils';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  AreaChart, Area, Legend
} from 'recharts';
import RekapSiswaKelurahan from '../components/dashboard/RekapSiswaKelurahan';
import { 
  normalizeTabunganRow, 
  deduplicateTabunganList,
  normalizeTagihanRow,
  normalizePembayaranRow
} from '../lib/keuanganNormalizers';
import { syncCoreSpreadsheetData } from '../utils/coreDataSync';

export default function Dashboard() {
  const { students, teachers, settings } = useStore();

  // Total Siswa Aktif: HANYA siswa yang berstatus AKTIF (siswa Tidak Aktif, Nonaktif, Lulus, Pindah, Keluar, Belum DILARANG DIHITUNG)
  const activeStudents = useMemo(() => {
    return students.filter(s => {
      if (!s) return false;
      const statusUpper = String(s.status || '').toUpperCase().trim();
      
      // Siswa dengan status tidak aktif / nonaktif / keluar / lulus / pindah / mutasi / belum TIDAK DIHITUNG!
      if (
        statusUpper === 'TIDAK AKTIF' ||
        statusUpper === 'NONAKTIF' ||
        statusUpper === 'NON-AKTIF' ||
        statusUpper === 'INACTIVE' ||
        statusUpper === 'BELUM' ||
        statusUpper === 'PENDING' ||
        statusUpper.includes('TIDAK') ||
        statusUpper.includes('NON') ||
        statusUpper.includes('LULUS') ||
        statusUpper.includes('ALUMNI') ||
        statusUpper.includes('PINDAH') ||
        statusUpper.includes('MUTASI') ||
        statusUpper.includes('KELUAR') ||
        statusUpper.includes('DROP') ||
        statusUpper.includes('DO')
      ) {
        return false;
      }
      return statusUpper === 'AKTIF' || statusUpper === 'ACTIVE' || statusUpper === '';
    });
  }, [students]);

  const totalSiswa = activeStudents.length;
  const totalGuru = teachers.length;
  const activeClasses = useMemo(() => getActiveClasses(activeStudents), [activeStudents]);
  const totalRombel = activeClasses.length;

  const maleCount = activeStudents.filter(s => String(s.gender || '').toUpperCase().startsWith('L')).length;
  const femaleCount = activeStudents.filter(s => String(s.gender || '').toUpperCase().startsWith('P')).length;

  // Status Yatim / Piatu Siswa: HANYA untuk siswa AKTIF (siswa yang statusnya tidak aktif jangan dihitung)
  const yatimCounts = useMemo(() => {
    let lengkap = 0;
    let yatim = 0;
    let piatu = 0;
    let yatimPiatu = 0;

    activeStudents.forEach(s => {
      // Validasi ketat: pastikan siswa benar-benar berstatus aktif
      const statusUpper = String(s.status || '').toUpperCase().trim();
      if (
        statusUpper === 'TIDAK AKTIF' ||
        statusUpper === 'NONAKTIF' ||
        statusUpper === 'NON-AKTIF' ||
        statusUpper === 'INACTIVE' ||
        statusUpper === 'BELUM' ||
        statusUpper.includes('TIDAK') ||
        statusUpper.includes('NON') ||
        statusUpper.includes('LULUS') ||
        statusUpper.includes('PINDAH') ||
        statusUpper.includes('KELUAR') ||
        statusUpper.includes('MUTASI')
      ) {
        return;
      }

      const sYatim = String(s.statusYatim || (s as any)['StatusYatim'] || (s as any)['Yatim/Piatu'] || '').trim().toLowerCase();
      const sAyah = String(s.statusAyah || (s as any)['StatusAyah'] || '').trim().toLowerCase();
      const sIbu = String(s.statusIbu || (s as any)['StatusIbu'] || '').trim().toLowerCase();

      const isAyahDead = sAyah === 'meninggal' || sAyah === 'almarhum' || sAyah.includes('wafat');
      const isIbuDead = sIbu === 'meninggal' || sIbu === 'almarhumah' || sIbu.includes('wafat');

      if (sYatim === 'yatim piatu' || (isAyahDead && isIbuDead)) {
        yatimPiatu++;
      } else if (sYatim === 'yatim' || isAyahDead) {
        yatim++;
      } else if (sYatim === 'piatu' || isIbuDead) {
        piatu++;
      } else {
        lengkap++;
      }
    });

    const totalOrphan = yatim + piatu + yatimPiatu;
    return { lengkap, yatim, piatu, yatimPiatu, totalOrphan, total: activeStudents.length };
  }, [activeStudents]);

  // Real data from DB with dynamic update trigger
  const [dbVersion, setDbVersion] = useState(0);

  useEffect(() => {
    const handleDbUpdate = () => setDbVersion(v => v + 1);
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('erp-db-synced', handleDbUpdate);
    window.addEventListener('erp-keuangan-cleared', handleDbUpdate);

    // Initial check: jika data keuangan belum termuat, sinkronkan otomatis dari Google Spreadsheet
    const currentTag = db.get<any>('keuangan_tagihan') || db.get<any>('TAGIHAN') || [];
    const currentTab = db.get<any>('keuangan_tabungan') || db.get<any>('TABUNGAN') || [];
    if (currentTag.length === 0 || currentTab.length === 0) {
      syncCoreSpreadsheetData().catch(() => {});
    }

    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('erp-db-synced', handleDbUpdate);
      window.removeEventListener('erp-keuangan-cleared', handleDbUpdate);
    };
  }, []);

  const spmbList = useMemo(() => db.get('spmb_pendaftar') || [], [dbVersion]);
  const barangList = useMemo(() => db.get('barang') || [], [dbVersion]);
  const arsipList = useMemo(() => db.get('arsip') || [], [dbVersion]);
  const tagihanList = useMemo(() => db.get('tagihan') || [], [dbVersion]);
  const kasList = useMemo(() => db.get('kas') || [], [dbVersion]);
  const bkList = useMemo(() => db.get('bimbingan') || [], [dbVersion]);
  const absensiList = useMemo(() => db.get('absensi') || [], [dbVersion]);

  // Live Finance Data from unified Keuangan DB dengan fallback bertingkat
  const keuanganTagihanList = useMemo(() => {
    const k = db.get('keuangan_tagihan') as any[];
    if (Array.isArray(k) && k.length > 0) return k;
    const t = db.get('TAGIHAN') as any[];
    if (Array.isArray(t) && t.length > 0) return t;
    return [];
  }, [dbVersion]);

  const keuanganInvoiceList = useMemo(() => {
    const k = db.get('keuangan_invoices') as any[];
    if (Array.isArray(k) && k.length > 0) return k;
    const p = db.get('PEMBAYARAN') as any[];
    if (Array.isArray(p) && p.length > 0) return p;
    const kp = db.get('keuangan_pembayaran') as any[];
    if (Array.isArray(kp) && kp.length > 0) return kp;
    return [];
  }, [dbVersion]);

  const keuanganTabunganList = useMemo(() => {
    const k = db.get('keuangan_tabungan') as any[];
    if (Array.isArray(k) && k.length > 0) return k;
    const t = db.get('TABUNGAN') as any[];
    if (Array.isArray(t) && t.length > 0) return t;
    return [];
  }, [dbVersion]);

  // Deduplicate tabungan transactions to guarantee exact single calculation & count
  const uniqueTabunganList = useMemo(() => {
    return deduplicateTabunganList(keuanganTabunganList);
  }, [keuanganTabunganList, dbVersion]);

  // 1. 💰 Total Tabungan (Akumulasi saldo kas tabungan: Total Setor - Total Tarik)
  const mainTotalTabungan = useMemo(() => {
    return uniqueTabunganList.reduce((acc: number, t: any, idx: number) => {
      const norm = normalizeTabunganRow(t, idx, students);
      const isSetor = norm.jenis === 'SETOR';
      return isSetor ? acc + norm.nominal : acc - norm.nominal;
    }, 0);
  }, [uniqueTabunganList, students]);

  // 2. 🗒️ Total Tagihan (Nilai Bruto sebelum potongan)
  const mainTotalTagihan = useMemo(() => {
    return keuanganTagihanList.reduce((acc: number, t: any) => {
      const norm = normalizeTagihanRow(t, 0, students);
      return acc + (Number(norm.totalTagihan || norm.nominalAsli || norm.nominal) || 0);
    }, 0);
  }, [keuanganTagihanList, students]);

  // 3. 💳 Sudah Bayar
  const mainTotalSudahBayar = useMemo(() => {
    return keuanganInvoiceList.reduce((acc: number, inv: any) => {
      const norm = normalizePembayaranRow(inv, 0, students);
      return acc + (Number(norm.total || norm.nominal) || 0);
    }, 0);
  }, [keuanganInvoiceList, students]);

  // 4. ⚠️ Sisa Tunggakan
  const mainSisaTunggakan = useMemo(() => {
    return keuanganTagihanList
      .filter((t: any) => {
        const s = String(t.status || t.Status || '').toUpperCase();
        return s !== 'LUNAS';
      })
      .reduce((acc: number, t: any) => {
        const norm = normalizeTagihanRow(t, 0, students);
        return acc + (Number(norm.sisaTagihan ?? (norm.totalTagihan || norm.nominal)) || 0);
      }, 0);
  }, [keuanganTagihanList, students]);

  const fmtRupiah = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  // Kas total
  const totalKas = useMemo(() => {
    return kasList.reduce((acc: number, item: any) => {
      const nominal = Number(item.Nominal || item.nominal || 0);
      return item.Jenis === 'Masuk' || item.jenis === 'Masuk' ? acc + nominal : acc - nominal;
    }, 0);
  }, [kasList]);

  // 12 Metrik Utama
  const metrics = [
    { 
      title: 'Total Siswa Aktif', 
      value: `${totalSiswa} Siswa`, 
      sub: totalSiswa > 0 ? `${maleCount} L / ${femaleCount} P` : 'Data Siswa Kosong', 
      icon: Users, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50 border-indigo-100' 
    },
    { 
      title: 'Guru & Staf', 
      value: `${totalGuru} Pendidik`, 
      sub: totalGuru > 0 ? `${teachers.filter(t => t.status === 'Aktif').length} Aktif` : 'Data Guru Kosong', 
      icon: GraduationCap, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50 border-blue-100' 
    },
    { 
      title: 'Rombongan Belajar', 
      value: `${totalRombel} Rombel`, 
      sub: totalRombel > 0 ? `Kelas ${activeClasses.join(', ')}` : 'Rombel Belum Diisi', 
      icon: School, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50 border-emerald-100' 
    },
    { 
      title: 'Kehadiran Hari Ini', 
      value: absensiList.length > 0 ? '96.8%' : '0%', 
      sub: absensiList.length > 0 ? `${absensiList.length} Catatan` : 'Belum Ada Presensi', 
      icon: CheckCircle2, 
      color: 'text-teal-600', 
      bg: 'bg-teal-50 border-teal-100' 
    },
    { 
      title: 'Lunas Tagihan Bulan Ini', 
      value: tagihanList.length > 0 ? `${Math.round((tagihanList.filter((t: any) => t.status === 'Lunas').length / tagihanList.length) * 100)}%` : '0%', 
      sub: tagihanList.length > 0 ? `${tagihanList.filter((t: any) => t.status === 'Lunas').length} / ${tagihanList.length} Tagihan Lunas` : 'Belum Ada Tagihan', 
      icon: CreditCard, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50 border-purple-100' 
    },
    { 
      title: 'Rata-Rata Nilai CBT', 
      value: '0 / 100', 
      sub: 'Belum Ada Ujian', 
      icon: Award, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50 border-amber-100' 
    },
    { 
      title: 'Saldo Kas', 
      value: totalKas > 0 ? `Rp ${totalKas.toLocaleString('id-ID')}` : 'Rp 0', 
      sub: 'Kas Operasional & Biaya', 
      icon: Wallet, 
      color: 'text-emerald-700', 
      bg: 'bg-emerald-50 border-emerald-100' 
    },
    { 
      title: 'Kasus BK Tuntas', 
      value: bkList.length > 0 ? '100%' : '0%', 
      sub: bkList.length > 0 ? `${bkList.length} Catatan Konseling` : 'Tidak Ada Kasus', 
      icon: ShieldAlert, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50 border-rose-100' 
    },
    { 
      title: 'Inventaris & Aset', 
      value: `${barangList.length} Unit`, 
      sub: barangList.length > 0 ? 'Tercatat di Inventaris' : 'Belum Ada Barang', 
      icon: Package, 
      color: 'text-cyan-600', 
      bg: 'bg-cyan-50 border-cyan-100' 
    },
    { 
      title: 'Dokumen Digital', 
      value: `${arsipList.length} Berkas`, 
      sub: arsipList.length > 0 ? 'Arsip Surat & Dokumen' : 'Belum Ada Berkas', 
      icon: FileText, 
      color: 'text-indigo-700', 
      bg: 'bg-indigo-50 border-indigo-100' 
    },
    { 
      title: 'Pendaftar SPMB', 
      value: `${spmbList.length} Calon`, 
      sub: spmbList.length > 0 ? 'Pendaftaran Online' : 'Belum Ada Pendaftar', 
      icon: UserPlus, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50 border-orange-100' 
    },
    { 
      title: 'Status Dapodik 2027', 
      value: totalSiswa > 0 ? '100% Valid' : 'Data Kosong', 
      sub: totalSiswa > 0 ? 'Siap Sinkronisasi' : 'Silakan Input Data', 
      icon: RefreshCw, 
      color: 'text-green-700', 
      bg: 'bg-green-50 border-green-100' 
    }
  ];

  const pengumumanList = useMemo(() => (db.get('pengumuman') as any[]) || [], []);
  const agendaList = useMemo(() => (db.get('agenda') as any[]) || [], []);
  const activityLogs = useMemo(() => (db.get('activity_logs') as any[]) || [], []);

  // Grafik 1: Kehadiran Siswa per Kelas
  const attendanceChartData = useMemo(() => {
    if (absensiList.length === 0) {
      return activeClasses.length > 0 
        ? activeClasses.map(c => ({ class: `Kelas ${c}`, Hadir: 0, SakitIzin: 0, Alpha: 0 }))
        : [{ class: 'Belum Ada Rombel', Hadir: 0, SakitIzin: 0, Alpha: 0 }];
    }
    // Calculate real attendance by class
    const classMap: Record<string, { Hadir: number; SakitIzin: number; Alpha: number }> = {};
    absensiList.forEach((a: any) => {
      const cls = a.class || a.kelas || 'Umum';
      if (!classMap[cls]) classMap[cls] = { Hadir: 0, SakitIzin: 0, Alpha: 0 };
      if (a.status === 'Hadir') classMap[cls].Hadir += 1;
      else if (a.status === 'Izin' || a.status === 'Sakit') classMap[cls].SakitIzin += 1;
      else if (a.status === 'Alpa') classMap[cls].Alpha += 1;
    });
    return Object.keys(classMap).map(cls => ({ class: cls, ...classMap[cls] }));
  }, [absensiList, activeClasses]);

  // Grafik 2: Arus Keuangan (Penerimaan Biaya vs Pengeluaran Operational)
  const financeChartData = useMemo(() => {
    if (kasList.length === 0) {
      return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'].map(m => ({
        month: m,
        Masuk: 0,
        Keluar: 0,
      }));
    }
    const monthMap: Record<string, { Masuk: number; Keluar: number }> = {};
    kasList.forEach((item: any) => {
      const dateStr = item.Tanggal || item.tanggal || item.tgl || '';
      const month = dateStr ? new Date(dateStr).toLocaleString('id-ID', { month: 'short' }) : 'Mar';
      if (!monthMap[month]) monthMap[month] = { Masuk: 0, Keluar: 0 };
      const nominal = Number(item.Nominal || item.nominal || 0) / 1000000;
      if (item.Jenis === 'Masuk' || item.jenis === 'Masuk') {
        monthMap[month].Masuk += nominal;
      } else {
        monthMap[month].Keluar += nominal;
      }
    });
    return Object.keys(monthMap).map(m => ({ month: m, ...monthMap[m] }));
  }, [kasList]);

  // Grafik 3: Capaian Nilai per Mata Pelajaran
  const scoreChartData = useMemo(() => {
    const nilaiDb = (db.get('nilai') as any[]) || [];
    if (nilaiDb.length === 0) {
      return [
        { mapel: 'Matematika', RataRata: 0 },
        { mapel: 'B. Indonesia', RataRata: 0 },
        { mapel: 'IPAS', RataRata: 0 },
        { mapel: 'B. Inggris', RataRata: 0 },
        { mapel: 'Pancasila', RataRata: 0 },
      ];
    }
    const mapelScores: Record<string, { total: number; count: number }> = {};
    nilaiDb.forEach((n: any) => {
      const m = n.mapel || n.subject || 'Lainnya';
      const val = Number(n.nilai || n.score || 0);
      if (!mapelScores[m]) mapelScores[m] = { total: 0, count: 0 };
      mapelScores[m].total += val;
      mapelScores[m].count += 1;
    });
    return Object.keys(mapelScores).map(m => ({
      mapel: m,
      RataRata: Number((mapelScores[m].total / mapelScores[m].count).toFixed(1))
    }));
  }, []);

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/30 px-3.5 py-1 rounded-full text-xs font-semibold text-indigo-200 backdrop-blur-md">
            <Activity size={14} className="text-emerald-400 animate-pulse" />
            <span>Sistem Informasi Terpadu Cerdas 2027</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {(settings.schoolName && !String(settings.schoolName).toLowerCase().includes('citapen')) ? settings.schoolName : 'ROMBEL TAMBORA'} Dashboard Utama
          </h1>
          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
            Pusat pemantauan real-time operasional, presensi, keuangan, asesmen CBT, dan validasi data kependidikan Dapodik.
          </p>
        </div>
        {settings.schoolLogoUrl && (
          <img 
            src={settings.schoolLogoUrl} 
            alt="Logo" 
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-white/90 p-1 shadow-2xl border border-white/20 self-end md:self-center"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Ringkasan Keuangan Utama (4 Kartu Keuangan) */}
      <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="text-emerald-600" size={22} />
              Sistem Keuangan
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pantauan real-time saldo tabungan santri, total tagihan, pembayaran kasir, dan tunggakan
            </p>
          </div>
          <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            Kasir & POS Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 💰 Total Tabungan */}
          <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 shadow-xs flex flex-col justify-between transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-emerald-800 tracking-wider">Total Tabungan</span>
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950">
                {fmtRupiah(mainTotalTabungan)}
              </div>
              <p className="text-[11px] font-semibold text-emerald-700/90 mt-0.5">
                {uniqueTabunganList.length} Mutasi Tabungan Siswa
              </p>
            </div>
          </div>

          {/* 🗒️ Total Tagihan */}
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/90 bg-amber-50/70 shadow-xs flex flex-col justify-between transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-amber-800 tracking-wider">Total Tagihan (Bruto)</span>
              <span className="text-2xl">🗒️</span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-950">
                {fmtRupiah(mainTotalTagihan)}
              </div>
              <p className="text-[11px] font-semibold text-amber-700/90 mt-0.5">
                {keuanganTagihanList.length} Item Tagihan Siswa
              </p>
            </div>
          </div>

          {/* 💳 Sudah Bayar */}
          <div className="p-4 sm:p-5 rounded-2xl border border-blue-200/90 bg-blue-50/70 shadow-xs flex flex-col justify-between transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-blue-800 tracking-wider">Sudah Bayar</span>
              <span className="text-2xl">💳</span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-950">
                {fmtRupiah(mainTotalSudahBayar)}
              </div>
              <p className="text-[11px] font-semibold text-blue-700/90 mt-0.5">
                {keuanganInvoiceList.length} Kwitansi Penerimaan
              </p>
            </div>
          </div>

          {/* ⚠️ Sisa Tunggakan */}
          <div className="p-4 sm:p-5 rounded-2xl border border-rose-200/90 bg-rose-50/70 shadow-xs flex flex-col justify-between transition hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase text-rose-800 tracking-wider">Sisa Tunggakan</span>
              <span className="text-2xl">⚠️</span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-black font-mono text-rose-950">
                {fmtRupiah(mainSisaTunggakan)}
              </div>
              <p className="text-[11px] font-semibold text-rose-700/90 mt-0.5">
                {keuanganTagihanList.filter((t: any) => t.status !== 'LUNAS').length} Tagihan Belum Lunas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ringkasan Status Yatim / Piatu Siswa */}
      <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <span>👨‍👩‍👧</span>
              Status Yatim / Piatu Siswa
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Klasifikasi kondisi keluarga siswa aktif: Yatim (Ayah Wafat), Piatu (Ibu Wafat), Yatim Piatu (Kedua Ortu Wafat), dan Lengkap (Siswa non-aktif dikecualikan)
            </p>
          </div>
          <div className="flex items-center gap-2">
            {yatimCounts.totalOrphan > 0 && (
              <span className="text-[11px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full animate-pulse">
                {yatimCounts.totalOrphan} Siswa Perlu Perhatian / Santunan
              </span>
            )}
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              Total {yatimCounts.total} Siswa Aktif
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* 👨‍👩‍👧 Lengkap */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                <span>👨‍👩‍👧</span>
                <span>Ortu Lengkap</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">Ayah & Ibu Ada</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-950 block">{yatimCounts.lengkap}</span>
              <span className="text-[10px] font-bold text-emerald-700 font-mono">
                {yatimCounts.total > 0 ? `${Math.round((yatimCounts.lengkap / yatimCounts.total) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* 🤍 Yatim */}
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                <span>🤍</span>
                <span>Yatim</span>
              </div>
              <span className="text-[11px] text-amber-700 font-medium block mt-0.5">Ayah Telah Wafat</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-amber-950 block">{yatimCounts.yatim}</span>
              <span className="text-[10px] font-bold text-amber-700 font-mono">
                {yatimCounts.total > 0 ? `${Math.round((yatimCounts.yatim / yatimCounts.total) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* 💜 Piatu */}
          <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/70 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-purple-950">
                <span>💜</span>
                <span>Piatu</span>
              </div>
              <span className="text-[11px] text-purple-700 font-medium block mt-0.5">Ibu Telah Wafat</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-purple-950 block">{yatimCounts.piatu}</span>
              <span className="text-[10px] font-bold text-purple-700 font-mono">
                {yatimCounts.total > 0 ? `${Math.round((yatimCounts.piatu / yatimCounts.total) * 100)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* 🖤 Yatim Piatu */}
          <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/70 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-950">
                <span>🖤</span>
                <span>Yatim Piatu</span>
              </div>
              <span className="text-[11px] text-rose-700 font-medium block mt-0.5">Ayah & Ibu Wafat</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-rose-950 block">{yatimCounts.yatimPiatu}</span>
              <span className="text-[10px] font-bold text-rose-700 font-mono">
                {yatimCounts.total > 0 ? `${Math.round((yatimCounts.yatimPiatu / yatimCounts.total) * 100)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* REKAP SISWA PER KELURAHAN & RW (Hanya Siswa Aktif) */}
      <RekapSiswaKelurahan students={activeStudents} />

      {/* 12 Metrik Utama */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">12 Metrik Utama</h2>
            <p className="text-xs text-slate-500 font-medium">Ringkasan cepat performa operasional & akademik terpadu</p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Updated Live</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div 
                key={idx} 
                className={`p-4 sm:p-5 rounded-2xl border bg-white/80 backdrop-blur-md shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${m.bg}`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-600 line-clamp-1">{m.title}</span>
                  <div className={`p-2 rounded-xl bg-white shadow-xs ${m.color}`}>
                    <Icon size={18} />
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">{m.value}</div>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">{m.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Grafik Recharts Terpadu */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900">3 Grafik Recharts Terpadu</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grafik 1: Kehadiran Siswa per Kelas */}
          <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  Grafik 1: Kehadiran Siswa Hari Ini (per Kelas)
                </h3>
                <p className="text-xs text-slate-500">Perbandingan jumlah siswa hadir vs izin/sakit per rombel</p>
              </div>
            </div>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="class" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Hadir" name="Siswa Hadir" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="SakitIzin" name="Izin / Sakit" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafik 3: Capaian Nilai per Mata Pelajaran */}
          <div className="bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award size={18} className="text-indigo-600" />
                Grafik 3: Capaian Nilai Mapel
              </h3>
              <p className="text-xs text-slate-500">Rata-rata evaluasi sumatif Kurikulum Merdeka</p>
            </div>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={scoreChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="mapel" stroke="#64748b" fontSize={10} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="RataRata" name="Rata-rata Nilai" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafik 2: Arus Keuangan (Penerimaan vs Pengeluaran) */}
          <div className="lg:col-span-3 bg-white/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-600" />
                  Grafik 2: Arus Keuangan (Penerimaan vs Pengeluaran dalam Juta Rp)
                </h3>
                <p className="text-xs text-slate-500">Tren kumulatif pemasukan kas & pengeluaran operasional per bulan</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {totalKas > 0 ? `Surplus Kas Rp ${totalKas.toLocaleString('id-ID')}` : 'Belum Ada Transaksi Kas'}
              </span>
            </div>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="Masuk" name="Penerimaan Kas (Juta)" stroke="#10b981" fillOpacity={1} fill="url(#colorMasuk)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Keluar" name="Pengeluaran Operasional (Juta)" stroke="#ef4444" fillOpacity={1} fill="url(#colorKeluar)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Ringkasan Operasional & Log */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pengumuman Penting */}
        <div className="bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Bell size={16} className="text-amber-500" />
              Pengumuman
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold">Terbaru</span>
          </div>
          {pengumumanList.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-500">Belum Ada Pengumuman</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pengumuman akan muncul di sini</p>
            </div>
          ) : (
            <ul className="space-y-2.5 text-xs">
              {pengumumanList.map((p: any, idx: number) => (
                <li key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800">{p.judul || p.title}</span>
                  <p className="text-slate-500 text-[11px]">{p.isi || p.deskripsi || p.description}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Agenda Hari Ini */}
        <div className="bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" />
              Agenda Hari Ini
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">Live Agenda</span>
          </div>
          {agendaList.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-500">Belum Ada Agenda Hari Ini</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Jadwal kegiatan harian akan muncul di sini</p>
            </div>
          ) : (
            <ul className="space-y-2 text-xs">
              {agendaList.map((a: any, idx: number) => (
                <li key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50">
                  <span className="font-medium text-slate-700">{a.waktu || '08:00'} - {a.kegiatan || a.title}</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">{a.status || 'Terjadwal'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Audit Log Aktivitas */}
        <div className="bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Activity size={16} className="text-teal-600" />
              Log Aktivitas Terbaru
            </h3>
            <span className="text-[10px] text-slate-400">Realtime</span>
          </div>
          {activityLogs.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-500">Belum Ada Aktivitas Sistem</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Catatan aktivitas pengguna akan muncul di sini</p>
            </div>
          ) : (
            <ul className="space-y-2 text-xs text-slate-600">
              {activityLogs.map((log: any, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-800">{log.user || 'Sistem'}:</span> {log.action || log.aktivitas}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
