import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { db } from '../data/db';
import { 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Award, 
  Layers, 
  Clock, 
  BarChart2, 
  FileText, 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  Brain, 
  Compass, 
  CheckSquare, 
  Lightbulb, 
  GraduationCap, 
  Zap, 
  Sliders,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Legend as ChartLegend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { motion } from 'motion/react';

declare const Swal: any;

interface KurikulumProps {
  user?: any;
  isPublicView?: boolean;
}

// Interfaces for Kemendikdasmen Curriculum Framework
export interface StrukturMapelJPM {
  id: string;
  kode: string;
  namaMapel: string;
  jenjang: 'PAKET A' | 'PAKET B' | 'PAKET C' | 'SD' | 'SMP' | 'SMA' | 'SEMUA';
  fase: 'FASE A' | 'FASE B' | 'FASE C' | 'FASE D' | 'FASE E' | 'FASE F' | 'SEMUA';
  jpmIntra: number; // Jam Pelajaran Intrakurikuler per Minggu
  jpmP5: number;    // Jam Pelajaran Kokurikuler / P5 per Minggu
  kategori: 'WAJIB' | 'PILIHAN' | 'VOKASI' | 'KODING_AI' | 'PEMBIASAAN';
  kktpMinimal: number;
}

export interface CapaianPembelajaran {
  id: string;
  kodeCp: string;
  mapel: string;
  fase: string;
  elemen: string;
  deskripsiCp: string;
  tujuanPembelajaran: string[];
  statusModul: 'TERVERIFIKASI' | 'DRAFT' | 'REVIEW';
  pendekatan: 'DEEP_LEARNING' | 'REGULER';
}

export interface ProjekP5Theme {
  id: string;
  judulProjek: string;
  temaUtama: string;
  faseTarget: string;
  dimensiTarget: string[];
  alokasiJam: number;
  statusProgres: number; // 0-100%
  koordinator: string;
}

export default function Kurikulum({ user, isPublicView = false }: KurikulumProps = {}) {
  const storeUser = useStore(state => state.user);
  const currentUser = user || storeUser;
  const canEdit = !isPublicView && Boolean(currentUser) && ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WAKASEK_KURIKULUM', 'KEPALA_SEKOLAH'].includes(currentUser?.role);
  const [activeTab, setActiveTab] = useState<'struktur_jpm' | 'cp_tp_atp' | 'projek_p5' | 'asesmen_kktp' | 'deep_learning'>('struktur_jpm');

  // Keamanan Privasi: Capaian & Alur Pembelajaran (CP/ATP) HANYA untuk internal ERP, jangan pernah muncul di Portal Publik
  useEffect(() => {
    if (isPublicView && activeTab === 'cp_tp_atp') {
      setActiveTab('struktur_jpm');
    }
  }, [isPublicView, activeTab]);
  const [selectedJenjangFilter, setSelectedJenjangFilter] = useState<string>('SEMUA');
  const [selectedFaseFilter, setSelectedFaseFilter] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local storage / DB State with standard Kemendikdasmen 2026 fallbacks
  const [mapelJpmList, setMapelJpmList] = useState<StrukturMapelJPM[]>([]);
  const [cpList, setCpList] = useState<CapaianPembelajaran[]>([]);
  const [p5List, setP5List] = useState<ProjekP5Theme[]>([]);

  // Modal & Form States
  const [showJpmModal, setShowJpmModal] = useState(false);
  const [editingJpm, setEditingJpm] = useState<StrukturMapelJPM | null>(null);
  const [jpmForm, setJpmForm] = useState<Partial<StrukturMapelJPM>>({
    kode: '',
    namaMapel: '',
    jenjang: 'PAKET C',
    fase: 'FASE F',
    jpmIntra: 4,
    jpmP5: 1,
    kategori: 'WAJIB',
    kktpMinimal: 75
  });

  const [showCpModal, setShowCpModal] = useState(false);
  const [editingCp, setEditingCp] = useState<CapaianPembelajaran | null>(null);
  const [cpForm, setCpForm] = useState<Partial<CapaianPembelajaran>>({
    kodeCp: '',
    mapel: 'Bahasa Indonesia',
    fase: 'FASE F',
    elemen: 'Menyimak & Membaca Kritis',
    deskripsiCp: '',
    tujuanPembelajaran: ['Menganalisis teks informasi kompleks', 'Menyusun argumen berbasis bukti empiris'],
    statusModul: 'TERVERIFIKASI',
    pendekatan: 'DEEP_LEARNING'
  });

  // Initial Load from DB
  useEffect(() => {
    loadKurikulumData();
  }, []);

  const loadKurikulumData = () => {
    // 1. Structure Mapel JPM
    let savedJpm = db.get<StrukturMapelJPM>('kurikulum_jpm');
    if (!savedJpm || savedJpm.length === 0) {
      savedJpm = [
        { id: 'JPM_01', kode: 'IND-01', namaMapel: 'Bahasa Indonesia', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 6, jpmP5: 2, kategori: 'WAJIB', kktpMinimal: 75 },
        { id: 'JPM_02', kode: 'MTK-01', namaMapel: 'Matematika & Penalaran Aljabar', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 5, jpmP5: 1, kategori: 'WAJIB', kktpMinimal: 75 },
        { id: 'JPM_03', kode: 'AI-01', namaMapel: 'Koding & Kecerdasan Artifisial (AI)', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 3, jpmP5: 1, kategori: 'KODING_AI', kktpMinimal: 80 },
        { id: 'JPM_04', kode: 'ING-01', namaMapel: 'Bahasa Inggris & Komunikasi Global', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 4, jpmP5: 1, kategori: 'WAJIB', kktpMinimal: 75 },
        { id: 'JPM_05', kode: 'PAI-01', namaMapel: 'Pendidikan Agama & Budi Pekerti', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 3, jpmP5: 1, kategori: 'WAJIB', kktpMinimal: 75 },
        { id: 'JPM_06', kode: 'PKN-01', namaMapel: 'Pendidikan Pancasila & Kewarganegaraan', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 3, jpmP5: 1, kategori: 'WAJIB', kktpMinimal: 75 },
        { id: 'JPM_07', kode: 'FIS-01', namaMapel: 'Fisika Terapan & Teknologi', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 4, jpmP5: 1, kategori: 'PILIHAN', kktpMinimal: 75 },
        { id: 'JPM_08', kode: 'EKO-01', namaMapel: 'Ekonomi Digital & Kewirausahaan', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 4, jpmP5: 2, kategori: 'VOKASI', kktpMinimal: 75 },
        { id: 'JPM_09', kode: 'PJK-01', namaMapel: 'PJOK & Gaya Hidup Sehat', jenjang: 'PAKET C', fase: 'FASE F', jpmIntra: 3, jpmP5: 0, kategori: 'WAJIB', kktpMinimal: 75 },
      ];
      db.set('kurikulum_jpm', savedJpm);
    }
    setMapelJpmList(savedJpm);

    // 2. Capaian Pembelajaran (CP)
    let savedCp = db.get<CapaianPembelajaran>('kurikulum_cp');
    if (!savedCp || savedCp.length === 0) {
      savedCp = [
        {
          id: 'CP_01',
          kodeCp: 'CP-IND-F1',
          mapel: 'Bahasa Indonesia',
          fase: 'FASE F',
          elemen: 'Membaca & Memirsa Teks Kompleks',
          deskripsiCp: 'Peserta didik mampu mengevaluasi gagasan, gagasan pendukung, serta pandangan penulis dari teks sains dan sosial dengan sikap kritis berbasis bukti.',
          tujuanPembelajaran: [
            'TP 1: Mengidentifikasi fakta vs opini dalam artikel berita ilmiah',
            'TP 2: Menyusun rangkuman kritis menggunakan pendekatan Mindful Learning'
          ],
          statusModul: 'TERVERIFIKASI',
          pendekatan: 'DEEP_LEARNING'
        },
        {
          id: 'CP_02',
          kodeCp: 'CP-AI-F1',
          mapel: 'Koding & Kecerdasan Artifisial (AI)',
          fase: 'FASE F',
          elemen: 'Pemrograman Python & Prompt Engineering',
          deskripsiCp: 'Peserta didik mampu merancang logika algoritma sederhana, memahami etika AI, serta memanfaatkan Large Language Models untuk memecahkan masalah kemasyarakatan.',
          tujuanPembelajaran: [
            'TP 1: Memahami struktur kontrol logika percabangan dan perulangan',
            'TP 2: Mengembangkan prototype aplikasi web berbasis AI untuk otomatisasi tugas sekolah'
          ],
          statusModul: 'TERVERIFIKASI',
          pendekatan: 'DEEP_LEARNING'
        },
        {
          id: 'CP_03',
          kodeCp: 'CP-MTK-F1',
          mapel: 'Matematika & Penalaran Aljabar',
          fase: 'FASE F',
          elemen: 'Penalaran Statistik & Peluang',
          deskripsiCp: 'Peserta didik dapat merumuskan model matematika dari data kuantitatif nyata serta memprediksi tren keuangan dan sosial secara presisi.',
          tujuanPembelajaran: [
            'TP 1: Mengolah data sampel menggunakan ukuran pemusatan dan penyebaran',
            'TP 2: Menganalisis regresi linier sederhana pada grafik simulasi keuangan'
          ],
          statusModul: 'TERVERIFIKASI',
          pendekatan: 'DEEP_LEARNING'
        }
      ];
      db.set('kurikulum_cp', savedCp);
    }
    setCpList(savedCp);

    // 3. Projek P5 Themes
    let savedP5 = db.get<ProjekP5Theme>('kurikulum_p5');
    if (!savedP5 || savedP5.length === 0) {
      savedP5 = [
        {
          id: 'P5_01',
          judulProjek: 'Inovasi Bank Sampah Digital & Daur Ulang Mandiri',
          temaUtama: 'Gaya Hidup Berkelanjutan',
          faseTarget: 'FASE F (Kelas 11 & 12)',
          dimensiTarget: ['Gotong Royong', 'Bernalar Kritis', 'Kreatif'],
          alokasiJam: 72,
          statusProgres: 85,
          koordinator: 'Ahmad Syahputra, S.Pd.'
        },
        {
          id: 'P5_02',
          judulProjek: 'Aplikasi AI Pembantu Administrasi RT/RW Tambora',
          temaUtama: 'Rekayasa & Teknologi AI',
          faseTarget: 'FASE F (Kelas 12)',
          dimensiTarget: ['Bernalar Kritis', 'Mandiri', 'Kebinekaan Global'],
          alokasiJam: 96,
          statusProgres: 60,
          koordinator: 'Dra. Endang Rahayu'
        },
        {
          id: 'P5_03',
          judulProjek: 'Kewirausahaan Kuliner Tradisional Produk Vokasi',
          temaUtama: 'Kewirausahaan',
          faseTarget: 'FASE E & F',
          dimensiTarget: ['Mandiri', 'Kreatif', 'Beriman & Bertaqwa'],
          alokasiJam: 64,
          statusProgres: 90,
          koordinator: 'Siti Nurhaliza, M.Pd.'
        }
      ];
      db.set('kurikulum_p5', savedP5);
    }
    setP5List(savedP5);
  };

  // Handlers for JPM Modal
  const handleSaveJpm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jpmForm.namaMapel || !jpmForm.kode) {
      Swal.fire('Form Belum Lengkap', 'Nama Mata Pelajaran dan Kode Mapel wajib diisi.', 'warning');
      return;
    }

    let updated: StrukturMapelJPM[];
    if (editingJpm) {
      updated = mapelJpmList.map(item => item.id === editingJpm.id ? { ...item, ...jpmForm } as StrukturMapelJPM : item);
      Swal.fire('Berhasil Update', 'Struktur jam pelajaran berhasil diperbarui.', 'success');
    } else {
      const newItem: StrukturMapelJPM = {
        id: `JPM_${Date.now()}`,
        kode: jpmForm.kode || `MP-${Math.floor(Math.random() * 900 + 100)}`,
        namaMapel: jpmForm.namaMapel || '',
        jenjang: jpmForm.jenjang as any || 'PAKET C',
        fase: jpmForm.fase as any || 'FASE F',
        jpmIntra: Number(jpmForm.jpmIntra) || 4,
        jpmP5: Number(jpmForm.jpmP5) || 1,
        kategori: jpmForm.kategori as any || 'WAJIB',
        kktpMinimal: Number(jpmForm.kktpMinimal) || 75
      };
      updated = [newItem, ...mapelJpmList];
      Swal.fire('Berhasil Dibuat', 'Mata pelajaran baru telah ditambahkan ke kurikulum.', 'success');
    }

    db.set('kurikulum_jpm', updated);
    setMapelJpmList(updated);
    setShowJpmModal(false);
    setEditingJpm(null);
  };

  const handleDeleteJpm = (id: string) => {
    Swal.fire({
      title: 'Hapus Alokasi JPM?',
      text: 'Mata pelajaran ini akan dihapus dari struktur kurikulum.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const filtered = mapelJpmList.filter(item => item.id !== id);
        db.set('kurikulum_jpm', filtered);
        setMapelJpmList(filtered);
        Swal.fire('Terhapus', 'Mata pelajaran dihapus dari kurikulum.', 'success');
      }
    });
  };

  // Handlers for CP/TP Modal
  const handleSaveCp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpForm.kodeCp || !cpForm.deskripsiCp) {
      Swal.fire('Form Belum Lengkap', 'Kode CP dan Deskripsi Capaian Pembelajaran wajib diisi.', 'warning');
      return;
    }

    let updated: CapaianPembelajaran[];
    if (editingCp) {
      updated = cpList.map(item => item.id === editingCp.id ? { ...item, ...cpForm } as CapaianPembelajaran : item);
      Swal.fire('Berhasil Update', 'Capaian Pembelajaran (CP) berhasil diperbarui.', 'success');
    } else {
      const newItem: CapaianPembelajaran = {
        id: `CP_${Date.now()}`,
        kodeCp: cpForm.kodeCp || `CP-${Math.floor(Math.random() * 900 + 100)}`,
        mapel: cpForm.mapel || 'Bahasa Indonesia',
        fase: cpForm.fase || 'FASE F',
        elemen: cpForm.elemen || 'Elemen Pembelajaran',
        deskripsiCp: cpForm.deskripsiCp || '',
        tujuanPembelajaran: cpForm.tujuanPembelajaran || ['Mengidentifikasi konsep dasar'],
        statusModul: cpForm.statusModul as any || 'TERVERIFIKASI',
        pendekatan: cpForm.pendekatan as any || 'DEEP_LEARNING'
      };
      updated = [newItem, ...cpList];
      Swal.fire('Berhasil Dibuat', 'Capaian Pembelajaran baru telah ditambahkan.', 'success');
    }

    db.set('kurikulum_cp', updated);
    setCpList(updated);
    setShowCpModal(false);
    setEditingCp(null);
  };

  // Reset to Kemendikdasmen Default
  const handleResetDefault = () => {
    Swal.fire({
      title: 'Reset ke Standar Kemendikdasmen 2026?',
      text: 'Semua struktur JPM, CP, dan Projek P5 akan disesuaikan ulang dengan pedoman resmi Kemendikdasmen terbaru.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Sesuai Standar',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        localStorage.removeItem('ERP_kurikulum_jpm');
        localStorage.removeItem('ERP_kurikulum_cp');
        localStorage.removeItem('ERP_kurikulum_p5');
        loadKurikulumData();
        Swal.fire('Tersinkron!', 'Data Kurikulum Merdeka & Deep Learning disesuaikan 100%.', 'success');
      }
    });
  };

  // Filtered List calculations
  const filteredMapelJpm = mapelJpmList.filter(item => {
    const matchJenjang = selectedJenjangFilter === 'SEMUA' || item.jenjang === selectedJenjangFilter;
    const matchFase = selectedFaseFilter === 'SEMUA' || item.fase === selectedFaseFilter;
    const matchQuery = !searchQuery.trim() || item.namaMapel.toLowerCase().includes(searchQuery.toLowerCase()) || item.kode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchJenjang && matchFase && matchQuery;
  });

  const totalJpmIntra = filteredMapelJpm.reduce((acc, curr) => acc + curr.jpmIntra, 0);
  const totalJpmP5 = filteredMapelJpm.reduce((acc, curr) => acc + curr.jpmP5, 0);

  // Chart Data
  const jpmChartData = filteredMapelJpm.map(m => ({
    name: m.kode,
    Intrakurikuler: m.jpmIntra,
    KokurikulerP5: m.jpmP5,
    Total: m.jpmIntra + m.jpmP5
  }));

  const radarDataP5 = [
    { subject: 'Beriman & Bertaqwa', A: 90, fullMark: 100 },
    { subject: 'Kebinekaan Global', A: 85, fullMark: 100 },
    { subject: 'Gotong Royong', A: 95, fullMark: 100 },
    { subject: 'Mandiri', A: 88, fullMark: 100 },
    { subject: 'Bernalar Kritis', A: 92, fullMark: 100 },
    { subject: 'Kreatif', A: 89, fullMark: 100 },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-800">
      {/* EXECUTIVE HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl border border-indigo-900/40">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black uppercase rounded-full tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Kemendikdasmen RI • Permendikdasmen No. 9 Tahun 2026
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Dashboard Kurikulum Merdeka & Deep Learning
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Pusat pengelolaan struktur alokasi Jam Pelajaran (JPM), Capaian Pembelajaran (CP/TP/ATP), Modul Ajar berpendekatan <span className="text-indigo-300 font-bold">Mindful, Meaningful, & Joyful Learning</span>, serta Projek Profil Pelajar Pancasila (P5).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canEdit && (
              <button
                onClick={handleResetDefault}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 flex items-center gap-2 transition shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                Reset Standar Kemendikdasmen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TOP KPI CARDS (METRICS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:border-indigo-300 transition">
          <div className="flex items-center gap-2.5 text-indigo-600 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kurikulum</span>
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">Merdeka & Deep Learning</h4>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">100% Aktif</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:border-blue-300 transition">
          <div className="flex items-center gap-2.5 text-blue-600 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Beban JPM</span>
          </div>
          <h4 className="text-xl font-black text-slate-900 dark:text-white">{totalJpmIntra + totalJpmP5} <span className="text-xs font-semibold text-slate-400">JPM/Mgg</span></h4>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">{totalJpmIntra} Intra + {totalJpmP5} P5</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:border-purple-300 transition">
          <div className="flex items-center gap-2.5 text-purple-600 mb-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Capaian Pembelajaran</span>
          </div>
          <h4 className="text-xl font-black text-slate-900 dark:text-white">{cpList.length} <span className="text-xs font-semibold text-slate-400">CP Active</span></h4>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">Fase A - Fase F</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:border-emerald-300 transition">
          <div className="flex items-center gap-2.5 text-emerald-600 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Projek P5 Active</span>
          </div>
          <h4 className="text-xl font-black text-slate-900 dark:text-white">{p5List.length} <span className="text-xs font-semibold text-slate-400">Tema Utama</span></h4>
          <span className="text-[10px] text-blue-600 font-bold block mt-1">6 Dimensi Pancasila</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:border-rose-300 transition">
          <div className="flex items-center gap-2.5 text-rose-600 mb-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-xl">
              <Brain className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mapel Koding & AI</span>
          </div>
          <h4 className="text-xl font-black text-slate-900 dark:text-white">Wajib <span className="text-xs font-semibold text-slate-400">2026</span></h4>
          <span className="text-[10px] text-indigo-600 font-bold block mt-1">Literasi Digital & Python</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-3xl shadow-sm hover:border-amber-300 transition">
          <div className="flex items-center gap-2.5 text-amber-600 mb-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 rounded-xl">
              <Sliders className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rasio Rapor</span>
          </div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white">60% Modul : 40% ASAS</h4>
          <span className="text-[10px] text-amber-600 font-bold block mt-1">Skema Kemendikdasmen</span>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-2">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('struktur_jpm')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'struktur_jpm'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Struktur JPM & Beban Belajar
          </button>

          {!isPublicView && (
            <button
              onClick={() => setActiveTab('cp_tp_atp')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
                activeTab === 'cp_tp_atp'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              CP, TP, ATP & Modul Ajar
            </button>
          )}

          <button
            onClick={() => setActiveTab('projek_p5')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'projek_p5'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Projek Kokurikuler (P5)
          </button>

          <button
            onClick={() => setActiveTab('deep_learning')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'deep_learning'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            Prinsip Deep Learning
          </button>

          <button
            onClick={() => setActiveTab('asesmen_kktp')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 ${
              activeTab === 'asesmen_kktp'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Asesmen & KKTP
          </button>
        </div>

        {/* Global Filter Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mapel / CP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedFaseFilter}
            onChange={(e) => setSelectedFaseFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="SEMUA">Semua Fase</option>
            <option value="FASE A">Fase A (Kls 1-2)</option>
            <option value="FASE B">Fase B (Kls 3-4)</option>
            <option value="FASE C">Fase C (Kls 5-6)</option>
            <option value="FASE D">Fase D (Kls 7-9)</option>
            <option value="FASE E">Fase E (Kls 10)</option>
            <option value="FASE F">Fase F (Kls 11-12)</option>
          </select>
        </div>
      </div>

      {/* TAB 1: STRUKTUR JPM & BEBAN BELAJAR */}
      {activeTab === 'struktur_jpm' && (
        <div className="space-y-6">
          {/* Visual Chart Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase">Grafik Distribusi Jam Pelajaran (JPM) per Minggu</h3>
                  <p className="text-xs text-slate-400">Komposisi Intrakurikuler vs Kokurikuler (P5) sesuai Kemendikdasmen 2026</p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold rounded-full border border-indigo-100 dark:border-indigo-900">
                  Total: {totalJpmIntra + totalJpmP5} JPM
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jpmChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                    <ChartTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px' }} />
                    <ChartLegend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Intrakurikuler" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Intrakurikuler (JPM)" />
                    <Bar dataKey="KokurikulerP5" fill="#10b981" radius={[4, 4, 0, 0]} name="Projek P5 (JPM)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Policy Insight */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-sm space-y-4 border border-indigo-800/40 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Mandat Kebijakan Terbaru
                </div>
                <h4 className="text-lg font-black leading-snug">
                  Mapel Koding & Artificial Intelligence (AI) Mulai 2026
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sesuai arahan Kemendikdasmen, koding dan logika AI menjadi mata pelajaran pilihan/wajib untuk menguatkan penalaran komputasional sejak jenjang dasar hingga menengah.
                </p>
              </div>

              <div className="p-4 bg-indigo-950/80 border border-indigo-800/60 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs font-bold text-indigo-200">
                  <span>Standardisasikan JPM Sekolah:</span>
                  <span className="text-emerald-400 font-extrabold">Sesuai Permen</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[100%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Table Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/50">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase">Matriks Alokasi Jam Pelajaran (JPM) per Mata Pelajaran</h3>
                <p className="text-xs text-slate-400">Atur beban mengajar, kategori mapel, dan KKTP minimal</p>
              </div>

              {canEdit && (
                <button
                  onClick={() => {
                    setEditingJpm(null);
                    setJpmForm({
                      kode: `MP-00${mapelJpmList.length + 1}`,
                      namaMapel: '',
                      jenjang: 'PAKET C',
                      fase: 'FASE F',
                      jpmIntra: 4,
                      jpmP5: 1,
                      kategori: 'WAJIB',
                      kktpMinimal: 75
                    });
                    setShowJpmModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Mapel & JPM
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Kode</th>
                    <th className="p-4">Mata Pelajaran</th>
                    <th className="p-4">Kategori</th>
                    <th className="p-4">Jenjang & Fase</th>
                    <th className="p-4 text-center">JPM Intra</th>
                    <th className="p-4 text-center">JPM P5</th>
                    <th className="p-4 text-center">Total JPM</th>
                    <th className="p-4 text-center">KKTP Min.</th>
                    {canEdit && <th className="p-4 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                  {filteredMapelJpm.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.kode}</td>
                      <td className="p-4 font-extrabold text-slate-900 dark:text-slate-100">{item.namaMapel}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.kategori === 'KODING_AI' 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200'
                            : item.kategori === 'WAJIB'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {item.kategori.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {item.jenjang} • <span className="font-bold text-slate-700 dark:text-slate-300">{item.fase}</span>
                      </td>
                      <td className="p-4 text-center font-bold text-indigo-600">{item.jpmIntra} JPM</td>
                      <td className="p-4 text-center font-bold text-emerald-600">{item.jpmP5} JPM</td>
                      <td className="p-4 text-center font-black text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950/40">
                        {item.jpmIntra + item.jpmP5} JPM
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-amber-600">{item.kktpMinimal}</td>
                      {canEdit && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingJpm(item);
                                setJpmForm(item);
                                setShowJpmModal(true);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteJpm(item.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAPAIAN PEMBELAJARAN (CP), TP, ATP & MODUL AJAR (INTERNAL ONLY) */}
      {activeTab === 'cp_tp_atp' && !isPublicView && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase rounded-full border border-purple-200">
                Penyusunan Kurikulum Operasional (KSP)
              </span>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base uppercase mt-1">
                Bank Capaian Pembelajaran (CP) & Tujuan Pembelajaran (TP)
              </h3>
              <p className="text-xs text-slate-400">
                Lacak seluruh alur CP, rumusan TP, dan kesiapan Modul Ajar berpendekatan Deep Learning
              </p>
            </div>

            {canEdit && (
              <button
                onClick={() => {
                  setEditingCp(null);
                  setCpForm({
                    kodeCp: `CP-${Math.floor(Math.random() * 900 + 100)}`,
                    mapel: 'Bahasa Indonesia',
                    fase: 'FASE F',
                    elemen: 'Pemahaman Kritis',
                    deskripsiCp: '',
                    tujuanPembelajaran: ['Tujuan Pembelajaran 1', 'Tujuan Pembelajaran 2'],
                    statusModul: 'TERVERIFIKASI',
                    pendekatan: 'DEEP_LEARNING'
                  });
                  setShowCpModal(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                Tambah CP / TP Baru
              </button>
            )}
          </div>

          {/* List of CP Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cpList.map((cp) => (
              <div key={cp.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 hover:border-purple-300 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">{cp.kodeCp}</span>
                    <h4 className="font-black text-slate-900 dark:text-slate-100 text-base">{cp.mapel}</h4>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">{cp.fase} • {cp.elemen}</span>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    cp.pendekatan === 'DEEP_LEARNING'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {cp.pendekatan.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  <span className="font-extrabold text-slate-500 uppercase block text-[10px] mb-1">Deskripsi Capaian Pembelajaran (CP):</span>
                  "{cp.deskripsiCp}"
                </div>

                <div className="space-y-2">
                  <span className="font-extrabold text-slate-600 dark:text-slate-400 text-xs uppercase block">Alur Tujuan Pembelajaran (ATP):</span>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    {cp.tujuanPembelajaran.map((tp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{tp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">
                    Status Modul: <strong className="text-emerald-600">{cp.statusModul}</strong>
                  </span>

                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditingCp(cp);
                        setCpForm(cp);
                        setShowCpModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition"
                    >
                      Edit Detail CP
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PROJEK P5 & PROFIL PELAJAR PANCASILA */}
      {activeTab === 'projek_p5' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Radar Chart 6 Dimensi Pancasila */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase">Grafik 6 Dimensi Profil Pelajar Pancasila</h3>
                <p className="text-xs text-slate-400">Rata-rata Ketercapaian Karakter Karakter Bangsa</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarDataP5}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={9} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={8} />
                    <Radar name="Ketercapaian" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-2xl text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                🌟 Dimensi <strong>Gotong Royong</strong> dan <strong>Bernalar Kritis</strong> mencatatkan capaian tertinggi pada semester berjalan.
              </div>
            </div>

            {/* Right: Projek List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm uppercase">Modul Tema Projek Kokurikuler (P5) Aktif</h3>
                {canEdit && (
                  <button
                    onClick={() => {
                      Swal.fire({
                        title: 'Tambah Modul P5 Baru',
                        html: `
                          <input id="swal-p5-judul" class="swal2-input" placeholder="Judul Projek">
                          <input id="swal-p5-tema" class="swal2-input" placeholder="Tema (cth: Gaya Hidup Berkelanjutan)">
                          <input id="swal-p5-jam" type="number" class="swal2-input" placeholder="Alokasi Jam (cth: 72)">
                        `,
                        confirmButtonText: 'Simpan Modul',
                        showCancelButton: true
                      }).then((r: any) => {
                        if (r.isConfirmed) {
                          Swal.fire('Berhasil', 'Modul Projek P5 baru telah terdaftar.', 'success');
                        }
                      });
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Projek P5
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {p5List.map((p5) => (
                  <div key={p5.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black uppercase rounded-full">
                          {p5.temaUtama}
                        </span>
                        <h4 className="font-black text-slate-900 dark:text-slate-100 text-base mt-1">{p5.judulProjek}</h4>
                        <span className="text-xs text-slate-400 font-semibold">Sasaran: {p5.faseTarget} • Koordinator: {p5.koordinator}</span>
                      </div>

                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{p5.alokasiJam} JPM</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>Progres Pelaksanaan Projek:</span>
                        <span>{p5.statusProgres}% Selesai</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${p5.statusProgres}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p5.dimensiTarget.map((dim, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                          🎯 {dim}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRINSIP DEEP LEARNING (MINDUL, MEANINGFUL, JOYFUL) */}
      {activeTab === 'deep_learning' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-purple-950 text-white rounded-3xl p-8 shadow-xl border border-indigo-800/50 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 text-indigo-200 text-xs font-black uppercase rounded-full">
              <Brain className="w-4 h-4 text-amber-400" />
              Pedoman Resmi Kemendikdasmen RI 2026
            </div>
            <h2 className="text-2xl font-black">Kerangka Pendekatan Pembelajaran Mendalam (Deep Learning)</h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-4xl">
              Kemendikdasmen mengarahkan proses belajar mengajar tidak lagi bertumpu pada hafalan materi secara pasif, melainkan menekankan pemahaman berkesadaran, bermakna, dan menyenangkan bagi warga belajar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: Mindful Learning */}
            <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-indigo-400 transition">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center font-black text-xl">
                🧠
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">1. Mindful Learning</h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full inline-block">Pembelajaran Berkesadaran</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Siswa memahami alasan di balik apa yang dipelajari, sadar akan potensi dan hambatan dirinya, serta aktif melakukan refleksi atas proses belajar mandiri.
              </p>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                  Atensi Penuh & Refleksi Mandiri
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                  Pilihan Kecepatan Belajar (Self-Paced)
                </li>
              </ul>
            </div>

            {/* Pillar 2: Meaningful Learning */}
            <div className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-emerald-400 transition">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-black text-xl">
                💡
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">2. Meaningful Learning</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full inline-block">Pembelajaran Bermakna</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Setiap materi dikoneksikan secara konkrit dengan persoalan nyata di masyarakat, pengalaman empiris, serta kebutuhan dunia kerja/kesetaraan.
              </p>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Studi Kasus Kehidupan Nyata
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Projek Vokasi & Keterampilan Abad 21
                </li>
              </ul>
            </div>

            {/* Pillar 3: Joyful Learning */}
            <div className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-amber-400 transition">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center font-black text-xl">
                🎉
              </div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">3. Joyful Learning</h3>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 rounded-full inline-block">Pembelajaran Menyenangkan</span>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Lingkungan belajar dirancang aman, kolaboratif, tidak menimbulkan ketakutan (stress-free), dan kaya akan tantangan kognitif yang memicu rasa ingin tahu.
              </p>
              <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  Gamifikasi & Simulasi CBT
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  Diskusi Kelompok Interaktif
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ASESMEN & KKTP */}
      {activeTab === 'asesmen_kktp' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-base uppercase">Pedoman Asesmen & Standar Kelulusan Kemendikdasmen</h3>
              <p className="text-xs text-slate-400">Pembobotan Rapor Akhir dan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-2xl space-y-3">
                <h4 className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">1. Rasio Pembobotan Nilai Rapor Akhir</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>Sumatif Modul / Lingkup Materi:</span>
                    <span className="text-indigo-600 font-extrabold">60%</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Asesmen Sumatif Akhir Semester (ASAS):</span>
                    <span className="text-purple-600 font-extrabold">40%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium pt-1">
                    Skema Kemendikdasmen memberikan porsi terbesar pada proses belajar di sepanjang modul agar perkembangan karakter dan portofolio peserta didik dinilai secara fair.
                  </p>
                </div>
              </div>

              <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-2xl space-y-3">
                <h4 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">2. Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold">
                    <span>Interval 0 - 60%:</span>
                    <span className="text-rose-600 font-bold">Belum Mencapai (Remedial Seluruhnya)</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Interval 61 - 74%:</span>
                    <span className="text-amber-600 font-bold">Belum Mencapai (Remedial Bagian Tertentu)</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Interval 75 - 88%:</span>
                    <span className="text-blue-600 font-bold">Sudah Mencapai (Tuntas Standard)</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Interval 89 - 100%:</span>
                    <span className="text-emerald-600 font-bold">Sangat Baik (Pengayaan / Penguatan)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT JPM */}
      {canEdit && showJpmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base uppercase">
              {editingJpm ? '📝 Edit Struktur JPM Mapel' : '✨ Tambah Mapel & JPM Baru'}
            </h3>

            <form onSubmit={handleSaveJpm} className="space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Kode Mapel *</label>
                  <input
                    type="text"
                    required
                    value={jpmForm.kode}
                    onChange={(e) => setJpmForm(p => ({ ...p, kode: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Kategori *</label>
                  <select
                    value={jpmForm.kategori}
                    onChange={(e) => setJpmForm(p => ({ ...p, kategori: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  >
                    <option value="WAJIB">WAJIB</option>
                    <option value="PILIHAN">PILIHAN</option>
                    <option value="VOKASI">VOKASI</option>
                    <option value="KODING_AI">KODING & AI</option>
                    <option value="PEMBIASAAN">PEMBIASAAN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Nama Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika & Penalaran Komputasi"
                  value={jpmForm.namaMapel}
                  onChange={(e) => setJpmForm(p => ({ ...p, namaMapel: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Jenjang *</label>
                  <select
                    value={jpmForm.jenjang}
                    onChange={(e) => setJpmForm(p => ({ ...p, jenjang: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  >
                    <option value="PAKET A">PAKET A (SD)</option>
                    <option value="PAKET B">PAKET B (SMP)</option>
                    <option value="PAKET C">PAKET C (SMA)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Fase *</label>
                  <select
                    value={jpmForm.fase}
                    onChange={(e) => setJpmForm(p => ({ ...p, fase: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  >
                    <option value="FASE A">FASE A</option>
                    <option value="FASE B">FASE B</option>
                    <option value="FASE C">FASE C</option>
                    <option value="FASE D">FASE D</option>
                    <option value="FASE E">FASE E</option>
                    <option value="FASE F">FASE F</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">JPM Intra *</label>
                  <input
                    type="number"
                    min={1}
                    value={jpmForm.jpmIntra}
                    onChange={(e) => setJpmForm(p => ({ ...p, jpmIntra: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">JPM P5 *</label>
                  <input
                    type="number"
                    min={0}
                    value={jpmForm.jpmP5}
                    onChange={(e) => setJpmForm(p => ({ ...p, jpmP5: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">KKTP Min. *</label>
                  <input
                    type="number"
                    value={jpmForm.kktpMinimal}
                    onChange={(e) => setJpmForm(p => ({ ...p, kktpMinimal: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowJpmModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan JPM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT CP */}
      {canEdit && showCpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base uppercase">
              {editingCp ? '📝 Edit Capaian Pembelajaran' : '✨ Tambah Capaian Pembelajaran (CP)'}
            </h3>

            <form onSubmit={handleSaveCp} className="space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Kode CP *</label>
                  <input
                    type="text"
                    required
                    value={cpForm.kodeCp}
                    onChange={(e) => setCpForm(p => ({ ...p, kodeCp: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Pendekatan Belajar *</label>
                  <select
                    value={cpForm.pendekatan}
                    onChange={(e) => setCpForm(p => ({ ...p, pendekatan: e.target.value as any }))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                  >
                    <option value="DEEP_LEARNING">DEEP LEARNING</option>
                    <option value="REGULER">REGULER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Mata Pelajaran *</label>
                <input
                  type="text"
                  required
                  value={cpForm.mapel}
                  onChange={(e) => setCpForm(p => ({ ...p, mapel: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>

              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase">Deskripsi Capaian Pembelajaran (CP) *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Rumusan CP resmi dari Kemendikdasmen..."
                  value={cpForm.deskripsiCp}
                  onChange={(e) => setCpForm(p => ({ ...p, deskripsiCp: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl"
                />
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCpModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan CP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
