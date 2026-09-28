import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore, cleanStudentClass } from '../store';
import { db } from '../data/db';
import { 
  User, GraduationCap, Calendar, CheckSquare, Laptop, 
  CreditCard, Award, ShieldAlert, FileText, CheckCircle2, 
  Clock, AlertCircle, Sparkles, BookOpen, Download, 
  Printer, Send, Check, ChevronRight, UserCheck, 
  Search, ArrowRight, ShieldCheck, Wallet, RefreshCw,
  TrendingUp, BarChart2, Bell, LogOut, Lock,
  Camera, Upload, Image as ImageIcon, QrCode, X,
  CheckCircle, ExternalLink, Link2, Eye, Edit3,
  MapPin, Briefcase, Users, HeartPulse, Building2, Filter,
  Receipt, Share2
} from 'lucide-react';
import { Student } from '../types';
import { getActiveRole } from '../lib/permissions';
import { getGoogleDriveDirectImageUrl, fileToBase64WithCompression, matchClass, matchStatusActive, formatClockTime, formatClassLabel, normalizeClassName } from '../lib/utils';
import { generateJadwalItemsFromMaster, getStudentPersonalJadwal } from '../data/masterJadwalData';
import { pullFinanceSheetsFromGas } from '../data/autoSyncEngine';
import { normalizeTabunganRow } from '../lib/keuanganNormalizers';
import StudentPhoto, { resolveStudentPhoto } from '../components/akademik/StudentPhoto';
import PengajuanIzinPortal from '../components/portal/PengajuanIzinPortal';
import AbsensiMandiriSiswaModal from '../components/portal/AbsensiMandiriSiswaModal';
import KuisPilihanGandaModal from '../components/portal/KuisPilihanGandaModal';
import EditBiodataSiswaModal from '../components/portal/EditBiodataSiswaModal';
import { validateExamSchedule } from '../utils/examScheduleValidation';
import { syncCoreSpreadsheetData } from '../utils/coreDataSync';
import Swal from 'sweetalert2';

interface PortalSiswaProps {
  studentOverrideId?: string;
  isLockedStudent?: boolean;
  onLogout?: () => void;
}

export default function PortalSiswa({ studentOverrideId, isLockedStudent, onLogout }: PortalSiswaProps) {
  const { students, teachers, settings, updateStudent } = useStore();
  const currentRole = getActiveRole();
  const isActualStudentRole = currentRole.id === 'RL-026' || !!isLockedStudent || !!studentOverrideId;
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'jadwal-presensi' | 'pengajuan-izin' | 'cbt-ujian' | 'tugas-materi' | 'nilai-rapor' | 'keuangan-biaya' | 'prestasi-bk' | 'profil-biodata'>('ringkasan');
  
  // Modal Edit Biodata Lengkap Siswa
  const [isEditBiodataOpen, setIsEditBiodataOpen] = useState(false);

  // Student Self-Attendance (QR & Selfie Lokasi) Modal state
  const [isAbsensiModalOpen, setIsAbsensiModalOpen] = useState(false);
  const [absensiRefreshTrigger, setAbsensiRefreshTrigger] = useState(0);

  // Student CBT & Auto-Graded Quiz Modal State
  const [activeQuizModalItem, setActiveQuizModalItem] = useState<any | null>(null);

  // Photo management state
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kartuPelajarRef = useRef<HTMLDivElement>(null);

  // Jadwal filter dropdown state
  const [selectedJadwalHari, setSelectedJadwalHari] = useState<string>('Semua');
  const [imageLoadError, setImageLoadError] = useState(false);
  
  // Selected Student state (persisted in session or authenticated student)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (studentOverrideId) return studentOverrideId;
    const authUserRaw = typeof window !== 'undefined' && window.sessionStorage 
      ? sessionStorage.getItem('authenticated_user') 
      : null;
    let authUser: any = null;
    try {
      if (authUserRaw) authUser = JSON.parse(authUserRaw);
    } catch {}

    const isStudent = authUser && (authUser.role === 'SISWA' || authUser.roleId === 'RL-026' || isLockedStudent);
    if (isStudent) {
      return authUser.studentId || authUser.nopdkt || authUser.userId || authUser.id || authUser.username || authUser.nipNisn || '';
    }

    const saved = typeof window !== 'undefined' && window.sessionStorage 
      ? (sessionStorage.getItem('portal_active_student_id') || sessionStorage.getItem('current_auth_student_id'))
      : null;

    if (saved) return saved;
    if (authUser) {
      return authUser.userId || authUser.id || authUser.username || authUser.nipNisn || '';
    }
    return '';
  });

  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  // Auto-sync real student data on mount if local memory is still hydrating
  useEffect(() => {
    if (!students || students.length <= 1) {
      syncCoreSpreadsheetData({ force: true }).then(() => {
        setDataRefreshTrigger(prev => prev + 1);
      }).catch(() => {});
    }

    const handleUpdate = () => {
      setDataRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('erp-db-updated', handleUpdate);
    window.addEventListener('erp-db-synced', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleUpdate);
      window.removeEventListener('erp-db-synced', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [students]);

  // Robust student matcher that handles leading zero differences and exact identification
  const matchStudentRecord = (s: any, queryIdOrUser: any): boolean => {
    if (!s || !queryIdOrUser) return false;

    const cleanDigits = (v: any) => String(v || '').replace(/\D/g, '');
    const cleanNoZero = (v: any) => cleanDigits(v).replace(/^0+/, '');

    const targetStr = typeof queryIdOrUser === 'string' ? queryIdOrUser.trim() : '';
    const targetObj = typeof queryIdOrUser === 'object' ? queryIdOrUser : null;
    const targetLower = targetStr.toLowerCase();
    const targetDigits = cleanDigits(targetStr);
    const targetNoZero = cleanNoZero(targetStr);
    const isPureDigit = /^\d+$/.test(targetStr);

    const sId = String(s.id || '').trim().toLowerCase();
    const sNisn = cleanDigits(s.nisn || s.NISN);
    const sNisnNoZero = cleanNoZero(s.nisn || s.NISN);
    const sNopdkt = cleanDigits(s.nopdkt || s.noPdkt || s.NoPdkt || s.nis || s.NIS);
    const sNopdktNoZero = cleanNoZero(s.nopdkt || s.noPdkt || s.NoPdkt || s.nis || s.NIS);
    const sName = String(s.name || s.nama || s.NamaLengkap || '').trim().toLowerCase();

    // 1. Direct string match
    if (targetStr) {
      if (sId && sId === targetLower) return true;
      if (sName && sName === targetLower) return true;

      // Exact NISN match (10 digits or normalized without leading zeros)
      if (isPureDigit && targetDigits.length >= 6) {
        if (sNisn === targetDigits || (sNisnNoZero && sNisnNoZero === targetNoZero)) return true;
      }

      // Exact NOPDKT match (e.g. '005', '036', '5', '36') - ONLY if query was purely numeric
      if (isPureDigit && targetNoZero && sNopdktNoZero && targetNoZero === sNopdktNoZero) {
        return true;
      }
    }

    // 2. Direct object match (authUser or session user)
    if (targetObj) {
      const authTargetId = String(targetObj.studentId || targetObj.userId || targetObj.id || '').trim().toLowerCase();
      if (authTargetId && (sId === authTargetId || sNopdkt === authTargetId || sNopdktNoZero === authTargetId.replace(/^0+/, ''))) return true;

      const authNisn = cleanDigits(targetObj.nipNisn || targetObj.username || targetObj.nisn || targetObj.NISN);
      const authNisnNoZero = cleanNoZero(targetObj.nipNisn || targetObj.username || targetObj.nisn || targetObj.NISN);
      if (authNisn.length >= 6) {
        if (sNisn === authNisn || (sNisnNoZero && sNisnNoZero === authNisnNoZero)) return true;
      }

      const authNopdkt = cleanDigits(targetObj.nopdkt || targetObj.nis || targetObj.noPdkt);
      const authNopdktNoZero = cleanNoZero(targetObj.nopdkt || targetObj.nis || targetObj.noPdkt);
      if (authNopdktNoZero && sNopdktNoZero && authNopdktNoZero === sNopdktNoZero) return true;

      const authName = String(targetObj.nama || targetObj.name || targetObj.NamaLengkap || '').trim().toLowerCase();
      if (authName && sName && (authName === sName || (authName.length >= 5 && sName === authName))) return true;
    }

    return false;
  };

  // Real student list from Store & Database (No fake simulation)
  const allActiveStudents = useMemo(() => {
    let list: any[] = [];
    if (students && students.length > 0) {
      list = [...students];
    } else {
      const fromDb = (db.get('students') as any[]) || [];
      const fromSiswaSheet = (db.get('SISWA') as any[]) || [];
      const fromSiswaLower = (db.get('siswa') as any[]) || [];
      list = [...fromDb, ...fromSiswaSheet, ...fromSiswaLower];
    }

    const cleanedList = list
      .map(cleanStudentClass)
      .filter((s: any) => s && (s.name || s.nama) && s.name !== '-' && s.name !== 'undefined');

    const seen = new Set<string>();
    const uniqueList: any[] = [];
    cleanedList.forEach(s => {
      const key = s.id || s.nisn || s.nopdkt || s.name;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueList.push(s);
      }
    });

    return uniqueList;
  }, [students, dataRefreshTrigger]);

  useEffect(() => {
    if (studentOverrideId) {
      const match = allActiveStudents.find(s => matchStudentRecord(s, studentOverrideId));
      setSelectedStudentId(match ? match.id : studentOverrideId);
      return;
    }

    const authUserRaw = typeof window !== 'undefined' ? sessionStorage.getItem('authenticated_user') : null;
    let authUser: any = null;
    try {
      if (authUserRaw) authUser = JSON.parse(authUserRaw);
    } catch {}

    const isStudentUser = Boolean(isLockedStudent || (authUser && (authUser.role === 'SISWA' || authUser.roleId === 'RL-026')));
    if (isStudentUser && authUser) {
      const match = allActiveStudents.find(s => matchStudentRecord(s, authUser));
      if (match) {
        setSelectedStudentId(match.id);
        return;
      }
      const targetId = authUser.studentId || authUser.nopdkt || authUser.userId || authUser.id;
      if (targetId) {
        setSelectedStudentId(targetId);
        return;
      }
    }

    const saved = typeof window !== 'undefined' 
      ? (sessionStorage.getItem('portal_active_student_id') || sessionStorage.getItem('current_auth_student_id'))
      : null;

    if (saved) {
      const match = allActiveStudents.find(s => matchStudentRecord(s, saved));
      if (match) {
        setSelectedStudentId(match.id);
        return;
      }
    }

    if (authUser) {
      const match = allActiveStudents.find(s => matchStudentRecord(s, authUser));
      if (match) {
        setSelectedStudentId(match.id);
        return;
      }
    }

    if (!selectedStudentId && allActiveStudents.length > 0) {
      setSelectedStudentId(allActiveStudents[0].id);
    }
  }, [studentOverrideId, allActiveStudents, isLockedStudent]);

  const handleSelectStudent = (id: string) => {
    if (isActualStudentRole) return; // Prevent switching when locked to student
    setSelectedStudentId(id);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('portal_active_student_id', id);
    }
  };

  // Find active student (Purely synchronized with Google Spreadsheet, NO simulation)
  const currentStudent = useMemo(() => {
    const authUserRaw = typeof window !== 'undefined' ? sessionStorage.getItem('authenticated_user') : null;
    let authUser: any = null;
    try {
      if (authUserRaw) authUser = JSON.parse(authUserRaw);
    } catch {}

    const isStudentUser = Boolean(isLockedStudent || studentOverrideId || (authUser && (authUser.role === 'SISWA' || authUser.roleId === 'RL-026')));

    // 1. If user is an authenticated student, strictly lock onto their student profile
    if (isStudentUser) {
      let found: any = null;
      if (studentOverrideId) {
        found = allActiveStudents.find(s => matchStudentRecord(s, studentOverrideId));
      }
      if (!found && authUser) {
        found = allActiveStudents.find(s => matchStudentRecord(s, authUser));
      }
      if (!found && selectedStudentId) {
        found = allActiveStudents.find(s => matchStudentRecord(s, selectedStudentId));
      }

      if (found) {
        const realClassCandidates = [
          found.class,
          found.KelasSaatini,
          found.KelasSaatIni,
          found.Kelas,
          found.kelas,
          found.rombel,
          found.Rombel
        ];
        let realClass = '';
        for (const cand of realClassCandidates) {
          if (cand !== undefined && cand !== null) {
            const sVal = String(cand).trim();
            if (sVal && sVal !== '-' && sVal !== 'undefined' && sVal !== 'null') {
              realClass = normalizeClassName(sVal) || sVal;
              break;
            }
          }
        }
        const rawFoto = found.fotoUrl || found.pasFoto || found.PasFoto || found.Foto || found.foto || '';
        const fotoDirect = rawFoto ? getGoogleDriveDirectImageUrl(rawFoto) : '';

        return {
          ...found,
          class: realClass,
          rombel: realClass,
          kelas: realClass,
          KelasSaatini: realClass,
          fotoUrl: fotoDirect || found.fotoUrl,
          pasFoto: fotoDirect || found.pasFoto,
          PasFoto: fotoDirect || found.PasFoto
        };
      }

      // If allActiveStudents hasn't finished hydrating, use authUser directly
      const rawClass = String(authUser?.class || authUser?.KelasSaatini || authUser?.KelasSaatIni || authUser?.kelas || authUser?.rombel || '').trim();
      const normClass = rawClass ? (normalizeClassName(rawClass) || rawClass) : '';
      const rawFoto = authUser?.fotoUrl || authUser?.pasFoto || authUser?.PasFoto || authUser?.foto || '';
      const fotoDirect = rawFoto ? getGoogleDriveDirectImageUrl(rawFoto) : '';

      return {
        id: authUser?.studentId || authUser?.userId || authUser?.id || studentOverrideId || `SISWA-${authUser?.username || '005'}`,
        name: authUser?.nama || authUser?.name || authUser?.username || 'Siswa',
        nama: authUser?.nama || authUser?.name || authUser?.username || 'Siswa',
        NamaLengkap: authUser?.nama || authUser?.name || authUser?.username || 'Siswa',
        nisn: authUser?.nisn || (authUser?.username && /^\d+$/.test(authUser.username) ? authUser.username : (authUser?.nipNisn || '-')),
        nis: authUser?.nopdkt || authUser?.nipNisn || authUser?.username || '-',
        nopdkt: authUser?.nopdkt || authUser?.nipNisn || authUser?.username || '-',
        class: normClass,
        rombel: normClass,
        kelas: normClass,
        KelasSaatini: normClass,
        status: authUser?.status || 'Aktif',
        email: authUser?.email || '',
        gender: authUser?.gender || 'L',
        agama: authUser?.agama || 'Islam',
        noHp: authUser?.noHp || '',
        fotoUrl: fotoDirect,
        pasFoto: fotoDirect,
        PasFoto: fotoDirect
      };
    }

    // 2. If viewing as Admin, Guru, or Wali Murid:
    let found = allActiveStudents.find(s => matchStudentRecord(s, selectedStudentId));
    if (!found && authUser) {
      found = allActiveStudents.find(s => matchStudentRecord(s, authUser));
    }
    if (!found && allActiveStudents.length > 0) {
      found = allActiveStudents[0];
    }

    if (found) {
      const realClassCandidates = [
        found.class,
        found.KelasSaatini,
        found.KelasSaatIni,
        found.Kelas,
        found.kelas,
        found.rombel,
        found.Rombel
      ];
      let realClass = '';
      for (const cand of realClassCandidates) {
        if (cand !== undefined && cand !== null) {
          const sVal = String(cand).trim();
          if (sVal && sVal !== '-' && sVal !== 'undefined' && sVal !== 'null') {
            realClass = normalizeClassName(sVal) || sVal;
            break;
          }
        }
      }
      const rawFoto = found.fotoUrl || found.pasFoto || found.PasFoto || found.Foto || found.foto || '';
      const fotoDirect = rawFoto ? getGoogleDriveDirectImageUrl(rawFoto) : '';

      return {
        ...found,
        class: realClass,
        rombel: realClass,
        kelas: realClass,
        KelasSaatini: realClass,
        fotoUrl: fotoDirect || found.fotoUrl,
        pasFoto: fotoDirect || found.pasFoto,
        PasFoto: fotoDirect || found.PasFoto
      };
    }

    return null;
  }, [allActiveStudents, selectedStudentId, studentOverrideId, isLockedStudent, dataRefreshTrigger]);

  // Reset image error on student switch
  useEffect(() => {
    setImageLoadError(false);
  }, [currentStudent?.id]);

  // Resolved Photo URL for current student
  const studentPhotoUrl = useMemo(() => {
    return resolveStudentPhoto(currentStudent);
  }, [currentStudent]);

  // Update Student Photo Handler
  const handleUpdateStudentPhoto = (newUrl: string) => {
    if (!currentStudent) return;
    try {
      if (updateStudent) {
        updateStudent(currentStudent.id, {
          fotoUrl: newUrl,
          updatedAt: new Date().toISOString()
        });
      }

      // Sync to students table in local db
      const allStudents = (db.get('students') as any[]) || [];
      const updated = allStudents.map(s => s.id === currentStudent.id ? { ...s, fotoUrl: newUrl } : s);
      db.set('students', updated);
      
      // Sync to siswa_rombel in local db
      const siswaRombel = (db.get('siswa_rombel') as any[]) || [];
      const updatedRombel = siswaRombel.map(s => (s.id === currentStudent.id || s.nisn === currentStudent.nisn) ? { ...s, fotoUrl: newUrl } : s);
      db.set('siswa_rombel', updatedRombel);

      setPhotoSuccessMsg('Pas foto resmi siswa berhasil disimpan & diperbarui!');
      setTimeout(() => setPhotoSuccessMsg(null), 3500);
      setIsPhotoModalOpen(false);
      setPhotoInputUrl('');
    } catch (e) {
      console.error('Update photo error:', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const base64 = await fileToBase64WithCompression(file, 400, 500, 0.85);
      handleUpdateStudentPhoto(base64);
    } catch (err) {
      console.error('Error compressing/uploading photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Homeroom teacher
  const waliKelasName = useMemo(() => {
    if (!currentStudent || !currentStudent.class) return 'Belum Ditentukan';
    const classesList = [
      ...((db.get('classes') as any[]) || []),
      ...((db.get('KELAS') as any[]) || []),
      ...((db.get('kelas') as any[]) || []),
      ...((db.get('rombel') as any[]) || [])
    ];
    const cleanClass = normalizeClassName(currentStudent.class);
    const matchedClass = classesList.find(c => {
      const cName = normalizeClassName(c.NamaKelas || c.name || c.nama || c.KelasID || '');
      return cName === cleanClass || String(cName).replace(/\D/g, '') === String(cleanClass).replace(/\D/g, '');
    });
    if (matchedClass && (matchedClass.NamaWaliKelas || matchedClass.NamaTutor || matchedClass.homeroomTeacher || matchedClass.walikelasName)) {
      return matchedClass.NamaWaliKelas || matchedClass.NamaTutor || matchedClass.homeroomTeacher || matchedClass.walikelasName;
    }
    // Fallback search teacher
    const t = teachers.find(teach => normalizeClassName(teach.assignedClass) === cleanClass || teach.assignedClass === currentStudent.class);
    return t ? t.name : 'Wali Kelas ' + currentStudent.class;
  }, [currentStudent, teachers]);

  // Listen to local DB updates and background sync changes
  useEffect(() => {
    const handleDbUpdate = () => {
      setDataRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, []);

  // Helper to match student row for TAGIHAN
  const isTagihanForStudent = (row: any, student: any): boolean => {
    if (!row || !student) return false;
    const sNopdkt = String(student.nopdkt || student.noPdkt || student.nis || '').trim();
    const sNisn = String(student.nisn || student.NISN || '').trim();
    const sId = String(student.id || '').trim();
    const sName = String(student.name || student.nama || student.NamaLengkap || '').trim().toLowerCase();

    const tNopdkt = String(row.nopdkt || row.NoPdkt || row.noPdkt || row.NoPendaftaran || '').trim();
    const tSiswaId = String(row.SiswaID || row.siswaId || row.studentId || '').trim();
    const tNisn = String(row.nisn || row.NISN || '').trim();
    const tNis = String(row.nis || row.NIS || '').trim();
    const tName = String(row.namaSiswa || row.NamaSiswa || row.nama || '').trim().toLowerCase();

    // 1. Exact match on nopdkt (handles '005' vs '5')
    if (sNopdkt && (tNopdkt || tNis)) {
      const target = tNopdkt || tNis;
      if (sNopdkt === target) return true;
      const cleanS = sNopdkt.replace(/^0+/, '');
      const cleanT = target.replace(/^0+/, '');
      if (cleanS && cleanT && cleanS === cleanT) return true;
    }
    // 2. Exact match on NISN
    if (sNisn && tNisn && sNisn.length >= 6 && tNisn.length >= 6 && sNisn === tNisn) return true;
    // 3. Exact match on SiswaID
    if (sId && tSiswaId && sId === tSiswaId) return true;
    // 4. Exact match on student full name
    if (sName && tName && sName.length >= 3 && tName.length >= 3) {
      if (sName === tName) return true;
      const c1 = sName.replace(/[^a-z0-9]/g, '');
      const c2 = tName.replace(/[^a-z0-9]/g, '');
      if (c1 && c2 && c1 === c2) return true;
    }

    return false;
  };

  // Helper to match student row for PEMBAYARAN
  const isPembayaranForStudent = (row: any, student: any): boolean => {
    if (!row || !student) return false;
    const sNopdkt = String(student.nopdkt || student.noPdkt || student.nis || '').trim();
    const sNisn = String(student.nisn || student.NISN || '').trim();
    const sId = String(student.id || '').trim();
    const sName = String(student.name || student.nama || student.NamaLengkap || '').trim().toLowerCase();

    const pSiswaId = String(row.SiswaID || row.siswaId || row.studentId || '').trim();
    const pNopdkt = String(row.nopdkt || row.noPdkt || '').trim();
    const pNisn = String(row.nisn || row.NISN || '').trim();
    const pNis = String(row.nis || row.NIS || '').trim();
    const pName = String(row.NamaSiswa || row.namaSiswa || row.nama || '').trim().toLowerCase();

    if (sNopdkt && (pSiswaId || pNopdkt || pNis)) {
      const target = pSiswaId || pNopdkt || pNis;
      if (sNopdkt === target) return true;
      const cleanS = sNopdkt.replace(/^0+/, '');
      const cleanP = target.replace(/^0+/, '');
      if (cleanS && cleanP && cleanS === cleanP) return true;
    }
    if (sNisn && pNisn && sNisn.length >= 6 && pNisn.length >= 6 && sNisn === pNisn) return true;
    if (sId && pSiswaId && sId === pSiswaId) return true;
    if (sName && pName && sName.length >= 3 && pName.length >= 3) {
      if (sName === pName) return true;
      const c1 = sName.replace(/[^a-z0-9]/g, '');
      const c2 = pName.replace(/[^a-z0-9]/g, '');
      if (c1 && c2 && c1 === c2) return true;
    }
    return false;
  };

  // Helper to match student row across any sheet column (SiswaID, NISN, NamaSiswa, nopdkt)
  const matchStudentRow = (row: any, student: any): boolean => {
    if (!row || !student) return false;
    const sNopdkt = String(student.nopdkt || student.noPdkt || student.nis || '').trim();
    const sNisn = String(student.nisn || student.NISN || '').trim();
    const sId = String(student.id || '').trim();
    const sName = String(student.name || student.nama || student.NamaLengkap || '').trim().toLowerCase();

    const rSiswaId = String(row.SiswaID || row.siswaId || row.studentId || row.idSiswa || '').trim();
    const rNopdkt = String(row.nopdkt || row.noPdkt || row.NoPdkt || '').trim();
    const rNisn = String(row.nisn || row.NISN || '').trim();
    const rNis = String(row.nis || row.NIS || '').trim();
    const rName = String(row.NamaSiswa || row.namaSiswa || row.nama || row.name || '').trim().toLowerCase();

    if (sNopdkt && (rSiswaId || rNopdkt || rNis)) {
      const target = rSiswaId || rNopdkt || rNis;
      if (sNopdkt === target) return true;
      const cleanS = sNopdkt.replace(/^0+/, '');
      const cleanR = target.replace(/^0+/, '');
      if (cleanS && cleanR && cleanS === cleanR) return true;
    }
    if (sNisn && rNisn && sNisn.length >= 6 && rNisn.length >= 6 && sNisn === rNisn) return true;
    if (sId && rSiswaId && sId === rSiswaId) return true;
    if (sName && rName && sName.length >= 3 && rName.length >= 3) {
      if (sName === rName) return true;
      const c1 = sName.replace(/[^a-z0-9]/g, '');
      const c2 = rName.replace(/[^a-z0-9]/g, '');
      if (c1 && c2 && c1 === c2) return true;
    }

    return false;
  };

  // State for syncing portal from Google Sheets
  const [isSyncingPortal, setIsSyncingPortal] = useState(false);
  const handleSyncPortalData = async () => {
    setIsSyncingPortal(true);
    try {
      await pullFinanceSheetsFromGas();
      setDataRefreshTrigger(prev => prev + 1);
      window.dispatchEvent(new Event('storage'));
      setPhotoSuccessMsg('Data Portal Siswa berhasil disinkronkan dengan Google Spreadsheet & Database!');
      setTimeout(() => setPhotoSuccessMsg(null), 3500);
    } catch (err) {
      console.warn('Sync portal data warning:', err);
      setDataRefreshTrigger(prev => prev + 1);
    } finally {
      setIsSyncingPortal(false);
    }
  };

  // State for viewing / printing official Kwitansi Pembayaran
  const [selectedKwitansi, setSelectedKwitansi] = useState<any | null>(null);

  // 1. Presensi Data for this student (Universal lookup across ABSENSI, absensi, attendances, presensi_siswa, rekap_presensi)
  const studentAbsensi = useMemo(() => {
    if (!currentStudent) return { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, percentage: 100, logs: [] };
    const fromAbsensi = (db.get('ABSENSI') as any[]) || [];
    const fromAbsensiLower = (db.get('absensi') as any[]) || [];
    const fromAttendances = (db.get('attendances') as any[]) || [];
    const fromPresensiSiswa = (db.get('presensi_siswa') as any[]) || [];
    const fromRekap = (db.get('rekap_presensi') as any[]) || (db.get('REKAP_PRESENSI') as any[]) || [];
    const allAbsen = [...fromAbsensi, ...fromAbsensiLower, ...fromAttendances, ...fromPresensiSiswa, ...fromRekap];
    
    const seen = new Set<string>();
    const myAbsen: any[] = [];
    allAbsen.forEach(a => {
      if (!matchStudentRow(a, currentStudent)) return;
      const tgl = a.Tanggal || a.tanggal || a.date || a.createdAt || '';
      const jam = a.Jam || a.jam || a.WaktuMasuk || a.waktuMasuk || a.time || '';
      const key = `${tgl}_${jam}_${a.Status || a.status}`;
      if (!seen.has(key)) {
        seen.add(key);
        myAbsen.push({
          ...a,
          tanggal: tgl,
          jam: jam || '08:00',
          status: a.Status || a.status || 'Hadir',
          metode: a.Metode || a.metode || (a.isSelfie ? 'Selfie GPS' : a.isQr ? 'QR Code' : 'Presensi Digital'),
          keterangan: a.Keterangan || a.keterangan || a.catatan || 'Presensi KBM Terverifikasi'
        });
      }
    });

    let h = 0, s = 0, i = 0, a = 0;
    myAbsen.forEach(rec => {
      const st = String(rec.status || '').toLowerCase();
      if (st.includes('hadir') || st === 'h') h++;
      else if (st.includes('sakit') || st === 's') s++;
      else if (st.includes('izin') || st === 'i') i++;
      else if (st.includes('alpa') || st.includes('tanpa') || st === 'a') a++;
      else h++;
    });

    const total = h + s + i + a;
    const percentage = total > 0 ? Math.round((h / total) * 100) : 100;
    return { hadir: h, sakit: s, izin: i, alpa: a, total, percentage, logs: myAbsen };
  }, [currentStudent, absensiRefreshTrigger, dataRefreshTrigger]);

  // 2. CBT / Ujian for this student's class (Universal lookup across UJIAN, ujian, ujian_cbt, cbt_jadwal_ujian, cbt_exams, BANK_SOAL, SOAL)
  const cbtUjianList = useMemo(() => {
    if (!currentStudent || !matchStatusActive(currentStudent.status)) return [];
    const fromUjian = (db.get('UJIAN') as any[]) || [];
    const fromUjianLower = (db.get('ujian') as any[]) || [];
    const fromCbtUjian = (db.get('ujian_cbt') as any[]) || [];
    const fromJadwal = (db.get('cbt_jadwal_ujian') as any[]) || [];
    const fromExams = (db.get('cbt_exams') as any[]) || [];
    const allUjian = [...fromUjian, ...fromUjianLower, ...fromCbtUjian, ...fromJadwal, ...fromExams];

    const bankSoal = (db.get('BANK_SOAL') as any[]) || (db.get('bank_soal') as any[]) || (db.get('cbt_bank_soal') as any[]) || (db.get('cbt_questions') as any[]) || [];
    const allSoal = (db.get('SOAL') as any[]) || (db.get('soal') as any[]) || [];
    const myClass = currentStudent.class;
    
    // Deduplicate by ID & session signature
    const map = new Map<string, any>();
    const seenSignatures = new Set<string>();
    allUjian.forEach(u => {
      const id = String(u.UjianID || u.ujianId || u.id || u.examId || '').trim();
      if (id.startsWith('SIM-') || u.isSimulation || u.isDummy) return;
      const mapelName = String(u.Mapel || u.mapel || u.nama || u.NamaUjian || '').trim().toLowerCase();
      const rawK = String(u.Kelas || u.kelas || '').trim().toLowerCase();
      const tglStr = String(u.tgl || u.Tanggal || u.tanggal || u.tglDisplay || '').trim();
      const jamStr = String(u.jamMulai || u.JamMulai || '').trim();
      const sig = `${mapelName}|${rawK}|${tglStr}|${jamStr}`;

      if (!id && sig === '|||') return;
      const lookupKey = id || sig;
      if (map.has(lookupKey)) return;
      if (sig !== '|||' && seenSignatures.has(sig)) return;

      if (sig !== '|||') seenSignatures.add(sig);

      let questions = u.soalList || [];
      if ((!questions || questions.length === 0) && (u.bankSoalId || u.BankSoalID)) {
        const matchedBank = bankSoal.find((b: any) => (b.id || b.BankSoalID || b.bankSoalId) === (u.bankSoalId || u.BankSoalID));
        if (matchedBank?.soalList) {
          questions = matchedBank.soalList;
        }
      }
      if (!questions || questions.length === 0) {
        const matchedSoal = allSoal.filter((s: any) => (s.UjianID || s.ujianId) === id || (s.BankSoalID || s.bankSoalId) === (u.bankSoalId || u.BankSoalID));
        if (matchedSoal.length > 0) {
          questions = matchedSoal;
        }
      }

      // Token lookup from exam or token history
      let examToken = u.token || u.Token || u.TokenUjian || u.tokenUjian || '';
      if (!examToken) {
        const tokenHistory = (db.get('cbt_token_history') as any[]) || [];
        const matchedTok = tokenHistory.find((t: any) => t.sesiId === id || (t.mapel === (u.Mapel || u.mapel) && matchClass(currentStudent.class, t.kelas)));
        if (matchedTok) examToken = matchedTok.token;
      }

      map.set(lookupKey, {
        id: lookupKey,
        judul: u.JudulUjian || u.judulUjian || u.judul || u.nama || u.NamaUjian || `Ujian CBT ${u.Mapel || u.mapel || 'KBM'}`,
        mapel: u.Mapel || u.mapel || 'Mata Pelajaran',
        kelas: u.Kelas || u.kelas || currentStudent.class,
        tingkatKelas: u.tingkatKelas || (u.kelas ? `Kelas ${String(u.kelas).replace(/\D/g, '')}` : `Kelas ${currentStudent.class}`),
        waktu: parseInt(String(u.Waktu || u.waktu || u.Durasi || u.durasi || '30').replace(/\D/g, ''), 10) || 30,
        jumlahSoal: questions.length || Number(u.JumlahSoal || u.jumlahSoal) || 20,
        soalList: questions,
        status: u.Status || u.status || 'Aktif',
        tenggat: u.tglDisplay || u.Tenggat || u.tenggat || u.Tanggal || u.tanggal || u.tgl || '',
        tgl: u.tgl || u.Tanggal || u.tanggal || '',
        tanggal: u.tanggal || u.Tanggal || u.tgl || '',
        tglDisplay: u.tglDisplay || u.TglDisplay || '',
        hari: u.hari || u.Hari || '',
        jamMulai: formatClockTime(u.jamMulai || u.JamMulai, '19:30'),
        jamSelesai: formatClockTime(u.jamSelesai || u.JamSelesai, '22:00'),
        jenis: u.JenisUjian || u.jenis || 'Penilaian Sumatif CBT',
        token: examToken
      });
    });

    const list = Array.from(map.values()).filter(Boolean);
    return list.filter(u => matchClass(myClass, u.kelas || u.tingkatKelas));
  }, [currentStudent, dataRefreshTrigger]);

  const cbtHasilList = useMemo(() => {
    if (!currentStudent) return [];
    const fromHasil = (db.get('HASIL_UJIAN') as any[]) || [];
    const fromHasilLower = (db.get('hasil_ujian') as any[]) || [];
    const fromExamRes = (db.get('cbt_exam_results') as any[]) || [];
    const fromCbtRes = (db.get('cbt_results') as any[]) || [];
    const fromCbtHasilSiswa = (db.get('cbt_hasil_siswa') as any[]) || [];
    const allHasil = [...fromHasil, ...fromHasilLower, ...fromExamRes, ...fromCbtRes, ...fromCbtHasilSiswa];

    const studentHasil = allHasil.filter(h => {
      if (!matchStudentRow(h, currentStudent)) return false;

      // Filter out tasks so it only shows actual CBT exams
      const uId = String(h.examId || h.UjianID || h.idUjian || h.id || '');
      const idH = String(h.HasilUjianID || h.id || h.idHasil || '');
      const jName = String(h.examName || h.NamaUjian || h.namaUjian || h.mapel || '').toLowerCase();
      if (h.isTugas || h.isPenugasan || h.type === 'PENUGASAN' || uId.startsWith('TGS') || idH.includes('TGS') || idH.includes('SUB-') || jName.startsWith('tugas ')) {
        return false;
      }
      return true;
    });

    // Deduplicate by exam ID or name
    const uniqueMap = new Map<string, any>();
    studentHasil.forEach(h => {
      const examKey = String(h.HasilUjianID || h.examId || h.UjianID || h.idUjian || h.NamaUjian || h.namaUjian || h.id || h.idHasil);
      if (examKey && !uniqueMap.has(examKey)) {
        uniqueMap.set(examKey, {
          id: h.HasilUjianID || h.id || h.idHasil,
          examId: h.UjianID || h.examId || h.idUjian || h.id,
          nama: h.NamaUjian || h.examName || h.namaUjian || h.judul || 'Ujian CBT',
          mapel: h.Mapel || h.mapel || 'Mata Pelajaran',
          nilai: Number(h.Nilai ?? h.nilai ?? h.nilaiAkhir ?? h.score ?? 0),
          benar: Number(h.Benar ?? h.benar ?? 0),
          salah: Number(h.Salah ?? h.salah ?? 0),
          totalSoal: Number(h.TotalSoal ?? h.totalSoal ?? 0),
          status: h.Status || h.status || h.StatusTuntas || (Number(h.Nilai ?? h.nilai ?? 0) >= 75 ? 'Tuntas' : 'Remedial'),
          waktuSelesai: h.WaktuSelesai || h.waktuSelesai || h.submittedAt || h.tanggal || h.Tanggal || '-'
        });
      }
    });

    return Array.from(uniqueMap.values());
  }, [currentStudent, dataRefreshTrigger]);

  // 3. Tugas / Penugasan for this student (Universal lookup across TUGAS, tugas, tugas_kbm, assignments, tugas_list, penugasan)
  const tugasList = useMemo(() => {
    if (!currentStudent) return [];
    const fromTugasSheet = (db.get('TUGAS') as any[]) || [];
    const fromTugasLower = (db.get('tugas') as any[]) || [];
    const fromKbm = (db.get('tugas_kbm') as any[]) || [];
    const fromAssign = (db.get('assignments') as any[]) || [];
    const fromList = (db.get('tugas_list') as any[]) || [];
    const fromPenugasan = (db.get('penugasan') as any[]) || [];

    const map = new Map<string, any>();
    [...fromTugasSheet, ...fromTugasLower, ...fromKbm, ...fromAssign, ...fromList, ...fromPenugasan].forEach(t => {
      const id = t.TugasID || t.id || t.idTugas;
      if (id && !map.has(id)) {
        const isQuiz = t.isAutoGrading === true || t.kategori === 'Kuis Pilihan Ganda (Auto-Grading)' || (Array.isArray(t.soalList) && t.soalList.length > 0);
        map.set(id, {
          id,
          judul: t.Judul || t.judul || t.namaTugas || 'Tugas KBM',
          mapel: t.Mapel || t.mapel || 'Mata Pelajaran',
          kelas: t.Kelas || t.kelas || currentStudent.class,
          tingkatKelas: t.tingkatKelas || (t.kelas ? `Kelas ${String(t.kelas).replace(/\D/g, '')}` : `Kelas ${currentStudent.class}`),
          guru: t.Guru || t.guru || 'Tim Guru',
          tenggat: t.Tenggat || t.tenggat || '',
          kategori: t.Kategori || t.kategori || (isQuiz ? 'Kuis Pilihan Ganda (Auto-Grading)' : 'Penugasan KBM'),
          deskripsi: t.Petunjuk || t.deskripsi || t.keterangan || '',
          isAutoGrading: isQuiz,
          soalList: t.soalList || [],
          status: t.Status || t.status || 'Aktif Mengumpulkan',
          avg: Number(t.NilaiRataRata || t.avg || 0)
        });
      }
    });

    const allTasks = Array.from(map.values());
    const myClass = currentStudent.class;
    return allTasks.filter(t => matchClass(myClass, t.kelas || t.tingkatKelas));
  }, [currentStudent, dataRefreshTrigger]);

  // All student submissions (Universal lookup strictly matched to current student across PENGUMPULAN_TUGAS, hasil_tugas_kbm, assignment_submissions)
  const tugasSubmissions = useMemo(() => {
    if (!currentStudent) return [];
    const fromPengumpulan = (db.get('PENGUMPULAN_TUGAS') as any[]) || [];
    const fromPengumpulanLower = (db.get('pengumpulan_tugas') as any[]) || [];
    const fromKbmSubs = (db.get('hasil_tugas_kbm') as any[]) || [];
    const fromAssignSubs = (db.get('assignment_submissions') as any[]) || [];
    const fromOldSubs = (db.get('tugas_submissions') as any[]) || [];

    const list: any[] = [];
    [...fromPengumpulan, ...fromPengumpulanLower, ...fromKbmSubs, ...fromAssignSubs, ...fromOldSubs].forEach(s => {
      const isMySub = matchStudentRow(s, currentStudent);
      const hasActuallySubmitted = isMySub && (
        s.status === 'Sudah Mengumpulkan' ||
        s.Status === 'Sudah Mengumpulkan' ||
        s.status === 'Selesai' ||
        s.status === 'Sudah Dinilai' ||
        (s.nilai !== null && s.nilai !== undefined && String(s.nilai).trim() !== '') ||
        (s.Nilai !== null && s.Nilai !== undefined && String(s.Nilai).trim() !== '')
      ) && s.status !== 'Belum Mengumpulkan' && s.status !== 'Belum Dikerjakan';

      if (hasActuallySubmitted) {
        list.push({
          ...s,
          tugasId: s.TugasID || s.tugasId,
          nilai: s.Nilai !== undefined && s.Nilai !== '' ? s.Nilai : s.nilai,
          catatanGuru: s.CatatanGuru || s.catatanGuru || ''
        });
      }
    });

    return list;
  }, [currentStudent, dataRefreshTrigger]);

  const getStudentSubmission = (task: any) => {
    if (!currentStudent || !task) return null;
    const taskId = String(task.id || task.TugasID || '').trim();
    return tugasSubmissions.find(s => {
      const sTaskId = String(s.tugasId || s.TugasID || '').trim();
      return sTaskId === taskId;
    }) || null;
  };

  const [selectedTugasToSubmit, setSelectedTugasToSubmit] = useState<any | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFileLink, setSubmissionFileLink] = useState('');
  const [submissionPhoto, setSubmissionPhoto] = useState<string | null>(null);
  const [submissionPhotoName, setSubmissionPhotoName] = useState('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [previewStudentPhotoModal, setPreviewStudentPhotoModal] = useState<{ url: string; title: string } | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Unggah foto bukti tugas dengan kompresi otomatis
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressingPhoto(true);
      setSubmissionPhotoName(file.name);
      const base64 = await fileToBase64WithCompression(file, 1200, 0.75);
      setSubmissionPhoto(base64);
    } catch (err) {
      console.warn('Kompresi foto gagal, menggunakan FileReader standar:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setSubmissionPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  // Kirim bukti pengerjaan tugas (Foto & Tulisan) ke WhatsApp Group PDKT
  const handleSendToWhatsAppGroupPDKT = (task: any, customText?: string, customPhoto?: string, customLink?: string) => {
    if (!currentStudent || !task) return;
    const textVal = customText !== undefined ? customText : submissionText;
    const linkVal = customLink !== undefined ? customLink : submissionFileLink;
    const hasPhoto = Boolean(customPhoto !== undefined ? customPhoto : submissionPhoto);

    const msg = `*BUKTI PENYELESAIAN TUGAS - WHATSAPP GROUP PDKT*\n` +
      `-----------------------------------------\n` +
      `• *Nama Siswa:* ${currentStudent.name}\n` +
      `• *NISN / Kelas:* ${currentStudent.nisn || currentStudent.nis || '-'} / ${formatClassLabel(currentStudent.class, true)}\n` +
      `• *Mata Pelajaran:* ${task.mapel || task.MataPelajaran || '-'}\n` +
      `• *Judul Tugas:* ${task.judul || task.Judul || '-'}\n` +
      `• *Jadwal / Semester:* ${task.rentangJadwal || task.semester || '-'}\n` +
      `• *Waktu Pengumpulan:* ${new Date().toLocaleString('id-ID')}\n` +
      (textVal ? `• *Keterangan/Tulisan:* ${textVal}\n` : '') +
      (linkVal ? `• *Tautan Dokumen:* ${linkVal}\n` : '') +
      (hasPhoto ? `• *Bukti Foto:* Terlampir di sistem portal siswa\n` : '') +
      `-----------------------------------------\n` +
      `_Tugas telah diselesaikan oleh siswa dan diserahkan ke WhatsApp Group PDKT._`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
  };

  const handleSubmitTugas = (e: React.FormEvent, sendToWa: boolean = false) => {
    e.preventDefault();
    if (!currentStudent || !selectedTugasToSubmit) return;

    const nowIso = new Date().toISOString().slice(0, 10);
    const newSub = {
      id: 'SUB-' + Date.now(),
      PengumpulanID: `PST-${selectedTugasToSubmit.id}-${currentStudent.id}`,
      tugasId: selectedTugasToSubmit.id,
      TugasID: selectedTugasToSubmit.id,
      judulTugas: selectedTugasToSubmit.judul,
      JudulTugas: selectedTugasToSubmit.judul,
      studentId: currentStudent.id,
      SiswaID: currentStudent.id,
      studentName: currentStudent.name,
      NamaSiswa: currentStudent.name,
      nisn: currentStudent.nisn || currentStudent.nis || '-',
      NISN: currentStudent.nisn || currentStudent.nis || '-',
      kelas: currentStudent.class,
      Kelas: currentStudent.class,
      textJawaban: submissionText,
      fotoBuktiUrl: submissionPhoto,
      fileLink: submissionFileLink,
      FileUrl: submissionFileLink,
      submittedAt: nowIso,
      WaktuKumpul: nowIso,
      status: 'Sudah Mengumpulkan',
      Status: 'Sudah Mengumpulkan',
      nilai: null,
      Nilai: '',
      catatanGuru: '',
      CatatanGuru: ''
    };

    const existingKbm = (db.get('hasil_tugas_kbm') as any[]) || [];
    const filteredKbm = existingKbm.filter(s => !((s.tugasId === selectedTugasToSubmit.id || s.TugasID === selectedTugasToSubmit.id) && matchStudentRow(s, currentStudent)));
    const updatedKbm = [newSub, ...filteredKbm];

    db.set('hasil_tugas_kbm', updatedKbm);
    db.set('assignment_submissions', updatedKbm);
    db.set('tugas_submissions', updatedKbm);
    db.set('PENGUMPULAN_TUGAS', updatedKbm);
    db.set('pengumpulan_tugas', updatedKbm);

    // Update aggregate stats on `tugas_kbm` & `assignments`
    const existingTugas = (db.get('tugas_kbm') as any[]) || [];
    const updatedTugas = existingTugas.map((t: any) => {
      if (t.id === selectedTugasToSubmit.id || t.TugasID === selectedTugasToSubmit.id) {
        const count = updatedKbm.filter(s => (s.tugasId === t.id || s.TugasID === t.id) && (s.status === 'Sudah Mengumpulkan' || s.Status === 'Sudah Mengumpulkan')).length;
        return {
          ...t,
          kumpul: count,
          Kumpul: count
        };
      }
      return t;
    });
    db.set('tugas_kbm', updatedTugas);
    db.set('assignments', updatedTugas);

    if (sendToWa) {
      handleSendToWhatsAppGroupPDKT(selectedTugasToSubmit, submissionText, submissionPhoto || undefined, submissionFileLink);
    }

    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setSelectedTugasToSubmit(null);
      setSubmissionText('');
      setSubmissionFileLink('');
      setSubmissionPhoto(null);
      setSubmissionPhotoName('');
    }, 1500);
  };

  // 4a. Keuangan / Tagihan Siswa (Universal lookup across TAGIHAN, tagihan, keuangan_tagihan, bills)
  const keuanganTagihan = useMemo(() => {
    if (!currentStudent) return [];
    const fromTagihanSheet = (db.get('TAGIHAN') as any[]) || [];
    const fromTagihanLower = (db.get('tagihan') as any[]) || [];
    const fromKeuanganTagihan = (db.get('keuangan_tagihan') as any[]) || [];
    const fromBills = (db.get('bills') as any[]) || [];
    const allTagihan = [...fromTagihanSheet, ...fromTagihanLower, ...fromKeuanganTagihan, ...fromBills];

    const myTagihan = allTagihan.filter(t => isTagihanForStudent(t, currentStudent));

    const map = new Map<string, any>();
    myTagihan.forEach(t => {
      const id = t.TagihanID || t.id || t.idTagihan || t.tagihanId;
      const key = id || `${t.NamaBiaya || t.namaBiaya}_${t.JatuhTempo || t.jatuhTempo}`;
      if (!map.has(key)) {
        const total = Number(t.TotalTagihan ?? t.totalTagihan ?? t.nominal ?? t.amount ?? t.nominalAsli) || 0;
        const bayar = Number(t.TotalBayar ?? t.totalBayar ?? 0);
        const sisa = t.SisaTagihan !== undefined ? Number(t.SisaTagihan) : (t.sisaTagihan !== undefined ? Number(t.sisaTagihan) : Math.max(0, total - bayar));
        const statusRaw = String(t.Status || t.status || '').trim();
        const status = statusRaw || (sisa <= 0 && total > 0 ? 'Lunas' : bayar > 0 ? 'Sebagian' : 'Belum Bayar');

        map.set(key, {
          id: id || key,
          tagihanId: id,
          judul: t.NamaBiaya || t.namaBiaya || t.judul || t.namaTagihan || t.kategori || t.description || 'Tagihan Biaya Siswa',
          namaBiaya: t.NamaBiaya || t.namaBiaya || t.judul || 'Tagihan Biaya Siswa',
          nominal: total,
          totalTagihan: total,
          totalBayar: bayar,
          sisaTagihan: sisa,
          jatuhTempo: t.JatuhTempo || t.jatuhTempo || t.dueDate || '-',
          tanggal: t.TanggalTagihan || t.tanggalTagihan || t.tanggal || '-',
          status: status,
          keterangan: t.Keterangan || t.keterangan || ''
        });
      }
    });

    return Array.from(map.values());
  }, [currentStudent, dataRefreshTrigger]);

  // 4b. Keuangan / Riwayat Pembayaran Sah & Kwitansi Siswa (Universal lookup across PEMBAYARAN, pembayaran, keuangan_pembayaran, payments, INVOICE)
  const keuanganPembayaran = useMemo(() => {
    if (!currentStudent) return [];
    const fromPembayaranSheet = (db.get('PEMBAYARAN') as any[]) || [];
    const fromPembayaranLower = (db.get('pembayaran') as any[]) || [];
    const fromKeuanganPembayaran = (db.get('keuangan_pembayaran') as any[]) || [];
    const fromPayments = (db.get('payments') as any[]) || [];
    const fromInvoices = (db.get('INVOICE') as any[]) || (db.get('keuangan_invoices') as any[]) || [];
    const allPembayaran = [...fromPembayaranSheet, ...fromPembayaranLower, ...fromKeuanganPembayaran, ...fromPayments, ...fromInvoices];

    const myPembayaran = allPembayaran.filter(p => isPembayaranForStudent(p, currentStudent));

    const map = new Map<string, any>();
    myPembayaran.forEach(p => {
      const id = p.PembayaranID || p.id || p.idPembayaran || p.noKwitansi || p.NoKwitansi || p.InvoiceID;
      const key = id || `${p.TanggalBayar || p.tanggal}_${p.NominalBayar || p.nominal}`;
      if (!map.has(key)) {
        map.set(key, {
          id: id || key,
          noKwitansi: p.NoKwitansi || p.noKwitansi || p.PembayaranID || id || 'KW-SAH',
          namaBiaya: p.NamaBiaya || p.namaBiaya || p.posBiaya || p.judul || p.keterangan || 'Biaya Pendidikan',
          nominal: Number(p.NominalBayar ?? p.nominalBayar ?? p.jumlah ?? p.nominal ?? p.amount ?? 0),
          tanggal: p.TanggalBayar || p.tanggalBayar || p.tanggal || p.date || '-',
          metode: p.MetodePembayaran || p.metodePembayaran || p.metode || 'Tunai (Kasir)',
          petugas: p.Petugas || p.petugas || p.kasir || 'Bendahara Sekolah',
          status: p.Status || p.status || 'Sah / Lunas'
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1));
  }, [currentStudent, dataRefreshTrigger]);

  // 4c. Keuangan / Tabungan Siswa (Universal lookup across TABUNGAN, tabungan, keuangan_tabungan, savings, tabungan_siswa)
  const keuanganTabungan = useMemo(() => {
    if (!currentStudent) return { saldo: 0, riwayat: [] };
    
    // Ambil data tabungan terpadu dengan prioritas normalized
    const fromKeuanganTabungan = (db.get('keuangan_tabungan') as any[]) || [];
    const fromTabunganSheet = (db.get('TABUNGAN') as any[]) || [];
    const fromTabunganLower = (db.get('tabungan') as any[]) || [];
    const fromSavings = (db.get('savings') as any[]) || [];
    const fromTabunganSiswa = (db.get('tabungan_siswa') as any[]) || [];
    
    // Jika salah satu source sudah memiliki data, gunakan yang terlengkap untuk menghindari duplikasi antar-tabel
    let sourcePool: any[] = [];
    if (fromKeuanganTabungan.length > 0) {
      sourcePool = fromKeuanganTabungan;
    } else if (fromTabunganSheet.length > 0) {
      sourcePool = fromTabunganSheet;
    } else {
      sourcePool = [...fromTabunganLower, ...fromSavings, ...fromTabunganSiswa];
    }

    const myTabRaw = sourcePool.filter(t => matchStudentRow(t, currentStudent));

    const seen = new Set<string>();
    const myTab: any[] = [];
    myTabRaw.forEach((rawItem, idx) => {
      const norm = normalizeTabunganRow(rawItem, idx, [currentStudent]);
      const uniqueKey = norm.id && !norm.id.startsWith('TAB_') 
        ? norm.id 
        : `${norm.tanggal}_${norm.nominal}_${norm.jenis}_${(norm.catatan || '').toLowerCase().slice(0, 15)}`;

      if (!seen.has(uniqueKey)) {
        seen.add(uniqueKey);
        const isSetor = norm.jenis === 'SETOR';
        myTab.push({
          id: norm.id || uniqueKey,
          jenis: norm.jenis,
          isSetor,
          nominal: norm.nominal,
          tanggal: norm.tanggal || '-',
          keterangan: norm.catatan || (isSetor ? 'Setoran Kas Tabungan' : 'Penarikan Kas Tabungan'),
          saldoSetelah: norm.saldo || 0,
          petugas: norm.petugasId || 'Bendahara Tabungan'
        });
      }
    });

    // Urutkan riwayat dari transaksi terbaru
    myTab.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    let saldo = 0;
    // Hitung saldo riil: total setor dikurangi total tarik
    myTab.forEach(item => {
      if (item.isSetor) saldo += item.nominal;
      else saldo -= item.nominal;
    });

    // Saldo tabungan tidak boleh negatif
    saldo = Math.max(0, saldo);

    return { saldo, riwayat: myTab };
  }, [currentStudent, dataRefreshTrigger]);

  // 5. Nilai Rapor & Akademik Terpadu (Universal lookup across NILAI, nilai, nilai_rapor, nilai_siswa, academic_grades, nilai_akademik_map)
  const nilaiRapor = useMemo(() => {
    if (!currentStudent) return [];
    const fromNilaiSheet = (db.get('NILAI') as any[]) || [];
    const fromNilaiLower = (db.get('nilai') as any[]) || [];
    const fromNilaiRapor = (db.get('nilai_rapor') as any[]) || [];
    const fromNilaiSiswa = (db.get('nilai_siswa') as any[]) || [];
    const fromGrades = (db.get('academic_grades') as any[]) || [];
    const allNilai = [...fromNilaiSheet, ...fromNilaiLower, ...fromNilaiRapor, ...fromNilaiSiswa, ...fromGrades];
    const gradesMap = (db.get('nilai_akademik_map') as any) || {};

    const list: any[] = [];
    const mapelSet = new Set<string>();

    // 1. Process from nilai_akademik_map (Guru Input & Kuis Sync)
    Object.entries(gradesMap).forEach(([key, g]: [string, any]) => {
      const isMine = matchStudentRow(g, currentStudent) || key.startsWith(currentStudent.id);
      if (isMine) {
        const mapel = g.mapel || g.Mapel || key.split('_')[2] || 'Mata Pelajaran';
        mapelSet.add(mapel);

        const tp1 = Number(g.tp1) || 0;
        const tp2 = Number(g.tp2) || 0;
        const tp3 = Number(g.tp3) || 0;
        const tp4 = Number(g.tp4) || 0;
        const sts = Number(g.sts) || 0;
        const sas = Number(g.sas) || 0;
        
        const countTp = [tp1, tp2, tp3, tp4].filter(x => x > 0).length;
        const sumTp = tp1 + tp2 + tp3 + tp4;
        const avgFormatif = countTp > 0 ? sumTp / countTp : sumTp / 4;
        
        const computedScore = g.nilaiAkhir || (sts || sas ? Math.round((avgFormatif + sts + 2 * sas) / 4) : (avgFormatif > 0 ? Math.round(avgFormatif) : null));
        const finalScore = computedScore !== null && computedScore !== undefined ? computedScore : null;

        list.push({
          id: key,
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          mataPelajaran: mapel,
          mapel: mapel,
          semester: g.semester || g.Semester || 'Ganjil',
          kkm: g.kkm || g.KKM || 75,
          tp1: tp1 > 0 ? tp1 : '-',
          tp2: tp2 > 0 ? tp2 : '-',
          tp3: tp3 > 0 ? tp3 : '-',
          tp4: tp4 > 0 ? tp4 : '-',
          sts: sts > 0 ? sts : '-',
          sas: sas > 0 ? sas : '-',
          tugas: tp1 > 0 ? tp1 : '-',
          pts: sts > 0 ? sts : '-',
          pas: sas > 0 ? sas : '-',
          nilaiAkhir: finalScore !== null ? finalScore : '-',
          predikat: finalScore !== null ? (finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : 'D') : '-',
          ketercapaian: finalScore !== null ? (finalScore >= (g.kkm || 75) ? 'Tuntas' : 'Perlu Bimbingan') : '-',
          deskripsi: g.deskripsiTinggi || g.CapaianKompetensi || (finalScore !== null ? `Mencapai kompetensi dalam pembelajaran ${mapel}.` : 'Menunggu input penilaian guru.')
        });
      }
    });

    // 2. Process from Sheet NILAI / academic_grades / nilai_rapor
    allNilai.forEach((n: any) => {
      const isMine = matchStudentRow(n, currentStudent);
      const mapel = n.Mapel || n.mapel || n.mataPelajaran || n.MataPelajaran || 'Mata Pelajaran';

      if (isMine && !mapelSet.has(mapel)) {
        mapelSet.add(mapel);
        const tp1 = n.TP1 ?? n.tp1 ?? n.tugas ?? '-';
        const tp2 = n.TP2 ?? n.tp2 ?? '-';
        const tp3 = n.TP3 ?? n.tp3 ?? '-';
        const tp4 = n.TP4 ?? n.tp4 ?? '-';
        const sts = n.STS ?? n.sts ?? n.pts ?? '-';
        const sas = n.SAS ?? n.sas ?? n.pas ?? '-';
        
        const rawScore = n.NilaiAkhir ?? n.nilaiAkhir ?? n.nilai ?? n.akhir ?? null;
        const numScore = rawScore !== null && rawScore !== undefined && rawScore !== '' && !isNaN(Number(rawScore)) ? Number(rawScore) : null;

        list.push({
          id: n.NilaiID || n.id || `NR-${mapel}`,
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          mataPelajaran: mapel,
          mapel: mapel,
          semester: n.Semester || n.semester || 'Ganjil',
          kkm: n.KKM || n.kkm || 75,
          tp1: tp1,
          tp2: tp2,
          tp3: tp3,
          tp4: tp4,
          sts: sts,
          sas: sas,
          tugas: tp1,
          pts: sts,
          pas: sas,
          nilaiAkhir: numScore !== null ? numScore : '-',
          predikat: numScore !== null ? (numScore >= 90 ? 'A' : numScore >= 80 ? 'B' : numScore >= 70 ? 'C' : 'D') : '-',
          ketercapaian: numScore !== null ? (numScore >= (n.KKM || n.kkm || 75) ? 'Tuntas' : 'Perlu Bimbingan') : '-',
          deskripsi: n.CapaianKompetensi || n.deskripsi || (numScore !== null ? `Mencapai kompetensi dalam pembelajaran ${mapel}.` : 'Menunggu input penilaian guru.')
        });
      }
    });

    return list;
  }, [currentStudent, dataRefreshTrigger]);

  // Summary Rapor Siswa dari Sheet RAPOR
  const raporSummary = useMemo(() => {
    if (!currentStudent) return null;
    const fromRaporSheet = (db.get('RAPOR') as any[]) || [];
    const fromRaporLower = (db.get('rapor') as any[]) || [];
    const fromReports = (db.get('academic_reports') as any[]) || [];
    const allRapor = [...fromRaporSheet, ...fromRaporLower, ...fromReports];

    const matched = allRapor.find(r => matchStudentRow(r, currentStudent));
    if (!matched) return null;

    const scores = nilaiRapor
      .map(n => typeof n.nilaiAkhir === 'number' ? n.nilaiAkhir : Number(n.nilaiAkhir))
      .filter(s => !isNaN(s) && s > 0);
    const calculatedAvg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : '-';

    return {
      rataRata: matched.RataRata || matched.rataRata || calculatedAvg || '-',
      peringkat: matched.Peringkat || matched.peringkat || '-',
      catatanWaliKelas: matched.CatatanWaliKelas || matched.catatanWaliKelas || matched.catatan || 'Terus pertahankan semangat belajar dan kedisiplinan.',
      statusKenaikan: matched.StatusKenaikan || matched.statusKenaikan || 'Naik Kelas',
      semester: matched.Semester || matched.semester || 'Ganjil',
      tahunAjaran: matched.TahunAjaran || matched.tahunAjaran || settings.tahunPelajaran || '2026/2027'
    };
  }, [currentStudent, nilaiRapor, dataRefreshTrigger, settings.tahunPelajaran]);

  // 6. Prestasi & Catatan BK (Universal lookup across PRESTASI_SISWA, BIMBINGAN, PELANGGARAN)
  const bimbinganList = useMemo(() => {
    if (!currentStudent) return [];
    const fromBimbinganSheet = (db.get('BIMBINGAN') as any[]) || [];
    const fromPelanggaranSheet = (db.get('PELANGGARAN') as any[]) || [];
    const fromBimbingan = (db.get('bimbingan') as any[]) || [];
    const fromPelanggaran = (db.get('pelanggaran') as any[]) || [];
    const fromBkRecords = (db.get('bk_records') as any[]) || [];
    const fromBkPelanggaran = (db.get('bk_pelanggaran') as any[]) || [];
    const allBk = [...fromBimbinganSheet, ...fromPelanggaranSheet, ...fromBimbingan, ...fromPelanggaran, ...fromBkRecords, ...fromBkPelanggaran];

    return allBk.filter(b => matchStudentRow(b, currentStudent));
  }, [currentStudent, dataRefreshTrigger]);

  const prestasiList = useMemo(() => {
    if (!currentStudent) return [];
    const fromPrestasiSheet = (db.get('PRESTASI_SISWA') as any[]) || [];
    const fromPrestasiLower = (db.get('prestasi_siswa') as any[]) || [];
    const fromPrestasi = (db.get('prestasi') as any[]) || [];
    const fromAchievements = (db.get('student_achievements') as any[]) || [];
    const allPrestasi = [...fromPrestasiSheet, ...fromPrestasiLower, ...fromPrestasi, ...fromAchievements];

    return allPrestasi.filter(p => matchStudentRow(p, currentStudent));
  }, [currentStudent, dataRefreshTrigger]);

  // 7. Jadwal Pelajaran Mingguan Khusus Siswa (Tepat 3x Pertemuan Sinkron per Minggu Sesuai Jam dan Kelasnya)
  const jadwalKelas = useMemo(() => {
    if (!currentStudent) return [];

    const studentClassRaw = currentStudent.class || '4';
    const cleanClassDigit = String(studentClassRaw).replace(/\D/g, '') || '4';
    const studentStatusKerja = currentStudent.statusBekerja || (currentStudent as any).kelompokBelajar || (currentStudent as any).kategoriBelajar || '';

    // Ambil tepat 3 sesi resmi siswa yang bersangkutan dari Master Jadwal KTCT (sesuai jam dan kelasnya)
    const personalSessions = getStudentPersonalJadwal(
      cleanClassDigit,
      studentStatusKerja,
      settings.tahunPelajaran || '2026/2027',
      (settings.semester === 'Genap' || settings.semester === 'Semester 2') ? 'Genap' : 'Ganjil'
    );

    // Cek apakah ada modifikasi tutor / ruang dari database lokal (academic_schedules, JADWAL)
    const dbSchedules = [
      ...((db.get('academic_schedules') as any[]) || []),
      ...((db.get('JADWAL') as any[]) || []),
      ...((db.get('jadwal') as any[]) || [])
    ];

    // Petakan dan gabungkan detail jika ada penugasan guru khusus
    const final3Sessions = personalSessions.map((session, idx) => {
      // Cari jika ada penugasan guru / tutor spesifik di database untuk kelas dan hari ini
      const matchedDb = dbSchedules.find(d => {
        if (!d) return false;
        const dClassDigit = String(d.Kelas || d.kelas || '').replace(/\D/g, '');
        const dHari = String(d.Hari || d.hari || '').trim().toLowerCase();
        return dClassDigit === cleanClassDigit && dHari === session.hari.toLowerCase();
      });

      const tutorName = matchedDb?.NamaGuru || matchedDb?.guru || matchedDb?.Guru || session.guru;
      const roomName = matchedDb?.Ruangan || matchedDb?.ruang || matchedDb?.Ruang || session.ruang;

      return {
        ...session,
        pertemuanKe: idx + 1,
        guru: tutorName,
        ruang: roomName,
        jamFormatted: session.jam
      };
    });

    return final3Sessions;
  }, [currentStudent, dataRefreshTrigger, settings.tahunPelajaran, settings.semester]);

  const fmtRupiah = (num: number) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

  const averageGrade = useMemo(() => {
    if (!nilaiRapor || nilaiRapor.length === 0) return null;
    const scores = nilaiRapor
      .map(n => typeof n.nilaiAkhir === 'number' ? n.nilaiAkhir : Number(n.nilaiAkhir))
      .filter(s => !isNaN(s) && s > 0);
    if (scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round((sum / scores.length) * 10) / 10;
  }, [nilaiRapor]);

  const ringkasanKeuangan = useMemo(() => {
    const totalTagihanNominal = keuanganTagihan.reduce((sum, t) => sum + Number(t.nominal || t.totalTagihan || 0), 0);
    const totalBayarNominal = keuanganPembayaran.reduce((sum, p) => sum + Number(p.nominal || 0), 0);
    const unpaid = keuanganTagihan.filter(t => t.status !== 'Lunas' && t.status !== 'PAID' && t.status !== 'LUNAS');
    const totalUnpaid = unpaid.reduce((sum, t) => sum + (Number(t.sisaTagihan !== undefined ? t.sisaTagihan : (t.nominal || 0))), 0);

    if (keuanganTagihan.length === 0) {
      return { 
        status: 'Lunas', 
        text: 'Tidak ada tagihan aktif', 
        isLunas: true, 
        unpaidCount: 0,
        totalTagihan: totalTagihanNominal,
        totalBayar: totalBayarNominal,
        sisaTagihan: 0,
        saldoTabungan: keuanganTabungan.saldo
      };
    }
    
    if (unpaid.length === 0) {
      return { 
        status: 'Lunas', 
        text: 'Seluruh tagihan telah diselesaikan', 
        isLunas: true, 
        unpaidCount: 0,
        totalTagihan: totalTagihanNominal,
        totalBayar: totalBayarNominal,
        sisaTagihan: 0,
        saldoTabungan: keuanganTabungan.saldo
      };
    }

    return { 
      status: 'Ada Tagihan', 
      text: `${unpaid.length} tagihan belum lunas (${fmtRupiah(totalUnpaid)})`, 
      isLunas: false,
      unpaidCount: unpaid.length,
      totalTagihan: totalTagihanNominal,
      totalBayar: totalBayarNominal,
      sisaTagihan: totalUnpaid,
      saldoTabungan: keuanganTabungan.saldo
    };
  }, [keuanganTagihan, keuanganPembayaran, keuanganTabungan]);

  if (!currentStudent) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-slate-900">Data Siswa Belum Tersedia</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Sistem belum mendeteksi data siswa aktif di database. Hubungi operator sekolah untuk mendaftarkan NISN/Biodata Anda.
          </p>
        </div>
      </div>
    );
  }

  const PORTAL_TABS = [
    { id: 'ringkasan', label: 'Beranda Siswa', icon: Sparkles },
    { id: 'jadwal-presensi', label: 'Jadwal & Presensi', icon: Calendar },
    { id: 'pengajuan-izin', label: 'Pengajuan Izin / Sakit', icon: FileText },
    { id: 'cbt-ujian', label: 'Ujian CBT Online', icon: Laptop },
    { id: 'tugas-materi', label: 'Tugas Belajar', icon: CheckSquare },
    { id: 'nilai-rapor', label: 'Nilai & Rapor', icon: Award },
    { id: 'keuangan-biaya', label: 'Biaya & Tabungan', icon: CreditCard },
    { id: 'prestasi-bk', label: 'Prestasi & Bimbingan', icon: ShieldCheck },
    { id: 'profil-biodata', label: 'Biodata Lengkap Siswa', icon: User },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* 1. HERO HEADER PROFILE SISWA */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-700 rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-indigo-950/10 relative overflow-hidden">
        {/* Vector Background Accents */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-sky-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Avatar / Student Photo & Student Info */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            {/* Student Pas Foto with Camera Action */}
            <div className="relative group shrink-0">
              <div 
                onClick={() => setIsPhotoModalOpen(true)}
                className="w-18 h-22 sm:w-20 sm:h-26 rounded-2xl bg-white/20 backdrop-blur-md p-1 border-2 border-white/40 shadow-xl overflow-hidden cursor-pointer hover:border-white transition-all transform hover:scale-105 flex items-center justify-center relative group"
                title="Klik untuk Lihat atau Unggah Pas Foto Siswa"
              >
                {studentPhotoUrl && !imageLoadError ? (
                  <img
                    src={studentPhotoUrl}
                    alt={currentStudent.name}
                    onError={() => setImageLoadError(true)}
                    className="w-full h-full object-cover rounded-xl bg-slate-800"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex flex-col items-center justify-center text-white p-1 text-center">
                    <span className="font-black text-2xl">{currentStudent.name.charAt(0).toUpperCase()}</span>
                    <span className="text-[8px] font-extrabold uppercase tracking-tight opacity-90 mt-1 flex items-center gap-0.5 bg-black/20 px-1 py-0.5 rounded">
                      <Camera size={8} /> Tambah Foto
                    </span>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex flex-col items-center justify-center text-white text-[9px] font-black gap-1 p-1 text-center">
                  <Camera size={16} className="text-sky-300" />
                  <span>{studentPhotoUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
                </div>
              </div>

              {/* Gender & Verified Badge */}
              <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black text-white ring-2 ring-white shadow-xs ${
                currentStudent.gender === 'P' ? 'bg-pink-500' : 'bg-sky-500'
              }`}>
                {currentStudent.gender === 'P' ? 'P' : 'L'}
              </span>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/20">
                  PORTAL SISWA RESMI
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white truncate">
                {currentStudent.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sky-100 font-medium">
                <span className="flex items-center gap-1">
                  <GraduationCap size={14} className="text-sky-300" />
                  <span>Kelas: <strong>{currentStudent.class}</strong></span>
                </span>
                <span className="flex items-center gap-1">
                  <User size={14} className="text-sky-300" />
                  <span>NISN: <strong>{currentStudent.nisn || currentStudent.nis || '-'}</strong></span>
                </span>
                <span className="hidden sm:inline text-sky-200/60">•</span>
                <span className="text-sky-200">
                  Wali Kelas: <strong>{waliKelasName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Identity & Session Control + Quick Attendance CTA */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAbsensiModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-emerald-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-900/20 transition flex items-center gap-2 cursor-pointer border border-emerald-300 shrink-0"
              title="Buka Presensi Mandiri (Scan QR & Foto Selfie Lokasi)"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-900/20 flex items-center justify-center">
                <Camera size={14} className="text-emerald-950" />
              </div>
              <div className="text-left">
                <span className="block text-[9px] uppercase tracking-wider font-extrabold text-emerald-900/70">Presensi Mandiri</span>
                <span className="block text-xs font-black text-emerald-950">Absensi QR & Foto</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('pengajuan-izin');
                const target = document.getElementById('portal-siswa-tabs');
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-900 font-black text-xs rounded-2xl shadow-lg shadow-amber-950/20 transition flex items-center gap-2 cursor-pointer border border-amber-300 shrink-0"
              title="Ajukan Surat Permohonan Izin atau Sakit"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/30 flex items-center justify-center">
                <FileText size={14} className="text-black" />
              </div>
              <div className="text-left">
                <span className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-900">Dispensasi & Sakit</span>
                <span className="block text-xs font-black text-black">Ajukan Izin</span>
              </div>
            </button>

            {isActualStudentRole ? (
              <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md p-2 sm:px-3 sm:py-2 rounded-2xl border border-white/20">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                    <Lock size={10} /> Sesi Siswa
                  </span>
                  <span className="text-xs font-black text-white block mt-0.5 truncate max-w-[140px]">
                    {currentStudent.name}
                  </span>
                </div>
                {onLogout && (
                  <button 
                    onClick={onLogout} 
                    className="ml-1 px-3 py-1.5 bg-rose-500/80 hover:bg-rose-600 active:scale-95 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1 shadow-xs shrink-0 cursor-pointer" 
                    title="Keluar Sesi Siswa"
                  >
                    <LogOut size={13} />
                    <span className="hidden sm:inline">Keluar</span>
                  </button>
                )}
              </div>
            ) : (
              /* Pemilih Siswa Terdaftar (Khusus Pratinjau Admin / Guru) */
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-amber-500/20 backdrop-blur-md p-2 rounded-2xl border border-amber-300/40">
                <div className="text-[10px] px-2 text-amber-200 font-extrabold uppercase tracking-wider hidden lg:block">
                  Pratinjau Siswa:
                </div>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleSelectStudent(e.target.value)}
                  className="bg-white text-slate-900 text-xs font-bold px-3 py-2 rounded-xl outline-hidden focus:ring-2 focus:ring-amber-300 transition"
                  title="Ganti Siswa yang Dipratinjau (Khusus Guru/Admin)"
                >
                  {allActiveStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({formatClassLabel(s.class, true)} - NISN: {s.nisn || s.nis || '-'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Quick Highlights Bar - 5 Metrik Sejajar (Kehadiran, Tugas, CBT, Tabungan, Sisa Tanggungan) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/20 text-white">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <p className="text-[10px] uppercase font-bold text-sky-200">Kehadiran Siswa</p>
            <p className="text-lg font-black mt-0.5">{studentAbsensi.percentage}% <span className="text-xs font-normal text-sky-200">({studentAbsensi.hadir} Hadir)</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <p className="text-[10px] uppercase font-bold text-sky-200">Tugas Aktif</p>
            <p className="text-lg font-black mt-0.5">{tugasList.length} <span className="text-xs font-normal text-sky-200">Tugas Belajar</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <p className="text-[10px] uppercase font-bold text-sky-200">Ujian CBT</p>
            <p className="text-lg font-black mt-0.5">{cbtUjianList.length} <span className="text-xs font-normal text-sky-200">Jadwal Tes</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3 border border-white/10">
            <p className="text-[10px] uppercase font-bold text-sky-200">Saldo Tabungan</p>
            <p className="text-lg font-black mt-0.5">{fmtRupiah(keuanganTabungan.saldo)}</p>
          </div>
          <div className={`rounded-2xl p-3 border transition-all ${
            ringkasanKeuangan.sisaTagihan > 0
              ? 'bg-rose-600/40 border-rose-400 text-white shadow-md shadow-rose-950/30'
              : 'bg-emerald-600/40 border-emerald-400 text-white shadow-md shadow-emerald-950/30'
          }`}>
            <p className="text-[10px] uppercase font-bold text-white/90">Sisa Tanggungan</p>
            <p className="text-lg font-black mt-0.5 flex items-baseline gap-1.5 flex-wrap">
              {ringkasanKeuangan.sisaTagihan > 0 ? (
                <>
                  <span className="font-mono text-rose-200">-{fmtRupiah(ringkasanKeuangan.sisaTagihan)}</span>
                  <span className="text-[10px] font-bold text-rose-100 px-1.5 py-0.5 bg-rose-500/30 rounded-md">
                    {ringkasanKeuangan.unpaidCount} Tagihan
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-emerald-200">LUNAS</span>
                  <span className="text-[10px] font-bold text-emerald-100 px-1.5 py-0.5 bg-emerald-500/30 rounded-md">
                    Rp 0
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 2. RESPONSIVE SUB-TAB NAVIGATION PORTAL SISWA */}
      <div id="portal-siswa-tabs" className="space-y-2 scroll-mt-6">
        {/* Mobile Dropdown Selector (sm:hidden) -> No horizontal overflow or right shifting */}
        <div className="sm:hidden bg-white p-3 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Pilih Menu / Tab Portal Siswa:</span>
            <span className="text-indigo-600 font-bold font-mono">9 Menu</span>
          </label>
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-xs font-black py-3 px-4 rounded-xl outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="ringkasan">🌟 Beranda Siswa</option>
              <option value="jadwal-presensi">📅 Jadwal & Presensi</option>
              <option value="pengajuan-izin">📝 Pengajuan Izin / Sakit</option>
              <option value="cbt-ujian">💻 Ujian CBT Online</option>
              <option value="tugas-materi">📚 Tugas Belajar</option>
              <option value="nilai-rapor">🏆 Nilai & Rapor</option>
              <option value="keuangan-biaya">💳 Biaya & Tabungan</option>
              <option value="prestasi-bk">🛡️ Prestasi & Bimbingan</option>
              <option value="profil-biodata">👤 Biodata Dapodik & KTS</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Tab Bar: Smooth horizontal scrolling, locked within container */}
        <div className="w-full max-w-full overflow-x-auto pb-1.5 scrollbar-none snap-x flex items-center gap-1.5 border-b border-slate-200">
          {PORTAL_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-white border border-slate-200/70'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TAB CONTENT RENDER */}

      {/* TAB 1: RINGKASAN & BERANDA SISWA */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-6">
          {/* Welcome Announcement Card */}
          <div className="p-5 bg-sky-50 border border-sky-200 rounded-3xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bell size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-sky-950">Informasi Pembelajaran Siswa</h3>
              <p className="text-xs text-sky-800 leading-relaxed">
                Selamat datang di Portal Siswa Mandiri. Anda hanya dapat melihat dan mengelola data milik akun Anda sendiri. Pastikan selalu memantau jadwal pelajaran harian, melakukan presensi mandiri (QR / foto selfie lokasi), dan mengerjakan penugasan tepat waktu.
              </p>
            </div>
          </div>

          {/* 9-GRID MENU PINTASAN CEPAT PORTAL SISWA */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" />
                  <span>Menu & Layanan Siswa Terpadu</span>
                </h3>
                <p className="text-xs text-slate-500">Pilih modul portal di bawah untuk akses cepat</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAbsensiModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera size={14} />
                  <span>Absensi Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('pengajuan-izin');
                    const target = document.getElementById('portal-siswa-tabs');
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-900 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer border border-amber-400"
                  title="Ajukan surat izin atau surat sakit"
                >
                  <FileText size={14} className="text-slate-900" />
                  <span>Ajukan Izin</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              {[
                { tab: 'jadwal-presensi', title: 'Jadwal & Presensi', desc: 'Jadwal KBM & log kehadiran harian', icon: Calendar, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', badge: `${studentAbsensi.percentage}% Hadir` },
                { action: () => setIsAbsensiModalOpen(true), title: 'Absensi Mandiri (QR/Foto)', desc: 'Scan barcode atau foto selfie lokasi sekolah', icon: Camera, color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badge: 'Wajib', isSpecial: true },
                { tab: 'pengajuan-izin', title: 'Pengajuan Izin / Sakit', desc: 'Ajukan surat izin dan surat dokter online', icon: FileText, color: 'text-slate-900 bg-amber-100 border-amber-300' },
                { tab: 'cbt-ujian', title: 'Ujian CBT Online', desc: 'Ikuti tes evaluasi dan simulasi online', icon: Laptop, color: 'text-blue-600 bg-blue-50 border-blue-100', badge: cbtUjianList.length > 0 ? `${cbtUjianList.length} Ujian` : undefined },
                { tab: 'tugas-materi', title: 'Tugas Belajar', desc: 'Kumpulan materi dan kumpulkan tugas', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 border-amber-100', badge: tugasList.length > 0 ? `${tugasList.length} Tugas` : undefined },
                { tab: 'nilai-rapor', title: 'Nilai & Rapor', desc: 'Lihat buku nilai dan cetak rapor berkala', icon: Award, color: 'text-purple-600 bg-purple-50 border-purple-100' },
                { tab: 'keuangan-biaya', title: 'Biaya & Tabungan', desc: 'Informasi SPP, tagihan, dan saldo tabungan', icon: CreditCard, color: 'text-teal-600 bg-teal-50 border-teal-100' },
                { tab: 'prestasi-bk', title: 'Prestasi & Bimbingan', desc: 'Catatan poin prestasi dan konseling BK', icon: ShieldCheck, color: 'text-orange-600 bg-orange-50 border-orange-100' },
                { tab: 'profil-biodata', title: 'Biodata Dapodik & KTS', desc: 'Cetak kartu tanda siswa & verifikasi data', icon: User, color: 'text-slate-600 bg-slate-100 border-slate-200' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.tab) {
                        setActiveTab(item.tab as any);
                      }
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex flex-col justify-between gap-3 ${
                      item.isSpecial ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50/70 hover:bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                        <Icon size={20} />
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-2xs">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-slate-900 leading-snug">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Today's Schedule Mini Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" />
                  <span>Jadwal Pelajaran Kelas {currentStudent.class}</span>
                </h3>
                <button 
                  onClick={() => setActiveTab('jadwal-presensi')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat Lengkap</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {jadwalKelas.slice(0, 4).map((j, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                          {j.hari}
                        </span>
                        <span className="font-bold text-xs text-slate-800">{j.mapel}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{j.guru} • {j.ruang || 'Kelas ' + currentStudent.class}</p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">
                      {j.jam}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgent Tasks & CBT Alert */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CheckSquare size={18} className="text-rose-600" />
                  <span>Tugas & Ujian Menunggu</span>
                </h3>
                <button 
                  onClick={() => setActiveTab('tugas-materi')}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>Buka Tugas</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {tugasList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <CheckCircle2 size={28} className="text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Semua Tugas Selesai!</p>
                  <p className="text-[11px] text-slate-400">Tidak ada tugas baru dari guru saat ini.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tugasList.slice(0, 3).map((t, idx) => {
                    const sub = getStudentSubmission(t);
                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-slate-900 block truncate max-w-[200px]">{t.judul}</span>
                          <p className="text-[11px] text-slate-500">{t.mapel} • Tenggat: {t.tenggat || '-'}</p>
                        </div>
                        {sub ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
                            <Check size={12} />
                            {sub.nilai !== null && sub.nilai !== undefined && String(sub.nilai).trim() !== ''
                              ? `Nilai: ${sub.nilai}`
                              : 'Terkumpul'}
                          </span>
                        ) : (
                          <button 
                            onClick={() => {
                              if (t.isAutoGrading) {
                                setActiveQuizModalItem({ ...t, isCbtExam: false, isTugas: true, type: 'PENUGASAN' });
                              } else {
                                setSelectedTugasToSubmit(t);
                                setActiveTab('tugas-materi');
                              }
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                          >
                            Kerjakan
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Academic & Financial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Rata-Rata Nilai</span>
                <Award size={16} className="text-amber-500" />
              </div>
              {averageGrade !== null ? (
                <>
                  <p className="text-2xl font-black text-slate-900">
                    {averageGrade} {' '}
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      Predikat {averageGrade >= 90 ? 'A' : averageGrade >= 80 ? 'B' : averageGrade >= 70 ? 'C' : 'D'}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">Berdasarkan capaian {nilaiRapor.length} mata pelajaran</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-black text-slate-400">-</p>
                  <p className="text-[11px] text-slate-400">Belum ada nilai terinput dari guru</p>
                </>
              )}
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Presensi Bulan Ini</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{studentAbsensi.percentage}%</p>
              <p className="text-[11px] text-slate-400">{studentAbsensi.hadir} Hadir • {studentAbsensi.sakit} Sakit • {studentAbsensi.izin} Izin • {studentAbsensi.alpa} Alpa</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Status Pembayaran Biaya</span>
                <CreditCard size={16} className="text-indigo-500" />
              </div>
              <p className={`text-2xl font-black ${ringkasanKeuangan.isLunas ? 'text-emerald-600' : 'text-amber-600'}`}>
                {ringkasanKeuangan.status}
              </p>
              <p className="text-[11px] text-slate-400">{ringkasanKeuangan.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JADWAL & PRESENSI */}
      {activeTab === 'jadwal-presensi' && (
        <div className="space-y-6">
          {/* Card Khusus Presensi Mandiri (QR & Foto Selfie Lokasi) */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 rounded-3xl shadow-lg shadow-emerald-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0">
                <Camera size={24} className="text-white" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full">
                    Presensi Digital Mandiri
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-300 text-emerald-950 px-2 py-0.5 rounded-full">
                    GPS Aktif
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight">Presensi Kehadiran Siswa Hari Ini</h3>
                <p className="text-xs text-emerald-100 leading-relaxed max-w-xl">
                  Lakukan absensi mandiri dengan memindai Barcode/QR Code presensi kelas atau upload foto selfie sebagai bukti kehadiran di lokasi lingkungan sekolah.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAbsensiModalOpen(true)}
                className="px-5 py-3 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-900 font-black text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Camera size={16} />
                <span>Buka Absensi QR & Foto</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pengajuan-izin');
                  const target = document.getElementById('portal-siswa-tabs');
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="px-4 py-3 bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-black text-xs rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer border border-rose-400/80"
                title="Ajukan surat izin atau surat sakit"
              >
                <FileText size={16} />
                <span>Ajukan Izin</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" />
                  <span>Jadwal Pelajaran Mingguan (Kelas {currentStudent.class})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tahun Pelajaran {settings.tahunPelajaran || '2026/2027'} • Semester Ganjil • Skema 3x Pertemuan Mingguan Terstruktur
                </p>
              </div>

              {/* FILTER CONTROLS: DROPDOWN HARI & BADGE JADWAL PERSONAL */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Filter Dropdown Hari Khusus 3 Sesi Siswa */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                  <Filter size={14} className="text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-500">Filter Sesi:</span>
                  <select
                    id="portal-filter-dropdown-hari"
                    value={selectedJadwalHari}
                    onChange={(e) => setSelectedJadwalHari(e.target.value)}
                    className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer pr-1"
                  >
                    <option value="Semua">Semua 3 Sesi Mingguan Anda</option>
                    {jadwalKelas.map((j) => (
                      <option key={j.hari} value={j.hari}>
                        Hari {j.hari} ({j.jam})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Badge Status Kelompok Belajar Siswa */}
                <div className="flex items-center gap-1.5 bg-indigo-50/90 border border-indigo-200/80 px-3 py-1.5 rounded-xl text-xs font-black text-indigo-950">
                  <Sparkles size={13} className="text-indigo-600 shrink-0" />
                  <span>
                    Kelas {currentStudent.class} • {currentStudent.statusBekerja === 'Aktif Bekerja' ? '🌙 Sesi Malam (Pekerja)' : '☀️ Sesi Siang (Reguler)'}
                  </span>
                </div>

                <button 
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak</span>
                </button>
              </div>
            </div>

            {/* Banner Logika Sinkronisasi 3x Pertemuan */}
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-indigo-950 flex items-center gap-2 flex-wrap">
                    <span>Skema Belajar Rombel KTCT: 3x Pertemuan Sinkron per Minggu</span>
                    <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-full">
                      Jadwal Khusus Kelas {currentStudent.class}
                    </span>
                  </p>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    {currentStudent.statusBekerja === 'Aktif Bekerja' ? (
                      <span>Status terverifikasi: <strong className="text-emerald-700">Aktif Bekerja (Ada Surat Keterangan Sah)</strong>. Sistem hanya menampilkan 3 sesi belajar KBM resmi Anda: <b>Senin Malam (19:30 - 21:30)</b>, <b>Rabu Malam (19:30 - 21:30)</b>, dan <b>Minggu ({jadwalKelas[2]?.jam || '10:00 - 12:00'})</b>. Sesi siang maupun sesi kelas lain tidak ditampilkan.</span>
                    ) : (
                      <span>Status terverifikasi: <strong className="text-amber-700">Tidak Bekerja / Reguler</strong>. Sistem hanya menampilkan 3 sesi belajar KBM resmi Anda: <b>Senin Siang ({jadwalKelas[0]?.jam || '13:00 - 15:00'})</b>, <b>Kamis Siang ({jadwalKelas[1]?.jam || '13:00 - 15:00'})</b>, dan <b>Minggu ({jadwalKelas[2]?.jam || '10:00 - 12:00'})</b>. Sesi malam maupun sesi kelas lain tidak ditampilkan.</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('cbt-ujian')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Jadwal Ujian CBT bersifat berkala / insidental"
                >
                  <Laptop size={14} />
                  <span>Jadwal Ujian CBT ({cbtUjianList.length}) →</span>
                </button>
              </div>
            </div>

            {/* Grid Kartu Jadwal Pelajaran Khusus Siswa (Tepat 3x Pertemuan Sesuai Jam & Kelasnya) */}
            {(() => {
              const targetHari = (selectedJadwalHari || 'Semua').trim().toLowerCase();
              const sessionsToDisplay = targetHari === 'semua' 
                ? jadwalKelas 
                : jadwalKelas.filter(j => String(j.hari || '').toLowerCase() === targetHari);

              if (sessionsToDisplay.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <p className="font-bold text-slate-800 text-sm">
                      Tidak Ada Jadwal KBM di Hari {selectedJadwalHari}
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Jadwal resmi Anda di Kelas {currentStudent.class} terjadwal khusus 3x pertemuan pada hari: {jadwalKelas.map(j => j.hari).join(', ')}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedJadwalHari('Semua')}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <span>Tampilkan Semua 3 Sesi Belajar Anda</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessionsToDisplay.map((j, idx) => {
                    const pertemuanNumber = j.pertemuanKe || (idx + 1);
                    return (
                      <div key={j.id || idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3.5 relative overflow-hidden flex flex-col justify-between hover:border-indigo-300 transition">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-indigo-950 uppercase tracking-wider">
                                {j.hari}
                              </span>
                              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                                Pertemuan #{pertemuanNumber}
                              </span>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {j.jam} WIB
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Mata Pembelajaran:</span>
                            <h4 className="font-black text-sm text-slate-900 leading-snug">
                              {j.mapel || j.mataPelajaran}
                            </h4>
                            {j.daftarMapel && Array.isArray(j.daftarMapel) && j.daftarMapel.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {j.daftarMapel.map((m: string, mIdx: number) => (
                                  <span key={mIdx} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-50">
                            <p className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-400">Tutor:</span> 
                              <span className="font-bold text-slate-700">{j.guru || 'Tutor Pengampu Rombel'}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-400">Ruangan:</span> 
                              <span className="font-medium text-slate-700">{j.ruang || `Ruang KBM Kelas ${currentStudent.class}`}</span>
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            j.kategoriBelajar === 'Aktif Bekerja'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {j.kategoriBelajar === 'Aktif Bekerja' ? '🌙 Sesi Malam (Pekerja)' : '☀️ Sesi Siang (Reguler)'}
                          </span>
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                            KBM Sinkron
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Presensi Log */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Riwayat Presensi & Kehadiran Saya</span>
              </h3>
              <button
                onClick={() => setActiveTab('pengajuan-izin')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <FileText size={14} />
                <span>+ Ajukan Izin / Sakit</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                <p className="text-[11px] font-bold text-emerald-800">Hadir</p>
                <p className="text-xl font-black text-emerald-950 mt-0.5">{studentAbsensi.hadir} Hari</p>
              </div>
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-2xl text-center">
                <p className="text-[11px] font-bold text-black">Sakit</p>
                <p className="text-xl font-black text-black mt-0.5">{studentAbsensi.sakit} Hari</p>
              </div>
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-2xl text-center">
                <p className="text-[11px] font-bold text-black">Dispensasi & Izin</p>
                <p className="text-xl font-black text-black mt-0.5">{studentAbsensi.izin} Hari</p>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-center">
                <p className="text-[11px] font-bold text-rose-800">Alpa</p>
                <p className="text-xl font-black text-rose-950 mt-0.5">{studentAbsensi.alpa} Hari</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PENGAJUAN IZIN / SAKIT SISWA */}
      {activeTab === 'pengajuan-izin' && (
        <PengajuanIzinPortal 
          student={currentStudent}
          submittedBy="Siswa"
        />
      )}

      {/* TAB 3: UJIAN CBT ONLINE */}
      {activeTab === 'cbt-ujian' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Laptop size={18} className="text-cyan-600" />
                <span>Ujian CBT Online Siswa (Computer Based Test)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar sesi ujian aktif dan tes yang dapat dikerjakan oleh kelas {currentStudent.class}.
              </p>
            </div>

            {!matchStatusActive(currentStudent.status) ? (
              <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <Laptop size={32} className="text-amber-500 mx-auto" />
                <h4 className="font-bold text-amber-900 text-sm">Akses Ujian Online Ditutup</h4>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                  Status akun Anda saat ini adalah <strong>{currentStudent.status || 'Tidak Aktif'}</strong>. Fitur Ujian CBT Online hanya dibuka untuk siswa dengan status <strong>Aktif</strong>.
                </p>
              </div>
            ) : cbtUjianList.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <Laptop size={32} className="text-slate-400 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Jadwal Ujian Aktif</h4>
                <p className="text-xs text-slate-500">Saat ini belum ada sesi ujian CBT yang dibuka untuk kelas Anda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cbtUjianList.map((u, idx) => {
                  const existingHasil = cbtHasilList.find(h => 
                    String(h.examId) === String(u.id) || 
                    String(h.nama).toLowerCase() === String(u.nama || u.judul).toLowerCase()
                  );

                  const scheduleInfo = validateExamSchedule(u, false);

                  return (
                    <div key={idx} className="p-5 bg-gradient-to-br from-slate-50 to-cyan-50/40 rounded-3xl border border-cyan-100 space-y-4 shadow-2xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-md">
                            {u.jenis || 'Penilaian Sumatif'}
                          </span>
                          <h4 className="text-base font-black text-slate-900">{u.nama || u.judul}</h4>
                          <p className="text-xs text-slate-500">{u.mapel} • {u.durasi || '60'} Menit</p>
                        </div>
                        {existingHasil ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Selesai • {existingHasil.nilai}</span>
                          </span>
                        ) : !scheduleInfo.isOpen ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-black rounded-lg flex items-center gap-1 border border-amber-200">
                            <Lock size={11} className="text-amber-700" />
                            <span>Terkunci</span>
                          </span>
                        ) : (
                          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                        )}
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-600">
                          <span>Jadwal Pelaksanaan:</span>
                          <strong className="text-slate-800">{scheduleInfo.scheduledTimeText}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Status Waktu:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                            existingHasil 
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                              : scheduleInfo.isOpen 
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                              : 'text-amber-800 bg-amber-50 border-amber-200'
                          }`}>
                            {existingHasil ? 'Sudah Dikerjakan' : scheduleInfo.statusLabel}
                          </span>
                        </div>
                        {existingHasil && (
                          <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                            <span>Hasil Nilai:</span>
                            <strong className="text-indigo-700 font-extrabold">{existingHasil.nilai} / 100 ({existingHasil.status})</strong>
                          </div>
                        )}
                      </div>

                      {existingHasil ? (
                        <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>Ujian Selesai Dikerjakan (Skor: {existingHasil.nilai})</span>
                        </div>
                      ) : !scheduleInfo.isOpen ? (
                        <div className="space-y-1.5">
                          <button 
                            type="button"
                            onClick={() => {
                              Swal.fire({
                                icon: 'info',
                                title: 'Soal Ujian Belum Dibuka',
                                html: `<div class="text-left text-xs space-y-2">
                                  <p><strong>Pemberitahuan Sistem Ujian:</strong></p>
                                  <p>${scheduleInfo.detailedMessage}</p>
                                  <div class="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                                    <p><strong>Mata Pelajaran:</strong> ${u.mapel}</p>
                                    <p><strong>Jadwal Pelaksanaan:</strong> ${scheduleInfo.scheduledTimeText}</p>
                                    <p><strong>Status Sesi:</strong> ${scheduleInfo.statusLabel}</p>
                                  </div>
                                  <p class="text-slate-500 text-[11px]">Soal ujian CBT akan terbuka otomatis ketika hari dan tanggal sesuai jadwal.</p>
                                </div>`,
                                confirmButtonColor: '#0284c7',
                                confirmButtonText: 'Saya Mengerti'
                              });
                            }}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition border border-slate-300 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                          >
                            <Lock size={14} className="text-amber-600" />
                            <span>Dibuka Sesuai Jadwal ({scheduleInfo.scheduledTimeText})</span>
                          </button>
                          <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg text-center font-medium">
                            🔒 {scheduleInfo.reason}
                          </p>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setActiveQuizModalItem({ ...u, isCbtExam: true, isExam: true, type: 'CBT_EXAM' })}
                          className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 active:scale-98 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Laptop size={14} />
                          <span>Mulai Kerjakan Ujian CBT Online</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tabel Riwayat Hasil Ujian CBT Siswa */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  <span>Riwayat & Rekap Nilai Ujian CBT Siswa</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar nilai hasil ujian CBT yang telah diselesaikan oleh {currentStudent.name} ({currentStudent.class}).
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl">
                Total: {cbtHasilList.length} Ujian
              </span>
            </div>

            {cbtHasilList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                Belum ada riwayat hasil ujian CBT yang diselesaikan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="p-3 rounded-l-xl">No</th>
                      <th className="p-3">Nama Ujian CBT</th>
                      <th className="p-3">Mata Pelajaran</th>
                      <th className="p-3 text-center">Benar / Salah</th>
                      <th className="p-3 text-center">Nilai CBT</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 rounded-r-xl">Waktu Selesai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cbtHasilList.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{h.nama}</td>
                        <td className="p-3 text-slate-600 font-medium">{h.mapel}</td>
                        <td className="p-3 text-center font-mono">
                          <span className="text-emerald-700 font-bold">{h.benar}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-rose-600 font-bold">{h.salah}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-black text-indigo-700 text-sm">
                          {h.nilai}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            h.status === 'Tuntas' || h.nilai >= 75
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {h.status || (h.nilai >= 75 ? 'Tuntas' : 'Remedial')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {h.waktuSelesai ? String(h.waktuSelesai).slice(0, 16).replace('T', ' ') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TUGAS BELAJAR */}
      {activeTab === 'tugas-materi' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CheckSquare size={18} className="text-rose-600" />
                <span>Penugasan & Pengumpulan Tugas Siswa</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kumpulkan tugas harian, kuis pilihan ganda auto-grading, dan proyek belajar langsung ke guru.
              </p>
            </div>

            {/* Submission Modal / Box if selected */}
            {selectedTugasToSubmit && (
              <div className="p-5 bg-rose-50/70 border-2 border-rose-200 rounded-3xl space-y-4 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                      Form Pengumpulan Bukti Penyelesaian Tugas
                    </span>
                    <h4 className="text-base font-black text-slate-900">{selectedTugasToSubmit.judul}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-semibold text-rose-900">{selectedTugasToSubmit.mapel}</span>
                      {selectedTugasToSubmit.rentangJadwal && (
                        <span>• Jadwal: <strong className="text-slate-800">{selectedTugasToSubmit.rentangJadwal}</strong></span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedTugasToSubmit(null);
                      setSubmissionPhoto(null);
                      setSubmissionPhotoName('');
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                <form onSubmit={(e) => handleSubmitTugas(e, false)} className="space-y-4">
                  {/* Bukti Foto */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Camera size={14} className="text-rose-600" />
                      <span>Bukti Foto Penyelesaian Tugas (Buku/Lembar Kerja):</span>
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <label className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition active:scale-95">
                        <Upload size={14} className="text-slate-500" />
                        <span>{isCompressingPhoto ? 'Memproses Foto...' : submissionPhoto ? 'Ganti Foto Bukti' : 'Ambil Foto / Unggah Gambar'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={handlePhotoUpload} 
                          className="hidden" 
                        />
                      </label>
                      {submissionPhotoName && (
                        <span className="text-xs text-slate-500 truncate max-w-xs">{submissionPhotoName}</span>
                      )}
                    </div>

                    {submissionPhoto && (
                      <div className="relative inline-block mt-2">
                        <img 
                          src={submissionPhoto} 
                          alt="Pratinjau Bukti" 
                          className="w-28 h-28 object-cover rounded-xl border-2 border-emerald-500 shadow-xs cursor-pointer hover:opacity-90 transition"
                          onClick={() => setPreviewStudentPhotoModal({
                            url: submissionPhoto,
                            title: selectedTugasToSubmit.judul
                          })}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionPhoto(null);
                            setSubmissionPhotoName('');
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-md cursor-pointer hover:bg-rose-700"
                        >
                          <X size={12} />
                        </button>
                        <span className="block text-[10px] text-emerald-700 font-bold mt-1">✓ Foto siap dikirim</span>
                      </div>
                    )}
                  </div>

                  {/* Teks Tulisan / Catatan Jawaban */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 block">
                      Bukti Tulisan / Ringkasan Jawaban Tugas:
                    </label>
                    <textarea 
                      value={submissionText}
                      onChange={(e) => setSubmissionText(e.target.value)}
                      placeholder="Tuliskan ringkasan hasil pengerjaan, jawaban soal, atau catatan penyelesaian di sini..."
                      rows={3}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-400 outline-hidden"
                      required={!submissionPhoto}
                    />
                  </div>

                  {/* Link Dokumen Tambahan (Opsional) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Tautan Dokumen / Google Drive (Opsional):
                    </label>
                    <input 
                      type="url"
                      value={submissionFileLink}
                      onChange={(e) => setSubmissionFileLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-400 outline-hidden"
                    />
                  </div>

                  {/* Tombol Pengiriman */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                    >
                      <Send size={14} />
                      <span>{submitSuccess ? 'Berhasil Dikirim!' : 'Simpan & Kirim ke Guru'}</span>
                    </button>

                    <button 
                      type="button"
                      onClick={(e) => handleSubmitTugas(e, true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      title="Simpan pengerjaan dan buka WhatsApp untuk kirim bukti ke WhatsApp Group PDKT"
                    >
                      <Share2 size={14} />
                      <span>Kirim ke WhatsApp Group PDKT</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {tugasList.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Tugas Tertunda</h4>
                <p className="text-xs text-slate-500">Semua tugas kelas {currentStudent.class} telah tuntas dikumpulkan.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tugasList.map((t, idx) => {
                  const submission = getStudentSubmission(t);
                  const isQuizTask = t.isAutoGrading || t.kategori === 'Kuis Pilihan Ganda (Auto-Grading)' || (Array.isArray(t.soalList) && t.soalList.length > 0);

                  return (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                            {t.mapel}
                          </span>
                          {isQuizTask && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded flex items-center gap-1">
                              <Sparkles size={10} />
                              Auto-Grading PG
                            </span>
                          )}
                          {t.rentangJadwal && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              {t.rentangJadwal}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">• Tenggat: {t.tenggat || '-'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{t.judul}</h4>
                        {t.deskripsi && <p className="text-xs text-slate-500 line-clamp-2">{t.deskripsi}</p>}
                      </div>

                      {submission ? (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-0.5 shrink-0">
                            <span className="text-[10px] font-extrabold text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Sudah Dikumpulkan
                            </span>
                            <p className="text-[11px] text-emerald-950 font-bold">
                              {submission.nilai !== null && submission.nilai !== undefined && String(submission.nilai).trim() !== ''
                                ? `Nilai: ${submission.nilai}/100` 
                                : 'Menunggu Nilai Guru'}
                            </p>
                          </div>

                          {submission.fotoBuktiUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewStudentPhotoModal({
                                url: submission.fotoBuktiUrl,
                                title: `${t.judul} (${t.mapel})`
                              })}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              title="Lihat foto bukti yang sudah dikumpulkan"
                            >
                              <Camera size={12} className="text-emerald-600" />
                              <span>Foto Bukti</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendToWhatsAppGroupPDKT(t, submission.textJawaban, submission.fotoBuktiUrl, submission.fileLink)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                            title="Kirim atau bagikan bukti pengerjaan ke WhatsApp Group PDKT"
                          >
                            <Share2 size={12} />
                            <span>WhatsApp PDKT</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {isQuizTask && (
                            <button 
                              onClick={() => setActiveQuizModalItem({ ...t, isCbtExam: false, isTugas: true, type: 'PENUGASAN' })}
                              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Sparkles size={13} />
                              <span>Kerjakan Kuis PG</span>
                            </button>
                          )}

                          <button 
                            onClick={() => setSelectedTugasToSubmit(t)}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Send size={13} />
                            <span>Kumpulkan Bukti Foto/Teks</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: NILAI & RAPOR */}
      {activeTab === 'nilai-rapor' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  <span>Lembar Capaian Nilai & Rapor Siswa</span>
                </h3>
                <p className="text-xs text-slate-500">Tahun Pelajaran {settings.tahunPelajaran || '2026/2027'} • Kelas {currentStudent.class}</p>
              </div>
              {nilaiRapor.length > 0 && (
                <button 
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs self-start sm:self-auto cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Cetak Rapor Digital</span>
                </button>
              )}
            </div>

            {/* Nilai Table or Real Empty State */}
            {nilaiRapor.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Award size={32} className="mx-auto text-slate-400" />
                <p className="text-sm font-bold text-slate-700">Belum Ada Lembar Nilai Rapor</p>
                <p className="text-xs text-slate-500">Nilai rapor akan tampil otomatis setelah dewan guru mata pelajaran menginput nilai semester ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200">
                      <th className="p-3 rounded-l-xl">No</th>
                      <th className="p-3">Mata Pelajaran</th>
                      <th className="p-3 text-center">KKM</th>
                      <th className="p-3 text-center">Formatif/Tugas</th>
                      <th className="p-3 text-center">STS/PTS</th>
                      <th className="p-3 text-center">SAS/PAS</th>
                      <th className="p-3 text-center">Nilai Akhir</th>
                      <th className="p-3 text-center">Predikat</th>
                      <th className="p-3 rounded-r-xl">Capaian Kompetensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nilaiRapor.map((n, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{n.mapel || n.mataPelajaran || n.subjectName}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{n.kkm || 75}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{n.tp1 ?? n.tugas ?? '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{n.sts ?? n.pts ?? '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">{n.sas ?? n.pas ?? '-'}</td>
                        <td className="p-3 text-center font-mono font-extrabold text-indigo-700 text-sm">
                          {n.nilaiAkhir !== null && n.nilaiAkhir !== undefined && n.nilaiAkhir !== '' ? n.nilaiAkhir : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            n.predikat === 'A' ? 'bg-emerald-100 text-emerald-800' :
                            n.predikat === 'B' ? 'bg-blue-100 text-blue-800' :
                            n.predikat === 'C' ? 'bg-amber-100 text-amber-800' :
                            n.predikat === 'D' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {n.predikat || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 leading-relaxed">
                          {n.deskripsi || n.capaian || (n.ketercapaian ? `Status capaian: ${n.ketercapaian}` : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: KEUANGAN & BIAYA */}
      {activeTab === 'keuangan-biaya' && (
        <div className="space-y-6">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Tagihan</span>
              <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {fmtRupiah(ringkasanKeuangan.totalTagihan)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium block">Kewajiban Biaya Pendidikan</span>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Total Terbayar</span>
              <p className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                {fmtRupiah(ringkasanKeuangan.totalBayar)}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium block">Tercatat Kasir & Kwitansi Sah</span>
            </div>

            <div className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
              ringkasanKeuangan.sisaTagihan > 0 ? 'bg-rose-100/90 border-rose-300' : 'bg-emerald-100/90 border-emerald-300'
            }`}>
              <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                ringkasanKeuangan.sisaTagihan > 0 ? 'text-rose-900' : 'text-emerald-900'
              }`}>
                Sisa Tanggungan
              </span>
              <p className={`text-base sm:text-lg font-black font-mono ${
                ringkasanKeuangan.sisaTagihan > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {ringkasanKeuangan.sisaTagihan > 0 ? `-${fmtRupiah(ringkasanKeuangan.sisaTagihan)}` : 'LUNAS'}
              </p>
              <span className={`text-[10px] font-medium block ${
                ringkasanKeuangan.sisaTagihan > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {ringkasanKeuangan.sisaTagihan > 0 ? 'Harap diselesaikan tepat waktu' : 'Bebas Tanggungan Biaya (LUNAS)'}
              </span>
            </div>

            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">Saldo Tabungan</span>
              <p className="text-base sm:text-lg font-black text-indigo-700 font-mono">
                {fmtRupiah(keuanganTabungan.saldo)}
              </p>
              <span className="text-[10px] text-indigo-600 font-medium block">Buku Tabungan Siswa</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Tagihan Biaya Pendidikan Card (Real Data) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CreditCard size={17} className="text-emerald-600" />
                  <span>Daftar Tagihan Siswa</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {keuanganTagihan.length} Data
                </span>
              </div>

              {keuanganTagihan.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <CreditCard size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Tidak Ada Tagihan Aktif</p>
                  <p className="text-[11px] text-slate-500">Seluruh administrasi biaya pendidikan tercatat lunas dan bebas tanggungan.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {keuanganTagihan.map((t, idx) => {
                    const isLunas = t.status === 'Lunas' || t.status === 'PAID' || t.status === 'LUNAS';
                    const isSebagian = t.status === 'Sebagian' || t.status === 'PARTIAL';
                    const totalNom = Number(t.totalTagihan || t.nominal || 0);
                    const sisaNom = Number(t.sisaTagihan !== undefined ? t.sisaTagihan : totalNom);
                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 truncate block">
                              {t.namaBiaya || t.judul || 'Tagihan Siswa'}
                            </span>
                            <span className="text-[10px] text-slate-400">Tempo: {t.jatuhTempo || '-'}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 ${
                            isLunas ? 'bg-emerald-100 text-emerald-800' :
                            isSebagian ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {isLunas ? 'Lunas' : isSebagian ? 'Sebagian' : 'Belum Bayar'}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-500">Total: <strong>{fmtRupiah(totalNom)}</strong></span>
                          {!isLunas && (
                            <span className="font-bold text-rose-600 font-mono text-[11px]">Sisa: {fmtRupiah(sisaNom)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Riwayat Pembayaran Sah & Kwitansi Siswa (Real Data from Sheet PEMBAYARAN) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Receipt size={17} className="text-sky-600" />
                  <span>Riwayat Bayar & Kwitansi</span>
                </h3>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {keuanganPembayaran.length} Transaksi
                </span>
              </div>

              {keuanganPembayaran.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <Receipt size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Bayar</p>
                  <p className="text-[11px] text-slate-500">Bukti pembayaran dan kwitansi resmi kasir sekolah akan muncul di sini setelah transaksi disahkan.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {keuanganPembayaran.map((p, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 truncate block">
                            {p.namaBiaya || 'Biaya Pendidikan'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.noKwitansi} • {p.tanggal}
                          </span>
                        </div>
                        <span className="font-mono font-black text-xs text-emerald-700 shrink-0">
                          {fmtRupiah(p.nominal)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 truncate max-w-[140px]">{p.metode}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedKwitansi(p)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black flex items-center gap-1 transition cursor-pointer"
                        >
                          <Printer size={11} />
                          <span>Kwitansi</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabungan Siswa Card (Real Data from Sheet TABUNGAN) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Wallet size={17} className="text-indigo-600" />
                  <span>Buku Tabungan Siswa</span>
                </h3>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                  {keuanganTabungan.riwayat.length} Mutasi
                </span>
              </div>

              {keuanganTabungan.riwayat.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <Wallet size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Belum Ada Transaksi Tabungan</p>
                  <p className="text-[11px] text-slate-500">Transaksi setoran atau penarikan kas tabungan siswa akan dicatat di sini.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {keuanganTabungan.riwayat.map((item, idx) => {
                    const isSetor = item.isSetor;
                    const nom = Number(item.nominal || 0);
                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 block truncate">
                            {item.keterangan || (isSetor ? 'Setoran Kas Tabungan' : 'Penarikan Kas Tabungan')}
                          </span>
                          <span className="text-[10px] text-slate-400">{item.tanggal || '-'}</span>
                        </div>
                        <span className={`font-mono font-bold shrink-0 ${isSetor ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isSetor ? '+' : '-'}{fmtRupiah(nom)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PRESTASI & BK */}
      {activeTab === 'prestasi-bk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Prestasi (Real Data) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                <span>Piagam & Prestasi Siswa</span>
              </h3>

              {prestasiList.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <Award size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Belum Ada Catatan Prestasi</p>
                  <p className="text-[11px] text-slate-500">Prestasi akademik maupun non-akademik siswa yang terverifikasi sekolah akan tampil di sini.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {prestasiList.map((p, idx) => (
                    <div key={idx} className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-950">
                          {p.namaPrestasi || p.judul || p.kegiatan || 'Prestasi Siswa'}
                        </span>
                        {p.tingkat && (
                          <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                            {p.tingkat}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-800">
                        {p.deskripsi || p.keterangan || (p.tahun ? `Tahun: ${p.tahun}` : '-')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Catatan Konseling BK (Real Data) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <span>Catatan Bimbingan Konseling (BK)</span>
              </h3>

              {bimbinganList.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                  <ShieldCheck size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Tidak Ada Catatan Kasus / Pelanggaran</p>
                  <p className="text-[11px] text-slate-500">Catatan bimbingan konseling dan perkembangan karakter siswa berstatus baik dan aman.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bimbinganList.map((b, idx) => (
                    <div key={idx} className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200/70 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-indigo-950 block">
                          {b.topik || b.judul || b.kategori || 'Sesi Bimbingan Konseling'}
                        </span>
                        {b.tanggal && (
                          <span className="text-[10px] font-medium text-slate-500">{b.tanggal}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-indigo-800 leading-relaxed">
                        {b.catatan || b.deskripsi || b.solusi || 'Telah mengikuti sesi bimbingan bersama guru BK.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: PROFIL & BIODATA DAPODIK */}
      {activeTab === 'profil-biodata' && (
        <div className="space-y-6">
          {/* Success Banner */}
          {photoSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <span>{photoSuccessMsg}</span>
            </div>
          )}

          {/* Grid: Pas Foto Resmi & Kartu Pelajar Digital */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Kolom Kiri: Pas Foto Resmi & Upload (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Camera size={18} className="text-indigo-600" />
                  <span>Pas Foto Resmi Siswa</span>
                </h3>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  studentPhotoUrl ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {studentPhotoUrl ? 'Foto Terpasang' : 'Belum Ada Foto'}
                </span>
              </div>

              {/* 3x4 Photo Frame */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
                <div className="w-32 h-44 rounded-2xl bg-white shadow-md border-2 border-slate-300 overflow-hidden flex items-center justify-center relative group">
                  {studentPhotoUrl ? (
                    <img
                      src={studentPhotoUrl}
                      alt={currentStudent.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-sky-700 flex flex-col items-center justify-center text-white p-3 text-center">
                      <span className="font-black text-4xl">{currentStudent.name.charAt(0).toUpperCase()}</span>
                      <span className="text-[10px] font-bold mt-2 opacity-80">Format 3x4 / 4x6</span>
                    </div>
                  )}

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <Upload size={20} />
                    <span>Upload Foto Baru</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-xs font-black text-slate-800">{currentStudent.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">NISN: {currentStudent.nisn || currentStudent.nis || '-'}</p>
                  <p className="text-[10px] text-slate-400">Rekomendasi: Seragam Sekolah Rapi (Max 5MB)</p>
                </div>

                {/* Upload & Edit Buttons */}
                <div className="w-full flex flex-col gap-2 pt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Upload size={14} />
                    <span>{isUploadingPhoto ? 'Mengunggah...' : 'Pilih File Pas Foto'}</span>
                  </button>

                  <button
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Link2 size={13} />
                    <span>Input Link URL Google Drive / Gambar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Kartu Pelajar Digital Resmi (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <CreditCard size={18} className="text-indigo-600" />
                  <span>Kartu Tanda Siswa (KTS Digital Resmi)</span>
                </h3>
                <button
                  onClick={() => window.print()}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Printer size={13} />
                  <span>Cetak Kartu</span>
                </button>
              </div>

              {/* Kartu Pelajar Graphic View */}
              <div 
                ref={kartuPelajarRef}
                className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-lg border border-indigo-500/30 relative overflow-hidden space-y-4"
              >
                {/* Background Pattern */}
                <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                {/* Header Kartu */}
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <div className="flex items-center gap-3">
                    {settings.logoUrl || settings.schoolLogoUrl ? (
                      <img 
                        src={getGoogleDriveDirectImageUrl(settings.logoUrl || settings.schoolLogoUrl)} 
                        alt="Logo Sekolah" 
                        className="w-10 h-10 object-contain rounded-lg bg-white/10 p-0.5"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-black text-[10px]">
                        LOGO
                      </div>
                    )}
                    <div>
                      <h4 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">KARTU TANDA SISWA</h4>
                      <h3 className="text-xs sm:text-sm font-black text-white">{settings.namaSekolah || settings.schoolName || 'SISTA ACADEMIC'}</h3>
                      <p className="text-[9px] text-slate-300 truncate max-w-[240px]">{settings.alamat || 'Jl. Pendidikan No. 128'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                      AKTIF
                    </span>
                  </div>
                </div>

                {/* Body Kartu (Foto & Data) */}
                <div className="flex items-start gap-4">
                  {/* Foto Siswa */}
                  <div className="w-20 h-26 rounded-xl bg-white/10 border-2 border-white/30 overflow-hidden shrink-0 shadow-md flex items-center justify-center">
                    {studentPhotoUrl ? (
                      <img
                        src={studentPhotoUrl}
                        alt={currentStudent.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-700 flex items-center justify-center font-black text-2xl text-white">
                        {currentStudent.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Biodata */}
                  <div className="flex-1 space-y-1 text-xs text-slate-200">
                    <div>
                      <span className="text-[9px] text-indigo-300 block uppercase font-bold">Nama Lengkap:</span>
                      <span className="font-black text-white text-sm">{currentStudent.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-[9px] text-indigo-300 block uppercase font-bold">NIS (No. PDKT):</span>
                        <span className="font-mono font-bold text-white">{currentStudent.nopdkt || currentStudent.nis || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-indigo-300 block uppercase font-bold">Kelas:</span>
                        <span className="font-bold text-white">{currentStudent.class}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-indigo-300 block uppercase font-bold">NISN:</span>
                        <span className="font-mono font-bold text-white">{currentStudent.nisn || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-indigo-300 block uppercase font-bold">Tempat, Tgl Lahir:</span>
                        <span className="font-medium text-slate-200 truncate block">{currentStudent.pob || 'Jakarta'}, {currentStudent.dob || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-indigo-300 block uppercase font-bold">Jenis Kelamin:</span>
                        <span className="font-medium text-slate-200">{currentStudent.gender === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Kartu & QR Code */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white p-1 rounded-lg flex items-center justify-center shrink-0">
                      <QrCode size={32} className="text-slate-900" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-white">ID: {currentStudent.nisn || currentStudent.id}</p>
                      <p className="text-[8px] text-slate-400">Diverifikasi Sistem</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-300">Kepala Sekolah,</p>
                    <p className="font-bold text-white mt-1 underline">{settings.headmasterName || 'Kepala Sekolah'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HEADER & ACTION EDIT BIODATA LENGKAP SISWA */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider">
                    Dapodik Kemendikbudristek & KTCT
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle size={10} /> Auto-Sync Sheet SISWA
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                  <User size={20} className="text-indigo-600" />
                  <span>Biodata Lengkap Siswa Resmi</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Seluruh data pokok, akademik, shift kerja, domisili, orang tua, wali, dan berkas digital siswa.
                </p>
              </div>

              <button
                onClick={() => setIsEditBiodataOpen(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-2xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <Edit3 size={15} />
                <span>Edit Biodata Siswa</span>
              </button>
            </div>

            {/* 8 SECTIONS BIODATA LENGKAP */}
            <div className="space-y-6">
              {/* 1. DATA POKOK SISWA */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2 tracking-wider">
                  <User size={14} className="text-indigo-600" />
                  <span>1. Identitas Pokok Siswa</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap</span>
                    <p className="font-black text-slate-900 text-sm">{currentStudent.name}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Panggilan</span>
                    <p className="font-bold text-slate-900">{currentStudent.nickname || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Jenis Kelamin</span>
                    <p className="font-bold text-slate-900">{currentStudent.gender === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">NISN</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.nisn || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">NIS (No. PDKT)</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.nopdkt || currentStudent.nis || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">NIK / No. KTP</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.nik || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tempat Lahir</span>
                    <p className="font-bold text-slate-900">{currentStudent.pob || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Lahir</span>
                    <p className="font-bold text-slate-900">{currentStudent.dob || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Agama</span>
                    <p className="font-bold text-slate-900">{currentStudent.religion || 'Islam'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Golongan Darah</span>
                    <p className="font-bold text-slate-900">{currentStudent.bloodType || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Anak Ke- / Jml Saudara</span>
                    <p className="font-bold text-slate-900">Anak ke-{currentStudent.birthOrder || '-'} dari {currentStudent.siblingCount || '-'} bersaudara</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tinggi / Berat Badan</span>
                    <p className="font-bold text-slate-900">{currentStudent.height ? `${currentStudent.height} cm` : '-'} / {currentStudent.weight ? `${currentStudent.weight} kg` : '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hobi</span>
                    <p className="font-bold text-slate-900">{currentStudent.hobby || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cita-Cita</span>
                    <p className="font-bold text-slate-900">{currentStudent.ambition || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kebutuhan Khusus</span>
                    <p className="font-bold text-slate-900">{currentStudent.specialNeeds || 'Tidak Ada'}</p>
                  </div>
                </div>
              </div>

              {/* 2. AKADEMIK & ROMBEL */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2 tracking-wider">
                  <GraduationCap size={14} className="text-indigo-600" />
                  <span>2. Data Akademik & Rombel Kelas</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kelas & Rombel</span>
                    <p className="font-black text-indigo-700">{currentStudent.class}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Wali Kelas</span>
                    <p className="font-bold text-slate-900">{waliKelasName}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tahun Masuk</span>
                    <p className="font-bold text-slate-900">{currentStudent.entryYear || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tahun Ajaran</span>
                    <p className="font-bold text-slate-900">{currentStudent.academicYear || settings.tahunPelajaran || '2026/2027'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. PDKT (NIS)</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.nopdkt || currentStudent.noPdkt || currentStudent.nis || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status Keaktifan</span>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                      {currentStudent.status || 'Aktif'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sekolah Asal</span>
                    <p className="font-bold text-slate-900">{currentStudent.previousSchool || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. Ijazah / SKHUN</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.diplomaNumber || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 3. STATUS BEKERJA & SHIFT BELAJAR KTCT */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2 tracking-wider">
                  <Briefcase size={14} className="text-indigo-600" />
                  <span>3. Status Bekerja & Shift KTCT</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status Bekerja</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                      currentStudent.workingStatus === 'Bekerja' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {currentStudent.workingStatus || 'Tidak Bekerja'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kelompok / Shift Belajar</span>
                    <p className="font-black text-indigo-700">{currentStudent.workShift || 'Reguler'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tempat Bekerja</span>
                    <p className="font-bold text-slate-900">{currentStudent.workPlace || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Posisi / Jabatan</span>
                    <p className="font-bold text-slate-900">{currentStudent.workPosition || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Jam Kerja</span>
                    <p className="font-bold text-slate-900">{currentStudent.workHours || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status Verifikasi Kerja</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                      currentStudent.workVerificationStatus === 'Terverifikasi' ? 'bg-emerald-100 text-emerald-800' :
                      currentStudent.workVerificationStatus === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {currentStudent.workVerificationStatus || 'Belum Verifikasi'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Surat Keterangan Bekerja</span>
                    {currentStudent.workCertificateUrl ? (
                      <a 
                        href={currentStudent.workCertificateUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 truncate"
                      >
                        <ExternalLink size={12} />
                        <span>Lihat Dokumen Surat Kerja</span>
                      </a>
                    ) : (
                      <p className="text-slate-400 italic">Belum mengunggah surat keterangan bekerja</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. ALAMAT DOMISILI & KONTAK */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2 tracking-wider">
                  <MapPin size={14} className="text-indigo-600" />
                  <span>4. Alamat Domisili & Kontak Siswa</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Alamat Lengkap</span>
                    <p className="font-bold text-slate-900">{currentStudent.address || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">RT / RW</span>
                    <p className="font-bold text-slate-900">{currentStudent.rt || '-'} / {currentStudent.rw || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kelurahan / Desa</span>
                    <p className="font-bold text-slate-900">{currentStudent.village || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kecamatan</span>
                    <p className="font-bold text-slate-900">{currentStudent.district || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kabupaten / Kota</span>
                    <p className="font-bold text-slate-900">{currentStudent.city || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Provinsi</span>
                    <p className="font-bold text-slate-900">{currentStudent.province || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Kode Pos</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.postalCode || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Jenis Tempat Tinggal</span>
                    <p className="font-bold text-slate-900">{currentStudent.residenceType || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Alat Transportasi</span>
                    <p className="font-bold text-slate-900">{currentStudent.transportation || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. HP / WhatsApp Siswa</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.phone || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Email Siswa</span>
                    <p className="font-bold text-slate-900 truncate">{currentStudent.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 5. DATA AYAH KANDUNG */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2 tracking-wider">
                  <Users size={14} className="text-indigo-600" />
                  <span>5. Data Ayah Kandung</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Ayah Kandung</span>
                    <p className="font-bold text-slate-900">{currentStudent.fatherName || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">NIK Ayah</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.fatherNik || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tempat/Tgl Lahir</span>
                    <p className="font-bold text-slate-900">{currentStudent.fatherBirth || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pendidikan Terakhir</span>
                    <p className="font-bold text-slate-900">{currentStudent.fatherEducation || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pekerjaan Ayah</span>
                    <p className="font-bold text-slate-900">{currentStudent.fatherJob || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Penghasilan Bulanan</span>
                    <p className="font-bold text-slate-900">{currentStudent.fatherIncome || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. HP Ayah</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.fatherPhone || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status Ayah</span>
                    <p className="font-bold text-slate-900">{currentStudent.fatherStatus || 'Masih Hidup'}</p>
                  </div>
                </div>
              </div>

              {/* 6. DATA IBU KANDUNG */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2 tracking-wider">
                  <Users size={14} className="text-indigo-600" />
                  <span>6. Data Ibu Kandung</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Ibu Kandung</span>
                    <p className="font-bold text-slate-900">{currentStudent.motherName || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">NIK Ibu</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.motherNik || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tempat/Tgl Lahir</span>
                    <p className="font-bold text-slate-900">{currentStudent.motherBirth || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pendidikan Terakhir</span>
                    <p className="font-bold text-slate-900">{currentStudent.motherEducation || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pekerjaan Ibu</span>
                    <p className="font-bold text-slate-900">{currentStudent.motherJob || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Penghasilan Bulanan</span>
                    <p className="font-bold text-slate-900">{currentStudent.motherIncome || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. HP Ibu</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.motherPhone || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status Ibu</span>
                    <p className="font-bold text-slate-900">{currentStudent.motherStatus || 'Masih Hidup'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status Yatim / Piatu</span>
                    <p className="font-bold text-slate-900">{currentStudent.orphanStatus || 'Bukan Yatim/Piatu'}</p>
                  </div>
                </div>
              </div>

              {/* 7. DATA WALI SISWA */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2 tracking-wider">
                  <Users size={14} className="text-indigo-600" />
                  <span>7. Data Wali Siswa (Jika Tinggal Bersama Wali)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap Wali</span>
                    <p className="font-bold text-slate-900">{currentStudent.guardianName || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">NIK Wali</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.guardianNik || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hubungan Kekerabatan</span>
                    <p className="font-bold text-slate-900">{currentStudent.guardianRelation || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pendidikan Wali</span>
                    <p className="font-bold text-slate-900">{currentStudent.guardianEducation || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pekerjaan Wali</span>
                    <p className="font-bold text-slate-900">{currentStudent.guardianJob || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. HP Wali</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.guardianPhone || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Penghasilan Bulanan</span>
                    <p className="font-bold text-slate-900">{currentStudent.guardianIncome || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 8. BERKAS & DOKUMEN DIGITAL */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-indigo-950 flex items-center gap-2 tracking-wider">
                  <FileText size={14} className="text-indigo-600" />
                  <span>8. Berkas & Dokumen Digital Siswa</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. Kartu Keluarga (KK)</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.kkNumber || '-'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">No. KPS / KIP / PKH</span>
                    <p className="font-bold font-mono text-slate-900">{currentStudent.kipNumber || '-'}</p>
                  </div>
                  
                  {/* Digital Document Links */}
                  {[
                    { label: 'Akta Kelahiran', url: currentStudent.birthCertUrl },
                    { label: 'Kartu Keluarga (KK)', url: currentStudent.kkUrl },
                    { label: 'KTP Ayah Kandung', url: currentStudent.fatherKtpUrl },
                    { label: 'KTP Ibu Kandung', url: currentStudent.motherKtpUrl },
                    { label: 'Ijazah Terakhir', url: currentStudent.diplomaUrl },
                    { label: 'Buku Rapor Terakhir', url: currentStudent.reportCardUrl },
                    { label: 'Dokumen Tambahan', url: currentStudent.otherDocUrl },
                  ].map((doc, dIdx) => (
                    <div key={dIdx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{doc.label}</span>
                      {doc.url ? (
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <ExternalLink size={12} />
                          <span>Buka Berkas</span>
                        </a>
                      ) : (
                        <p className="text-slate-400 italic">Belum Ada</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: PENGATURAN / UPLOAD PAS FOTO SISWA */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Pas Foto Resmi Siswa</h3>
                  <p className="text-xs text-slate-500 font-medium">{currentStudent.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview Pas Foto */}
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="w-28 h-36 rounded-2xl bg-slate-100 border-2 border-indigo-200 overflow-hidden shadow-inner flex items-center justify-center">
                {studentPhotoUrl ? (
                  <img
                    src={studentPhotoUrl}
                    alt={currentStudent.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-sky-700 flex flex-col items-center justify-center text-white p-2 text-center">
                    <span className="font-black text-3xl">{currentStudent.name.charAt(0).toUpperCase()}</span>
                    <span className="text-[9px] font-bold mt-1 opacity-80">Belum Ada Foto</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Format Foto 3x4 / 4x6 Resmi Berseragam</span>
            </div>

            {/* Upload File Langsung */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 block">Opsi 1: Upload File Gambar dari Perangkat</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  handleFileUpload(e);
                  setIsPhotoModalOpen(false);
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>

            {/* Input Link URL Gambar / Google Drive */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-black text-slate-800 block">Opsi 2: Masukkan Link Google Drive / URL Gambar</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://drive.google.com/file/d/... atau https://..."
                  value={photoInputUrl}
                  onChange={(e) => setPhotoInputUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (photoInputUrl.trim()) {
                      handleUpdateStudentPhoto(photoInputUrl.trim());
                    }
                  }}
                  disabled={!photoInputUrl.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl disabled:opacity-50 transition cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>

            {/* Tombol Hapus Foto Jika Ada */}
            {studentPhotoUrl && (
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => handleUpdateStudentPhoto('')}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                >
                  Hapus Pas Foto Ini
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PRESENSI MANDIRI SISWA (QR CODE & FOTO SELFIE LOKASI) */}
      <AbsensiMandiriSiswaModal
        isOpen={isAbsensiModalOpen}
        onClose={() => setIsAbsensiModalOpen(false)}
        student={currentStudent}
        onAttendanceSuccess={() => {
          setAbsensiRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* MODAL KUIS PILIHAN GANDA & UJIAN CBT SISWA */}
      {activeQuizModalItem && (
        <KuisPilihanGandaModal
          isOpen={!!activeQuizModalItem}
          onClose={() => setActiveQuizModalItem(null)}
          tugas={activeQuizModalItem}
          student={currentStudent ? { ...currentStudent, name: currentStudent.name || currentStudent.nama || 'Siswa' } : currentStudent}
          onQuizCompleted={() => {
            // Refresh submissions and trigger reactive reload
            setDataRefreshTrigger(prev => prev + 1);
            setActiveQuizModalItem(null);
          }}
        />
      )}

      {/* MODAL EDIT BIODATA LENGKAP SISWA (AUTO-SYNC KE GOOGLE SHEET SISWA) */}
      {isEditBiodataOpen && currentStudent && (
        <EditBiodataSiswaModal
          student={currentStudent}
          isOpen={isEditBiodataOpen}
          onClose={() => setIsEditBiodataOpen(false)}
          onSaved={() => {
            setDataRefreshTrigger(prev => prev + 1);
            setIsEditBiodataOpen(false);
          }}
        />
      )}

      {/* MODAL KWITANSI PEMBAYARAN RESMI (SIAP CETAK) */}
      {selectedKwitansi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-emerald-400" />
                <span className="font-extrabold text-sm tracking-tight">Kwitansi Pembayaran Digital</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKwitansi(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer text-slate-300 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-6 overflow-y-auto space-y-5 print:p-0">
              {/* Kop Sekolah */}
              <div className="text-center pb-4 border-b-2 border-slate-800/20 space-y-1">
                <div className="flex items-center justify-center gap-2 text-indigo-700 font-black text-sm uppercase tracking-wider">
                  <Building2 size={18} />
                  <span>{settings.namaSekolah || 'ROMBEL KTCT TAMBORA'}</span>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {settings.alamatSekolah || 'Jl. Tambora No. 1, Jakarta Barat • Telp: (021) 6385-0000'}
                </p>
                <div className="inline-block mt-1 px-3 py-0.5 bg-slate-100 rounded-full text-[10px] font-black tracking-widest text-slate-700 uppercase">
                  Tanda Bukti Pembayaran Sah
                </div>
              </div>

              {/* Kwitansi Info Table */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">No. Kwitansi</span>
                  <span className="font-mono font-black text-slate-900 text-xs">{selectedKwitansi.noKwitansi}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Tanggal Bayar</span>
                  <span className="font-bold text-slate-900 text-xs">{selectedKwitansi.tanggal}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Nama Siswa</span>
                  <span className="font-bold text-slate-900 text-xs">{currentStudent.name}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Kelas / NISN</span>
                  <span className="font-bold text-slate-900 text-xs">{currentStudent.class} • {currentStudent.nisn || currentStudent.nis || '-'}</span>
                </div>
              </div>

              {/* Rincian Pos Pembayaran */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/70 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block">Pos Administrasi</span>
                <p className="font-extrabold text-sm text-emerald-950">{selectedKwitansi.namaBiaya || 'Biaya SPP / Administrasi Pendidikan'}</p>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-200/50 text-emerald-900">
                  <span>Metode: <strong>{selectedKwitansi.metode}</strong></span>
                  <span>Petugas: <strong>{selectedKwitansi.petugasKasir}</strong></span>
                </div>
              </div>

              {/* Nominal Highlight */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl text-center space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Jumlah Terbayar (Lunas)</span>
                <p className="text-2xl font-black font-mono text-white tracking-tight">
                  {fmtRupiah(selectedKwitansi.nominal)}
                </p>
                <span className="text-[10px] text-slate-300 block italic">
                  Status: Sah tercatat di kas sekolah
                </span>
              </div>

              {/* Tanda Tangan / Stempel Sah */}
              <div className="flex justify-between items-end pt-3 text-[11px] text-slate-500">
                <div className="text-center">
                  <span className="block text-[10px]">Penyetor / Siswa</span>
                  <div className="h-10" />
                  <span className="font-bold text-slate-800">{currentStudent.name}</span>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center gap-1 text-emerald-600 font-black text-[10px] border border-emerald-400 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">
                    <CheckCircle2 size={11} /> LUNAS
                  </div>
                  <span className="block text-[10px]">Kasir Keuangan</span>
                  <div className="h-6" />
                  <span className="font-bold text-slate-800">{selectedKwitansi.petugasKasir}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedKwitansi(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Printer size={13} />
                <span>Cetak Kwitansi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW FOTO BUKTI TUGAS */}
      {previewStudentPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 rounded-3xl max-w-xl w-full p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-white px-2">
              <div className="text-xs font-bold truncate">
                <span className="text-slate-400">Bukti Pengerjaan Tugas: </span>
                <span className="text-white">{previewStudentPhotoModal.title}</span>
              </div>
              <button
                onClick={() => setPreviewStudentPhotoModal(null)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
              <img
                src={previewStudentPhotoModal.url}
                alt={previewStudentPhotoModal.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between px-2 pt-1 text-xs">
              <a
                href={previewStudentPhotoModal.url}
                download="bukti_tugas_saya.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
              >
                <Download size={13} />
                <span>Unduh Foto Bukti</span>
              </a>
              <button
                onClick={() => setPreviewStudentPhotoModal(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
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
