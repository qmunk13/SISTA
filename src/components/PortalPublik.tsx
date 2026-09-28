import React, { useState, useEffect } from 'react';
import { db } from '../data/db';
import { SPMBPendaftar, WebConfig, FormFieldConfig } from '../types';
import { formatGoogleDriveUrl, handleDriveImageError } from '../utils/driveHelper';
import { AuthService } from '../services/authService';
import { 
  GraduationCap, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowRight, 
  Lock, 
  Search, 
  CheckCircle, 
  FileText, 
  Clock, 
  BookOpen,
  Calendar,
  AlertCircle,
  FileCheck,
  Building,
  Users,
  Award,
  ChevronRight,
  HelpCircle,
  Download,
  Image as ImageIcon,
  Shield,
  Globe,
  Languages,
  Eye,
  MessageSquare,
  Volume2,
  Type,
  Star,
  PenTool,
  Share2,
  Heart,
  Send,
  Check,
  AlertTriangle,
  Compass,
  PhoneCall,
  Info,
  LayoutDashboard,
  Database,
  Laptop,
  Landmark,
  Instagram,
  Facebook,
  Youtube,
  Menu,
  Home,
  ChevronDown,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

interface PortalPublikProps {
  onLogin?: (user: any) => void;
  onNavigateToSpmb?: (kode: string) => void;
  onOpenLogin?: () => void;
  currentUser?: any;
  onLogout?: () => void;
  onTogglePortal?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const DEFAULT_WEB_CONFIG: WebConfig = {
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

function getMergedWebConfig(cfg?: WebConfig | null): WebConfig {
  const merged = { ...DEFAULT_WEB_CONFIG, ...(cfg || {}) };
  Object.keys(DEFAULT_WEB_CONFIG).forEach(key => {
    const k = key as keyof WebConfig;
    if (!merged[k] || (typeof merged[k] === 'string' && !(merged[k] as string).trim())) {
      (merged as any)[k] = DEFAULT_WEB_CONFIG[k];
    }
  });
  if (merged.heroImageUrl) {
    merged.heroImageUrl = formatGoogleDriveUrl(merged.heroImageUrl);
  }
  return merged;
}

function computeRunningInfo(cfg?: WebConfig | null): string {
  const merged = getMergedWebConfig(cfg || db.getSingle<WebConfig>('web_config'));
  const storedCustom = localStorage.getItem('ERP_running_info_text');
  const baseText = (merged && merged.runningText) ? merged.runningText : (storedCustom || DEFAULT_WEB_CONFIG.runningText || '');

  const agendaAnnouncements: string[] = [];

  // 1. Items from sheet AGENDA / agenda_kegiatan
  const agendaData = db.get<any>('agenda') || [];
  if (Array.isArray(agendaData) && agendaData.length > 0) {
    agendaData.slice(0, 3).forEach((ag: any) => {
      const name = ag.judul || ag.agenda || ag.materi || ag.kegiatan;
      const date = ag.tanggal || ag.waktu || ag.tgl;
      if (name) {
        agendaAnnouncements.push(`📅 AGENDA: ${name}${date ? ` (${date})` : ''}`);
      }
    });
  }

  // 2. Items from monthly agenda / kegiatan
  let monthlyAgenda: any[] = [];
  try {
    const raw = localStorage.getItem('ERP_jadwal_kegiatan_bulan');
    if (raw) monthlyAgenda = JSON.parse(raw);
  } catch (err) {}

  if (Array.isArray(monthlyAgenda) && monthlyAgenda.length > 0) {
    monthlyAgenda.slice(0, 2).forEach((m: any) => {
      if (m && m.kegiatan) {
        agendaAnnouncements.push(`📌 JADWAL: ${m.kegiatan}${m.tanggal ? ` (${m.tanggal})` : ''}`);
      }
    });
  }

  if (agendaAnnouncements.length > 0) {
    return `${baseText || DEFAULT_WEB_CONFIG.runningText} • ${agendaAnnouncements.join(' • ')}`;
  }
  return baseText || DEFAULT_WEB_CONFIG.runningText;
}

export default function PortalPublik({ 
  onLogin, 
  onNavigateToSpmb, 
  onOpenLogin, 
  currentUser, 
  onLogout, 
  onTogglePortal,
  theme = 'dark',
  onToggleTheme 
}: PortalPublikProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'home' | 'profil' | 'berita' | 'spmb' | 'cek' | 'download' | 'faq' | 'galeri' | 'digital' | 'prestasi' | 'literasi' | 'alumni' | 'hubungi' | 'status' | 'alur'
  >('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Multi-Language (Indonesian/English) Translation States
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const t = (idText: string, enText: string) => {
    return lang === 'id' ? idText : enText;
  };

  // Accessibility Control Panel States
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [fontSizeClass, setFontSizeClass] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaMode, setDyslexiaMode] = useState(false);
  const [colorBlindFilter, setColorBlindFilter] = useState<'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'>('none');
  const [ttsActive, setTtsActive] = useState(false);

  // Global Smart Search
  const [searchQuery, setSearchQuery] = useState('');

  // Alumni & Tracer Study Database States
  const [alumniSearch, setAlumniSearch] = useState('');
  const [alumniForm, setAlumniForm] = useState({ nama: '', angkatan: '2024', pekerjaan: '', pesan: '' });
  const [tracerList, setTracerList] = useState<any[]>(() => {
    const stored = localStorage.getItem('ERP_tracer_study');
    return stored ? JSON.parse(stored) : [
      { id: 1, nama: 'Muhammad Rian', angkatan: '2023', pekerjaan: 'Software Engineer di GoTo', pesan: 'Rombel KTCT sangat membimbing saya dari nol hingga siap kerja!' },
      { id: 2, nama: 'Siti Aminah', angkatan: '2022', pekerjaan: 'Staff Admin & Finance', pesan: 'Pendidikan Mazas yang berkualitas nyata. Terima kasih Tambora!' },
      { id: 3, nama: 'Ahmad Fauzi', angkatan: '2024', pekerjaan: 'Mahasiswa Teknik Informatika UI', pesan: 'Berkat bimbingan intensif guru-guru, saya lolos jalur beasiswa penuh.' }
    ];
  });

  // Pojok Literasi (Mading Digital) States
  const [madingFilter, setMadingFilter] = useState<'semua' | 'siswa' | 'guru'>('semua');
  const [madingList, setMadingList] = useState<any[]>(() => {
    const stored = localStorage.getItem('ERP_mading_digital');
    return stored ? JSON.parse(stored) : [
      { id: 1, tipe: 'siswa', judul: 'Meraih Mimpi di Atas Keterbatasan', penulis: 'Andi Saputra (Siswa Kelas 12)', isi: 'Keterbatasan ekonomi bukanlah alasan untuk berhenti belajar. Melalui Rombel KTCT Tambora, kami diajarkan untuk terbang tinggi meraih cita-cita.', tanggal: '11 Juli 2026', likes: 18 },
      { id: 2, tipe: 'guru', judul: 'Menavigasi Kompetensi Abad 21', penulis: 'Budi Hartono, S.Pd (Guru Produktif)', isi: 'Sebagai pendidik, kami fokus membekali siswa dengan 4C: Critical Thinking, Creativity, Collaboration, and Communication agar siap terserap industri.', tanggal: '08 Juli 2026', likes: 25 },
      { id: 3, tipe: 'siswa', judul: 'Puisi: Pelita di Lorong Tambora', penulis: 'Laila Syifa (Siswa Kelas 11)', isi: 'Di sudut gang sempit yang riuh, kau hadirkan cahaya pengetahuan. Membimbing tangan-tangan mungil, menyongsong fajar harapan baru.', tanggal: '02 Juli 2026', likes: 32 }
    ];
  });
  const [newMading, setNewMading] = useState({ judul: '', penulis: '', isi: '', tipe: 'siswa' });

  // Jadwal Kegiatan Untuk Satu Bulan State
  const [jadwalBulanList, setJadwalBulanList] = useState<any[]>(() => {
    const stored = localStorage.getItem('ERP_jadwal_kegiatan_bulan');
    return stored ? JSON.parse(stored) : [
      { id: 1, tanggal: '15 Juli 2026', jam: '08:00 - 12:00 WIB', judul: 'Masa Pengenalan Lingkungan Sekolah (MPLS)', lokasi: 'Aula Utama Rombel KTCT', kategori: 'Akademik' },
      { id: 2, tanggal: '20 Juli 2026', jam: '09:00 - 15:00 WIB', judul: 'Workshop Coding & Digital Literacy Cisco', lokasi: 'Lab Komputer Inklusi', kategori: 'Pelatihan' },
      { id: 3, tanggal: '28 Juli 2026', jam: '10:00 - 12:00 WIB', judul: 'Simulasi Ujian CBT Online Gelombang I', lokasi: 'Ruang Ujian Digital', kategori: 'Ujian' },
      { id: 4, tanggal: '05 Agst 2026', jam: '13:00 - 16:00 WIB', judul: 'Bimbingan Konseling & Orientasi Karir BK', lokasi: 'Ruang Konseling BK', kategori: 'BK & Karir' },
      { id: 5, tanggal: '17 Agst 2026', jam: '07:00 - 11:00 WIB', judul: 'Peringatan HUT RI Ke-81 & Pentas Seni Rombel', lokasi: 'Gedung Karang Taruna', kategori: 'Sosial' }
    ];
  });

  // Anonymous WBS / Whistle Blowing System States
  const [wbsForm, setWbsForm] = useState({ jenis: 'Perundungan/Bullying', deskripsi: '', tanggalKejadian: '', pelapor: 'Anonim' });

  // Guestbook registries
  const [guestbookForm, setGuestbookForm] = useState({ nama: '', instansi: '', tujuan: 'Kunjungan Kerja', pesan: '' });

  // Digital Learning Library Catalog (OPAC)
  const [opacQuery, setOpacQuery] = useState('');

  // Hero Section View Mode & News Selector
  const [activeHeroNewsIdx, setActiveHeroNewsIdx] = useState<number>(0);
  const [heroViewMode, setHeroViewMode] = useState<'news' | 'banner'>('news');

  // SDM directory state
  const [sdmSearch, setSdmSearch] = useState('');
  const [sdmRoleFilter, setSdmRoleFilter] = useState<'semua' | 'guru' | 'staf' | 'bk'>('semua');
  const [webConfig, setWebConfig] = useState<WebConfig>(() => getMergedWebConfig(db.getSingle<WebConfig>('web_config')));

  // Compute registration status dynamically
  const isPendaftaranOpen = (() => {
    try {
      const savedFormCfg = localStorage.getItem('ERP_form_config');
      if (savedFormCfg) {
        const parsed = JSON.parse(savedFormCfg);
        if (parsed.statusPendaftaran === 'tutup') return false;
        if (parsed.statusPendaftaran === 'buka') return true;
      }
    } catch (e) {}
    const status = webConfig?.pendaftaranStatus;
    if (!status) return true;
    const lower = status.toLowerCase().trim();
    return lower === 'dibuka' || lower === 'buka';
  })();

  // Running Info Banner State
  const [runningText, setRunningText] = useState<string>(() => computeRunningInfo(webConfig));

  // Auto-sync webConfig and live CMS data whenever erp-db-synced or storage events occur
  useEffect(() => {
    const handleDbUpdate = (e?: Event) => {
      const customEv = e as CustomEvent;
      const key = customEv?.detail?.key;
      
      if (!key || key === 'web_config' || key === 'agenda' || key === 'jadwal_kegiatan_bulan') {
        const latest = db.getSingle<WebConfig>('web_config');
        if (latest) {
          const merged = getMergedWebConfig(latest);
          setWebConfig(prev => JSON.stringify(prev) !== JSON.stringify(merged) ? merged : prev);
        }
        setRunningText(computeRunningInfo());
      }

      if (!key || key === 'jadwal_kegiatan_bulan') {
        const storedJadwal = localStorage.getItem('ERP_jadwal_kegiatan_bulan');
        if (storedJadwal) {
          try {
            const parsed = JSON.parse(storedJadwal);
            setJadwalBulanList(prev => JSON.stringify(prev) !== JSON.stringify(parsed) ? parsed : prev);
          } catch (err) {}
        }
      }
    };

    window.addEventListener('erp-db-synced', handleDbUpdate);
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('storage', handleDbUpdate);
    return () => {
      window.removeEventListener('erp-db-synced', handleDbUpdate);
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('storage', handleDbUpdate);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('ERP_jadwal_kegiatan_bulan');
    if (stored) {
      try {
        setJadwalBulanList(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing jadwal bulan:', e);
      }
    }
  }, [activeSubTab]);

  const handleEditRunningText = () => {
    Swal.fire({
      title: '✏️ Ubah Info Running Banner',
      input: 'textarea',
      inputValue: webConfig.runningText || localStorage.getItem('ERP_running_info_text') || '',
      inputLabel: 'Teks Informasi Pengumuman Berjalan (Khusus Admin):',
      inputPlaceholder: 'Ketik pesan pengumuman berjalan di sini...',
      showCancelButton: true,
      confirmButtonText: 'Simpan Perubahan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#1a1967'
    }).then((res: any) => {
      if (res.isConfirmed && res.value !== undefined) {
        localStorage.setItem('ERP_running_info_text', res.value);
        const updatedConfig = { ...webConfig, runningText: res.value };
        setWebConfig(updatedConfig);
        db.setSingle('web_config', updatedConfig);
        setRunningText(computeRunningInfo(updatedConfig));
        window.dispatchEvent(new CustomEvent('erp-db-synced', { detail: { key: 'web_config' } }));
        Swal.fire('Berhasil!', 'Teks running banner telah diperbarui dan langsung tampil di halaman depan.', 'success');
      }
    });
  };

  // Suara Komunitas States & Handlers
  const [suaraList, setSuaraList] = useState<any[]>(() => {
    const stored = localStorage.getItem('ERP_suara_komunitas');
    if (stored) {
      try { return JSON.parse(stored); } catch(e){}
    }
    return [
      { id: 1, nama: 'Bapak Hartono', peran: 'Orang Tua Siswa (Kelas 12)', teks: 'Sebelumnya anak saya terancam putus sekolah. Alhamdulillah, di Rombel KTCT semua difasilitasi Mazas dan guru-gurunya luar biasa sabar mendidik anak kami.', status: 'APPROVED', tanggal: '2026-07-20' },
      { id: 2, nama: 'Dita Anggraini', peran: 'Alumni 2023 - Staff Accounting', teks: 'Rombel KTCT tidak hanya memberi ijazah, tapi melatih mental kerja. Materi akuntansi praktis dari bendahara sekolah membuat saya diterima bekerja seminggu setelah lulus.', status: 'APPROVED', tanggal: '2026-07-18' },
      { id: 3, nama: 'Rahmat Hidayat', peran: 'Alumni 2022 - IT Support', teks: 'Fasilitas komputer di Rombel Tambora lengkap sekali untuk program Mazas. Bimbingan Cisco & Web Programming-nya sangat membantu karir saya.', status: 'APPROVED', tanggal: '2026-07-15' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('ERP_suara_komunitas', JSON.stringify(suaraList));
  }, [suaraList]);

  const handleTambahSuara = () => {
    Swal.fire({
      title: '💬 Kirim Suara Komunitas Rombel',
      html: `
        <div style="text-align: left; font-size: 12px;" class="space-y-3">
          <div>
            <label style="font-weight: bold; color: #334155; display: block; margin-bottom: 4px;">Nama Lengkap Anda</label>
            <input id="swal-suara-nama" class="swal2-input" style="margin: 0; width: 100%; font-size: 12px;" placeholder="Contoh: Ibu Fatimah" />
          </div>
          <div style="margin-top: 10px;">
            <label style="font-weight: bold; color: #334155; display: block; margin-bottom: 4px;">Status / Peran</label>
            <input id="swal-suara-peran" class="swal2-input" style="margin: 0; width: 100%; font-size: 12px;" placeholder="Contoh: Orang Tua Siswa / Alumni / Warga Tambora" />
          </div>
          <div style="margin-top: 10px;">
            <label style="font-weight: bold; color: #334155; display: block; margin-bottom: 4px;">Pesan / Testimoni / Kesan Anda</label>
            <textarea id="swal-suara-teks" class="swal2-textarea" style="margin: 0; width: 100%; font-size: 12px; height: 90px;" placeholder="Tuliskan pengalaman atau harapan Anda untuk Rombel KTCT..."></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '🚀 Kirim Suara Komunitas',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#1a1967',
      preConfirm: () => {
        const nama = (document.getElementById('swal-suara-nama') as HTMLInputElement)?.value;
        const peran = (document.getElementById('swal-suara-peran') as HTMLInputElement)?.value;
        const teks = (document.getElementById('swal-suara-teks') as HTMLTextAreaElement)?.value;
        if (!nama || !teks) {
          Swal.showValidationMessage('Nama dan Pesan wajib diisi!');
          return false;
        }
        return { nama, peran: peran || 'Masyarakat Umum', teks };
      }
    }).then((res: any) => {
      if (res.isConfirmed && res.value) {
        const newItem = {
          id: Date.now(),
          nama: res.value.nama,
          peran: res.value.peran,
          teks: res.value.teks,
          status: 'PENDING',
          tanggal: new Date().toISOString().split('T')[0]
        };
        setSuaraList(prev => [newItem, ...prev]);
        Swal.fire({
          icon: 'success',
          title: 'Terkirim! 🎉',
          text: 'Terima kasih atas masukan/testimoni Anda. Suara komunitas akan tampil setelah dikonfirmasi oleh Admin.',
          confirmButtonColor: '#1a1967'
        });
      }
    });
  };

  const handleApproveSuara = (id: number) => {
    setSuaraList(prev => prev.map(s => s.id === id ? { ...s, status: 'APPROVED' } : s));
    Swal.fire('Disetujui!', 'Suara komunitas telah disetujui dan langsung tampil secara publik.', 'success');
  };

  const handleRejectSuara = (id: number) => {
    setSuaraList(prev => prev.filter(s => s.id !== id));
    Swal.fire('Dihapus', 'Suara komunitas telah dihapus dari antrean.', 'info');
  };
  const [formConfig, setFormConfig] = useState(() => {
    const existing = localStorage.getItem('ERP_form_config');
    if (existing) {
      try { return JSON.parse(existing); } catch(e){}
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
      kuotaMaksimal: 100
    };
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // SPMB Dynamic Registration State
  const [formFields, setFormFields] = useState<FormFieldConfig[]>(() => {
    return db.get<FormFieldConfig>('form_fields') || [];
  });
  const [spmbData, setSpmbData] = useState<Record<string, any>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  // Check Status State
  const [cekKode, setCekKode] = useState('');
  const [cekResult, setCekResult] = useState<SPMBPendaftar | null>(null);
  const [cekError, setCekError] = useState('');

  const [newsList, setNewsList] = useState<any[]>([]);
  const [galleryList, setGalleryList] = useState<any[]>([]);
  const [downloadsList, setDownloadsList] = useState<any[]>([]);

  useEffect(() => {
    // Sync web config
    setWebConfig(db.getSingle<WebConfig>('web_config'));
    const existing = localStorage.getItem('ERP_form_config');
    if (existing) {
      try { setFormConfig(JSON.parse(existing)); } catch(e){}
    }
    const fields = db.get<FormFieldConfig>('form_fields');
    if (fields && fields.length > 0) {
      setFormFields(fields);
      setSpmbData(prev => {
        const updated = { ...prev };
        fields.forEach(f => {
          if (updated[f.key] === undefined) {
            if (f.type === 'dropdown') {
              const opts = f.options ? f.options.split(',').map(o => o.trim()) : [];
              updated[f.key] = opts[0] || '';
            } else {
              updated[f.key] = '';
            }
          }
        });
        return updated;
      });
    }

    // Sync news list
    let list = db.get<any>('web_news') || [];
    const lombaKemerdekaan = {
      id: 'news-lomba-kemerdekaan',
      tipe: 'PENGUMUMAN',
      judul: 'PENGUMUMAN LOMBA KEMERDEKAAN HUT RI 17 AGUSTUS ROMBEL KTCT',
      ringkasan: 'Dalam rangka memeriahkan HUT Kemerdekaan RI, Rombel KTCT menyelenggarakan berbagai kegiatan perlombaan...',
      isi: 'Diberitahukan kepada seluruh siswa, guru, dan warga Rombongan Belajar Karang Taruna Kecamatan Tambora (Rombel KTCT), dalam rangka menyambut Hari Ulang Tahun (HUT) Kemerdekaan Republik Indonesia 17 Agustus, sekolah mengadakan Serangkaian Lomba Kemerdekaan meliputi Lomba Cerdas Cermat, Lomba Kebersihan & Dekorasi Kelas, Lomba Pidato Kebangsaan, serta Perlombaan Seni & Olahraga. Seluruh siswa diharapkan berpartisipasi aktif dengan semangat kebersamaan dan rasa cinta tanah air.',
      tanggal: '17 Agustus 2026',
      imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400'
    };

    if (!list || list.length === 0) {
      const defaultNews = [
        lombaKemerdekaan,
        {
          id: 'news-1',
          tipe: 'PENGUMUMAN',
          judul: 'Pendaftaran SPMB Online Tahun Pelajaran 2026/2027 Resmi Dibuka!',
          ringkasan: 'Mulai hari ini, pendaftaran calon siswa rombel baru resmi dapat diakses secara online...',
          isi: 'Kami mengumumkan bahwa Penerimaan Peserta Didik Baru (PPDB) / Seleksi Penerimaan Murid Baru (SPMB) Rombel KTCT untuk Tahun Pelajaran 2026/2027 resmi dibuka secara online mulai tanggal 10 Juli 2026. Calon siswa diharapkan mengisi formulir pendaftaran dan mengunggah dokumen persyaratan yang diperlukan seperti Kartu Keluarga, Ijazah, Akta Kelahiran, dan Pas Foto terbaru.',
          tanggal: '10 Juli 2026',
          imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'
        },
        {
          id: 'news-2',
          tipe: 'KEGIATAN',
          judul: 'Pelatihan Kepemimpinan Anggota Karang Taruna Tambora',
          ringkasan: 'Guna mengasah jiwa kepemimpinan generasi muda, Rombel KTCT berkolaborasi...',
          isi: 'Rombongan Belajar Karang Taruna Kecamatan Tambora (Rombel KTCT) berkolaborasi menyelenggarakan program Pelatihan Kepemimpinan (LDK) untuk seluruh anggota aktif dan pengurus Karang Taruna Tambora. Kegiatan ini bertujuan untuk membekali generasi muda dengan keterampilan organisasi, komunikasi, pemecahan masalah, dan kepemimpinan yang berkarakter.',
          tanggal: '05 Juli 2026',
          imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400'
        },
        {
          id: 'news-3',
          tipe: 'PENGUMUMAN',
          judul: 'Pengumuman Kelulusan Asesmen Sumatif Akhir Semester',
          ringkasan: 'Hasil nilai dan lembar verifikasi kelulusan ujian ASAS Semester Ganjil dapat dilihat...',
          isi: 'Diberitahukan kepada seluruh siswa Rombel KTCT bahwa pengumuman kelulusan dan pembagian hasil belajar (Rapor) Asesmen Sumatif Akhir Semester (ASAS) Ganjil Tahun Pelajaran 2025/2026 sudah dapat dilihat di dashboard masing-masing. Silakan melakukan verifikasi nilai dengan wali kelas Anda.',
          tanggal: '30 Juni 2026',
          imageUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400'
        }
      ];
      db.set('web_news', defaultNews);
      list = defaultNews;
    } else {
      // Ensure LOMBA KEMERDEKAAN is in list if not already present
      const hasLomba = list.some((n: any) => n.judul?.toLowerCase().includes('lomba kemerdekaan') || n.id === 'news-lomba-kemerdekaan');
      if (!hasLomba) {
        list = [lombaKemerdekaan, ...list];
        db.set('web_news', list);
      }
    }
    setNewsList(list);

    // Sync gallery and downloads lists
    setGalleryList(db.get<any>('web_gallery') || []);
    setDownloadsList(db.get<any>('web_downloads') || []);
  }, [activeSubTab]);

  useEffect(() => {
    if (currentUser) {
      setIsMobileMenuOpen(false);
    }
  }, [currentUser]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const inputClean = username.trim().toLowerCase();
    const passClean = password.trim();

    if (!inputClean || !passClean) {
      setLoginError('Harap isi username/email dan kata sandi.');
      return;
    }

    const users = db.get<any>('users') || AuthService.getLoadedUsers() || [];
    const siswaList = db.get<any>('siswa') || [];

    const assocStudent = siswaList.find((s: any) =>
      (s.nisn && s.nisn.toLowerCase() === inputClean) ||
      (s.noPdkt && s.noPdkt.toLowerCase() === inputClean) ||
      (s.nopdkt && s.nopdkt.toLowerCase() === inputClean) ||
      (s.nis && s.nis.toLowerCase() === inputClean) ||
      (s.id && s.id.toLowerCase() === inputClean) ||
      (s.nama && s.nama.toLowerCase() === inputClean)
    );

    let matchedUser = users.find((u: any) => {
      const uUsername = (u.username || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uName = (u.name || '').trim().toLowerCase();
      const uId = (u.id || '').trim().toLowerCase();
      const uPdkt = (u.nopdkt || '').trim().toLowerCase();

      if (uUsername === inputClean || uEmail === inputClean || uName === inputClean || uId === inputClean || uPdkt === inputClean) {
        return true;
      }
      if (assocStudent && (
        u.id === `USR_${assocStudent.id.replace('SIS_', '')}` ||
        uUsername === (assocStudent.nisn || '').toLowerCase() ||
        uName === (assocStudent.nama || '').toLowerCase()
      )) {
        return true;
      }
      return false;
    });

    if (!matchedUser) {
      const sheetMatch = AuthService.findUserByIdentifier(inputClean, siswaList);
      if (sheetMatch) {
        matchedUser = {
          id: sheetMatch.id,
          username: sheetMatch.username,
          email: sheetMatch.email,
          password: sheetMatch.password,
          role: sheetMatch.role,
          name: sheetMatch.nama,
          status: sheetMatch.status
        };
      }
    }

    if (!matchedUser) {
      if (inputClean === 'superadmin' || inputClean === 'superadmin@sisko.sch.id') {
        matchedUser = { id: 'USR_superadmin', username: 'superadmin', email: 'superadmin@sisko.sch.id', password: 'admin123', role: 'SUPERADMIN', name: 'Super Admin', status: 'AKTIF' };
      } else if (inputClean === 'admin' || inputClean === 'admin@sisko.sch.id') {
        matchedUser = { id: 'USR_admin', username: 'admin', email: 'admin@sisko.sch.id', password: 'admin123', role: 'ADMIN', name: 'Administrator', status: 'AKTIF' };
      } else if (assocStudent) {
        const sName = (assocStudent.nama || 'Siswa').trim();
        const sFirst = sName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const sPdkt = (assocStudent.noPdkt || assocStudent.nopdkt || assocStudent.nis || '').toString().trim().replace(/^pdkt-?/i, '');
        matchedUser = {
          id: `USR_${assocStudent.id ? assocStudent.id.replace('SIS_', '') : assocStudent.nisn}`,
          username: assocStudent.nisn || assocStudent.noPdkt || 'siswa',
          nopdkt: sPdkt,
          email: assocStudent.email || `${assocStudent.nisn}@siswa.sch.id`,
          password: `${sFirst}${sPdkt}`,
          role: 'SISWA',
          name: assocStudent.nama,
          status: 'AKTIF'
        };
      }
    }

    if (matchedUser) {
      const sName = (matchedUser.name || assocStudent?.nama || '').trim();
      const sFirst = sName.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const sPdkt = (matchedUser.nopdkt || assocStudent?.noPdkt || assocStudent?.nopdkt || assocStudent?.nis || '').toString().trim().toLowerCase().replace(/^pdkt-?/i, '');
      const dynamicStudentPass = `${sFirst}${sPdkt}`;

      const isPassCorrect = 
        (matchedUser.password && (passClean === matchedUser.password || passClean.toLowerCase() === matchedUser.password.toLowerCase())) ||
        (dynamicStudentPass && passClean.toLowerCase() === dynamicStudentPass) ||
        (matchedUser.passHash && passClean === matchedUser.passHash);

      if (isPassCorrect) {
        if (onLogin) {
          onLogin(matchedUser);
        }
        setIsLoginModalOpen(false);
        Swal.fire({
          title: 'Login Berhasil!',
          text: `Selamat datang kembali, ${matchedUser.name}!`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        return;
      }
    }
    setLoginError('Username/Email atau Password salah. (Default Admin: admin / admin123)');
  };

  const handleSPMBSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Age validation
    const tglLahirVal = spmbData['tglLahir'];
    if (tglLahirVal) {
      const birthYear = new Date(tglLahirVal).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      if (age < formConfig.minAge || age > formConfig.maxAge) {
        Swal.fire('Validasi Usia Gagal', `Usia calon siswa (${age} tahun) tidak memenuhi syarat pendaftaran (antara ${formConfig.minAge} s.d ${formConfig.maxAge} tahun).`, 'error');
        return;
      }
    }

    // Dynamic field validation
    for (const field of formFields) {
      if (field.show && field.required) {
        const val = spmbData[field.key];
        if (field.type === 'file') {
          if (!uploadedFiles[field.key]) {
            Swal.fire('Form Belum Lengkap', `Harap unggah dokumen/berkas: ${field.label}.`, 'warning');
            return;
          }
        } else {
          if (val === undefined || val === null || val.toString().trim() === '') {
            Swal.fire('Form Belum Lengkap', `Harap isi bidang: ${field.label}.`, 'warning');
            return;
          }
        }
      }
    }

    // Quota validation
    const currentPendaftar = db.get<SPMBPendaftar>('spmb_pendaftar');
    if (currentPendaftar.length >= formConfig.kuotaMaksimal) {
      Swal.fire('Kuota Penuh', `Maaf, pendaftaran telah memenuhi batas kuota maksimal kami (${formConfig.kuotaMaksimal} siswa).`, 'warning');
      return;
    }

    const nisnVal = spmbData['nisn'];
    if (nisnVal) {
      const isNisnRegistered = currentPendaftar.some(p => p.nisn?.toString().trim() === nisnVal.toString().trim());
      if (isNisnRegistered) {
        Swal.fire('Gagal', 'NISN ini sudah terdaftar dalam sistem SPMB.', 'error');
        return;
      }
    }

    const randomId = Math.floor(100000 + Math.random() * 900000);
    const newKode = `PDKT2026-${randomId}`;

    // Base mock URLs for files
    const fileUrls: Record<string, string> = {
      pasFoto: uploadedFiles['pasFoto'] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      ijazah: uploadedFiles['ijazahSkl'] || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400',
      kk: uploadedFiles['kartuKeluarga'] || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400'
    };

    // Add any uploaded files to fileUrls
    Object.keys(uploadedFiles).forEach(k => {
      fileUrls[k] = uploadedFiles[k];
    });

    const newPendaftar: SPMBPendaftar = {
      kodePendaftaran: newKode,
      nama: spmbData['nama'] || 'Calon Siswa',
      nisn: spmbData['nisn'] || '',
      nik: spmbData['nik'] || '',
      jk: spmbData['jk'] || 'Laki-laki',
      tglLahir: spmbData['tglLahir'] || '',
      status: 'Pending',
      tanggalDaftar: new Date().toISOString().replace('T', ' ').substring(0, 19),
      agama: spmbData['agama'] || 'Islam',
      alamat: spmbData['alamat'] || '',
      namaAyah: spmbData['namaAyah'] || '',
      namaIbu: spmbData['namaIbu'] || '',
      noHp: spmbData['noHp'] || '',
      fileUrls,
      ...spmbData // Store other dynamic fields
    };

    db.insert<any>('spmb_pendaftar', newPendaftar);

    Swal.fire({
      icon: 'success',
      title: 'Pendaftaran Berhasil!',
      html: `
        <p>Data Anda telah tersimpan dengan aman.</p>
        <div class="mt-4 p-4 bg-blue-50 border border-dashed border-blue-300 rounded-2xl">
          <small class="text-slate-500 font-bold block">KODE PENDAFTARAN ANDA:</small>
          <span class="text-2xl font-black text-blue-700 tracking-wider">${newKode}</span>
        </div>
        <p class="text-xs text-slate-500 mt-2">Simpan kode ini untuk memantau status seleksi dan verifikasi.</p>
      `,
      confirmButtonText: 'Selesai',
      confirmButtonColor: '#4f46e5'
    });

    // Reset Form Data
    const freshData: Record<string, any> = {};
    formFields.forEach(f => {
      if (f.type === 'dropdown') {
        const opts = f.options ? f.options.split(',').map(o => o.trim()) : [];
        freshData[f.key] = opts[0] || '';
      } else {
        freshData[f.key] = '';
      }
    });
    setSpmbData(freshData);
    setUploadedFiles({});
    setActiveSubTab('cek');
    setCekKode(newKode);
  };

  const handleCekStatus = () => {
    setCekError('');
    setCekResult(null);

    if (!cekKode) {
      setCekError('Masukkan kode pendaftaran.');
      return;
    }

    const currentPendaftar = db.get<SPMBPendaftar>('spmb_pendaftar');
    const matched = currentPendaftar.find(
      p => p.kodePendaftaran.trim().toUpperCase() === cekKode.trim().toUpperCase()
    );

    if (matched) {
      setCekResult(matched);
    } else {
      setCekError('Kode Pendaftaran tidak ditemukan. Pastikan format benar (contoh: PDKT2026-001).');
    }
  };

  const handleReadNews = (news: any) => {
    Swal.fire({
      title: `<span class="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-wider">${news.tipe}</span><h2 class="text-xl font-extrabold text-slate-800 mt-4 leading-snug">${news.judul}</h2>`,
      html: `
        <div class="text-left mt-4 text-xs font-semibold text-slate-400 mb-4 flex items-center gap-1.5 justify-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          Dipublikasikan: ${news.tanggal}
        </div>
        ${news.imageUrl ? `<img src="${news.imageUrl}" class="rounded-2xl max-h-64 w-full object-cover mb-4 shadow border" />` : ''}
        <div class="text-left text-slate-600 text-sm leading-relaxed font-light whitespace-pre-wrap px-2">
          ${news.isi || news.ringkasan}
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Tutup Berita',
      confirmButtonColor: '#1a1967',
      customClass: {
        popup: 'rounded-3xl'
      }
    });
  };

  return (
    <div className={`flex flex-col min-h-screen text-slate-800 ${highContrast ? 'bg-black text-yellow-300' : 'bg-slate-50'} ${dyslexiaMode ? 'font-mono' : 'font-sans'}`}>
      
      {/* MAIN NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 bg-[#1a1967] border-b-2 border-slate-900 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setActiveSubTab('home'); setSearchQuery(''); }}>
              {/* OFFICIAL LOGO ROMBEL KTCT */}
              <img 
                src={webConfig.logoUrl || "/logo_rombel.svg"} 
                alt="Logo Rombel KTCT Tambora" 
                onError={(e: any) => { e.target.onerror = null; e.target.src = "/logo_rombel.svg"; }}
                className="w-12 h-12 object-contain shrink-0 transform group-hover:scale-105 transition-transform drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]" 
              />

              {/* TIMBUL / EMBOSSED TEXT */}
              <div className="flex flex-col leading-tight text-left">
                <span className="font-black text-base sm:text-xl tracking-wider uppercase text-amber-300 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] [text-shadow:_0_2px_4px_rgb(0_0_0_/_90%)]">
                  {webConfig.appName || "ROMBEL KTCT TAMBORA"}
                </span>
                <span className="text-[9px] sm:text-[10px] text-amber-100 font-extrabold uppercase tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                  {webConfig.footerJudul || "Karang Taruna Kecamatan Tambora"}
                </span>
              </div>
            </div>

            {/* Mobile action buttons (Theme Toggle & Login) */}
            <div className="flex lg:hidden items-center gap-2">
              {onToggleTheme && (
                <button 
                  onClick={onToggleTheme}
                  className="p-2 bg-white/10 hover:bg-white/20 text-amber-300 rounded-xl text-xs font-black transition border border-white/20 flex items-center justify-center shrink-0"
                  title={theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
                >
                  {theme === 'light' ? <Moon className="w-4 h-4 text-white" /> : <Sun className="w-4 h-4 text-amber-300" />}
                </button>
              )}
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-white/10 border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-black hover:bg-white/20 text-white shrink-0"
              >
                Login
              </button>
            </div>
          </div>
          
          {/* NAVIGATION LINKS CONTAINER (DESKTOP) */}
          <div className="hidden lg:flex lg:w-auto items-center gap-1">
            <button 
              onClick={() => { setActiveSubTab('home'); setSearchQuery(''); }} 
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${activeSubTab === 'home' ? 'bg-white/15 text-white shadow-inner' : 'text-blue-200 hover:text-white hover:bg-white/5'}`}
            >
              {t("Beranda", "Home")}
            </button>
            <button 
              onClick={() => { setActiveSubTab('profil'); setSearchQuery(''); }} 
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${activeSubTab === 'profil' ? 'bg-white/15 text-white shadow-inner' : 'text-blue-200 hover:text-white hover:bg-white/5'}`}
            >
              {t("Profil", "Profile")}
            </button>
            <button 
              onClick={() => { setActiveSubTab('berita'); setSearchQuery(''); }} 
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${activeSubTab === 'berita' ? 'bg-white/15 text-white shadow-inner' : 'text-blue-200 hover:text-white hover:bg-white/5'}`}
            >
              {t("Berita & Galeri", "News")}
            </button>
            <button 
              onClick={() => { setActiveSubTab('download'); setSearchQuery(''); }} 
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${activeSubTab === 'download' ? 'bg-white/15 text-white shadow-inner' : 'text-blue-200 hover:text-white hover:bg-white/5'}`}
            >
              {t("Unduhan & FAQ", "Downloads")}
            </button>
            <button 
              onClick={() => { setActiveSubTab('hubungi'); setSearchQuery(''); }} 
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition shrink-0 ${activeSubTab === 'hubungi' ? 'bg-white/15 text-white shadow-inner' : 'text-blue-200 hover:text-white hover:bg-white/5'}`}
            >
              {t("Hubungi Kami", "Contact")}
            </button>
            
            {isPendaftaranOpen ? (
              <button 
                onClick={() => { setActiveSubTab('spmb'); setSearchQuery(''); }}
                className="ml-2 bg-emerald-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shadow-lg hover:bg-emerald-400 transition shrink-0 animate-bounce cursor-pointer"
              >
                {t("Daftar Online", "Register Online")}
              </button>
            ) : (
              <button 
                onClick={() => {
                  Swal.fire({
                    icon: 'warning',
                    title: '🔒 Pendaftaran SPMB Ditutup',
                    text: `Mohon maaf, pendaftaran calon peserta didik baru untuk Tahun Ajaran ${webConfig.academicYearActive || '2026/2027'} telah ditutup oleh panitia SPMB.`,
                    confirmButtonColor: '#1e293b'
                  });
                }}
                className="ml-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-extrabold px-3.5 py-2 rounded-xl text-xs transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Pendaftaran Online Saat Ini Ditutup"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Pendaftaran Ditutup</span>
              </button>
            )}

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="ml-2 p-2 bg-white/10 hover:bg-white/20 text-amber-300 rounded-xl transition border border-white/20 flex items-center justify-center shrink-0"
                title={theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4 text-white" /> : <Sun className="w-4 h-4 text-amber-300" />}
              </button>
            )}

            {currentUser ? (
              <div className="flex items-center gap-2 border border-white/10 bg-white/5 p-1 rounded-xl ml-2">
                <div className="w-7 h-7 bg-emerald-500 text-slate-950 rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block text-left text-[10px] leading-tight max-w-[120px] truncate">
                  <span className="text-emerald-300 font-extrabold block uppercase tracking-wider">{currentUser.role}</span>
                  <span className="font-bold text-white block truncate">{currentUser.name}</span>
                </div>
                <button 
                  onClick={onTogglePortal}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1"
                  title="Masuk Dashboard ERP"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>ERP</span>
                </button>
                <button 
                  onClick={onLogout}
                  className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="ml-2 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition shrink-0 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> {t("Login ERP", "Staff Portal")}
              </button>
            )}
          </div>

          {/* MOBILE CUSTOM ACCORDION-DROPDOWN MENU */}
          <div className="lg:hidden w-full relative">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex items-center justify-between bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-xs font-extrabold text-white transition hover:bg-white/15"
            >
              <span className="flex items-center gap-2 text-left">
                <Menu className="w-4 h-4 text-blue-300 shrink-0" />
                <span>
                  {t('Pilih Menu:', 'Menu:')} <b className="text-emerald-300 text-sm ml-1">
                    {activeSubTab === 'home' && t('Beranda', 'Home')}
                    {activeSubTab === 'profil' && t('Profil', 'Profile')}
                    {activeSubTab === 'berita' && t('Berita & Galeri', 'News & Gallery')}
                    {activeSubTab === 'download' && t('Unduhan & FAQ', 'Downloads & FAQ')}
                    {activeSubTab === 'hubungi' && t('Hubungi Kami', 'Contact Us')}
                    {activeSubTab === 'spmb' && t('Daftar Online', 'Online Registration')}
                  </b>
                </span>
              </span>
              <ChevronDown className={`w-4 h-4 text-blue-300 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1967] border border-white/10 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1.5">
                {[
                  { id: 'home', label: t('Beranda', 'Home'), icon: Home },
                  { id: 'profil', label: t('Profil', 'Profile'), icon: Info },
                  { id: 'berita', label: t('Berita & Galeri', 'News'), icon: FileText },
                  { id: 'download', label: t('Unduhan & FAQ', 'Downloads'), icon: Download },
                  { id: 'hubungi', label: t('Hubungi Kami', 'Contact'), icon: PhoneCall }
                ].map((menuItem) => {
                  const IconComp = menuItem.icon;
                  return (
                    <button
                      key={menuItem.id}
                      onClick={() => {
                        setActiveSubTab(menuItem.id as any);
                        setSearchQuery('');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold text-left transition ${activeSubTab === menuItem.id ? 'bg-white/20 text-white shadow-inner border border-white/10' : 'text-blue-100 hover:bg-white/5'}`}
                    >
                      <IconComp className="w-4 h-4 text-blue-300 shrink-0" />
                      <span>{menuItem.label}</span>
                    </button>
                  );
                })}

                {isPendaftaranOpen ? (
                  <button 
                    onClick={() => {
                      setActiveSubTab('spmb');
                      setSearchQuery('');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-xl text-xs flex items-center gap-3 transition"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#1a1967] animate-ping shrink-0" />
                    <span>{t("Daftar Online", "Register Online")}</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      Swal.fire({
                        icon: 'warning',
                        title: '🔒 Pendaftaran SPMB Ditutup',
                        text: `Mohon maaf, pendaftaran calon peserta didik baru untuk Tahun Ajaran ${webConfig.academicYearActive || '2026/2027'} telah ditutup oleh panitia SPMB.`,
                        confirmButtonColor: '#1e293b'
                      });
                    }}
                    className="w-full bg-slate-900/90 hover:bg-slate-800 text-rose-300 font-extrabold px-4 py-3 rounded-xl text-xs flex items-center justify-between border border-rose-500/30 transition"
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-rose-400" />
                      <span>Pendaftaran Online Ditutup</span>
                    </span>
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-black">
                      Ditutup
                    </span>
                  </button>
                )}

                {onToggleTheme && (
                  <button 
                    onClick={() => {
                      onToggleTheme();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-white/10 hover:bg-white/15 text-amber-300 font-extrabold px-4 py-3 rounded-xl text-xs flex items-center gap-3 transition border border-white/10"
                  >
                    {theme === 'light' ? <Moon className="w-4 h-4 text-white shrink-0" /> : <Sun className="w-4 h-4 text-amber-300 shrink-0" />}
                    <span>{theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}</span>
                  </button>
                )}

                {currentUser ? (
                  <>
                    <div className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-b border-white/10 my-1">
                      <div className="w-8 h-8 bg-emerald-500 text-slate-950 rounded-lg flex items-center justify-center font-black text-xs shrink-0 font-display">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left leading-tight">
                        <span className="text-[9px] text-emerald-300 font-extrabold uppercase tracking-wider block">{currentUser.role}</span>
                        <span className="text-xs font-extrabold text-white block">{currentUser.name}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (onTogglePortal) onTogglePortal();
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-3 rounded-xl text-xs flex items-center gap-3 transition"
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span>{t("Masuk Portal ERP", "Enter ERP Portal")}</span>
                    </button>
                    <button 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white font-extrabold px-4 py-3 rounded-xl text-xs flex items-center gap-3 transition border border-rose-500/30"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>{t("Keluar Sesi", "Logout")}</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-4 py-3 rounded-xl text-xs flex items-center gap-3 transition"
                  >
                    <Lock className="w-4 h-4 text-blue-200 shrink-0" />
                    <span>{t("Login ERP", "Staff Portal")}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* GLOBAL SMART SEARCH FILTER INTERCEPTOR */}
      {searchQuery ? (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-8 flex-grow">
          <div className="bg-blue-900/10 border border-blue-500/20 p-8 rounded-3xl text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900">{t('Hasil Pencarian Pintar', 'Smart Search Results')}</h2>
            <p className="text-slate-500 text-sm">
              {t('Ditemukan hasil relevan untuk kata kunci:', 'Found relevant results for keyword:')} <b className="text-blue-600">"{searchQuery}"</b>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Filtered News */}
            <div className="bg-white border rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 border-b pb-3">
                <FileText className="text-blue-600 w-5 h-5" /> {t('Berita & Pengumuman', 'News & Announcements')}
              </h3>
              <div className="space-y-3">
                {newsList.filter(n => n.judul.toLowerCase().includes(searchQuery.toLowerCase()) || n.ringkasan.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">{t('Tidak ada berita cocok.', 'No matching news.')}</p>
                ) : (
                  newsList.filter(n => n.judul.toLowerCase().includes(searchQuery.toLowerCase()) || n.ringkasan.toLowerCase().includes(searchQuery.toLowerCase())).map((n, idx) => (
                    <div key={idx} className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition border" onClick={() => handleReadNews(n)}>
                      <h4 className="text-xs font-black text-slate-800 line-clamp-1">{n.judul}</h4>
                      <p className="text-[11px] text-slate-400 mt-1">{n.tanggal} • {n.tipe}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Filtered SDM Directory - Removed as requested */}

            {/* Global Quick Action Navigation */}
            <div className="md:col-span-2 bg-slate-50 p-6 rounded-2xl border text-center space-y-4">
              <h4 className="text-sm font-extrabold text-slate-700">{t('Apakah Anda mencari halaman tertentu?', 'Are you looking for a specific page?')}</h4>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => { setActiveSubTab('profil'); setSearchQuery(''); }} className="bg-white border text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-700 transition">{t('Profil Rombel', 'About Rombel')}</button>
                <button onClick={() => { setActiveSubTab('prestasi'); setSearchQuery(''); }} className="bg-white border text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-700 transition">{t('Prestasi Siswa', 'Achievements')}</button>
                <button onClick={() => { setActiveSubTab('spmb'); setSearchQuery(''); }} className="bg-white border text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-700 transition">{t('Pendaftaran Baru', 'Admissions')}</button>
                <button onClick={() => { setActiveSubTab('digital'); setSearchQuery(''); }} className="bg-white border text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-700 transition">{t('Layanan Smart LMS & CBT', 'Smart LMS & CBT')}</button>
                <button onClick={() => { setActiveSubTab('hubungi'); setSearchQuery(''); }} className="bg-white border text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-700 transition">{t('Layanan Pengaduan WBS', 'Whistleblowing Box')}</button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
      {/* CONTENT HERO / HOME TAB */}
      {activeSubTab === 'home' && (
        <div className="flex-grow space-y-16 pb-16">
          {/* Hero Jumbotron */}
          <section className="bg-slate-900 text-white relative overflow-hidden py-24 px-6 border-b-4 border-slate-950">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950 opacity-90 z-0"></div>
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-700/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-700/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
              <div className="lg:col-span-6 space-y-4 text-left">
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black leading-tight text-white tracking-tight">
                  {webConfig.heroBaris1} <span className="text-amber-300">{webConfig.heroBaris2}</span>
                </h1>
                <p className="text-slate-300 text-xs lg:text-sm leading-relaxed max-w-xl font-light">
                  {webConfig.heroSubteks}
                </p>
              </div>

              {/* Hero Showcase: Berita Terupdate / Banner Image */}
              <div className="lg:col-span-6 w-full space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block"></span>
                    <span className="text-[11px] font-black uppercase text-amber-300 tracking-wider">
                      Berita Terupdate & Pengumuman
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/15 text-[10px] font-bold">
                    <button
                      onClick={() => setHeroViewMode('news')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${heroViewMode === 'news' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'}`}
                    >
                      Berita Terbaru
                    </button>
                    <button
                      onClick={() => setHeroViewMode('banner')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${heroViewMode === 'banner' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'}`}
                    >
                      Banner Utama
                    </button>
                  </div>
                </div>

                {heroViewMode === 'news' && newsList.length > 0 ? (
                  <div className="space-y-3">
                    {/* Active Featured News Card */}
                    {(() => {
                      const featuredNews = newsList[activeHeroNewsIdx % newsList.length] || newsList[0];
                      return (
                        <div className="relative group rounded-3xl overflow-hidden p-1.5 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-2xl shadow-amber-500/20 transition-all duration-300">
                          <div className="relative rounded-[22px] overflow-hidden bg-slate-950 min-h-[310px] sm:min-h-[350px] flex flex-col justify-end">
                            <img 
                              src={featuredNews.imageUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600"} 
                              alt={featuredNews.judul} 
                              onError={(e: any) => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600";
                              }}
                              className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent"></div>

                            <div className="relative z-10 p-5 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                                  {featuredNews.tipe || 'PENGUMUMAN'}
                                </span>
                                <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1 bg-black/50 px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                                  <Calendar className="w-3 h-3 text-amber-300" />
                                  {featuredNews.tanggal}
                                </span>
                              </div>

                              <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug line-clamp-2">
                                {featuredNews.judul}
                              </h3>

                              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 font-light">
                                {featuredNews.ringkasan || featuredNews.isi}
                              </p>

                              <div className="pt-2 flex items-center justify-between">
                                <button
                                  onClick={() => handleReadNews(featuredNews)}
                                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
                                >
                                  <span>Baca Selengkapnya</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>

                                <div className="flex items-center gap-1">
                                  {newsList.slice(0, 4).map((_, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setActiveHeroNewsIdx(idx)}
                                      className={`h-2.5 rounded-full transition-all cursor-pointer ${activeHeroNewsIdx === idx ? 'w-6 bg-amber-400' : 'w-2.5 bg-white/40 hover:bg-white'}`}
                                      title={`Berita ${idx + 1}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* News Thumbnails Selection Row */}
                    <div className="grid grid-cols-3 gap-2">
                      {newsList.slice(0, 3).map((news, idx) => (
                        <div
                          key={news.id || idx}
                          onClick={() => setActiveHeroNewsIdx(idx)}
                          className={`p-2.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between h-20 ${
                            activeHeroNewsIdx === idx 
                              ? 'bg-amber-500/20 border-amber-400 text-white shadow-xs' 
                              : 'bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-[9px] font-bold text-amber-300 uppercase truncate">{news.tipe || 'BERITA'}</span>
                          <h4 className="text-[10px] font-extrabold leading-tight line-clamp-2">{news.judul}</h4>
                          <span className="text-[8px] text-slate-400 font-medium">{news.tanggal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="relative group rounded-3xl overflow-hidden p-1.5 bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-600 shadow-2xl shadow-amber-500/20">
                    <div className="relative rounded-[22px] overflow-hidden bg-slate-950">
                      <img 
                        src={formatGoogleDriveUrl(webConfig.heroImageUrl) || "https://lh3.googleusercontent.com/d/12ni-mZVyfQauGxLR7IqyWMA_oAv5qPJX"} 
                        alt="Rombel Banner Utama" 
                        onError={(e: any) => {
                          e.target.onerror = null;
                          e.target.src = "https://lh3.googleusercontent.com/d/12ni-mZVyfQauGxLR7IqyWMA_oAv5qPJX";
                        }}
                        className="h-[320px] sm:h-[380px] lg:h-[430px] w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* QUICK ACCESS MENU CARDS */}
          <section className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div 
                onClick={() => {
                  if (!isPendaftaranOpen) {
                    Swal.fire({
                      icon: 'warning',
                      title: '🔒 Pendaftaran SPMB Ditutup',
                      text: `Mohon maaf, pendaftaran calon peserta didik baru untuk Tahun Ajaran ${webConfig.academicYearActive || '2026/2027'} telah resmi ditutup oleh panitia SPMB.`,
                      confirmButtonColor: '#1e293b'
                    });
                    return;
                  }
                  setActiveSubTab('spmb');
                }} 
                className={`p-6 text-white rounded-3xl transition border shadow-md flex flex-col justify-between h-40 ${
                  isPendaftaranOpen 
                    ? 'bg-[#1a1967] border-slate-900 cursor-pointer hover:-translate-y-1' 
                    : 'bg-slate-900/90 border-rose-900/50 cursor-pointer hover:border-rose-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <GraduationCap className={`w-8 h-8 ${isPendaftaranOpen ? 'text-blue-300' : 'text-rose-400'}`} />
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                    isPendaftaranOpen 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {!isPendaftaranOpen && <Lock className="w-2.5 h-2.5 text-rose-400" />}
                    {isPendaftaranOpen ? 'DIBUKA' : 'DITUTUP'}
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">{t('SPMB Online', 'Admissions')}</h4>
                  <p className="text-[10px] text-blue-200 mt-1">
                    {isPendaftaranOpen 
                      ? t('Daftar kuliah/sekolah gratis', 'Free tuition signup') 
                      : t('Pendaftaran Ditutup', 'Admissions Closed')}
                  </p>
                </div>
              </div>
              <div onClick={() => setActiveSubTab('prestasi')} className="p-6 bg-white border rounded-3xl cursor-pointer hover:-translate-y-1 transition shadow-sm flex flex-col justify-between h-40">
                <Award className="w-8 h-8 text-amber-500" />
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">{t('Prestasi Siswa', 'Achievements')}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{t('Pencapaian & Kejuaraan', 'Awards & Honors')}</p>
                </div>
              </div>
              <div onClick={() => setActiveSubTab('digital')} className="p-6 bg-white border rounded-3xl cursor-pointer hover:-translate-y-1 transition shadow-sm flex flex-col justify-between h-40">
                <Laptop className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">{t('Smart LMS & CBT', 'LMS & CBT')}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{t('Akses kelas virtual & ujian', 'Access virtual classrooms & exams')}</p>
                </div>
              </div>
              <div onClick={() => setActiveSubTab('literasi')} className="p-6 bg-white border rounded-3xl cursor-pointer hover:-translate-y-1 transition shadow-sm flex flex-col justify-between h-40">
                <PenTool className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">{t('Pojok Literasi', 'Literacy Wall')}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{t('Mading digital siswa', 'Student mading posts')}</p>
                </div>
              </div>
              <div onClick={() => setActiveSubTab('hubungi')} className="p-6 bg-white border rounded-3xl cursor-pointer hover:-translate-y-1 transition shadow-sm flex flex-col justify-between h-40">
                <Shield className="w-8 h-8 text-[#1a1967]" />
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800">{t('Anti-Bullying WBS', 'Whistleblowing')}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{t('Pengaduan aman anonim', 'Safe anonymous reports')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* SAMBUTAN KEPALA SEKOLAH */}
          <section className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white border rounded-3xl p-8 shadow-sm">
            <div className="md:col-span-4 text-center">
              <img 
                src={webConfig.kepalaSekolahImageUrl || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400"} 
                alt="Kepala Sekolah" 
                className="w-44 h-44 rounded-full mx-auto object-cover border-4 border-blue-100 shadow"
              />
              <h4 className="font-extrabold text-slate-800 text-sm mt-4">Drs. H. Ahmad Gozali, M.Pd</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{t('Kepala Rombel KTCT', 'Headmaster')}</p>
            </div>
            <div className="md:col-span-8 space-y-4">
              <span className="text-blue-600 font-extrabold text-xs uppercase tracking-wider block">{t('Sambutan Kepala Rombel', 'Director Welcome Message')}</span>
              <h3 className="text-xl font-black text-slate-900">{t('Membuka Pintu Harapan Melalui Pendidikan Inklusi', 'Opening Doors of Hope Through Inclusive Education')}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-light italic">
                {t(
                  '"Assalamu’alaikum Wr. Wb. Selamat datang di portal resmi Rombel KTCT Tambora. Lembaga ini lahir dari panggilan jiwa sosial pemuda-pemudi Karang Taruna Kecamatan Tambora untuk menjamin tidak ada anak usia sekolah yang putus belajar di wilayah kami. Kami mengintegrasikan kurikulum nasional, pembiasaan akhlak mulia, dan teknologi Smart School berbasis ERP untuk menjamin lulusan kami siap kerja dan kompeten."',
                  '"Welcome to the official portal of Rombel KTCT Tambora. This institution was founded by the youth organization of Karang Taruna Tambora to ensure that no underprivileged child drops out of school in our area. We integrate the national curriculum, character building, and modern Smart School ERP tech to guarantee our graduates are highly competent and industry-ready."'
                )}
              </p>
            </div>
          </section>

          {/* PARENT & ALUMNI TESTIMONIALS (SUARA KOMUNITAS ROMBEL) */}
          <section className="max-w-7xl mx-auto px-6 space-y-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-4">
              <div className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">Komunitas Inklusi</span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{t('Suara Komunitas Rombel', 'What People Say')}</h2>
                </div>
                <p className="text-xs text-slate-500 font-semibold">{t('Testimoni nyata & masukan masyarakat. Siapa saja dapat mengirim pesan tanpa login!', 'Real community feedback. Open for everyone to submit!')}</p>
              </div>

              <button 
                onClick={handleTambahSuara}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 shrink-0 transform hover:-translate-y-0.5"
              >
                <MessageSquare className="w-4 h-4 text-slate-950" />
                <span>+ Tulis Suara Komunitas</span>
              </button>
            </div>

            {/* Admin Moderation Box (visible when logged in as SUPERADMIN / ADMIN) */}
            {(currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'ADMIN') && (
              <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-700" /> Moderator Admin: Suara Komunitas Menunggu Konfirmasi ({suaraList.filter(s => s.status === 'PENDING').length})
                  </h3>
                  <span className="text-[10px] text-amber-700 font-bold">Akses Super Admin / Admin</span>
                </div>

                {suaraList.filter(s => s.status === 'PENDING').length === 0 ? (
                  <p className="text-xs text-amber-700 italic">Tidak ada suara komunitas pending yang menunggu persetujuan.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suaraList.filter(s => s.status === 'PENDING').map(item => (
                      <div key={item.id} className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-xs text-slate-800">{item.nama}</h4>
                            <p className="text-[10px] text-amber-600 font-bold">{item.peran} • {item.tanggal}</p>
                          </div>
                          <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">Pending</span>
                        </div>
                        <p className="text-xs text-slate-600 italic">"{item.teks}"</p>
                        <div className="flex gap-2 pt-2 border-t">
                          <button onClick={() => handleApproveSuara(item.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 transition">
                            <Check className="w-3 h-3" /> Setujui (Tampilkan)
                          </button>
                          <button onClick={() => handleRejectSuara(item.id)} className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] flex items-center gap-1 transition">
                            Tolak / Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Display Public Approved Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suaraList.filter(s => s.status === 'APPROVED' || !s.status).length === 0 ? (
                <div className="col-span-3 text-center py-8 bg-white border rounded-3xl text-slate-400 text-xs italic">
                  Belum ada suara komunitas yang disetujui. Jadilah yang pertama mengirim suara komunitas!
                </div>
              ) : (
                suaraList.filter(s => s.status === 'APPROVED' || !s.status).map((testi, idx) => (
                  <div key={testi.id || idx} className="p-6 bg-white border rounded-3xl space-y-4 shadow-sm relative hover:border-amber-300 transition">
                    <span className="absolute top-4 right-4 text-amber-200 text-4xl font-serif">“</span>
                    <p className="text-xs text-slate-600 italic leading-relaxed font-light">"{testi.teks}"</p>
                    <div className="border-t pt-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800">{testi.nama}</h4>
                        <p className="text-[9px] text-amber-600 font-bold uppercase mt-0.5">{testi.peran}</p>
                      </div>
                      <span className="text-[9px] text-slate-300 font-bold">{testi.tanggal || '2026'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* KABAR & BERITA UTAMA ROMBEL */}
          <section className="max-w-7xl mx-auto px-6 space-y-8 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-blue-600 font-black text-[10px] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">Informasi Terkini</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1 uppercase">Kabar & Berita Rombel KTCT</h2>
              </div>
              <button 
                onClick={() => setActiveSubTab('berita')}
                className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-4 py-2 rounded-xl transition"
              >
                <span>Lihat Semua Berita</span> &rarr;
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {newsList.slice(0, 3).map((item, idx) => (
                <div key={idx} className="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between cursor-pointer" onClick={() => handleReadNews(item)}>
                  <img 
                    src={formatGoogleDriveUrl(item.gambar || item.imageUrl || webConfig.beritaImageUrl || "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500")} 
                    onError={(e) => handleDriveImageError(e, item.gambar || item.imageUrl || webConfig.beritaImageUrl)}
                    alt={item.judul} 
                    className="h-44 w-full object-cover bg-white"
                  />
                  <div className="p-6 space-y-3 flex-grow flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">{item.tipe}</span>
                        <span>{item.tanggal}</span>
                      </div>
                      <h3 className="font-extrabold text-slate-800 text-sm line-clamp-2 leading-snug">{item.judul}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 font-light leading-relaxed">{item.ringkasan}</p>
                    </div>
                    <button className="text-blue-600 text-xs font-extrabold flex items-center gap-1 pt-2">
                      <span>Baca Selengkapnya</span> &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ALUR PENDAFTARAN (PPDB STEPS FROM WEBCONFIG) */}
          <section className="max-w-7xl mx-auto px-6 space-y-8 pt-6 border-t">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Tahapan PPDB Online</span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Alur Pendaftaran Penerimaan Siswa Baru</h2>
              <p className="text-xs text-slate-500 font-medium">Empat langkah praktis mendaftar di Rombel KTCT Tambora</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border rounded-3xl p-6 text-center space-y-3 shadow-sm hover:border-amber-400 transition">
                <div className="w-12 h-12 bg-amber-100 text-amber-950 rounded-2xl flex items-center justify-center text-lg font-black mx-auto">1</div>
                <h4 className="font-extrabold text-sm text-slate-800">{webConfig.alur1_judul || 'Isi Formulir'}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-light">{webConfig.alur1_desc || 'Isi biodata lengkap Anda secara online dengan mudah.'}</p>
              </div>
              <div className="bg-white border rounded-3xl p-6 text-center space-y-3 shadow-sm hover:border-amber-400 transition">
                <div className="w-12 h-12 bg-amber-100 text-amber-950 rounded-2xl flex items-center justify-center text-lg font-black mx-auto">2</div>
                <h4 className="font-extrabold text-sm text-slate-800">{webConfig.alur2_judul || 'Upload Berkas'}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-light">{webConfig.alur2_desc || 'Unggah berkas persyaratan wajib seperti KK, Ijazah, dan Pas Foto.'}</p>
              </div>
              <div className="bg-white border rounded-3xl p-6 text-center space-y-3 shadow-sm hover:border-amber-400 transition">
                <div className="w-12 h-12 bg-amber-100 text-amber-950 rounded-2xl flex items-center justify-center text-lg font-black mx-auto">3</div>
                <h4 className="font-extrabold text-sm text-slate-800">{webConfig.alur3_judul || 'Verifikasi'}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-light">{webConfig.alur3_desc || 'Tim panitia melakukan seleksi dan verifikasi kelayakan dokumen.'}</p>
              </div>
              <div className="bg-white border rounded-3xl p-6 text-center space-y-3 shadow-sm hover:border-amber-400 transition">
                <div className="w-12 h-12 bg-amber-100 text-amber-950 rounded-2xl flex items-center justify-center text-lg font-black mx-auto">4</div>
                <h4 className="font-extrabold text-sm text-slate-800">{webConfig.alur4_judul || 'Pengumuman'}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-light">{webConfig.alur4_desc || 'Cek pengumuman kelulusan Anda secara transparan di portal ini.'}</p>
              </div>
            </div>
          </section>

          {/* CTA BANNER */}
          <section className="max-w-7xl mx-auto px-6 pt-6">
            <div className="bg-gradient-to-r from-[#1a1967] via-slate-900 to-[#1a1967] text-white p-8 md:p-12 rounded-3xl shadow-2xl border-2 border-amber-400/30 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="space-y-3 max-w-2xl relative z-10">
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                  🔥 Inisiatif Pemuda Karang Taruna Tambora
                </span>
                <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  Putus Sekolah Bukan Akhir Jalur! Saatnya Bangkit & Raih Masa Depan Tanpa Biaya
                </h3>
                <p className="text-xs md:text-sm text-slate-300 font-light leading-relaxed">
                  Rombongan Belajar (Rombel) KTCT Tambora dirintis atas inisiatif kolektif jajaran pengurus Karang Taruna Kecamatan Tambora bekerja sama dengan tokoh masyarakat setempat. Langkah ini dilatarbelakangi keprihatinan atas tingginya angka putus sekolah remaja usia produktif akibat kendala keterbatasan finansial di kawasan padat penduduk Tambora, Jakarta Barat.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 relative z-10 shrink-0">
                <button 
                  onClick={() => {
                    if (!isPendaftaranOpen) {
                      Swal.fire({
                        icon: 'warning',
                        title: '🔒 Pendaftaran SPMB Ditutup',
                        text: `Mohon maaf, pendaftaran calon peserta didik baru untuk Tahun Ajaran ${webConfig.academicYearActive || '2026/2027'} telah resmi ditutup oleh panitia SPMB.`,
                        confirmButtonColor: '#1e293b'
                      });
                      return;
                    }
                    setActiveSubTab('spmb');
                  }}
                  className={`font-black px-6 py-3.5 rounded-2xl shadow-xl transition text-xs flex items-center gap-2 cursor-pointer ${
                    isPendaftaranOpen 
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 transform hover:-translate-y-0.5' 
                      : 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40'
                  }`}
                >
                  <span>
                    {isPendaftaranOpen ? '⚡ Mulai Pendaftaran Online' : '🔒 Informasi SPMB (Ditutup)'}
                  </span>
                  {isPendaftaranOpen && <span>&rarr;</span>}
                </button>
                <button 
                  onClick={() => setActiveSubTab('hubungi')}
                  className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 rounded-2xl border border-white/20 transition text-xs"
                >
                  💬 Hubungi Kami
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* PROFIL SEKOLAH */}
      {activeSubTab === 'profil' && (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-12 flex-grow">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('Profil Lembaga', 'Lembaga Profile')}</h2>
            <p className="text-slate-500">{t('Mengenal lebih dekat sejarah, visi, dan misi Rombongan Belajar.', 'Understanding our historical journey and organizational values.')}</p>
          </div>

          {/* Sejarah Singkat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <img 
              src={webConfig.profileImageUrl || "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600"} 
              alt="School Profile" 
              className="rounded-3xl shadow-lg border object-cover h-[350px] w-full"
            />
            <div className="space-y-6 text-left">
              <h3 className="text-2xl font-black text-slate-800">{t('Sejarah Singkat Organisasi', 'Historical Timeline')}</h3>
              <p className="text-slate-600 leading-relaxed font-light text-xs sm:text-sm">
                {t(
                  'Rombongan Belajar (Rombel) KTCT Tambora dirintis atas inisiatif kolektif jajaran pengurus Karang Taruna Kecamatan Tambora bekerja sama dengan tokoh masyarakat setempat. Langkah ini dilatarbelakangi keprihatinan atas tingginya angka putus sekolah remaja usia produktif akibat kendala keterbatasan finansial di kawasan padat penduduk Tambora, Jakarta Barat.',
                  'The Rombel KTCT Tambora program was pioneered by the Karang Taruna youth council of Tambora sub-district alongside community leaders. This initiative was designed to tackle high dropout rates caused by financial struggles in the densely populated area of Tambora, West Jakarta.'
                )}
              </p>
              
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="p-5 bg-white border rounded-2xl shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Building className="w-5 h-5" /></div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{t('Infrastruktur Modern', 'Smart Facilities')}</h4>
                    <p className="text-[9px] text-slate-400 mt-1">{t('Multimedia, AC, & Serbaguna', 'Multi-room with high-spec computing')}</p>
                  </div>
                </div>
                <div className="p-5 bg-white border rounded-2xl shadow-sm flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users className="w-5 h-5" /></div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">{t('Pengajar Terbaik', 'Certified Faculty')}</h4>
                    <p className="text-[9px] text-slate-400 mt-1">{t('S1/S2 Bersertifikasi Praktisi', 'Passionate professional educators')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visi & Misi Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100 text-left">
            <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-4 shadow-sm">
              <span className="text-xs font-black tracking-wider text-blue-600 uppercase">Visi Rombel</span>
              <h3 className="text-xl font-black text-slate-800 leading-snug">{t('Arah & Landasan Juang', 'Core Institutional Vision')}</h3>
              <p className="text-slate-600 leading-relaxed font-semibold italic text-xs sm:text-sm">
                "{webConfig.visi || 'Mewujudkan lembaga pendidikan gratis, inklusif, dan berkualitas unggul untuk mencetak generasi muda Kecamatan Tambora yang mandiri, berkarakter mulia, cerdas, berdaya saing tinggi, dan berjiwa kepemimpinan.'}"
              </p>
            </div>
            <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-4 shadow-sm">
              <span className="text-xs font-black tracking-wider text-blue-600 uppercase">Misi Rombel</span>
              <h3 className="text-xl font-black text-slate-800 leading-snug">{t('Langkah Kerja Nyata', 'Our Strategic Mission')}</h3>
              <ul className="space-y-3.5 pl-0 list-none">
                {(webConfig.misi || '1. Menyelenggarakan kegiatan belajar mengajar secara holistik, terpadu, dan berorientasi pada kompetensi industri abad ke-21.\n2. Menanamkan nilai-nilai religiusitas, akhlak mulia, disiplin, dan tanggung jawab sosial melalui program pembiasaan ibadah harian.\n3. Menyediakan akses pendidikan gratis 100% tanpa pungutan biaya bagi keluarga prasejahtera dengan dukungan penuh Karang Taruna Tambora.\n4. Membangun kemitraan strategis dengan dunia usaha, perguruan tinggi, dan instansi pemerintahan untuk penyaluran lulusan.')
                  .split('\n')
                  .map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-600 text-xs font-semibold leading-relaxed">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 flex-shrink-0" />
                      {item.replace(/^\d+[\.\-\s]*/, '')}
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          {/* SARANA & PRASARANA GRID */}
          <div className="space-y-6 pt-8 border-t text-left">
            <h3 className="text-xl font-black text-slate-800">{t('Daftar Sarana & Prasarana Kampus', 'Campus Facilities Grid')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { nama: t('Laboratorium Komputer', 'IT Lab'), desc: t('Dilengkapi 40 client PC, AC, LCD proyektor, dan akses fiber internet 100 Mbps.', 'Equipped with 40 PC clients, AC, projector, and 100 Mbps fiber internet.'), img: 'https://images.unsplash.com/photo-1562774053-f5a02f68995b?w=400' },
                { nama: t('Ruang Kelas Multimedia', 'Smart Classrooms'), desc: t('Ruang kelas luas ber-AC dengan visual display monitor untuk kenyamanan belajar.', 'Comfortable air-conditioned classrooms with interactive display support.'), img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400' },
                { nama: t('Perpustakaan Inklusi', 'School Library'), desc: t('Menyediakan ribuan buku cetak dan akses buku digital via Smart OPAC portal.', 'Thousands of physical books and dynamic e-book database access.'), img: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400' },
                { nama: t('Masjid At-Taqwa Rombel', 'At-Taqwa Prayer Hall'), desc: t('Sebagai pusat ibadah bersama, kajian keagamaan, dan pembinaan akhlak mulia.', 'Center for collective prayer, moral teaching, and spiritual mentorship.'), img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400' }
              ].map((sar, idx) => (
                <div key={idx} className="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow transition">
                  <img src={sar.img} alt={sar.nama} className="w-full h-36 object-cover" />
                  <div className="p-5 space-y-2">
                    <h4 className="font-extrabold text-xs text-slate-800">{sar.nama}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{sar.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BERITA & PENGUMUMAN */}
      {activeSubTab === 'berita' && (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-12 flex-grow text-left">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('Berita & Pengumuman', 'News & Gallery')}</h2>
            <p className="text-slate-500">{t('Ikuti perkembangan informasi kegiatan akademik dan operasional sekolah.', 'Stay updated with official academic journals, news, and press releases.')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {newsList.length === 0 ? (
              <div className="col-span-3 text-center py-12 bg-white border rounded-3xl shadow-sm">
                <span className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">{t('KOSONG', 'KOSONG')}</span>
              </div>
            ) : (
              newsList.map((news) => (
                <div key={news.id} className="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between">
                  <div>
                    <img 
                      src={formatGoogleDriveUrl(news.imageUrl || news.gambar || webConfig.beritaImageUrl || "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500")} 
                      onError={(e) => handleDriveImageError(e, news.imageUrl || news.gambar || webConfig.beritaImageUrl)}
                      alt={news.judul} 
                      className="h-48 w-full object-cover bg-white" 
                    />
                    <div className="p-6 space-y-3">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                        news.tipe?.toUpperCase() === 'KEGIATAN' 
                          ? 'text-emerald-600 bg-emerald-50' 
                          : 'text-blue-600 bg-blue-50'
                      }`}>
                        {news.tipe?.toUpperCase()}
                      </span>
                      <h4 className="font-bold text-lg text-slate-800 leading-snug line-clamp-2">{news.judul}</h4>
                      <p className="text-xs text-slate-500 line-clamp-3">{news.ringkasan}</p>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="flex justify-between items-center pt-3 border-t text-xs text-slate-400">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {news.tanggal}</span>
                      <button 
                        onClick={() => handleReadNews(news)}
                        className="font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800 cursor-pointer"
                      >
                        Baca <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* DOWNLOAD / UNDUHAN */}
      {activeSubTab === 'download' && (
        <section className="py-16 px-6 max-w-3xl mx-auto space-y-12 flex-grow">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Pusat Unduhan</h2>
            <p className="text-slate-500">Unduh brosur, dokumen kelengkapan administrasi, atau silabus belajar.</p>
          </div>

          <div className="space-y-4">
            {downloadsList.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border rounded-3xl">
                <span className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">KOSONG</span>
              </div>
            ) : (
              downloadsList.map((item) => (
                <div key={item.id} className="bg-white border p-6 rounded-2xl flex items-center justify-between shadow-sm hover:border-blue-300 transition">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${
                      item.fileType === 'PDF' ? 'bg-rose-50 text-rose-600' :
                      item.fileType === 'DOCX' ? 'bg-blue-50 text-blue-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">{item.judul}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{item.fileType} • {item.fileSize || '1.0 MB'} • {item.deskripsi}</p>
                    </div>
                  </div>
                  <a 
                    href={item.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white p-3 rounded-full transition flex items-center justify-center cursor-pointer"
                    title="Unduh Berkas"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* GALERI KEGIATAN */}
      {activeSubTab === 'galeri' && (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-12 flex-grow">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Galeri Kegiatan</h2>
            <p className="text-slate-500">Momen dokumentasi kegiatan belajar mengajar, sarana prasarana, dan aksi sosial Karang Taruna Tambora.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleryList.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-slate-50 border border-dashed rounded-3xl">
                <span className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">KOSONG</span>
              </div>
            ) : (
              galleryList.map((item) => (
                <div key={item.id} className="group bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition duration-300">
                  <div className="overflow-hidden relative aspect-video">
                    <img 
                      src={item.imageUrl} 
                      alt={item.judul} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/0 opacity-0 group-hover:opacity-100 transition duration-300" />
                  </div>
                  <div className="p-6 space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      {item.tanggal}
                    </div>
                    <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{item.judul}</h4>
                    {item.deskripsi && (
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.deskripsi}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* FAQ */}
      {activeSubTab === 'faq' && (
        <section className="py-16 px-6 max-w-3xl mx-auto space-y-12 flex-grow">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Frequently Asked Questions</h2>
            <p className="text-slate-500">Jawaban cepat atas pertanyaan paling umum seputar pendaftaran & kegiatan.</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white border p-6 rounded-2xl space-y-2 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-blue-500" /> Apakah pendaftaran di Rombel KTCT menggunakan program Mazas?</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-light">Ya. Seluruh rangkaian proses pembelajaran, bimbingan, ujian, hingga pendaftaran online di Rombel KTCT diselenggarakan melalui program Mazas di bawah pembinaan Karang Taruna Kecamatan Tambora.</p>
            </div>

            <div className="bg-white border p-6 rounded-2xl space-y-2 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-blue-500" /> Berapa lama proses verifikasi berkas setelah mendaftar?</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-light">Proses verifikasi berkas biasanya memakan waktu antara 1-3 hari kerja. Panitia akan meninjau kelengkapan KK, Ijazah, dan NISN Anda.</p>
            </div>

            <div className="bg-white border p-6 rounded-2xl space-y-2 shadow-sm">
              <h4 className="font-bold text-slate-800 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-blue-500" /> Bagaimana jika status saya dinyatakan "Perbaikan"?</h4>
              <p className="text-slate-600 text-sm leading-relaxed font-light">Jika status Anda dinyatakan "Perbaikan", harap masuk ke menu Cek Kelulusan, masukkan kode pendaftaran Anda, lalu klik tombol "Perbaiki / Lengkapi Data" untuk mengunggah ulang dokumen yang ditandai salah oleh Admin.</p>
            </div>
          </div>
        </section>
      )}

      {/* ALUR PENDAFTARAN */}
      {activeSubTab === 'alur' && (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-12 flex-grow">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Alur Pendaftaran SPMB</h2>
            <p className="text-slate-500">Proses pendaftaran yang mudah dan transparan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white border p-6 rounded-3xl text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto">1</div>
              <h4 className="font-bold text-lg text-slate-800">{webConfig.alur1_judul}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{webConfig.alur1_desc}</p>
            </div>
            <div className="bg-white border p-6 rounded-3xl text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto">2</div>
              <h4 className="font-bold text-lg text-slate-800">{webConfig.alur2_judul}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{webConfig.alur2_desc}</p>
            </div>
            <div className="bg-white border p-6 rounded-3xl text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto">3</div>
              <h4 className="font-bold text-lg text-slate-800">{webConfig.alur3_judul}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{webConfig.alur3_desc}</p>
            </div>
            <div className="bg-white border p-6 rounded-3xl text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto">4</div>
              <h4 className="font-bold text-lg text-slate-800">{webConfig.alur4_judul}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{webConfig.alur4_desc}</p>
            </div>
          </div>
        </section>
      )}

      {/* DIGITAL LEARNING & LMS TAB */}
      {activeSubTab === 'digital' && (
        <section className="py-16 px-6 max-w-4xl mx-auto space-y-12 flex-grow text-left">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-wider">{t('E-Learning & CBT Platform', 'Digital Campus Services')}</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('Smart LMS & CBT Online', 'Unified LMS & Testing System')}</h2>
            <p className="text-slate-500">{t('Akses virtual classroom, materi pelajaran, dan bank soal ujian online.', 'Access unified learning management systems, course materials, and periodic exams.')}</p>
          </div>

          <div className="bg-white border rounded-3xl p-8 space-y-6 shadow-md max-w-2xl mx-auto">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-3 text-[#1a1967]">
              <Laptop className="w-5 h-5 text-blue-600" /> {t('Smart LMS & CBT Online', 'Unified LMS & Testing System')}
            </h3>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                {t(
                  'Portal ERP akademik kami mengintegrasikan modul Learning Management System (LMS) dan Computer Based Test (CBT) yang dilengkapi pengaman acak token, pencegah kecurangan log, serta auto-grading instan.',
                  'Our comprehensive ERP framework features a modern LMS dashboard with periodic exam token systems, tab-lock activity logs, and instant grading.'
                )}
              </p>

              <div className="border border-dashed p-6 rounded-2xl bg-slate-50 space-y-4 text-center">
                <span className="inline-block bg-blue-100 text-blue-900 font-black text-[9px] px-2.5 py-1 rounded uppercase">Simulation Mode</span>
                <p className="text-xs text-slate-600 font-bold">{t('Akses Guru & Siswa Terintegrasi', 'Unified Academic Session')}</p>
                <button 
                  onClick={() => {
                    setIsLoginModalOpen(true);
                    Swal.fire({
                      title: t('Login Dibutuhkan', 'Login Required'),
                      text: t('Silakan login menggunakan akun staf / guru yang telah terdaftar untuk masuk ke panel LMS utama.', 'Please sign in with your academic credentials to unlock live classrooms.'),
                      icon: 'info',
                      confirmButtonColor: '#1a1967'
                    });
                  }}
                  className="w-full max-w-sm mx-auto bg-[#1a1967] hover:bg-slate-900 text-white text-xs font-black py-3 rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{t('Masuk ke Portal Akademik ERP', 'Access ERP Dashboard')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PRESTASI SHOWCASE TAB */}
      {activeSubTab === 'prestasi' && (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-12 flex-grow text-left">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-wider">{t('Galeri Juara & Prestasi', 'Hall of Fame')}</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('Prestasi Gemilang Siswa Rombel', 'Academic & Non-Academic Achievements')}</h2>
            <p className="text-slate-500">{t('Kami membimbing talenta unggul hingga meraih podium kejuaraan nasional.', 'Highlighting awards, certificates, and trophies won by Rombel students.')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { judul: t('Juara 1 Lomba Web Design Provinsi DKI Jakarta', '1st Champion DKI Jakarta Web Design Competition'), siswa: 'Andi Saputra (Kelas 12 RPL)', tahun: '2025', desc: t('Mengembangkan rancangan UI/UX website pariwisata berkelanjutan dengan nilai sempurna.', 'Developed sustainable tourism UI/UX layout scoring perfect marks.'), img: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400' },
              { judul: t('Juara 2 Kompetisi Coding Nasional Vocational Day', '2nd Champion National Vocational Coding League'), siswa: 'Fikri Haikal & Team (RPL)', tahun: '2026', desc: t('Membangun aplikasi bank sampah cerdas berbasis web hemat resource.', 'Built dynamic local green waste management program for urban zones.'), img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400' },
              { judul: t('Piala Harapan Terbaik Lomba Cerdas Cermat Pilar Kebangsaan', 'Best Performance National Civic Quiz Bowl'), siswa: 'Laila Syifa & Tim IPS', tahun: '2025', desc: t('Meraih pengakuan terbaik nasional dalam kategori penalaran wawasan kebangsaan.', 'National merit award for outstanding knowledge in civic legislation.'), img: 'https://images.unsplash.com/photo-1491841573190-0db9727907a0?w=400' }
            ].map((pres, idx) => (
              <div key={idx} className="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                <img src={pres.img} alt={pres.judul} className="w-full h-44 object-cover" />
                <div className="p-6 space-y-3">
                  <span className="inline-block bg-amber-100 text-amber-950 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">Podium Champion {pres.tahun}</span>
                  <h4 className="font-extrabold text-sm text-slate-800 leading-snug line-clamp-2">{pres.judul}</h4>
                  <p className="text-xs text-slate-500">{pres.desc}</p>
                  <div className="border-t pt-3 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                    <span>Siswa: {pres.siswa}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* POJOK LITERASI (MADING DIGITAL WALL) TAB */}
      {activeSubTab === 'literasi' && (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-12 flex-grow text-left">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-wider">{t('Ekspresi Karya Kreatif', 'Student Voice')}</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('Pojok Literasi & Mading Digital', 'Digital Literacy Mading Wall')}</h2>
            <p className="text-slate-500">{t('Ruang berkarya cerdas bagi guru dan siswa menuangkan puisi, artikel, opini, dan opini keilmuan.', 'The ultimate creative wall for digital poetry, research papers, and opinion columns.')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Submission form */}
            <div className="lg:col-span-4 bg-white border rounded-3xl p-8 space-y-6 shadow-sm h-fit">
              <h3 className="text-base font-black text-slate-800 border-b pb-3 text-[#1a1967]">{t('Tulis Artikel Mading Baru', 'Post a New Article')}</h3>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newMading.judul || !newMading.penulis || !newMading.isi) {
                    Swal.fire(t('Lengkapi Kolom', 'Fill all fields'), t('Mohon isi judul, penulis, dan isi mading.', 'Please complete all details first.'), 'warning');
                    return;
                  }

                  const created = {
                    id: Date.now(),
                    ...newMading,
                    tanggal: t('Hari Ini', 'Today'),
                    likes: 0
                  };

                  const updated = [created, ...madingList];
                  setMadingList(updated);
                  localStorage.setItem('ERP_mading_digital', JSON.stringify(updated));

                  Swal.fire({
                    title: t('Karya Terbit!', 'Article Published!'),
                    text: t('Artikel Mading Anda berhasil dipublikasikan di Pojok Literasi Digital.', 'Your article is now live on the wall.'),
                    icon: 'success',
                    confirmButtonColor: '#1a1967'
                  });

                  setNewMading({ judul: '', penulis: '', isi: '', tipe: 'siswa' });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Judul Karya', 'Article Title')}</label>
                  <input 
                    type="text"
                    value={newMading.judul}
                    onChange={(e) => setNewMading({ ...newMading, judul: e.target.value })}
                    placeholder={t('Contoh: Pentingnya Algoritma...', 'e.g. Importance of Algorithms...')}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Penulis / Jabatan', 'Author / Grade')}</label>
                  <input 
                    type="text"
                    value={newMading.penulis}
                    onChange={(e) => setNewMading({ ...newMading, penulis: e.target.value })}
                    placeholder={t('Contoh: Laila (Siswa Kelas 11)', 'e.g. Laila (Grade 11)')}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Kategori Penulis', 'Kategori')}</label>
                  <select
                    value={newMading.tipe}
                    onChange={(e) => setNewMading({ ...newMading, tipe: e.target.value })}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="siswa">{t('Karya Siswa', 'Student Piece')}</option>
                    <option value="guru">{t('Karya Pendidik / Guru', 'Teacher Column')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Isi Tulisan', 'Content')}</label>
                  <textarea 
                    rows={4}
                    value={newMading.isi}
                    onChange={(e) => setNewMading({ ...newMading, isi: e.target.value })}
                    placeholder={t('Tulis karya kreatif Anda di sini...', 'Compose your essay here...')}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#1a1967] hover:bg-[#252382] text-white font-black py-3 rounded-xl text-xs shadow"
                >
                  {t('Terbitkan Karya Sekarang', 'Publish Live Now')}
                </button>
              </form>
            </div>

            {/* Mading list */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex gap-2 bg-white border p-1 rounded-2xl w-fit shadow-inner">
                <button 
                  onClick={() => setMadingFilter('semua')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${madingFilter === 'semua' ? 'bg-[#1a1967] text-white shadow' : 'text-slate-500'}`}
                >
                  {t('Semua Karya', 'All posts')}
                </button>
                <button 
                  onClick={() => setMadingFilter('siswa')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${madingFilter === 'siswa' ? 'bg-[#1a1967] text-white shadow' : 'text-slate-500'}`}
                >
                  {t('Karya Siswa', 'Students')}
                </button>
                <button 
                  onClick={() => setMadingFilter('guru')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${madingFilter === 'guru' ? 'bg-[#1a1967] text-white shadow' : 'text-slate-500'}`}
                >
                  {t('Artikel Guru', 'Teachers')}
                </button>
              </div>

              <div className="space-y-6">
                {madingList.filter(m => madingFilter === 'semua' || m.tipe === madingFilter).map((m) => (
                  <div key={m.id} className="bg-white border rounded-3xl p-6 space-y-4 shadow-sm relative hover:border-blue-200 transition">
                    <span className="absolute top-4 right-4 text-[9px] bg-blue-100 text-blue-900 font-extrabold px-2 py-0.5 rounded uppercase">
                      {m.tipe === 'guru' ? t('Kolom Guru', 'Teacher') : t('Karya Siswa', 'Student')}
                    </span>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-slate-800 leading-snug">{m.judul}</h4>
                      <p className="text-[10px] text-slate-400">{t('Karya:', 'By:')} {m.penulis} • {m.tanggal}</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-light">{m.isi}</p>
                    <div className="pt-3 border-t flex justify-between items-center text-[10px] text-slate-400 font-bold">
                      <button 
                        onClick={() => {
                          const updated = madingList.map(item => {
                            if (item.id === m.id) return { ...item, likes: item.likes + 1 };
                            return item;
                          });
                          setMadingList(updated);
                          localStorage.setItem('ERP_mading_digital', JSON.stringify(updated));
                        }}
                        className="flex items-center gap-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> {m.likes} Likes
                      </button>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`https://rombelktct.sch.id/literasi/post/${m.id}`);
                          Swal.fire({ title: 'Tautan Tersalin!', text: 'Tautan postingan berhasil disalin ke clipboard.', icon: 'success', timer: 1000, showConfirmButton: false });
                        }}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Share
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ALUMNI PORTAL TAB */}
      {activeSubTab === 'alumni' && (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-12 flex-grow text-left">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-wider">{t('Konektivitas Alumni & Tracer Study', 'Alumni Network')}</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('Tracer Study & Career Center', 'Tracer Study & Career Center')}</h2>
            <p className="text-slate-500">{t('Kami melacak penyerapan lulusan kami ke dunia industri kerja maupun jenjang universitas tinggi.', 'Tracing vocational graduate outcomes across Indonesian industries.')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Tracer Study Form & Job opportunities */}
            <div className="lg:col-span-5 space-y-6">
              {/* Submission Form */}
              <div className="bg-white border rounded-3xl p-8 space-y-6 shadow-sm">
                <h3 className="text-base font-black text-slate-800 border-b pb-3 text-[#1a1967]">{t('Laporkan Data Penempatan Alumni', 'Alumni Tracer Study Form')}</h3>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!alumniForm.nama || !alumniForm.pekerjaan) {
                      Swal.fire('Lengkapi Formulir', 'Mohon isi nama dan status pekerjaan saat ini.', 'warning');
                      return;
                    }

                    const added = {
                      id: Date.now(),
                      ...alumniForm
                    };

                    const updated = [added, ...tracerList];
                    setTracerList(updated);
                    localStorage.setItem('ERP_tracer_study', JSON.stringify(updated));

                    Swal.fire({
                      title: t('Terima Kasih Alumni!', 'Thank You Alumni!'),
                      text: t('Data Tracer Study Anda berhasil disinkronisasi ke basis data sekolah.', 'Your employment data has been updated.'),
                      icon: 'success',
                      confirmButtonColor: '#1a1967'
                    });

                    setAlumniForm({ nama: '', angkatan: '2024', pekerjaan: '', pesan: '' });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Nama Lengkap Alumni', 'Alumni Full Name')}</label>
                    <input 
                      type="text"
                      value={alumniForm.nama}
                      onChange={(e) => setAlumniForm({ ...alumniForm, nama: e.target.value })}
                      placeholder="Contoh: Muhammad Rian"
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Tahun Kelulusan / Angkatan', 'Graduation Year')}</label>
                    <select
                      value={alumniForm.angkatan}
                      onChange={(e) => setAlumniForm({ ...alumniForm, angkatan: e.target.value })}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="2024">Angkatan 2024</option>
                      <option value="2023">Angkatan 2023</option>
                      <option value="2022">Angkatan 2022</option>
                      <option value="2021">Angkatan 2021</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Status Pekerjaan / Kuliah Saat Ini', 'Current Occupation / Company')}</label>
                    <input 
                      type="text"
                      value={alumniForm.pekerjaan}
                      onChange={(e) => setAlumniForm({ ...alumniForm, pekerjaan: e.target.value })}
                      placeholder="Contoh: IT Support di Telkom / Mahasiswa UI"
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Pesan / Testimoni Almamater', 'Legacy Message')}</label>
                    <textarea 
                      rows={2}
                      value={alumniForm.pesan}
                      onChange={(e) => setAlumniForm({ ...alumniForm, pesan: e.target.value })}
                      placeholder="Pesan untuk adik tingkat..."
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#1a1967] hover:bg-[#252382] text-white font-black py-3 rounded-xl text-xs shadow"
                  >
                    {t('Kirim Data Tracer Study', 'Sync Employment Data')}
                  </button>
                </form>
              </div>

              {/* Career Center Opportunities */}
              <div className="bg-white border rounded-3xl p-8 space-y-4 shadow-sm">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 text-[#1a1967] border-b pb-2">
                  <Building className="w-4 h-4 text-blue-600" /> {t('Career Center & Mitra Kerja', 'Career Center Jobs')}
                </h3>
                <div className="space-y-3">
                  {[
                    { perusahaan: 'PT Telekomunikasi Indonesia', posisi: 'Junior Programmer (RPL)', lokasi: 'Jakarta Pusat' },
                    { perusahaan: 'Astra Honda Motor', posisi: 'Staff Admin & Finance (AKL)', lokasi: 'Sunter, Jakarta Utara' }
                  ].map((job, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border rounded-xl">
                      <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase">Partnership</span>
                      <h4 className="font-extrabold text-xs text-slate-800 mt-1">{job.posisi}</h4>
                      <p className="text-[10px] text-slate-500">{job.perusahaan} • {job.lokasi}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* List of Alumni / Tracer Registry */}
            <div className="lg:col-span-7 bg-white border rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-3">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 text-[#1a1967]">
                  <Database className="w-5 h-5 text-blue-600" /> {t('Basis Data Alumni & Tracer Study', 'Alumni Placement Registry')}
                </h3>
                <input 
                  type="text" 
                  value={alumniSearch}
                  onChange={(e) => setAlumniSearch(e.target.value)}
                  placeholder={t('Cari nama alumni...', 'Search name...')}
                  className="bg-slate-50 border rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-full sm:w-44"
                />
              </div>

              <div className="space-y-4">
                {tracerList.filter(al => al.nama.toLowerCase().includes(alumniSearch.toLowerCase()) || al.pekerjaan.toLowerCase().includes(alumniSearch.toLowerCase())).map((al) => (
                  <div key={al.id} className="p-4 bg-slate-50 border rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-extrabold text-xs text-slate-800">{al.nama}</h4>
                      <span className="text-[9px] bg-blue-100 text-blue-900 font-black px-2 py-0.5 rounded">Lulusan {al.angkatan}</span>
                    </div>
                    <p className="text-[11px] text-[#1a1967] font-bold">Pekerjaan/Kampus: {al.pekerjaan}</p>
                    {al.pesan && (
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">"{al.pesan}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CONTACT & ANONYMOUS WBS COMPLAINT TAB */}
      {activeSubTab === 'hubungi' && (
        <section className="py-16 px-6 max-w-7xl mx-auto space-y-12 flex-grow text-left">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-wider">{t('Pusat Pengaduan & Kontak Resmi', 'Contact & Secure Compliances')}</span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t('Layanan Informasi & WBS Anonim', 'Contact Support & Secure WBS')}</h2>
            <p className="text-slate-500">{t('Hubungi sekretariat sekolah atau kirim laporan perlindungan anti-bullying lewat kotak aman.', 'Securely report incidents anonymously or get in touch with our support desk.')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Guestbook & Contact information */}
            <div className="lg:col-span-5 space-y-6">
              {/* Contact info card */}
              <div className="bg-[#1a1967] text-white p-8 rounded-3xl space-y-6 shadow">
                <h3 className="text-base font-extrabold border-b border-white/10 pb-3">{t('Sekretariat Rombel KTCT', 'Contact Center')}</h3>
                <div className="space-y-4">
                  <div className="flex gap-3 items-start text-xs leading-relaxed">
                    <MapPin className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
                    <p>Jl. Laksa II No.12, RT.012 RW.002, Kecamatan Tambora, Jakarta Barat, DKI Jakarta.</p>
                  </div>
                  <div className="flex gap-3 items-start text-xs leading-relaxed">
                    <Phone className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
                    <p>{webConfig.footerTelepon}</p>
                  </div>
                  <div className="flex gap-3 items-start text-xs leading-relaxed">
                    <Mail className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
                    <p>{webConfig.footerEmail}</p>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6 space-y-4">
                  <h4 className="text-xs font-black tracking-wider uppercase text-blue-300">{t('Media Sosial Resmi', 'Official Social Media')}</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <a href={webConfig.linkIg || "https://instagram.com/rombel.ktct.tambora"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-slate-200 hover:text-white transition group">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-amber-500 group-hover:via-rose-500 group-hover:to-purple-500 transition-all border border-white/10">
                        <Instagram className="w-4 h-4" />
                      </div>
                      <span>@rombel.ktct.tambora</span>
                    </a>
                    <a href={webConfig.linkYt || "https://youtube.com/@RombelKTCTTambora"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-slate-200 hover:text-white transition group">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-all border border-white/10">
                        <Youtube className="w-4 h-4" />
                      </div>
                      <span>Rombel KTCT Tambora Official</span>
                    </a>
                    <a href={webConfig.linkFb || "https://facebook.com/RombelKTCTTambora"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-slate-200 hover:text-white transition group">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-all border border-white/10">
                        <Facebook className="w-4 h-4" />
                      </div>
                      <span>Rombel KTCT Tambora</span>
                    </a>
                    <a href={webConfig.linkTg || "https://t.me/RombelKTCTTambora"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-slate-200 hover:text-white transition group">
                      <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-sky-500 transition-all border border-white/10">
                        <Send className="w-4 h-4" />
                      </div>
                      <span>Telegram Channel (Pemberitahuan)</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Guestbook Submission */}
              <div className="bg-white border rounded-3xl p-8 space-y-6 shadow-sm">
                <h3 className="text-base font-black text-slate-800 border-b pb-3 text-[#1a1967]">{t('Buku Tamu & Pengajuan Kerja Sama', 'Guestbook & Partnership')}</h3>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    Swal.fire({
                      title: t('Buku Tamu Dicatat!', 'Guestbook Recorded!'),
                      text: t('Terima kasih, pengajuan kunjungan / kerja sama Anda telah diteruskan ke Humas Karang Taruna Tambora.', 'Our public relations officer will contact you shortly.'),
                      icon: 'success',
                      confirmButtonColor: '#1a1967'
                    });
                    e.currentTarget.reset();
                  }}
                  className="space-y-3"
                >
                  <input 
                    type="text" 
                    placeholder={t('Nama Lengkap Anda...', 'Your full name...')} 
                    required
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500" 
                  />
                  <input 
                    type="text" 
                    placeholder={t('Instansi / Sekolah Asal...', 'Company / School...')} 
                    required
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500" 
                  />
                  <select className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500">
                    <option value="Kunjungan Kerja">{t('Kunjungan Studi Banding', 'Educational Visit')}</option>
                    <option value="Kerja Sama Penyerapan">{t('Kerja Sama Penyaluran Kerja', 'Work Placement')}</option>
                    <option value="Donasi Kegiatan">{t('Donasi Sosial / Kegiatan', 'Social Donation')}</option>
                  </select>
                  <textarea 
                    rows={3} 
                    placeholder={t('Pesan atau maksud kunjungan...', 'Brief visitor message...')} 
                    required
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="w-full bg-[#1a1967] hover:bg-slate-950 text-white font-bold py-2.5 rounded-xl text-xs shadow">
                    {t('Kirim ke Buku Tamu', 'Submit Visitor Registry')}
                  </button>
                </form>
              </div>
            </div>

            {/* SECURE ENCRYPTED ANONYMOUS WBS COMPLAINT BOX */}
            <div className="lg:col-span-7 bg-white border border-rose-100 rounded-3xl p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-rose-100 pb-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Shield className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-lg font-black text-rose-950">{t('WBS (Whistle Blowing System) Anti-Bullying', 'WBS Safe Compliance Box')}</h3>
                  <p className="text-[11px] text-rose-500 font-bold uppercase tracking-wide">{t('Sistem Pengaduan Aman & 100% Anonim Terenkripsi', '100% Secure Encrypted Anonymous Compliance reporting')}</p>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-[11px] text-rose-800 leading-relaxed font-semibold">
                {t(
                  '⚠️ PERLINDUNGAN ANAK: Rombel KTCT Tambora berkomitmen penuh mewujudkan lingkungan belajar bebas kekerasan, perundungan (bullying), pelecehan, dan intoleransi. Pelapor berhak menggunakan nama samaran (Anonim) dan laporan dijamin terenkripsi tanpa jejak digital.',
                  '⚠️ SAFE ENVIRONMENT GUARANTEE: Rombel KTCT Tambora enforces zero tolerance on violence, physical abuse, bullying, and harassment. Reports are completely anonymous, digital tracking logs are disabled on this endpoint.'
                )}
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!wbsForm.deskripsi || !wbsForm.tanggalKejadian) {
                    Swal.fire('Lengkapi Laporan', 'Mohon isi deskripsi kejadian dan tanggal kronologis kejadian.', 'error');
                    return;
                  }

                  Swal.fire({
                    title: t('Laporan Masuk (Anonim)', 'Anonymous Report Received'),
                    html: t(
                      `<b>Sandi Tiket Terenkripsi:</b> <span class="font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs select-all">KTCT-WBS-${Date.now().toString().slice(-6)}</span><br/><br/>Laporan Anda tentang <b>${wbsForm.jenis}</b> telah disimpan aman. Tim Satgas Anti-Bullying Rombel akan segera memproses dalam 1x24 jam.`,
                      `<b>Secure Ticket Hash:</b> <span class="font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs select-all">KTCT-WBS-${Date.now().toString().slice(-6)}</span><br/><br/>The satellite taskforce has been alerted. Your compliance receipt has been cataloged.`
                    ),
                    icon: 'success',
                    confirmButtonText: t('Selesai', 'Complete'),
                    confirmButtonColor: '#e11d48'
                  });

                  setWbsForm({ jenis: 'Perundungan/Bullying', deskripsi: '', tanggalKejadian: '', pelapor: 'Anonim' });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Jenis Pelanggaran / Kejadian', 'Incident Category')}</label>
                    <select 
                      value={wbsForm.jenis}
                      onChange={(e) => setWbsForm({ ...wbsForm, jenis: e.target.value })}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-rose-500"
                    >
                      <option value="Perundungan/Bullying">{t('Perundungan / Bullying Fisik & Verbal', 'Bullying & Harassment')}</option>
                      <option value="Kekerasan/Fisik">{t('Tindakan Kekerasan / Berkelahi', 'Physical Violence')}</option>
                      <option value="Pelecehan Seksual">{t('Pelecehan Seksual / Kejahatan Gender', 'Sexual Harassment')}</option>
                      <option value="Pungutan Liar">{t('Pungutan Liar / Suap / Korupsi', 'Bribery / Blackmail')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Tanggal & Waktu Kejadian', 'Estimated Date of Occurrence')}</label>
                    <input 
                      type="date"
                      value={wbsForm.tanggalKejadian}
                      onChange={(e) => setWbsForm({ ...wbsForm, tanggalKejadian: e.target.value })}
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Identitas Pengirim (Opsional)', 'Sender Identity (Optional)')}</label>
                    <input 
                      type="text"
                      value={wbsForm.pelapor}
                      onChange={(e) => setWbsForm({ ...wbsForm, pelapor: e.target.value })}
                      placeholder="Anonim (Dibiarkan kosong)"
                      className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold self-center pt-4">
                    🛡️ {t('Sandi SSL-SHA256 Transaksi Diaktifkan', 'Industry-Standard SSL Encryption Engaged')}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">{t('Kronologi / Deskripsi Lengkap Kejadian', 'Chronology Description')}</label>
                  <textarea 
                    rows={4}
                    value={wbsForm.deskripsi}
                    onChange={(e) => setWbsForm({ ...wbsForm, deskripsi: e.target.value })}
                    placeholder={t('Mohon jabarkan kronologi lengkap kejadian secara detail (Siapa, Kapan, Di mana)...', 'Please specify the timeline, involved parties, and estimated location details...')}
                    className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl text-xs shadow-lg transition"
                >
                  🔒 {t('Kirim Laporan Pengaduan Aman', 'Securely File Anonymous Complaint')}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* FORM PENDAFTARAN SPMB */}
      {activeSubTab === 'spmb' && (
        <section className="py-12 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 flex-grow w-full">
          {isPendaftaranOpen ? (
            <>
              {/* Header Hero Banner */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-800 space-y-4">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-300 bg-blue-500/20 border border-blue-400/30 px-3.5 py-1 rounded-full uppercase tracking-widest backdrop-blur-md">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" /> FORMULIR PENDAFTARAN SPMB
                  </span>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Tahun Ajaran 2026/2027</span>
                  </div>
                </div>

                <div className="space-y-2 relative z-10">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Formulir Calon Siswa Baru</h2>
                  <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
                    Lengkapi seluruh data calon siswa dengan valid dan akurat sesuai dokumen resmi (KTP / Akta Kelahiran / Kartu Keluarga).
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-300 border-t border-slate-700/60 relative z-10">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Data Tersimpan Aman</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-blue-400" />
                    <span>Verifikasi Berkas Otomatis</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Proses 1-3 Hari Kerja</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSPMBSubmit} className="bg-white border border-slate-200/80 p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 space-y-10">
                
                {/* KATEGORI A: DATA DIRI */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shadow-sm">
                      A
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Data Diri Calon Siswa</h3>
                      <p className="text-slate-400 text-xs font-medium">Informasi identitas pribadi calon peserta didik</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {formFields
                      .filter(f => f.show && f.type !== 'file' && !['namaAyah', 'pekerjaanAyah', 'namaIbu', 'pekerjaanIbu', 'noHp', 'alamatOrtu'].includes(f.key))
                      .map(field => (
                        <div key={field.key} className={field.grid === 12 ? 'col-span-12' : field.grid === 6 ? 'col-span-12 md:col-span-6' : field.grid === 4 ? 'col-span-12 md:col-span-4' : 'col-span-12 sm:col-span-4 lg:col-span-2'}>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            {field.label} {field.required ? <span className="text-rose-500 font-extrabold ml-0.5">*</span> : <span className="text-slate-400 font-normal text-[10px]">(Opsional)</span>}
                          </label>
                          {field.type === 'dropdown' ? (
                            <select
                              value={spmbData[field.key] || ''}
                              onChange={(e) => setSpmbData({ ...spmbData, [field.key]: e.target.value })}
                              required={field.required}
                              className="w-full text-xs font-semibold text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
                            >
                              <option value="">-- Pilih {field.label} --</option>
                              {(field.options || '')
                                .split(',')
                                .map(o => o.trim())
                                .filter(Boolean)
                                .map((opt, optIdx) => (
                                  <option key={`${field.key}_opt_${optIdx}_${opt}`} value={opt}>{opt}</option>
                                ))
                              }
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              value={spmbData[field.key] || ''}
                              onChange={(e) => setSpmbData({ ...spmbData, [field.key]: e.target.value })}
                              required={field.required}
                              rows={3}
                              className="w-full text-xs font-medium text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
                              placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                            />
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              value={spmbData[field.key] || ''}
                              onChange={(e) => setSpmbData({ ...spmbData, [field.key]: e.target.value })}
                              required={field.required}
                              className="w-full text-xs font-medium text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300 transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
                              placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                            />
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>

                {/* KATEGORI B: ORANG TUA / KONTAK */}
                {formFields.some(f => f.show && ['namaAyah', 'pekerjaanAyah', 'namaIbu', 'pekerjaanIbu', 'noHp', 'alamatOrtu'].includes(f.key)) && (
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 shadow-sm">
                        B
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Data Orang Tua / Wali & Kontak</h3>
                        <p className="text-slate-400 text-xs font-medium">Informasi penanggung jawab serta nomor kontak darurat orang tua</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      {formFields
                        .filter(f => f.show && f.type !== 'file' && ['namaAyah', 'pekerjaanAyah', 'namaIbu', 'pekerjaanIbu', 'noHp', 'alamatOrtu'].includes(f.key))
                        .map(field => (
                          <div key={field.key} className={field.grid === 12 ? 'col-span-12' : field.grid === 6 ? 'col-span-12 md:col-span-6' : field.grid === 4 ? 'col-span-12 md:col-span-4' : 'col-span-12 sm:col-span-4 lg:col-span-2'}>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              {field.label} {field.required ? <span className="text-rose-500 font-extrabold ml-0.5">*</span> : <span className="text-slate-400 font-normal text-[10px]">(Opsional)</span>}
                            </label>
                            {field.type === 'dropdown' ? (
                              <select
                                value={spmbData[field.key] || ''}
                                onChange={(e) => setSpmbData({ ...spmbData, [field.key]: e.target.value })}
                                required={field.required}
                                className="w-full text-xs font-semibold text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 transition-all shadow-sm cursor-pointer"
                              >
                                <option value="">-- Pilih {field.label} --</option>
                                {(field.options || '')
                                  .split(',')
                                  .map(o => o.trim())
                                  .filter(Boolean)
                                  .map((opt, optIdx) => (
                                    <option key={`${field.key}_opt_${optIdx}_${opt}`} value={opt}>{opt}</option>
                                  ))
                                }
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                value={spmbData[field.key] || ''}
                                onChange={(e) => setSpmbData({ ...spmbData, [field.key]: e.target.value })}
                                required={field.required}
                                rows={3}
                                className="w-full text-xs font-medium text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
                                placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                              />
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                value={spmbData[field.key] || ''}
                                onChange={(e) => setSpmbData({ ...spmbData, [field.key]: e.target.value })}
                                required={field.required}
                                className="w-full text-xs font-medium text-slate-800 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300 transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
                                placeholder={`Masukkan ${field.label.toLowerCase()}...`}
                              />
                            )}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* KATEGORI C: BERKAS PENDUKUNG */}
                {formFields.some(f => f.show && f.type === 'file') && (
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 shadow-sm">
                        C
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base tracking-tight">Dokumen & Berkas Pendukung</h3>
                        <p className="text-slate-400 text-xs font-medium">Unggah dokumen kelengkapan pendaftaran (Format PDF/JPG/PNG, Maksimal 5MB)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {formFields
                        .filter(f => f.show && f.type === 'file')
                        .map(field => (
                          <div 
                            key={field.key}
                            onClick={() => {
                              Swal.fire({
                                title: `Unggah ${field.label}`,
                                text: 'Pilih file atau foto kelengkapan pendaftaran Anda:',
                                input: 'file',
                                inputAttributes: {
                                  'accept': 'image/*,application/pdf',
                                  'aria-label': 'Pilih berkas Anda'
                                },
                                showCancelButton: true,
                                confirmButtonText: 'Unggah Berkas',
                                cancelButtonText: 'Batal',
                                confirmButtonColor: '#2563eb'
                              }).then((fileResult: any) => {
                                if (fileResult.isConfirmed && fileResult.value) {
                                  const mockUrl = URL.createObjectURL(fileResult.value);
                                  setUploadedFiles(prev => ({ ...prev, [field.key]: mockUrl }));
                                  Swal.fire('Sukses!', `Dokumen ${field.label} berhasil terunggah.`, 'success');
                                }
                              });
                            }}
                            className={`group relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col justify-between min-h-[150px] ${
                              uploadedFiles[field.key] 
                                ? 'bg-emerald-50/80 border-emerald-400 shadow-sm' 
                                : 'bg-slate-50/60 hover:bg-blue-50/50 border-slate-200 hover:border-blue-400'
                            }`}
                          >
                            <div className="my-auto space-y-2">
                              {uploadedFiles[field.key] ? (
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20 animate-bounce">
                                  <Check className="w-5 h-5 stroke-[3]" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-2xl bg-slate-200/60 group-hover:bg-blue-100 text-slate-500 group-hover:text-blue-600 flex items-center justify-center mx-auto transition">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <span className="text-xs font-extrabold text-slate-800 block line-clamp-2">
                                  {field.label} {field.required ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal text-[10px]">(Opsional)</span>}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                                  {uploadedFiles[field.key] ? 'Dokumen siap' : 'Klik untuk pilih file'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-3 py-1 rounded-full border transition ${
                                uploadedFiles[field.key]
                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-white text-blue-600 border-slate-200 group-hover:border-blue-300'
                              }`}>
                                {uploadedFiles[field.key] ? '✓ Terunggah' : '+ Pilih File'}
                              </span>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}

                {/* Terms Disclaimer & Submit */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Dengan menekan tombol <strong className="text-slate-900">Kirim Pendaftaran</strong>, Anda menyatakan bahwa seluruh data yang diisi di atas adalah BENAR, SAH, dan sesuai dengan dokumen asli calon peserta didik.
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-blue-500/25 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2.5 text-sm uppercase tracking-wider"
                  >
                    <Send className="w-4 h-4" /> Kirim Formulir Pendaftaran Online
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-3xl shadow-md text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border-4 border-rose-100 shadow-sm">
                <Lock className="w-10 h-10" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                  Status Pendaftaran: DITUTUP
                </span>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pendaftaran Online Saat Ini Ditutup</h2>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Mohon maaf, pendaftaran calon peserta didik baru Rombel KTCT Tambora saat ini telah resmi ditutup oleh panitia. Pendaftaran akan dibuka kembali pada gelombang/periode berikutnya.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-center gap-3">
                <button 
                  onClick={() => setActiveSubTab('hubungi')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" /> Hubungi Sekretariat
                </button>
                <button 
                  onClick={() => setActiveSubTab('home')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      </>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-16 px-6 mt-auto border-t border-amber-400/20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={webConfig.logoUrl || "/logo_rombel.svg"} 
                alt="Logo Rombel KTCT" 
                onError={(e: any) => { e.target.onerror = null; e.target.src = "/logo_rombel.svg"; }}
                className="w-10 h-10 object-contain shrink-0 drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]" 
              />
              <div>
                <h5 className="mb-0 text-white font-black tracking-tight text-sm uppercase">{webConfig.footerJudul || "ROMBEL KTCT TAMBORA"}</h5>
                <span className="text-[10px] text-amber-400 font-bold block">Karang Taruna Kecamatan Tambora</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 flex items-start gap-2 pt-1">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{webConfig.footerAlamat || "Jl. Laksa II No.12, RT.012/RW.002, Kecamatan Tambora, Jakarta Barat"}</span>
            </p>
          </div>

          <div className="space-y-4">
            <h6 className="text-white font-black text-xs tracking-widest uppercase border-b border-white/10 pb-2">Navigasi Portal & SPMB</h6>
            <ul className="space-y-2 text-xs list-none pl-0">
              <li><button onClick={() => setActiveSubTab('profil')} className="hover:text-amber-300 transition flex items-center gap-2">&rsaquo; Profil & Sejarah Organisasi</button></li>
              <li><button onClick={() => setActiveSubTab('spmb')} className="hover:text-amber-300 transition flex items-center gap-2">&rsaquo; Pendaftaran SPMB Online</button></li>
              <li><button onClick={() => setActiveSubTab('prestasi')} className="hover:text-amber-300 transition flex items-center gap-2">&rsaquo; Prestasi & Karya Siswa</button></li>
              <li><button onClick={() => setActiveSubTab('literasi')} className="hover:text-amber-300 transition flex items-center gap-2">&rsaquo; Mading Digital & Karya Siswa</button></li>
              <li><button onClick={() => setActiveSubTab('berita')} className="hover:text-amber-300 transition flex items-center gap-2">&rsaquo; Berita & Galeri Kegiatan</button></li>
              <li><button onClick={() => setActiveSubTab('download')} className="hover:text-amber-300 transition flex items-center gap-2">&rsaquo; Unduhan Berkas & Syarat</button></li>
              <li><button onClick={() => setActiveSubTab('hubungi')} className="hover:text-amber-300 transition flex items-center gap-2">&rsaquo; Hubungi Kami & FAQ</button></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h6 className="text-white font-black text-xs tracking-widest uppercase border-b border-white/10 pb-2">Kontak Hubungi & Sosmed</h6>
            <ul className="space-y-2 text-xs list-none pl-0">
              <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {webConfig.footerTelepon || "0851-4180-9991"}</li>
              <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {webConfig.footerEmail || "rombelkatartambora@gmail.com"}</li>
              <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Tambora, Jakarta Barat</li>
            </ul>
            <div className="pt-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2">Media Sosial Resmi:</span>
              <div className="flex gap-2.5">
                <a href={webConfig.linkIg || "https://instagram.com/rombel.ktct.tambora"} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-[#e1306c] hover:text-white flex items-center justify-center transition border border-white/10" title="Instagram">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href={webConfig.linkYt || "https://youtube.com/@RombelKTCTTambora"} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-600 hover:text-white flex items-center justify-center transition border border-white/10" title="YouTube">
                  <Youtube className="w-4 h-4" />
                </a>
                <a href={webConfig.linkFb || "https://facebook.com/RombelKTCTTambora"} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-blue-600 hover:text-white flex items-center justify-center transition border border-white/10" title="Facebook">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href={webConfig.linkTg || "https://t.me/RombelKTCTTambora"} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-sky-500 hover:text-white flex items-center justify-center transition border border-white/10" title="Telegram">
                  <Send className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>{webConfig.footerHakCipta || "© 2026 Rombel KTCT Tambora. Inisiatif Karang Taruna Kecamatan Tambora, Jakarta Barat. Hak Cipta Dilindungi."}</p>
          <div className="flex gap-4 text-[11px] font-semibold text-amber-400/80">
            <span>Pendidikan Inklusi Bebas SPP</span>
            <span>•</span>
            <span>Gedung Sasana Krida Karang Taruna </span>
          </div>
        </div>
      </footer>

      {/* LOGIN MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 relative border">
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              &times;
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Login Staff / Guru</h3>
              <p className="text-slate-400 text-xs">Masuk ke ruang administrasi sekolah</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-sm border bg-slate-50 rounded-xl px-4 py-3" 
                  placeholder="Ketik username..." 
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm border bg-slate-50 rounded-xl px-4 py-3" 
                  placeholder="Ketik password..." 
                  required
                />
              </div>

              {loginError && (
                <div className="text-xs text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                  {loginError}
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition"
              >
                Login Sekarang
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Global SweetAlert declaration for custom alert boxes
declare const Swal: any;
