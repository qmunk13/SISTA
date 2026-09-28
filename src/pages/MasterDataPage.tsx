import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { db } from '../data/db';
import { 
  Database, Users, GraduationCap, HeartHandshake, Heart, School, BookOpen, 
  Calendar, CalendarOff, DollarSign, Package, CheckCircle2, ShieldCheck, 
  Search, Plus, RefreshCw, Filter, Download, FolderOpen, FileText,
  Phone, MapPin, CheckCircle, AlertCircle, MessageCircle, ExternalLink,
  ChevronRight, X, Clock, Layers, Eye, Edit, Trash2, Save, AlertTriangle, UserCheck,
  FileSpreadsheet, Sparkles, Printer, Info, Check, ShieldAlert, UserPlus,
  SlidersHorizontal, Activity, CheckCheck, XCircle, Wrench, ArrowRight,
  UploadCloud as CloudUpload, UploadCloud
} from 'lucide-react';
import StudentsList, { getStudentStatusYatim, getYatimStatusInfo } from './StudentsList';
import BerkasSiswaPage from './BerkasSiswaPage';
import TeachersList from './TeachersList';
import TablePagination from '../components/common/TablePagination';
import { exportToExcel, exportOrangTuaMasterToExcel, exportYatimPiatuToExcel, exportDapodikValidasiToExcel } from '../lib/excel';
import { normalizeClassName, matchClass, matchStatusActive } from '../lib/utils';
import { fetchFromGAS } from '../lib/api';
import { DEFAULT_APP_CONFIG } from '../data/config';
import { SEED_CLASSES, SEED_MAPEL, SEED_TAHUN_AJARAN, SEED_SEMESTER, SEED_HARI_LIBUR, SEED_JENJANG } from '../data/seedMasterData';
import { auditStudentDapodik, auditAllStudentsDapodik, parseIndonesianNIK, DapodikAuditResult, generateDapodikValidasiRows } from '../lib/dapodikValidator';
import SmartSheetAuditor from '../components/SmartSheetAuditor';
import { normalizeSemesterType } from '../lib/semester';
import { setActiveTahunAjaranAndSemesterSync } from '../utils/masterDropdowns';
import { autoSyncEngine } from '../data/autoSyncEngine';
import { pullSpecificSheetFromGas, pullAllSheetsFromGas, isValidGasUrl, getStoredGasUrl } from '../utils/gasSync';

/**
 * Format alamat domisili lengkap menggabungkan Jalan/Dusun, RT, RW, Kelurahan, Kecamatan, Kota/Kabupaten
 */
export function formatFullAddress(student: Partial<Student> | any): string {
  if (!student) return '-';
  const parts: string[] = [];

  const mainAddress = String(student.address || student.alamat || student.alamatDomisili || '').trim();
  if (mainAddress && mainAddress !== '-' && mainAddress !== 'null' && mainAddress !== 'undefined') {
    parts.push(mainAddress);
  }

  const rt = String(student.rt || student.RT || '').replace(/^RT[\s.:]*/i, '').trim();
  const rw = String(student.rw || student.RW || '').replace(/^RW[\s.:]*/i, '').trim();
  if (rt && rw && rt !== '-' && rw !== '-') {
    parts.push(`RT ${rt}/RW ${rw}`);
  } else if (rt && rt !== '-') {
    parts.push(`RT ${rt}`);
  } else if (rw && rw !== '-') {
    parts.push(`RW ${rw}`);
  }

  const kel = String(student.kelurahan || student.desa || student.Kelurahan || '').trim();
  if (kel && kel !== '-' && kel !== 'null') {
    parts.push(kel.toLowerCase().startsWith('kel') || kel.toLowerCase().startsWith('desa') ? kel : `Kel. ${kel}`);
  }

  const kec = String(student.kecamatan || student.Kecamatan || '').trim();
  if (kec && kec !== '-' && kec !== 'null') {
    parts.push(kec.toLowerCase().startsWith('kec') ? kec : `Kec. ${kec}`);
  }

  const kota = String(student.kota || student.kabupaten || student.Kota || student.Kabupaten || '').trim();
  if (kota && kota !== '-' && kota !== 'null') {
    parts.push(kota);
  }

  const kodePos = String(student.kodePos || student.KodePos || '').trim();
  if (kodePos && kodePos !== '-' && kodePos !== 'null') {
    parts.push(kodePos);
  }

  return parts.length > 0 ? parts.join(', ') : (mainAddress || '-');
}

interface MasterDataPageProps {
  initialSubTab?: string;
}

export default function MasterDataPage({ initialSubTab = 'dashboard' }: MasterDataPageProps) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const { students, updateStudent, deleteStudent, teachers, settings, setSettings } = useStore();

  // Smart Filter States for Subtabs
  const [searchQuery, setSearchQuery] = useState('');
  const [rekapMode, setRekapMode] = useState<'gender' | 'status' | 'all'>('gender');
  const [filterClass, setFilterClass] = useState('');
  const [filterTahunMasuk, setFilterTahunMasuk] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Parent and Yatim specific states
  const [parentRelationFilter, setParentRelationFilter] = useState<'all' | 'ayah' | 'ibu' | 'wali'>('all');
  const [filterStatusYatim, setFilterStatusYatim] = useState<string>('all');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isSyncingGAS, setIsSyncingGAS] = useState(false);

  // Smart Dapodik Validation States
  const [filterDapodikStatus, setFilterDapodikStatus] = useState<'all' | 'SIAP_SINKRON' | 'PERINGATAN' | 'RESIDU_DAPODIK' | 'DEWASA' | 'BELUM_TERDATA'>('all');
  const [selectedDapodikAudit, setSelectedDapodikAudit] = useState<DapodikAuditResult | null>(null);
  const [isScanningDapodik, setIsScanningDapodik] = useState(false);
  const [isSavingDapodik, setIsSavingDapodik] = useState(false);
  const [saveDapodikResultModal, setSaveDapodikResultModal] = useState<{ open: boolean; success: boolean; count: number; gasSynced: boolean; message: string; details?: string; columns?: string[] } | null>(null);
  const [isSyncingMapel, setIsSyncingMapel] = useState(false);
  const [isSyncingLibur, setIsSyncingLibur] = useState(false);

  // Saving Progress Popup State (Feedback Cepat & Real-time)
  const [savingProgressModal, setSavingProgressModal] = useState<{
    open: boolean;
    status: 'saving' | 'success' | 'error';
    title: string;
    message: string;
    stepText?: string;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Universal Modals State
  const [viewDetailModal, setViewDetailModal] = useState<{ open: boolean; title: string; data: Record<string, any>; type: string } | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; title: string; data: Record<string, any>; type: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; title: string; id: string; name: string; type: string } | null>(null);

  // Pagination states for all subtabs
  const [currentPageParent, setCurrentPageParent] = useState(1);
  const [pageSizeParent, setPageSizeParent] = useState(25);

  const [currentPageYatim, setCurrentPageYatim] = useState(1);
  const [pageSizeYatim, setPageSizeYatim] = useState(25);

  const [currentPageKelas, setCurrentPageKelas] = useState(1);
  const [pageSizeKelas, setPageSizeKelas] = useState(10);

  const [currentPageJenjang, setCurrentPageJenjang] = useState(1);
  const [pageSizeJenjang, setPageSizeJenjang] = useState(10);

  const [currentPageMapel, setCurrentPageMapel] = useState(1);
  const [pageSizeMapel, setPageSizeMapel] = useState(10);

  const [currentPageTahun, setCurrentPageTahun] = useState(1);
  const [pageSizeTahun, setPageSizeTahun] = useState(10);

  const [currentPageSemester, setCurrentPageSemester] = useState(1);
  const [pageSizeSemester, setPageSizeSemester] = useState(10);

  const [currentPageLibur, setCurrentPageLibur] = useState(1);
  const [pageSizeLibur, setPageSizeLibur] = useState(10);

  const [currentPageDapodik, setCurrentPageDapodik] = useState(1);
  const [pageSizeDapodik, setPageSizeDapodik] = useState(25);

  // Auto-reset page numbers when subtab filters change
  useEffect(() => {
    setCurrentPageParent(1);
  }, [searchQuery, filterClass, parentRelationFilter]);

  useEffect(() => {
    setCurrentPageYatim(1);
  }, [searchQuery, filterClass, filterStatusYatim]);

  useEffect(() => {
    setCurrentPageKelas(1);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPageJenjang(1);
  }, [searchQuery, filterCategory]);

  useEffect(() => {
    setCurrentPageMapel(1);
  }, [searchQuery, filterClass, filterCategory]);

  useEffect(() => {
    setCurrentPageTahun(1);
  }, [searchQuery, filterCategory]);

  useEffect(() => {
    setCurrentPageSemester(1);
  }, [searchQuery, filterCategory]);

  useEffect(() => {
    setCurrentPageLibur(1);
  }, [searchQuery, filterCategory]);

  useEffect(() => {
    setCurrentPageDapodik(1);
  }, [searchQuery, filterClass, filterTahunMasuk, filterDapodikStatus]);

  const subTabs = [
    { id: 'dashboard', label: 'Dashboard Master', icon: Database },
    { id: 'siswa', label: 'Data Siswa', icon: Users },
    { id: 'berkas-siswa', label: 'Berkas Dokumen Siswa', icon: FolderOpen },
    { id: 'guru', label: 'Data Guru', icon: GraduationCap },
    { id: 'orangtua', label: 'Orang Tua & Wali', icon: HeartHandshake },
    { id: 'yatim-piatu', label: 'Data Yatim & Piatu', icon: Heart },
    { id: 'kelas-wali', label: 'Kelas & Wali', icon: School },
    { id: 'jenjang', label: 'Jenjang Pendidikan', icon: Layers },
    { id: 'mapel', label: 'Mata Pelajaran', icon: BookOpen },
    { id: 'tahun-ajaran', label: 'Tahun Ajaran', icon: Calendar },
    { id: 'semester', label: 'Semester', icon: Clock },
    { id: 'hari-libur', label: 'Hari Libur & Kalender', icon: CalendarOff },
    { id: 'dapodik-2027', label: 'Validasi Dapodik 2027', icon: CheckCircle2 },
    { id: 'audit-sheet', label: 'Inspektor Sheet (Audit Cerdas)', icon: Sparkles },
  ];

  const handleSubTabChange = (tabId: string) => {
    setActiveSubTab(tabId);
    setSearchQuery('');
    setFilterClass('');
    setFilterTahunMasuk('');
    setFilterCategory('');
    // Reset pagination on subtab switch
    setCurrentPageParent(1);
    setCurrentPageYatim(1);
    setCurrentPageKelas(1);
    setCurrentPageJenjang(1);
    setCurrentPageMapel(1);
    setCurrentPageTahun(1);
    setCurrentPageSemester(1);
    setCurrentPageLibur(1);
    setCurrentPageDapodik(1);
    // Focus and scroll to top of page/container
    window.scrollTo({ top: 0, behavior: 'instant' });
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // Master Data Collections - Loaded from synced Google Sheets / Database
  const [masterJenjangList, setMasterJenjangList] = useState<any[]>(() => {
    const fromDb = (db.get('jenjang') || db.get('academic_jenjang')) as any[];
    if (Array.isArray(fromDb) && fromDb.length > 0) {
      return fromDb.map(item => ({
        ...item,
        id: item.jenjangId || item.id || '',
        jenjangId: item.jenjangId || item.id || '',
        kode: item.kode || '',
        namaJenjang: item.namaJenjang || item.nama || '',
        nama: item.namaJenjang || item.nama || '',
        tingkatAwal: item.tingkatAwal || '',
        tingkatTengah: item.tingkatTengah || '',
        tingkatAkhir: item.tingkatAkhir || '',
        keterangan: item.keterangan || '',
        aktif: item.aktif || item.status || 'Aktif',
        status: item.status || item.aktif || 'Aktif'
      }));
    }
    return [];
  });

  const [masterMapelList, setMasterMapelList] = useState<any[]>(() => {
    const fromDb = (db.get('mapel') || db.get('academic_subjects')) as any[];
    if (Array.isArray(fromDb) && fromDb.length > 0) {
      const hasOldNames = fromDb.some((m: any) => 
        (m.nama === 'Pendidikan Agama' || m.namaMapel === 'Pendidikan Agama') ||
        (m.nama === 'IPA' || m.namaMapel === 'IPA') ||
        (m.nama === 'IPS' || m.namaMapel === 'IPS') ||
        (m.nama === 'PJOK' || m.namaMapel === 'PJOK') ||
        (m.nama === 'PLBJ' || m.namaMapel === 'PLBJ') ||
        (m.nama === 'TIK' || m.namaMapel === 'TIK')
      );
      const hasPraktek = fromDb.some((m: any) => (m.nama || m.namaMapel || '').toLowerCase().includes('ujian praktek'));
      const hasBacaTulis = fromDb.some((m: any) => (m.nama || m.namaMapel || '').toLowerCase().includes('baca tulis'));
      
      if (hasOldNames || !hasPraktek || !hasBacaTulis) {
        try {
          db.set('mapel', SEED_MAPEL);
          db.set('academic_subjects', SEED_MAPEL);
        } catch (_) {}
        return SEED_MAPEL;
      }
      return fromDb;
    }
    // Inisialisasi awal dengan daftar standar lengkap
    try {
      db.set('mapel', SEED_MAPEL);
      db.set('academic_subjects', SEED_MAPEL);
    } catch (_) {}
    return SEED_MAPEL;
  });

  const [masterLiburList, setMasterLiburList] = useState<any[]>(() => {
    const fromDb = (db.get('hari_libur') || db.get('academic_holidays')) as any[];
    return Array.isArray(fromDb) ? fromDb : [];
  });

  const [masterClassesList, setMasterClassesList] = useState<any[]>(() => {
    const fromDb = db.get('rombel') as any[];
    if (Array.isArray(fromDb) && fromDb.length >= 10 && fromDb.some(item => item.kelasId === 'A4' || item.id === 'A4')) {
      return fromDb.map(item => ({
        ...item,
        id: item.kelasId || item.id || 'A4',
        kelasId: item.kelasId || item.id || 'A4',
        cls: item.cls || item.namaKelas || '',
        namaKelas: item.namaKelas || item.cls || '',
        jenjangId: item.jenjangId || (['4', '5', '6'].includes(String(item.cls)) ? 'J001' : ['7', '8', '9'].includes(String(item.cls)) ? 'J002' : String(item.cls).toUpperCase() === 'LULUS' ? 'Rombel10' : 'J003'),
        tingkat: item.tingkat || (['4', '5', '6'].includes(String(item.cls)) ? `Paket A Kelas ${item.cls}` : ['7', '8', '9'].includes(String(item.cls)) ? `Paket B Kelas ${item.cls}` : String(item.cls).toUpperCase() === 'LULUS' ? 'ALUMNI' : `Paket C Kelas ${item.cls}`),
        waliKelasId: item.waliKelasId || 'GR_001',
        namaWaliKelas: item.namaWaliKelas || item.namatutor || item.wali || 'Belum Ditentukan',
        namatutor: item.namatutor || item.namaWaliKelas || item.wali || 'Belum Ditentukan',
        wali: item.wali || item.namaWaliKelas || item.namatutor || 'Belum Ditentukan',
        ruangan: item.ruangan !== undefined ? item.ruangan : '1',
        kapasitas: item.kapasitas !== undefined && item.kapasitas !== '' ? Number(item.kapasitas) : 36,
        tahunAjaran: item.tahunAjaran || (item.status === 'ALUMNI' ? '-' : '2026/2027'),
        status: item.status || 'AKTIF'
      }));
    }
    return SEED_CLASSES.map(item => ({ ...item }));
  });

  const [masterTahunList, setMasterTahunList] = useState<any[]>(() => {
    const fromDb = (db.get('tahun_ajaran') || db.get('academic_years')) as any[];
    if (Array.isArray(fromDb) && fromDb.length > 0) {
      return fromDb.map(item => ({
        ...item,
        taId: item.taId || item.id,
        tahunPelajaran: item.tahunPelajaran || item.tahun || item.tahunAjaran,
        semester: item.semester || 'Semester Ganjil & Genap',
        rentang: item.rentang || item.rentangPeriode || item.rentangWaktu || item.periode || (item.tanggalMulai && item.tanggalSelesai ? `${item.tanggalMulai} - ${item.tanggalSelesai}` : (item.tahun ? `Juli ${item.tahun.split('/')[0]} - Juni ${item.tahun.split('/')[1]}` : 'Juli - Juni')),
        rentangPeriode: item.rentangPeriode || item.rentang || item.periode,
        kurikulum: item.kurikulum || 'Kurikulum Merdeka',
        status: item.status || item.aktif || 'Non-Aktif'
      }));
    }
    return [];
  });

  const [masterSemesterList, setMasterSemesterList] = useState<any[]>(() => {
    const fromDb = (db.get('semester') || db.get('academic_semesters')) as any[];
    if (Array.isArray(fromDb) && fromDb.length > 0) {
      return fromDb.map(item => {
        const sid = item.semesterId || item.id;
        const semType = normalizeSemesterType(item);
        return {
          ...item,
          semesterId: sid,
          nama: item.nama || (item.tahunPelajaran ? `${item.tahunPelajaran} ${semType}` : item.nama) || '',
          taId: item.taId || item.tahunAjaranId || '',
          tahunPelajaran: item.tahunPelajaran || item.tahunAjaran || item.tahun || '',
          semester: semType,
          tanggalMulai: item.tanggalMulai || '',
          tanggalSelesai: item.tanggalSelesai || '',
          aktif: item.aktif || item.status || 'NONAKTIF',
          status: item.status || item.aktif || 'NONAKTIF',
          tipe: item.tipe || (semType === 'Genap' ? 'EVEN' : 'ODD') || 'ODD'
        };
      });
    }
    return [];
  });

  // Sinkronisasi data Tahun Ajaran & Semester ketika ada perubahan dari sistem
  useEffect(() => {
    const handleAcademicSync = () => {
      const curSettings = useStore.getState().settings;
      const curTP = curSettings.tahunPelajaran || '2026/2027';
      const curSem = curSettings.semester === 'Genap' ? 'Genap' : 'Ganjil';

      const freshTahun = (db.get('tahun_ajaran') || db.get('academic_years')) as any[];
      if (Array.isArray(freshTahun) && freshTahun.length > 0) {
        setMasterTahunList(freshTahun.map(item => ({
          ...item,
          taId: item.taId || item.id,
          tahunPelajaran: item.tahunPelajaran || item.tahun || item.tahunAjaran,
          semester: item.semester || 'Semester Ganjil & Genap',
          rentang: item.rentang || item.rentangPeriode || item.rentangWaktu || item.periode,
          kurikulum: item.kurikulum || 'Kurikulum Merdeka',
          status: ((item.tahunPelajaran || item.tahun || item.tahunAjaran) === curTP) ? 'Aktif' : (item.status || 'Non-Aktif'),
          aktif: ((item.tahunPelajaran || item.tahun || item.tahunAjaran) === curTP) ? 'Aktif' : (item.aktif || 'Non-Aktif')
        })));
      }

      const freshSem = (db.get('semester') || db.get('academic_semesters')) as any[];
      if (Array.isArray(freshSem) && freshSem.length > 0) {
        setMasterSemesterList(freshSem.map(item => {
          const semType = normalizeSemesterType(item);
          const isMatch = ((item.tahunPelajaran || item.tahunAjaran || item.tahun) === curTP) && (semType === curSem);
          return {
            ...item,
            semesterId: item.semesterId || item.id,
            nama: item.nama || `${curTP} ${semType}`,
            tahunPelajaran: item.tahunPelajaran || item.tahunAjaran || item.tahun || curTP,
            semester: semType,
            aktif: isMatch ? 'AKTIF' : 'NONAKTIF',
            status: isMatch ? 'AKTIF' : 'NONAKTIF',
            tipe: semType === 'Genap' ? 'EVEN' : 'ODD'
          };
        }));
      }

      // Refresh masterJenjangList
      const freshJenjang = (db.get('jenjang') || db.get('academic_jenjang')) as any[];
      if (Array.isArray(freshJenjang) && freshJenjang.length > 0) {
        setMasterJenjangList(freshJenjang.map(item => ({
          ...item,
          id: item.jenjangId || item.id || '',
          jenjangId: item.jenjangId || item.id || '',
          kode: item.kode || '',
          namaJenjang: item.namaJenjang || item.nama || '',
          nama: item.namaJenjang || item.nama || '',
          tingkatAwal: item.tingkatAwal || '',
          tingkatTengah: item.tingkatTengah || '',
          tingkatAkhir: item.tingkatAkhir || '',
          keterangan: item.keterangan || '',
          aktif: item.aktif || item.status || 'Aktif',
          status: item.status || item.aktif || 'Aktif'
        })));
      }

      // Refresh masterMapelList
      const freshMapel = (db.get('mapel') || db.get('academic_subjects')) as any[];
      if (Array.isArray(freshMapel) && freshMapel.length > 0) {
        setMasterMapelList(freshMapel);
      }

      // Refresh masterLiburList
      const freshLibur = (db.get('hari_libur') || db.get('academic_holidays')) as any[];
      if (Array.isArray(freshLibur) && freshLibur.length > 0) {
        setMasterLiburList(freshLibur);
      }

      // Refresh masterClassesList
      const freshClasses = db.get('rombel') as any[];
      if (Array.isArray(freshClasses) && freshClasses.length > 0) {
        setMasterClassesList(freshClasses.map(item => ({
          ...item,
          id: item.kelasId || item.id,
          kelasId: item.kelasId || item.id,
          cls: item.cls || item.namaKelas || '',
          namaKelas: item.namaKelas || item.cls || '',
          wali: item.wali || item.namaWaliKelas || item.namatutor || 'Belum Ditentukan'
        })));
      }

      // Refresh masterBarangList
      const freshBarang = (db.get('barang') || db.get('sarpras_items')) as any[];
      if (Array.isArray(freshBarang) && freshBarang.length > 0) {
        setMasterBarangList(freshBarang);
      }
    };

    window.addEventListener('academic-semester-changed', handleAcademicSync);
    window.addEventListener('erp-db-updated', handleAcademicSync);
    window.addEventListener('focus', handleAcademicSync);
    return () => {
      window.removeEventListener('academic-semester-changed', handleAcademicSync);
      window.removeEventListener('erp-db-updated', handleAcademicSync);
      window.removeEventListener('focus', handleAcademicSync);
    };
  }, []);

  const handleSetActiveTahunAjaran = async (tahun: string) => {
    const cleanTP = (tahun || '2026/2027').trim();
    const curSem = (settings.semester === 'Genap' ? 'Genap' : 'Ganjil') as 'Ganjil' | 'Genap';
    const updatedSettings = {
      ...settings,
      tahunPelajaran: cleanTP,
      activeAcademicYear: cleanTP,
      semester: curSem,
      activeSemester: curSem
    };
    setSettings(updatedSettings);
    db.setSingle('settings', updatedSettings);

    setMasterTahunList(prev => prev.map(t => {
      const match = (t.tahunPelajaran || t.tahun || t.tahunAjaran) === cleanTP;
      return {
        ...t,
        status: match ? 'Aktif' : 'Non-Aktif',
        aktif: match ? 'Aktif' : 'Non-Aktif'
      };
    }));

    setSyncFeedback(`⏳ Mengaktifkan Tahun Pelajaran ${cleanTP} di seluruh sistem & Sheet TAHUN_AJARAN...`);
    try {
      await setActiveTahunAjaranAndSemesterSync(cleanTP, curSem);
      setSyncFeedback(`✅ Tahun Pelajaran ${cleanTP} kini AKTIF di seluruh modul sistem dan Google Sheets!`);
    } catch {
      setSyncFeedback(`✅ Tahun Pelajaran ${cleanTP} aktif di aplikasi lokal.`);
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleSetActiveSemester = async (tahun: string, sem: 'Ganjil' | 'Genap') => {
    const cleanTP = (tahun || settings.tahunPelajaran || '2026/2027').trim();
    const cleanSem = sem === 'Genap' ? 'Genap' : 'Ganjil';
    const updatedSettings = {
      ...settings,
      tahunPelajaran: cleanTP,
      activeAcademicYear: cleanTP,
      semester: cleanSem,
      activeSemester: cleanSem
    };
    setSettings(updatedSettings);
    db.setSingle('settings', updatedSettings);

    setMasterSemesterList(prev => prev.map(s => {
      const isMatch = ((s.tahunPelajaran || s.tahunAjaran || s.tahun) === cleanTP) &&
        (s.semester === cleanSem || String(s.nama || '').toLowerCase().includes(cleanSem.toLowerCase()));
      return {
        ...s,
        aktif: isMatch ? 'AKTIF' : 'NONAKTIF',
        status: isMatch ? 'AKTIF' : 'NONAKTIF'
      };
    }));

    setSyncFeedback(`⏳ Mengaktifkan Semester ${cleanSem} ${cleanTP} di seluruh sistem & Sheet SEMESTER...`);
    try {
      await setActiveTahunAjaranAndSemesterSync(cleanTP, cleanSem);
      setSyncFeedback(`✅ Semester ${cleanSem} ${cleanTP} kini AKTIF di seluruh modul sistem dan Google Sheets!`);
    } catch {
      setSyncFeedback(`✅ Semester ${cleanSem} ${cleanTP} aktif di aplikasi lokal.`);
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Distinct classes
  const distinctClasses = useMemo(() => {
    const set = new Set<string>();
    masterClassesList.forEach(c => { if (c.cls) set.add(c.cls); });
    students.forEach(s => { if (s.class) set.add(s.class); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, masterClassesList]);

  // Distinct Tahun Masuk
  const distinctTahunMasuk = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s: any) => {
      const yr = String(s.tahunMasuk || s['TahunMasuk'] || s['ThnMasuk'] || s['tahun_masuk'] || '').trim();
      if (yr && yr !== '-' && yr !== 'null' && yr !== 'undefined') {
        const match = yr.match(/\b(20\d{2}|19\d{2})\b/);
        if (match) set.add(match[1]);
        else set.add(yr);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [students]);

  const [masterBarangList, setMasterBarangList] = useState<any[]>(() => {
    return (db.get('barang') as any[]) || [];
  });

  // Hitung jumlah siswa aktif & belum aktif
  const countSiswaAktif = useMemo(() => {
    return (students || []).filter(s => {
      const st = String(s.status || '').toUpperCase().trim();
      return st === 'AKTIF' || st === 'ACTIVE';
    }).length;
  }, [students]);

  const countSiswaBelum = useMemo(() => {
    return (students || []).filter(s => {
      const st = String(s.status || '').toUpperCase().trim();
      return st === 'BELUM' || st === 'PENDING' || st === 'CALON';
    }).length;
  }, [students]);

  // State for universal Add Modal
  const [addModal, setAddModal] = useState<{
    open: boolean;
    title: string;
    type: 'kelas' | 'jenjang' | 'mapel' | 'tahun' | 'semester' | 'libur' | 'barang';
    data: Record<string, any>;
  } | null>(null);

  // Derived filtered data for Parent/Orang Tua
  const allParentRecords = useMemo(() => {
    const records: Array<{
      id: string;
      studentId: string;
      studentName: string;
      studentNis: string;
      studentNisn: string;
      studentClass: string;
      parentName: string;
      relation: string;
      relationType: 'ayah' | 'ibu' | 'wali';
      statusKondisi: string;
      nik: string;
      birthPlace: string;
      birthDate: string;
      education: string;
      job: string;
      income: string;
      phone: string;
      address: string;
      student: typeof students[0];
    }> = [];

    students.forEach((s) => {
      const studentName = s.name || '-';
      const studentClass = s.class || '-';
      const studentNis = s.nis || s.id || '-';
      const studentNisn = s.nisn || '-';
      const address = formatFullAddress(s);

      const ayahName = s.namaAyah || (s as any).fatherName || '';
      const ibuName = s.namaIbu || (s as any).NamaIbu || '';
      const waliName = s.namaWali || '';

      // 1. Ayah
      if (ayahName) {
        records.push({
          id: `${s.id}-ayah`,
          studentId: s.id,
          studentName,
          studentNis,
          studentNisn,
          studentClass,
          parentName: ayahName,
          relation: 'Ayah Kandung',
          relationType: 'ayah',
          statusKondisi: s.statusAyah || 'Masih Hidup',
          nik: s.nikAyah || '-',
          birthPlace: s.tempatLahirAyah || '-',
          birthDate: s.tanggalLahirAyah || '-',
          education: s.pendidikanAyah || '-',
          job: s.pekerjaanAyah || (s as any).fatherJob || '-',
          income: s.penghasilanAyah || '-',
          phone: s.tlpAyah || s.parentPhone || s.phone || s.noHp || '',
          address,
          student: s
        });
      }

      // 2. Ibu
      if (ibuName) {
        records.push({
          id: `${s.id}-ibu`,
          studentId: s.id,
          studentName,
          studentNis,
          studentNisn,
          studentClass,
          parentName: ibuName,
          relation: 'Ibu Kandung',
          relationType: 'ibu',
          statusKondisi: s.statusIbu || 'Masih Hidup',
          nik: s.nikIbu || '-',
          birthPlace: s.tempatLahirIbu || '-',
          birthDate: s.tanggalLahirIbu || '-',
          education: s.pendidikanIbu || '-',
          job: s.pekerjaanIbu || (s as any).motherJob || '-',
          income: s.penghasilanIbu || '-',
          phone: s.tlpIbu || s.parentPhone || s.phone || s.noHp || '',
          address,
          student: s
        });
      }

      // 3. Wali
      if (waliName && waliName !== ayahName && waliName !== ibuName) {
        records.push({
          id: `${s.id}-wali`,
          studentId: s.id,
          studentName,
          studentNis,
          studentNisn,
          studentClass,
          parentName: waliName,
          relation: s.hubunganWali || 'Wali Murid',
          relationType: 'wali',
          statusKondisi: 'Masih Hidup',
          nik: s.nikWali || '-',
          birthPlace: s.tempatLahirWali || '-',
          birthDate: s.tglLahirWali || '-',
          education: s.pendidikanWali || '-',
          job: s.pekerjaanWali || '-',
          income: s.penghasilanWali || '-',
          phone: s.tlpWali || s.parentPhone || s.phone || s.noHp || '',
          address,
          student: s
        });
      }

      // Fallback parent record if neither ayah, ibu, nor wali is explicitly named
      if (!ayahName && !ibuName && !waliName) {
        const genericParent = s.parentName || 'Orang Tua Siswa';
        records.push({
          id: `${s.id}-ortu`,
          studentId: s.id,
          studentName,
          studentNis,
          studentNisn,
          studentClass,
          parentName: genericParent,
          relation: 'Orang Tua / Wali',
          relationType: 'wali',
          statusKondisi: 'Masih Hidup',
          nik: '-',
          birthPlace: '-',
          birthDate: '-',
          education: '-',
          job: '-',
          income: '-',
          phone: s.parentPhone || s.phone || s.noHp || '',
          address,
          student: s
        });
      }
    });

    return records;
  }, [students]);

  const filteredParentRecords = useMemo(() => {
    return allParentRecords.filter(r => {
      const q = String(searchQuery || '').toLowerCase();
      const matchesQ = !searchQuery || 
        String(r.parentName || '').toLowerCase().includes(q) || 
        String(r.studentName || '').toLowerCase().includes(q) || 
        String(r.phone || '').toLowerCase().includes(q) || 
        String(r.job || '').toLowerCase().includes(q) || 
        String(r.address || '').toLowerCase().includes(q);
      const matchesClass = !filterClass || r.studentClass === filterClass;
      const matchesRelation = parentRelationFilter === 'all' || r.relationType === parentRelationFilter;
      return matchesQ && matchesClass && matchesRelation;
    });
  }, [allParentRecords, searchQuery, filterClass, parentRelationFilter]);

  // Derived filtered data for Yatim, Piatu & Yatim Piatu (Siswa Aktif Only)
  const activeYatimStudents = useMemo(() => {
    return students.filter(s => matchStatusActive(s?.status));
  }, [students]);

  const filteredYatimPiatu = useMemo(() => {
    return activeYatimStudents.map(s => {
      const statusYatim = getStudentStatusYatim(s);
      const isKps = s.penerimaKps === 'Ya' || !!s.kipUrl || !!s.noKip;
      return {
        ...s,
        computedStatusYatim: statusYatim,
        isKps
      };
    }).filter(s => {
      const q = String(searchQuery || '').toLowerCase();
      const sPhone = s.parentPhone || s.tlpAyah || s.tlpIbu || s.tlpWali || s.noHp || s.phone || '';
      const matchesQ = !searchQuery || 
        String(s.name || '').toLowerCase().includes(q) || 
        String(s.nisn || '').toLowerCase().includes(q) || 
        String(s.nis || '').toLowerCase().includes(q) || 
        (s.namaAyah && String(s.namaAyah).toLowerCase().includes(q)) || 
        (s.namaIbu && String(s.namaIbu).toLowerCase().includes(q)) || 
        (s.namaWali && String(s.namaWali).toLowerCase().includes(q)) || 
        (sPhone && String(sPhone).toLowerCase().includes(q));
      
      const matchesClass = !filterClass || s.class === filterClass;
      
      let matchesYatim = true;
      if (filterStatusYatim === 'kps') {
        matchesYatim = s.isKps;
      } else if (filterStatusYatim !== 'all') {
        matchesYatim = s.computedStatusYatim === filterStatusYatim;
      }

      return matchesQ && matchesClass && matchesYatim;
    });
  }, [activeYatimStudents, searchQuery, filterClass, filterStatusYatim]);

  // Statistics for Yatim / Piatu (Hanya Siswa Aktif)
  const yatimStats = useMemo(() => {
    let yatimPiatu = 0;
    let yatim = 0;
    let piatu = 0;
    let lengkap = 0;
    let penerimaKps = 0;

    activeYatimStudents.forEach(s => {
      const st = getStudentStatusYatim(s);
      if (st === 'Yatim Piatu') yatimPiatu++;
      else if (st === 'Yatim') yatim++;
      else if (st === 'Piatu') piatu++;
      else lengkap++;

      if (s.penerimaKps === 'Ya' || s.kipUrl || s.noKip) {
        penerimaKps++;
      }
    });

    return {
      total: activeYatimStudents.length,
      yatimPiatu,
      yatim,
      piatu,
      lengkap,
      penerimaKps
    };
  }, [activeYatimStudents]);

  // Statistics for Parents
  const parentStats = useMemo(() => {
    const total = allParentRecords.length;
    const ayahCount = allParentRecords.filter(r => r.relationType === 'ayah').length;
    const ibuCount = allParentRecords.filter(r => r.relationType === 'ibu').length;
    const waliCount = allParentRecords.filter(r => r.relationType === 'wali').length;
    const withPhoneCount = allParentRecords.filter(r => !!r.phone).length;

    return {
      total,
      ayahCount,
      ibuCount,
      waliCount,
      withPhoneCount
    };
  }, [allParentRecords]);

  // Keep compatibility for legacy filteredParents
  const filteredParents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase();
      const parentName = (s.parentName || s.fatherName || s.namaAyah || s.namaIbu || s.NamaIbu || '').toLowerCase();
      const studentName = (s.name || '').toLowerCase();
      const phone = (s.parentPhone || s.phone || s.tlpAyah || s.tlpIbu || '').toLowerCase();
      const address = (s.address || '').toLowerCase();
      const matchesQuery = !searchQuery || parentName.includes(q) || studentName.includes(q) || phone.includes(q) || address.includes(q);
      const matchesClass = !filterClass || s.class === filterClass;
      return matchesQuery && matchesClass;
    });
  }, [students, searchQuery, filterClass]);

  const filteredJenjang = useMemo(() => {
    return masterJenjangList.filter(j => {
      const q = searchQuery.toLowerCase();
      const id = String(j.jenjangId || j.id || '').toLowerCase();
      const kode = String(j.kode || '').toLowerCase();
      const nama = String(j.namaJenjang || j.nama || '').toLowerCase();
      const tAwal = String(j.tingkatAwal || '').toLowerCase();
      const tTengah = String(j.tingkatTengah || '').toLowerCase();
      const tAkhir = String(j.tingkatAkhir || '').toLowerCase();
      const ket = String(j.keterangan || '').toLowerCase();

      const matchesQ = !searchQuery ||
        id.includes(q) ||
        kode.includes(q) ||
        nama.includes(q) ||
        tAwal.includes(q) ||
        tTengah.includes(q) ||
        tAkhir.includes(q) ||
        ket.includes(q);

      const isAktif = j.aktif === 'Aktif' || j.status === 'Aktif' || j.aktif === 'AKTIF' || j.status === 'AKTIF' || j.aktif === true;
      const matchesStatus = !filterCategory ||
        (filterCategory === 'Aktif' && isAktif) ||
        (filterCategory === 'Non-Aktif' && !isAktif);

      return matchesQ && matchesStatus;
    });
  }, [masterJenjangList, searchQuery, filterCategory]);

  const filteredMapel = useMemo(() => {
    return masterMapelList.filter(m => {
      const q = searchQuery.toLowerCase();
      const matchesQ = !searchQuery || String(m.nama || '').toLowerCase().includes(q) || String(m.kode || '').toLowerCase().includes(q) || (m.guru && String(m.guru).toLowerCase().includes(q));
      const matchesCat = !filterCategory || m.kategori === filterCategory;
      const matchesClass = !filterClass || (m.kelas && (String(m.kelas) === 'Semua Kelas' || matchClass(m.kelas, filterClass)));
      return matchesQ && matchesCat && matchesClass;
    });
  }, [masterMapelList, searchQuery, filterCategory, filterClass]);

  const filteredTahun = useMemo(() => {
    return masterTahunList.filter(t => {
      const q = searchQuery.toLowerCase();
      const taId = String(t.taId || t.id || '').toLowerCase();
      const tahun = String(t.tahunPelajaran || t.tahun || t.tahunAjaran || '').toLowerCase();
      const semester = String(t.semester || '').toLowerCase();
      const rentang = String(t.rentangPeriode || t.rentang || t.periode || '').toLowerCase();
      const kurikulum = String(t.kurikulum || '').toLowerCase();
      const matchesQ = !searchQuery || taId.includes(q) || tahun.includes(q) || semester.includes(q) || rentang.includes(q) || kurikulum.includes(q);
      const matchesStatus = !filterCategory || t.status === filterCategory || t.aktif === filterCategory;
      return matchesQ && matchesStatus;
    });
  }, [masterTahunList, searchQuery, filterCategory]);

  const filteredSemester = useMemo(() => {
    return masterSemesterList.filter(s => {
      const q = searchQuery.toLowerCase();
      const semId = String(s.semesterId || s.id || '').toLowerCase();
      const nama = String(s.nama || '').toLowerCase();
      const taId = String(s.taId || s.tahunAjaranId || '').toLowerCase();
      const tahun = String(s.tahunPelajaran || s.tahunAjaran || s.tahun || '').toLowerCase();
      const semester = String(s.semester || '').toLowerCase();
      const tipe = String(s.tipe || '').toLowerCase();
      const tglMulai = String(s.tanggalMulai || '').toLowerCase();
      const tglSelesai = String(s.tanggalSelesai || '').toLowerCase();
      
      const matchesQ = !searchQuery || 
        semId.includes(q) || 
        nama.includes(q) || 
        taId.includes(q) || 
        tahun.includes(q) || 
        semester.includes(q) || 
        tipe.includes(q) || 
        tglMulai.includes(q) || 
        tglSelesai.includes(q);

      const isAktif = s.aktif === 'AKTIF' || s.status === 'AKTIF' || s.aktif === 'Aktif' || s.status === 'Aktif' || s.aktif === true;
      const matchesStatus = !filterCategory || 
        (filterCategory === 'Aktif' && isAktif) || 
        (filterCategory === 'Non-Aktif' && !isAktif) ||
        (filterCategory === 'Ganjil' && s.semester === 'Ganjil') ||
        (filterCategory === 'Genap' && s.semester === 'Genap') ||
        (filterCategory === 'ODD' && s.tipe === 'ODD') ||
        (filterCategory === 'EVEN' && s.tipe === 'EVEN');

      return matchesQ && matchesStatus;
    });
  }, [masterSemesterList, searchQuery, filterCategory]);

  const filteredLibur = useMemo(() => {
    return masterLiburList.filter(l => {
      const q = searchQuery.toLowerCase();
      const matchesQ = !searchQuery || 
        String(l.hariLiburId || '').toLowerCase().includes(q) || 
        String(l.nama || l.agenda || '').toLowerCase().includes(q) || 
        String(l.tanggal || '').toLowerCase().includes(q) || 
        String(l.tanggalSelesai || '').toLowerCase().includes(q) || 
        String(l.tahunAjaran || '').toLowerCase().includes(q) || 
        (l.keterangan && String(l.keterangan).toLowerCase().includes(q));
      const matchesType = !filterCategory || String(l.jenis || '').toLowerCase().includes(filterCategory.toLowerCase());
      return matchesQ && matchesType;
    });
  }, [masterLiburList, searchQuery, filterCategory]);

  const filteredBarang = useMemo(() => {
    return masterBarangList.filter(b => {
      const q = searchQuery.toLowerCase();
      const matchesQ = !searchQuery || String(b.nama || '').toLowerCase().includes(q) || String(b.kode || '').toLowerCase().includes(q) || String(b.lokasi || '').toLowerCase().includes(q);
      const matchesCat = !filterCategory || b.kategori === filterCategory || b.kondisi === filterCategory;
      return matchesQ && matchesCat;
    });
  }, [masterBarangList, searchQuery, filterCategory]);

  const isStudentDepartedOrAlumni = (s: any): boolean => {
    if (!s) return false;
    const st = String(s.status || '').toLowerCase().trim();
    const rawClass = String(s.class || s.kelas || s.rombel || s.Kelas || s.KelasSaatini || '').trim().toUpperCase();
    const rawClassId = String(s.classId || s.idKelas || '').trim().toUpperCase();
    return (
      st === 'mutasi' || 
      st === 'pindah' || 
      st === 'keluar' || 
      st === 'drop' || 
      st === 'lulus' || 
      st === 'alumni' ||
      rawClass === 'LULUS' ||
      rawClass === 'ALUMNI' ||
      rawClassId === 'ALUMNI'
    );
  };

  const matchStudentToLevel = (s: any, lvl: string): boolean => {
    if (!s) return false;
    const rawClass = String(s.class || s.kelas || s.rombel || s.Kelas || s.KelasSaatini || '').trim();
    const rawClassId = String(s.classId || s.idKelas || '').trim();
    const cleanClass = normalizeClassName(rawClass).toUpperCase();
    const cleanClassId = rawClassId.toUpperCase();
    const targetLvl = String(lvl).trim().toUpperCase();

    // If matching Alumni/Lulus
    if (targetLvl === 'LULUS' || targetLvl === 'ALUMNI') {
      const st = String(s.status || '').toLowerCase().trim();
      return cleanClass === 'LULUS' || cleanClass === 'ALUMNI' || st === 'lulus' || st === 'alumni' || cleanClassId === 'ALUMNI';
    }

    // For regular classes 4-12, exclude students who have status mutasi, pindah, keluar, drop, lulus, alumni
    if (isStudentDepartedOrAlumni(s)) {
      return false;
    }

    // Exact matches
    if (cleanClass === targetLvl || cleanClassId === targetLvl) return true;

    // Code mapping (A4 for 4, B7 for 7, C10 for 10)
    const codeMap: Record<string, string> = {
      '4': 'A4',
      '5': 'A5',
      '6': 'A6',
      '7': 'B7',
      '8': 'B8',
      '9': 'B9',
      '10': 'C10',
      '11': 'C11',
      '12': 'C12',
    };

    const expectedCode = codeMap[targetLvl];
    if (expectedCode && (cleanClass === expectedCode || cleanClassId === expectedCode)) {
      return true;
    }

    // Check if raw string contains word boundary for digit/level e.g. "Kelas 4", "Paket A 4", "4A", "4-A"
    const regex = new RegExp(`(^|[^0-9A-Za-z])(${targetLvl}|${expectedCode || targetLvl})([^0-9A-Za-z]|$)`, 'i');
    if (regex.test(rawClass) || regex.test(rawClassId)) {
      return true;
    }

    // Fallback for "4A" / "4-B" (starts with target level and followed by letter/symbol, not another digit)
    if (cleanClass.startsWith(targetLvl)) {
      const remaining = cleanClass.slice(targetLvl.length);
      if (remaining.length === 0 || isNaN(Number(remaining.charAt(0)))) {
        return true;
      }
    }

    return false;
  };

  const isStudentNonActive = (s: any): boolean => {
    if (!s) return false;
    // Explicitly exclude mutasi, pindah, keluar, drop, lulus, alumni
    if (isStudentDepartedOrAlumni(s)) return false;
    const st = String(s.status || '').trim().toLowerCase();
    if (!st) return false;
    return (
      st.includes('tidak') || 
      st.includes('non') || 
      st.includes('belum')
    );
  };

  const isStudentActive = (s: any): boolean => {
    if (!s) return false;
    if (isStudentDepartedOrAlumni(s)) return false;
    if (isStudentNonActive(s)) return false;
    const st = String(s.status || 'Aktif').trim().toLowerCase();
    return st === 'aktif' || st === 'active' || st === '';
  };

  const filteredClasses = useMemo(() => {
    return masterClassesList.map(c => {
      const clsKey = String(c.cls || c.namaKelas || '').trim();
      const classIdKey = String(c.kelasId || c.id || '').trim();
      const inThisClass = students.filter(s => {
        return matchStudentToLevel(s, clsKey) || 
               (classIdKey && matchStudentToLevel(s, classIdKey)) ||
               (clsKey === 'LULUS' && matchStudentToLevel(s, 'LULUS'));
      });
      const count = inThisClass.length;
      const male = inThisClass.filter(s => String(s.gender || 'L').toUpperCase().startsWith('L')).length;
      const female = inThisClass.filter(s => String(s.gender || '').toUpperCase().startsWith('P')).length;
      const aktif = inThisClass.filter(s => isStudentActive(s)).length;
      const nonAktif = inThisClass.filter(s => isStudentNonActive(s)).length;
      return { ...c, count, male, female, aktif, nonAktif };
    }).filter(c => {
      const q = searchQuery.toLowerCase();
      return !searchQuery || 
        String(c.kelasId || '').toLowerCase().includes(q) ||
        String(c.cls || '').toLowerCase().includes(q) || 
        String(c.namaKelas || '').toLowerCase().includes(q) || 
        String(c.jenjangId || '').toLowerCase().includes(q) || 
        String(c.tingkat || '').toLowerCase().includes(q) || 
        String(c.waliKelasId || '').toLowerCase().includes(q) || 
        String(c.namaWaliKelas || '').toLowerCase().includes(q) || 
        String(c.namatutor || '').toLowerCase().includes(q) || 
        String(c.wali || '').toLowerCase().includes(q) || 
        String(c.ruangan || '').toLowerCase().includes(q) || 
        String(c.tahunAjaran || '').toLowerCase().includes(q) || 
        String(c.status || '').toLowerCase().includes(q);
    });
  }, [masterClassesList, students, searchQuery]);

  // Rekapitulasi Siswa Per Jenjang Kelas (Paket A: 4-6, Paket B: 7-9, Paket C: 10-12)
  const rekapJenjang = useMemo(() => {
    const calc = (levels: string[]) => {
      const rows = levels.map(lvl => {
        const inLevel = students.filter(s => matchStudentToLevel(s, lvl));
        const male = inLevel.filter(s => String(s.gender || 'L').toUpperCase().startsWith('L')).length;
        const female = inLevel.filter(s => String(s.gender || '').toUpperCase().startsWith('P')).length;
        const aktif = inLevel.filter(s => isStudentActive(s)).length;
        const nonAktif = inLevel.filter(s => isStudentNonActive(s)).length;
        return {
          kelas: `Kelas ${lvl}`,
          lvl,
          male,
          female,
          aktif,
          nonAktif,
          total: inLevel.length
        };
      });
      const totalMale = rows.reduce((a, b) => a + b.male, 0);
      const totalFemale = rows.reduce((a, b) => a + b.female, 0);
      const totalAktif = rows.reduce((a, b) => a + b.aktif, 0);
      const totalNonAktif = rows.reduce((a, b) => a + b.nonAktif, 0);
      const totalSiswa = rows.reduce((a, b) => a + b.total, 0);
      return { rows, totalMale, totalFemale, totalAktif, totalNonAktif, totalSiswa };
    };

    const paketA = calc(['4', '5', '6']);
    const paketB = calc(['7', '8', '9']);
    const paketC = calc(['10', '11', '12']);

    const grandTotalMale = paketA.totalMale + paketB.totalMale + paketC.totalMale;
    const grandTotalFemale = paketA.totalFemale + paketB.totalFemale + paketC.totalFemale;
    const grandTotalAktif = paketA.totalAktif + paketB.totalAktif + paketC.totalAktif;
    const grandTotalNonAktif = paketA.totalNonAktif + paketB.totalNonAktif + paketC.totalNonAktif;
    const grandTotalSiswa = paketA.totalSiswa + paketB.totalSiswa + paketC.totalSiswa;

    return {
      paketA,
      paketB,
      paketC,
      grandTotal: {
        male: grandTotalMale,
        female: grandTotalFemale,
        aktif: grandTotalAktif,
        nonAktif: grandTotalNonAktif,
        total: grandTotalSiswa
      }
    };
  }, [students]);

  // Smart Dapodik 2027 Audit Calculations
  const dapodikAuditData = useMemo(() => {
    return auditAllStudentsDapodik(students);
  }, [students]);

  const filteredDapodik = useMemo(() => {
    return dapodikAuditData.results.filter(r => {
      const q = String(searchQuery || '').toLowerCase();
      const matchQ = !searchQuery || 
        String(r.name || '').toLowerCase().includes(q) || 
        String(r.nisn || '').includes(q) || 
        String(r.nik || '').includes(q) || 
        String(r.noKk || '').includes(q) || 
        String(r.namaIbu || '').toLowerCase().includes(q) ||
        String(r.tahunMasuk || '').includes(q);
      const matchC = !filterClass || r.class === filterClass;
      const rawYr = String(r.tahunMasuk || '').trim();
      const matchYr = rawYr.match(/\b(20\d{2}|19\d{2})\b/);
      const normalizedYr = matchYr ? matchYr[1] : rawYr;
      const matchT = !filterTahunMasuk || normalizedYr === filterTahunMasuk;
      let matchS = false;
      if (filterDapodikStatus === 'all') {
        matchS = true;
      } else if (filterDapodikStatus === 'DEWASA') {
        matchS = !!(r.isDewasa || (r.ageYears !== undefined && r.ageYears >= 21));
      } else {
        matchS = r.overallStatus === filterDapodikStatus;
      }
      return matchQ && matchC && matchT && matchS;
    });
  }, [dapodikAuditData, searchQuery, filterClass, filterTahunMasuk, filterDapodikStatus]);

  // Safe page and paginated lists calculations
  const totalParentPages = Math.max(1, Math.ceil(filteredParentRecords.length / pageSizeParent));
  const safePageParent = Math.min(Math.max(1, currentPageParent), totalParentPages);
  const paginatedParentRecords = useMemo(() => {
    return filteredParentRecords.slice((safePageParent - 1) * pageSizeParent, safePageParent * pageSizeParent);
  }, [filteredParentRecords, safePageParent, pageSizeParent]);

  const totalYatimPages = Math.max(1, Math.ceil(filteredYatimPiatu.length / pageSizeYatim));
  const safePageYatim = Math.min(Math.max(1, currentPageYatim), totalYatimPages);
  const paginatedYatimPiatu = useMemo(() => {
    return filteredYatimPiatu.slice((safePageYatim - 1) * pageSizeYatim, safePageYatim * pageSizeYatim);
  }, [filteredYatimPiatu, safePageYatim, pageSizeYatim]);

  const totalKelasPages = Math.max(1, Math.ceil(filteredClasses.length / pageSizeKelas));
  const safePageKelas = Math.min(Math.max(1, currentPageKelas), totalKelasPages);
  const paginatedClasses = useMemo(() => {
    return filteredClasses.slice((safePageKelas - 1) * pageSizeKelas, safePageKelas * pageSizeKelas);
  }, [filteredClasses, safePageKelas, pageSizeKelas]);

  const totalJenjangPages = Math.max(1, Math.ceil(filteredJenjang.length / pageSizeJenjang));
  const safePageJenjang = Math.min(Math.max(1, currentPageJenjang), totalJenjangPages);
  const paginatedJenjang = useMemo(() => {
    return filteredJenjang.slice((safePageJenjang - 1) * pageSizeJenjang, safePageJenjang * pageSizeJenjang);
  }, [filteredJenjang, safePageJenjang, pageSizeJenjang]);

  const totalMapelPages = Math.max(1, Math.ceil(filteredMapel.length / pageSizeMapel));
  const safePageMapel = Math.min(Math.max(1, currentPageMapel), totalMapelPages);
  const paginatedMapel = useMemo(() => {
    return filteredMapel.slice((safePageMapel - 1) * pageSizeMapel, safePageMapel * pageSizeMapel);
  }, [filteredMapel, safePageMapel, pageSizeMapel]);

  const totalTahunPages = Math.max(1, Math.ceil(filteredTahun.length / pageSizeTahun));
  const safePageTahun = Math.min(Math.max(1, currentPageTahun), totalTahunPages);
  const paginatedTahun = useMemo(() => {
    return filteredTahun.slice((safePageTahun - 1) * pageSizeTahun, safePageTahun * pageSizeTahun);
  }, [filteredTahun, safePageTahun, pageSizeTahun]);

  const totalSemesterPages = Math.max(1, Math.ceil(filteredSemester.length / pageSizeSemester));
  const safePageSemester = Math.min(Math.max(1, currentPageSemester), totalSemesterPages);
  const paginatedSemester = useMemo(() => {
    return filteredSemester.slice((safePageSemester - 1) * pageSizeSemester, safePageSemester * pageSizeSemester);
  }, [filteredSemester, safePageSemester, pageSizeSemester]);

  const totalLiburPages = Math.max(1, Math.ceil(filteredLibur.length / pageSizeLibur));
  const safePageLibur = Math.min(Math.max(1, currentPageLibur), totalLiburPages);
  const paginatedLibur = useMemo(() => {
    return filteredLibur.slice((safePageLibur - 1) * pageSizeLibur, safePageLibur * pageSizeLibur);
  }, [filteredLibur, safePageLibur, pageSizeLibur]);

  const totalDapodikPages = Math.max(1, Math.ceil(filteredDapodik.length / pageSizeDapodik));
  const safePageDapodik = Math.min(Math.max(1, currentPageDapodik), totalDapodikPages);
  const paginatedDapodik = useMemo(() => {
    return filteredDapodik.slice((safePageDapodik - 1) * pageSizeDapodik, safePageDapodik * pageSizeDapodik);
  }, [filteredDapodik, safePageDapodik, pageSizeDapodik]);

  // Auto-Sync and Master Sync Handlers for Orang Tua and Yatim Piatu
  const handleAutoSyncParents = async () => {
    let updatedStudentsCount = 0;
    const currentStudents = useStore.getState().students;
    const updatedList = currentStudents.map(s => {
      let needsUpdate = false;
      const updates: any = {};

      const bestParentName = s.parentName || s.namaAyah || (s as any).fatherName || s.namaIbu || (s as any).NamaIbu || s.namaWali;
      if (bestParentName && !s.parentName) {
        updates.parentName = bestParentName;
        needsUpdate = true;
      }

      const bestPhone = s.parentPhone || s.tlpAyah || s.tlpIbu || s.tlpWali || s.noHp || s.phone;
      if (bestPhone && !s.parentPhone) {
        updates.parentPhone = bestPhone;
        needsUpdate = true;
      }

      if (needsUpdate) {
        updatedStudentsCount++;
        return { ...s, ...updates, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    if (updatedStudentsCount > 0) {
      useStore.getState().setStudents(updatedList);
    }

    if (settings.scriptUrl) {
      setIsSyncingGAS(true);
      try {
        await fetchFromGAS(settings.scriptUrl, {
          action: 'sync',
          data: updatedList,
          teachers: useStore.getState().teachers,
          spreadsheetId: settings.spreadsheetId
        });
        // Kirim data terformat lengkap ke tabel ORANG_TUA (17 Kolom)
        const ortuPayload = allParentRecords.map((r, idx) => ({
          OrtuID: r.id || `ORTU-${String(1001 + idx).slice(1)}`,
          SiswaID: r.studentId || r.studentNis || '-',
          NamaSiswa: r.studentName || '-',
          NISN: r.studentNisn && r.studentNisn !== '-' ? (r.studentNisn.startsWith("'") ? r.studentNisn : `'${r.studentNisn}`) : '-',
          Hubungan: r.relation || r.relationType || 'Orang Tua',
          Nama: r.parentName || '-',
          NIK: r.nik && r.nik !== '-' ? (r.nik.startsWith("'") ? r.nik : `'${r.nik}`) : '-',
          TempatLahir: r.birthPlace || '-',
          TanggalLahir: r.birthDate || '-',
          Pendidikan: r.education || '-',
          Pekerjaan: r.job && r.job !== '-' ? r.job : '-',
          Penghasilan: r.income && r.income !== '-' ? r.income : '-',
          NoHP: r.phone && r.phone !== '-' ? (r.phone.startsWith("'") ? r.phone : `'${r.phone}`) : '-',
          Alamat: r.address || '-',
          StatusHidup: r.statusKondisi || 'Masih Hidup',
          CreatedAt: (r.student as any)?.createdAt || new Date().toISOString(),
          UpdatedAt: (r.student as any)?.updatedAt || new Date().toISOString()
        }));
        await fetchFromGAS(settings.scriptUrl, {
          action: 'syncTable',
          table: 'ORANG_TUA',
          data: ortuPayload,
          spreadsheetId: settings.spreadsheetId
        });
        await fetchFromGAS(settings.scriptUrl, {
          action: 'AUTO_POPULATE_ORTU_YATIM',
          spreadsheetId: settings.spreadsheetId
        });
        setSyncFeedback(`✅ Berhasil menyinkronkan data Orang Tua & Wali (${allParentRecords.length} data) ke Google Sheets!`);
      } catch (err: any) {
        setSyncFeedback(`⚠️ Data orang tua lokal diperbarui, namun sync GAS tertunda: ${err?.message || ''}`);
      } finally {
        setIsSyncingGAS(false);
      }
    } else {
      setSyncFeedback(`✅ Berhasil menyinkronkan data Orang Tua & Wali! Total ${allParentRecords.length} entitas orang tua terpetakan secara otomatis.`);
    }
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  const handleAutoSyncYatim = async () => {
    let updatedCount = 0;
    const currentStudents = useStore.getState().students;
    const updatedList = currentStudents.map(s => {
      const computed = getStudentStatusYatim(s);
      const current = s.statusYatim || (s as any)['StatusYatim'];
      if (current !== computed) {
        updatedCount++;
        return { ...s, statusYatim: computed, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    if (updatedCount > 0) {
      useStore.getState().setStudents(updatedList);
    }

    if (settings.scriptUrl) {
      setIsSyncingGAS(true);
      try {
        await fetchFromGAS(settings.scriptUrl, {
          action: 'sync',
          data: updatedList,
          teachers: useStore.getState().teachers,
          spreadsheetId: settings.spreadsheetId
        });
        // Kirim langsung data yatim ke tabel YATIM_PIATU via syncTable (HANYA SISWA AKTIF)
        const activeListForYatim = updatedList.filter(s => matchStatusActive(s?.status));
        const yatimPayload = activeListForYatim.map((s, idx) => ({
          YatimID: `YTM-${String(1001 + idx).slice(1)}`,
          NoPDKT: (s.id || s.nis) ? `'${s.id || s.nis}` : `SISWA-${idx + 1}`,
          NISN: s.nisn ? (s.nisn.startsWith("'") ? s.nisn : `'${s.nisn}`) : '-',
          NamaSiswa: s.name,
          Kelas: s.class || '-',
          StatusYatim: s.statusYatim || getStudentStatusYatim(s),
          NamaAyah: s.namaAyah || (s as any).fatherName || s.parentName || '-',
          StatusAyah: s.statusAyah || ((s.statusYatim === 'Yatim' || s.statusYatim === 'Yatim Piatu') ? 'Meninggal Dunia' : 'Masih Hidup'),
          NamaIbu: s.namaIbu || (s as any).NamaIbu || '-',
          StatusIbu: s.statusIbu || ((s.statusYatim === 'Piatu' || s.statusYatim === 'Yatim Piatu') ? 'Meninggal Dunia' : 'Masih Hidup'),
          NamaWali: s.namaWali || '-',
          NoHPWali: (s.tlpWali || s.parentPhone || s.phone) ? `'${s.tlpWali || s.parentPhone || s.phone}` : '-',
          Alamat: formatFullAddress(s),
          PenerimaKPS_PIP: (s.penerimaKps === 'Ya' || s.kipUrl || s.noKip) ? 'Ya' : 'Tidak',
          Keterangan: 'Sinkronisasi dari Master Siswa',
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        }));

        await fetchFromGAS(settings.scriptUrl, {
          action: 'syncTable',
          table: 'YATIM_PIATU',
          data: yatimPayload,
          spreadsheetId: settings.spreadsheetId
        });
        await fetchFromGAS(settings.scriptUrl, {
          action: 'AUTO_POPULATE_ORTU_YATIM',
          spreadsheetId: settings.spreadsheetId
        });
        setSyncFeedback(`✅ Berhasil menyinkronkan status Yatim/Piatu ke Google Sheets (Sheet SISWA & YATIM_PIATU)! (${updatedCount} data diselaraskan)`);
      } catch (err: any) {
        setSyncFeedback(`⚠️ Status lokal diperbarui (${updatedCount} data), namun sync GAS tertunda: ${err?.message || ''}`);
      } finally {
        setIsSyncingGAS(false);
      }
    } else {
      setSyncFeedback(`✅ Berhasil menyinkronkan status Yatim/Piatu (${updatedCount > 0 ? `${updatedCount} data diselaraskan.` : 'Semua data siswa sudah akurat.'})`);
    }
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  const handleSyncGasBackend = async () => {
    if (!settings.scriptUrl) {
      alert("URL Google Apps Script belum dikonfigurasi di menu Pengaturan. Sinkronisasi lokal telah selesai.");
      return;
    }

    setIsSyncingGAS(true);
    try {
      // 1. Sync siswa dulu
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: students,
        teachers: useStore.getState().teachers,
        spreadsheetId: settings.spreadsheetId
      });

      // 2. Sync langsung tabel ORANG_TUA (17 Kolom)
      const ortuPayload = allParentRecords.map((r, idx) => ({
        OrtuID: r.id || `ORTU-${String(1001 + idx).slice(1)}`,
        SiswaID: r.studentId || r.studentNis || '-',
        NamaSiswa: r.studentName || '-',
        NISN: r.studentNisn && r.studentNisn !== '-' ? (r.studentNisn.startsWith("'") ? r.studentNisn : `'${r.studentNisn}`) : '-',
        Hubungan: r.relation || r.relationType || 'Orang Tua',
        Nama: r.parentName || '-',
        NIK: r.nik && r.nik !== '-' ? (r.nik.startsWith("'") ? r.nik : `'${r.nik}`) : '-',
        TempatLahir: r.birthPlace || '-',
        TanggalLahir: r.birthDate || '-',
        Pendidikan: r.education || '-',
        Pekerjaan: r.job && r.job !== '-' ? r.job : '-',
        Penghasilan: r.income && r.income !== '-' ? r.income : '-',
        NoHP: r.phone && r.phone !== '-' ? (r.phone.startsWith("'") ? r.phone : `'${r.phone}`) : '-',
        Alamat: r.address || '-',
        StatusHidup: r.statusKondisi || 'Masih Hidup',
        CreatedAt: (r.student as any)?.createdAt || new Date().toISOString(),
        UpdatedAt: (r.student as any)?.updatedAt || new Date().toISOString()
      }));

      await fetchFromGAS(settings.scriptUrl, {
        action: 'syncTable',
        table: 'ORANG_TUA',
        data: ortuPayload,
        spreadsheetId: settings.spreadsheetId
      });

      // 3. Sync langsung tabel YATIM_PIATU (HANYA SISWA AKTIF)
      const activeStudentsForYatim = students.filter(s => matchStatusActive(s?.status));
      const yatimPayload = activeStudentsForYatim.map((s, idx) => ({
        YatimID: `YTM-${String(1001 + idx).slice(1)}`,
        NoPDKT: s.id || s.nis || `SISWA-${idx + 1}`,
        NISN: s.nisn ? (s.nisn.startsWith("'") ? s.nisn : `'${s.nisn}`) : '-',
        NamaSiswa: s.name,
        Kelas: s.class || '-',
        StatusYatim: s.statusYatim || getStudentStatusYatim(s),
        NamaAyah: s.namaAyah || (s as any).fatherName || s.parentName || '-',
        StatusAyah: s.statusAyah || ((s.statusYatim === 'Yatim' || s.statusYatim === 'Yatim Piatu') ? 'Meninggal Dunia' : 'Masih Hidup'),
        NamaIbu: s.namaIbu || (s as any).NamaIbu || '-',
        StatusIbu: s.statusIbu || ((s.statusYatim === 'Piatu' || s.statusYatim === 'Yatim Piatu') ? 'Meninggal Dunia' : 'Masih Hidup'),
        NamaWali: s.namaWali || '-',
        NoHPWali: (s.tlpWali || s.parentPhone || s.phone) ? `'${s.tlpWali || s.parentPhone || s.phone}` : '-',
        Alamat: formatFullAddress(s),
        PenerimaKPS_PIP: (s.penerimaKps === 'Ya' || s.kipUrl || s.noKip) ? 'Ya' : 'Tidak',
        Keterangan: 'Sinkronisasi dari Master Siswa',
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      }));

      await fetchFromGAS(settings.scriptUrl, {
        action: 'syncTable',
        table: 'YATIM_PIATU',
        data: yatimPayload,
        spreadsheetId: settings.spreadsheetId
      });

      // 4. Panggil auto-populate GAS sebagai pelengkap
      const res = await fetchFromGAS(settings.scriptUrl, {
        action: 'AUTO_POPULATE_ORTU_YATIM',
        spreadsheetId: settings.spreadsheetId
      });

      setSyncFeedback(`⚡ Sukses Sinkronisasi Spreadsheet! Sheet ORANG_TUA (${allParentRecords.length} data) dan YATIM_PIATU (${students.length} data) berhasil ditulis langsung ke Google Sheets.`);
    } catch (err: any) {
      console.warn("GAS sync notice:", err);
      setSyncFeedback("⚠️ Sinkronisasi lokal sukses. Untuk sinkronisasi Google Spreadsheet, pastikan Web App GAS telah di-deploy dengan versi terbaru.");
    } finally {
      setIsSyncingGAS(false);
      setTimeout(() => setSyncFeedback(null), 8000);
    }
  };

  // Export Excel Handlers for Master Data
  const handleExportOrangTuaExcel = () => {
    if (allParentRecords.length === 0) {
      alert("Tidak ada data orang tua untuk diekspor.");
      return;
    }
    exportOrangTuaMasterToExcel(students);
  };

  const handleExportYatimExcel = () => {
    if (activeYatimStudents.length === 0) {
      alert("Tidak ada data siswa aktif untuk diekspor.");
      return;
    }
    exportYatimPiatuToExcel(activeYatimStudents);
  };

  const handlePrintYatimReport = () => {
    window.print();
  };

  const handleExportKelasExcel = () => {
    if (filteredClasses.length === 0) {
      alert("Tidak ada data kelas untuk diekspor.");
      return;
    }
    const rows = filteredClasses.map((item, idx) => ({
      No: idx + 1,
      'KelasID': item.kelasId || item.id || item.cls,
      'NamaKelas': item.namaKelas || item.cls,
      'JenjangID': item.jenjangId || 'J001',
      'Tingkat': item.tingkat || `Kelas ${item.cls}`,
      'WaliKelasID': item.waliKelasId || '-',
      'NamaWaliKelas': item.namaWaliKelas || item.namatutor || item.wali || '-',
      'NamaTutor': item.namatutor || item.namaWaliKelas || item.wali || '-',
      'Ruangan': item.ruangan || '-',
      'Kapasitas': item.kapasitas !== undefined && item.kapasitas !== '' && item.kapasitas !== 0 ? item.kapasitas : '-',
      'TahunAjaran': item.tahunAjaran || (item.status === 'ALUMNI' ? '-' : '2026/2027'),
      'Status': item.status || 'AKTIF',
      'Siswa Laki-laki': item.male || 0,
      'Siswa Perempuan': item.female || 0,
      'Total Siswa': item.count || 0
    }));
    exportToExcel(rows, `Data_Kelas_dan_Wali_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleSyncKelasGAS = async () => {
    if (!settings.scriptUrl) {
      alert("Script URL Google Apps Script belum diatur di menu Pengaturan!");
      return;
    }
    setIsSyncingGAS(true);
    try {
      const kelasPayload = masterClassesList.map(c => ({
        KelasID: c.kelasId || c.id || c.cls,
        NamaKelas: c.namaKelas || c.cls,
        JenjangID: c.jenjangId || 'J001',
        Tingkat: c.tingkat || `Kelas ${c.cls}`,
        WaliKelasID: c.waliKelasId || '-',
        NamaWaliKelas: c.namaWaliKelas || c.namatutor || c.wali || '-',
        NamaTutor: c.namatutor || c.namaWaliKelas || c.wali || '-',
        Ruangan: c.ruangan || '-',
        Kapasitas: c.kapasitas !== undefined && c.kapasitas !== '' ? c.kapasitas : 36,
        TahunAjaran: c.tahunAjaran || (c.status === 'ALUMNI' ? '-' : '2026/2027'),
        Status: c.status || 'AKTIF'
      }));

      await fetchFromGAS(settings.scriptUrl, {
        action: 'syncTable',
        table: 'KELAS',
        data: kelasPayload,
        spreadsheetId: settings.spreadsheetId
      });

      setSyncFeedback(`⚡ Sukses Sinkronisasi! Sheet KELAS (${kelasPayload.length} rombel & wali kelas) berhasil ditulis ke Google Sheets.`);
    } catch (err: any) {
      console.warn("GAS sync notice:", err);
      setSyncFeedback(`⚠️ Sinkronisasi lokal sukses. Untuk sinkronisasi Google Spreadsheet, pastikan Web App GAS telah di-deploy.`);
    } finally {
      setIsSyncingGAS(false);
      setTimeout(() => setSyncFeedback(null), 8000);
    }
  };

  const handleExportJenjangExcel = () => {
    if (filteredJenjang.length === 0) {
      alert("Tidak ada data jenjang untuk diekspor.");
      return;
    }
    const rows = filteredJenjang.map((j: any, idx: number) => ({
      No: idx + 1,
      'JenjangID': j.jenjangId || j.id || `J00${idx + 1}`,
      'Kode': j.kode || '',
      'NamaJenjang': j.namaJenjang || j.nama || '',
      'TingkatAwal': j.tingkatAwal || '',
      'TingkatTengah': j.tingkatTengah || '',
      'TingkatAkhir': j.tingkatAkhir || '',
      'Keterangan': j.keterangan || '',
      'Aktif': j.aktif || j.status || 'Aktif'
    }));
    exportToExcel(rows, `Data_Jenjang_Pendidikan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportMapelExcel = () => {
    if (filteredMapel.length === 0) {
      alert("Tidak ada data mata pelajaran untuk diekspor.");
      return;
    }
    const rows = filteredMapel.map((m, idx) => ({
      No: idx + 1,
      'Kode Mapel': m.kode,
      'Nama Mata Pelajaran': m.nama,
      'Kategori Kurikulum': m.kategori,
      'Beban JP/Minggu': m.jp,
      'KKM / KKTP Minimal': m.kkm,
      'Guru Koordinator': m.guru
    }));
    exportToExcel(rows, `Data_Mata_Pelajaran_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Sinkronisasi data Mapel langsung ke Sheet MAPEL di Google Spreadsheet (tanpa simpan ke db lokal)
  const handleSyncMapelToGAS = async (mapelDataToSync?: any[]) => {
    const listToSync = mapelDataToSync || masterMapelList;
    const scriptEndpoint = settings.scriptUrl || settings.gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
    const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;

    if (!scriptEndpoint) {
      alert("URL Google Apps Script belum dikonfigurasi. Silakan periksa menu Pengaturan.");
      return;
    }

    setIsSyncingMapel(true);
    try {
      const mapelPayload = listToSync.map((m: any, idx: number) => ({
        MapelID: m.mapelId || m.id || `MPL_${(idx + 1).toString().padStart(3, '0')}`,
        Kode: m.kode || '',
        NamaMapel: m.nama || m.namaMapel || '',
        Kategori: m.kategori || 'Umum',
        KKM: m.kkm || 75,
        GuruID: m.guruId || '',
        GuruPengampu: m.guru || m.guruPengampu || '',
        Jenjang: m.jenjang || 'PAKET A',
        Kelas: m.kelas || '',
        Kelompok: m.kelompok || '',
        Fase: m.fase || '',
        BebanJP: m.bebanJp || m.jp || 2,
        Status: m.status || 'AKTIF'
      }));

      await fetchFromGAS(scriptEndpoint, {
        action: 'syncData',
        table: 'MAPEL',
        data: mapelPayload,
        spreadsheetId: spreadsheetId
      });

      setSyncFeedback(`✅ Berhasil menyinkronkan seluruh ${listToSync.length} Mata Pelajaran langsung ke Sheet MAPEL Google Spreadsheet!`);
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      console.error("Gagal sync Mapel ke Spreadsheet:", err);
      setSyncFeedback(`⚠️ Gagal menyinkronkan ke Sheet MAPEL: ${err.message || 'Cek koneksi script'}`);
    } finally {
      setIsSyncingMapel(false);
    }
  };

  // Helper untuk memformat payload Hari Libur agar cocok 100% dengan kolom Google Spreadsheet & Google Apps Script
  const formatLiburForSpreadsheetPayload = (list: any[]) => {
    return (list || []).map((l: any, idx: number) => {
      const hId = l.hariLiburId || l.HariLiburID || l.id || `H${idx + 1}`;
      const tglMulai = l.tanggal || l.Tanggal || l.tanggalMulai || l.tgl || '';
      const tglSelesai = l.tanggalSelesai || l.TanggalSelesai || l.tglSelesai || tglMulai;
      const namaLibur = l.nama || l.Nama || l.agenda || l.Agenda || l.kegiatan || '';
      const jenisLibur = l.jenis || l.Jenis || l.kategori || 'Libur Nasional / Libur Umum';
      const ta = l.tahunAjaran || l.TahunAjaran || l.tahun || '2026/2027';
      const ket = l.keterangan !== undefined ? l.keterangan : (l.Keterangan !== undefined ? l.Keterangan : '');
      const hari = l.hari || '';

      return {
        // 1. Kolom Utama Google Spreadsheet (Exact PascalCase)
        HariLiburID: hId,
        Tanggal: tglMulai,
        TanggalSelesai: tglSelesai,
        Nama: namaLibur,
        Jenis: jenisLibur,
        TahunAjaran: ta,
        Keterangan: ket,

        // 2. Alias Kompatibilitas Versi Backend GAS (camelCase & lowercase)
        id: hId,
        hariLiburId: hId,
        liburId: hId,
        liburid: hId,
        tanggal: tglMulai,
        tgl: tglMulai,
        tanggalMulai: tglMulai,
        tanggalSelesai: tglSelesai,
        tglSelesai: tglSelesai,
        nama: namaLibur,
        agenda: namaLibur,
        jenis: jenisLibur,
        kategori: jenisLibur,
        tahunAjaran: ta,
        tahun: ta,
        keterangan: ket,
        hari: hari
      };
    });
  };

  // Sinkronisasi data Hari Libur langsung ke Sheet HARI_LIBUR di Google Spreadsheet
  const handleSyncLiburToGAS = async (liburDataToSync?: any[]) => {
    const listToSync = liburDataToSync || masterLiburList;
    const scriptEndpoint = settings.scriptUrl || settings.gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
    const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;

    if (!scriptEndpoint) {
      alert("URL Google Apps Script belum dikonfigurasi. Silakan periksa menu Pengaturan.");
      return;
    }

    setIsSyncingLibur(true);
    try {
      const liburPayload = formatLiburForSpreadsheetPayload(listToSync);

      await fetchFromGAS(scriptEndpoint, {
        action: 'syncData',
        table: 'HARI_LIBUR',
        data: liburPayload,
        spreadsheetId: spreadsheetId
      });

      setSyncFeedback(`✅ Berhasil menyinkronkan ${listToSync.length} Hari Libur langsung ke Sheet HARI_LIBUR Google Spreadsheet! (Kolom: HariLiburID, Tanggal, TanggalSelesai, Nama, Jenis, TahunAjaran, Keterangan)`);
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      console.error("Gagal sync Hari Libur ke Spreadsheet:", err);
      setSyncFeedback(`⚠️ Gagal menyinkronkan ke Sheet HARI_LIBUR: ${err.message || 'Cek koneksi script'}`);
    } finally {
      setIsSyncingLibur(false);
    }
  };

  const handleExportTahunAjaranExcel = () => {
    if (masterTahunList.length === 0) {
      alert("Tidak ada data tahun ajaran untuk diekspor.");
      return;
    }
    const rows = masterTahunList.map((t: any, idx: number) => ({
      No: idx + 1,
      'TAID': t.taId || t.id || `TA00${idx + 1}`,
      'Tahun Pelajaran': t.tahunPelajaran || t.tahun || t.tahunAjaran,
      'Semester': t.semester || 'Semester Ganjil & Genap',
      'Rentang Periode': t.rentangPeriode || t.rentang || t.periode,
      'Kurikulum': t.kurikulum || 'Kurikulum Merdeka',
      'Aktif': t.status || t.aktif || 'Non-Aktif'
    }));
    exportToExcel(rows, `Data_Tahun_Ajaran_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportSemesterExcel = () => {
    if (filteredSemester.length === 0) {
      alert("Tidak ada data semester untuk diekspor.");
      return;
    }
    const rows = filteredSemester.map((s: any, idx: number) => ({
      No: idx + 1,
      'SemesterID': s.semesterId || s.id || `SM${(idx + 1).toString().padStart(2, '0')}`,
      'Nama': s.nama,
      'TAID': s.taId || s.tahunAjaranId || '',
      'TahunPelajaran': s.tahunPelajaran || s.tahunAjaran || s.tahun || '',
      'Semester': s.semester,
      'TanggalMulai': s.tanggalMulai || '',
      'TanggalSelesai': s.tanggalSelesai || '',
      'Aktif': (s.aktif === 'AKTIF' || s.status === 'AKTIF' || s.aktif === 'Aktif' || s.status === 'Aktif') ? 'AKTIF' : 'NONAKTIF',
      'tipe': s.tipe || (s.semester === 'Genap' ? 'EVEN' : 'ODD')
    }));
    exportToExcel(rows, `Data_Semester_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportHariLiburExcel = () => {
    if (filteredLibur.length === 0) {
      alert("Tidak ada data hari libur untuk diekspor.");
      return;
    }
    const rows = filteredLibur.map((l: any, idx: number) => ({
      No: idx + 1,
      'Tanggal / Rentang': l.tanggal,
      'Hari': l.hari,
      'Nama Kegiatan / Libur': l.agenda,
      'Kategori': l.jenis,
      'Keterangan Tambahan': l.keterangan || '-'
    }));
    exportToExcel(rows, `Data_Hari_Libur_Kalender_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportDapodikExcel = () => {
    if (filteredDapodik.length === 0) {
      alert("Tidak ada data Dapodik untuk diekspor.");
      return;
    }
    // Ekspor 14 kolom standar skema database DAPODIK_VALIDASI
    exportDapodikValidasiToExcel(filteredDapodik, `DAPODIK_VALIDASI_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Otomatis generate & simpan seluruh 14 kolom skema DAPODIK_VALIDASI
  const handleSaveToDapodikValidasiTable = async () => {
    setIsSavingDapodik(true);
    const standardColumns = [
      "ValidasiID", "SiswaID", "NISN", "NIK", "NoKK", "NamaSiswa",
      "NamaIbuKandung", "TanggalLahir", "StatusDapodik", "CatatanInvalid",
      "TglValidasi", "UpdatedAt", "TahunAjaran", "Buktiterdaftar"
    ];

    try {
      const standardRows = generateDapodikValidasiRows(students, settings.academicYear || '2026/2027');
      
      // 1. Simpan ke database lokal aplikasi
      db.set('dapodik_validations', standardRows);

      let gasSynced = false;
      let gasMsg = '';

      // 2. Jika konfigurasi Google Apps Script tersedia, kirim langsung ke Google Spreadsheet
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
      if (scriptEndpoint) {
        try {
          // A. Sync Sheet SISWA Terlebih Dahulu
          await fetchFromGAS(scriptEndpoint, {
            action: 'sync',
            data: students,
            teachers: useStore.getState().teachers,
            spreadsheetId: settings.spreadsheetId
          });

          // B. Sync Sheet DAPODIK_VALIDASI (14 Kolom Standar)
          await fetchFromGAS(scriptEndpoint, {
            action: 'syncData',
            table: 'DAPODIK_VALIDASI',
            data: standardRows,
            spreadsheetId: settings.spreadsheetId
          });

          // C. Auto Populate Ortu & Yatim
          try {
            await fetchFromGAS(scriptEndpoint, {
              action: 'AUTO_POPULATE_ORTU_YATIM',
              spreadsheetId: settings.spreadsheetId
            });
          } catch (ePop) {}

          gasSynced = true;
          gasMsg = `Tersinkronisasi otomatis & simultan ke Sheet "SISWA" dan Sheet "DAPODIK_VALIDASI" di Google Spreadsheet (${(settings.spreadsheetId || 'default').slice(0, 8)}...).`;
        } catch (gasErr: any) {
          console.warn("GAS sync error:", gasErr);
          gasMsg = `Data telah tersimpan di Database Lokal aplikasi. Namun pengiriman ke Google Spreadsheet terkendala: ${gasErr.message || 'Periksa koneksi Google Apps Script'}`;
        }
      } else {
        gasMsg = 'Tersimpan di Database Lokal Aplikasi. (Tips: Masukkan URL Web App Google Apps Script di menu Pengaturan untuk sinkronisasi otomatis langsung ke Google Sheets).';
      }

      setSaveDapodikResultModal({
        open: true,
        success: true,
        count: standardRows.length,
        gasSynced,
        message: `Berhasil mengaudit & menyinkronkan ${standardRows.length} data ke Sheet SISWA & DAPODIK_VALIDASI!`,
        details: gasMsg,
        columns: standardColumns
      });

      setSyncFeedback(`✅ Berhasil menyimpan & menyinkronkan ${standardRows.length} data ke Sheet SISWA & DAPODIK_VALIDASI!`);
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err: any) {
      console.error(err);
      setSaveDapodikResultModal({
        open: true,
        success: false,
        count: 0,
        gasSynced: false,
        message: 'Gagal mengaudit atau menyimpan data ke tabel DAPODIK_VALIDASI.',
        details: err?.message || 'Terjadi kesalahan sistem saat memproses audit data.'
      });
    } finally {
      setIsSavingDapodik(false);
    }
  };

  // Smart Batch Clean and Normalization
  const handleBatchAutoCleanDapodik = async () => {
    setIsScanningDapodik(true);
    let cleanedCount = 0;

    students.forEach(s => {
      let needsUpdate = false;
      const patch: Partial<Student> = {};

      // Clean NISN
      const rawNisn = String(s.nisn || '').trim().replace(/\D/g, '');
      if (rawNisn !== (s.nisn || '')) {
        patch.nisn = rawNisn;
        needsUpdate = true;
      }

      // Clean NIK
      const rawNik = String(s.nik || '').trim().replace(/[-.\s]/g, '');
      if (rawNik !== (s.nik || '')) {
        patch.nik = rawNik;
        needsUpdate = true;
      }

      // Clean KK
      const rawKk = String(s.noKk || '').trim().replace(/[-.\s]/g, '');
      if (rawKk !== (s.noKk || '')) {
        patch.noKk = rawKk;
        needsUpdate = true;
      }

      // Clean Mother Name
      const motherRaw = String(s.namaIbu || s.NamaIbu || '').trim();
      if (/^(ibu|ibunya|mama|none|null|undefined|-|\.|\?)$/i.test(motherRaw)) {
        patch.namaIbu = '';
        patch.NamaIbu = '';
        needsUpdate = true;
      }

      if (needsUpdate) {
        updateStudent(s.id, { ...patch, updatedAt: new Date().toISOString() });
        cleanedCount++;
      }
    });

    const finalStudents = useStore.getState().students;
    db.set('students', finalStudents);

    const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
    if (scriptEndpoint && cleanedCount > 0) {
      try {
        // 1. Sync SISWA
        await fetchFromGAS(scriptEndpoint, {
          action: 'sync',
          data: finalStudents,
          teachers: useStore.getState().teachers,
          spreadsheetId: settings.spreadsheetId
        });

        // 2. Sync DAPODIK_VALIDASI
        const standardDapodikRows = generateDapodikValidasiRows(finalStudents, settings.academicYear || '2026/2027');
        db.set('dapodik_validations', standardDapodikRows);
        await fetchFromGAS(scriptEndpoint, {
          action: 'syncData',
          table: 'DAPODIK_VALIDASI',
          data: standardDapodikRows,
          spreadsheetId: settings.spreadsheetId
        });

        // 3. Auto Populate Ortu & Yatim
        try {
          await fetchFromGAS(scriptEndpoint, {
            action: 'AUTO_POPULATE_ORTU_YATIM',
            spreadsheetId: settings.spreadsheetId
          });
        } catch (ePop) {}

        setSyncFeedback(`⚡ Normalisasi cerdas selesai! ${cleanedCount} data berhasil dibersihkan & tersinkron simultan ke Sheet SISWA dan Sheet DAPODIK_VALIDASI.`);
      } catch (err: any) {
        console.warn("GAS sync error:", err);
        setSyncFeedback(`⚡ Normalisasi lokal selesai (${cleanedCount} data), tetapi sinkronisasi Google Sheets terkendala: ${err.message || 'Cek koneksi script'}`);
      }
    } else {
      setSyncFeedback(
        cleanedCount > 0 
          ? `⚡ Normalisasi cerdas selesai! ${cleanedCount} data berhasil dibersihkan di database lokal.`
          : `✨ Semua data (${students.length} siswa) sudah dalam format bersih & valid standar Dapodik!`
      );
    }

    setIsScanningDapodik(false);
    setTimeout(() => setSyncFeedback(null), 6000);
  };

  // Helper untuk membuka modal edit Dapodik dengan state duplikasi terisi
  const openEditDapodik = (r: DapodikAuditResult) => {
    const currentStudent = students.find(s => s.id === r.studentId);
    setEditModal({
      open: true,
      title: `Edit Data Dapodik: ${r.name}`,
      type: 'dapodik',
      data: {
        id: r.studentId,
        name: r.name,
        nisn: r.nisn || '',
        nik: r.nik || '',
        noKk: r.noKk || '',
        NamaIbu: r.namaIbu || '',
        namaAyah: r.namaAyah || '',
        birthPlace: r.birthPlace || '',
        birthDate: r.birthDate || '',
        tahunMasuk: r.tahunMasuk || '',
        gender: r.gender || 'L',
        class: r.class || currentStudent?.class || '1A',
        approvedDuplicateNisn: Boolean(currentStudent?.approvedDuplicateNisn),
        approvedDuplicateNik: Boolean(currentStudent?.approvedDuplicateNik)
      }
    });
  };

  // Handler untuk Konfirmasi Pengesahan Duplikasi (Anggap Benar / Batal)
  const handleToggleDuplicateApproval = async (studentId: string, field: 'nisn' | 'nik', approved: boolean) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Tampilkan popup proses cepat
    setSavingProgressModal({
      open: true,
      status: 'saving',
      title: approved ? 'Mengesahkan Duplikasi' : 'Membatalkan Pengesahan',
      message: `Sedang memproses dan menyelaraskan status duplikasi ${field.toUpperCase()}...`,
      stepText: 'Menyimpan & memperbarui status validasi...'
    });

    const valToMatch = field === 'nisn'
      ? String(student.nisn || '').trim()
      : String(student.nik || '').trim().replace(/[-.\s]/g, '');

    // Cari semua siswa yang memiliki NISN / NIK yang sama agar keduanya langsung tersahkan / tervalidasi
    const affectedStudents = students.filter(s => {
      if (s.id === studentId) return true;
      if (!valToMatch) return false;
      const sVal = field === 'nisn'
        ? String(s.nisn || '').trim()
        : String(s.nik || '').trim().replace(/[-.\s]/g, '');
      return sVal === valToMatch;
    });

    const updates: Partial<Student> = field === 'nisn'
      ? { approvedDuplicateNisn: approved }
      : { approvedDuplicateNik: approved };

    // Update seluruh siswa terdampak
    affectedStudents.forEach(s => {
      updateStudent(s.id, updates);
    });

    const nextList = useStore.getState().students;
    db.set('students', nextList);

    // Perbarui modal audit yang sedang aktif jika ada
    if (selectedDapodikAudit) {
      const currentTarget = nextList.find(s => s.id === selectedDapodikAudit.studentId);
      if (currentTarget) {
        const updatedAudit = auditStudentDapodik(currentTarget, nextList);
        setSelectedDapodikAudit(updatedAudit);
      }
    }

    // Sync ke GAS & DB
    const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
    if (scriptEndpoint) {
      setSavingProgressModal(prev => prev ? {
        ...prev,
        stepText: 'Menyinkronkan ke Google Spreadsheet (Sheet SISWA & DAPODIK_VALIDASI)...'
      } : null);
      try {
        await fetchFromGAS(scriptEndpoint, {
          action: 'sync',
          data: nextList,
          teachers: useStore.getState().teachers,
          spreadsheetId: settings.spreadsheetId
        });

        const standardDapodikRows = generateDapodikValidasiRows(nextList, settings.academicYear || '2026/2027');
        db.set('dapodik_validations', standardDapodikRows);
        await fetchFromGAS(scriptEndpoint, {
          action: 'syncData',
          table: 'DAPODIK_VALIDASI',
          data: standardDapodikRows,
          spreadsheetId: settings.spreadsheetId
        });

        const namesText = affectedStudents.map(s => s.name).join(' & ');
        setSyncFeedback(
          approved
            ? `✅ Duplikasi ${field.toUpperCase()} untuk ${namesText} disahkan BENAR & otomatis berstatus VALID (Bebas Residu) di Sheet SISWA & DAPODIK_VALIDASI!`
            : `ℹ️ Pengesahan duplikasi ${field.toUpperCase()} untuk ${namesText} telah dibatalkan & disinkronkan.`
        );
      } catch (err: any) {
        console.warn("GAS sync error:", err);
        setSyncFeedback(`⚠️ Status lokal diperbarui, namun sync ke Spreadsheet gagal: ${err.message || 'Cek script URL'}`);
      }
    } else {
      const namesText = affectedStudents.map(s => s.name).join(' & ');
      setSyncFeedback(
        approved
          ? `✅ Duplikasi ${field.toUpperCase()} untuk ${namesText} disahkan valid (Bebas Residu) di database lokal!`
          : `ℹ️ Pengesahan duplikasi ${field.toUpperCase()} untuk ${namesText} dibatalkan.`
      );
    }

    setSavingProgressModal({
      open: true,
      status: 'success',
      title: approved ? 'Duplikasi Berhasil Disahkan!' : 'Pengesahan Dibatalkan',
      message: approved
        ? `Status duplikasi ${field.toUpperCase()} telah disahkan dan langsung berstatus VALID (Bebas Residu).`
        : `Status duplikasi ${field.toUpperCase()} telah dikembalikan ke kondisi awal.`,
      stepText: 'Selesai 100%'
    });
    setTimeout(() => {
      setSavingProgressModal(null);
    }, 1200);

    setTimeout(() => setSyncFeedback(null), 6000);
  };

  // Handlers for Save Edit & Confirm Delete
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    const { type, data } = editModal;
    setIsSavingEdit(true);

    // Buka popup visual instan agar proses penyimpanan terasa cepat & responsif
    setSavingProgressModal({
      open: true,
      status: 'saving',
      title: 'Menyimpan Perubahan',
      message: 'Sedang memproses dan menyimpan perubahan data ke sistem...',
      stepText: 'Menyimpan ke database lokal & memvalidasi data...'
    });

    try {
      if (type === 'yatim' && data.id) {
        const updatedYatim: Partial<Student> = {
          statusYatim: data.statusYatim || (data as any)['status Yatim'],
          statusAyah: data.statusAyah || (data as any)['status Ayah'],
          statusIbu: data.statusIbu || (data as any)['status Ibu'],
          namaWali: data.namaWali || (data as any)['nama Wali'],
          parentPhone: data.parentPhone || (data as any)['parent Phone'],
          tlpWali: data.parentPhone || (data as any)['parent Phone'],
          updatedAt: new Date().toISOString()
        };
        updateStudent(data.id, updatedYatim);
        const currentList = useStore.getState().students;
        const nextList = currentList.map(s => s.id === data.id ? { ...s, ...updatedYatim } : s);
        db.set('students', nextList);

        const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
        if (scriptEndpoint) {
          setSavingProgressModal(prev => prev ? {
            ...prev,
            stepText: 'Menyinkronkan status Yatim/Piatu ke Google Spreadsheet...'
          } : null);
          try {
            await fetchFromGAS(scriptEndpoint, {
              action: 'sync',
              data: nextList,
              teachers: useStore.getState().teachers,
              spreadsheetId: settings.spreadsheetId
            });
            await fetchFromGAS(scriptEndpoint, {
              action: 'AUTO_POPULATE_ORTU_YATIM',
              spreadsheetId: settings.spreadsheetId
            });
            setSyncFeedback(`✅ Data status Yatim/Piatu untuk siswa berhasil diperbarui & disinkronkan ke Sheet!`);
          } catch (err: any) {
            setSyncFeedback(`⚠️ Data lokal tersimpan, namun sync ke Spreadsheet terkendala: ${err.message}`);
          }
        } else {
          setSyncFeedback(`✅ Data status Yatim/Piatu untuk siswa berhasil diperbarui!`);
        }
        setTimeout(() => setSyncFeedback(null), 6000);
      } else if (type === 'parent' && data.id) {
        const updatedParent: Partial<Student> = {
          fatherName: data.fatherName || data.namaAyah,
          namaAyah: data.fatherName || data.namaAyah,
          NamaIbu: data.NamaIbu || data.namaIbu,
          namaIbu: data.NamaIbu || data.namaIbu,
          parentPhone: data.parentPhone,
          address: data.address,
          updatedAt: new Date().toISOString()
        };
        updateStudent(data.id, updatedParent);
        const currentList = useStore.getState().students;
        const nextList = currentList.map(s => s.id === data.id ? { ...s, ...updatedParent } : s);
        db.set('students', nextList);

        const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
        if (scriptEndpoint) {
          setSavingProgressModal(prev => prev ? {
            ...prev,
            stepText: 'Menyinkronkan data Orang Tua ke Google Spreadsheet...'
          } : null);
          try {
            await fetchFromGAS(scriptEndpoint, {
              action: 'sync',
              data: nextList,
              teachers: useStore.getState().teachers,
              spreadsheetId: settings.spreadsheetId
            });
            await fetchFromGAS(scriptEndpoint, {
              action: 'AUTO_POPULATE_ORTU_YATIM',
              spreadsheetId: settings.spreadsheetId
            });
            setSyncFeedback(`✅ Data orang tua siswa berhasil diperbarui & disinkronkan ke Sheet!`);
          } catch (err: any) {
            setSyncFeedback(`⚠️ Data lokal tersimpan, namun sync ke Spreadsheet terkendala: ${err.message}`);
          }
        } else {
          setSyncFeedback(`✅ Data orang tua siswa berhasil diperbarui di database lokal!`);
        }
        setTimeout(() => setSyncFeedback(null), 6000);
      } else if (type === 'dapodik' && data.id) {
        const updatedDapodik: Partial<Student> = {
          name: data.name ? String(data.name).trim() : undefined,
          nisn: String(data.nisn || '').trim().replace(/\D/g, ''),
          nik: String(data.nik || '').trim().replace(/[-.\s]/g, ''),
          noKk: String(data.noKk || '').trim().replace(/[-.\s]/g, ''),
          NamaIbu: String(data.NamaIbu || data.namaIbu || '').trim(),
          namaIbu: String(data.NamaIbu || data.namaIbu || '').trim(),
          namaAyah: String(data.namaAyah || data.fatherName || '').trim(),
          fatherName: String(data.namaAyah || data.fatherName || '').trim(),
          pob: String(data.birthPlace || data.pob || '').trim(),
          dob: String(data.birthDate || data.dob || '').trim(),
          tahunMasuk: String(data.tahunMasuk || '').trim(),
          class: data.class ? String(data.class).trim() : undefined,
          gender: data.gender || undefined,
          approvedDuplicateNisn: data.approvedDuplicateNisn !== undefined ? Boolean(data.approvedDuplicateNisn) : undefined,
          approvedDuplicateNik: data.approvedDuplicateNik !== undefined ? Boolean(data.approvedDuplicateNik) : undefined,
          updatedAt: new Date().toISOString()
        };
        updateStudent(data.id, updatedDapodik);

        // Sinkronkan juga flag pengesahan duplikasi ke siswa kembar/duplikat lainnya jika diaktifkan
        if (updatedDapodik.approvedDuplicateNisn !== undefined && updatedDapodik.nisn) {
          const cleanNisn = updatedDapodik.nisn;
          const matchingStudents = students.filter(s => s.id !== data.id && String(s.nisn || '').trim().replace(/\D/g, '') === cleanNisn);
          matchingStudents.forEach(ms => {
            updateStudent(ms.id, { approvedDuplicateNisn: updatedDapodik.approvedDuplicateNisn });
          });
        }

        if (updatedDapodik.approvedDuplicateNik !== undefined && updatedDapodik.nik) {
          const cleanNik = updatedDapodik.nik;
          const matchingStudents = students.filter(s => s.id !== data.id && String(s.nik || '').trim().replace(/[-.\s]/g, '') === cleanNik);
          matchingStudents.forEach(ms => {
            updateStudent(ms.id, { approvedDuplicateNik: updatedDapodik.approvedDuplicateNik });
          });
        }

        const nextList = useStore.getState().students;
        db.set('students', nextList);
        
        // Update selected audit modal if open
        if (selectedDapodikAudit && selectedDapodikAudit.studentId === data.id) {
          const studentObj = nextList.find(s => s.id === data.id);
          if (studentObj) {
            const updatedAudit = auditStudentDapodik(studentObj, nextList);
            setSelectedDapodikAudit(updatedAudit);
          }
        }

        const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
        if (scriptEndpoint) {
          setSavingProgressModal(prev => prev ? {
            ...prev,
            stepText: 'Menyinkronkan ke Sheet SISWA & DAPODIK_VALIDASI...'
          } : null);
          try {
            // 1. Sync ke sheet SISWA
            await fetchFromGAS(scriptEndpoint, {
              action: 'sync',
              data: nextList,
              teachers: useStore.getState().teachers,
              spreadsheetId: settings.spreadsheetId
            });

            // 2. Otomatis generate & sync ke sheet DAPODIK_VALIDASI (14 Kolom Standar)
            const standardDapodikRows = generateDapodikValidasiRows(nextList, settings.academicYear || '2026/2027');
            db.set('dapodik_validations', standardDapodikRows);
            await fetchFromGAS(scriptEndpoint, {
              action: 'syncData',
              table: 'DAPODIK_VALIDASI',
              data: standardDapodikRows,
              spreadsheetId: settings.spreadsheetId
            });

            // 3. Auto populate Ortu & Yatim jika nama orang tua diperbaiki
            try {
              await fetchFromGAS(scriptEndpoint, {
                action: 'AUTO_POPULATE_ORTU_YATIM',
                spreadsheetId: settings.spreadsheetId
              });
            } catch (ePop) {}

            setSyncFeedback(`✅ Data Siswa & Sheet DAPODIK_VALIDASI berhasil diperbarui & otomatis tersinkron ke Google Spreadsheet!`);
          } catch (gasErr: any) {
            console.warn("GAS sync error:", gasErr);
            setSyncFeedback(`⚠️ Data berhasil disimpan di aplikasi, namun sinkronisasi Google Sheets gagal: ${gasErr.message || 'Cek URL Google Apps Script'}`);
          }
        } else {
          setSyncFeedback(`✅ Data Siswa & Dapodik berhasil diperbarui di database lokal! (Atur URL Google Apps Script di Pengaturan untuk sync otomatis ke Sheets)`);
        }
        setTimeout(() => setSyncFeedback(null), 6000);
      } else if (type === 'jenjang') {
        setMasterJenjangList(prev => {
          const next = prev.map(j => (j.id === data.id || j.jenjangId === data.jenjangId) ? { ...j, ...data } : j);
          db.set('jenjang', next);
          return next;
        });
      } else if (type === 'mapel') {
        const next = masterMapelList.map(m => ((m.id && data.id && m.id === data.id) || (m.kode === data.kode && (!data.kelas || m.kelas === data.kelas))) ? { ...m, ...data } : m);
        setMasterMapelList(next);
        const scriptEndpoint = settings.scriptUrl || settings.gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
        if (scriptEndpoint) {
          const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
          const mapelPayload = next.map((m: any, idx: number) => ({
            MapelID: m.mapelId || m.id || `MPL_${(idx + 1).toString().padStart(3, '0')}`,
            Kode: m.kode || '',
            NamaMapel: m.nama || m.namaMapel || '',
            Kategori: m.kategori || 'Umum',
            KKM: m.kkm || 75,
            GuruID: m.guruId || '',
            GuruPengampu: m.guru || m.guruPengampu || '',
            Jenjang: m.jenjang || 'PAKET A',
            Kelas: m.kelas || '',
            Kelompok: m.kelompok || '',
            Fase: m.fase || '',
            BebanJP: m.bebanJp || m.jp || 2,
            Status: m.status || 'AKTIF'
          }));
          fetchFromGAS(scriptEndpoint, {
            action: 'syncData',
            table: 'MAPEL',
            data: mapelPayload,
            spreadsheetId: spreadsheetId
          }).then(() => {
            setSyncFeedback(`✅ Perubahan Mapel "${data.nama || data.kode}" berhasil langsung disinkronkan ke Sheet MAPEL Google Spreadsheet!`);
            setTimeout(() => setSyncFeedback(null), 5000);
          }).catch(err => {
            console.warn("Sync MAPEL error:", err);
            setSyncFeedback(`⚠️ Perubahan Mapel diterapkan di sesi ini, namun sinkronisasi Sheet MAPEL gagal: ${err.message || 'Cek koneksi'}`);
          });
        }
      } else if (type === 'tahun') {
        setMasterTahunList(prev => {
          const next = prev.map(t => (t.id === data.id || t.tahun === data.tahun) ? { ...t, ...data } : t);
          db.set('tahun_ajaran', next);
          return next;
        });
        autoSyncEngine.pushSpecificTables(['TAHUN_AJARAN']).then(() => {
          setSyncFeedback(`✅ Perubahan Tahun Pelajaran berhasil disinkronkan ke Sheet TAHUN_AJARAN!`);
          setTimeout(() => setSyncFeedback(null), 4000);
        }).catch(err => console.warn("Sync TAHUN_AJARAN error:", err));
      } else if (type === 'semester') {
        setMasterSemesterList(prev => {
          const next = prev.map(s => (s.id === data.id || s.semesterId === data.semesterId || s.nama === data.nama) ? { ...s, ...data } : s);
          db.set('semester', next);
          return next;
        });
        autoSyncEngine.pushSpecificTables(['SEMESTER']).then(() => {
          setSyncFeedback(`✅ Perubahan Semester berhasil disinkronkan ke Sheet SEMESTER!`);
          setTimeout(() => setSyncFeedback(null), 4000);
        }).catch(err => console.warn("Sync SEMESTER error:", err));
      } else if (type === 'libur') {
        const next = masterLiburList.map(l => (l.id === data.id || l.hariLiburId === data.hariLiburId) ? {
          ...l,
          ...data,
          hariLiburId: data.hariLiburId || l.hariLiburId || l.id,
          nama: data.nama || data.agenda || l.nama,
          agenda: data.nama || data.agenda || l.agenda,
          tanggal: data.tanggal || l.tanggal,
          tanggalSelesai: data.tanggalSelesai || data.tanggal || l.tanggalSelesai,
          jenis: data.jenis || l.jenis,
          tahunAjaran: data.tahunAjaran || l.tahunAjaran || '2026/2027',
          keterangan: data.keterangan !== undefined ? data.keterangan : l.keterangan
        } : l);
        setMasterLiburList(next);
        db.set('hari_libur', next);
        const scriptEndpoint = settings.scriptUrl || settings.gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
        if (scriptEndpoint) {
          const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
          const liburPayload = formatLiburForSpreadsheetPayload(next);
          fetchFromGAS(scriptEndpoint, {
            action: 'syncData',
            table: 'HARI_LIBUR',
            data: liburPayload,
            spreadsheetId: spreadsheetId
          }).then(() => {
            setSyncFeedback(`✅ Perubahan Hari Libur "${data.nama || data.agenda || data.hariLiburId}" berhasil langsung disinkronkan ke Sheet HARI_LIBUR Google Spreadsheet!`);
            setTimeout(() => setSyncFeedback(null), 5000);
          }).catch(err => {
            console.warn("Sync HARI_LIBUR error:", err);
          });
        }
      } else if (type === 'barang') {
        setMasterBarangList(prev => {
          const next = prev.map(b => b.kode === data.kode ? { ...b, ...data, jumlah: Number(data.jumlah) } : b);
          db.set('barang', next);
          return next;
        });
      } else if (type === 'kelas') {
        setMasterClassesList(prev => {
          const next = prev.map(c => {
            if (c.cls === data.cls || c.kelasId === data.kelasId || c.id === data.id || c.id === data.kelasId) {
              return {
                ...c,
                ...data,
                id: data.kelasId || c.kelasId || c.id,
                kelasId: data.kelasId || c.kelasId,
                namaKelas: data.namaKelas || data.cls || c.namaKelas,
                cls: data.namaKelas || data.cls || c.cls,
                jenjangId: data.jenjangId || c.jenjangId,
                tingkat: data.tingkat || c.tingkat,
                waliKelasId: data.waliKelasId || c.waliKelasId,
                namaWaliKelas: data.namaWaliKelas || data.namatutor || data.wali || c.namaWaliKelas,
                namatutor: data.namatutor || data.namaWaliKelas || data.wali || c.namatutor,
                wali: data.wali || data.namaWaliKelas || data.namatutor || c.wali,
                ruangan: data.ruangan !== undefined ? data.ruangan : c.ruangan,
                kapasitas: data.kapasitas !== undefined && data.kapasitas !== '' ? (Number(data.kapasitas) || 0) : c.kapasitas,
                tahunAjaran: data.tahunAjaran || c.tahunAjaran || '2026/2027',
                status: data.status || c.status || 'AKTIF'
              };
            }
            return c;
          });
          db.set('rombel', next);
          return next;
        });
      }

      // Tampilkan status sukses di popup
      setSavingProgressModal({
        open: true,
        status: 'success',
        title: 'Perubahan Berhasil Disimpan!',
        message: 'Data telah berhasil diperbarui dan diselaraskan ke database sistem.',
        stepText: 'Selesai 100%'
      });

      setEditModal(null);
      setTimeout(() => {
        setSavingProgressModal(null);
        setIsSavingEdit(false);
      }, 1200);
    } catch (err: any) {
      setSavingProgressModal({
        open: true,
        status: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan perubahan data.',
        stepText: 'Gagal'
      });
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteModal) return;
    const { type, id } = deleteModal;

    if (type === 'parent' || type === 'dapodik') {
      deleteStudent(id);
      const remainingStudents = useStore.getState().students.filter(s => s.id !== id && s.nis !== id);
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
      if (scriptEndpoint) {
        // Sync SISWA
        fetchFromGAS(scriptEndpoint, {
          action: 'sync',
          data: remainingStudents,
          teachers: useStore.getState().teachers,
          spreadsheetId: settings.spreadsheetId
        }).catch(err => console.warn("Sync SISWA error:", err));

        // Sync DAPODIK_VALIDASI
        const standardDapodikRows = generateDapodikValidasiRows(remainingStudents, settings.academicYear || '2026/2027');
        db.set('dapodik_validations', standardDapodikRows);
        fetchFromGAS(scriptEndpoint, {
          action: 'syncData',
          table: 'DAPODIK_VALIDASI',
          data: standardDapodikRows,
          spreadsheetId: settings.spreadsheetId
        }).catch(err => console.warn("Sync DAPODIK_VALIDASI error:", err));
      }
    } else if (type === 'jenjang') {
      setMasterJenjangList(prev => {
        const next = prev.filter(j => j.id !== id && j.jenjangId !== id);
        db.set('jenjang', next);
        return next;
      });
    } else if (type === 'mapel') {
      const next = masterMapelList.filter(m => (m.id ? m.id !== id : m.kode !== id));
      setMasterMapelList(next);
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
      if (scriptEndpoint) {
        const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
        const mapelPayload = next.map((m: any, idx: number) => ({
          MapelID: m.mapelId || m.id || `MPL_${(idx + 1).toString().padStart(3, '0')}`,
          Kode: m.kode || '',
          NamaMapel: m.nama || m.namaMapel || '',
          Kategori: m.kategori || 'Umum',
          KKM: m.kkm || 75,
          GuruID: m.guruId || '',
          GuruPengampu: m.guru || m.guruPengampu || '',
          Jenjang: m.jenjang || 'PAKET A',
          Kelas: m.kelas || '',
          Kelompok: m.kelompok || '',
          Fase: m.fase || '',
          BebanJP: m.bebanJp || m.jp || 2,
          Status: m.status || 'AKTIF'
        }));
        fetchFromGAS(scriptEndpoint, {
          action: 'syncData',
          table: 'MAPEL',
          data: mapelPayload,
          spreadsheetId: spreadsheetId
        }).then(() => {
          setSyncFeedback(`✅ Data Mapel berhasil dihapus dan disinkronkan ke Sheet MAPEL Google Spreadsheet!`);
          setTimeout(() => setSyncFeedback(null), 5000);
        }).catch(err => console.warn("Sync MAPEL error:", err));
      }
    } else if (type === 'tahun') {
      setMasterTahunList(prev => {
        const next = prev.filter(t => t.id !== id && t.tahun !== id);
        db.set('tahun_ajaran', next);
        return next;
      });
    } else if (type === 'semester') {
      setMasterSemesterList(prev => {
        const next = prev.filter(s => s.id !== id && s.semesterId !== id && s.nama !== id);
        db.set('semester', next);
        return next;
      });
    } else if (type === 'libur') {
      const next = masterLiburList.filter(l => l.id !== id && l.hariLiburId !== id && l.agenda !== id && l.nama !== id);
      setMasterLiburList(next);
      db.set('hari_libur', next);
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
      if (scriptEndpoint) {
        const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
        const liburPayload = formatLiburForSpreadsheetPayload(next);
        fetchFromGAS(scriptEndpoint, {
          action: 'syncData',
          table: 'HARI_LIBUR',
          data: liburPayload,
          spreadsheetId: spreadsheetId
        }).then(() => {
          setSyncFeedback(`✅ Agenda Hari Libur berhasil dihapus dan disinkronkan ke Sheet HARI_LIBUR Google Spreadsheet!`);
          setTimeout(() => setSyncFeedback(null), 5000);
        }).catch(err => console.warn("Sync HARI_LIBUR error:", err));
      }
    } else if (type === 'barang') {
      setMasterBarangList(prev => {
        const next = prev.filter(b => b.kode !== id);
        db.set('barang', next);
        return next;
      });
    } else if (type === 'kelas') {
      setMasterClassesList(prev => {
        const next = prev.filter(c => c.cls !== id && c.kelasId !== id);
        db.set('rombel', next);
        return next;
      });
    }

    setDeleteModal(null);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addModal) return;
    const { type, data } = addModal;

    setSavingProgressModal({
      open: true,
      status: 'saving',
      title: 'Menambahkan Data',
      message: 'Sedang menyimpan data baru ke database...',
      stepText: 'Menyimpan data...'
    });

    if (type === 'kelas') {
      const kelasId = data.kelasId || (data.cls ? `KLS_${data.cls}` : `KLS_${Date.now().toString().slice(-4)}`);
      const newClass = {
        id: kelasId,
        kelasId: kelasId,
        cls: data.namaKelas || data.cls || 'Baru',
        namaKelas: data.namaKelas || data.cls || 'Baru',
        jenjangId: data.jenjangId || 'J001',
        tingkat: data.tingkat || `Kelas ${data.namaKelas || data.cls || 'Baru'}`,
        waliKelasId: data.waliKelasId || 'GR_001',
        namaWaliKelas: data.namaWaliKelas || data.namatutor || data.wali || 'Belum Ditentukan',
        namatutor: data.namatutor || data.namaWaliKelas || data.wali || 'Belum Ditentukan',
        wali: data.wali || data.namaWaliKelas || data.namatutor || 'Belum Ditentukan',
        ruangan: data.ruangan !== undefined ? data.ruangan : '1',
        kapasitas: data.kapasitas !== undefined && data.kapasitas !== '' ? (Number(data.kapasitas) || 0) : 36,
        tahunAjaran: data.tahunAjaran || (data.status === 'ALUMNI' ? '-' : '2026/2027'),
        status: data.status || 'AKTIF'
      };
      setMasterClassesList(prev => {
        const next = [...prev, newClass];
        db.set('rombel', next);
        return next;
      });
    } else if (type === 'jenjang') {
      const jenjangId = data.jenjangId || data.id || `J00${masterJenjangList.length + 1}`;
      const newJenjang = {
        id: jenjangId,
        jenjangId: jenjangId,
        kode: data.kode || 'PX',
        namaJenjang: data.namaJenjang || data.nama || 'Paket Baru',
        nama: data.namaJenjang || data.nama || 'Paket Baru',
        tingkatAwal: data.tingkatAwal || 'Kelas 1',
        tingkatTengah: data.tingkatTengah || '',
        tingkatAkhir: data.tingkatAkhir || 'Kelas 6',
        keterangan: data.keterangan || '-',
        aktif: data.aktif || data.status || 'Aktif',
        status: data.status || data.aktif || 'Aktif'
      };
      setMasterJenjangList(prev => {
        const next = [...prev, newJenjang];
        db.set('jenjang', next);
        return next;
      });
    } else if (type === 'mapel') {
      const newMapel = {
        mapelId: data.mapelId || data.id || `MPL_${(masterMapelList.length + 1).toString().padStart(3, '0')}`,
        id: data.mapelId || data.id || `MPL_${(masterMapelList.length + 1).toString().padStart(3, '0')}`,
        kode: data.kode || `MPL-${Date.now().toString().slice(-4)}`,
        nama: data.nama || 'Mata Pelajaran Baru',
        namaMapel: data.nama || 'Mata Pelajaran Baru',
        jenjang: data.jenjang || 'PAKET A',
        kelas: data.kelas || 'Semua Kelas',
        kategori: data.kategori || 'Wajib Nasional',
        jp: Number(data.jp) || 2,
        bebanJp: Number(data.jp) || 2,
        kkm: Number(data.kkm) || 75,
        guru: data.guru || 'Guru Pengampu',
        guruPengampu: data.guru || 'Guru Pengampu',
        guruId: data.guruId || '',
        kelompok: data.kelompok || '',
        fase: data.fase || '',
        status: data.status || 'AKTIF'
      };
      const next = [...masterMapelList, newMapel];
      setMasterMapelList(next);
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
      if (scriptEndpoint) {
        const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
        const mapelPayload = next.map((m: any, idx: number) => ({
          MapelID: m.mapelId || m.id || `MPL_${(idx + 1).toString().padStart(3, '0')}`,
          Kode: m.kode || '',
          NamaMapel: m.nama || m.namaMapel || '',
          Kategori: m.kategori || 'Umum',
          KKM: m.kkm || 75,
          GuruID: m.guruId || '',
          GuruPengampu: m.guru || m.guruPengampu || '',
          Jenjang: m.jenjang || 'PAKET A',
          Kelas: m.kelas || '',
          Kelompok: m.kelompok || '',
          Fase: m.fase || '',
          BebanJP: m.bebanJp || m.jp || 2,
          Status: m.status || 'AKTIF'
        }));
        fetchFromGAS(scriptEndpoint, {
          action: 'syncData',
          table: 'MAPEL',
          data: mapelPayload,
          spreadsheetId: spreadsheetId
        }).then(() => {
          setSyncFeedback(`✅ Mata Pelajaran baru berhasil ditambahkan dan disinkronkan ke Sheet MAPEL Google Spreadsheet!`);
          setTimeout(() => setSyncFeedback(null), 5000);
        }).catch(err => console.warn("Sync MAPEL error:", err));
      }
    } else if (type === 'tahun') {
      const newTahun = {
        id: String(Date.now()),
        taId: data.taId || `TA0${(masterTahunList.length + 1).toString().padStart(2, '0')}`,
        tahun: data.tahun || '2026/2027',
        tahunPelajaran: data.tahunPelajaran || data.tahun || '2026/2027',
        semester: data.semester || 'Semester Ganjil & Genap',
        rentang: data.rentang || data.rentangPeriode || 'Juli 2026 - Juni 2027',
        rentangPeriode: data.rentangPeriode || data.rentang || 'Juli 2026 - Juni 2027',
        kurikulum: data.kurikulum || 'Kurikulum Merdeka 2026/2027 Kemendikdasmen',
        status: data.status || 'Non-Aktif',
        aktif: data.status || 'Non-Aktif'
      };
      setMasterTahunList(prev => {
        const next = [...prev, newTahun];
        db.set('tahun_ajaran', next);
        return next;
      });
      autoSyncEngine.pushSpecificTables(['TAHUN_AJARAN']).then(() => {
        setSyncFeedback(`✅ Data Tahun Pelajaran baru disinkronkan ke Sheet TAHUN_AJARAN!`);
        setTimeout(() => setSyncFeedback(null), 4000);
      }).catch(err => console.warn("Sync TAHUN_AJARAN error:", err));
    } else if (type === 'semester') {
      const semId = data.semesterId || data.id || `SM${(masterSemesterList.length + 1).toString().padStart(2, '0')}`;
      const newSem = {
        id: semId,
        semesterId: semId,
        nama: data.nama || `Semester ${data.semester || 'Ganjil'} ${data.tahunPelajaran || data.tahunAjaran || '2026/2027'}`,
        taId: data.taId || data.tahunAjaranId || 'TA004',
        tahunPelajaran: data.tahunPelajaran || data.tahunAjaran || data.tahun || '2026/2027',
        tahunAjaran: data.tahunPelajaran || data.tahunAjaran || data.tahun || '2026/2027',
        semester: data.semester || 'Ganjil',
        tanggalMulai: data.tanggalMulai || '',
        tanggalSelesai: data.tanggalSelesai || '',
        aktif: data.aktif || data.status || 'NONAKTIF',
        status: data.status || data.aktif || 'NONAKTIF',
        tipe: data.tipe || (data.semester === 'Genap' ? 'EVEN' : 'ODD')
      };
      setMasterSemesterList(prev => {
        const next = [...prev, newSem];
        db.set('semester', next);
        return next;
      });
      autoSyncEngine.pushSpecificTables(['SEMESTER']).then(() => {
        setSyncFeedback(`✅ Data Semester baru disinkronkan ke Sheet SEMESTER!`);
        setTimeout(() => setSyncFeedback(null), 4000);
      }).catch(err => console.warn("Sync SEMESTER error:", err));
    } else if (type === 'libur') {
      const liburId = data.hariLiburId || data.id || `H${masterLiburList.length + 1}`;
      const newLibur = {
        id: liburId,
        hariLiburId: liburId,
        tanggal: data.tanggal || new Date().toISOString().split('T')[0],
        tanggalSelesai: data.tanggalSelesai || data.tanggal || new Date().toISOString().split('T')[0],
        nama: data.nama || data.agenda || 'Agenda Libur',
        agenda: data.nama || data.agenda || 'Agenda Libur',
        jenis: data.jenis || 'Libur Nasional / Libur Umum',
        tahunAjaran: data.tahunAjaran || '2026/2027',
        keterangan: data.keterangan || ''
      };
      const next = [...masterLiburList, newLibur];
      setMasterLiburList(next);
      db.set('hari_libur', next);
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl || DEFAULT_APP_CONFIG.scriptUrl;
      if (scriptEndpoint) {
        const spreadsheetId = settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId;
        const liburPayload = formatLiburForSpreadsheetPayload(next);
        fetchFromGAS(scriptEndpoint, {
          action: 'syncData',
          table: 'HARI_LIBUR',
          data: liburPayload,
          spreadsheetId: spreadsheetId
        }).then(() => {
          setSyncFeedback(`✅ Hari Libur baru berhasil ditambahkan dan disinkronkan ke Sheet HARI_LIBUR Google Spreadsheet!`);
          setTimeout(() => setSyncFeedback(null), 5000);
        }).catch(err => console.warn("Sync HARI_LIBUR error:", err));
      }
    } else if (type === 'barang') {
      const newBarang = {
        kode: data.kode || `AST-${Date.now().toString().slice(-4)}`,
        nama: data.nama || 'Aset Sarpras Baru',
        kategori: data.kategori || 'Sarpras Lembaga',
        jumlah: Number(data.jumlah) || 1,
        satuan: data.satuan || 'Unit',
        lokasi: data.lokasi || 'Ruang Inventaris',
        penanggungJawab: data.penanggungJawab || 'Pengelola Sarpras',
        kondisi: data.kondisi || 'Baik'
      };
      setMasterBarangList(prev => {
        const next = [...prev, newBarang];
        db.set('barang', next);
        return next;
      });
    }

    setSavingProgressModal({
      open: true,
      status: 'success',
      title: 'Data Berhasil Ditambahkan!',
      message: 'Data baru telah berhasil ditambahkan dan disimpan ke database sistem.',
      stepText: 'Selesai 100%'
    });

    setAddModal(null);
    setTimeout(() => {
      setSavingProgressModal(null);
    }, 1200);
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs flex-shrink-0">
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Master Data
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pengelolaan pokok data kependidikan, pendidik, rombel, sarpras, serta validasi Dapodik 2027.
            </p>
          </div>
        </div>
      </div>

      {/* Sync / Action Feedback Alert Banner */}
      {syncFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button 
            onClick={() => setSyncFeedback(null)} 
            className="text-emerald-700 hover:text-emerald-900 p-1 hover:bg-emerald-100 rounded-lg transition text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-Navigation: Mobile Dropdown Selector & Desktop Pill Tabs */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
          Pilih Sub-Menu Master Data:
        </label>
        <div className="relative">
          <select
            value={activeSubTab}
            onChange={(e) => handleSubTabChange(e.target.value)}
            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none transition"
          >
            {subTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            ▼
          </div>
        </div>
      </div>

      {/* Sub-Navigation Pills (Desktop / Tablet) */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-indigo-600 border border-slate-200/80'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Rendering based on activeSubTab */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div 
              onClick={() => handleSubTabChange('siswa')}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-indigo-300 transition group"
            >
              <div className="flex items-center justify-between text-indigo-600">
                <Users size={24} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold bg-indigo-50 px-2.5 py-1 rounded-full">Siswa Aktif</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{countSiswaAktif} Siswa</div>
              <p className="text-xs text-slate-500 font-medium">Buku Induk & Siswa Aktif Dapodik</p>
              <div className="pt-2 text-xs font-bold text-indigo-600 group-hover:underline flex items-center gap-1">
                <span>Kelola Siswa Aktif</span>
                <ChevronRight size={14} />
              </div>
            </div>

            <div 
              onClick={() => handleSubTabChange('guru')}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-purple-300 transition group"
            >
              <div className="flex items-center justify-between text-purple-600">
                <GraduationCap size={24} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold bg-purple-50 px-2.5 py-1 rounded-full">Pendidik & GTK</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{teachers.length} Guru</div>
              <p className="text-xs text-slate-500 font-medium">Data Guru & Tenaga Kependidikan</p>
              <div className="pt-2 text-xs font-bold text-purple-600 group-hover:underline flex items-center gap-1">
                <span>Kelola Data GTK</span>
                <ChevronRight size={14} />
              </div>
            </div>

            <div 
              onClick={() => handleSubTabChange('orangtua')}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-emerald-300 transition group"
            >
              <div className="flex items-center justify-between text-emerald-600">
                <HeartHandshake size={24} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full">Wali Murid</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{filteredParents.length} Wali</div>
              <p className="text-xs text-slate-500 font-medium">Kontak & Alamat Orang Tua</p>
              <div className="pt-2 text-xs font-bold text-emerald-600 group-hover:underline flex items-center gap-1">
                <span>Buku Kontak Wali</span>
                <ChevronRight size={14} />
              </div>
            </div>

            <div 
              onClick={() => handleSubTabChange('siswa')}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-amber-300 transition group"
            >
              <div className="flex items-center justify-between text-amber-600">
                <UserCheck size={24} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold bg-amber-50 px-2.5 py-1 rounded-full">Siswa Belum</span>
              </div>
              <div className="text-3xl font-black text-slate-900">{countSiswaBelum} Siswa</div>
              <p className="text-xs text-slate-500 font-medium">Status Belum Aktif / Menunggu Verifikasi</p>
              <div className="pt-2 text-xs font-bold text-amber-600 group-hover:underline flex items-center gap-1">
                <span>Daftar Siswa Belum Aktif</span>
                <ChevronRight size={14} />
              </div>
            </div>

            <div 
              onClick={() => handleSubTabChange('audit-sheet')}
              className="bg-linear-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-indigo-800 shadow-md space-y-2 cursor-pointer hover:border-indigo-400 transition group col-span-1 sm:col-span-2 lg:col-span-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={22} className="text-indigo-400 animate-pulse" />
                  <span className="text-xs font-black bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full uppercase tracking-wider">
                    Fitur Baru Pintar
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-300">Audit Otomatis 88 Sheet Master</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white pt-1">
                Inspektor & Audit Validitas Isian Sheet
              </div>
              <p className="text-xs text-indigo-200/90 leading-relaxed">
                Pindai seketika seluruh 88 sheet Google Spreadsheet untuk mendeteksi data yang masih kosong, format NIK/NISN yang salah digit, tanggal tidak baku, atau kontak invalid.
              </p>
              <div className="pt-2 text-xs font-black text-indigo-300 group-hover:text-white flex items-center gap-1.5">
                <span>Buka Inspektor Sheet Sekarang</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Complete Lists */}
      {activeSubTab === 'siswa' && <StudentsList />}
      {activeSubTab === 'berkas-siswa' && <BerkasSiswaPage />}
      {activeSubTab === 'guru' && <TeachersList />}

      {/* 1. Subtab ORANG TUA & WALI */}
      {activeSubTab === 'orangtua' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Sync Feedback Toast / Banner */}
          {syncFeedback && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-600 animate-pulse" />
                <span>{syncFeedback}</span>
              </div>
              <button onClick={() => setSyncFeedback(null)} className="text-emerald-600 hover:text-emerald-900">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Info Header Banner */}
          <div className="bg-linear-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-3xl border border-indigo-800/40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles size={11} />
                <span>Sinkronisasi Otomatis Terintegrasi</span>
              </div>
              <h2 className="text-lg font-black tracking-tight">Direktori Master Orang Tua & Wali Murid</h2>
              <p className="text-xs text-indigo-200/80 max-w-2xl">
                Data orang tua disinkronkan langsung dari profil buku induk siswa (Ayah, Ibu, dan Wali) tanpa perlu input ganda.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            </div>
          </div>

          {/* Quick Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Entitas Ortu</span>
              <div className="text-2xl font-black text-slate-900">{parentStats.total}</div>
              <p className="text-[10px] text-slate-400">Seluruh Ayah, Ibu & Wali</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Ayah Kandung</span>
              <div className="text-2xl font-black text-indigo-900">{parentStats.ayahCount}</div>
              <p className="text-[10px] text-slate-400">Terdata di Buku Induk</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Ibu Kandung</span>
              <div className="text-2xl font-black text-rose-900">{parentStats.ibuCount}</div>
              <p className="text-[10px] text-slate-400">Terdata di Buku Induk</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Wali Murid</span>
              <div className="text-2xl font-black text-amber-900">{parentStats.waliCount}</div>
              <p className="text-[10px] text-slate-400">Pengasuh / Wali Khusus</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">WhatsApp Terdata</span>
              <div className="text-2xl font-black text-emerald-900">{parentStats.withPhoneCount}</div>
              <p className="text-[10px] text-slate-400">Siap Dihubungi Langsung</p>
            </div>
          </div>

          {/* Smart Filter Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              {/* Relation Chips */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setParentRelationFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    parentRelationFilter === 'all'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({parentStats.total})
                </button>
                <button
                  onClick={() => setParentRelationFilter('ayah')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    parentRelationFilter === 'ayah'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ayah Kandung ({parentStats.ayahCount})
                </button>
                <button
                  onClick={() => setParentRelationFilter('ibu')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    parentRelationFilter === 'ibu'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ibu Kandung ({parentStats.ibuCount})
                </button>
                <button
                  onClick={() => setParentRelationFilter('wali')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    parentRelationFilter === 'wali'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Wali Murid ({parentStats.waliCount})
                </button>
              </div>

              {/* Class and Search */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1 justify-end">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari orang tua, siswa, telepon, pekerjaan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {distinctClasses.length > 0 && (
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Semua Kelas</option>
                    {distinctClasses.map(cls => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* List Table with Action Buttons */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4">Nama Orang Tua / Wali</th>
                    <th className="p-3.5">Hubungan</th>
                    <th className="p-3.5">Nama Siswa</th>
                    <th className="p-3.5">Kelas</th>
                    <th className="p-3.5">Pekerjaan</th>
                    <th className="p-3.5">No WhatsApp / HP</th>
                    <th className="p-3.5">Alamat Domisili</th>
                    <th className="p-3.5 pr-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredParentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada data orang tua yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    paginatedParentRecords.map((r) => {
                      const cleanPhone = String(r.phone || '').replace(/[^0-9]/g, '');
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 pl-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                                r.relationType === 'ayah' ? 'bg-indigo-100 text-indigo-700' :
                                r.relationType === 'ibu' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {r.parentName.charAt(0)}
                              </div>
                              <div>
                                <span>{r.parentName}</span>
                                {r.statusKondisi && String(r.statusKondisi).toLowerCase().includes('meninggal') && (
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                    Almarhum
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              r.relationType === 'ayah' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' :
                              r.relationType === 'ibu' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                              'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}>
                              {r.relation}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">
                            <div>{r.studentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">NISN: {r.studentNisn || '-'}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                              {r.studentClass || '-'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600">
                            <div>{r.job || '-'}</div>
                            {r.income && r.income !== '-' && (
                              <div className="text-[10px] text-slate-400">{r.income}</div>
                            )}
                          </td>
                          <td className="p-3.5">
                            {r.phone ? (
                              <a
                                href={`https://wa.me/${cleanPhone.replace(/^0/, '62')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-mono font-bold border border-emerald-200 transition"
                                title="Chat WhatsApp Orang Tua / Wali"
                              >
                                <Phone size={12} className="text-emerald-600" />
                                <span>{r.phone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Belum terdata</span>
                            )}
                          </td>
                          <td className="p-3.5 max-w-[180px] truncate text-slate-500" title={r.address}>
                            {r.address || '-'}
                          </td>
                          <td className="p-3.5 pr-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewDetailModal({
                                  open: true,
                                  title: `Detail Orang Tua: ${r.parentName}`,
                                  type: 'parent',
                                  data: {
                                    'Nama Orang Tua / Wali': r.parentName,
                                    'Hubungan dengan Siswa': r.relation,
                                    'Status Kondisi': r.statusKondisi || 'Masih Hidup',
                                    'Nama Siswa': r.studentName,
                                    'Kelas Siswa': r.studentClass,
                                    'NISN Siswa': r.studentNisn,
                                    'NIK Orang Tua': r.nik || '-',
                                    'Pekerjaan': r.job || '-',
                                    'Penghasilan': r.income || '-',
                                    'No. Telepon / WA': r.phone || '-',
                                    'Alamat Lengkap': r.address || '-'
                                  }
                                })}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                                title="Lihat Detail"
                              >
                                <Eye size={12} />
                                <span className="hidden sm:inline">Lihat</span>
                              </button>
                              <button
                                onClick={() => setEditModal({
                                  open: true,
                                  title: `Edit Data Orang Tua: ${r.parentName}`,
                                  type: 'parent',
                                  data: {
                                    id: r.studentId,
                                    namaAyah: r.student.namaAyah || (r.relationType === 'ayah' ? r.parentName : ''),
                                    namaIbu: r.student.namaIbu || (r.relationType === 'ibu' ? r.parentName : ''),
                                    namaWali: r.student.namaWali || (r.relationType === 'wali' ? r.parentName : ''),
                                    parentPhone: r.phone,
                                    address: r.address || ''
                                  }
                                })}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                                title="Edit Data"
                              >
                                <Edit size={12} />
                                <span className="hidden sm:inline">Edit</span>
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

            {/* Table Pagination */}
            <TablePagination
              currentPage={safePageParent}
              totalItems={filteredParentRecords.length}
              pageSize={pageSizeParent}
              onPageChange={setCurrentPageParent}
              onPageSizeChange={setPageSizeParent}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="orang tua & wali"
            />
          </div>
        </div>
      )}

      {/* 2. Subtab DATA YATIM, PIATU & YATIM PIATU */}
      {activeSubTab === 'yatim-piatu' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Sync Feedback Toast / Banner */}
          {syncFeedback && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-600 animate-pulse" />
                <span>{syncFeedback}</span>
              </div>
              <button onClick={() => setSyncFeedback(null)} className="text-emerald-600 hover:text-emerald-900">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Info Header Banner */}
          <div className="bg-linear-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-5 rounded-3xl border border-purple-800/40 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[10px] font-bold uppercase tracking-wider">
                <Heart size={11} className="text-purple-300" />
                <span>Manajemen Kesejahteraan & Bantuan Kesiswaan</span>
              </div>
              <h2 className="text-lg font-black tracking-tight">Data Siswa Yatim, Piatu & Yatim Piatu</h2>
              <p className="text-xs text-purple-200/80 max-w-2xl">
                Filter & pemetaan otomatis kondisi orang tua siswa untuk prioritas bantuan sosial, Program Indonesia Pintar (PIP), santunan, dan afirmasi kependidikan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            </div>
          </div>

          {/* Quick Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div 
              onClick={() => setFilterStatusYatim('Yatim Piatu')}
              className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs space-y-1 cursor-pointer hover:border-rose-400 hover:shadow-xs transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">🖤 Yatim Piatu</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">Prioritas 1</span>
              </div>
              <div className="text-2xl font-black text-rose-950">{yatimStats.yatimPiatu} Siswa</div>
              <p className="text-[10px] text-slate-400">Ayah & Ibu Meninggal</p>
            </div>

            <div 
              onClick={() => setFilterStatusYatim('Yatim')}
              className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-1 cursor-pointer hover:border-amber-400 hover:shadow-xs transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">🤍 Yatim</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">Prioritas 2</span>
              </div>
              <div className="text-2xl font-black text-amber-950">{yatimStats.yatim} Siswa</div>
              <p className="text-[10px] text-slate-400">Ayah Meninggal Dunia</p>
            </div>

            <div 
              onClick={() => setFilterStatusYatim('Piatu')}
              className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs space-y-1 cursor-pointer hover:border-purple-400 hover:shadow-xs transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">💜 Piatu</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">Prioritas 2</span>
              </div>
              <div className="text-2xl font-black text-purple-950">{yatimStats.piatu} Siswa</div>
              <p className="text-[10px] text-slate-400">Ibu Meninggal Dunia</p>
            </div>

            <div 
              onClick={() => setFilterStatusYatim('Lengkap')}
              className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1 cursor-pointer hover:border-emerald-400 hover:shadow-xs transition"
            >
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">🌿 Ortu Lengkap</span>
              <div className="text-2xl font-black text-emerald-950">{yatimStats.lengkap} Siswa</div>
              <p className="text-[10px] text-slate-400">Ayah & Ibu Masih Hidup</p>
            </div>

            <div 
              onClick={() => setFilterStatusYatim('kps')}
              className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1 cursor-pointer hover:border-blue-400 hover:shadow-xs transition"
            >
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">🎯 Bantuan KPS / PIP</span>
              <div className="text-2xl font-black text-blue-950">{yatimStats.penerimaKps} Siswa</div>
              <p className="text-[10px] text-slate-400">Penerima Manfaat Sosial</p>
            </div>
          </div>

          {/* Smart Filter Bar & Table */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              {/* Status Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  onClick={() => setFilterStatusYatim('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterStatusYatim === 'all'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({yatimStats.total})
                </button>
                <button
                  onClick={() => setFilterStatusYatim('Yatim Piatu')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterStatusYatim === 'Yatim Piatu'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  🖤 Yatim Piatu ({yatimStats.yatimPiatu})
                </button>
                <button
                  onClick={() => setFilterStatusYatim('Yatim')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterStatusYatim === 'Yatim'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  🤍 Yatim ({yatimStats.yatim})
                </button>
                <button
                  onClick={() => setFilterStatusYatim('Piatu')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterStatusYatim === 'Piatu'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-purple-800 hover:bg-purple-50'
                  }`}
                >
                  💜 Piatu ({yatimStats.piatu})
                </button>
                <button
                  onClick={() => setFilterStatusYatim('Lengkap')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterStatusYatim === 'Lengkap'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  🌿 Lengkap ({yatimStats.lengkap})
                </button>
                <button
                  onClick={() => setFilterStatusYatim('kps')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    filterStatusYatim === 'kps'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  🎯 KPS/PIP ({yatimStats.penerimaKps})
                </button>
              </div>

              {/* Class and Search */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1 justify-end">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari nama siswa, NISN, wali, alamat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {distinctClasses.length > 0 && (
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Semua Kelas</option>
                    {distinctClasses.map(cls => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* List Table with Action Buttons */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4">Nama Siswa</th>
                    <th className="p-3.5">Kelas</th>
                    <th className="p-3.5">Status Yatim / Piatu</th>
                    <th className="p-3.5">Kondisi Ayah</th>
                    <th className="p-3.5">Kondisi Ibu</th>
                    <th className="p-3.5">Wali / Kontak Pengasuh</th>
                    <th className="p-3.5">Bantuan KPS/PIP</th>
                    <th className="p-3.5 pr-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredYatimPiatu.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada data siswa yang cocok dengan filter status Yatim/Piatu.
                      </td>
                    </tr>
                  ) : (
                    paginatedYatimPiatu.map((s) => {
                      const statusInfo = getYatimStatusInfo(s.computedStatusYatim);
                      const waliName = s.namaWali || (s.computedStatusYatim === 'Yatim' ? (s.namaIbu || s.parentName) : s.computedStatusYatim === 'Piatu' ? (s.namaAyah || s.parentName) : (s.parentName || s.namaAyah || s.namaIbu || '-'));
                      const waliPhone = s.tlpWali || s.parentPhone || s.tlpIbu || s.tlpAyah || s.noHp || s.phone || '';
                      const cleanPhone = String(waliPhone).replace(/[^0-9]/g, '');

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 pl-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <span>{s.name}</span>
                                <div className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn || s.nis || '-'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px]">
                              {s.class || '-'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${statusInfo.badgeColor}`}>
                              <span>{statusInfo.icon}</span>
                              <span>{statusInfo.label}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-700">
                            <div className="font-semibold">{s.namaAyah || (s as any).fatherName || '-'}</div>
                            <div className="text-[10px] text-slate-500">
                              {s.statusAyah || (s.computedStatusYatim === 'Yatim' || s.computedStatusYatim === 'Yatim Piatu' ? 'Meninggal' : 'Masih Hidup')}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-700">
                            <div className="font-semibold">{s.namaIbu || (s as any).NamaIbu || '-'}</div>
                            <div className="text-[10px] text-slate-500">
                              {s.statusIbu || (s.computedStatusYatim === 'Piatu' || s.computedStatusYatim === 'Yatim Piatu' ? 'Meninggal' : 'Masih Hidup')}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-900">{waliName}</div>
                            {waliPhone ? (
                              <a
                                href={`https://wa.me/${cleanPhone.replace(/^0/, '62')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-mono font-bold hover:underline"
                                title="Chat WhatsApp Wali Siswa"
                              >
                                <Phone size={10} className="text-emerald-600" />
                                <span>{waliPhone}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Tanpa nomor WA</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            {s.isKps ? (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                                Ya (PIP/KPS)
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Reguler</span>
                            )}
                          </td>
                          <td className="p-3.5 pr-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewDetailModal({
                                  open: true,
                                  title: `Detail Kondisi Siswa: ${s.name}`,
                                  type: 'yatim',
                                  data: {
                                    'Nama Siswa': s.name,
                                    'NISN / NIS': `${s.nisn || '-'} / ${s.nis || '-'}`,
                                    'Kelas': s.class,
                                    'Status Kondisi': s.computedStatusYatim,
                                    'Nama Ayah': s.namaAyah || (s as any).fatherName || '-',
                                    'Kondisi Ayah': s.statusAyah || (s.computedStatusYatim === 'Yatim' || s.computedStatusYatim === 'Yatim Piatu' ? 'Meninggal' : 'Masih Hidup'),
                                    'Nama Ibu': s.namaIbu || (s as any).NamaIbu || '-',
                                    'Kondisi Ibu': s.statusIbu || (s.computedStatusYatim === 'Piatu' || s.computedStatusYatim === 'Yatim Piatu' ? 'Meninggal' : 'Masih Hidup'),
                                    'Nama Wali / Pengasuh': waliName,
                                    'Kontak Wali': waliPhone || '-',
                                    'Alamat': formatFullAddress(s),
                                    'Penerima Bantuan Sosial': s.isKps ? 'Ya (KPS / PIP Terdaftar)' : 'Tidak'
                                  }
                                })}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                                title="Lihat Detail"
                              >
                                <Eye size={12} />
                                <span className="hidden sm:inline">Lihat</span>
                              </button>
                              <button
                                onClick={() => setEditModal({
                                  open: true,
                                  title: `Edit Status Siswa: ${s.name}`,
                                  type: 'yatim',
                                  data: {
                                    id: s.id,
                                    statusYatim: s.computedStatusYatim,
                                    statusAyah: s.statusAyah || (s.computedStatusYatim === 'Yatim' || s.computedStatusYatim === 'Yatim Piatu' ? 'Meninggal' : 'Masih Hidup'),
                                    statusIbu: s.statusIbu || (s.computedStatusYatim === 'Piatu' || s.computedStatusYatim === 'Yatim Piatu' ? 'Meninggal' : 'Masih Hidup'),
                                    namaWali: s.namaWali || '',
                                    parentPhone: waliPhone
                                  }
                                })}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                                title="Edit Status"
                              >
                                <Edit size={12} />
                                <span className="hidden sm:inline">Edit</span>
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

            {/* Table Pagination */}
            <TablePagination
              currentPage={safePageYatim}
              totalItems={filteredYatimPiatu.length}
              pageSize={pageSizeYatim}
              onPageChange={setCurrentPageYatim}
              onPageSizeChange={setPageSizeYatim}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="siswa yatim & piatu"
            />
          </div>
        </div>
      )}

      {/* 3. Subtab KELAS & WALI */}
      {activeSubTab === 'kelas-wali' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          {/* Rekapitulasi Siswa Per Jenjang Kelas (Paket A, B, C) */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>📊</span>
                  <span>Rekapitulasi Siswa Per Jenjang Kelas</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Rincian distribusi peserta didik menurut <span className="font-semibold text-slate-700">jenis kelamin (L/P)</span> dan <span className="font-semibold text-slate-700">status keaktifan</span> (Aktif vs <span className="font-semibold text-slate-700" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">Tdk Aktif</span>) per paket pendidikan
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* View Mode Toggle */}
                <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setRekapMode('gender')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      rekapMode === 'gender'
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>👥</span>
                    <span>Jenis Kelamin (L/P)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRekapMode('status')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      rekapMode === 'status'
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🟢</span>
                    <span>Status Keaktifan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRekapMode('all')}
                    className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                      rekapMode === 'all'
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>📋</span>
                    <span>Lengkap</span>
                  </button>
                </div>

                <button
                  onClick={() => handleSubTabChange('siswa')}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200/80 active:scale-95 ml-auto lg:ml-0"
                >
                  <span>Kelola Master Siswa</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Global Summary Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-blue-50/40 border border-slate-200/80">
              <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Peserta Didik</span>
                <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">{rekapJenjang.grandTotal.total} <span className="text-xs font-semibold text-slate-500 font-sans">Siswa</span></span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block flex items-center gap-1">
                  <span>👦</span> Laki-laki (L)
                </span>
                <span className="text-base font-black font-mono text-blue-700 mt-0.5 block">{rekapJenjang.grandTotal.male} <span className="text-xs font-semibold text-blue-500 font-sans">Siswa</span></span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-pink-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-pink-600 tracking-wider block flex items-center gap-1">
                  <span>👧</span> Perempuan (P)
                </span>
                <span className="text-base font-black font-mono text-pink-700 mt-0.5 block">{rekapJenjang.grandTotal.female} <span className="text-xs font-semibold text-pink-500 font-sans">Siswa</span></span>
              </div>
              <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Siswa Aktif
                </span>
                <span className="text-base font-black font-mono text-emerald-700 mt-0.5 block">{rekapJenjang.grandTotal.aktif} <span className="text-xs font-semibold text-emerald-500 font-sans">Siswa</span></span>
              </div>
              <div 
                className="bg-white/90 p-2.5 rounded-xl border border-slate-200/70 shadow-2xs col-span-2 sm:col-span-1"
                title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)"
              >
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> Tdk Aktif
                </span>
                <span className="text-base font-black font-mono text-slate-700 mt-0.5 block">{rekapJenjang.grandTotal.nonAktif} <span className="text-xs font-semibold text-slate-400 font-sans">Siswa</span></span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* PAKET A (SD KELAS 4 - 6) */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎒</span>
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      PAKET A (SD KELAS 4 - 6)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Paket A
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200/60 text-[11px] text-slate-500 font-bold">
                        <th className="pb-2">Kelas</th>
                        {rekapMode === 'gender' && (
                          <>
                            <th className="pb-2 text-center text-blue-700 font-bold">L</th>
                            <th className="pb-2 text-center text-pink-700 font-bold">P</th>
                          </>
                        )}
                        {rekapMode === 'status' && (
                          <>
                            <th className="pb-2 text-center text-emerald-700 font-bold">Aktif</th>
                            <th className="pb-2 text-center text-slate-500 font-bold" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">Tdk Aktif</th>
                          </>
                        )}
                        {rekapMode === 'all' && (
                          <>
                            <th className="pb-2 text-center text-blue-700">L</th>
                            <th className="pb-2 text-center text-pink-700">P</th>
                            <th className="pb-2 text-center text-emerald-700">Aktif</th>
                            <th className="pb-2 text-center text-slate-500" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">Tdk</th>
                          </>
                        )}
                        <th className="pb-2 text-center text-slate-800 font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rekapJenjang.paketA.rows.map((row) => (
                        <tr key={row.kelas} className="hover:bg-white/60 transition-colors">
                          <td className="py-2 font-bold text-slate-800">{row.kelas}</td>
                          {rekapMode === 'gender' && (
                            <>
                              <td className="py-2 text-center font-mono font-semibold text-blue-700">
                                <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100/60">{row.male}</span>
                              </td>
                              <td className="py-2 text-center font-mono font-semibold text-pink-700">
                                <span className="inline-block bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md border border-pink-100/60">{row.female}</span>
                              </td>
                            </>
                          )}
                          {rekapMode === 'status' && (
                            <>
                              <td className="py-2 text-center font-mono font-bold text-emerald-700">
                                <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100/60">{row.aktif}</span>
                              </td>
                              <td className="py-2 text-center font-mono text-slate-500">
                                <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">{row.nonAktif}</span>
                              </td>
                            </>
                          )}
                          {rekapMode === 'all' && (
                            <>
                              <td className="py-2 text-center font-mono font-semibold text-blue-700">{row.male}</td>
                              <td className="py-2 text-center font-mono font-semibold text-pink-700">{row.female}</td>
                              <td className="py-2 text-center font-mono font-bold text-emerald-700">{row.aktif}</td>
                              <td className="py-2 text-center font-mono text-slate-500" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">{row.nonAktif}</td>
                            </>
                          )}
                          <td className="py-2 text-center font-mono font-black text-slate-800 bg-slate-100/50 rounded-md">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Rekap Paket A */}
                <div className="pt-2.5 border-t border-slate-200/80 flex flex-col gap-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200/60">
                      <span className="text-slate-500 font-medium">👦 Laki-laki:</span>
                      <strong className="text-blue-700 font-mono font-bold">{rekapJenjang.paketA.totalMale}</strong>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200/60">
                      <span className="text-slate-500 font-medium">👧 Perempuan:</span>
                      <strong className="text-pink-700 font-mono font-bold">{rekapJenjang.paketA.totalFemale}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between bg-emerald-50/50 px-2 py-1 rounded-lg border border-emerald-100">
                      <span className="text-emerald-700 font-medium">Aktif:</span>
                      <strong className="text-emerald-800 font-mono font-bold">{rekapJenjang.paketA.totalAktif}</strong>
                    </div>
                    <div 
                      className="flex items-center justify-between bg-slate-100/60 px-2 py-1 rounded-lg border border-slate-200/60 cursor-help"
                      title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)"
                    >
                      <span className="text-slate-600 font-medium">Tdk Aktif:</span>
                      <strong className="text-slate-700 font-mono font-bold">{rekapJenjang.paketA.totalNonAktif}</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                    <span className="font-bold text-slate-700">Total Paket A</span>
                    <span className="font-black font-mono text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {rekapJenjang.paketA.totalSiswa} Siswa
                    </span>
                  </div>
                </div>
              </div>

              {/* PAKET B (SMP KELAS 7 - 9) */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📘</span>
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      PAKET B (SMP KELAS 7 - 9)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Paket B
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200/60 text-[11px] text-slate-500 font-bold">
                        <th className="pb-2">Kelas</th>
                        {rekapMode === 'gender' && (
                          <>
                            <th className="pb-2 text-center text-blue-700 font-bold">L</th>
                            <th className="pb-2 text-center text-pink-700 font-bold">P</th>
                          </>
                        )}
                        {rekapMode === 'status' && (
                          <>
                            <th className="pb-2 text-center text-emerald-700 font-bold">Aktif</th>
                            <th className="pb-2 text-center text-slate-500 font-bold" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">Tdk Aktif</th>
                          </>
                        )}
                        {rekapMode === 'all' && (
                          <>
                            <th className="pb-2 text-center text-blue-700">L</th>
                            <th className="pb-2 text-center text-pink-700">P</th>
                            <th className="pb-2 text-center text-emerald-700">Aktif</th>
                            <th className="pb-2 text-center text-slate-500" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">Tdk</th>
                          </>
                        )}
                        <th className="pb-2 text-center text-slate-800 font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rekapJenjang.paketB.rows.map((row) => (
                        <tr key={row.kelas} className="hover:bg-white/60 transition-colors">
                          <td className="py-2 font-bold text-slate-800">{row.kelas}</td>
                          {rekapMode === 'gender' && (
                            <>
                              <td className="py-2 text-center font-mono font-semibold text-blue-700">
                                <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100/60">{row.male}</span>
                              </td>
                              <td className="py-2 text-center font-mono font-semibold text-pink-700">
                                <span className="inline-block bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md border border-pink-100/60">{row.female}</span>
                              </td>
                            </>
                          )}
                          {rekapMode === 'status' && (
                            <>
                              <td className="py-2 text-center font-mono font-bold text-emerald-700">
                                <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100/60">{row.aktif}</span>
                              </td>
                              <td className="py-2 text-center font-mono text-slate-500">
                                <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">{row.nonAktif}</span>
                              </td>
                            </>
                          )}
                          {rekapMode === 'all' && (
                            <>
                              <td className="py-2 text-center font-mono font-semibold text-blue-700">{row.male}</td>
                              <td className="py-2 text-center font-mono font-semibold text-pink-700">{row.female}</td>
                              <td className="py-2 text-center font-mono font-bold text-emerald-700">{row.aktif}</td>
                              <td className="py-2 text-center font-mono text-slate-500" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">{row.nonAktif}</td>
                            </>
                          )}
                          <td className="py-2 text-center font-mono font-black text-slate-800 bg-slate-100/50 rounded-md">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Rekap Paket B */}
                <div className="pt-2.5 border-t border-slate-200/80 flex flex-col gap-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200/60">
                      <span className="text-slate-500 font-medium">👦 Laki-laki:</span>
                      <strong className="text-blue-700 font-mono font-bold">{rekapJenjang.paketB.totalMale}</strong>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200/60">
                      <span className="text-slate-500 font-medium">👧 Perempuan:</span>
                      <strong className="text-pink-700 font-mono font-bold">{rekapJenjang.paketB.totalFemale}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between bg-emerald-50/50 px-2 py-1 rounded-lg border border-emerald-100">
                      <span className="text-emerald-700 font-medium">Aktif:</span>
                      <strong className="text-emerald-800 font-mono font-bold">{rekapJenjang.paketB.totalAktif}</strong>
                    </div>
                    <div 
                      className="flex items-center justify-between bg-slate-100/60 px-2 py-1 rounded-lg border border-slate-200/60 cursor-help"
                      title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)"
                    >
                      <span className="text-slate-600 font-medium">Tdk Aktif:</span>
                      <strong className="text-slate-700 font-mono font-bold">{rekapJenjang.paketB.totalNonAktif}</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                    <span className="font-bold text-slate-700">Total Paket B</span>
                    <span className="font-black font-mono text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {rekapJenjang.paketB.totalSiswa} Siswa
                    </span>
                  </div>
                </div>
              </div>

              {/* PAKET C (SMA KELAS 10 - 12) */}
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🎓</span>
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      PAKET C (SMA KELAS 10 - 12)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                    Paket C
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200/60 text-[11px] text-slate-500 font-bold">
                        <th className="pb-2">Kelas</th>
                        {rekapMode === 'gender' && (
                          <>
                            <th className="pb-2 text-center text-blue-700 font-bold">L</th>
                            <th className="pb-2 text-center text-pink-700 font-bold">P</th>
                          </>
                        )}
                        {rekapMode === 'status' && (
                          <>
                            <th className="pb-2 text-center text-emerald-700 font-bold">Aktif</th>
                            <th className="pb-2 text-center text-slate-500 font-bold" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">Tdk Aktif</th>
                          </>
                        )}
                        {rekapMode === 'all' && (
                          <>
                            <th className="pb-2 text-center text-blue-700">L</th>
                            <th className="pb-2 text-center text-pink-700">P</th>
                            <th className="pb-2 text-center text-emerald-700">Aktif</th>
                            <th className="pb-2 text-center text-slate-500" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">Tdk</th>
                          </>
                        )}
                        <th className="pb-2 text-center text-slate-800 font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rekapJenjang.paketC.rows.map((row) => (
                        <tr key={row.kelas} className="hover:bg-white/60 transition-colors">
                          <td className="py-2 font-bold text-slate-800">{row.kelas}</td>
                          {rekapMode === 'gender' && (
                            <>
                              <td className="py-2 text-center font-mono font-semibold text-blue-700">
                                <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100/60">{row.male}</span>
                              </td>
                              <td className="py-2 text-center font-mono font-semibold text-pink-700">
                                <span className="inline-block bg-pink-50 text-pink-700 px-2 py-0.5 rounded-md border border-pink-100/60">{row.female}</span>
                              </td>
                            </>
                          )}
                          {rekapMode === 'status' && (
                            <>
                              <td className="py-2 text-center font-mono font-bold text-emerald-700">
                                <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100/60">{row.aktif}</span>
                              </td>
                              <td className="py-2 text-center font-mono text-slate-500">
                                <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">{row.nonAktif}</span>
                              </td>
                            </>
                          )}
                          {rekapMode === 'all' && (
                            <>
                              <td className="py-2 text-center font-mono font-semibold text-blue-700">{row.male}</td>
                              <td className="py-2 text-center font-mono font-semibold text-pink-700">{row.female}</td>
                              <td className="py-2 text-center font-mono font-bold text-emerald-700">{row.aktif}</td>
                              <td className="py-2 text-center font-mono text-slate-500" title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)">{row.nonAktif}</td>
                            </>
                          )}
                          <td className="py-2 text-center font-mono font-black text-slate-800 bg-slate-100/50 rounded-md">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Rekap Paket C */}
                <div className="pt-2.5 border-t border-slate-200/80 flex flex-col gap-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200/60">
                      <span className="text-slate-500 font-medium">👦 Laki-laki:</span>
                      <strong className="text-blue-700 font-mono font-bold">{rekapJenjang.paketC.totalMale}</strong>
                    </div>
                    <div className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200/60">
                      <span className="text-slate-500 font-medium">👧 Perempuan:</span>
                      <strong className="text-pink-700 font-mono font-bold">{rekapJenjang.paketC.totalFemale}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="flex items-center justify-between bg-emerald-50/50 px-2 py-1 rounded-lg border border-emerald-100">
                      <span className="text-emerald-700 font-medium">Aktif:</span>
                      <strong className="text-emerald-800 font-mono font-bold">{rekapJenjang.paketC.totalAktif}</strong>
                    </div>
                    <div 
                      className="flex items-center justify-between bg-slate-100/60 px-2 py-1 rounded-lg border border-slate-200/60 cursor-help"
                      title="Tdk Aktif: Siswa dengan status Tidak Aktif, Non-Aktif (termasuk NonAktif / nonaktif), Belum (termasuk Belum Aktif)"
                    >
                      <span className="text-slate-600 font-medium">Tdk Aktif:</span>
                      <strong className="text-slate-700 font-mono font-bold">{rekapJenjang.paketC.totalNonAktif}</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                    <span className="font-bold text-slate-700">Total Paket C</span>
                    <span className="font-black font-mono text-purple-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {rekapJenjang.paketC.totalSiswa} Siswa
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="relative flex-1 sm:w-72">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari kelas, wali kelas, gedung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                Total {filteredClasses.length} Rombongan Belajar
              </span>
              <button
                onClick={handleExportKelasExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
                title="Ekspor Data Kelas & Wali ke Excel"
              >
                <FileSpreadsheet size={14} />
                <span>Ekspor Excel</span>
              </button>
              <button
                onClick={handleSyncKelasGAS}
                disabled={isSyncingGAS}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
                title="Sinkronisasi ke Google Spreadsheet"
              >
                <RefreshCw size={14} className={isSyncingGAS ? 'animate-spin' : ''} />
                <span>{isSyncingGAS ? 'Sinkron...' : 'Sync ke Sheets'}</span>
              </button>
              <button
                onClick={() => setAddModal({
                  open: true,
                  title: 'Tambah Rombongan Belajar (Kelas) Baru',
                  type: 'kelas',
                  data: {
                    kelasId: '',
                    namaKelas: '',
                    jenjangId: 'J001',
                    tingkat: '',
                    waliKelasId: 'GR_001',
                    namaWaliKelas: teachers[0]?.name || '',
                    namatutor: teachers[0]?.name || '',
                    ruangan: '1',
                    kapasitas: 36,
                    tahunAjaran: '2026/2027',
                    status: 'AKTIF'
                  }
                })}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Kelas</span>
              </button>
            </div>
          </div>

          {/* List Table with Action Buttons */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4 text-center w-12">No</th>
                  <th className="p-3.5">NamaKelas</th>
                  <th className="p-3.5">Tingkat</th>
                  <th className="p-3.5">NamaWaliKelas</th>
                  <th className="p-3.5 text-center">Peserta Didik (L/P)</th>
                  <th className="p-3.5 text-center">Status Siswa</th>
                  <th className="p-3.5 text-center">Ruangan</th>
                  <th className="p-3.5 text-center">Kapasitas</th>
                  <th className="p-3.5 text-center">TahunAjaran</th>
                  <th className="p-3.5 text-center">Status Rombel</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedClasses.map((item, idx) => (
                  <tr key={item.kelasId || item.cls} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-4 text-center font-mono font-bold text-slate-400">
                      {(safePageKelas - 1) * pageSizeKelas + idx + 1}
                    </td>
                    <td className="p-3.5">
                      <div className="font-black text-slate-900">
                        {item.namaKelas || item.cls}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">
                        {item.tingkat || `Paket ${item.cls}`}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-800">
                        {item.namaWaliKelas || item.namatutor || item.wali || 'Belum Ditentukan'}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md font-bold border border-blue-100/60" title={`Laki-laki: ${item.male || 0}`}>
                          {item.male || 0} L
                        </span>
                        <span className="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded-md font-bold border border-pink-100/60" title={`Perempuan: ${item.female || 0}`}>
                          {item.female || 0} P
                        </span>
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded-md font-black" title={`Total Siswa: ${item.count || 0}`}>
                          = {item.count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 font-mono text-[11px]">
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-bold border border-emerald-100/60" title={`Siswa Aktif: ${item.aktif || 0}`}>
                          {item.aktif || 0} Aktif
                        </span>
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-semibold" title={`Tidak Aktif / Non-Aktif / Belum: ${item.nonAktif || 0}`}>
                          {item.nonAktif || 0} Tdk
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md text-[11px]">
                        {item.ruangan && item.ruangan !== '-' ? item.ruangan : '-'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-bold text-slate-800">
                      {item.kapasitas !== undefined && item.kapasitas !== 0 && item.kapasitas !== '' ? item.kapasitas : '-'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {item.tahunAjaran || (item.status === 'ALUMNI' ? '-' : '2026/2027')}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (item.status || 'AKTIF').toUpperCase() === 'AKTIF'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {item.status || 'AKTIF'}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewDetailModal({
                            open: true,
                            title: `Detail Kelas & Wali: ${item.namaKelas || item.cls} (${item.kelasId || item.cls})`,
                            type: 'kelas',
                            data: {
                              'KelasID': item.kelasId || item.cls,
                              'NamaKelas': item.namaKelas || item.cls,
                              'JenjangID': item.jenjangId || 'J001',
                              'Tingkat': item.tingkat || `Paket ${item.cls}`,
                              'WaliKelasID': item.waliKelasId || '-',
                              'NamaWaliKelas': item.namaWaliKelas || item.namatutor || item.wali || '-',
                              'NamaTutor': item.namatutor || item.namaWaliKelas || item.wali || '-',
                              'Siswa Aktif': `${item.aktif || 0} Siswa`,
                              'Siswa Tdk Aktif (Non-Aktif / Belum)': `${item.nonAktif || 0} Siswa`,
                              'Siswa Laki-laki': `${item.male || 0} Siswa`,
                              'Siswa Perempuan': `${item.female || 0} Siswi`,
                              'Total Siswa Terdaftar': `${item.count || 0} Siswa`,
                              'Ruangan': item.ruangan || '-',
                              'Kapasitas': item.kapasitas !== undefined && item.kapasitas !== 0 ? `${item.kapasitas} Siswa` : '-',
                              'TahunAjaran': item.tahunAjaran || (item.status === 'ALUMNI' ? '-' : '2026/2027'),
                              'Status Rombel': item.status || 'AKTIF'
                            }
                          })}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          title="Lihat Detail"
                        >
                          <Eye size={12} />
                          <span className="hidden sm:inline">Lihat</span>
                        </button>
                        <button
                          onClick={() => setEditModal({
                            open: true,
                            title: `Edit Kelas & Wali: ${item.namaKelas || item.cls} (${item.kelasId || item.cls})`,
                            type: 'kelas',
                            data: {
                              kelasId: item.kelasId || item.cls,
                              namaKelas: item.namaKelas || item.cls,
                              jenjangId: item.jenjangId || 'J001',
                              tingkat: item.tingkat || `Kelas ${item.cls}`,
                              waliKelasId: item.waliKelasId || 'GR_001',
                              namaWaliKelas: item.namaWaliKelas || item.namatutor || item.wali || '',
                              namatutor: item.namatutor || item.namaWaliKelas || item.wali || '',
                              ruangan: item.ruangan || '1',
                              kapasitas: item.kapasitas !== undefined ? item.kapasitas : 36,
                              tahunAjaran: item.tahunAjaran || (item.status === 'ALUMNI' ? '-' : '2026/2027'),
                              status: item.status || 'AKTIF'
                            }
                          })}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          title="Edit Data"
                        >
                          <Edit size={12} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteModal({
                            open: true,
                            title: 'Hapus Rombel / Kelas',
                            id: item.cls || item.kelasId,
                            name: `Kelas ${item.namaKelas || item.cls} (${item.kelasId || item.cls})`,
                            type: 'kelas'
                          })}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                          title="Hapus Data"
                        >
                          <Trash2 size={12} />
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            currentPage={safePageKelas}
            totalItems={filteredClasses.length}
            pageSize={pageSizeKelas}
            onPageChange={setCurrentPageKelas}
            onPageSizeChange={setPageSizeKelas}
            pageSizeOptions={[10, 25, 50]}
            itemLabel="rombongan belajar (kelas)"
          />
        </div>
      )}

      {/* Subtab JENJANG PENDIDIKAN */}
      {activeSubTab === 'jenjang' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          {/* Smart Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari JenjangID, Kode, Nama, Keterangan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Semua Status</option>
                <option value="Aktif">Status Aktif</option>
                <option value="Non-Aktif">Status Non-Aktif</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportJenjangExcel}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Ekspor Data Jenjang ke Excel"
              >
                <FileSpreadsheet size={14} />
                <span>Ekspor Excel</span>
              </button>
              <button
                onClick={() => setAddModal({
                  open: true,
                  title: 'Tambah Jenjang Pendidikan Baru',
                  type: 'jenjang',
                  data: {
                    jenjangId: `J00${masterJenjangList.length + 1}`,
                    kode: '',
                    namaJenjang: '',
                    tingkatAwal: 'Kelas 1',
                    tingkatTengah: 'Kelas 3',
                    tingkatAkhir: 'Kelas 6',
                    keterangan: 'Setara SD',
                    aktif: 'Aktif'
                  }
                })}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Jenjang</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-linear-to-br from-indigo-50/70 to-indigo-100/40 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Total Jenjang</p>
                <p className="text-2xl font-black text-indigo-950 mt-0.5">{masterJenjangList.length}</p>
                <p className="text-[11px] text-indigo-600/80 mt-0.5 font-medium">Program Kesetaraan PKBM</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">
                <Layers size={20} />
              </div>
            </div>

            <div className="bg-linear-to-br from-emerald-50/70 to-emerald-100/40 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Jenjang Aktif</p>
                <p className="text-2xl font-black text-emerald-950 mt-0.5">
                  {masterJenjangList.filter(j => j.aktif === 'Aktif' || j.status === 'Aktif' || j.aktif === 'AKTIF' || j.status === 'AKTIF').length}
                </p>
                <p className="text-[11px] text-emerald-600/80 mt-0.5 font-medium">Aktif dalam Dapodik/Emis</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
            </div>

            <div className="bg-linear-to-br from-amber-50/70 to-amber-100/40 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Cakupan Tingkat</p>
                <p className="text-lg font-black text-amber-950 mt-0.5">Kelas 4 s/d Kelas 12</p>
                <p className="text-[11px] text-amber-600/80 mt-0.5 font-medium">Paket A, Paket B & Paket C</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
                <GraduationCap size={20} />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="p-3.5 pl-4 text-center w-12">No</th>
                  <th className="p-3.5">JenjangID</th>
                  <th className="p-3.5">Kode</th>
                  <th className="p-3.5">Nama Jenjang</th>
                  <th className="p-3.5">Tingkat Awal</th>
                  <th className="p-3.5">Tingkat Tengah</th>
                  <th className="p-3.5">Tingkat Akhir</th>
                  <th className="p-3.5">Keterangan</th>
                  <th className="p-3.5 text-center">Aktif</th>
                  <th className="p-3.5 pr-4 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedJenjang.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <Layers size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold">Tidak ada data jenjang yang sesuai filter</p>
                    </td>
                  </tr>
                ) : (
                  paginatedJenjang.map((item, index) => {
                    const realIndex = (safePageJenjang - 1) * pageSizeJenjang + index + 1;
                    const isAktif = item.aktif === 'Aktif' || item.status === 'Aktif' || item.aktif === 'AKTIF' || item.status === 'AKTIF';
                    return (
                      <tr key={item.id || item.jenjangId || index} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 pl-4 text-center font-medium text-slate-500">{realIndex}</td>
                        <td className="p-3.5">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {item.jenjangId || item.id || `J00${index + 1}`}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                            {item.kode || '-'}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {item.namaJenjang || item.nama || '-'}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {item.tingkatAwal || '-'}
                        </td>
                        <td className="p-3.5 font-medium text-indigo-700 font-semibold">
                          {item.tingkatTengah || '-'}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {item.tingkatAkhir || '-'}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            {item.keterangan || '-'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isAktif
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {isAktif ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewDetailModal({
                                open: true,
                                title: `Detail Jenjang: ${item.namaJenjang || item.nama}`,
                                type: 'jenjang',
                                data: {
                                  'Jenjang ID': item.jenjangId || item.id,
                                  'Kode Jenjang': item.kode || '-',
                                  'Nama Jenjang': item.namaJenjang || item.nama || '-',
                                  'Tingkat Awal': item.tingkatAwal || '-',
                                  'Tingkat Tengah': item.tingkatTengah || '-',
                                  'Tingkat Akhir': item.tingkatAkhir || '-',
                                  'Keterangan Kesetaraan': item.keterangan || '-',
                                  'Status Keaktifan': isAktif ? 'Aktif' : 'Non-Aktif'
                                }
                              })}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Lihat Detail"
                            >
                              <Eye size={12} />
                              <span className="hidden sm:inline">Lihat</span>
                            </button>
                            <button
                              onClick={() => setEditModal({
                                open: true,
                                title: `Edit Jenjang: ${item.namaJenjang || item.nama}`,
                                type: 'jenjang',
                                data: {
                                  id: item.id || item.jenjangId,
                                  jenjangId: item.jenjangId || item.id,
                                  kode: item.kode || '',
                                  namaJenjang: item.namaJenjang || item.nama || '',
                                  tingkatAwal: item.tingkatAwal || '',
                                  tingkatTengah: item.tingkatTengah || '',
                                  tingkatAkhir: item.tingkatAkhir || '',
                                  keterangan: item.keterangan || '',
                                  aktif: item.aktif || item.status || 'Aktif'
                                }
                              })}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit size={12} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteModal({
                                open: true,
                                title: 'Hapus Jenjang Pendidikan',
                                id: item.id || item.jenjangId,
                                name: `${item.namaJenjang || item.nama} (${item.kode})`,
                                type: 'jenjang'
                              })}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Hapus Data"
                            >
                              <Trash2 size={12} />
                              <span className="hidden sm:inline">Hapus</span>
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

          {/* Table Pagination */}
          <TablePagination
            currentPage={safePageJenjang}
            totalItems={filteredJenjang.length}
            pageSize={pageSizeJenjang}
            onPageChange={setCurrentPageJenjang}
            onPageSizeChange={setPageSizeJenjang}
            pageSizeOptions={[10, 25, 50]}
            itemLabel="jenjang pendidikan"
          />
        </div>
      )}

      {/* 3. Subtab MATA PELAJARAN */}
      {activeSubTab === 'mapel' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          {/* Smart Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama mapel, kode, guru..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Semua Kelas</option>
                {distinctClasses.map(c => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Semua Kategori</option>
                <option value="Wajib Nasional">Wajib Nasional</option>
                <option value="Muatan Lokal">Muatan Lokal</option>
                <option value="Pilihan Khusus">Pilihan Khusus</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                {filteredMapel.length} Mapel
              </span>
              <button
                onClick={() => handleSyncMapelToGAS()}
                disabled={isSyncingMapel}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
                title="Sinkronkan seluruh data Mapel langsung ke Sheet MAPEL di Google Spreadsheet"
              >
                <CloudUpload size={14} className={isSyncingMapel ? "animate-spin" : ""} />
                <span>{isSyncingMapel ? 'Menyinkronkan...' : 'Sinkron ke Spreadsheet'}</span>
              </button>
              <button
                onClick={() => setAddModal({
                  open: true,
                  title: 'Tambah Mata Pelajaran Baru',
                  type: 'mapel',
                  data: { kode: '', nama: '', jenjang: 'PAKET A', kelas: '4', kategori: 'Umum', jp: 2, kkm: 75, guru: teachers[0]?.name || '' }
                })}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap"
              >
                <Plus size={14} />
                <span>Tambah Mapel</span>
              </button>
            </div>
          </div>

          {/* List Table with Action Buttons */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">Kode</th>
                  <th className="p-3.5">Nama Mata Pelajaran</th>
                  <th className="p-3.5">Kategori Kurikulum</th>
                  <th className="p-3.5 text-center">Beban JP/Minggu</th>
                  <th className="p-3.5 text-center">KKM / KKTP</th>
                  <th className="p-3.5">Guru Koordinator Pengampu</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredMapel.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Tidak ada mata pelajaran yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedMapel.map((mapel, idx) => (
                    <tr key={mapel.id || `${mapel.kode}-${mapel.kelas || ''}-${idx}`} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 font-mono font-bold text-indigo-600">{mapel.kode}</td>
                      <td className="p-3.5 font-bold text-slate-900 text-sm">{mapel.nama}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {mapel.kategori}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800">{mapel.jp} JP</td>
                      <td className="p-3.5 text-center font-bold text-emerald-700">{mapel.kkm}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{mapel.guru}</td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewDetailModal({
                              open: true,
                              title: `Detail Mapel: ${mapel.nama}`,
                              type: 'mapel',
                              data: {
                                'Kode Mata Pelajaran': mapel.kode,
                                'Nama Mata Pelajaran': mapel.nama,
                                'Kategori Kurikulum': mapel.kategori,
                                'Beban JP per Minggu': `${mapel.jp} Jam Pelajaran`,
                                'KKM / KKTP Minimal': mapel.kkm,
                                'Guru Pengampu': mapel.guru
                              }
                            })}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                            title="Lihat Detail"
                          >
                            <Eye size={12} />
                            <span className="hidden sm:inline">Lihat</span>
                          </button>
                          <button
                            onClick={() => setEditModal({
                              open: true,
                              title: `Edit Mapel: ${mapel.nama}`,
                              type: 'mapel',
                              data: { ...mapel }
                            })}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                            title="Edit Data"
                          >
                            <Edit size={12} />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              open: true,
                              title: 'Hapus Mata Pelajaran',
                              id: mapel.id || mapel.kode,
                              name: mapel.nama,
                              type: 'mapel'
                            })}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                            title="Hapus Data"
                          >
                            <Trash2 size={12} />
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            currentPage={safePageMapel}
            totalItems={filteredMapel.length}
            pageSize={pageSizeMapel}
            onPageChange={setCurrentPageMapel}
            onPageSizeChange={setPageSizeMapel}
            pageSizeOptions={[10, 25, 50]}
            itemLabel="mata pelajaran"
          />
        </div>
      )}

      {/* 4. Subtab TAHUN AJARAN */}
      {activeSubTab === 'tahun-ajaran' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-2 py-0.5 rounded">Tahun Ajaran Aktif Saat Ini</span>
              <h4 className="text-lg font-black text-emerald-950 mt-1">Tahun Pelajaran {settings.tahunPelajaran || '2026/2027'} - Semester {settings.semester || 'Ganjil'}</h4>
              <p className="text-xs text-emerald-800/80">Tersinkronisasi otomatis dengan Sheet TAHUN_AJARAN, SEMESTER, dan konfigurasi sistem aplikasi.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Berjalan Aktif</span>
              </span>
              <button
                onClick={() => setAddModal({
                  open: true,
                  title: 'Tambah Data Tahun Ajaran Baru',
                  type: 'tahun',
                  data: {
                    taId: `TA0${(masterTahunList.length + 1).toString().padStart(2, '0')}`,
                    tahun: '2026/2027',
                    tahunPelajaran: '2026/2027',
                    semester: 'Semester Ganjil & Genap',
                    rentangPeriode: '13 Juli 2026 - 25 Juni 2027',
                    kurikulum: 'Kurikulum Merdeka 2026/2027 Kemendikdasmen',
                    status: 'Non-Aktif'
                  }
                })}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Tahun</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari TAID, tahun pelajaran, kurikulum..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Semua Status</option>
                <option value="Aktif">Status Aktif</option>
                <option value="Non-Aktif">Status Non-Aktif</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                {filteredTahun.length} Tahun Pelajaran
              </span>
              <button
                onClick={handleExportTahunAjaranExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Ekspor Excel"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Ekspor Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">TAID</th>
                  <th className="p-3.5">Tahun Pelajaran</th>
                  <th className="p-3.5">Semester</th>
                  <th className="p-3.5">Rentang Periode</th>
                  <th className="p-3.5">Kurikulum</th>
                  <th className="p-3.5 text-center">Aktif</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTahun.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <p className="font-bold text-slate-600 text-sm">Belum Ada Data Tahun Ajaran</p>
                      <p className="text-xs text-slate-400 mt-0.5">Tambahkan data tahun ajaran melalui tombol di atas.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedTahun.map((t: any, i: number) => {
                    const isAktif = t.status === 'Aktif' || t.aktif === 'Aktif' || t.aktif === true || t.aktif === 'true';
                    return (
                      <tr key={i} className={isAktif ? 'bg-emerald-50/40 hover:bg-emerald-50/70 transition' : 'hover:bg-slate-50/60 transition'}>
                        <td className="p-3.5 pl-4 font-mono font-bold text-indigo-700">
                          {t.taId || t.id || `TA00${i + 1}`}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {t.tahunPelajaran || t.tahun || t.tahunAjaran}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-700">
                          {t.semester || 'Semester Ganjil & Genap'}
                        </td>
                        <td className="p-3.5 text-slate-700 whitespace-nowrap">
                          {t.rentangPeriode || t.rentang || t.periode || '-'}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            String(t.kurikulum || '').includes('Kemendikdasmen')
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : String(t.kurikulum || '').includes('Merdeka')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {t.kurikulum || 'Kurikulum Merdeka'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            isAktif ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isAktif ? 'Aktif' : 'Non-Aktif'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isAktif ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-black text-[10px] flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 size={11} />
                                <span>Aktif</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetActiveTahunAjaran(t.tahunPelajaran || t.tahun || t.tahunAjaran)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                title="Jadikan Tahun Pelajaran Aktif di Sistem & Spreadsheet"
                              >
                                <CheckCircle2 size={12} />
                                <span>Aktifkan</span>
                              </button>
                            )}
                            <button
                              onClick={() => setViewDetailModal({
                                open: true,
                                title: `Detail Tahun Pelajaran ${t.tahunPelajaran || t.tahun}`,
                                type: 'tahun',
                                data: t
                              })}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={12} />
                              <span>Lihat</span>
                            </button>
                            <button
                              onClick={() => setEditModal({
                                open: true,
                                title: `Edit Tahun Pelajaran: ${t.tahunPelajaran || t.tahun}`,
                                type: 'tahun',
                                data: { ...t }
                              })}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit size={12} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteModal({
                                open: true,
                                title: 'Hapus Tahun Pelajaran',
                                id: t.id || t.taId || t.tahun,
                                name: `Tahun ${t.tahunPelajaran || t.tahun}`,
                                type: 'tahun'
                              })}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Hapus Data"
                            >
                              <Trash2 size={12} />
                              <span className="hidden sm:inline">Hapus</span>
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

          {/* Table Pagination */}
          <TablePagination
            currentPage={safePageTahun}
            totalItems={filteredTahun.length}
            pageSize={pageSizeTahun}
            onPageChange={setCurrentPageTahun}
            onPageSizeChange={setPageSizeTahun}
            pageSizeOptions={[10, 25, 50]}
            itemLabel="tahun ajaran"
          />
        </div>
      )}

      {/* 4b. Subtab SEMESTER */}
      {activeSubTab === 'semester' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          {/* Active Semester Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50/40 p-4 rounded-2xl border border-indigo-100/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                <Calendar size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-600 text-white tracking-wider">Semester Aktif</span>
                  <span className="text-xs font-mono font-bold text-indigo-700">{settings.tahunPelajaran || '2026/2027'}</span>
                </div>
                <h4 className="text-sm font-black text-slate-900 mt-0.5">Semester {settings.semester || 'Ganjil'} {settings.tahunPelajaran || '2026/2027'}</h4>
                <p className="text-[11px] text-slate-600 font-medium">Tersinkronisasi otomatis dengan Sheet SEMESTER, TAHUN_AJARAN, dan konfigurasi sistem aplikasi.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                AKTIF BERJALAN
              </span>
            </div>
          </div>

          {/* Smart Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari SemesterID, nama, TAID, tahun..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Semua Status & Tipe</option>
                <option value="Aktif">Status AKTIF</option>
                <option value="Non-Aktif">Status NONAKTIF</option>
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
                <option value="ODD">Tipe ODD</option>
                <option value="EVEN">Tipe EVEN</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                {filteredSemester.length} Semester
              </span>
              <button
                onClick={handleExportSemesterExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
                title="Ekspor data semester ke file Excel"
              >
                <Download size={14} />
                <span>Ekspor Excel</span>
              </button>
              <button
                onClick={() => setAddModal({
                  open: true,
                  title: 'Tambah Data Semester Baru',
                  type: 'semester',
                  data: {
                    semesterId: `SM${(masterSemesterList.length + 1).toString().padStart(2, '0')}`,
                    nama: 'Semester Ganjil 2026/2027',
                    taId: 'TA004',
                    tahunPelajaran: '2026/2027',
                    semester: 'Ganjil',
                    tanggalMulai: '13 Juli 2026',
                    tanggalSelesai: '',
                    aktif: 'NONAKTIF',
                    tipe: 'ODD'
                  }
                })}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Semester</span>
              </button>
            </div>
          </div>

          {/* List Table with Action Buttons */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">Nama</th>
                  <th className="p-3.5">Tanggal Mulai</th>
                  <th className="p-3.5">Tanggal Selesai</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSemester.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      <p className="font-bold text-slate-600 text-sm">Belum Ada Data Semester</p>
                      <p className="text-xs text-slate-400 mt-0.5">Silakan klik tombol "Tambah Semester" di atas untuk menambahkan periode semester.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedSemester.map((s: any, idx: number) => {
                    const isAktif = s.aktif === 'AKTIF' || s.status === 'AKTIF' || s.aktif === 'Aktif' || s.status === 'Aktif';
                    return (
                      <tr key={`sem-row-${s.id || s.semesterId || idx}-${idx}`} className={isAktif ? 'bg-emerald-50/30' : 'hover:bg-slate-50/80 transition'}>
                        <td className="p-3.5 pl-4 font-bold text-slate-900 text-sm">
                          <div className="flex items-center gap-2">
                            <span>{s.nama || `Semester ${s.semester} ${s.tahunPelajaran || s.tahunAjaran || ''}`}</span>
                            {isAktif && (
                              <span className="px-2 py-0.5 rounded-full font-black text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                                AKTIF
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700 font-semibold">
                          {s.tanggalMulai || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3.5 text-slate-700 font-semibold">
                          {s.tanggalSelesai || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="p-3.5 pr-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isAktif ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-black text-[10px] flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 size={11} />
                                <span>Aktif</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetActiveSemester(s.tahunPelajaran || s.tahunAjaran || settings.tahunPelajaran || '2026/2027', (s.semester === 'Genap' || String(s.nama || '').toLowerCase().includes('genap')) ? 'Genap' : 'Ganjil')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                                title="Jadikan Semester Aktif di Seluruh Sistem & Spreadsheet"
                              >
                                <CheckCircle2 size={12} />
                                <span>Aktifkan</span>
                              </button>
                            )}
                            <button
                              onClick={() => setViewDetailModal({
                                open: true,
                                title: `Detail Semester: ${s.nama}`,
                                type: 'semester',
                                data: {
                                  'SemesterID': s.semesterId || s.id,
                                  'Nama': s.nama,
                                  'TAID': s.taId || s.tahunAjaranId || '',
                                  'TahunPelajaran': s.tahunPelajaran || s.tahunAjaran || s.tahun,
                                  'Semester': s.semester,
                                  'TanggalMulai': s.tanggalMulai || '-',
                                  'TanggalSelesai': s.tanggalSelesai || '-',
                                  'Tipe': s.tipe || (s.semester === 'Genap' ? 'EVEN' : 'ODD'),
                                  'Aktif': isAktif ? 'AKTIF' : 'NONAKTIF'
                                }
                              })}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Lihat Detail Lengkap"
                            >
                              <Eye size={12} />
                              <span className="hidden sm:inline">Lihat</span>
                            </button>
                            <button
                              onClick={() => setEditModal({
                                open: true,
                                title: `Edit Semester: ${s.nama}`,
                                type: 'semester',
                                data: { ...s }
                              })}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit size={12} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => setDeleteModal({
                                open: true,
                                title: 'Hapus Semester',
                                id: s.id || s.semesterId || s.nama,
                                name: `Semester ${s.nama}`,
                                type: 'semester'
                              })}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Hapus Data"
                            >
                              <Trash2 size={12} />
                              <span className="hidden sm:inline">Hapus</span>
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

          {/* Table Pagination */}
          <TablePagination
            currentPage={safePageSemester}
            totalItems={filteredSemester.length}
            pageSize={pageSizeSemester}
            onPageChange={setCurrentPageSemester}
            onPageSizeChange={setPageSizeSemester}
            pageSizeOptions={[10, 20, 25, 50]}
            itemLabel="periode semester"
          />
        </div>
      )}

      {/* 5. Subtab HARI LIBUR & KALENDER */}
      {activeSubTab === 'hari-libur' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          {/* Smart Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto flex-1">
              <div className="relative flex-1 sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari hari libur, tanggal, agenda..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={13} />
                  </button>
                )}
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Semua Kategori</option>
                <option value="Libur Nasional">Libur Nasional</option>
                <option value="Libur Keagamaan">Libur Keagamaan</option>
                <option value="Agenda KBM">Agenda KBM / Asesmen</option>
                <option value="Agenda Akademik">Agenda Akademik</option>
                <option value="Libur Sekolah">Libur Semester Sekolah</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                {filteredLibur.length} Agenda
              </span>
              <button
                onClick={() => handleSyncLiburToGAS()}
                disabled={isSyncingLibur}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
                title="Sinkronkan seluruh data Hari Libur langsung ke Sheet HARI_LIBUR di Google Spreadsheet"
              >
                <CloudUpload size={14} className={isSyncingLibur ? "animate-spin" : ""} />
                <span>{isSyncingLibur ? 'Menyinkronkan...' : 'Sinkron ke Spreadsheet'}</span>
              </button>
              <button
                onClick={() => setAddModal({
                  open: true,
                  title: 'Tambah Hari Libur / Agenda Baru',
                  type: 'libur',
                  data: {
                    hariLiburId: `H${masterLiburList.length + 1}`,
                    tanggal: '17 Agustus 2026',
                    tanggalSelesai: '17 Agustus 2026',
                    nama: '',
                    jenis: 'Libur Nasional / Libur Umum',
                    tahunAjaran: '2026/2027',
                    keterangan: ''
                  }
                })}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Libur</span>
              </button>
            </div>
          </div>

          {/* List Table with Action Buttons */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">HariLiburID</th>
                  <th className="p-3.5">Tanggal Mulai</th>
                  <th className="p-3.5">Tanggal Selesai</th>
                  <th className="p-3.5">Nama Kegiatan / Libur</th>
                  <th className="p-3.5">Jenis</th>
                  <th className="p-3.5">Tahun Ajaran</th>
                  <th className="p-3.5">Keterangan</th>
                  <th className="p-3.5 pr-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredLibur.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Tidak ada agenda hari libur atau kalender yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedLibur.map((l, i) => (
                    <tr key={l.id || l.hariLiburId || i} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 pl-4 font-mono font-black text-indigo-700">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 font-bold text-[11px]">
                          {l.hariLiburId || l.id || `H${i + 1}`}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{l.tanggal}</td>
                      <td className="p-3.5 font-semibold text-slate-700">{l.tanggalSelesai || l.tanggal}</td>
                      <td className="p-3.5 font-bold text-slate-900 text-sm">{l.nama || l.agenda}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          String(l.jenis).includes('Nasional') ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          String(l.jenis).includes('Keagamaan') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          String(l.jenis).includes('Semester') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {l.jenis}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">{l.tahunAjaran || '2026/2027'}</td>
                      <td className="p-3.5 text-slate-500">{l.keterangan || '-'}</td>
                      <td className="p-3.5 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewDetailModal({
                              open: true,
                              title: `Detail Libur: ${l.nama || l.agenda}`,
                              type: 'libur',
                              data: {
                                'HariLiburID': l.hariLiburId || l.id,
                                'Tanggal Mulai': l.tanggal,
                                'Tanggal Selesai': l.tanggalSelesai || l.tanggal,
                                'Nama Kegiatan / Libur': l.nama || l.agenda,
                                'Jenis': l.jenis,
                                'Tahun Ajaran': l.tahunAjaran || '2026/2027',
                                'Keterangan': l.keterangan || '-'
                              }
                            })}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            title="Lihat Detail"
                          >
                            <Eye size={12} />
                            <span className="hidden sm:inline">Lihat</span>
                          </button>
                          <button
                            onClick={() => setEditModal({
                              open: true,
                              title: `Edit Libur: ${l.nama || l.agenda}`,
                              type: 'libur',
                              data: {
                                id: l.id,
                                hariLiburId: l.hariLiburId || l.id,
                                tanggal: l.tanggal,
                                tanggalSelesai: l.tanggalSelesai || l.tanggal,
                                nama: l.nama || l.agenda,
                                jenis: l.jenis,
                                tahunAjaran: l.tahunAjaran || '2026/2027',
                                keterangan: l.keterangan || ''
                              }
                            })}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            title="Edit Data"
                          >
                            <Edit size={12} />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              open: true,
                              title: 'Hapus Agenda Libur',
                              id: l.id || l.hariLiburId || l.agenda,
                              name: l.nama || l.agenda,
                              type: 'libur'
                            })}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                            title="Hapus Data"
                          >
                            <Trash2 size={12} />
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            currentPage={safePageLibur}
            totalItems={filteredLibur.length}
            pageSize={pageSizeLibur}
            onPageChange={setCurrentPageLibur}
            onPageSizeChange={setPageSizeLibur}
            pageSizeOptions={[10, 25, 50]}
            itemLabel="agenda hari libur"
          />
        </div>
      )}

      {/* 7. Subtab VALIDASI DAPODIK 2027 */}
      {activeSubTab === 'dapodik-2027' && (
        <div className="space-y-5">
          {/* Smart Dapodik KPI Analytics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div 
              onClick={() => setFilterDapodikStatus('all')}
              className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                filterDapodikStatus === 'all' 
                  ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400/30' 
                  : 'bg-white border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${filterDapodikStatus === 'all' ? 'text-slate-200' : 'text-slate-500'}`}>Total Siswa</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  filterDapodikStatus === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Users size={16} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{dapodikAuditData.stats.total}</span>
                <span className={`text-[11px] font-semibold ${filterDapodikStatus === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Siswa Terdaftar</span>
              </div>
            </div>

            <div 
              onClick={() => setFilterDapodikStatus(filterDapodikStatus === 'SIAP_SINKRON' ? 'all' : 'SIAP_SINKRON')}
              className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                filterDapodikStatus === 'SIAP_SINKRON' 
                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/30' 
                  : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950 hover:bg-emerald-100/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${filterDapodikStatus === 'SIAP_SINKRON' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                  Siap Sinkron
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  filterDapodikStatus === 'SIAP_SINKRON' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <CheckCheck size={16} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">{dapodikAuditData.stats.siapSinkron}</span>
                <span className={`text-[11px] font-semibold ${filterDapodikStatus === 'SIAP_SINKRON' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                  {dapodikAuditData.stats.total > 0 ? Math.round((dapodikAuditData.stats.siapSinkron / dapodikAuditData.stats.total) * 100) : 0}% Valid
                </span>
              </div>
            </div>

            <div 
              onClick={() => setFilterDapodikStatus(filterDapodikStatus === 'PERINGATAN' ? 'all' : 'PERINGATAN')}
              className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                filterDapodikStatus === 'PERINGATAN' 
                  ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-400/30' 
                  : 'bg-amber-50/70 border-amber-200/80 text-amber-950 hover:bg-amber-100/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${filterDapodikStatus === 'PERINGATAN' ? 'text-amber-100' : 'text-amber-700'}`}>
                  Peringatan
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  filterDapodikStatus === 'PERINGATAN' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  <AlertCircle size={16} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">{dapodikAuditData.stats.peringatan}</span>
                <span className={`text-[11px] font-semibold ${filterDapodikStatus === 'PERINGATAN' ? 'text-amber-100' : 'text-amber-600'}`}>
                  Data Cukup
                </span>
              </div>
            </div>

            <div 
              onClick={() => setFilterDapodikStatus(filterDapodikStatus === 'RESIDU_DAPODIK' ? 'all' : 'RESIDU_DAPODIK')}
              className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                filterDapodikStatus === 'RESIDU_DAPODIK' 
                  ? 'bg-rose-600 text-white border-rose-600 ring-2 ring-rose-400/30' 
                  : 'bg-rose-50/70 border-rose-200/80 text-rose-950 hover:bg-rose-100/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${filterDapodikStatus === 'RESIDU_DAPODIK' ? 'text-rose-100' : 'text-rose-700'}`}>
                  Residu Dukcapil
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  filterDapodikStatus === 'RESIDU_DAPODIK' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  <ShieldAlert size={16} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">{dapodikAuditData.stats.residu}</span>
                <span className={`text-[11px] font-semibold ${filterDapodikStatus === 'RESIDU_DAPODIK' ? 'text-rose-100' : 'text-rose-600'}`}>
                  Perlu Koreksi
                </span>
              </div>
            </div>

            <div 
              onClick={() => setFilterDapodikStatus(filterDapodikStatus === 'DEWASA' ? 'all' : 'DEWASA')}
              className={`cursor-pointer p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                filterDapodikStatus === 'DEWASA' 
                  ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-teal-400/30' 
                  : 'bg-teal-50/70 border-teal-200/80 text-teal-950 hover:bg-teal-100/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${filterDapodikStatus === 'DEWASA' ? 'text-teal-100' : 'text-teal-700'}`}>
                  Usia Dewasa (≥21 Thn)
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                  filterDapodikStatus === 'DEWASA' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-700'
                }`}>
                  <UserCheck size={16} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">{dapodikAuditData.stats.dewasa || 0}</span>
                <span className={`text-[11px] font-semibold ${filterDapodikStatus === 'DEWASA' ? 'text-teal-100' : 'text-teal-600'}`}>
                  Status Valid
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 text-white p-4 rounded-2xl shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">Kepatuhan Verval</span>
                <div className="w-8 h-8 rounded-xl bg-white/10 text-indigo-200 flex items-center justify-center font-bold">
                  <Activity size={16} />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black">{dapodikAuditData.stats.avgScore}%</span>
                <span className="text-[11px] font-semibold text-indigo-200">
                  {dapodikAuditData.stats.avgScore >= 90 ? 'Status Sangat Baik' : 'Butuh Sinkron'}
                </span>
              </div>
            </div>
          </div>

           {/* Smart Filter & Action Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto flex-1">
                <div className="relative flex-1 sm:w-64">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari siswa, NISN, NIK, No KK, Ibu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </div>

                {distinctClasses.length > 0 && (
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Semua Rombel</option>
                    {distinctClasses.map(cls => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>
                )}

                <select
                  value={filterTahunMasuk}
                  onChange={(e) => setFilterTahunMasuk(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">📅 Semua Thn Masuk</option>
                  {distinctTahunMasuk.map(yr => (
                    <option key={yr} value={yr}>Thn Masuk {yr}</option>
                  ))}
                </select>

                {/* Filter Status Dapodik */}
                <select
                  value={filterDapodikStatus}
                  onChange={(e) => setFilterDapodikStatus(e.target.value as any)}
                  className="px-3 py-2 bg-indigo-50/60 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">🔍 Semua Status Validasi</option>
                  <option value="SIAP_SINKRON">✓ Siap Sinkron (Valid 100%)</option>
                  <option value="PERINGATAN">⚠️ Peringatan (Data Cukup)</option>
                  <option value="RESIDU_DAPODIK">⛔ Residu Dukcapil (Invalid)</option>
                  <option value="DEWASA">🧑 Usia Dewasa (≥21 Tahun - Valid)</option>
                  <option value="BELUM_TERDATA">⏳ Belum Terdata</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {students.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA ${students.length} DATA SISWA & DAPODIK secara permanen? Data di memori dan browser akan dikosongkan total (0 Data).`)) {
                        useStore.getState().setStudents([]);
                        db.set('students', []);
                        db.set('dapodik_validations', []);
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('erp_students');
                          localStorage.removeItem('erp_dapodik_validations');
                        }
                        setSyncFeedback('✅ Semua data siswa & audit Dapodik berhasil dikosongkan.');
                        setTimeout(() => setSyncFeedback(''), 4000);
                      }
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition"
                    title="Kosongkan semua data siswa & dapodik dari memori"
                  >
                    <Trash2 size={14} />
                    <span>Kosongkan (0 Data)</span>
                  </button>
                )}
                <button
                  onClick={handleBatchAutoCleanDapodik}
                  disabled={isScanningDapodik}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
                  title="Pindai & bersihkan spasi / teks anomali secara otomatis"
                >
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Scan Cerdas</span>
                </button>
                <button
                  onClick={handleSaveToDapodikValidasiTable}
                  disabled={isSavingDapodik}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold text-xs shadow-xs transition"
                  title="Otomatis sinkronkan & simpan 14 kolom skema database DAPODIK_VALIDASI"
                >
                  {isSavingDapodik ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menyimpan & Audit...</span>
                    </>
                  ) : (
                    <>
                      <Database size={14} />
                      <span>Simpan ke DAPODIK_VALIDASI</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportDapodikExcel}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
                  title="Unduh 14 kolom skema database DAPODIK_VALIDASI ke file Excel"
                >
                  <Download size={14} />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>
            </div>

                       {/* Smart Table with High-Precision Auditing Badges */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/90 text-slate-600 uppercase font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-4">NISN (10 Digit)</th>
                    <th className="p-3.5">Nama Siswa & Profil</th>
                    <th className="p-3.5 text-center">Rombel</th>
                    <th className="p-3.5 text-center">Thn Masuk</th>
                    <th className="p-3.5">NIK (16 Digit) & Asal Wilayah</th>
                    <th className="p-3.5">No. KK</th>
                    <th className="p-3.5">Nama Ibu Kandung</th>
                    <th className="p-3.5 text-center">Skor & Status Dapodik</th>
                    <th className="p-3.5 pr-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredDapodik.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <CheckCircle2 size={32} className="mx-auto text-slate-300" />
                          <p className="font-bold text-slate-600">Tidak ada data siswa yang cocok dengan filter</p>
                          <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau reset filter status validasi.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDapodik.map((r) => {
                      const nisnOk = r.validations.nisn.status === 'valid';
                      const nikOk = r.validations.nik.status === 'valid';
                      const kkOk = r.validations.noKk.status === 'valid';
                      const ibuOk = r.validations.namaIbu.status === 'valid';

                      return (
                        <tr key={r.studentId} className="hover:bg-slate-50/80 transition">
                          {/* 1. NISN */}
                          {/* 1. NISN */}
                          <td className="p-3.5 pl-4">
                            <div className="space-y-1">
                              <span className="font-mono font-bold text-indigo-700">{r.nisn || '-'}</span>
                              <div>
                                {r.hasDuplicateNisn ? (
                                  r.isNisnDuplicateApproved ? (
                                    <div className="flex items-center gap-1">
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300" title={`Duplikasi dengan ${r.duplicateNisnWith?.name || 'siswa lain'} telah disahkan valid`}>
                                        ✓ Duplikasi Sah
                                      </span>
                                      <button
                                        onClick={() => handleToggleDuplicateApproval(r.studentId, 'nisn', false)}
                                        className="text-[9px] text-slate-400 hover:text-rose-600 underline font-medium"
                                        title="Batalkan pengesahan duplikasi"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 animate-pulse" title={`Duplikasi NISN ganda dengan ${r.duplicateNisnWith?.name} (${r.duplicateNisnWith?.class})`}>
                                        ⚠️ Ganda: {r.duplicateNisnWith?.name?.split(' ')[0]}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleToggleDuplicateApproval(r.studentId, 'nisn', true)}
                                          className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded text-[9px] font-bold shadow-2xs transition"
                                          title="Anggap Benar / Sahkan NISN ini (Otomatis Langsung Valid)"
                                        >
                                          ✓ Sahkan
                                        </button>
                                        <button
                                          onClick={() => openEditDapodik(r)}
                                          className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded text-[9px] font-bold shadow-2xs transition"
                                          title="Edit NISN terlebih dahulu agar valid"
                                        >
                                          ✏️ Edit
                                        </button>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  r.validations.nisn.status === 'valid' ? (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title={r.validations.nisn.message}>
                                      ✓ 10 Digit
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title={r.validations.nisn.message}>
                                      ⚠️ Invalid
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Nama Lengkap & Gender */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{r.name}</span>
                                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${r.gender === 'P' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {r.gender === 'P' ? 'P' : 'L'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                                <span>{r.birthPlace || '-'}, {r.birthDate || '-'}</span>
                                {(r.isDewasa || (r.ageYears !== undefined && r.ageYears >= 21)) && (
                                  <span 
                                    className="inline-flex items-center gap-0.5 text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200" 
                                    title={`Usia siswa terhitung dewasa (${r.ageYears ? r.ageYears.toFixed(1) : '≥21'} tahun) dan berstatus VALID pada Dapodik 2027`}
                                  >
                                    ✓ Usia Dewasa ({r.ageYears ? `${Math.floor(r.ageYears)} Thn` : '≥21'})
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Kelas / Rombel */}
                          <td className="p-3.5 text-center font-bold text-slate-700">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                              {r.class || '-'}
                            </span>
                          </td>

                          {/* 4. Thn Masuk */}
                          <td className="p-3.5 text-center font-mono font-bold text-indigo-800">
                            {r.tahunMasuk ? (
                              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                                {r.tahunMasuk}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* 5. NIK Siswa & Dukcapil Region */}
                          <td className="p-3.5">
                            <div className="space-y-1">
                              <div className="font-mono text-slate-900 font-semibold">{r.nik || '-'}</div>
                              <div>
                                {r.hasDuplicateNik ? (
                                  r.isNikDuplicateApproved ? (
                                    <div className="flex items-center gap-1">
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300" title={`Duplikasi NIK dengan ${r.duplicateNikWith?.name || 'siswa lain'} telah disahkan valid`}>
                                        ✓ NIK Duplikasi Sah
                                      </span>
                                      <button
                                        onClick={() => handleToggleDuplicateApproval(r.studentId, 'nik', false)}
                                        className="text-[9px] text-slate-400 hover:text-rose-600 underline font-medium"
                                        title="Batalkan pengesahan duplikasi"
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 animate-pulse" title={`Duplikasi NIK ganda dengan ${r.duplicateNikWith?.name} (${r.duplicateNikWith?.class})`}>
                                        ⚠️ NIK Ganda: {r.duplicateNikWith?.name?.split(' ')[0]}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleToggleDuplicateApproval(r.studentId, 'nik', true)}
                                          className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded text-[9px] font-bold shadow-2xs transition"
                                          title="Anggap Benar / Sahkan NIK ini (Otomatis Langsung Valid)"
                                        >
                                          ✓ Sahkan
                                        </button>
                                        <button
                                          onClick={() => openEditDapodik(r)}
                                          className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded text-[9px] font-bold shadow-2xs transition"
                                          title="Edit NIK terlebih dahulu agar valid"
                                        >
                                          ✏️ Edit
                                        </button>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {r.parsedNik ? (
                                      <span className="inline-flex items-center text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                        📍 {r.parsedNik.provinceName}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                        Bukan NIK 16 Digit
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 6. No. KK */}
                          <td className="p-3.5">
                            <div className="font-mono text-slate-700">{r.noKk || '-'}</div>
                            {kkOk ? (
                              <span className="text-[9px] font-semibold text-emerald-700">✓ KK 16 Digit</span>
                            ) : (
                              <span className="text-[9px] font-semibold text-slate-400">Belum Lengkap</span>
                            )}
                          </td>

                          {/* 7. Nama Ibu Kandung */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-800">{r.namaIbu || '-'}</div>
                              <div>
                                {ibuOk ? (
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                    ✓ Sesuai Akta
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200" title={r.validations.namaIbu.message}>
                                    ⚠️ Wajib Verval PD
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 8. Skor Kepatuhan & Status Dapodik */}
                          <td className="p-3.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs ${
                                r.overallStatus === 'SIAP_SINKRON' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                r.overallStatus === 'PERINGATAN' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                r.overallStatus === 'RESIDU_DAPODIK' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {r.overallStatus === 'SIAP_SINKRON' && <CheckCircle size={11} />}
                                {r.overallStatus === 'PERINGATAN' && <AlertCircle size={11} />}
                                {r.overallStatus === 'RESIDU_DAPODIK' && <ShieldAlert size={11} />}
                                <span>
                                  {r.overallStatus === 'SIAP_SINKRON' ? 'Siap Sinkron' :
                                   r.overallStatus === 'PERINGATAN' ? 'Peringatan' :
                                   r.overallStatus === 'RESIDU_DAPODIK' ? 'Residu Dapodik' : 'Belum Terdata'}
                                </span>
                              </span>
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    r.complianceScore >= 95 ? 'bg-emerald-500' :
                                    r.complianceScore >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`} 
                                  style={{ width: `${r.complianceScore}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 9. Aksi */}
                          <td className="p-3.5 pr-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedDapodikAudit(r)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 shadow-2xs"
                                title="Lihat Audit Cerdas & Diagnostik"
                              >
                                <Sparkles size={12} className="text-indigo-600" />
                                <span>Audit</span>
                              </button>
                              <button
                                onClick={() => openEditDapodik(r)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                                title="Edit Data"
                              >
                                <Edit size={12} />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button
                                onClick={() => setDeleteModal({
                                  open: true,
                                  title: 'Hapus Data Siswa & Dapodik',
                                  id: r.studentId,
                                  name: r.name,
                                  type: 'dapodik'
                                })}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                                title="Hapus Data"
                              >
                                <Trash2 size={12} />
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

            {/* Table Pagination */}
            <TablePagination
              currentPage={safePageDapodik}
              totalItems={filteredDapodik.length}
              pageSize={pageSizeDapodik}
              onPageChange={setCurrentPageDapodik}
              onPageSizeChange={setPageSizeDapodik}
              pageSizeOptions={[10, 25, 50, 100]}
              itemLabel="siswa validasi Dapodik"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SMART DAPODIK DIAGNOSTIC INSPECTOR MODAL                                  */}
      {/* ========================================================================= */}
      {selectedDapodikAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Audit Cerdas Verval PD: {selectedDapodikAudit.name}</h3>
                  <p className="text-xs text-slate-500">Kelas {selectedDapodikAudit.class} • NISN: {selectedDapodikAudit.nisn || '(Belum Ada)'}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDapodikAudit(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Compliance Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                selectedDapodikAudit.overallStatus === 'SIAP_SINKRON' ? 'bg-emerald-50 border-emerald-200 text-emerald-950' :
                selectedDapodikAudit.overallStatus === 'PERINGATAN' ? 'bg-amber-50 border-amber-200 text-amber-950' :
                'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm uppercase tracking-wide">
                      {selectedDapodikAudit.overallStatus === 'SIAP_SINKRON' ? '✓ SIAP SINKRONISASI DAPODIK 2027' :
                       selectedDapodikAudit.overallStatus === 'PERINGATAN' ? '⚠️ PERINGATAN KELENGKAPAN ATRIBUT' :
                       '⛔ TERDETEKSI RESIDU DUKCAPIL & PUSDATIN'}
                    </span>
                  </div>
                  <p className="text-xs opacity-90">{selectedDapodikAudit.summaryReason}</p>
                </div>
                <div className="text-center px-3 py-1.5 bg-white rounded-xl shadow-xs border border-inherit">
                  <span className="text-xs font-bold text-slate-500 block">Skor</span>
                  <span className={`text-xl font-black ${
                    selectedDapodikAudit.complianceScore >= 95 ? 'text-emerald-600' :
                    selectedDapodikAudit.complianceScore >= 75 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {selectedDapodikAudit.complianceScore}%
                  </span>
                </div>
              </div>

              {/* Interactive Duplicate Confirmation Section */}
              {(selectedDapodikAudit.hasDuplicateNisn || selectedDapodikAudit.hasDuplicateNik) && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                          Konfirmasi Keabsahan Data Duplikasi Siswa
                        </h4>
                        <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                          Sistem mendeteksi adanya kesamaan nomor unik dengan siswa lain. Sesuai prosedur Verval PD, silakan tentukan apakah data ini <strong>dianggap benar (sah)</strong> atau <strong>harus diedit</strong> terlebih dahulu:
                        </p>
                      </div>

                      {/* Detail NISN duplicate */}
                      {selectedDapodikAudit.hasDuplicateNisn && (
                        <div className="p-3 bg-white/95 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
                          <div className="space-y-1">
                            <div>
                              <span className="font-bold text-slate-800">Duplikasi NISN ({selectedDapodikAudit.nisn}):</span>{' '}
                              <span className="text-slate-600">Sama dengan <strong>{selectedDapodikAudit.duplicateNisnWith?.name}</strong> ({selectedDapodikAudit.duplicateNisnWith?.class})</span>
                            </div>
                            <div>
                              {selectedDapodikAudit.isNisnDuplicateApproved ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                                  ✓ Status: Telah Disahkan Operator (Otomatis Valid)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                                  ⚠️ Status: Belum Dikonfirmasi (Dianggap Residu/Invalid)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {selectedDapodikAudit.isNisnDuplicateApproved ? (
                              <button
                                type="button"
                                onClick={() => handleToggleDuplicateApproval(selectedDapodikAudit.studentId, 'nisn', false)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 rounded-lg text-xs font-bold transition"
                              >
                                Batalkan Pengesahan
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleDuplicateApproval(selectedDapodikAudit.studentId, 'nisn', true)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                              >
                                <Check size={13} />
                                <span>Anggap Benar (Langsung Valid)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Detail NIK duplicate */}
                      {selectedDapodikAudit.hasDuplicateNik && (
                        <div className="p-3 bg-white/95 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs">
                          <div className="space-y-1">
                            <div>
                              <span className="font-bold text-slate-800">Duplikasi NIK ({selectedDapodikAudit.nik}):</span>{' '}
                              <span className="text-slate-600">Sama dengan <strong>{selectedDapodikAudit.duplicateNikWith?.name}</strong> ({selectedDapodikAudit.duplicateNikWith?.class})</span>
                            </div>
                            <div>
                              {selectedDapodikAudit.isNikDuplicateApproved ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                                  ✓ Status: Telah Disahkan Operator (Otomatis Valid)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                                  ⚠️ Status: Belum Dikonfirmasi (Dianggap Residu/Invalid)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {selectedDapodikAudit.isNikDuplicateApproved ? (
                              <button
                                type="button"
                                onClick={() => handleToggleDuplicateApproval(selectedDapodikAudit.studentId, 'nik', false)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 rounded-lg text-xs font-bold transition"
                              >
                                Batalkan Pengesahan
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleDuplicateApproval(selectedDapodikAudit.studentId, 'nik', true)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                              >
                                <Check size={13} />
                                <span>Anggap Benar (Langsung Valid)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* NISN Status Card (10 Digit Angka) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span>🎓 Status Validasi NISN (10 Digit Angka)</span>
                  </h4>
                  {selectedDapodikAudit.parsedNisn ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      10 Digit Angka Valid
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                      Bukan 10 Digit Angka
                    </span>
                  )}
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Nomor NISN</span>
                    <span className="font-mono text-sm font-black text-slate-900">
                      {selectedDapodikAudit.nisn || '(Belum Diisi)'}
                    </span>
                  </div>
                  <div>
                    {selectedDapodikAudit.validations.nisn.status === 'valid' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        ✓ Valid (10 Digit Numerik)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                        ⚠️ {selectedDapodikAudit.validations.nisn.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* NIK Disdukcapil Intelligence Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span>💳 Analisis Dekomposisi NIK Disdukcapil (16 Digit)</span>
                  </h4>
                  {selectedDapodikAudit.parsedNik ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Format Valid
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                      Format Invalid
                    </span>
                  )}
                </div>

                {selectedDapodikAudit.parsedNik ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Provinsi Asal NIK</span>
                      <span className="font-bold text-slate-800">{selectedDapodikAudit.parsedNik.provinceName}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Kab/Kec Kode</span>
                      <span className="font-bold text-slate-800">{selectedDapodikAudit.parsedNik.regencyCode} / {selectedDapodikAudit.parsedNik.districtCode}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Tgl Lahir di NIK</span>
                      <span className="font-bold text-slate-800">{selectedDapodikAudit.parsedNik.parsedBirthDate || '-'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block">Gender di NIK</span>
                      <span className="font-bold text-slate-800">
                        {selectedDapodikAudit.parsedNik.parsedGender === 'P' ? 'Perempuan (Tgl+40)' : 'Laki-laki'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 font-medium">
                    NIK tidak dapat didekomposisi karena panjang digit tidak sama dengan 16 atau berisi karakter non-numerik.
                  </p>
                )}
              </div>

              {/* Field by Field Audit Checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Audit Atribut Wajib Dapodik</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.values(selectedDapodikAudit.validations).map((f) => (
                    <div 
                      key={f.field} 
                      className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${
                        f.status === 'valid' ? 'bg-white border-slate-200' :
                        f.status === 'warning' ? 'bg-amber-50/70 border-amber-200' :
                        'bg-rose-50/70 border-rose-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">{f.label}</span>
                        <span className="font-mono text-[11px] text-slate-500 block truncate max-w-[180px]">{f.value}</span>
                        <span className={`text-[10px] font-medium block ${
                          f.status === 'valid' ? 'text-emerald-700' :
                          f.status === 'warning' ? 'text-amber-700' : 'text-rose-700 font-bold'
                        }`}>
                          {f.message}
                        </span>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {f.status === 'valid' ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check size={12} />
                          </div>
                        ) : f.status === 'warning' ? (
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                            <AlertCircle size={12} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                            <X size={12} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Suggestions */}
              {selectedDapodikAudit.suggestions.length > 0 && (
                <div className="bg-indigo-50/80 border border-indigo-200/80 p-3.5 rounded-2xl space-y-1.5 text-xs">
                  <h4 className="font-black text-indigo-950 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-indigo-600" />
                    <span>Rekomendasi Perbaikan Operator:</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-indigo-900 text-[11px] font-medium">
                    {selectedDapodikAudit.suggestions.map((sug, i) => (
                      <li key={i}>{sug}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDapodikAudit(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedDapodikAudit;
                  setSelectedDapodikAudit(null);
                  setEditModal({
                    open: true,
                    title: `Edit Data Dapodik: ${target.name}`,
                    type: 'dapodik',
                    data: {
                      id: target.studentId,
                      name: target.name,
                      nisn: target.nisn || '',
                      nik: target.nik || '',
                      noKk: target.noKk || '',
                      NamaIbu: target.namaIbu || '',
                      namaAyah: target.namaAyah || '',
                      birthPlace: target.birthPlace || '',
                      birthDate: target.birthDate || '',
                      tahunMasuk: target.tahunMasuk || '',
                      gender: target.gender || 'L'
                    }
                  });
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <Edit size={14} />
                <span>Koreksi & Edit Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Rendering for audit-sheet */}
      {activeSubTab === 'audit-sheet' && (
        <div className="space-y-6 animate-in fade-in">
          <SmartSheetAuditor onNavigateToTab={handleSubTabChange} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL DETAIL MODAL (LIHAT)                                            */}
      {/* ========================================================================= */}
      {viewDetailModal && viewDetailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Eye size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">{viewDetailModal.title}</h3>
              </div>
              <button 
                onClick={() => setViewDetailModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {Object.entries(viewDetailModal.data).map(([key, value]) => (
                <div key={key} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="font-bold text-slate-500">{key}</span>
                  <span className="font-extrabold text-slate-900 text-right">{String(value)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewDetailModal(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                Tutup Tampilan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL EDIT MODAL (EDIT)                                              */}
      {/* ========================================================================= */}
      {editModal && editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Edit size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">{editModal.title}</h3>
              </div>
              <button 
                onClick={() => setEditModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {Object.entries(editModal.data)
                .filter(([key]) => key !== 'id' && key !== 'approvedDuplicateNisn' && key !== 'approvedDuplicateNik')
                .map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>
                      {key === 'hariLiburId' ? 'Hari Libur ID (contoh: H1, H2)' :
                       key === 'semesterId' ? 'ID Semester (contoh: SM01, SM07)' :
                       key === 'taId' ? 'ID Tahun Ajaran (TAID - contoh: TA004)' :
                       key === 'tahun' || key === 'tahunPelajaran' ? 'Tahun Pelajaran (contoh: 2026/2027)' :
                       key === 'tahunAjaran' ? 'Tahun Ajaran (contoh: 2026/2027)' :
                       key === 'nama' ? (editModal.type === 'libur' ? 'Nama Kegiatan / Libur' : 'Nama Semester (contoh: Semester Ganjil 2026/2027)') :
                       key === 'agenda' ? 'Nama Kegiatan / Libur' :
                       key === 'jenis' ? 'Jenis / Kategori Libur (contoh: Libur Nasional / Libur Keagamaan / Agenda Akademik)' :
                       key === 'semester' ? 'Semester (Ganjil / Genap)' :
                       key === 'tanggal' ? 'Tanggal Mulai Libur (contoh: 17 Agustus 2026)' :
                       key === 'tanggalMulai' ? 'Tanggal Mulai (contoh: 13 Juli 2026)' :
                       key === 'tanggalSelesai' ? 'Tanggal Selesai (contoh: 25 Juni 2027 / 17 Agustus 2026)' :
                       key === 'tipe' ? 'Tipe Semester (ODD / EVEN)' :
                       key === 'rentangPeriode' || key === 'rentang' || key === 'rentangWaktu' || key === 'periode' ? 'Rentang Periode (contoh: 13 Juli 2026 - 25 Juni 2027)' :
                       key === 'kurikulum' ? 'Kurikulum (contoh: Kurikulum Merdeka 2026/2027 Kemendikdasmen)' :
                       key === 'aktif' || key === 'status' ? 'Status Keaktifan (AKTIF / NONAKTIF)' :
                       key === 'kelasId' ? 'Kode / ID Kelas (contoh: A4, B7, C10)' :
                       key === 'cls' || key === 'namaKelas' ? 'Nama / Nomor Kelas (contoh: 4, 7, 10)' :
                       key === 'nisn' ? 'NISN (10 Digit Angka)' :
                       key === 'nik' ? 'NIK Siswa (16 Digit)' :
                       key === 'noKk' ? 'Nomor Kartu Keluarga (16 Digit)' :
                       key === 'NamaIbu' || key === 'namaIbu' ? 'Nama Ibu Kandung' :
                       key === 'namaAyah' ? 'Nama Ayah Kandung' :
                       key === 'birthPlace' ? 'Tempat Lahir' :
                       key === 'birthDate' ? 'Tanggal Lahir (YYYY-MM-DD)' :
                       key === 'gender' ? 'Jenis Kelamin (L/P)' :
                       key === 'tahunMasuk' ? 'Tahun Masuk' :
                       key === 'jenjangId' ? 'ID Jenjang (contoh: J001, J002, J003)' :
                       key === 'kode' ? 'Kode Singkat Jenjang (contoh: PA, PB, PC)' :
                       key === 'namaJenjang' ? 'Nama Jenjang Pendidikan (contoh: Paket A, Paket B, Paket C)' :
                       key === 'tingkatAwal' ? 'Tingkat Awal (contoh: Kelas 4, Kelas 7, Kelas 10)' :
                       key === 'tingkatTengah' ? 'Tingkat Tengah (contoh: Kelas 5, Kelas 8, Kelas 11)' :
                       key === 'tingkatAkhir' ? 'Tingkat Akhir (contoh: Kelas 6, Kelas 9, Kelas 12)' :
                       key === 'keterangan' ? 'Keterangan' :
                       key === 'tingkat' ? 'Tingkat / Program (contoh: Paket A Kelas 4)' :
                       key === 'waliKelasId' ? 'ID Wali Kelas / GTK (contoh: GR_011)' :
                       key === 'namaWaliKelas' ? 'Nama Wali Kelas' :
                       key === 'namatutor' || key === 'wali' ? 'Nama Tutor' :
                       key === 'ruangan' ? 'Ruang Belajar (contoh: 1, 2, 3)' :
                       key === 'status' ? 'Status Rombel (AKTIF / ALUMNI)' :
                       key === 'kapasitas' ? 'Kapasitas Siswa Maksimal' :
                       key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={value !== undefined && value !== null ? String(value) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditModal(prev => prev ? {
                        ...prev,
                        data: { ...prev.data, [key]: val }
                      } : null);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />

                  {/* Real-time duplicate NISN feedback in edit modal */}
                  {key === 'nisn' && editModal.type === 'dapodik' && (() => {
                    const currentNisn = String(value || '').trim().replace(/\D/g, '');
                    const dup = students.find(s => s.id !== editModal.data.id && String(s.nisn || '').trim().replace(/\D/g, '') === currentNisn && currentNisn !== '');
                    if (!dup) return null;
                    const isApproved = Boolean(editModal.data.approvedDuplicateNisn);
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-950 mt-1 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                          <span>Terdeteksi Duplikasi NISN: Sama dengan {dup.name} ({dup.class})</span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-tight">
                          Jika NISN ini sudah benar (misal: kasus khusus verval PD), silakan centang opsi di bawah agar otomatis berstatus <strong>VALID</strong>. Jika tidak, edit NISN di atas hingga unik.
                        </p>
                        <label className="flex items-center gap-2.5 font-bold cursor-pointer text-xs text-emerald-950 bg-white p-2.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 transition shadow-2xs">
                          <input
                            type="checkbox"
                            checked={isApproved}
                            onChange={(e) => {
                              setEditModal(prev => prev ? {
                                ...prev,
                                data: { ...prev.data, approvedDuplicateNisn: e.target.checked }
                              } : null);
                            }}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span>✓ Anggap Benar & Sahkan Duplikasi NISN (Langsung Valid)</span>
                        </label>
                      </div>
                    );
                  })()}

                  {/* Real-time duplicate NIK feedback in edit modal */}
                  {key === 'nik' && editModal.type === 'dapodik' && (() => {
                    const currentNik = String(value || '').trim().replace(/[-.\s]/g, '');
                    const dup = students.find(s => s.id !== editModal.data.id && String(s.nik || '').trim().replace(/[-.\s]/g, '') === currentNik && currentNik !== '');
                    if (!dup) return null;
                    const isApproved = Boolean(editModal.data.approvedDuplicateNik);
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-950 mt-1 shadow-2xs">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                          <span>Terdeteksi Duplikasi NIK: Sama dengan {dup.name} ({dup.class})</span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-tight">
                          Jika NIK ini sudah benar sesuai KK/KTP, silakan centang opsi di bawah agar otomatis berstatus <strong>VALID</strong>. Jika salah input, silakan perbaiki digit NIK di atas.
                        </p>
                        <label className="flex items-center gap-2.5 font-bold cursor-pointer text-xs text-emerald-950 bg-white p-2.5 rounded-lg border border-emerald-300 hover:bg-emerald-50 transition shadow-2xs">
                          <input
                            type="checkbox"
                            checked={isApproved}
                            onChange={(e) => {
                              setEditModal(prev => prev ? {
                                ...prev,
                                data: { ...prev.data, approvedDuplicateNik: e.target.checked }
                              } : null);
                            }}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span>✓ Anggap Benar & Sahkan Duplikasi NIK (Langsung Valid)</span>
                        </label>
                      </div>
                    );
                  })()}
                </div>
              ))}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL ADD MODAL (+ TAMBAH)                                           */}
      {/* ========================================================================= */}
      {addModal && addModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">{addModal.title}</h3>
              </div>
              <button 
                onClick={() => setAddModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              {Object.entries(addModal.data).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {key === 'hariLiburId' ? 'Hari Libur ID (contoh: H1, H2)' :
                     key === 'semesterId' ? 'ID Semester (contoh: SM01, SM07)' :
                     key === 'taId' ? 'ID Tahun Ajaran (TAID - contoh: TA004)' :
                     key === 'tahun' || key === 'tahunPelajaran' ? 'Tahun Pelajaran (contoh: 2026/2027)' :
                     key === 'tahunAjaran' ? 'Tahun Ajaran (contoh: 2026/2027)' :
                     key === 'nama' ? (addModal.type === 'libur' ? 'Nama Kegiatan / Libur' : 'Nama Semester (contoh: Semester Ganjil 2026/2027)') :
                     key === 'agenda' ? 'Nama Kegiatan / Libur' :
                     key === 'jenis' ? 'Jenis / Kategori Libur (contoh: Libur Nasional / Libur Keagamaan / Agenda Akademik)' :
                     key === 'semester' ? 'Semester (Ganjil / Genap)' :
                     key === 'tanggal' ? 'Tanggal Mulai Libur (contoh: 17 Agustus 2026)' :
                     key === 'tanggalMulai' ? 'Tanggal Mulai (contoh: 13 Juli 2026)' :
                     key === 'tanggalSelesai' ? 'Tanggal Selesai (contoh: 25 Juni 2027 / 17 Agustus 2026)' :
                     key === 'tipe' ? 'Tipe Semester (ODD / EVEN)' :
                     key === 'rentangPeriode' || key === 'rentang' || key === 'rentangWaktu' || key === 'periode' ? 'Rentang Periode (contoh: 13 Juli 2026 - 25 Juni 2027)' :
                     key === 'kurikulum' ? 'Kurikulum (contoh: Kurikulum Merdeka 2026/2027 Kemendikdasmen)' :
                     key === 'status' || key === 'aktif' ? 'Status Keaktifan (AKTIF / NONAKTIF)' :
                     key === 'kelasId' ? 'Kode / ID Kelas (contoh: A4, B7, C10)' :
                     key === 'cls' || key === 'namaKelas' ? 'Nama / Nomor Kelas (contoh: 4, 7, 10)' :
                     key === 'jenjangId' ? 'ID Jenjang (contoh: J001, J002, J003)' :
                     key === 'kode' ? 'Kode Singkat Jenjang (contoh: PA, PB, PC)' :
                     key === 'namaJenjang' ? 'Nama Jenjang Pendidikan (contoh: Paket A, Paket B, Paket C)' :
                     key === 'tingkatAwal' ? 'Tingkat Awal (contoh: Kelas 4, Kelas 7, Kelas 10)' :
                     key === 'tingkatTengah' ? 'Tingkat Tengah (contoh: Kelas 5, Kelas 8, Kelas 11)' :
                     key === 'tingkatAkhir' ? 'Tingkat Akhir (contoh: Kelas 6, Kelas 9, Kelas 12)' :
                     key === 'keterangan' ? 'Keterangan' :
                     key === 'tingkat' ? 'Tingkat / Program (contoh: Paket A Kelas 4)' :
                     key === 'waliKelasId' ? 'ID Wali Kelas / GTK (contoh: GR_011)' :
                     key === 'namaWaliKelas' ? 'Nama Wali Kelas' :
                     key === 'namatutor' || key === 'wali' ? 'Nama Tutor / Wali Kelas' :
                     key === 'ruangan' ? 'Ruang Belajar (contoh: 1, 2, 3)' :
                     key === 'kapasitas' ? 'Kapasitas Siswa Maksimal' :
                     key === 'jp' ? 'Beban Jam Pelajaran (JP)' :
                     key === 'kkm' ? 'KKM / KKTP Minimal' :
                     key === 'namaPos' ? 'Nama Pos Tagihan' :
                     key === 'penanggungJawab' ? 'Penanggung Jawab Sarpras' :
                     key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  
                  {key === 'wali' || key === 'guru' || key === 'penanggungJawab' ? (
                    <select
                      value={String(value || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddModal(prev => prev ? {
                          ...prev,
                          data: { ...prev.data, [key]: val }
                        } : null);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">-- Pilih Guru / Tenaga Pendidik --</option>
                      {teachers.map((t, idx) => (
                        <option key={t.id ? `opt-teacher-${t.id}-${idx}` : `opt-teacher-${t.name}-${idx}`} value={t.name}>{t.name} ({t.class || 'GTK'})</option>
                      ))}
                    </select>
                  ) : key === 'kelas' ? (
                    <select
                      value={String(value || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddModal(prev => prev ? {
                          ...prev,
                          data: { ...prev.data, [key]: val }
                        } : null);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Semua Kelas">Semua Kelas</option>
                      {distinctClasses.map(c => (
                        <option key={c} value={`Kelas ${c}`}>Kelas {c}</option>
                      ))}
                    </select>
                  ) : key === 'kategori' && addModal.type === 'mapel' ? (
                    <select
                      value={String(value || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddModal(prev => prev ? {
                          ...prev,
                          data: { ...prev.data, [key]: val }
                        } : null);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Wajib Nasional">Wajib Nasional</option>
                      <option value="Muatan Lokal">Muatan Lokal</option>
                      <option value="Pilihan Khusus">Pilihan Khusus</option>
                    </select>
                  ) : key === 'frekuensi' ? (
                    <select
                      value={String(value || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddModal(prev => prev ? {
                          ...prev,
                          data: { ...prev.data, [key]: val }
                        } : null);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Bulanan">Bulanan</option>
                      <option value="Tahunan">Tahunan</option>
                      <option value="Insidental">Insidental</option>
                    </select>
                  ) : key === 'tanggal' ? (
                    <input
                      type="date"
                      value={String(value || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddModal(prev => prev ? {
                          ...prev,
                          data: { ...prev.data, [key]: val }
                        } : null);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  ) : (
                    <input
                      type={key === 'nominal' || key === 'jumlah' || key === 'jp' || key === 'kkm' || key === 'kapasitas' ? 'number' : 'text'}
                      value={value !== undefined && value !== null ? String(value) : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddModal(prev => prev ? {
                          ...prev,
                          data: { ...prev.data, [key]: val }
                        } : null);
                      }}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  )}
                </div>
              ))}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Tambahkan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL DELETE CONFIRMATION MODAL (HAPUS)                              */}
      {/* ========================================================================= */}
      {deleteModal && deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertTriangle size={24} />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">{deleteModal.title}</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus data <strong className="text-slate-800">"{deleteModal.name}"</strong>? Data yang dihapus tidak dapat dipulihkan kembali.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 flex-1"
              >
                <Trash2 size={14} />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HASIL SIMPAN & SINKRONISASI DAPODIK_VALIDASI MODAL DIALOG                */}
      {/* ========================================================================= */}
      {saveDapodikResultModal && saveDapodikResultModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-2xs ${
                  saveDapodikResultModal.success ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {saveDapodikResultModal.success ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {saveDapodikResultModal.success ? 'Berhasil Simpan DAPODIK_VALIDASI' : 'Gagal Menyimpan Data'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Sinkronisasi Skema Otomatis 14 Kolom Standar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSaveDapodikResultModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Total Data Siswa Diaudit:</span>
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[11px] font-black">
                    {saveDapodikResultModal.count} Siswa
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Status Penyimpanan Lokal:</span>
                  <span className="text-emerald-700 font-black flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={12} /> Tersimpan Aman
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Status Google Spreadsheet:</span>
                  <span className={`font-black flex items-center gap-1 text-[11px] ${
                    saveDapodikResultModal.gasSynced ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {saveDapodikResultModal.gasSynced ? (
                      <>
                        <CheckCircle2 size={12} /> Sinkron ke Sheets
                      </>
                    ) : (
                      <>
                        <Info size={12} /> Belum Terhubung GAS
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1.5 text-xs text-indigo-950">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-indigo-600 shrink-0" />
                  <span>Keterangan Status & Rincian:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-indigo-900 font-medium">
                  {saveDapodikResultModal.details}
                </p>
              </div>

              {saveDapodikResultModal.columns && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    14 Kolom Standar yang Dihasilkan Otomatis:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {saveDapodikResultModal.columns.map((col, i) => (
                      <span key={i} className="text-[10px] font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSaveDapodikResultModal(null)}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition"
              >
                Tutup & Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAVING PROGRESS & CONFIRMATION POPUP (FEEDBACK CEPAT & REAL-TIME)        */}
      {/* ========================================================================= */}
      {savingProgressModal && savingProgressModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 text-center space-y-4">
            {/* Animated Status Icon */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              {savingProgressModal.status === 'saving' && (
                <>
                  <div className="absolute inset-0 rounded-2xl bg-indigo-100 animate-ping opacity-30" />
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <RefreshCw size={28} className="animate-spin text-white" />
                  </div>
                </>
              )}
              {savingProgressModal.status === 'success' && (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in-50">
                  <CheckCircle2 size={32} className="text-white" />
                </div>
              )}
              {savingProgressModal.status === 'error' && (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 animate-in zoom-in-50">
                  <AlertCircle size={32} className="text-white" />
                </div>
              )}
            </div>

            {/* Title & Message */}
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                {savingProgressModal.title}
              </h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                {savingProgressModal.message}
              </p>
            </div>

            {/* Step / Progress Badge */}
            {savingProgressModal.stepText && (
              <div className="py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] font-bold text-indigo-700 flex items-center justify-center gap-1.5">
                {savingProgressModal.status === 'saving' && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                )}
                {savingProgressModal.status === 'success' && (
                  <Check size={13} className="text-emerald-600" />
                )}
                <span>{savingProgressModal.stepText}</span>
              </div>
            )}

            {/* Progress Shimmer Bar when saving */}
            {savingProgressModal.status === 'saving' && (
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full animate-pulse w-full" />
              </div>
            )}

            {/* Close Button if Error or Completed */}
            {savingProgressModal.status !== 'saving' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSavingProgressModal(null)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black shadow-xs transition cursor-pointer ${
                    savingProgressModal.status === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {savingProgressModal.status === 'success' ? 'Selesai' : 'Tutup'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
