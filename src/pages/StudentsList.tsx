import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Student } from '../types';
import { 
  CLASSES, STATUSES, generateId, cn, formatDate, formatAge, 
  getGoogleDriveDirectImageUrl, getGoogleDriveThumbnailUrl, 
  standardizeDate, matchClass, getActiveClasses, getAllClasses, formatClassLabel, triggerPrint 
} from '../lib/utils';
import { 
  Search, Plus, Filter, Download, Upload, Edit, Trash2, Printer, X, FileDown,
  ArrowUpDown, FileSpreadsheet, Eye, BookOpen, User, Calendar, MapPin, UserCheck, 
  DownloadCloud, UploadCloud, ChevronLeft, ChevronRight, RefreshCw, PlusCircle,
  FileText, Home, Users, FolderGit2, CheckCircle2, AlertCircle, Phone, Mail,
  Award, Heart, Shield, ShieldCheck, Info, ExternalLink, CreditCard, MessageCircle,
  AlertTriangle, Loader2
} from 'lucide-react';
import { 
  exportToExcel, importFromExcel, parseCSVToStudents, 
  downloadStudentExcelTemplate, downloadStudentMasterTemplate, MASTER_SISWA_COLUMNS 
} from '../lib/excel';
import { uploadFileToGAS, fetchFromGAS } from '../lib/api';
import { generateDapodikValidasiRows } from '../lib/dapodikValidator';
import { db } from '../data/db';
import { getStudentCompleteness } from './BerkasSiswaPage';
import { 
  GOLONGAN_DARAH_OPTIONS, 
  AGAMA_OPTIONS, 
  PEKERJAAN_OPTIONS, 
  PENDIDIKAN_OPTIONS, 
  PENGHASILAN_OPTIONS, 
  JENIS_TINGGAL_OPTIONS, 
  TRANSPORTASI_OPTIONS, 
  HUBUNGAN_WALI_OPTIONS 
} from '../data/dropdownOptions';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomDropdown from '../components/common/CustomDropdown';
import { syncCoreSpreadsheetData } from '../utils/coreDataSync';

// Helper Status Yatim Piatu
export function getStudentStatusYatim(student?: Partial<Student> | null): 'Lengkap' | 'Yatim' | 'Piatu' | 'Yatim Piatu' {
  if (!student) return 'Lengkap';
  const sYatim = String(student.statusYatim || (student as any)['StatusYatim'] || (student as any)['Yatim/Piatu'] || '').trim().toLowerCase();
  const sAyah = String(student.statusAyah || (student as any)['StatusAyah'] || '').trim().toLowerCase();
  const sIbu = String(student.statusIbu || (student as any)['StatusIbu'] || '').trim().toLowerCase();

  const isAyahDead = sAyah === 'meninggal' || sAyah === 'almarhum' || sAyah.includes('wafat');
  const isIbuDead = sIbu === 'meninggal' || sIbu === 'almarhumah' || sIbu.includes('wafat');

  if (sYatim === 'yatim piatu' || (isAyahDead && isIbuDead)) {
    return 'Yatim Piatu';
  }
  if (sYatim === 'yatim' || isAyahDead) {
    return 'Yatim';
  }
  if (sYatim === 'piatu' || isIbuDead) {
    return 'Piatu';
  }
  return 'Lengkap';
}

export function getYatimStatusInfo(status?: string) {
  const norm = String(status || 'Lengkap').trim().toLowerCase();
  if (norm === 'yatim piatu') {
    return {
      label: 'Yatim Piatu',
      description: 'Kedua orang tua (Ayah & Ibu) telah meninggal dunia',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      tagColor: 'bg-rose-50 text-rose-700',
      icon: '🖤'
    };
  }
  if (norm === 'yatim') {
    return {
      label: 'Yatim',
      description: 'Ayah kandung telah meninggal dunia',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      tagColor: 'bg-amber-50 text-amber-800',
      icon: '🤍'
    };
  }
  if (norm === 'piatu') {
    return {
      label: 'Piatu',
      description: 'Ibu kandung telah meninggal dunia',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      tagColor: 'bg-purple-50 text-purple-800',
      icon: '💜'
    };
  }
  return {
    label: 'Ortu Lengkap',
    description: 'Ayah dan Ibu kandung masih hidup lengkap',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    tagColor: 'bg-emerald-50 text-emerald-700',
    icon: '🌿'
  };
}

export default function StudentsList() {
  const { 
    students, teachers, addStudent, updateStudent, deleteStudent, settings,
    setLoading, setIsSyncingGlobal, setLastSyncedAt 
  } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTahunMasuk, setFilterTahunMasuk] = useState<string>('ALL');
  const [filterYatim, setFilterYatim] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'name-desc' | 'class-asc' | 'class-desc'>('default');

  // Status Peserta Didik Counts
  const statusCounts = useMemo(() => {
    const counts = {
      all: students.length,
      aktif: 0,
      tidakAktif: 0,
      belum: 0,
      pindah: 0,
      lulus: 0,
      keluar: 0,
    };

    students.forEach((s: any) => {
      const st = String(s.status || 'Aktif').toLowerCase().trim();
      if (st.includes('tidak') || st === 'nonaktif') counts.tidakAktif++;
      else if (st === 'belum') counts.belum++;
      else if (st === 'pindah') counts.pindah++;
      else if (st === 'lulus') counts.lulus++;
      else if (st === 'keluar') counts.keluar++;
      else counts.aktif++;
    });

    return counts;
  }, [students]);

  // Available Entry Years (Tahun Masuk)
  const availableTahunMasuk = useMemo(() => {
    const yearsSet = new Set<string>();
    students.forEach((s: any) => {
      const raw = String(s.tahunMasuk || s['TahunMasuk'] || s['ThnMasuk'] || s['tahun_masuk'] || '').trim();
      if (raw && raw !== '-' && raw !== 'null' && raw !== 'undefined') {
        const match = raw.match(/\b(20\d{2}|19\d{2})\b/);
        if (match) {
          yearsSet.add(match[1]);
        } else {
          yearsSet.add(raw);
        }
      }
    });
    // Add standard recent years
    [2027, 2026, 2025, 2024, 2023].forEach(y => yearsSet.add(String(y)));
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [students]);

  // Year counts mapping
  const tahunMasukCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s: any) => {
      const raw = String(s.tahunMasuk || s['TahunMasuk'] || s['ThnMasuk'] || s['tahun_masuk'] || '').trim();
      if (!raw || raw === '-') return;
      const match = raw.match(/\b(20\d{2}|19\d{2})\b/);
      const yr = match ? match[1] : raw;
      counts[yr] = (counts[yr] || 0) + 1;
    });
    return counts;
  }, [students]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'biodata' | 'alamat' | 'ortu' | 'wali' | 'berkas'>('biodata');
  const [modalError, setModalError] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [detailTab, setDetailTab] = useState<'biodata' | 'alamat' | 'ortu' | 'wali' | 'berkas'>('biodata');
  const [printStudent, setPrintStudent] = useState<Student | null>(null);
  const [printStudentDocType, setPrintStudentDocType] = useState<'biodata' | 'kartu'>('biodata');
  const [isPrintListMode, setIsPrintListMode] = useState(false);
  const [isPrintCardsMode, setIsPrintCardsMode] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showPrintMenu, setShowPrintMenu] = useState(false);

  // Delete Confirmation States (Safe for iframe and direct GAS sync)
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string; class?: string; nis?: string } | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Multi-Select / Bulk Delete States
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Uploading status for form fields
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

  // Import Preview Modal State
  interface ImportPreviewState {
    fileName: string;
    parsedData: Partial<Student>[];
  }
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [importMode, setImportMode] = useState<'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL'>('UPDATE');
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  
  const [viewMode, setViewMode] = useState<'ringkas' | 'master71'>('ringkas');
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  const kepsek = teachers?.find(t => t.class === 'Kepala Sekolah' || (t.class && t.class.toLowerCase().includes('kepala')));
  const waliKelas = teachers?.find(t => matchClass(t.class, filterClass || ''));

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterClass, filterStatus, filterTahunMasuk, sortBy]);

  // Pastikan data siswa up-to-date (409 siswa real) dari Google Spreadsheet
  useEffect(() => {
    if (students.length < 409) {
      syncCoreSpreadsheetData().catch(() => {});
    }
  }, [students.length]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync to sheets immediately when data is changed
  const triggerSync = async (updatedStudents: Student[]) => {
    const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
    if (!scriptEndpoint) return;
    try {
      setLoading(true);
      setIsSyncingGlobal(true);
      // 1. Sync Sheet SISWA
      await fetchFromGAS(scriptEndpoint, {
        action: 'sync',
        data: updatedStudents,
        teachers: useStore.getState().teachers,
        spreadsheetId: settings.spreadsheetId
      });
      
      // 2. Auto Populate Ortu & Yatim
      try {
        await fetchFromGAS(scriptEndpoint, {
          action: 'AUTO_POPULATE_ORTU_YATIM',
          spreadsheetId: settings.spreadsheetId
        });
      } catch (errPop) {
        console.warn("Auto populate sheet ortu & yatim notice:", errPop);
      }

      // 3. Otomatis sinkronkan juga ke sheet DAPODIK_VALIDASI (14 Kolom Standar)
      try {
        const standardDapodikRows = generateDapodikValidasiRows(updatedStudents, settings.academicYear || '2026/2027');
        db.set('dapodik_validations', standardDapodikRows);
        await fetchFromGAS(scriptEndpoint, {
          action: 'syncData',
          table: 'DAPODIK_VALIDASI',
          forceWipeEmpty: updatedStudents.length === 0,
          data: standardDapodikRows,
          spreadsheetId: settings.spreadsheetId
        });
      } catch (errDapodik) {
        console.warn("Auto sync DAPODIK_VALIDASI notice:", errDapodik);
      }

      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
    } catch (e: any) {
      console.error("Auto sync students failed:", e);
      throw e;
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  // Derived filtered & sorted data
  const filteredStudents = students.filter(s => {
    if (!s) return false;

    // Filter based on Status Peserta Didik
    if (filterStatus !== 'ALL') {
      const st = String(s.status || 'Aktif').toLowerCase().trim();
      if (filterStatus === 'Aktif') {
        if (st.includes('tidak') || st === 'nonaktif' || st === 'belum' || st === 'pindah' || st === 'lulus' || st === 'keluar') return false;
      } else if (filterStatus === 'Tidak Aktif') {
        if (!st.includes('tidak') && st !== 'nonaktif') return false;
      } else if (filterStatus === 'Belum') {
        if (st !== 'belum') return false;
      } else if (filterStatus === 'Pindah') {
        if (st !== 'pindah') return false;
      } else if (filterStatus === 'Lulus') {
        if (st !== 'lulus') return false;
      } else if (filterStatus === 'Keluar') {
        if (st !== 'keluar') return false;
      }
    }

    // Filter based on Tahun Masuk
    if (filterTahunMasuk !== 'ALL') {
      const raw = String(s.tahunMasuk || (s as any)['TahunMasuk'] || (s as any)['ThnMasuk'] || (s as any)['tahun_masuk'] || '').trim();
      const match = raw.match(/\b(20\d{2}|19\d{2})\b/);
      const normalizedYr = match ? match[1] : raw;
      if (normalizedYr !== filterTahunMasuk) return false;
    }

    // Filter based on Status Yatim / Piatu
    if (filterYatim !== 'ALL') {
      if (filterYatim === 'KPS') {
        const isKps = s.penerimaKps === 'Ya' || !!s.kipUrl || !!s.noKip;
        if (!isKps) return false;
      } else {
        const yStatus = getStudentStatusYatim(s);
        if (yStatus !== filterYatim) return false;
      }
    }

    const searchString = searchTerm.toLowerCase();
    const nameStr = String(s.name || '').toLowerCase();
    const nisStr = String(s.nis || '').toLowerCase();
    const nisnStr = String(s.nisn || '').toLowerCase();
    const nikStr = String(s.nik || '').toLowerCase();
    const tahunMasukStr = String(s.tahunMasuk || (s as any)['TahunMasuk'] || '').toLowerCase();
    
    const matchesSearch = nameStr.includes(searchString) || 
                          nisStr.includes(searchString) ||
                          nisnStr.includes(searchString) ||
                          nikStr.includes(searchString) ||
                          tahunMasukStr.includes(searchString);
    const matchesClass = filterClass ? matchClass(s.class, filterClass) : true;
    return matchesSearch && matchesClass;
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!a || !b) return 0;
    if (sortBy === 'name-asc') {
      return String(a.name || '').localeCompare(String(b.name || ''), 'id');
    }
    if (sortBy === 'name-desc') {
      return String(b.name || '').localeCompare(String(a.name || ''), 'id');
    }
    if (sortBy === 'class-asc') {
      return String(a.class || '').localeCompare(String(b.class || ''));
    }
    if (sortBy === 'class-desc') {
      return String(b.class || '').localeCompare(String(a.class || ''));
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = sortedStudents.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!settings.scriptUrl) {
      alert("Harap hubungkan Web App URL Google Apps Script di menu Pengaturan terlebih dahulu untuk mengupload berkas ke Google Drive.");
      return;
    }

    try {
      setUploadingState(prev => ({ ...prev, [fieldKey]: true }));
      const nopdkt = currentStudent.nis || currentStudent.id || (currentStudent as any).noPDKT || (currentStudent as any).nopdkt || '';
      const studentName = (currentStudent.name || currentStudent.nis || 'Siswa').trim();
      const nopdktPrefix = nopdkt ? `[${nopdkt}] ` : '';
      const studentFolderName = `${nopdktPrefix}${studentName}`;
      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
      const customFilename = `${nopdkt ? '[' + nopdkt + ']_' : ''}${fieldKey.toUpperCase()}_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}${fileExt ? '.' + fileExt : ''}`;
      
      let resUrl = '';
      try {
        const res = await uploadFileToGAS(
          settings.scriptUrl, 
          file, 
          settings.folderId || 'BERKAS_SISWA_MASTER', 
          customFilename,
          {
            studentId: currentStudent.id,
            nopdkt: nopdkt,
            studentName: currentStudent.name,
            studentClass: currentStudent.class,
            subFolder: studentFolderName,
            nisn: currentStudent.nisn,
            docKey: fieldKey === 'foto' ? 'pasFotoUrl' : (fieldKey + 'Url'),
            modul: 'BERKAS_SISWA',
            kategori: fieldKey.toUpperCase(),
            uploadedBy: 'Admin'
          }
        );
        if (res && res.url) {
          resUrl = res.url;
        }
      } catch (gasErr: any) {
        console.warn("GAS Upload Warning:", gasErr);
        // Fallback ke DataURL agar berkas tetap tersimpan dan aplikasi tidak macet
        const reader = new FileReader();
        const dataUrlPromise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        resUrl = await dataUrlPromise;
        if (String(gasErr.message || gasErr).includes('DriveApp') || String(gasErr.message || gasErr).includes('Akses ditolak')) {
          alert(
            "⚠️ Berkas berhasil disimpan di lokal sistem, namun belum tersimpan di Google Drive karena izin DriveApp belum diotorisasi.\n\n" +
            "💡 Solusi Cepat (1 Menit):\n" +
            "1. Buka spreadsheet Anda -> Menu 'Ekstensi' -> 'Apps Script'\n" +
            "2. Di toolbar atas, pilih fungsi 'otorisasiDrive' (atau 'setup')\n" +
            "3. Klik tombol 'Jalankan' (Run ▶) lalu klik 'Tinjau Izin' -> 'Lanjutan' -> 'Buka project (tidak aman)' -> 'Izinkan'\n" +
            "4. Klik 'Terapkan (Deploy)' -> 'Deployment baru' (Eksekusi sebagai: Saya, Akses: Siapa saja)."
          );
        }
      }
      
      if (resUrl) {
        if (fieldKey === 'foto') {
          setCurrentStudent(prev => ({ ...prev, fotoUrl: resUrl }));
        } else if (fieldKey === 'akta') {
          setCurrentStudent(prev => ({ ...prev, aktaKelahiranUrl: resUrl, akteUrl: resUrl }));
        } else if (fieldKey === 'kk') {
          setCurrentStudent(prev => ({ ...prev, kartuKeluargaUrl: resUrl, kkUrl: resUrl }));
        } else if (fieldKey === 'kia') {
          setCurrentStudent(prev => ({ ...prev, kiaUrl: resUrl, ktpAnakUrl: resUrl }));
        } else if (fieldKey === 'ktpAyah') {
          setCurrentStudent(prev => ({ ...prev, ktpAyahUrl: resUrl }));
        } else if (fieldKey === 'ktpIbu') {
          setCurrentStudent(prev => ({ ...prev, ktpIbuUrl: resUrl }));
        } else if (fieldKey === 'ijazah') {
          setCurrentStudent(prev => ({ ...prev, ijazahUrl: resUrl }));
        } else if (fieldKey === 'ktpWali') {
          setCurrentStudent(prev => ({ ...prev, ktpWaliUrl: resUrl }));
        } else if (fieldKey === 'rapor') {
          setCurrentStudent(prev => ({ ...prev, raporUrl: resUrl, rapotUrl: resUrl }));
        } else if (fieldKey === 'suratPindah') {
          setCurrentStudent(prev => ({ ...prev, suratPindahUrl: resUrl }));
        } else if (fieldKey === 'suKet') {
          setCurrentStudent(prev => ({ ...prev, suKetUrl: resUrl, dokumenLainUrl: resUrl }));
        } else if (fieldKey === 'suratDomisili') {
          setCurrentStudent(prev => ({ ...prev, suratDomisiliUrl: resUrl }));
        } else if (fieldKey === 'formPendaftaran') {
          setCurrentStudent(prev => ({ ...prev, formPendaftaranUrl: resUrl, formUrl: resUrl }));
        } else if (fieldKey === 'suratPernyataan') {
          setCurrentStudent(prev => ({ ...prev, suratPernyataanUrl: resUrl, sPernyataanUrl: resUrl }));
        } else if (fieldKey === 'suratKesanggupan') {
          setCurrentStudent(prev => ({ ...prev, suratKesanggupanUrl: resUrl, sKesanggupanUrl: resUrl }));
        } else if (fieldKey === 'berkasLainnya') {
          setCurrentStudent(prev => ({ ...prev, berkasLainnyaUrl: resUrl, dokumenLainUrl: resUrl }));
        } else {
          setCurrentStudent(prev => ({ ...prev, [fieldKey + 'Url']: resUrl }));
        }
        
        if (resUrl.startsWith('http')) {
          alert(`Berkas ${fieldKey.toUpperCase()} berhasil diunggah ke Google Drive!`);
        } else {
          alert(
            `Berkas ${fieldKey.toUpperCase()} berhasil dipilih & disimpan secara lokal!\n\n` +
            `ℹ️ Catatan: Untuk menyimpan otomatis ke folder Google Drive Anda, jalankan fungsi 'setup' di Apps Script sekali untuk mengaktifkan izin DriveApp.`
          );
        }
      } else {
        throw new Error("Gagal mengupload berkas");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = String(err.message || err);
      if (errMsg.includes('DriveApp') || errMsg.includes('Akses ditolak') || errMsg.includes('Exception:')) {
        alert(
          "⚠️ Akses Google Drive di Apps Script belum diotorisasi!\n\n" +
          "Langkah Cepat Memperbaiki:\n" +
          "1. Buka spreadsheet Anda -> Ekstensi -> Apps Script.\n" +
          "2. Di toolbar atas, pilih fungsi 'setup' lalu klik tombol 'Jalankan (Run)'.\n" +
          "3. Klik 'Tinjau Izin' -> Pilih Akun -> Klik 'Lanjutan (Advanced)' -> Buka Project -> Izinkan (Allow).\n" +
          "4. Klik 'Terapkan (Deploy)' -> 'Deployment Baru (New Deployment)' -> Terapkan.\n\n" +
          "Anda juga dapat menempelkan URL link Google Drive berkas secara langsung pada kolom input."
        );
      } else {
        alert(`Gagal upload berkas: ${errMsg}`);
      }
    } finally {
      setUploadingState(prev => ({ ...prev, [fieldKey]: false }));
      if (e.target) e.target.value = '';
    }
  };

  const processStudentImport = async (parsed: Partial<Student>[], mode: 'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL') => {
    if (parsed.length === 0) {
      alert("Tidak ada data valid yang diimport.");
      return;
    }

    const now = new Date().toISOString();
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const currentStudents = [...useStore.getState().students];

    for (const imp of parsed) {
      const impNis = imp.nis ? String(imp.nis).trim() : '';
      const impNisn = imp.nisn ? String(imp.nisn).trim() : '';
      const impNik = imp.nik ? String(imp.nik).trim() : '';
      const impName = imp.name ? String(imp.name).trim().toLowerCase() : '';

      if (!impName && !impNis && !impNisn) continue;

      if (mode === 'ADD_ALL') {
        const newStudent: Student = {
          id: generateId(),
          nis: impNis || generateId().slice(0, 8),
          nisn: impNisn,
          nik: impNik,
          name: imp.name?.trim() || 'Siswa',
          class: imp.class || '1A',
          gender: imp.gender || 'L',
          pob: imp.pob || '',
          dob: imp.dob || '',
          address: imp.address || '',
          parentName: imp.parentName || imp.namaAyah || imp.namaIbu || '',
          status: imp.status || 'Aktif',
          tahunMasuk: imp.tahunMasuk,
          TahunMasuk: imp.tahunMasuk,
          anakKe: imp.anakKe,
          saudara: imp.saudara,
          agama: imp.agama || 'Islam',
          golonganDarah: imp.golonganDarah,
          tinggiBadan: imp.tinggiBadan,
          beratBadan: imp.beratBadan,
          prestasi: imp.prestasi,
          hobi: imp.hobi,
          catatanPenting: imp.catatanPenting,
          rt: imp.rt,
          rw: imp.rw,
          kelurahan: imp.kelurahan,
          kecamatan: imp.kecamatan,
          kota: imp.kota,
          provinsi: imp.provinsi,
          kodePos: imp.kodePos,
          jenisTinggal: imp.jenisTinggal,
          alatTransportasi: imp.alatTransportasi,
          noHp: imp.noHp,
          email: imp.email,
          sekolahAsal: imp.sekolahAsal,
          skhun: imp.skhun,
          penerimaKps: imp.penerimaKps,
          ijazahNo: imp.ijazahNo,
          noKk: imp.noKk,
          namaAyah: imp.namaAyah,
          nikAyah: imp.nikAyah,
          tempatLahirAyah: imp.tempatLahirAyah,
          tanggalLahirAyah: imp.tanggalLahirAyah,
          pendidikanAyah: imp.pendidikanAyah,
          pekerjaanAyah: imp.pekerjaanAyah,
          penghasilanAyah: imp.penghasilanAyah,
          tlpAyah: imp.tlpAyah,
          statusAyah: imp.statusAyah || 'Masih Hidup',
          namaIbu: imp.namaIbu,
          nikIbu: imp.nikIbu,
          tempatLahirIbu: imp.tempatLahirIbu,
          tanggalLahirIbu: imp.tanggalLahirIbu,
          pendidikanIbu: imp.pendidikanIbu,
          pekerjaanIbu: imp.pekerjaanIbu,
          penghasilanIbu: imp.penghasilanIbu,
          tlpIbu: imp.tlpIbu,
          statusIbu: imp.statusIbu || 'Masih Hidup',
          statusYatim: imp.statusYatim || 'Lengkap',
          namaWali: imp.namaWali,
          tempatLahirWali: imp.tempatLahirWali,
          tglLahirWali: imp.tglLahirWali,
          pendidikanWali: imp.pendidikanWali,
          pekerjaanWali: imp.pekerjaanWali,
          penghasilanWali: imp.penghasilanWali,
          hubunganWali: imp.hubunganWali,
          tlpWali: imp.tlpWali,
          aktaKelahiranUrl: imp.aktaKelahiranUrl || imp.akteUrl,
          kartuKeluargaUrl: imp.kartuKeluargaUrl || imp.kkUrl,
          kiaUrl: imp.kiaUrl,
          ktpAyahUrl: imp.ktpAyahUrl,
          ktpIbuUrl: imp.ktpIbuUrl,
          ktpWaliUrl: imp.ktpWaliUrl,
          ijazahUrl: imp.ijazahUrl,
          raporUrl: imp.raporUrl || imp.rapotUrl,
          suratPindahUrl: imp.suratPindahUrl,
          suKetUrl: imp.suKetUrl || imp.dokumenLainUrl,
          suratDomisiliUrl: imp.suratDomisiliUrl,
          formPendaftaranUrl: imp.formPendaftaranUrl || imp.formUrl || (imp as any).FormPendaftaran || (imp as any)['Form Pendaftaran'],
          suratPernyataanUrl: imp.suratPernyataanUrl || imp.sPernyataanUrl || (imp as any).SPernyataan || (imp as any)['Surat Pernyataan'],
          suratKesanggupanUrl: imp.suratKesanggupanUrl || imp.sKesanggupanUrl || (imp as any).SKesanggupan || (imp as any)['Surat Kesanggupan'],
          berkasLainnyaUrl: imp.berkasLainnyaUrl || (imp as any).BerkasLainnya || (imp as any)['Berkas Lainnya'],
          fotoUrl: imp.fotoUrl,
          createdAt: now,
          updatedAt: now,
        };
        currentStudents.push(newStudent);
        useStore.getState().addStudent(newStudent);
        addedCount++;
        continue;
      }

      const existingIdx = currentStudents.findIndex(e => {
        const eNis = e.nis ? String(e.nis).trim() : '';
        const eNisn = e.nisn ? String(e.nisn).trim() : '';
        const eNik = e.nik ? String(e.nik).trim() : '';
        const eName = e.name ? String(e.name).trim().toLowerCase() : '';

        if (impNis && eNis && impNis === eNis) return true;
        if (impNisn && eNisn && impNisn === eNisn) return true;
        if (impNik && eNik && impNik === eNik) return true;
        if (impName && eName && impName === eName) return true;
        return false;
      });

      if (existingIdx >= 0) {
        if (mode === 'SKIP_EXISTING') {
          skippedCount++;
        } else {
          // UPDATE mode
          const existing = currentStudents[existingIdx];
          const updated: Student = {
            ...existing,
            ...imp,
            nis: impNis || existing.nis,
            nisn: impNisn || existing.nisn,
            nik: impNik || existing.nik,
            name: imp.name?.trim() || existing.name,
            class: imp.class || existing.class,
            gender: imp.gender || existing.gender,
            pob: imp.pob || existing.pob,
            dob: imp.dob || existing.dob,
            address: imp.address || existing.address,
            parentName: imp.parentName || imp.namaAyah || existing.parentName,
            status: imp.status || existing.status,
            updatedAt: now,
          };
          currentStudents[existingIdx] = updated;
          useStore.getState().updateStudent(existing.id, updated);
          updatedCount++;
        }
      } else {
        const newStudent: Student = {
          id: generateId(),
          nis: impNis || generateId().slice(0, 8),
          nisn: impNisn,
          nik: impNik,
          name: imp.name?.trim() || 'Siswa',
          class: imp.class || '1A',
          gender: imp.gender || 'L',
          pob: imp.pob || '',
          dob: imp.dob || '',
          address: imp.address || '',
          parentName: imp.parentName || imp.namaAyah || imp.namaIbu || '',
          status: imp.status || 'Aktif',
          tahunMasuk: imp.tahunMasuk,
          TahunMasuk: imp.tahunMasuk,
          anakKe: imp.anakKe,
          saudara: imp.saudara,
          agama: imp.agama || 'Islam',
          golonganDarah: imp.golonganDarah,
          tinggiBadan: imp.tinggiBadan,
          beratBadan: imp.beratBadan,
          prestasi: imp.prestasi,
          hobi: imp.hobi,
          catatanPenting: imp.catatanPenting,
          rt: imp.rt,
          rw: imp.rw,
          kelurahan: imp.kelurahan,
          kecamatan: imp.kecamatan,
          kota: imp.kota,
          provinsi: imp.provinsi,
          kodePos: imp.kodePos,
          jenisTinggal: imp.jenisTinggal,
          alatTransportasi: imp.alatTransportasi,
          noHp: imp.noHp,
          email: imp.email,
          sekolahAsal: imp.sekolahAsal,
          skhun: imp.skhun,
          penerimaKps: imp.penerimaKps,
          ijazahNo: imp.ijazahNo,
          noKk: imp.noKk,
          namaAyah: imp.namaAyah,
          nikAyah: imp.nikAyah,
          tempatLahirAyah: imp.tempatLahirAyah,
          tanggalLahirAyah: imp.tanggalLahirAyah,
          pendidikanAyah: imp.pendidikanAyah,
          pekerjaanAyah: imp.pekerjaanAyah,
          penghasilanAyah: imp.penghasilanAyah,
          tlpAyah: imp.tlpAyah,
          statusAyah: imp.statusAyah || 'Masih Hidup',
          namaIbu: imp.namaIbu,
          nikIbu: imp.nikIbu,
          tempatLahirIbu: imp.tempatLahirIbu,
          tanggalLahirIbu: imp.tanggalLahirIbu,
          pendidikanIbu: imp.pendidikanIbu,
          pekerjaanIbu: imp.pekerjaanIbu,
          penghasilanIbu: imp.penghasilanIbu,
          tlpIbu: imp.tlpIbu,
          statusIbu: imp.statusIbu || 'Masih Hidup',
          statusYatim: imp.statusYatim || 'Lengkap',
          namaWali: imp.namaWali,
          tempatLahirWali: imp.tempatLahirWali,
          tglLahirWali: imp.tglLahirWali,
          pendidikanWali: imp.pendidikanWali,
          pekerjaanWali: imp.pekerjaanWali,
          penghasilanWali: imp.penghasilanWali,
          hubunganWali: imp.hubunganWali,
          tlpWali: imp.tlpWali,
          aktaKelahiranUrl: imp.aktaKelahiranUrl || imp.akteUrl,
          kartuKeluargaUrl: imp.kartuKeluargaUrl || imp.kkUrl,
          kiaUrl: imp.kiaUrl,
          ktpAyahUrl: imp.ktpAyahUrl,
          ktpIbuUrl: imp.ktpIbuUrl,
          ktpWaliUrl: imp.ktpWaliUrl,
          ijazahUrl: imp.ijazahUrl,
          raporUrl: imp.raporUrl || imp.rapotUrl,
          suratPindahUrl: imp.suratPindahUrl,
          suKetUrl: imp.suKetUrl || imp.dokumenLainUrl,
          suratDomisiliUrl: imp.suratDomisiliUrl,
          formPendaftaranUrl: imp.formPendaftaranUrl || imp.formUrl || (imp as any).FormPendaftaran || (imp as any)['Form Pendaftaran'],
          suratPernyataanUrl: imp.suratPernyataanUrl || imp.sPernyataanUrl || (imp as any).SPernyataan || (imp as any)['Surat Pernyataan'],
          suratKesanggupanUrl: imp.suratKesanggupanUrl || imp.sKesanggupanUrl || (imp as any).SKesanggupan || (imp as any)['Surat Kesanggupan'],
          berkasLainnyaUrl: imp.berkasLainnyaUrl || (imp as any).BerkasLainnya || (imp as any)['Berkas Lainnya'],
          fotoUrl: imp.fotoUrl,
          createdAt: now,
          updatedAt: now,
        };
        currentStudents.push(newStudent);
        useStore.getState().addStudent(newStudent);
        addedCount++;
      }
    }

    const finalStudents = useStore.getState().students;
    await triggerSync(finalStudents);

    let summary = `Proses Import Siswa Selesai!\n• ${addedCount} data baru ditambahkan`;
    if (mode === 'UPDATE') {
      summary += `\n• ${updatedCount} data lama diperbarui/ditimpa`;
    } else if (mode === 'SKIP_EXISTING') {
      summary += `\n• ${skippedCount} data lama dilewati (tidak ditimpa)`;
    }
    alert(summary);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const parsed = await importFromExcel(file);
      if (parsed.length === 0) {
        alert("File tidak memiliki data siswa yang valid atau format header tidak dikenali.");
        return;
      }
      setImportPreview({
        fileName: file.name,
        parsedData: parsed
      });
    } catch (err: any) {
      console.error(err);
      alert(`Gagal membaca file Excel: ${err.message || 'Format tidak valid'}`);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsProcessingImport(true);
    try {
      await processStudentImport(importPreview.parsedData, importMode);
      setImportPreview(null);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan saat mengimpor data.");
    } finally {
      setIsProcessingImport(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const title = `Daftar Siswa SD - ${filterClass ? 'Kelas ' + filterClass : 'Semua Kelas'}`;
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 25);

    const tableData = filteredStudents.map((s, idx) => [
      idx + 1,
      s.nis,
      s.nisn || '-',
      s.nik || '-',
      s.name,
      s.class,
      s.gender,
      s.status === 'Pindah' ? 'Mutasi' : s.status
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['No', 'NIS', 'NISN', 'NIK', 'Nama Lengkap', 'Kelas', 'L/P', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 20 },
        2: { cellWidth: 22 },
        3: { cellWidth: 26 },
        5: { halign: 'center', cellWidth: 14 },
        6: { halign: 'center', cellWidth: 12 },
        7: { halign: 'center', cellWidth: 18 }
      }
    });

    doc.save(`Daftar_Siswa_${filterClass || 'Semua'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleOpenModal = (student?: Student) => {
    const defaultClass = getAllClasses(students)[0] || '1A';
    setModalTab('biodata');
    setModalError('');
    const autoNIS = `2526${String(students.length + 1).padStart(4, '0')}`;
    const targetId = student ? (student.id || student.nis || (student as any).nopdkt || generateId()) : '';
    setCurrentStudent(student ? { 
      ...student, 
      id: targetId,
      _originalId: student.id || student.nis || (student as any).nopdkt,
      _originalNis: student.nis || (student as any).nopdkt
    } : { 
      id: '',
      nis: autoNIS,
      gender: 'L', 
      status: 'Aktif', 
      class: defaultClass,
      agama: 'Islam',
      tahunMasuk: new Date().getFullYear().toString()
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setModalError('');
    
    const studentName = String(currentStudent.name || '').trim();
    if (!studentName) {
      setModalTab('biodata');
      setModalError('Mohon isi Nama Lengkap Siswa terlebih dahulu!');
      return;
    }

    const studentNis = String(currentStudent.nis || '').trim() || `2526${String(students.length + 1).padStart(4, '0')}`;
    
    const statusAyah = currentStudent.statusAyah || 'Masih Hidup';
    const statusIbu = currentStudent.statusIbu || 'Masih Hidup';
    let statusYatim = currentStudent.statusYatim;
    if (!statusYatim) {
      const aDead = statusAyah.toLowerCase().includes('meninggal') || statusAyah.toLowerCase().includes('almarhum');
      const iDead = statusIbu.toLowerCase().includes('meninggal') || statusIbu.toLowerCase().includes('almarhumah');
      if (aDead && iDead) statusYatim = 'Yatim Piatu';
      else if (aDead) statusYatim = 'Yatim';
      else if (iDead) statusYatim = 'Piatu';
      else statusYatim = 'Lengkap';
    }

    const now = new Date().toISOString();
    const targetOriginalId = (currentStudent as any)._originalId || currentStudent.id || currentStudent.nis || (currentStudent as any).nopdkt;
    const finalId = targetOriginalId || currentStudent.id || generateId();

    const sanitizedStudent: Student = {
      ...currentStudent,
      id: finalId,
      nis: studentNis,
      nisn: currentStudent.nisn ? String(currentStudent.nisn).trim() : undefined,
      nik: currentStudent.nik ? String(currentStudent.nik).trim() : undefined,
      name: studentName,
      class: currentStudent.class || '1A',
      gender: currentStudent.gender || 'L',
      pob: currentStudent.pob?.trim() || undefined,
      dob: standardizeDate(currentStudent.dob),
      address: currentStudent.address?.trim() || '',
      parentName: currentStudent.parentName?.trim() || currentStudent.namaAyah?.trim() || currentStudent.namaIbu?.trim() || currentStudent.namaWali?.trim() || 'Orang Tua',
      parentPhone: currentStudent.parentPhone || currentStudent.tlpAyah || currentStudent.tlpIbu || currentStudent.tlpWali || currentStudent.noHp,
      status: currentStudent.status || 'Aktif',
      tahunMasuk: currentStudent.tahunMasuk ? String(currentStudent.tahunMasuk).trim() : undefined,
      anakKe: currentStudent.anakKe || undefined,
      saudara: currentStudent.saudara || undefined,
      agama: currentStudent.agama || 'Islam',
      golonganDarah: currentStudent.golonganDarah || undefined,
      tinggiBadan: currentStudent.tinggiBadan || undefined,
      beratBadan: currentStudent.beratBadan || undefined,
      prestasi: currentStudent.prestasi || undefined,
      hobi: currentStudent.hobi || undefined,
      catatanPenting: currentStudent.catatanPenting || undefined,
      rt: currentStudent.rt || undefined,
      rw: currentStudent.rw || undefined,
      kelurahan: currentStudent.kelurahan || undefined,
      kecamatan: currentStudent.kecamatan || undefined,
      kota: currentStudent.kota || undefined,
      provinsi: currentStudent.provinsi || undefined,
      kodePos: currentStudent.kodePos || undefined,
      jenisTinggal: currentStudent.jenisTinggal || undefined,
      alatTransportasi: currentStudent.alatTransportasi || undefined,
      noHp: currentStudent.noHp || undefined,
      email: currentStudent.email || undefined,
      sekolahAsal: currentStudent.sekolahAsal || undefined,
      skhun: currentStudent.skhun || undefined,
      penerimaKps: currentStudent.penerimaKps || (currentStudent.isKps ? 'Ya' : 'Tidak'),
      isKps: Boolean(currentStudent.isKps || currentStudent.penerimaKps === 'Ya' || (typeof currentStudent.penerimaKps === 'string' && currentStudent.penerimaKps.toLowerCase().includes('ya'))),
      noKps: currentStudent.noKps || undefined,
      isPip: currentStudent.isPip || undefined,
      isKip: currentStudent.isKip || undefined,
      noKip: currentStudent.noKip || undefined,
      ijazahNo: currentStudent.ijazahNo || undefined,
      noKk: currentStudent.noKk || undefined,

      // Data Ayah
      namaAyah: currentStudent.namaAyah || undefined,
      nikAyah: currentStudent.nikAyah || undefined,
      tempatLahirAyah: currentStudent.tempatLahirAyah || undefined,
      tanggalLahirAyah: currentStudent.tanggalLahirAyah || undefined,
      pendidikanAyah: currentStudent.pendidikanAyah || undefined,
      pekerjaanAyah: currentStudent.pekerjaanAyah || undefined,
      penghasilanAyah: currentStudent.penghasilanAyah || undefined,
      tlpAyah: currentStudent.tlpAyah || undefined,
      statusAyah,

      // Data Ibu
      namaIbu: currentStudent.namaIbu || undefined,
      nikIbu: currentStudent.nikIbu || undefined,
      tempatLahirIbu: currentStudent.tempatLahirIbu || undefined,
      tanggalLahirIbu: currentStudent.tanggalLahirIbu || undefined,
      pendidikanIbu: currentStudent.pendidikanIbu || undefined,
      pekerjaanIbu: currentStudent.pekerjaanIbu || undefined,
      penghasilanIbu: currentStudent.penghasilanIbu || undefined,
      tlpIbu: currentStudent.tlpIbu || undefined,
      statusIbu,

      // Status Yatim / Piatu
      statusYatim,

      // Data Wali
      namaWali: currentStudent.namaWali || undefined,
      tempatLahirWali: currentStudent.tempatLahirWali || undefined,
      tglLahirWali: currentStudent.tglLahirWali || undefined,
      pendidikanWali: currentStudent.pendidikanWali || undefined,
      pekerjaanWali: currentStudent.pekerjaanWali || undefined,
      penghasilanWali: currentStudent.penghasilanWali || undefined,
      hubunganWali: currentStudent.hubunganWali || undefined,
      tlpWali: currentStudent.tlpWali || undefined,

      // Berkas Digital
      aktaKelahiranUrl: currentStudent.aktaKelahiranUrl || currentStudent.akteUrl || undefined,
      kartuKeluargaUrl: currentStudent.kartuKeluargaUrl || currentStudent.kkUrl || undefined,
      kiaUrl: currentStudent.kiaUrl || undefined,
      ktpAyahUrl: currentStudent.ktpAyahUrl || undefined,
      ktpIbuUrl: currentStudent.ktpIbuUrl || undefined,
      ktpWaliUrl: currentStudent.ktpWaliUrl || undefined,
      ijazahUrl: currentStudent.ijazahUrl || undefined,
      raporUrl: currentStudent.raporUrl || currentStudent.rapotUrl || undefined,
      suratPindahUrl: currentStudent.suratPindahUrl || undefined,
      suKetUrl: currentStudent.suKetUrl || currentStudent.dokumenLainUrl || undefined,
      suratDomisiliUrl: currentStudent.suratDomisiliUrl || undefined,
      formPendaftaranUrl: currentStudent.formPendaftaranUrl || currentStudent.formUrl || undefined,
      suratPernyataanUrl: currentStudent.suratPernyataanUrl || currentStudent.sPernyataanUrl || undefined,
      suratKesanggupanUrl: currentStudent.suratKesanggupanUrl || currentStudent.sKesanggupanUrl || undefined,
      berkasLainnyaUrl: currentStudent.berkasLainnyaUrl || undefined,
      fotoUrl: currentStudent.fotoUrl || undefined,
      createdAt: currentStudent.createdAt || now,
      updatedAt: now,
    };
    
    const isEditMode = Boolean(
      (currentStudent as any)._originalId ||
      (currentStudent.id && students.some(s => s.id === currentStudent.id || s.nis === currentStudent.id || (s as any).nopdkt === currentStudent.id)) ||
      (currentStudent.nis && students.some(s => s.nis === currentStudent.nis || (s as any).nopdkt === currentStudent.nis))
    );

    if (isEditMode && targetOriginalId) {
      updateStudent(targetOriginalId, sanitizedStudent);
    } else {
      addStudent(sanitizedStudent);
    }

    // Perbarui viewingStudent jika aktif agar langsung terlihat perubahannya
    if (viewingStudent && (viewingStudent.id === targetOriginalId || viewingStudent.nis === sanitizedStudent.nis)) {
      setViewingStudent(sanitizedStudent);
    }

    const updatedList = useStore.getState().students;
    setIsModalOpen(false);
    
    const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
    if (scriptEndpoint) {
      setSaveSuccessMsg(`Menyimpan "${studentName}" ke Google Sheets...`);
      try {
        await triggerSync(updatedList);
        setSaveSuccessMsg(`✅ Data siswa "${studentName}" berhasil disimpan ke Google Sheets (Sheet SISWA & DAPODIK_VALIDASI)!`);
      } catch (err: any) {
        setSaveSuccessMsg(`⚠️ Data tersimpan di aplikasi, namun gagal sinkron ke Spreadsheet: ${err?.message || 'Periksa koneksi Script'}`);
      }
    } else {
      setSaveSuccessMsg(`✅ Data siswa "${studentName}" berhasil disimpan di aplikasi.`);
    }
    setTimeout(() => setSaveSuccessMsg(''), 5000);
  };

  const handleDelete = (id: string, name: string, studentClass?: string, nis?: string) => {
    setStudentToDelete({
      id,
      name,
      class: studentClass,
      nis
    });
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    const { id, name, nis } = studentToDelete;
    setIsDeletingStudent(true);

    try {
      // 1. Delete from Zustand store and update local DB
      deleteStudent(id);
      const cleanId = String(id || '').trim();
      const cleanNis = String(nis || '').trim();
      
      const remaining = useStore.getState().students.filter(s => {
        const sId = String(s.id || '').trim();
        const sNis = String(s.nis || (s as any).nopdkt || '').trim();
        return sId !== cleanId && sNis !== cleanId && (cleanNis ? (sId !== cleanNis && sNis !== cleanNis) : true);
      });
      db.set('students', remaining);

      // 2. Refresh local DAPODIK_VALIDASI table
      const standardDapodikRows = generateDapodikValidasiRows(remaining, settings.academicYear || '2026/2027');
      db.set('dapodik_validations', standardDapodikRows);

      // 3. Sync to Google Spreadsheet if configured
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
      if (scriptEndpoint) {
        setSaveSuccessMsg(`Menghapus "${name}" dari seluruh sheet Google Sheets...`);
        try {
          await triggerSync(remaining);
          setSaveSuccessMsg(`✅ Data siswa "${name}" berhasil dihapus dari sistem & seluruh sheet Google Sheets (SISWA, ORANG_TUA, YATIM_PIATU, DAPODIK_VALIDASI)!`);
        } catch (e: any) {
          console.warn("GAS delete sync notice:", e);
          setSaveSuccessMsg(`⚠️ Data siswa "${name}" telah dihapus di aplikasi, namun sinkronisasi Google Sheets tertunda: ${e?.message || ''}`);
        }
      } else {
        setSaveSuccessMsg(`✅ Data siswa "${name}" berhasil dihapus dari database aplikasi.`);
      }
    } catch (err: any) {
      console.error("Error deleting student:", err);
      setSaveSuccessMsg(`⚠️ Terjadi kesalahan saat menghapus data: ${err?.message || ''}`);
    } finally {
      setIsDeletingStudent(false);
      setStudentToDelete(null);
      setTimeout(() => setSaveSuccessMsg(''), 6000);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      useStore.getState().setStudents([]);
      db.set('students', []);
      db.set('dapodik_validations', []);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('erp_students');
        localStorage.removeItem('erp_dapodik_validations');
      }
      
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
      if (scriptEndpoint) {
        try {
          await triggerSync([]);
          setSaveSuccessMsg('✅ Seluruh data siswa beserta sheet terkait (SISWA, ORANG_TUA, YATIM_PIATU, DAPODIK_VALIDASI) berhasil dikosongkan.');
        } catch (e: any) {
          setSaveSuccessMsg('✅ Semua data siswa di aplikasi berhasil dikosongkan.');
        }
      } else {
        setSaveSuccessMsg('✅ Semua data siswa & dapodik berhasil dikosongkan (0 Data).');
      }
    } catch (err: any) {
      setSaveSuccessMsg(`⚠️ Gagal mengosongkan data: ${err?.message || ''}`);
    } finally {
      setIsClearingAll(false);
      setShowClearAllModal(false);
      setSelectedStudentIds([]);
      setTimeout(() => setSaveSuccessMsg(''), 6000);
    }
  };

  // Multi-Select helpers
  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllCurrentPageSelected = paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.includes(s.id));
  const isSomeCurrentPageSelected = paginatedStudents.some(s => selectedStudentIds.includes(s.id));

  const handleToggleSelectAllPage = () => {
    const pageIds = paginatedStudents.map(s => s.id);
    if (isAllCurrentPageSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredStudents.map(s => s.id);
    setSelectedStudentIds(allFilteredIds);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsBulkDeleting(true);
    const deleteCount = selectedStudentIds.length;
    try {
      const selectedSet = new Set(selectedStudentIds.map(id => String(id || '').trim()));
      const remaining = useStore.getState().students.filter(s => {
        const sId = String(s.id || '').trim();
        const sNis = String(s.nis || (s as any).nopdkt || '').trim();
        return !selectedSet.has(sId) && !selectedSet.has(sNis);
      });

      // 1. Update store & db
      useStore.getState().setStudents(remaining);
      db.set('students', remaining);

      // 2. Refresh local DAPODIK_VALIDASI table
      const standardDapodikRows = generateDapodikValidasiRows(remaining, settings.academicYear || '2026/2027');
      db.set('dapodik_validations', standardDapodikRows);

      // 3. Sync to Google Spreadsheet if configured
      const scriptEndpoint = settings.scriptUrl || settings.gasUrl;
      if (scriptEndpoint) {
        setSaveSuccessMsg(`Menghapus ${deleteCount} siswa terpilih dari seluruh sheet Google Sheets...`);
        try {
          await triggerSync(remaining);
          setSaveSuccessMsg(`✅ ${deleteCount} data siswa terpilih berhasil dihapus dari sistem & seluruh sheet Google Sheets (SISWA, ORANG_TUA, YATIM_PIATU, DAPODIK_VALIDASI)!`);
        } catch (e: any) {
          console.warn("GAS bulk delete sync notice:", e);
          setSaveSuccessMsg(`⚠️ ${deleteCount} data siswa telah dihapus di aplikasi, namun sinkronisasi Google Sheets tertunda: ${e?.message || ''}`);
        }
      } else {
        setSaveSuccessMsg(`✅ ${deleteCount} data siswa terpilih berhasil dihapus dari database aplikasi.`);
      }
    } catch (err: any) {
      console.error("Error bulk deleting students:", err);
      setSaveSuccessMsg(`⚠️ Terjadi kesalahan saat menghapus siswa terpilih: ${err?.message || ''}`);
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteModal(false);
      setSelectedStudentIds([]);
      setTimeout(() => setSaveSuccessMsg(''), 6000);
    }
  };

  return (
    <div className="space-y-6">
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Top Header & Action Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-white/80 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-indigo-950 flex items-center gap-2.5 tracking-tight">
            <Users className="text-indigo-600" size={26} />
            Data Siswa & Dapodik
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Menampilkan <strong className="text-indigo-600 font-bold">{filteredStudents.length}</strong> dari total <strong className="text-slate-800 font-bold">{students.length}</strong> siswa terdaftar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          {selectedStudentIds.length > 0 && (
            <button 
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-200 transition active:scale-95 cursor-pointer animate-in fade-in"
              title={`Hapus ${selectedStudentIds.length} siswa yang dicentang`}
            >
              <Trash2 size={15} />
              <span>Hapus {selectedStudentIds.length} Terpilih</span>
            </button>
          )}

          {students.length > 0 && (
            <button 
              onClick={() => setShowClearAllModal(true)}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Hapus semua data siswa dummy/lama dari memori browser"
            >
              <Trash2 size={15} />
              <span>Kosongkan Semua Siswa (0 Data)</span>
            </button>
          )}

          {/* Tambah Siswa Baru */}
          <button 
            onClick={() => handleOpenModal()} 
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-200 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> 
            <span>Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Status Peserta Didik (✅ Aktif, ❌ Tidak Aktif, ⏳ Belum, 🚚 Pindah, 🎓 Lulus, 🚪 Keluar) */}
      <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
            Status Peserta Didik
          </span>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
              filterStatus === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            Semua ({statusCounts.all})
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* ✅ Aktif */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'Aktif' ? 'ALL' : 'Aktif')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              filterStatus === 'Aktif'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                : 'bg-emerald-50/70 border-emerald-200/70 text-emerald-900 hover:bg-emerald-100/70'
            }`}
            title="Siswa Aktif Reguler"
          >
            <div className="flex items-center gap-1.5">
              <span>✅</span>
              <div>
                <div className="text-xs font-bold leading-tight">Aktif</div>
                <div className={`text-[10px] ${filterStatus === 'Aktif' ? 'text-emerald-100' : 'text-emerald-700'}`}></div>
              </div>
            </div>
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
              filterStatus === 'Aktif' ? 'bg-white/20 text-white' : 'bg-emerald-200/60 text-emerald-900'
            }`}>
              {statusCounts.aktif}
            </span>
          </button>

          {/* ⚠️ Tidak Aktif */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'Tidak Aktif' ? 'ALL' : 'Tidak Aktif')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              filterStatus === 'Tidak Aktif'
                ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                : 'bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100/70'
            }`}
            title="Siswa Terdaftar - Perhatian: Jarang Masuk Kelas"
          >
            <div className="flex items-center gap-1.5">
              <span>⚠️</span>
              <div>
                <div className="text-xs font-bold leading-tight">Tidak Aktif</div>
                <div className={`text-[10px] ${filterStatus === 'Tidak Aktif' ? 'text-amber-100' : 'text-amber-700'}`}>Jarang Masuk</div>
              </div>
            </div>
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
              filterStatus === 'Tidak Aktif' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
            }`}>
              {statusCounts.tidakAktif}
            </span>
          </button>

          {/* ⏳ Belum */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'Belum' ? 'ALL' : 'Belum')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              filterStatus === 'Belum'
                ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                : 'bg-sky-50/70 border-sky-200/70 text-sky-900 hover:bg-sky-100/70'
            }`}
            title="Siswa Aktif - Belum Masuk Dapodik Kemdikbud"
          >
            <div className="flex items-center gap-1.5">
              <span>⏳</span>
              <div>
                <div className="text-xs font-bold leading-tight">Belum</div>
                <div className={`text-[10px] ${filterStatus === 'Belum' ? 'text-sky-100' : 'text-sky-700'}`}>Non-Dapodik</div>
              </div>
            </div>
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
              filterStatus === 'Belum' ? 'bg-white/20 text-white' : 'bg-sky-200/60 text-sky-900'
            }`}>
              {statusCounts.belum}
            </span>
          </button>

          {/* 🚚 Pindah */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'Pindah' ? 'ALL' : 'Pindah')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              filterStatus === 'Pindah'
                ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                : 'bg-blue-50/70 border-blue-200/70 text-blue-900 hover:bg-blue-100/70'
            }`}
            title="Siswa Mutasi / Pindah Sekolah"
          >
            <div className="flex items-center gap-1.5">
              <span>🚚</span>
              <div>
                <div className="text-xs font-bold leading-tight">Pindah</div>
                <div className={`text-[10px] ${filterStatus === 'Pindah' ? 'text-blue-100' : 'text-blue-700'}`}>Mutasi</div>
              </div>
            </div>
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
              filterStatus === 'Pindah' ? 'bg-white/20 text-white' : 'bg-blue-200/60 text-blue-900'
            }`}>
              {statusCounts.pindah}
            </span>
          </button>

          {/* 🎓 Lulus */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'Lulus' ? 'ALL' : 'Lulus')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              filterStatus === 'Lulus'
                ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                : 'bg-purple-50/70 border-purple-200/70 text-purple-900 hover:bg-purple-100/70'
            }`}
            title="Siswa Telah Lulus / Alumni"
          >
            <div className="flex items-center gap-1.5">
              <span>🎓</span>
              <div>
                <div className="text-xs font-bold leading-tight">Lulus</div>
                <div className={`text-[10px] ${filterStatus === 'Lulus' ? 'text-purple-100' : 'text-purple-700'}`}>Alumni</div>
              </div>
            </div>
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
              filterStatus === 'Lulus' ? 'bg-white/20 text-white' : 'bg-purple-200/60 text-purple-900'
            }`}>
              {statusCounts.lulus}
            </span>
          </button>

          {/* 🚪 Keluar */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'Keluar' ? 'ALL' : 'Keluar')}
            className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
              filterStatus === 'Keluar'
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                : 'bg-rose-50/70 border-rose-200/70 text-rose-900 hover:bg-rose-100/70'
            }`}
            title="Siswa Keluar / Mengundurkan Diri"
          >
            <div className="flex items-center gap-1.5">
              <span>🚪</span>
              <div>
                <div className="text-xs font-bold leading-tight">Keluar</div>
                <div className={`text-[10px] ${filterStatus === 'Keluar' ? 'text-rose-100' : 'text-rose-700'}`}>DO / Drop</div>
              </div>
            </div>
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-full ${
              filterStatus === 'Keluar' ? 'bg-white/20 text-white' : 'bg-rose-200/60 text-rose-900'
            }`}>
              {statusCounts.keluar}
            </span>
          </button>
        </div>
      </div>

      {/* Filter, Search & View Mode Switcher */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama siswa, NISN, atau NIK..." 
            className="w-full bg-white/80 backdrop-blur-md border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs sm:text-sm pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('ringkas')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
                viewMode === 'ringkas'
                  ? "bg-white text-indigo-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>📋 Tabel Ringkas</span>
            </button>
            <button
              onClick={() => setViewMode('master71')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
                viewMode === 'master71'
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>📑 Grid 71 Kolom Sheet</span>
            </button>
          </div>

          {/* Filter Kelas */}
          <div className="w-48">
            <CustomDropdown
              id="students-filter-class"
              value={filterClass}
              onChange={(val) => setFilterClass(val)}
              options={[
                { value: '', label: `Semua Kelas (${getActiveClasses(students).length} Aktif)` },
                ...getAllClasses(students).map(c => ({
                  value: c,
                  label: formatClassLabel(c, true)
                }))
              ]}
              placeholder="Pilih Kelas..."
              searchable
            />
          </div>

          {/* Filter Tahun Masuk */}
          <div className="w-52">
            <CustomDropdown
              id="students-filter-tahun-masuk"
              value={filterTahunMasuk}
              onChange={(val) => setFilterTahunMasuk(val)}
              options={[
                { value: 'ALL', label: '📅 Semua Tahun Masuk' },
                ...availableTahunMasuk.map(yr => ({
                  value: yr,
                  label: `Tahun ${yr} ${tahunMasukCounts[yr] ? `(${tahunMasukCounts[yr]})` : ''}`
                }))
              ]}
              placeholder="Tahun Masuk"
            />
          </div>

          {/* Filter Yatim / Piatu */}
          <div className="w-52">
            <CustomDropdown
              id="students-filter-yatim"
              value={filterYatim}
              onChange={(val) => setFilterYatim(val)}
              options={[
                { value: 'ALL', label: '🤍 Semua Kondisi Ortu' },
                { value: 'Yatim Piatu', label: '🖤 Yatim Piatu (Ortu Wafat)' },
                { value: 'Yatim', label: '🤍 Yatim (Ayah Wafat)' },
                { value: 'Piatu', label: '💜 Piatu (Ibu Wafat)' },
                { value: 'Lengkap', label: '🌿 Ortu Lengkap' },
                { value: 'KPS', label: '🎯 Penerima KPS / PIP' }
              ]}
              placeholder="Kondisi Ortu"
            />
          </div>

          {/* Sort By */}
          <div className="w-44">
            <CustomDropdown
              id="students-filter-sort"
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'default', label: 'Urutkan: Default' },
                { value: 'name-asc', label: 'Nama (A - Z)' },
                { value: 'name-desc', label: 'Nama (Z - A)' },
                { value: 'class-asc', label: 'Kelas (1 - 6)' },
                { value: 'class-desc', label: 'Kelas (6 - 1)' }
              ]}
              placeholder="Urutkan..."
            />
          </div>
        </div>
      </div>

      {/* Active Filter Indicators */}
      {(filterTahunMasuk !== 'ALL' || filterYatim !== 'ALL' || filterClass || filterStatus !== 'ALL' || searchTerm) && (
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
          <span className="text-slate-500 font-bold text-[11px]">Filter Aktif:</span>
          {filterYatim !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg font-bold text-xs">
              <span>🤍 Status: {filterYatim}</span>
              <button 
                onClick={() => setFilterYatim('ALL')} 
                className="hover:text-purple-950 p-0.5 rounded"
                title="Hapus Filter Status Yatim"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filterTahunMasuk !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg font-bold text-xs">
              <span>📅 Tahun Masuk: {filterTahunMasuk}</span>
              <button 
                onClick={() => setFilterTahunMasuk('ALL')} 
                className="hover:text-indigo-950 p-0.5 rounded"
                title="Hapus Filter Tahun Masuk"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filterClass && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-bold text-xs">
              <span>🏫 Kelas {filterClass}</span>
              <button 
                onClick={() => setFilterClass('')} 
                className="hover:text-blue-950 p-0.5 rounded"
                title="Hapus Filter Kelas"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filterStatus !== 'ALL' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold text-xs">
              <span>Status: {filterStatus}</span>
              <button 
                onClick={() => setFilterStatus('ALL')} 
                className="hover:text-amber-950 p-0.5 rounded"
                title="Hapus Filter Status"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg font-bold text-xs">
              <span>Cari: "{searchTerm}"</span>
              <button 
                onClick={() => setSearchTerm('')} 
                className="hover:text-slate-950 p-0.5 rounded"
                title="Hapus Pencarian"
              >
                <X size={12} />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setFilterTahunMasuk('ALL');
              setFilterClass('');
              setFilterStatus('ALL');
              setSearchTerm('');
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold underline ml-1"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* List Table (Ringkas vs Master 71 Kolom) */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        {viewMode === 'master71' ? (
          /* TABEL MASTER 71 KOLOM PERSIS GOOGLE SPREADSHEET */
          <div className="overflow-x-auto max-h-[68vh] relative">
            <div className="bg-indigo-950 text-white px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-30">
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={14} className="text-emerald-400" />
                TAMPILAN MASTER SPREADSHEET (71 KOLOM HEADER ASLI: nopdkt ... KelasSaatini)
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">
                Geser horizontal ↔ untuk melihat semua 71 kolom data
              </span>
            </div>
            <table className="text-xs text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px] sticky top-8 z-20 shadow-xs">
                  <th className="px-3 py-3 w-10 text-center sticky left-0 bg-slate-900 z-30 border-r border-slate-700" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      aria-label="Pilih Semua Siswa di Halaman Ini"
                      checked={isAllCurrentPageSelected}
                      ref={input => {
                        if (input) {
                          input.indeterminate = !isAllCurrentPageSelected && isSomeCurrentPageSelected;
                        }
                      }}
                      onChange={handleToggleSelectAllPage}
                      className="w-4 h-4 text-indigo-500 rounded border-slate-700 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                    />
                  </th>
                  <th className="px-3 py-3 w-12 text-center sticky left-10 bg-slate-900 z-30 border-r border-slate-700">
                    No
                  </th>
                  {MASTER_SISWA_COLUMNS.map((colName, cIdx) => (
                    <th 
                      key={colName} 
                      className={`px-3 py-3 border-r border-slate-700 font-mono tracking-tight ${
                        cIdx < 4 ? 'text-amber-300 font-bold' : 
                        cIdx >= 60 ? 'text-cyan-300 font-semibold' : 'text-slate-100'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 font-mono">Col {cIdx + 1}</span>
                        <span>{colName}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center sticky right-0 bg-slate-900 z-30 border-l border-slate-700">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={MASTER_SISWA_COLUMNS.length + 3} className="px-6 py-12 text-center text-slate-400 font-medium">
                      <Users size={36} className="mx-auto mb-2 opacity-30 text-indigo-900" />
                      Tidak ada data siswa yang cocok dengan filter / pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, idx) => {
                    const globalIdx = (safePage - 1) * itemsPerPage + idx + 1;
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <tr 
                        key={student.id}
                        onClick={() => setViewingStudent(student)}
                        className={`transition-colors cursor-pointer group font-mono text-[11px] ${
                          isSelected ? 'bg-indigo-100/70 hover:bg-indigo-100' : 'hover:bg-indigo-50/60'
                        }`}
                      >
                        <td className={`px-3 py-2.5 text-center sticky left-0 z-10 border-r border-slate-200 ${isSelected ? 'bg-indigo-100' : 'bg-white group-hover:bg-indigo-50/90'}`} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            aria-label={`Pilih ${student.name}`}
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(student.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          />
                        </td>
                        <td className={`px-3 py-2.5 text-center text-slate-500 font-bold sticky left-10 z-10 border-r border-slate-200 ${isSelected ? 'bg-indigo-100 text-indigo-900' : 'bg-white group-hover:bg-indigo-50/90'}`}>
                          {globalIdx}
                        </td>
                        {MASTER_SISWA_COLUMNS.map((colName) => {
                          let cellVal: any = '-';
                          if (colName === "nopdkt") cellVal = student.nis || student.id;
                          else if (colName === "TahunMasuk") cellVal = student.tahunMasuk || '-';
                          else if (colName === "NISN") cellVal = student.nisn || '-';
                          else if (colName === "NamaLengkap") cellVal = student.name || '-';
                          else if (colName === "JenisKelamin") cellVal = student.gender || '-';
                          else if (colName === "Tempat Lahir") cellVal = student.pob || '-';
                          else if (colName === "TanggalLahir") cellVal = student.dob || '-';
                          else if (colName === "NIK") cellVal = student.nik || '-';
                          else if (colName === "Anak ke") cellVal = student.anakKe || '-';
                          else if (colName === "Saudara") cellVal = student.saudara || '-';
                          else if (colName === "Agama") cellVal = student.agama || '-';
                          else if (colName === "Golongan Darah") cellVal = student.golonganDarah || '-';
                          else if (colName === "TinggiBadan(cm)") cellVal = student.tinggiBadan || '-';
                          else if (colName === "BeratBadan(kg)") cellVal = student.beratBadan || '-';
                          else if (colName === "Prestasi") cellVal = student.prestasi || '-';
                          else if (colName === "Hobi") cellVal = student.hobi || '-';
                          else if (colName === "Catatan Penting") cellVal = student.catatanPenting || '-';
                          else if (colName === "Alamat") cellVal = student.address || '-';
                          else if (colName === "RT") cellVal = student.rt || '-';
                          else if (colName === "RW") cellVal = student.rw || '-';
                          else if (colName === "Kelurahan") cellVal = student.kelurahan || '-';
                          else if (colName === "Kecamatan") cellVal = student.kecamatan || '-';
                          else if (colName === "Kota") cellVal = student.kota || '-';
                          else if (colName === "Provinsi") cellVal = student.provinsi || '-';
                          else if (colName === "KodePos") cellVal = student.kodePos || '-';
                          else if (colName === "JenisTinggal") cellVal = student.jenisTinggal || '-';
                          else if (colName === "AlatTransportasi") cellVal = student.alatTransportasi || '-';
                          else if (colName === "NomorHP") cellVal = student.noHp || '-';
                          else if (colName === "E-Mail") cellVal = student.email || '-';
                          else if (colName === "AsalSekolah") cellVal = student.sekolahAsal || '-';
                          else if (colName === "SKHUN") cellVal = student.skhun || '-';
                          else if (colName === "PenerimaKPS") cellVal = student.penerimaKps || '-';
                          else if (colName === "PasFoto") cellVal = student.fotoUrl || (student as any).pasFoto || '-';
                          else if (colName === "NomorKartuKeluarga") cellVal = student.noKk || '-';
                          else if (colName === "NamaAyah") cellVal = student.namaAyah || student.parentName || '-';
                          else if (colName === "NIKAyah") cellVal = student.nikAyah || '-';
                          else if (colName === "TempatLahirAyah") cellVal = student.tempatLahirAyah || '-';
                          else if (colName === "TanggalLahirAyah") cellVal = student.tanggalLahirAyah || '-';
                          else if (colName === "PendidikanAyah") cellVal = student.pendidikanAyah || '-';
                          else if (colName === "PekerjaanAyah") cellVal = student.pekerjaanAyah || '-';
                          else if (colName === "PenghasilanAyah") cellVal = student.penghasilanAyah || '-';
                          else if (colName === "TlpAyah") cellVal = student.tlpAyah || '-';
                          else if (colName === "StatusAyah") cellVal = student.statusAyah || 'Masih Hidup';
                          else if (colName === "NamaIbu") cellVal = student.namaIbu || '-';
                          else if (colName === "NIKIbu") cellVal = student.nikIbu || '-';
                          else if (colName === "TempatLahirIbu") cellVal = student.tempatLahirIbu || '-';
                          else if (colName === "TanggalLahirIbu") cellVal = student.tanggalLahirIbu || '-';
                          else if (colName === "PendidikanIbu") cellVal = student.pendidikanIbu || '-';
                          else if (colName === "PekerjaanIbu") cellVal = student.pekerjaanIbu || '-';
                          else if (colName === "PenghasilanIbu") cellVal = student.penghasilanIbu || '-';
                          else if (colName === "TlpIbu") cellVal = student.tlpIbu || '-';
                          else if (colName === "StatusIbu") cellVal = student.statusIbu || 'Masih Hidup';
                          else if (colName === "StatusYatim") cellVal = student.statusYatim || '-';
                          else if (colName === "NamaWali") cellVal = student.namaWali || '-';
                          else if (colName === "TempatLahirWali") cellVal = student.tempatLahirWali || '-';
                          else if (colName === "TglLahirWali") cellVal = student.tglLahirWali || '-';
                          else if (colName === "PendidikanWali") cellVal = student.pendidikanWali || '-';
                          else if (colName === "PekerjaanWali") cellVal = student.pekerjaanWali || '-';
                          else if (colName === "PenghasilanWali") cellVal = student.penghasilanWali || '-';
                          else if (colName === "Hubungan") cellVal = student.hubunganWali || '-';
                          else if (colName === "Tlp.Wali") cellVal = student.tlpWali || '-';
                          else if (colName === "AktaKelahiran") cellVal = student.aktaKelahiranUrl || student.akteUrl || '-';
                          else if (colName === "KartuKeluarga") cellVal = student.kartuKeluargaUrl || student.kkUrl || '-';
                          else if (colName === "KIA") cellVal = student.kiaUrl || '-';
                          else if (colName === "KTPAyah") cellVal = student.ktpAyahUrl || '-';
                          else if (colName === "KTPIbu") cellVal = student.ktpIbuUrl || '-';
                          else if (colName === "Ijazah") cellVal = student.ijazahUrl || '-';
                          else if (colName === "KTPWali") cellVal = student.ktpWaliUrl || '-';
                          else if (colName === "Rapor") cellVal = student.raporUrl || student.rapotUrl || '-';
                          else if (colName === "S.Pindah") cellVal = student.suratPindahUrl || '-';
                          else if (colName === "SuKet") cellVal = student.suKetUrl || student.dokumenLainUrl || '-';
                          else if (colName === "S.Domisili") cellVal = student.suratDomisiliUrl || '-';
                          else if (colName === "FormPendaftaran") cellVal = student.formPendaftaranUrl || student.formUrl || (student as any).FormPendaftaran || '-';
                          else if (colName === "SPernyataan") cellVal = student.suratPernyataanUrl || student.sPernyataanUrl || (student as any).SPernyataan || '-';
                          else if (colName === "SKesanggupan") cellVal = student.suratKesanggupanUrl || student.sKesanggupanUrl || (student as any).SKesanggupan || '-';
                          else if (colName === "BerkasLainnya") cellVal = student.berkasLainnyaUrl || (student as any).BerkasLainnya || (student as any).dokumenLainUrl || '-';
                          else if (colName === "Status") cellVal = student.status || 'Aktif';
                          else if (colName === "KelasSaatini") cellVal = student.class || '-';
                          else cellVal = (student as any)[colName] || '-';

                          const isUrl = typeof cellVal === 'string' && (cellVal.startsWith('http://') || cellVal.startsWith('https://'));

                          return (
                            <td key={colName} className="px-3 py-2.5 border-r border-slate-200 max-w-[200px] truncate">
                              {isUrl ? (
                                <a 
                                  href={cellVal} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={e => e.stopPropagation()} 
                                  className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
                                >
                                  <ExternalLink size={11} /> Buka Link
                                </a>
                              ) : (
                                <span>{String(cellVal)}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 text-center sticky right-0 bg-white group-hover:bg-indigo-50/90 z-10 border-l border-slate-200" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => setViewingStudent(student)} 
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition"
                              title="Lihat Detail Profil Siswa"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => handleOpenModal(student)} 
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition"
                              title="Edit Data Siswa"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(student.id, student.name, student.class, student.nis);
                              }} 
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition"
                              title="Hapus Data Siswa"
                            >
                              <Trash2 size={14} />
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
        ) : (
          /* TABEL RINGKAS */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-indigo-50/70 text-indigo-950 uppercase font-black tracking-wider text-[10px] border-b border-indigo-100">
                  <th className="px-3 py-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      aria-label="Pilih Semua Siswa di Halaman Ini"
                      checked={isAllCurrentPageSelected}
                      ref={input => {
                        if (input) {
                          input.indeterminate = !isAllCurrentPageSelected && isSomeCurrentPageSelected;
                        }
                      }}
                      onChange={handleToggleSelectAllPage}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                  </th>
                  <th className="px-3 py-3.5 w-12 text-center">No</th>
                  <th className="px-4 py-3.5">PDKT</th>
                  <th className="px-4 py-3.5">Nama Siswa</th>
                  <th className="px-3 py-3.5 text-center">Kelas</th>
                  <th className="px-3 py-3.5 text-center">L/P</th>
                  <th className="px-4 py-3.5">Tempat & Tgl Lahir</th>
                  <th className="px-4 py-3.5">Kontak Siswa</th>
                  <th className="px-3 py-3.5 text-center">Berkas</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-slate-400 font-medium">
                      <Users size={36} className="mx-auto mb-2 opacity-30 text-indigo-900" />
                      Tidak ada data siswa yang cocok dengan filter / pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, idx) => {
                    const globalIdx = (safePage - 1) * itemsPerPage + idx + 1;
                    const docEval = getStudentCompleteness(student);
                    const uploadedDocsCount = docEval.uploadedCount;
                    const isDocsComplete = docEval.isComplete;
                    const isSelected = selectedStudentIds.includes(student.id);
                    
                    return (
                      <tr 
                        key={student.id}
                        onClick={() => setViewingStudent(student)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected ? 'bg-indigo-50/80 hover:bg-indigo-100/60' : 'hover:bg-indigo-50/40'
                        }`}
                      >
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            aria-label={`Pilih ${student.name}`}
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(student.id)}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          />
                        </td>
                        <td className={`px-3 py-3 text-center font-mono font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-400'}`}>
                          {globalIdx}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <div className="font-bold text-slate-800">{student.nis}</div>
                          {student.NISN && <div className="text-[10px] text-slate-500">NISN: {student.NISN}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black overflow-hidden shrink-0 border border-indigo-200 relative">
                              <span className="text-xs font-bold">{student.name ? student.name[0].toUpperCase() : 'S'}</span>
                              {student.fotoUrl && (
                                <img 
                                  src={getGoogleDriveDirectImageUrl(student.fotoUrl)} 
                                  alt={student.name} 
                                  className="absolute inset-0 w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                  {student.name}
                                </span>
                                {(() => {
                                  const yStatus = getStudentStatusYatim(student);
                                  const info = getYatimStatusInfo(yStatus);
                                  if (yStatus === 'Lengkap') return null;
                                  return (
                                    <span 
                                      className={cn("px-1.5 py-0.5 rounded text-[9px] font-black inline-flex items-center gap-0.5 shadow-2xs", info.badgeColor)}
                                      title={info.description}
                                    >
                                      <span>{info.icon}</span>
                                      <span>{info.label}</span>
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold text-[11px]">
                            {student.class}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-700">
                          {student.gender}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800 block">{student.pob || '-'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{formatDate(student.dob)}</span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {(student.noHp || student.tlpAyah || student.tlpIbu || student.telepon || (student as any).kontak) ? (
                            <a 
                              href={`https://wa.me/${String(student.noHp || student.tlpAyah || student.tlpIbu || student.telepon || (student as any).kontak).replace(/[^0-9]/g, '').replace(/^0/, '62')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-mono font-bold border border-emerald-200 transition"
                              title="Chat WhatsApp Siswa"
                            >
                              <Phone size={12} className="text-emerald-600 shrink-0" />
                              <span>{String(student.noHp || student.tlpAyah || student.tlpIbu || student.telepon || (student as any).kontak)}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center" title={docEval.missingRequiredDocs.length > 0 ? `Berkas wajib belum lengkap: ${docEval.missingRequiredDocs.map(d => d.label).join(', ')}` : 'Semua berkas wajib terpenuhi'}>
                          {uploadedDocsCount === 0 ? (
                            <span className="text-[10px] text-slate-400 font-medium">0/{docEval.totalPossible}</span>
                          ) : isDocsComplete ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 size={10} className="text-emerald-600" /> Lengkap ({uploadedDocsCount}/{docEval.totalPossible})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <AlertCircle size={10} className="text-amber-600" /> {uploadedDocsCount}/{docEval.totalPossible} ({docEval.requiredUploaded}/{docEval.requiredTotal} Wajib)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            const rawStatus = String(student.status || '').trim();
                            const sUpper = (rawStatus || 'AKTIF').toUpperCase();
                            const isTidakAktif = sUpper.includes('TIDAK') || sUpper.includes('NONAKTIF');
                            const isBelum = sUpper.includes('BELUM') || sUpper.includes('PENDING');
                            const isPindah = sUpper.includes('PINDAH') || sUpper.includes('MUTASI');
                            const isLulus = sUpper.includes('LULUS');
                            const isKeluar = sUpper.includes('KELUAR') || sUpper.includes('DO') || sUpper.includes('DROPOUT');
                            const isAktif = !isTidakAktif && !isBelum && !isPindah && !isLulus && !isKeluar;

                            if (isTidakAktif) {
                              return (
                                <span 
                                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                                  title="Siswa Terdaftar - Perhatian: Jarang Masuk Kelas"
                                >
                                  <span>⚠️</span>
                                  <span>Tidak Aktif</span>
                                </span>
                              );
                            }

                            if (isBelum) {
                              return (
                                <span 
                                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs"
                                  title="Siswa Aktif - Belum Masuk Dapodik Kemdikbud"
                                >
                                  <span>⏳</span>
                                  <span>Belum Dapodik</span>
                                </span>
                              );
                            }

                            if (isPindah) {
                              return (
                                <span 
                                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs"
                                  title="Siswa Mutasi Keluar"
                                >
                                  <span>🚚</span>
                                  <span>Pindah</span>
                                </span>
                              );
                            }

                            if (isLulus) {
                              return (
                                <span 
                                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs"
                                  title="Siswa Telah Lulus / Alumni"
                                >
                                  <span>🎓</span>
                                  <span>Lulus</span>
                                </span>
                              );
                            }

                            if (isKeluar) {
                              return (
                                <span 
                                  className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs"
                                  title="Siswa Keluar / Mengundurkan Diri"
                                >
                                  <span>🚪</span>
                                  <span>Keluar</span>
                                </span>
                              );
                            }

                            return (
                              <span 
                                className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs"
                                title="Siswa Aktif Reguler"
                              >
                                <span>✅</span>
                                <span>Aktif</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => setViewingStudent(student)} 
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition"
                              title="Lihat Detail Profil Siswa"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(student);
                              }} 
                              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Data Siswa"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(student.id, student.name, student.class, student.nis);
                              }} 
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Data Siswa"
                            >
                              <Trash2 size={16} />
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
        )}

        {/* Pagination Footer */}
        {sortedStudents.length > itemsPerPage && (
          <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan {((safePage - 1) * itemsPerPage) + 1} - {Math.min(safePage * itemsPerPage, sortedStudents.length)} dari {sortedStudents.length} siswa
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-white transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                Hal {safePage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-white transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL DETAIL SISWA (Bento & Tabs)                         */}
      {/* ========================================================= */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-indigo-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                  <User size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Detail Lengkap Profil Siswa</h3>
                  <p className="text-[11px] text-indigo-200">Data Master SISWA (Tersinkronisasi Database)</p>
                </div>
              </div>
              <button onClick={() => setViewingStudent(null)} className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl border-2 border-slate-200 bg-white shadow-md flex items-center justify-center overflow-hidden shrink-0 relative group/pcard">
                {viewingStudent.fotoUrl ? (
                  <>
                    <img 
                      src={getGoogleDriveDirectImageUrl(viewingStudent.fotoUrl)} 
                      alt={viewingStudent.name} 
                      className="w-full h-full object-cover group-hover/pcard:scale-105 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                    />
                    <a
                      href={getGoogleDriveDirectImageUrl(viewingStudent.fotoUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover/pcard:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition p-1 text-center gap-1"
                      title="Klik untuk membuka foto ukuran asli"
                    >
                      <Eye size={16} />
                      <span>Ukuran Asli ↗</span>
                    </a>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-sky-700 flex flex-col items-center justify-center text-white">
                    <span className="text-3xl font-black">{viewingStudent.name ? viewingStudent.name[0].toUpperCase() : 'S'}</span>
                    <span className="text-[9px] text-white/70 font-semibold mt-1">Tanpa Foto</span>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-xl font-extrabold text-slate-900">{viewingStudent.name}</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">Kelas {viewingStudent.class}</span>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-bold",
                    viewingStudent.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  )}>{viewingStudent.status}</span>
                  {(() => {
                    const yStatus = getStudentStatusYatim(viewingStudent);
                    const info = getYatimStatusInfo(yStatus);
                    return (
                      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-2xs", info.badgeColor)}>
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs font-mono text-slate-500">
                  NIS: <strong>{viewingStudent.nis}</strong> | NISN: <strong>{viewingStudent.nisn || '-'}</strong> | NIK: <strong>{viewingStudent.nik || '-'}</strong>
                </p>
                <p className="text-xs text-slate-600">
                  {viewingStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • {viewingStudent.pob ? `${viewingStudent.pob}, ` : ''}{formatDate(viewingStudent.dob)} ({formatAge(viewingStudent.dob)})
                </p>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex border-b border-slate-200 px-5 gap-2 sm:gap-4 text-xs font-bold bg-white overflow-x-auto">
              <button 
                onClick={() => setDetailTab('biodata')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", detailTab === 'biodata' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <User size={14} /> Biodata Siswa
              </button>
              <button 
                onClick={() => setDetailTab('alamat')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", detailTab === 'alamat' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <Home size={14} /> Alamat & Kontak
              </button>
              <button 
                onClick={() => setDetailTab('ortu')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", detailTab === 'ortu' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <Users size={14} /> Orang Tua (Ayah & Ibu)
              </button>
              <button 
                onClick={() => setDetailTab('wali')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", detailTab === 'wali' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <ShieldCheck size={14} /> Wali Murid
              </button>
              <button 
                onClick={() => setDetailTab('berkas')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", detailTab === 'berkas' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <FolderGit2 size={14} /> Berkas & Dokumen
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="p-6 max-h-[55vh] overflow-y-auto">
              {detailTab === 'biodata' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Tahun Masuk</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.tahunMasuk || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Agama</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.agama || 'Islam'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Gol. Darah</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.golonganDarah || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Anak ke / Saudara</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.anakKe || '-'} dari {viewingStudent.saudara || '-'} bersaudara</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Tinggi / Berat Badan</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.tinggiBadan ? `${viewingStudent.tinggiBadan} cm` : '-'} / {viewingStudent.beratBadan ? `${viewingStudent.beratBadan} kg` : '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Sekolah Asal</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.sekolahAsal || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Penerima KPS/KIP</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.penerimaKps || 'Tidak'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Prestasi</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.prestasi || '-'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Hobi</span>
                    <span className="font-semibold text-slate-800">{viewingStudent.hobi || '-'}</span>
                  </div>
                </div>
              )}

              {detailTab === 'alamat' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Alamat Lengkap</span>
                    <span className="font-semibold text-slate-800 text-sm">{viewingStudent.address || '-'}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">RT / RW</span>
                      <span className="font-semibold text-slate-800">{viewingStudent.rt || '-'}/{viewingStudent.rw || '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Kelurahan</span>
                      <span className="font-semibold text-slate-800">{viewingStudent.kelurahan || '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Kecamatan</span>
                      <span className="font-semibold text-slate-800">{viewingStudent.kecamatan || '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Kota / Kab</span>
                      <span className="font-semibold text-slate-800">{viewingStudent.kota || '-'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">No. HP / WhatsApp</span>
                      <span className="font-semibold text-slate-800">{viewingStudent.noHp || '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Email</span>
                      <span className="font-semibold text-slate-800">{viewingStudent.email || '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Transportasi</span>
                      <span className="font-semibold text-slate-800">{viewingStudent.alatTransportasi || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'ortu' && (
                <div className="space-y-4 text-xs">
                  {/* Status Yatim / Piatu Banner */}
                  {(() => {
                    const yStatus = getStudentStatusYatim(viewingStudent);
                    const info = getYatimStatusInfo(yStatus);
                    return (
                      <div className={cn("p-3.5 rounded-xl border flex items-center justify-between gap-3", info.badgeColor)}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{info.icon}</span>
                          <div>
                            <span className="font-extrabold text-xs block">Status Keluarga: {info.label}</span>
                            <span className="text-[11px] opacity-90">{info.description}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-white/70 backdrop-blur-xs border border-current/20 shadow-2xs">
                          {yStatus}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-indigo-700 uppercase font-bold block">Nomor Kartu Keluarga (KK)</span>
                      <span className="font-mono font-bold text-indigo-950 text-sm">{viewingStudent.noKk || '-'}</span>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1 rounded-lg">Orang Tua Kandung</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Ayah */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <h5 className="font-bold text-slate-900 border-b pb-1 text-xs flex items-center justify-between">
                        <span>Data Ayah Kandung</span>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-bold",
                            viewingStudent.statusAyah === 'Meninggal' || viewingStudent.statusAyah === 'Almarhum'
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          )}>
                            {viewingStudent.statusAyah || 'Masih Hidup'}
                          </span>
                          <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">Kepala Keluarga</span>
                        </div>
                      </h5>
                      <p><strong className="text-slate-500">Nama:</strong> {viewingStudent.namaAyah || viewingStudent.parentName || '-'}</p>
                      <p><strong className="text-slate-500">NIK:</strong> {viewingStudent.nikAyah || '-'}</p>
                      <p><strong className="text-slate-500">Status Keberadaan:</strong> {viewingStudent.statusAyah || 'Masih Hidup'}</p>
                      <p><strong className="text-slate-500">Tempat/Tgl Lahir:</strong> {viewingStudent.tempatLahirAyah || '-'}, {viewingStudent.tanggalLahirAyah || '-'}</p>
                      <p><strong className="text-slate-500">Pendidikan:</strong> {viewingStudent.pendidikanAyah || '-'}</p>
                      <p><strong className="text-slate-500">Pekerjaan:</strong> {viewingStudent.pekerjaanAyah || '-'}</p>
                      <p><strong className="text-slate-500">Penghasilan:</strong> {viewingStudent.penghasilanAyah || '-'}</p>
                      <p><strong className="text-slate-500">No. HP / WA:</strong> {viewingStudent.tlpAyah || '-'}</p>
                    </div>
                    {/* Ibu */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                      <h5 className="font-bold text-slate-900 border-b pb-1 text-xs flex items-center justify-between">
                        <span>Data Ibu Kandung</span>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-bold",
                            viewingStudent.statusIbu === 'Meninggal' || viewingStudent.statusIbu === 'Almarhumah'
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-100 text-emerald-800"
                          )}>
                            {viewingStudent.statusIbu || 'Masih Hidup'}
                          </span>
                          <span className="text-[10px] text-pink-600 bg-pink-50 px-2 py-0.5 rounded font-bold">Ibu Kandung</span>
                        </div>
                      </h5>
                      <p><strong className="text-slate-500">Nama:</strong> {viewingStudent.namaIbu || '-'}</p>
                      <p><strong className="text-slate-500">NIK:</strong> {viewingStudent.nikIbu || '-'}</p>
                      <p><strong className="text-slate-500">Status Keberadaan:</strong> {viewingStudent.statusIbu || 'Masih Hidup'}</p>
                      <p><strong className="text-slate-500">Tempat/Tgl Lahir:</strong> {viewingStudent.tempatLahirIbu || '-'}, {viewingStudent.tanggalLahirIbu || '-'}</p>
                      <p><strong className="text-slate-500">Pendidikan:</strong> {viewingStudent.pendidikanIbu || '-'}</p>
                      <p><strong className="text-slate-500">Pekerjaan:</strong> {viewingStudent.pekerjaanIbu || '-'}</p>
                      <p><strong className="text-slate-500">Penghasilan:</strong> {viewingStudent.penghasilanIbu || '-'}</p>
                      <p><strong className="text-slate-500">No. HP / WA:</strong> {viewingStudent.tlpIbu || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'wali' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <h5 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-amber-600" /> Data Lengkap Wali Murid
                      </h5>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                        Hubungan: {viewingStudent.hubunganWali || 'Wali'}
                      </span>
                    </div>

                    {viewingStudent.namaWali ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-2">
                          <p><strong className="text-slate-500">Nama Wali:</strong> <span className="font-semibold text-slate-800">{viewingStudent.namaWali}</span></p>
                          <p><strong className="text-slate-500">Hubungan Keluarga:</strong> {viewingStudent.hubunganWali || '-'}</p>
                          <p><strong className="text-slate-500">Tempat / Tgl Lahir:</strong> {viewingStudent.tempatLahirWali || '-'}, {viewingStudent.tglLahirWali || '-'}</p>
                        </div>
                        <div className="space-y-2">
                          <p><strong className="text-slate-500">Pendidikan:</strong> {viewingStudent.pendidikanWali || '-'}</p>
                          <p><strong className="text-slate-500">Pekerjaan:</strong> {viewingStudent.pekerjaanWali || '-'}</p>
                          <p><strong className="text-slate-500">Penghasilan:</strong> {viewingStudent.penghasilanWali || '-'}</p>
                          <p><strong className="text-slate-500">No. HP / WA:</strong> {viewingStudent.tlpWali || '-'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400">
                        <p className="font-medium text-slate-500">Tidak ada data wali murid untuk siswa ini.</p>
                        <p className="text-[11px] text-slate-400 mt-1">Siswa tinggal bersama orang tua kandung.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'berkas' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { label: "1. Pas Foto Siswa (3x4 / 4x6)", url: viewingStudent.fotoUrl, isImg: true },
                    { label: "2. Akta Kelahiran", url: viewingStudent.aktaKelahiranUrl || viewingStudent.akteUrl },
                    { label: "3. Kartu Keluarga (KK)", url: viewingStudent.kartuKeluargaUrl || viewingStudent.kkUrl },
                    { label: "4. KIA / KTP Anak", url: viewingStudent.kiaUrl || viewingStudent.ktpAnakUrl },
                    { label: "5. KTP Ayah Kandung", url: viewingStudent.ktpAyahUrl },
                    { label: "6. KTP Ibu Kandung", url: viewingStudent.ktpIbuUrl },
                    { label: "7. Ijazah / SKL", url: viewingStudent.ijazahUrl },
                    { label: "8. KTP Wali Murid", url: viewingStudent.ktpWaliUrl },
                    { label: "9. Buku Rapor / Nilai", url: viewingStudent.raporUrl || viewingStudent.rapotUrl },
                    { label: "10. Surat Pindah / Mutasi", url: viewingStudent.suratPindahUrl },
                    { label: "11. Surat Keterangan / SuKet", url: viewingStudent.suKetUrl || viewingStudent.dokumenLainUrl || viewingStudent.berkasUrl },
                    { label: "12. Surat Domisili / KIP", url: viewingStudent.suratDomisiliUrl || viewingStudent.kipUrl },
                    { label: "13. Form Formulir Pendaftaran", url: viewingStudent.formPendaftaranUrl || viewingStudent.formUrl || (viewingStudent as any).FormPendaftaran },
                    { label: "14. Surat Pernyataan Orang Tua", url: viewingStudent.suratPernyataanUrl || viewingStudent.sPernyataanUrl || (viewingStudent as any).SPernyataan },
                    { label: "15. Surat Kesanggupan / Komitmen", url: viewingStudent.suratKesanggupanUrl || viewingStudent.sKesanggupanUrl || (viewingStudent as any).SKesanggupan },
                    { label: "16. Berkas Tambahan / Lainnya", url: viewingStudent.berkasLainnyaUrl || (viewingStudent as any).BerkasLainnya }
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2">
                      <div className="truncate pr-2 flex items-center gap-2">
                        {item.isImg && item.url ? (
                          <img 
                            src={getGoogleDriveDirectImageUrl(item.url)} 
                            alt="Foto" 
                            className="w-7 h-9 object-cover rounded border border-slate-300 shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileText size={14} className="text-indigo-600 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 block truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-400">{item.url ? 'Tersedia di Drive' : 'Belum diunggah'}</span>
                        </div>
                      </div>
                      {item.url ? (
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="px-2.5 py-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-bold text-[11px] flex items-center gap-1 transition shrink-0"
                        >
                          <Eye size={12} /> Buka ↗
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic shrink-0">Kosong</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => {
                    const s = viewingStudent;
                    setViewingStudent(null);
                    setPrintStudent(s);
                    setPrintStudentDocType('biodata');
                  }} 
                  className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200 shadow-sm"
                >
                  <Printer size={14} /> Cetak Biodata (F-SEK)
                </button>
                <button 
                  onClick={() => {
                    const s = viewingStudent;
                    setViewingStudent(null);
                    setPrintStudent(s);
                    setPrintStudentDocType('kartu');
                  }} 
                  className="px-3.5 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-amber-200 shadow-sm"
                >
                  <Award size={14} /> Cetak Kartu Pelajar
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const s = viewingStudent;
                    if (s) {
                      setViewingStudent(null);
                      handleDelete(s.id, s.name);
                    }
                  }} 
                  className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-rose-200 shadow-sm"
                  title="Hapus data siswa ini"
                >
                  <Trash2 size={14} /> Hapus
                </button>
                <button 
                  onClick={() => {
                    const s = viewingStudent;
                    setViewingStudent(null);
                    handleOpenModal(s);
                  }} 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm"
                >
                  <Edit size={14} /> Edit Profil
                </button>
                <button 
                  onClick={() => setViewingStudent(null)} 
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL TAMBAH / EDIT SISWA (Multi-Tab Form)                */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-indigo-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                  {currentStudent.id ? <Edit size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    {currentStudent.id ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                  </h3>
                  <p className="text-[11px] text-indigo-200">Semua field otomatis disinkronkan ke Master Spreadsheet</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            {/* Form Tabs */}
            <div className="flex border-b border-slate-200 px-5 gap-2 sm:gap-4 text-xs font-bold bg-slate-50 overflow-x-auto">
              <button 
                type="button"
                onClick={() => setModalTab('biodata')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", modalTab === 'biodata' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <User size={14} /> 1. Biodata Siswa
              </button>
              <button 
                type="button"
                onClick={() => setModalTab('alamat')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", modalTab === 'alamat' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <Home size={14} /> 2. Alamat & Kontak
              </button>
              <button 
                type="button"
                onClick={() => setModalTab('ortu')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", modalTab === 'ortu' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <Users size={14} /> 3. Data Orang Tua (Ayah & Ibu)
              </button>
              <button 
                type="button"
                onClick={() => setModalTab('wali')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", modalTab === 'wali' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <ShieldCheck size={14} /> 4. Data Wali Murid
              </button>
              <button 
                type="button"
                onClick={() => setModalTab('berkas')} 
                className={cn("py-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap", modalTab === 'berkas' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700")}
              >
                <FolderGit2 size={14} /> 5. Berkas & Foto
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave}>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                {modalError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center justify-between shadow-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      ⚠️ {modalError}
                    </span>
                    <button type="button" onClick={() => setModalError('')} className="text-rose-400 hover:text-rose-600 p-1">✕</button>
                  </div>
                )}
                {modalTab === 'biodata' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">NIS (Nomor Induk) *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="mis. 252601001" 
                          className="input text-xs" 
                          value={currentStudent.nis || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, nis: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">NISN (10 Digit)</label>
                        <input 
                          type="text" 
                          placeholder="mis. 0123456789" 
                          className="input text-xs" 
                          value={currentStudent.nisn || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, nisn: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">NIK Siswa (16 Digit)</label>
                        <input 
                          type="text" 
                          placeholder="mis. 3201..." 
                          className="input text-xs" 
                          value={currentStudent.nik || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, nik: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="label text-xs font-bold text-slate-700">Nama Lengkap Siswa *</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Nama lengkap sesuai akte kelahiran" 
                          className="input text-xs font-semibold" 
                          value={currentStudent.name || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, name: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Kelas</label>
                        <select 
                          className="input text-xs" 
                          value={currentStudent.class || getAllClasses(students)[0] || '4'} 
                          onChange={e => setCurrentStudent({...currentStudent, class: e.target.value})}
                        >
                          {Array.from(new Set([...getAllClasses(students), ...CLASSES, ...(currentStudent.class ? [currentStudent.class] : [])])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(c => (
                            <option key={c} value={c}>{formatClassLabel(c, true)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Jenis Kelamin</label>
                        <select 
                          className="input text-xs" 
                          value={currentStudent.gender || 'L'} 
                          onChange={e => setCurrentStudent({...currentStudent, gender: e.target.value as 'L'|'P'})}
                        >
                          <option value="L">Laki-laki (L)</option>
                          <option value="P">Perempuan (P)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Tempat Lahir</label>
                        <input 
                          type="text" 
                          placeholder="mis. Bandung" 
                          className="input text-xs" 
                          value={currentStudent.pob || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, pob: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Tanggal Lahir</label>
                        <input 
                          type="date" 
                          className="input text-xs" 
                          value={currentStudent.dob || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, dob: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Agama</label>
                        <select 
                          className="input text-xs" 
                          value={currentStudent.agama || 'Islam'} 
                          onChange={e => setCurrentStudent({...currentStudent, agama: e.target.value})}
                        >
                          {AGAMA_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {currentStudent.agama && !AGAMA_OPTIONS.includes(currentStudent.agama) && (
                            <option value={currentStudent.agama}>{currentStudent.agama}</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Golongan Darah</label>
                        <select 
                          className="input text-xs font-medium" 
                          value={currentStudent.golonganDarah || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, golonganDarah: e.target.value})}
                        >
                          <option value="">-- Pilih Gol. Darah --</option>
                          {GOLONGAN_DARAH_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {currentStudent.golonganDarah && !GOLONGAN_DARAH_OPTIONS.includes(currentStudent.golonganDarah) && (
                            <option value={currentStudent.golonganDarah}>{currentStudent.golonganDarah}</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Tahun Masuk</label>
                        <input 
                          type="text" 
                          placeholder="mis. 2025" 
                          className="input text-xs" 
                          value={currentStudent.tahunMasuk || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, tahunMasuk: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Status Siswa / Saat Ini</label>
                        <select 
                          className="input text-xs font-semibold" 
                          value={currentStudent.status || 'AKTIF'} 
                          onChange={e => setCurrentStudent({...currentStudent, status: e.target.value as any})}
                        >
                          <option value="AKTIF">✅ AKTIF (Reguler)</option>
                          <option value="TIDAK AKTIF">⚠️ TIDAK AKTIF (Jarang Masuk / Perhatian)</option>
                          <option value="BELUM">⏳ BELUM (Belum Masuk Dapodik)</option>
                          <option value="PINDAH">🚚 PINDAH (Mutasi Keluar)</option>
                          <option value="KELUAR">🚪 KELUAR (Mengundurkan Diri)</option>
                          <option value="LULUS">🎓 LULUS (Alumni)</option>
                          <option value="DROP_OUT">❌ DROP_OUT</option>
                          <option value="MENINGGAL">🕊️ MENINGGAL</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Anak Ke-</label>
                        <input 
                          type="number" 
                          placeholder="1" 
                          className="input text-xs" 
                          value={currentStudent.anakKe || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, anakKe: Number(e.target.value) || undefined})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Dari Bersaudara</label>
                        <input 
                          type="number" 
                          placeholder="3" 
                          className="input text-xs" 
                          value={currentStudent.saudara || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, saudara: Number(e.target.value) || undefined})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Tinggi Badan (cm)</label>
                        <input 
                          type="number" 
                          placeholder="125" 
                          className="input text-xs" 
                          value={currentStudent.tinggiBadan || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, tinggiBadan: Number(e.target.value) || undefined})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Berat Badan (kg)</label>
                        <input 
                          type="number" 
                          placeholder="28" 
                          className="input text-xs" 
                          value={currentStudent.beratBadan || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, beratBadan: Number(e.target.value) || undefined})} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Prestasi Siswa</label>
                        <input 
                          type="text" 
                          placeholder="mis. Juara 1 Mewarnai" 
                          className="input text-xs" 
                          value={currentStudent.prestasi || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, prestasi: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Hobi / Minat</label>
                        <input 
                          type="text" 
                          placeholder="mis. Membaca, Olahraga" 
                          className="input text-xs" 
                          value={currentStudent.hobi || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, hobi: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Catatan Khusus / Medis</label>
                        <input 
                          type="text" 
                          placeholder="mis. Alergi debu / Kacamata" 
                          className="input text-xs" 
                          value={currentStudent.catatanPenting || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, catatanPenting: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Sekolah Asal</label>
                        <input 
                          type="text" 
                          placeholder="mis. TK Pertiwi" 
                          className="input text-xs" 
                          value={currentStudent.sekolahAsal || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, sekolahAsal: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Penerima KPS/KIP</label>
                        <select 
                          className="input text-xs" 
                          value={currentStudent.penerimaKps || 'Tidak'} 
                          onChange={e => setCurrentStudent({...currentStudent, penerimaKps: e.target.value})}
                        >
                          <option value="Tidak">Tidak</option>
                          <option value="Ya">Ya</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">No. SKHUN / Ijazah Sebelumnya</label>
                        <input 
                          type="text" 
                          placeholder="Nomor Seri SKHUN / Ijazah" 
                          className="input text-xs" 
                          value={currentStudent.skhun || currentStudent.ijazahNo || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, skhun: e.target.value, ijazahNo: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'alamat' && (
                  <div className="space-y-4">
                    <div>
                      <label className="label text-xs font-bold text-slate-700">Alamat Lengkap (Jalan / Gang / No Rumah)</label>
                      <textarea 
                        rows={2} 
                        placeholder="mis. Jl. Merdeka No. 10" 
                        className="input text-xs" 
                        value={currentStudent.address || ''} 
                        onChange={e => setCurrentStudent({...currentStudent, address: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">RT</label>
                        <input 
                          type="text" 
                          placeholder="01" 
                          className="input text-xs" 
                          value={currentStudent.rt || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, rt: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">RW</label>
                        <input 
                          type="text" 
                          placeholder="05" 
                          className="input text-xs" 
                          value={currentStudent.rw || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, rw: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Kelurahan / Desa</label>
                        <input 
                          type="text" 
                          placeholder="Sukamaju" 
                          className="input text-xs" 
                          value={currentStudent.kelurahan || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, kelurahan: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Kecamatan</label>
                        <input 
                          type="text" 
                          placeholder="Cibeunying" 
                          className="input text-xs" 
                          value={currentStudent.kecamatan || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, kecamatan: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Kota / Kabupaten</label>
                        <input 
                          type="text" 
                          placeholder="Bandung" 
                          className="input text-xs" 
                          value={currentStudent.kota || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, kota: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Provinsi</label>
                        <input 
                          type="text" 
                          placeholder="Jawa Barat" 
                          className="input text-xs" 
                          value={currentStudent.provinsi || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, provinsi: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Kode Pos</label>
                        <input 
                          type="text" 
                          placeholder="40123" 
                          className="input text-xs" 
                          value={currentStudent.kodePos || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, kodePos: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs font-bold text-slate-700">No. HP / WhatsApp</label>
                        <input 
                          type="text" 
                          placeholder="081234567890" 
                          className="input text-xs" 
                          value={currentStudent.noHp || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, noHp: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Email</label>
                        <input 
                          type="email" 
                          placeholder="siswa@gmail.com" 
                          className="input text-xs" 
                          value={currentStudent.email || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, email: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="label text-xs font-bold text-slate-700">Alat Transportasi</label>
                        <select 
                          className="input text-xs" 
                          value={currentStudent.alatTransportasi || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, alatTransportasi: e.target.value})} 
                        >
                          <option value="">-- Pilih Alat Transportasi --</option>
                          {TRANSPORTASI_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {currentStudent.alatTransportasi && !TRANSPORTASI_OPTIONS.includes(currentStudent.alatTransportasi) && (
                            <option value={currentStudent.alatTransportasi}>{currentStudent.alatTransportasi}</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'ortu' && (
                  <div className="space-y-4">
                    {/* Status Yatim Piatu Selector Banner */}
                    <div className="p-4 bg-linear-to-r from-indigo-50/80 via-purple-50/80 to-pink-50/80 rounded-2xl border border-indigo-100/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👨‍👩‍👧</span>
                          <div>
                            <h5 className="font-bold text-xs text-indigo-950">Status Keberadaan Orang Tua & Yatim/Piatu</h5>
                            <p className="text-[11px] text-slate-600">
                              Yatim (Ayah Wafat) • Piatu (Ibu Wafat) • Yatim Piatu (Keduanya Wafat) • Lengkap (Kedua Ortu Ada)
                            </p>
                          </div>
                        </div>
                        {(() => {
                          const currY = currentStudent.statusYatim || (
                            currentStudent.statusAyah === 'Meninggal' && currentStudent.statusIbu === 'Meninggal' ? 'Yatim Piatu' :
                            currentStudent.statusAyah === 'Meninggal' ? 'Yatim' :
                            currentStudent.statusIbu === 'Meninggal' ? 'Piatu' : 'Lengkap'
                          );
                          const yInfo = getYatimStatusInfo(currY);
                          return (
                            <span className={cn("px-3 py-1 rounded-xl text-xs font-black shadow-xs", yInfo.badgeColor)}>
                              {yInfo.icon} {yInfo.label}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Status Keberadaan Ayah</label>
                          <select 
                            className="input text-xs bg-white font-bold" 
                            value={currentStudent.statusAyah || 'Masih Hidup'} 
                            onChange={e => {
                              const val = e.target.value;
                              const sIbu = currentStudent.statusIbu || 'Masih Hidup';
                              let autoYatim = 'Lengkap';
                              if (val === 'Meninggal' && sIbu === 'Meninggal') autoYatim = 'Yatim Piatu';
                              else if (val === 'Meninggal') autoYatim = 'Yatim';
                              else if (sIbu === 'Meninggal') autoYatim = 'Piatu';
                              else autoYatim = 'Lengkap';

                              setCurrentStudent({
                                ...currentStudent, 
                                statusAyah: val,
                                statusYatim: autoYatim
                              });
                            }}
                          >
                            <option value="Masih Hidup">🌿 Masih Hidup</option>
                            <option value="Meninggal">🤍 Meninggal / Almarhum (Yatim)</option>
                          </select>
                        </div>

                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Status Keberadaan Ibu</label>
                          <select 
                            className="input text-xs bg-white font-bold" 
                            value={currentStudent.statusIbu || 'Masih Hidup'} 
                            onChange={e => {
                              const val = e.target.value;
                              const sAyah = currentStudent.statusAyah || 'Masih Hidup';
                              let autoYatim = 'Lengkap';
                              if (sAyah === 'Meninggal' && val === 'Meninggal') autoYatim = 'Yatim Piatu';
                              else if (sAyah === 'Meninggal') autoYatim = 'Yatim';
                              else if (val === 'Meninggal') autoYatim = 'Piatu';
                              else autoYatim = 'Lengkap';

                              setCurrentStudent({
                                ...currentStudent, 
                                statusIbu: val,
                                statusYatim: autoYatim
                              });
                            }}
                          >
                            <option value="Masih Hidup">🌿 Masih Hidup</option>
                            <option value="Meninggal">💜 Meninggal / Almarhumah (Piatu)</option>
                          </select>
                        </div>

                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Status Kategori Siswa</label>
                          <select 
                            className="input text-xs bg-white font-bold" 
                            value={currentStudent.statusYatim || (
                              currentStudent.statusAyah === 'Meninggal' && currentStudent.statusIbu === 'Meninggal' ? 'Yatim Piatu' :
                              currentStudent.statusAyah === 'Meninggal' ? 'Yatim' :
                              currentStudent.statusIbu === 'Meninggal' ? 'Piatu' : 'Lengkap'
                            )} 
                            onChange={e => {
                              const val = e.target.value;
                              let newSAyah = currentStudent.statusAyah || 'Masih Hidup';
                              let newSIbu = currentStudent.statusIbu || 'Masih Hidup';
                              if (val === 'Yatim Piatu') {
                                newSAyah = 'Meninggal';
                                newSIbu = 'Meninggal';
                              } else if (val === 'Yatim') {
                                newSAyah = 'Meninggal';
                                if (newSIbu === 'Meninggal') newSIbu = 'Masih Hidup';
                              } else if (val === 'Piatu') {
                                newSIbu = 'Meninggal';
                                if (newSAyah === 'Meninggal') newSAyah = 'Masih Hidup';
                              } else if (val === 'Lengkap') {
                                newSAyah = 'Masih Hidup';
                                newSIbu = 'Masih Hidup';
                              }
                              setCurrentStudent({
                                ...currentStudent, 
                                statusYatim: val,
                                statusAyah: newSAyah,
                                statusIbu: newSIbu
                              });
                            }}
                          >
                            <option value="Lengkap">👨‍👩‍👧 Lengkap (Kedua Orang Tua Ada)</option>
                            <option value="Yatim">🤍 Yatim (Ayah Meninggal Dunia)</option>
                            <option value="Piatu">💜 Piatu (Ibu Meninggal Dunia)</option>
                            <option value="Yatim Piatu">🖤 Yatim Piatu (Ayah & Ibu Meninggal)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="label text-xs font-bold text-slate-700">Nomor Kartu Keluarga (KK)</label>
                      <input 
                        type="text" 
                        placeholder="16 Digit No KK" 
                        className="input text-xs" 
                        value={currentStudent.noKk || ''} 
                        onChange={e => setCurrentStudent({...currentStudent, noKk: e.target.value})} 
                      />
                    </div>

                    {/* Data Ayah */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                      <h5 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <User size={14} className="text-indigo-600" /> Data Ayah Kandung
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Nama Lengkap Ayah</label>
                          <input 
                            type="text" 
                            className="input text-xs" 
                            value={currentStudent.namaAyah || currentStudent.parentName || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, namaAyah: e.target.value, parentName: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">NIK Ayah (16 Digit)</label>
                          <input 
                            type="text" 
                            className="input text-xs" 
                            value={currentStudent.nikAyah || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, nikAyah: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">No. HP / WhatsApp Ayah</label>
                          <input 
                            type="text" 
                            className="input text-xs" 
                            value={currentStudent.tlpAyah || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tlpAyah: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Tempat Lahir Ayah</label>
                          <input 
                            type="text" 
                            className="input text-xs" 
                            value={currentStudent.tempatLahirAyah || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tempatLahirAyah: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Tgl Lahir Ayah</label>
                          <input 
                            type="date" 
                            className="input text-xs" 
                            value={currentStudent.tanggalLahirAyah || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tanggalLahirAyah: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Pendidikan Ayah</label>
                          <select 
                            className="input text-xs" 
                            value={currentStudent.pendidikanAyah || 'SMA / SMK / MA / Sederajat'} 
                            onChange={e => setCurrentStudent({...currentStudent, pendidikanAyah: e.target.value})}
                          >
                            {PENDIDIKAN_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {currentStudent.pendidikanAyah && !PENDIDIKAN_OPTIONS.includes(currentStudent.pendidikanAyah) && (
                              <option value={currentStudent.pendidikanAyah}>{currentStudent.pendidikanAyah}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Pekerjaan Ayah</label>
                          <select 
                            className="input text-xs font-medium" 
                            value={currentStudent.pekerjaanAyah || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, pekerjaanAyah: e.target.value})} 
                          >
                            <option value="">-- Pilih Pekerjaan Ayah --</option>
                            {PEKERJAAN_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {currentStudent.pekerjaanAyah && !PEKERJAAN_OPTIONS.includes(currentStudent.pekerjaanAyah) && (
                              <option value={currentStudent.pekerjaanAyah}>{currentStudent.pekerjaanAyah}</option>
                            )}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label text-[11px] font-bold text-slate-700">Penghasilan Bulanan Ayah</label>
                        <select 
                          className="input text-xs" 
                          value={currentStudent.penghasilanAyah || 'Rp 1.000.000 - Rp 2.000.000'} 
                          onChange={e => setCurrentStudent({...currentStudent, penghasilanAyah: e.target.value})}
                        >
                          <option value="">-- Pilih Penghasilan Ayah --</option>
                          {PENGHASILAN_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {currentStudent.penghasilanAyah && !PENGHASILAN_OPTIONS.includes(currentStudent.penghasilanAyah) && (
                            <option value={currentStudent.penghasilanAyah}>{currentStudent.penghasilanAyah}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Data Ibu */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                      <h5 className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <User size={14} className="text-pink-600" /> Data Ibu Kandung
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Nama Lengkap Ibu</label>
                          <input 
                            type="text" 
                            className="input text-xs" 
                            value={currentStudent.namaIbu || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, namaIbu: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">NIK Ibu (16 Digit)</label>
                          <input 
                            type="text" 
                            className="input text-xs" 
                            value={currentStudent.nikIbu || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, nikIbu: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">No. HP / WhatsApp Ibu</label>
                          <input 
                            type="text" 
                            className="input text-xs" 
                            value={currentStudent.tlpIbu || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tlpIbu: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Tempat Lahir Ibu</label>
                          <input 
                            type="text" 
                            className="input text-xs" 
                            value={currentStudent.tempatLahirIbu || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tempatLahirIbu: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Tgl Lahir Ibu</label>
                          <input 
                            type="date" 
                            className="input text-xs" 
                            value={currentStudent.tanggalLahirIbu || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tanggalLahirIbu: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Pendidikan Ibu</label>
                          <select 
                            className="input text-xs" 
                            value={currentStudent.pendidikanIbu || 'SMA / SMK / MA / Sederajat'} 
                            onChange={e => setCurrentStudent({...currentStudent, pendidikanIbu: e.target.value})}
                          >
                            {PENDIDIKAN_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {currentStudent.pendidikanIbu && !PENDIDIKAN_OPTIONS.includes(currentStudent.pendidikanIbu) && (
                              <option value={currentStudent.pendidikanIbu}>{currentStudent.pendidikanIbu}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Pekerjaan Ibu</label>
                          <select 
                            className="input text-xs font-medium" 
                            value={currentStudent.pekerjaanIbu || 'Ibu Rumah Tangga'} 
                            onChange={e => setCurrentStudent({...currentStudent, pekerjaanIbu: e.target.value})} 
                          >
                            <option value="">-- Pilih Pekerjaan Ibu --</option>
                            {PEKERJAAN_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {currentStudent.pekerjaanIbu && !PEKERJAAN_OPTIONS.includes(currentStudent.pekerjaanIbu) && (
                              <option value={currentStudent.pekerjaanIbu}>{currentStudent.pekerjaanIbu}</option>
                            )}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label text-[11px] font-bold text-slate-700">Penghasilan Bulanan Ibu</label>
                        <select 
                          className="input text-xs" 
                          value={currentStudent.penghasilanIbu || 'Tidak Berpenghasilan / IRT'} 
                          onChange={e => setCurrentStudent({...currentStudent, penghasilanIbu: e.target.value})}
                        >
                          <option value="">-- Pilih Penghasilan Ibu --</option>
                          {PENGHASILAN_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {currentStudent.penghasilanIbu && !PENGHASILAN_OPTIONS.includes(currentStudent.penghasilanIbu) && (
                            <option value={currentStudent.penghasilanIbu}>{currentStudent.penghasilanIbu}</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'wali' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                        <h5 className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                          <ShieldCheck size={16} className="text-amber-600" /> Data Lengkap Wali Murid
                        </h5>
                        <span className="text-[11px] text-amber-700 font-medium">
                          Diisi jika siswa tinggal bersama wali / bukan orang tua kandung
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Nama Lengkap Wali</label>
                          <input 
                            type="text" 
                            placeholder="Nama Wali Murid"
                            className="input text-xs bg-white" 
                            value={currentStudent.namaWali || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, namaWali: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Hubungan / Status Keluarga</label>
                          <select 
                            className="input text-xs bg-white font-medium" 
                            value={currentStudent.hubunganWali || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, hubunganWali: e.target.value})} 
                          >
                            <option value="">-- Pilih Hubungan Wali --</option>
                            {HUBUNGAN_WALI_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {currentStudent.hubunganWali && !HUBUNGAN_WALI_OPTIONS.includes(currentStudent.hubunganWali) && (
                              <option value={currentStudent.hubunganWali}>{currentStudent.hubunganWali}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">No. HP / WA Wali</label>
                          <input 
                            type="text" 
                            placeholder="08xxxxxxxxxx"
                            className="input text-xs bg-white" 
                            value={currentStudent.tlpWali || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tlpWali: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Tempat Lahir Wali</label>
                          <input 
                            type="text" 
                            placeholder="Kota Lahir"
                            className="input text-xs bg-white" 
                            value={currentStudent.tempatLahirWali || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tempatLahirWali: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Tgl Lahir Wali</label>
                          <input 
                            type="date" 
                            className="input text-xs bg-white" 
                            value={currentStudent.tglLahirWali || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, tglLahirWali: e.target.value})} 
                          />
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Pendidikan Wali</label>
                          <select 
                            className="input text-xs bg-white" 
                            value={currentStudent.pendidikanWali || 'SMA / SMK / MA / Sederajat'} 
                            onChange={e => setCurrentStudent({...currentStudent, pendidikanWali: e.target.value})}
                          >
                            {PENDIDIKAN_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {currentStudent.pendidikanWali && !PENDIDIKAN_OPTIONS.includes(currentStudent.pendidikanWali) && (
                              <option value={currentStudent.pendidikanWali}>{currentStudent.pendidikanWali}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="label text-[11px] font-bold text-slate-700">Pekerjaan Wali</label>
                          <select 
                            className="input text-xs bg-white font-medium" 
                            value={currentStudent.pekerjaanWali || ''} 
                            onChange={e => setCurrentStudent({...currentStudent, pekerjaanWali: e.target.value})} 
                          >
                            <option value="">-- Pilih Pekerjaan Wali --</option>
                            {PEKERJAAN_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {currentStudent.pekerjaanWali && !PEKERJAAN_OPTIONS.includes(currentStudent.pekerjaanWali) && (
                              <option value={currentStudent.pekerjaanWali}>{currentStudent.pekerjaanWali}</option>
                            )}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label text-[11px] font-bold text-slate-700">Penghasilan Bulanan Wali</label>
                        <select 
                          className="input text-xs bg-white" 
                          value={currentStudent.penghasilanWali || ''} 
                          onChange={e => setCurrentStudent({...currentStudent, penghasilanWali: e.target.value})}
                        >
                          <option value="">-- Pilih Penghasilan Wali --</option>
                          {PENGHASILAN_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {currentStudent.penghasilanWali && !PENGHASILAN_OPTIONS.includes(currentStudent.penghasilanWali) && (
                            <option value={currentStudent.penghasilanWali}>{currentStudent.penghasilanWali}</option>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'berkas' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-start gap-3">
                      <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-xs text-indigo-950">Kelola 16 Berkas Dokumen & Foto Siswa</h5>
                        <p className="text-xs text-indigo-900 leading-relaxed mt-0.5">
                          Unggah file langsung ke Google Drive melalui Web App, atau tempelkan URL berkas secara manual. Semua 16 berkas otomatis tercatat dan disinkronkan ke Sheet <strong>SISWA</strong> dan <strong>BERKAS_SISWA</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {[
                        { key: 'foto', label: '1. Pas Foto Siswa (3x4 / 4x6)', accept: 'image/*', url: currentStudent.fotoUrl, isImg: true, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, fotoUrl: v, pasFoto: v })) },
                        { key: 'akta', label: '2. Akta Kelahiran (AktaKelahiran)', accept: '.pdf,image/*', url: currentStudent.aktaKelahiranUrl || currentStudent.akteUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, aktaKelahiranUrl: v, akteUrl: v })) },
                        { key: 'kk', label: '3. Kartu Keluarga (KartuKeluarga)', accept: '.pdf,image/*', url: currentStudent.kartuKeluargaUrl || currentStudent.kkUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, kartuKeluargaUrl: v, kkUrl: v })) },
                        { key: 'kia', label: '4. Kartu Identitas Anak (KIA / KTP Anak)', accept: '.pdf,image/*', url: currentStudent.kiaUrl || currentStudent.ktpAnakUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, kiaUrl: v, ktpAnakUrl: v })) },
                        { key: 'ktpAyah', label: '5. KTP Ayah Kandung (KTPAyah)', accept: '.pdf,image/*', url: currentStudent.ktpAyahUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, ktpAyahUrl: v })) },
                        { key: 'ktpIbu', label: '6. KTP Ibu Kandung (KTPIbu)', accept: '.pdf,image/*', url: currentStudent.ktpIbuUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, ktpIbuUrl: v })) },
                        { key: 'ijazah', label: '7. Ijazah / SKL (Ijazah)', accept: '.pdf,image/*', url: currentStudent.ijazahUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, ijazahUrl: v })) },
                        { key: 'ktpWali', label: '8. KTP Wali Murid (KTPWali)', accept: '.pdf,image/*', url: currentStudent.ktpWaliUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, ktpWaliUrl: v })) },
                        { key: 'rapor', label: '9. Buku Rapor / Nilai (Rapor)', accept: '.pdf,image/*', url: currentStudent.raporUrl || currentStudent.rapotUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, raporUrl: v, rapotUrl: v })) },
                        { key: 'suratPindah', label: '10. Surat Pindah / Mutasi (S.Pindah)', accept: '.pdf,image/*', url: currentStudent.suratPindahUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, suratPindahUrl: v })) },
                        { key: 'suKet', label: '11. Surat Keterangan / SuKet (SuKet)', accept: '.pdf,image/*', url: currentStudent.suKetUrl || currentStudent.dokumenLainUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, suKetUrl: v, dokumenLainUrl: v })) },
                        { key: 'suratDomisili', label: '12. Surat Domisili / KIP (S.Domisili)', accept: '.pdf,image/*', url: currentStudent.suratDomisiliUrl || currentStudent.kipUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, suratDomisiliUrl: v, kipUrl: v })) },
                        { key: 'formPendaftaran', label: '13. Form Pendaftaran (FormPendaftaran)', accept: '.pdf,image/*', url: currentStudent.formPendaftaranUrl || currentStudent.formUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, formPendaftaranUrl: v, formUrl: v })) },
                        { key: 'suratPernyataan', label: '14. Surat Pernyataan (SPernyataan)', accept: '.pdf,image/*', url: currentStudent.suratPernyataanUrl || currentStudent.sPernyataanUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, suratPernyataanUrl: v, sPernyataanUrl: v })) },
                        { key: 'suratKesanggupan', label: '15. Surat Kesanggupan (SKesanggupan)', accept: '.pdf,image/*', url: currentStudent.suratKesanggupanUrl || currentStudent.sKesanggupanUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, suratKesanggupanUrl: v, sKesanggupanUrl: v })) },
                        { key: 'berkasLainnya', label: '16. Berkas Tambahan / Lainnya (BerkasLainnya)', accept: '.pdf,image/*', url: currentStudent.berkasLainnyaUrl, setUrl: (v: string) => setCurrentStudent(s => ({ ...s, berkasLainnyaUrl: v })) },
                      ].map(doc => (
                        <div key={doc.key} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 truncate">
                                <FileText size={13} className="text-indigo-600 shrink-0" />
                                <span className="truncate">{doc.label}</span>
                              </label>
                              {doc.url ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                                  ✓ Terunggah
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 shrink-0">
                                  Belum Ada
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <input 
                                type="file" 
                                accept={doc.accept}
                                className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer w-full" 
                                onChange={e => handleFileUpload(e, doc.key)} 
                                disabled={uploadingState[doc.key]} 
                              />
                            </div>
                            {uploadingState[doc.key] && (
                              <p className="text-[10px] text-indigo-600 font-bold animate-pulse mt-1 flex items-center gap-1">
                                <RefreshCw size={10} className="animate-spin" /> Mengunggah ke Google Drive...
                              </p>
                            )}

                            {/* Manual URL Link Input */}
                            <div className="mt-2">
                              <input 
                                type="url" 
                                placeholder="Tempel URL berkas (Google Drive / Link Cloud)..." 
                                className="input text-[11px] py-1 px-2.5 bg-white" 
                                value={doc.url || ''} 
                                onChange={e => doc.setUrl(e.target.value)} 
                              />
                            </div>
                          </div>

                          {doc.url && (
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                              {doc.isImg ? (
                                <div className="flex items-center gap-2">
                                  <img 
                                    src={getGoogleDriveDirectImageUrl(doc.url)} 
                                    alt="Foto" 
                                    className="w-7 h-9 object-cover rounded border border-slate-300" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                    <Eye size={12} /> Buka Foto ↗
                                  </a>
                                </div>
                              ) : (
                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                  <Eye size={12} /> Buka Berkas Dokumen ↗
                                </a>
                              )}
                              <button 
                                type="button" 
                                onClick={() => doc.setUrl('')} 
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline"
                              >
                                Bersihkan
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <div className="flex gap-2">
                  {modalTab !== 'berkas' ? (
                    <button 
                      type="button" 
                      onClick={() => {
                        if (modalTab === 'biodata') setModalTab('alamat');
                        else if (modalTab === 'alamat') setModalTab('ortu');
                        else if (modalTab === 'ortu') setModalTab('berkas');
                      }} 
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition"
                    >
                      Selanjutnya →
                    </button>
                  ) : null}
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition"
                  >
                    Simpan Data Siswa
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* IMPORT PREVIEW MODAL                                      */}
      {/* ========================================================= */}
      {importPreview && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[110] p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                  <FileSpreadsheet size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Pratinjau Import Excel Siswa</h3>
                  <p className="text-[11px] text-emerald-100">File: {importPreview.fileName} • Terdeteksi {importPreview.parsedData.length} baris data</p>
                </div>
              </div>
              <button onClick={() => setImportPreview(null)} className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Pilihan Mode Import */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-xs text-emerald-950">Pilih Kebijakan Duplikasi Data:</h5>
                  <p className="text-[11px] text-emerald-800/80">Jika NIS, NISN, atau Nama siswa sudah ada sebelumnya di database</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="UPDATE" 
                      checked={importMode === 'UPDATE'} 
                      onChange={() => setImportMode('UPDATE')} 
                    />
                    <span className="font-semibold text-emerald-950">Perbarui (Update)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="SKIP_EXISTING" 
                      checked={importMode === 'SKIP_EXISTING'} 
                      onChange={() => setImportMode('SKIP_EXISTING')} 
                    />
                    <span className="font-semibold text-emerald-950">Lewati Duplikat</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="ADD_ALL" 
                      checked={importMode === 'ADD_ALL'} 
                      onChange={() => setImportMode('ADD_ALL')} 
                    />
                    <span className="font-semibold text-emerald-950">Tambah Semua Baru</span>
                  </label>
                </div>
              </div>

              {/* Table Preview 10 Sample Rows */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">No</th>
                      <th className="p-2.5">NIS</th>
                      <th className="p-2.5">NISN</th>
                      <th className="p-2.5">Nama Lengkap</th>
                      <th className="p-2.5">Kelas</th>
                      <th className="p-2.5">L/P</th>
                      <th className="p-2.5">TTL</th>
                      <th className="p-2.5">Orang Tua</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.parsedData.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-400 font-mono">{i + 1}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{row.nis || '-'}</td>
                        <td className="p-2.5 font-mono text-slate-500">{row.nisn || '-'}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.name || '-'}</td>
                        <td className="p-2.5 font-bold text-indigo-700">{row.class || '1A'}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{row.gender || 'L'}</td>
                        <td className="p-2.5 text-slate-600">{row.pob ? `${row.pob}, ` : ''}{row.dob || '-'}</td>
                        <td className="p-2.5 text-slate-600">{row.parentName || row.namaAyah || '-'}</td>
                        <td className="p-2.5 font-semibold text-emerald-700">{row.status || 'Aktif'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importPreview.parsedData.length > 50 && (
                <p className="text-[11px] text-slate-500 italic text-center">
                  * Menampilkan 50 data pertama dari total {importPreview.parsedData.length} data.
                </p>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button 
                onClick={() => setImportPreview(null)} 
                disabled={isProcessingImport}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmImport} 
                disabled={isProcessingImport}
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-200 transition flex items-center gap-1.5"
              >
                {isProcessingImport ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses Import...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Konfirmasi Import {importPreview.parsedData.length} Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PRINT DAFTAR SISWA RESMI                            */}
      {/* ========================================================= */}
      {isPrintListMode && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[120] p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Top Toolbar (No-Print) */}
            <div className="px-6 py-4 bg-indigo-950 text-white flex justify-between items-center no-print shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                  <Printer size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Pratinjau Cetak Daftar Siswa</h3>
                  <p className="text-[11px] text-indigo-200">
                    {filterClass ? `Kelas ${filterClass}` : 'Semua Kelas'} • {filteredStudents.length} Siswa Terpilih
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={triggerPrint} 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button 
                  onClick={() => setIsPrintListMode(false)} 
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-6 sm:p-10 overflow-y-auto bg-white flex-1" id="printable-area">
              {/* Kop Surat Sekolah */}
              <div className="flex items-center justify-between border-b-4 border-double border-slate-900 pb-3 mb-6">
                <div className="w-20 h-20 flex items-center justify-center shrink-0">
                  {settings.logoUrl ? (
                    <img src={getGoogleDriveDirectImageUrl(settings.logoUrl)} alt="Logo" className="max-h-20 max-w-20 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center font-black text-xs text-indigo-900">
                      <span>Rombel</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center px-4">
                  <h4 className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                    PEMERINTAH KABUPATEN / KOTA {settings.kabupaten?.toUpperCase() || ''}
                  </h4>
                  <h4 className="text-xs uppercase font-bold text-slate-700">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN
                  </h4>
                  <h2 className="text-xl font-black text-slate-950 tracking-tight uppercase">
                    {settings.namaSekolah || 'SISTA ROMBEL'}
                  </h2>
                  <p className="text-[10.5px] text-slate-600 font-medium">
                    {settings.alamat || ''} {settings.desa ? `Desa ${settings.desa}, ` : ''}{settings.kecamatan ? `Kec. ${settings.kecamatan}, ` : ''}{settings.kabupaten || ''} {settings.kodePos || ''}
                  </p>
                  <p className="text-[9.5px] text-slate-500 font-mono">
                    {settings.npsn ? `NPSN: ${settings.npsn} | ` : ''}{settings.email ? `Email: ${settings.email} | ` : ''}{settings.telepon || settings.kontak ? `Telp: ${settings.telepon || settings.kontak}` : ''}
                  </p>
                </div>
                <div className="w-20 h-20 flex items-center justify-center shrink-0">
                  <div className="w-16 h-16 rounded-2xl border border-slate-300 flex flex-col items-center justify-center text-[9px] font-bold text-slate-400 text-center leading-tight">
                    <span>TUT WURI</span>
                    <span>HANDAYANI</span>
                  </div>
                </div>
              </div>

              {/* Judul Dokumen */}
              <div className="text-center mb-6">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                  DAFTAR PESERTA DIDIK {filterClass ? `KELAS ${filterClass}` : 'SEMUA KELAS'}
                </h3>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Tahun Pelajaran: {settings.tahunPelajaran || '2026/2027'} • Semester: {settings.semester || '1 (Ganjil)'}
                </p>
                <div className="flex justify-center gap-4 text-[11px] font-bold text-slate-700 mt-2">
                  <span className="px-2.5 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                    Total Siswa: {filteredStudents.length} Orang
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-900 rounded-md border border-blue-200">
                    Laki-laki (L): {filteredStudents.filter(s => s.gender === 'L').length}
                  </span>
                  <span className="px-2.5 py-0.5 bg-rose-50 text-rose-900 rounded-md border border-rose-200">
                    Perempuan (P): {filteredStudents.filter(s => s.gender === 'P').length}
                  </span>
                </div>
              </div>

              {/* Tabel Daftar Siswa */}
              <table className="w-full border-collapse border border-slate-800 text-[10.5px] print-table">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-800">
                    <th className="border border-slate-800 p-2 text-center w-8">No</th>
                    <th className="border border-slate-800 p-2 text-center w-20">NIS / NISN</th>
                    <th className="border border-slate-800 p-2 text-left">Nama Lengkap</th>
                    <th className="border border-slate-800 p-2 text-center w-10">L/P</th>
                    <th className="border border-slate-800 p-2 text-center w-12">Kelas</th>
                    <th className="border border-slate-800 p-2 text-left">Tempat, Tanggal Lahir</th>
                    <th className="border border-slate-800 p-2 text-left">Nama Orang Tua / Wali</th>
                    <th className="border border-slate-800 p-2 text-left">Alamat Tempat Tinggal</th>
                    <th className="border border-slate-800 p-2 text-center w-16">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {filteredStudents.map((s, idx) => (
                    <tr key={s.id || idx} className="hover:bg-slate-50">
                      <td className="border border-slate-800 p-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono">
                        <div className="font-bold">{s.nis || '-'}</div>
                        <div className="text-[9px] text-slate-600">{s.nisn || '-'}</div>
                      </td>
                      <td className="border border-slate-800 p-1.5 font-bold">{s.name}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-bold">{s.gender}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-bold">{s.class}</td>
                      <td className="border border-slate-800 p-1.5">
                        {s.pob ? `${s.pob}, ` : ''}{formatDate(s.dob)}
                      </td>
                      <td className="border border-slate-800 p-1.5">
                        {s.parentName || s.namaAyah || s.namaIbu || '-'}
                      </td>
                      <td className="border border-slate-800 p-1.5 text-[9.5px]">
                        {(() => {
                          const cleanRt = s.rt && s.rt !== '-' ? String(s.rt).replace(/^RT[\s.:]*/i, '').trim() : '';
                          const cleanRw = s.rw && s.rw !== '-' ? String(s.rw).replace(/^RW[\s.:]*/i, '').trim() : '';
                          return s.address || s.kelurahan ? `${s.address || ''} ${cleanRt ? `RT ${cleanRt}` : ''} ${cleanRw ? `RW ${cleanRw}` : ''} ${s.kelurahan || ''} ${s.kecamatan || ''}`.trim() : '-';
                        })()}
                      </td>
                      <td className="border border-slate-800 p-1.5 text-center font-semibold text-[9.5px]">
                        {s.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tanda Tangan */}
              <div className="mt-8 pt-4 flex justify-between items-start text-xs text-slate-900 break-inside-avoid">
                <div className="text-center w-60">
                  <p className="mb-1">Mengetahui,</p>
                  <p className="font-bold uppercase">Kepala Sekolah</p>
                  <div className="h-20"></div>
                  <p className="font-bold underline uppercase">
                    {settings.kepalaSekolah || kepsek?.name || '...........................................'}
                  </p>
                  <p className="font-mono text-[11px]">
                    NIP. {settings.nipKepalaSekolah || kepsek?.nip || '...........................................'}
                  </p>
                </div>

                <div className="text-center w-60">
                  <p className="mb-1">
                    {settings.kabupaten || 'Tempat'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="font-bold uppercase">
                    {filterClass ? `Wali Kelas ${filterClass}` : 'Guru / Petugas Pendataan'}
                  </p>
                  <div className="h-20"></div>
                  <p className="font-bold underline uppercase">
                    {waliKelas?.name || '...........................................'}
                  </p>
                  <p className="font-mono text-[11px]">
                    NIP. {waliKelas?.nip || '...........................................'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PRINT BIODATA F-SEK & KARTU PELAJAR (PER SISWA)     */}
      {/* ========================================================= */}
      {printStudent && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[120] p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
            {/* Top Toolbar (No-Print) */}
            <div className="px-6 py-4 bg-indigo-950 text-white flex flex-wrap justify-between items-center gap-3 no-print shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                  <Printer size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Cetak Dokumen: {printStudent.name}</h3>
                  <p className="text-[11px] text-indigo-200">NIS: {printStudent.nis} • Kelas {printStudent.class}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Switcher Tab */}
                <div className="flex bg-white/10 p-1 rounded-xl">
                  <button 
                    onClick={() => setPrintStudentDocType('biodata')} 
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                      printStudentDocType === 'biodata' ? "bg-white text-indigo-950 shadow-sm" : "text-white/80 hover:text-white"
                    )}
                  >
                    Formulir Biodata (F-SEK)
                  </button>
                  <button 
                    onClick={() => setPrintStudentDocType('kartu')} 
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition",
                      printStudentDocType === 'kartu' ? "bg-white text-indigo-950 shadow-sm" : "text-white/80 hover:text-white"
                    )}
                  >
                    Kartu Pelajar (ID Card)
                  </button>
                </div>

                <button 
                  onClick={triggerPrint} 
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Sekarang</span>
                </button>
                <button 
                  onClick={() => setPrintStudent(null)} 
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-6 sm:p-10 overflow-y-auto bg-white flex-1" id="printable-area">
              {printStudentDocType === 'biodata' ? (
                /* FORMULIR BIODATA SISWA (F-SEK RESMI KEMDIKBUD) */
                <div className="space-y-4 text-slate-900 text-xs">
                  {/* Kop Surat Sekolah */}
                  <div className="flex items-center justify-between border-b-4 border-double border-slate-900 pb-3 mb-4">
                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                      {settings.logoUrl ? (
                        <img src={getGoogleDriveDirectImageUrl(settings.logoUrl)} alt="Logo" className="max-h-16 max-w-16 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-950">
                          ROMBEL
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-center px-4">
                      <h4 className="text-[11px] uppercase font-bold text-slate-700">
                        PEMERINTAH KABUPATEN / KOTA {settings.kabupaten?.toUpperCase() || ''}
                      </h4>
                      <h4 className="text-[11px] uppercase font-bold text-slate-700">
                        DINAS PENDIDIKAN DAN KEBUDAYAAN
                      </h4>
                      <h2 className="text-base font-black text-slate-950 tracking-tight uppercase">
                        {settings.namaSekolah || 'SISTA ROMBEL'}
                      </h2>
                      <p className="text-[10px] text-slate-600 font-medium">
                        {settings.alamat || ''} {settings.desa ? `Desa ${settings.desa}, ` : ''}{settings.kecamatan ? `Kec. ${settings.kecamatan}, ` : ''}{settings.kabupaten || ''} {settings.kodePos || ''}
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        {settings.npsn ? `NPSN: ${settings.npsn} | ` : ''}{settings.email ? `Email: ${settings.email} | ` : ''}{settings.telepon || settings.kontak ? `Telp: ${settings.telepon || settings.kontak}` : ''}
                      </p>
                    </div>
                    <div className="w-16 h-16 flex items-center justify-center shrink-0">
                      <div className="w-14 h-14 rounded-2xl border border-slate-300 flex flex-col items-center justify-center text-[8.5px] font-bold text-slate-400 text-center leading-tight">
                        <span>TUT WURI</span>
                        <span>HANDAYANI</span>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-4">
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">
                      LEMBAR DATA POKOK PESERTA DIDIK (F-SEK)
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-600">
                      Tahun Pelajaran: {settings.tahunPelajaran || '2026/2027'} • Kelas: {printStudent.class}
                    </p>
                  </div>

                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-4">
                      {/* Section A: Identitas Siswa */}
                      <div>
                        <h4 className="font-bold text-xs uppercase bg-slate-100 px-2 py-1 border border-slate-300 mb-2">
                          A. IDENTITAS PESERTA DIDIK
                        </h4>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 w-44 font-semibold text-slate-700">1. Nama Lengkap</td>
                              <td className="py-1 w-3 text-center">:</td>
                              <td className="py-1 font-bold text-slate-900">{printStudent.name}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">2. Jenis Kelamin</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">{printStudent.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">3. NIS / NISN</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1 font-mono font-bold">{printStudent.nis || '-'} / {printStudent.nisn || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">4. NIK / No. KK</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1 font-mono">{printStudent.nik || '-'} / {printStudent.noKk || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">5. Tempat, Tanggal Lahir</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">{printStudent.pob || '-'}, {formatDate(printStudent.dob)} ({formatAge(printStudent.dob)})</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">6. Agama & Kepercayaan</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">{printStudent.agama || 'Islam'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">7. Anak ke / Dari Saudara</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">Anak ke-{printStudent.anakKe || '1'} dari {printStudent.saudara || '1'} bersaudara</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">8. Golongan Darah / Fisik</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">Gol. Darah: {printStudent.golonganDarah || '-'} | TB: {printStudent.tinggiBadan || '-'} cm | BB: {printStudent.beratBadan || '-'} kg</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Section B: Alamat */}
                      <div>
                        <h4 className="font-bold text-xs uppercase bg-slate-100 px-2 py-1 border border-slate-300 mb-2">
                          B. ALAMAT TEMPAT TINGGAL
                        </h4>
                        <table className="w-full text-xs">
                          <tbody>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 w-44 font-semibold text-slate-700">1. Alamat Jalan / Blok</td>
                              <td className="py-1 w-3 text-center">:</td>
                              <td className="py-1">{printStudent.address || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">2. RT / RW / Dusun</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">
                                {(() => {
                                  const cleanRt = printStudent.rt && printStudent.rt !== '-' ? String(printStudent.rt).replace(/^RT[\s.:]*/i, '').trim() : '-';
                                  const cleanRw = printStudent.rw && printStudent.rw !== '-' ? String(printStudent.rw).replace(/^RW[\s.:]*/i, '').trim() : '-';
                                  return `RT ${cleanRt} / RW ${cleanRw}`;
                                })()}
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">3. Kelurahan / Desa</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">{printStudent.kelurahan || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">4. Kecamatan / Kota</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">{printStudent.kecamatan || '-'}, {printStudent.kota || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">5. Provinsi & Kode Pos</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">{printStudent.provinsi || '-'} (Kode Pos: {printStudent.kodePos || '-'})</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">6. Jenis Tinggal / Transportasi</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1">{printStudent.jenisTinggal || 'Bersama Orang Tua'} / {printStudent.alatTransportasi || 'Jalan Kaki'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td className="py-1 font-semibold text-slate-700">7. No. HP / WhatsApp</td>
                              <td className="py-1 text-center">:</td>
                              <td className="py-1 font-mono font-bold text-emerald-700">{printStudent.noHp || '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pas Foto Box */}
                    <div className="w-28 flex flex-col items-center shrink-0">
                      <div className="w-28 h-36 border-2 border-slate-400 bg-slate-50 flex flex-col items-center justify-center p-1 text-center">
                        {printStudent.fotoUrl ? (
                          <img 
                            src={getGoogleDriveDirectImageUrl(printStudent.fotoUrl)} 
                            alt={printStudent.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-[10px] text-slate-400">
                            <span>Pas Foto</span><br />
                            <span className="font-bold">3 x 4</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1">Foto Peserta Didik</span>
                    </div>
                  </div>

                  {/* Section C: Data Orang Tua / Wali */}
                  <div className="mt-3">
                    <h4 className="font-bold text-xs uppercase bg-slate-100 px-2 py-1 border border-slate-300 mb-2">
                      C. DATA ORANG TUA / WALI
                    </h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 w-44 font-semibold text-slate-700">1. Nama Ayah Kandung</td>
                          <td className="py-1 w-3 text-center">:</td>
                          <td className="py-1 font-bold">{printStudent.namaAyah || '-'} (NIK: {printStudent.nikAyah || '-'})</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 font-semibold text-slate-700">2. Pekerjaan & Kontak Ayah</td>
                          <td className="py-1 text-center">:</td>
                          <td className="py-1">{printStudent.pekerjaanAyah || '-'} | Telp/HP: {printStudent.tlpAyah || '-'}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 font-semibold text-slate-700">3. Nama Ibu Kandung</td>
                          <td className="py-1 text-center">:</td>
                          <td className="py-1 font-bold">{printStudent.namaIbu || '-'} (NIK: {printStudent.nikIbu || '-'})</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 font-semibold text-slate-700">4. Pekerjaan & Kontak Ibu</td>
                          <td className="py-1 text-center">:</td>
                          <td className="py-1">{printStudent.pekerjaanIbu || '-'} | Telp/HP: {printStudent.tlpIbu || '-'}</td>
                        </tr>
                        {printStudent.namaWali && (
                          <tr className="border-b border-slate-100">
                            <td className="py-1 font-semibold text-slate-700">5. Nama Wali & Kontak</td>
                            <td className="py-1 text-center">:</td>
                            <td className="py-1">{printStudent.namaWali} | Telp: {printStudent.tlpWali || '-'}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Section D: Riwayat & Sekolah Asal */}
                  <div className="mt-3">
                    <h4 className="font-bold text-xs uppercase bg-slate-100 px-2 py-1 border border-slate-300 mb-2">
                      D. DATA REGISTRASI & SEKOLAH ASAL
                    </h4>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 w-44 font-semibold text-slate-700">1. Asal Sekolah (TK/RA)</td>
                          <td className="py-1 w-3 text-center">:</td>
                          <td className="py-1">{printStudent.sekolahAsal || '-'}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 font-semibold text-slate-700">2. Tahun Masuk / Kelas</td>
                          <td className="py-1 text-center">:</td>
                          <td className="py-1">{printStudent.tahunMasuk || '-'} / Kelas {printStudent.class}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 font-semibold text-slate-700">3. Penerima KPS / KIP</td>
                          <td className="py-1 text-center">:</td>
                          <td className="py-1">{printStudent.penerimaKps || 'Tidak'}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-1 font-semibold text-slate-700">4. Catatan / Prestasi</td>
                          <td className="py-1 text-center">:</td>
                          <td className="py-1">{printStudent.prestasi || printStudent.catatanPenting || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Tanda Tangan */}
                  <div className="mt-8 pt-4 flex justify-between items-start text-xs text-slate-900 break-inside-avoid">
                    <div className="text-center w-56">
                      <p className="mb-1">Orang Tua / Wali Murid,</p>
                      <div className="h-16"></div>
                      <p className="font-bold underline uppercase">
                        {printStudent.namaAyah || printStudent.namaIbu || printStudent.parentName || '( ........................................... )'}
                      </p>
                    </div>

                    <div className="text-center w-56">
                      <p className="mb-1">
                        {settings.kabupaten || 'Tempat'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="font-bold uppercase">Kepala Sekolah</p>
                      <div className="h-16"></div>
                      <p className="font-bold underline uppercase">
                        {settings.kepalaSekolah || kepsek?.name || '...........................................'}
                      </p>
                      <p className="font-mono text-[10px]">
                        NIP. {settings.nipKepalaSekolah || kepsek?.nip || '...........................................'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* KARTU TANDA PELAJAR (STUDENT ID CARD) */
                <div className="flex flex-col items-center justify-center py-6 space-y-8">
                  <div className="text-center no-print">
                    <h4 className="font-bold text-sm text-slate-800">Pratinjau Kartu Tanda Pelajar (Standar Ukuran ID Card)</h4>
                    <p className="text-xs text-slate-500">Tampilan Kartu Tampak Depan dan Tampak Belakang</p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-8">
                    {/* Kartu Depan */}
                    <div className="w-[340px] h-[215px] bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl p-4 shadow-xl relative overflow-hidden border border-indigo-700 flex flex-col justify-between">
                      {/* Background Watermark */}
                      <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                        <Users size={180} />
                      </div>

                      {/* Header Kartu */}
                      <div className="flex items-center gap-2.5 border-b border-indigo-600/60 pb-2 relative z-10">
                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          {settings.logoUrl ? (
                            <img src={getGoogleDriveDirectImageUrl(settings.logoUrl)} alt="Logo" className="max-h-8 max-w-8 object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="font-black text-xs text-amber-300">SD</span>
                          )}
                        </div>
                        <div className="leading-tight flex-1">
                          <h5 className="text-[9px] uppercase font-bold tracking-wider text-amber-300">KARTU TANDA PELAJAR</h5>
                          <h4 className="text-xs font-black tracking-tight text-white uppercase truncate">{settings.namaSekolah || 'SISTA ROMBEL'}</h4>
                          <p className="text-[8px] text-indigo-200">NPSN: {settings.npsn || '10000000'} • TP. {settings.tahunPelajaran || '2026/2027'}</p>
                        </div>
                      </div>

                      {/* Body Kartu */}
                      <div className="flex items-center gap-3.5 my-auto relative z-10">
                        <div className="w-18 h-22 rounded-xl bg-white/20 border-2 border-amber-300/80 overflow-hidden shrink-0 flex items-center justify-center">
                          {printStudent.fotoUrl ? (
                            <img 
                              src={getGoogleDriveDirectImageUrl(printStudent.fotoUrl)} 
                              alt={printStudent.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-2xl font-black text-white/50">{printStudent.name[0]}</span>
                          )}
                        </div>

                        <div className="space-y-1 text-[10px] flex-1">
                          <div className="font-black text-sm text-amber-300 truncate">{printStudent.name}</div>
                          <div className="text-indigo-100 font-mono text-[9.5px]">
                            NIS : <strong className="text-white">{printStudent.nis}</strong>
                          </div>
                          <div className="text-indigo-100 font-mono text-[9.5px]">
                            NISN: <strong className="text-white">{printStudent.nisn || '-'}</strong>
                          </div>
                          <div className="text-indigo-100 text-[9px]">
                            TTL : {printStudent.pob || '-'}, {formatDate(printStudent.dob)}
                          </div>
                          <div className="text-indigo-100 text-[9px]">
                            Kelas: <strong className="text-white font-bold">{printStudent.class}</strong> ({printStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                          </div>
                        </div>
                      </div>

                      {/* Footer Kartu */}
                      <div className="flex justify-between items-end border-t border-indigo-600/50 pt-1.5 text-[8px] text-indigo-200 relative z-10">
                        <div>
                          <span>Berlaku selama menjadi siswa aktif</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white uppercase">{settings.kabupaten || 'Kepala Sekolah'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Kartu Belakang */}
                    <div className="w-[340px] h-[215px] bg-slate-900 text-slate-200 rounded-2xl p-4 shadow-xl relative overflow-hidden border border-slate-700 flex flex-col justify-between text-[9px]">
                      <div>
                        <h5 className="font-bold text-amber-400 text-center uppercase tracking-wider mb-2 border-b border-slate-700 pb-1">
                          TATA TERTIB PEMEGANG KARTU
                        </h5>
                        <ol className="list-decimal list-inside space-y-1 text-[8.5px] text-slate-300 leading-relaxed">
                          <li>Kartu ini adalah bukti identitas sah siswa {settings.namaSekolah || 'Sekolah'}.</li>
                          <li>Wajib dibawa setiap hari saat mengikuti kegiatan di sekolah.</li>
                          <li>Tidak boleh dipinjamkan atau disalahgunakan oleh pihak lain.</li>
                          <li>Jika menemukan kartu ini, harap kembalikan ke alamat sekolah di bawah ini.</li>
                        </ol>
                      </div>

                      <div className="border-t border-slate-700 pt-2 text-[8px] text-slate-400 flex justify-between items-end">
                        <div>
                          <p className="font-bold text-white uppercase">{settings.namaSekolah}</p>
                          <p>{settings.alamat || ''} {settings.kabupaten || ''}</p>
                          <p>Telp: {settings.telepon || settings.kontak || '-'} | Email: {settings.email || '-'}</p>
                        </div>
                        <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
                          <span className="font-mono text-[7px] text-slate-900 font-bold text-center">QR CODE</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL PRINT KARTU PELAJAR KOLEKTIF (KELAS AKTIF)          */}
      {/* ========================================================= */}
      {isPrintCardsMode && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[120] p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
            <div className="px-6 py-4 bg-amber-950 text-white flex justify-between items-center no-print shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                  <Award size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Cetak Kartu Pelajar Kolektif</h3>
                  <p className="text-[11px] text-amber-200">
                    {filterClass ? `Kelas ${filterClass}` : 'Semua Kelas'} • {filteredStudents.length} Siswa
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={triggerPrint} 
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Lembar Kartu</span>
                </button>
                <button 
                  onClick={() => setIsPrintCardsMode(false)} 
                  className="p-2 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-10 overflow-y-auto bg-white flex-1" id="printable-area">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredStudents.map((s, idx) => (
                  <div key={s.id || idx} className="w-full max-w-[340px] mx-auto h-[215px] bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white rounded-2xl p-4 shadow-md relative overflow-hidden border border-indigo-700 flex flex-col justify-between break-inside-avoid">
                    <div className="flex items-center gap-2.5 border-b border-indigo-600/60 pb-2 relative z-10">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        {settings.logoUrl ? (
                          <img src={getGoogleDriveDirectImageUrl(settings.logoUrl)} alt="Logo" className="max-h-7 max-w-7 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="font-black text-[10px] text-amber-300">SD</span>
                        )}
                      </div>
                      <div className="leading-tight flex-1">
                        <h5 className="text-[8px] uppercase font-bold tracking-wider text-amber-300">KARTU TANDA PELAJAR</h5>
                        <h4 className="text-[11px] font-black tracking-tight text-white uppercase truncate">{settings.namaSekolah || 'SISTA ROMBEL'}</h4>
                        <p className="text-[7.5px] text-indigo-200">NPSN: {settings.npsn || '10000000'} • TP. {settings.tahunPelajaran || '2026/2027'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 my-auto relative z-10">
                      <div className="w-16 h-20 rounded-xl bg-white/20 border-2 border-amber-300/80 overflow-hidden shrink-0 flex items-center justify-center">
                        {s.fotoUrl ? (
                          <img 
                            src={getGoogleDriveDirectImageUrl(s.fotoUrl)} 
                            alt={s.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-xl font-black text-white/50">{s.name ? s.name[0] : 'S'}</span>
                        )}
                      </div>

                      <div className="space-y-0.5 text-[9px] flex-1">
                        <div className="font-black text-xs text-amber-300 truncate">{s.name}</div>
                        <div className="text-indigo-100 font-mono text-[9px]">
                          NIS: <strong className="text-white">{s.nis}</strong>
                        </div>
                        <div className="text-indigo-100 font-mono text-[9px]">
                          NISN: <strong className="text-white">{s.nisn || '-'}</strong>
                        </div>
                        <div className="text-indigo-100 text-[8.5px] truncate">
                          TTL: {s.pob || '-'}, {formatDate(s.dob)}
                        </div>
                        <div className="text-indigo-100 text-[8.5px]">
                          Kelas: <strong className="text-white font-bold">{s.class}</strong> ({s.gender})
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-indigo-600/50 pt-1.5 text-[7.5px] text-indigo-200 relative z-10">
                      <span>Berlaku: Siswa Aktif</span>
                      <span className="font-bold text-white uppercase">{settings.kabupaten || 'Kepala Sekolah'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FLOATING BULK ACTION BAR                                  */}
      {/* ========================================================= */}
      {selectedStudentIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
            <span className="text-xs font-black text-indigo-200">
              <strong className="text-white text-sm">{selectedStudentIds.length}</strong> Siswa Dipilih
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleToggleSelectAllPage}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition border border-slate-600 cursor-pointer"
            >
              {isAllCurrentPageSelected ? 'Batal Pilih Halaman Ini' : `Pilih Hal Ini (${paginatedStudents.length})`}
            </button>

            {filteredStudents.length > paginatedStudents.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-indigo-300 transition border border-slate-600 cursor-pointer"
              >
                Pilih Semua Terfilter ({filteredStudents.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 transition border border-slate-600 cursor-pointer"
            >
              Batal Pilih
            </button>
          </div>

          <div className="pl-2 border-l border-slate-700">
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Hapus {selectedStudentIds.length} Siswa Terpilih</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI HAPUS MASSAL / BANYAK SISWA              */}
      {/* ========================================================= */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-xs">
                <Trash2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  Hapus {selectedStudentIds.length} Siswa Terpilih?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini akan menghapus <strong>{selectedStudentIds.length} data siswa</strong> terpilih dari database aplikasi dan seluruh sheet Google Sheets (SISWA, ORANG_TUA, YATIM_PIATU, DAPODIK_VALIDASI).
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                <span>Daftar Siswa yang akan dihapus ({selectedStudentIds.length}):</span>
                <span className="text-[10px] text-slate-400 font-mono">Pratinjau Maks. 8 siswa</span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-200/80 rounded-xl bg-white border border-slate-200 p-1">
                {students
                  .filter(s => selectedStudentIds.includes(s.id))
                  .slice(0, 8)
                  .map(s => (
                    <div key={s.id} className="p-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 truncate max-w-[240px]">{s.name}</span>
                      <div className="flex items-center gap-2">
                        {s.nis && <span className="font-mono text-[10px] text-slate-500">{s.nis}</span>}
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px]">{s.class || '-'}</span>
                      </div>
                    </div>
                  ))}
                {selectedStudentIds.length > 8 && (
                  <div className="p-2 text-center text-[10px] font-bold text-slate-500 bg-slate-50">
                    ...dan {selectedStudentIds.length - 8} siswa lainnya terpilih
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menghapus {selectedStudentIds.length} Siswa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Ya, Hapus {selectedStudentIds.length} Siswa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI HAPUS SISWA                             */}
      {/* ========================================================= */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-xs">
                <Trash2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  Hapus Data Siswa?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini akan menghapus data siswa dari database aplikasi dan menyinkronkan perubahan ke Google Sheets.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Nama Siswa:</span>
                <span className="font-black text-slate-900 truncate max-w-[220px]">{studentToDelete.name}</span>
              </div>
              {studentToDelete.nis && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">NIS:</span>
                  <span className="font-mono font-bold text-slate-700">{studentToDelete.nis}</span>
                </div>
              )}
              {studentToDelete.class && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Kelas:</span>
                  <span className="font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px]">{studentToDelete.class}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={handleConfirmDeleteStudent}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isDeletingStudent ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Ya, Hapus Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL KONFIRMASI KOSONGKAN SEMUA SISWA                    */}
      {/* ========================================================= */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-xs">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-rose-950 leading-snug">
                  Kosongkan Semua Data Siswa?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  PERINGATAN: Seluruh <strong className="text-slate-800 font-bold">{students.length} data siswa & dapodik</strong> akan dikosongkan total dari memori aplikasi dan Google Sheets.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 rounded-2xl border border-rose-200 text-rose-900 text-xs font-medium space-y-1">
              <p className="font-bold">⚠️ Data yang dikosongkan tidak dapat dipulihkan kembali kecuali Anda memiliki file backup Excel atau spreadsheet.</p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isClearingAll}
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={handleConfirmClearAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isClearingAll ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Mengosongkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Ya, Kosongkan Semua</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
