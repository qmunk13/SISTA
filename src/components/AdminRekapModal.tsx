import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Copy, Search, Check, Layers, Sparkles, AlertCircle, ExternalLink, CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react';
import { FullSubmission } from '../types';
import { LogoRombel } from './LogoRombel';

interface AdminRekapModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: FullSubmission[];
}

export const USER_SISWA_COLUMNS = [
  'nopdkt', 'TahunMasuk', 'NISN', 'NamaLengkap', 'JenisKelamin', 'Tempat Lahir', 'TanggalLahir',
  'NIK', 'Anak ke', 'Saudara', 'Agama', 'Golongan Darah', 'TinggiBadan(cm)', 'BeratBadan(kg)',
  'Prestasi', 'Hobi', 'Catatan Penting', 'Alamat', 'RT', 'RW', 'Kelurahan', 'Kecamatan', 'Kota',
  'Provinsi', 'KodePos', 'JenisTinggal', 'AlatTransportasi', 'NomorHP', 'E-Mail', 'AsalSekolah',
  'SKHUN', 'PenerimaKPS', 'PasFoto', 'NomorKartuKeluarga', 'NamaAyah', 'NIKAyah', 'TempatLahirAyah',
  'TanggalLahirAyah', 'PendidikanAyah', 'PekerjaanAyah', 'PenghasilanAyah', 'TlpAyah', 'StatusAyah',
  'NamaIbu', 'NIKIbu', 'TempatLahirIbu', 'TanggalLahirIbu', 'PendidikanIbu', 'PekerjaanIbu',
  'PenghasilanIbu', 'TlpIbu', 'StatusIbu', 'StatusYatim', 'NamaWali', 'TempatLahirWali',
  'TglLahirWali', 'PendidikanWali', 'PekerjaanWali', 'PenghasilanWali', 'Hubungan', 'Tlp.Wali',
  'AktaKelahiran', 'KartuKeluarga', 'KIA', 'KTPAyah', 'KTPIbu', 'Ijazah', 'KTPWali', 'Rapor',
  'S.Pindah', 'SuKet', 'S.Domisili', 'SKesanggupan', 'BerkasLainnya', 'FormPendaftaran',
  'SPernyataan', 'Status', 'KelasSaatini'
];

export const RECOMMENDED_SHEETS_FOR_USER = [
  {
    id: 'SISWA',
    namaSheet: '1. SISWA (Master Data 78 Kolom Anda)',
    tag: 'Sheet Utama Anda (LENGKAP)',
    status: 'exist',
    deskripsi: 'Database master lengkap 78 kolom standar Dapodik/PKBM. Menjadi sumber data induk utama (NISN, NIK, No PDKT, Biodata Orang Tua, dll).',
    kolom: USER_SISWA_COLUMNS,
    catatan: 'Gunakan NISN (Kolom C) atau NIK (Kolom H) atau No PDKT (Kolom A) sebagai kunci unik relasi antar-sheet.',
  },
  {
    id: 'KONFIRMASI',
    namaSheet: '2. KONFIRMASI (Data Biodata & Pekerjaan Terkini)',
    tag: 'Struktur Resmi Anda (17 Kolom)',
    status: 'new',
    deskripsi: 'Menampung hasil pemutakhiran data biodata diri, kontak, dan pekerjaan Siswa dari Web App.',
    kolom: [
      'Kode_Verifikasi',
      'nopdkt',
      'NISN',
      'NIK',
      'NamaLengkap',
      'KelasSaatini',
      'JenisKelamin',
      'Tempat Lahir',
      'TanggalLahir',
      'NomorHP',
      'Kelurahan',
      'Status_Yatim',
      'Status_Bekerja',
      'Nama_Tempat_Kerja',
      'Jabatan_Pekerjaan',
      'Bidang_Usaha',
      'Alamat_Kerja'
    ],
    catatan: 'Dapat disalin langsung sekali klik dari tombol "Salin ke Sheet KONFIRMASI".',
  },
  {
    id: 'JADWAL',
    namaSheet: '3. JADWAL (Rincian 3 Hari & Jam Belajar)',
    tag: 'Struktur Resmi Anda (12 Kolom)',
    status: 'new',
    deskripsi: 'Menyimpan rincian hari dan jam belajar masing-masing siswa (Hari 1, Jam 1, Hari 2, Jam 2, Hari 3, Jam 3).',
    kolom: [
      'Kode_Jadwal',
      'nopdkt',
      'NISN',
      'NIK',
      'NamaLengkap',
      'KelasSaatini',
      'Hari1',
      'jam1',
      'Hari2',
      'jam2',
      'Hari3',
      'jam3'
    ],
    catatan: 'Menampung pembagian waktu belajar sesuai kesepakatan surat pernyataan bermaterai.',
  },
  {
    id: 'REKAP_HARI',
    namaSheet: '4. REKAP_HARI (Ringkasan Kompak Jadwal Belajar)',
    tag: 'Struktur Resmi Anda (5 Kolom)',
    status: 'new',
    deskripsi: 'Menampilkan ringkasan ringkas dan padat untuk rekap harian tutor/pengurus.',
    kolom: [
      'nohari',
      'NamaLengkap',
      'KelasSaatini',
      'Hari1-3',
      'jam1-3'
    ],
    catatan: 'Sangat praktis untuk absensi harian dan pengecekan kelompok belajar.',
  },
  {
    id: 'REKAP_SUDAH',
    namaSheet: '5. REKAP_SUDAH (Master Siswa Tuntas Konfirmasi & Materai)',
    tag: 'Rekomendasi Lengkap (18 Kolom)',
    status: 'new',
    deskripsi: 'Master rekapitulasi siswa yang SUDAH tuntas mengisi konfirmasi, memilih 3 hari belajar, dan mengunggah Surat Pernyataan Sah Materai Rp10.000.',
    kolom: [
      'No',
      'Kode_Verifikasi',
      'nopdkt',
      'NISN',
      'NIK',
      'NamaLengkap',
      'KelasSaatini',
      'JenisKelamin',
      'NomorHP',
      'Status_Bekerja',
      'Hari_Belajar_3x',
      'Jam_Belajar',
      'Status_Materai_10000',
      'Nama_File_Surat',
      'Link_Berkas_Drive',
      'Tanggal_Konfirmasi',
      'Status_Verifikasi',
      'Catatan_Admin'
    ],
    catatan: 'Sheet monitoring utama bagi Kepala Sekolah, Wali Kelas, dan Tim Verifikasi.',
  },
];

export const AdminRekapModal: React.FC<AdminRekapModalProps> = ({
  isOpen,
  onClose,
  submissions,
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'siswa_mapping' | 'submissions' | 'formulas'>('structure');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FullSubmission | null>(null);
  const spreadsheetId = '1iqO_qA0J9tWhU1dLbSrUWyu3nK53pEJGfyKgseBOE7E';
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  if (!isOpen) return null;

  const filteredSubmissions = submissions.filter((sub) => {
    const q = searchQuery.toLowerCase();
    return (
      sub.profile.namaLengkap.toLowerCase().includes(q) ||
      sub.profile.idNumber.includes(q) ||
      sub.profile.kelasRombel.toLowerCase().includes(q) ||
      sub.work.statusBekerja.toLowerCase().includes(q)
    );
  });

  const handleCopySheetHeaders = (sheetTitle: string, columns: string[]) => {
    const tsv = columns.join('\t');
    navigator.clipboard.writeText(tsv);
    setCopyToast(`✓ Header kolom [${sheetTitle}] berhasil disalin! Tinggal Paste di baris 1.`);
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleCopyKonfirmasiSheet = () => {
    if (submissions.length === 0) return;

    const headers = [
      'Kode_Verifikasi',
      'nopdkt',
      'NISN',
      'NIK',
      'NamaLengkap',
      'KelasSaatini',
      'JenisKelamin',
      'Tempat Lahir',
      'TanggalLahir',
      'NomorHP',
      'Kelurahan',
      'Status_Yatim',
      'Status_Bekerja',
      'Nama_Tempat_Kerja',
      'Jabatan_Pekerjaan',
      'Bidang_Usaha',
      'Alamat_Kerja'
    ];

    const rows = submissions.map((sub) => [
      sub.statement.verificationCode,
      sub.profile.nopdkt || sub.id,
      sub.profile.nisn || (sub.profile.idType === 'NISN' ? `'${sub.profile.idNumber}` : '-'),
      sub.profile.nik || (sub.profile.idType === 'NIK' ? `'${sub.profile.idNumber}` : '-'),
      sub.profile.namaLengkap,
      sub.profile.KelasSaatini || sub.profile.kelasRombel,
      sub.profile.jenisKelamin || sub.profile.JenisKelamin || '-',
      sub.profile.tempatLahir || sub.profile['Tempat Lahir'] || '-',
      sub.profile.tanggalLahir || sub.profile['TanggalLahir'] || '-',
      sub.profile.nomorHP || sub.profile['NomorHP'] || '-',
      sub.profile.kelurahan || sub.profile['Kelurahan'] || '-',
      sub.profile.statusYatim || sub.profile['StatusYatim'] || '-',
      sub.work.statusBekerja,
      sub.work.namaTempatKerja || '-',
      sub.work.jenisPekerjaan || '-',
      sub.work.bidangUsaha || '-',
      sub.work.alamatTempatKerja || '-'
    ]);

    const fullTsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(fullTsv);
    setCopyToast(`✓ Berhasil menyalin data ke format Sheet KONFIRMASI (${submissions.length} baris)!`);
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleCopyJadwalSheet = () => {
    if (submissions.length === 0) return;

    const headers = [
      'Kode_Jadwal',
      'nopdkt',
      'NISN',
      'NIK',
      'NamaLengkap',
      'KelasSaatini',
      'Hari1',
      'jam1',
      'Hari2',
      'jam2',
      'Hari3',
      'jam3'
    ];

    const rows = submissions.map((sub) => {
      const h1 = sub.schedule.hariBelajar[0] || '-';
      const j1 = (sub.schedule.jadwalPerHari && sub.schedule.jadwalPerHari[h1]) || sub.schedule.jamBelajar;
      const h2 = sub.schedule.hariBelajar[1] || '-';
      const j2 = (sub.schedule.jadwalPerHari && sub.schedule.jadwalPerHari[h2]) || sub.schedule.jamBelajar;
      const h3 = sub.schedule.hariBelajar[2] || '-';
      const j3 = (sub.schedule.jadwalPerHari && sub.schedule.jadwalPerHari[h3]) || sub.schedule.jamBelajar;

      return [
        'JDW-' + sub.statement.verificationCode,
        sub.profile.nopdkt || sub.id,
        sub.profile.nisn || (sub.profile.idType === 'NISN' ? `'${sub.profile.idNumber}` : '-'),
        sub.profile.nik || (sub.profile.idType === 'NIK' ? `'${sub.profile.idNumber}` : '-'),
        sub.profile.namaLengkap,
        sub.profile.KelasSaatini || sub.profile.kelasRombel,
        h1,
        j1,
        h2,
        j2,
        h3,
        j3
      ];
    });

    const fullTsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(fullTsv);
    setCopyToast(`✓ Berhasil menyalin data ke format Sheet JADWAL (${submissions.length} baris)!`);
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleCopyRekapHariSheet = () => {
    if (submissions.length === 0) return;

    const headers = [
      'nohari',
      'NamaLengkap',
      'KelasSaatini',
      'Hari1-3',
      'jam1-3'
    ];

    const rows = submissions.map((sub, idx) => {
      const hariStr = sub.schedule.hariBelajar.join(', ');
      const jamStr = sub.schedule.hariBelajar.map((d) => (sub.schedule.jadwalPerHari && sub.schedule.jadwalPerHari[d]) || sub.schedule.jamBelajar).join('; ');

      return [
        idx + 1,
        sub.profile.namaLengkap,
        sub.profile.KelasSaatini || sub.profile.kelasRombel,
        hariStr,
        jamStr
      ];
    });

    const fullTsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(fullTsv);
    setCopyToast(`✓ Berhasil menyalin data ke format Sheet REKAP_HARI (${submissions.length} baris)!`);
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleCopyRekapSudahSheet = () => {
    if (submissions.length === 0) return;

    const headers = [
      'No',
      'Kode_Verifikasi',
      'nopdkt',
      'NISN',
      'NIK',
      'NamaLengkap',
      'KelasSaatini',
      'JenisKelamin',
      'NomorHP',
      'Status_Bekerja',
      'Hari_Belajar_3x',
      'Jam_Belajar',
      'Status_Materai_10000',
      'Nama_File_Surat',
      'Link_Berkas_Drive',
      'Tanggal_Konfirmasi',
      'Status_Verifikasi',
      'Catatan_Admin'
    ];

    const rows = submissions.map((sub, idx) => [
      idx + 1,
      sub.statement.verificationCode,
      sub.profile.nopdkt || sub.id,
      sub.profile.nisn || (sub.profile.idType === 'NISN' ? `'${sub.profile.idNumber}` : '-'),
      sub.profile.nik || (sub.profile.idType === 'NIK' ? `'${sub.profile.idNumber}` : '-'),
      sub.profile.namaLengkap,
      sub.profile.KelasSaatini || sub.profile.kelasRombel,
      sub.profile.jenisKelamin || sub.profile.JenisKelamin || '-',
      sub.profile.nomorHP || sub.profile['NomorHP'] || '-',
      sub.work.statusBekerja,
      sub.schedule.hariBelajar.join(', '),
      sub.schedule.jamBelajar,
      sub.statement.hasMaterai ? 'Bermaterai Sah Rp10.000' : 'Belum Lengkap',
      sub.statement.fileName || '-',
      'https://drive.google.com/drive/folders/1nxSpZEe3ar1_icNZGsWzLLbz3U_oBFQO',
      new Date(sub.submittedAt).toLocaleString('id-ID'),
      'TERVERIFIKASI',
      sub.schedule.catatanKomitmen || '-'
    ]);

    const fullTsv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(fullTsv);
    setCopyToast(`✓ Berhasil menyalin data ke format Sheet REKAP_SUDAH (${submissions.length} baris)!`);
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleCopyAllToGoogleSheets = () => {
    handleCopyRekapSudahSheet();
  };

  const handleDownloadMasterCsv = () => {
    if (submissions.length === 0) return;

    const headers = [
      'Timestamp', 'ID_Konfirmasi', 'Kode_Verifikasi', 'NISN', 'NIK', 'Nama_Lengkap',
      'Status_Bekerja', 'Nama_Tempat_Kerja', 'Jabatan_Pekerjaan', 'Bidang_Usaha',
      'Alamat_Tempat_Kerja', 'Paket_Jadwal_Belajar', 'Hari_Belajar_3x', 'Jam_Belajar',
      'Status_Materai_10000', 'Nama_File_Surat', 'Status_Verifikasi_Admin'
    ];

    const rows = submissions.map((sub) => [
      new Date(sub.submittedAt).toISOString(),
      sub.id,
      sub.statement.verificationCode,
      sub.profile.idType === 'NISN' ? `'${sub.profile.idNumber}` : '-',
      sub.profile.idType === 'NIK' ? `'${sub.profile.idNumber}` : '-',
      sub.profile.namaLengkap,
      sub.work.statusBekerja,
      sub.work.namaTempatKerja || '-',
      sub.work.jenisPekerjaan || '-',
      sub.work.bidangUsaha || '-',
      sub.work.alamatTempatKerja || '-',
      sub.schedule.paketOpsi,
      sub.schedule.hariBelajar.join('; '),
      sub.schedule.jamBelajar,
      'Bermaterai Sah Rp10.000',
      sub.statement.fileName || '-',
      'TERVERIFIKASI'
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      headers.map((h) => `"${h}"`).join(',') +
      '\n' +
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Konfirmasi_Rombel_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id="admin-rekap-modal"
      className="fixed inset-0 z-50 bg-[#0B0F19]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
    >
      <div className="bg-slate-900/95 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl p-0.5 bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg shadow-black/40 ring-1 ring-yellow-400/30 shrink-0">
              <LogoRombel className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-950/80 px-2.5 py-0.5 rounded-full border border-yellow-800/60">
                  Panel Pengurus / Admin Rombel
                </span>
                <span className="text-xs text-slate-400">
                  Spreadsheet ID: <strong className="text-yellow-400 font-mono">{spreadsheetId.slice(0, 8)}...</strong>
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1 font-['Outfit',sans-serif]">
                Struktur Sheet & Sinkronisasi Data SISWA (78 Kolom)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://drive.google.com/drive/folders/1nxSpZEe3ar1_icNZGsWzLLbz3U_oBFQO?dmr=1&ec=wgc-drive-%5Bmodule%5D-goto"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 bg-blue-950 text-blue-300 hover:text-blue-100 border border-blue-500/40 text-xs font-bold px-3 py-2 rounded-xl transition hover:bg-blue-900 shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Folder Foto Drive</span>
            </a>
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-950 text-emerald-300 hover:text-emerald-100 border border-emerald-500/40 text-xs font-bold px-3.5 py-2 rounded-xl transition hover:bg-emerald-900 shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Google Sheets</span>
            </a>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-950/90 px-4 sm:px-6 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'structure'
                ? 'border-yellow-400 text-yellow-300 bg-yellow-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-yellow-400" />
            <span>1. Rekomendasi 5 Sheet Tambahan</span>
          </button>

          <button
            onClick={() => setActiveTab('siswa_mapping')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'siswa_mapping'
                ? 'border-yellow-400 text-yellow-300 bg-yellow-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>2. Mapping 78 Kolom Sheet SISWA Anda</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'submissions'
                ? 'border-yellow-400 text-yellow-300 bg-yellow-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>3. Data Masuk dari Web ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'formulas'
                ? 'border-yellow-400 text-yellow-300 bg-yellow-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>4. Rumus XLOOKUP ke Sheet SISWA</span>
          </button>
        </div>

        {/* Global Toast if active */}
        {copyToast && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 p-3 text-center text-xs font-black text-emerald-300 flex items-center justify-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{copyToast}</span>
          </div>
        )}

        {/* TAB 1: REKOMENDASI 5 SHEET TAMBAHAN */}
        {activeTab === 'structure' && (
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 bg-slate-950/50">
            {/* Banner Link Spreadsheet User */}
            <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border-2 border-emerald-500/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                      Sheet SISWA Anda Sudah Sangat Lengkap (78 Kolom)
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-white mt-1 font-['Outfit',sans-serif]">
                    Tambahkan 5 Sheet Pendukung Berikut di File Spreadsheet Anda
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Agar sheet <strong className="text-yellow-300">SISWA</strong> Anda tidak penuh bercampur dengan log harian, buat 5 sheet terpisah di bawah ini:
                  </p>
                </div>
              </div>
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs transition shadow-lg shrink-0 cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Google Sheets</span>
              </a>
            </div>

            {/* List Recommended Sheets */}
            <div className="grid grid-cols-1 gap-4">
              {RECOMMENDED_SHEETS_FOR_USER.filter((s) => s.status === 'new').map((sheet, index) => (
                <div
                  key={sheet.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 flex items-center justify-center font-black text-xs">
                        {index + 2}
                      </span>
                      <h4 className="text-sm sm:text-base font-black text-white font-['Outfit',sans-serif]">
                        {sheet.namaSheet}
                      </h4>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                        {sheet.tag}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCopySheetHeaders(sheet.id, sheet.kolom)}
                        className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-yellow-400 hover:text-slate-950 text-slate-200 border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Header</span>
                      </button>

                      {sheet.id === 'KONFIRMASI' && (
                        <button
                          type="button"
                          onClick={handleCopyKonfirmasiSheet}
                          className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Data ({submissions.length})</span>
                        </button>
                      )}

                      {sheet.id === 'JADWAL' && (
                        <button
                          type="button"
                          onClick={handleCopyJadwalSheet}
                          className="inline-flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Data ({submissions.length})</span>
                        </button>
                      )}

                      {sheet.id === 'REKAP_HARI' && (
                        <button
                          type="button"
                          onClick={handleCopyRekapHariSheet}
                          className="inline-flex items-center gap-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer shadow"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Data ({submissions.length})</span>
                        </button>
                      )}

                      {sheet.id === 'REKAP_SUDAH' && (
                        <button
                          type="button"
                          onClick={handleCopyRekapSudahSheet}
                          className="inline-flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-black px-3 py-1.5 rounded-xl transition cursor-pointer shadow"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Data ({submissions.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {sheet.deskripsi}
                  </p>

                  {/* Header Columns Preview Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Kolom yang perlu dibuat ({sheet.kolom.length} Kolom):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sheet.kolom.map((col, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[11px] font-mono bg-slate-950 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg"
                        >
                          <strong className="text-yellow-400 mr-1">{String.fromCharCode(65 + (cIdx % 26))}</strong>
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
                    <span><strong>Trik Pengurus:</strong> {sheet.catatan}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: MAPPING 78 KOLOM SHEET SISWA ANDA */}
        {activeTab === 'siswa_mapping' && (
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 bg-slate-950/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                    <span>Analisis 78 Kolom Sheet SISWA Anda</span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Struktur kolom sheet Anda sudah sangat komprehensif mengikuti standar Dapodik/PKBM. Berikut pemetaan kolom kunci yang terhubung langsung dengan Web App ini:
                  </p>
                </div>
              </div>

              {/* Highlight Kunci Hubungan Kolom */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="bg-slate-900 border-2 border-yellow-500/60 rounded-2xl p-4 space-y-2 shadow-lg shadow-yellow-950/40">
                  <div className="flex items-center justify-between text-yellow-400 font-black text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-yellow-400/20 flex items-center justify-center font-mono">A</span>
                      <span>Kolom nopdkt (PDKT)</span>
                    </div>
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded font-mono">3 Angka</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Kunci unik internal 3 digit (contoh: <code>001</code>, <code>002</code>, <code>015</code>) untuk penomoran Siswa Rombel Karang Taruna.
                  </p>
                </div>

                <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl p-4 space-y-2 shadow-lg shadow-cyan-950/40">
                  <div className="flex items-center justify-between text-cyan-400 font-black text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-400/20 flex items-center justify-center font-mono">C</span>
                      <span>Kolom NISN</span>
                    </div>
                    <span className="text-[10px] bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded font-mono">10 Digit</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Nomor Induk Siswa Nasional standar Kemendikbudristek untuk sinkronisasi Dapodik PKBM.
                  </p>
                </div>

                <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-4 space-y-2 shadow-lg shadow-emerald-950/40">
                  <div className="flex items-center justify-between text-emerald-400 font-black text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-400/20 flex items-center justify-center font-mono">H</span>
                      <span>Kolom NIK</span>
                    </div>
                    <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded font-mono">16 Digit</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Nomor Induk Kependudukan KTP/KK untuk validasi legalitas Surat Pernyataan Kesanggupan bermaterai.
                  </p>
                </div>
              </div>

              {/* Status Kolom Output */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <span className="w-6 h-6 rounded-lg bg-cyan-400/20 flex items-center justify-center font-mono">BU</span>
                    <span>Kolom SKesanggupan (Kolom ke-73)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Otomatis terisi status <em>"Sanggup Belajar 3x Seminggu"</em> dan paket hari belajar setelah Siswa menyelesaikan <strong>Tahap 3</strong>.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <span className="w-6 h-6 rounded-lg bg-emerald-400/20 flex items-center justify-center font-mono">BX</span>
                    <span>Kolom SPernyataan (Kolom ke-76)</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Otomatis terisi <em>"Bermaterai Sah Rp10.000 (Terverifikasi)"</em> dan tautan/nama file surat setelah submit di <strong>Tahap 4</strong>.
                  </p>
                </div>
              </div>

              {/* Detail 78 Kolom Full Visual */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider block">
                  Daftar Lengkap 78 Kolom Sheet SISWA Anda:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {USER_SISWA_COLUMNS.map((col, idx) => (
                    <div
                      key={idx}
                      className={`text-[11px] p-2 rounded-lg border font-mono flex items-center justify-between ${
                        ['NISN', 'NIK', 'NamaLengkap', 'SKesanggupan', 'SPernyataan', 'Status', 'KelasSaatini'].includes(col)
                          ? 'bg-yellow-950/60 border-yellow-500/50 text-yellow-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{col}</span>
                      <span className="text-[10px] text-slate-500 ml-1">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DATA SUBMISSIONS MASUK DARI WEB */}
        {activeTab === 'submissions' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, NISN/NIK, rombel..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs sm:text-sm font-semibold focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <button
                  id="btn-copy-konfirmasi"
                  onClick={handleCopyKonfirmasiSheet}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-emerald-400/40"
                  title="Salin 17 Kolom Sheet KONFIRMASI"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sheet KONFIRMASI</span>
                </button>

                <button
                  id="btn-copy-jadwal"
                  onClick={handleCopyJadwalSheet}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-indigo-400/40"
                  title="Salin 12 Kolom Sheet JADWAL"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sheet JADWAL</span>
                </button>

                <button
                  id="btn-copy-rekap-hari"
                  onClick={handleCopyRekapHariSheet}
                  className="inline-flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition shadow cursor-pointer border border-cyan-400/40"
                  title="Salin 5 Kolom Sheet REKAP_HARI"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sheet REKAP_HARI</span>
                </button>

                <button
                  id="btn-copy-rekap-sudah"
                  onClick={handleCopyRekapSudahSheet}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black transition shadow-lg shadow-yellow-500/20 cursor-pointer border border-yellow-400"
                  title="Salin 18 Kolom Master Sheet REKAP_SUDAH"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sheet REKAP_SUDAH</span>
                </button>

                <button
                  id="btn-download-master-csv"
                  onClick={handleDownloadMasterCsv}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950/50">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                  <p className="text-sm font-semibold text-slate-400">
                    Tidak ada data siswa yang cocok dengan pencarian.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-900">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead className="bg-slate-950 text-slate-200 uppercase font-black text-[11px] border-b border-slate-800 tracking-wider">
                      <tr>
                        <th className="p-3.5">No</th>
                        <th className="p-3.5">Nama Lengkap</th>
                        <th className="p-3.5">NISN / NIK</th>
                        <th className="p-3.5">Program Rombel</th>
                        <th className="p-3.5">Status Kerja</th>
                        <th className="p-3.5">Jadwal (3x)</th>
                        <th className="p-3.5">Surat Materai</th>
                        <th className="p-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-medium">
                      {filteredSubmissions.map((sub, idx) => (
                        <tr key={sub.id} className="hover:bg-slate-800/60 transition">
                          <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="p-3.5 font-black text-white">
                            {sub.profile.namaLengkap}
                          </td>
                          <td className="p-3.5 font-mono text-yellow-400">
                            {sub.profile.idNumber}
                          </td>
                          <td className="p-3.5 max-w-xs truncate text-slate-300">{sub.profile.kelasRombel}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                sub.work.statusBekerja === 'Aktif'
                                  ? 'bg-yellow-950 text-yellow-300 border border-yellow-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {sub.work.statusBekerja}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-300">
                            {sub.schedule.hariBelajar.join(', ')}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-black bg-emerald-950 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Rp10.000</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => setSelectedSubmission(sub)}
                              className="text-xs text-yellow-400 hover:text-yellow-300 font-black hover:underline cursor-pointer"
                            >
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Detail Modal Sub-View if selected */}
            {selectedSubmission && (
              <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-start justify-between gap-4 animate-fadeIn">
                <div className="space-y-1 text-xs">
                  <h4 className="font-black text-white text-sm">
                    Detail Siswa: {selectedSubmission.profile.namaLengkap}
                  </h4>
                  <p className="text-slate-400">
                    Alamat: {selectedSubmission.profile.alamat} • Orang Tua: {selectedSubmission.profile.namaOrangTua}
                  </p>
                  {selectedSubmission.work.statusBekerja === 'Aktif' && (
                    <p className="text-slate-400">
                      Tempat Kerja: {selectedSubmission.work.namaTempatKerja} ({selectedSubmission.work.jenisPekerjaan}) - {selectedSubmission.work.bidangUsaha}
                    </p>
                  )}
                  <p className="text-slate-400">
                    Jadwal: {selectedSubmission.schedule.hariBelajar.join(', ')} ({selectedSubmission.schedule.jamBelajar}) • File: {selectedSubmission.statement.fileName}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const p = selectedSubmission.profile;
                      const s = selectedSubmission.schedule;
                      let phone = (p.noHpWa || p.NomorHP || '').replace(/\D/g, '');
                      if (phone.startsWith('0')) phone = '62' + phone.slice(1);
                      const msg = `*KONFIRMASI ROMBEL KARANG TARUNA TAMBORA*\n\nHalo Sdr/i *${p.namaLengkap}* (${p.kelasRombel}),\nData konfirmasi belajar dan Surat Pernyataan Kesanggupan (Materai Rp10.000) Anda telah tercatat di sistem:\n\n• Jadwal Belajar (3x): ${s.hariBelajar.join(', ')} (${s.jamBelajar})\n• Kode Verifikasi: ${selectedSubmission.statement.verificationCode || '-'}\n• Status: Terverifikasi Lengkap\n\nTerima kasih atas komitmen belajarnya!`;
                      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                    title="Kirim Konfirmasi ke WhatsApp Siswa"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim WA</span>
                  </button>
                  <button
                    onClick={() => setSelectedSubmission(null)}
                    className="text-xs bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-white font-bold hover:bg-slate-700 cursor-pointer"
                  >
                    Tutup Detail
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RUMUS XLOOKUP KE SHEET SISWA ANDA */}
        {activeTab === 'formulas' && (
          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 bg-slate-950/50">
            <div className="space-y-4">
              <h4 className="text-base font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span>Rumus Otomatis untuk Menghubungkan Sheet SISWA dengan Sheet Lainnya</span>
              </h4>
              <p className="text-xs text-slate-300">
                Salin rumus di bawah ini ke baris 2 kolom yang bersangkutan di sheet <strong>SISWA</strong> Anda (agar otomatis menarik status dari sheet <strong>REKAP_SUDAH</strong>, <strong>JADWAL</strong>, atau <strong>KONFIRMASI</strong>):
              </p>

              {/* Formula Cards */}
              <div className="space-y-3.5">
                {/* Formula 1: SPernyataan */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-yellow-400 uppercase flex items-center gap-1.5">
                      <span>1. Isi Otomatis Kolom SPernyataan (Kolom ke-76 di Sheet SISWA)</span>
                    </strong>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('=IFERROR(XLOOKUP(A2, REKAP_SUDAH!C:C, REKAP_SUDAH!M:M), "Belum Submit Web")');
                          setCopyToast('✓ Rumus SPernyataan (berdasarkan PDKT Kolom A) disalin!');
                          setTimeout(() => setCopyToast(null), 3000);
                        }}
                        className="text-xs bg-slate-800 hover:bg-yellow-400 hover:text-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition font-bold"
                      >
                        <Copy className="w-3 h-3" /> Pakai PDKT (A2)
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('=IFERROR(XLOOKUP(C2, REKAP_SUDAH!D:D, REKAP_SUDAH!M:M), "Belum Submit Web")');
                          setCopyToast('✓ Rumus SPernyataan (berdasarkan NISN Kolom C) disalin!');
                          setTimeout(() => setCopyToast(null), 3000);
                        }}
                        className="text-xs bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition font-bold"
                      >
                        <Copy className="w-3 h-3" /> Pakai NISN (C2)
                      </button>
                    </div>
                  </div>
                  <code className="block bg-slate-950 p-2.5 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800">
                    =IFERROR(XLOOKUP(A2, REKAP_SUDAH!C:C, REKAP_SUDAH!M:M), "Belum Submit Web")
                  </code>
                  <p className="text-[11px] text-slate-400">
                    *Menampilkan <em>"Bermaterai Sah Rp10.000"</em> dari Sheet <strong>REKAP_SUDAH</strong> jika siswa sudah konfirmasi.
                  </p>
                </div>

                {/* Formula 2: SKesanggupan */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-cyan-400 uppercase flex items-center gap-1.5">
                      <span>2. Isi Otomatis Kolom SKesanggupan (Kolom ke-73 di Sheet SISWA)</span>
                    </strong>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('=IFERROR(XLOOKUP(A2, REKAP_SUDAH!C:C, REKAP_SUDAH!K:K), "Belum Pilih Jadwal")');
                          setCopyToast('✓ Rumus SKesanggupan (PDKT A2) disalin!');
                          setTimeout(() => setCopyToast(null), 3000);
                        }}
                        className="text-xs bg-slate-800 hover:bg-yellow-400 hover:text-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition font-bold"
                      >
                        <Copy className="w-3 h-3" /> Pakai PDKT (A2)
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('=IFERROR(XLOOKUP(C2, REKAP_SUDAH!D:D, REKAP_SUDAH!K:K), "Belum Pilih Jadwal")');
                          setCopyToast('✓ Rumus SKesanggupan (NISN C2) disalin!');
                          setTimeout(() => setCopyToast(null), 3000);
                        }}
                        className="text-xs bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition font-bold"
                      >
                        <Copy className="w-3 h-3" /> Pakai NISN (C2)
                      </button>
                    </div>
                  </div>
                  <code className="block bg-slate-950 p-2.5 rounded-xl text-xs font-mono text-cyan-400 border border-slate-800">
                    =IFERROR(XLOOKUP(A2, REKAP_SUDAH!C:C, REKAP_SUDAH!K:K), "Belum Pilih Jadwal")
                  </code>
                  <p className="text-[11px] text-slate-400">
                    *Menampilkan ringkasan hari belajar 3x seminggu yang dipilih oleh siswa (misal: <em>Senin, Rabu, Jumat</em>).
                  </p>
                </div>

                {/* Formula 3: Tarik Detail Jam Belajar dari Sheet JADWAL */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-purple-400 uppercase flex items-center gap-1.5">
                      <span>3. Menarik Jadwal & Jam Rinci dari Sheet JADWAL</span>
                    </strong>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('=IFERROR(XLOOKUP(A2, JADWAL!B:B, JADWAL!G:G & " (" & JADWAL!H:H & ") | " & JADWAL!I:I & " (" & JADWAL!J:J & ") | " & JADWAL!K:K & " (" & JADWAL!L:L & ")"), "-")');
                        setCopyToast('✓ Rumus Rincian Jam per Hari disalin!');
                        setTimeout(() => setCopyToast(null), 3000);
                      }}
                      className="text-xs bg-slate-800 hover:bg-purple-400 hover:text-slate-950 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition font-bold"
                    >
                      <Copy className="w-3 h-3" /> Salin Rumus Rinci
                    </button>
                  </div>
                  <code className="block bg-slate-950 p-2.5 rounded-xl text-xs font-mono text-purple-400 border border-slate-800">
                    =IFERROR(XLOOKUP(A2, JADWAL!B:B, JADWAL!G:G & " (" & JADWAL!H:H & ") | " & JADWAL!I:I & " (" & JADWAL!J:J & ") | " & JADWAL!K:K & " (" & JADWAL!L:L & ")"), "-")
                  </code>
                  <p className="text-[11px] text-slate-400">
                    *Menarik Hari1+jam1, Hari2+jam2, dan Hari3+jam3 menjadi satu teks lengkap per siswa.
                  </p>
                </div>

                {/* Formula 4: Isi Otomatis Sheet REKAP_SUDAH dengan FILTER */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-emerald-400 uppercase flex items-center gap-1.5">
                      <span>4. Formula Otomatis untuk Mengisi Sheet REKAP_SUDAH</span>
                    </strong>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('=QUERY(KONFIRMASI!A2:Q, "SELECT B, C, D, E, F, G, J, M WHERE A IS NOT NULL", 0)');
                        setCopyToast('✓ Rumus QUERY disalin!');
                        setTimeout(() => setCopyToast(null), 3000);
                      }}
                      className="text-xs bg-slate-800 hover:bg-emerald-400 hover:text-slate-950 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition font-bold"
                    >
                      <Copy className="w-3 h-3" /> Salin Rumus QUERY
                    </button>
                  </div>
                  <code className="block bg-slate-950 p-2.5 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800">
                    =QUERY(KONFIRMASI!A2:Q, "SELECT B, C, D, E, F, G, J, M WHERE A IS NOT NULL", 0)
                  </code>
                  <p className="text-[11px] text-slate-400">
                    *Tempel di cell <code>C2</code> Sheet <strong>REKAP_SUDAH</strong> jika ingin langsung terisi dinamis dari Sheet <strong>KONFIRMASI</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>Pangkalan Data: <strong className="text-emerald-400 font-bold">Google Spreadsheet Aktif</strong></span>
          <div className="flex items-center gap-3">
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka Google Sheets
            </a>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition cursor-pointer border border-slate-700"
            >
              Tutup Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
