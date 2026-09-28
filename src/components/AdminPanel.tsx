import React, { useState } from 'react';
import {
  ShieldCheck,
  FolderOpen,
  CalendarDays,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileText,
  UserCheck,
  KeyRound,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Users,
  UserPlus,
  UploadCloud,
  Phone,
  Filter,
  BookOpen,
  Home,
  GraduationCap,
  MapPin,
  FileCheck,
  Download,
  AlertTriangle,
  FileUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Award,
  Clock,
  Code2,
  Copy,
} from 'lucide-react';
import {
  StudentProfile,
  ExamSchedule,
  QuestionItem,
  ExamSubmission,
  UserAccount,
  ViolationRecord,
} from '../types';
import Swal from 'sweetalert2';
import { db } from '../data/db';
import { syncUserAccountsFromMasterData } from '../utils/studentSyncHelper';
import { StorageService } from '../services/storageService';
import { ExportService } from '../services/exportService';
import { ImportService, ImportParseResult } from '../services/importService';
import { StudentAvatar } from './StudentAvatar';
import { AdminRekapModal } from './AdminRekapModal';
import { matchStatusActive, normalizeClassName } from '../lib/utils';
import { exportToExcel } from '../lib/excel';

interface AdminPanelProps {
  onOpenStats: (student: StudentProfile) => void;
  onRefreshAll: () => void;
  onSendAlert?: () => void;
}

type AdminTab = 'OVERVIEW' | 'SISWA' | 'JADWAL' | 'SOAL' | 'NILAI' | 'PENGGUNA';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onOpenStats,
  onRefreshAll,
  onSendAlert,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');

  // Schedules state
  const [schedules, setSchedules] = useState<ExamSchedule[]>(StorageService.getSchedules());
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const [schedFilterKelas, setSchedFilterKelas] = useState<string>('ALL');
  const [schedFilterHari, setSchedFilterHari] = useState<string>('ALL');
  const [schedFilterStatus, setSchedFilterStatus] = useState<string>('ALL');
  const [schedSearch, setSchedSearch] = useState<string>('');

  // Question state
  const [questions, setQuestions] = useState<QuestionItem[]>(StorageService.getQuestions());
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState<string>('ALL');
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<QuestionItem>>({
    idUjian: 'PTS-MTK-9',
    mapel: 'Matematika Terapan',
    jenjang: 'Paket B',
    kelas: '9',
    tipe: 'PILIHAN_GANDA',
    soal: '',
    a: '',
    b: '',
    c: '',
    d: '',
    kunci: 'A',
    bobot: 20,
    status: 'AKTIF',
  });

  // Schedule modal
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState<Partial<ExamSchedule>>({
    idUjian: 'PTS-NEW',
    mapel: '',
    jenjang: 'Paket B',
    kelas: '9',
    tanggal: new Date().toISOString().substring(0, 10),
    jamMulai: '08:00',
    jamSelesai: '09:30',
    durasi: 45,
    token: 'KTCT' + Math.floor(10 + Math.random() * 90),
    status: 'AKTIF',
    tahunAjaran: '2025/2026',
  });

  // Students & Users & Nilai state
  const [students, setStudents] = useState<StudentProfile[]>(StorageService.getStudents());
  const [users, setUsers] = useState<UserAccount[]>(StorageService.getUsers());
  const [submissions, setSubmissions] = useState<ExamSubmission[]>(StorageService.getSubmissions());
  const [violations, setViolations] = useState<ViolationRecord[]>(StorageService.getViolations());

  // Nilai PTS filter states (Integrated from Teacher Panel)
  const [nilaiClassFilter, setNilaiClassFilter] = useState<string>('ALL');
  const [nilaiSubjectFilter, setNilaiSubjectFilter] = useState<string>('ALL');
  const [nilaiSearchTerm, setNilaiSearchTerm] = useState<string>('');

  // Spreadsheet direct sync state
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [sheetSyncResult, setSheetSyncResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bank Soal spreadsheet sync & Code.gs modal state
  const [showRekapModal, setShowRekapModal] = useState<boolean>(false);
  const [isSyncingBankSoal, setIsSyncingBankSoal] = useState<boolean>(false);
  const [bankSoalSyncMsg, setBankSoalSyncMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User management states
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [isGeneratingStudentUsers, setIsGeneratingStudentUsers] = useState<boolean>(false);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    nama: '',
    role: 'SISWA',
    nopdkt: '',
    password: '',
    email: '',
  });

  const handleBulkGenerateStudentAccounts = () => {
    setIsGeneratingStudentUsers(true);
    try {
      const allSiswa = db.get<any>('siswa') || db.get<any>('students') || StorageService.getStudents() || [];
      const res = StorageService.generateAllStudentAccounts(allSiswa);
      syncUserAccountsFromMasterData();
      const updated = StorageService.getUsers();
      setUsers(updated);
      setIsGeneratingStudentUsers(false);
      Swal.fire({
        title: 'Berhasil Membuat Akun Siswa & Orang Tua!',
        html: `
          <div class="text-left text-xs space-y-2">
            <p class="font-bold text-emerald-600">✓ ${res.count} akun Siswa & ${res.parentCount || res.count} akun Orang Tua berhasil dibuat / disinkronkan!</p>
            <p><strong>Username Siswa & Ortu:</strong> NISN masing-masing (atau No. PDKT).</p>
            <p><strong>Aturan Password:</strong> nama sebelum spasi (huruf kecil) + nomor PDKT.</p>
            <div class="bg-slate-100 p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] space-y-1 max-h-44 overflow-y-auto">
              ${res.samplePasswords.map(s => `<div><strong>${s.nama}</strong> (NISN/PDKT: ${s.username}): <span class="text-indigo-600 font-bold">${s.pass}</span></div>`).join('')}
            </div>
            <p class="text-[10px] text-slate-500 pt-1">Siswa dan Orang Tua dapat login langsung ke portal masing-masing dengan NISN dan password di atas.</p>
          </div>
        `,
        icon: 'success'
      });
    } catch (err: any) {
      setIsGeneratingStudentUsers(false);
      Swal.fire('Gagal', err.message || 'Terjadi kesalahan saat membuat akun', 'error');
    }
  };

  const handleExportAllAccountsToExcel = () => {
    try {
      const allSiswa = db.get<any>('siswa') || db.get<any>('students') || StorageService.getStudents() || [];
      const excelRows: any[] = [];
      let no = 1;

      for (const s of allSiswa) {
        const rawName = (s.nama || s.name || s.NamaLengkap || 'Siswa').trim();
        const firstName = rawName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const pdkt = (s.noPdkt || s.nopdkt || s.NoPDKT || s.nis || s.NIS || s.id || '').toString().trim().replace(/^pdkt-?/i, '');
        const pass = `${firstName}${pdkt || (s.nisn ? s.nisn.slice(-3) : '123')}`;
        const nisn = (s.nisn || s.NISN || pdkt || '').toString().trim();
        const parentName = (s.NamaAyah || s.namaAyah || s.NamaIbu || s.namaIbu || s.NamaWali || s.namaWali || s.parentName || `Wali dari ${rawName}`).trim();
        const kelas = s.kelas || s.class || s.KelasSaatini || '-';

        // 1. Akun Siswa
        excelRows.push({
          No: no++,
          TipeAkun: 'SISWA',
          NamaLengkap: rawName,
          Kelas: kelas,
          Username: nisn || pdkt,
          NISN: nisn,
          NoPDKT: pdkt,
          Password: pass,
          Peran: 'SISWA (Peserta Didik)',
          PortalAkses: 'Portal Siswa / CBT Online'
        });

        // 2. Akun Orang Tua
        excelRows.push({
          No: no++,
          TipeAkun: 'ORANG_TUA',
          NamaLengkap: parentName,
          Kelas: kelas,
          Username: nisn || pdkt,
          NISN: nisn,
          NoPDKT: pdkt,
          Password: pass,
          Peran: 'ORANG_TUA (Wali Murid)',
          PortalAkses: `Portal Orang Tua (Memantau: ${rawName})`
        });
      }

      exportToExcel(excelRows, `Daftar_Akun_Siswa_dan_Orang_Tua_${new Date().toISOString().slice(0, 10)}.xlsx`, 'AKUN_SISWA_ORTU');
      Swal.fire('Berhasil Mengunduh', `Berhasil mengekspor ${excelRows.length} akun Siswa & Orang Tua ke file Excel!`, 'success');
    } catch (err: any) {
      Swal.fire('Gagal Ekspor', err?.message || 'Gagal mengekspor data akun', 'error');
    }
  };

  const handleSaveNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username.trim() || !newUserData.nama.trim()) {
      Swal.fire('Peringatan', 'Username dan Nama Pengguna wajib diisi!', 'warning');
      return;
    }
    const cleanUsername = newUserData.username.trim();
    const cleanPdkt = newUserData.nopdkt.trim();
    let finalPass = newUserData.password.trim();
    if (!finalPass) {
      if (newUserData.role === 'SISWA') {
        const firstName = newUserData.nama.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        finalPass = `${firstName}${cleanPdkt || '123'}`;
      } else {
        finalPass = `${cleanUsername}123`;
      }
    }

    const newUser: UserAccount = {
      idUser: 'U-' + Date.now().toString().slice(-6),
      username: cleanUsername,
      nama: newUserData.nama.trim(),
      role: newUserData.role,
      status: 'AKTIF',
      email: newUserData.email.trim(),
      nopdkt: cleanPdkt,
      twoFactorEnabled: false
    };

    StorageService.saveUser(newUser);
    StorageService.setPassword(cleanUsername, finalPass);
    if (cleanPdkt) StorageService.setPassword(cleanPdkt, finalPass);

    // Update db.users
    const currentUsers = db.get<any>('users') || [];
    currentUsers.push({
      id: `USR_${cleanUsername}`,
      username: cleanUsername,
      name: newUserData.nama.trim(),
      role: newUserData.role,
      password: finalPass,
      nopdkt: cleanPdkt,
      email: newUserData.email.trim(),
      status: 'AKTIF'
    });
    db.set('users', currentUsers);

    setUsers(StorageService.getUsers());
    setShowAddUserModal(false);
    setNewUserData({ username: '', nama: '', role: 'SISWA', nopdkt: '', password: '', email: '' });

    Swal.fire({
      title: 'Pengguna Berhasil Ditambahkan!',
      html: `Akun <strong>${cleanUsername}</strong> (${newUserData.nama}) telah aktif.<br/>Password: <span class="font-mono font-bold text-indigo-600">${finalPass}</span>`,
      icon: 'success'
    });
  };

  const handleSyncBankSoal = async () => {
    setIsSyncingBankSoal(true);
    setBankSoalSyncMsg(null);
    try {
      const res = await StorageService.syncBankSoalFromSpreadsheet();
      setBankSoalSyncMsg({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
      reloadData();
      setTimeout(() => setBankSoalSyncMsg(null), 6000);
    } catch (err: any) {
      setBankSoalSyncMsg({
        type: 'error',
        text: `Gagal sinkronisasi Bank Soal: ${err?.message || String(err)}`,
      });
    } finally {
      setIsSyncingBankSoal(false);
    }
  };

  // Schedule copy to clipboard & download CSV state
  const [copyScheduleMsg, setCopyScheduleMsg] = useState<string | null>(null);

  const handleCopySchedulesToSpreadsheet = () => {
    const headers = ['Kode_Jadwal', 'Hari', 'Tanggal', 'Sesi_Jam', 'Program_Rombel', 'Kelas', 'Mata_Pelajaran', 'Tutor_Pengawas', 'Ruangan', 'Token_CBT', 'Durasi_Menit', 'Status_Ujian'];
    const rows = schedules.map((s) => [
      s.idJadwal || s.idUjian || '',
      s.hari || 'Senin',
      s.tanggal || '2026-09-28',
      `${s.jamMulai || '19:30'} - ${s.jamSelesai || '22:00'} WIB`,
      s.jenjang || 'Paket B',
      s.kelas || '9',
      s.mapel || '',
      s.tutorPengawas || 'Guru Kelas',
      s.ruangan || 'Ruang CBT',
      s.token || 'KTCT26',
      s.durasi || 90,
      s.status || 'AKTIF',
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopyScheduleMsg(`✅ Berhasil menyalin ${schedules.length} jadwal! Buka Google Spreadsheet Anda, buat tab baru bernama "JADWAL_DAN_KELAS", lalu klik sel A1 dan tekan Ctrl+V.`);
    setTimeout(() => setCopyScheduleMsg(null), 10000);
  };

  const handleDownloadScheduleCSV = () => {
    const headers = ['Kode_Jadwal', 'Hari', 'Tanggal', 'Sesi_Jam', 'Program_Rombel', 'Kelas', 'Mata_Pelajaran', 'Tutor_Pengawas', 'Ruangan', 'Token_CBT', 'Durasi_Menit', 'Status_Ujian'];
    const rows = schedules.map((s) => [
      `"${s.idJadwal || s.idUjian || ''}"`,
      `"${s.hari || 'Senin'}"`,
      `"${s.tanggal || '2026-09-28'}"`,
      `"${s.jamMulai || '19:30'} - ${s.jamSelesai || '22:00'} WIB"`,
      `"${s.jenjang || 'Paket B'}"`,
      `"${s.kelas || '9'}"`,
      `"${(s.mapel || '').replace(/"/g, '""')}"`,
      `"${(s.tutorPengawas || 'Guru Kelas').replace(/"/g, '""')}"`,
      `"${(s.ruangan || 'Ruang CBT').replace(/"/g, '""')}"`,
      `"${s.token || 'KTCT26'}"`,
      s.durasi || 90,
      `"${s.status || 'AKTIF'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'JADWAL_DAN_KELAS_ROMBEL_KTCT.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Student filter and management state
  const [studentClassFilter, setStudentClassFilter] = useState<string>('ALL');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentPage, setStudentPage] = useState<number>(1);
  const [studentPageSize, setStudentPageSize] = useState<number | 'ALL'>(25);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentNisn, setEditingStudentNisn] = useState<string | null>(null);
  const [studentModalTab, setStudentModalTab] = useState<'IDENTITAS' | 'ALAMAT' | 'AKADEMIK' | 'KELUARGA' | 'BERKAS'>('IDENTITAS');

  const defaultStudentProfile: Partial<StudentProfile> = {
    nisn: '',
    nama: '',
    namaLengkap: '',
    jenjang: 'Paket B',
    kelas: '9',
    kelasSaatini: '9',
    rombel: 'Rombel KTCT Tambora',
    status: 'AKTIF',
    linkFoto: '',
    pasFoto: '',
    nopdkt: '',
    tahunMasuk: '2025',
    jenisKelamin: 'L',
    tempatLahir: 'Jakarta',
    tanggalLahir: '2010-01-01',
    nik: '',
    anakKe: 1,
    saudara: 2,
    agama: 'Islam',
    golonganDarah: 'O',
    tinggiBadan: 155,
    beratBadan: 48,
    prestasi: '',
    hobi: '',
    catatanPenting: '',
    alamat: '',
    rt: '005',
    rw: '03',
    kelurahan: 'Tambora',
    kecamatan: 'Tambora',
    kota: 'Jakarta Barat',
    provinsi: 'DKI Jakarta',
    kodePos: '11220',
    jenisTinggal: 'Bersama Orang Tua',
    alatTransportasi: 'Jalan Kaki',
    nomorHP: '',
    email: '',
    asalSekolah: '',
    skhun: '',
    penerimaKPS: 'Tidak',
    nomorKartuKeluarga: '',
    statusYatim: 'Lengkap',
    namaAyah: '',
    nikAyah: '',
    tempatLahirAyah: 'Jakarta',
    tanggalLahirAyah: '1975-05-10',
    pendidikanAyah: 'SMA/Sederajat',
    pekerjaanAyah: 'Karyawan Swasta',
    penghasilanAyah: 'Rp 3.000.000 - Rp 5.000.000',
    tlpAyah: '',
    statusAyah: 'Masih Hidup',
    namaIbu: '',
    nikIbu: '',
    tempatLahirIbu: 'Jakarta',
    tanggalLahirIbu: '1980-08-15',
    pendidikanIbu: 'SMA/Sederajat',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    penghasilanIbu: '< Rp 1.000.000',
    tlpIbu: '',
    statusIbu: 'Masih Hidup',
    namaWali: '',
    tempatLahirWali: '',
    tglLahirWali: '',
    pendidikanWali: 'SMA/Sederajat',
    pekerjaanWali: '',
    penghasilanWali: '',
    hubungan: 'Orang Tua Kandung',
    tlpWali: '',
    aktaKelahiran: 'Ada',
    kartuKeluarga: 'Ada',
    kia: 'Ada',
    ktpAyah: 'Ada',
    ktpIbu: 'Ada',
    ijazah: 'Ada',
    ktpWali: 'Belum',
    rapor: 'Ada',
    sPindah: 'Tidak Perlu',
    suKet: 'Ada',
    sDomisili: 'Ada',
  };

  const [studentFormData, setStudentFormData] = useState<Partial<StudentProfile>>(defaultStudentProfile);

  // Student Deletion state
  const [studentToDelete, setStudentToDelete] = useState<StudentProfile | null>(null);
  const [deleteStatusMsg, setDeleteStatusMsg] = useState<string | null>(null);

  // Batch import state (Supports 70-Header Buku Induk Dapodik & Excel/CSV/TSV)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importParsePreview, setImportParsePreview] = useState<ImportParseResult | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importStatusMsg, setImportStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Refresh helper
  const reloadData = () => {
    setSchedules(StorageService.getSchedules());
    setQuestions(StorageService.getQuestions());
    setStudents(StorageService.getStudents());
    setUsers(StorageService.getUsers());
    setSubmissions(StorageService.getSubmissions());
    setViolations(StorageService.getViolations());
    onRefreshAll();
  };

  // Direct sync from Google Spreadsheet
  const handleSyncSpreadsheet = async () => {
    setIsSyncingSheet(true);
    setSheetSyncResult(null);
    try {
      const res = await StorageService.syncFromSpreadsheet();
      setSheetSyncResult({
        type: res.success ? 'success' : 'error',
        text: res.message,
      });
      reloadData();
      setTimeout(() => setSheetSyncResult(null), 6000);
    } catch (err: any) {
      setSheetSyncResult({
        type: 'error',
        text: `Gagal sinkronisasi Spreadsheet: ${err?.message || String(err)}`,
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Student Management Handlers
  const handleOpenAddStudent = () => {
    setEditingStudentNisn(null);
    const randId = Math.floor(1000 + Math.random() * 9000);
    setStudentFormData({
      ...defaultStudentProfile,
      nopdkt: `KTCT-2025-${randId}`,
    });
    setStudentModalTab('IDENTITAS');
    setShowStudentModal(true);
  };

  const handleOpenEditStudent = (student: StudentProfile) => {
    setEditingStudentNisn(student.nisn);
    setStudentFormData({
      ...defaultStudentProfile,
      ...student,
      namaLengkap: student.namaLengkap || student.nama,
      kelasSaatini: student.kelasSaatini || student.kelas,
      pasFoto: student.pasFoto || student.linkFoto,
      nopdkt: student.nopdkt || `KTCT-${student.tahunMasuk || '2025'}-${student.nisn.slice(-4)}`,
    });
    setStudentModalTab('IDENTITAS');
    setShowStudentModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFormData.nisn) return;
    const finalNama = (studentFormData.namaLengkap || studentFormData.nama || '').trim();
    if (!finalNama) return;

    const studentObj: StudentProfile = {
      ...defaultStudentProfile,
      ...studentFormData,
      id: studentFormData.id || 'STD-' + studentFormData.nisn,
      nisn: studentFormData.nisn.trim(),
      nama: finalNama,
      namaLengkap: finalNama,
      jenjang: (studentFormData.jenjang as any) || 'Paket B',
      kelas: studentFormData.kelasSaatini || studentFormData.kelas || '9',
      kelasSaatini: studentFormData.kelasSaatini || studentFormData.kelas || '9',
      rombel: studentFormData.rombel || 'Rombel KTCT Tambora',
      status: studentFormData.status || 'AKTIF',
      linkFoto: studentFormData.pasFoto?.trim() || studentFormData.linkFoto?.trim() || '',
      pasFoto: studentFormData.pasFoto?.trim() || studentFormData.linkFoto?.trim() || '',
      waliMurid:
        studentFormData.namaAyah ||
        studentFormData.namaIbu ||
        studentFormData.namaWali ||
        studentFormData.waliMurid,
      teleponWali:
        studentFormData.nomorHP ||
        studentFormData.tlpAyah ||
        studentFormData.tlpWali ||
        studentFormData.teleponWali,
    };

    StorageService.saveStudent(studentObj, true);
    setShowStudentModal(false);
    reloadData();
  };

  const handleConfirmDeleteStudent = () => {
    if (!studentToDelete) return;
    const { nisn, nama } = studentToDelete;
    StorageService.deleteStudent(nisn);
    setStudentToDelete(null);
    setDeleteStatusMsg(`Data siswa ${nama} (NISN: ${nisn}) dan akun loginnya berhasil dihapus.`);
    reloadData();
    setTimeout(() => {
      setDeleteStatusMsg(null);
    }, 4000);
  };

  const handleExportStudentsExcel = () => {
    ExportService.exportStudentsToExcel(filteredStudents);
  };

  // Upload handler for Excel (.xlsx, .xls) and CSV/TXT/TSV
  const handleFileUploadForImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportStatusMsg(null);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      try {
        const buffer = await file.arrayBuffer();
        const parseResult = ImportService.parseExcelBuffer(buffer);
        setImportParsePreview(parseResult);

        if (parseResult.success) {
          setImportStatusMsg({
            type: 'info',
            text: `Berhasil menganalisis ${file.name}: Terdeteksi ${parseResult.validCount} siswa valid ${
              parseResult.is70ColumnsFormat ? '(Format Lengkap 70 Kolom Buku Induk)' : '(Format Standar)'
            }. Silakan tinjau pratinjau di bawah dan klik 'Simpan Semua Siswa'.`,
          });
        } else {
          setImportStatusMsg({
            type: 'error',
            text: parseResult.errors[0] || 'Tidak ada baris siswa yang valid terbaca dari berkas Excel.',
          });
        }
      } catch (err: any) {
        setImportStatusMsg({
          type: 'error',
          text: `Gagal membaca berkas Excel: ${err?.message || 'Format tidak valid'}`,
        });
      }
    } else {
      try {
        const text = await file.text();
        setImportText(text);
        const parseResult = ImportService.parseText(text);
        setImportParsePreview(parseResult);

        if (parseResult.success) {
          setImportStatusMsg({
            type: 'info',
            text: `Berhasil membaca berkas teks: Terdeteksi ${parseResult.validCount} siswa ${
              parseResult.is70ColumnsFormat ? '(Format Lengkap 70 Kolom Buku Induk)' : ''
            }. Klik 'Simpan Semua Siswa' untuk memproses.`,
          });
        } else {
          setImportStatusMsg({
            type: 'error',
            text: parseResult.errors[0] || 'Data teks belum sesuai format.',
          });
        }
      } catch (err: any) {
        setImportStatusMsg({
          type: 'error',
          text: `Gagal membaca file: ${err?.message}`,
        });
      }
    }
  };

  const handleAnalyzeText = () => {
    setImportStatusMsg(null);
    if (!importText.trim()) {
      setImportStatusMsg({ type: 'error', text: 'Teks data import masih kosong.' });
      return;
    }
    const res = ImportService.parseText(importText);
    setImportParsePreview(res);
    if (res.success) {
      setImportStatusMsg({
        type: 'info',
        text: `Terdeteksi ${res.validCount} baris siswa siap diimpor ${
          res.is70ColumnsFormat ? '(Format Lengkap 70 Kolom Buku Induk Dapodik)' : ''
        }.`,
      });
    } else {
      setImportStatusMsg({
        type: 'error',
        text: res.errors[0] || 'Gagal membaca format data siswa.',
      });
    }
  };

  const handleProcessBatchImport = () => {
    setImportStatusMsg(null);

    let studentsToSave: StudentProfile[] = [];

    if (importParsePreview && importParsePreview.students.length > 0) {
      studentsToSave = importParsePreview.students;
    } else if (importText.trim()) {
      const parsed = ImportService.parseText(importText);
      if (parsed.success && parsed.students.length > 0) {
        studentsToSave = parsed.students;
      }
    }

    if (studentsToSave.length === 0) {
      setImportStatusMsg({
        type: 'error',
        text: 'Belum ada data siswa yang valid untuk diimpor. Silakan unggah file Excel/CSV atau tempel data teks yang sesuai.',
      });
      return;
    }

    StorageService.saveStudentsBatch(studentsToSave, true);
    setImportStatusMsg({
      type: 'success',
      text: `Alhamdulillah! Berhasil mengimpor ${studentsToSave.length} data siswa ke Buku Induk Rombel KTCT dan membuatkan akun login CBT!`,
    });

    setImportText('');
    setImportParsePreview(null);
    setImportFileName('');
    reloadData();
  };

  const handleLoadSampleImport = () => {
    // 70 Headers CSV / TSV sample format
    const sampleCsv =
      `No,NOPDKT,Tahun_Masuk,NISN,Nama_Lengkap,Jenis_Kelamin,Tempat_Lahir,Tanggal_Lahir,NIK,Anak_Ke,Saudara,Agama,Golongan_Darah,Tinggi_Badan_cm,Berat_Badan_kg,Prestasi,Hobi,Catatan_Penting,Alamat,RT,RW,Kelurahan,Kecamatan,Kota,Provinsi,Kode_Pos,Jenis_Tinggal,Alat_Transportasi,Nomor_HP,Email,Asal_Sekolah,SKHUN,Penerima_KPS,Nomor_Kartu_Keluarga,Nama_Ayah,NIK_Ayah,Tempat_Lahir_Ayah,Tanggal_Lahir_Ayah,Pendidikan_Ayah,Pekerjaan_Ayah,Penghasilan_Ayah,Tlp_Ayah,Status_Ayah,Nama_Ibu,NIK_Ibu,Tempat_Lahir_Ibu,Tanggal_Lahir_Ibu,Pendidikan_Ibu,Pekerjaan_Ibu,Penghasilan_Ibu,Tlp_Ibu,Status_Ibu,Status_Yatim,Nama_Wali,Tempat_Lahir_Wali,Tgl_Lahir_Wali,Pendidikan_Wali,Pekerjaan_Wali,Penghasilan_Wali,Hubungan_Wali,Tlp_Wali,Akta_Kelahiran,Kartu_Keluarga,KIA,KTP_Ayah,KTP_Ibu,Ijazah,KTP_Wali,Rapor,S_Pindah,SuKet,S_Domisili,Status,Jenjang,Kelas_Saat_Ini\n` +
      `1,KTCT-2025-4508,2025,0081234508,Farhan Maulana Pratama,L,Jakarta,2010-04-12,3173010412100001,1,2,Islam,O,160,52,Juara 2 Catur,Sepak Bola,-,Jl. Tambora Raya No. 18,004,03,Tambora,Tambora,Jakarta Barat,DKI Jakarta,11220,Bersama Orang Tua,Jalan Kaki,081298765432,farhan@siswa.ktct.sch.id,SDN Tambora 01,DN-01/008123,Tidak,3173011203090002,Bapak Hendra,3173011005750001,Jakarta,1975-05-10,SMA/Sederajat,Karyawan Swasta,Rp 3.000.000 - Rp 5.000.000,081234567801,Masih Hidup,Ibu Ratna,3173011508800002,Jakarta,1980-08-15,SMA/Sederajat,Ibu Rumah Tangga,< Rp 1.000.000,081234567899,Masih Hidup,Lengkap,-,-,-,-,-,-,Orang Tua Kandung,-,Ada,Ada,Ada,Ada,Ada,Ada,Tidak Ada,Ada,Tidak Perlu,Ada,Ada,AKTIF,Paket B,9\n` +
      `2,KTCT-2025-4509,2025,0081234509,Annisa Rahmawati,P,Bandung,2011-09-20,3173016009110003,2,3,Islam,A,152,44,Lomba Pidato,Menulis,-,Jl. Jembatan Besi II,002,01,Jembatan Besi,Tambora,Jakarta Barat,DKI Jakarta,11320,Bersama Orang Tua,Sepeda Motor,081387654321,annisa@siswa.ktct.sch.id,SDN Jembatan Besi 03,DN-01/008124,KIP,3173012204100005,Bapak Suryadi,3173011406720004,Bandung,1972-06-14,SMP/Sederajat,Wiraswasta,Rp 2.000.000 - Rp 3.000.000,081234567802,Masih Hidup,Ibu Nurul,3173015507770003,Jakarta,1977-07-15,SMA/Sederajat,Pedagang,Rp 1.000.000 - Rp 2.000.000,081234567803,Masih Hidup,Lengkap,-,-,-,-,-,-,Orang Tua Kandung,-,Ada,Ada,Ada,Ada,Ada,Ada,Tidak Ada,Ada,Tidak Perlu,Ada,Ada,AKTIF,Paket B,8\n` +
      `3,KTCT-2025-4510,2025,0081234510,Kevin Sanjaya,L,Jakarta,2009-02-15,3173011502090005,1,1,Kristen,B,168,58,Juara Bulutangkis,Bulutangkis,-,Jl. Duri Selatan No. 22,001,02,Duri Selatan,Tambora,Jakarta Barat,DKI Jakarta,11270,Bersama Orang Tua,Jalan Kaki,081399887766,kevin@siswa.ktct.sch.id,SMP Negeri Tambora,DN-01/008125,Tidak,3173013005110007,Bapak Gunawan,3173012003700005,Jakarta,1970-03-20,S1,Wiraswasta,> Rp 5.000.000,081234567804,Masih Hidup,Ibu Maria,3173016008740006,Jakarta,1974-08-20,SMA/Sederajat,Wiraswasta,Rp 3.000.000 - Rp 5.000.000,081234567805,Masih Hidup,Lengkap,-,-,-,-,-,-,Orang Tua Kandung,-,Ada,Ada,Ada,Ada,Ada,Ada,Tidak Ada,Ada,Tidak Perlu,Ada,Ada,AKTIF,Paket C,10`;

    setImportText(sampleCsv);
    const parsed = ImportService.parseText(sampleCsv);
    setImportParsePreview(parsed);
    setImportStatusMsg({
      type: 'info',
      text: 'Contoh data 70 Header Buku Induk Dapodik berhasil dimuat! Anda dapat langsung mengklik "Simpan Semua Siswa" atau mengeditnya.',
    });
  };

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchClass =
      studentClassFilter === 'ALL' ||
      s.kelas === studentClassFilter ||
      s.jenjang === studentClassFilter ||
      (studentClassFilter === 'Paket A' && (s.jenjang === 'Paket A' || ['4', '5', '6'].includes(s.kelas))) ||
      (studentClassFilter === 'Paket B' && (s.jenjang === 'Paket B' || ['7', '8', '9'].includes(s.kelas))) ||
      (studentClassFilter === 'Paket C' && (s.jenjang === 'Paket C' || ['10', '11', '12'].includes(s.kelas)));
    const cleanSStatus = String(s.status || '').trim().toUpperCase();
    const filterUpper = String(studentStatusFilter || '').trim().toUpperCase();
    const matchStatus = 
      filterUpper === 'ALL' || 
      cleanSStatus === filterUpper ||
      (filterUpper === 'AKTIF' && (cleanSStatus === 'AKTIF' || matchStatusActive(s.status)));
    const matchSearch =
      s.nama.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.nisn.includes(studentSearch) ||
      (s.waliMurid && s.waliMurid.toLowerCase().includes(studentSearch.toLowerCase()));
    return matchClass && matchStatus && matchSearch;
  });

  // Student Pagination Calculations
  const totalStudentItems = filteredStudents.length;
  const totalStudentPages =
    studentPageSize === 'ALL'
      ? 1
      : Math.max(1, Math.ceil(totalStudentItems / (studentPageSize as number)));
  const currentSafeStudentPage = Math.min(Math.max(1, studentPage), totalStudentPages);
  const startStudentIdx =
    studentPageSize === 'ALL' ? 0 : (currentSafeStudentPage - 1) * (studentPageSize as number);
  const endStudentIdx =
    studentPageSize === 'ALL'
      ? totalStudentItems
      : Math.min(startStudentIdx + (studentPageSize as number), totalStudentItems);
  const paginatedStudents = filteredStudents.slice(startStudentIdx, endStudentIdx);

  // Class count aggregation (4 - 12) - HANYA siswa berstatus AKTIF sesuai permintaan
  const classCounts: Record<string, number> = {};
  for (let c = 4; c <= 12; c++) {
    classCounts[c.toString()] = students.filter(
      (s) => {
        const sStatus = String(s.status || '').trim().toUpperCase();
        const isAktif = (sStatus === 'AKTIF' || (!s.status && matchStatusActive(s.status)) || matchStatusActive(s.status)) &&
          !['PINDAH', 'LULUS', 'KELUAR', 'TIDAK AKTIF', 'ALUMNI', 'MUTASI', 'DO'].includes(sStatus);
        const kStr = c.toString();
        const matchK = s.kelas?.toString() === kStr || 
          s.kelasSaatini?.toString() === kStr || 
          s.kelasSaatIni?.toString() === kStr || 
          normalizeClassName(s.kelas) === kStr;
        return isAktif && matchK;
      }
    ).length;
  }

  // Student stats
  const totalSiswa = students.length;
  const siswaAktif = students.filter((s) => {
    const st = String(s.status || '').trim().toUpperCase();
    return (st === 'AKTIF' || matchStatusActive(s.status)) && !['PINDAH', 'LULUS', 'KELUAR', 'TIDAK AKTIF', 'ALUMNI', 'MUTASI', 'DO'].includes(st);
  }).length;
  const siswaBelum = students.filter((s) => String(s.status || '').trim().toUpperCase() === 'BELUM').length;
  const siswaTidakAktif = students.filter((s) => String(s.status || '').trim().toUpperCase() === 'TIDAK AKTIF').length;
  const siswaPindah = students.filter((s) => String(s.status || '').trim().toUpperCase() === 'PINDAH').length;
  const siswaKeluar = students.filter((s) => ['KELUAR', 'LULUS', 'DO', 'ALUMNI'].includes(String(s.status || '').trim().toUpperCase())).length;

  // Filtered schedules
  const filteredSchedules = schedules.filter((s) => {
    const matchDay = schedFilterHari === 'ALL' || (s.hari && s.hari.toLowerCase() === schedFilterHari.toLowerCase());
    const matchClass =
      schedFilterKelas === 'ALL' ||
      s.kelas === schedFilterKelas ||
      (s.namaKelas && s.namaKelas.toLowerCase().includes(schedFilterKelas.toLowerCase()));
    const matchStatus = schedFilterStatus === 'ALL' || s.status === schedFilterStatus;
    const matchSearch =
      schedSearch === '' ||
      s.mapel.toLowerCase().includes(schedSearch.toLowerCase()) ||
      s.idJadwal.toLowerCase().includes(schedSearch.toLowerCase()) ||
      (s.token && s.token.toLowerCase().includes(schedSearch.toLowerCase())) ||
      (s.ruangan && s.ruangan.toLowerCase().includes(schedSearch.toLowerCase())) ||
      (s.idUjian && s.idUjian.toLowerCase().includes(schedSearch.toLowerCase()));
    return matchDay && matchClass && matchStatus && matchSearch;
  });

  // Mass updates for schedules
  const handleToggleSelectSchedule = (id: string) => {
    setSelectedScheduleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllSchedules = () => {
    setSelectedScheduleIds(filteredSchedules.map((s) => s.idJadwal));
  };

  const handleClearSelectSchedules = () => {
    setSelectedScheduleIds([]);
  };

  const handleMassUpdateScheduleStatus = (status: 'AKTIF' | 'NONAKTIF' | 'Terjadwal') => {
    if (selectedScheduleIds.length === 0) return;
    StorageService.updateSchedulesBatch(selectedScheduleIds, status);
    setSelectedScheduleIds([]);
    reloadData();
  };

  const handleToggleScheduleStatus = (s: ExamSchedule) => {
    const nextStatus = s.status === 'AKTIF' ? 'Terjadwal' : 'AKTIF';
    StorageService.saveSchedule({ ...s, status: nextStatus });
    reloadData();
  };

  const handleResetToOfficialSTS = () => {
    if (confirm('Muat ulang seluruh 117 Jadwal Resmi STS Ganjil 2026/2027 ke sistem lokal & database Google Spreadsheet?')) {
      const resetList = StorageService.resetSchedulesToSTS();
      setSchedules(resetList);
      setSelectedScheduleIds([]);
      reloadData();
    }
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Hapus jadwal ujian ini?')) {
      StorageService.deleteSchedule(id);
      reloadData();
    }
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchedule.mapel) return;

    const sched: ExamSchedule = {
      idJadwal: 'JAD-' + Date.now().toString().slice(-4),
      idUjian: newSchedule.idUjian || 'PTS-' + newSchedule.mapel.slice(0, 3).toUpperCase(),
      mapel: newSchedule.mapel,
      jenjang: (newSchedule.jenjang as any) || 'Paket B',
      kelas: newSchedule.kelas || '9',
      tanggal: newSchedule.tanggal || '2026-09-20',
      jamMulai: newSchedule.jamMulai || '08:00',
      jamSelesai: newSchedule.jamSelesai || '09:30',
      durasi: Number(newSchedule.durasi) || 45,
      token: newSchedule.token || 'KTCT26',
      status: (newSchedule.status as any) || 'AKTIF',
      tahunAjaran: '2025/2026',
    };

    StorageService.saveSchedule(sched);
    setShowAddScheduleModal(false);
    reloadData();
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.soal) return;

    const qItem: QuestionItem = {
      idSoal: 'SOAL-' + Date.now().toString().slice(-5),
      idUjian: newQuestion.idUjian || 'PTS-MTK-9',
      mapel: newQuestion.mapel || 'Matematika Terapan',
      jenjang: (newQuestion.jenjang as any) || 'Paket B',
      kelas: newQuestion.kelas || '9',
      tipe: 'PILIHAN_GANDA',
      soal: newQuestion.soal,
      a: newQuestion.a || '',
      b: newQuestion.b || '',
      c: newQuestion.c || '',
      d: newQuestion.d || '',
      kunci: (newQuestion.kunci as any) || 'A',
      bobot: Number(newQuestion.bobot) || 20,
      status: 'AKTIF',
    };

    StorageService.saveQuestion(qItem);
    setShowAddQuestionModal(false);
    reloadData();
  };

  const handleDeleteQuestion = (idSoal: string) => {
    if (confirm('Hapus soal ini dari bank soal?')) {
      StorageService.deleteQuestion(idSoal);
      reloadData();
    }
  };

  const handleToggleUser2FA = (user: UserAccount) => {
    const updated = { ...user, twoFactorEnabled: !user.twoFactorEnabled };
    StorageService.saveUser(updated);
    reloadData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-900 dark:text-white">
      {/* Control Room Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs dark:shadow-xl space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Control Room Administrator
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pusat Kendali Asesmen CBT & Buku Induk Digital (70 Parameter Dapodik)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleOpenAddStudent}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Siswa</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('SISWA');
                setShowImportModal(true);
              }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Impor Siswa (70 Header)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('SOAL');
                setShowAddQuestionModal(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Tambah Bank Soal</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('JADWAL');
                setShowAddScheduleModal(true);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Tambah Jadwal</span>
            </button>
            <button
              onClick={() => setShowRekapModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              title="Panduan Struktur 9 Sheet Google Spreadsheet & Kode Apps Script (Code.gs)"
            >
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Panduan Sheet & Apps Script</span>
            </button>
            <button
              onClick={handleSyncSpreadsheet}
              disabled={isSyncingSheet}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
              title="Tarik data terbaru langsung dari tab SISWA Google Spreadsheet"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingSheet ? 'animate-spin' : ''}`} />
              <span>{isSyncingSheet ? 'Menarik Data...' : 'Tarik dari Spreadsheet'}</span>
            </button>
            <button
              onClick={reloadData}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {sheetSyncResult && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border ${
              sheetSyncResult.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            <span>{sheetSyncResult.text}</span>
            <button
              onClick={() => setSheetSyncResult(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded-lg"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'OVERVIEW'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Ringkasan & Monitor Siswa
          </button>
          <button
            onClick={() => setActiveTab('SISWA')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SISWA'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Kelola Data Siswa ({students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('JADWAL')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'JADWAL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Pengaturan Jadwal Ujian ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('SOAL')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'SOAL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Bank Soal CBT ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('NILAI')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'NILAI'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Monitoring PTS & Nilai CBT ({submissions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PENGGUNA')}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'PENGGUNA'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Manajemen Akun & 2FA ({users.length})
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Status Metric Cards matching original schema */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs dark:shadow-md transition-colors">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">Total Siswa</p>
              <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{totalSiswa}</h3>
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 shadow-xs dark:shadow-md transition-colors">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-black tracking-wider">Aktif</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-800 dark:text-emerald-300">{siswaAktif}</h3>
            </div>
            <div className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 shadow-xs dark:shadow-md transition-colors">
              <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-black tracking-wider">Belum Registrasi</p>
              <h3 className="text-2xl font-black mt-1 text-amber-800 dark:text-amber-300">{siswaBelum}</h3>
            </div>
            <div className="bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-2xl p-4 shadow-xs dark:shadow-md transition-colors">
              <p className="text-[10px] text-rose-700 dark:text-rose-400 uppercase font-black tracking-wider">Tidak Aktif</p>
              <h3 className="text-2xl font-black mt-1 text-rose-800 dark:text-rose-300">{siswaTidakAktif}</h3>
            </div>
            <div className="bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30 rounded-2xl p-4 shadow-xs dark:shadow-md transition-colors">
              <p className="text-[10px] text-purple-700 dark:text-purple-400 uppercase font-black tracking-wider">Pindah</p>
              <h3 className="text-2xl font-black mt-1 text-purple-800 dark:text-purple-300">{siswaPindah}</h3>
            </div>
            <div className="bg-red-50/60 dark:bg-red-950/40 border border-red-200 dark:border-red-700/40 rounded-2xl p-4 shadow-xs dark:shadow-md transition-colors">
              <p className="text-[10px] text-red-700 dark:text-red-400 uppercase font-black tracking-wider">Keluar/Lulus</p>
              <h3 className="text-2xl font-black mt-1 text-red-800 dark:text-red-300">{siswaKeluar}</h3>
            </div>
            <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-4 shadow-xs dark:shadow-md transition-colors">
              <p className="text-[10px] text-indigo-700 dark:text-indigo-300 uppercase font-black tracking-wider">Akun CBT Aktif</p>
              <h3 className="text-2xl font-black mt-1 text-indigo-800 dark:text-indigo-300">{users.length}</h3>
            </div>
          </div>

          {/* Breakdown Per Kelas (Kelas 4 s/d 12) - Hanya Siswa Aktif */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-6 rounded-3xl shadow-xs dark:shadow-xl space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Rincian Siswa per Rombongan Belajar (Kelas 4 s/d 12)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Status Siswa Aktif Saja
                </span>
              </div>
              <button
                onClick={() => {
                  setStudentStatusFilter('AKTIF');
                  setStudentClassFilter('ALL');
                  setActiveTab('SISWA');
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua Siswa Aktif</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => {
                const paketName = k <= 6 ? 'Paket A' : k <= 9 ? 'Paket B' : 'Paket C';
                const paketColor = k <= 6
                  ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : k <= 9
                  ? 'border-blue-200 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20'
                  : 'border-purple-200 dark:border-purple-800/40 bg-purple-50/40 dark:bg-purple-950/20';

                return (
                  <div
                    key={k}
                    onClick={() => {
                      setStudentClassFilter(k.toString());
                      setStudentStatusFilter('AKTIF');
                      setStudentPage(1);
                      setActiveTab('SISWA');
                    }}
                    className={`p-3 rounded-2xl border text-center cursor-pointer hover:scale-105 transition active:scale-95 ${paketColor}`}
                    title={`Klik untuk melihat siswa AKTIF Kelas ${k} (${paketName})`}
                  >
                    <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 block tracking-wider">
                      {paketName}
                    </span>
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                      Kelas {k}
                    </span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {classCounts[k.toString()] || 0}
                    </h4>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                      Siswa Aktif
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB SISWA: KELOLA DATA SISWA */}
      {activeTab === 'SISWA' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs dark:shadow-xl space-y-5 transition-colors">
            {/* Header section with actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span>Daftar Induk Siswa Rombel KTCT Tambora</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Data profil siswa, jenjang kelas, NISN, serta status akun login CBT
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={handleOpenAddStudent}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Tambah Siswa</span>
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Impor Siswa (70 Header)</span>
                </button>
                <button
                  onClick={handleExportStudentsExcel}
                  className="bg-slate-100 hover:bg-slate-200 text-emerald-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-emerald-400 border border-slate-300 dark:border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Ekspor Excel ({filteredStudents.length})</span>
                </button>
              </div>
            </div>

            {deleteStatusMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 p-3 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{deleteStatusMsg}</span>
                </div>
                <button onClick={() => setDeleteStatusMsg(null)} className="text-emerald-700 dark:text-emerald-400 hover:opacity-80 text-xs">✕</button>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari NISN atau Nama Siswa..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setStudentPage(1);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <select
                  value={studentClassFilter}
                  onChange={(e) => {
                    setStudentClassFilter(e.target.value);
                    setStudentPage(1);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Jenjang & Kelas</option>
                  <optgroup label="Filter Jenjang / Paket">
                    <option value="Paket A">Paket A (Kls 4, 5, 6)</option>
                    <option value="Paket B">Paket B (Kls 7, 8, 9)</option>
                    <option value="Paket C">Paket C (Kls 10, 11, 12)</option>
                  </optgroup>
                  <optgroup label="Filter Per Kelas (Siswa Aktif)">
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => (
                      <option key={k} value={k.toString()}>
                        Kelas {k} ({classCounts[k.toString()] || 0} Siswa Aktif)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <select
                  value={studentStatusFilter}
                  onChange={(e) => {
                    setStudentStatusFilter(e.target.value);
                    setStudentPage(1);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Status Siswa</option>
                  <option value="AKTIF">AKTIF</option>
                  <option value="BELUM">BELUM REGISTRASI</option>
                  <option value="TIDAK AKTIF">TIDAK AKTIF</option>
                  <option value="PINDAH">PINDAH</option>
                  <option value="KELUAR">KELUAR / LULUS</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-2 font-semibold">
                <span>Total: <b className="text-slate-900 dark:text-white">{filteredStudents.length}</b> siswa</span>
                {(studentClassFilter !== 'ALL' || studentStatusFilter !== 'ALL' || studentSearch) && (
                  <button
                    onClick={() => {
                      setStudentClassFilter('ALL');
                      setStudentStatusFilter('ALL');
                      setStudentSearch('');
                      setStudentPage(1);
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 text-[11px] underline font-bold"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase font-black tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">No</th>
                    <th className="py-3 px-4">Profil Siswa & NISN</th>
                    <th className="py-3 px-3">Jenjang & Kelas</th>
                    <th className="py-3 px-3">Status Kesiswaan</th>
                    <th className="py-3 px-3">Status Ujian CBT</th>
                    <th className="py-3 px-3 text-center">Akun CBT</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium bg-white dark:bg-slate-900/40">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Tidak ada data siswa yang cocok dengan filter.</p>
                        <button
                          onClick={handleOpenAddStudent}
                          className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Tambah Siswa Baru
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((std, idx) => {
                      const userAcc = users.find((u) => u.username === std.nisn);
                      const stdSub = submissions.find((sub) => sub.nisn === std.nisn);

                      return (
                        <tr key={std.nisn} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3 text-slate-500 font-bold">{startStudentIdx + idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <StudentAvatar
                                name={std.namaLengkap || std.nama}
                                photoUrl={std.linkFoto || std.pasFoto}
                                size="md"
                              />
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-white text-sm leading-tight">
                                  {std.namaLengkap || std.nama}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-bold tracking-wide">
                                    NISN: {std.nisn}
                                  </span>
                                  {std.nopdkt && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700/40">
                                      {std.nopdkt}
                                    </span>
                                  )}
                                  {std.nik && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                      NIK: {std.nik.slice(0, 6)}...
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                              {std.jenjang} - Kelas {std.kelas}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border inline-block ${
                                std.status === 'AKTIF'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                                  : std.status === 'BELUM'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                                  : std.status === 'PINDAH'
                                  ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30'
                                  : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                              }`}
                            >
                              {std.status === 'AKTIF' ? 'Lengkap (Aktif)' : std.status === 'BELUM' ? 'Belum Berkas' : std.status}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {std.status !== 'AKTIF' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 font-bold text-[10px]" title="Akses CBT terkunci karena berkas belum lengkap">
                                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                <span>Terkunci</span>
                              </span>
                            ) : stdSub ? (
                              stdSub.pelanggaran >= 3 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/80 text-red-300 border border-red-500/40 font-bold text-[10px]" title="Didiskualifikasi karena 3x keluar layar ujian">
                                  <XCircle className="w-3 h-3 text-red-400 shrink-0" />
                                  <span>Diskualifikasi</span>
                                </span>
                              ) : stdSub.nilaiAkhir >= 75 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]" title={`Skor: ${stdSub.nilaiAkhir} • Lulus KKM 75`}>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span>Lulus ({stdSub.nilaiAkhir})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-500/40 font-bold text-[10px]" title={`Skor: ${stdSub.nilaiAkhir} • Di bawah KKM 75`}>
                                  <RefreshCw className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Remedial ({stdSub.nilaiAkhir})</span>
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[10px]">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>Belum Ujian</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {userAcc ? (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-500/30 text-[10px] font-bold" title="Akun login siswa aktif di sistem">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Aktif</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  StorageService.syncStudentAccount(std);
                                  reloadData();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-900/60 text-[10px] font-bold transition shadow-2xs"
                                title="Klik untuk aktifkan akun login"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>Buat Akun</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onOpenStats(std)}
                                className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-500/30 transition shadow-2xs"
                                title="Lihat Analisis Statistik & Rapor Siswa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditStudent(std)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-amber-300 dark:border-slate-700 transition shadow-2xs"
                                title="Edit Data Siswa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setStudentToDelete(std)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-slate-800 dark:hover:bg-rose-600/30 dark:text-rose-400 dark:border-rose-500/20 transition cursor-pointer active:scale-95 shadow-2xs"
                                title="Hapus Siswa & Akun Login"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* Pagination Controls */}
            {totalStudentItems > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <div className="flex items-center gap-3">
                  <span>
                    Menampilkan <b className="text-slate-900 dark:text-white">{startStudentIdx + 1}–{endStudentIdx}</b> dari{' '}
                    <b className="text-slate-900 dark:text-white">{totalStudentItems}</b> siswa
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span>Per hal:</span>
                    <select
                      value={studentPageSize}
                      onChange={(e) => {
                        const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                        setStudentPageSize(val);
                        setStudentPage(1);
                      }}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-bold focus:outline-none"
                    >
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="ALL">Semua</option>
                    </select>
                  </div>
                </div>

                {studentPageSize !== 'ALL' && totalStudentPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setStudentPage(1)}
                      disabled={currentSafeStudentPage <= 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Halaman Pertama"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                      disabled={currentSafeStudentPage <= 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 font-bold text-[11px]"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Sebelumnya</span>
                    </button>

                    <span className="px-3 py-1 font-bold text-slate-900 dark:text-white text-xs bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      {currentSafeStudentPage} / {totalStudentPages}
                    </span>

                    <button
                      onClick={() => setStudentPage((p) => Math.min(totalStudentPages, p + 1))}
                      disabled={currentSafeStudentPage >= totalStudentPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 font-bold text-[11px]"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setStudentPage(totalStudentPages)}
                      disabled={currentSafeStudentPage >= totalStudentPages}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      title="Halaman Terakhir"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: JADWAL UJIAN */}
      {activeTab === 'JADWAL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Jadwal Asesmen STS TP 2026/2027
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {schedules.length} Sesi Terjadwal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {schedules.filter((s) => s.status === 'AKTIF').length} Sesi Aktif • Sinkron Realtime dengan Database Google Spreadsheet
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <button
                onClick={handleCopySchedulesToSpreadsheet}
                className="px-3.5 py-2 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 text-xs font-bold border border-emerald-600/40 transition flex items-center gap-1.5 active:scale-95 shadow-xs"
                title="Salin seluruh baris tabel jadwal format Google Spreadsheet (Ctrl+V ke tab JADWAL_DAN_KELAS)"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-300" />
                <span>Salin ke Spreadsheet (Ctrl+V)</span>
              </button>
              <button
                onClick={handleDownloadScheduleCSV}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
                title="Unduh jadwal ujian dalam format file CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>Unduh CSV</span>
              </button>
              <button
                onClick={handleResetToOfficialSTS}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold border border-amber-500/30 transition flex items-center gap-1.5"
                title="Muat ulang 117 jadwal resmi STS 2026/2027"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset 117 Jadwal</span>
              </button>
              <button
                onClick={() => setShowAddScheduleModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Jadwal</span>
              </button>
            </div>
          </div>

          {/* Feedback banner jika jadwal berhasil disalin */}
          {copyScheduleMsg && (
            <div className="bg-emerald-950/70 border border-emerald-500/50 p-4 rounded-2xl flex items-start gap-3 text-emerald-200 text-xs leading-relaxed animate-fade-in shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-emerald-100">{copyScheduleMsg}</p>
                <p className="text-emerald-300/80 text-[11px]">
                  Buka file Google Spreadsheet Anda &gt; Buat tab baru bernama <b>JADWAL_DAN_KELAS</b> &gt; Klik sel <b>A1</b> &gt; Tekan <b>Ctrl+V</b>. Seluruh kolom dan baris jadwal akan langsung rapi otomatis!
                </p>
              </div>
            </div>
          )}

          {/* Filters & Search Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={schedSearch}
                onChange={(e) => setSchedSearch(e.target.value)}
                placeholder="Cari mapel, token, ruangan..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter Hari */}
            <div>
              <select
                value={schedFilterHari}
                onChange={(e) => setSchedFilterHari(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Hari Pelaksanaan</option>
                <option value="Senin">Hari Senin</option>
                <option value="Selasa">Hari Selasa</option>
                <option value="Rabu">Hari Rabu</option>
                <option value="Kamis">Hari Kamis</option>
              </select>
            </div>

            {/* Filter Kelas */}
            <div>
              <select
                value={schedFilterKelas}
                onChange={(e) => setSchedFilterKelas(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Kelas & Paket</option>
                <option value="Paket A">Paket A (Kls 4, 5, 6)</option>
                <option value="Paket B">Paket B (Kls 7, 8, 9)</option>
                <option value="Paket C">Paket C (Kls 10, 11, 12)</option>
                <option value="4">Kelas 4</option>
                <option value="5">Kelas 5</option>
                <option value="6">Kelas 6</option>
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
                <option value="10">Kelas 10</option>
                <option value="11">Kelas 11</option>
                <option value="12">Kelas 12</option>
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <select
                value={schedFilterStatus}
                onChange={(e) => setSchedFilterStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Status Ujian</option>
                <option value="AKTIF">Status: AKTIF (Dapat Dikerjakan)</option>
                <option value="Terjadwal">Status: Terjadwal</option>
                <option value="NONAKTIF">Status: NONAKTIF</option>
              </select>
            </div>
          </div>

          {/* Mass update bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">
                Menampilkan <strong className="text-white">{filteredSchedules.length}</strong> dari {schedules.length} jadwal
              </span>
              {selectedScheduleIds.length > 0 && (
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-bold">
                  {selectedScheduleIds.length} dipilih
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSelectAllSchedules}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
              >
                Pilih Semua
              </button>
              <button
                onClick={handleClearSelectSchedules}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold border border-slate-700"
              >
                Batal
              </button>
              <button
                onClick={() => handleMassUpdateScheduleStatus('AKTIF')}
                disabled={selectedScheduleIds.length === 0}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow transition"
              >
                Aktifkan ({selectedScheduleIds.length})
              </button>
              <button
                onClick={() => handleMassUpdateScheduleStatus('Terjadwal')}
                disabled={selectedScheduleIds.length === 0}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold shadow transition"
              >
                Jadikan Terjadwal ({selectedScheduleIds.length})
              </button>
              <button
                onClick={() => handleMassUpdateScheduleStatus('NONAKTIF')}
                disabled={selectedScheduleIds.length === 0}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold shadow transition"
              >
                Nonaktifkan ({selectedScheduleIds.length})
              </button>
            </div>
          </div>

          {/* Table of Schedules */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-3 text-center w-10">Pilih</th>
                  <th className="p-3">Mata Pelajaran & Kode</th>
                  <th className="p-3">Hari & Tanggal</th>
                  <th className="p-3">Waktu & Ruangan</th>
                  <th className="p-3 text-center">Kelas / Target</th>
                  <th className="p-3 text-center">Token Asesmen</th>
                  <th className="p-3 text-center">Status Ujian</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Tidak ada jadwal yang sesuai dengan filter atau pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredSchedules.map((s) => {
                    const isChecked = selectedScheduleIds.includes(s.idJadwal);
                    const isAktif = s.status === 'AKTIF';

                    return (
                      <tr
                        key={s.idJadwal}
                        className={`hover:bg-slate-850/60 transition ${
                          isChecked ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectSchedule(s.idJadwal)}
                            className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-white text-sm">{s.mapel}</p>
                            {s.kategori && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {s.kategori}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>{s.idJadwal}</span>
                            {s.bankSoalId && (
                              <span className="text-indigo-300">Bank: {s.bankSoalId}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300">
                          <div className="font-semibold text-slate-200">
                            {s.hari || 'Senin'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {s.tglDisplay || s.tanggal}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300">
                          <div className="font-medium text-slate-200">
                            {s.jam || `${s.jamMulai} - ${s.jamSelesai} WIB`}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-medium">
                            {s.ruangan || 'Ruang CBT Online'}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold text-[11px] border border-slate-700">
                            {s.namaKelas || `${s.jenjang} - ${s.kelas}`}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-indigo-300 border border-indigo-500/30 tracking-wider">
                            {s.token}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleScheduleStatus(s)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                              isAktif
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                : s.status === 'Terjadwal'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                            }`}
                            title="Klik untuk ubah status cepat"
                          >
                            {s.status}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleToggleScheduleStatus(s)}
                              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                                isAktif
                                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                              }`}
                              title={isAktif ? 'Set Jadwal' : 'Aktifkan Sekarang'}
                            >
                              {isAktif ? 'Hold' : 'Mulai'}
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(s.idJadwal)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* TAB 3: BANK SOAL */}
      {activeTab === 'SOAL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  Bank Soal CBT Online
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Sheet: BANK_SOAL (15 Kolom)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Total {questions.length} Butir Soal Terdaftar dalam Sistem CBT
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowRekapModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
                title="Lihat Format Sheet BANK_SOAL & Salin Kode Apps Script"
              >
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span>Format Sheet & Kode Apps Script</span>
              </button>

              <button
                onClick={handleSyncBankSoal}
                disabled={isSyncingBankSoal}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer ${
                  isSyncingBankSoal
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-600/30'
                }`}
                title="Tarik butir soal dari Google Spreadsheet tab BANK_SOAL"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingBankSoal ? 'animate-spin' : ''}`} />
                <span>{isSyncingBankSoal ? 'Menarik Soal...' : 'Tarik dari Sheet BANK_SOAL'}</span>
              </button>

              <button
                onClick={() => setShowAddQuestionModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Butir Soal</span>
              </button>
            </div>
          </div>

          {/* Sync status alert */}
          {bankSoalSyncMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 border animate-fadeIn ${
                bankSoalSyncMsg.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                {bankSoalSyncMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{bankSoalSyncMsg.text}</span>
              </div>
              <button
                onClick={() => setBankSoalSyncMsg(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Tutup
              </button>
            </div>
          )}


          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div
                key={q.idSoal}
                className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 space-y-3 hover:border-slate-600 transition"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 mr-2">
                      Soal #{idx + 1} • {q.mapel} ({q.jenjang} Kelas {q.kelas})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {q.idUjian} | Bobot: {q.bobot}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteQuestion(q.idSoal)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-slate-100 font-medium leading-relaxed">
                  {q.soal}
                </p>

                {/* Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                    const text = q[letter.toLowerCase() as 'a' | 'b' | 'c' | 'd'];
                    const isCorrect = q.kunci.toUpperCase() === letter;

                    return (
                      <div
                        key={letter}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                          isCorrect
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 font-bold'
                            : 'bg-slate-800 border-slate-700/80 text-slate-300'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {letter}
                        </span>
                        <span className="truncate">{text}</span>
                        {isCorrect && (
                          <span className="ml-auto text-[10px] text-emerald-400 font-bold">
                            (Kunci)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MONITORING PTS & NILAI (INTEGRATED TEACHER & ADMIN PANEL) */}
      {activeTab === 'NILAI' && (() => {
        const availableClasses = ['ALL', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
        const availableSubjects = [
          'ALL',
          ...Array.from(new Set(submissions.map((s) => s.mapel))),
        ];

        const filteredNilaiSubmissions = submissions.filter((sub) => {
          const matchClass = nilaiClassFilter === 'ALL' || sub.kelas === nilaiClassFilter;
          const matchSubject = nilaiSubjectFilter === 'ALL' || sub.mapel === nilaiSubjectFilter;
          const matchSearch =
            sub.namaSiswa.toLowerCase().includes(nilaiSearchTerm.toLowerCase()) ||
            sub.nisn.includes(nilaiSearchTerm);
          return matchClass && matchSubject && matchSearch;
        });

        const filteredNilaiViolations = violations.filter((v) => {
          const matchClass = nilaiClassFilter === 'ALL' || v.kelas === nilaiClassFilter;
          const matchSubject = nilaiSubjectFilter === 'ALL' || v.mapel === nilaiSubjectFilter;
          return matchClass && matchSubject;
        });

        const statsPTS = {
          mengerjakan: filteredNilaiSubmissions.length,
          lulus: filteredNilaiSubmissions.filter((s) => s.status.includes('LULUS')).length,
          tuntas: filteredNilaiSubmissions.filter((s) => s.status.includes('TUNTAS')).length,
          selesai: filteredNilaiSubmissions.filter((s) => s.status.includes('SELESAI')).length,
          tidakTuntas: filteredNilaiSubmissions.filter((s) => s.status.includes('TIDAK TUNTAS')).length,
          remedial: filteredNilaiSubmissions.filter((s) => s.status.includes('REMEDIAL')).length,
        };

        const handleExportExcelPTS = () => {
          ExportService.exportToExcel(
            filteredNilaiSubmissions,
            `Rekap_PTS_Kelas_${nilaiClassFilter}_${nilaiSubjectFilter}.xlsx`
          );
        };

        const handleExportPDFPTS = () => {
          ExportService.exportToPDF(
            filteredNilaiSubmissions,
            `REKAPITULASI NILAI PTS (KELAS: ${nilaiClassFilter}, MAPEL: ${nilaiSubjectFilter})`,
            'Administrator & Pengawas CBT Rombel KTCT Tambora'
          );
        };

        return (
          <div className="space-y-6">
            {/* Header & Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs dark:shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-indigo-500" />
                    <span>Monitoring Penilaian Tengah Semester & Rekap Nilai</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Pusat Kendali Pengawas, Guru Mata Pelajaran, & Administrator CBT Rombongan Belajar KTCT Tambora
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportExcelPTS}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5 active:scale-95"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ekspor Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={handleExportPDFPTS}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5 active:scale-95"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ekspor PDF Resmi</span>
                  </button>
                  {onSendAlert && (
                    <button
                      onClick={onSendAlert}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 active:scale-95"
                    >
                      <Bell className="w-4 h-4 text-amber-500" />
                      <span>Broadcast Pesan</span>
                    </button>
                  )}
                  <button
                    onClick={reloadData}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5"
                    title="Segarkan Nilai"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Segarkan</span>
                  </button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Filter Kelas:
                  </label>
                  <select
                    value={nilaiClassFilter}
                    onChange={(e) => setNilaiClassFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        {c === 'ALL' ? '-- Semua Kelas --' : `Kelas ${c}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Filter Mata Pelajaran:
                  </label>
                  <select
                    value={nilaiSubjectFilter}
                    onChange={(e) => setNilaiSubjectFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {availableSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s === 'ALL' ? '-- Semua Mata Pelajaran --' : s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Cari Siswa / NISN:
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={nilaiSearchTerm}
                      onChange={(e) => setNilaiSearchTerm(e.target.value)}
                      placeholder="Ketik nama atau NISN..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Counters Bar */}
            <div className="flex flex-wrap gap-2.5">
              <div className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mr-2.5">Mengerjakan:</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{statsPTS.mengerjakan}</span>
              </div>
              <div className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mr-2.5">✅ Lulus:</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{statsPTS.lulus}</span>
              </div>
              <div className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-amber-500/30 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mr-2.5">⭐ Tuntas:</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">{statsPTS.tuntas}</span>
              </div>
              <div className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mr-2.5">⚠️ Selesai:</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{statsPTS.selesai}</span>
              </div>
              <div className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-rose-500/30 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase mr-2.5">❌ Tidak Tuntas:</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">{statsPTS.tidakTuntas}</span>
              </div>
              <div className="flex items-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-purple-500/30 rounded-2xl shadow-xs">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mr-2.5">🚫 Remedial:</span>
                <span className="text-base font-black text-purple-600 dark:text-purple-400">{statsPTS.remedial}</span>
              </div>
            </div>

            {/* Main Dual Grid: Nilai & Log Pelanggaran Live */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left 3 cols: Hasil Ujian */}
              <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs dark:shadow-xl flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-black text-slate-900 dark:text-white text-sm flex items-center justify-between">
                  <span>Daftar Nilai Hasil Ujian Siswa</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {filteredNilaiSubmissions.length} Data
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-bold text-[10px] text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="p-3.5">Identitas Siswa</th>
                        <th className="p-3.5">Mapel</th>
                        <th className="p-3.5 text-center">Kelas</th>
                        <th className="p-3.5 text-center">Nilai Mentah</th>
                        <th className="p-3.5 text-center">Pelanggaran</th>
                        <th className="p-3.5 text-center">Nilai Akhir</th>
                        <th className="p-3.5 text-center">Status</th>
                        <th className="p-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredNilaiSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            Tidak ada data nilai ujian yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredNilaiSubmissions.map((sub) => {
                          const std = students.find((st) => st.nisn === sub.nisn);

                          return (
                            <tr key={sub.idHasil} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition">
                              <td className="p-3.5">
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">{sub.namaSiswa}</p>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  NISN: {sub.nisn}
                                </span>
                              </td>
                              <td className="p-3.5 text-slate-700 dark:text-slate-300 font-medium">
                                {sub.mapel}
                              </td>
                              <td className="p-3.5 text-center text-slate-700 dark:text-slate-300">
                                Kelas {sub.kelas}
                              </td>
                              <td className="p-3.5 text-center text-slate-500 dark:text-slate-400">
                                {sub.nilaiMentah}
                              </td>
                              <td className="p-3.5 text-center text-rose-500 font-bold">
                                {sub.pelanggaran || 0}x
                              </td>
                              <td className="p-3.5 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                {sub.nilaiAkhir}
                              </td>
                              <td className="p-3.5 text-center">
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {sub.status}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {std && (
                                    <>
                                      <button
                                        onClick={() => onOpenStats(std)}
                                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 transition"
                                        title="Lihat Analisis Statistik"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          const an = StorageService.getIndividualAnalysis(std.nisn);
                                          ExportService.exportStudentReportCardPDF(std, [sub], an);
                                        }}
                                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 transition"
                                        title="Unduh Rapor Siswa PDF"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
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

              {/* Right 2 cols: Log Pelanggaran Anti-Nyontek Live */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs dark:shadow-xl flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-black text-rose-500 dark:text-rose-400 text-sm flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Log Pelanggaran CBT Live</span>
                  </span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {filteredNilaiViolations.length} Insiden
                  </span>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-bold text-[10px] text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="p-3.5">Siswa</th>
                        <th className="p-3.5 text-center">Kelas</th>
                        <th className="p-3.5">Pelanggaran</th>
                        <th className="p-3.5 text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredNilaiViolations.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500">
                            Tidak ada pelanggaran tercatat. Seluruh siswa disiplin!
                          </td>
                        </tr>
                      ) : (
                        filteredNilaiViolations.map((v) => (
                          <tr key={v.idPelanggaran} className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition">
                            <td className="p-3.5">
                              <p className="font-bold text-slate-900 dark:text-white">{v.namaSiswa}</p>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{v.nisn}</span>
                            </td>
                            <td className="p-3.5 text-center text-slate-700 dark:text-slate-300">
                              {v.kelas}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                                {v.jenisPelanggaran}
                              </span>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[140px]">
                                {v.mapel}
                              </p>
                            </td>
                            <td className="p-3.5 text-right text-[10px] text-slate-500 dark:text-slate-400">
                              {v.waktu.split(' ')[1] || v.waktu}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 5: PENGGUNA & 2FA */}
      {activeTab === 'PENGGUNA' && (() => {
        const passwords = StorageService.getPasswords();
        const filteredUsers = users.filter((u) => {
          const q = userSearchTerm.toLowerCase();
          const matchQuery =
            !q ||
            u.nama?.toLowerCase().includes(q) ||
            u.username?.toLowerCase().includes(q) ||
            u.nopdkt?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q);

          const matchRole =
            userRoleFilter === 'ALL' ||
            (userRoleFilter === 'SISWA' && u.role === 'SISWA') ||
            (userRoleFilter === 'GURU' && (u.role === 'GURU' || u.role.includes('GURU'))) ||
            (userRoleFilter === 'ADMIN' && (u.role === 'ADMIN' || u.role === 'SUPERADMIN')) ||
            (userRoleFilter === 'OTHER' && u.role !== 'SISWA' && !u.role.includes('GURU') && u.role !== 'ADMIN' && u.role !== 'SUPERADMIN');

          return matchQuery && matchRole;
        });

        const siswaCount = users.filter(u => u.role === 'SISWA').length;
        const guruCount = users.filter(u => u.role === 'GURU' || u.role.includes('GURU')).length;
        const adminCount = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length;

        return (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">
                    Manajemen Pengguna & Kredensial Login
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {users.length} Akun Terdaftar
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Aturan Password Siswa & Orang Tua: <strong className="text-amber-400">nama sebelum spasi (huruf kecil) + nomor PDKT</strong> (contoh: <code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">asep036</code>).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleBulkGenerateStudentAccounts}
                  disabled={isGeneratingStudentUsers}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                  title="Generate otomatis seluruh akun Siswa & Orang Tua dengan password nama sebelum spasi + no. pdkt"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingStudentUsers ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingStudentUsers ? 'Memproses Akun...' : '⚡ Buat & Sinkronkan Akun Siswa & Ortu (818)'}</span>
                </button>

                <button
                  onClick={handleExportAllAccountsToExcel}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
                  title="Unduh daftar lengkap username dan password seluruh siswa & orang tua ke format Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ekspor Excel Akun (Siswa & Ortu)</span>
                </button>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah Pengguna</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setUserRoleFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    userRoleFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({users.length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('SISWA')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    userRoleFilter === 'SISWA'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Siswa ({siswaCount})
                </button>
                <button
                  onClick={() => setUserRoleFilter('GURU')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    userRoleFilter === 'GURU'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Guru ({guruCount})
                </button>
                <button
                  onClick={() => setUserRoleFilter('ADMIN')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    userRoleFilter === 'ADMIN'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Admin ({adminCount})
                </button>
              </div>

              <div className="relative min-w-[260px]">
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Cari nama, NISN, PDKT, username..."
                  className="w-full bg-slate-800/80 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-4 py-2 outline-none focus:border-indigo-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/90 uppercase font-bold text-[10px] text-slate-400">
                  <tr>
                    <th className="p-3">Nama Pengguna</th>
                    <th className="p-3">Username / NISN</th>
                    <th className="p-3 text-center">No. PDKT</th>
                    <th className="p-3 text-center">Peran</th>
                    <th className="p-3 text-center">Password Login</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Keamanan 2FA</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada pengguna yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.slice(0, 100).map((u) => {
                      const rawFirst = (u.nama || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                      const pdktVal = (u.nopdkt || '').trim().toLowerCase().replace(/^pdkt-?/i, '');
                      const dynamicPass = u.role === 'SISWA' ? `${rawFirst}${pdktVal}` : (passwords[u.username] || '123456');
                      const currentPass = passwords[u.username] || (u.nopdkt && passwords[u.nopdkt]) || dynamicPass;

                      return (
                        <tr key={u.idUser || u.username} className="hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            <p className="font-bold text-white">{u.nama}</p>
                            <span className="text-[10px] text-slate-400">{u.email || '-'}</span>
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-300">{u.username}</td>
                          <td className="p-3 text-center font-mono font-bold text-amber-400">
                            {u.nopdkt || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              u.role === 'SISWA'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : u.role === 'GURU' || u.role.includes('GURU')
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono">
                            <div className="inline-flex items-center gap-1.5 bg-slate-950/70 border border-slate-700 px-2 py-1 rounded-lg">
                              <span className="text-emerald-400 font-bold text-[11px]">{currentPass}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(currentPass);
                                  Swal.fire({
                                    title: 'Password Disalin!',
                                    text: `Password untuk ${u.username}: ${currentPass}`,
                                    icon: 'success',
                                    timer: 1000,
                                    showConfirmButton: false
                                  });
                                }}
                                className="text-slate-400 hover:text-white transition"
                                title="Salin Password"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                              {u.status || 'AKTIF'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleToggleUser2FA(u)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-bold transition ${
                                u.twoFactorEnabled
                                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/50'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                              }`}
                            >
                              {u.twoFactorEnabled ? '2FA Aktif' : '2FA Nonaktif'}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                const newP = prompt(`Ubah password untuk user ${u.username}:`, currentPass);
                                if (newP && newP.trim()) {
                                  StorageService.setPassword(u.username, newP.trim());
                                  if (u.nopdkt) StorageService.setPassword(u.nopdkt, newP.trim());
                                  setUsers(StorageService.getUsers());
                                  Swal.fire('Berhasil', `Password ${u.username} diperbarui menjadi: ${newP.trim()}`, 'success');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="Reset/Ubah Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredUsers.length > 100 && (
              <p className="text-[11px] text-slate-400 text-right">
                Menampilkan 100 dari {filteredUsers.length} akun. Gunakan kotak pencarian untuk menemukan akun tertentu.
              </p>
            )}

            {/* Modal Tambah Pengguna Baru */}
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white animate-in zoom-in-95 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-indigo-400" />
                      Tambah Pengguna Baru
                    </h3>
                    <button
                      onClick={() => setShowAddUserModal(false)}
                      className="text-slate-400 hover:text-white font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveNewUser} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Peran (Role)</label>
                      <select
                        value={newUserData.role}
                        onChange={(e) => {
                          const r = e.target.value;
                          setNewUserData({ ...newUserData, role: r });
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="SISWA">Siswa / Peserta Didik</option>
                        <option value="GURU">Guru Pengajar</option>
                        <option value="WALI_KELAS">Wali Kelas</option>
                        <option value="BENDAHARA">Bendahara</option>
                        <option value="BK">Bimbingan Konseling (BK)</option>
                        <option value="PERPUSTAKAAN">Staf Perpustakaan</option>
                        <option value="ADMIN">Administrator</option>
                        <option value="SUPERADMIN">Super Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Nama Lengkap *</label>
                      <input
                        type="text"
                        required
                        value={newUserData.nama}
                        onChange={(e) => setNewUserData({ ...newUserData, nama: e.target.value })}
                        placeholder="Contoh: ASEP MULYANA"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">
                        Username / NISN / NIP *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserData.username}
                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                        placeholder={newUserData.role === 'SISWA' ? '0069773570 (NISN)' : 'guru.matematika'}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    {newUserData.role === 'SISWA' && (
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Nomor PDKT</label>
                        <input
                          type="text"
                          value={newUserData.nopdkt}
                          onChange={(e) => setNewUserData({ ...newUserData, nopdkt: e.target.value })}
                          placeholder="Contoh: 036"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 font-mono"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Nomor PDKT akan digunakan untuk membentuk password otomatis.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Password (Opsional)</label>
                      <input
                        type="text"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        placeholder={
                          newUserData.role === 'SISWA'
                            ? 'Otomatis: nama depan + no. pdkt'
                            : 'Otomatis: username123'
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Email (Opsional)</label>
                      <input
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        placeholder="user@sekolah.sch.id"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-md"
                      >
                        Simpan Pengguna
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal: Tambah Jadwal Baru */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white animate-in zoom-in-95">
            <h3 className="text-lg font-black text-white mb-4">
              Tambah Jadwal Ujian PTS Baru
            </h3>
            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={newSchedule.mapel}
                  onChange={(e) => setNewSchedule({ ...newSchedule, mapel: e.target.value })}
                  placeholder="Contoh: Pendidikan Kewarganegaraan"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Jenjang</label>
                  <select
                    value={newSchedule.jenjang}
                    onChange={(e) => setNewSchedule({ ...newSchedule, jenjang: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Paket A">Paket A</option>
                    <option value="Paket B">Paket B</option>
                    <option value="Paket C">Paket C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kelas</label>
                  <select
                    value={newSchedule.kelas}
                    onChange={(e) => setNewSchedule({ ...newSchedule, kelas: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => (
                      <option key={k} value={k.toString()}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={newSchedule.tanggal}
                    onChange={(e) => setNewSchedule({ ...newSchedule, tanggal: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={newSchedule.jamMulai}
                    onChange={(e) => setNewSchedule({ ...newSchedule, jamMulai: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    value={newSchedule.durasi}
                    onChange={(e) => setNewSchedule({ ...newSchedule, durasi: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Token Ujian</label>
                <input
                  type="text"
                  value={newSchedule.token}
                  onChange={(e) => setNewSchedule({ ...newSchedule, token: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 font-mono font-bold text-white uppercase"
                />
              </div>

              <div className="flex gap-2 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Soal Baru */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white my-auto animate-in zoom-in-95">
            <h3 className="text-lg font-black text-white mb-4">
              Tambah Butir Soal CBT
            </h3>
            <form onSubmit={handleSaveQuestion} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Pilih Ujian Terkait</label>
                  <select
                    value={newQuestion.idUjian}
                    onChange={(e) => {
                      const selectedSched = schedules.find((s) => s.idUjian === e.target.value);
                      setNewQuestion({
                        ...newQuestion,
                        idUjian: e.target.value,
                        mapel: selectedSched?.mapel || newQuestion.mapel,
                        kelas: selectedSched?.kelas || newQuestion.kelas,
                        jenjang: selectedSched?.jenjang || newQuestion.jenjang,
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white"
                  >
                    {schedules.map((s) => (
                      <option key={s.idJadwal} value={s.idUjian}>
                        {s.mapel} (Kls {s.kelas})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Bobot Nilai</label>
                  <input
                    type="number"
                    value={newQuestion.bobot}
                    onChange={(e) => setNewQuestion({ ...newQuestion, bobot: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Pertanyaan / Soal</label>
                <textarea
                  required
                  rows={3}
                  value={newQuestion.soal}
                  onChange={(e) => setNewQuestion({ ...newQuestion, soal: e.target.value })}
                  placeholder="Tuliskan teks pertanyaan secara jelas..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Pilihan A</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.a}
                    onChange={(e) => setNewQuestion({ ...newQuestion, a: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Pilihan B</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.b}
                    onChange={(e) => setNewQuestion({ ...newQuestion, b: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Pilihan C</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.c}
                    onChange={(e) => setNewQuestion({ ...newQuestion, c: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Pilihan D</label>
                  <input
                    type="text"
                    required
                    value={newQuestion.d}
                    onChange={(e) => setNewQuestion({ ...newQuestion, d: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Kunci Jawaban Benar</label>
                <select
                  value={newQuestion.kunci}
                  onChange={(e) => setNewQuestion({ ...newQuestion, kunci: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="A">Pilihan A</option>
                  <option value="B">Pilihan B</option>
                  <option value="C">Pilihan C</option>
                  <option value="D">Pilihan D</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT BUKU INDUK SISWA LENGKAP */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/60 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>{editingStudentNisn ? 'Edit Buku Induk & Data Dapodik Siswa' : 'Tambah Siswa Baru (Buku Induk Lengkap)'}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 font-mono border border-indigo-700/50">
                      KTCT Tambora
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Formulir terpadu data pokok peserta didik, kontak, orang tua/wali, dan berkas persyaratan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStudentModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 pt-2 gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
              <button
                type="button"
                onClick={() => setStudentModalTab('IDENTITAS')}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition whitespace-nowrap ${
                  studentModalTab === 'IDENTITAS'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>1. Identitas & Fisik</span>
              </button>

              <button
                type="button"
                onClick={() => setStudentModalTab('ALAMAT')}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition whitespace-nowrap ${
                  studentModalTab === 'ALAMAT'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>2. Alamat & Kontak</span>
              </button>

              <button
                type="button"
                onClick={() => setStudentModalTab('AKADEMIK')}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition whitespace-nowrap ${
                  studentModalTab === 'AKADEMIK'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>3. Akademik & Bantuan</span>
              </button>

              <button
                type="button"
                onClick={() => setStudentModalTab('KELUARGA')}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition whitespace-nowrap ${
                  studentModalTab === 'KELUARGA'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>4. Orang Tua & Wali</span>
              </button>

              <button
                type="button"
                onClick={() => setStudentModalTab('BERKAS')}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition whitespace-nowrap ${
                  studentModalTab === 'BERKAS'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>5. Kelengkapan Berkas</span>
              </button>
            </div>

            {/* Modal Body with Scroll */}
            <form id="studentFullForm" onSubmit={handleSaveStudent} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* TAB 1: IDENTITAS & FISIK */}
              {studentModalTab === 'IDENTITAS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">
                        NOPDKT (No. Pokok Peserta Didik KT)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: KTCT-2025-1001"
                        value={studentFormData.nopdkt || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, nopdkt: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Tahun Masuk</label>
                      <input
                        type="text"
                        placeholder="Contoh: 2025"
                        value={studentFormData.tahunMasuk || '2025'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, tahunMasuk: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">
                        NISN (10 Digit) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={12}
                        disabled={!!editingStudentNisn}
                        placeholder="Contoh: 0091234501"
                        value={studentFormData.nisn || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, nisn: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold disabled:opacity-60"
                      />
                      <span className="text-[10px] text-indigo-300">Digunakan juga sebagai ID Login Siswa CBT</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 font-bold mb-1">
                        Nama Lengkap Siswa <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nama lengkap sesuai Akta / Ijazah"
                        value={studentFormData.namaLengkap || studentFormData.nama || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, namaLengkap: e.target.value, nama: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Jenis Kelamin</label>
                      <select
                        value={studentFormData.jenisKelamin || 'L'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, jenisKelamin: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="L">Laki-laki (L)</option>
                        <option value="P">Perempuan (P)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        placeholder="Contoh: Jakarta"
                        value={studentFormData.tempatLahir || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, tempatLahir: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={studentFormData.tanggalLahir || '2010-01-01'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, tanggalLahir: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">NIK Siswa (16 Digit)</label>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="317301..."
                        value={studentFormData.nik || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, nik: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Anak Ke-</label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={studentFormData.anakKe || 1}
                        onChange={(e) => setStudentFormData({ ...studentFormData, anakKe: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Dari .. Saudara</label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={studentFormData.saudara || 2}
                        onChange={(e) => setStudentFormData({ ...studentFormData, saudara: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Agama</label>
                      <select
                        value={studentFormData.agama || 'Islam'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, agama: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen Protestan</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Konghucu">Konghucu</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Golongan Darah</label>
                      <select
                        value={studentFormData.golonganDarah || 'O'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, golonganDarah: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="AB">AB</option>
                        <option value="O">O</option>
                        <option value="-">Tidak Tahu / Belum Cek</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Tinggi Badan (cm)</label>
                      <input
                        type="number"
                        min={80}
                        max={220}
                        placeholder="155"
                        value={studentFormData.tinggiBadan || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, tinggiBadan: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Berat Badan (kg)</label>
                      <input
                        type="number"
                        min={15}
                        max={150}
                        placeholder="48"
                        value={studentFormData.beratBadan || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, beratBadan: Number(e.target.value) })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Hobi</label>
                      <input
                        type="text"
                        placeholder="Contoh: Membaca, Futsal"
                        value={studentFormData.hobi || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, hobi: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Prestasi Siswa</label>
                      <input
                        type="text"
                        placeholder="Contoh: Juara 2 Cerdas Cermat"
                        value={studentFormData.prestasi || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, prestasi: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 font-bold mb-1">Catatan Penting / Khusus</label>
                      <input
                        type="text"
                        placeholder="Alergi, kondisi khusus, atau bimbingan ekstra"
                        value={studentFormData.catatanPenting || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, catatanPenting: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Pas Foto (URL Gambar)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={studentFormData.pasFoto || studentFormData.linkFoto || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, pasFoto: e.target.value, linkFoto: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ALAMAT & KONTAK */}
              {studentModalTab === 'ALAMAT' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Alamat Tempat Tinggal Lengkap</label>
                    <textarea
                      rows={2}
                      placeholder="Jalan, Gang, No Rumah / Blok"
                      value={studentFormData.alamat || ''}
                      onChange={(e) => setStudentFormData({ ...studentFormData, alamat: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">RT</label>
                      <input
                        type="text"
                        placeholder="005"
                        value={studentFormData.rt || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, rt: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">RW</label>
                      <input
                        type="text"
                        placeholder="03"
                        value={studentFormData.rw || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, rw: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Kelurahan / Desa</label>
                      <input
                        type="text"
                        placeholder="Tambora"
                        value={studentFormData.kelurahan || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, kelurahan: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Kecamatan</label>
                      <input
                        type="text"
                        placeholder="Tambora"
                        value={studentFormData.kecamatan || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, kecamatan: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Kabupaten / Kota</label>
                      <input
                        type="text"
                        placeholder="Jakarta Barat"
                        value={studentFormData.kota || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, kota: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Provinsi</label>
                      <input
                        type="text"
                        placeholder="DKI Jakarta"
                        value={studentFormData.provinsi || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, provinsi: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Kode Pos</label>
                      <input
                        type="text"
                        placeholder="11220"
                        value={studentFormData.kodePos || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, kodePos: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Jenis Tinggal</label>
                      <select
                        value={studentFormData.jenisTinggal || 'Bersama Orang Tua'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, jenisTinggal: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                        <option value="Bersama Wali / Saudara">Bersama Wali / Saudara</option>
                        <option value="Kos / Kontrakan">Kos / Kontrakan</option>
                        <option value="Asrama / Pondok">Asrama / Pondok</option>
                        <option value="Panti Asuhan">Panti Asuhan</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Alat Transportasi ke Rombel</label>
                      <select
                        value={studentFormData.alatTransportasi || 'Jalan Kaki'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, alatTransportasi: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="Jalan Kaki">Jalan Kaki</option>
                        <option value="Sepeda">Sepeda</option>
                        <option value="Sepeda Motor">Sepeda Motor</option>
                        <option value="Angkutan Umum">Angkutan Umum</option>
                        <option value="Ojek Online">Ojek Online</option>
                        <option value="Mobil Pribadi">Mobil Pribadi</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Nomor HP / WhatsApp Siswa</label>
                      <input
                        type="text"
                        placeholder="Contoh: 08123456789"
                        value={studentFormData.nomorHP || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, nomorHP: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Alamat E-Mail Siswa</label>
                      <input
                        type="email"
                        placeholder="siswa@ktct.sch.id"
                        value={studentFormData.email || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AKADEMIK & BANTUAN */}
              {studentModalTab === 'AKADEMIK' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Status Siswa</label>
                      <select
                        value={studentFormData.status || 'AKTIF'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, status: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="AKTIF">AKTIF (Dapat Ikut Ujian CBT)</option>
                        <option value="BELUM">BELUM REGISTRASI LENGKAP</option>
                        <option value="TIDAK AKTIF">TIDAK AKTIF / CUTI</option>
                        <option value="PINDAH">PINDAH ROMBEL / SEKOLAH</option>
                        <option value="KELUAR">KELUAR / LULUS</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Jenjang Pendidikan</label>
                      <select
                        value={studentFormData.jenjang || 'Paket B'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, jenjang: e.target.value as any })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="Paket A">Paket A (Setara SD / Kelas 4 - 6)</option>
                        <option value="Paket B">Paket B (Setara SMP / Kelas 7 - 9)</option>
                        <option value="Paket C">Paket C (Setara SMA / Kelas 10 - 12)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Kelas Saat Ini (Tingkat)</label>
                      <select
                        value={studentFormData.kelasSaatini || studentFormData.kelas || '9'}
                        onChange={(e) =>
                          setStudentFormData({
                            ...studentFormData,
                            kelas: e.target.value,
                            kelasSaatini: e.target.value,
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => (
                          <option key={k} value={k.toString()}>
                            Kelas {k}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Rombongan Belajar (Rombel)</label>
                      <input
                        type="text"
                        value={studentFormData.rombel || 'Rombel KTCT Tambora'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, rombel: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Asal Sekolah Sebelumnya</label>
                      <input
                        type="text"
                        placeholder="Contoh: SD Negeri Tambora 01"
                        value={studentFormData.asalSekolah || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, asalSekolah: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Nomor Peserta UN / SKHUN / Ijazah</label>
                      <input
                        type="text"
                        placeholder="DN-01/D-SD/13/..."
                        value={studentFormData.skhun || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, skhun: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Penerima KPS / KIP / PKH</label>
                      <select
                        value={studentFormData.penerimaKPS || 'Tidak'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, penerimaKPS: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="Tidak">Tidak Menerima</option>
                        <option value="Ya (KIP)">Ya - Penerima Kartu Indonesia Pintar (KIP)</option>
                        <option value="Ya (PKH)">Ya - Program Keluarga Harapan (PKH)</option>
                        <option value="Ya (KPS)">Ya - Kartu Perlindungan Sosial (KPS)</option>
                        <option value="Ya (KJP)">Ya - Kartu Jakarta Pintar (KJP Plus)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ORANG TUA & WALI */}
              {studentModalTab === 'KELUARGA' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">
                        Nomor Kartu Keluarga (KK - 16 Digit)
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="3173010101100001"
                        value={studentFormData.nomorKartuKeluarga || ''}
                        onChange={(e) => setStudentFormData({ ...studentFormData, nomorKartuKeluarga: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Status Yatim Piatu</label>
                      <select
                        value={studentFormData.statusYatim || 'Lengkap'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, statusYatim: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                      >
                        <option value="Lengkap">Orang Tua Lengkap</option>
                        <option value="Yatim">Yatim (Ayah Meninggal)</option>
                        <option value="Piatu">Piatu (Ibu Meninggal)</option>
                        <option value="Yatim Piatu">Yatim Piatu</option>
                      </select>
                    </div>
                  </div>

                  {/* DATA AYAH */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        Data Ayah Kandung
                      </span>
                      <select
                        value={studentFormData.statusAyah || 'Masih Hidup'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, statusAyah: e.target.value as any })}
                        className="bg-slate-900 text-slate-300 text-[11px] font-bold border border-slate-700 rounded-lg px-2 py-1"
                      >
                        <option value="Masih Hidup">Masih Hidup</option>
                        <option value="Meninggal">Sudah Meninggal</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Nama Ayah</label>
                        <input
                          type="text"
                          placeholder="Nama lengkap Ayah"
                          value={studentFormData.namaAyah || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, namaAyah: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">NIK Ayah</label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="3173..."
                          value={studentFormData.nikAyah || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, nikAyah: e.target.value.replace(/\D/g, '') })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">No. Telp / HP Ayah</label>
                        <input
                          type="text"
                          placeholder="0812..."
                          value={studentFormData.tlpAyah || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tlpAyah: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tempat Lahir</label>
                        <input
                          type="text"
                          placeholder="Jakarta"
                          value={studentFormData.tempatLahirAyah || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tempatLahirAyah: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tgl Lahir Ayah</label>
                        <input
                          type="date"
                          value={studentFormData.tanggalLahirAyah || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tanggalLahirAyah: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Pendidikan Ayah</label>
                        <select
                          value={studentFormData.pendidikanAyah || 'SMA/Sederajat'}
                          onChange={(e) => setStudentFormData({ ...studentFormData, pendidikanAyah: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        >
                          <option value="SD/Sederajat">SD/Sederajat</option>
                          <option value="SMP/Sederajat">SMP/Sederajat</option>
                          <option value="SMA/Sederajat">SMA/Sederajat</option>
                          <option value="D1/D2/D3">D1/D2/D3</option>
                          <option value="S1/D4">S1/D4</option>
                          <option value="S2/S3">S2/S3</option>
                          <option value="Tidak Sekolah">Tidak Sekolah</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Pekerjaan Ayah</label>
                        <input
                          type="text"
                          placeholder="Wiraswasta / Karyawan"
                          value={studentFormData.pekerjaanAyah || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, pekerjaanAyah: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DATA IBU */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                        Data Ibu Kandung
                      </span>
                      <select
                        value={studentFormData.statusIbu || 'Masih Hidup'}
                        onChange={(e) => setStudentFormData({ ...studentFormData, statusIbu: e.target.value as any })}
                        className="bg-slate-900 text-slate-300 text-[11px] font-bold border border-slate-700 rounded-lg px-2 py-1"
                      >
                        <option value="Masih Hidup">Masih Hidup</option>
                        <option value="Meninggal">Sudah Meninggal</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Nama Ibu</label>
                        <input
                          type="text"
                          placeholder="Nama lengkap Ibu"
                          value={studentFormData.namaIbu || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, namaIbu: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">NIK Ibu</label>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder="3173..."
                          value={studentFormData.nikIbu || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, nikIbu: e.target.value.replace(/\D/g, '') })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">No. Telp / HP Ibu</label>
                        <input
                          type="text"
                          placeholder="0812..."
                          value={studentFormData.tlpIbu || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tlpIbu: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tempat Lahir</label>
                        <input
                          type="text"
                          placeholder="Jakarta"
                          value={studentFormData.tempatLahirIbu || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tempatLahirIbu: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tgl Lahir Ibu</label>
                        <input
                          type="date"
                          value={studentFormData.tanggalLahirIbu || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tanggalLahirIbu: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Pendidikan Ibu</label>
                        <select
                          value={studentFormData.pendidikanIbu || 'SMA/Sederajat'}
                          onChange={(e) => setStudentFormData({ ...studentFormData, pendidikanIbu: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        >
                          <option value="SD/Sederajat">SD/Sederajat</option>
                          <option value="SMP/Sederajat">SMP/Sederajat</option>
                          <option value="SMA/Sederajat">SMA/Sederajat</option>
                          <option value="D1/D2/D3">D1/D2/D3</option>
                          <option value="S1/D4">S1/D4</option>
                          <option value="S2/S3">S2/S3</option>
                          <option value="Tidak Sekolah">Tidak Sekolah</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Pekerjaan Ibu</label>
                        <input
                          type="text"
                          placeholder="Ibu Rumah Tangga"
                          value={studentFormData.pekerjaanIbu || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, pekerjaanIbu: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DATA WALI */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5 border-b border-slate-800 pb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      Data Wali (Jika Siswa Tinggal Bersama Wali)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Nama Wali</label>
                        <input
                          type="text"
                          placeholder="Nama lengkap Wali"
                          value={studentFormData.namaWali || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, namaWali: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Hubungan dengan Siswa</label>
                        <input
                          type="text"
                          placeholder="Paman / Kakek / Kakak Kandung"
                          value={studentFormData.hubungan || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, hubungan: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">No. Telp / HP Wali</label>
                        <input
                          type="text"
                          placeholder="0812..."
                          value={studentFormData.tlpWali || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tlpWali: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tempat Lahir Wali</label>
                        <input
                          type="text"
                          placeholder="Jakarta"
                          value={studentFormData.tempatLahirWali || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tempatLahirWali: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Tgl Lahir Wali</label>
                        <input
                          type="date"
                          value={studentFormData.tglLahirWali || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, tglLahirWali: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Pendidikan Wali</label>
                        <input
                          type="text"
                          placeholder="SMA / S1"
                          value={studentFormData.pendidikanWali || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, pendidikanWali: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Pekerjaan Wali</label>
                        <input
                          type="text"
                          placeholder="Wiraswasta"
                          value={studentFormData.pekerjaanWali || ''}
                          onChange={(e) => setStudentFormData({ ...studentFormData, pekerjaanWali: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: KELENGKAPAN BERKAS & DOKUMEN */}
              {studentModalTab === 'BERKAS' && (
                <div className="space-y-4">
                  <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-2xl text-xs text-indigo-200 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-white">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      Status Verifikasi Berkas Fisik / Digital Buku Induk
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Pilih status kepemilikan dokumen persyaratan siswa yang telah diverifikasi oleh pengurus Rombel Karang Taruna.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { key: 'aktaKelahiran', label: 'Akta Kelahiran Siswa' },
                      { key: 'kartuKeluarga', label: 'Kartu Keluarga (KK)' },
                      { key: 'kia', label: 'Kartu Identitas Anak (KIA)' },
                      { key: 'ktpAyah', label: 'KTP Ayah' },
                      { key: 'ktpIbu', label: 'KTP Ibu' },
                      { key: 'ijazah', label: 'Ijazah Sebelumnya' },
                      { key: 'ktpWali', label: 'KTP Wali' },
                      { key: 'rapor', label: 'Buku Rapor Terakhir' },
                      { key: 'sPindah', label: 'Surat Pindah (S.Pindah)' },
                      { key: 'suKet', label: 'Surat Keterangan (SuKet)' },
                      { key: 'sDomisili', label: 'Surat Domisili (S.Domisili)' },
                    ].map((item) => (
                      <div key={item.key} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                        <span className="font-medium text-slate-300 text-xs pr-2">{item.label}</span>
                        <select
                          value={(studentFormData as any)[item.key] || 'Ada'}
                          onChange={(e) => setStudentFormData({ ...studentFormData, [item.key]: e.target.value })}
                          className={`text-xs font-bold rounded-lg px-2 py-1 border ${
                            (studentFormData as any)[item.key] === 'Ada'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50'
                              : (studentFormData as any)[item.key] === 'Belum'
                              ? 'bg-amber-950 text-amber-300 border-amber-700/50'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="Ada">Ada / Lengkap</option>
                          <option value="Belum">Belum / Kurang</option>
                          <option value="Tidak Ada">Tidak Ada</option>
                          <option value="Tidak Perlu">Tidak Perlu</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                    <p className="font-bold text-white mb-1">Catatan Verifikasi Berkas:</p>
                    <p className="text-[11px] text-slate-400">
                      Buku Induk ini terintegrasi langsung dengan kartu ujian CBT siswa dan laporan rekapitulasi data format Excel (Dapodik/Buku Induk lengkap).
                    </p>
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tabs: ('IDENTITAS' | 'ALAMAT' | 'AKADEMIK' | 'KELUARGA' | 'BERKAS')[] = [
                      'IDENTITAS',
                      'ALAMAT',
                      'AKADEMIK',
                      'KELUARGA',
                      'BERKAS',
                    ];
                    const idx = tabs.indexOf(studentModalTab);
                    if (idx > 0) setStudentModalTab(tabs[idx - 1]);
                  }}
                  disabled={studentModalTab === 'IDENTITAS'}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 text-xs font-bold"
                >
                  ← Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tabs: ('IDENTITAS' | 'ALAMAT' | 'AKADEMIK' | 'KELUARGA' | 'BERKAS')[] = [
                      'IDENTITAS',
                      'ALAMAT',
                      'AKADEMIK',
                      'KELUARGA',
                      'BERKAS',
                    ];
                    const idx = tabs.indexOf(studentModalTab);
                    if (idx < tabs.length - 1) setStudentModalTab(tabs[idx + 1]);
                  }}
                  disabled={studentModalTab === 'BERKAS'}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 text-xs font-bold"
                >
                  Selanjutnya →
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="studentFullForm"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 active:scale-95 transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{editingStudentNisn ? 'Simpan Perubahan Buku Induk' : 'Simpan Siswa Baru & Sinkron Akun'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPOR MASSAL DATA SISWA (70 HEADER BUKU INDUK) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-3xl w-full space-y-4 shadow-2xl my-6 max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-cyan-400" />
                  <span>Impor Data Siswa (Format 70 Header Buku Induk Dapodik)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mendukung berkas Excel (.xlsx, .xls), CSV, TSV (Tab-Separated), dan teks salin-tempel.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatusMsg(null);
                  setImportParsePreview(null);
                  setImportFileName('');
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* Template & Sample Tool bar */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-300 block">Unduh Template Buku Induk (70 Kolom):</span>
                  <span className="text-[10px] text-slate-500">Sesuai format Dapodik Karang Taruna Tambora</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ExportService.downloadBukuIndukTemplate('xlsx')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Template Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => ExportService.downloadBukuIndukTemplate('csv')}
                    className="px-3 py-1.5 rounded-xl bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Template CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleImport}
                    className="px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Muat Contoh 70 Kolom</span>
                  </button>
                </div>
              </div>

              {/* Upload file directly option */}
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold text-xs flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-cyan-400" />
                  <span>Pilih Berkas Excel (.xlsx, .xls) atau CSV / TXT / TSV:</span>
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt,.tsv"
                  onChange={handleFileUploadForImport}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-950 file:text-cyan-300 hover:file:bg-cyan-900 cursor-pointer"
                />
                {importFileName && (
                  <p className="text-[11px] text-cyan-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Berkas terpilih: <strong>{importFileName}</strong></span>
                  </p>
                )}
              </div>

              {/* Paste text area */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-slate-300 font-bold text-xs">
                    Atau Salin & Tempel Baris Data Siswa (CSV / TSV):
                  </label>
                  {importText.trim() && (
                    <button
                      type="button"
                      onClick={handleAnalyzeText}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold underline"
                    >
                      Analisis / Pratinjau Teks
                    </button>
                  )}
                </div>
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                  }}
                  placeholder="Tempel baris data 70 header atau koma/tab di sini..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Status Message */}
              {importStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
                    importStatusMsg.type === 'success'
                      ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                      : importStatusMsg.type === 'info'
                      ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
                      : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {importStatusMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : importStatusMsg.type === 'info' ? (
                    <CheckSquare className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <span>{importStatusMsg.text}</span>
                </div>
              )}

              {/* Live Preview Table */}
              {importParsePreview && importParsePreview.students.length > 0 && (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-cyan-400" />
                      Pratinjau {importParsePreview.validCount} Siswa Siap Diimpor
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        importParsePreview.is70ColumnsFormat
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {importParsePreview.is70ColumnsFormat ? '🌟 Format 70 Kolom Lengkap' : '📄 Format Standar'}
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-48 border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0">
                        <tr>
                          <th className="p-2">NISN</th>
                          <th className="p-2">Nama Lengkap</th>
                          <th className="p-2">Jenjang</th>
                          <th className="p-2">Kelas</th>
                          <th className="p-2">Orang Tua / Wali</th>
                          <th className="p-2">Kontak</th>
                          <th className="p-2">Status Akun</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {importParsePreview.students.slice(0, 5).map((std, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="p-2 font-mono text-cyan-300">{std.nisn}</td>
                            <td className="p-2 font-bold text-white">{std.namaLengkap || std.nama}</td>
                            <td className="p-2">{std.jenjang}</td>
                            <td className="p-2">{std.kelas}</td>
                            <td className="p-2">{std.namaAyah || std.waliMurid || std.namaIbu || '-'}</td>
                            <td className="p-2">{std.nomorHP || std.teleponWali || '-'}</td>
                            <td className="p-2 text-emerald-400 font-bold">Auto Buat Akun</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importParsePreview.students.length > 5 && (
                    <p className="text-[10px] text-slate-500 text-center">
                      ... dan {importParsePreview.students.length - 5} siswa lainnya akan turut diimpor secara otomatis.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-slate-800 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatusMsg(null);
                  setImportParsePreview(null);
                  setImportFileName('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleProcessBatchImport}
                className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 active:scale-95 transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {importParsePreview && importParsePreview.students.length > 0
                    ? `Simpan ${importParsePreview.students.length} Siswa ke Sistem`
                    : 'Proses & Simpan Semua'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS SISWA */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Konfirmasi Hapus Siswa</h3>
                <p className="text-xs text-rose-600 dark:text-rose-300 font-medium">Penghapusan data bersifat permanen</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>{studentToDelete.namaLengkap || studentToDelete.nama}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-300 dark:border-slate-700 font-mono font-bold">
                  {studentToDelete.nisn}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-200 dark:border-slate-900">
                <p>
                  Jenjang / Kelas: <strong className="text-slate-900 dark:text-slate-200">{studentToDelete.jenjang} - Kelas {studentToDelete.kelas}</strong>
                </p>
                <p>
                  Nama Orang Tua / Wali: <strong className="text-slate-900 dark:text-slate-200">{studentToDelete.namaAyah || studentToDelete.waliMurid || studentToDelete.namaIbu || '-'}</strong>
                </p>
                <p>
                  Kontak: <strong className="text-slate-900 dark:text-slate-200">{studentToDelete.nomorHP || studentToDelete.teleponWali || '-'}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              ⚠️ <strong>Perhatian:</strong> Menghapus data siswa ini akan secara otomatis menghapus profil Buku Induk, akun login CBT siswa & orang tua, serta riwayat di sistem.
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 active:scale-95 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PANDUAN SHEET & KODE APPS SCRIPT (CODE.GS) */}
      {showRekapModal && (
        <AdminRekapModal
          isOpen={showRekapModal}
          onClose={() => setShowRekapModal(false)}
          submissions={[]}
        />
      )}
    </div>
  );
};
