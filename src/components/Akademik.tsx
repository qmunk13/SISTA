import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../data/db';
import { Siswa, Absensi, Kelas, Mapel, User } from '../types';
import { useSubTab } from '../utils/subTabHelper';
import Kurikulum from './Kurikulum';
import PenilaianFormatifSumatif from './akademik/PenilaianFormatifSumatif';
import CustomDropdown from './common/CustomDropdown';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  BookOpen,
  QrCode,
  Flame,
  Award,
  BookMarked,
  Printer,
  ChevronRight,
  TrendingUp,
  UserCheck,
  MapPin,
  Camera,
  AlertTriangle,
  FileText,
  Upload,
  Compass,
  Eye,
  Lock
} from 'lucide-react';

interface AkademikProps {
  user: any;
}

export default function Akademik({ user }: AkademikProps) {
  // Dynamic Role-based Subtabs for Akademik
  const allTabs = [
    { id: 'kurikulum', label: 'Dashboard Kurikulum (Kemendikdasmen)', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WALI_KELAS', 'SISWA', 'ORANG_TUA', 'WAKASEK_KURIKULUM'] },
    { id: 'dashboard', label: 'Dashboard Akademik', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WALI_KELAS', 'ORANG_TUA'] },
    { id: 'jadwal', label: 'Jadwal Rombel', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'SISWA'] },
    { id: 'data_siswa_kelas', label: 'Data Siswa Kelas', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'WALI_KELAS'] },
    { id: 'agenda', label: 'Agenda Guru', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU'] },
    { id: 'absensi_siswa', label: user.role === 'ORANG_TUA' ? 'Absensi Anak' : 'Absensi Siswa', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WALI_KELAS', 'SISWA', 'ORANG_TUA'] },
    { id: 'absensi_guru', label: 'Absensi Guru', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU'] },
    { id: 'qr_scanner', label: 'QR Scanner Portal', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WALI_KELAS'] },
    { id: 'input_nilai', label: user.role === 'ORANG_TUA' ? 'Nilai Formatif & Sumatif' : 'Penilaian Formatif & Sumatif', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'GURU', 'WALI_KELAS', 'SISWA', 'ORANG_TUA'] },
    { id: 'rapor', label: 'Rapor Akhir', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR', 'WALI_KELAS', 'SISWA'] },
    { id: 'ranking', label: 'Peringkat & Ranking', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR'] },
    { id: 'kenaikan', label: 'Kenaikan Kelas', roles: ['SUPERADMIN', 'ADMIN', 'OPERATOR'] }
  ];

  const allowedTabs = allTabs.filter(tab => tab.roles.includes(user.role));

  const [activeSubTab, setActiveSubTab] = useSubTab<string>('akademik', 'dashboard');

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(allowedTabs[0].id);
    }
  }, [user.role, activeSubTab]);

  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<any[]>([]);
  const [semesterList, setSemesterList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<Mapel[]>([]);

  // Selection states
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Active Days Dynamic Driver
  const [activeDaysList, setActiveDaysList] = useState<string[]>(() => {
    const saved = localStorage.getItem('ERP_active_days');
    return saved ? JSON.parse(saved) : ['Minggu'];
  });

  const getIndonesianDayName = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const date = new Date(dateStr);
    const dayIndex = date.getDay();
    return days[dayIndex];
  };

  const selectedDayName = getIndonesianDayName(selectedDate);
  const isSelectedDateActive = activeDaysList.includes(selectedDayName);

  // Sync active days when subtab changes
  useEffect(() => {
    const saved = localStorage.getItem('ERP_active_days');
    if (saved) {
      try {
        setActiveDaysList(JSON.parse(saved));
      } catch (e) {}
    }
  }, [activeSubTab]);

  // Input Nilai State
  const [selectedMapel, setSelectedMapel] = useState('MP001');
  const [nilaiSiswa, setNilaiSiswa] = useState<any>({});

  // Agenda State
  const [agendaMateri, setAgendaMateri] = useState('');
  const [agendaKelas, setAgendaKelas] = useState('12-A');
  const [agendaList, setAgendaList] = useState<any[]>([
    { tanggal: '2026-07-10', kelas: '12-A', mapel: 'Fisika Peminatan', materi: 'Gelombang Elektromagnetik & Optik', status: 'Selesai' },
    { tanggal: '2026-07-09', kelas: '12-A', mapel: 'Matematika Wajib', materi: 'Turunan Fungsi Aljabar Trigonometri', status: 'Selesai' }
  ]);

  // Geolocation & Geofencing / Leave verification States
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number, longitude: number, isLoaded: boolean, isSimulated: boolean } | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'Izin' | 'Sakit'>('Izin');
  const [leavePhoto, setLeavePhoto] = useState<string>('');
  const [activePhotoPreview, setActivePhotoPreview] = useState<string>('');

  // States for Grade Promotion (Kenaikan Kelas)
  const [promSourceKelas, setPromSourceKelas] = useState('');
  const [promDecisions, setPromDecisions] = useState<Record<string, { status: 'NAIK' | 'TINGGAL' | 'KELUAR' | 'PINDAH' | 'LULUS' | 'LANJUT'; targetKelasId: string }>>({});
  const [bypassJulyCheck, setBypassJulyCheck] = useState(false);

  // States for Class Placement (Penempatan Kelas)
  const [placeStatusFilter, setPlaceStatusFilter] = useState<'BELUM' | 'SUDAH' | 'SEMUA'>('BELUM');
  const [placeTahunMasuk, setPlaceTahunMasuk] = useState('2023'); // Default to 2023 as requested to work on 2023 first
  const [placeTahunAjaran, setPlaceTahunAjaran] = useState(() => localStorage.getItem('ERP_academic_year') || '2026/2027');
  const [placeSearch, setPlaceSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [massTargetKelas, setMassTargetKelas] = useState('');
  const [individualTargets, setIndividualTargets] = useState<Record<string, string>>({});

  // Siswa Kelas Filter States
  const [skTahunAjaran, setSkTahunAjaran] = useState('');
  const [skStatus, setSkStatus] = useState('');
  const [skKelas, setSkKelas] = useState('');
  const [skSearchQuery, setSkSearchQuery] = useState('');
  const [skSemester, setSkSemester] = useState('SEMUA');

  // Copy-Paste Smart Import States
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [expandedSiswaHistory, setExpandedSiswaHistory] = useState<string | null>(null);

  const getNextLogicalClassId = (classId: string): string => {
    const standardId = classId.toUpperCase();
    if (standardId === 'A4') return 'A5';
    if (standardId === 'A5') return 'A6';
    if (standardId === 'A6') return 'B7';
    if (standardId === 'B7') return 'B8';
    if (standardId === 'B8') return 'B9';
    if (standardId === 'B9') return 'C10';
    if (standardId === 'C10') return 'C11';
    if (standardId === 'C11') return 'C12';
    return 'Z';
  };

  const getResolvedSiswaKelasId = (sKelasId: string): string => {
    const match = kelasList.find(k => k.id === sKelasId || k.nama === sKelasId);
    return match ? match.id : sKelasId;
  };

  const handlePurgeAllClassData = () => {
    Swal.fire({
      title: 'Pilih Metode Pembersihan',
      text: 'Pilih apakah Anda ingin menghapus seluruh biodata siswa (Master) atau hanya mengosongkan penempatan kelas saja:',
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: '#ef4444',
      denyButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      confirmButtonText: '💥 HAPUS TOTAL (Semua Siswa & Kelas)',
      denyButtonText: '🧹 Bersihkan Kelas Saja (Master Siswa Utuh)',
      cancelButtonText: 'Batal'
    }).then((result: any) => {
      if (result.isConfirmed) {
        // Complete Purge: Delete all students (empty database)
        db.set('siswa', []);
        setSiswaList([]);
        localStorage.setItem('ERP_siswa_purged_all', 'true');
        
        // Clear dependent logs
        db.set('absensi', []);
        db.set('tabungan', []);
        db.set('tagihan', []);
        db.set('pembayaran', []);
        db.set('log_ujian', []);
        db.set('hasil_ujian', []);
        db.set('hasil_tugas', []);
        
        Swal.fire(
          'Dihapus Total!',
          'Seluruh data Master Siswa dan riwayat akademis telah dihapus dari sistem. Database kini kosong 100%.',
          'success'
        );
      } else if (result.isDenied) {
        // Purge class assignment only, keep student profiles
        const rawSiswa = db.get<Siswa>('siswa');
        const clearedSiswa = rawSiswa.map(s => ({
          ...s,
          kelasId: '',
          tahunAjaran: '',
          riwayatAkademis: [],
          classHistory: {}
        }));
        
        db.set('siswa', clearedSiswa);
        setSiswaList(clearedSiswa);
        localStorage.setItem('ERP_siswa_purged_all', 'true');
        
        // Also clear dependent transactional logs to maintain system state integrity
        db.set('absensi', []);
        db.set('tabungan', []);
        db.set('tagihan', []);
        db.set('pembayaran', []);
        
        Swal.fire(
          'Dibersihkan!',
          'Seluruh penempatan kelas dan riwayat kenaikan kelas telah dihapus, Master Siswa tetap dipertahankan.',
          'success'
        );
      }
    });
  };

  useEffect(() => {
    if (kelasList.length > 0 && !promSourceKelas) {
      setPromSourceKelas(kelasList[0].id);
    }
  }, [kelasList]);

  useEffect(() => {
    if (promSourceKelas && siswaList.length > 0) {
      const sourceSiswa = siswaList.filter(s => getResolvedSiswaKelasId(s.kelasId) === promSourceKelas && (s.status === 'AKTIF' || s.status === 'BELUM'));
      const initialDecisions: Record<string, { status: 'NAIK' | 'TINGGAL' | 'KELUAR' | 'PINDAH' | 'LULUS' | 'LANJUT'; targetKelasId: string }> = {};

      const isGrade12 = promSourceKelas === 'C12' || (String(kelasList.find(k => k.id === promSourceKelas)?.nama || '').includes('12'));
      const defaultStatus = isGrade12 ? 'LULUS' : 'NAIK';
      const defaultTargetId = getNextLogicalClassId(promSourceKelas);

      sourceSiswa.forEach(s => {
        initialDecisions[s.id] = {
          status: defaultStatus,
          targetKelasId: defaultTargetId
        };
      });
      setPromDecisions(initialDecisions);
    }
  }, [promSourceKelas, siswaList, kelasList]);

  useEffect(() => {
    const loadAcademicData = () => {
      setKelasList(db.get<Kelas>('kelas'));
      setSiswaList(db.get<Siswa>('siswa'));
      setAbsensiList(db.get<Absensi>('absensi'));
      setTahunAjaranList(db.get<any>('tahun_ajaran') || []);
      setSemesterList(db.get<any>('semester') || []);
      const mps = db.get<Mapel>('mapel') || [];
      setMapelList(mps);
      if (mps.length > 0 && !selectedMapel) {
        setSelectedMapel(mps[0].id);
      }
    };

    loadAcademicData();
    window.addEventListener('erp-db-synced', loadAcademicData);
    return () => window.removeEventListener('erp-db-synced', loadAcademicData);
  }, []);

  useEffect(() => {
    if (kelasList.length > 0 && siswaList.length > 0) {
      if (user.role === 'SISWA') {
        const studentUser = siswaList.find(s => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name);
        if (studentUser && studentUser.kelasId) {
          setSelectedKelas(studentUser.kelasId);
        } else if (!selectedKelas) {
          setSelectedKelas(kelasList[0].id);
        }
      } else if ((user.role === 'WALI_KELAS' || user.role === 'GURU') && user.kelasId) {
        setSelectedKelas(user.kelasId);
      } else if (!selectedKelas) {
        setSelectedKelas(kelasList[0].id);
      }
    }
  }, [kelasList, siswaList, user, selectedKelas]);

  // Dynamic filtered subjects based on selected class
  const getFilteredMapel = () => {
    if (!selectedKelas || selectedKelas === 'all') {
      return mapelList;
    }
    const clsObj = kelasList.find(k => k.id === selectedKelas);
    if (!clsObj) return mapelList;
    return mapelList.filter(m => !m.kelas || m.kelas === clsObj.nama || m.kelas === clsObj.id);
  };

  // Auto-align selected subject when class filter changes
  useEffect(() => {
    if (selectedKelas && mapelList.length > 0) {
      const allowed = getFilteredMapel();
      if (selectedMapel !== 'all' && !allowed.some(m => m.id === selectedMapel)) {
        if (allowed.length > 0) {
          setSelectedMapel(allowed[0].id);
        } else {
          setSelectedMapel('all');
        }
      }
    }
  }, [selectedKelas, mapelList]);

  // Initializing mock grades
  useEffect(() => {
    if (siswaList.length > 0) {
      const initial: any = {};
      siswaList.forEach(s => {
        initial[s.id] = {
          tugas: Math.floor(75 + Math.random() * 20),
          uts: Math.floor(70 + Math.random() * 25),
          uas: Math.floor(72 + Math.random() * 23)
        };
      });
      setNilaiSiswa(initial);
    }
  }, [siswaList]);

  const loadAbsensiData = () => {
    setAbsensiList(db.get<Absensi>('absensi'));
  };

  const filteredSiswa = siswaList.filter(s => {
    const matchesKelas = selectedKelas === 'all' || !selectedKelas || s.kelasId === selectedKelas;
    return matchesKelas && s.status === 'AKTIF';
  });
  
  const getSiswaClassForYear = (s: Siswa, targetYear: string): string => {
    if (s.classHistory?.[targetYear]) {
      return s.classHistory[targetYear];
    }
    const currentActiveYear = localStorage.getItem('ERP_academic_year') || '2026/2027';
    if (!targetYear) {
      if (s.classHistory?.[currentActiveYear]) {
        return s.classHistory[currentActiveYear];
      }
      return s.kelasId;
    }
    if (s.tahunAjaran === targetYear || targetYear === currentActiveYear) {
      return s.kelasId;
    }
    const parts = currentActiveYear.split('/');
    let prevYear = '2025/2026';
    if (parts.length === 2) {
      const yr1 = parseInt(parts[0], 10);
      const yr2 = parseInt(parts[1], 10);
      if (!isNaN(yr1) && !isNaN(yr2)) {
        prevYear = `${yr1 - 1}/${yr2 - 1}`;
      }
    }
    if (targetYear === prevYear && s.tahunAjaran === prevYear) {
      return s.kelasId;
    }
    return '';
  };

  const filteredSiswaKelas = siswaList.filter(s => {
    const isWaliOrGuru = (user.role === 'WALI_KELAS' || user.role === 'GURU') && user.kelasId;
    
    // Dynamic Class ID based on selected year using Smart Logic
    const activeClassId = getSiswaClassForYear(s, skTahunAjaran);

    // Find class object by either ID or Name to resolve horizontal Excel imports or legacy keys
    const activeClassObj = kelasList.find(k => k.id === activeClassId || k.nama === activeClassId || k.id === s.kelasId || k.nama === s.kelas);
    const resolvedClassId = activeClassObj ? activeClassObj.id : (activeClassId || s.kelasId);

    // Normalize student status
    const getNormStatus = (stRaw?: string) => {
      if (!stRaw) return 'AKTIF';
      const st = stRaw.toUpperCase().trim();
      if (st === 'AKTIF' || st.includes('DAPODIK AKTIF') || st.includes('BELAJAR AKTIF')) return 'AKTIF';
      if (st === 'TIDAK AKTIF' || st === 'NONAKTIF' || st === 'NON AKTIF' || st.includes('BELAJAR NONAKTIF')) return 'TIDAK AKTIF';
      if (st === 'BELUM' || st.includes('DAPODIK NONAKTIF')) return 'BELUM';
      return st;
    };

    const normSt = getNormStatus(s.status);
    if (!['AKTIF', 'TIDAK AKTIF', 'BELUM'].includes(normSt)) {
      return false;
    }

    if (isWaliOrGuru && resolvedClassId !== user.kelasId) {
      return false;
    }
    
    const q = skSearchQuery.toLowerCase();
    const matchesSearch = q 
      ? (s.nama.toLowerCase().includes(q) || (s.nisn || '').includes(q) || (s.noPdkt || s.id || '').toLowerCase().includes(q))
      : true;
      
    const matchesStatus = skStatus 
      ? (normSt === skStatus.toUpperCase().trim()) 
      : true;
      
    const matchesKelas = skKelas 
      ? (resolvedClassId === skKelas || s.kelasId === skKelas || s.kelas === skKelas) 
      : true;
      
    return matchesSearch && matchesStatus && matchesKelas;
  });

  const sortedSiswaKelas = [...filteredSiswaKelas].sort((a, b) => {
    const taA = a.tahunAjaran || '';
    const taB = b.tahunAjaran || '';
    return taB.localeCompare(taA);
  });

  const handleEditSiswa = (siswa: Siswa) => {
    const classOptions = kelasList.map(k => `<option value="${k.id}" ${k.id === siswa.kelasId ? 'selected' : ''}>Kelas ${k.nama}</option>`).join('');
    const statusOptions = ['AKTIF', 'TIDAK AKTIF', 'BELUM', 'PINDAH', 'KELUAR', 'LULUS'].map(s => `<option value="${s}" ${s === siswa.status ? 'selected' : ''}>${s}</option>`).join('');
    
    Swal.fire({
      title: 'Edit Data Akademik Siswa',
      html: `
        <div class="text-left space-y-4 font-sans text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
            <input id="swal-nama" type="text" value="${siswa.nama}" class="w-full border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold bg-white">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Kelas / Rombel</label>
            <select id="swal-kelas" class="w-full border border-slate-300 rounded p-2 bg-white text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Pilih Kelas</option>
              ${classOptions}
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Status</label>
            <select id="swal-status" class="w-full border border-slate-300 rounded p-2 bg-white text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500">
              ${statusOptions}
            </select>
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Tahun Ajaran</label>
            <input id="swal-ta" type="text" value="${siswa.tahunAjaran || localStorage.getItem('ERP_academic_year') || '2026/2027'}" class="w-full border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold bg-white">
          </div>
          <div>
            <label class="block font-bold text-slate-700 mb-1">Keterangan</label>
            <input id="swal-keterangan" type="text" value="${siswa.keterangan || ''}" class="w-full border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold bg-white" placeholder="contoh: Naik Kelas, Aktif Belajar">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan Perubahan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#4f46e5',
      focusConfirm: false,
      preConfirm: () => {
        const nama = (document.getElementById('swal-nama') as HTMLInputElement).value;
        const kelasId = (document.getElementById('swal-kelas') as HTMLSelectElement).value;
        const status = (document.getElementById('swal-status') as HTMLSelectElement).value as any;
        const tahunAjaran = (document.getElementById('swal-ta') as HTMLInputElement).value;
        const keterangan = (document.getElementById('swal-keterangan') as HTMLInputElement).value;

        if (!nama.trim()) {
          Swal.showValidationMessage('Nama Lengkap tidak boleh kosong');
          return false;
        }

        return { nama, kelasId, status, tahunAjaran, keterangan };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { nama, kelasId, status, tahunAjaran, keterangan } = result.value;
        const updated = siswaList.map(s => {
          if (s.id === siswa.id) {
            let updatedClassHistory = s.classHistory ? { ...s.classHistory } : {};
            if (tahunAjaran) {
              updatedClassHistory[tahunAjaran] = kelasId;
            }

            let updatedRiwayat = s.riwayatAkademis ? [...s.riwayatAkademis] : [];
            if (tahunAjaran) {
              const rIdx = updatedRiwayat.findIndex(r => r.tahunAjaran === tahunAjaran);
              if (rIdx !== -1) {
                updatedRiwayat[rIdx] = {
                  ...updatedRiwayat[rIdx],
                  kelasId,
                  status,
                  keterangan
                };
              } else {
                updatedRiwayat.push({
                  tahunAjaran,
                  kelasId,
                  status,
                  keterangan
                });
              }
            }

            const matchedK = kelasList.find(k => k.id === kelasId || k.nama === kelasId);
            const kelasNama = matchedK ? (matchedK.nama ? `Kelas ${matchedK.nama.replace(/^Kelas\s+/i, '')}` : kelasId) : kelasId;

            return {
              ...s,
              nama,
              kelasId,
              kelas: kelasNama,
              kelasSaatIni: kelasNama,
              status,
              tahunAjaran,
              keterangan,
              classHistory: updatedClassHistory,
              riwayatAkademis: updatedRiwayat
            };
          }
          return s;
        });

        db.set('siswa', updated);
        setSiswaList(updated);
        window.dispatchEvent(new CustomEvent('erp-db-synced'));
        window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'siswa', val: updated } }));
        Swal.fire({
          title: 'Berhasil',
          text: 'Data akademik siswa berhasil diperbarui.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleParseMultiYearPaste = () => {
    if (!importRawText.trim()) {
      Swal.fire('Format Kosong', 'Silakan tempel (paste) data dari Excel / Spreadsheet Anda terlebih dahulu.', 'warning');
      return;
    }

    const lines = importRawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) {
      Swal.fire('Format Kosong', 'Tidak ada data baris yang terdeteksi.', 'warning');
      return;
    }

    // Parse delimiter (tab-separated is standard for spreadsheet copy-paste)
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');
    
    // Check if the first line is header
    let hasHeader = false;
    const firstLineCols = firstLine.split(delimiter).map(c => c.trim().toLowerCase());
    if (
      firstLineCols.some(c => c.includes('pdkt') || c.includes('id') || c.includes('nama') || c.includes('nisn') || c.includes('kelas') || c.includes('ajaran') || c.includes('masuk') || c.includes('status'))
    ) {
      hasHeader = true;
    }

    const headers = hasHeader ? firstLine.split(delimiter).map(h => h.trim().toLowerCase()) : [];
    
    // Check if any header column has format like "2023/2024" or represents a year range
    const yearHeaders = firstLineCols.filter((col: string) => /^\d{4}\/\d{4}$/.test(col));

    let finalParsed: any[] = [];
    let parsedRowsCount = 0;

    if (yearHeaders.length > 0) {
      // MODE 1: Horizontal Column-based Year Transition (New)
      const idxStatus = firstLineCols.findIndex(c => c === 'status');
      const idxPdkt = firstLineCols.findIndex(c => c.includes('pdkt') || c === 'no pdkt' || c === 'no. pdkt');
      const idxNama = firstLineCols.findIndex(c => c.includes('nama') || c.includes('lengkap'));
      const idxTahunMasuk = firstLineCols.findIndex(c => c.includes('masuk') || c.includes('tahun masuk'));

      const fallbackStatus = idxStatus !== -1 ? idxStatus : 0;
      const fallbackTahunMasuk = idxTahunMasuk !== -1 ? idxTahunMasuk : 1;
      const fallbackPdkt = idxPdkt !== -1 ? idxPdkt : 2;
      const fallbackNama = idxNama !== -1 ? idxNama : 3;

      const rows = lines.slice(1);
      parsedRowsCount = rows.length;

      const isSpecialKeyword = (val: string) => {
        const u = val.toUpperCase().trim();
        return u === 'KELUAR' || u === 'PINDAH' || u === 'LULUS' || u === 'TIDAK AKTIF' || u === 'TIDAK_AKTIF' || u === 'BELUM';
      };

      const getSpecialStatus = (val: string): 'AKTIF' | 'TIDAK AKTIF' | 'LULUS' | 'PINDAH' | 'BELUM' => {
        const u = val.toUpperCase().trim();
        if (u === 'KELUAR') return 'TIDAK AKTIF';
        if (u === 'PINDAH') return 'PINDAH';
        if (u === 'LULUS') return 'LULUS';
        if (u === 'TIDAK AKTIF' || u === 'TIDAK_AKTIF') return 'TIDAK AKTIF';
        if (u === 'BELUM') return 'BELUM';
        return 'AKTIF';
      };

      const getSpecialKeterangan = (val: string): string => {
        const u = val.toUpperCase().trim();
        if (u === 'KELUAR') return 'Keluar';
        if (u === 'PINDAH') return 'Pindah';
        if (u === 'LULUS') return 'Lulus';
        if (u === 'BELUM') return 'Belum Aktif';
        return 'Aktif';
      };

      rows.forEach((row) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 3) return; // skip incomplete rows

        const rawStatusInput = cols[fallbackStatus] || 'AKTIF';
        const rawStatus = ['AKTIF', 'TIDAK AKTIF', 'BELUM', 'PINDAH', 'LULUS', 'KELUAR'].includes(rawStatusInput.toUpperCase()) 
          ? (rawStatusInput.toUpperCase() as any) 
          : (rawStatusInput.toUpperCase().includes('TIDAK') ? 'TIDAK AKTIF' : 'AKTIF');

        const rawPdkt = cols[fallbackPdkt] || `PDKT-${Math.floor(1000 + Math.random() * 9000)}`;
        const rawNama = cols[fallbackNama] || 'Siswa Tanpa Nama';
        const rawTahunMasuk = cols[fallbackTahunMasuk] || '2023';

        // Extract year-by-year entries that are present
        const yearEntries: { tahunAjaran: string; kelasId: string }[] = [];
        yearHeaders.forEach(yearHeader => {
          const yearColIdx = firstLineCols.indexOf(yearHeader);
          if (yearColIdx !== -1 && cols[yearColIdx] !== undefined && cols[yearColIdx] !== '') {
            yearEntries.push({
              tahunAjaran: yearHeader.toUpperCase(), // keep uppercase
              kelasId: cols[yearColIdx]
            });
          }
        });

        if (yearEntries.length === 0) return;

        // Apply transition logic
        const historyList = yearEntries.map((curr, idx) => {
          const next = yearEntries[idx + 1];
          const prev = yearEntries[idx - 1];

          let computedStatus: 'AKTIF' | 'TIDAK AKTIF' | 'LULUS' | 'PINDAH' | 'BELUM' = 'AKTIF';
          let computedKeterangan = 'Aktif Belajar';

          if (isSpecialKeyword(curr.kelasId)) {
            computedStatus = getSpecialStatus(curr.kelasId);
            computedKeterangan = getSpecialKeterangan(curr.kelasId);
          } else {
            // It is a class grade like 4, 5, 6...
            if (next) {
              if (isSpecialKeyword(next.kelasId)) {
                computedStatus = 'AKTIF';
                computedKeterangan = getSpecialKeterangan(next.kelasId);
              } else {
                const classNumCurr = parseInt(curr.kelasId.replace(/[^0-9]/g, '')) || 0;
                const classNumNext = parseInt(next.kelasId.replace(/[^0-9]/g, '')) || 0;

                if (classNumNext > classNumCurr) {
                  computedStatus = 'AKTIF';
                  computedKeterangan = 'Naik Kelas';
                } else if (classNumNext === classNumCurr && classNumCurr > 0) {
                  computedStatus = 'TIDAK AKTIF';
                  computedKeterangan = 'Tidak Lulus';
                } else {
                  computedStatus = 'AKTIF';
                  computedKeterangan = 'Naik Kelas';
                }
              }
            } else {
              // This is the latest year
              computedStatus = rawStatus;
              if (rawStatus === 'TIDAK AKTIF') {
                if (prev && !isSpecialKeyword(prev.kelasId) && prev.kelasId === curr.kelasId) {
                  computedKeterangan = 'Mengulang';
                } else {
                  computedKeterangan = 'Tidak Lulus';
                }
              } else if (rawStatus === 'BELUM') {
                if (prev && !isSpecialKeyword(prev.kelasId) && prev.kelasId === curr.kelasId) {
                  computedKeterangan = 'Mengulang';
                } else {
                  computedKeterangan = 'Belum Aktif';
                }
              } else if (rawStatus === 'LULUS') {
                computedKeterangan = 'Lulus';
              } else if (rawStatus === 'PINDAH') {
                computedKeterangan = 'Pindah';
              } else {
                computedKeterangan = 'Aktif Belajar';
              }
            }
          }

          return {
            tahunAjaran: curr.tahunAjaran,
            kelasId: curr.kelasId,
            status: computedStatus,
            keterangan: computedKeterangan
          };
        });

        // The latest entry is the current one
        const latestEntry = historyList[historyList.length - 1];

        finalParsed.push({
          noPdkt: rawPdkt,
          nisn: `99999${Math.floor(10000 + Math.random() * 90000)}`,
          nama: rawNama,
          jk: 'L',
          kelasId: latestEntry.kelasId,
          tahunAjaran: latestEntry.tahunAjaran,
          status: latestEntry.status,
          keterangan: latestEntry.keterangan,
          riwayatAkademis: historyList,
          classHistory: yearEntries.reduce((acc, g) => {
            acc[g.tahunAjaran] = g.kelasId;
            return acc;
          }, {} as Record<string, string>)
        });
      });
    } else {
      // MODE 2: Vertical Row-by-Row Year Transition (Old)
      // Auto map column indices
      const colMap = {
        noPdkt: hasHeader ? headers.findIndex(h => h.includes('pdkt') || h.includes('id') || h.includes('no. pdkt') || h.includes('no_pdkt')) : 0,
        nisn: hasHeader ? headers.findIndex(h => h.includes('nisn')) : 1,
        nama: hasHeader ? headers.findIndex(h => h.includes('nama') || h.includes('lengkap')) : 2,
        jk: hasHeader ? headers.findIndex(h => h.includes('kelamin') || h.includes('jk') || h.includes('sex') || h.includes('gender')) : 3,
        kelasId: hasHeader ? headers.findIndex(h => h.includes('kelas') || h.includes('rombel') || h.includes('id_kelas')) : 4,
        tahunAjaran: hasHeader ? headers.findIndex(h => h.includes('tahun ajaran') || h.includes('thn ajaran') || h.includes('tahun_ajaran') || h.includes('ajaran')) : 5,
        status: hasHeader ? headers.findIndex(h => h.includes('status')) : 6,
        keterangan: hasHeader ? headers.findIndex(h => h.includes('keterangan') || h.includes('ket') || h.includes('alasan') || h.includes('note') || h.includes('catatan')) : 7,
      };

      // If headers are missing, use fallbacks
      if (!hasHeader) {
        colMap.noPdkt = 0;
        colMap.nisn = 1;
        colMap.nama = 2;
        colMap.jk = 3;
        colMap.kelasId = 4;
        colMap.tahunAjaran = 5;
        colMap.status = 6;
        colMap.keterangan = 7;
      } else {
        // Ensure key columns are mapped or set defaults
        if (colMap.noPdkt === -1) colMap.noPdkt = 0;
        if (colMap.nama === -1) colMap.nama = headers.findIndex(h => h.includes('nama')) !== -1 ? headers.findIndex(h => h.includes('nama')) : 2;
        if (colMap.kelasId === -1) colMap.kelasId = headers.findIndex(h => h.includes('kelas')) !== -1 ? headers.findIndex(h => h.includes('kelas')) : 4;
        if (colMap.tahunAjaran === -1) colMap.tahunAjaran = headers.findIndex(h => h.includes('ajaran')) !== -1 ? headers.findIndex(h => h.includes('ajaran')) : 5;
      }

      const rows = lines.slice(hasHeader ? 1 : 0);
      parsedRowsCount = rows.length;
      const parsedRows: any[] = [];

      rows.forEach((row) => {
        const cols = row.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length < 2) return; // skip empty or incomplete lines

        const rawPdkt = cols[colMap.noPdkt] || `PDKT-${Math.floor(1000 + Math.random() * 9000)}`;
        const rawNisn = colMap.nisn !== -1 ? (cols[colMap.nisn] || '') : '';
        const rawNama = cols[colMap.nama] || 'Siswa Tanpa Nama';
        const rawJkInput = colMap.jk !== -1 ? (cols[colMap.jk] || 'L') : 'L';
        const rawJk = (rawJkInput.toUpperCase().startsWith('P') || rawJkInput.toLowerCase().includes('wanita') || rawJkInput.toLowerCase().includes('perempuan')) ? 'P' : 'L';
        const rawKelas = cols[colMap.kelasId] || '';
        const rawTahunAjaran = cols[colMap.tahunAjaran] || localStorage.getItem('ERP_academic_year') || '2026/2027';
        const rawStatusInput = colMap.status !== -1 ? (cols[colMap.status] || 'AKTIF') : 'AKTIF';
        const rawStatus = ['AKTIF', 'TIDAK AKTIF', 'BELUM', 'PINDAH', 'LULUS', 'KELUAR'].includes(rawStatusInput.toUpperCase()) 
          ? (rawStatusInput.toUpperCase() as any) 
          : (rawStatusInput.toUpperCase().includes('TIDAK') ? 'TIDAK AKTIF' : 'AKTIF');
        const rawKeterangan = colMap.keterangan !== -1 ? (cols[colMap.keterangan] || '') : '';

        parsedRows.push({
          noPdkt: rawPdkt,
          nisn: rawNisn,
          nama: rawNama,
          jk: rawJk,
          kelasId: rawKelas,
          tahunAjaran: rawTahunAjaran,
          status: rawStatus,
          keterangan: rawKeterangan
        });
      });

      // Group by No. PDKT to analyze multi-year transitions
      const studentGroups: Record<string, any[]> = {};
      parsedRows.forEach(row => {
        const key = row.noPdkt;
        if (!studentGroups[key]) {
          studentGroups[key] = [];
        }
        studentGroups[key].push(row);
      });

      Object.keys(studentGroups).forEach(noPdkt => {
        const group = studentGroups[noPdkt];

        // Sort history entries by Tahun Ajaran ascending
        group.sort((a, b) => {
          const yearA = parseInt(a.tahunAjaran.split('/')[0]) || 0;
          const yearB = parseInt(b.tahunAjaran.split('/')[0]) || 0;
          return yearA - yearB;
        });

        // Apply smart transition logic
        for (let i = 0; i < group.length; i++) {
          const curr = group[i];
          const next = group[i + 1];

          if (!curr.keterangan) {
            const classNumCurr = parseInt(curr.kelasId.replace(/[^0-9]/g, '')) || 0;
            
            if (curr.status === 'TIDAK AKTIF' || curr.status === 'TIDAK_AKTIF') {
              if (next && (next.status === 'TIDAK AKTIF' || next.status === 'AKTIF') && next.kelasId === curr.kelasId) {
                curr.keterangan = 'Tidak Lulus';
              } else {
                curr.keterangan = 'Mengulang';
              }
            } else if (curr.status === 'PINDAH') {
              curr.keterangan = 'Pindah';
            } else if (curr.status === 'KELUAR') {
              curr.keterangan = 'Keluar';
            } else if (curr.status === 'LULUS') {
              curr.keterangan = 'Lulus';
            } else {
              // Status is ACTIVE
              if (next) {
                const classNumNext = parseInt(next.kelasId.replace(/[^0-9]/g, '')) || 0;
                if (classNumNext > classNumCurr) {
                  curr.keterangan = 'Naik Kelas';
                } else if (classNumNext === classNumCurr && classNumCurr > 0) {
                  curr.keterangan = 'Mengulang';
                } else {
                  curr.keterangan = 'Naik Kelas';
                }
              } else {
                // Latest entry in active status
                curr.keterangan = 'Aktif Belajar';
              }
            }
          }
        }

        // If the latest status is TIDAK AKTIF and has previous "Tidak Lulus" in same grade
        for (let i = 1; i < group.length; i++) {
          const curr = group[i];
          const prev = group[i - 1];
          if (curr.status === 'TIDAK AKTIF' && !curr.keterangan) {
            if (prev.keterangan === 'Tidak Lulus' && prev.kelasId === curr.kelasId) {
              curr.keterangan = 'Mengulang';
            } else {
              curr.keterangan = 'Tidak Lulus';
            }
          }
        }

        // Final fallback for latest entry if still empty
        const latest = group[group.length - 1];
        if (!latest.keterangan) {
          if (latest.status === 'LULUS') latest.keterangan = 'Lulus';
          else if (latest.status === 'KELUAR') latest.keterangan = 'Keluar';
          else if (latest.status === 'PINDAH') latest.keterangan = 'Pindah';
          else if (latest.status === 'TIDAK AKTIF') {
            const prev = group[group.length - 2];
            if (prev && prev.kelasId === latest.kelasId && (prev.status === 'TIDAK AKTIF' || prev.keterangan === 'Tidak Lulus')) {
              latest.keterangan = 'Mengulang';
            } else {
              latest.keterangan = 'Tidak Lulus';
            }
          } else {
            latest.keterangan = 'Aktif Belajar';
          }
        }

        const historyList = group.map(g => ({
          tahunAjaran: g.tahunAjaran,
          kelasId: g.kelasId,
          status: g.status,
          keterangan: g.keterangan
        }));

        finalParsed.push({
          noPdkt: noPdkt,
          nisn: latest.nisn || `99999${Math.floor(10000 + Math.random() * 90000)}`,
          nama: latest.nama,
          jk: latest.jk,
          kelasId: latest.kelasId,
          tahunAjaran: latest.tahunAjaran,
          status: latest.status,
          keterangan: latest.keterangan,
          riwayatAkademis: historyList,
          classHistory: group.reduce((acc, g) => {
            acc[g.tahunAjaran] = g.kelasId;
            return acc;
          }, {} as Record<string, string>)
        });
      });
    }

    setParsedImportRows(finalParsed);
    Swal.fire({
      icon: 'success',
      title: 'Analisis Selesai',
      text: `Sistem berhasil menganalisis ${finalParsed.length} siswa dengan total ${parsedRowsCount} baris data transisi kelas. Silakan tinjau dan simpan data.`,
      confirmButtonText: 'Tinjau Sekarang'
    });
  };

  const handleApplySmartImport = () => {
    if (parsedImportRows.length === 0) {
      Swal.fire('Tinjauan Kosong', 'Lakukan analisis data terlebih dahulu.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Terapkan Riwayat Akademis?',
      text: `Ini akan memperbarui data kelas, status, keterangan, dan riwayat multi-tahun ajaran untuk ${parsedImportRows.length} siswa terpilih secara otomatis.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Terapkan!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb'
    }).then((result: any) => {
      if (result.isConfirmed) {
        // Merge or replace students in existing list
        const updatedSiswa = [...siswaList];

        parsedImportRows.forEach(row => {
          const index = updatedSiswa.findIndex(s => s.noPdkt === row.noPdkt || s.id === `SIS_${row.noPdkt}`);
          
          if (index !== -1) {
            // Update existing student with latest details & history
            updatedSiswa[index] = {
              ...updatedSiswa[index],
              kelasId: row.kelasId,
              tahunAjaran: row.tahunAjaran,
              status: row.status,
              keterangan: row.keterangan,
              riwayatAkademis: row.riwayatAkademis,
              classHistory: {
                ...(updatedSiswa[index].classHistory || {}),
                ...(row.classHistory || {})
              }
            };
          } else {
            // Add new student
            updatedSiswa.push({
              id: `SIS_${row.noPdkt.replace(/[^A-Za-z0-9_-]/g, '')}`,
              noPdkt: row.noPdkt,
              nis: row.noPdkt,
              nisn: row.nisn,
              nama: row.nama,
              jk: row.jk,
              kelasId: row.kelasId,
              tahunAjaran: row.tahunAjaran,
              status: row.status,
              keterangan: row.keterangan,
              riwayatAkademis: row.riwayatAkademis,
              classHistory: row.classHistory,
              tglLahir: '2012-01-01',
              noKk: '',
              noHp: '',
              alamat: ''
            });
          }
        });

        // Save back to db
        db.set('siswa', updatedSiswa);
        setSiswaList(updatedSiswa);
        
        // Log activity
        const logs = db.get<any>('logs') || [];
        logs.unshift({
          id: `LOG_${Date.now()}`,
          user: user.name,
          role: user.role,
          aksi: `Impor massal data transisi kelas multi-tahun ajaran (${parsedImportRows.length} siswa)`,
          waktu: new Date().toLocaleTimeString('id-ID'),
          tanggal: new Date().toLocaleDateString('id-ID'),
          status: 'SUCCESS'
        });
        db.set('logs', logs);

        // Reset state
        setParsedImportRows([]);
        setImportRawText('');
        setShowSmartImport(false);

        Swal.fire('Impor Berhasil', `Data transisi akademik multi-tahun siswa berhasil diintegrasikan dengan mulus ke dalam database.`, 'success');
      }
    });
  };

  const getAbsensiStatus = (siswaId: string): Absensi['status'] => {
    const matched = absensiList.find(a => a.siswaId === siswaId && a.tanggal === selectedDate);
    return matched ? matched.status : 'Belum Absen';
  };

  const getAbsensiRecord = (siswaId: string): Absensi | undefined => {
    return absensiList.find(a => a.siswaId === siswaId && a.tanggal === selectedDate);
  };

  const handleSetAbsensi = (
    siswaId: string, 
    status: Absensi['status'], 
    additional?: { 
      latitude?: number; 
      longitude?: number; 
      jarakSekolah?: number; 
      buktiFoto?: string; 
      catatanIzin?: string;
      keterangan?: string;
    }
  ) => {
    const activeDays = JSON.parse(localStorage.getItem('ERP_active_days') || '["Minggu"]');
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dateObj = new Date(selectedDate);
    const dayName = days[dateObj.getDay()];
    if (!activeDays.includes(dayName)) {
      Swal.fire({
        icon: 'error',
        title: 'Presensi Terkunci',
        text: `Tanggal ${selectedDate} (${dayName}) dikonfigurasi sebagai Hari Non-Aktif. Perekaman atau pengubahan kehadiran tidak diizinkan.`,
        confirmButtonColor: '#ef4444'
      });
      return;
    }

    const current = db.get<Absensi>('absensi');
    const existingIndex = current.findIndex(a => a.siswaId === siswaId && a.tanggal === selectedDate);
    
    // Find siswa's class
    const sObj = siswaList.find(s => s.id === siswaId);
    const kId = sObj ? sObj.kelasId || selectedKelas : selectedKelas;

    if (existingIndex !== -1) {
      current[existingIndex].status = status;
      current[existingIndex].jamDatang = status === 'Hadir' ? new Date().toTimeString().split(' ')[0] : '';
      current[existingIndex].keterangan = additional?.keterangan || (status === 'Hadir' ? 'Tepat Waktu' : '-');
      if (additional) {
        if (additional.latitude !== undefined) current[existingIndex].latitude = additional.latitude;
        if (additional.longitude !== undefined) current[existingIndex].longitude = additional.longitude;
        if (additional.jarakSekolah !== undefined) current[existingIndex].jarakSekolah = additional.jarakSekolah;
        if (additional.buktiFoto !== undefined) current[existingIndex].buktiFoto = additional.buktiFoto;
        if (additional.catatanIzin !== undefined) current[existingIndex].catatanIzin = additional.catatanIzin;
      }
      db.set('absensi', current);
    } else {
      const newAbsen: Absensi = {
        id: `ABS_${siswaId}_${Date.now().toString().slice(-4)}`,
        tanggal: selectedDate,
        siswaId,
        kelasId: kId,
        jamDatang: status === 'Hadir' ? new Date().toTimeString().split(' ')[0] : '',
        jamPulang: '',
        keterangan: additional?.keterangan || (status === 'Hadir' ? 'Tepat Waktu' : '-'),
        status,
        latitude: additional?.latitude,
        longitude: additional?.longitude,
        jarakSekolah: additional?.jarakSekolah,
        buktiFoto: additional?.buktiFoto,
        catatanIzin: additional?.catatanIzin
      };
      db.insert('absensi', newAbsen);
    }
    loadAbsensiData();
  };

  // --- GEOFENCING & PHOTO LEAVE VERIFICATION MECHANICS ---
  const SCHOOL_LAT = -8.2561;
  const SCHOOL_LON = 117.9892;
  const ALLOWED_RADIUS = 100; // in meters

  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // returns distance in meters
  };

  const handleFetchGPS = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      Swal.fire('Error', 'Browser Anda tidak mendukung Geolocation.', 'error');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const dist = getHaversineDistance(latitude, longitude, SCHOOL_LAT, SCHOOL_LON);
        setCurrentLocation({
          latitude,
          longitude,
          isLoaded: true,
          isSimulated: false
        });
        setCalculatedDistance(dist);
        setIsLocating(false);
        Swal.fire({
          title: 'Lokasi GPS Ditemukan!',
          html: `Koordinat: <b>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</b><br/>Jarak ke sekolah: <b>${Math.round(dist)} meter</b>`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      },
      (error) => {
        setIsLocating(false);
        console.error(error);
        Swal.fire({
          title: 'Gagal Mengakses GPS',
          text: 'Izin lokasi ditolak atau sinyal GPS lemah. Anda dapat menggunakan tombol Simulasi Lokasi di bawah untuk demonstrasi.',
          icon: 'warning',
          confirmButtonColor: '#3b82f6'
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSimulateLocation = (type: 'inside' | 'outside') => {
    let lat = SCHOOL_LAT;
    let lon = SCHOOL_LON;
    
    if (type === 'inside') {
      lat = SCHOOL_LAT + 0.0003; // ~45 meters
      lon = SCHOOL_LON + 0.0003;
    } else {
      lat = SCHOOL_LAT + 0.025; // ~3.5 kilometers
      lon = SCHOOL_LON + 0.025;
    }

    const dist = getHaversineDistance(lat, lon, SCHOOL_LAT, SCHOOL_LON);
    setCurrentLocation({
      latitude: lat,
      longitude: lon,
      isLoaded: true,
      isSimulated: true
    });
    setCalculatedDistance(dist);
    
    Swal.fire({
      title: 'Simulasi Lokasi Berhasil',
      html: `Status: <b>${type === 'inside' ? 'Di Dalam Sekolah' : 'Di Luar Sekolah'}</b><br/>Jarak simulasi: <b>${Math.round(dist)} meter</b>`,
      icon: 'info',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleSelfCheckIn = (siswaId: string) => {
    if (!currentLocation || calculatedDistance === null) {
      Swal.fire('Error', 'Silakan dapatkan koordinat lokasi GPS terlebih dahulu.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Validasi Presensi...',
      text: 'Menghubungi server sekolah untuk otentikasi koordinat satelit...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    fetch('/api/attendance/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      })
    })
      .then(async res => {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { success: false, valid: false, error: text || `HTTP ${res.status}` };
        }
      })
      .then(data => {
        if (data.success && data.valid) {
          handleSetAbsensi(siswaId, 'Hadir', {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            jarakSekolah: data.distance,
            keterangan: `Hadir via Geofence (${data.distance}m)`
          });

          Swal.fire({
            title: 'Absensi Sukses!',
            html: `Koordinat terverifikasi oleh server.<br/>Jarak Anda: <b>${data.distance} meter</b> dari sekolah (Maks: ${data.maxAllowedRadius}m).`,
            icon: 'success',
            confirmButtonColor: '#3b82f6'
          });
        } else {
          Swal.fire({
            title: 'Presensi Ditolak',
            html: data.message || `Anda berada di luar batas geofence sekolah (${data.distance || Math.round(calculatedDistance)}m).`,
            icon: 'error',
            confirmButtonColor: '#ef4444'
          });
        }
      })
      .catch(err => {
        console.error("Gagal melakukan verifikasi absensi:", err);
        // Robust offline fallback
        if (calculatedDistance <= ALLOWED_RADIUS) {
          handleSetAbsensi(siswaId, 'Hadir', {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            jarakSekolah: Math.round(calculatedDistance),
            keterangan: `Hadir via Local Geofence (${Math.round(calculatedDistance)}m)`
          });

          Swal.fire({
            title: 'Absensi Sukses (Mode Cadangan)',
            text: 'Koordinat divalidasi lokal oleh browser (offline fallback).',
            icon: 'success',
            confirmButtonColor: '#3b82f6'
          });
        } else {
          Swal.fire('Absensi Terkunci', `Jarak Anda (${Math.round(calculatedDistance)}m) melebihi batas geofence sekolah (maksimal ${ALLOWED_RADIUS}m).`, 'error');
        }
      });
  };

  const handleLoadSamplePhoto = (type: 'dokter' | 'keluarga') => {
    const sampleDokter = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600';
    const sampleKeluarga = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600';
    setLeavePhoto(type === 'dokter' ? sampleDokter : sampleKeluarga);
    Swal.fire('Surat Bukti Terlampir', `Contoh surat ${type === 'dokter' ? 'dokter resmi' : 'izin keluarga'} berhasil di-load.`, 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLeavePhoto(reader.result);
          Swal.fire('Bukti Foto Disimpan', 'File bukti/surat keterangan berhasil diunggah.', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendLeaveRequest = (siswaId: string) => {
    if (!leaveReason.trim()) {
      Swal.fire('Alasan Wajib Diisi', 'Silakan tuliskan alasan lengkap permohonan izin Anda.', 'warning');
      return;
    }

    if (!leavePhoto) {
      Swal.fire('Bukti Foto Wajib', 'Silakan unggah bukti foto surat keterangan sakit atau surat izin orang tua.', 'warning');
      return;
    }

    handleSetAbsensi(siswaId, leaveType, {
      catatanIzin: leaveReason,
      buktiFoto: leavePhoto,
      keterangan: `Izin Diajukan (${leaveType})`
    });

    Swal.fire({
      title: 'Izin Berhasil Dikirim',
      text: 'Permohonan izin Anda telah diteruskan ke Wali Kelas dan Admin untuk diverifikasi.',
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });

    setLeaveReason('');
    setLeavePhoto('');
  };

  const handleViewLeaveDetail = (siswaId: string) => {
    const record = getAbsensiRecord(siswaId);
    if (!record) return;

    Swal.fire({
      title: `Detail Presensi - ${siswaList.find(s => s.id === siswaId)?.nama || ''}`,
      html: `
        <div class="text-left text-xs space-y-3 bg-slate-50 p-4 rounded-2xl border text-slate-700">
          <p class="flex justify-between"><b>Status:</b> <span class="px-2.5 py-0.5 rounded-lg font-black bg-amber-100 text-amber-800 uppercase text-[10px]">${record.status}</span></p>
          <p class="flex justify-between"><b>Tanggal:</b> <span>${record.tanggal}</span></p>
          <p class="flex justify-between"><b>Jam Kirim:</b> <span>${record.jamDatang || '-'}</span></p>
          ${record.latitude ? `<p class="flex justify-between"><b>Koordinat:</b> <code>${record.latitude.toFixed(6)}, ${record.longitude?.toFixed(6)}</code></p>` : ''}
          ${record.jarakSekolah ? `<p class="flex justify-between"><b>Jarak Sekolah:</b> <span>${record.jarakSekolah} meter</span></p>` : ''}
          ${record.catatanIzin ? `<p class="border-t pt-2 mt-2"><b>Alasan Permohonan:</b><br/><span class="italic text-slate-600 block mt-1">"${record.catatanIzin}"</span></p>` : ''}
          ${record.buktiFoto ? `
            <div class="mt-3 border-t pt-2">
              <p class="font-bold mb-1.5 text-slate-700">Dokumen Bukti Lampiran:</p>
              <img src="${record.buktiFoto}" class="w-full max-h-56 object-cover rounded-xl border border-slate-200 shadow-sm" alt="Bukti Foto" />
            </div>
          ` : ''}
        </div>
      `,
      confirmButtonText: 'Tutup Berkas',
      confirmButtonColor: '#3b82f6'
    });
  };

  const handleSimpanNilai = () => {
    Swal.fire({
      title: 'Nilai Berhasil Disimpan',
      text: 'Nilai tugas, UTS, dan UAS berhasil direkam ke database rapor.',
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });
  };

  const handleTambahAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaMateri) return;
    const newAgenda = {
      tanggal: selectedDate,
      kelas: agendaKelas,
      mapel: mapelList.find(m => m.id === selectedMapel)?.nama || selectedMapel,
      materi: agendaMateri,
      status: 'Selesai'
    };
    setAgendaList([newAgenda, ...agendaList]);
    setAgendaMateri('');
    Swal.fire('Agenda Tercatat', 'Materi pembelajaran hari ini berhasil disimpan.', 'success');
  };

  const handleScanQRSimulate = () => {
    if (filteredSiswa.length === 0) {
      Swal.fire('Error', 'Pilih kelas yang memiliki siswa aktif terlebih dahulu.', 'error');
      return;
    }
    const randomSiswa = filteredSiswa[Math.floor(Math.random() * filteredSiswa.length)];
    handleSetAbsensi(randomSiswa.id, 'Hadir');
    
    Swal.fire({
      title: 'QR Scan Berhasil!',
      html: `Siswa: <b>${randomSiswa.nama}</b><br>Absensi dicatat pada pukul <b>${new Date().toLocaleTimeString()}</b>`,
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });
  };

  // --- DEVICE CAMERA QR SCANNER ENGINE ---
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedStudent, setScannedStudent] = useState<Siswa | null>(null);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Scanner cleanup failed:", err));
      }
    };
  }, [activeSubTab]);

  const startCameraScanner = () => {
    setIsScanning(true);
    setScannedStudent(null);
    
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("qr-camera-stream");
        html5QrCodeRef.current = scanner;
        
        scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText) => {
            handleDecodedQR(decodedText);
            scanner.stop().then(() => {
              setIsScanning(false);
            }).catch(err => console.error("Stop scanner error:", err));
          },
          () => {
            // Silence frame errors
          }
        ).catch(err => {
          console.error("Camera start error:", err);
          setIsScanning(false);
          Swal.fire({
            icon: 'error',
            title: 'Akses Kamera Gagal',
            text: 'Izin kamera ditolak atau perangkat kamera tidak ditemukan. Silakan gunakan tombol Simulator di bawah.',
            confirmButtonColor: '#ef4444'
          });
        });
      } catch (e) {
        console.error("Scanner initialization failed:", e);
        setIsScanning(false);
      }
    }, 200);
  };

  const stopCameraScanner = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().then(() => {
        setIsScanning(false);
      }).catch(err => {
        console.error("Stop scanner error:", err);
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  const handleDecodedQR = (text: string) => {
    const matchedSiswa = siswaList.find(s => 
      s.nisn === text || 
      s.id === text || 
      s.nama.toLowerCase() === text.trim().toLowerCase()
    );

    if (matchedSiswa) {
      setScannedStudent(matchedSiswa);
      handleSetAbsensi(matchedSiswa.id, 'Hadir');
      
      try {
        const greetText = `Absensi sukses. Selamat datang, ${matchedSiswa.nama}.`;
        const utterance = new SpeechSynthesisUtterance(greetText);
        utterance.lang = 'id-ID';
        window.speechSynthesis.speak(utterance);
      } catch (e) {}

      Swal.fire({
        icon: 'success',
        title: 'Presensi QR Berhasil!',
        html: `
          <div class="text-center space-y-3">
            <span class="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full uppercase">Kehadiran Dicatat</span>
            <div class="p-4 bg-slate-50 border rounded-2xl text-left text-xs space-y-1.5 text-slate-700">
              <p><b>Nama Siswa:</b> ${matchedSiswa.nama}</p>
              <p><b>NISN:</b> ${matchedSiswa.nisn}</p>
              <p><b>Jam Kedatangan:</b> ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
              <p><b>Metode:</b> Scanner Kamera QR</p>
            </div>
          </div>
        `,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Lanjut'
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Scan QR Gagal',
        text: `QR Code "${text}" tidak terdaftar pada database siswa aktif Rombel KTCT.`,
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleSaveKenaikanKelas = () => {
    const sourceSiswa = siswaList.filter(s => getResolvedSiswaKelasId(s.kelasId) === promSourceKelas && s.status === 'AKTIF');
    if (sourceSiswa.length === 0) {
      Swal.fire('Info', 'Tidak ada siswa aktif di kelas asal untuk diproses.', 'info');
      return;
    }

    const hasMissing = sourceSiswa.some(s => !promDecisions[s.id]);
    if (hasMissing) {
      Swal.fire('Error', 'Beberapa data keputusan siswa tidak ditemukan.', 'error');
      return;
    }

    const naikCount = sourceSiswa.filter(s => promDecisions[s.id]?.status === 'NAIK').length;
    const tinggalCount = sourceSiswa.filter(s => promDecisions[s.id]?.status === 'TINGGAL').length;
    const lulusCount = sourceSiswa.filter(s => promDecisions[s.id]?.status === 'LULUS').length;

    Swal.fire({
      title: 'Terapkan Kenaikan Kelas?',
      html: `
        Anda akan memproses transisi kelas untuk <b>${sourceSiswa.length} siswa</b>:<br>
        <ul class="text-left max-w-xs mx-auto mt-3 list-disc space-y-1 text-xs text-slate-600 font-semibold">
          <li>Naik Kelas: <span class="text-emerald-600 font-bold">${naikCount} siswa</span></li>
          <li>Tinggal Kelas: <span class="text-amber-600 font-bold">${tinggalCount} siswa</span></li>
          <li>Lulus: <span class="text-blue-600 font-bold">${lulusCount} siswa</span></li>
        </ul>
        <p class="text-rose-500 font-bold text-[10px] mt-4 uppercase">Tindakan ini tidak dapat dibatalkan!</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Terapkan!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const updatedSiswa = siswaList.map(s => {
          const dec = promDecisions[s.id];
          if (dec) {
            if (dec.status === 'NAIK') {
              return { ...s, kelasId: dec.targetKelasId };
            } else if (dec.status === 'LULUS') {
              return { ...s, status: 'LULUS' as any };
            }
          }
          return s;
        });

        db.set('siswa', updatedSiswa);
        setSiswaList(updatedSiswa);

        // Record audit log
        const logs = db.get<any>('logs') || [];
        const sourceClassName = kelasList.find(k => k.id === promSourceKelas)?.nama || promSourceKelas;
        const newLog = {
          id: `LOG-${Date.now()}`,
          ts: new Date().toISOString(),
          who: user.name,
          action: 'CLASS_PROMOTION',
          meta: `Kenaikan Kelas Asal: ${sourceClassName}. Naik: ${naikCount}, Tinggal: ${tinggalCount}, Lulus: ${lulusCount}`
        };
        db.set('logs', [newLog, ...logs]);

        Swal.fire({
          title: 'Sukses!',
          text: `Proses kenaikan & transisi kelas asal ${sourceClassName} berhasil diterapkan ke database.`,
          icon: 'success',
          confirmButtonColor: '#3b82f6'
        });
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sub Tabs */}
      <div className="flex flex-row overflow-x-auto whitespace-nowrap gap-2 border-b pb-3 scrollbar-none snap-x touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0">
        {allowedTabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-akademik-${tab.id}`}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all border shrink-0 snap-center ${
              activeSubTab === tab.id
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'kurikulum' && (
        <Kurikulum user={user} />
      )}

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Access Card: Penilaian Formatif & Sumatif */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-black tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-md border border-blue-400/30">
                    Modul Baru
                  </span>
                  <span className="text-xs font-bold text-slate-300">Format Resmi Rapor</span>
                </div>
                <h3 className="text-base font-black text-white mt-1">
                  Buku Penilaian Formatif & Sumatif
                </h3>
                <p className="text-xs text-slate-300">
                  Tabel pemisahan nilai tugas/TP (Formatif) dan nilai CBT/LM/STS/SAS (Sumatif) dengan kalkulasi Nilai Akhir otomatis.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('input_nilai')}
              className="bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow transition shrink-0 flex items-center gap-2"
            >
              Buka Penilaian Formatif & Sumatif &rarr;
            </button>
          </div>

          {/* Top Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Hadir Hari Ini</span>
                <span className="text-xl font-extrabold text-slate-800 block mt-1">
                  {absensiList.filter(a => a.tanggal === selectedDate && a.status === 'Hadir').length} Siswa
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  {Math.round((absensiList.filter(a => a.tanggal === selectedDate && a.status === 'Hadir').length / (siswaList.length || 1)) * 100)}% Rasio Kehadiran
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Sakit / Izin</span>
                <span className="text-xl font-extrabold text-slate-800 block mt-1">
                  {absensiList.filter(a => a.tanggal === selectedDate && (a.status === 'Sakit' || a.status === 'Izin')).length} Permohonan
                </span>
                <span className="text-[10px] text-amber-500 font-bold block mt-0.5">
                  Butuh verifikasi berkas
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Tanpa Keterangan (Alpha)</span>
                <span className="text-xl font-extrabold text-slate-800 block mt-1">
                  {absensiList.filter(a => a.tanggal === selectedDate && a.status === 'Alpha').length} Siswa
                </span>
                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                  Wajib rekap panggilan BK
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kehadiran per Kelas Chart/List */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Rasio Kehadiran per Rombongan Belajar</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Statistik kehadiran harian untuk tanggal {selectedDate}</p>
                </div>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="border bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none" 
                />
              </div>

              <div className="space-y-4 pt-2">
                {kelasList.map(k => {
                  const classSiswa = siswaList.filter(s => s.kelasId === k.id && s.status === 'AKTIF');
                  const classSiswaIds = classSiswa.map(s => s.id);
                  const presentCount = absensiList.filter(a => a.tanggal === selectedDate && classSiswaIds.includes(a.siswaId) && a.status === 'Hadir').length;
                  const ratio = classSiswa.length > 0 ? Math.round((presentCount / classSiswa.length) * 100) : 0;
                  
                  return (
                    <div key={k.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Kelas {k.nama}</span>
                        <span>{presentCount} / {classSiswa.length} Hadir ({ratio}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            ratio >= 90 ? 'bg-emerald-500' : ratio >= 75 ? 'bg-blue-500' : 'bg-rose-500'
                          }`} 
                          style={{ width: `${ratio}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Agenda & Teacher Log */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="font-extrabold text-slate-800 text-sm">Agenda Mengajar & Materi Hari Ini</h4>
              <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto pr-1">
                {agendaList.map((ag, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                        {ag.kelas}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400">{ag.tanggal}</span>
                    </div>
                    <h5 className="font-bold text-slate-800 text-xs mt-2">{ag.mapel}</h5>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{ag.materi}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[9px] font-bold text-emerald-600 uppercase">Selesai Diverifikasi</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

       {activeSubTab === 'data_siswa_kelas' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="border-b pb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase flex items-center gap-2">
                <span>📚</span> Data Siswa Kelas
              </h3>
              <p className="text-xs text-slate-400 mt-1">Daftar siswa dalam rombongan belajar dengan pencarian dan filter akademik lengkap.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={handlePurgeAllClassData}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2"
              >
                <span>⚠️</span> Reset & Bersihkan Data Kelas
              </button>

              <button
                type="button"
                onClick={() => setShowSmartImport(!showSmartImport)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition flex items-center gap-2 ${
                  showSmartImport 
                    ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <span>📋</span> {showSmartImport ? 'Tutup Panel Impor' : 'Impor Salin-Tempel Excel (Cerdas)'}
              </button>

              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input 
                  type="text" 
                  value={skSearchQuery}
                  onChange={(e) => setSkSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Cari PDKT / NISN / Nama..." 
                />
              </div>
            </div>
          </div>

          {/* REKAP SISWA TIAP JENJANG & KELAS */}
          {(() => {
            const getClassLevelStats = (levelNum: number, kelasIds: string[]) => {
              const numStr = String(levelNum);
              const filtered = siswaList.filter(s => {
                const combined = `${s.kelasId || ''} ${s.kelas || ''} ${s.kelasSaatIni || ''}`.toUpperCase().trim();
                const matchesClass = 
                  kelasIds.some(id => combined.includes(id.toUpperCase())) ||
                  combined.includes(`KELAS ${numStr}`) ||
                  combined.includes(`PA${numStr}`) ||
                  combined.includes(`A${numStr}`) ||
                  combined.includes(`PB${numStr}`) ||
                  combined.includes(`B${numStr}`) ||
                  combined.includes(`PC${numStr}`) ||
                  combined.includes(`C${numStr}`) ||
                  combined.split(/[\s,()/]+/).some(part => part === numStr);
                return matchesClass;
              });

              const getNorm = (stRaw?: string) => {
                if (!stRaw) return 'AKTIF';
                const st = stRaw.toUpperCase().trim();
                if (st === 'AKTIF' || st.includes('DAPODIK AKTIF') || st.includes('BELAJAR AKTIF')) return 'AKTIF';
                if (st === 'TIDAK AKTIF' || st === 'NONAKTIF' || st === 'NON AKTIF' || st.includes('BELAJAR NONAKTIF')) return 'TIDAK AKTIF';
                if (st === 'BELUM' || st.includes('DAPODIK NONAKTIF')) return 'BELUM';
                return st;
              };

              const aktif = filtered.filter(s => getNorm(s.status) === 'AKTIF').length;
              const tidakAktif = filtered.filter(s => getNorm(s.status) === 'TIDAK AKTIF').length;
              const belum = filtered.filter(s => getNorm(s.status) === 'BELUM').length;

              return { aktif, tidakAktif, belum };
            };

            const classLevels = [
              { name: 'Kelas 4', num: 4, ids: ['A4', 'PA4'] },
              { name: 'Kelas 5', num: 5, ids: ['A5', 'PA5'] },
              { name: 'Kelas 6', num: 6, ids: ['A6', 'PA6'] },
              { name: 'Kelas 7', num: 7, ids: ['B7', 'PB7'] },
              { name: 'Kelas 8', num: 8, ids: ['B8', 'PB8'] },
              { name: 'Kelas 9', num: 9, ids: ['B9', 'PB9'] },
              { name: 'Kelas 10', num: 10, ids: ['C10', 'PC10'] },
              { name: 'Kelas 11', num: 11, ids: ['C11', 'PC11'] },
              { name: 'Kelas 12', num: 12, ids: ['C12', 'PC12'] }
            ].map(item => {
              const stats = getClassLevelStats(item.num, item.ids);
              return {
                name: item.name,
                ...stats
              };
            });

            return (
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="border-l-4 border-indigo-500 pl-3 py-0.5">
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider font-display">Rekap Siswa Tiap Jenjang & Kelas</h4>
                  <p className="text-[10px] text-slate-400">Penyebaran status siswa per kelas (mengecualikan siswa lulus)</p>
                </div>
                
                <div className="flex flex-row overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent snap-x touch-pan-x">
                  {classLevels.map((lvl, idx) => (
                    <div 
                      key={idx} 
                      className="min-w-[125px] flex-1 snap-center bg-white border border-slate-200/60 rounded-xl p-3 flex flex-col items-center text-center hover:bg-slate-50 hover:border-slate-300 transition"
                    >
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider whitespace-nowrap mb-1.5">{lvl.name}</span>
                      <div className="space-y-1 text-left w-full text-[11px] font-semibold text-slate-600 px-1">
                        <div className="flex justify-between">
                          <span>Aktif</span>
                          <span className="font-extrabold text-emerald-600 font-mono">: {lvl.aktif}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tidak Aktif</span>
                          <span className="font-extrabold text-rose-600 font-mono">: {lvl.tidakAktif}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Belum</span>
                          <span className="font-extrabold text-amber-600 font-mono">: {lvl.belum}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Smart Copy-Paste Import Panel */}
          {showSmartImport && (
            <div className="bg-slate-50 border-2 border-dashed border-blue-200 rounded-3xl p-6 space-y-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 font-bold shrink-0 text-sm">💡</div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-slate-800 uppercase text-xs">Asisten Impor Transisi Kelas Multi-Tahun</h4>
                  <p className="text-slate-500">
                    Punya data kenaikan kelas multi-tahun di Excel / Google Sheets? Cukup copy kolom di spreadsheet Anda dan paste pada kotak di bawah ini.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempel (Paste) Data dari Excel/Spreadsheet Anda Di Sini</label>
                <textarea
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  rows={8}
                  className="w-full p-4 font-mono text-[11px] bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  placeholder="No. PDKT&#9;NISN&#9;Nama Lengkap&#9;Jenis Kelamin&#9;Kelas&#9;Tahun Ajaran&#9;Status&#9;Keterangan&#10;PDKT-RIZKI&#9;9988776655&#9;Rizki Kurniawan&#9;L&#9;4&#9;2023/2024&#9;AKTIF&#9;&#10;PDKT-RIZKI&#9;9988776655&#9;Rizki Kurniawan&#9;L&#9;5&#9;2024/2025&#9;AKTIF&#9;"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setImportRawText('');
                    setParsedImportRows([]);
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition"
                >
                  Bersihkan
                </button>
                <button
                  type="button"
                  onClick={handleParseMultiYearPaste}
                  className="px-5 py-2 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-700 transition shadow-md flex items-center gap-1.5"
                >
                  <span>🔍</span> Analisis & Tinjau Data
                </button>
              </div>

              {/* Tinjauan Hasil Parsing */}
              {parsedImportRows.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span>📊</span> Hasil Analisis Transisi Kenaikan Kelas ({parsedImportRows.length} Siswa Terdeteksi)
                    </h5>
                    <button
                      type="button"
                      onClick={handleApplySmartImport}
                      className="px-5 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-700 transition shadow-lg flex items-center gap-1.5"
                    >
                      <span>💾</span> Terapkan & Update Database ERP
                    </button>
                  </div>

                  <div className="border rounded-2xl overflow-hidden bg-white max-h-96 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 uppercase font-black text-slate-500 border-b">
                        <tr>
                          <th className="p-3 w-12 text-center">No</th>
                          <th className="p-3">No. PDKT</th>
                          <th className="p-3">Nama Lengkap</th>
                          <th className="p-3 text-center">JK</th>
                          <th className="p-3">Kelas Terbaru</th>
                          <th className="p-3 text-center">Thn Ajaran Terbaru</th>
                          <th className="p-3 text-center">Siklus / Riwayat</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3">Keterangan (Smart Logic)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedImportRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-mono font-bold text-blue-600">{row.noPdkt}</td>
                            <td className="p-3 font-bold text-slate-800">{row.nama}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${row.jk === 'L' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                                {row.jk}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-600">Kelas {row.kelasId}</td>
                            <td className="p-3 text-center font-bold text-slate-600">{row.tahunAjaran}</td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col gap-1 items-center">
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-extrabold text-[10px] border border-blue-100">
                                  🔄 {row.riwayatAkademis ? row.riwayatAkademis.length : 1} Tahun
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${
                                row.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 font-semibold">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                row.keterangan?.includes('Naik') || row.keterangan?.includes('Lulus') || row.keterangan?.includes('Aktif')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                ✨ {row.keterangan || 'Aktif'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl">
            <div className="shrink-0 min-w-[200px]">
              <CustomDropdown
                id="sk-status-filter"
                label="Status"
                value={skStatus}
                onChange={(val) => setSkStatus(val)}
                options={[
                  { value: '', label: 'Semua Status (Aktif/Tidak/Belum)' },
                  { value: 'AKTIF', label: 'AKTIF' },
                  { value: 'TIDAK AKTIF', label: 'TIDAK AKTIF' },
                  { value: 'BELUM', label: 'BELUM' }
                ]}
                placeholder="Pilih Status..."
              />
            </div>

            <div className="shrink-0 min-w-[180px]">
              {((user.role === 'WALI_KELAS' || user.role === 'GURU') && user.kelasId) ? (
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Kelas:</span>
                  <span className="inline-block bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-black border border-indigo-100 text-xs shadow-sm">
                    Kelas {kelasList.find(k => k.id === user.kelasId)?.nama || user.kelasId}
                  </span>
                </div>
              ) : (
                <CustomDropdown
                  id="sk-kelas-filter"
                  label="Kelas"
                  value={skKelas}
                  onChange={(val) => setSkKelas(val)}
                  options={[
                    { value: '', label: 'Semua Kelas' },
                    ...kelasList.map(k => ({
                      value: k.id,
                      label: `Kelas ${k.nama}`
                    }))
                  ]}
                  placeholder="Pilih Kelas..."
                  searchable={kelasList.length > 5}
                />
              )}
            </div>

            {(skStatus || skKelas || skSearchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSkStatus('');
                  setSkKelas('');
                  setSkSearchQuery('');
                }}
                className="px-3 py-2 text-xs bg-rose-50 text-rose-600 font-extrabold rounded-xl hover:bg-rose-100 transition border border-rose-200 shadow-sm ml-auto"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">No. PDKT</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4 text-center">Kelas</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Keterangan</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedSiswaKelas.length > 0 ? (
                  sortedSiswaKelas.map((s, idx) => {
                    const activeKeterangan = s.keterangan || 'Aktif Belajar';
                    const matchedK = kelasList.find(k => k.id === s.kelasId || k.nama === s.kelasId || k.nama === s.kelas);
                    const classDisplay = matchedK ? `Kelas ${matchedK.nama}` : (s.kelas || s.kelasId || '-');

                    return (
                      <React.Fragment key={s.id}>
                        <tr className="hover:bg-slate-50 transition">
                          <td className="p-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-4 font-mono font-semibold text-slate-700">{s.noPdkt || s.id}</td>
                          <td className="p-4 font-extrabold text-slate-800 text-sm">{s.nama}</td>
                          <td className="p-4 text-center">
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-extrabold text-xs">
                              {classDisplay}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                              s.status === 'AKTIF' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : s.status === 'TIDAK AKTIF' 
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {s.status || 'AKTIF'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              activeKeterangan?.includes('Naik') || activeKeterangan?.includes('Lulus') || activeKeterangan?.includes('Aktif')
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              ✨ {activeKeterangan || 'Aktif'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditSiswa(s)}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm transition flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                <span>✏️</span> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedSiswaHistory(expandedSiswaHistory === s.id ? null : s.id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm transition flex items-center gap-1 ${
                                  expandedSiswaHistory === s.id 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100'
                                }`}
                              >
                                <span>📜</span> {expandedSiswaHistory === s.id ? 'Tutup' : 'Riwayat'}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedSiswaHistory === s.id && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={9} className="p-4 border-t border-b border-indigo-100">
                              <div className="space-y-3 animate-fade-in pl-4">
                                <h5 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>📈</span> RIWAYAT TRANSISI AKADEMIS & KENAIKAN KELAS MULTI-TAHUN: <span className="text-indigo-600 font-black">{s.nama}</span>
                                </h5>
                                {s.riwayatAkademis && s.riwayatAkademis.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                                    {s.riwayatAkademis.map((history, hIdx) => (
                                      <div key={hIdx} className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-sm hover:border-indigo-200 transition">
                                        <div className="flex justify-between items-center gap-2">
                                          <span className="font-black text-[10px] text-indigo-950 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                            TA {history.tahunAjaran}
                                          </span>
                                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-50 border text-slate-700">
                                            Kelas {history.kelasId}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2 pt-1 border-t border-dashed">
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                            history.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                                          }`}>
                                            {history.status}
                                          </span>
                                          <span className={`font-black text-[10px] px-2 py-0.5 rounded-full ${
                                            history.keterangan?.includes('Naik') || history.keterangan?.includes('Lulus') || history.keterangan?.includes('Aktif')
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-amber-100 text-amber-800'
                                          }`}>
                                            🌟 {history.keterangan || 'Aktif'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-400 italic text-[11px]">Belum ada data riwayat transisi terekam. Gunakan tombol 'Impor Salin-Tempel' di atas untuk mengunggah riwayat lengkap siswa ini.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                      Tidak ada data siswa kelas yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'jadwal' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">Jadwal Mata Pelajaran</h3>
              <p className="text-xs text-slate-400 mt-1">
                {user.role === 'SISWA' 
                  ? 'Jadwal mata pelajaran dan waktu rombel kelas aktif Anda.' 
                  : 'Gunakan dropdown kelas untuk memantau waktu mengajar dan pembagian ruang rombel.'}
              </p>
            </div>
            {user.role === 'SISWA' ? (
              <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl text-xs">
                <span className="text-[10px] text-indigo-500 font-bold block uppercase">KELAS SAYA</span>
                <span className="text-sm font-black text-indigo-950">
                  {kelasList.find(k => k.id === selectedKelas)?.nama || 'XII RPL'}
                </span>
              </div>
            ) : (
              <div className="w-48">
                <CustomDropdown
                  id="jadwal-mapel-selected-kelas"
                  value={selectedKelas}
                  onChange={(val) => setSelectedKelas(val)}
                  options={kelasList.map(k => ({ value: k.id, label: `Kelas ${k.nama}` }))}
                  placeholder="Pilih Kelas..."
                  searchable={kelasList.length > 5}
                />
              </div>
            )}
          </div>

          <div className={`grid gap-6 text-xs ${
            (() => {
              const saved = localStorage.getItem('ERP_active_days');
              const activeDaysList = saved ? JSON.parse(saved) : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
              if (activeDaysList.length === 1) return 'grid-cols-1 max-w-md mx-auto';
              if (activeDaysList.length === 2) return 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto';
              return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
            })()
          }`}>
            {(JSON.parse(localStorage.getItem('ERP_active_days') || '["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]') as string[]).map((day, idx) => {
              const allSchedules = (() => {
                const stored = localStorage.getItem('ERP_jadwal_per_kelas');
                return stored ? JSON.parse(stored) : [];
              })();
              const selectedKelasObj = kelasList.find(k => k.id === selectedKelas);
              const kelasKode = (selectedKelasObj?.nama || 'XII RPL').replace(' ', '_');
              
              const daySchedules = allSchedules.filter((s: any) => 
                (s.hari === day) && (s.kelas === kelasKode || s.kelas === selectedKelas || s.kelas.replace('_', ' ') === (selectedKelasObj?.nama || 'XII RPL'))
              );

              return (
                <div key={idx} className="border rounded-2xl p-4 bg-slate-50/50 space-y-3 shadow-sm hover:border-blue-100 transition duration-150">
                  <h5 className="font-extrabold text-blue-600 text-sm border-b pb-1.5 uppercase text-center">{day}</h5>
                  <div className="space-y-2">
                    {daySchedules.length === 0 ? (
                      <div className="p-3 bg-white/60 border border-slate-100 rounded-xl text-center text-[10px] text-slate-400 italic">
                        Tidak ada jam pelajaran
                      </div>
                    ) : (
                      daySchedules.map((item: any, itemIdx: number) => (
                        <div key={itemIdx} className="p-2.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition">
                          <p className="font-bold text-slate-800 flex justify-between items-center">
                            <span>{item.jam}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                              item.jenis === 'Praktik' ? 'bg-purple-50 text-purple-700' :
                              item.jenis === 'Lab' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {item.jenis || 'Teori'}
                            </span>
                          </p>
                          <p className="font-extrabold text-blue-600 mt-1">{item.mapel}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Guru: {item.guru} • Ruang: {item.ruangan || 'Ruang Kelas'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubTab === 'agenda' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Agenda Kegiatan Mengajar Guru</h3>
            <p className="text-xs text-slate-400 mt-1">Catat jurnal mengajar harian guru untuk mempermudah monitoring kurikulum sekolah.</p>
          </div>

          {!isSelectedDateActive ? (
            <div className="p-5 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-amber-900">
              <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
              <div className="space-y-1 text-center sm:text-left">
                <h5 className="font-extrabold text-sm uppercase">Hari Non-Aktif Kegiatan Belajar Mengajar</h5>
                <p className="text-[11px] text-amber-700 leading-normal">
                  Hari ini (<b>{selectedDayName}</b>) dikonfigurasi sebagai Hari Non-Aktif Rombel.
                  Pencatatan agenda mengajar ditiadakan. Silakan pilih hari aktif atau ubah konfigurasi di modul <b>Pengaturan</b>.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTambahAgenda} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
              <div className="space-y-1">
                <CustomDropdown
                  id="agenda-pilih-kelas"
                  label="Pilih Kelas"
                  value={agendaKelas}
                  onChange={(val) => setAgendaKelas(val)}
                  options={kelasList.map(k => ({ value: k.nama, label: `Kelas ${k.nama}` }))}
                  placeholder="Pilih Kelas..."
                  searchable={kelasList.length > 5}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pokok Bahasan / Materi</label>
                <input required value={agendaMateri} onChange={(e) => setAgendaMateri(e.target.value)} placeholder="Contoh: Bab 4 Hukum Gravitasi" className="w-full bg-slate-50 border rounded-xl px-4 py-2.5" />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-xs shadow">
                Simpan Agenda Hari Ini
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4 text-center">Kelas</th>
                  <th className="p-4 hidden sm:table-cell">Mata Pelajaran</th>
                  <th className="p-4">Materi Bahasan</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agendaList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-slate-500 font-mono">{item.tanggal}</td>
                    <td className="p-4 text-center font-bold text-slate-800">{item.kelas}</td>
                    <td className="p-4 font-semibold text-blue-600 hidden sm:table-cell">{item.mapel}</td>
                    <td className="p-4">
                      <div>
                        <p className="font-semibold text-slate-700">{item.materi}</p>
                        <p className="text-[10px] text-blue-500 font-bold sm:hidden mt-0.5">{item.mapel}</p>
                      </div>
                    </td>
                    <td className="p-4 text-center"><span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold">{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'absensi_siswa' && (
        <div className="space-y-6">
          {user.role === 'SISWA' ? (
            // ================= STUDENT VIEW: SELF-CHECKIN & LEAVE PORTAL =================
            (() => {
              const studentUser = siswaList.find(s => s.nisn === user.username || s.nis === user.username) || siswaList[0];
              if (!studentUser) return <p className="text-xs text-slate-400 font-bold p-6 bg-white border rounded-3xl">Loading data siswa...</p>;
              
              const todayRecord = getAbsensiRecord(studentUser.id);
              const todayStatus = todayRecord ? todayRecord.status : 'Belum Absen';

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Personal Status & Geofencing Check-In */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Welcome Student card */}
                    <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-2xl"></div>
                      <div className="relative flex items-center gap-4">
                        <img 
                          src={studentUser.fotoUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"} 
                          alt={studentUser.nama} 
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                        />
                        <div>
                          <span className="text-[10px] uppercase font-black tracking-wider text-blue-400">Pemberitahuan Presensi Masuk</span>
                          <h3 className="text-lg font-black font-display mt-0.5">{studentUser.nama}</h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">NISN: {studentUser.nisn} | Kelas: {kelasList.find(k => k.id === studentUser.kelasId)?.nama || studentUser.kelasId}</p>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400">Tanggal Hari Ini</p>
                          <p className="font-extrabold text-white mt-1 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            {selectedDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Status Kehadiran Anda</p>
                          <div className="mt-1">
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${
                              todayStatus === 'Hadir' ? 'bg-emerald-500/20 text-emerald-400' :
                              todayStatus === 'Izin' || todayStatus === 'Sakit' ? 'bg-amber-500/20 text-amber-400' :
                              todayStatus === 'Alpa' ? 'bg-rose-500/20 text-rose-400' :
                              'bg-slate-700 text-slate-300'
                            }`}>
                              {todayStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Geofencing Check-In Control */}
                    {!isSelectedDateActive ? (
                      <div className="bg-amber-50/70 border border-amber-200 text-amber-900 rounded-[2rem] p-6 shadow-sm flex items-start gap-4">
                        <AlertTriangle className="w-10 h-10 text-amber-600 shrink-0" />
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm uppercase">Presensi Geofencing Terkunci</h4>
                          <p className="text-xs text-amber-700 leading-relaxed">
                            Hari ini (<b>{selectedDayName}</b>) diatur sebagai Hari Non-Aktif Kegiatan Rombel. 
                            Fitur pencatatan presensi mandiri berbasis GPS geofencing tidak tersedia untuk hari ini.
                          </p>
                          <p className="text-[10px] text-amber-600/80 font-mono mt-2">
                            Konfigurasi Hari Kerja Aktif: {activeDaysList.join(', ')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
                        <div className="flex justify-between items-center border-b pb-4">
                          <div>
                            <h4 className="font-black text-slate-800 text-sm uppercase">Absensi Geofencing Mandiri</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Sistem memverifikasi jarak koordinat GPS Anda ke titik pusat sekolah.</p>
                          </div>
                          <span className="bg-blue-50 text-blue-600 font-bold font-mono text-[10px] px-2.5 py-1 rounded-lg">Radius: {ALLOWED_RADIUS}m</span>
                        </div>

                        {/* Map Simulation Visual */}
                        <div className="h-44 bg-slate-900 rounded-3xl relative overflow-hidden flex items-center justify-center text-center p-4">
                          {/* Styled Radar Circles */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-25">
                            <div className="w-32 h-32 border border-blue-500 rounded-full animate-ping"></div>
                            <div className="w-64 h-64 border border-blue-400 rounded-full absolute"></div>
                            <div className="w-96 h-96 border border-teal-500 rounded-full absolute"></div>
                          </div>

                          {/* Visual marker */}
                          <div className="relative z-10 space-y-2">
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30">
                              <MapPin className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                              <p className="text-white text-xs font-black">Rombel KTCT Tambora School Center</p>
                              <p className="text-slate-400 text-[10px] font-mono mt-0.5">Lat: {SCHOOL_LAT}, Lon: {SCHOOL_LON}</p>
                            </div>
                          </div>

                          {currentLocation && (
                            <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] text-left text-white font-mono space-y-0.5">
                              <p>GPS Anda: {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}</p>
                              <p>Jarak: <span className="font-bold text-blue-400">{Math.round(calculatedDistance || 0)}m</span> {calculatedDistance && calculatedDistance <= ALLOWED_RADIUS ? '✅ (Dalam Radius)' : '⚠️ (Luar Radius)'}</p>
                            </div>
                          )}
                        </div>

                        {/* Simulation helpers */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-3">
                          <p className="font-extrabold text-slate-500 uppercase text-[10px] tracking-wider">Metode Uji Coba Simulasi Lokasi:</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => handleSimulateLocation('inside')}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <Compass className="w-3.5 h-3.5 text-emerald-600" /> Simulasikan di Kelas (~45m)
                            </button>
                            <button 
                              onClick={() => handleSimulateLocation('outside')}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <Compass className="w-3.5 h-3.5 text-rose-600" /> Simulasikan di Rumah (~3.5km)
                            </button>
                          </div>
                        </div>

                        {/* Check In Action Buttons */}
                        <div className="flex gap-3">
                          <button 
                            onClick={handleFetchGPS}
                            disabled={isLocating}
                            className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
                          >
                            <RefreshCw className={`w-4 h-4 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
                            {isLocating ? 'Mengakses Satelit GPS...' : 'Dapatkan GPS Akurat'}
                          </button>

                          <button 
                            onClick={() => handleSelfCheckIn(studentUser.id)}
                            disabled={todayStatus === 'Hadir' || !currentLocation || (calculatedDistance !== null && calculatedDistance > ALLOWED_RADIUS)}
                            className={`flex-1 font-bold py-3.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                              todayStatus === 'Hadir'
                                ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed shadow-none'
                                : currentLocation && calculatedDistance !== null && calculatedDistance <= ALLOWED_RADIUS
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {todayStatus === 'Hadir' ? 'Sudah Absen Hadir' : 'Kirim Absensi Hadir'}
                          </button>
                        </div>

                        {/* Radius Warning Banner */}
                        {currentLocation && calculatedDistance !== null && calculatedDistance > ALLOWED_RADIUS && (
                          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex gap-3 text-xs text-rose-700 leading-normal">
                            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                            <div>
                              <p className="font-extrabold uppercase text-[10px] tracking-wider">Anda di Luar Jangkauan Sekolah</p>
                              <p className="mt-0.5 text-rose-600">Jarak Anda sekarang adalah <b>{Math.round(calculatedDistance)} meter</b>. Absensi Kehadiran hanya diizinkan dalam radius <b>{ALLOWED_RADIUS} meter</b> dari sekolah. Jika Anda berhalangan hadir, silakan kirim permohonan izin/sakit di panel kanan.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Sick & Leave Verification Form */}
                  <div className="space-y-6">
                    {!isSelectedDateActive ? (
                      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4 text-center py-10">
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 border rounded-full flex items-center justify-center mx-auto">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h5 className="font-extrabold text-slate-700 text-xs uppercase">Pengajuan Perizinan Dikunci</h5>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal max-w-xs mx-auto">
                            Pengajuan izin sakit atau dispensasi mandiri tidak tersedia pada Hari Non-Aktif.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-5">
                        <div className="border-b pb-3">
                          <h4 className="font-black text-slate-800 text-sm uppercase">Pengajuan Permohonan Izin / Sakit</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">Wajib melampirkan alasan tertulis dan bukti dokumen foto resmi.</p>
                        </div>

                        {/* Leave Type Toggle */}
                        <div className="space-y-1 text-xs">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tipe Permohonan</label>
                          <div className="grid grid-cols-2 gap-2 mt-1.5">
                            <button 
                              onClick={() => setLeaveType('Izin')}
                              className={`py-2 rounded-xl font-bold transition border text-xs ${
                                leaveType === 'Izin' ? 'bg-amber-500 text-white border-transparent shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Izin Khusus
                            </button>
                            <button 
                              onClick={() => setLeaveType('Sakit')}
                              className={`py-2 rounded-xl font-bold transition border text-xs ${
                                leaveType === 'Sakit' ? 'bg-rose-500 text-white border-transparent shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Sakit (Surat Dokter)
                            </button>
                          </div>
                        </div>

                        {/* Text Reason Input */}
                        <div className="space-y-1.5 text-xs">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alasan / Keterangan Lengkap</label>
                          <textarea 
                            rows={3}
                            value={leaveReason}
                            onChange={(e) => setLeaveReason(e.target.value)}
                            placeholder="Contoh: Mengalami demam tinggi sejak semalam dan disarankan dokter istirahat total 2 hari."
                            className="w-full bg-slate-50 border rounded-2xl p-3 focus:bg-white transition focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {/* Photo evidence upload */}
                        <div className="space-y-2 text-xs">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bukti Foto / Surat Keterangan</label>
                          
                          {leavePhoto ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                              <img src={leavePhoto} alt="Bukti Upload" className="w-full h-40 object-cover" />
                              <button 
                                onClick={() => setLeavePhoto('')}
                                className="absolute top-2 right-2 bg-slate-900/80 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer relative group">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                              <div className="space-y-1">
                                <div className="w-10 h-10 bg-slate-200/60 rounded-full flex items-center justify-center mx-auto text-slate-600">
                                  <Upload className="w-5 h-5" />
                                </div>
                                <p className="font-bold text-slate-700 text-xs">Pilih atau Seret Foto Disini</p>
                                <p className="text-[10px] text-slate-400">Mendukung file PNG, JPG, JPEG (Maks 5MB)</p>
                              </div>
                            </div>
                          )}

                          {/* Dummy Photo loader buttons */}
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleLoadSamplePhoto('dokter')}
                              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded-lg text-[10px] font-semibold border transition"
                            >
                              + Surat Dokter
                            </button>
                            <button 
                              onClick={() => handleLoadSamplePhoto('keluarga')}
                              className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-1.5 rounded-lg text-[10px] font-semibold border transition"
                            >
                              + Surat Izin Ortu
                            </button>
                          </div>
                        </div>

                        {/* Action submission button */}
                        <button 
                          onClick={() => handleSendLeaveRequest(studentUser.id)}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl text-xs transition shadow-md shadow-amber-600/10 flex items-center justify-center gap-1.5"
                        >
                          <Camera className="w-4 h-4" /> Kirim Berkas Pengajuan Izin
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            // ================= TEACHER / ADMIN VIEW: LIST WITH COORDINATE & PHOTO CHECKS =================
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
              {/* Header Controls */}
              <div className="p-5 border-b flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase">Presensi KBM Harian</h3>
                  <p className="text-xs text-slate-400 mt-1.5">Mendukung perekaman presensi kegiatan belajar mengajar harian secara real-time.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={loadAbsensiData}
                    className="p-2.5 bg-white border text-slate-600 rounded-xl hover:bg-slate-50 transition"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => {
                      Swal.fire({
                        title: 'Buka Scanner',
                        text: 'Arahkan kamera HP ke QR Code kartu pelajar siswa.',
                        icon: 'info',
                        confirmButtonText: 'Buka Kamera',
                        confirmButtonColor: '#3b82f6'
                      });
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/10"
                  >
                    <QrCode className="w-4 h-4" /> Scan QR Absensi
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="p-4 border-b flex flex-col md:flex-row gap-4 justify-between items-center bg-white text-xs">
                <div className="flex gap-2 items-center flex-wrap">
                  <div className="w-48">
                    <CustomDropdown
                      id="jurnal-presensi-selected-kelas"
                      value={selectedKelas}
                      onChange={(val) => setSelectedKelas(val)}
                      options={kelasList.map(k => ({ value: k.id, label: `Kelas ${k.nama}` }))}
                      placeholder="Pilih Kelas..."
                      searchable={kelasList.length > 5}
                    />
                  </div>

                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border bg-slate-50 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              {!isSelectedDateActive && (
                <div className="mx-5 my-4 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-extrabold uppercase text-[10px] tracking-wider text-amber-800">Hari Non-Aktif Terpilih</p>
                    <p className="mt-0.5 text-amber-700 leading-relaxed">
                      Sistem mengonfigurasi tanggal <b>{selectedDate} ({selectedDayName})</b> sebagai Hari Non-Aktif. 
                      Perekaman atau pembaruan kehadiran manual dikunci. Anda masih dapat memantau rekaman histori yang ada.
                    </p>
                  </div>
                </div>
              )}

              {/* Table display */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50/50 uppercase font-bold text-slate-500 border-b">
                    <tr>
                      <th className="p-4 w-12 text-center">No</th>
                      <th className="p-4">Nama Lengkap</th>
                      <th className="p-4 text-center">Status Kehadiran</th>
                      <th className="p-4 text-center">Verifikasi Geofence & Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSiswa.map((s, idx) => {
                      const status = getAbsensiStatus(s.id);
                      const record = getAbsensiRecord(s.id);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                          <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-4 font-bold text-slate-800 text-sm">{s.nama}</td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {['Hadir', 'Izin', 'Sakit', 'Alpa'].map((opt) => (
                                <button 
                                  key={opt}
                                  onClick={() => handleSetAbsensi(s.id, opt as any)}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-[10px] border transition ${
                                    status === opt ? 'bg-blue-600 text-white border-transparent' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {record && (record.latitude || record.buktiFoto) ? (
                              <div className="flex items-center justify-center gap-1.5">
                                {record.latitude && (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-600" /> {record.jarakSekolah}m
                                  </span>
                                )}
                                {record.buktiFoto && (
                                  <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center gap-1 border border-purple-200">
                                    <FileText className="w-3.5 h-3.5 text-purple-600" /> Berkas
                                  </span>
                                )}
                                <button
                                  onClick={() => handleViewLeaveDetail(s.id)}
                                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 px-2 py-1 rounded-lg transition font-bold text-[10px] flex items-center gap-1"
                                  title="Lihat Detail Verifikasi Berkas"
                                >
                                  <Eye className="w-3 h-3" /> Detail
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'absensi_guru' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Status Absensi Tenaga Pengajar</h3>
            <p className="text-xs text-slate-400 mt-1">Kehadiran dan jam kedatangan guru (tap in/out) dalam ERP Sekolah.</p>
          </div>

          {!isSelectedDateActive && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="text-xs">
                <p className="font-extrabold uppercase text-[10px] tracking-wider text-amber-800">Hari Non-Aktif Kegiatan</p>
                <p className="mt-0.5 text-amber-700 leading-relaxed">
                  Presensi harian tenaga pengajar dinonaktifkan pada hari non-aktif (<b>{selectedDayName}</b>).
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/50 font-bold text-slate-500 border-b">
                <tr>
                  <th className="p-4 w-12 text-center">No</th>
                  <th className="p-4">Nama Guru</th>
                  <th className="p-4">Jam Kedatangan</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { nama: 'Drs. Joko Purwanto', jam: '07:15 WIB', status: 'Hadir' },
                  { nama: 'Ibu Sri Rahayu, S.Pd', jam: '07:10 WIB', status: 'Hadir' },
                  { nama: 'Kurnia Ramadhan, M.Pd', jam: '-', status: 'Sakit' }
                ].map((g, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-800 text-sm">{g.nama}</td>
                    <td className="p-4 font-mono font-semibold text-slate-500">{g.jam}</td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full font-bold ${g.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{g.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'qr_scanner' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">QR Code Absensi Scanner Portal</h3>
              <p className="text-xs text-slate-400 mt-1">Tunjukkan kartu pelajar dengan QR Code di depan kamera scanner untuk mendeteksi absensi kedatangan harian secara otomatis.</p>
            </div>
            {isScanning && (
              <button 
                onClick={stopCameraScanner} 
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <XCircle className="w-4 h-4" /> Nonaktifkan Kamera
              </button>
            )}
          </div>

          {!isSelectedDateActive ? (
            <div className="max-w-md mx-auto border border-amber-200 bg-amber-50/50 rounded-[2.5rem] p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-100/80 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-black text-slate-800 text-sm">Scanner Portal Terkunci</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-normal">
                  Sistem mendeteksi hari ini (<b>{selectedDayName}</b>) bukan merupakan Hari Aktif Kegiatan Rombel. Scanner kedatangan harian dimatikan.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto border-2 border-dashed border-blue-200 rounded-[2.5rem] p-8 text-center space-y-6 bg-slate-50/50 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-teal-400 to-blue-500 animate-pulse"></div>
              
              {isScanning ? (
                <div className="space-y-4">
                  <div className="relative w-full aspect-square max-w-[280px] mx-auto overflow-hidden rounded-3xl border-4 border-blue-600 bg-black">
                    <div id="qr-camera-stream" className="w-full h-full object-cover"></div>
                    <div className="absolute inset-0 border-2 border-transparent pointer-events-none flex flex-col justify-between p-4">
                      <div className="flex justify-between">
                        <span className="w-4 h-4 border-t-2 border-l-2 border-blue-400"></span>
                        <span className="w-4 h-4 border-t-2 border-r-2 border-blue-400"></span>
                      </div>
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-bounce"></div>
                      <div className="flex justify-between">
                        <span className="w-4 h-4 border-b-2 border-l-2 border-blue-400"></span>
                        <span className="w-4 h-4 border-b-2 border-r-2 border-blue-400"></span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 font-bold animate-pulse">Kamera Aktif - Posisikan QR Code di dalam kotak</p>
                </div>
              ) : (
                <div className="w-48 h-48 border-4 border-slate-200 rounded-3xl mx-auto flex items-center justify-center relative bg-white">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-slate-400 rounded-tl-md"></span>
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-slate-400 rounded-tr-md"></span>
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-slate-400 rounded-bl-md"></span>
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-slate-400 rounded-br-md"></span>
                  <QrCode className="w-24 h-24 text-slate-300" />
                </div>
              )}
              
              <div className="space-y-2">
                <h4 className="font-black text-slate-800 text-sm">
                  {isScanning ? 'Membaca QR Code Siswa...' : 'Kamera Scanner Offline'}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {isScanning 
                    ? 'Dekatkan QR Code pada kartu tanda pelajar / handphone ke arah kamera.' 
                    : 'Aktifkan kamera laptop/smartphone untuk memindai kehadiran secara langsung, atau gunakan simulator.'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {!isScanning && (
                  <button 
                    onClick={startCameraScanner} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-600/10 w-full flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" /> Aktifkan Scanner Kamera
                  </button>
                )}
                <button 
                  onClick={handleScanQRSimulate} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-600/10 w-full"
                >
                  Simulasikan Scan Kartu Acak
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'input_nilai' && (
        <PenilaianFormatifSumatif />
      )}

      {activeSubTab === 'rapor' && (
        user.role === 'SISWA' ? (
          (() => {
            const studentUser = siswaList.find(s => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name) || siswaList[0];
            const score = 84 + (studentUser ? (studentUser.nama.length % 12) : 5);
            return (
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-6">
                <div className="border-b pb-4">
                  <h3 className="font-extrabold text-slate-800 text-lg uppercase">Cetak Rapor Belajar Saya</h3>
                  <p className="text-xs text-slate-400 mt-1">Unduh dan cetak lembar hasil evaluasi belajar akhir semester Anda secara mandiri.</p>
                </div>

                <div className="max-w-md mx-auto border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-6 text-xs text-slate-600">
                  <div className="text-center space-y-2 pb-4 border-b">
                    <h4 className="font-black text-base text-slate-800">RAPOR EVALUASI AKHIR SEMESTER</h4>
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold uppercase text-[9px] border border-emerald-200">
                      STATUS KELULUSAN: MEMENUHI SYARAT
                    </span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nama Siswa:</span>
                      <b className="text-slate-800">{studentUser?.nama}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">NISN:</span>
                      <b className="text-slate-800 font-mono">{studentUser?.nisn}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kelas Aktif:</span>
                      <b className="text-slate-800">{studentUser?.kelasId === '12' ? 'XII RPL (Fisika)' : 'Umum'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sikap Spiritual & Sosial:</span>
                      <b className="text-emerald-600">SANGAT BAIK (A)</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rata-Rata IPK Akhir:</span>
                      <b className="text-slate-800 text-sm font-black">{score} / 100</b>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <button 
                      onClick={() => Swal.fire('Cetak Rapor', `Mengunduh berkas PDF Rapor siswa: ${studentUser?.nama}`, 'success')} 
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 shadow"
                    >
                      <Printer className="w-4 h-4" /> Cetak Lembar Rapor PDF
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4 text-xs">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg uppercase">Cetak Rapor Hasil Evaluasi</h3>
                <p className="text-xs text-slate-400 mt-1">Cetak berkas nilai rapor semester ganjil bagi siswa terdaftar secara individual.</p>
              </div>
              <div className="w-48">
                <CustomDropdown
                  id="cetak-rapor-selected-kelas"
                  value={selectedKelas}
                  onChange={(val) => setSelectedKelas(val)}
                  options={kelasList.map(k => ({ value: k.id, label: `Kelas ${k.nama}` }))}
                  placeholder="Pilih Kelas..."
                  searchable={kelasList.length > 5}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/50 font-bold text-slate-500 border-b">
                  <tr>
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4">NISN</th>
                    <th className="p-4 text-center">Sikap</th>
                    <th className="p-4 text-center">IPK Rata-Rata</th>
                    <th className="p-4 text-center">Dokumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.map((s) => {
                    const score = 82 + Math.floor(Math.random() * 12);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-800 text-sm">{s.nama}</td>
                        <td className="p-4 font-mono text-slate-500">{s.nisn}</td>
                        <td className="p-4 text-center"><span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md font-bold">SANGAT BAIK</span></td>
                        <td className="p-4 text-center font-black text-slate-700">{score}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => Swal.fire('Cetak Rapor', `Mengunduh berkas PDF Rapor siswa: ${s.nama}`, 'success')} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg transition text-[10px] flex items-center gap-1 mx-auto">
                            <Printer className="w-3.5 h-3.5" /> Cetak Rapor
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeSubTab === 'ranking' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4 text-xs">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase">Peringkat & Klasemen Akademik</h3>
              <p className="text-xs text-slate-400 mt-1">Daftar peringkat prestasi siswa berprestasi berdasar kalkulasi IPK Rapor harian.</p>
            </div>
            <div className="w-48">
              <CustomDropdown
                id="peringkat-klasemen-selected-kelas"
                value={selectedKelas}
                onChange={(val) => setSelectedKelas(val)}
                options={kelasList.map(k => ({ value: k.id, label: `Kelas ${k.nama}` }))}
                placeholder="Pilih Kelas..."
                searchable={kelasList.length > 5}
              />
            </div>
          </div>

          {(() => {
            const filteredSiswa = siswaList.filter(s => getResolvedSiswaKelasId(s.kelasId) === selectedKelas || s.kelasId === selectedKelas);
            if (filteredSiswa.length === 0) {
              return (
                <div className="text-center py-12 text-slate-400 italic text-xs">
                  Belum ada data siswa di kelas yang dipilih untuk menampilkan peringkat.
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredSiswa.slice(0, 3).map((sw, idx) => (
                  <div key={sw.id || idx} className="border border-slate-200 bg-slate-50/20 rounded-3xl p-6 text-center space-y-3 relative overflow-hidden">
                    <span className="absolute top-2 right-2 text-xl font-black text-amber-500 opacity-20">#{idx + 1}</span>
                    <div className="w-12 h-12 bg-amber-500 text-white rounded-full mx-auto flex items-center justify-center font-bold">{idx + 1}</div>
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-sm">{sw.nama}</h5>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">NISN: {sw.nisn || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {activeSubTab === 'kenaikan' && (() => {
        const sourceSiswa = siswaList.filter(s => getResolvedSiswaKelasId(s.kelasId) === promSourceKelas && (s.status === 'AKTIF' || s.status === 'BELUM'));
        const isGrade12 = promSourceKelas === 'C12' || (kelasList.find(k => k.id === promSourceKelas)?.nama === '12' || false);
        
        // Dynamic active and previous year calculation
        const currentActiveYear = localStorage.getItem('ERP_academic_year') || '2026/2027';
        const parsePreviousYear = (activeYear: string): string => {
          const parts = activeYear.split('/');
          if (parts.length === 2) {
            const yr1 = parseInt(parts[0], 10);
            const yr2 = parseInt(parts[1], 10);
            if (!isNaN(yr1) && !isNaN(yr2)) {
              return `${yr1 - 1}/${yr2 - 1}`;
            }
          }
          return '2025/2026';
        };
        const previousYear = parsePreviousYear(currentActiveYear);

        // Temporal July Restriction
        const currentMonth = new Date().getMonth(); // 6 is July
        const isJuly = currentMonth === 6;
        const isLocked = !isJuly && !bypassJulyCheck;

        return (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
            <div className="border-b pb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg uppercase">Kenaikan Kelas & Kelulusan Akhir</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Kelola proses kenaikan kelas atau kelulusan siswa secara massal berdasarkan rombongan belajar asal.
                </p>
              </div>
            </div>

            {/* Locked Old Year Information Block */}
            <div className="p-4 bg-blue-50/60 border border-blue-100 text-blue-950 rounded-2xl text-xs flex items-center gap-3">
              <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded-md text-[10px]">TAHUN AJARAN BARU</span>
              <p className="font-semibold text-slate-700">
                Kenaikan Kelas dipetakan secara otomatis dari Tahun Ajaran Berjalan <span className="font-extrabold text-blue-700">{previousYear} (Locked)</span> ke Tahun Ajaran Baru <span className="font-extrabold text-emerald-700">{currentActiveYear} (Active Setup)</span>. Arsip tahun ajaran lampau dikunci secara permanen.
              </p>
            </div>

            {/* Analytics Summary Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
              <div className="bg-slate-50 border rounded-2xl p-4 space-y-1 relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-5 text-slate-900"><Users className="w-12 h-12" /></div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Total Siswa Aktif ({previousYear})</p>
                <p className="text-2xl font-black text-slate-800">
                  {siswaList.filter(s => s.status === 'AKTIF').length} <span className="text-xs text-slate-400 font-bold">Siswa</span>
                </p>
                <p className="text-[10px] text-slate-400">Terdaftar aktif belajar di Rombel berjalan</p>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-1 relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-5 text-emerald-900"><CheckCircle className="w-12 h-12" /></div>
                <p className="text-emerald-600 font-bold uppercase text-[10px] tracking-wider">Sudah Diproses Kenaikan ({currentActiveYear})</p>
                <p className="text-2xl font-black text-emerald-700">
                  {siswaList.filter(s => s.classHistory?.[currentActiveYear]).length} <span className="text-xs text-emerald-500 font-bold">Siswa</span>
                </p>
                <p className="text-[10px] text-emerald-600">Siswa yang telah dipromosikan ke jenjang baru</p>
              </div>
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-1 relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-5 text-amber-900"><AlertTriangle className="w-12 h-12" /></div>
                <p className="text-amber-700 font-bold uppercase text-[10px] tracking-wider">Belum Diproses Kenaikan</p>
                <p className="text-2xl font-black text-amber-800">
                  {siswaList.filter(s => s.status === 'AKTIF' && !s.classHistory?.[currentActiveYear]).length} <span className="text-xs text-amber-500 font-bold">Siswa</span>
                </p>
                <p className="text-[10px] text-amber-600">Siswa aktif {previousYear} yang belum diproses</p>
              </div>
            </div>

            {/* Temporal July Lock Block */}
            {isLocked && (
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl flex flex-col md:flex-row items-center gap-4 text-rose-900 shadow-sm">
                <AlertTriangle className="w-12 h-12 text-rose-600 shrink-0" />
                <div className="space-y-1.5 text-center md:text-left flex-1">
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">🔒 GAGAL MEMENUHI BATAS WAKTU (TEMPORAL SAFEGUARD)</h4>
                  <p className="text-xs text-rose-700 leading-relaxed">
                    Sistem mendeteksi bulan berjalan bukan <b>Juli</b>. Eksekusi Kenaikan Kelas di luar Juli dikunci demi memelihara integritas data transisi tahun ajaran baru sekolah dan mencegah kesalahan operasional.
                  </p>
                  <p className="text-[10px] text-rose-600 font-mono">
                    Aturan Enterprise: Transisi Rombel hanya boleh disahkan pada bulan Juli.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBypassJulyCheck(true);
                    Swal.fire({
                      title: 'Bypass Diaktifkan',
                      text: 'Bypass uji coba Lead Architect aktif. Anda dapat melakukan simulasi Kenaikan Kelas sekarang.',
                      icon: 'success',
                      confirmButtonColor: '#2563eb'
                    });
                  }}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition text-xs shadow-sm self-center shrink-0"
                >
                  Bypass Simulasi Lead Architect
                </button>
              </div>
            )}

            {/* Selection Source Class */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-80">
                <CustomDropdown
                  id="prom-source-kelas-select"
                  label="Pilih Kelas Asal (Rombel)"
                  value={promSourceKelas}
                  onChange={(val) => setPromSourceKelas(val)}
                  options={kelasList.filter(k => k.id !== 'Z').map((k) => ({
                    value: k.id,
                    label: `${k.jenjang} - Kelas ${k.nama} (${k.wali})`
                  }))}
                  placeholder="Pilih Rombel..."
                  searchable={kelasList.length > 5}
                />
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Pilih rombongan belajar asal siswa untuk memulai pengesahan draf keputusan kenaikan atau kelulusan semester akhir.
              </div>
            </div>

            {sourceSiswa.length === 0 ? (
              <div className="p-16 text-center border-2 border-dashed rounded-3xl space-y-3 bg-slate-50/30">
                <Users className="w-12 h-12 text-slate-300 mx-auto" />
                <h5 className="font-extrabold text-slate-700 text-sm">Tidak Ada Siswa Aktif</h5>
                <p className="text-xs text-slate-400">
                  Tidak ditemukan siswa dengan status aktif di rombel kelas yang dipilih.
                </p>
              </div>
            ) : (
              <div className={`space-y-4 ${isLocked ? 'opacity-40 pointer-events-none' : ''}`}>
                {/* Bulk Actions Header */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mr-2">Aksi Massal Rombel:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...promDecisions };
                      sourceSiswa.forEach(s => {
                        updated[s.id] = { status: 'NAIK', targetKelasId: getNextLogicalClassId(promSourceKelas) };
                      });
                      setPromDecisions(updated);
                      Swal.fire({ title: 'Berhasil!', text: 'Semua siswa di draf keputusan diset Naik Kelas.', icon: 'success', timer: 1500, showConfirmButton: false });
                    }}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1"
                  >
                    Set Semua Naik Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...promDecisions };
                      sourceSiswa.forEach(s => {
                        updated[s.id] = { status: 'TINGGAL', targetKelasId: promSourceKelas };
                      });
                      setPromDecisions(updated);
                      Swal.fire({ title: 'Berhasil!', text: 'Semua siswa di draf keputusan diset Mengulang Kelas.', icon: 'success', timer: 1500, showConfirmButton: false });
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1"
                  >
                    Set Semua Mengulang
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...promDecisions };
                      sourceSiswa.forEach(s => {
                        updated[s.id] = { status: 'LULUS', targetKelasId: 'Z' };
                      });
                      setPromDecisions(updated);
                      Swal.fire({ title: 'Berhasil!', text: 'Semua siswa di draf keputusan diset Lulus Alumni.', icon: 'success', timer: 1500, showConfirmButton: false });
                    }}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1"
                  >
                    Set Semua Lulus
                  </button>
                </div>

                <div className="overflow-x-auto min-h-[350px] pb-24">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-500 border-b">
                      <tr>
                        <th className="p-4 w-12 text-center">No</th>
                        <th className="p-4">Nama Siswa</th>
                        <th className="p-4 text-center">NISN</th>
                        <th className="p-4 text-center min-w-[210px]">Keputusan Akhir</th>
                        <th className="p-4 min-w-[220px]">Rombel / Kelas Tujuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sourceSiswa.map((s, idx) => {
                        const decision = promDecisions[s.id] || { status: isGrade12 ? 'LULUS' : 'NAIK', targetKelasId: getNextLogicalClassId(promSourceKelas) };
                        
                        // Decision options
                        const decisionOptions = [
                          { value: 'NAIK', label: '🟢 Naik Kelas' },
                          { value: 'TINGGAL', label: '🟡 Mengulang Kelas' },
                          { value: 'LANJUT', label: '🔵 Lanjut ke Jenjang Berikutnya' },
                          { value: 'LULUS', label: '🟣 Lulus Alumni' },
                          { value: 'PINDAH', label: '🌐 Pindah Sekolah' },
                          { value: 'KELUAR', label: '🔴 Keluar Sekolah' }
                        ];

                        // Target class options
                        let targetClassOptions: { value: string; label: string }[] = [];
                        if (decision.status === 'LULUS') {
                          targetClassOptions = [{ value: 'Z', label: '🟣 LULUS ALUMNI' }];
                        } else if (decision.status === 'TINGGAL' || decision.status === 'KELUAR' || decision.status === 'PINDAH') {
                          targetClassOptions = [{
                            value: promSourceKelas,
                            label: `Tetap di Kelas ${kelasList.find(k => k.id === promSourceKelas)?.nama || ''}`
                          }];
                        } else {
                          targetClassOptions = kelasList.filter(k => k.id !== 'Z').map((k) => ({
                            value: k.id,
                            label: `Kelas ${k.nama} (${k.jenjang})`
                          }));
                        }

                        const isTargetDisabled = decision.status === 'TINGGAL' || decision.status === 'LULUS' || decision.status === 'KELUAR' || decision.status === 'PINDAH';

                        return (
                          <tr key={s.id} className="hover:bg-slate-50 transition">
                            <td className="p-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-100 text-slate-700 rounded-full font-black flex items-center justify-center border border-slate-200 uppercase">
                                  {s.nama.slice(0, 2)}
                                </div>
                                <span className="font-extrabold text-slate-800 text-sm">{s.nama}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center font-mono text-slate-600">{s.nisn}</td>
                            <td className="p-4 text-center">
                              <div className="w-56 mx-auto">
                                <CustomDropdown
                                  id={`decision-status-${s.id}`}
                                  value={decision.status}
                                  onChange={(val) => {
                                    let targetId = decision.targetKelasId;
                                    if (val === 'TINGGAL' || val === 'KELUAR' || val === 'PINDAH') targetId = promSourceKelas;
                                    else if (val === 'LULUS') targetId = 'Z';
                                    else targetId = getNextLogicalClassId(promSourceKelas);

                                    setPromDecisions(prev => ({
                                      ...prev,
                                      [s.id]: { status: val as any, targetKelasId: targetId }
                                    }));
                                  }}
                                  options={decisionOptions}
                                  placeholder="Keputusan..."
                                />
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="w-56">
                                <CustomDropdown
                                  id={`decision-target-${s.id}`}
                                  value={decision.targetKelasId}
                                  disabled={isTargetDisabled}
                                  onChange={(val) => {
                                    setPromDecisions(prev => ({
                                      ...prev,
                                      [s.id]: { ...prev[s.id], targetKelasId: val }
                                    }));
                                  }}
                                  options={targetClassOptions}
                                  placeholder="Pilih Rombel Tujuan..."
                                  searchable={targetClassOptions.length > 6}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Save action section */}
                <div className="pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-xs text-slate-500 font-semibold">
                    Menampilkan <span className="text-slate-800 font-black">{sourceSiswa.length}</span> siswa aktif kelas asal.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        Swal.fire('Sistem Terkunci', 'Eksekusi dilarang karena Temporal Safeguard aktif. Silakan gunakan tombol Bypass Simulasi.', 'error');
                        return;
                      }

                      Swal.fire({
                        title: 'Simpan Keputusan Kenaikan Kelas?',
                        html: `Anda akan menerapkan keputusan kenaikan kelas/kelulusan untuk <b>${sourceSiswa.length} siswa</b> di rombel kelas asal ini.`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Ya, Terapkan!',
                        cancelButtonText: 'Batal',
                        confirmButtonColor: '#2563eb',
                        cancelButtonColor: '#64748b'
                      }).then((res: any) => {
                        if (res.isConfirmed) {
                          // Perform updates
                          const updatedSiswa = siswaList.map(s => {
                            if (getResolvedSiswaKelasId(s.kelasId) === promSourceKelas && (s.status === 'AKTIF' || s.status === 'BELUM')) {
                              const isGrade12 = promSourceKelas === 'C12' || (String(kelasList.find(k => k.id === promSourceKelas)?.nama || '').includes('12'));
                              const defaultStatus = isGrade12 ? 'LULUS' : 'NAIK';
                              const defaultTargetId = getNextLogicalClassId(promSourceKelas);
                              const dec = promDecisions[s.id] || { status: defaultStatus as any, targetKelasId: defaultTargetId };

                              const newKelasId = dec.status === 'LULUS' ? 'Z' : (dec.status === 'TINGGAL' || dec.status === 'KELUAR' || dec.status === 'PINDAH' ? promSourceKelas : dec.targetKelasId);
                              
                              let newStatus: any = s.status;
                              if (dec.status === 'LULUS') newStatus = 'LULUS';
                              else if (dec.status === 'KELUAR') newStatus = 'KELUAR';
                              else if (dec.status === 'PINDAH') newStatus = 'PINDAH';

                              let keteranganTransisi = 'Aktif Belajar';
                              if (dec.status === 'NAIK' || dec.status === 'LANJUT') {
                                keteranganTransisi = 'Naik Kelas';
                              } else if (dec.status === 'TINGGAL') {
                                keteranganTransisi = 'Mengulang';
                              } else if (dec.status === 'LULUS') {
                                keteranganTransisi = 'Lulus';
                              } else if (dec.status === 'PINDAH') {
                                keteranganTransisi = 'Pindah';
                              } else if (dec.status === 'KELUAR') {
                                keteranganTransisi = 'Keluar';
                              }

                              const currentActiveYear = localStorage.getItem('ERP_academic_year') || '2026/2027';
                              const parsePreviousYear = (activeYear: string): string => {
                                const parts = activeYear.split('/');
                                if (parts.length === 2) {
                                  const yr1 = parseInt(parts[0], 10);
                                  const yr2 = parseInt(parts[1], 10);
                                  if (!isNaN(yr1) && !isNaN(yr2)) {
                                    return `${yr1 - 1}/${yr2 - 1}`;
                                  }
                                }
                                return '2025/2026';
                              };
                              const previousYear = parsePreviousYear(currentActiveYear);

                              const classHistory = { ...(s.classHistory || {}) };
                              classHistory[previousYear] = promSourceKelas;
                              classHistory[currentActiveYear] = newKelasId;

                              const currentRiwayat = Array.isArray(s.riwayatAkademis) ? [...s.riwayatAkademis] : [];
                              const filteredRiwayat = currentRiwayat.filter(r => r.tahunAjaran !== previousYear && r.tahunAjaran !== currentActiveYear);
                              
                              filteredRiwayat.push({
                                tahunAjaran: previousYear,
                                kelasId: promSourceKelas,
                                status: s.status,
                                keterangan: keteranganTransisi
                              });
                              
                              filteredRiwayat.push({
                                tahunAjaran: currentActiveYear,
                                kelasId: newKelasId,
                                status: newStatus,
                                keterangan: dec.status === 'TINGGAL' ? 'Mengulang' : 'Aktif Belajar'
                              });

                              return {
                                ...s,
                                kelasId: newKelasId,
                                status: newStatus,
                                classHistory,
                                riwayatAkademis: filteredRiwayat
                              };
                            }
                            return s;
                          });

                          // Update users
                          const currentUsers = db.get<User>('users') || [];
                          const updatedUsers = currentUsers.map(u => {
                            const matchingSiswa = updatedSiswa.find(s => s.nisn === u.username);
                            if (matchingSiswa) {
                              return {
                                ...u,
                                kelasId: matchingSiswa.kelasId,
                                status: (matchingSiswa.status === 'LULUS' || matchingSiswa.status === 'KELUAR' || matchingSiswa.status === 'PINDAH') ? 'NONAKTIF' as const : u.status
                              };
                            }
                            return u;
                          });

                          db.set('siswa', updatedSiswa);
                          db.set('users', updatedUsers);
                          setSiswaList(updatedSiswa);

                          // Log action
                          const logs = db.get<any>('logs') || [];
                          const newLog = {
                            id: `LOG-${Date.now()}`,
                            ts: new Date().toISOString(),
                            who: user.name,
                            action: 'CLASS_PROMOTION',
                            meta: `Kenaikan Kelas/Kelulusan diproses dari Kelas ${kelasList.find(k => k.id === promSourceKelas)?.nama || ''} untuk ${sourceSiswa.length} siswa.`
                          };
                          db.set('logs', [newLog, ...logs]);

                          Swal.fire({
                            title: 'Berhasil!',
                            text: 'Keputusan Kenaikan Kelas & Kelulusan siswa telah disimpan dan diterapkan dengan sukses.',
                            icon: 'success',
                            confirmButtonColor: '#2563eb'
                          });
                        }
                      });
                    }}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Simpan & Terapkan Keputusan Akhir
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

declare const Swal: any;
export {};
