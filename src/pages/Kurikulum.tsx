import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, Award, Sparkles, GraduationCap, 
  FileText, ShieldCheck, Zap, Layers, Compass, Brain,
  Printer, CheckCircle2, Target, Search, Download, ListOrdered, Filter,
  RefreshCw, CloudUpload, CloudDownload, Plus, Edit3, Trash2, Check, AlertCircle,
  Database, ArrowRight, ExternalLink, Link2, Sparkle
} from 'lucide-react';
import { useStore } from '../store';
import { triggerPrint } from '../lib/utils';
import { 
  OFFICIAL_CP_ATP_DATA, 
  CpAtpItem, 
  getFilteredCpAtp,
  generateCpAtpListFromKurikulumModul,
  convertKurikulumModulToCpAtp
} from '../data/cpAtpData';
import { exportToExcel } from '../lib/excel';
import { db } from '../data/db';
import { fetchFromGAS } from '../lib/api';
import { DEFAULT_APP_CONFIG } from '../data/config';
import { getMasterClassDropdown, getMasterTahunAjaranDropdown, getMasterSemesterDropdown, setActiveTahunAjaranAndSemesterSync } from '../utils/masterDropdowns';

interface KurikulumProps {
  user?: any;
  isPublicView?: boolean;
}

export default function Kurikulum({ user, isPublicView }: KurikulumProps) {
  const [activeTab, setActiveTab] = useState<'struktur' | 'kemendikdasmen' | 'p5' | 'deeplearning' | 'cp_atp'>('struktur');
  const [cpSearch, setCpSearch] = useState('');
  const [selectedFase, setSelectedFase] = useState('SEMUA');
  const [selectedMapel, setSelectedMapel] = useState('SEMUA');
  const [selectedSemester, setSelectedSemester] = useState('SEMUA');

  // State Dataset CP & ATP (Terhubung dengan KURIKULUM_MODUL & Database)
  const [cpList, setCpList] = useState<CpAtpItem[]>(() => {
    const fromDb = db.get('cp_atp');
    if (Array.isArray(fromDb) && fromDb.length > 0) {
      return fromDb;
    }
    const modulDb = db.get('kurikulum_modul') || [];
    const silabusDb = db.get('master_silabus') || [];
    const synthesized = generateCpAtpListFromKurikulumModul(modulDb, silabusDb);
    db.set('cp_atp', synthesized);
    return synthesized;
  });

  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Modal Add / Edit CP_ATP
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<CpAtpItem | null>(null);
  const [formData, setFormData] = useState<Partial<CpAtpItem>>({
    CpaID: '',
    Mapel: 'Matematika',
    Fase: 'Fase B',
    Elemen: 'Bilangan & Operasi Hitung',
    CapaianPembelajaran: '',
    TujuanPembelajaran: '',
    AlurTujuan: '',
    Kelas: 'Kelas 4',
    Semester: 'Ganjil',
    Jenjang: 'SD / Paket A',
    AlokasiWaktuJP: 36,
    MateriPokok: ''
  });

  // Modal Informasi Integrasi Modul
  const [showIntegrationSummary, setShowIntegrationSummary] = useState(false);
  const [integrationStats, setIntegrationStats] = useState<{ totalModul: number; totalCpGenerated: number } | null>(null);

  const { settings, setSettings } = useStore();

  const schoolName = settings.schoolName || 'ROMBEL KARANG TARUNA TAMBORA';
  const schoolAddress = settings.schoolAddress || 'Kelurahan Tambora, Kec. Tambora, Jakarta Barat';
  const currentTP = settings.tahunPelajaran || '2026/2027';
  const currentSem = (settings.semester === 'Genap' ? 'Genap' : 'Ganjil') as 'Ganjil' | 'Genap';
  const headmasterName = settings.headmasterName || 'Kepala Sekolah';
  const headmasterNip = settings.headmasterNip || '-';

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Selalu pantau perubahan Tahun Pelajaran & Semester dari seluruh penjuru sistem
  useEffect(() => {
    const handleSync = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('academic-semester-changed', handleSync);
    window.addEventListener('erp-db-updated', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('academic-semester-changed', handleSync);
      window.removeEventListener('erp-db-updated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  const masterTA = useMemo(() => getMasterTahunAjaranDropdown(), [settings.tahunPelajaran, refreshTrigger]);
  const masterClass = useMemo(() => getMasterClassDropdown(), [refreshTrigger]);

  const handleKurikulumSemesterChange = async (newTP: string, newSem: 'Ganjil' | 'Genap') => {
    const cleanTP = (newTP || '2026/2027').trim();
    const cleanSem = newSem === 'Genap' ? 'Genap' : 'Ganjil';
    const updatedSettings = {
      ...settings,
      tahunPelajaran: cleanTP,
      semester: cleanSem,
      activeAcademicYear: cleanTP,
      activeSemester: cleanSem
    };
    setSettings(updatedSettings);
    db.setSingle('settings', updatedSettings);
    await setActiveTahunAjaranAndSemesterSync(cleanTP, cleanSem);
    setRefreshTrigger(prev => prev + 1);
  };

  // Jumlah modul yang terdeteksi di local database
  const countModulInDb = useMemo(() => {
    const list = db.get('kurikulum_modul');
    return Array.isArray(list) ? list.length : 0;
  }, [cpList]);

  // Filtered CP ATP List
  const filteredCpList = useMemo(() => {
    let list = [...cpList];

    if (selectedFase && selectedFase !== 'SEMUA') {
      list = list.filter(i => (i.Fase || '').toLowerCase() === selectedFase.toLowerCase());
    }

    if (selectedMapel && selectedMapel !== 'SEMUA') {
      list = list.filter(i => (i.Mapel || '').toLowerCase().includes(selectedMapel.toLowerCase()));
    }

    if (selectedSemester && selectedSemester !== 'SEMUA') {
      list = list.filter(i => (i.Semester || '').toLowerCase().includes(selectedSemester.toLowerCase()));
    }

    if (cpSearch && cpSearch.trim() !== '') {
      const q = cpSearch.toLowerCase().trim();
      list = list.filter(i => 
        (i.Mapel || '').toLowerCase().includes(q) ||
        (i.Elemen || '').toLowerCase().includes(q) ||
        (i.CapaianPembelajaran || '').toLowerCase().includes(q) ||
        (i.TujuanPembelajaran || '').toLowerCase().includes(q) ||
        (i.AlurTujuan || '').toLowerCase().includes(q) ||
        (i.CpaID || '').toLowerCase().includes(q) ||
        (i.MateriPokok && i.MateriPokok.toLowerCase().includes(q))
      );
    }

    return list;
  }, [cpList, selectedFase, selectedMapel, selectedSemester, cpSearch]);

  const distinctMapelList = useMemo(() => {
    return Array.from(new Set(cpList.map(i => i.Mapel).filter(Boolean))).sort();
  }, [cpList]);

  // Handler: Generate / Sinkronkan Otomatis dari KURIKULUM_MODUL
  const handleSyncFromKurikulumModul = () => {
    try {
      const modulDb = db.get('kurikulum_modul') || [];
      const silabusDb = db.get('master_silabus') || [];

      const totalModul = Array.isArray(modulDb) ? modulDb.length : 0;
      const synthesized = generateCpAtpListFromKurikulumModul(modulDb, silabusDb);

      db.set('cp_atp', synthesized);
      setCpList(synthesized);

      setIntegrationStats({
        totalModul: totalModul,
        totalCpGenerated: synthesized.length
      });
      setShowIntegrationSummary(true);

      setSyncToast({
        type: 'success',
        message: `Berhasil mengintegrasikan ${totalModul} modul dari KURIKULUM_MODUL ke dalam ${synthesized.length} Capaian & Alur Pembelajaran (CP/ATP)!`
      });

      setTimeout(() => setSyncToast(null), 7000);
    } catch (err: any) {
      console.error("Gagal mengintegrasikan KURIKULUM_MODUL:", err);
      setSyncToast({
        type: 'error',
        message: `Gagal mengintegrasikan modul: ${err?.message || err}`
      });
    }
  };

  // Handler: Kirim / Simpan Data CP_ATP ke Google Spreadsheet Sheet "CP_ATP"
  const handlePushToGoogleSheets = async () => {
    const scriptUrl = settings?.scriptUrl || settings?.gasUrl || DEFAULT_APP_CONFIG.gasUrl;
    if (!scriptUrl) {
      alert('URL Google Apps Script belum dikonfigurasi. Silakan simpan URL Web App Anda di menu Pengaturan.');
      return;
    }

    if (!confirm(`Simpan & Sinkronkan ${cpList.length} data CP & ATP ke Google Spreadsheet (Sheet 'CP_ATP')?`)) {
      return;
    }

    setIsSyncingSheets(true);
    setSyncToast({
      type: 'info',
      message: `Mengunggah ${cpList.length} data ke sheet CP_ATP di Google Spreadsheet...`
    });

    try {
      // 1. Simpan ke database lokal
      db.set('cp_atp', cpList);

      // 2. Format 9 Kolom Resmi CP_ATP
      const formattedRows = cpList.map((item, idx) => ({
        CpaID: item.CpaID || `CP-${idx + 1}`,
        Mapel: item.Mapel || 'Umum',
        Fase: item.Fase || 'Fase B',
        Elemen: item.Elemen || 'Pemahaman Konsep',
        CapaianPembelajaran: item.CapaianPembelajaran || '-',
        TujuanPembelajaran: item.TujuanPembelajaran || '-',
        AlurTujuan: item.AlurTujuan || '-',
        Kelas: item.Kelas || 'Kelas 4',
        Semester: item.Semester || 'Ganjil'
      }));

      // 3. Panggil API GAS
      const res = await fetchFromGAS(scriptUrl, {
        action: 'SYNC_SHEET',
        sheetName: 'CP_ATP',
        table: 'CP_ATP',
        data: formattedRows,
        append: false
      });

      if (res?.status === 'error' || res?.error) {
        throw new Error(res.message || res.error || 'Gagal sinkron ke Google Sheet');
      }

      setSyncToast({
        type: 'success',
        message: `✅ Sukses! ${formattedRows.length} baris data CP & ATP berhasil disimpan di Google Spreadsheet (Sheet CP_ATP).`
      });
      setTimeout(() => setSyncToast(null), 8000);
    } catch (err: any) {
      console.error("Gagal menyimpan ke Google Spreadsheet:", err);
      setSyncToast({
        type: 'error',
        message: `Pemberitahuan: Data telah disimpan di database lokal. Koneksi Google Sheet: ${err?.message || 'Pastikan script GAS sudah di-deploy'}`
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Handler: Tarik Data Langsung dari Google Spreadsheet Sheet "CP_ATP"
  const handlePullFromGoogleSheets = async () => {
    const scriptUrl = settings?.scriptUrl || settings?.gasUrl || DEFAULT_APP_CONFIG.gasUrl;
    if (!scriptUrl) {
      alert('URL Google Apps Script belum dikonfigurasi. Silakan simpan URL Web App Anda di menu Pengaturan.');
      return;
    }

    setIsSyncingSheets(true);
    setSyncToast({
      type: 'info',
      message: 'Menghubungkan dan mengambil data dari sheet CP_ATP di Google Spreadsheet...'
    });

    try {
      const res = await fetchFromGAS(scriptUrl, {
        action: 'GET_SHEET',
        sheetName: 'CP_ATP'
      });

      let pulled: any[] = [];
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        pulled = res.data;
      } else if (res && Array.isArray(res) && res.length > 0) {
        pulled = res;
      }

      if (pulled.length > 0) {
        const normalized: CpAtpItem[] = pulled.map((p, idx) => ({
          CpaID: p.CpaID || p.id || `CP-${idx + 1}`,
          Mapel: p.Mapel || p.mapel || 'Matematika',
          Fase: p.Fase || p.fase || 'Fase B',
          Elemen: p.Elemen || p.elemen || 'Pemahaman Konsep',
          CapaianPembelajaran: p.CapaianPembelajaran || p.capaian || p.cp || '-',
          TujuanPembelajaran: p.TujuanPembelajaran || p.tujuan || p.tp || '-',
          AlurTujuan: p.AlurTujuan || p.alur || p.atp || '-',
          Kelas: p.Kelas || p.kelas || 'Kelas 4',
          Semester: p.Semester || p.semester || 'Ganjil',
          Jenjang: p.Jenjang || 'SD / Paket A',
          AlokasiWaktuJP: Number(p.AlokasiWaktuJP) || 36,
          MateriPokok: p.MateriPokok || ''
        }));

        db.set('cp_atp', normalized);
        setCpList(normalized);

        setSyncToast({
          type: 'success',
          message: `Berhasil memuat ${normalized.length} data CP & ATP dari Google Spreadsheet!`
        });
      } else {
        setSyncToast({
          type: 'info',
          message: 'Sheet CP_ATP di Google Spreadsheet masih kosong. Anda dapat mengisi dengan mengklik tombol "⚡ Integrasikan & Generate dari KURIKULUM_MODUL" lalu klik "Simpan ke Sheet".'
        });
      }
      setTimeout(() => setSyncToast(null), 8000);
    } catch (err: any) {
      console.error("Gagal menarik data CP_ATP:", err);
      setSyncToast({
        type: 'error',
        message: `Gagal mengambil data dari Google Spreadsheet: ${err?.message || err}`
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Handler: Tambah / Edit CP ATP Manual
  const handleSaveAddEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Mapel || !formData.CapaianPembelajaran) {
      alert('Mohon lengkapi Mata Pelajaran dan Capaian Pembelajaran.');
      return;
    }

    let updated: CpAtpItem[];
    if (modalMode === 'edit' && editingItem) {
      updated = cpList.map(item => item.CpaID === editingItem.CpaID ? {
        ...item,
        ...formData,
        CpaID: item.CpaID
      } as CpAtpItem : item);
    } else {
      const newId = formData.CpaID?.trim() || `CP-${(formData.Mapel || 'MP').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      const newItem: CpAtpItem = {
        CpaID: newId,
        Mapel: formData.Mapel || 'Matematika',
        Fase: formData.Fase || 'Fase B',
        Elemen: formData.Elemen || 'Pemahaman Konsep',
        CapaianPembelajaran: formData.CapaianPembelajaran || '-',
        TujuanPembelajaran: formData.TujuanPembelajaran || '-',
        AlurTujuan: formData.AlurTujuan || '-',
        Kelas: formData.Kelas || 'Kelas 4',
        Semester: formData.Semester as any || 'Ganjil',
        Jenjang: formData.Jenjang || 'SD / Paket A',
        AlokasiWaktuJP: Number(formData.AlokasiWaktuJP) || 36,
        MateriPokok: formData.MateriPokok || ''
      };
      updated = [newItem, ...cpList];
    }

    db.set('cp_atp', updated);
    setCpList(updated);
    setModalMode(null);
    setEditingItem(null);

    setSyncToast({
      type: 'success',
      message: `Data Capaian Pembelajaran (${formData.Mapel}) berhasil disimpan!`
    });
    setTimeout(() => setSyncToast(null), 5000);
  };

  const handleDeleteItem = (cpaId: string) => {
    if (!confirm(`Hapus data CP dengan ID ${cpaId}?`)) return;
    const updated = cpList.filter(i => i.CpaID !== cpaId);
    db.set('cp_atp', updated);
    setCpList(updated);
    setSyncToast({
      type: 'info',
      message: `Item CP ${cpaId} telah dihapus dari database.`
    });
    setTimeout(() => setSyncToast(null), 4000);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      CpaID: '',
      Mapel: 'Matematika',
      Fase: 'Fase B',
      Elemen: 'Bilangan & Operasi Hitung',
      CapaianPembelajaran: '',
      TujuanPembelajaran: '',
      AlurTujuan: '',
      Kelas: 'Kelas 4',
      Semester: 'Ganjil',
      Jenjang: 'SD / Paket A',
      AlokasiWaktuJP: 36,
      MateriPokok: ''
    });
    setModalMode('add');
  };

  const openEditModal = (item: CpAtpItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setModalMode('edit');
  };

  const handleExportCpAtp = () => {
    const exportData = filteredCpList.map((item, idx) => ({
      No: idx + 1,
      ID_CPA: item.CpaID,
      Mata_Pelajaran: item.Mapel,
      Fase: item.Fase,
      Jenjang: item.Jenjang || 'SD/SMP/SMA',
      Kelas: item.Kelas,
      Semester: item.Semester,
      Elemen: item.Elemen,
      Materi_Pokok: item.MateriPokok || '-',
      Capaian_Pembelajaran_CP: item.CapaianPembelajaran,
      Tujuan_Pembelajaran_TP: item.TujuanPembelajaran,
      Alur_Tujuan_ATP: item.AlurTujuan,
      Alokasi_Waktu_JP: item.AlokasiWaktuJP || 36
    }));
    exportToExcel(exportData, `Capaian_dan_Alur_Pembelajaran_CP_ATP_${new Date().toISOString().slice(0, 10)}.xlsx`, 'CP_ATP');
  };

  return (
    <div id="printable-area" className="printable-container py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 print:p-0 print:m-0 print:space-y-4 print:max-w-none print:w-full print:bg-white text-slate-900">
      
      {/* KOP SURAT RESMI (HANYA MUNCUL SAAT DICETAK) */}
      <div className="hidden print:block border-b-2 border-black pb-3 mb-4">
        <div className="flex items-center gap-4">
          {settings.schoolLogoUrl ? (
            <img 
              src={settings.schoolLogoUrl} 
              alt="Logo Sekolah" 
              className="w-20 h-20 object-contain flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 border border-black rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0">
              LOGO
            </div>
          )}
          <div className="text-center flex-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider">KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH</h3>
            <h2 className="text-base font-black uppercase tracking-wide leading-tight">{schoolName}</h2>
            <p className="text-[10px] text-gray-700 leading-tight mt-0.5">{schoolAddress}</p>
            <p className="text-[9px] text-gray-600">NPSN: {settings.schoolNpsn || '69900000'} • Email: {settings.schoolEmail || 'sekolah@kemdikbud.go.id'} • Website: {settings.schoolWebsite || 'https://tambora.sch.id'}</p>
          </div>
        </div>
        <div className="w-full border-t border-black mt-1.5 pt-0.5 text-center">
          <span className="text-[11px] font-black uppercase tracking-widest underline">
            DOKUMEN KURIKULUM SATUAN PENDIDIKAN (KSP) TAHUN AJARAN {currentTP}
          </span>
          <p className="text-[9px] italic text-gray-700">Implementasi Kurikulum Merdeka Berdasarkan Permendikdasmen No. 12/2024 & Pendekatan Deep Learning</p>
        </div>
      </div>

      {/* Screen Header (Disembunyikan saat dicetak) */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 p-6 rounded-3xl border border-slate-200 shadow-xs no-print">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-indigo-100/80 inline-block">
            Standar Kurikulum Nasional Kemendikdasmen Terbaru
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Kurikulum Merdeka & Pendekatan Deep Learning
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Mengimplementasikan kerangka regulasi Permendikdasmen No. 12/2024, penyelarasan Capaian Pembelajaran (CP BSKAP 032/2024), serta prinsip <em>Mindful, Meaningful, & Joyful Learning</em>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 no-print flex-shrink-0">
          {/* Interactive Semester & Tahun Ajaran Selector (Tersinkronisasi Sistem) */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50/80 border border-indigo-200/90 p-1.5 sm:p-2 rounded-2xl shadow-2xs">
            <div className="relative flex items-center">
              <select
                value={settings.tahunPelajaran || masterTA.activeYear}
                onChange={(e) => handleKurikulumSemesterChange(e.target.value, currentSem)}
                className="bg-white text-indigo-950 font-black text-xs pl-2.5 pr-6 py-1.5 rounded-xl border border-indigo-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none"
                title={`Pilih Tahun Pelajaran (Sumber: ${masterTA.info.source === 'SHEET_DATABASE' ? 'Sheet TAHUN_AJARAN' : 'Standar Kemendikdasmen'})`}
              >
                {masterTA.years.map((year) => (
                  <option key={year} value={year}>
                    T.A {year} {year === masterTA.activeYear ? '★ (Aktif)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 pointer-events-none text-indigo-600 text-[10px]">▼</div>
            </div>

            <div className="flex items-center bg-white rounded-xl border border-indigo-300 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleKurikulumSemesterChange(settings.tahunPelajaran || masterTA.activeYear, 'Ganjil')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  currentSem === 'Ganjil'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'
                }`}
                title="Pilih Semester Ganjil"
              >
                Ganjil
              </button>
              <button
                type="button"
                onClick={() => handleKurikulumSemesterChange(settings.tahunPelajaran || masterTA.activeYear, 'Genap')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  currentSem === 'Genap'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-indigo-700 hover:bg-indigo-50'
                }`}
                title="Pilih Semester Genap"
              >
                Genap
              </button>
            </div>
          </div>

          <button
            onClick={triggerPrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition cursor-pointer active:scale-95"
            title="Cetak Seluruh Dokumen Kurikulum Resmi"
          >
            <Printer size={15} />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs (Disembunyikan saat dicetak) */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 pb-3 no-print">
        <button
          onClick={() => setActiveTab('struktur')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'struktur' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <BookOpen size={14} />
          <span>Struktur Kurikulum & Fase</span>
        </button>

        <button
          onClick={() => setActiveTab('kemendikdasmen')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'kemendikdasmen' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShieldCheck size={14} />
          <span>Regulasi & Kebijakan Kemendikdasmen</span>
        </button>

        <button
          onClick={() => setActiveTab('deeplearning')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'deeplearning' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Brain size={14} />
          <span>Pendekatan Deep Learning</span>
        </button>

        <button
          onClick={() => setActiveTab('cp_atp')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'cp_atp' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Target size={14} />
          <span>Capaian & Alur Pembelajaran (CP/ATP)</span>
        </button>

        <button
          onClick={() => setActiveTab('p5')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'p5' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles size={14} />
          <span>Projek P5 & Karakter</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* KONTEN DOKUMEN: INTERAKTIF (LAYAR) DAN LENGKAP SEMUA BAB (KETIKA DICETAK) */}
      {/* ========================================================================= */}

      {/* BAB I: STRUKTUR KURIKULUM & FASE */}
      <section className={`${activeTab === 'struktur' ? 'block' : 'hidden print:block'} space-y-4 print:space-y-2`}>
        <div className="flex items-center gap-2 border-b border-indigo-200 pb-1.5 print:border-black">
          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center print:bg-black">1</span>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            BAB I: Struktur Kurikulum & Alokasi Beban Belajar
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
          {/* Fase A */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 print:border-black print:p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Fase A (Kelas 1 & 2)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200 print:border-black print:bg-transparent print:text-black">
                ~28 JP / Minggu
              </span>
            </div>
            <p className="text-xs print:text-[9pt] text-slate-600 print:text-black leading-relaxed">
              Fokus pondasi literasi dasar, kesadaran fonik, pengenalan numerasi konkret, pengenalan emosi diri, serta pembiasaan adab dan disiplin positif.
            </p>
            <div className="pt-2 border-t border-slate-100 print:border-gray-400 text-[11px] print:text-[8pt] text-slate-700">
              <strong>Mata Pelajaran Utama:</strong> Pendidikan Agama & Budi Pekerti, Pendidikan Pancasila, Bahasa Indonesia, Matematika, PJOK, Seni & Budaya.
            </div>
          </div>

          {/* Fase B */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 print:border-black print:p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Fase B (Kelas 3 & 4)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200 print:border-black print:bg-transparent print:text-black">
                ~32 JP / Minggu
              </span>
            </div>
            <p className="text-xs print:text-[9pt] text-slate-600 print:text-black leading-relaxed">
              Penguatan literasi naratif & informasional, IPAS dasar (lingkungan sekitar & sains sederhana), penalaran matematis terstruktur, dan kolaborasi kelompok.
            </p>
            <div className="pt-2 border-t border-slate-100 print:border-gray-400 text-[11px] print:text-[8pt] text-slate-700">
              <strong>Mata Pelajaran Utama:</strong> PAI/Agama, Pend. Pancasila, B. Indonesia, Matematika, IPAS, PJOK, Seni Budaya, Bahasa Inggris (Pilihan).
            </div>
          </div>

          {/* Fase C */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 print:border-black print:p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Fase C (Kelas 5 & 6)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 print:border-black print:bg-transparent print:text-black">
                ~32 JP / Minggu
              </span>
            </div>
            <p className="text-xs print:text-[9pt] text-slate-600 print:text-black leading-relaxed">
              Berpikir kritis (HOTS), pengenalan literasi komputasional & logika koding dasar, eksperimen ilmiah terpadu, kepemimpinan, dan kesiapan transisi SMP.
            </p>
            <div className="pt-2 border-t border-slate-100 print:border-gray-400 text-[11px] print:text-[8pt] text-slate-700">
              <strong>Mata Pelajaran Utama:</strong> Agama, Pend. Pancasila, B. Indonesia, Matematika, IPAS, PJOK, Seni Budaya, B. Inggris, Muatan Lokal.
            </div>
          </div>
        </div>
      </section>

      {/* BAB II: REGULASI & KEBIJAKAN KEMENDIKDASMEN TERBARU */}
      <section className={`${activeTab === 'kemendikdasmen' ? 'block' : 'hidden print:block'} space-y-4 print:space-y-2 print:pt-2`}>
        <div className="flex items-center gap-2 border-b border-indigo-200 pb-1.5 print:border-black">
          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center print:bg-black">2</span>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            BAB II: Kerangka Regulasi Kemendikdasmen Terbaru
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 print:border-black print:bg-white print:p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs print:text-[9pt] text-indigo-700 print:text-black">Permendikdasmen No. 12 Tahun 2024</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded print:border print:border-black print:bg-transparent print:text-black">Regulasi Utama</span>
            </div>
            <p className="text-xs print:text-[8.5pt] text-slate-600 print:text-black leading-tight">
              Menetapkan Kurikulum Merdeka secara resmi sebagai Kurikulum Nasional pada jenjang PAUD, Pendidikan Dasar, dan Menengah secara merata dan inklusif.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 print:border-black print:bg-white print:p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs print:text-[9pt] text-indigo-700 print:text-black">Keputusan BSKAP No. 032/H/KR/2024</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded print:border print:border-black print:bg-transparent print:text-black">Capaian CP</span>
            </div>
            <p className="text-xs print:text-[8.5pt] text-slate-600 print:text-black leading-tight">
              Pembaruan Capaian Pembelajaran (CP) komprehensif pada Fase Fondasi, Fase A, Fase B, hingga Fase F untuk adaptasi tantangan masa depan.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 print:border-black print:bg-white print:p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs print:text-[9pt] text-indigo-700 print:text-black">Panduan Pembelajaran & Asesmen (PPA 2024)</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded print:border print:border-black print:bg-transparent print:text-black">Pedoman Teknis</span>
            </div>
            <p className="text-xs print:text-[8.5pt] text-slate-600 print:text-black leading-tight">
              Standarisasi asesmen formatif berkelanjutan, asesmen sumatif (STS & SAS), KKTP (Kriteria Ketercapaian TP), dan pelaporan deskripsi capaian rapor.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 print:border-black print:bg-white print:p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs print:text-[9pt] text-indigo-700 print:text-black">Penguatan Matematika & Coding Sejak Dini</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded print:border print:border-black print:bg-transparent print:text-black">Program {currentTP}</span>
            </div>
            <p className="text-xs print:text-[8.5pt] text-slate-600 print:text-black leading-tight">
              Arahan Menteri Pendidikan Dasar dan Menengah terkait penguatan numerasi aplikatif, computational thinking, dan literasi digital beretika.
            </p>
          </div>
        </div>
      </section>

      {/* BAB III: PENDEKATAN DEEP LEARNING */}
      <section className={`${activeTab === 'deeplearning' ? 'block' : 'hidden print:block'} space-y-4 print:space-y-2 print:pt-2`}>
        <div className="flex items-center gap-2 border-b border-indigo-200 pb-1.5 print:border-black">
          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center print:bg-black">3</span>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            BAB III: Pendekatan Pembelajaran Mendalam (Deep Learning)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 print:border-black print:bg-white print:p-2.5 space-y-1">
            <h4 className="font-black text-slate-900 text-xs print:text-[9pt] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center print:bg-black">1</span>
              Mindful Learning
            </h4>
            <p className="text-xs print:text-[8.5pt] text-slate-600 print:text-black leading-relaxed">
              Pembelajaran berkesadaran penuh: siswa memahami esensi dan makna materi, hadir secara psikologis, aktif berefleksi, dan bebas dari intimidasi belajar.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 print:border-black print:bg-white print:p-2.5 space-y-1">
            <h4 className="font-black text-slate-900 text-xs print:text-[9pt] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center print:bg-black">2</span>
              Meaningful Learning
            </h4>
            <p className="text-xs print:text-[8.5pt] text-slate-600 print:text-black leading-relaxed">
              Pembelajaran bermakna: konsep ilmu dihubungkan langsung dengan realitas kehidupan nyata peserta didik, lingkungan sosial, dan pemecahan masalah praktis.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 print:border-black print:bg-white print:p-2.5 space-y-1">
            <h4 className="font-black text-slate-900 text-xs print:text-[9pt] flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center print:bg-black">3</span>
              Joyful Learning
            </h4>
            <p className="text-xs print:text-[8.5pt] text-slate-600 print:text-black leading-relaxed">
              Pembelajaran menggembirakan: atmosfer belajar interaktif yang memicu rasa ingin tahu alami melalui eksperimen, gamifikasi edukatif, dan ruang berekspresi.
            </p>
          </div>
        </div>
      </section>

      {/* BAB IV: CAPAIAN PEMBELAJARAN (CP) & ALUR TUJUAN PEMBELAJARAN (ATP) */}
      <section className={`${activeTab === 'cp_atp' ? 'block' : 'hidden print:block'} space-y-4 print:space-y-3 print:pt-2`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200 pb-2 print:border-black">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center print:bg-black">4</span>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                BAB IV: Capaian Pembelajaran (CP) & Alur Tujuan Pembelajaran (ATP)
              </h3>
              <p className="text-[11px] text-slate-500 print:text-[8pt]">
                Keputusan Kepala BSKAP No. 032/H/KR/2024 • Integrasi Dinamis dengan Sheet <strong>KURIKULUM_MODUL</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              onClick={handleExportCpAtp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              title="Unduh seluruh data CP & ATP dalam format Excel"
            >
              <Download size={13} />
              <span>Ekspor Excel CP/ATP</span>
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              title="Tambah Capaian Pembelajaran baru"
            >
              <Plus size={13} />
              <span>Tambah CP Baru</span>
            </button>
          </div>
        </div>

        {/* Panel Integrasi Spreadsheet & KURIKULUM_MODUL (No-Print) */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-purple-50 border border-indigo-200/80 rounded-2xl shadow-xs space-y-3 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-300">
                <Database size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-extrabold text-slate-900">
                    Sinkronisasi Data Sheet: <span className="text-indigo-700">KURIKULUM_MODUL ➔ CP_ATP</span>
                  </h4>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full flex items-center gap-1">
                    <Sparkles size={10} /> Auto-Generate
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Sistem otomatis mengubah modul topik KBM di sheet <code>KURIKULUM_MODUL</code> menjadi formulasi resmi <strong>Capaian Pembelajaran (CP)</strong>, <strong>Tujuan Pembelajaran (TP)</strong>, dan <strong>Alur Tujuan Pembelajaran (ATP)</strong> berbasis fase nasional.
                </p>
              </div>
            </div>

            {/* Action Sync Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleSyncFromKurikulumModul}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-200 transition cursor-pointer active:scale-95"
                title="Generate & perbarui CP/ATP langsung dari data sheet KURIKULUM_MODUL"
              >
                <RefreshCw size={13} className="shrink-0" />
                <span>⚡ Integrasikan dari KURIKULUM_MODUL</span>
              </button>

              <button
                onClick={handlePushToGoogleSheets}
                disabled={isSyncingSheets}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
                title="Kirim dan simpan data CP/ATP ke sheet CP_ATP di Google Spreadsheet"
              >
                <CloudUpload size={13} className="shrink-0" />
                <span>☁️ Simpan ke Sheet CP_ATP</span>
              </button>

              <button
                onClick={handlePullFromGoogleSheets}
                disabled={isSyncingSheets}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 disabled:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                title="Tarik data CP_ATP langsung dari Google Spreadsheet"
              >
                <CloudDownload size={13} className="shrink-0 text-slate-600" />
                <span>📥 Tarik Sheet</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100 text-[11px] text-slate-500">
            <div className="flex items-center gap-3">
              <span>Modul Terdeteksi di Local DB: <strong className="text-slate-900">{countModulInDb} Modul</strong></span>
              <span>•</span>
              <span>Total CP & ATP Aktif: <strong className="text-indigo-700">{cpList.length} Capaian</strong></span>
            </div>
            <div className="text-[10px] text-slate-400 italic">
              Format 9 Kolom Standar: CpaID, Mapel, Fase, Elemen, CapaianPembelajaran, TujuanPembelajaran, AlurTujuan, Kelas, Semester
            </div>
          </div>
        </div>

        {/* Ringkasan Statistik Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Total CP Terdata</p>
            <p className="text-xl font-black text-indigo-900 mt-0.5">{cpList.length} Capaian</p>
          </div>
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Mata Pelajaran</p>
            <p className="text-xl font-black text-emerald-900 mt-0.5">{distinctMapelList.length} Mapel</p>
          </div>
          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Cakupan Fase</p>
            <p className="text-xl font-black text-amber-900 mt-0.5">Fase A - Fase F</p>
          </div>
          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl">
            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Hasil Filter</p>
            <p className="text-xl font-black text-purple-900 mt-0.5">{filteredCpList.length} Item</p>
          </div>
        </div>

        {/* Filter Controls (No-Print) */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 no-print">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={cpSearch}
                onChange={(e) => setCpSearch(e.target.value)}
                placeholder="Cari Capaian Pembelajaran, Mapel, Elemen, atau TP..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={selectedFase}
                onChange={(e) => setSelectedFase(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
              >
                <option value="SEMUA">Semua Fase (A - F)</option>
                <option value="Fase A">Fase A (Kelas 1-2)</option>
                <option value="Fase B">Fase B (Kelas 3-4)</option>
                <option value="Fase C">Fase C (Kelas 5-6)</option>
                <option value="Fase D">Fase D (Kelas 7-9)</option>
                <option value="Fase E">Fase E (Kelas 10)</option>
                <option value="Fase F">Fase F (Kelas 11-12)</option>
              </select>

              <select
                value={selectedMapel}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none max-w-[200px]"
              >
                <option value="SEMUA">Semua Mata Pelajaran</option>
                {distinctMapelList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
              >
                <option value="SEMUA">Semua Semester</option>
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel CP & ATP Lengkap */}
        <div className="space-y-3">
          {filteredCpList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
              <p className="text-xs text-slate-500 font-medium">Tidak ada data Capaian Pembelajaran (CP) yang sesuai dengan filter.</p>
              <button
                onClick={handleSyncFromKurikulumModul}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Generate dari KURIKULUM_MODUL</span>
              </button>
            </div>
          ) : (
            filteredCpList.map((item, idx) => (
              <div 
                key={item.CpaID || idx} 
                className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-indigo-200 transition space-y-3 print:border-black print:p-2.5 print:shadow-none print:break-inside-avoid relative group"
              >
                {/* Header Item */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 print:border-black">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded print:bg-white print:text-black print:border print:border-black">
                      {item.Fase}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded print:bg-white print:text-black">
                      {item.Kelas} ({item.Semester})
                    </span>
                    <h4 className="text-xs font-black text-slate-900 print:text-[10pt]">
                      {item.Mapel}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 print:border-none print:text-[8pt]">
                      Elemen: <strong>{item.Elemen}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400 no-print">
                      ID: {item.CpaID}
                    </span>

                    {/* Action buttons (No-Print) */}
                    <div className="flex items-center gap-1 no-print">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition cursor-pointer"
                        title="Edit CP/ATP"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.CpaID)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                        title="Hapus CP/ATP"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Deskripsi Capaian Pembelajaran (CP) */}
                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 print:border-none print:p-1 print:bg-transparent">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider print:text-black">
                    Capaian Pembelajaran (CP):
                  </p>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed print:text-[8.5pt] print:text-black whitespace-pre-line">
                    {item.CapaianPembelajaran}
                  </p>
                </div>

                {/* Tujuan Pembelajaran (TP) & Alur Tujuan Pembelajaran (ATP) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 print:border-black print:p-2 print:bg-white">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1 print:text-black">
                      <CheckCircle2 size={12} />
                      Tujuan Pembelajaran (TP):
                    </p>
                    <p className="text-[11px] text-slate-700 mt-1 leading-relaxed print:text-[8pt] print:text-black whitespace-pre-line">
                      {item.TujuanPembelajaran}
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100 print:border-black print:p-2 print:bg-white">
                    <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1 print:text-black">
                      <ListOrdered size={12} />
                      Alur Tujuan Pembelajaran (ATP):
                    </p>
                    <p className="text-[11px] text-slate-700 mt-1 leading-relaxed print:text-[8pt] print:text-black whitespace-pre-line">
                      {item.AlurTujuan}
                    </p>
                  </div>
                </div>

                {/* Footer Info Materi & Alokasi JP */}
                {item.MateriPokok && (
                  <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 print:border-none">
                    <span>Materi Pokok: <strong className="text-slate-700 print:text-black">{item.MateriPokok}</strong></span>
                    <span>Alokasi Waktu: <strong className="text-slate-700 print:text-black">{item.AlokasiWaktuJP || 36} JP</strong></span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Tambah / Edit CP ATP */}
        {modalMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Target size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {modalMode === 'add' ? 'Tambah Capaian Pembelajaran (CP) Baru' : 'Edit Capaian & Alur Pembelajaran'}
                  </h3>
                </div>
                <button 
                  onClick={() => setModalMode(null)} 
                  className="text-slate-400 hover:text-slate-700 text-base p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAddEdit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Mata Pelajaran *</label>
                    <input
                      type="text"
                      required
                      value={formData.Mapel || ''}
                      onChange={(e) => setFormData({ ...formData, Mapel: e.target.value })}
                      placeholder="cth: Matematika"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Fase *</label>
                    <select
                      value={formData.Fase || 'Fase B'}
                      onChange={(e) => setFormData({ ...formData, Fase: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    >
                      <option value="Fase A">Fase A (Kelas 1-2)</option>
                      <option value="Fase B">Fase B (Kelas 3-4)</option>
                      <option value="Fase C">Fase C (Kelas 5-6)</option>
                      <option value="Fase D">Fase D (Kelas 7-9)</option>
                      <option value="Fase E">Fase E (Kelas 10)</option>
                      <option value="Fase F">Fase F (Kelas 11-12)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">
                      Kelas / Tingkat {masterClass.info.source === 'SHEET_DATABASE' ? <span className="text-[10px] text-emerald-600 font-semibold">(Sheet KELAS)</span> : null}
                    </label>
                    <select
                      value={formData.Kelas || masterClass.classes[0] || '4'}
                      onChange={(e) => setFormData({ ...formData, Kelas: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none cursor-pointer"
                    >
                      {masterClass.classes.map((cls) => (
                        <option key={cls} value={cls}>
                          Kelas {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Semester</label>
                    <select
                      value={formData.Semester || 'Ganjil'}
                      onChange={(e) => setFormData({ ...formData, Semester: e.target.value as any })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    >
                      <option value="Ganjil">Semester Ganjil</option>
                      <option value="Genap">Semester Genap</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Elemen CP</label>
                    <input
                      type="text"
                      value={formData.Elemen || ''}
                      onChange={(e) => setFormData({ ...formData, Elemen: e.target.value })}
                      placeholder="cth: Bilangan & Operasi"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Alokasi Waktu (JP)</label>
                    <input
                      type="number"
                      value={formData.AlokasiWaktuJP || 36}
                      onChange={(e) => setFormData({ ...formData, AlokasiWaktuJP: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Materi Pokok / Topik Modul</label>
                  <input
                    type="text"
                    value={formData.MateriPokok || ''}
                    onChange={(e) => setFormData({ ...formData, MateriPokok: e.target.value })}
                    placeholder="cth: Bilangan Cacah s.d. 10.000, Pecahan Senilai"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 mb-1 block">Capaian Pembelajaran (CP) *</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.CapaianPembelajaran || ''}
                    onChange={(e) => setFormData({ ...formData, CapaianPembelajaran: e.target.value })}
                    placeholder="Deskripsi standar kompetensi yang harus dicapai peserta didik pada akhir fase..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Tujuan Pembelajaran (TP)</label>
                    <textarea
                      rows={3}
                      value={formData.TujuanPembelajaran || ''}
                      onChange={(e) => setFormData({ ...formData, TujuanPembelajaran: e.target.value })}
                      placeholder="1. Peserta didik dapat...&#10;2. Peserta didik mampu..."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 mb-1 block">Alur Tujuan Pembelajaran (ATP)</label>
                    <textarea
                      rows={3}
                      value={formData.AlurTujuan || ''}
                      onChange={(e) => setFormData({ ...formData, AlurTujuan: e.target.value })}
                      placeholder="Tahap 1: Pengenalan konsep dasar&#10;Tahap 2: Eksplorasi & latihan"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
                  >
                    Simpan CP/ATP
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Ringkasan Integrasi Modul */}
        {showIntegrationSummary && integrationStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95 duration-200 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                <Sparkles size={24} />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  Integrasi KURIKULUM_MODUL Berhasil!
                </h3>
                <p className="text-xs text-slate-600">
                  Data modul pembelajaran telah berhasil diubah menjadi formulasi resmi Capaian Pembelajaran (CP) & Alur Tujuan Pembelajaran (ATP).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-indigo-700 uppercase">Modul Terbaca</p>
                  <p className="text-xl font-black text-indigo-900 mt-0.5">{integrationStats.totalModul} Modul</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-purple-700 uppercase">CP/ATP Terformulasi</p>
                  <p className="text-xl font-black text-purple-900 mt-0.5">{integrationStats.totalCpGenerated} Item</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Langkah Selanjutnya:</p>
                <p>1. Klik tombol <strong>"☁️ Simpan ke Sheet CP_ATP"</strong> untuk memperbarui sheet di Google Spreadsheet Anda.</p>
                <p>2. Anda juga dapat mengunduh dokumen resmi dalam format Excel (XLSX) dengan tombol <strong>"Ekspor Excel CP/ATP"</strong>.</p>
              </div>

              <button
                onClick={() => setShowIntegrationSummary(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-200 transition cursor-pointer"
              >
                Tutup & Lihat Data
              </button>
            </div>
          </div>
        )}
      </section>

      {/* BAB V: TEMA PROJEK P5 */}
      <section className={`${activeTab === 'p5' ? 'block' : 'hidden print:block'} space-y-4 print:space-y-2 print:pt-2`}>
        <div className="flex items-center gap-2 border-b border-indigo-200 pb-1.5 print:border-black">
          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center print:bg-black">5</span>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            BAB V: Projek Penguatan Profil Pelajar Pancasila (P5)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2 print:gap-2">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 print:border-black print:bg-white print:p-2 space-y-0.5">
            <h5 className="font-bold text-xs print:text-[9pt] text-slate-900">1. Gaya Hidup Berkelanjutan</h5>
            <p className="text-xs print:text-[8pt] text-slate-600 print:text-black">Pengelolaan daur ulang sampah kreatif, penghijauan pekarangan, dan konservasi air hemat energi.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 print:border-black print:bg-white print:p-2 space-y-0.5">
            <h5 className="font-bold text-xs print:text-[9pt] text-slate-900">2. Kearifan Lokal & Budaya</h5>
            <p className="text-xs print:text-[8pt] text-slate-600 print:text-black">Eksplorasi seni tari daerah, musik tradisional Nusantara, dan festival kuliner khas daerah.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 print:border-black print:bg-white print:p-2 space-y-0.5">
            <h5 className="font-bold text-xs print:text-[9pt] text-slate-900">3. Kewirausahaan Mandiri</h5>
            <p className="text-xs print:text-[8pt] text-slate-600 print:text-black">Simulasi Market Day cilik untuk menanamkan literasi finansial dasar, kejujuran, dan komunikasi tim.</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 print:border-black print:bg-white print:p-2 space-y-0.5">
            <h5 className="font-bold text-xs print:text-[9pt] text-slate-900">4. Bhinneka Tunggal Ika</h5>
            <p className="text-xs print:text-[8pt] text-slate-600 print:text-black">Pendidikan multikultural, sikap toleransi, persaudaraan, dan gerakan anti-bullying / perundungan.</p>
          </div>
        </div>
      </section>

      {/* LEMBAR PENGESAHAN RESMI (HANYA MUNCUL DI CETAKAN) */}
      <div className="hidden print:block pt-6 mt-4 border-t border-black text-xs">
        <div className="text-center font-bold mb-4 uppercase tracking-wider text-[10pt]">
          LEMBAR PENGESAHAN KURIKULUM SATUAN PENDIDIKAN
        </div>
        <p className="text-center text-[8.5pt] italic mb-6">
          Dokumen Kurikulum Satuan Pendidikan ini telah diteliti, disetujui, dan disahkan untuk diberlakukan secara resmi pada Tahun Ajaran {currentTP}.
        </p>

        <div className="flex justify-between items-start px-8 text-center text-[9pt]">
          <div className="w-64 space-y-16">
            <p>Mengetahui,<br/><strong>Ketua Komite / Tim Pengembang</strong></p>
            <div>
              <p className="font-bold underline">___________________________</p>
              <p className="text-[8pt] text-gray-700">NIP. -</p>
            </div>
          </div>

          <div className="w-64 space-y-16">
            <p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/><strong>Kepala {schoolName}</strong></p>
            <div>
              <p className="font-bold underline">{headmasterName}</p>
              <p className="text-[8pt] text-gray-700">NIP. {headmasterNip}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
