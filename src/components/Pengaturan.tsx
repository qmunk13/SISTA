import React, { useState, useEffect } from 'react';
import { db, syncWithFirestore, syncWithGas, getGasUrl, setGasUrl, pingGasServer, purgeAllData } from '../data/db';
import { initialFormFields } from '../data/mockData';
import ExportGAS from './ExportGAS';
import { GoogleSheetsSyncModal } from './GoogleSheetsSyncModal';
import { useSubTab } from '../utils/subTabHelper';
import { formatGoogleDriveUrl, handleDriveImageError } from '../utils/driveHelper';
import { purgeAllGoogleSheets, getGoogleSheetsConfig, saveGoogleSheetsConfig } from '../lib/googleSheetsSync';
import { WebConfig, FormFieldConfig, User, Role } from '../types';
import { 
  AVAILABLE_ROLES, 
  AVAILABLE_MENUS, 
  AVAILABLE_PERMISSIONS, 
  getPermissionsMatrix, 
  savePermissionsMatrix, 
  DEFAULT_ROLE_PERMISSIONS,
  RolePermissionConfig
} from '../utils/permissionHelper';
import { 
  Settings, 
  Database, 
  Lock, 
  Shield, 
  Terminal,
  RefreshCw,
  FileText,
  Key,
  Sliders,
  CloudLightning,
  Sparkles,
  Save,
  CheckCircle2,
  Globe,
  SlidersHorizontal,
  Eye,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Newspaper,
  Pencil,
  Calendar,
  Clock,
  BookOpen,
  Cloud,
  Download,
  AlertTriangle,
  FileCode
} from 'lucide-react';

interface PengaturanProps {
  user: any;
  onLogout: () => void;
}

export default function Pengaturan({ user, onLogout }: PengaturanProps) {
  const [activeSubTab, setActiveSubTab] = useSubTab<
    'dashboard' | 'role' | 'database_integrasi' | 'konfigurasi' | 'tampilan' | 'jadwal_kegiatan' | 'berita' | 'kelola_konten' | 'formulir' | 'backup' | 'sistem' | 'google_sheets' | 'export_gas'
  >('pengaturan', 'dashboard');
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'error'>('connected');
  const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);

  // Database mode (Google Sheets / GAS first vs Firebase Firestore)
  const [dbMode, setDbMode] = useState<string>('gas');

  // Google Sheets (GAS) Web App States
  const [gasUrl, setGasUrlState] = useState(() => getGasUrl());
  const [gasProgress, setGasProgress] = useState<string>('');
  const [showGasCode, setShowGasCode] = useState<boolean>(false);

  // General Config State
  const [schoolName, setSchoolName] = useState(() => localStorage.getItem('ERP_school_name') || 'Rombel KTCT Tambora');
  const [foundationName, setFoundationName] = useState(() => localStorage.getItem('ERP_foundation_name') || 'Karang Taruna Kecamatan Tambora');
  const [academicYear, setAcademicYear] = useState(() => {
    const current = localStorage.getItem('ERP_academic_year');
    if (!current || current === '2025/2026') {
      localStorage.setItem('ERP_academic_year', '2026/2027');
      return '2026/2027';
    }
    return current;
  });
  const [semester, setSemester] = useState(() => localStorage.getItem('ERP_active_semester') || 'GANJIL');
  const [activeDays, setActiveDays] = useState<string[]>(() => {
    const saved = localStorage.getItem('ERP_active_days');
    return saved ? JSON.parse(saved) : ['Minggu']; // Default only Sunday as requested
  });

  // Website Appearance CMS State
  const [webConfig, setWebConfig] = useState<WebConfig>(() => {
    const cfg = db.getSingle<WebConfig>('web_config');
    const defaults: WebConfig = {
      appName: 'ROMBEL KTCT TAMBORA',
      judulSidebar: 'ERP ROMBEL',
      logoUrl: '/logo_rombel.svg',
      profileImageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600',
      kepalaSekolahImageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
      beritaImageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500',
      heroImageUrl: 'https://lh3.googleusercontent.com/d/12ni-mZVyfQauGxLR7IqyWMA_oAv5qPJX',
      teksHero: 'Penerimaan Peserta Didik Baru (PPDB 2026/2027)',
      heroBaris1: 'Pendidikan Inklusif &',
      heroBaris2: 'Berkualitas Di Tambora',
      heroSubteks: 'Pusat Pendidikan Inklusif Terpadu Karang Taruna Kecamatan Tambora (Mazas). Mewujudkan kesetaraan akses pendidikan unggul, pengembangan potensi karakter, serta keterampilan digital generasi muda secara berkelanjutan.',
      footerJudul: 'ROMBEL KTCT TAMBORA',
      footerAlamat: 'Gedung Sasana Krida Karang Taruna , Jl. Laksa II No.12, RT.012 RW.002, Jakarta Barat',
      footerTelepon: '0851-4180-9991',
      footerEmail: 'info@rombelktct.sch.id',
      footerHakCipta: '© 2026 Rombongan Belajar Karang Taruna Kecamatan Tambora. Hak Cipta Dilindungi.',
      linkFb: 'https://facebook.com/rombelktct',
      linkIg: 'https://instagram.com/rombelktct',
      linkYt: 'https://youtube.com/rombelktct',
      linkTg: 'https://t.me/rombelktct',
      pendaftaranStatus: 'dibuka',
      runningText: '🔥 PENDAFTARAN PESERTA DIDIK BARU (PPDB) ROMBEL KTCT TAMBORA TAHUN AJARAN 2026/2027 TELAH DIBUKA! PROGRAM PENDIDIKAN BERBASIS MASYARAKAT (MAZAS). DAFTAR SEKARANG JUGA!',
      alur1_judul: 'Isi Formulir',
      alur1_desc: 'Isi biodata lengkap Anda secara online dengan mudah.',
      alur2_judul: 'Upload Berkas',
      alur2_desc: 'Unggah berkas persyaratan wajib seperti KK, Ijazah, dan Pas Foto.',
      alur3_judul: 'Verifikasi',
      alur3_desc: 'Tim panitia melakukan seleksi dan verifikasi kelayakan dokumen.',
      alur4_judul: 'Pengumuman',
      alur4_desc: 'Cek pengumuman kelulusan Anda secara transparan di portal ini.',
      visi: 'Mewujudkan lembaga pendidikan Mazas yang inklusif dan berkualitas unggul untuk mencetak generasi muda Kecamatan Tambora yang mandiri, berkarakter mulia, cerdas, berdaya saing tinggi, dan berjiwa kepemimpinan.',
      misi: '1. Menyelenggarakan kegiatan belajar mengajar secara holistik, terpadu, dan berorientasi pada kompetensi industri abad ke-21.\n2. Menanamkan nilai-nilai religiusitas, akhlak mulia, disiplin, dan tanggung jawab sosial melalui program pembiasaan ibadah harian.\n3. Menyediakan akses pendidikan Mazas bagi masyarakat dengan dukungan penuh Karang Taruna Tambora.\n4. Membangun kemitraan strategis dengan dunia usaha, perguruan tinggi, dan instansi pemerintahan untuk penyaluran lulusan.'
    };
    if (cfg) {
      const merged = { ...defaults, ...cfg };
      Object.keys(defaults).forEach(key => {
        const k = key as keyof WebConfig;
        if (!merged[k] || (typeof merged[k] === 'string' && !(merged[k] as string).trim())) {
          (merged as any)[k] = defaults[k];
        }
      });
      return merged;
    }
    return defaults;
  });

  // Dynamic Form Fields Config State
  const [formConfig, setFormConfig] = useState(() => {
    const existing = localStorage.getItem('ERP_form_config');
    if (existing) {
      try {
        return JSON.parse(existing);
      } catch (e) {}
    }
    return {
      requireNik: true,
      requireAgama: false,
      requireAlamat: false,
      requireNoHp: true,
      requireNamaAyah: false,
      requireNamaIbu: false,
      showNik: true,
      showAgama: true,
      showAlamat: true,
      showNoHp: true,
      showNamaAyah: true,
      showNamaIbu: true,
      minAge: 15,
      maxAge: 21,
      academicYearActive: '2026/2027',
      gelombangActive: 'Gelombang I',
      kuotaMaksimal: 100,
      statusPendaftaran: db.getSingle<WebConfig>('web_config')?.pendaftaranStatus === 'dibuka' ? 'buka' : 'tutup'
    };
  });

  // Role Permissions state (dynamic enterprise matrix)
  const [roleMatrix, setRoleMatrix] = useState<Record<string, RolePermissionConfig>>(() => {
    return getPermissionsMatrix();
  });
  const [selectedRole, setSelectedRole] = useState<string>('SUPERADMIN');
  const [roleSubTab, setRoleSubTab] = useState<'matrix' | 'users' | 'workflows' | 'logs'>('matrix');
  const [customRoleName, setCustomRoleName] = useState<string>('');
  
  // User list for role assigning state
  const [usersList, setUsersList] = useState<User[]>(() => {
    return db.get<User>('users') || [];
  });
  const [searchUser, setSearchUser] = useState<string>('');
  const [editingUserRoles, setEditingUserRoles] = useState<User | null>(null);
  const [userRolesEdit, setUserRolesEdit] = useState<string[]>([]);

  // Approval Workflows state
  const [workflows, setWorkflows] = useState<any[]>(() => {
    const saved = localStorage.getItem('ERP_workflows');
    if (saved) return JSON.parse(saved);
    const initialWF = [
      { id: 'WF_KEU', name: 'Persetujuan Kwitansi Keuangan', category: 'Keuangan', approverRole: 'BENDAHARA', status: 'AKTIF', description: 'Semua transaksi pembayaran siswa oleh Kasir harus disetujui Bendahara sebelum diterbitkan invoice.' },
      { id: 'WF_SPMB', name: 'Verifikasi Berkas Daftar Ulang', category: 'SPMB', approverRole: 'OPERATOR', status: 'AKTIF', description: 'Kelengkapan berkas pas foto, KK, Akta calon siswa diverifikasi oleh Operator.' },
      { id: 'WF_CBT', name: 'Aktivasi Token Ujian Berkala', category: 'CBT', approverRole: 'WAKASEK_KURIKULUM', status: 'AKTIF', description: 'Token ujian harian, UTS, dan UAS wajib diotorisasi oleh Wakasek Kurikulum.' },
      { id: 'WF_SURAT', name: 'Otorisasi Surat & Dokumen Keluar', category: 'Persuratan', approverRole: 'KEPALA_SEKOLAH', status: 'AKTIF', description: 'Pengeluaran surat keterangan aktif siswa harus ditandatangani Kepala Sekolah.' }
    ];
    localStorage.setItem('ERP_workflows', JSON.stringify(initialWF));
    return initialWF;
  });

  // News & Announcements CMS States
  const [newsList, setNewsList] = useState<any[]>(() => {
    return db.get<any>('web_news') || [];
  });
  const [editingNews, setEditingNews] = useState<any | null>(null);
  const [newsTipe, setNewsTipe] = useState('PENGUMUMAN');
  const [newsJudul, setNewsJudul] = useState('');
  const [newsRingkasan, setNewsRingkasan] = useState('');
  const [newsIsi, setNewsIsi] = useState('');
  const [newsTanggal, setNewsTanggal] = useState('');
  const [newsImageUrl, setNewsImageUrl] = useState('');

  useEffect(() => {
    const syncNews = () => {
      const current = db.get<any>('web_news') || [];
      setNewsList(current);
    };
    window.addEventListener('erp-db-synced', syncNews);
    window.addEventListener('erp-db-updated', syncNews);
    return () => {
      window.removeEventListener('erp-db-synced', syncNews);
      window.removeEventListener('erp-db-updated', syncNews);
    };
  }, []);

  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsJudul.trim() || !newsRingkasan.trim()) {
      Swal.fire('Eror', 'Judul dan Ringkasan wajib diisi.', 'error');
      return;
    }

    const tgl = newsTanggal || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    let updatedList = [...newsList];
    if (editingNews) {
      // Edit mode
      updatedList = updatedList.map(item => {
        if (item.id === editingNews.id) {
          return {
            ...item,
            tipe: newsTipe,
            judul: newsJudul,
            ringkasan: newsRingkasan,
            isi: newsIsi,
            tanggal: tgl,
            imageUrl: newsImageUrl
          };
        }
        return item;
      });
      Swal.fire('Berhasil', 'Pengumuman / Berita berhasil diperbarui dan disinkronkan ke database!', 'success');
    } else {
      // Add mode
      const newItem = {
        id: `news-${Date.now()}`,
        tipe: newsTipe,
        judul: newsJudul,
        ringkasan: newsRingkasan,
        isi: newsIsi,
        tanggal: tgl,
        imageUrl: newsImageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'
      };
      updatedList.unshift(newItem);
      Swal.fire('Berhasil!', 'Pengumuman baru berhasil diterbitkan dan disinkronkan langsung ke database!', 'success');
    }

    db.set('web_news', updatedList);

    // Sinkronkan juga ke tabel notifikasi sistem jika bertipe PENGUMUMAN
    if (newsTipe === 'PENGUMUMAN') {
      const currentNotifs = db.get<any>('notifikasi') || [];
      const newNotifItem = {
        idNotif: `notif_${Date.now()}`,
        id: `notif_${Date.now()}`,
        userId: 'ALL',
        judul: newsJudul,
        pesan: newsRingkasan,
        isi: newsRingkasan,
        tipe: 'Pengumuman',
        jenis: 'Pengumuman',
        status: 'Unread',
        dibaca: false,
        waktu: tgl,
        createdAt: new Date().toISOString()
      };
      db.set('notifikasi', [newNotifItem, ...currentNotifs]);
    }

    setNewsList(updatedList);
    window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'web_news' } }));
    handleResetNewsForm();
  };

  const handleEditNewsClick = (item: any) => {
    setEditingNews(item);
    setNewsTipe(item.tipe || 'PENGUMUMAN');
    setNewsJudul(item.judul || '');
    setNewsRingkasan(item.ringkasan || '');
    setNewsIsi(item.isi || '');
    setNewsTanggal(item.tanggal || '');
    setNewsImageUrl(item.imageUrl || item.gambar || '');

    setTimeout(() => {
      const formEl = document.getElementById('form-berita-cms');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleDeleteNews = (id: string) => {
    Swal.fire({
      title: 'Hapus Berita?',
      text: 'Berita yang dihapus tidak dapat dikembalikan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus!',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const filtered = newsList.filter(item => item.id !== id);
        db.set('web_news', filtered);
        setNewsList(filtered);
        window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'web_news' } }));
        Swal.fire('Terhapus!', 'Berita berhasil dihapus.', 'success');
      }
    });
  };

  const handleResetNewsForm = () => {
    setEditingNews(null);
    setNewsTipe('PENGUMUMAN');
    setNewsJudul('');
    setNewsRingkasan('');
    setNewsIsi('');
    setNewsTanggal('');
    setNewsImageUrl('');
  };

  // Jadwal Kegiatan Bulanan & Jadwal Per Kelas CMS States
  const [jadwalBulanCMS, setJadwalBulanCMS] = useState<any[]>(() => {
    const stored = localStorage.getItem('ERP_jadwal_kegiatan_bulan');
    return stored ? JSON.parse(stored) : [];
  });
  const [editingJadwalBulan, setEditingJadwalBulan] = useState<any | null>(null);
  const [jbJudul, setJbJudul] = useState('');
  const [jbTanggal, setJbTanggal] = useState('');
  const [jbJam, setJbJam] = useState('');
  const [jbLokasi, setJbLokasi] = useState('');
  const [jbKategori, setJbKategori] = useState('Akademik');

  // Jadwal Per Kelas CMS States
  const [selectedKelasCMS, setSelectedKelasCMS] = useState<string>('XII_RPL');
  const [selectedHariCMS, setSelectedHariCMS] = useState<string>('Senin');
  const [jadwalPerKelasCMS, setJadwalPerKelasCMS] = useState<any[]>(() => {
    const stored = localStorage.getItem('ERP_jadwal_per_kelas');
    return stored ? JSON.parse(stored) : [];
  });
  const [editingJadwalKelas, setEditingJadwalKelas] = useState<any | null>(null);
  const [jkJam, setJkJam] = useState('');
  const [jkMapel, setJkMapel] = useState('');
  const [jkGuru, setJkGuru] = useState('');
  const [jkJenis, setJkJenis] = useState('Teori');
  const [jkRuangan, setJkRuangan] = useState('Ruang Teori');

  const handleSaveJadwalBulan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jbJudul.trim() || !jbTanggal.trim()) {
      Swal.fire('Form Tidak Lengkap', 'Judul dan Tanggal kegiatan wajib diisi.', 'warning');
      return;
    }
    let updatedList = [...jadwalBulanCMS];
    if (editingJadwalBulan) {
      updatedList = updatedList.map(item => item.id === editingJadwalBulan.id ? {
        ...item, judul: jbJudul, tanggal: jbTanggal, jam: jbJam, lokasi: jbLokasi, kategori: jbKategori
      } : item);
      Swal.fire('Berhasil!', 'Jadwal kegiatan berhasil diperbarui.', 'success');
    } else {
      const newItem = {
        id: Date.now(),
        judul: jbJudul,
        tanggal: jbTanggal,
        jam: jbJam || '08:00 WIB',
        lokasi: jbLokasi || 'Aula Rombel KTCT',
        kategori: jbKategori
      };
      updatedList.unshift(newItem);
      Swal.fire('Berhasil!', 'Jadwal kegiatan baru ditambahkan.', 'success');
    }
    setJadwalBulanCMS(updatedList);
    localStorage.setItem('ERP_jadwal_kegiatan_bulan', JSON.stringify(updatedList));
    setEditingJadwalBulan(null);
    setJbJudul(''); setJbTanggal(''); setJbJam(''); setJbLokasi(''); setJbKategori('Akademik');
  };

  const handleEditJadwalBulanClick = (item: any) => {
    setEditingJadwalBulan(item);
    setJbJudul(item.judul || '');
    setJbTanggal(item.tanggal || '');
    setJbJam(item.jam || '');
    setJbLokasi(item.lokasi || '');
    setJbKategori(item.kategori || 'Akademik');
  };

  const handleDeleteJadwalBulan = (id: number) => {
    Swal.fire({
      title: 'Hapus Kegiatan?',
      text: 'Kegiatan ini akan dihapus dari jadwal bulan ini.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus!',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const filtered = jadwalBulanCMS.filter(item => item.id !== id);
        setJadwalBulanCMS(filtered);
        localStorage.setItem('ERP_jadwal_kegiatan_bulan', JSON.stringify(filtered));
        Swal.fire('Terhapus!', 'Agenda kegiatan berhasil dihapus.', 'success');
      }
    });
  };

  const handleSaveJadwalKelas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jkMapel.trim() || !jkJam.trim()) {
      Swal.fire('Form Tidak Lengkap', 'Mata Pelajaran dan Jam wajib diisi.', 'warning');
      return;
    }
    let updatedList = [...jadwalPerKelasCMS];
    if (editingJadwalKelas) {
      updatedList = updatedList.map(item => item.id === editingJadwalKelas.id ? {
        ...item, kelas: selectedKelasCMS, hari: selectedHariCMS, jam: jkJam, mapel: jkMapel, guru: jkGuru, jenis: jkJenis, ruangan: jkRuangan
      } : item);
      Swal.fire('Berhasil!', 'Jadwal pelajaran kelas diperbarui.', 'success');
    } else {
      const newItem = {
        id: Date.now(),
        kelas: selectedKelasCMS,
        hari: selectedHariCMS,
        jam: jkJam,
        mapel: jkMapel,
        guru: jkGuru || 'Guru Pengampu',
        jenis: jkJenis,
        ruangan: jkRuangan || 'Ruang Kelas'
      };
      updatedList.push(newItem);
      Swal.fire('Berhasil!', 'Jadwal pelajaran baru ditambahkan.', 'success');
    }
    setJadwalPerKelasCMS(updatedList);
    localStorage.setItem('ERP_jadwal_per_kelas', JSON.stringify(updatedList));
    setEditingJadwalKelas(null);
    setJkJam(''); setJkMapel(''); setJkGuru(''); setJkJenis('Teori'); setJkRuangan('Ruang Teori');
  };

  const handleEditJadwalKelasClick = (item: any) => {
    setEditingJadwalKelas(item);
    setSelectedKelasCMS(item.kelas || 'XII_RPL');
    setSelectedHariCMS(item.hari || 'Senin');
    setJkJam(item.jam || '');
    setJkMapel(item.mapel || '');
    setJkGuru(item.guru || '');
    setJkJenis(item.jenis || 'Teori');
    setJkRuangan(item.ruangan || 'Ruang Teori');
  };

  const handleDeleteJadwalKelas = (id: number) => {
    Swal.fire({
      title: 'Hapus Jadwal Kelas?',
      text: 'Entri mata pelajaran ini akan dihapus dari jadwal kelas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus!',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const filtered = jadwalPerKelasCMS.filter(item => item.id !== id);
        setJadwalPerKelasCMS(filtered);
        localStorage.setItem('ERP_jadwal_per_kelas', JSON.stringify(filtered));
        Swal.fire('Terhapus!', 'Jadwal mata pelajaran berhasil dihapus.', 'success');
      }
    });
  };

  // Gallery Management
  const [galleryList, setGalleryList] = useState<any[]>(() => db.get<any>('web_gallery') || []);
  const [editingGallery, setEditingGallery] = useState<any | null>(null);
  const [galleryJudul, setGalleryJudul] = useState('');
  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [galleryDeskripsi, setGalleryDeskripsi] = useState('');

  // Downloads Management
  const [downloadsList, setDownloadsList] = useState<any[]>(() => db.get<any>('web_downloads') || []);
  const [editingDownload, setEditingDownload] = useState<any | null>(null);
  const [downloadJudul, setDownloadJudul] = useState('');
  const [downloadDeskripsi, setDownloadDeskripsi] = useState('');
  const [downloadFileSize, setDownloadFileSize] = useState('');
  const [downloadFileType, setDownloadFileType] = useState('PDF');
  const [downloadFileUrl, setDownloadFileUrl] = useState('');

  // Gallery Handlers
  const handleSaveGallery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryJudul.trim() || !galleryImageUrl.trim()) {
      Swal.fire('Eror', 'Judul dan URL gambar wajib diisi.', 'error');
      return;
    }

    let newList = [...galleryList];
    if (editingGallery) {
      newList = newList.map(g => g.id === editingGallery.id ? {
        ...g,
        judul: galleryJudul,
        imageUrl: galleryImageUrl,
        deskripsi: galleryDeskripsi,
        tanggal: g.tanggal || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      } : g);
      Swal.fire('Berhasil', 'Foto galeri berhasil diperbarui.', 'success');
    } else {
      const newItem = {
        id: `gal-${Date.now()}`,
        judul: galleryJudul,
        imageUrl: galleryImageUrl,
        deskripsi: galleryDeskripsi,
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      };
      newList.unshift(newItem);
      Swal.fire('Berhasil', 'Foto galeri baru berhasil ditambahkan.', 'success');
    }

    setGalleryList(newList);
    db.set('web_gallery', newList);
    handleResetGalleryForm();
  };

  const handleEditGalleryClick = (item: any) => {
    setEditingGallery(item);
    setGalleryJudul(item.judul);
    setGalleryImageUrl(item.imageUrl);
    setGalleryDeskripsi(item.deskripsi || '');
  };

  const handleDeleteGallery = (id: string) => {
    Swal.fire({
      title: 'Hapus Foto Galeri?',
      text: 'Foto ini akan dihapus dari galeri publik secara permanen!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result: any) => {
      if (result.isConfirmed) {
        const newList = galleryList.filter(g => g.id !== id);
        setGalleryList(newList);
        db.set('web_gallery', newList);
        Swal.fire('Dihapus!', 'Foto galeri berhasil dihapus.', 'success');
      }
    });
  };

  const handleResetGalleryForm = () => {
    setEditingGallery(null);
    setGalleryJudul('');
    setGalleryImageUrl('');
    setGalleryDeskripsi('');
  };

  // Downloads Handlers
  const handleSaveDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadJudul.trim() || !downloadFileUrl.trim()) {
      Swal.fire('Eror', 'Judul dan URL berkas wajib diisi.', 'error');
      return;
    }

    let newList = [...downloadsList];
    if (editingDownload) {
      newList = newList.map(d => d.id === editingDownload.id ? {
        ...d,
        judul: downloadJudul,
        deskripsi: downloadDeskripsi,
        fileSize: downloadFileSize || '1.0 MB',
        fileType: downloadFileType,
        fileUrl: downloadFileUrl,
        tanggal: d.tanggal || new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      } : d);
      Swal.fire('Berhasil', 'Informasi unduhan berhasil diperbarui.', 'success');
    } else {
      const newItem = {
        id: `dl-${Date.now()}`,
        judul: downloadJudul,
        deskripsi: downloadDeskripsi,
        fileSize: downloadFileSize || '1.0 MB',
        fileType: downloadFileType,
        fileUrl: downloadFileUrl,
        tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      };
      newList.unshift(newItem);
      Swal.fire('Berhasil', 'Berkas unduhan baru berhasil ditambahkan.', 'success');
    }

    setDownloadsList(newList);
    db.set('web_downloads', newList);
    handleResetDownloadForm();
  };

  const handleEditDownloadClick = (item: any) => {
    setEditingDownload(item);
    setDownloadJudul(item.judul);
    setDownloadDeskripsi(item.deskripsi || '');
    setDownloadFileSize(item.fileSize);
    setDownloadFileType(item.fileType);
    setDownloadFileUrl(item.fileUrl);
  };

  const handleDeleteDownload = (id: string) => {
    Swal.fire({
      title: 'Hapus Berkas?',
      text: 'Berkas ini akan dihapus dari pusat unduhan publik secara permanen!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result: any) => {
      if (result.isConfirmed) {
        const newList = downloadsList.filter(d => d.id !== id);
        setDownloadsList(newList);
        db.set('web_downloads', newList);
        Swal.fire('Dihapus!', 'Berkas unduhan berhasil dihapus.', 'success');
      }
    });
  };

  const handleResetDownloadForm = () => {
    setEditingDownload(null);
    setDownloadJudul('');
    setDownloadDeskripsi('');
    setDownloadFileSize('');
    setDownloadFileType('PDF');
    setDownloadFileUrl('');
  };

  // Dynamic form fields state (Universal for all ERP modules)
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(() => {
    return db.get<FormFieldConfig>('form_fields') || [];
  });
  const [formModuleFilter, setFormModuleFilter] = useState<string>('ALL');
  const [formSearchQuery, setFormSearchQuery] = useState<string>('');

  const handleAddField = () => {
    Swal.fire({
      title: 'Tambah Field Kustom Baru (Seluruh Modul ERP)',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="font-bold text-slate-700 block mb-1">Target Modul Aplikasi:</label>
            <select id="swal-field-modul" class="w-full border rounded-lg p-2 font-bold bg-slate-50 border-slate-300">
              <option value="SPMB" ${formModuleFilter === 'SPMB' ? 'selected' : ''}>🎯 SPMB / Pendaftaran Online</option>
              <option value="SISWA" ${formModuleFilter === 'SISWA' ? 'selected' : ''}>🎓 Data Siswa / Kesiswaan</option>
              <option value="GURU" ${formModuleFilter === 'GURU' ? 'selected' : ''}>👨‍🏫 Data Guru / GTK</option>
              <option value="KEUANGAN" ${formModuleFilter === 'KEUANGAN' ? 'selected' : ''}>💰 Keuangan & SPP</option>
              <option value="SARPRAS" ${formModuleFilter === 'SARPRAS' ? 'selected' : ''}>📦 Sarpras & Inventaris</option>
              <option value="BK" ${formModuleFilter === 'BK' ? 'selected' : ''}>🤝 Bimbingan Konseling (BK)</option>
              <option value="SURAT" ${formModuleFilter === 'SURAT' ? 'selected' : ''}>✉️ Persuratan & Agenda</option>
              <option value="SEMUA" ${formModuleFilter === 'SEMUA' ? 'selected' : ''}>🌐 Semua Modul (Universal)</option>
            </select>
          </div>
          <div>
            <label class="font-bold text-slate-700 block mb-1">Nama / Label Field:</label>
            <input id="swal-field-label" type="text" class="w-full border rounded-lg p-2 font-bold border-slate-300" placeholder="Contoh: Ukuran Baju, No Rekening Bank, Titik Jemput" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-bold text-slate-700 block mb-1">Tipe Input:</label>
              <select id="swal-field-type" class="w-full border rounded-lg p-2 font-bold bg-slate-50 border-slate-300">
                <option value="text">Teks Pendek</option>
                <option value="number">Angka / Nominal</option>
                <option value="date">Tanggal</option>
                <option value="dropdown">Pilihan (Dropdown)</option>
                <option value="textarea">Teks Panjang</option>
                <option value="file">Unggah Berkas (File)</option>
              </select>
            </div>
            <div>
              <label class="font-bold text-slate-700 block mb-1">Lebar Grid Layout:</label>
              <select id="swal-field-grid" class="w-full border rounded-lg p-2 font-bold bg-slate-50 border-slate-300">
                <option value="12">Penuh (Grid 12)</option>
                <option value="6" selected>Setengah (Grid 6)</option>
                <option value="4">Sepertiga (Grid 4)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="font-bold text-slate-700 block mb-1">Petunjuk / Placeholder (Opsional):</label>
            <input id="swal-field-placeholder" type="text" class="w-full border rounded-lg p-2 font-medium border-slate-300" placeholder="Contoh teks placeholder panduan" />
          </div>
          <div class="flex items-center gap-2 pt-1">
            <input id="swal-field-required" type="checkbox" class="rounded text-blue-600 w-4 h-4 cursor-pointer" />
            <label for="swal-field-required" class="font-bold text-slate-700 cursor-pointer">Wajib Diisi (Required)</label>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Tambah Field',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const modul = (document.getElementById('swal-field-modul') as HTMLSelectElement)?.value || 'SPMB';
        const label = (document.getElementById('swal-field-label') as HTMLInputElement)?.value?.trim();
        const type = (document.getElementById('swal-field-type') as HTMLSelectElement)?.value || 'text';
        const gridVal = (document.getElementById('swal-field-grid') as HTMLSelectElement)?.value || '6';
        const placeholder = (document.getElementById('swal-field-placeholder') as HTMLInputElement)?.value?.trim() || '';
        const required = (document.getElementById('swal-field-required') as HTMLInputElement)?.checked || false;

        if (!label) {
          Swal.showValidationMessage('Nama label field tidak boleh kosong!');
          return false;
        }
        return { modul, label, type, grid: parseInt(gridVal) || 6, placeholder, required };
      }
    }).then((res: any) => {
      if (res.isConfirmed && res.value) {
        const { modul, label, type, grid, placeholder, required } = res.value;
        const keySlug = 'kustom_' + modul.toLowerCase() + '_' + label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') + '_' + Date.now().toString().slice(-4);
        const newField: FormFieldConfig = {
          key: keySlug,
          label,
          type,
          grid,
          required,
          show: true,
          modul,
          formId: modul.toLowerCase() + '_custom',
          placeholder,
          urutan: formFields.length + 1
        };
        const updated = [...formFields, newField];
        setFormFields(updated);
        db.set('form_fields', updated);

        Swal.fire({
          icon: 'success',
          title: 'Field Berhasil Ditambahkan! 🎉',
          text: `Bidang "${label}" untuk modul [${modul}] telah ditambahkan ke tabel FORM_FIELDS.`,
          timer: 2500,
          showConfirmButton: false
        });

        setTimeout(() => {
          const matrixContainer = document.getElementById('spmb-matrix-container');
          if (matrixContainer) {
            matrixContainer.scrollTop = matrixContainer.scrollHeight;
          }
        }, 200);
      }
    });
  };

  const handleDeleteField = (index: number) => {
    const targetField = formFields[index];
    Swal.fire({
      title: 'Hapus Field Isian?',
      text: `Apakah Anda yakin ingin menghapus bidang "${targetField?.label || 'Isian'}" dari formulir pendaftaran?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const updated = [...formFields];
        updated.splice(index, 1);
        setFormFields(updated);
        db.set('form_fields', updated);
        Swal.fire('Terhapus', 'Bidang isian telah dihapus dari matriks.', 'success');
      }
    });
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const updated = [...formFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < updated.length) {
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      setFormFields(updated);
      db.set('form_fields', updated);
    }
  };

  const handleUpdateField = (index: number, keyToUpdate: keyof FormFieldConfig, value: any) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], [keyToUpdate]: value } as any;
    setFormFields(updated);
    db.set('form_fields', updated);
  };

  const handleResetFormFields = () => {
    Swal.fire({
      title: 'Kembalikan ke Default?',
      text: 'Semua isian kustom Anda akan diset ulang ke 77 isian default lengkap sesuai Google Sheet database.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reset ke Default',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        const defaults = initialFormFields;
        setFormFields(defaults);
        db.set('form_fields', defaults);
        window.dispatchEvent(new CustomEvent('erp-db-synced'));
        Swal.fire('Set Ulang Berhasil', `Matriks form fields berhasil dipulihkan sesuai setingan default lengkap (${defaults.length} Isian).`, 'success');
      }
    });
  };

  const handleSyncDatabase = () => {
    setDbStatus('syncing');
    Swal.fire({
      title: 'Sinkronisasi...',
      text: 'Menyelaraskan data lokal dengan spreadsheet Google Drive.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setTimeout(() => {
      Swal.close();
      setDbStatus('connected');
      Swal.fire('Sinkron Berhasil!', 'Database utama telah diselaraskan secara aman dengan cloud.', 'success');
    }, 2000);
  };

  const handleClearCache = () => {
    Swal.fire({
      title: 'Hapus & Bersihkan Seluruh Data Lokal?',
      text: 'Tindakan ini akan menghapus semua perubahan data Anda di browser ini dan mengembalikan database ke kondisi awal (Default Pabrik). Aplikasi akan dimuat ulang secara otomatis.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Bersihkan & Reset!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#475569'
    }).then((res: any) => {
      if (res.isConfirmed) {
        db.resetAll();
        Swal.fire({
          title: 'Database Dibersihkan!',
          text: 'Mengatur ulang seluruh data lokal. Aplikasi akan memuat ulang sekarang...',
          icon: 'success',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          window.location.reload();
        });
      }
    });
  };

  const handlePurgeDatabase = () => {
    Swal.fire({
      title: '🚨 RESET BASIS DATA SECARA PERMANEN?',
      text: 'Tindakan ini akan menghapus semua data siswa, kelas, guru, pendaftar, tagihan, tabungan, nilai, absensi, dan transaksi keuangan secara permanen dari localStorage dan basis data aplikasi, guna memulai dari kondisi bersih. Akun admin Anda akan tetap dipertahankan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Reset Basis Data!',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#475569'
    }).then(async (res: any) => {
      if (res.isConfirmed) {
        localStorage.setItem('ERP_siswa_purged_all', 'true');
        purgeAllData();
        
        const emptyKeys = [
          'siswa', 'spmb_pendaftar', 'ujian', 'soal', 'log_ujian', 'hasil_ujian',
          'tugas', 'hasil_tugas', 'absensi', 'tagihan', 'pembayaran', 'tabungan',
          'buku', 'peminjaman_buku', 'barang', 'peminjaman_barang', 'bimbingan', 'pelanggaran', 'logs',
          'kelas', 'guru', 'mapel', 'jenjang', 'tahun_ajaran', 'semester', 'biaya'
        ];
        
        emptyKeys.forEach(k => {
          localStorage.setItem(`ERP_${k}`, '[]');
          localStorage.setItem(`ERP_DB_V2_${k}`, '[]');
        });

        const defaultAdmins = [
          { id: 'USR_superadmin', username: 'superadmin', email: 'superadmin@sisko.sch.id', password: 'admin123', role: 'SUPERADMIN', name: 'Super Admin', status: 'AKTIF' },
          { id: 'USR_admin', username: 'admin', email: 'admin@sisko.sch.id', password: 'admin123', role: 'ADMIN', name: 'Administrator', status: 'AKTIF' },
          { id: 'USR_operator', username: 'operator', email: 'operator@sisko.sch.id', password: 'admin123', role: 'OPERATOR', name: 'Operator Rombel', status: 'AKTIF' }
        ];
        localStorage.setItem('ERP_users', JSON.stringify(defaultAdmins));

        // Purge Google Sheets if Web App URL is configured
        try {
          await purgeAllGoogleSheets();
        } catch (e) {}

        Swal.fire({
          title: 'Sukses Reset Basis Data!',
          text: 'Seluruh database bawaan telah dibersihkan sampai ke akar-akarnya. Aplikasi akan memuat ulang sekarang...',
          icon: 'success',
          showConfirmButton: false,
          timer: 2000
        }).then(() => {
          window.location.reload();
        });
      }
    });
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDays.length === 0) {
      Swal.fire('Eror', 'Silakan pilih minimal satu hari aktif.', 'error');
      return;
    }
    localStorage.setItem('ERP_school_name', schoolName);
    localStorage.setItem('ERP_foundation_name', foundationName);
    localStorage.setItem('ERP_academic_year', academicYear);
    localStorage.setItem('ERP_active_semester', semester);
    localStorage.setItem('ERP_active_days', JSON.stringify(activeDays));

    // Audit log
    const logs = db.get<any>('logs') || [];
    const newLog = {
      id: `LOG-${Date.now()}`,
      ts: new Date().toISOString(),
      who: user.name,
      action: 'UPDATE_GENERAL_CONFIG',
      meta: `Memperbarui konfigurasi instansi sekolah & hari aktif: ${activeDays.join(', ')}`
    };
    db.set('logs', [newLog, ...logs]);

    Swal.fire({
      icon: 'success',
      title: 'Konfigurasi Disimpan',
      text: 'Informasi instansi sekolah dan hari aktif berhasil diperbarui secara langsung di seluruh rombel!',
      confirmButtonColor: '#3b82f6'
    });
  };

  const handleSaveWebConfig = (e: React.FormEvent) => {
    e.preventDefault();
    db.setSingle('web_config', webConfig);
    localStorage.setItem('ERP_web_config', JSON.stringify(webConfig));
    if (webConfig.runningText) {
      localStorage.setItem('ERP_running_info_text', webConfig.runningText);
    }
    window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'web_config' } }));
    
    Swal.fire({
      icon: 'success',
      title: 'Tampilan Website Disimpan & Dipublikasikan Live! 🎉',
      text: 'Seluruh perubahan desain, teks hero, logo, visi misi, dan alur pendaftaran portal publik telah diperbarui secara langsung.',
      confirmButtonColor: '#3b82f6'
    });
  };

  const handleSaveFormConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('ERP_form_config', JSON.stringify(formConfig));
    db.set('form_fields', formFields);
    
    // Keep webConfig pendaftaranStatus in sync
    const updatedWebConfig = { 
      ...webConfig, 
      pendaftaranStatus: formConfig.statusPendaftaran === 'buka' ? 'dibuka' as const : 'ditutup' as const 
    };
    setWebConfig(updatedWebConfig);
    db.setSingle('web_config', updatedWebConfig);

    Swal.fire({
      icon: 'success',
      title: 'Konfigurasi Formulir Disimpan',
      text: 'Ketentuan dan isian dinamis formulir pendaftaran berhasil diperbarui!',
      confirmButtonColor: '#3b82f6'
    });
  };

  // Matrix Hak Akses (Role Permissions) Handlers
  const handleToggleMenuForRole = (menuId: string) => {
    const current = roleMatrix[selectedRole] || { role: selectedRole, menus: [], permissions: [] };
    const updatedMenus = current.menus.includes(menuId)
      ? current.menus.filter(m => m !== menuId)
      : [...current.menus, menuId];
    
    const updatedMatrix = {
      ...roleMatrix,
      [selectedRole]: { ...current, menus: updatedMenus }
    };
    setRoleMatrix(updatedMatrix);
  };

  const handleTogglePermissionForRole = (permId: string) => {
    const current = roleMatrix[selectedRole] || { role: selectedRole, menus: [], permissions: [] };
    const updatedPerms = current.permissions.includes(permId)
      ? current.permissions.filter(p => p !== permId)
      : [...current.permissions, permId];
    
    const updatedMatrix = {
      ...roleMatrix,
      [selectedRole]: { ...current, permissions: updatedPerms }
    };
    setRoleMatrix(updatedMatrix);
  };

  const handleSaveRoleMatrix = () => {
    savePermissionsMatrix(roleMatrix);
    
    // Write an activity log
    const logs = db.get<any>('logs') || [];
    const newLog = {
      id: `LOG-${Date.now()}`,
      ts: new Date().toISOString(),
      who: user.name,
      action: 'UPDATE_ROLE_MATRIX',
      meta: `Memperbarui hak akses menu & izin tindakan untuk Role: ${selectedRole}`
    };
    db.set('logs', [newLog, ...logs]);

    Swal.fire({
      icon: 'success',
      title: 'Kewenangan Role Disimpan',
      text: `Matriks Menu dan Tindakan untuk Role ${selectedRole} berhasil diperbarui di seluruh sirkuit ERP secara langsung!`,
      confirmButtonColor: '#3b82f6'
    });
  };

  const handleAddCustomRole = () => {
    if (!customRoleName.trim()) {
      Swal.fire('Eror', 'Nama role kustom tidak boleh kosong.', 'error');
      return;
    }
    const cleanId = customRoleName.trim().toUpperCase().replace(/\s+/g, '_');
    if (roleMatrix[cleanId] || AVAILABLE_ROLES.some(r => r.id === cleanId)) {
      Swal.fire('Eror', 'Role dengan ID tersebut sudah terdaftar.', 'error');
      return;
    }

    const newRoleObj = { id: cleanId, label: customRoleName.trim() };
    AVAILABLE_ROLES.push(newRoleObj);

    const updatedMatrix = {
      ...roleMatrix,
      [cleanId]: { role: cleanId, menus: ['dashboard'], permissions: ['view'] }
    };
    setRoleMatrix(updatedMatrix);
    savePermissionsMatrix(updatedMatrix);
    setSelectedRole(cleanId);
    setCustomRoleName('');

    Swal.fire('Sukses', `Role kustom "${customRoleName.trim()}" berhasil ditambahkan dan siap dikonfigurasi!`, 'success');
  };

  const handleResetRolesToDefault = () => {
    Swal.fire({
      title: 'Reset Matriks Hak Akses?',
      text: 'Semua kustomisasi menu dan tindakan akan dikembalikan ke pengaturan default standar pabrik.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Kembalikan Default',
      confirmButtonColor: '#ef4444',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        savePermissionsMatrix(DEFAULT_ROLE_PERMISSIONS);
        setRoleMatrix(DEFAULT_ROLE_PERMISSIONS);
        Swal.fire('Selesai', 'Matriks hak akses role berhasil dipulihkan sesuai standar.', 'success');
      }
    });
  };

  // User List & Multi-Role Handlers
  const handleEditUserRolesClick = (u: User) => {
    setEditingUserRoles(u);
    const existingRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
    setUserRolesEdit(existingRoles);
  };

  const handleToggleUserRoleSelect = (roleId: string) => {
    const updated = userRolesEdit.includes(roleId)
      ? userRolesEdit.filter(r => r !== roleId)
      : [...userRolesEdit, roleId];
    setUserRolesEdit(updated);
  };

  const handleSaveUserRoles = () => {
    if (!editingUserRoles) return;
    if (userRolesEdit.length === 0) {
      Swal.fire('Eror', 'Pengguna harus memiliki minimal satu Role utama.', 'error');
      return;
    }

    const primaryRole = userRolesEdit[0] as Role;

    const updatedUsers = usersList.map(u => {
      if (u.id === editingUserRoles.id) {
        return {
          ...u,
          role: primaryRole,
          roles: userRolesEdit
        };
      }
      return u;
    });

    db.set('users', updatedUsers);
    setUsersList(updatedUsers);

    // Write audit log
    const logs = db.get<any>('logs') || [];
    const newLog = {
      id: `LOG-${Date.now()}`,
      ts: new Date().toISOString(),
      who: user.name,
      action: 'ASSIGN_USER_ROLES',
      meta: `Mengubah hak akses multi-role untuk ${editingUserRoles.name} menjadi: ${userRolesEdit.join(', ')}`
    };
    db.set('logs', [newLog, ...logs]);

    // Update session locally if modifying currently logged-in user
    if (editingUserRoles.id === user.id) {
      const activeSession = localStorage.getItem('erp_session');
      if (activeSession) {
        const uObj = JSON.parse(activeSession);
        localStorage.setItem('erp_session', JSON.stringify({
          ...uObj,
          role: primaryRole,
          roles: userRolesEdit
        }));
      }
      Swal.fire({
        icon: 'success',
        title: 'Multi-Role Anda Diperbarui!',
        text: 'Sesi Anda berhasil diselaraskan. Halaman akan reload otomatis dalam 1.5 detik untuk memuat hak akses baru.',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        window.location.reload();
      });
    } else {
      Swal.fire('Sukses', `Multi-role untuk ${editingUserRoles.name} berhasil diperbarui secara instan!`, 'success');
      setEditingUserRoles(null);
    }
  };

  // Workflow Approval Handlers
  const handleToggleWorkflow = (wfId: string) => {
    const updated = workflows.map(w => {
      if (w.id === wfId) {
        return { ...w, status: w.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF' };
      }
      return w;
    });
    setWorkflows(updated);
    localStorage.setItem('ERP_workflows', JSON.stringify(updated));
    
    // Log
    const logs = db.get<any>('logs') || [];
    const newLog = {
      id: `LOG-${Date.now()}`,
      ts: new Date().toISOString(),
      who: user.name,
      action: 'TOGGLE_WORKFLOW',
      meta: `Mengubah status alur kerja "${workflows.find(w => w.id === wfId)?.name}"`
    };
    db.set('logs', [newLog, ...logs]);

    Swal.fire('Berhasil', 'Status alur kerja persetujuan berhasil diubah.', 'success');
  };

  const handleUpdateWorkflowApprover = (wfId: string, approverRole: string) => {
    const updated = workflows.map(w => {
      if (w.id === wfId) {
        return { ...w, approverRole };
      }
      return w;
    });
    setWorkflows(updated);
    localStorage.setItem('ERP_workflows', JSON.stringify(updated));

    // Log
    const logs = db.get<any>('logs') || [];
    const newLog = {
      id: `LOG-${Date.now()}`,
      ts: new Date().toISOString(),
      who: user.name,
      action: 'UPDATE_WORKFLOW_APPROVER',
      meta: `Mengubah penyetuju alur kerja "${workflows.find(w => w.id === wfId)?.name}" menjadi: ${approverRole}`
    };
    db.set('logs', [newLog, ...logs]);

    Swal.fire('Berhasil', 'Role penyetuju (approver) alur kerja berhasil diperbarui.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {[
          { id: 'dashboard', label: 'Pengaturan Dashboard' },
          { id: 'role', label: 'Hak Akses / Role' },
          { id: 'database_integrasi', label: 'Database & Integrasi (Sync GAS)' },
          { id: 'konfigurasi', label: 'Konfigurasi Umum' },
          { id: 'tampilan', label: 'Tampilan Website' },
          { id: 'jadwal_kegiatan', label: 'Input Jadwal Kegiatan & Per Kelas' },
          { id: 'berita', label: 'Kelola Berita' },
          { id: 'kelola_konten', label: 'Kelola Galeri & Unduhan' },
          { id: 'formulir', label: 'Form & Field Builder (Semua Modul)' },
          { id: 'backup', label: 'Backup & Restore (JSON)' }
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-set-${tab.id}`}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
              activeSubTab === tab.id ||
              (tab.id === 'database_integrasi' && ['sistem', 'google_sheets', 'export_gas'].includes(activeSubTab))
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'dashboard' && (
        <div className="grid grid-cols-1 max-w-2xl gap-6 text-xs">
          {/* User profile */}
          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Shield className="w-5 h-5" /></div>
              <h4 className="font-extrabold text-slate-800 text-sm">Informasi Akun</h4>
            </div>

            <div className="space-y-2 pt-2">
              <div className="p-3 bg-slate-50 border rounded-2xl flex justify-between">
                <span className="text-slate-400 font-semibold">Nama Pengguna</span>
                <span className="font-bold text-slate-800">{user.name}</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-2xl flex justify-between">
                <span className="text-slate-400 font-semibold">Email Pengguna</span>
                <span className="font-bold text-slate-800">{user.email}</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-2xl flex justify-between">
                <span className="text-slate-400 font-semibold">Role Hak Akses</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'role' && (
        <div className="space-y-6">
          {/* Sub Navigation Bar for Role Control Panel */}
          <div className="bg-slate-900 text-slate-100 p-4 rounded-3xl flex flex-wrap gap-2 items-center justify-between shadow-md">
            <div className="flex gap-2">
              <button
                onClick={() => setRoleSubTab('matrix')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  roleSubTab === 'matrix' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Shield className="w-4 h-4" /> Matriks Hak Akses
              </button>
              <button
                onClick={() => setRoleSubTab('users')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  roleSubTab === 'users' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Sliders className="w-4 h-4" /> Multi-Role Pengguna
              </button>
              <button
                onClick={() => setRoleSubTab('workflows')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  roleSubTab === 'workflows' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <RefreshCw className="w-4 h-4" /> Alur Persetujuan
              </button>
              <button
                onClick={() => setRoleSubTab('logs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  roleSubTab === 'logs' ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Terminal className="w-4 h-4" /> Audit Log Keamanan
              </button>
            </div>
            <button
              onClick={handleResetRolesToDefault}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default Pabrik
            </button>
          </div>

          {/* Sub-tab 1: Matriks Hak Akses */}
          {roleSubTab === 'matrix' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg uppercase">Matriks Hak Akses Dinamis</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Tentukan menu dan tindakan operasional yang diizinkan untuk setiap Role secara dinamis tanpa mengubah source code.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Pilih Role:</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {AVAILABLE_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label} ({r.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Layout Two-Column Grid: Menu Access & Action Access */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Menu Access */}
                <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" /> Akses Menu Utama ({AVAILABLE_MENUS.length})
                    </h4>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">Otomatis Tersembunyi</span>
                  </div>
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {AVAILABLE_MENUS.map((menu) => {
                      const hasAccess = (roleMatrix[selectedRole]?.menus || []).includes(menu.id);
                      return (
                        <div
                          key={menu.id}
                          onClick={() => handleToggleMenuForRole(menu.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                            hasAccess 
                              ? 'bg-blue-50/60 border-blue-200 text-blue-900 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-extrabold">{menu.label}</span>
                            <span className="text-[10px] text-slate-400 font-semibold mt-0.5">ID: {menu.id}</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mr-3 ${hasAccess ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                              {hasAccess ? 'Aktif' : 'Nonaktif'}
                            </span>
                            <input
                              type="checkbox"
                              checked={hasAccess}
                              readOnly
                              className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Operation Access */}
                <div className="border border-slate-150 rounded-2xl p-5 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600" /> Izin Tindakan / Action ({AVAILABLE_PERMISSIONS.length})
                    </h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Granular Controls</span>
                  </div>
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {AVAILABLE_PERMISSIONS.map((perm) => {
                      const hasAccess = (roleMatrix[selectedRole]?.permissions || []).includes(perm.id);
                      return (
                        <div
                          key={perm.id}
                          onClick={() => handleTogglePermissionForRole(perm.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                            hasAccess 
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-extrabold">{perm.label}</span>
                            <span className="text-[10px] text-slate-400 font-semibold mt-0.5">Kode Izin: {perm.id}</span>
                          </div>
                          <div className="flex items-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mr-3 ${hasAccess ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                              {hasAccess ? 'Diizinkan' : 'Dilarang'}
                            </span>
                            <input
                              type="checkbox"
                              checked={hasAccess}
                              readOnly
                              className="w-4 h-4 rounded cursor-pointer accent-emerald-600"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Botton Action Buttons & Create Custom Role Panel */}
              <div className="pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customRoleName}
                    onChange={(e) => setCustomRoleName(e.target.value)}
                    placeholder="Nama Role Kustom Baru..."
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 w-48"
                  />
                  <button
                    onClick={handleAddCustomRole}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-4 h-4" /> Tambah Role Kustom
                  </button>
                </div>

                <button
                  onClick={handleSaveRoleMatrix}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow"
                >
                  <Save className="w-4 h-4" /> Simpan Konfigurasi Role {selectedRole}
                </button>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Manajemen Multi-Role Pengguna */}
          {roleSubTab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg uppercase">Pemetaan Multi-Role Pengguna</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Tugaskan beberapa kewenangan jabatan sekaligus kepada satu orang akun pegawai sekolah (misal: Guru + Wali Kelas + Bendahara).</p>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Cari akun pengguna..."
                    className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl pl-9 pr-4 py-2 outline-none focus:border-blue-500 w-64"
                  />
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-slate-100 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-4">Akun & Nama Lengkap</th>
                      <th className="p-4">Username</th>
                      <th className="p-4">Role Utama</th>
                      <th className="p-4">Daftar Multi-Role Aktif</th>
                      <th className="p-4 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {usersList
                      .filter(u => 
                        u.name.toLowerCase().includes(searchUser.toLowerCase()) || 
                        u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
                        u.role.toLowerCase().includes(searchUser.toLowerCase())
                      )
                      .map((u) => {
                        const activeRoles = u.roles && u.roles.length > 0 ? u.roles : [u.role];
                        return (
                          <tr key={u.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900">{u.name}</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">ID: {u.id} {u.email ? `• ${u.email}` : ''}</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-600">{u.username}</td>
                            <td className="p-4">
                              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase text-[10px]">
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {activeRoles.map((r, idx) => (
                                  <span key={idx} className="font-bold text-slate-800 bg-slate-100 border px-1.5 py-0.5 rounded text-[9px] uppercase">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => handleEditUserRolesClick(u)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition flex items-center gap-1 mx-auto text-[10px] font-bold"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Atur Multi-Role
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Edit Roles Modal (Overlay) */}
              {editingUserRoles && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up">
                  <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5">
                    <div className="border-b pb-3 flex justify-between items-center">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-lg uppercase">Konfigurasi Jabatan (Role)</h4>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">{editingUserRoles.name}</p>
                      </div>
                      <button
                        onClick={() => setEditingUserRoles(null)}
                        className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-500 uppercase">Centang Kewenangan Jabatan (Bisa Lebih Dari Satu):</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 border rounded-2xl p-4 bg-slate-50/50">
                        {AVAILABLE_ROLES.map((r) => {
                          const isChecked = userRolesEdit.includes(r.id);
                          return (
                            <label
                              key={r.id}
                              className={`flex items-center gap-2.5 p-2 rounded-xl border text-[11px] font-bold cursor-pointer transition ${
                                isChecked 
                                  ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleUserRoleSelect(r.id)}
                                className="w-3.5 h-3.5 rounded accent-blue-600"
                              />
                              <span className="truncate">{r.label}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold italic">* Role pertama yang Anda centang secara otomatis akan menjadi "Role Utama (Primary)" akun pengguna tersebut.</p>
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-2">
                      <button
                        onClick={() => setEditingUserRoles(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveUserRoles}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow flex items-center gap-1.5"
                      >
                        <Save className="w-4 h-4" /> Simpan Multi-Role
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 3: Alur Persetujuan & Alur Kerja */}
          {roleSubTab === 'workflows' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
              <div className="border-b pb-4">
                <h3 className="font-extrabold text-slate-800 text-lg uppercase">Alur Kerja Otorisasi & Persetujuan (Workflow)</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Tentukan role pemegang persetujuan (approval) berjenjang pada aktivitas penting ERP seperti pencairan dana, verifikasi berkas, dan ujian CBT.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflows.map((wf) => (
                  <div key={wf.id} className="border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-blue-400 transition bg-slate-50/20">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {wf.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">Status:</span>
                        <button
                          onClick={() => handleToggleWorkflow(wf.id)}
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full transition uppercase ${
                            wf.status === 'AKTIF' 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {wf.status}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-950 text-sm">{wf.name}</h4>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed leading-snug">{wf.description}</p>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between text-xs font-semibold text-slate-700 font-bold">
                      <span>Otoritas Penyetuju:</span>
                      <select
                        value={wf.approverRole}
                        onChange={(e) => handleUpdateWorkflowApprover(wf.id, e.target.value)}
                        disabled={wf.status !== 'AKTIF'}
                        className="bg-white border border-slate-200 text-[10px] font-extrabold text-slate-800 rounded-lg px-2 py-1 outline-none cursor-pointer focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 4: Audit Log Keamanan */}
          {roleSubTab === 'logs' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in-up">
              <div className="border-b pb-4">
                <h3 className="font-extrabold text-slate-800 text-lg uppercase">Audit Trail & Log Keamanan</h3>
                <p className="text-xs text-slate-400 mt-1 font-semibold">Log kronologis lengkap pelacakan aktivitas konfigurasi hak akses, multi-role pengguna, dan parameter keamanan ERP.</p>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-slate-100 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-4">Tanggal & Waktu</th>
                      <th className="p-4">Operator Pelaksana</th>
                      <th className="p-4">Tindakan Sistem</th>
                      <th className="p-4">Deskripsi Aktivitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 font-mono">
                    {(db.get<any>('logs') || [])
                      .filter((l: any) => 
                        ['UPDATE_ROLE_MATRIX', 'ASSIGN_USER_ROLES', 'TOGGLE_WORKFLOW', 'UPDATE_WORKFLOW_APPROVER'].includes(l.action)
                      )
                      .map((log: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition text-[11px]">
                          <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(log.ts).toLocaleString('id-ID')}</td>
                          <td className="p-4 text-blue-600 font-bold font-sans">{log.who}</td>
                          <td className="p-4 text-emerald-600 font-extrabold">{log.action}</td>
                          <td className="p-4 text-slate-700 font-sans">{log.meta}</td>
                        </tr>
                      ))}
                    {(!db.get<any>('logs') || db.get<any>('logs').filter((l: any) => 
                      ['UPDATE_ROLE_MATRIX', 'ASSIGN_USER_ROLES', 'TOGGLE_WORKFLOW', 'UPDATE_WORKFLOW_APPROVER'].includes(l.action)
                    ).length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest">
                          KOSONG
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'konfigurasi' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-slate-800 text-lg uppercase">Konfigurasi Profil Instansi Sekolah</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Tentukan data kop surat resmi, nama yayasan, serta tahun akademik rombel default.</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lembaga Pendidikan</label>
                <input required type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Yayasan Pendiri</label>
                <input required type="text" value={foundationName} onChange={(e) => setFoundationName(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun Ajaran Aktif</label>
                <input required type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Semester Aktif</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 font-bold">
                  <option value="GANJIL">Ganjil / Semester 1</option>
                  <option value="GENAP">Genap / Semester 2</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Hari Aktif Kegiatan Rombel</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                  const isChecked = activeDays.includes(day);
                  return (
                    <label
                      key={day}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all duration-200 select-none ${
                        isChecked 
                          ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-sm' 
                          : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const updated = isChecked 
                            ? activeDays.filter(d => d !== day)
                            : [...activeDays, day];
                          setActiveDays(updated);
                        }}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                      <span>{day}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold italic mt-1">* Centang hari-hari aktif kegiatan pembelajaran di Rombel KTCT Tambora. Jadwal mata pelajaran akademik akan menyesuaikan secara dinamis.</p>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow">
                <Save className="w-4 h-4" /> Simpan Konfigurasi
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === 'tampilan' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" /> Pengaturan Tampilan & CMS Website
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Sesuaikan teks, gambar hero, logo, dan informasi sosial media di portal depan secara instan.</p>
            </div>
          </div>

          <form onSubmit={handleSaveWebConfig} className="space-y-6 text-xs">
            {/* Bagian 1: Identitas Website */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm border-b pb-1 text-blue-600">1. Identitas & Teks Header Website</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Aplikasi (Header)</label>
                  <input required type="text" value={webConfig.appName} onChange={(e) => setWebConfig({...webConfig, appName: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Sidebar Admin</label>
                  <input required type="text" value={webConfig.judulSidebar} onChange={(e) => setWebConfig({...webConfig, judulSidebar: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
              </div>
            </div>

            {/* Bagian Media: Pengaturan Merubah Logo, Profil, Kepala Sekolah, Berita & Hero */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="font-bold text-slate-800 text-sm text-blue-600 flex items-center gap-1.5">
                  🖼️ Pengaturan Gambar, Logo & Foto Utama Website
                </h4>
                <span className="text-[10px] text-slate-400 font-semibold">Dapat memasukkan URL atau Unggah Berkas Langsung</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Logo Lembaga */}
                <div className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={webConfig.logoUrl || '/logo_rombel.svg'} alt="Preview Logo" className="w-12 h-12 object-contain bg-slate-900 rounded-xl p-1 border shadow-sm shrink-0" />
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-xs">1. Logo Utama Lembaga</h5>
                      <p className="text-[10px] text-slate-400">Tampil di Navbar, Header, dan Footer Website</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input type="text" value={webConfig.logoUrl || ''} onChange={(e) => setWebConfig({...webConfig, logoUrl: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold" placeholder="URL Logo (https://...)" />
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition cursor-pointer text-[10px]">
                        📁 Unggah Logo Lokal
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) setWebConfig(prev => ({ ...prev, logoUrl: ev.target!.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                      <button type="button" onClick={() => setWebConfig({...webConfig, logoUrl: '/logo_rombel.svg'})} className="text-[10px] text-slate-500 underline hover:text-slate-700">Reset Default</button>
                    </div>
                  </div>
                </div>

                {/* 2. Gambar Profil Sekolah */}
                <div className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={webConfig.profileImageUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600'} alt="Preview Profil" className="w-16 h-12 object-cover rounded-xl border shadow-sm shrink-0" />
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-xs">2. Gambar Profil / Sejarah Sekolah</h5>
                      <p className="text-[10px] text-slate-400">Tampil pada halaman Profil & Sejarah Organisasi</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input type="text" value={webConfig.profileImageUrl || ''} onChange={(e) => setWebConfig({...webConfig, profileImageUrl: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold" placeholder="URL Gambar Profil (https://...)" />
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition cursor-pointer text-[10px]">
                        📁 Unggah Gambar Profil
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) setWebConfig(prev => ({ ...prev, profileImageUrl: ev.target!.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 3. Foto Kepala Sekolah */}
                <div className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={webConfig.kepalaSekolahImageUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400'} alt="Preview Kepala Sekolah" className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-sm shrink-0" />
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-xs">3. Foto Kepala Sekolah / Pimpinan</h5>
                      <p className="text-[10px] text-slate-400">Tampil pada card Sambutan Kepala Rombel</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input type="text" value={webConfig.kepalaSekolahImageUrl || ''} onChange={(e) => setWebConfig({...webConfig, kepalaSekolahImageUrl: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold" placeholder="URL Foto Kepala Sekolah (https://...)" />
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition cursor-pointer text-[10px]">
                        📁 Unggah Foto Pimpinan
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) setWebConfig(prev => ({ ...prev, kepalaSekolahImageUrl: ev.target!.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Cover Gambar Berita & Pengumuman */}
                <div className="p-4 border rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={webConfig.beritaImageUrl || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500'} alt="Preview Cover Berita" className="w-16 h-12 object-cover rounded-xl border shadow-sm shrink-0" />
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-xs">4. Cover Gambar Default Berita & Pengumuman</h5>
                      <p className="text-[10px] text-slate-400">Gambar sampul berita jika tidak melampirkan gambar khusus</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input type="text" value={webConfig.beritaImageUrl || ''} onChange={(e) => setWebConfig({...webConfig, beritaImageUrl: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 text-xs font-semibold" placeholder="URL Cover Berita (https://...)" />
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition cursor-pointer text-[10px]">
                        📁 Unggah Cover Berita
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) setWebConfig(prev => ({ ...prev, beritaImageUrl: ev.target!.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 2: Banner Hero & Headline */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm border-b pb-1 text-blue-600">2. Bagian Utama (Hero Banner)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Teks Lencana Mini (Badge)</label>
                  <input required type="text" value={webConfig.teksHero} onChange={(e) => setWebConfig({...webConfig, teksHero: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" placeholder="Contoh: Penerimaan Peserta Didik Baru" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Gambar Latar Belakang Hero (URL / File Upload)</label>
                  <div className="flex gap-2">
                    <input required type="text" value={webConfig.heroImageUrl} onChange={(e) => setWebConfig({...webConfig, heroImageUrl: formatGoogleDriveUrl(e.target.value)})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-xs" placeholder="https://drive.google.com/..." />
                    <label className="px-3 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 transition cursor-pointer text-[10px] shrink-0 flex items-center gap-1">
                      📁 Unggah Foto
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) setWebConfig(prev => ({ ...prev, heroImageUrl: ev.target!.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Headline Utama Baris 1</label>
                  <input required type="text" value={webConfig.heroBaris1} onChange={(e) => setWebConfig({...webConfig, heroBaris1: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Headline Utama Baris 2 (Warna Sorotan)</label>
                  <input required type="text" value={webConfig.heroBaris2} onChange={(e) => setWebConfig({...webConfig, heroBaris2: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Sub-teks Penjelasan Singkat</label>
                  <textarea required rows={2} value={webConfig.heroSubteks} onChange={(e) => setWebConfig({...webConfig, heroSubteks: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase text-blue-600">Visi Lembaga / Rombel</label>
                  <textarea rows={2} value={webConfig.visi || ''} onChange={(e) => setWebConfig({...webConfig, visi: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" placeholder="Tulis visi lembaga..." />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase text-blue-600">Misi Lembaga / Rombel (Pisahkan per baris untuk membuat poin otomatis)</label>
                  <textarea rows={4} value={webConfig.misi || ''} onChange={(e) => setWebConfig({...webConfig, misi: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" placeholder="Tulis misi lembaga..." />
                </div>
              </div>
            </div>

            {/* Bagian 3: Alur Pendaftaran */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm border-b pb-1 text-blue-600">3. Kustomisasi Langkah Alur Penerimaan (PPDB)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border bg-slate-50/50 rounded-2xl space-y-3">
                  <span className="font-bold text-slate-800 text-xs">Langkah 1</span>
                  <div className="space-y-2">
                    <input required type="text" value={webConfig.alur1_judul} onChange={(e) => setWebConfig({...webConfig, alur1_judul: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 font-bold" placeholder="Judul Langkah 1" />
                    <input required type="text" value={webConfig.alur1_desc} onChange={(e) => setWebConfig({...webConfig, alur1_desc: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500" placeholder="Deskripsi Langkah 1" />
                  </div>
                </div>

                <div className="p-4 border bg-slate-50/50 rounded-2xl space-y-3">
                  <span className="font-bold text-slate-800 text-xs">Langkah 2</span>
                  <div className="space-y-2">
                    <input required type="text" value={webConfig.alur2_judul} onChange={(e) => setWebConfig({...webConfig, alur2_judul: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 font-bold" placeholder="Judul Langkah 2" />
                    <input required type="text" value={webConfig.alur2_desc} onChange={(e) => setWebConfig({...webConfig, alur2_desc: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500" placeholder="Deskripsi Langkah 2" />
                  </div>
                </div>

                <div className="p-4 border bg-slate-50/50 rounded-2xl space-y-3">
                  <span className="font-bold text-slate-800 text-xs">Langkah 3</span>
                  <div className="space-y-2">
                    <input required type="text" value={webConfig.alur3_judul} onChange={(e) => setWebConfig({...webConfig, alur3_judul: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 font-bold" placeholder="Judul Langkah 3" />
                    <input required type="text" value={webConfig.alur3_desc} onChange={(e) => setWebConfig({...webConfig, alur3_desc: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500" placeholder="Deskripsi Langkah 3" />
                  </div>
                </div>

                <div className="p-4 border bg-slate-50/50 rounded-2xl space-y-3">
                  <span className="font-bold text-slate-800 text-xs">Langkah 4</span>
                  <div className="space-y-2">
                    <input required type="text" value={webConfig.alur4_judul} onChange={(e) => setWebConfig({...webConfig, alur4_judul: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 font-bold" placeholder="Judul Langkah 4" />
                    <input required type="text" value={webConfig.alur4_desc} onChange={(e) => setWebConfig({...webConfig, alur4_desc: e.target.value})} className="w-full bg-white border rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-500" placeholder="Deskripsi Langkah 4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 4: Footer, Kontak & Medsos */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm border-b pb-1 text-blue-600">4. Kontak, Footer & Media Sosial</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Footer / Lembaga</label>
                  <input required type="text" value={webConfig.footerJudul} onChange={(e) => setWebConfig({...webConfig, footerJudul: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nomor Telepon Hubungi Kami</label>
                  <input required type="text" value={webConfig.footerTelepon} onChange={(e) => setWebConfig({...webConfig, footerTelepon: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Email Layanan Konsultasi</label>
                  <input required type="text" value={webConfig.footerEmail} onChange={(e) => setWebConfig({...webConfig, footerEmail: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Alamat Kantor / Sekolah Fisik</label>
                  <input required type="text" value={webConfig.footerAlamat} onChange={(e) => setWebConfig({...webConfig, footerAlamat: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Teks Hak Cipta (Copyright)</label>
                  <input required type="text" value={webConfig.footerHakCipta} onChange={(e) => setWebConfig({...webConfig, footerHakCipta: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tautan Link Instagram</label>
                  <input type="text" value={webConfig.linkIg || ''} onChange={(e) => setWebConfig({...webConfig, linkIg: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tautan Link YouTube</label>
                  <input type="text" value={webConfig.linkYt || ''} onChange={(e) => setWebConfig({...webConfig, linkYt: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tautan Link Facebook</label>
                  <input type="text" value={webConfig.linkFb || ''} onChange={(e) => setWebConfig({...webConfig, linkFb: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tautan Link Telegram</label>
                  <input type="text" value={webConfig.linkTg || ''} onChange={(e) => setWebConfig({...webConfig, linkTg: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow">
                <Save className="w-4 h-4" /> Publikasikan Tampilan Baru
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === 'jadwal_kegiatan' && (
        <div className="space-y-8 text-xs">
          {/* BAGIAN 1: JADWAL KEGIATAN BULANAN (PORTAL PUBLIK & DASHBOARD) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base uppercase flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  1. Kelola Jadwal Kegiatan Untuk Satu Bulan (Portal Publik & Dashboard)
                </h3>
                <p className="text-xs text-slate-400 mt-1">Agenda yang diinput di sini akan langsung tampil pada widget Jadwal Kegiatan di Portal Depan dan Dashboard Utama.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input Kegiatan Bulanan */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase flex items-center justify-between">
                  <span>{editingJadwalBulan ? '✏️ Edit Agenda Kegiatan' : '➕ Tambah Agenda Kegiatan Baru'}</span>
                  {editingJadwalBulan && (
                    <button onClick={() => { setEditingJadwalBulan(null); setJbJudul(''); setJbTanggal(''); setJbJam(''); setJbLokasi(''); }} className="text-[10px] text-red-500 font-bold hover:underline">
                      Batal Edit
                    </button>
                  )}
                </h4>

                <form onSubmit={handleSaveJadwalBulan} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Judul Kegiatan</label>
                    <input required type="text" value={jbJudul} onChange={(e) => setJbJudul(e.target.value)} placeholder="Contoh: Workshop Coding Cisco" className="w-full bg-white border rounded-xl px-3 py-2 font-bold" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Tanggal (e.g. 20 Juli 2026)</label>
                      <input required type="text" value={jbTanggal} onChange={(e) => setJbTanggal(e.target.value)} placeholder="20 Juli 2026" className="w-full bg-white border rounded-xl px-3 py-2 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Waktu / Jam</label>
                      <input type="text" value={jbJam} onChange={(e) => setJbJam(e.target.value)} placeholder="08:00 - 12:00 WIB" className="w-full bg-white border rounded-xl px-3 py-2 font-semibold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Lokasi / Tempat</label>
                      <input type="text" value={jbLokasi} onChange={(e) => setJbLokasi(e.target.value)} placeholder="Aula Utama / Lab Komputer" className="w-full bg-white border rounded-xl px-3 py-2 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Kategori</label>
                      <select value={jbKategori} onChange={(e) => setJbKategori(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 font-bold">
                        <option value="Akademik">Akademik</option>
                        <option value="Pelatihan">Pelatihan</option>
                        <option value="Ujian">Ujian CBT</option>
                        <option value="BK & Karir">BK & Karir</option>
                        <option value="Sosial">Sosial / Organisasi</option>
                        <option value="Ekstrakurikuler">Ekstrakurikuler</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1.5 pt-2">
                    <Save className="w-4 h-4" />
                    <span>{editingJadwalBulan ? 'Simpan Perubahan Kegiatan' : 'Simpan Ke Jadwal Bulanan'}</span>
                  </button>
                </form>
              </div>

              {/* Daftar Kegiatan Bulanan */}
              <div className="lg:col-span-7 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase flex items-center justify-between">
                  <span>Daftar Kegiatan Bulan Ini ({jadwalBulanCMS.length} Agenda)</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Live Sync Active</span>
                </h4>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {jadwalBulanCMS.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed rounded-2xl text-slate-400">
                      Belum ada jadwal kegiatan bulanan. Silakan isi form di sebelah kiri.
                    </div>
                  ) : (
                    jadwalBulanCMS.map((item) => (
                      <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-emerald-200 transition shadow-sm">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                              {item.kategori}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" /> {item.tanggal} ({item.jam})
                            </span>
                          </div>
                          <h5 className="font-extrabold text-slate-800 text-xs line-clamp-1">{item.judul}</h5>
                          <p className="text-[10px] text-slate-500 font-semibold">{item.lokasi}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleEditJadwalBulanClick(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteJadwalBulan(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN 2: JADWAL MATAPELAJARAN / AGENDA PER KELAS */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base uppercase flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  2. Kelola Jadwal Pelajaran Per Kelas & Hari
                </h3>
                <p className="text-xs text-slate-400 mt-1">Pilih kelas dan hari untuk menambah, mengubah, atau menghapus susunan jadwal mata pelajaran.</p>
              </div>

              {/* Filter Kelas & Hari */}
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                <select value={selectedKelasCMS} onChange={(e) => setSelectedKelasCMS(e.target.value)} className="bg-white border rounded-xl px-3 py-1.5 text-xs font-black text-blue-900">
                  <option value="XII_RPL">Kelas XII RPL</option>
                  <option value="XI_RPL">Kelas XI RPL</option>
                  <option value="X_RPL">Kelas X RPL</option>
                  <option value="XII_AKUN">Kelas XII Akuntansi</option>
                  <option value="XI_AKUN">Kelas XI Akuntansi</option>
                  <option value="X_AKUN">Kelas X Akuntansi</option>
                </select>

                <select value={selectedHariCMS} onChange={(e) => setSelectedHariCMS(e.target.value)} className="bg-white border rounded-xl px-3 py-1.5 text-xs font-black text-slate-800">
                  <option value="Senin">Senin</option>
                  <option value="Selasa">Selasa</option>
                  <option value="Rabu">Rabu</option>
                  <option value="Kamis">Kamis</option>
                  <option value="Jumat">Jumat</option>
                  <option value="Sabtu">Sabtu</option>
                  <option value="Minggu">Minggu</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input Jadwal Pelajaran Kelas */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase flex items-center justify-between">
                  <span>{editingJadwalKelas ? '✏️ Edit Jadwal Pelajaran' : '➕ Tambah Mata Pelajaran Baru'}</span>
                  {editingJadwalKelas && (
                    <button onClick={() => { setEditingJadwalKelas(null); setJkJam(''); setJkMapel(''); setJkGuru(''); }} className="text-[10px] text-red-500 font-bold hover:underline">
                      Batal Edit
                    </button>
                  )}
                </h4>

                <form onSubmit={handleSaveJadwalKelas} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Mata Pelajaran</label>
                    <input required type="text" value={jkMapel} onChange={(e) => setJkMapel(e.target.value)} placeholder="Contoh: Pemrograman Web & React" className="w-full bg-white border rounded-xl px-3 py-2 font-bold" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Rentang Jam</label>
                      <input required type="text" value={jkJam} onChange={(e) => setJkJam(e.target.value)} placeholder="08:00 - 09:30" className="w-full bg-white border rounded-xl px-3 py-2 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Sifat / Jenis</label>
                      <select value={jkJenis} onChange={(e) => setJkJenis(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 font-bold">
                        <option value="Teori">Teori</option>
                        <option value="Praktik">Praktik</option>
                        <option value="Lab">Praktikum Lab</option>
                        <option value="Bimbingan">Bimbingan / BK</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Guru Pengampu</label>
                      <input type="text" value={jkGuru} onChange={(e) => setJkGuru(e.target.value)} placeholder="Budi Hartono, S.Pd" className="w-full bg-white border rounded-xl px-3 py-2 font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Ruangan / Lab</label>
                      <input type="text" value={jkRuangan} onChange={(e) => setJkRuangan(e.target.value)} placeholder="Lab Komputer 1 / Ruang 302" className="w-full bg-white border rounded-xl px-3 py-2 font-semibold" />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1.5 pt-2">
                    <Save className="w-4 h-4" />
                    <span>{editingJadwalKelas ? 'Simpan Perubahan' : 'Tambah Ke Jadwal Kelas'}</span>
                  </button>
                </form>
              </div>

              {/* Tabel / Lista Jadwal Per Kelas */}
              <div className="lg:col-span-7 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs uppercase flex items-center justify-between">
                  <span>Jadwal Pelajaran: {selectedKelasCMS.replace('_', ' ')} ({selectedHariCMS})</span>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                    {jadwalPerKelasCMS.filter(j => j.kelas === selectedKelasCMS && j.hari === selectedHariCMS).length} Sesi Pelajaran
                  </span>
                </h4>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {jadwalPerKelasCMS.filter(j => j.kelas === selectedKelasCMS && j.hari === selectedHariCMS).length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed rounded-2xl text-slate-400">
                      Belum ada jadwal pelajaran untuk kelas {selectedKelasCMS.replace('_', ' ')} pada hari {selectedHariCMS}.
                    </div>
                  ) : (
                    jadwalPerKelasCMS.filter(j => j.kelas === selectedKelasCMS && j.hari === selectedHariCMS).map((item) => (
                      <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 hover:border-blue-200 transition shadow-sm">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                              {item.jam}
                            </span>
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {item.jenis}
                            </span>
                          </div>
                          <h5 className="font-extrabold text-slate-800 text-xs line-clamp-1">{item.mapel}</h5>
                          <p className="text-[10px] text-slate-500 font-semibold">Guru: {item.guru} • Ruang: {item.ruangan}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => handleEditJadwalKelasClick(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteJadwalKelas(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'berita' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Form Create/Edit */}
          <div id="form-berita-cms" className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit space-y-4">
            <div className="border-b pb-3 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-600" />
                {editingNews ? 'Edit Berita / Pengumuman' : 'Tambah Berita / Pengumuman'}
              </h3>
              {editingNews && (
                <button
                  type="button"
                  onClick={handleResetNewsForm}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                >
                  ❌ Batal Edit
                </button>
              )}
            </div>

            {editingNews && (
              <div className="bg-amber-50 border border-amber-300 p-3 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 truncate">
                  ✏️ Mode Edit: <span className="text-blue-700">{editingNews.judul}</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetNewsForm}
                  className="ml-2 px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl text-[10px] font-bold shrink-0 transition"
                >
                  Batal
                </button>
              </div>
            )}

            <form onSubmit={handleSaveNews} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tipe Konten</label>
                <select
                  value={newsTipe}
                  onChange={(e) => setNewsTipe(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold"
                >
                  <option value="PENGUMUMAN">PENGUMUMAN</option>
                  <option value="KEGIATAN">KEGIATAN</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Berita/Pengumuman</label>
                <input
                  type="text"
                  required
                  value={newsJudul}
                  onChange={(e) => setNewsJudul(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                  placeholder="Contoh: Pengumuman Pembagian Rapor Semester Ganjil"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Ringkasan Singkat (Muncul di Halaman Utama)</label>
                <textarea
                  required
                  rows={2}
                  value={newsRingkasan}
                  onChange={(e) => setNewsRingkasan(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                  placeholder="Ringkasan pendek 1-2 kalimat..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Isi Lengkap Konten</label>
                <textarea
                  rows={6}
                  value={newsIsi}
                  onChange={(e) => setNewsIsi(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                  placeholder="Tulis detail pengumuman atau berita secara lengkap di sini..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Publikasi (Kosongkan untuk otomatis tanggal hari ini)</label>
                <input
                  type="text"
                  value={newsTanggal}
                  onChange={(e) => setNewsTanggal(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                  placeholder="Contoh: 10 Juli 2026"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Gambar Sampul Berita (URL / File Upload)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newsImageUrl}
                    onChange={(e) => setNewsImageUrl(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800 text-xs"
                    placeholder="Contoh: https://drive.google.com/..."
                  />
                  <label className="px-3 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 hover:bg-blue-100 transition cursor-pointer text-[10px] shrink-0 flex items-center gap-1">
                    📁 Unggah Foto
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target?.result) setNewsImageUrl(ev.target!.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </label>
                </div>
                {newsImageUrl && formatGoogleDriveUrl(newsImageUrl) && (
                  <div className="mt-2 flex items-center gap-3 bg-slate-50 p-2 border rounded-2xl">
                    <img 
                      src={formatGoogleDriveUrl(newsImageUrl)} 
                      onError={(e) => handleDriveImageError(e, newsImageUrl)}
                      alt="Preview Sampul" 
                      className="w-14 h-14 rounded-xl object-cover border shrink-0 bg-white" 
                    />
                    <div className="text-[10px] text-slate-500 overflow-hidden min-w-0">
                      <p className="font-bold text-slate-700">Preview Sampul Berita</p>
                      <p className="truncate text-slate-400">{newsImageUrl}</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer transition"
              >
                <Save className="w-4 h-4" />
                {editingNews ? 'Simpan Perubahan Berita' : 'Terbitkan Berita Baru'}
              </button>
            </form>
          </div>

          {/* List of Existing News */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="border-b pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm uppercase">Daftar Berita & Pengumuman Saat Ini</h3>
              <p className="text-slate-400 text-[10px] mt-1">Gunakan tombol edit atau hapus untuk mengelola informasi publik portal sekolah.</p>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[600px] pr-1">
              {newsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-extrabold text-xs uppercase tracking-widest bg-slate-50 rounded-2xl border border-dashed">
                  KOSONG
                </div>
              ) : (
                newsList.map((item) => (
                  <div key={item.id} className="p-4 border rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition flex gap-4 items-start">
                    {formatGoogleDriveUrl(item.imageUrl || item.gambar) && (
                      <img 
                        src={formatGoogleDriveUrl(item.imageUrl || item.gambar)} 
                        onError={(e) => handleDriveImageError(e, item.imageUrl || item.gambar)}
                        alt={item.judul} 
                        className="w-16 h-16 rounded-xl object-cover border flex-shrink-0 bg-white" 
                      />
                    )}
                    <div className="flex-grow space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          item.tipe === 'KEGIATAN' ? 'text-emerald-600 bg-emerald-50' : 'text-blue-600 bg-blue-50'
                        }`}>
                          {item.tipe}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{item.tanggal}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs truncate leading-snug">{item.judul}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{item.ringkasan}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEditNewsClick(item)}
                        className="p-1.5 bg-white border text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Edit Berita"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-1.5 bg-white border text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus Berita"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'formulir' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg uppercase flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-600" /> Konfigurasi Parameter & Isian Formulir (Google Sheet Model)
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                Konfigurasi 32 field isian dinamis dari Database SPMB, batasan usia, kuota pendaftaran, serta tambahkan bidang kustom baru.
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={handleResetFormFields} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Default Sheet
              </button>
              <button 
                type="button" 
                onClick={handleAddField} 
                className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold text-xs flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Field Kustom
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveFormConfig} className="space-y-6 text-xs">
            {/* Bagian 1: Status & Kuota Gelombang */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm border-b pb-1 text-blue-600">1. Status Pendaftaran & Parameter Gelombang</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Status Pendaftaran Online</label>
                  <select value={formConfig.statusPendaftaran} onChange={(e) => setFormConfig({...formConfig, statusPendaftaran: e.target.value as any})} className="w-full bg-slate-50 border rounded-xl p-2.5 font-bold">
                    <option value="buka">Buka (Terbuka Umum)</option>
                    <option value="tutup">Tutup (Dikunci Sementara)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tahun Pelajaran</label>
                  <input required type="text" value={formConfig.academicYearActive} onChange={(e) => setFormConfig({...formConfig, academicYearActive: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Gelombang Aktif</label>
                  <input required type="text" value={formConfig.gelombangActive} onChange={(e) => setFormConfig({...formConfig, gelombangActive: e.target.value})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Kuota Maksimal Calon Siswa</label>
                  <input required type="number" value={formConfig.kuotaMaksimal} onChange={(e) => setFormConfig({...formConfig, kuotaMaksimal: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-bold" />
                </div>
              </div>
            </div>

            {/* Bagian 2: Rentang Usia Pendaftar */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm border-b pb-1 text-blue-600">2. Validasi Batas Usia Calon Siswa</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Usia Minimal (Tahun)</label>
                  <input required type="number" value={formConfig.minAge} onChange={(e) => setFormConfig({...formConfig, minAge: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Usia Maksimal (Tahun)</label>
                  <input required type="number" value={formConfig.maxAge} onChange={(e) => setFormConfig({...formConfig, maxAge: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold" />
                </div>
              </div>
            </div>

            {/* Bagian 3: Tabel Matriks Isian Dinamis */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm text-blue-600">3. Matriks Isian Form Dinamis ({formFields.length} Field Terdaftar)</h4>
                  <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Tentukan visibilitas, target modul aplikasi, keharusan isian, dan tata letak grid pada formulir.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    value={formSearchQuery}
                    onChange={(e) => setFormSearchQuery(e.target.value)}
                    placeholder="Cari label / key / modul..."
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold w-48 focus:bg-white focus:border-blue-500 transition"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddField} 
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Field
                  </button>
                </div>
              </div>

              {/* Module Filter Pills */}
              <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                {[
                  { id: 'ALL', label: 'Semua Modul', count: formFields.length, icon: '🌐' },
                  { id: 'SPMB', label: 'SPMB', count: formFields.filter(f => (f.modul || 'SPMB').toUpperCase() === 'SPMB').length, icon: '🎯' },
                  { id: 'SISWA', label: 'Data Siswa', count: formFields.filter(f => (f.modul || '').toUpperCase() === 'SISWA').length, icon: '🎓' },
                  { id: 'GURU', label: 'Data Guru', count: formFields.filter(f => (f.modul || '').toUpperCase() === 'GURU').length, icon: '👨‍🏫' },
                  { id: 'KEUANGAN', label: 'Keuangan', count: formFields.filter(f => (f.modul || '').toUpperCase() === 'KEUANGAN').length, icon: '💰' },
                  { id: 'SARPRAS', label: 'Sarpras', count: formFields.filter(f => (f.modul || '').toUpperCase() === 'SARPRAS').length, icon: '📦' },
                  { id: 'BK', label: 'BK', count: formFields.filter(f => (f.modul || '').toUpperCase() === 'BK').length, icon: '🤝' },
                  { id: 'SURAT', label: 'Persuratan', count: formFields.filter(f => (f.modul || '').toUpperCase() === 'SURAT').length, icon: '✉️' },
                  { id: 'SEMUA', label: 'Universal', count: formFields.filter(f => (f.modul || '').toUpperCase() === 'SEMUA').length, icon: '⭐' }
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setFormModuleFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      formModuleFilter === pill.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-200/60 border border-slate-200/50'
                    }`}
                  >
                    <span>{pill.icon}</span>
                    <span>{pill.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      formModuleFilter === pill.id ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>
              
              <div id="spmb-matrix-container" className="overflow-x-auto border rounded-2xl max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b uppercase text-[10px] font-bold text-slate-400 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-12 text-center">Urutan</th>
                      <th className="p-3 w-32">Modul Target</th>
                      <th className="p-3">Label Isian Field</th>
                      <th className="p-3 w-32">ID Key</th>
                      <th className="p-3 w-36">Tipe Input</th>
                      <th className="p-3">Opsi Dropdown (Koma)</th>
                      <th className="p-3 w-32">Lebar Grid</th>
                      <th className="p-3 text-center w-24">Tampil</th>
                      <th className="p-3 text-center w-24">Wajib (*)</th>
                      <th className="p-3 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700 font-semibold">
                    {formFields
                      .map((field, realIndex) => ({ field, realIndex }))
                      .filter(({ field }) => {
                        const mod = (field.modul || 'SPMB').toUpperCase();
                        const matchMod = formModuleFilter === 'ALL' || mod === formModuleFilter || (formModuleFilter === 'SEMUA' && mod === 'SEMUA');
                        const q = formSearchQuery.toLowerCase().trim();
                        const matchSearch = !q || 
                          field.label.toLowerCase().includes(q) || 
                          field.key.toLowerCase().includes(q) || 
                          mod.toLowerCase().includes(q);
                        return matchMod && matchSearch;
                      })
                      .map(({ field, realIndex }) => (
                      <tr key={field.key} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 text-center text-slate-400 font-bold">{realIndex + 1}</td>
                        <td className="p-2 w-32">
                          <select 
                            value={field.modul || 'SPMB'} 
                            onChange={(e) => handleUpdateField(realIndex, 'modul', e.target.value)}
                            className="w-full bg-blue-50/80 border border-blue-200 rounded-lg p-1.5 font-bold text-blue-800 text-[11px] focus:bg-white"
                          >
                            <option value="SPMB">🎯 SPMB</option>
                            <option value="SISWA">🎓 SISWA</option>
                            <option value="GURU">👨‍🏫 GURU</option>
                            <option value="KEUANGAN">💰 KEUANGAN</option>
                            <option value="SARPRAS">📦 SARPRAS</option>
                            <option value="BK">🤝 BK</option>
                            <option value="SURAT">✉️ SURAT</option>
                            <option value="SEMUA">🌐 SEMUA</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            required
                            value={field.label} 
                            onChange={(e) => handleUpdateField(realIndex, 'label', e.target.value)}
                            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-blue-500 rounded-lg px-2 py-1.5 font-bold text-slate-800 transition"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="text" 
                            required
                            disabled={!field.key.startsWith('kustom_')}
                            value={field.key} 
                            onChange={(e) => handleUpdateField(realIndex, 'key', e.target.value.toLowerCase().replace(/\s+/g, ''))}
                            className="w-full bg-slate-100 disabled:opacity-70 border border-transparent rounded-lg px-2 py-1.5 font-mono text-[10px] text-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <select 
                            value={field.type} 
                            onChange={(e) => handleUpdateField(realIndex, 'type', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold"
                          >
                            <option value="text">Teks Pendek</option>
                            <option value="number">Angka / HP</option>
                            <option value="date">Tanggal</option>
                            <option value="dropdown">Pilihan (Dropdown)</option>
                            <option value="textarea">Teks Panjang</option>
                            <option value="file">Unggah Berkas (File)</option>
                          </select>
                        </td>
                        <td className="p-2 min-w-[240px]">
                          {field.type === 'dropdown' ? (
                            <div className="space-y-1.5">
                              <input 
                                type="text" 
                                required
                                value={field.options || ''} 
                                placeholder="Pisahkan dengan koma, cth: Laki-laki, Perempuan"
                                onChange={(e) => handleUpdateField(realIndex, 'options', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg px-2 py-1.5 font-medium text-xs transition"
                              />
                              {/* Smart Chips Preview */}
                              <div className="flex flex-wrap items-center gap-1">
                                {field.options && field.options.trim() ? (
                                  field.options.split(',').map(o => o.trim()).filter(Boolean).map((opt, optIdx) => (
                                    <span key={optIdx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                      {opt}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    ⚠️ Belum ada opsi pilihan
                                  </span>
                                )}
                              </div>
                              {/* Quick Presets */}
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase self-center">Preset:</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(realIndex, 'options', 'Laki-laki, Perempuan')}
                                  className="text-[9px] font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                                  title="Gunakan Preset Jenis Kelamin"
                                >
                                  + JK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(realIndex, 'options', 'Islam, Kristen Protestan, Katolik, Hindu, Buddha, Khonghucu')}
                                  className="text-[9px] font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                                  title="Gunakan Preset Agama"
                                >
                                  + Agama
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(realIndex, 'options', 'MIPA, IPS, Bahasa & Sastra')}
                                  className="text-[9px] font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                                  title="Gunakan Preset Jurusan"
                                >
                                  + Jurusan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(realIndex, 'options', 'SD / Sederajat, SMP / Sederajat, SMA / SMK / Sederajat, D1 / D2 / D3, S1 / D4, S2, S3, Tidak Sekolah')}
                                  className="text-[9px] font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                                  title="Gunakan Preset Jenjang Pendidikan"
                                >
                                  + Pendidikan
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(realIndex, 'options', 'A, B, AB, O, Tidak Tahu')}
                                  className="text-[9px] font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                                  title="Gunakan Preset Golongan Darah"
                                >
                                  + Gol. Darah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateField(realIndex, 'options', 'PNS/TNI/Polri, Karyawan Swasta, Wiraswasta, Buruh/Petani, Tidak Bekerja')}
                                  className="text-[9px] font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-100 px-1.5 py-0.5 rounded transition cursor-pointer"
                                  title="Gunakan Preset Pekerjaan Ortu"
                                >
                                  + Pekerjaan
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[10px]">Bukan dropdown</span>
                          )}
                        </td>
                        <td className="p-2">
                          <select 
                            value={field.grid.toString()} 
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateField(realIndex, 'grid', val === 'one-fifth' ? 'one-fifth' : parseInt(val));
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold"
                          >
                            <option value="12">Penuh (Grid 12)</option>
                            <option value="6">Setengah (Grid 6)</option>
                            <option value="4">Sepertiga (Grid 4)</option>
                            <option value="one-fifth">1/5 Baris (One-Fifth)</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={field.show} 
                            onChange={(e) => {
                              handleUpdateField(realIndex, 'show', e.target.checked);
                              if (!e.target.checked) {
                                handleUpdateField(realIndex, 'required', false);
                              }
                            }} 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer" 
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input 
                            type="checkbox" 
                            disabled={!field.show}
                            checked={field.required} 
                            onChange={(e) => handleUpdateField(realIndex, 'required', e.target.checked)} 
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" 
                          />
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex justify-center gap-1">
                            <button 
                              type="button" 
                              disabled={realIndex === 0}
                              onClick={() => handleMoveField(realIndex, 'up')}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 transition cursor-pointer"
                              title="Pindahkan Ke Atas"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button" 
                              disabled={realIndex === formFields.length - 1}
                              onClick={() => handleMoveField(realIndex, 'down')}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 disabled:opacity-30 transition cursor-pointer"
                              title="Pindahkan Ke Bawah"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteField(realIndex)}
                              className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-slate-400 transition cursor-pointer"
                              title="Hapus Field"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow">
                <Save className="w-4 h-4" /> Simpan Ketentuan Formulir
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSubTab === 'kelola_konten' && (
        <div className="space-y-6 text-xs animate-fade-in-up">
          {/* GALERI SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gallery Form */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit space-y-4">
              <div className="border-b pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  {editingGallery ? 'Edit Foto Galeri' : 'Tambah Foto Galeri'}
                </h3>
                {editingGallery && (
                  <button
                    type="button"
                    onClick={handleResetGalleryForm}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold"
                  >
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveGallery} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Foto / Kegiatan</label>
                  <input
                    type="text"
                    required
                    value={galleryJudul}
                    onChange={(e) => setGalleryJudul(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                    placeholder="Contoh: Suasana KBM Kelas Pagi"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">URL Gambar (Unsplash atau Google Drive)</label>
                  <input
                    type="text"
                    required
                    value={galleryImageUrl}
                    onChange={(e) => setGalleryImageUrl(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                    placeholder="Contoh: https://images.unsplash.com/..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Deskripsi Kegiatan</label>
                  <textarea
                    rows={3}
                    value={galleryDeskripsi}
                    onChange={(e) => setGalleryDeskripsi(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                    placeholder="Tulis deskripsi singkat kegiatan di foto ini..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer font-sans"
                >
                  <Save className="w-4 h-4" />
                  {editingGallery ? 'Simpan Perubahan Foto' : 'Tambahkan ke Galeri'}
                </button>
              </form>
            </div>

            {/* Gallery List */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-extrabold text-slate-800 text-sm uppercase">Daftar Galeri Kegiatan</h3>
                <p className="text-slate-400 text-[10px] mt-1">Kelola arsip foto kegiatan sekolah yang akan ditampilkan di halaman depan.</p>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                {galleryList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-extrabold text-xs uppercase tracking-widest bg-slate-50 rounded-2xl border border-dashed">
                    KOSONG
                  </div>
                ) : (
                  galleryList.map((item) => (
                    <div key={item.id} className="p-3 border rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition flex gap-4 items-center">
                      {item.imageUrl ? (
                        <img src={formatGoogleDriveUrl(item.imageUrl) || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600'} alt={item.judul} className="w-16 h-12 rounded-lg object-cover border flex-shrink-0 bg-slate-200" />
                      ) : (
                        <div className="w-16 h-12 rounded-lg border flex-shrink-0 bg-slate-200 flex items-center justify-center text-[9px] text-slate-400 font-bold">Foto</div>
                      )}
                      <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-slate-800 text-xs truncate leading-snug">{item.judul}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">{item.tanggal}</p>
                        {item.deskripsi && (
                          <p className="text-[11px] text-slate-500 truncate leading-relaxed mt-0.5">{item.deskripsi}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleEditGalleryClick(item)}
                          className="p-1.5 bg-white border text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGallery(item.id)}
                          className="p-1.5 bg-white border text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* DOWNLOADS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t">
            {/* Download Form */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit space-y-4">
              <div className="border-b pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  {editingDownload ? 'Edit Berkas Unduhan' : 'Tambah Berkas Unduhan'}
                </h3>
                {editingDownload && (
                  <button
                    type="button"
                    onClick={handleResetDownloadForm}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold"
                  >
                    Batal
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveDownload} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Judul Berkas / Dokumen</label>
                  <input
                    type="text"
                    required
                    value={downloadJudul}
                    onChange={(e) => setDownloadJudul(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                    placeholder="Contoh: Formulir Pendaftaran Beasiswa"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Keterangan / Deskripsi</label>
                  <input
                    type="text"
                    required
                    value={downloadDeskripsi}
                    onChange={(e) => setDownloadDeskripsi(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                    placeholder="Contoh: Lampiran wajib bagi pendaftar jalur prestasi"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Ukuran (e.g. 1.5 MB)</label>
                    <input
                      type="text"
                      value={downloadFileSize}
                      onChange={(e) => setDownloadFileSize(e.target.value)}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                      placeholder="e.g. 1.2 MB"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tipe File</label>
                    <select
                      value={downloadFileType}
                      onChange={(e) => setDownloadFileType(e.target.value)}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-bold"
                    >
                      <option value="PDF">PDF</option>
                      <option value="DOCX">DOCX</option>
                      <option value="XLSX">XLSX</option>
                      <option value="ZIP">ZIP</option>
                      <option value="JPG">JPG</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">URL Berkas Unduhan (Link Download)</label>
                  <input
                    type="text"
                    required
                    value={downloadFileUrl}
                    onChange={(e) => setDownloadFileUrl(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 font-semibold text-slate-800"
                    placeholder="Contoh: https://example.com/file.pdf"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow cursor-pointer font-sans"
                >
                  <Save className="w-4 h-4" />
                  {editingDownload ? 'Simpan Perubahan Berkas' : 'Terbitkan Berkas Unduhan'}
                </button>
              </form>
            </div>

            {/* Download List */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-extrabold text-slate-800 text-sm uppercase">Arsip Berkas Unduhan Publik</h3>
                <p className="text-slate-400 text-[10px] mt-1">Kelola daftar dokumen/berkas yang dapat diunduh bebas oleh pengunjung portal publik.</p>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                {downloadsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-extrabold text-xs uppercase tracking-widest bg-slate-50 rounded-2xl border border-dashed">
                    KOSONG
                  </div>
                ) : (
                  downloadsList.map((item) => (
                    <div key={item.id} className="p-3 border rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition flex gap-4 items-center">
                      <div className={`p-2.5 rounded-xl font-bold text-[10px] uppercase ${
                        item.fileType === 'PDF' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        item.fileType === 'DOCX' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        item.fileType === 'XLSX' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.fileType}
                      </div>
                      <div className="flex-grow min-w-0">
                        <h4 className="font-bold text-slate-800 text-xs truncate leading-snug">{item.judul}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">{item.fileSize} • Terbit: {item.tanggal || '-'}</p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">{item.deskripsi}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleEditDownloadClick(item)}
                          className="p-1.5 bg-white border text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDownload(item.id)}
                          className="p-1.5 bg-white border text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB DATABASE & INTEGRASI GOOGLE SHEETS / GAS */}
      {(activeSubTab === 'database_integrasi' || activeSubTab === 'sistem' || activeSubTab === 'google_sheets' || activeSubTab === 'export_gas') && (
        <div className="space-y-6">
          {/* Card Konfigurasi Integrasi */}
          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-emerald-600" />
                  Integrasi & Sync Google Sheets (Google Apps Script)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Hubungkan database lokal Rombel KTCT dengan Google Spreadsheet untuk sinkronisasi 2-arah secara otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleSyncOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                Buka Sync Google Sheets
              </button>
            </div>

            {/* Input Spreadsheet ID & GAS URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Spreadsheet ID Google Sheets</span>
                  {getGoogleSheetsConfig().spreadsheetId && <span className="text-emerald-600 font-semibold text-[11px]">✓ Terhubung</span>}
                </label>
                <input
                  type="text"
                  value={getGoogleSheetsConfig().spreadsheetId || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    saveGoogleSheetsConfig({ spreadsheetId: val });
                  }}
                  placeholder="Contoh: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500">
                  Dapatkan ID dari URL Google Sheets Anda (karakter acak di antara <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">/d/</code> dan <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">/edit</code>).
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>GAS Web App URL (Google Apps Script)</span>
                  {getGoogleSheetsConfig().gasWebAppUrl ? (
                    <span className="text-emerald-600 font-semibold text-[11px]">✓ URL Aktif</span>
                  ) : (
                    <span className="text-amber-600 font-semibold text-[11px]">⚠️ Belum Diisi</span>
                  )}
                </label>
                <input
                  type="text"
                  value={getGoogleSheetsConfig().gasWebAppUrl || ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    saveGoogleSheetsConfig({ gasWebAppUrl: val });
                    setGasUrl(val);
                  }}
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500">
                  Dapatkan dari deploy Google Apps Script (Web App -&gt; Anyone). Digunakan untuk sinkronisasi simpan &amp; reset data.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-slate-500 font-medium">
                Status: {getGoogleSheetsConfig().gasWebAppUrl ? '🔴 2-Way Live Sync Siap' : '🟡 1-Way Read-Only Sync (Public Sheet)'}
              </span>
              <button
                type="button"
                onClick={() => {
                  Swal.fire({
                    icon: 'success',
                    title: 'Konfigurasi Google Sheets Disimpan',
                    text: 'ID Spreadsheet dan GAS Web App URL berhasil diperbarui!',
                    timer: 1500,
                    showConfirmButton: false
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>

          {/* Section Ekspor Kode Google Apps Script (ExportGAS) */}
          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
              <FileCode className="w-4 h-4 text-blue-600" />
              Kode Google Apps Script (Salin ke Extensions -&gt; Apps Script)
            </h4>
            <ExportGAS />
          </div>

          {/* Section Danger Zone: Reset Basis Data */}
          <div className="border border-red-200 bg-red-50/50 rounded-3xl p-6 shadow-sm">
            <h4 className="font-bold text-red-700 text-sm mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Zona Berbahaya (Reset Basis Data Total)
            </h4>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Tindakan ini akan mengosongkan seluruh database lokal (siswa, guru, kelas, mapel, tagihan, presensi, buku, barang) dan mengosongkan seluruh Sheet di Google Spreadsheet jika GAS Web App URL terpasang.
            </p>
            <button
              type="button"
              onClick={handlePurgeDatabase}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Reset Total Semua Database &amp; Spreadsheet
            </button>
          </div>
        </div>
      )}

      {/* TAB BACKUP & RESTORE JSON */}
      {activeSubTab === 'backup' && (
        <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
            <Database className="w-5 h-5 text-blue-600" />
            Backup &amp; Restore Database (JSON)
          </h3>
          <p className="text-xs text-slate-500">
            Ekspor cadangan data lokal dalam bentuk file JSON atau impor cadangan data untuk memulihkan keadaan database.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => {
                const exportData: Record<string, any> = {};
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && (key.startsWith('ERP_') || key.startsWith('ERP_DB_V2_'))) {
                    exportData[key] = localStorage.getItem(key);
                  }
                }
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Backup_ERP_Rombel_KTCT_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                Swal.fire('Sukses!', 'Backup JSON berhasil diunduh.', 'success');
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Ekspor Backup JSON
            </button>
          </div>
        </div>
      )}

      {/* Modal Sync Google Sheets */}
      <GoogleSheetsSyncModal
        isOpen={isGoogleSyncOpen}
        onClose={() => setIsGoogleSyncOpen(false)}
        onSynced={() => {
          Swal.fire({
            icon: 'success',
            title: 'Sinkronisasi Berhasil',
            text: 'Database lokal dan Google Sheets telah berhasil disinkronkan!',
            timer: 2000,
            showConfirmButton: false
          });
        }}
      />
    </div>
  );
}

declare const Swal: any;
export {};
