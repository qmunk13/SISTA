import React, { useState, useEffect } from 'react';
import { 
  History, 
  Users, 
  TrendingUp, 
  UserCheck, 
  CreditCard, 
  Calendar, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Briefcase, 
  ShieldAlert, 
  CheckCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
declare const Swal: any;
import { MockDb } from '../utils/mockDb';
import { getAuditLogs, AuditLog } from '../utils/auditLogger';

// Define years
const TAHUN_AJARAN_LIST = ['2023/2024', '2024/2025', '2025/2026', '2026/2027'];

export default function Riwayat() {
  const [selectedYear, setSelectedYear] = useState<string>('2026/2027');
  const [activeTab, setActiveTab] = useState<'siswa' | 'keuangan' | 'guru' | 'pengurus' | 'audit'>('siswa');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  useEffect(() => {
    setAuditLogs(getAuditLogs());
  }, []);

  // Format Helper for Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  // Generate Year-Specific mock/real data
  // This simulates historical databases perfectly without writing/destroying any existing Sheets
  const getSiswaDataForYear = (year: string) => {
    switch (year) {
      case '2023/2024':
        return [];
      case '2024/2025':
        return [];
      case '2025/2026':
        return [];
      case '2026/2027':
      default:
        // Merge MockDb active siswa
        const dbSiswa = MockDb.siswa || [];
        const dbKelas = MockDb.kelas || [];
        return dbSiswa.map(s => {
          const matched = dbKelas.find(k => k.id === s.kelasId);
          return {
            id: s.id,
            nama: s.nama,
            nisn: s.nisn,
            jk: s.jk,
            kelas: matched ? `${matched.jenjang}` : `Kelas ${s.kelasId}`,
            status: s.status || 'AKTIF',
            tglMasuk: '2026-07-01',
            wali: s.namaAyah || 'Bapak ' + s.nama.split(' ')[0]
          };
        });
    }
  };

  const getKeuanganDataForYear = (year: string) => {
    switch (year) {
      case '2023/2024':
        return {
          pemasukan: 320000000,
          pengeluaran: 280000000,
          surplus: 40000000,
          sppPersen: 94,
          transaksi: [
            { tgl: '2024-06-15', nama: 'Dana BOS Tahap I', jenis: 'MASUK', nominal: 120000000, kategori: 'Subsidi' },
            { tgl: '2024-05-10', nama: 'Belanja Meja Kursi Baru', jenis: 'KELUAR', nominal: 45000000, kategori: 'Inventaris' },
            { tgl: '2024-03-20', nama: 'Insentif Ramadhan Guru', jenis: 'KELUAR', nominal: 32000000, kategori: 'Guru' },
            { tgl: '2024-02-14', nama: 'Pemasukan SPP Kumulatif', jenis: 'MASUK', nominal: 185000000, kategori: 'SPP' },
            { tgl: '2023-11-05', nama: 'Renovasi Genteng Bocor', jenis: 'KELUAR', nominal: 18000000, kategori: 'Sarpras' },
          ]
        };
      case '2024/2025':
        return {
          pemasukan: 385000000,
          pengeluaran: 330000000,
          surplus: 55000000,
          sppPersen: 96,
          transaksi: [
            { tgl: '2025-06-12', nama: 'Dana BOS Tahap II', jenis: 'MASUK', nominal: 145000000, kategori: 'Subsidi' },
            { tgl: '2025-04-18', nama: 'Pengadaan Komputer Lab', jenis: 'KELUAR', nominal: 75000000, kategori: 'Elektronik' },
            { tgl: '2025-03-05', nama: 'Pemasukan SPP Kumulatif', jenis: 'MASUK', nominal: 210000000, kategori: 'SPP' },
            { tgl: '2025-01-20', nama: 'Maintenance AC Ruang Belajar', jenis: 'KELUAR', nominal: 12000000, kategori: 'Sarpras' },
            { tgl: '2024-09-10', nama: 'Kegiatan LDKS Siswa', jenis: 'KELUAR', nominal: 25000000, kategori: 'Siswa' },
          ]
        };
      case '2025/2026':
        return {
          pemasukan: 430000000,
          pengeluaran: 390000000,
          surplus: 40000000,
          sppPersen: 97,
          transaksi: [
            { tgl: '2026-06-10', nama: 'Dana BOS Tahap I & II', jenis: 'MASUK', nominal: 160000000, kategori: 'Subsidi' },
            { tgl: '2026-05-15', nama: 'Pembayaran Rekening & Listrik', jenis: 'KELUAR', nominal: 14000000, kategori: 'Sarpras' },
            { tgl: '2026-03-22', nama: 'Pemasukan SPP Kumulatif', jenis: 'MASUK', nominal: 245000000, kategori: 'SPP' },
            { tgl: '2026-01-14', nama: 'Pengecatan Gedung Utama', jenis: 'KELUAR', nominal: 35000000, kategori: 'Sarpras' },
            { tgl: '2025-10-05', nama: 'Pembelian Buku Paket Kurmer', jenis: 'KELUAR', nominal: 42000000, kategori: 'Pustaka' },
          ]
        };
      case '2026/2027':
      default:
        // Derived from MockDb live payments & savings
        const livePayments = MockDb.tagihan || [];
        const liveTotalCollected = livePayments.filter(t => t.status === 'LUNAS').reduce((sum, t) => sum + t.nominal, 0);
        return {
          pemasukan: 150000000 + liveTotalCollected,
          pengeluaran: 85000000,
          surplus: (150000000 + liveTotalCollected) - 85000000,
          sppPersen: 98,
          transaksi: [
            { tgl: '2026-07-14', nama: 'Penerimaan Sumbangan Pendidikan Baru', jenis: 'MASUK', nominal: 75000000, kategori: 'Pendaftaran' },
            { tgl: '2026-07-10', nama: 'Pemasukan SPP Bulan Juli', jenis: 'MASUK', nominal: 45000000, kategori: 'SPP' },
            { tgl: '2026-07-08', nama: 'Belanja Operasional ATK Rombel', jenis: 'KELUAR', nominal: 450000, kategori: 'Operasional' },
            { tgl: '2026-07-05', nama: 'Pembayaran Listrik & Internet', jenis: 'KELUAR', nominal: 1200000, kategori: 'Sarpras' },
            { tgl: '2026-07-01', nama: 'Dana Hibah Internal Yayasan', jenis: 'MASUK', nominal: 30000000, kategori: 'Yayasan' },
          ]
        };
    }
  };

  const getGuruDataForYear = (year: string) => {
    switch (year) {
      case '2023/2024':
        return [
          { id: 'G1', nama: 'Drs. H. Ahmad Fauzi', nip: '197402122003121002', mapel: 'Bahasa Indonesia', status: 'PNS', jamMengajar: 24, presensi: '98%' },
          { id: 'G2', nama: 'Supriyadi, S.Pd', nip: '198205102009041001', mapel: 'Matematika', status: 'PNS', jamMengajar: 28, presensi: '97%' },
          { id: 'G3', nama: 'Endang Lestari, S.Pd', nip: '198808152020122003', mapel: 'IPA / Fisika', status: 'P3K', jamMengajar: 22, presensi: '99%' },
          { id: 'G4', nama: 'Rudi Hermawan, S.Kom', nip: '-', mapel: 'TIK / Prakarya', status: 'HONORER', jamMengajar: 18, presensi: '95%' },
        ];
      case '2024/2025':
        return [
          { id: 'G1', nama: 'Drs. H. Ahmad Fauzi', nip: '197402122003121002', mapel: 'Bahasa Indonesia', status: 'PNS', jamMengajar: 24, presensi: '99%' },
          { id: 'G2', nama: 'Supriyadi, S.Pd', nip: '198205102009041001', mapel: 'Matematika', status: 'PNS', jamMengajar: 26, presensi: '98%' },
          { id: 'G3', nama: 'Endang Lestari, S.Pd', nip: '198808152020122003', mapel: 'IPA / Fisika', status: 'P3K', jamMengajar: 24, presensi: '99%' },
          { id: 'G4', nama: 'Rudi Hermawan, S.Kom', nip: '199201142024031002', mapel: 'TIK / Prakarya', status: 'P3K', jamMengajar: 20, presensi: '96%' },
          { id: 'G5', nama: 'Siti Rahmawati, S.Pd', nip: '-', mapel: 'Bahasa Inggris', status: 'HONORER', jamMengajar: 18, presensi: '94%' },
        ];
      case '2025/2026':
        return [
          { id: 'G1', nama: 'Drs. H. Ahmad Fauzi', nip: '197402122003121002', mapel: 'Bahasa Indonesia', status: 'PNS', jamMengajar: 24, presensi: '99%' },
          { id: 'G2', nama: 'Supriyadi, S.Pd', nip: '198205102009041001', mapel: 'Matematika', status: 'PNS', jamMengajar: 26, presensi: '98%' },
          { id: 'G3', nama: 'Endang Lestari, S.Pd', nip: '198808152020122003', mapel: 'IPA / Fisika', status: 'P3K', jamMengajar: 24, presensi: '99%' },
          { id: 'G4', nama: 'Rudi Hermawan, S.Kom', nip: '199201142024031002', mapel: 'TIK / Prakarya', status: 'P3K', jamMengajar: 20, presensi: '97%' },
          { id: 'G5', nama: 'Siti Rahmawati, S.Pd', nip: '199505122025122004', mapel: 'Bahasa Inggris', status: 'P3K', jamMengajar: 22, presensi: '96%' },
          { id: 'G6', nama: 'M. Syarifuddin, S.Ag', nip: '-', mapel: 'PAI / Agama', status: 'HONORER', jamMengajar: 12, presensi: '95%' },
        ];
      case '2026/2027':
      default:
        // Derived from MockDb active guru
        const dbGuru = MockDb.guru || [];
        return dbGuru.map(g => ({
          id: g.id,
          nama: g.nama,
          nip: g.nip || '-',
          mapel: g.mapel || 'Sains',
          status: g.nip ? 'PNS / P3K' : 'HONORER',
          jamMengajar: 24,
          presensi: '99.2%'
        }));
    }
  };

  const getPengurusDataForYear = (year: string) => {
    switch (year) {
      case '2023/2024':
        return [
          { tanggal: '2023-07-10', nama: 'H. Achmad Syarif, M.A', jabatan: 'Ketua Yayasan', aksi: 'Menandatangani RKA (Rencana Kerja & Anggaran) Tahun Ajaran Baru 2023/2024', status: 'Selesai' },
          { tanggal: '2023-11-20', nama: 'Dra. Hj. Wahyuni', jabatan: 'Pengawas Yayasan', aksi: 'Audit Sarana & Prasarana gedung baru Rombel Tambora', status: 'Selesai' },
          { tanggal: '2024-03-15', nama: 'Bambang Irawan, M.M', jabatan: 'Bendahara Yayasan', aksi: 'Penyusunan Laporan Pertanggungjawaban BOS Triwulan I', status: 'Selesai' },
        ];
      case '2024/2025':
        return [
          { tanggal: '2024-07-05', nama: 'H. Achmad Syarif, M.A', jabatan: 'Ketua Yayasan', aksi: 'Persetujuan Pengadaan Lab Komputer Baru (15 Client PC)', status: 'Selesai' },
          { tanggal: '2024-10-18', nama: 'Dra. Hj. Wahyuni', jabatan: 'Pengawas Yayasan', aksi: 'Supervisi Pembelajaran Berbasis Digital Kurikulum Merdeka', status: 'Selesai' },
          { tanggal: '2025-05-24', nama: 'H. Achmad Syarif, M.A', jabatan: 'Ketua Yayasan', aksi: 'Peresmian Perpustakaan Rombel Tambora Hybrid Library', status: 'Selesai' },
        ];
      case '2025/2026':
        return [
          { tanggal: '2025-07-01', nama: 'H. Achmad Syarif, M.A', jabatan: 'Ketua Yayasan', aksi: 'Pengesahan Kenaikan Insentif & Kesejahteraan Guru Honorer Rombel', status: 'Selesai' },
          { tanggal: '2025-12-15', nama: 'Dra. Hj. Wahyuni', jabatan: 'Pengawas Yayasan', aksi: 'Evaluasi Mutu Pendidikan Semester Ganjil Rombel KTCT', status: 'Selesai' },
          { tanggal: '2026-04-10', nama: 'Bambang Irawan, M.M', jabatan: 'Bendahara Yayasan', aksi: 'Pengadaan Sarana Olahraga & Lapangan Futsal Baru', status: 'Selesai' },
        ];
      case '2026/2027':
      default:
        return [
          { tanggal: '2026-07-05', nama: 'H. Achmad Syarif, M.A', jabatan: 'Ketua Yayasan', aksi: 'Meluncurkan Rombel KTCT Tambora Cloud ERP v4.1 Enterprise', status: 'Aktif' },
          { tanggal: '2026-07-12', nama: 'Dra. Hj. Wahyuni', jabatan: 'Pengawas Yayasan', aksi: 'Audit Kesiapan Akademik, CBT & PPDB Online Semester Ganjil', status: 'Aktif' },
          { tanggal: '2026-07-14', nama: 'Bambang Irawan, M.M', jabatan: 'Bendahara Yayasan', aksi: 'Pemeriksaan Sistem Otomasi Invoice SPP & Autotagging Keuangan', status: 'Aktif' },
        ];
    }
  };

  // Extract variables based on state
  const currentSiswaList = getSiswaDataForYear(selectedYear);
  const currentKeuangan = getKeuanganDataForYear(selectedYear);
  const currentGuruList = getGuruDataForYear(selectedYear);
  const currentPengurusList = getPengurusDataForYear(selectedYear);

  // Filter lists based on Search & Status
  const filteredSiswa = currentSiswaList.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.nisn.includes(searchQuery) || 
                          s.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredGuru = currentGuruList.filter(g => 
    g.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.mapel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Interactive Export to CSV/Excel
  const handleExportData = () => {
    Swal.fire({
      title: 'Mengekspor Arsip...',
      text: `Menyiapkan berkas ekspor untuk Tahun Ajaran ${selectedYear}`,
      icon: 'info',
      timer: 1500,
      showConfirmButton: false
    });

    setTimeout(() => {
      let csvContent = "data:text/csv;charset=utf-8,";
      let filename = `Arsip_Rombel_Tambora_${selectedYear.replace('/', '_')}.csv`;

      if (activeTab === 'siswa') {
        const headers = ['No', 'Nama Siswa', 'NISN', 'JK', 'Kelas', 'Wali Murid', 'Status'];
        const rows = filteredSiswa.map((s, idx) => [idx + 1, s.nama, s.nisn, s.jk, s.kelas, s.wali, s.status]);
        csvContent += [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      } else if (activeTab === 'keuangan') {
        const headers = ['No', 'Tanggal', 'Uraian Transaksi', 'Kategori', 'Arus Kas', 'Nominal'];
        const rows = currentKeuangan.transaksi.map((t, idx) => [idx + 1, t.tgl, t.nama, t.kategori, t.jenis, t.nominal]);
        csvContent += [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      } else if (activeTab === 'guru') {
        const headers = ['No', 'Nama Guru', 'NIP', 'Mata Pelajaran', 'Status Kepegawaian', 'Jam Mengajar', 'Kehadiran'];
        const rows = filteredGuru.map((g, idx) => [idx + 1, g.nama, g.nip, g.mapel, g.status, g.jamMengajar, g.presensi]);
        csvContent += [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      } else {
        const headers = ['No', 'Tanggal', 'Nama Pengurus', 'Jabatan', 'Uraian Aktivitas/Keputusan', 'Status'];
        const rows = currentPengurusList.map((p, idx) => [idx + 1, p.tanggal, p.nama, p.jabatan, p.aksi, p.status]);
        csvContent += [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      Swal.fire({
        title: 'Sukses!',
        text: 'Berkas arsip berhasil diunduh.',
        icon: 'success'
      });
    }, 1600);
  };

  // Recharts Data Sets based on years (For rendering comparative progress charts)
  const chartSiswaEnrollment = [
    { year: '2023/2024', SiswaBaru: 45, AlumniLulus: 38 },
    { year: '2024/2025', SiswaBaru: 58, AlumniLulus: 44 },
    { year: '2025/2026', SiswaBaru: 72, AlumniLulus: 55 },
    { year: '2026/2027', SiswaBaru: 95, AlumniLulus: 62 },
  ];

  const chartKeuanganProgress = [
    { year: '2023/2024', Pemasukan: 320, Pengeluaran: 280, Surplus: 40 },
    { year: '2024/2025', Pemasukan: 385, Pengeluaran: 330, Surplus: 55 },
    { year: '2025/2026', Pemasukan: 430, Pengeluaran: 390, Surplus: 40 },
    { year: '2026/2027', Pemasukan: 512, Pengeluaran: 405, Surplus: 107 },
  ];

  const chartGuruStafCount = [
    { name: 'PNS', value: activeTab === 'guru' ? currentGuruList.filter(g => g.status.includes('PNS')).length || 2 : 3 },
    { name: 'P3K', value: activeTab === 'guru' ? currentGuruList.filter(g => g.status.includes('P3K')).length || 2 : 2 },
    { name: 'HONORER', value: activeTab === 'guru' ? currentGuruList.filter(g => g.status.includes('HONORER')).length || 1 : 2 },
  ];

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/10 rounded-full blur-2xl -ml-20 -mb-20"></div>
        
        <div className="relative flex items-center gap-4">
          <div className="p-3.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl">
            <History className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">Enterprise Archive System</span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight mt-0.5">Riwayat & Arsip Multi-Tahun</h1>
            <p className="text-xs text-slate-400 mt-1">Eksplorasi riwayat siswa, keuangan, guru, dan pengurus dari 2023/2024 s.d berjalan</p>
          </div>
        </div>

        {/* Dynamic Year Picker pills */}
        <div className="relative shrink-0 flex flex-wrap gap-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60">
          {TAHUN_AJARAN_LIST.map((yr) => (
            <button
              key={yr}
              onClick={() => {
                setSelectedYear(yr);
                Swal.fire({
                  toast: true,
                  position: 'top-end',
                  title: `Tahun Ajaran ${yr} Dipilih`,
                  icon: 'info',
                  showConfirmButton: false,
                  timer: 1000
                });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all duration-300 ${selectedYear === yr ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/40'}`}
            >
              {yr}
              {yr === '2026/2027' && (
                <span className="ml-1 px-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] rounded uppercase font-black tracking-widest">Live</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Subtab Selectors */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
        {[
          { id: 'siswa', label: 'Riwayat Siswa', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { id: 'keuangan', label: 'Riwayat Keuangan', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { id: 'guru', label: 'Riwayat Guru & Staf', icon: Briefcase, color: 'text-purple-600 bg-purple-50 border-purple-100' },
          { id: 'pengurus', label: 'Riwayat Pengurus', icon: CheckCircle, color: 'text-amber-600 bg-amber-50 border-amber-100' },
          { id: 'audit', label: 'Sistem Log & Audit', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50 border-rose-100' }
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition duration-200 ${isActive ? `${tab.color} font-extrabold shadow-sm ring-1 ring-offset-0 ring-opacity-10` : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? '' : 'text-slate-400'}`} />
              <span className="text-xs tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Analytics Section - Takes 1 column on large screens */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">Perbandingan Progress Multi-Tahun</h3>
              <p className="text-[11px] text-slate-400">Analisis perkembangan historis Rombel KTCT</p>
            </div>

            {/* Render dynamic charts based on active tab */}
            {activeTab === 'siswa' && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Siswa Baru vs Kelulusan</span>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={chartSiswaEnrollment}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="SiswaBaru" name="Pendaftar Baru" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="AlumniLulus" name="Kelulusan Alumni" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1.5 leading-relaxed">
                  <p>● Rata-rata pertumbuhan pendaftaran siswa baru adalah <b>+25% per tahun</b>.</p>
                  <p>● Rasio kelulusan siswa tingkat akhir stabil di angka <b>100%</b>.</p>
                </div>
              </div>
            )}

            {activeTab === 'keuangan' && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Grafik Arus Kas (Juta Rp)</span>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartKeuanganProgress}>
                      <defs>
                        <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="year" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="Pemasukan" name="Kas Masuk" stroke="#10b981" fillOpacity={1} fill="url(#colorMasuk)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Pengeluaran" name="Kas Keluar" stroke="#ef4444" fillOpacity={0} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1.5 leading-relaxed">
                  <p>● Surplus kas bersih meningkat secara signifikan berkat otomasi penagihan online.</p>
                  <p>● Penyisihan dana cadangan tabungan siswa aman terkendali.</p>
                </div>
              </div>
            )}

            {(activeTab === 'guru' || activeTab === 'pengurus') && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Komposisi Pegawai & Guru ({selectedYear})</span>
                <div className="h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartGuruStafCount}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartGuruStafCount.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1.5 leading-relaxed">
                  <p>● Fokus peningkatan status honorer menjadi P3K / Tetap.</p>
                  <p>● Rasio kehadiran guru mencapai standar prima <b>98.5%</b>.</p>
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status Integrasi Keamanan</span>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Enkripsi Log Transaksi</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">AKTIF</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Integrasi Google Drive</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">CONNECTED</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Auto-backup Database</span>
                    <span className="text-slate-400 font-mono font-bold">Setiap 24 Jam</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Log Retensi</span>
                    <span className="text-slate-400 font-mono font-bold">365 Hari</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Data List Section - Takes 2 columns on large screens */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Sub-tab detail headers and key metric values */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeTab === 'siswa' && (
              <>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Siswa Terdaftar</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-slate-800">{currentSiswaList.length}</span>
                    <span className="text-[10px] font-bold text-slate-400">Siswa</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status Alumni/Lulus</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-blue-600">{currentSiswaList.filter(s => s.status === 'LULUS').length}</span>
                    <span className="text-[10px] font-bold text-slate-400">Lulus</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Siswa Aktif Belajar</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-emerald-600">{currentSiswaList.filter(s => s.status === 'AKTIF').length}</span>
                    <span className="text-[10px] font-bold text-slate-400">Aktif</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rata-rata Presensi</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-purple-600">98.2%</span>
                    <span className="text-[10px] font-bold text-slate-400">Kehadiran</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'keuangan' && (
              <>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Pemasukan</span>
                  <div className="flex items-baseline gap-1 mt-1.5 overflow-hidden text-ellipsis">
                    <span className="text-base font-black text-emerald-600">{formatCurrency(currentKeuangan.pemasukan)}</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Pengeluaran</span>
                  <div className="flex items-baseline gap-1 mt-1.5 overflow-hidden text-ellipsis">
                    <span className="text-base font-black text-rose-500">{formatCurrency(currentKeuangan.pengeluaran)}</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Surplus Bersih</span>
                  <div className="flex items-baseline gap-1 mt-1.5 overflow-hidden text-ellipsis">
                    <span className="text-base font-black text-blue-600">{formatCurrency(currentKeuangan.surplus)}</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Persentase Lunas SPP</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-slate-800">{currentKeuangan.sppPersen}%</span>
                    <span className="text-[10px] font-bold text-emerald-600">Kolektibilitas</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'guru' && (
              <>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pendidik Aktif</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-purple-600">{currentGuruList.length}</span>
                    <span className="text-[10px] font-bold text-slate-400">Orang</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status PNS/P3K</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-slate-800">{currentGuruList.filter(g => g.status.includes('PNS') || g.status.includes('P3K')).length}</span>
                    <span className="text-[10px] font-bold text-slate-400">Guru</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rata Jam Mengajar</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-blue-600">24</span>
                    <span className="text-[10px] font-bold text-slate-400">Jam / Minggu</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Presensi Guru Prima</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-emerald-600">98.5%</span>
                    <span className="text-[10px] font-bold text-slate-400">Hadir</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'pengurus' && (
              <>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Rapat Pleno Kerja</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-amber-600">12</span>
                    <span className="text-[10px] font-bold text-slate-400">Sesi</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Keputusan Strategis</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-slate-800">28</span>
                    <span className="text-[10px] font-bold text-slate-400">Surat Keputusan</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gedung Baru / Sarana</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-emerald-600">3</span>
                    <span className="text-[10px] font-bold text-slate-400">Aset</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Kepuasan Layanan</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-purple-600">96.8%</span>
                    <span className="text-[10px] font-bold text-slate-400">Indeks</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'audit' && (
              <>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Log Tercatat</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-rose-500">{auditLogs.length}</span>
                    <span className="text-[10px] font-bold text-slate-400">Aktivitas</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Keamanan Jaringan</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-emerald-600">100%</span>
                    <span className="text-[10px] font-bold text-slate-400">Aman</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Waktu Muat Server</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-slate-800">18ms</span>
                    <span className="text-[10px] font-bold text-slate-400">Sangat Cepat</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pembaruan Modul</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-extrabold text-blue-600">Auto</span>
                    <span className="text-[10px] font-bold text-slate-400">v4.1</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Main List Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            
            {/* Table Search & Action Filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-grow max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'siswa' ? "Cari siswa berdasarkan nama, NISN, atau kelas..." :
                    activeTab === 'keuangan' ? "Cari deskripsi transaksi..." :
                    activeTab === 'guru' ? "Cari nama guru atau mata pelajaran..." :
                    "Cari riwayat keputusan pengurus..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'siswa' && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-xl bg-white outline-none"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="AKTIF">Siswa Aktif</option>
                    <option value="ALUMNI">Alumni (Lulus)</option>
                    <option value="PINDAH">Pindah</option>
                    <option value="KELUAR">Keluar</option>
                  </select>
                )}

                <button
                  onClick={handleExportData}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition duration-200 flex items-center gap-1.5 shadow-sm"
                  title="Unduh Data"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>
              </div>
            </div>

            {/* List Table container */}
            <div className="overflow-x-auto">
              
              {/* TAB 1: RIWAYAT SISWA */}
              {activeTab === 'siswa' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="p-3 pl-5">Nama Siswa</th>
                      <th className="p-3">NISN</th>
                      <th className="p-3">JK</th>
                      <th className="p-3">Wali Murid</th>
                      <th className="p-3">Kelas / Tahun</th>
                      <th className="p-3 pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredSiswa.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                          Tidak ditemukan riwayat siswa untuk filter atau kata kunci tersebut.
                        </td>
                      </tr>
                    ) : (
                      filteredSiswa.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 pl-5 font-bold text-slate-900">{s.nama}</td>
                          <td className="p-3 font-mono font-bold text-slate-500">{s.nisn}</td>
                          <td className="p-3 font-semibold">{s.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}</td>
                          <td className="p-3 font-medium text-slate-600">{s.wali}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800">{s.kelas}</span>
                            <span className="block text-[9px] text-slate-400 font-bold font-mono">{selectedYear}</span>
                          </td>
                          <td className="p-3 pr-5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                              s.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              s.status === 'LULUS' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 2: RIWAYAT KEUANGAN */}
              {activeTab === 'keuangan' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="p-3 pl-5">Tanggal</th>
                      <th className="p-3">Uraian Transaksi</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Arus Kas</th>
                      <th className="p-3 pr-5 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {currentKeuangan.transaksi.filter(t => t.nama.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                          Tidak ditemukan data transaksi keuangan.
                        </td>
                      </tr>
                    ) : (
                      currentKeuangan.transaksi
                        .filter(t => t.nama.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-3 pl-5 font-mono font-bold text-slate-500">{t.tgl}</td>
                            <td className="p-3 font-bold text-slate-800">{t.nama}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-600 font-bold uppercase">{t.kategori}</span>
                            </td>
                            <td className="p-3">
                              {t.jenis === 'MASUK' ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  <span>Debit (Masuk)</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-rose-500 font-bold text-[10px] uppercase">
                                  <ArrowDownRight className="w-3.5 h-3.5" />
                                  <span>Kredit (Keluar)</span>
                                </span>
                              )}
                            </td>
                            <td className={`p-3 pr-5 text-right font-black font-mono ${t.jenis === 'MASUK' ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {t.jenis === 'MASUK' ? '+' : '-'}{formatCurrency(t.nominal)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 3: RIWAYAT GURU */}
              {activeTab === 'guru' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="p-3 pl-5">Nama Guru / Pendidik</th>
                      <th className="p-3">NIP</th>
                      <th className="p-3">Mata Pelajaran Utama</th>
                      <th className="p-3">Status Kepegawaian</th>
                      <th className="p-3">Beban Ajar</th>
                      <th className="p-3 pr-5 text-center">Presensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredGuru.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                          Tidak ditemukan data pendidik.
                        </td>
                      </tr>
                    ) : (
                      filteredGuru.map((g) => (
                        <tr key={g.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 pl-5 font-bold text-slate-900">{g.nama}</td>
                          <td className="p-3 font-mono text-slate-500 font-bold">{g.nip}</td>
                          <td className="p-3 font-semibold text-blue-600">{g.mapel}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-lg text-[9px] font-black uppercase">{g.status}</span>
                          </td>
                          <td className="p-3 font-semibold">{g.jamMengajar} Jam / Minggu</td>
                          <td className="p-3 pr-5 text-center font-black text-emerald-600 font-mono">{g.presensi}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 4: RIWAYAT PENGURUS */}
              {activeTab === 'pengurus' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      <th className="p-3 pl-5">Tanggal</th>
                      <th className="p-3">Nama Pengurus</th>
                      <th className="p-3">Jabatan</th>
                      <th className="p-3">Deskripsi Kebijakan / Aktivitas</th>
                      <th className="p-3 pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {currentPengurusList.filter(p => p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || p.aksi.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                          Tidak ditemukan riwayat keputusan.
                        </td>
                      </tr>
                    ) : (
                      currentPengurusList
                        .filter(p => p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || p.aksi.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="p-3 pl-5 font-mono font-bold text-slate-500">{p.tanggal}</td>
                            <td className="p-3 font-bold text-slate-900">{p.nama}</td>
                            <td className="p-3 font-semibold text-amber-600">{p.jabatan}</td>
                            <td className="p-3 text-slate-600 leading-relaxed font-semibold">{p.aksi}</td>
                            <td className="p-3 pr-5">
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black rounded-full uppercase">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              )}

              {/* TAB 5: AUDIT LOG */}
              {activeTab === 'audit' && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-rose-500" />
                    <span>Real-time System Audit Trails ({selectedYear})</span>
                  </div>

                  <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-6 max-h-[480px] overflow-y-auto">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">Belum ada log aktivitas terekam.</div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="relative">
                          <div className="absolute -left-9 top-1 w-4.5 h-4.5 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                          <div className="space-y-1">
                            <p className="text-xs text-slate-800">
                              <b className="text-blue-600 font-mono font-bold mr-1">@{log.user}</b>
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-1 rounded uppercase mr-1.5 tracking-wider">{log.role}</span>
                              {log.action}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold">{log.timestamp}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Pagination / Table Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[9px]">Menampilkan {
                activeTab === 'siswa' ? filteredSiswa.length :
                activeTab === 'keuangan' ? currentKeuangan.transaksi.length :
                activeTab === 'guru' ? filteredGuru.length :
                activeTab === 'pengurus' ? currentPengurusList.length :
                auditLogs.length
              } item data arsip</span>
              <span className="font-bold text-slate-500">Rombel KTCT Tambora • Arsip Akademik</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
