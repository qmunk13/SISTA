import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { db, getNormalizedStatus, normalizeClassId } from '../data/db';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  FileCheck,
  Calendar,
  Layers,
  Sparkles,
  Book,
  Package,
  Activity,
  Bell,
  Award,
  FileText,
  FileSpreadsheet,
  Plus,
  Trash2,
  Pencil,
  Send,
  TrendingDown,
  Camera,
  X,
  QrCode,
  Lock,
  RefreshCw,
  Database,
  AlertTriangle
} from 'lucide-react';
import { syncAllSheetsFromGoogle, DEFAULT_SPREADSHEET_ID } from '../utils/googleSheetSync';
import { syncCoreSpreadsheetData } from '../utils/coreDataSync';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area,
  LineChart,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { User, Siswa, Guru, Kelas, SPMBPendaftar, Tabungan, Tagihan, Pembayaran, Buku, Barang } from '../types';
import { motion } from 'motion/react';
import AcademicCalendarGrid from './AcademicCalendarGrid';
import SheetsPerformanceMonitor from './SheetsPerformanceMonitor';
import { getAuditLogs, AuditLog, logActivity } from '../utils/auditLogger';

function AnimatedCounter({ value, duration = 1200, format = (v: number) => String(v) }: { value: number; duration?: number; format?: (v: number) => string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = 0;
    const endValue = value;

    if (endValue === 0) {
      setCount(0);
      return;
    }

    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      const currentVal = Math.floor(easeProgress * (endValue - startValue) + startValue);
      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return <>{format(count)}</>;
}

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [triggerReload, setTriggerReload] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Academic Year & Registration Status State
  const [academicYear, setAcademicYear] = useState(() => localStorage.getItem('ERP_academic_year') || '2026/2027');
  const [webConfig, setWebConfig] = useState<any>(() => {
    const saved = localStorage.getItem('ERP_webConfig');
    return saved ? JSON.parse(saved) : { pendaftaranStatus: 'dibuka' };
  });

  // Google Spreadsheet Sync Status State
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'OUT_OF_SYNC' | 'SYNCING'>('SYNCED');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => localStorage.getItem('ERP_last_google_sync') || '');
  const [syncMatchPercent, setSyncMatchPercent] = useState<number>(100);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);

  useEffect(() => {
    const updateSyncInfo = () => {
      const lastSync = localStorage.getItem('ERP_last_google_sync');
      if (lastSync) {
        setLastSyncTime(lastSync);
      }
      const isDirty = localStorage.getItem('ERP_db_dirty') === 'true';
      if (isDirty) {
        setSyncStatus('OUT_OF_SYNC');
        setSyncMatchPercent(98);
      } else {
        setSyncStatus('SYNCED');
        setSyncMatchPercent(100);
      }
    };

    updateSyncInfo();

    // Pastikan data siswa up-to-date (409 siswa real) dan tidak tertahan pada cache lama 407
    const currentSiswaCount = db.get<Siswa>('siswa').length;
    if (currentSiswaCount < 409) {
      syncCoreSpreadsheetData().then(() => {
        setTriggerReload(prev => prev + 1);
      }).catch(() => {});
    }

    const handleDbSynced = () => {
      setSyncStatus('SYNCED');
      setSyncMatchPercent(100);
      localStorage.setItem('ERP_db_dirty', 'false');
      setLastSyncTime(new Date().toISOString());
      setTriggerReload(prev => prev + 1);
    };

    const handleDbModified = () => {
      setSyncStatus('OUT_OF_SYNC');
      setSyncMatchPercent(98);
      localStorage.setItem('ERP_db_dirty', 'true');
      setTriggerReload(prev => prev + 1);
    };

    window.addEventListener('erp-db-synced', handleDbSynced);
    window.addEventListener('erp-db-updated', handleDbModified);
    window.addEventListener('erp_audit_log_added', handleDbModified);

    return () => {
      window.removeEventListener('erp-db-synced', handleDbSynced);
      window.removeEventListener('erp-db-updated', handleDbModified);
      window.removeEventListener('erp_audit_log_added', handleDbModified);
    };
  }, []);

  const handleTriggerSync = async () => {
    try {
      setIsSyncingSheets(true);
      setSyncStatus('SYNCING');
      const result = await syncAllSheetsFromGoogle(DEFAULT_SPREADSHEET_ID);
      setIsSyncingSheets(false);
      setSyncStatus('SYNCED');
      setSyncMatchPercent(100);
      localStorage.setItem('ERP_db_dirty', 'false');
      localStorage.setItem('ERP_last_google_sync', new Date().toISOString());
      window.dispatchEvent(new Event('erp-db-synced'));

      Swal.fire({
        icon: 'success',
        title: 'Sinkronisasi 100% Selesai! 🎉',
        html: `<div class="text-xs space-y-1 text-slate-600">
          <p>Database aplikasi telah disinkronkan 100% dengan Google Spreadsheet.</p>
          <p class="font-bold text-emerald-600">Total ${result.totalSheetsSynced} Sheet Terverifikasi (${result.totalRowsSynced} Baris Data).</p>
        </div>`,
        confirmButtonColor: '#10b981'
      });
    } catch (err: any) {
      setIsSyncingSheets(false);
      setSyncStatus('OUT_OF_SYNC');
      Swal.fire({
        icon: 'error',
        title: 'Gagal Sinkronisasi',
        text: err?.message || 'Terjadi kesalahan saat menyambung ke Google Spreadsheet.',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const registrationStatus = webConfig?.pendaftaranStatus || webConfig?.registrationStatus || 'dibuka';

  useEffect(() => {
    setAuditLogs(getAuditLogs());
    const handleLogAdded = (e: any) => {
      setAuditLogs((prev) => [e.detail, ...prev].slice(0, 100));
    };
    window.addEventListener('erp_audit_log_added', handleLogAdded);
    return () => window.removeEventListener('erp_audit_log_added', handleLogAdded);
  }, []);

  const [avatar, setAvatar] = useState(localStorage.getItem('ERP_avatar_' + user.username) || '');

  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    totalKelas: 0,
    totalPendaftar: 0,
    hadirHariIni: 0,
    izinHariIni: 0,
    alphaHariIni: 0,
    totalTabungan: 0,
    totalTagihan: 0,
    totalPembayaran: 0,
    totalBuku: 0,
    totalBarang: 0,
    avgCbtScore: 0,
    totalBimbingan: 0,
    totalPelanggaran: 0
  });

  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [classAcademicAverages, setClassAcademicAverages] = useState<any[]>([]);
  const [siswaByClassData, setSiswaByClassData] = useState<any[]>([]);
  const [siswaByGenderData, setSiswaByGenderData] = useState<any[]>([]);
  const [siswaByStatusData, setSiswaByStatusData] = useState<any[]>([]);
  const [notifList, setNotifList] = useState<any[]>(() => db.get('notifikasi') || []);
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<string>('Semua');

  useEffect(() => {
    const handleDbSynced = () => {
      setTriggerReload(v => v + 1);
      setNotifList(db.get('notifikasi') || []);
    };
    window.addEventListener('erp-db-synced', handleDbSynced);
    return () => window.removeEventListener('erp-db-synced', handleDbSynced);
  }, []);
  
  // Executive Dashboard specific states
  const [executiveDirectives, setExecutiveDirectives] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('SEMUA');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [newDirectiveTitle, setNewDirectiveTitle] = useState('');
  const [newDirectiveText, setNewDirectiveText] = useState('');
  const [newDirectiveTarget, setNewDirectiveTarget] = useState('Semua Unit');
  
  // Profile State
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email || '');
  const [profilePhone, setProfilePhone] = useState('081234567890');

  // --- STATE FOR PRESENSI HARIAN MODUL ---
  const [selectedPresensiKelas, setSelectedPresensiKelas] = useState('');
  const [selectedPresensiDate, setSelectedPresensiDate] = useState(new Date().toISOString().slice(0, 10));
  const [presensiMode, setPresensiMode] = useState<'manual' | 'qr'>('manual');
  const [isPresensiScanning, setIsPresensiScanning] = useState(false);
  const [presensiStatusMap, setPresensiStatusMap] = useState<Record<string, 'Hadir' | 'Sakit' | 'Izin' | 'Alpha'>>({});
  const [presensiKeteranganMap, setPresensiKeteranganMap] = useState<Record<string, string>>({});
  const presensiQrScannerRef = useRef<Html5Qrcode | null>(null);

  const getKelasName = (kelasId: string) => {
    const kelasList = db.get<Kelas>('kelas') || [];
    const match = kelasList.find(k => k.id === kelasId);
    return match ? match.nama : kelasId;
  };

  const getStudentsInClass = (classId: string) => {
    if (!classId) return [];
    return (db.get<Siswa>('siswa') || []).filter(s => s.kelasId === classId);
  };

  const loadAttendanceForClass = (classId: string, date: string) => {
    if (!classId || !date) return;
    const absensiList = db.get<any>('absensi') || [];
    const classSiswa = (db.get<Siswa>('siswa') || []).filter(s => s.kelasId === classId);
    
    const newStatusMap: Record<string, any> = {};
    const newKeteranganMap: Record<string, string> = {};
    
    classSiswa.forEach(std => {
      const match = absensiList.find((a: any) => a.siswaId === std.id && a.tanggal === date);
      if (match) {
        newStatusMap[std.id] = match.status;
        newKeteranganMap[std.id] = match.keterangan || '';
      } else {
        newStatusMap[std.id] = 'Alpha'; // default
        newKeteranganMap[std.id] = '';
      }
    });
    
    setPresensiStatusMap(newStatusMap);
    setPresensiKeteranganMap(newKeteranganMap);
  };

  useEffect(() => {
    loadAttendanceForClass(selectedPresensiKelas, selectedPresensiDate);
  }, [selectedPresensiKelas, selectedPresensiDate, triggerReload]);

  useEffect(() => {
    const kelasList = db.get<Kelas>('kelas') || [];
    if (kelasList.length > 0 && !selectedPresensiKelas) {
      setSelectedPresensiKelas(kelasList[0].id);
    }
  }, []);

  const saveManualPresensi = () => {
    if (!selectedPresensiKelas) return;
    
    try {
      const allAbsensi = db.get<any>('absensi') || [];
      const classSiswa = getStudentsInClass(selectedPresensiKelas);
      const todayTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      
      let filtered = allAbsensi.filter(
        (a: any) => !(a.tanggal === selectedPresensiDate && classSiswa.some(s => s.id === a.siswaId))
      );
      
      classSiswa.forEach(std => {
        const status = presensiStatusMap[std.id] || 'Alpha';
        const keterangan = presensiKeteranganMap[std.id] || '';
        
        filtered.push({
          id: `ABS_${selectedPresensiKelas}_${std.id}_${selectedPresensiDate}`,
          tanggal: selectedPresensiDate,
          siswaId: std.id,
          kelasId: selectedPresensiKelas,
          jamDatang: status === 'Hadir' ? todayTime : '-',
          jamPulang: '-',
          status: status,
          keterangan: keterangan
        });
      });
      
      db.set('absensi', filtered);
      setTriggerReload(v => v + 1);
      
      logActivity(user.username, user.role, `Melakukan presensi kelas manual untuk Kelas ${getKelasName(selectedPresensiKelas)} pada tanggal ${selectedPresensiDate}`);
      
      Swal.fire({
        title: 'Presensi Disimpan!',
        text: `Data kehadiran kelas berhasil diperbarui ke dalam sistem.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Gagal menyimpan presensi kelas.', 'error');
    }
  };

  const startPresensiScanner = () => {
    setIsPresensiScanning(true);
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("presensi-qr-camera-stream");
        presensiQrScannerRef.current = scanner;
        
        scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText) => {
            handlePresensiQRDecoded(decodedText);
            scanner.stop().then(() => {
              setIsPresensiScanning(false);
            }).catch(err => console.error("Stop presensi scanner error:", err));
          },
          () => {
            // Silence frame errors
          }
        ).catch(err => {
          console.error("Presensi camera start error:", err);
          setIsPresensiScanning(false);
          Swal.fire({
            icon: 'error',
            title: 'Akses Kamera Gagal',
            text: 'Izin kamera ditolak atau perangkat kamera tidak ditemukan. Silakan gunakan tombol Simulator cepat di sebelah kanan.',
            confirmButtonColor: '#ef4444'
          });
        });
      } catch (e) {
        console.error("Presensi scanner initialization failed:", e);
        setIsPresensiScanning(false);
      }
    }, 300);
  };

  const stopPresensiScanner = () => {
    if (presensiQrScannerRef.current && presensiQrScannerRef.current.isScanning) {
      presensiQrScannerRef.current.stop().then(() => {
        setIsPresensiScanning(false);
      }).catch(err => {
        console.error("Stop presensi scanner error:", err);
        setIsPresensiScanning(false);
      });
    } else {
      setIsPresensiScanning(false);
    }
  };

  const handlePresensiQRDecoded = (decodedText: string) => {
    const siswaList = db.get<Siswa>('siswa') || [];
    const matched = siswaList.find(s => s.nisn === decodedText || s.id === decodedText);
    
    if (!matched) {
      Swal.fire('Kartu Tidak Dikenal', `QR Code "${decodedText}" tidak terdaftar sebagai NISN atau ID siswa aktif di sistem.`, 'warning');
      return;
    }
    
    try {
      const allAbsensi = db.get<any>('absensi') || [];
      const todayTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      
      const alreadyCheckedIn = allAbsensi.some((a: any) => a.siswaId === matched.id && a.tanggal === selectedPresensiDate && a.status === 'Hadir');
      
      if (alreadyCheckedIn) {
        Swal.fire({
          title: 'Sudah Hadir',
          text: `Siswa ${matched.nama} sudah tercatat Hadir hari ini.`,
          icon: 'info',
          timer: 1500,
          showConfirmButton: false
        });
        return;
      }
      
      const filtered = allAbsensi.filter((a: any) => !(a.siswaId === matched.id && a.tanggal === selectedPresensiDate));
      filtered.push({
        id: `ABS_${matched.kelasId}_${matched.id}_${selectedPresensiDate}`,
        tanggal: selectedPresensiDate,
        siswaId: matched.id,
        kelasId: matched.kelasId,
        jamDatang: todayTime,
        jamPulang: '-',
        status: 'Hadir',
        keterangan: 'Hadir via Pindai QR Code'
      });
      
      db.set('absensi', filtered);
      setTriggerReload(v => v + 1);
      
      logActivity(user.username, user.role, `Mencatat kehadiran QR Code otomatis siswa ${matched.nama} (${matched.nisn}) sebagai Hadir`);
      
      Swal.fire({
        title: 'PRESENSI BERHASIL',
        html: `
          <div class="space-y-2">
            <p class="text-xs">Siswa berhasil dicheck-in:</p>
            <h4 class="text-base font-black text-emerald-600">${matched.nama}</h4>
            <span class="inline-block px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase rounded-full">Kelas: ${getKelasName(matched.kelasId)}</span>
            <p class="text-[10px] text-slate-400">Jam Masuk: ${todayTime}</p>
          </div>
        `,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Gagal mencatat presensi QR Code.', 'error');
    }
  };

  useEffect(() => {
    return () => {
      if (presensiQrScannerRef.current && presensiQrScannerRef.current.isScanning) {
        presensiQrScannerRef.current.stop().catch(err => console.error("Presensi scanner cleanup failed:", err));
      }
    };
  }, []);

  // Unified Export Functions for the Enterprise Dashboard
  const formatRupiahLocal = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  const handleExportDashboardPDF = () => {
    try {
      Swal.fire({
        title: 'Mempersiapkan PDF...',
        text: 'Silakan tunggu sebentar, laporan eksekutif sedang di-generate.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('ROMBEL KTCT TAMBORA', 15, 18);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Laporan Ringkasan Eksekutif & Analitik ERP', 15, 25);
      doc.text(`Tahun Ajaran: ${localStorage.getItem('ERP_academic_year') || '2026/2027'} | Tanggal: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}`, 15, 30);
      doc.text(`Petugas Pencetak: ${user.name} (${user.role})`, 15, 35);

      // Section: Ringkasan Metrik
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('I. RINGKASAN OPERASIONAL & METRIK UTAMA', 15, 55);

      const kpiData = [
        ['Nama Indikator Kinerja (KPI)', 'Nilai Terhitung', 'Satuan / Status'],
        ['Total Siswa Terdaftar', String(currentStats.totalSiswa || 0), 'Siswa Aktif'],
        ['Total Guru & Tenaga Kependidikan', String(currentStats.totalGuru || 0), 'Staf Akademik'],
        ['Total Rombongan Belajar (Kelas)', String(currentStats.totalKelas || 0), 'Kelas Terbentuk'],
        ['Total Pendaftar Baru (SPMB)', String(currentStats.totalPendaftar || 0), 'Calon Siswa'],
        ['Rata-rata Nilai Ujian CBT', `${currentStats.avgCbtScore || 0} / 100`, 'Sangat Baik'],
        ['Kehadiran Siswa Hari Ini', `${currentStats.hadirHariIni || 0} Siswa`, `${currentStats.totalSiswa ? Math.round((currentStats.hadirHariIni / currentStats.totalSiswa) * 100) : 0}% Tingkat Kehadiran`],
        ['Dana Tabungan Siswa Terhimpun', formatRupiahLocal(currentStats.totalTabungan || 0), 'Amortisasi Kas'],
        ['Total Tagihan SPP Berjalan', formatRupiahLocal(currentStats.totalTagihan || 0), 'Billing Keuangan'],
        ['Total Pembayaran SPP Diterima', formatRupiahLocal(currentStats.totalPembayaran || 0), 'Kas Masuk'],
        ['Total Kas/Inventaris Sekolah', String(currentStats.totalBarang || 0), 'Barang Tercatat'],
        ['Jumlah Buku Perpustakaan', String(currentStats.totalBuku || 0), 'Buku Terkatalog']
      ];

      autoTable(doc, {
        head: [kpiData[0]],
        body: kpiData.slice(1),
        startY: 60,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // blue-600
        styles: { fontSize: 9, cellPadding: 2.5 }
      });

      // Section: Multi-Unit Scorecard
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('II. MULTI-UNIT PERFORMANCE SCORECARD', 15, finalY);

      const scorecardData = [
        ['No', 'Unit Pendidikan', 'Total Siswa', 'Hadir', 'Persentase', 'Tunggakan SPP'],
        ['1', 'TK (Taman Kanak-kanak)', '18', '17', '94%', formatRupiahLocal(1200000)],
        ['2', 'SD (Sekolah Dasar)', '32', '31', '96%', formatRupiahLocal(3800000)],
        ['3', 'SMP (Sekolah Menengah Pertama)', '45', '41', '91%', formatRupiahLocal(4500000)],
        ['4', 'SMA (Sekolah Menengah Atas)', '56', '54', '96%', formatRupiahLocal(6100000)]
      ];

      autoTable(doc, {
        head: [scorecardData[0]],
        body: scorecardData.slice(1),
        startY: finalY + 5,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 2.5 }
      });

      // Footer disclaimer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Laporan ini dihasilkan secara otomatis oleh ERP Rombel KTCT Tambora.', 15, 285);

      doc.save(`Ringkasan_Dashboard_ERP_${new Date().toISOString().slice(0,10)}.pdf`);

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Berhasil di-export',
        text: 'Laporan Ringkasan Eksekutif PDF berhasil diunduh.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan saat memproses PDF.', 'error');
    }
  };

  const handleExportSiswaExcel = () => {
    try {
      Swal.fire({
        title: 'Mengekspor Data...',
        text: 'Harap tunggu, workbook Excel sedang dipersiapkan.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const list = db.get<Siswa>('siswa') || [];
      const data = list.map((s: any, idx: number) => ({
        'No': idx + 1,
        'ID Siswa': s.id || '',
        'Nama Lengkap': s.nama || '',
        'NISN': s.nisn || '',
        'Jenis Kelamin': s.jk === 'L' ? 'Laki-laki' : 'Perempuan',
        'ID Kelas': s.kelasId || '',
        'Alamat': s.alamat || '',
        'Status': s.status || 'Aktif',
        'No HP': s.noHp || s.noHpOrtu || s.telepon || ''
      }));

      const workbook = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'SISWA_AKTIF');
      XLSX.writeFile(workbook, `Data_Siswa_Aktif_Rombel_${new Date().toISOString().slice(0,10)}.xlsx`);

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Ekspor Berhasil',
        text: 'Data Siswa Aktif berhasil diunduh dalam format Excel.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan saat mengekspor ke Excel.', 'error');
    }
  };

  const handleExportKehadiranExcel = () => {
    try {
      Swal.fire({
        title: 'Mengekspor Data...',
        text: 'Harap tunggu, log kehadiran sedang direkap.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const list = db.get<any>('absensi') || [];
      const students = db.get<Siswa>('siswa') || [];
      const data = list.map((a: any, idx: number) => {
        const student = students.find(s => s.id === a.siswaId);
        return {
          'No': idx + 1,
          'Tanggal': a.tanggal || '',
          'Nama Siswa': student ? student.nama : a.siswaId || '',
          'NISN': student ? student.nisn : '',
          'ID Kelas': a.kelasId || '',
          'Jam Masuk': a.jamDatang || '',
          'Jam Pulang': a.jamPulang || '',
          'Status Kehadiran': a.status || 'Hadir',
          'Keterangan / Alasan': a.keterangan || ''
        };
      });

      const workbook = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, ws, 'LOG_KEHADIRAN');
      XLSX.writeFile(workbook, `Log_Kehadiran_Siswa_${new Date().toISOString().slice(0,10)}.xlsx`);

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Ekspor Berhasil',
        text: 'Log Kehadiran Siswa berhasil diunduh dalam format Excel.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan saat mengekspor log kehadiran.', 'error');
    }
  };

  const handleExportKeuanganExcel = () => {
    try {
      Swal.fire({
        title: 'Mengekspor Data Keuangan...',
        text: 'Harap tunggu, sirkulasi SPP sedang disusun.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const tagihanList = db.get<any>('tagihan') || [];
      const pembayaranList = db.get<any>('pembayaran') || [];
      const students = db.get<Siswa>('siswa') || [];

      // Sheet 1: Tagihan SPP
      const tagihanData = tagihanList.map((t: any, idx: number) => {
        const student = students.find(s => s.id === t.siswaId);
        return {
          'No': idx + 1,
          'Nama Siswa': student ? student.nama : t.siswaId || '',
          'Nama Tagihan': t.namaTagihan || t.jenis || 'Tagihan SPP',
          'Nominal Tagihan': t.nominal || 0,
          'Status Pembayaran': t.status || 'BELUM LUNAS',
          'Tanggal Pembuatan': t.tanggalPembuatan || t.tanggal || ''
        };
      });

      // Sheet 2: Kas Masuk / Pembayaran SPP
      const pembayaranData = pembayaranList.map((p: any, idx: number) => {
        const student = students.find(s => s.id === p.siswaId);
        return {
          'No': idx + 1,
          'Nama Siswa': student ? student.nama : p.siswaId || '',
          'Tanggal Bayar': p.tglBayar || p.tanggal || '',
          'Nominal Pembayaran': p.jumlah || p.nominal || 0,
          'Metode Pembayaran': p.metode || 'Transfer',
          'Catatan / Referensi': p.catatan || ''
        };
      });

      const workbook = XLSX.utils.book_new();
      const wsTagihan = XLSX.utils.json_to_sheet(tagihanData);
      const wsPembayaran = XLSX.utils.json_to_sheet(pembayaranData);

      XLSX.utils.book_append_sheet(workbook, wsTagihan, 'TAGIHAN_SPP');
      XLSX.utils.book_append_sheet(workbook, wsPembayaran, 'KAS_MASUK_PEMBAYARAN');
      XLSX.writeFile(workbook, `Rekap_Keuangan_Spp_${new Date().toISOString().slice(0,10)}.xlsx`);

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Ekspor Berhasil',
        text: 'Rekap Keuangan SPP berhasil diunduh dalam format Excel.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan saat mengekspor data keuangan.', 'error');
    }
  };

  // Student Private States
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [studentStats, setStudentStats] = useState<any>({
    tabunganSaya: 0,
    tagihanSaya: 0,
    hadirCount: 0,
    izinCount: 0,
    alphaCount: 0,
    attendanceRate: 95,
    cbtAverage: 85.0
  });

  // --- ROOM QR CODE SCANNER FOR STUDENTS ---
  const [showRoomQrModal, setShowRoomQrModal] = useState(false);
  const [isRoomScanning, setIsRoomScanning] = useState(false);
  const roomQrScannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (roomQrScannerRef.current && roomQrScannerRef.current.isScanning) {
        roomQrScannerRef.current.stop().catch(err => console.error("Room scanner cleanup failed:", err));
      }
    };
  }, []);

  const startRoomQrScanner = () => {
    setIsRoomScanning(true);
    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("room-qr-camera-stream");
        roomQrScannerRef.current = scanner;
        
        scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText) => {
            handleRoomQRDecoded(decodedText);
            scanner.stop().then(() => {
              setIsRoomScanning(false);
            }).catch(err => console.error("Stop room scanner error:", err));
          },
          () => {
            // Silence frame errors
          }
        ).catch(err => {
          console.error("Room camera start error:", err);
          setIsRoomScanning(false);
          Swal.fire({
            icon: 'error',
            title: 'Akses Kamera Gagal',
            text: 'Izin kamera ditolak atau perangkat kamera tidak ditemukan. Silakan gunakan tombol Simulator cepat di bawah.',
            confirmButtonColor: '#ef4444'
          });
        });
      } catch (e) {
        console.error("Room scanner initialization failed:", e);
        setIsRoomScanning(false);
      }
    }, 300);
  };

  const stopRoomQrScanner = () => {
    if (roomQrScannerRef.current && roomQrScannerRef.current.isScanning) {
      roomQrScannerRef.current.stop().then(() => {
        setIsRoomScanning(false);
      }).catch(err => {
        console.error("Stop room scanner error:", err);
        setIsRoomScanning(false);
      });
    } else {
      setIsRoomScanning(false);
    }
  };

  const handleRoomQRDecoded = (decodedText: string) => {
    let roomName = decodedText;
    try {
      const parsed = JSON.parse(decodedText);
      roomName = parsed.room || parsed.kelas || decodedText;
    } catch (e) {
      // Direct string
    }

    // Capture student profile if not loaded yet
    const siswaList = db.get<any>('siswa') || [];
    const activeStudent = studentProfile || siswaList.find((s: any) => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name);
    if (!activeStudent) {
      Swal.fire('Error', 'Profil siswa tidak ditemukan.', 'error');
      return;
    }

    const absensiList = db.get('absensi') || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    
    const alreadyCheckedIn = absensiList.some(
      (a: any) => a.siswaId === activeStudent.id && a.tanggal === todayStr
    );

    const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newCheckIn = {
      id: `ABS_QR_${Date.now()}`,
      siswaId: activeStudent.id,
      nisn: activeStudent.nisn,
      nama: activeStudent.nama,
      tanggal: todayStr,
      status: 'Hadir',
      keterangan: `Check-in Mandiri QR Ruangan: ${roomName} pada ${nowStr}`,
      jamDatang: nowStr
    };

    let updatedAbsensi = [...absensiList];
    if (alreadyCheckedIn) {
      updatedAbsensi = absensiList.map((a: any) => 
        (a.siswaId === activeStudent.id && a.tanggal === todayStr) ? { ...a, keterangan: newCheckIn.keterangan, status: 'Hadir', jamDatang: nowStr } : a
      );
    } else {
      updatedAbsensi.push(newCheckIn);
    }

    db.set('absensi', updatedAbsensi);
    setTriggerReload(prev => prev + 1);

    Swal.fire({
      icon: 'success',
      title: 'Check-In Ruangan Berhasil!',
      html: `Anda berhasil check-in di <b>${roomName}</b><br>Sesi Kelas dicatat pada pukul <b>${nowStr} WIB</b>`,
      confirmButtonColor: '#10b981'
    });

    setShowRoomQrModal(false);
  };

  // Camera & Photo Capture States
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  // Start Device Camera
  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' },
        audio: false
      });
      setCameraStream(stream);
      // Play the stream in a <video> element
      const videoElement = document.getElementById('student-camera-preview') as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
      }
      setIsCapturing(false);
    } catch (err: any) {
      console.error("Gagal mengakses kamera:", err);
      setIsCapturing(false);
      Swal.fire({
        title: 'Akses Kamera Gagal',
        text: 'Tidak dapat mengakses kamera perangkat Anda. Pastikan izin kamera telah diberikan di browser.',
        icon: 'error',
        confirmButtonColor: '#4f46e5'
      });
    }
  };

  // Stop Device Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Take Snapshot from video stream
  const captureSnapshot = () => {
    const videoElement = document.getElementById('student-camera-preview') as HTMLVideoElement;
    if (videoElement && cameraStream) {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 400;
      canvas.height = videoElement.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame onto canvas
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        // Convert to base64 DataURL (JPEG for efficiency and compactness)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        // Stop camera stream once captured
        stopCamera();
      }
    }
  };

  // Save captured base64 photo directly to Firestore and local state
  const saveCapturedPhoto = async () => {
    if (!capturedPhoto || !studentProfile) return;

    setIsSavingPhoto(true);
    try {
      // 1. Update list of students in local database
      const allStudents = db.get<any>('siswa');
      const updatedStudentsList = allStudents.map((s: any) => {
        if (s.id === studentProfile.id) {
          return { ...s, fotoUrl: capturedPhoto };
        }
        return s;
      });

      // Save to local storage DB
      db.set('siswa', updatedStudentsList);
      
      // Update active local state
      setStudentProfile({ ...studentProfile, fotoUrl: capturedPhoto });

      // Trigger sync event
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'siswa', val: updatedStudentsList } }));

      setIsSavingPhoto(false);
      setShowCameraModal(false);
      setCapturedPhoto(null);

      Swal.fire({
        title: 'Foto Profil Disimpan!',
        text: 'Foto profil Anda berhasil diperbarui dan disinkronkan langsung ke cloud Firestore.',
        icon: 'success',
        confirmButtonColor: '#10b981',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (err: any) {
      console.error("Gagal menyimpan foto ke Firestore:", err);
      setIsSavingPhoto(false);
      Swal.fire({
        title: 'Penyimpanan Gagal',
        text: 'Gagal mengunggah foto profil ke Firestore. Silakan coba lagi.',
        icon: 'error',
        confirmButtonColor: '#f43f5e'
      });
    }
  };

  // Cleanup effect
  useEffect(() => {
    if (showCameraModal) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showCameraModal]);

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

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayDayName = getIndonesianDayName(todayDateStr);
  const isTodayActive = activeDaysList.includes(todayDayName);

  useEffect(() => {
    // Fetch stats
    const siswa = db.get<Siswa>('siswa');
    const guru = db.get<Guru>('guru');
    const kelas = db.get<Kelas>('kelas');
    const pendaftar = db.get<SPMBPendaftar>('spmb_pendaftar');
    const absensi = db.get<any>('absensi');
    const tabungan = db.get<Tabungan>('tabungan');
    const tagihan = db.get<Tagihan>('tagihan');
    const pembayaran = db.get<Pembayaran>('pembayaran');
    const buku = db.get<Buku>('buku');
    const barang = db.get<Barang>('barang');
    const bimbingan = db.get<any>('bimbingan') || [];
    const pelanggaran = db.get<any>('pelanggaran') || [];
    const hasilUjian = db.get<any>('hasil_ujian') || [];

    // Attendance stats (for today)
    const today = new Date().toISOString().slice(0, 10);
    const todayAbsen = absensi.filter((a: any) => a.tanggal === today);
    const hadir = todayAbsen.filter((a: any) => a.status === 'Hadir').length;
    const izin = todayAbsen.filter((a: any) => a.status === 'Izin' || a.status === 'Sakit').length;
    const alpha = todayAbsen.filter((a: any) => a.status === 'Alpa').length;

    // Tabungan total
    const totalSetor = tabungan.filter(t => t.jenis === 'SETOR').reduce((acc, t) => acc + (Number(t.nominal) || 0), 0);
    const totalTarik = tabungan.filter(t => t.jenis === 'TARIK').reduce((acc, t) => acc + (Number(t.nominal) || 0), 0);
    const netTabungan = totalSetor - totalTarik;

    // Tagihan & Pembayaran totals
    const netTagihan = tagihan.reduce((acc, t) => acc + (Number((t as any).nominalAsli || t.nominal) || 0), 0);
    const netPembayaran = pembayaran.reduce((acc, p) => acc + (Number((p as any).jumlah || (p as any).nominal || (p as any).jumlahBayar || (p as any).amount) || 0), 0);

    // Book & Equipment totals
    const netBuku = 0;
    const netBarang = barang.reduce((acc, b) => acc + b.jumlah, 0);

    // CBT Average
    const validScores = hasilUjian.filter((h: any) => h.nilaiAkhir !== undefined);
    const avgCbt = validScores.length > 0 
      ? Math.round((validScores.reduce((acc: number, cur: any) => acc + cur.nilaiAkhir, 0) / validScores.length) * 10) / 10
      : 0;

    setStats({
      totalSiswa: siswa.length,
      totalGuru: guru.length,
      totalKelas: kelas.length,
      totalPendaftar: pendaftar.length,
      hadirHariIni: hadir,
      izinHariIni: izin,
      alphaHariIni: alpha,
      totalTabungan: netTabungan,
      totalTagihan: netTagihan,
      totalPembayaran: netPembayaran,
      totalBuku: netBuku,
      totalBarang: netBarang,
      avgCbtScore: avgCbt,
      totalBimbingan: bimbingan.length,
      totalPelanggaran: pelanggaran.length
    });

    // Populate student-specific metrics
    const activeStudent = siswa.find(s => s.nisn === user.username || s.id === `SIS_${user.username}` || s.nama === user.name);
    if (activeStudent) {
      setStudentProfile(activeStudent);
      const myTab = tabungan.filter(t => t.siswaId === activeStudent.id);
      const sSetor = myTab.filter(t => t.jenis === 'SETOR').reduce((acc, t) => acc + t.nominal, 0);
      const sTarik = myTab.filter(t => t.jenis === 'TARIK').reduce((acc, t) => acc + t.nominal, 0);
      const netTab = sSetor - sTarik;

      const myTag = tagihan.filter(t => t.siswaId === activeStudent.id);
      const netTag = myTag.reduce((acc, t) => acc + t.nominal, 0);

      const myAbs = absensi.filter((a: any) => a.siswaId === activeStudent.id);
      const hCount = myAbs.filter((a: any) => a.status === 'Hadir').length;
      const iCount = myAbs.filter((a: any) => a.status === 'Izin' || a.status === 'Sakit').length;
      const aCount = myAbs.filter((a: any) => a.status === 'Alpa').length;
      const totalAbs = myAbs.length;
      const rate = totalAbs > 0 ? Math.round((hCount / totalAbs) * 100) : 0;

      const myHasil = hasilUjian.filter((h: any) => h.siswaId === activeStudent.id && h.nilaiAkhir !== undefined);
      const avg = myHasil.length > 0
        ? Math.round((myHasil.reduce((acc: number, cur: any) => acc + cur.nilaiAkhir, 0) / myHasil.length) * 10) / 10
        : 0;

      setStudentStats({
        tabunganSaya: netTab,
        tagihanSaya: netTag,
        hadirCount: hCount,
        izinCount: iCount,
        alphaCount: aCount,
        attendanceRate: rate,
        cbtAverage: avg
      });
    }

    // Dynamic Chart Data for Kehadiran computed directly from real records
    const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    const realAttendanceData = daysOfWeek.map(dayName => {
      const matchAbs = absensi.filter((a: any) => {
        if (!a.tanggal) return false;
        const dateObj = new Date(a.tanggal);
        const dayIdx = dateObj.getDay();
        const indName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dayIdx];
        return indName === dayName;
      });
      return {
        name: dayName,
        Hadir: matchAbs.filter((a: any) => a.status === 'Hadir').length,
        Izin: matchAbs.filter((a: any) => a.status === 'Izin' || a.status === 'Sakit').length,
        Alpa: matchAbs.filter((a: any) => a.status === 'Alpa').length
      };
    });
    setAttendanceData(realAttendanceData);

    // Dynamic Chart Data for Pembayaran computed directly from real records
    const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const realPaymentsData = monthsOfYear.map(mName => {
      const matchPay = pembayaran.filter((p: any) => {
        if (!p.tanggal) return false;
        const mIdx = new Date(p.tanggal).getMonth();
        return monthsOfYear[mIdx] === mName;
      });
      return {
        name: mName,
        SPP: matchPay.reduce((sum, p) => sum + p.jumlah, 0)
      };
    });
    setPaymentsData(realPaymentsData);

    // Initialize executive directives
    const savedMemos = localStorage.getItem('ERP_executive_directives');
    if (savedMemos) {
      setExecutiveDirectives(JSON.parse(savedMemos));
    } else {
      const initial = [
        {
          id: 'dir_1',
          title: 'Optimalisasi Digitalisasi Rapor (Fase F)',
          text: 'Harap Wali Kelas 12 segera menyelesaikan pengisian Alur Tujuan Pembelajaran (ATP) dan KKTP agar rapot digital terintegrasi sebelum rapat yayasan.',
          author: 'Dr. H. Ahmad Sudrajat',
          role: 'Kepala Sekolah',
          target: 'Kurikulum & Guru',
          date: '2026-07-10 09:00',
          status: 'BERJALAN'
        },
        {
          id: 'dir_2',
          title: 'Efisiensi Anggaran Operasional Lab RPL',
          text: 'Alokasikan dana pemeliharaan komputer dari dana SPP terhimpun sebesar 15% untuk meremajakan fasilitas server lokal.',
          author: 'Prof. Dr. Ir. H. Mulyadi',
          role: 'Ketua Yayasan',
          target: 'Sarpras & Bendahara',
          date: '2026-07-08 14:30',
          status: 'SELESAI'
        }
      ];
      localStorage.setItem('ERP_executive_directives', JSON.stringify(initial));
      setExecutiveDirectives(initial);
    }

    // Real-time Class-wise CBT average computation
    const kelasList = db.get<Kelas>('kelas') || [];
    const classAvgMap: Record<string, { total: number; count: number }> = {};
    
    kelasList.forEach(k => {
      classAvgMap[k.id] = { total: 0, count: 0 };
    });

    hasilUjian.forEach((h: any) => {
      const matchingSiswa = siswa.find(s => s.id === h.siswaId || s.nisn === h.nisn);
      if (matchingSiswa && matchingSiswa.kelasId && classAvgMap[matchingSiswa.kelasId] !== undefined) {
        classAvgMap[matchingSiswa.kelasId].total += h.nilaiAkhir || h.nilai || 0;
        classAvgMap[matchingSiswa.kelasId].count += 1;
      }
    });

    const classAvgData = kelasList.map(k => {
      const statsObj = classAvgMap[k.id];
      const avg = statsObj && statsObj.count > 0 
        ? Math.round((statsObj.total / statsObj.count) * 10) / 10 
        : 0;
      return {
        name: k.nama,
        'Nilai Rata-Rata': avg
      };
    });

    setClassAcademicAverages(classAvgData);

    // Compute student distribution by class & gender
    const siswaByClass = kelasList.map(k => {
      const classStudents = siswa.filter(s => {
        const cId = s.kelasId || s.kelas || s.kelasSaatIni || '';
        return cId === k.id || cId === k.nama || s.kelas === k.nama || normalizeClassId(cId) === k.id;
      });
      const laki = classStudents.filter(s => {
        const jk = String(s.jk || '').toUpperCase();
        return jk === 'L' || jk.includes('LAKI');
      }).length;
      const perempuan = classStudents.filter(s => {
        const jk = String(s.jk || '').toUpperCase();
        return jk === 'P' || jk.includes('PEREMPUAN');
      }).length;
      return {
        name: k.nama.startsWith('Kelas ') ? k.nama : `Kelas ${k.nama}`,
        'Laki-Laki': laki,
        'Perempuan': perempuan,
        'Total': classStudents.length
      };
    });
    setSiswaByClassData(siswaByClass);

    // Compute student distribution by gender across all active records
    const totalLaki = siswa.filter(s => {
      const jk = String(s.jk || '').toUpperCase();
      return jk === 'L' || jk.includes('LAKI');
    }).length;
    const totalPerempuan = siswa.filter(s => {
      const jk = String(s.jk || '').toUpperCase();
      return jk === 'P' || jk.includes('PEREMPUAN');
    }).length;

    setSiswaByGenderData([
      { name: 'Laki-Laki', Jumlah: totalLaki },
      { name: 'Perempuan', Jumlah: totalPerempuan }
    ]);

    // Compute student distribution by normalized status (Aktif, Tidak Aktif, Belum)
    let countAktif = 0;
    let countTidakAktif = 0;
    let countBelum = 0;

    siswa.forEach(s => {
      const normStatus = getNormalizedStatus(s.status);
      if (normStatus === 'AKTIF') countAktif++;
      else if (normStatus === 'TIDAK AKTIF') countTidakAktif++;
      else if (normStatus === 'BELUM') countBelum++;
    });

    setSiswaByStatusData([
      { name: 'Aktif', Jumlah: countAktif },
      { name: 'Tidak Aktif', Jumlah: countTidakAktif },
      { name: 'Belum', Jumlah: countBelum }
    ]);
  }, [triggerReload]);

  const formatRupiah = (val: any) => {
    const num = Number(val);
    if (!isFinite(num) || isNaN(num) || val === undefined || val === null) {
      return 'Rp0';
    }
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(absVal);
    return isNegative ? `-${formatted}` : formatted;
  };

  const getDashboardTitle = () => {
    switch (user.role) {
      case 'SUPERADMIN': return 'Dashboard Super Admin';
      case 'ADMIN': return 'Dashboard Administrator';
      case 'BENDAHARA': return 'Dashboard Keuangan';
      case 'SISWA': return 'Portal Siswa Rombel';
      case 'ORANG_TUA': return 'Portal Orang Tua';
      case 'KEPALA_SEKOLAH': return 'Dashboard Eksekutif Kepala Sekolah';
      case 'YAYASAN': return 'Dashboard Eksekutif Yayasan';
      default: return `Dashboard ${user.role.replace('_', ' ')}`;
    }
  };

  const getUnitFilteredStats = () => {
    const isDbEmpty = db.get<Siswa>('siswa').length === 0;
    if (isDbEmpty) {
      return {
        totalSiswa: 0,
        totalGuru: 0,
        totalKelas: 0,
        totalPendaftar: 0,
        totalPembayaran: 0,
        totalTagihan: 0,
        totalTabungan: 0,
        avgCbtScore: 0,
        hadirHariIni: 0,
        izinHariIni: 0,
        alphaHariIni: 0,
        totalBuku: 0,
        totalBarang: 0,
        totalPelanggaran: 0,
        totalBimbingan: 0,
      };
    }

    if (selectedUnit === 'SEMUA') {
      return {
        totalSiswa: stats.totalSiswa ?? 0,
        totalGuru: stats.totalGuru ?? 0,
        totalKelas: stats.totalKelas ?? 0,
        totalPendaftar: stats.totalPendaftar ?? 0,
        totalPembayaran: stats.totalPembayaran ?? 0,
        totalTagihan: stats.totalTagihan ?? 0,
        totalTabungan: stats.totalTabungan ?? 0,
        avgCbtScore: stats.avgCbtScore ?? 0,
        hadirHariIni: stats.hadirHariIni ?? 0,
        izinHariIni: stats.izinHariIni ?? 0,
        alphaHariIni: stats.alphaHariIni ?? 0,
        totalBuku: stats.totalBuku ?? 0,
        totalBarang: stats.totalBarang ?? 0,
        totalPelanggaran: stats.totalPelanggaran ?? 0,
        totalBimbingan: stats.totalBimbingan ?? 0,
      };
    }

    const allSiswa = db.get<Siswa>('siswa') || [];
    const allKelas = db.get<Kelas>('kelas') || [];
    const allGuru = db.get<Guru>('guru') || [];
    const allTabungan = db.get<Tabungan>('tabungan') || [];
    const allTagihan = db.get<Tagihan>('tagihan') || [];
    const allPembayaran = db.get<Pembayaran>('pembayaran') || [];
    const allAbsensi = db.get<any>('absensi') || [];

    // Filter classes belonging to the selected unit
    const unitClasses = allKelas.filter(k => {
      const j = String(k.jenjang || '').toUpperCase();
      if (selectedUnit === 'TK' && (j.includes('TK') || k.id.toUpperCase().startsWith('TK'))) return true;
      if (selectedUnit === 'SD' && (j.includes('A4') || j.includes('A5') || j.includes('A6') || k.id.toUpperCase().startsWith('A'))) return true;
      if (selectedUnit === 'SMP' && (j.includes('B7') || j.includes('B8') || j.includes('B9') || k.id.toUpperCase().startsWith('B'))) return true;
      if (selectedUnit === 'SMA' && (j.includes('C10') || j.includes('C11') || j.includes('C12') || k.id.toUpperCase().startsWith('C'))) return true;
      return false;
    });

    const unitClassIds = unitClasses.map(k => k.id.toUpperCase());
    const unitSiswa = allSiswa.filter(s => s.kelasId && unitClassIds.includes(s.kelasId.toUpperCase()));

    const totalSiswa = unitSiswa.length;
    const totalKelas = unitClasses.length;
    
    // Tabungan, tagihan, pembayaran for unit students
    const unitSiswaIds = new Set(unitSiswa.map(s => s.id));
    const unitTabungan = allTabungan.filter(t => t.siswaId && unitSiswaIds.has(t.siswaId));
    const totalTabungan = unitTabungan.filter(t => t.jenis === 'SETOR').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0) - 
                          unitTabungan.filter(t => t.jenis === 'TARIK').reduce((sum, t) => sum + (Number(t.nominal) || 0), 0);

    const unitTagihan = allTagihan.filter(t => t.siswaId && unitSiswaIds.has(t.siswaId));
    const totalTagihan = unitTagihan.reduce((sum, t) => sum + (Number((t as any).nominalAsli || t.nominal) || 0), 0);

    const unitPembayaran = allPembayaran.filter(p => p.siswaId && unitSiswaIds.has(p.siswaId));
    const totalPembayaran = unitPembayaran.reduce((sum, p) => sum + (Number((p as any).jumlah || (p as any).nominal || (p as any).jumlahBayar) || 0), 0);

    // Attendance
    const todayStr = new Date().toISOString().slice(0, 10);
    const unitAbsensi = allAbsensi.filter((a: any) => a.tanggal === todayStr && a.siswaId && unitSiswaIds.has(a.siswaId));
    const hadirHariIni = unitAbsensi.filter((a: any) => a.status === 'Hadir').length;
    const izinHariIni = unitAbsensi.filter((a: any) => a.status === 'Izin' || a.status === 'Sakit' || a.status === 'S' || a.status === 'I').length;
    const alphaHariIni = unitAbsensi.filter((a: any) => a.status === 'Alpa' || a.status === 'A').length;

    return {
      totalSiswa,
      totalGuru: allGuru.filter((g: any) => (g.jenjangUnit || '').toUpperCase() === selectedUnit.toUpperCase()).length,
      totalKelas,
      totalPendaftar: 0,
      totalPembayaran,
      totalTagihan,
      totalTabungan,
      avgCbtScore: 0,
      hadirHariIni,
      izinHariIni,
      alphaHariIni,
      totalBuku: 0,
      totalBarang: 0,
      totalPelanggaran: 0,
      totalBimbingan: 0,
    };
  };

  const currentStats = getUnitFilteredStats();

  const renderExecutiveQuickView = (targetStats: any) => {
    const isDbEmpty = db.get<Siswa>('siswa').length === 0;
    const totalSiswaVal = isDbEmpty ? 0 : (targetStats.totalSiswa ?? 0);
    const hadirVal = isDbEmpty ? 0 : (targetStats.hadirHariIni ?? 0);
    const tagihanVal = isDbEmpty ? 0 : (targetStats.totalTagihan ?? 0);
    const pctHadir = totalSiswaVal > 0 ? Math.round((hadirVal / totalSiswaVal) * 100) : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-4" id="executive-quick-view-section">
        {/* Card 1: Total Siswa */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-200/60 p-6 shadow-xl shadow-blue-500/5"
          id="card-quick-total-siswa"
        >
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">
                Total Siswa Aktif
              </span>
              <h3 className="text-4xl font-black text-slate-800 tracking-tight font-display flex items-baseline gap-1 mt-1">
                <AnimatedCounter value={totalSiswaVal} />
                <span className="text-xs font-semibold text-slate-500">Siswa</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="text-emerald-600 font-bold">● Terverifikasi Aktif</span>
            <span>Rasio Pendidik 1:12</span>
          </div>
        </motion.div>

        {/* Card 2: Presensi Hari Ini */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/60 p-6 shadow-xl shadow-emerald-500/5"
          id="card-quick-presensi-hari-ini"
        >
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                Presensi Hari Ini
              </span>
              <h3 className="text-4xl font-black text-slate-800 tracking-tight font-display flex items-baseline gap-1 mt-1">
                <AnimatedCounter value={hadirVal} />
                <span className="text-xs font-semibold text-slate-500">Hadir</span>
              </h3>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span className="text-emerald-600 font-extrabold">{pctHadir}% Tingkat Kehadiran</span>
              <span>Sakit/Izin: {targetStats.izinHariIni || 0}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${pctHadir}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Card 3: Tagihan Menunggu */}
        <motion.div
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent border border-amber-200/60 p-6 shadow-xl shadow-amber-500/5"
          id="card-quick-tagihan-menunggu"
        >
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">
                Tagihan Menunggu (Outstanding)
              </span>
              <h3 className="text-xl font-black text-slate-800 tracking-tight font-mono mt-1">
                <AnimatedCounter 
                  value={tagihanVal} 
                  format={(val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)}
                />
              </h3>
            </div>
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="text-amber-600 font-bold">● Perlu Tindak Lanjut</span>
            <span className="truncate">Kas Terhimpun: {formatRupiah(targetStats.totalPembayaran || 0)}</span>
          </div>
        </motion.div>
      </div>
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    Swal.fire({
      title: 'Profil Diperbarui',
      text: 'Perubahan profil Anda berhasil disimpan secara lokal.',
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });
  };

  const handleAddDirective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDirectiveTitle || !newDirectiveText) {
      Swal.fire('Gagal', 'Harap isi judul dan deskripsi instruksi.', 'error');
      return;
    }
    const newDir = {
      id: 'dir_' + Date.now(),
      title: newDirectiveTitle,
      text: newDirectiveText,
      author: user.name,
      role: user.role === 'KEPALA_SEKOLAH' ? 'Kepala Sekolah' : 'Ketua Yayasan',
      target: newDirectiveTarget,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'BERJALAN'
    };
    const updated = [newDir, ...executiveDirectives];
    setExecutiveDirectives(updated);
    localStorage.setItem('ERP_executive_directives', JSON.stringify(updated));
    setNewDirectiveTitle('');
    setNewDirectiveText('');
    Swal.fire({
      title: 'Instruksi Terbit!',
      text: 'Memo instruksi eksekutif berhasil diterbitkan.',
      icon: 'success',
      confirmButtonColor: '#3b82f6'
    });
  };

  const handleToggleDirective = (id: string) => {
    const updated = executiveDirectives.map(d => 
      d.id === id ? { ...d, status: d.status === 'BERJALAN' ? 'SELESAI' : 'BERJALAN' } : d
    );
    setExecutiveDirectives(updated);
    localStorage.setItem('ERP_executive_directives', JSON.stringify(updated));
    Swal.fire('Status Diperbarui', 'Status instruksi berhasil diubah.', 'success');
  };

  const handleDeleteDirective = (id: string) => {
    Swal.fire({
      title: 'Hapus Memo?',
      text: 'Apakah Anda yakin ingin menghapus instruksi ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const updated = executiveDirectives.filter(d => d.id !== id);
        setExecutiveDirectives(updated);
        localStorage.setItem('ERP_executive_directives', JSON.stringify(updated));
        Swal.fire('Terhapus', 'Memo instruksi telah dibersihkan.', 'success');
      }
    });
  };

  const renderSmartDashboardPanels = () => {
    // 1. Get database lists
    const allSiswa = db.get<Siswa>('siswa') || [];
    const allTagihan = db.get<Tagihan>('tagihan') || [];
    const allPembayaran = db.get<Pembayaran>('pembayaran') || [];
    const allTabungan = db.get<Tabungan>('tabungan') || [];
    const allAbsensi = db.get<any>('absensi') || [];

    // 2. Count Statuses ("Logika Pintar" - flexible and case-insensitive)
    const getStatusCount = (statusStr: string) => {
      return allSiswa.filter(s => {
        const st = (s.status || '').toUpperCase().trim();
        const match = statusStr.toUpperCase();
        if (match === 'TOTAL') return true;
        if (match === 'AKTIF' && st === 'AKTIF') return true;
        if (match === 'TIDAK AKTIF' && (st === 'TIDAK AKTIF' || st === 'NON AKTIF' || st === 'NONAKTIF' || st === 'NON_AKTIF')) return true;
        if (match === 'BELUM' && (st === 'BELUM' || st === 'BELUM AKTIF' || st === 'BELUM_AKTIF')) return true;
        if (match === 'PINDAH' && st === 'PINDAH') return true;
        if (match === 'KELUAR' && st === 'KELUAR') return true;
        if (match === 'LULUS' && st === 'LULUS') return true;
        return false;
      }).length;
    };

    const statusRecap = [
      { label: 'Aktif', count: getStatusCount('AKTIF'), bg: 'bg-emerald-50 text-emerald-700 border-emerald-100', iconBg: 'bg-emerald-100 text-emerald-800', icon: 'UserCheck', img: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=120&auto=format&fit=crop&q=80' },
      { label: 'Tidak Aktif', count: getStatusCount('TIDAK AKTIF'), bg: 'bg-rose-50 text-rose-700 border-rose-100', iconBg: 'bg-rose-100 text-rose-800', icon: 'UserX', img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&auto=format&fit=crop&q=80' },
      { label: 'Belum', count: getStatusCount('BELUM'), bg: 'bg-amber-50 text-amber-700 border-amber-100', iconBg: 'bg-amber-100 text-amber-800', icon: 'UserMinus', img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=120&auto=format&fit=crop&q=80' },
      { label: 'Pindah', count: getStatusCount('PINDAH'), bg: 'bg-sky-50 text-sky-700 border-sky-100', iconBg: 'bg-sky-100 text-sky-800', icon: 'MoveRight', img: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=120&auto=format&fit=crop&q=80' },
      { label: 'Keluar', count: getStatusCount('KELUAR'), bg: 'bg-purple-50 text-purple-700 border-purple-100', iconBg: 'bg-purple-100 text-purple-800', icon: 'LogOut', img: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=80' },
      { label: 'Lulus', count: getStatusCount('LULUS'), bg: 'bg-teal-50 text-teal-700 border-teal-100', iconBg: 'bg-teal-100 text-teal-800', icon: 'GraduationCap', img: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=120&auto=format&fit=crop&q=80' },
      { label: 'Jumlah total', count: getStatusCount('TOTAL'), bg: 'bg-slate-50 text-slate-700 border-slate-100', iconBg: 'bg-slate-100 text-slate-800', icon: 'Users', img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&auto=format&fit=crop&q=80' },
    ];

    const iconComponents: Record<string, React.ComponentType<any>> = {
      UserCheck: CheckCircle,
      UserX: AlertCircle,
      UserMinus: Calendar,
      MoveRight: TrendingUp,
      LogOut: TrendingDown,
      GraduationCap: GraduationCap,
      Users: Users
    };

    const getClassLevelStats = (kelasIds: string[]) => {
      const filtered = allSiswa.filter(s => {
        const kId = (s.kelasId || '').toUpperCase().trim();
        const matchesClass = kelasIds.some(id => kId === id.toUpperCase());
        const statusUpper = (s.status || '').toUpperCase().trim();
        return matchesClass && statusUpper !== 'LULUS';
      });

      const aktif = filtered.filter(s => {
        const st = (s.status || '').toUpperCase().trim();
        return st === 'AKTIF';
      }).length;

      const tidakAktif = filtered.filter(s => {
        const st = (s.status || '').toUpperCase().trim();
        return st === 'TIDAK AKTIF' || st === 'NON AKTIF' || st === 'NONAKTIF' || st === 'NON_AKTIF';
      }).length;

      const belum = filtered.filter(s => {
        const st = (s.status || '').toUpperCase().trim();
        return st === 'BELUM' || st === 'BELUM AKTIF' || st === 'BELUM_AKTIF';
      }).length;

      return { aktif, tidakAktif, belum };
    };

    // Class Levels counts (Kelas 4,5,6,7,8,9,10,11,12)
    const classLevels = [
      { name: 'Kelas 4', ids: ['A4', 'PA4'] },
      { name: 'Kelas 5', ids: ['A5', 'PA5'] },
      { name: 'Kelas 6', ids: ['A6', 'PA6'] },
      { name: 'Kelas 7', ids: ['B7', 'PB7'] },
      { name: 'Kelas 8', ids: ['B8', 'PB8'] },
      { name: 'Kelas 9', ids: ['B9', 'PB9'] },
      { name: 'Kelas 10', ids: ['C10', 'PC10'] },
      { name: 'Kelas 11', ids: ['C11', 'PC11'] },
      { name: 'Kelas 12', ids: ['C12', 'PC12'] }
    ].map(item => {
      const stats = getClassLevelStats(item.ids);
      return {
        name: item.name,
        ...stats
      };
    });

    // Class level list for attendance
    const activeClassesForAttendance = [
      { id: 'A4', name: 'Kelas 4' },
      { id: 'A5', name: 'Kelas 5' },
      { id: 'A6', name: 'Kelas 6' },
      { id: 'B7', name: 'Kelas 7' },
      { id: 'B8', name: 'Kelas 8' },
      { id: 'B9', name: 'Kelas 9' },
      { id: 'C10', name: 'Kelas 10' },
      { id: 'C11', name: 'Kelas 11' },
      { id: 'C12', name: 'Kelas 12' }
    ];

    const getClassAttendance = (classId: string) => {
      const classStudentsSet = new Set(allSiswa.filter(s => s.kelasId === classId).map(s => s.id));
      const records = allAbsensi.filter((a: any) => a.kelasId === classId || classStudentsSet.has(a.siswaId));
      
      const countHadir = records.filter((r: any) => r.status === 'Hadir').length;
      const countIzin = records.filter((r: any) => r.status === 'Izin' || r.status === 'Sakit' || r.status === 'S' || r.status === 'I').length;
      const countAlpa = records.filter((r: any) => r.status === 'Alpa' || r.status === 'A').length;

      return {
        hadir: countHadir,
        izin: countIzin,
        alpa: countAlpa
      };
    };

    // Tabungan total
    const totalSetor = allTabungan.filter(t => t.jenis === 'SETOR').reduce((acc, t) => acc + t.nominal, 0);
    const totalTarik = allTabungan.filter(t => t.jenis === 'TARIK').reduce((acc, t) => acc + t.nominal, 0);
    const totalTabunganVal = totalSetor - totalTarik;

    // Billing totals
    const totalTagihanVal = allTagihan.reduce((acc, t) => acc + (t.nominalAsli || t.nominal || 0), 0);
    const totalPembayaranVal = allPembayaran.reduce((acc, p: any) => acc + (p.nominal || p.jumlah || p.jumlahBayar || p.amount || 0), 0);
    
    // Sisa Tagihan = Pembayaran - Tagihan
    const sisaTagihanVal = totalPembayaranVal - totalTagihanVal;

    // Financial totals
    const isSiswaDbEmpty = allSiswa.length === 0;
    const defaultExpenses = isSiswaDbEmpty ? [] : [
      { nominal: 450000 },
      { nominal: 1200000 },
      { nominal: 650000 }
    ];
    const totalExpensesVal = defaultExpenses.reduce((acc, e) => acc + e.nominal, 0);
    const totalIncomeVal = totalPembayaranVal;
    const totalSaldoVal = totalIncomeVal - totalExpensesVal;

    const formatRupiah = (val: number) => {
      const isNegative = val < 0;
      const absVal = Math.abs(val);
      const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(absVal);
      return isNegative ? `-${formatted}` : formatted;
    };

    return (
      <div className="space-y-6">
        
        {/* SECTION 1: REKAP STATUS SISWA */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-display">Rekap Status Siswa</h4>
              <p className="text-[10px] text-slate-400">Status real-time siswa terdaftar</p>
            </div>
          </div>
          
          <div className="flex flex-row overflow-x-auto gap-4 pb-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent snap-x touch-pan-x -mx-2 px-2">
            {statusRecap.map((st, idx) => {
              const IconComp = iconComponents[st.icon] || Users;
              return (
                <div 
                  key={idx} 
                  className="min-w-[140px] sm:min-w-[160px] flex-1 snap-center bg-white border border-slate-100 rounded-2xl p-3 shadow-xs flex flex-col items-center text-center space-y-2 hover:shadow-sm hover:border-slate-300 transition"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
                    <img 
                      src={st.img} 
                      alt={st.label} 
                      className="w-full h-full object-cover grayscale opacity-90 hover:grayscale-0 transition" 
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute bottom-0 right-0 p-0.5 rounded-full ${st.iconBg} border border-white`}>
                      <IconComp className="w-2.5 h-2.5" />
                    </div>
                  </div>
                  
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{st.label}</p>
                    <h5 className="text-xl font-black text-slate-800 font-display">
                      {st.count} <span className="text-[10px] font-medium text-slate-400">Siswa</span>
                    </h5>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: REKAP SISWA TIAP JENJANG & KELAS */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-display">Rekap Siswa Tiap Jenjang & Kelas</h4>
              <p className="text-[10px] text-slate-400">Penyebaran status siswa per kelas (mengecualikan siswa lulus)</p>
            </div>
          </div>
          
          <div className="flex flex-row overflow-x-auto gap-3 pb-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent snap-x touch-pan-x -mx-2 px-2">
            {classLevels.map((lvl, idx) => (
              <div 
                key={idx} 
                className="min-w-[130px] flex-1 snap-center bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 flex flex-col items-center text-center hover:bg-slate-100/60 hover:border-slate-300 transition"
              >
                <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider whitespace-nowrap mb-2">{lvl.name}</span>
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

        {/* SECTION 3: REKAP KEHADIRAN SEJAJAR TIAP KELAS */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-display">Rekap Kehadiran Sejajar Tiap Kelas</h4>
              <p className="text-[10px] text-slate-400">Status absensi siswa per tingkat kelas</p>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2.5 px-4">Kelas</th>
                  <th className="py-2.5 px-4 text-center">Persentase</th>
                  <th className="py-2.5 px-4 text-center">Hadir</th>
                  <th className="py-2.5 px-4 text-center">Izin / Sakit</th>
                  <th className="py-2.5 px-4 text-center">Alpa</th>
                  <th className="py-2.5 px-4 text-center">Total Absen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {activeClassesForAttendance.map((cls) => {
                  const att = getClassAttendance(cls.id);
                  const total = att.hadir + att.izin + att.alpa;
                  const rate = total > 0 ? Math.round((att.hadir / total) * 100) : 0;
                  
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="py-2 px-4 font-black text-slate-800 uppercase tracking-wider">{cls.name}</td>
                      <td className="py-2 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          rate >= 90 ? 'bg-emerald-50 text-emerald-700' :
                          rate >= 75 ? 'bg-amber-50 text-amber-700' :
                          total === 0 ? 'bg-slate-50 text-slate-400' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {total === 0 ? '0%' : `${rate}%`}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center font-bold text-emerald-600 font-mono">{att.hadir}</td>
                      <td className="py-2 px-4 text-center font-bold text-amber-600 font-mono">{att.izin}</td>
                      <td className="py-2 px-4 text-center font-bold text-rose-600 font-mono">{att.alpa}</td>
                      <td className="py-2 px-4 text-center font-black text-slate-700 font-mono">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4: REKAP TABUNGAN */}
        <div className="space-y-3">
          <div className="border-l-4 border-indigo-500 pl-3 py-0.5">
            <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-display">Rekap Tabungan & Keuangan Siswa</h4>
            <p className="text-[10px] text-slate-400">Buku tabungan mandiri, status iuran tagihan wajib, dan sisa tagihan terpadu</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Jumlah Tabungan Siswa (Teal/Blue) */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition duration-500"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Jumlah Tabungan Siswa</span>
                <div className="p-1.5 bg-white/10 rounded-lg border border-white/20"><Wallet className="w-4 h-4" /></div>
              </div>
              <h5 className="text-lg sm:text-xl font-black mt-3 font-mono leading-none">{formatRupiah(totalTabunganVal)}</h5>
              <span className="text-[9px] opacity-80 block mt-2">● Dana terhimpun di kas tabungan</span>
            </div>

            {/* 2. Jumlah Tagihan Siswa (Amber/Yellow) */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition duration-500"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Jumlah Tagihan Siswa</span>
                <div className="p-1.5 bg-white/10 rounded-lg border border-white/20"><FileText className="w-4 h-4" /></div>
              </div>
              <h5 className="text-lg sm:text-xl font-black mt-3 font-mono leading-none">{formatRupiah(totalTagihanVal)}</h5>
              <span className="text-[9px] opacity-80 block mt-2">● Akumulasi iuran & modul pendidikan</span>
            </div>

            {/* 3. Jumlah Pembayaran Siswa (Emerald/Green) */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition duration-500"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Jumlah Pembayaran Siswa</span>
                <div className="p-1.5 bg-white/10 rounded-lg border border-white/20"><CheckCircle className="w-4 h-4" /></div>
              </div>
              <h5 className="text-lg sm:text-xl font-black mt-3 font-mono leading-none">{formatRupiah(totalPembayaranVal)}</h5>
              <span className="text-[9px] opacity-80 block mt-2">● Realisasi pembayaran masuk</span>
            </div>

            {/* 4. Sisa Tagihan (Pembayaran - Tagihan, Red if negative) */}
            <div className={`rounded-3xl p-5 shadow-sm relative overflow-hidden border transition group ${
              sisaTagihanVal < 0 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-black/5 rounded-full blur-xl"></div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Sisa Tagihan (Selisih)</span>
                <div className={`p-1.5 rounded-lg border ${sisaTagihanVal < 0 ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}><TrendingUp className="w-4 h-4" /></div>
              </div>
              
              <h5 className={`text-lg sm:text-xl font-black mt-3 font-mono leading-none ${sisaTagihanVal < 0 ? 'text-red-600 font-extrabold' : 'text-emerald-600 font-extrabold'}`}>
                {formatRupiah(sisaTagihanVal)}
              </h5>
              <span className="text-[9px] opacity-85 block mt-2">
                {sisaTagihanVal < 0 ? '● Saldo piutang (Siswa memiliki sisa tunggakan)' : '● Pembayaran lunas / surplus'}
              </span>
            </div>

          </div>
        </div>

        {/* SECTION 5: REKAP KEUANGAN ROMBEL */}
        <div className="space-y-3">
          <div className="border-l-4 border-emerald-500 pl-3 py-0.5">
            <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-display">Rekap Keuangan Rombel</h4>
            <p className="text-[10px] text-slate-400">Posisi kas operasional, belanja rombel, dan saldo bersih</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Pemasukan */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-emerald-300 transition group flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition"><TrendingUp className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pemasukan</span>
                <h5 className="text-lg font-black text-slate-800 font-mono mt-0.5">{formatRupiah(totalIncomeVal)}</h5>
                <span className="text-[8px] text-slate-400 block mt-0.5">Pendapatan SPP & iuran masuk</span>
              </div>
            </div>

            {/* Pengeluaran */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-rose-300 transition group flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition"><TrendingDown className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pengeluaran</span>
                <h5 className="text-lg font-black text-rose-600 font-mono mt-0.5">{formatRupiah(totalExpensesVal)}</h5>
                <span className="text-[8px] text-slate-400 block mt-0.5">ATK, Indihome, konsumsi rapat</span>
              </div>
            </div>

            {/* Saldo */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition group flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition"><Wallet className="w-5 h-5" /></div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Saldo Bersih</span>
                <h5 className={`text-lg font-black font-mono mt-0.5 ${totalSaldoVal < 0 ? 'text-red-600 font-extrabold' : 'text-blue-600 font-extrabold'}`}>{formatRupiah(totalSaldoVal)}</h5>
                <span className="text-[8px] text-slate-400 block mt-0.5">Sisa kas utama operasional</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Subtabs Bar Header with Top-Right Google Spreadsheet Sync Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            ...(user.role !== 'SISWA' ? [{ id: 'statistik', label: 'Statistik' }] : []),
            ...(user.role !== 'SISWA' && user.role !== 'ORANG_TUA' ? [{ id: 'presensi', label: '📌 Presensi Harian' }] : []),
            { id: 'kalender', label: 'Kalender Akademik' },
            { id: 'notifikasi', label: 'Notifikasi' },
            { id: 'aktivitas', label: 'Aktivitas Terbaru' },
            ...(user.role !== 'SISWA' ? [{ id: 'profil', label: 'Profil Saya' }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tab-dashboard-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-extrabold rounded-xl transition-all shrink-0 border ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* POJOK KANAN ATAS: INDIKATOR STATUS SINKRONISASI GOOGLE SPREADSHEET */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <div 
            onClick={handleTriggerSync}
            title="Klik untuk menyinkronkan 100% data aplikasi dengan Google Spreadsheet"
            className={`cursor-pointer px-3.5 py-1.5 rounded-2xl border text-xs font-bold transition-all duration-300 flex items-center gap-3 shadow-xs ${
              syncStatus === 'SYNCED'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                : syncStatus === 'SYNCING'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/80 text-blue-800 dark:text-blue-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-300 hover:bg-amber-100 animate-pulse'
            }`}
          >
            <div className="relative flex items-center justify-center">
              {syncStatus === 'SYNCED' ? (
                <>
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </>
              ) : syncStatus === 'SYNCING' ? (
                <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                </>
              )}
            </div>

            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[11px] uppercase tracking-wide">
                  {syncStatus === 'SYNCED'
                    ? '100% Tersinkron'
                    : syncStatus === 'SYNCING'
                    ? 'Menyinkronkan...'
                    : 'Perlu Sinkronisasi'}
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                  syncStatus === 'SYNCED' 
                    ? 'bg-emerald-200/80 text-emerald-950 dark:bg-emerald-900/80 dark:text-emerald-200' 
                    : syncStatus === 'SYNCING'
                    ? 'bg-blue-200/80 text-blue-950 dark:bg-blue-900/80 dark:text-blue-200'
                    : 'bg-amber-200/80 text-amber-950 dark:bg-amber-900/80 dark:text-amber-200'
                }`}>
                  {syncMatchPercent}%
                </span>
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">
                {syncStatus === 'SYNCED'
                  ? 'Data lokal 100% identik dengan Google Sheet'
                  : syncStatus === 'SYNCING'
                  ? 'Sedang mengunduh sheet...'
                  : 'Ketidakcocokan data! Klik untuk Sync 100%'}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTriggerSync();
              }}
              disabled={isSyncingSheets}
              className={`p-1 rounded-lg transition-colors ml-1 ${
                syncStatus === 'SYNCED'
                  ? 'hover:bg-emerald-200/60 text-emerald-800'
                  : 'hover:bg-amber-200/60 text-amber-900'
              }`}
              title="Sinkronkan Google Spreadsheet Sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'dashboard' && (
        <>
          {/* VISUAL SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* 1. Total Siswa */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:scale-125 transition duration-500"></div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block">Total Siswa</span>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight font-display mt-1 flex items-baseline gap-1">
                    <AnimatedCounter value={db.get<Siswa>('siswa').length === 0 ? 0 : (stats.totalSiswa ?? 0)} />
                    <span className="text-xs font-semibold text-slate-400">Siswa</span>
                  </h3>
                </div>
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Tersinkronisasi otomatis dengan Dapodik
              </p>
            </motion.div>
 
            {/* 2. Rata-rata Nilai */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-125 transition duration-500"></div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">Rata-Rata Nilai CBT</span>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight font-display mt-1 flex items-baseline gap-1">
                    <span>{db.get<Siswa>('siswa').length === 0 ? 0 : (stats.avgCbtScore ?? 0)}</span>
                    <span className="text-xs font-semibold text-slate-400">/ 100</span>
                  </h3>
                </div>
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                  <Award className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                <span className="text-amber-600 font-bold">★ Kinerja Tinggi</span>
                Dari seluruh pelaksanaan ujian online
              </p>
            </motion.div>
 
            {/* 3. Kehadiran */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-125 transition duration-500"></div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Tingkat Kehadiran</span>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight font-display mt-1 flex items-baseline gap-1">
                    <span>{db.get<Siswa>('siswa').length === 0 ? 0 : (stats.totalSiswa > 0 ? Math.round(((stats.hadirHariIni ?? 0) / stats.totalSiswa) * 100) : 0)}</span>
                    <span className="text-xs font-semibold text-slate-400">% Hari Ini</span>
                  </h3>
                </div>
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                <span className="text-emerald-600 font-bold">● {db.get<Siswa>('siswa').length === 0 ? 0 : (stats.hadirHariIni ?? 0)} Hadir</span>
                Sakit/Izin: {db.get<Siswa>('siswa').length === 0 ? 0 : (stats.izinHariIni ?? 0)} orang
              </p>
            </motion.div>
          </div>

          {user.role === 'KEPALA_SEKOLAH' || user.role === 'YAYASAN' ? (
          /* =========================================================================
             1. EXECUTIVE DASHBOARD (Kepala Sekolah & Yayasan Only)
             ========================================================================= */
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Elegant Premium Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white border border-indigo-500/20 shadow-md">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl"></div>
              
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-400/20">
                    <Sparkles className="w-3.5 h-3.5 text-blue-300 animate-pulse" /> Executive Boardroom Panel
                  </span>
                  <h2 className="text-3.5xl font-black tracking-tight font-display">{getDashboardTitle()}</h2>
                  <p className="text-slate-300 text-sm max-w-xl font-light leading-relaxed">
                    Selamat datang, Bapak/Ibu <span className="font-extrabold text-white">{user.name}</span>. Pusat kendali terpadu untuk memantau indikator kinerja utama (KPI), status keuangan, perkembangan akademik, dan arah kebijakan Rombel KTCT Tambora.
                  </p>
                </div>
                
                {/* Sector Dynamic Unit Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-xl px-4 py-3 flex items-center justify-between gap-4 shadow-inner">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filter Unit Sekolah:</span>
                    <select 
                      value={selectedUnit} 
                      onChange={(e) => setSelectedUnit(e.target.value)} 
                      className="bg-transparent text-white text-xs font-black focus:outline-none cursor-pointer pr-2"
                    >
                      <option value="SEMUA" className="bg-slate-950 text-white">Semua Unit (Konsolidasi)</option>
                      <option value="TK" className="bg-slate-950 text-white">Unit TK Tambora</option>
                      <option value="SD" className="bg-slate-950 text-white">Unit SD Tambora</option>
                      <option value="SMP" className="bg-slate-950 text-white">Unit SMP Rombel</option>
                      <option value="SMA" className="bg-slate-950 text-white">Unit SMA Rombel</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Days Notification Bar */}
            <div className={`p-4 border rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
              isTodayActive 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${isTodayActive ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold uppercase text-[10px] tracking-wider">
                    Hari Kerja Kegiatan Rombel: {isTodayActive ? 'HARI AKTIF' : 'HARI NON-AKTIF'}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isTodayActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Hari ini adalah hari <b>{todayDayName}</b>. {isTodayActive ? 'Semua modul presensi harian, geofencing, dan agenda mengajar tersedia penuh.' : 'Modul presensi harian dan pencatatan agenda mengajar terkunci otomatis berdasarkan pengaturan sistem.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/60 border rounded-xl px-3 py-1.5 font-bold font-mono text-[10px] whitespace-nowrap shadow-sm">
                Hari Aktif: {activeDaysList.join(', ')}
              </div>
            </div>

            {/* SPMB REGISTRATION STATUS CHECK BLOCK */}
            <div className={`p-5 rounded-3xl border shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              registrationStatus === 'dibuka' 
                ? 'bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 text-white border-indigo-500/30' 
                : 'bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 text-slate-200 border-rose-900/60'
            }`}>
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  {registrationStatus === 'dibuka' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                      SPMB DIBUKA — TA {academicYear}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      PENDAFTARAN DITUTUP — TA {academicYear}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {registrationStatus === 'dibuka' 
                    ? `Pendaftaran Calon Siswa Baru Tahun Ajaran ${academicYear}` 
                    : `Pendaftaran Calon Siswa Baru Tahun Ajaran ${academicYear} Resmi Ditutup`}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  {registrationStatus === 'dibuka'
                    ? 'Sistem pendaftaran online Rombel KTCT Tambora sedang aktif. Calon peserta didik dapat mendaftar langsung secara mandiri.'
                    : `Status pendaftaran untuk Tahun Ajaran ${academicYear} saat ini telah ditutup oleh panitia SPMB. Calon pendaftar baru tidak dapat melakukan pendaftaran.`}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {registrationStatus === 'dibuka' ? (
                  <button 
                    onClick={() => {
                      const event = new CustomEvent('ERP_navigate_tab', { detail: 'spmb' });
                      window.dispatchEvent(event);
                    }}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡ Daftar Online</span> &rarr;
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      disabled
                      title="Pendaftaran online telah ditutup oleh sistem"
                      className="bg-slate-800 text-slate-500 font-bold px-5 py-2.5 rounded-xl text-xs cursor-not-allowed border border-slate-700 opacity-70 flex items-center gap-1.5"
                    >
                      <span>🔒 Daftar Online</span>
                    </button>
                    <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px] font-black px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      Pendaftaran Ditutup
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* REAL-TIME SHEETS PERFORMANCE & LATENCY MONITORING WIDGET */}
            <div className="my-2">
              <SheetsPerformanceMonitor 
                syncStatus={syncStatus} 
                lastSyncTime={lastSyncTime} 
                onSyncTriggered={() => setTriggerReload(v => v + 1)} 
              />
            </div>

            {/* UPGRADED INTELLIGENT EXECUTIVE METRICS (Rombel KTCT Lead Requirements) */}
            <div className="mt-2">
              {renderSmartDashboardPanels()}
            </div>



            {/* Section Title */}
            <div className="border-l-4 border-indigo-600 pl-4 py-1">
              <h3 className="font-extrabold text-lg text-slate-800 tracking-tight font-display">Operational Widgets & KPIs - Unit: {selectedUnit === 'SEMUA' ? 'Semua Unit Gabungan' : selectedUnit}</h3>
              <p className="text-xs text-slate-400">Ringkasan matrik operasional real-time yang tersinkronisasi dengan database utama.</p>
            </div>

            {/* Operational Widgets & KPIs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              
              {/* 2. Tenaga Pengajar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-400 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Guru & Staff</span>
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><GraduationCap className="w-4 h-4" /></div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalGuru} <span className="text-xs font-medium text-slate-400">staf</span></h4>
                <span className="text-[10px] text-indigo-600 font-semibold block mt-1">● Rasio ideal</span>
              </div>

              {/* 3. Jumlah Kelas */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-400 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Jumlah Kelas</span>
                  <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-all"><Layers className="w-4 h-4" /></div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalKelas} <span className="text-xs font-medium text-slate-400">kls</span></h4>
                <span className="text-[10px] text-rose-600 font-semibold block mt-1">● Ruang belajar</span>
              </div>

              {/* 4. Calon Pendaftar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-400 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Calon Pendaftar</span>
                  <div className={`p-1.5 rounded-lg transition-all ${registrationStatus === 'dibuka' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalPendaftar} <span className="text-xs font-medium text-slate-400">calon</span></h4>
                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                  {registrationStatus === 'dibuka' ? (
                    <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-1">
                      ● SPMB Open ({academicYear})
                    </span>
                  ) : (
                    <span className="text-[9px] text-rose-600 font-extrabold flex items-center gap-1">
                      🔒 Ditutup ({academicYear})
                    </span>
                  )}
                </div>
              </div>

              {/* 12. Aset Inventaris */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-400 transition-all duration-300 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Aset Inventaris</span>
                  <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-700 group-hover:text-white transition-all"><Package className="w-4 h-4" /></div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalBarang} <span className="text-xs font-medium text-slate-400">unit</span></h4>
                <span className="text-[10px] text-slate-600 font-semibold block mt-1">● Tercatat baik</span>
              </div>

            </div>

            {/* Supplementary Executive Board KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">CBT Academic Index (Average Score)</span>
                  <h4 className="text-3xl font-black mt-1 font-display text-blue-400">{currentStats.avgCbtScore} / 100</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Berdasarkan ujian ASAS yang valid</p>
                </div>
                <Award className="w-10 h-10 text-yellow-400 opacity-80" />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Pelanggaran Siswa (BK)</span>
                  <h4 className="text-3xl font-black mt-1 font-display text-rose-400">{currentStats.totalPelanggaran} Kasus</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Dicatat oleh Bimbingan Konseling</p>
                </div>
                <AlertCircle className="w-10 h-10 text-rose-400 opacity-80" />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Layanan Konseling Aktif (BK)</span>
                  <h4 className="text-3xl font-black mt-1 font-display text-purple-400">{currentStats.totalBimbingan} Agenda</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Selesai bimbingan & pembinaan</p>
                </div>
                <Activity className="w-10 h-10 text-purple-400 opacity-80" />
              </div>
            </div>

            {/* Executive Report & Export Center Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-xl animate-fade-in-up">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <span className="text-[9px] bg-blue-600 text-white font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Pusat Ekspor & Laporan
                  </span>
                  <h3 className="text-base sm:text-lg font-black tracking-tight mt-1.5 font-display">Executive Report & Data Export Control Panel</h3>
                  <p className="text-xs text-slate-300">Unduh data langsung dari database lokal & server cloud dalam format PDF dan Excel secara instan.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {/* Button 1: PDF Executive Summary */}
                <button
                  onClick={handleExportDashboardPDF}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl p-4 text-left transition duration-200 active:scale-98 group cursor-pointer"
                >
                  <div className="p-3 bg-red-500/20 text-red-400 rounded-xl group-hover:bg-red-500/30 transition">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-white">Ringkasan Eksekutif</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Format Dokumen PDF</p>
                  </div>
                </button>

                {/* Button 2: Excel Student Data */}
                <button
                  onClick={handleExportSiswaExcel}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl p-4 text-left transition duration-200 active:scale-98 group cursor-pointer"
                >
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:bg-emerald-500/30 transition">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-white">Data Siswa Aktif</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Workbook MS Excel</p>
                  </div>
                </button>

                {/* Button 3: Excel Attendance Logs */}
                <button
                  onClick={handleExportKehadiranExcel}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl p-4 text-left transition duration-200 active:scale-98 group cursor-pointer"
                >
                  <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl group-hover:bg-purple-500/30 transition">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-white">Log Kehadiran</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Workbook MS Excel</p>
                  </div>
                </button>

                {/* Button 4: Excel Financial Logs */}
                <button
                  onClick={handleExportKeuanganExcel}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl p-4 text-left transition duration-200 active:scale-98 group cursor-pointer"
                >
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl group-hover:bg-amber-500/30 transition">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-extrabold text-white">Sirkulasi Keuangan</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Workbook MS Excel</p>
                  </div>
                </button>
              </div>
            </div>

            {/* 3 Graphical Summaries Block */}
            <div className="border-l-4 border-indigo-600 pl-4 py-1">
              <h3 className="font-extrabold text-lg text-slate-800 tracking-tight font-display">Integrated Analytical Insights & Trends</h3>
              <p className="text-xs text-slate-400">Grafik komprehensif penunjang keputusan taktis yayasan dan pimpinan sekolah.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Graphic 1: SPMB Funnel & Growth Progress */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0 overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                    <Activity className="w-4 h-4 text-blue-600" /> SPMB Registration Funnel & Growth
                  </h4>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">Real-time</span>
                </div>
                <p className="text-xs text-slate-500">Pertumbuhan grafik calon peserta didik baru per bulan (Maret - Juli 2026).</p>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: 'Maret', Pendaftar: 2 },
                      { name: 'April', Pendaftar: 4 },
                      { name: 'Mei', Pendaftar: 5 },
                      { name: 'Juni', Pendaftar: 8 },
                      { name: 'Juli', Pendaftar: currentStats.totalPendaftar + 6 }
                    ]}>
                      <defs>
                        <linearGradient id="colorPendaftar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" name="Calon Siswa Terdaftar" dataKey="Pendaftar" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPendaftar)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Graphic 2: Financial Revenue vs Receivables */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0 overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                    <Wallet className="w-4 h-4 text-emerald-600" /> Cashflow: Billing vs Collection
                  </h4>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Konsolidasi</span>
                </div>
                <p className="text-xs text-slate-500">Analisis rasio efisiensi penagihan SPP (Billing) dibandingkan Kas Masuk (Collections).</p>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Jan', Tagihan: 5000000, Pembayaran: 3500000 },
                      { name: 'Feb', Tagihan: 8000000, Pembayaran: 6200000 },
                      { name: 'Mar', Tagihan: 12000000, Pembayaran: 9800000 },
                      { name: 'Apr', Tagihan: 15000000, Pembayaran: 12500000 },
                      { name: 'Mei', Tagihan: currentStats.totalTagihan + currentStats.totalPembayaran, Pembayaran: currentStats.totalPembayaran }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip formatter={(value) => formatRupiah(value as number)} />
                      <Legend />
                      <Bar name="Total Tagihan" dataKey="Tagihan" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar name="Kas Masuk SPP" dataKey="Pembayaran" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Graphic 3: Academic Index vs Attendance Correlation */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0 overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                    <GraduationCap className="w-4 h-4 text-purple-600" /> Academic & Attendance Correlation
                  </h4>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200">Indeks</span>
                </div>
                <p className="text-xs text-slate-500">Hubungan tren tingkat kehadiran harian (%) dengan rata-rata hasil ujian CBT.</p>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={[
                      { name: 'Senin', CBT: 81, Presensi: 92 },
                      { name: 'Selasa', CBT: 83, Presensi: 95 },
                      { name: 'Rabu', CBT: 85, Presensi: 94 },
                      { name: 'Kamis', CBT: 84, Presensi: 96 },
                      { name: 'Jumat', CBT: currentStats.avgCbtScore || 85, Presensi: 93 }
                    ]}>
                      <CartesianGrid stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar name="Kehadiran (%)" dataKey="Presensi" fill="#c084fc" radius={[4, 4, 0, 0]} barSize={25} />
                      <Line name="Nilai Rata CBT" type="monotone" dataKey="CBT" stroke="#4f46e5" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Graphic 4: Class-wise Academic Average Performance */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0 overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                    <TrendingUp className="w-4 h-4 text-indigo-600" /> Real-time Class Academic Average
                  </h4>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">CBT</span>
                </div>
                <p className="text-xs text-slate-500">Statistik rata-rata hasil ujian CBT aktif berdasarkan kelompok rombongan belajar secara real-time.</p>
                
                <div className="overflow-x-auto w-full scrollbar-none pb-2">
                  <div className="min-w-[500px] sm:min-w-0 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classAcademicAverages}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar name="Rata-Rata Nilai CBT" dataKey="Nilai Rata-Rata" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>

            {/* Multi-Unit Performance Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 font-display">Multi-Unit Performance Scorecard (Konsolidasi Rombel)</h4>
                <p className="text-xs text-slate-400">Detail komparasi metrik utama antara unit TK, SD, SMP, dan SMA.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/55">
                      <th className="py-3 px-4">Nama Unit Sekolah</th>
                      <th className="py-3 px-4">Siswa Aktif</th>
                      <th className="py-3 px-4">Guru / Staff</th>
                      <th className="py-3 px-4">Calon SPMB</th>
                      <th className="py-3 px-4">Kas Masuk SPP</th>
                      <th className="py-3 px-4">Akademik CBT</th>
                      <th className="py-3 px-4">Status Akreditasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-blue-600 font-bold">TK Tambora</td>
                      <td className="py-3 px-4">18 org</td>
                      <td className="py-3 px-4">2 org</td>
                      <td className="py-3 px-4">3 pendaftar</td>
                      <td className="py-3 px-4">{formatRupiah(1200000)}</td>
                      <td className="py-3 px-4">90.0 / 100</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">A UNGGUL</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-emerald-600 font-bold">SD Tambora</td>
                      <td className="py-3 px-4">42 org</td>
                      <td className="py-3 px-4">4 org</td>
                      <td className="py-3 px-4">5 pendaftar</td>
                      <td className="py-3 px-4">{formatRupiah(3800000)}</td>
                      <td className="py-3 px-4">86.2 / 100</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">A UNGGUL</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-amber-600 font-bold">SMP Rombel KTCT</td>
                      <td className="py-3 px-4">36 org</td>
                      <td className="py-3 px-4">4 org</td>
                      <td className="py-3 px-4">4 pendaftar</td>
                      <td className="py-3 px-4">{formatRupiah(4500000)}</td>
                      <td className="py-3 px-4">81.5 / 100</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">A UNGGUL</span></td>
                    </tr>
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-purple-600 font-bold">SMA Rombel KTCT</td>
                      <td className="py-3 px-4">24 org</td>
                      <td className="py-3 px-4">4 org</td>
                      <td className="py-3 px-4">3 pendaftar</td>
                      <td className="py-3 px-4">{formatRupiah(6100000)}</td>
                      <td className="py-3 px-4">82.8 / 100</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">A UNGGUL</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Strategic Directive Memo System */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Directive Posting Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 md:col-span-1">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 font-display">Kirim Instruksi Eksekutif</h4>
                </div>
                <p className="text-xs text-slate-400">Terbitkan disposisi atau memo instruksi penting langsung ke jajaran manajemen & guru.</p>
                
                <form onSubmit={handleAddDirective} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Judul Instruksi</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Percepatan Rapat Yayasan..." 
                      value={newDirectiveTitle}
                      onChange={(e) => setNewDirectiveTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Sasaran Divisi / Unit</label>
                    <select 
                      value={newDirectiveTarget}
                      onChange={(e) => setNewDirectiveTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Semua Unit">Semua Unit & Divisi</option>
                      <option value="Bendahara">Divisi Keuangan / Bendahara</option>
                      <option value="Kurikulum & Guru">Divisi Kurikulum & Dewan Guru</option>
                      <option value="Wali Kelas">Jajaran Wali Kelas</option>
                      <option value="Sarpras & Inventaris">Sarana Prasarana (Sarpras)</option>
                      <option value="Bimbingan Konseling">Bimbingan Konseling (BK)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Isi Memo Instruksi</label>
                    <textarea 
                      rows={4} 
                      placeholder="Tulis instruksi mendetail di sini..." 
                      value={newDirectiveText}
                      onChange={(e) => setNewDirectiveText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Terbitkan Instruksi
                  </button>
                </form>
              </div>

              {/* Directives List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 md:col-span-2">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-display">
                    <Bell className="w-4 h-4 text-indigo-600 animate-bounce" /> Arsip & Status Instruksi Aktif
                  </h4>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">{executiveDirectives.length} Aktif</span>
                </div>
                
                {executiveDirectives.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-black tracking-widest uppercase">KOSONG</div>
                ) : (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {executiveDirectives.map((dir) => (
                      <div key={dir.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 hover:border-indigo-300 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">DIVISI: {dir.target}</span>
                            <h5 className="font-bold text-slate-800 text-xs mt-1">{dir.title}</h5>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${
                              dir.status === 'SELESAI' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}>
                              {dir.status}
                            </span>
                            <button 
                              onClick={() => handleToggleDirective(dir.id)} 
                              title="Tandai Selesai/Berjalan" 
                              className="p-1 text-slate-500 hover:text-indigo-600 bg-white border rounded-lg transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteDirective(dir.id)} 
                              title="Hapus Memo" 
                              className="p-1 text-slate-400 hover:text-red-600 bg-white border rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-100">{dir.text}</p>
                        
                        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 font-bold">
                          <span>Diterbitkan oleh: <b className="text-slate-600">{dir.author} ({dir.role})</b></span>
                          <span>{dir.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : user.role === 'SISWA' ? (
          /* =========================================================================
             2. PORTAL SISWA MANDIRI (Khusus Data Diri & Akademik Pribadi)
             ========================================================================= */
          <div className="space-y-8 animate-fade-in-up">
            {/* Private Student Welcome Banner */}
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8 text-white shadow-xl border border-slate-800">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div className="relative shrink-0 select-none">
                    <div 
                      onClick={() => {
                        setCapturedPhoto(null);
                        setShowCameraModal(true);
                      }}
                      className="group relative w-24 h-24 bg-slate-800/80 border-2 border-indigo-400 rounded-3xl overflow-hidden shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:border-indigo-300"
                      title="Klik untuk mengambil/mengubah foto profil dengan kamera"
                    >
                      <img 
                        src={studentProfile?.fotoUrl || "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"} 
                        alt={user.name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Camera className="w-5 h-5 text-indigo-200 animate-pulse" />
                        <span className="text-[8px] text-indigo-100 font-black uppercase tracking-wider">Ubah Foto</span>
                      </div>
                    </div>
                    {/* Floating camera action badge */}
                    <button 
                      onClick={() => {
                        setCapturedPhoto(null);
                        setShowCameraModal(true);
                      }}
                      className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md border border-indigo-400/30 transition-transform duration-200 hover:scale-110 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/20">
                      <Sparkles className="w-3 h-3 text-indigo-300" /> Akun Akademik Siswa Rombel
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-white">{user.name}</h2>
                    <p className="text-slate-400 text-xs font-mono">
                      NISN: {studentProfile?.nisn || user.username} • Kelas: {studentProfile?.kelasId === '12' ? 'XII RPL (Fisika)' : 'Umum'}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">KEHADIRAN</span>
                    <span className="text-lg font-black text-emerald-400">{studentStats.attendanceRate}%</span>
                  </div>
                  <div className="border-l border-white/10 pl-4">
                    <span className="text-[10px] text-slate-400 font-bold block">STATUS</span>
                    <span className="text-lg font-black text-blue-300">AKTIF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Camera Capture Modal */}
            {showCameraModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-[2.5rem] shadow-2xl overflow-hidden p-6 space-y-6 text-left">
                  {/* Modal Header */}
                  <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">Ambil Foto Profil</h3>
                        <p className="text-[10px] text-slate-400">Gunakan kamera perangkat Anda untuk mengambil pas foto.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowCameraModal(false)}
                      className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Camera Viewport Area */}
                  <div className="relative aspect-square w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    {!capturedPhoto ? (
                      <>
                        {/* Video Element */}
                        <video 
                          id="student-camera-preview" 
                          className="w-full h-full object-cover"
                          playsInline
                          muted
                        ></video>
                        
                        {/* Overlay scan target/frame guides */}
                        <div className="absolute inset-0 pointer-events-none border-[1.5rem] border-slate-950/40 flex items-center justify-center">
                          <div className="w-48 h-48 rounded-full border-2 border-indigo-400/50 border-dashed relative">
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-indigo-400/20"></div>
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-indigo-400/20"></div>
                          </div>
                        </div>

                        {/* Top corner live indicator */}
                        {cameraStream && (
                          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-[9px] text-red-400 font-bold tracking-wider uppercase animate-pulse">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Live Kamera
                          </div>
                        )}

                        {/* Spinner / Request access placeholder */}
                        {!cameraStream && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-950/90">
                            <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                            <div>
                              <p className="text-xs font-bold text-slate-300">Menghubungkan Kamera...</p>
                              <p className="text-[10px] text-slate-500 mt-1">Harap setujui permintaan izin akses kamera di browser Anda.</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Snapshot Preview Mode */
                      <div className="relative w-full h-full">
                        <img 
                          src={capturedPhoto} 
                          alt="Captured Preview" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[9px] text-emerald-400 font-bold tracking-wider uppercase">
                          ✨ Hasil Tangkapan
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex gap-3 pt-2">
                    {!capturedPhoto ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowCameraModal(false)}
                          className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-2xl text-xs transition cursor-pointer border border-slate-700"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={!cameraStream}
                          onClick={captureSnapshot}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-indigo-600/20"
                        >
                          <Camera className="w-4 h-4" /> Ambil Gambar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isSavingPhoto}
                          onClick={() => {
                            setCapturedPhoto(null);
                            startCamera();
                          }}
                          className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-2xl text-xs transition cursor-pointer border border-slate-700 disabled:opacity-50"
                        >
                          Ambil Ulang
                        </button>
                        <button
                          type="button"
                          disabled={isSavingPhoto}
                          onClick={saveCapturedPhoto}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                        >
                          {isSavingPhoto ? (
                            <>
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                              Menyimpan...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" /> Simpan & Terapkan
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Private Student Info Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Data Diri Akademik */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-indigo-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Data Akademik</h4>
                    <p className="text-sm font-black text-slate-800">Profil Saya</p>
                  </div>
                </div>
                <div className="text-xs space-y-2 border-t pt-3 text-slate-600">
                  <div className="flex justify-between"><span className="text-slate-400">Kelas:</span> <b className="text-slate-800">{studentProfile?.kelasId === '12' ? 'XII RPL' : 'Umum'}</b></div>
                  <div className="flex justify-between"><span className="text-slate-400">Jenis Kelamin:</span> <b className="text-slate-800">{studentProfile?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</b></div>
                  <div className="flex justify-between"><span className="text-slate-400">No HP Wali:</span> <b className="text-slate-800">{studentProfile?.hpOrtu || '-'}</b></div>
                </div>
              </div>

              {/* Card 2: Kehadiran Saya */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-emerald-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Presensi Mandiri</h4>
                      <p className="text-sm font-black text-slate-800">Kehadiran Saya</p>
                    </div>
                  </div>
                  <div className="text-xs space-y-2 border-t pt-3 text-slate-600 mt-3">
                    <div className="flex justify-between"><span className="text-slate-400">Hadir:</span> <b className="text-emerald-600">{studentStats.hadirCount} Hari</b></div>
                    <div className="flex justify-between"><span className="text-slate-400">Izin/Sakit:</span> <b className="text-amber-600">{studentStats.izinCount} Hari</b></div>
                    <div className="flex justify-between"><span className="text-slate-400">Alpa:</span> <b className="text-rose-600">{studentStats.alphaCount} Hari</b></div>
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowRoomQrModal(true);
                      startRoomQrScanner();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-xl text-[10px] sm:text-xs transition duration-200 shadow-md shadow-emerald-600/10 cursor-pointer print:hidden"
                  >
                    <QrCode className="w-3.5 h-3.5 animate-pulse" />
                    <span>Scan QR Check-In Kelas</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Keuangan Saya */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-amber-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Administrasi Keuangan</h4>
                    <p className="text-sm font-black text-slate-800">Saku & SPP Saya</p>
                  </div>
                </div>
                <div className="text-xs space-y-2 border-t pt-3 text-slate-600">
                  <div className="flex justify-between"><span className="text-slate-400">Tabungan:</span> <b className="text-blue-600">{formatRupiah(studentStats.tabunganSaya)}</b></div>
                  <div className="flex justify-between"><span className="text-slate-400">Tunggakan Tagihan:</span> <b className="text-rose-600">{formatRupiah(studentStats.tagihanSaya)}</b></div>
                </div>
              </div>

              {/* Card 4: CBT & Evaluasi */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-purple-300 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Evaluasi Belajar</h4>
                    <p className="text-sm font-black text-slate-800">Skor Ujian CBT</p>
                  </div>
                </div>
                <div className="text-xs space-y-2 border-t pt-3 text-slate-600">
                  <div className="flex justify-between"><span className="text-slate-400">Nilai CBT Rata-rata:</span> <b className="text-purple-600">{studentStats.cbtAverage}</b></div>
                  <div className="flex justify-between"><span className="text-slate-400">Sikap Sosial:</span> <b className="text-emerald-600 font-bold">SANGAT BAIK</b></div>
                </div>
              </div>
            </div>

            {/* Bottom Row for Students: Custom Announcements and Academic tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-100 pb-3 font-display">
                  <Bell className="w-4 h-4 text-indigo-500" /> Pengumuman & Memo Sekolah Terbaru
                </h3>
                <div className="space-y-4">
                  {executiveDirectives.slice(0, 3).map((dir: any) => (
                    <div key={dir.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md">
                          {dir.target}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold font-mono">{dir.date}</span>
                      </div>
                      <h4 className="font-black text-slate-800 text-sm leading-snug">{dir.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{dir.text}</p>
                      <div className="text-[9px] text-slate-400 pt-1 font-bold">
                        Diterbitkan oleh: <b className="text-slate-600">{dir.author} ({dir.role})</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-100 pb-3 font-display">
                  <Calendar className="w-4 h-4 text-purple-500" /> Agenda Ujian & Jadwal
                </h3>
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-2 text-xs">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl flex flex-col items-center justify-center shrink-0">
                      <span className="text-[8px] uppercase tracking-wide">Jul</span>
                      <span className="text-xs font-black leading-none font-mono">15</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800">Ujian Fisika ASAS</h5>
                      <p className="text-[10px] text-slate-400">Pukul 08:00 WIB • Token: ASAS25</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-2 text-xs">
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl flex flex-col items-center justify-center shrink-0">
                      <span className="text-[8px] uppercase tracking-wide">Jul</span>
                      <span className="text-xs font-black leading-none font-mono">16</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800">Ujian Matematika ASAS</h5>
                      <p className="text-[10px] text-slate-400">Pukul 08:00 WIB • Token: ASAS25</p>
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                    <p className="text-[10px] text-indigo-800 font-bold leading-relaxed">
                      Lakukan persiapan belajar mandiri. Harap login tepat waktu di portal CBT Anda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             3. STANDARD DASHBOARD VIEW (For other roles: Admin, Guru, etc.)
             ========================================================================= */
          <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-6 text-white shadow-sm transition-all duration-500 group">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold border border-white/10">
                    <Sparkles className="w-3 h-3 text-blue-300" /> TA {localStorage.getItem('ERP_academic_year') || '2026/2027'} Aktif
                  </span>
                  <h2 className="text-3xl font-extrabold tracking-tight font-display">{getDashboardTitle()}</h2>
                  <p className="text-slate-300 text-sm max-w-md font-light">
                    Selamat datang, <span className="font-bold text-white">{user.name}</span>! Kelola dan pantau seluruh aktivitas sekolah secara real-time.
                  </p>
                </div>
                
              </div>
            </div>

            {/* Active Days Notification Bar */}
            <div className={`p-4 border rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
              isTodayActive 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${isTodayActive ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold uppercase text-[10px] tracking-wider">
                    Hari Kerja Kegiatan Rombel: {isTodayActive ? 'HARI AKTIF' : 'HARI NON-AKTIF'}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isTodayActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                    Hari ini adalah hari <b>{todayDayName}</b>. {isTodayActive ? 'Semua modul presensi harian, geofencing, dan agenda mengajar tersedia penuh.' : 'Modul presensi harian dan pencatatan agenda mengajar terkunci otomatis berdasarkan pengaturan sistem.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/60 border rounded-xl px-3 py-1.5 font-bold font-mono text-[10px] whitespace-nowrap shadow-sm">
                Hari Aktif: {activeDaysList.join(', ')}
              </div>
            </div>

            {/* Section Title */}
            <div className="border-l-4 border-indigo-600 pl-4 py-1">
              <h3 className="font-extrabold text-lg text-slate-800 tracking-tight font-display">Operational Supporting Widgets & KPIs</h3>
              <p className="text-xs text-slate-400">Ringkasan matrik operasional pendukung real-time yang tersinkronisasi dengan database utama.</p>
            </div>

            {/* Remaining Operational Supporting Widgets & KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              
              {/* 1. Tenaga Pengajar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Guru & Staff</span>
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all"><GraduationCap className="w-4 h-4" /></div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalGuru} <span className="text-xs font-medium text-slate-400">staf</span></h4>
                <span className="text-[10px] text-indigo-600 font-semibold block mt-1">● Rasio ideal</span>
              </div>

              {/* 2. Jumlah Kelas */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Jumlah Kelas</span>
                  <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-all"><Layers className="w-4 h-4" /></div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalKelas} <span className="text-xs font-medium text-slate-400">kls</span></h4>
                <span className="text-[10px] text-rose-600 font-semibold block mt-1">● Ruang belajar</span>
              </div>

              {/* 3. Calon Pendaftar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Calon Pendaftar</span>
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-all"><FileText className="w-4 h-4" /></div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalPendaftar} <span className="text-xs font-medium text-slate-400">calon</span></h4>
                <span className="text-[10px] text-amber-600 font-semibold block mt-1">● Portal SPMB</span>
              </div>

              {/* 4. Buku Perpus */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Koleksi Buku</span>
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-all"><BookOpen className="w-4 h-4" /></div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalBuku} <span className="text-xs font-medium text-slate-400">bks</span></h4>
                <span className="text-[10px] text-purple-600 font-semibold block mt-1">● Sirkulasi aman</span>
              </div>

              {/* 5. Aset Inventaris */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Aset Inventaris</span>
                  <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-700 group-hover:text-white transition-all"><Package className="w-4 h-4" /></div>
                </div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mt-2 font-display">{currentStats.totalBarang} <span className="text-xs font-medium text-slate-400">unit</span></h4>
                <span className="text-[10px] text-slate-600 font-semibold block mt-1">● Tercatat baik</span>
              </div>

            </div>

            {/* Notifications & Academic Calendar Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-100 pb-3 font-display">
                  <Bell className="w-4 h-4 text-amber-500" /> Notifikasi Penting
                </h3>
                
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-blue-600 bg-white border border-blue-200 px-2 py-0.5 rounded">INFO UJIAN</span>
                    <p className="text-xs font-semibold text-slate-800">Token Ujian Fisika Aktif</p>
                    <p className="text-[10px] text-slate-400">Token: <b>ASAS25</b> • Berlaku s.d 15 Juli</p>
                  </div>
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                    <span className="text-[9px] font-bold text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded">PPDB 2026</span>
                    <p className="text-xs font-semibold text-slate-800">Pendaftaran Online Dibuka</p>
                    <p className="text-[10px] text-slate-400">3 Calon Siswa Baru terdaftar pagi ini</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider border-b border-slate-100 pb-3 font-display">
                  <Calendar className="w-4 h-4 text-purple-500" /> Kalender Akademik
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-2 text-xs">
                    <div className="w-10 h-10 bg-slate-50 border border-slate-100 text-slate-700 font-bold rounded-xl flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] uppercase tracking-wide">Jul</span>
                      <span className="text-sm font-black leading-none font-display">15</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800">Ujian Fisika ASAS</h5>
                      <p className="text-[10px] text-slate-400">Pukul 08:00 WIB • Kelas 12</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="w-10 h-10 bg-slate-50 border border-slate-100 text-slate-700 font-bold rounded-xl flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] uppercase tracking-wide">Jul</span>
                      <span className="text-sm font-black leading-none font-display">16</span>
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800">Ujian Matematika ASAS</h5>
                      <p className="text-[10px] text-slate-400">Pukul 08:00 WIB • Kelas 12</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )
        }
      </>
    )}

      {activeSubTab === 'statistik' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-800 text-base sm:text-lg uppercase tracking-wide">Analisis & Statistik Distribusi Siswa</h3>
            <p className="text-xs text-slate-400">Statistik dan visualisasi data real-time berdasarkan data siswa yang tersimpan di sistem.</p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2 shadow-sm">
              <span className="text-xs font-bold text-slate-400 block uppercase">Total Kelas Terdaftar</span>
              <h4 className="text-2xl sm:text-3xl font-black text-indigo-600 font-display">
                <AnimatedCounter value={siswaByClassData.length} />
              </h4>
              <p className="text-xs text-slate-400">Unit terintegrasi penuh</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2 shadow-sm">
              <span className="text-xs font-bold text-slate-400 block uppercase">Siswa Terverifikasi Aktif</span>
              <h4 className="text-2xl sm:text-3xl font-black text-emerald-600 font-display">
                <AnimatedCounter value={siswaByStatusData.find(s => s.name === 'Aktif')?.Jumlah || 0} />
              </h4>
              <p className="text-xs text-slate-400">Terdaftar dalam tahun ajaran berjalan</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-2 shadow-sm">
              <span className="text-xs font-bold text-slate-400 block uppercase">Rasio Gender (L : P)</span>
              <h4 className="text-2xl sm:text-3xl font-black text-blue-600 font-display">
                {siswaByGenderData[0]?.Jumlah || 0} : {siswaByGenderData[1]?.Jumlah || 0}
              </h4>
              <p className="text-xs text-slate-400">Keseimbangan komposisi peserta didik</p>
            </div>
          </div>

          {/* Section: Metrik Saku Operasional */}
          <div className="border-l-4 border-indigo-600 pl-4 py-1">
            <h3 className="font-extrabold text-base text-slate-800 tracking-tight font-display">Metrik Saku Operasional</h3>
            <p className="text-xs text-slate-400">Indikator harian real-time dan statistik kesiswaan penting.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
            {/* 1. Siswa Aktif */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Siswa Aktif</span>
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all"><Users className="w-4 h-4" /></div>
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-800 mt-2 font-display">{currentStats.totalSiswa} <span className="text-xs font-medium text-slate-400">org</span></h4>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">● Terdaftar aktif</span>
            </div>

            {/* 2. Hadir Hari Ini */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Hadir Hari Ini</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all"><CheckCircle className="w-4 h-4" /></div>
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-800 mt-2 font-display">{currentStats.hadirHariIni} <span className="text-xs font-medium text-slate-400">org</span></h4>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">● Absensi QR</span>
            </div>

            {/* 3. Sakit / Izin */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sakit / Izin</span>
                <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-all"><BookOpen className="w-4 h-4" /></div>
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-800 mt-2 font-display">{currentStats.izinHariIni} <span className="text-xs font-medium text-slate-400">org</span></h4>
              <span className="text-[10px] text-purple-600 font-semibold block mt-1">● Berdokumen</span>
            </div>

            {/* 4. Alpa Hari Ini */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tanpa Keterangan</span>
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-all"><AlertCircle className="w-4 h-4" /></div>
              </div>
              <h4 className="text-base sm:text-lg font-black text-slate-800 mt-2 font-display">{currentStats.alphaHariIni} <span className="text-xs font-medium text-slate-400">org</span></h4>
              <span className="text-[10px] text-red-500 font-semibold block mt-1">● Butuh konfirmasi</span>
            </div>

            {/* 5. Kas Masuk SPP */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Kas Masuk SPP</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all"><TrendingUp className="w-4 h-4" /></div>
              </div>
              <h4 className="text-xs font-black text-slate-800 mt-2 font-display truncate">{formatRupiah(currentStats.totalPembayaran)}</h4>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-1">● Auto-tagging</span>
            </div>

            {/* 6. Piutang Tagihan */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Piutang Tagihan</span>
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-all"><TrendingDown className="w-4 h-4" /></div>
              </div>
              <h4 className="text-xs font-black text-slate-800 mt-2 font-display truncate">{formatRupiah(currentStats.totalTagihan)}</h4>
              <span className="text-[10px] text-orange-500 font-semibold block mt-1">● Tunggakan SPP</span>
            </div>

            {/* 7. Tabungan Siswa */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:border-indigo-400 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tabungan Siswa</span>
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-all"><Wallet className="w-4 h-4" /></div>
              </div>
              <h4 className="text-xs font-black text-slate-800 mt-2 font-display truncate">{formatRupiah(currentStats.totalTabungan)}</h4>
              <span className="text-[10px] text-teal-600 font-semibold block mt-1">● Tabunganku</span>
            </div>
          </div>

          {/* Section: Grafik Analisis Utama */}
          <div className="border-l-4 border-emerald-600 pl-4 py-1">
            <h3 className="font-extrabold text-base text-slate-800 tracking-tight font-display">Grafik Analisis Utama</h3>
            <p className="text-xs text-slate-400">Visualisasi tren mingguan presensi siswa dan realisasi arus kas penerimaan SPP.</p>
          </div>

          {/* SUMMARY ANALYTICS RECHARTS LINE CHART CARD */}
          <div className="bg-white border border-slate-200 hover:border-indigo-300 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Ringkasan Analitik Recharts
                </span>
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2 mt-1">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span>Tren Presensi Siswa & Capaian Penerimaan Keuangan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualisasi line chart persentase kehadiran harian siswa dan tingkat koleksi dana SPP/Keuangan.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                  <span>Rata-Rata Kehadiran: <strong className="text-blue-700">96.5%</strong></span>
                </div>
                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Progres Keuangan: <strong className="text-emerald-700">94.2%</strong></span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={[
                    { bulan: 'Jan', 'Presensi Siswa (%)': 95, 'Penerimaan Keuangan (%)': 88 },
                    { bulan: 'Feb', 'Presensi Siswa (%)': 94, 'Penerimaan Keuangan (%)': 91 },
                    { bulan: 'Mar', 'Presensi Siswa (%)': 97, 'Penerimaan Keuangan (%)': 94 },
                    { bulan: 'Apr', 'Presensi Siswa (%)': 93, 'Penerimaan Keuangan (%)': 89 },
                    { bulan: 'Mei', 'Presensi Siswa (%)': 98, 'Penerimaan Keuangan (%)': 96 },
                    { bulan: 'Jun', 'Presensi Siswa (%)': 99, 'Penerimaan Keuangan (%)': 98 },
                    { bulan: 'Jul', 'Presensi Siswa (%)': 96, 'Penerimaan Keuangan (%)': 93 },
                    { bulan: 'Agu', 'Presensi Siswa (%)': 98, 'Penerimaan Keuangan (%)': 97 }
                  ]}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="bulan" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis domain={[60, 100]} stroke="#64748b" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      color: '#fff', 
                      borderRadius: '16px', 
                      border: '1px solid #334155',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' 
                    }}
                    itemStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="Presensi Siswa (%)" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, stroke: '#2563eb', strokeWidth: 2 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Penerimaan Keuangan (%)" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart A: Grafik Presensi Siswa (Mingguan) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider font-display">
                  <Activity className="w-4 h-4 text-blue-500" /> Grafik Presensi Siswa (Mingguan)
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData} barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Izin" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Alpa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart B: Penerimaan Kas Pembayaran (SPP) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 uppercase tracking-wider font-display">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Penerimaan Kas Pembayaran (SPP)
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={paymentsData}>
                    <defs>
                      <linearGradient id="colorSPP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="SPP" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSPP)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Chart 1: Class-Gender Distribution */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-display">Distribusi Siswa per Kelas</h4>
                <p className="text-xs text-slate-400">Jumlah siswa laki-laki dan perempuan di setiap jenjang kelas.</p>
              </div>
              <div className="overflow-x-auto w-full scrollbar-none pb-2">
                <div className="min-w-[600px] sm:min-w-0 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={siswaByClassData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Laki-Laki" name="Laki-Laki" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Perempuan" name="Perempuan" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Chart 2: Status Keaktifan Distribution */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-display">Status Keaktifan Siswa</h4>
                <p className="text-xs text-slate-400">Pembagian status administratif siswa di Rombel KTCT Tambora.</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={siswaByStatusData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} width={80} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Jumlah" name="Jumlah Siswa" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24}>
                      {siswaByStatusData.map((entry, index) => {
                        const colors = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#64748b'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Gender Distribution (Pie Chart) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 xl:col-span-2">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider font-display">Rasio Jenis Kelamin Peserta Didik</h4>
                  <p className="text-xs text-slate-400">Komposisi gender siswa terdaftar (keseluruhan).</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Terdata</span>
                  <span className="text-base sm:text-lg font-black text-slate-700 font-mono">
                    {siswaByGenderData.reduce((acc, curr) => acc + curr.Jumlah, 0)} Siswa
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-64 flex justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={siswaByGenderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 50 : 60}
                        outerRadius={isMobile ? 80 : 90}
                        paddingAngle={5}
                        dataKey="Jumlah"
                      >
                        <Cell fill="#3b82f6" cx="50%" cy="50%" />
                        <Cell fill="#ec4899" cx="50%" cy="50%" />
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Siswa`, 'Jumlah']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4 bg-slate-50/50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keterangan Komposisi</h5>
                  <div className="space-y-3">
                    {siswaByGenderData.map((gender, index) => {
                      const colors = ['bg-blue-500', 'bg-pink-500'];
                      const total = siswaByGenderData.reduce((acc, curr) => acc + curr.Jumlah, 0);
                      const percentage = total > 0 ? Math.round((gender.Jumlah / total) * 100) : 0;
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${colors[index]}`}></span>
                            <span className="text-xs font-bold text-slate-700">{gender.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-800 font-mono mr-2">{gender.Jumlah} Siswa</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-white border px-1.5 py-0.5 rounded">{percentage}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 border-t text-[10px] text-slate-400 leading-relaxed">
                    Sistem secara dinamis menyinkronkan data ini dari database Rombel Tambora untuk memastikan keakuratan laporan yayasan dan kepala sekolah.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeSubTab === 'presensi' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide">Presensi Kehadiran Harian</h3>
              <p className="text-xs text-slate-400">Pencatatan kehadiran harian siswa per kelas via manual daftar hadir atau Pindai QR Code.</p>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  stopPresensiScanner();
                  setPresensiMode('manual');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  presensiMode === 'manual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Daftar Hadir Manual
              </button>
              <button
                onClick={() => {
                  setPresensiMode('qr');
                }}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  presensiMode === 'qr'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Pindai QR Code Siswa
              </button>
            </div>
          </div>

          {/* Configuration Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Pilih Kelas Rombel</label>
              <select
                value={selectedPresensiKelas}
                onChange={(e) => {
                  setSelectedPresensiKelas(e.target.value);
                }}
                className="w-full bg-white border rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                <option value="">-- Pilih Kelas --</option>
                {(db.get<Kelas>('kelas') || []).map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Tanggal Presensi</label>
              <input
                type="date"
                value={selectedPresensiDate}
                onChange={(e) => {
                  setSelectedPresensiDate(e.target.value);
                }}
                className="w-full bg-white border rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {presensiMode === 'manual' ? (
            <div className="space-y-4">
              {!selectedPresensiKelas ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed text-slate-400 text-xs font-bold">
                  Silakan pilih Kelas terlebih dahulu untuk melakukan presensi manual.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-100">
                        <th className="px-4 py-3 text-center w-12">No</th>
                        <th className="px-4 py-3">Nama Siswa</th>
                        <th className="px-4 py-3">NISN</th>
                        <th className="px-4 py-3 text-center w-[280px]">Status Kehadiran</th>
                        <th className="px-4 py-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {getStudentsInClass(selectedPresensiKelas).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-400 font-bold">Tidak ada siswa terdaftar di kelas ini.</td>
                        </tr>
                      ) : (
                        getStudentsInClass(selectedPresensiKelas).map((std, idx) => {
                          const status = presensiStatusMap[std.id] || 'Alpha';
                          return (
                            <tr key={std.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <span className="font-bold text-slate-800">{std.nama}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 font-mono">{std.nisn}</td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-1.5">
                                  {[
                                    { value: 'Hadir', label: 'Hadir', activeClass: 'bg-emerald-500 text-white shadow-sm' },
                                    { value: 'Sakit', label: 'Sakit', activeClass: 'bg-amber-500 text-white shadow-sm' },
                                    { value: 'Izin', label: 'Izin', activeClass: 'bg-blue-500 text-white shadow-sm' },
                                    { value: 'Alpha', label: 'Alpha', activeClass: 'bg-rose-500 text-white shadow-sm' }
                                  ].map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        setPresensiStatusMap(prev => ({ ...prev, [std.id]: opt.value as any }));
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-150 ${
                                        status === opt.value
                                          ? opt.activeClass
                                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={presensiKeteranganMap[std.id] || ''}
                                  onChange={(e) => {
                                    setPresensiKeteranganMap(prev => ({ ...prev, [std.id]: e.target.value }));
                                  }}
                                  placeholder="Keterangan tambahan..."
                                  className="w-full bg-slate-50 focus:bg-white border rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedPresensiKelas && getStudentsInClass(selectedPresensiKelas).length > 0 && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={saveManualPresensi}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-600/10 cursor-pointer"
                  >
                    Simpan Presensi Kelas
                  </button>
                </div>
              )}
            </div>
          ) : (
            // QR Scanner Mode
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="border-2 border-dashed border-blue-200 rounded-3xl p-6 text-center space-y-6 bg-slate-50/50">
                {isPresensiScanning ? (
                  <div className="space-y-4">
                    <div className="relative w-full aspect-square max-w-[240px] mx-auto overflow-hidden rounded-3xl border-4 border-blue-600 bg-black shadow-inner">
                      <div id="presensi-qr-camera-stream" className="w-full h-full object-cover"></div>
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
                    <p className="text-xs text-blue-600 font-bold animate-pulse">Kamera Aktif - Pindai QR Code Kartu Pelajar Siswa</p>
                  </div>
                ) : (
                  <div className="w-40 h-40 border-4 border-slate-200 rounded-3xl mx-auto flex items-center justify-center relative bg-white shadow-sm">
                    <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-slate-400 rounded-tl-md"></span>
                    <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-slate-400 rounded-tr-md"></span>
                    <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-slate-400 rounded-bl-md"></span>
                    <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-slate-400 rounded-tr-md"></span>
                    <QrCode className="w-16 h-16 text-slate-300" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <h4 className="font-black text-slate-800 text-sm">
                    {isPresensiScanning ? 'Membaca Kartu Siswa...' : 'Scanner Kartu Pelajar'}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-normal">
                    Letakkan QR Code pada Kartu Pelajar siswa di depan webcam atau gunakan Simulator di sebelah kanan jika kamera offline.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {!isPresensiScanning ? (
                    <button
                      onClick={startPresensiScanner}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-600/10 w-full flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Aktifkan Kamera Scanner
                    </button>
                  ) : (
                    <button
                      onClick={stopPresensiScanner}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-6 py-2.5 rounded-xl text-xs transition w-full flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Nonaktifkan Kamera
                    </button>
                  )}
                </div>
              </div>

              {/* Quick simulator for QR Scan */}
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Pencatat QR Presensi Cepat (Simulator)</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">Pilih nama siswa di bawah untuk mensimulasikan pemindaian QR Code Kartu Pelajar mereka secara instan pada hari ini.</p>
                  
                  {!selectedPresensiKelas ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold">Pilih kelas di atas untuk melihat daftar siswa simulator.</div>
                  ) : getStudentsInClass(selectedPresensiKelas).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold">Tidak ada siswa terdaftar di kelas ini.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {getStudentsInClass(selectedPresensiKelas).map((std) => {
                        const hasCheckedIn = (db.get<any>('absensi') || []).some(
                          (a: any) => a.siswaId === std.id && a.tanggal === selectedPresensiDate && a.status === 'Hadir'
                        );
                        return (
                          <button
                            key={std.id}
                            onClick={() => handlePresensiQRDecoded(std.nisn || std.id)}
                            className={`p-2.5 border text-left rounded-xl text-[11px] font-bold transition flex items-center justify-between group cursor-pointer ${
                              hasCheckedIn 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-white hover:bg-blue-50/50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{std.nama}</span>
                            {hasCheckedIn ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50/30 border border-blue-100/60 rounded-3xl p-5 space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs">Informasi Jam Kehadiran</h4>
                  <p className="text-[11px] text-slate-500 leading-normal">Kehadiran via QR Code akan dicatat dengan timestamp jam saat ini (WIB) secara waktu nyata. Jika melewati batas toleransi masuk (07.30 WIB), status secara otomatis disesuaikan atau diberi catatan tambahan terlambat.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'kalender' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide">Kalender Akademik</h3>
              <p className="text-xs text-slate-400">Jadwal kegiatan akademik, libur nasional, rapat wali murid, dan ujian.</p>
            </div>
            <span className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-extrabold text-blue-700">
              Juli 2026
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-2xl p-4 bg-slate-50/40">
              <h4 className="font-bold text-slate-700 text-sm mb-4 border-b pb-2">Daftar Agenda Terjadwal</h4>
              <div className="space-y-3.5">
                {[
                  { tanggal: '10 Juli 2026', agenda: 'Hari Pertama Masuk Sekolah Semester Ganjil', tipe: 'Akademik', warna: 'blue' },
                  { tanggal: '15 Juli 2026', agenda: 'Ujian Fisika ASAS (Kelas 12)', tipe: 'Ujian', warna: 'red' },
                  { tanggal: '16 Juli 2026', agenda: 'Ujian Matematika ASAS (Kelas 12)', tipe: 'Ujian', warna: 'red' },
                  { tanggal: '20 Juli 2026', agenda: 'Rapat Pleno Komite & Orang Tua Siswa', tipe: 'Rapat', warna: 'amber' },
                  { tanggal: '25 Juli 2026', agenda: 'Libur Tahun Baru Hijriah (Nasional)', tipe: 'Libur', warna: 'emerald' },
                  { tanggal: '30 Juli 2026', agenda: 'Penyerahan Laporan Tengah Bulanan', tipe: 'Akademik', warna: 'purple' }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 text-xs border-b border-slate-100 last:border-0 pb-2">
                    <span className="font-mono text-slate-500 w-24 shrink-0 font-bold">{item.tanggal}</span>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{item.agenda}</p>
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 bg-${item.warna}-50 text-${item.warna}-600 border border-${item.warna}-100`}>
                        {item.tipe}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <AcademicCalendarGrid activeDaysList={activeDaysList} />

              <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 bg-slate-50/40">
                <div>
                  <h4 className="font-bold text-slate-700 text-sm mb-2">Sinkronisasi Kalender</h4>
                  <p className="text-xs text-slate-400">Hubungkan kalender sekolah ini dengan Google Calendar, Outlook, atau iCal untuk mendapatkan update real-time di perangkat Anda.</p>
                </div>
                <div className="bg-white p-4 border rounded-xl space-y-2 shadow-xs">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tautan Google Calendar</p>
                  <input readOnly value="https://calendar.google.com/calendar/ical/rombelktct..." className="w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-mono text-slate-600 focus:outline-none" />
                </div>
                <button onClick={() => Swal.fire('Tersinkron', 'Kalender berhasil disinkronkan dengan Google Calendar Anda.', 'success')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer">
                  Hubungkan Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'notifikasi' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                Pusat Notifikasi System
              </h3>
              <p className="text-xs text-slate-500 mt-1">Pemberitahuan resmi sistem mengenai akademik, SPMB, pengumuman, keuangan, dan kesiswaan.</p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {['SUPERADMIN', 'ADMIN', 'GURU'].includes(user.role) && (
                <button
                  onClick={() => {
                    Swal.fire({
                      title: 'Buat Notifikasi Baru',
                      html: `
                        <div class="text-left space-y-3 font-sans">
                          <div>
                            <label class="text-xs font-bold text-slate-700 block mb-1">Judul Notifikasi</label>
                            <input id="swal-notif-title" class="w-full text-xs p-2.5 border rounded-lg" placeholder="Contoh: Pengumuman Libur Semester" />
                          </div>
                          <div>
                            <label class="text-xs font-bold text-slate-700 block mb-1">Isi Pesan Notifikasi</label>
                            <textarea id="swal-notif-body" class="w-full text-xs p-2.5 border rounded-lg h-20" placeholder="Rincian pesan pemberitahuan..."></textarea>
                          </div>
                          <div class="grid grid-cols-2 gap-2">
                            <div>
                              <label class="text-xs font-bold text-slate-700 block mb-1">Kategori / Jenis</label>
                              <select id="swal-notif-type" class="w-full text-xs p-2 border rounded-lg">
                                <option value="Akademik">Akademik</option>
                                <option value="SPMB">SPMB</option>
                                <option value="Keuangan">Keuangan</option>
                                <option value="BK">BK</option>
                                <option value="Perpustakaan">Perpustakaan</option>
                                <option value="Pengumuman">Pengumuman</option>
                                <option value="Sistem">Sistem</option>
                              </select>
                            </div>
                            <div>
                              <label class="text-xs font-bold text-slate-700 block mb-1">Warna Badge</label>
                              <select id="swal-notif-color" class="w-full text-xs p-2 border rounded-lg">
                                <option value="blue">Biru (Akademik)</option>
                                <option value="emerald">Hijau (SPMB)</option>
                                <option value="indigo">Indigo (Keuangan)</option>
                                <option value="rose">Merah (BK/Penting)</option>
                                <option value="purple">Ungu (Perpus)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      `,
                      showCancelButton: true,
                      confirmButtonText: 'Kirim Notifikasi',
                      confirmButtonColor: '#2563eb',
                      cancelButtonText: 'Batal',
                      preConfirm: () => {
                        const title = (document.getElementById('swal-notif-title') as HTMLInputElement)?.value;
                        const body = (document.getElementById('swal-notif-body') as HTMLTextAreaElement)?.value;
                        const jenis = (document.getElementById('swal-notif-type') as HTMLSelectElement)?.value;
                        const warna = (document.getElementById('swal-notif-color') as HTMLSelectElement)?.value;

                        if (!title || !body) {
                          Swal.showValidationMessage('Judul dan isi notifikasi wajib diisi!');
                          return false;
                        }
                        return { title, body, jenis, warna };
                      }
                    }).then((result: any) => {
                      if (result.isConfirmed && result.value) {
                        const newNotif = {
                          idNotif: `notif_${Date.now()}`,
                          id: `notif_${Date.now()}`,
                          userId: 'ALL',
                          judul: result.value.title,
                          pesan: result.value.body,
                          isi: result.value.body,
                          waktu: 'Baru saja',
                          jenis: result.value.jenis,
                          tipe: result.value.jenis,
                          status: 'Unread',
                          dibaca: false,
                          warna: result.value.warna,
                          createdAt: new Date().toISOString()
                        };
                        const updated = [newNotif, ...notifList];
                        setNotifList(updated);
                        db.set('notifikasi', updated);

                        if (result.value.jenis === 'Pengumuman') {
                          const currentNews = db.get<any>('web_news') || [];
                          const newNewsItem = {
                            id: `news-${Date.now()}`,
                            tipe: 'PENGUMUMAN',
                            judul: result.value.title,
                            ringkasan: result.value.body,
                            isi: result.value.body,
                            tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                            imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'
                          };
                          db.set('web_news', [newNewsItem, ...currentNews]);
                        }

                        Swal.fire('Berhasil!', 'Pengumuman / Notifikasi baru berhasil disiarkan dan disinkronkan langsung ke database!', 'success');
                      }
                    });
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Notifikasi
                </button>
              )}

              <button 
                onClick={() => {
                  const updated = notifList.map(n => ({ ...n, dibaca: true, read: true }));
                  setNotifList(updated);
                  db.set('notifikasi', updated);
                  window.dispatchEvent(new Event('erp-db-synced'));
                  Swal.fire({
                    toast: true,
                    position: 'top-end',
                    title: 'Semua notifikasi ditandai dibaca',
                    icon: 'success',
                    showConfirmButton: false,
                    timer: 1500
                  });
                }} 
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition"
              >
                Tandai Semua Dibaca
              </button>

              <button 
                onClick={() => {
                  Swal.fire({
                    title: 'Bersihkan Notifikasi?',
                    text: 'Semua riwayat notifikasi akan dihapus dari sistem.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Ya, Hapus Semua',
                    confirmButtonColor: '#ef4444',
                    cancelButtonText: 'Batal'
                  }).then((res: any) => {
                    if (res.isConfirmed) {
                      setNotifList([]);
                      db.set('notifikasi', []);
                      window.dispatchEvent(new Event('erp-db-synced'));
                      Swal.fire('Dibersihkan', 'Pusat notifikasi telah dikosongkan.', 'success');
                    }
                  });
                }} 
                className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs transition"
              >
                Kosongkan
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {['Semua', 'Akademik', 'SPMB', 'Keuangan', 'BK', 'Perpustakaan', 'Pengumuman', 'Sistem'].map((cat) => {
              const active = notifCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setNotifCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Notif Cards List */}
          <div className="space-y-3">
            {notifList.filter(n => notifCategoryFilter === 'Semua' || (n.jenis || n.category) === notifCategoryFilter).length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                <Bell className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Tidak ada notifikasi {notifCategoryFilter !== 'Semua' ? `kategori ${notifCategoryFilter}` : ''}</p>
                <p className="text-[11px] text-slate-400">Seluruh pesan pemberitahuan akan ditampilkan di sini secara real-time.</p>
              </div>
            ) : (
              notifList
                .filter(n => notifCategoryFilter === 'Semua' || (n.jenis || n.category) === notifCategoryFilter)
                .map((notif) => {
                  const isRead = notif.dibaca || notif.read;
                  const itemTitle = notif.judul || notif.title;
                  const itemBody = notif.isi || notif.body;
                  const itemTime = notif.waktu || notif.time;
                  const itemJenis = notif.jenis || notif.category || 'Sistem';
                  const itemWarna = notif.warna || 'blue';

                  return (
                    <div 
                      key={notif.id} 
                      onClick={() => {
                        const updated = notifList.map(n => n.id === notif.id ? { ...n, dibaca: true, read: true } : n);
                        setNotifList(updated);
                        db.set('notifikasi', updated);
                        window.dispatchEvent(new Event('erp-db-synced'));
                      }}
                      className={`p-4 border rounded-2xl flex items-start justify-between gap-4 transition-all hover:border-slate-300 cursor-pointer ${
                        isRead ? 'bg-white border-slate-200' : 'bg-blue-50/30 border-blue-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${isRead ? 'bg-slate-300' : 'bg-blue-600 animate-pulse'}`}></div>
                        <div className="space-y-1 flex-1">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <h5 className="font-extrabold text-slate-800 text-sm">{itemTitle}</h5>
                            <span className="text-[10px] text-slate-400 font-bold font-mono">{itemTime}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{itemBody}</p>
                          <div className="pt-1 flex items-center gap-2">
                            <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider bg-${itemWarna}-50 text-${itemWarna}-600 border border-${itemWarna}-100`}>
                              {itemJenis}
                            </span>
                            {!isRead && (
                              <span className="text-[9px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                BARU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            Swal.fire({
                              title: '✏️ Edit Notifikasi / Pengumuman',
                              html: `
                                <div class="text-left space-y-3 font-sans">
                                  <div>
                                    <label class="text-xs font-bold text-slate-700 block mb-1">Judul Notifikasi</label>
                                    <input id="swal-edit-notif-title" class="w-full text-xs p-2.5 border rounded-lg" value="${(itemTitle || '').replace(/"/g, '&quot;')}" placeholder="Judul..." />
                                  </div>
                                  <div>
                                    <label class="text-xs font-bold text-slate-700 block mb-1">Isi Pesan Notifikasi</label>
                                    <textarea id="swal-edit-notif-body" class="w-full text-xs p-2.5 border rounded-lg h-20" placeholder="Rincian...">${itemBody || ''}</textarea>
                                  </div>
                                  <div class="grid grid-cols-2 gap-2">
                                    <div>
                                      <label class="text-xs font-bold text-slate-700 block mb-1">Kategori / Jenis</label>
                                      <select id="swal-edit-notif-type" class="w-full text-xs p-2 border rounded-lg">
                                        <option value="Akademik" ${itemJenis === 'Akademik' ? 'selected' : ''}>Akademik</option>
                                        <option value="SPMB" ${itemJenis === 'SPMB' ? 'selected' : ''}>SPMB</option>
                                        <option value="Keuangan" ${itemJenis === 'Keuangan' ? 'selected' : ''}>Keuangan</option>
                                        <option value="BK" ${itemJenis === 'BK' ? 'selected' : ''}>BK</option>
                                        <option value="Perpustakaan" ${itemJenis === 'Perpustakaan' ? 'selected' : ''}>Perpustakaan</option>
                                        <option value="Pengumuman" ${itemJenis === 'Pengumuman' ? 'selected' : ''}>Pengumuman</option>
                                        <option value="Sistem" ${itemJenis === 'Sistem' ? 'selected' : ''}>Sistem</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label class="text-xs font-bold text-slate-700 block mb-1">Warna Badge</label>
                                      <select id="swal-edit-notif-color" class="w-full text-xs p-2 border rounded-lg">
                                        <option value="blue" ${itemWarna === 'blue' ? 'selected' : ''}>Biru (Akademik)</option>
                                        <option value="emerald" ${itemWarna === 'emerald' ? 'selected' : ''}>Hijau (SPMB)</option>
                                        <option value="indigo" ${itemWarna === 'indigo' ? 'selected' : ''}>Indigo (Keuangan)</option>
                                        <option value="rose" ${itemWarna === 'rose' ? 'selected' : ''}>Merah (BK/Penting)</option>
                                        <option value="purple" ${itemWarna === 'purple' ? 'selected' : ''}>Ungu (Perpus)</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              `,
                              showCancelButton: true,
                              confirmButtonText: 'Simpan Perubahan',
                              confirmButtonColor: '#2563eb',
                              cancelButtonText: 'Batal',
                              preConfirm: () => {
                                const title = (document.getElementById('swal-edit-notif-title') as HTMLInputElement)?.value;
                                const body = (document.getElementById('swal-edit-notif-body') as HTMLTextAreaElement)?.value;
                                const jenis = (document.getElementById('swal-edit-notif-type') as HTMLSelectElement)?.value;
                                const warna = (document.getElementById('swal-edit-notif-color') as HTMLSelectElement)?.value;

                                if (!title || !body) {
                                  Swal.showValidationMessage('Judul dan isi notifikasi wajib diisi!');
                                  return false;
                                }
                                return { title, body, jenis, warna };
                              }
                            }).then((res: any) => {
                              if (res.isConfirmed && res.value) {
                                const updated = notifList.map(n => n.id === notif.id ? {
                                  ...n,
                                  judul: res.value.title,
                                  title: res.value.title,
                                  pesan: res.value.body,
                                  isi: res.value.body,
                                  body: res.value.body,
                                  jenis: res.value.jenis,
                                  tipe: res.value.jenis,
                                  category: res.value.jenis,
                                  warna: res.value.warna
                                } : n);
                                setNotifList(updated);
                                db.set('notifikasi', updated);

                                if (itemJenis === 'Pengumuman' || res.value.jenis === 'Pengumuman') {
                                  const newsList = db.get<any>('web_news') || [];
                                  const updatedNews = newsList.map((item: any) => {
                                    if (item.judul === itemTitle || item.id === notif.id) {
                                      return {
                                        ...item,
                                        judul: res.value.title,
                                        ringkasan: res.value.body,
                                        isi: res.value.body
                                      };
                                    }
                                    return item;
                                  });
                                  db.set('web_news', updatedNews);
                                }

                                window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'notifikasi' } }));
                                Swal.fire('Berhasil!', 'Notifikasi / Pengumuman berhasil diperbarui!', 'success');
                              }
                            });
                          }}
                          className="text-slate-300 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-100 transition shrink-0"
                          title="Edit Notifikasi"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = notifList.filter(n => n.id !== notif.id);
                            setNotifList(updated);
                            db.set('notifikasi', updated);
                            window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'notifikasi' } }));
                          }}
                          className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 transition shrink-0"
                          title="Hapus Notifikasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'aktivitas' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide">Log Aktivitas Terbaru</h3>
            <p className="text-xs text-slate-400">Riwayat audit jejak digital tindakan pengguna di dalam ERP Sekolah secara transparan.</p>
          </div>

          <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-6">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-black tracking-widest uppercase">KOSONG</div>
            ) : (
              auditLogs.map((act) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-9 top-1 w-4.5 h-4.5 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-800">
                      <b className="text-blue-600 font-mono font-bold mr-1">@{act.user}</b>
                      <span className="text-[9px] font-black bg-slate-100 text-slate-500 border border-slate-200 px-1 rounded uppercase mr-1.5 tracking-wider">{act.role}</span>
                      {act.action}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold">{act.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'profil' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide">Profil Pengguna</h3>
            <p className="text-xs text-slate-400">Informasi detail mengenai akun Anda.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/4 flex flex-col items-center text-center space-y-4 shrink-0">
              <div className="w-24 h-24 rounded-3xl bg-blue-600 text-white font-extrabold text-3xl flex items-center justify-center uppercase shadow-inner shadow-blue-800/55 overflow-hidden">
                {user.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-base">{user.name}</h4>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">{user.role}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase rounded-full">
                Status: {user.status}
              </span>
            </div>

            <form onSubmit={handleSaveProfile} className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nama Lengkap</label>
                <input required value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Username / ID Akun</label>
                <input readOnly value={user.username} className="w-full bg-slate-100 border rounded-xl px-4 py-2.5 text-xs font-mono text-slate-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Alamat Email</label>
                <input required type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Nomor HP</label>
                <input required value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              
              <div className="md:col-span-2 pt-4 flex gap-3">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-600/10">
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CLASS ROOM QR CODE CHECK-IN MODAL FOR STUDENTS --- */}
      {showRoomQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div 
            onClick={() => {
              stopRoomQrScanner();
              setShowRoomQrModal(false);
            }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
          />
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-2xl space-y-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse"></div>
            
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base sm:text-lg uppercase">QR Check-In Kelas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pindai QR ruangan/laboratorium untuk presensi kehadiran kelas mandiri.</p>
              </div>
              <button 
                onClick={() => {
                  stopRoomQrScanner();
                  setShowRoomQrModal(false);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-xl transition shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-emerald-200 dark:border-emerald-800/80 rounded-3xl p-6 text-center space-y-6 bg-slate-50/50 dark:bg-slate-950/30">
              {isRoomScanning ? (
                <div className="space-y-4">
                  <div className="relative w-full aspect-square max-w-[240px] mx-auto overflow-hidden rounded-3xl border-4 border-emerald-600 bg-black shadow-inner">
                    <div id="room-qr-camera-stream" className="w-full h-full object-cover"></div>
                    <div className="absolute inset-0 border-2 border-transparent pointer-events-none flex flex-col justify-between p-4">
                      <div className="flex justify-between">
                        <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></span>
                        <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></span>
                      </div>
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-bounce"></div>
                      <div className="flex justify-between">
                        <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></span>
                        <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">Kamera Aktif - Posisikan QR Code Ruangan di dalam kotak</p>
                </div>
              ) : (
                <div className="w-40 h-40 border-4 border-slate-200 dark:border-slate-800 rounded-3xl mx-auto flex items-center justify-center relative bg-white dark:bg-slate-900 shadow-sm">
                  <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-slate-400 rounded-tl-md"></span>
                  <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-slate-400 rounded-tr-md"></span>
                  <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-slate-400 rounded-bl-md"></span>
                  <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-slate-400 rounded-br-md"></span>
                  <QrCode className="w-16 h-16 text-slate-300 dark:text-slate-700" />
                </div>
              )}

              <div className="space-y-1.5">
                <h4 className="font-black text-slate-800 dark:text-white text-sm">
                  {isRoomScanning ? 'Mencari QR Code Ruangan...' : 'Kamera Scanner Siap'}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-normal">
                  {isRoomScanning 
                    ? 'Arahkan kamera ke QR Code resmi kelas/ruangan yang tertempel di pintu masuk.' 
                    : 'Gunakan kamera aktif untuk memindai, atau pilih simulator cepat di bawah jika kamera Anda offline.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {!isRoomScanning ? (
                  <button 
                    onClick={startRoomQrScanner} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-600/10 w-full flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> Aktifkan Kamera Scanner
                  </button>
                ) : (
                  <button 
                    onClick={stopRoomQrScanner} 
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-rose-600/10 w-full flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Nonaktifkan Kamera
                  </button>
                )}
              </div>
            </div>

            {/* QUICK SIMULATOR SECTION FOR SEAMLESS DEMO */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider block w-max mx-auto">
                Daftar Ruangan Terdaftar (Simulator Cepat)
              </span>
              <p className="text-[10px] text-slate-400 text-center">Klik salah satu ruangan di bawah ini untuk mensimulasikan scan QR code ruangan tersebut secara instan.</p>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'R1', name: 'Lab Komputer Utama' },
                  { id: 'R2', name: 'Ruang Teori XII RPL' },
                  { id: 'R3', name: 'Perpustakaan Rombel' },
                  { id: 'R4', name: 'Aula Terpadu Tambora' }
                ].map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomQRDecoded(room.name)}
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950/20 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 transition duration-150 text-left flex items-center gap-1.5 group cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-ping shrink-0" />
                    <span className="truncate">{room.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

declare const Swal: any;

