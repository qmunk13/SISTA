import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Camera,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  Edit3,
  Upload,
  HeartHandshake,
  ShieldCheck,
  Info,
  X
} from 'lucide-react';
import { StudentProfile } from '../types';
import { formatGoogleDriveUrl, handleDriveImageError } from '../utils/driveHelper';

interface Tahap2ReviewEditProps {
  initialProfile: StudentProfile;
  onConfirmProfile: (updatedProfile: StudentProfile) => void;
  onBackToStep1: () => void;
}

// Format date into YYYY-MM-DD for native HTML5 date picker
export const formatToYYYYMMDD = (str?: string): string => {
  if (!str) return '';
  const trimmed = String(str).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return str;
};

// Helper to determine if a field value is empty
export const isFieldEmpty = (val: any): boolean => {
  if (val === null || val === undefined) return true;
  const s = String(val).trim();
  return s === '' || s === '-' || s === '--' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined';
};

// Field input / select styling class generator:
// - Empty -> RED (border-red-500 bg-red-950/25)
// - Filled & Confirmed / Edited -> GREEN (border-emerald-500 bg-emerald-950/20)
// - Filled & Needs Review / Edit -> YELLOW / AMBER (border-amber-400 bg-amber-950/20)
export const getControlClass = (val: any, isConfirmed: boolean, extra = ''): string => {
  const empty = isFieldEmpty(val);
  if (empty) {
    return `w-full px-3.5 py-2.5 rounded-xl border-2 border-red-500 bg-red-950/25 text-white font-semibold text-sm focus:border-red-400 focus:bg-slate-950 outline-none transition-all placeholder:text-red-400/50 shadow-xs shadow-red-950/40 ${extra}`;
  }
  if (isConfirmed) {
    return `w-full px-3.5 py-2.5 rounded-xl border-2 border-emerald-500/90 bg-emerald-950/20 text-white font-semibold text-sm focus:border-emerald-400 focus:bg-slate-900 outline-none transition-all shadow-xs shadow-emerald-950/30 ${extra}`;
  }
  return `w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-400/90 bg-amber-950/20 text-white font-semibold text-sm focus:border-amber-300 focus:bg-slate-900 outline-none transition-all shadow-xs shadow-amber-950/30 ${extra}`;
};

export const getSmallControlClass = (val: any, isConfirmed: boolean, extra = ''): string => {
  const empty = isFieldEmpty(val);
  if (empty) {
    return `w-full px-3 py-2 rounded-xl border-2 border-red-500 bg-red-950/25 text-white text-xs font-semibold focus:border-red-400 focus:bg-slate-950 outline-none transition-all placeholder:text-red-400/50 shadow-xs shadow-red-950/40 ${extra}`;
  }
  if (isConfirmed) {
    return `w-full px-3 py-2 rounded-xl border-2 border-emerald-500/90 bg-emerald-950/20 text-white text-xs font-semibold focus:border-emerald-400 focus:bg-slate-900 outline-none transition-all shadow-xs shadow-emerald-950/30 ${extra}`;
  }
  return `w-full px-3 py-2 rounded-xl border-2 border-amber-400/90 bg-amber-950/20 text-white text-xs font-semibold focus:border-amber-300 focus:bg-slate-900 outline-none transition-all shadow-xs shadow-amber-950/30 ${extra}`;
};

// Reusable label with interactive status:
// - Empty -> Red 'KOSONG' badge
// - Filled & Confirmed -> Green 'BENAR' badge
// - Filled & Pending -> Yellow 'KONFIRMASI / EDIT' badge (clickable to toggle)
export const FieldLabel: React.FC<{
  title: string;
  value: any;
  required?: boolean;
  typeHint?: string;
  isSmall?: boolean;
  isConfirmed?: boolean;
  onToggleConfirm?: () => void;
}> = ({ title, value, required = true, typeHint, isSmall, isConfirmed, onToggleConfirm }) => {
  const empty = isFieldEmpty(value);
  return (
    <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
      <span className={`block font-bold text-slate-300 uppercase tracking-wider ${isSmall ? 'text-[10px]' : 'text-[11px]'}`}>
        {title} {required && <span className="text-yellow-400 font-black">*</span>}
        {typeHint && <span className="text-blue-400 font-normal text-[10px] ml-1">({typeHint})</span>}
      </span>
      {empty ? (
        required ? (
          <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-red-300 bg-red-950/90 border border-red-500/70 px-1.5 py-0.5 rounded shadow-xs animate-pulse">
            <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
            KOSONG (Wajib)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-slate-400 bg-slate-900/90 border border-slate-700/70 px-1.5 py-0.5 rounded shadow-xs">
            Tidak Wajib (Meninggal)
          </span>
        )
      ) : isConfirmed ? (
        <button
          type="button"
          onClick={onToggleConfirm}
          title="Klik untuk ubah status ke Konfirmasi/Edit"
          className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/60 px-1.5 py-0.5 rounded hover:bg-emerald-900 transition shadow-xs cursor-pointer"
        >
          <Check className="w-2.5 h-2.5 text-emerald-400" />
          BENAR
        </button>
      ) : (
        <button
          type="button"
          onClick={onToggleConfirm}
          title="Klik untuk konfirmasi data ini sudah benar (Hijau)"
          className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/60 px-1.5 py-0.5 rounded hover:bg-amber-900 transition shadow-xs cursor-pointer"
        >
          <Edit3 className="w-2.5 h-2.5 text-amber-400" />
          KONFIRMASI / EDIT
        </button>
      )}
    </div>
  );
};

// Smart auto-calculator for Status Yatim / Piatu based on Ayah & Ibu status
export const calculateSmartStatusYatim = (statusAyah?: string, statusIbu?: string): string => {
  const sA = String(statusAyah || '').trim();
  const sI = String(statusIbu || '').trim();

  if (sA === 'Meninggal' && sI === 'Meninggal') return 'Yatim Piatu';
  if (sA === 'Masih Hidup' && sI === 'Meninggal') return 'Piatu';
  if (sA === 'Meninggal' && (sI === 'Masih Hidup' || sI === '')) return 'Yatim';
  if (sA === 'Masih Hidup' && sI === 'Masih Hidup') return 'Lengkap';
  if (sA === 'Meninggal') return 'Yatim';
  if (sI === 'Meninggal') return 'Piatu';
  return '';
};

export const Tahap2ReviewEdit: React.FC<Tahap2ReviewEditProps> = ({
  initialProfile,
  onConfirmProfile,
  onBackToStep1,
}) => {
  // Normalize initial data with pure sheet values (no fabricated dummy values)
  const [formData, setFormData] = useState<StudentProfile>(() => {
    const initTgl = formatToYYYYMMDD(initialProfile.tanggalLahir || initialProfile.TanggalLahir) || '';
    
    // Gender detection from sheet
    const rawJk = String(initialProfile.JenisKelamin || initialProfile.jenisKelamin || '').trim().toUpperCase();
    const isFemale = rawJk === 'P' || rawJk === 'PEREMPUAN';
    const isMale = rawJk === 'L' || rawJk === 'LAKI-LAKI';
    const jkFull = isFemale ? 'Perempuan' : (isMale ? 'Laki-laki' : (initialProfile.jenisKelamin || ''));
    const jkCode = isFemale ? 'P' : (isMale ? 'L' : (initialProfile.JenisKelamin || ''));

    const stAyah = initialProfile.statusAyah || initialProfile.StatusAyah || '';
    const stIbu = initialProfile.statusIbu || initialProfile.StatusIbu || '';
    const smartYatim = calculateSmartStatusYatim(stAyah, stIbu) || initialProfile.statusYatim || initialProfile.StatusYatim || '';

    return {
      ...initialProfile,
      // 1. nopdkt
      nopdkt: initialProfile.nopdkt || initialProfile.idNumber || '',
      // 2. TahunMasuk
      TahunMasuk: initialProfile.TahunMasuk || initialProfile.tahunMasuk || '',
      tahunMasuk: initialProfile.tahunMasuk || initialProfile.TahunMasuk || '',
      // 3. NISN
      nisn: initialProfile.nisn || initialProfile.NISN || '',
      NISN: initialProfile.NISN || initialProfile.nisn || '',
      // 4. NamaLengkap
      namaLengkap: initialProfile.namaLengkap || initialProfile.NamaLengkap || '',
      NamaLengkap: initialProfile.NamaLengkap || initialProfile.namaLengkap || '',
      // 5. JenisKelamin
      jenisKelamin: jkFull as any,
      JenisKelamin: jkCode as any,
      // 6. Tempat Lahir
      tempatLahir: initialProfile.tempatLahir || initialProfile.TempatLahir || initialProfile['Tempat Lahir'] || '',
      TempatLahir: initialProfile.TempatLahir || initialProfile.tempatLahir || initialProfile['Tempat Lahir'] || '',
      // 7. TanggalLahir (YYYY-MM-DD)
      tanggalLahir: initTgl,
      TanggalLahir: initTgl,
      // 8. NIK
      nik: initialProfile.nik || initialProfile.NIK || '',
      NIK: initialProfile.NIK || initialProfile.nik || '',
      // 9. Anak ke
      anakKe: initialProfile.anakKe ?? initialProfile['Anak ke'] ?? initialProfile.AnakKe ?? '',
      'Anak ke': initialProfile['Anak ke'] ?? initialProfile.anakKe ?? initialProfile.AnakKe ?? '',
      // 10. Saudara
      jumlahSaudara: initialProfile.jumlahSaudara ?? initialProfile.Saudara ?? initialProfile.JumlahSaudara ?? '',
      Saudara: initialProfile.Saudara ?? initialProfile.jumlahSaudara ?? initialProfile.JumlahSaudara ?? '',
      // 11. Agama
      agama: initialProfile.agama || initialProfile.Agama || '',
      Agama: initialProfile.Agama || initialProfile.agama || '',
      // 12. Golongan Darah
      golonganDarah: initialProfile.golonganDarah || initialProfile['Golongan Darah'] || 'Tidak Tahu',
      'Golongan Darah': initialProfile['Golongan Darah'] || initialProfile.golonganDarah || 'Tidak Tahu',
      // 13. TinggiBadan(cm)
      tinggiBadan: initialProfile.tinggiBadan || initialProfile['TinggiBadan(cm)'] || initialProfile.TinggiBadan || '',
      'TinggiBadan(cm)': initialProfile['TinggiBadan(cm)'] || initialProfile.tinggiBadan || initialProfile.TinggiBadan || '',
      // 14. BeratBadan(kg)
      beratBadan: initialProfile.beratBadan || initialProfile['BeratBadan(kg)'] || initialProfile.BeratBadan || '',
      'BeratBadan(kg)': initialProfile['BeratBadan(kg)'] || initialProfile.beratBadan || initialProfile.BeratBadan || '',
      // 15. Prestasi
      prestasi: initialProfile.prestasi || initialProfile.Prestasi || '',
      Prestasi: initialProfile.Prestasi || initialProfile.prestasi || '',
      // 16. Hobi
      hobi: initialProfile.hobi || initialProfile.Hobi || '',
      Hobi: initialProfile.Hobi || initialProfile.hobi || '',
      // 17. Catatan Penting
      catatanPenting: initialProfile.catatanPenting || initialProfile['Catatan Penting'] || initialProfile.CatatanPenting || '',
      'Catatan Penting': initialProfile['Catatan Penting'] || initialProfile.catatanPenting || initialProfile.CatatanPenting || '',
      // 18. Alamat
      alamat: initialProfile.alamat || initialProfile.Alamat || '',
      Alamat: initialProfile.Alamat || initialProfile.alamat || '',
      // 19. RT
      rt: initialProfile.rt || initialProfile.RT || '',
      RT: initialProfile.RT || initialProfile.rt || '',
      // 20. RW
      rw: initialProfile.rw || initialProfile.RW || '',
      RW: initialProfile.RW || initialProfile.rw || '',
      // 21. Kelurahan
      kelurahan: initialProfile.kelurahan || initialProfile.Kelurahan || '',
      Kelurahan: initialProfile.Kelurahan || initialProfile.kelurahan || '',
      // 22. Kecamatan
      kecamatan: initialProfile.kecamatan || initialProfile.Kecamatan || '',
      Kecamatan: initialProfile.Kecamatan || initialProfile.kecamatan || '',
      // 23. Kota
      kota: initialProfile.kota || initialProfile.Kota || '',
      Kota: initialProfile.Kota || initialProfile.kota || '',
      // 24. Provinsi
      provinsi: initialProfile.provinsi || initialProfile.Provinsi || '',
      Provinsi: initialProfile.Provinsi || initialProfile.provinsi || '',
      // 25. KodePos
      kodePos: initialProfile.kodePos || initialProfile.KodePos || '',
      KodePos: initialProfile.KodePos || initialProfile.kodePos || '',
      // 26. JenisTinggal
      jenisTinggal: initialProfile.jenisTinggal || initialProfile.JenisTinggal || '',
      JenisTinggal: initialProfile.JenisTinggal || initialProfile.jenisTinggal || '',
      // 27. AlatTransportasi
      alatTransportasi: initialProfile.alatTransportasi || initialProfile.AlatTransportasi || '',
      AlatTransportasi: initialProfile.AlatTransportasi || initialProfile.alatTransportasi || '',
      // 28. NomorHP
      noHpWa: initialProfile.noHpWa || initialProfile.NomorHP || initialProfile.noHp || '',
      NomorHP: initialProfile.NomorHP || initialProfile.noHpWa || initialProfile.noHp || '',
      // 29. E-Mail
      email: initialProfile.email || initialProfile['E-Mail'] || initialProfile.Email || '',
      'E-Mail': initialProfile['E-Mail'] || initialProfile.email || initialProfile.Email || '',
      // 30. AsalSekolah
      asalSekolah: initialProfile.asalSekolah || initialProfile.AsalSekolah || '',
      AsalSekolah: initialProfile.AsalSekolah || initialProfile.asalSekolah || '',
      // 31. PasFoto
      pasFoto: initialProfile.pasFoto || initialProfile.PasFoto || '',
      PasFoto: initialProfile.PasFoto || initialProfile.pasFoto || '',
      // 32. NomorKartuKeluarga
      nomorKartuKeluarga: initialProfile.nomorKartuKeluarga || initialProfile.NomorKartuKeluarga || '',
      NomorKartuKeluarga: initialProfile.NomorKartuKeluarga || initialProfile.nomorKartuKeluarga || '',
      // 33. StatusAyah
      statusAyah: stAyah,
      StatusAyah: stAyah,
      // 34. NamaAyah
      namaAyah: initialProfile.namaAyah || initialProfile.NamaAyah || '',
      NamaAyah: initialProfile.NamaAyah || initialProfile.namaAyah || '',
      // 35. PendidikanAyah
      pendidikanAyah: initialProfile.pendidikanAyah || initialProfile.PendidikanAyah || '',
      PendidikanAyah: initialProfile.PendidikanAyah || initialProfile.pendidikanAyah || '',
      // 36. PekerjaanAyah
      pekerjaanAyah: initialProfile.pekerjaanAyah || initialProfile.PekerjaanAyah || '',
      PekerjaanAyah: initialProfile.PekerjaanAyah || initialProfile.pekerjaanAyah || '',
      // 37. PenghasilanAyah
      penghasilanAyah: initialProfile.penghasilanAyah || initialProfile.PenghasilanAyah || '',
      PenghasilanAyah: initialProfile.PenghasilanAyah || initialProfile.penghasilanAyah || '',
      // 38. TlpAyah
      tlpAyah: initialProfile.tlpAyah || initialProfile.TlpAyah || '',
      TlpAyah: initialProfile.TlpAyah || initialProfile.tlpAyah || '',
      // 39. StatusIbu
      statusIbu: stIbu,
      StatusIbu: stIbu,
      // 40. NamaIbu
      namaIbu: initialProfile.namaIbu || initialProfile.NamaIbu || '',
      NamaIbu: initialProfile.NamaIbu || initialProfile.namaIbu || '',
      // 41. PendidikanIbu
      pendidikanIbu: initialProfile.pendidikanIbu || initialProfile.PendidikanIbu || '',
      PendidikanIbu: initialProfile.PendidikanIbu || initialProfile.pendidikanIbu || '',
      // 42. PekerjaanIbu
      pekerjaanIbu: initialProfile.pekerjaanIbu || initialProfile.PekerjaanIbu || '',
      PekerjaanIbu: initialProfile.PekerjaanIbu || initialProfile.pekerjaanIbu || '',
      // 43. PenghasilanIbu
      penghasilanIbu: initialProfile.penghasilanIbu || initialProfile.PenghasilanIbu || '',
      PenghasilanIbu: initialProfile.PenghasilanIbu || initialProfile.penghasilanIbu || '',
      // 44. TlpIbu
      tlpIbu: initialProfile.tlpIbu || initialProfile.TlpIbu || '',
      TlpIbu: initialProfile.TlpIbu || initialProfile.tlpIbu || '',
      // 45. StatusYatim (Smart Computed)
      statusYatim: smartYatim,
      StatusYatim: smartYatim,
      // 46. NamaWali
      namaWali: initialProfile.namaWali || initialProfile.NamaWali || '',
      NamaWali: initialProfile.NamaWali || initialProfile.namaWali || '',
      // 47. PekerjaanWali
      pekerjaanWali: initialProfile.pekerjaanWali || initialProfile.PekerjaanWali || '',
      PekerjaanWali: initialProfile.PekerjaanWali || initialProfile.pekerjaanWali || '',
      // 48. PenghasilanWali
      penghasilanWali: initialProfile.penghasilanWali || initialProfile.PenghasilanWali || '',
      PenghasilanWali: initialProfile.PenghasilanWali || initialProfile.penghasilanWali || '',
      // 49. Hubungan
      hubungan: initialProfile.hubungan || initialProfile.Hubungan || '',
      Hubungan: initialProfile.Hubungan || initialProfile.hubungan || '',
      // 50. Tlp.Wali
      tlpWali: initialProfile.tlpWali || initialProfile['Tlp.Wali'] || '',
      'Tlp.Wali': initialProfile['Tlp.Wali'] || initialProfile.tlpWali || '',
    };
  });

  const [fotoPreview, setFotoPreview] = useState<string>(
    formData.pasFoto || formData.PasFoto || ''
  );
  const [hasEdited, setHasEdited] = useState(false);
  const [isConfirmedByStudent, setIsConfirmedByStudent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [incompleteErrors, setIncompleteErrors] = useState<string[]>([]);

  // Field confirmation status:
  // - default false (starts as Yellow 'KONFIRMASI / EDIT')
  // - when edited or toggled to true -> turns Green 'BENAR'
  const [confirmedFields, setConfirmedFields] = useState<Record<string, boolean>>({});

  const toggleFieldConfirm = (key: string) => {
    setConfirmedFields(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleConfirmAllFields = () => {
    const allKeys = [
      'namaLengkap', 'TahunMasuk', 'jenisKelamin', 'tempatLahir', 'tanggalLahir', 'nik',
      'anakKe', 'jumlahSaudara', 'agama', 'golonganDarah', 'tinggiBadan', 'beratBadan',
      'prestasi', 'hobi', 'catatanPenting', 'alamat', 'rt', 'rw', 'kelurahan', 'kecamatan',
      'kota', 'provinsi', 'kodePos', 'jenisTinggal', 'alatTransportasi', 'noHpWa', 'email',
      'asalSekolah', 'nomorKartuKeluarga', 'statusAyah', 'namaAyah', 'pendidikanAyah',
      'pekerjaanAyah', 'penghasilanAyah', 'tlpAyah', 'statusIbu', 'namaIbu', 'pendidikanIbu',
      'pekerjaanIbu', 'penghasilanIbu', 'tlpIbu', 'namaWali', 'hubungan', 'pekerjaanWali',
      'penghasilanWali', 'tlpWali'
    ];
    const newConf: Record<string, boolean> = {};
    allKeys.forEach(k => {
      newConf[k] = true;
    });
    setConfirmedFields(newConf);
  };

  // Helper: Cek apakah status orang tua tidak dapat dihubungi, meninggal, atau tidak diketahui
  const isParentUnavailable = (status?: string) => {
    if (!status || !status.trim()) return false;
    const s = status.trim().toLowerCase();
    return s !== 'masih hidup' || s.includes('meninggal') || s.includes('almarhum') || s.includes('wafat') || s.includes('tidak diketahui') || s.includes('tidak ada kontak');
  };

  // WALI : Wajib jika salah satu meninggal atau Tidak diketahui / Tidak ada Kontak, wajib mencantumkan Wali pengganti
  const isWaliRequired = Boolean(
    isParentUnavailable(formData.statusAyah) ||
    isParentUnavailable(formData.statusIbu)
  );

  // TIDAK ADA KOLOM OPSIONAL: Semua kolom wajib diisi.
  // KECUALI: Data Ayah atau Ibu Kandung yang berstatus 'Meninggal' atau 'Tidak Diketahui' (pendidikan, pekerjaan, penghasilan, no WA dikecualikan).
  // Data Wali Murid / Penanggung Jawab wajib diisi jika salah satu atau kedua orang tua Meninggal / Tidak Diketahui / Tidak Ada Kontak.
  const allMandatoryFields = [
    { name: 'Tahun Masuk Angkatan', key: 'tahunMasuk', val: formData.TahunMasuk || formData.tahunMasuk },
    { name: 'Nama Lengkap Siswa', key: 'namaLengkap', val: formData.namaLengkap },
    { name: 'Jenis Kelamin', key: 'jenisKelamin', val: formData.jenisKelamin || formData.JenisKelamin },
    { name: 'Tempat Lahir', key: 'tempatLahir', val: formData.tempatLahir },
    { name: 'Tanggal Lahir', key: 'tanggalLahir', val: formData.tanggalLahir },
    { name: 'NIK Siswa (16 Digit)', key: 'nik', val: formData.nik },
    { name: 'Anak Ke-', key: 'anakKe', val: formData.anakKe },
    { name: 'Jumlah Saudara Kandung', key: 'jumlahSaudara', val: formData.jumlahSaudara },
    { name: 'Agama', key: 'agama', val: formData.agama },
    { name: 'Golongan Darah', key: 'golonganDarah', val: formData.golonganDarah },
    { name: 'Tinggi Badan (cm)', key: 'tinggiBadan', val: formData.tinggiBadan },
    { name: 'Berat Badan (kg)', key: 'beratBadan', val: formData.beratBadan },
    { name: 'Catatan Prestasi & Piagam (isi - jika belum ada)', key: 'prestasi', val: formData.prestasi },
    { name: 'Hobi & Minat Bakat', key: 'hobi', val: formData.hobi },
    { name: 'Catatan Khusus / Kesehatan (isi - jika normal)', key: 'catatanPenting', val: formData.catatanPenting },
    { name: 'Alamat Domisili Lengkap', key: 'alamat', val: formData.alamat },
    { name: 'RT', key: 'rt', val: formData.rt },
    { name: 'RW', key: 'rw', val: formData.rw },
    { name: 'Kelurahan / Desa', key: 'kelurahan', val: formData.kelurahan },
    { name: 'Kecamatan', key: 'kecamatan', val: formData.kecamatan },
    { name: 'Kota / Kabupaten', key: 'kota', val: formData.kota },
    { name: 'Provinsi', key: 'provinsi', val: formData.provinsi },
    { name: 'Kode Pos', key: 'kodePos', val: formData.kodePos },
    { name: 'Jenis Tempat Tinggal', key: 'jenisTinggal', val: formData.jenisTinggal },
    { name: 'Alat Transportasi ke Sekolah', key: 'alatTransportasi', val: formData.alatTransportasi },
    { name: 'Nomor HP/WA Siswa', key: 'noHpWa', val: formData.noHpWa },
    { name: 'Email Siswa', key: 'email', val: formData.email },
    { name: 'Asal Sekolah Sebelumnya', key: 'asalSekolah', val: formData.asalSekolah },
    { name: 'No KK (Kartu Keluarga)', key: 'nomorKartuKeluarga', val: formData.nomorKartuKeluarga },
    { name: 'Status Ayah Kandung', key: 'statusAyah', val: formData.statusAyah },
    ...(formData.statusAyah === 'Masih Hidup' ? [
      { name: 'Nama Lengkap Ayah', key: 'namaAyah', val: formData.namaAyah },
      { name: 'Pendidikan Terakhir Ayah', key: 'pendidikanAyah', val: formData.pendidikanAyah },
      { name: 'Pekerjaan Utama Ayah', key: 'pekerjaanAyah', val: formData.pekerjaanAyah },
      { name: 'Penghasilan Bulanan Ayah', key: 'penghasilanAyah', val: formData.penghasilanAyah },
      { name: 'No Telepon / WA Ayah', key: 'tlpAyah', val: formData.tlpAyah },
    ] : []),
    { name: 'Status Ibu Kandung', key: 'statusIbu', val: formData.statusIbu },
    ...(formData.statusIbu === 'Masih Hidup' ? [
      { name: 'Nama Lengkap Ibu', key: 'namaIbu', val: formData.namaIbu },
      { name: 'Pendidikan Terakhir Ibu', key: 'pendidikanIbu', val: formData.pendidikanIbu },
      { name: 'Pekerjaan Utama Ibu', key: 'pekerjaanIbu', val: formData.pekerjaanIbu },
      { name: 'Penghasilan Bulanan Ibu', key: 'penghasilanIbu', val: formData.penghasilanIbu },
      { name: 'No Telepon / WA Ibu', key: 'tlpIbu', val: formData.tlpIbu },
    ] : []),
    ...(isWaliRequired ? [
      { name: 'Nama Lengkap Wali (Wali Pengganti)', key: 'namaWali', val: formData.namaWali },
      { name: 'Hubungan Kekerabatan Wali', key: 'hubungan', val: formData.hubungan },
    ] : []),
  ];

  // Tidak ada kolom opsional dalam formulir
  const allOptionalFields: { name: string; key: string; val: any }[] = [];

  const emptyMandatoryFields = allMandatoryFields.filter(f => isFieldEmpty(f.val));
  const emptyOptionalFields: typeof allOptionalFields = [];
  const totalEmptyFields = emptyMandatoryFields;
  const totalEmptyCount = totalEmptyFields.length;
  const mandatoryEmptyCount = emptyMandatoryFields.length;
  const optionalEmptyCount = 0;
  const emptyFieldsCount = mandatoryEmptyCount;

  // Quick action: Autofill '-' for fields with status Meninggal
  const handleFillOptionalDashes = () => {};

  const updateField = (keyCamel: string, keySheet: string, value: any) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [keyCamel]: value,
        [keySheet]: value,
      };

      // Smart recalculate Status Yatim / Piatu if Ayah or Ibu status changes
      if (keyCamel === 'statusAyah' || keyCamel === 'statusIbu') {
        const sAyah = keyCamel === 'statusAyah' ? value : next.statusAyah;
        const sIbu = keyCamel === 'statusIbu' ? value : next.statusIbu;
        const smart = calculateSmartStatusYatim(sAyah, sIbu);
        next.statusYatim = smart;
        next.StatusYatim = smart;

        // Jika Status Ayah = Meninggal atau Tidak Diketahui, otomatis isi kolom pendidikan, pekerjaan, penghasilan, tlp dengan '-'
        if (keyCamel === 'statusAyah' && (value === 'Meninggal' || value === 'Tidak Diketahui')) {
          if (isFieldEmpty(next.pendidikanAyah)) { next.pendidikanAyah = '-'; next.PendidikanAyah = '-'; }
          if (isFieldEmpty(next.pekerjaanAyah)) { next.pekerjaanAyah = '-'; next.PekerjaanAyah = '-'; }
          if (isFieldEmpty(next.penghasilanAyah)) { next.penghasilanAyah = '-'; next.PenghasilanAyah = '-'; }
          if (isFieldEmpty(next.tlpAyah)) { next.tlpAyah = '-'; next.TlpAyah = '-'; }
        } else if (keyCamel === 'statusAyah' && value === 'Masih Hidup') {
          if (next.pendidikanAyah === '-') { next.pendidikanAyah = ''; next.PendidikanAyah = ''; }
          if (next.pekerjaanAyah === '-') { next.pekerjaanAyah = ''; next.PekerjaanAyah = ''; }
          if (next.penghasilanAyah === '-') { next.penghasilanAyah = ''; next.PenghasilanAyah = ''; }
          if (next.tlpAyah === '-') { next.tlpAyah = ''; next.TlpAyah = ''; }
        }

        // Jika Status Ibu = Meninggal atau Tidak Diketahui, otomatis isi kolom pendidikan, pekerjaan, penghasilan, tlp dengan '-'
        if (keyCamel === 'statusIbu' && (value === 'Meninggal' || value === 'Tidak Diketahui')) {
          if (isFieldEmpty(next.pendidikanIbu)) { next.pendidikanIbu = '-'; next.PendidikanIbu = '-'; }
          if (isFieldEmpty(next.pekerjaanIbu)) { next.pekerjaanIbu = '-'; next.PekerjaanIbu = '-'; }
          if (isFieldEmpty(next.penghasilanIbu)) { next.penghasilanIbu = '-'; next.PenghasilanIbu = '-'; }
          if (isFieldEmpty(next.tlpIbu)) { next.tlpIbu = '-'; next.TlpIbu = '-'; }
        } else if (keyCamel === 'statusIbu' && value === 'Masih Hidup') {
          if (next.pendidikanIbu === '-') { next.pendidikanIbu = ''; next.PendidikanIbu = ''; }
          if (next.pekerjaanIbu === '-') { next.pekerjaanIbu = ''; next.PekerjaanIbu = ''; }
          if (next.penghasilanIbu === '-') { next.penghasilanIbu = ''; next.PenghasilanIbu = ''; }
          if (next.tlpIbu === '-') { next.tlpIbu = ''; next.TlpIbu = ''; }
        }
      }

      return next;
    });

    // Mark as confirmed / edited (Green)
    setConfirmedFields(prev => ({
      ...prev,
      [keyCamel]: true
    }));

    setHasEdited(true);
    setValidationError(null);
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFotoPreview(base64);
        updateField('pasFoto', 'PasFoto', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenSuccessModal = (e: React.FormEvent) => {
    e.preventDefault();

    const missingList: string[] = [];

    // 1. Data Identitas Pribadi (Semua Wajib Diisi)
    if (!formData.namaLengkap?.trim()) {
      missingList.push('Nama Lengkap Siswa wajib diisi.');
    }
    if (!formData.TahunMasuk && !formData.tahunMasuk) {
      missingList.push('Tahun Masuk Angkatan wajib diisi.');
    }
    if (!formData.jenisKelamin && !formData.JenisKelamin) {
      missingList.push('Jenis Kelamin (Laki-laki / Perempuan) wajib dipilih.');
    }
    if (!formData.tempatLahir?.trim() || !formData.tanggalLahir) {
      missingList.push('Tempat Lahir dan Tanggal Lahir siswa wajib diisi lengkap.');
    }
    if (!formData.nik?.trim() || formData.nik.replace(/\D/g, '').length < 16) {
      missingList.push('NIK Siswa (Nomor Induk Kependudukan) wajib 16 digit angka.');
    }
    if (isFieldEmpty(formData.anakKe)) {
      missingList.push('Kolom Anak Ke- (urutan kelahiran) wajib diisi.');
    }
    if (isFieldEmpty(formData.jumlahSaudara)) {
      missingList.push('Kolom Jumlah Saudara Kandung wajib diisi.');
    }
    if (!formData.agama?.trim()) {
      missingList.push('Agama / Kepercayaan siswa wajib dipilih.');
    }
    if (!formData.golonganDarah?.trim()) {
      missingList.push('Golongan Darah siswa wajib dipilih.');
    }
    if (isFieldEmpty(formData.tinggiBadan) || isFieldEmpty(formData.beratBadan)) {
      missingList.push('Tinggi Badan (cm) dan Berat Badan (kg) wajib diisi.');
    }
    if (isFieldEmpty(formData.prestasi)) {
      missingList.push('Catatan Prestasi & Piagam wajib diisi (isi tanda - jika belum ada).');
    }
    if (!formData.hobi?.trim()) {
      missingList.push('Hobi / Minat Bakat siswa wajib diisi.');
    }
    if (isFieldEmpty(formData.catatanPenting)) {
      missingList.push('Catatan Khusus / Riwayat Kesehatan wajib diisi (isi tanda - jika sehat/normal).');
    }

    // 2. Data Domisili & Kontak (Semua Wajib Diisi)
    if (!formData.alamat?.trim() || formData.alamat.trim().length < 5) {
      missingList.push('Alamat domisili tempat tinggal lengkap wajib diisi.');
    }
    if (isFieldEmpty(formData.rt) || isFieldEmpty(formData.rw)) {
      missingList.push('Nomor RT dan RW domisili wajib diisi.');
    }
    if (!formData.kelurahan?.trim() || !formData.kecamatan?.trim() || !formData.kota?.trim() || !formData.provinsi?.trim()) {
      missingList.push('Kelurahan, Kecamatan, Kota/Kabupaten, dan Provinsi domisili wajib diisi lengkap.');
    }
    if (isFieldEmpty(formData.kodePos)) {
      missingList.push('Kode Pos domisili wajib diisi.');
    }
    if (!formData.jenisTinggal?.trim() || !formData.alatTransportasi?.trim()) {
      missingList.push('Jenis Tempat Tinggal dan Alat Transportasi ke sekolah wajib dipilih.');
    }
    if (!formData.noHpWa?.trim() || formData.noHpWa.trim().length < 9) {
      missingList.push('Nomor HP / WhatsApp aktif wajib diisi minimal 9 digit.');
    }
    if (!formData.email?.trim() || !formData.email.includes('@')) {
      missingList.push('Alamat E-Mail aktif siswa wajib diisi dengan format email yang valid.');
    }
    if (!formData.asalSekolah?.trim()) {
      missingList.push('Asal Sekolah SEBELUMNYA wajib diisi.');
    }
    if (!formData.nomorKartuKeluarga?.trim() || formData.nomorKartuKeluarga.replace(/\D/g, '').length < 16) {
      missingList.push('Nomor Kartu Keluarga (KK) wajib 16 digit angka.');
    }

    // 3. Data Orang Tua (Ayah & Ibu)
    // Aturan: Semua kolom wajib diisi KECUALI jika status Meninggal (pendidikan, pekerjaan, penghasilan, no WA dikecualikan).
    if (!formData.statusAyah?.trim()) {
      missingList.push('Status Ayah Kandung (Masih Hidup / Meninggal / Tidak Diketahui) wajib dipilih.');
    } else if (formData.statusAyah === 'Masih Hidup') {
      if (!formData.namaAyah?.trim() || formData.namaAyah.trim() === '-') {
        missingList.push('Nama Lengkap Ayah Kandung wajib diisi karena status Ayah Masih Hidup.');
      }
      if (!formData.pendidikanAyah?.trim() || formData.pendidikanAyah.trim() === '-') {
        missingList.push('Pendidikan Terakhir Ayah wajib dipilih.');
      }
      if (!formData.pekerjaanAyah?.trim() || formData.pekerjaanAyah.trim() === '-') {
        missingList.push('Pekerjaan Utama Ayah wajib diisi.');
      }
      if (isFieldEmpty(formData.penghasilanAyah)) {
        missingList.push('Penghasilan Bulanan Ayah wajib diisi (isi nominal atau tanda - jika tidak ada).');
      }
      if (!formData.tlpAyah?.trim() || formData.tlpAyah.trim() === '-') {
        missingList.push('Nomor Telepon / WA Ayah wajib diisi (isi nomor aktif atau tanda -).');
      }
    }

    if (!formData.statusIbu?.trim()) {
      missingList.push('Status Ibu Kandung (Masih Hidup / Meninggal / Tidak Diketahui) wajib dipilih.');
    } else if (formData.statusIbu === 'Masih Hidup') {
      if (!formData.namaIbu?.trim() || formData.namaIbu.trim() === '-') {
        missingList.push('Nama Lengkap Ibu Kandung wajib diisi karena status Ibu Masih Hidup.');
      }
      if (!formData.pendidikanIbu?.trim() || formData.pendidikanIbu.trim() === '-') {
        missingList.push('Pendidikan Terakhir Ibu wajib dipilih.');
      }
      if (!formData.pekerjaanIbu?.trim() || formData.pekerjaanIbu.trim() === '-') {
        missingList.push('Pekerjaan Utama Ibu wajib diisi.');
      }
      if (isFieldEmpty(formData.penghasilanIbu)) {
        missingList.push('Penghasilan Bulanan Ibu wajib diisi (isi nominal atau tanda - jika tidak ada).');
      }
      if (!formData.tlpIbu?.trim() || formData.tlpIbu.trim() === '-') {
        missingList.push('Nomor Telepon / WA Ibu wajib diisi (isi nomor aktif atau tanda -).');
      }
    }

    // 4. Data Wali Murid / Penanggung Jawab Sesuai Logika:
    // Wajib jika salah satu atau kedua orang tua Meninggal / Tidak Diketahui / Tidak Ada Kontak.
    if (isWaliRequired) {
      if (!formData.namaWali?.trim() || formData.namaWali.trim() === '-') {
        missingList.push('Nama Wali Murid wajib dicantumkan sebagai wali pengganti (salah satu atau kedua orang tua berstatus Meninggal / Tidak Diketahui / Tidak Ada Kontak).');
      }
      if (!formData.hubungan?.trim() || formData.hubungan.trim() === '-') {
        missingList.push('Hubungan Kekerabatan Wali wajib dipilih.');
      }
    } else if (formData.namaWali?.trim() && formData.namaWali.trim() !== '-') {
      if (!formData.hubungan?.trim() || formData.hubungan.trim() === '-') {
        missingList.push('Hubungan Kekerabatan Wali wajib dipilih karena Nama Wali diisi.');
      }
    }

    // 5. Checkbox Pernyataan Konfirmasi
    if (!isConfirmedByStudent) {
      missingList.push('Centang kotak persetujuan konfirmasi kebenaran biodata di bagian bawah.');
    }

    if (missingList.length > 0) {
      setIncompleteErrors(missingList);
      setValidationError(missingList[0]);
      setShowIncompleteModal(true);
      return;
    }

    // Clear validation error and open confirmation pop-up
    setValidationError(null);
    setIncompleteErrors([]);
    setShowIncompleteModal(false);
    setShowSuccessModal(true);
  };

  const handleProceedToStep3 = async () => {
    setShowSuccessModal(false);

    const pdktClean = (formData.nopdkt || formData.idNumber || '').replace(/\D/g, '').padStart(3, '0');
    const namaClean = formData.namaLengkap || 'Siswa';
    const photoFileName = `${pdktClean ? pdktClean : 'PDKT'} ${namaClean.replace(/[/\\?%*:|"<>]/g, '')}.jpg`;

    const finalized: StudentProfile = {
      ...formData,
      nopdkt: pdktClean,
      isVerified: true,
      namaOrangTua: formData.namaAyah || formData.namaIbu || formData.namaWali || formData.namaOrangTua,
    };

    // Trigger asynchronous background server sync to update cache & sheet SISWA
    try {
      fetch('/api/students/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: finalized,
          photoBase64: fotoPreview,
          photoFileName: photoFileName,
        }),
      }).catch(err => console.log('Sync profile update notice:', err));
    } catch {
      // ignore
    }

    // Scroll directly to the very top
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 40);

    onConfirmProfile(finalized);
  };

  return (
    <div id="tahap2-container" className="space-y-4 sm:space-y-6 animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/60 border border-indigo-500/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-3.5 sm:space-y-4">
          {/* Top Title & Step Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-950/90 to-indigo-900/90 border border-blue-400/40 text-blue-300 text-[10px] sm:text-xs font-black px-3 py-1 rounded-full shadow-lg">
              <Edit3 className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span className="uppercase tracking-wider">Tahap 2: Review & Lengkapi Biodata Diri</span>
            </div>
            {hasEdited && (
              <span className="bg-amber-950/90 text-amber-300 border border-amber-500/50 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 animate-pulse shadow-sm">
                ✏️ Perubahan Terdeteksi
              </span>
            )}
          </div>

          {/* Heading Biodata (Nama Siswa) */}
          <h2 className="text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-white font-['Outfit',sans-serif]">
            {formData.namaLengkap || 'Biodata Siswa'}
          </h2>

          {/* Photo & Key Details (No PDKT, NISN, NIK, STATUS, KELAS) */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-xl flex flex-row items-center sm:items-stretch gap-3 sm:gap-5">
            {/* Foto Siswa */}
            <div className="relative shrink-0 group">
              <div className="relative w-20 sm:w-28 h-28 sm:h-36 rounded-xl overflow-hidden border-2 border-indigo-400/60 bg-slate-950 shadow-lg shadow-indigo-950/70">
                <img
                  src={formatGoogleDriveUrl(fotoPreview || formData.pasFoto || formData.PasFoto) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80'}
                  alt={`Pas Foto ${formData.namaLengkap || 'Siswa'}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => handleDriveImageError(e, 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80')}
                  className="w-full h-full object-cover object-center transition duration-300 group-hover:scale-105"
                />
              </div>

              {/* Camera Action Badge */}
              <label
                title="Ganti atau unggah foto baru"
                className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-1.5 rounded-full shadow-lg border border-white/30 cursor-pointer transition transform hover:scale-110 flex items-center justify-center"
              >
                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <input type="file" accept="image/*" onChange={handleFotoUpload} className="hidden" />
              </label>
            </div>

            {/* Info Grid Beside Photo */}
            <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 text-xs">
              {/* 1. No PDKT */}
              <div className="col-span-1 bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">No. PDKT</span>
                <span className="text-xs sm:text-sm font-black font-mono text-yellow-300 truncate">
                  {formData.nopdkt || formData.idNumber || '-'}
                </span>
              </div>

              {/* 2. NISN */}
              <div className="col-span-1 bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">NISN</span>
                <span className="text-xs sm:text-sm font-black font-mono text-cyan-300 truncate">
                  {formData.nisn || formData.NISN || '-'}
                </span>
              </div>

              {/* 3. KELAS */}
              <div className="col-span-1 bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">KELAS</span>
                <span className="text-xs sm:text-sm font-black text-white truncate">
                  {formData.KelasSaatini || formData.kelasSaatIni || formData.kelasRombel || formData.Kelas || '-'}
                </span>
              </div>

              {/* 4. STATUS */}
              <div className="col-span-1 bg-slate-950/80 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">STATUS</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {formData.Status || 'AKTIF'}
                </span>
              </div>

              {/* 5. NIK */}
              <div className="col-span-2 sm:col-span-4 lg:col-span-2 bg-slate-950/80 border border-emerald-500/30 rounded-xl p-2 sm:p-2.5 flex flex-col justify-center shadow-inner">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-between">
                  <span>NIK (16 Digit)</span>
                  <span className="text-[8px] text-slate-400 font-normal">Kependudukan</span>
                </span>
                <span className="text-xs sm:text-sm font-mono font-black text-emerald-300 tracking-wider truncate">
                  {formData.nik || formData.NIK || 'Belum Terdata'}
                </span>
              </div>
            </div>
          </div>

          {/* Status Kelengkapan & Panduan Warna Bar */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-300 shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Panduan Warna Status Kolom:</span>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block"></span>
                    <strong className="text-red-400">Merah</strong> = Kosong (Wajib)
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"></span>
                    <strong className="text-amber-300">Kuning</strong> = Perlu Konfirmasi / Edit
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                    <strong className="text-emerald-400">Hijau</strong> = Benar
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleConfirmAllFields}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Konfirmasi Semua Terisi (Hijau)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-4 text-red-200 flex items-start gap-3 animate-shake shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm font-semibold">{validationError}</div>
        </div>
      )}

      {/* Form Review Biodata */}
      <form onSubmit={handleOpenSuccessModal} className="space-y-6">

        {/* SECTION 1: DATA PRIBADI & JASMANI */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                  1. Data Pribadi Siswa
                </h3>
                <p className="text-xs text-slate-400">Identitas fisik, minat, bakat, dan catatan kesehatan</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* 4. NamaLengkap */}
            <div className="sm:col-span-2">
              <FieldLabel 
                title="Nama Lengkap Siswa" 
                value={formData.namaLengkap} 
                required 
                isConfirmed={confirmedFields.namaLengkap}
                onToggleConfirm={() => toggleFieldConfirm('namaLengkap')}
              />
              <input
                type="text"
                required
                value={formData.namaLengkap || ''}
                onChange={(e) => updateField('namaLengkap', 'NamaLengkap', e.target.value)}
                className={getControlClass(formData.namaLengkap, !!confirmedFields.namaLengkap)}
                placeholder="Nama Lengkap Siswa sesuai Ijazah / KTP"
              />
            </div>

            {/* TahunMasuk */}
            <div>
              <FieldLabel 
                title="Tahun Masuk Angkatan" 
                value={formData.TahunMasuk} 
                isConfirmed={confirmedFields.TahunMasuk}
                onToggleConfirm={() => toggleFieldConfirm('TahunMasuk')}
              />
              <input
                type="text"
                value={formData.TahunMasuk || ''}
                onChange={(e) => updateField('TahunMasuk', 'TahunMasuk', e.target.value)}
                className={getControlClass(formData.TahunMasuk, !!confirmedFields.TahunMasuk)}
                placeholder="Contoh: 2024"
              />
            </div>

            {/* 5. JenisKelamin */}
            <div>
              <FieldLabel 
                title="Jenis Kelamin" 
                value={formData.jenisKelamin || formData.JenisKelamin} 
                required 
                isConfirmed={confirmedFields.jenisKelamin}
                onToggleConfirm={() => toggleFieldConfirm('jenisKelamin')}
              />
              <select
                value={formData.jenisKelamin === 'Perempuan' || formData.JenisKelamin === 'P' ? 'Perempuan' : (formData.jenisKelamin === 'Laki-laki' || formData.JenisKelamin === 'L' ? 'Laki-laki' : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField('jenisKelamin', 'JenisKelamin', val);
                  updateField('JenisKelamin', 'JenisKelamin', val === 'Perempuan' ? 'P' : (val === 'Laki-laki' ? 'L' : ''));
                }}
                className={getControlClass(formData.jenisKelamin || formData.JenisKelamin, !!confirmedFields.jenisKelamin, 'cursor-pointer')}
              >
                <option value="">-- Pilih Jenis Kelamin --</option>
                <option value="Laki-laki">Laki-laki (L)</option>
                <option value="Perempuan">Perempuan (P)</option>
              </select>
            </div>

            {/* 6. Tempat Lahir */}
            <div>
              <FieldLabel 
                title="Tempat Lahir" 
                value={formData.tempatLahir} 
                required 
                isConfirmed={confirmedFields.tempatLahir}
                onToggleConfirm={() => toggleFieldConfirm('tempatLahir')}
              />
              <input
                type="text"
                required
                value={formData.tempatLahir || ''}
                onChange={(e) => updateField('tempatLahir', 'Tempat Lahir', e.target.value)}
                className={getControlClass(formData.tempatLahir, !!confirmedFields.tempatLahir)}
                placeholder="Kota / Kabupaten Kelahiran"
              />
            </div>

            {/* 7. TanggalLahir */}
            <div>
              <FieldLabel 
                title="Tanggal Lahir" 
                value={formData.tanggalLahir} 
                required 
                typeHint="YYYY-MM-DD" 
                isConfirmed={confirmedFields.tanggalLahir}
                onToggleConfirm={() => toggleFieldConfirm('tanggalLahir')}
              />
              <input
                type="date"
                required
                value={formData.tanggalLahir || ''}
                onChange={(e) => updateField('tanggalLahir', 'TanggalLahir', e.target.value)}
                className={getControlClass(formData.tanggalLahir, !!confirmedFields.tanggalLahir)}
              />
            </div>

            {/* 11. Agama */}
            <div>
              <FieldLabel 
                title="Agama / Kepercayaan" 
                value={formData.agama} 
                required 
                isConfirmed={confirmedFields.agama}
                onToggleConfirm={() => toggleFieldConfirm('agama')}
              />
              <select
                value={formData.agama || ''}
                onChange={(e) => updateField('agama', 'Agama', e.target.value)}
                className={getControlClass(formData.agama, !!confirmedFields.agama, 'cursor-pointer')}
              >
                <option value="">-- Pilih Agama --</option>
                <option value="Islam">Islam</option>
                <option value="Kristen Protestan">Kristen Protestan</option>
                <option value="Katolik">Katolik</option>
                <option value="Hindu">Hindu</option>
                <option value="Buddha">Buddha</option>
                <option value="Khonghucu">Khonghucu</option>
                <option value="Lainnya">Lainnya / Aliran Kepercayaan</option>
              </select>
            </div>

            {/* 12. Golongan Darah */}
            <div>
              <FieldLabel 
                title="Golongan Darah" 
                value={formData.golonganDarah} 
                required
                isConfirmed={confirmedFields.golonganDarah}
                onToggleConfirm={() => toggleFieldConfirm('golonganDarah')}
              />
              <select
                value={formData.golonganDarah || ''}
                onChange={(e) => updateField('golonganDarah', 'Golongan Darah', e.target.value)}
                className={getControlClass(formData.golonganDarah, !!confirmedFields.golonganDarah, 'cursor-pointer')}
              >
                <option value="">-- Pilih Golongan Darah --</option>
                <option value="Tidak Tahu">Tidak Tahu</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>

            {/* 9. Anak ke */}
            <div>
              <FieldLabel 
                title="Anak Ke-" 
                value={formData.anakKe} 
                required
                typeHint="Urutan Kelahiran" 
                isConfirmed={confirmedFields.anakKe}
                onToggleConfirm={() => toggleFieldConfirm('anakKe')}
              />
              <input
                type="number"
                min="1"
                max="20"
                value={formData.anakKe ?? ''}
                onChange={(e) => updateField('anakKe', 'Anak ke', e.target.value ? Number(e.target.value) : '')}
                className={getControlClass(formData.anakKe, !!confirmedFields.anakKe)}
                placeholder="1"
              />
            </div>

            {/* 10. Saudara */}
            <div>
              <FieldLabel 
                title="Jumlah Saudara Kandung" 
                value={formData.jumlahSaudara} 
                required
                isConfirmed={confirmedFields.jumlahSaudara}
                onToggleConfirm={() => toggleFieldConfirm('jumlahSaudara')}
              />
              <input
                type="number"
                min="0"
                max="20"
                value={formData.jumlahSaudara ?? ''}
                onChange={(e) => updateField('jumlahSaudara', 'Saudara', e.target.value ? Number(e.target.value) : '')}
                className={getControlClass(formData.jumlahSaudara, !!confirmedFields.jumlahSaudara)}
                placeholder="0"
              />
            </div>

            {/* 13. TinggiBadan(cm) */}
            <div>
              <FieldLabel 
                title="Tinggi Badan (cm)" 
                value={formData.tinggiBadan} 
                required
                isConfirmed={confirmedFields.tinggiBadan}
                onToggleConfirm={() => toggleFieldConfirm('tinggiBadan')}
              />
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max="250"
                  value={formData.tinggiBadan || ''}
                  onChange={(e) => updateField('tinggiBadan', 'TinggiBadan(cm)', e.target.value ? Number(e.target.value) : '')}
                  className={getControlClass(formData.tinggiBadan, !!confirmedFields.tinggiBadan)}
                  placeholder="165"
                />
                <span className="text-xs text-slate-400 absolute right-3.5 top-3 pointer-events-none">cm</span>
              </div>
            </div>

            {/* 14. BeratBadan(kg) */}
            <div>
              <FieldLabel 
                title="Berat Badan (kg)" 
                value={formData.beratBadan} 
                required
                isConfirmed={confirmedFields.beratBadan}
                onToggleConfirm={() => toggleFieldConfirm('beratBadan')}
              />
              <div className="relative">
                <input
                  type="number"
                  min="20"
                  max="200"
                  value={formData.beratBadan || ''}
                  onChange={(e) => updateField('beratBadan', 'BeratBadan(kg)', e.target.value ? Number(e.target.value) : '')}
                  className={getControlClass(formData.beratBadan, !!confirmedFields.beratBadan)}
                  placeholder="55"
                />
                <span className="text-xs text-slate-400 absolute right-3.5 top-3 pointer-events-none">kg</span>
              </div>
            </div>

            {/* 15. Prestasi */}
            <div>
              <FieldLabel 
                title="Catatan Prestasi & Piagam" 
                value={formData.prestasi} 
                required
                isConfirmed={confirmedFields.prestasi}
                onToggleConfirm={() => toggleFieldConfirm('prestasi')}
              />
              <input
                type="text"
                required
                value={formData.prestasi || ''}
                onChange={(e) => updateField('prestasi', 'Prestasi', e.target.value)}
                className={getControlClass(formData.prestasi, !!confirmedFields.prestasi)}
                placeholder="Prestasi atau tanda - jika belum ada"
              />
            </div>

            {/* 16. Hobi */}
            <div>
              <FieldLabel 
                title="Hobi & Minat Bakat" 
                value={formData.hobi} 
                required
                isConfirmed={confirmedFields.hobi}
                onToggleConfirm={() => toggleFieldConfirm('hobi')}
              />
              <input
                type="text"
                required
                value={formData.hobi || ''}
                onChange={(e) => updateField('hobi', 'Hobi', e.target.value)}
                className={getControlClass(formData.hobi, !!confirmedFields.hobi)}
                placeholder="Contoh: Otomotif, Desain Grafis, Memasak"
              />
            </div>

            {/* 17. Catatan Penting */}
            <div className="sm:col-span-2">
              <FieldLabel 
                title="Catatan Khusus / Riwayat Kesehatan" 
                value={formData.catatanPenting} 
                required
                isConfirmed={confirmedFields.catatanPenting}
                onToggleConfirm={() => toggleFieldConfirm('catatanPenting')}
              />
              <textarea
                rows={2}
                required
                value={formData.catatanPenting || ''}
                onChange={(e) => updateField('catatanPenting', 'Catatan Penting', e.target.value)}
                className={getControlClass(formData.catatanPenting, !!confirmedFields.catatanPenting, 'resize-none')}
                placeholder="Riwayat kesehatan atau tanda - jika normal/sehat"
              />
            </div>

            {/* 31. PasFoto Resmi (Refactored sesuai permintaan) */}
            <div className="sm:col-span-2 lg:col-span-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={formatGoogleDriveUrl(fotoPreview || formData.pasFoto || formData.PasFoto) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80'}
                  alt="Pas Foto Siswa"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleDriveImageError(e, 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&q=80')}
                  className="w-20 h-24 object-cover rounded-xl border-2 border-indigo-400/60 shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1 rounded-full text-[10px]">
                  <Camera className="w-3 h-3" />
                </div>
              </div>
              <div className="flex-1 space-y-2.5 w-full">
                <p className="text-xs sm:text-sm font-semibold text-slate-200">
                  Apakah ingin merubah foto ? Gunakan pas foto formal dan foto wajah yang jelas.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-indigo-400/40 text-xs font-bold cursor-pointer transition shadow-md active:scale-95">
                    <Upload className="w-4 h-4" />
                    <span>Pilih Foto</span>
                    <input type="file" accept="image/*" onChange={handleFotoUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: ALAMAT & DOMISILI */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                2. Alamat, Domisili & Transportasi
              </h3>
              <p className="text-xs text-slate-400">Data tempat tinggal lengkap dan sarana transportasi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* 18. Alamat */}
            <div className="sm:col-span-2 lg:col-span-4">
              <FieldLabel 
                title="Alamat Tempat Tinggal Lengkap" 
                value={formData.alamat} 
                required 
                isConfirmed={confirmedFields.alamat}
                onToggleConfirm={() => toggleFieldConfirm('alamat')}
              />
              <textarea
                rows={2}
                required
                value={formData.alamat || ''}
                onChange={(e) => updateField('alamat', 'Alamat', e.target.value)}
                className={getControlClass(formData.alamat, !!confirmedFields.alamat, 'resize-none')}
                placeholder="Jalan, Gang, Nomor Rumah, Patokan Tempat"
              />
            </div>

            {/* 19. RT */}
            <div>
              <FieldLabel 
                title="Rukun Tetangga (RT)" 
                value={formData.rt} 
                required
                isConfirmed={confirmedFields.rt}
                onToggleConfirm={() => toggleFieldConfirm('rt')}
              />
              <input
                type="text"
                value={formData.rt || ''}
                onChange={(e) => updateField('rt', 'RT', e.target.value)}
                className={getControlClass(formData.rt, !!confirmedFields.rt)}
                placeholder="01"
              />
            </div>

            {/* 20. RW */}
            <div>
              <FieldLabel 
                title="Rukun Warga (RW)" 
                value={formData.rw} 
                required
                isConfirmed={confirmedFields.rw}
                onToggleConfirm={() => toggleFieldConfirm('rw')}
              />
              <input
                type="text"
                value={formData.rw || ''}
                onChange={(e) => updateField('rw', 'RW', e.target.value)}
                className={getControlClass(formData.rw, !!confirmedFields.rw)}
                placeholder="05"
              />
            </div>

            {/* 21. Kelurahan */}
            <div>
              <FieldLabel 
                title="Kelurahan / Desa" 
                value={formData.kelurahan} 
                required
                isConfirmed={confirmedFields.kelurahan}
                onToggleConfirm={() => toggleFieldConfirm('kelurahan')}
              />
              <input
                type="text"
                value={formData.kelurahan || ''}
                onChange={(e) => updateField('kelurahan', 'Kelurahan', e.target.value)}
                className={getControlClass(formData.kelurahan, !!confirmedFields.kelurahan)}
                placeholder="Nama Kelurahan"
              />
            </div>

            {/* 22. Kecamatan */}
            <div>
              <FieldLabel 
                title="Kecamatan" 
                value={formData.kecamatan} 
                required
                isConfirmed={confirmedFields.kecamatan}
                onToggleConfirm={() => toggleFieldConfirm('kecamatan')}
              />
              <input
                type="text"
                value={formData.kecamatan || ''}
                onChange={(e) => updateField('kecamatan', 'Kecamatan', e.target.value)}
                className={getControlClass(formData.kecamatan, !!confirmedFields.kecamatan)}
                placeholder="Nama Kecamatan"
              />
            </div>

            {/* 23. Kota */}
            <div>
              <FieldLabel 
                title="Kota / Kabupaten" 
                value={formData.kota} 
                required
                isConfirmed={confirmedFields.kota}
                onToggleConfirm={() => toggleFieldConfirm('kota')}
              />
              <input
                type="text"
                value={formData.kota || ''}
                onChange={(e) => updateField('kota', 'Kota', e.target.value)}
                className={getControlClass(formData.kota, !!confirmedFields.kota)}
                placeholder="Kota / Kab"
              />
            </div>

            {/* 24. Provinsi */}
            <div>
              <FieldLabel 
                title="Provinsi" 
                value={formData.provinsi} 
                required
                isConfirmed={confirmedFields.provinsi}
                onToggleConfirm={() => toggleFieldConfirm('provinsi')}
              />
              <input
                type="text"
                value={formData.provinsi || ''}
                onChange={(e) => updateField('provinsi', 'Provinsi', e.target.value)}
                className={getControlClass(formData.provinsi, !!confirmedFields.provinsi)}
                placeholder="Provinsi"
              />
            </div>

            {/* 25. KodePos */}
            <div>
              <FieldLabel 
                title="Kode Pos" 
                value={formData.kodePos} 
                required
                isConfirmed={confirmedFields.kodePos}
                onToggleConfirm={() => toggleFieldConfirm('kodePos')}
              />
              <input
                type="text"
                value={formData.kodePos || ''}
                onChange={(e) => updateField('kodePos', 'KodePos', e.target.value)}
                className={getControlClass(formData.kodePos, !!confirmedFields.kodePos)}
                placeholder="11220"
              />
            </div>

            {/* 26. JenisTinggal */}
            <div>
              <FieldLabel 
                title="Jenis Tempat Tinggal" 
                value={formData.jenisTinggal} 
                required
                isConfirmed={confirmedFields.jenisTinggal}
                onToggleConfirm={() => toggleFieldConfirm('jenisTinggal')}
              />
              <select
                value={formData.jenisTinggal || ''}
                onChange={(e) => updateField('jenisTinggal', 'JenisTinggal', e.target.value)}
                className={getControlClass(formData.jenisTinggal, !!confirmedFields.jenisTinggal, 'cursor-pointer')}
              >
                <option value="">-- Pilih Jenis Tinggal --</option>
                <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                <option value="Asrama">Asrama</option>
                <option value="Kost">Kost</option>
                <option value="Bersama Wali">Bersama Wali / Kerabat</option>
                <option value="Rumah Sendiri">Rumah Sendiri / Mengontrak</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {/* 27. AlatTransportasi */}
            <div className="sm:col-span-2 lg:col-span-2">
              <FieldLabel 
                title="Transportasi ke Sekolah" 
                value={formData.alatTransportasi} 
                required
                isConfirmed={confirmedFields.alatTransportasi}
                onToggleConfirm={() => toggleFieldConfirm('alatTransportasi')}
              />
              <select
                value={formData.alatTransportasi || ''}
                onChange={(e) => updateField('alatTransportasi', 'AlatTransportasi', e.target.value)}
                className={getControlClass(formData.alatTransportasi, !!confirmedFields.alatTransportasi, 'cursor-pointer')}
              >
                <option value="">-- Pilih Transportasi --</option>
                <option value="Sepeda Motor">Sepeda Motor</option>
                <option value="Jalan Kaki">Jalan Kaki</option>
                <option value="Sepeda">Sepeda</option>
                <option value="Angkutan Umum">Angkutan Umum / Bus / Trans</option>
                <option value="Mobil Pribadi">Mobil Pribadi</option>
                <option value="Ojek Online">Ojek Online</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: KONTAK & ASAL SEKOLAH */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
            <div className="p-2 rounded-xl bg-yellow-950/80 border border-yellow-500/40 text-yellow-400">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                3. Kontak Aktif & Asal Sekolah
              </h3>
              <p className="text-xs text-slate-400">Jalur komunikasi dan riwayat jenjang pendidikan sebelumnya</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* 28. NomorHP */}
            <div>
              <FieldLabel 
                title="Nomor HP / WA Aktif" 
                value={formData.noHpWa} 
                required 
                isConfirmed={confirmedFields.noHpWa}
                onToggleConfirm={() => toggleFieldConfirm('noHpWa')}
              />
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={formData.noHpWa || ''}
                  onChange={(e) => updateField('noHpWa', 'NomorHP', e.target.value)}
                  className={getControlClass(formData.noHpWa, !!confirmedFields.noHpWa, 'pl-9 font-mono')}
                  placeholder="081234567890"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* 29. E-Mail */}
            <div>
              <FieldLabel 
                title="Alamat Email" 
                value={formData.email} 
                required
                isConfirmed={confirmedFields.email}
                onToggleConfirm={() => toggleFieldConfirm('email')}
              />
              <div className="relative">
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateField('email', 'E-Mail', e.target.value)}
                  className={getControlClass(formData.email, !!confirmedFields.email, 'pl-9')}
                  placeholder="nama.siswa@gmail.com"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* 30. AsalSekolah (GANTI LABEL SESUAI INSTRUKSI) */}
            <div>
              <FieldLabel 
                title="Asal Sekolah SEBELUMNYA" 
                value={formData.asalSekolah} 
                required
                isConfirmed={confirmedFields.asalSekolah}
                onToggleConfirm={() => toggleFieldConfirm('asalSekolah')}
              />
              <div className="relative">
                <input
                  type="text"
                  value={formData.asalSekolah || ''}
                  onChange={(e) => updateField('asalSekolah', 'AsalSekolah', e.target.value)}
                  className={getControlClass(formData.asalSekolah, !!confirmedFields.asalSekolah, 'pl-9')}
                  placeholder="Nama SMP / MTs / Sekolah Asal"
                />
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: DATA KELUARGA, ORANG TUA & WALI */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/80 p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3.5">
            <div className="p-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                4. Data Keluarga, Orang Tua & Wali
              </h3>
              <p className="text-xs text-slate-400">Nomor Kartu Keluarga, Status Yatim/Piatu otomatis, Data Ayah, Ibu, dan Wali</p>
            </div>
          </div>

          {/* KK & Status Yatim Otomatis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {/* 32. NomorKartuKeluarga */}
            <div>
              <FieldLabel 
                title="Nomor Kartu Keluarga (16 Digit)" 
                value={formData.nomorKartuKeluarga} 
                required
                isConfirmed={confirmedFields.nomorKartuKeluarga}
                onToggleConfirm={() => toggleFieldConfirm('nomorKartuKeluarga')}
              />
              <input
                type="text"
                maxLength={16}
                value={formData.nomorKartuKeluarga || ''}
                onChange={(e) => updateField('nomorKartuKeluarga', 'NomorKartuKeluarga', e.target.value.replace(/\D/g, ''))}
                className={getControlClass(formData.nomorKartuKeluarga, !!confirmedFields.nomorKartuKeluarga, 'font-mono')}
                placeholder="3174090000000000"
              />
            </div>

            {/* 45. StatusYatim (SMART AUTO CALCULATED & READ ONLY) */}
            <div>
              <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                <span className="block font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Status Yatim / Piatu
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/50 px-2 py-0.5 rounded">
                  ⚡ Otomatis dari Status Ayah & Ibu
                </span>
              </div>
              <input
                type="text"
                readOnly
                disabled
                value={formData.statusYatim || calculateSmartStatusYatim(formData.statusAyah, formData.statusIbu) || '-'}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-indigo-500/40 bg-slate-950 text-indigo-300 font-bold text-sm cursor-not-allowed shadow-inner"
              />
            </div>
          </div>

          {/* Sub: DATA AYAH KANDUNG */}
          <div className="space-y-3 bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-blue-900/30">
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <span>👨 Data Ayah Kandung</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* 33. StatusAyah */}
              <div>
                <FieldLabel 
                  title="Status Ayah" 
                  value={formData.statusAyah} 
                  required
                  isSmall 
                  isConfirmed={confirmedFields.statusAyah}
                  onToggleConfirm={() => toggleFieldConfirm('statusAyah')}
                />
                <select
                  value={formData.statusAyah || ''}
                  onChange={(e) => updateField('statusAyah', 'StatusAyah', e.target.value)}
                  className={getSmallControlClass(formData.statusAyah, !!confirmedFields.statusAyah, 'cursor-pointer')}
                >
                  <option value="">-- Pilih Status Ayah --</option>
                  <option value="Masih Hidup">Masih Hidup</option>
                  <option value="Meninggal">Meninggal</option>
                  <option value="Tidak Diketahui">Tidak Diketahui / Tidak Ada Kontak</option>
                </select>
              </div>

              {/* 34. NamaAyah */}
              <div>
                <FieldLabel 
                  title="Nama Lengkap Ayah" 
                  value={formData.namaAyah} 
                  required={formData.statusAyah === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.namaAyah}
                  onToggleConfirm={() => toggleFieldConfirm('namaAyah')}
                />
                <input
                  type="text"
                  value={formData.namaAyah || ''}
                  onChange={(e) => updateField('namaAyah', 'NamaAyah', e.target.value)}
                  className={getSmallControlClass(formData.namaAyah, !!confirmedFields.namaAyah)}
                  placeholder="Nama Lengkap Ayah"
                />
              </div>

              {/* 35. PendidikanAyah */}
              <div>
                <FieldLabel 
                  title="Pendidikan Terakhir Ayah" 
                  value={formData.pendidikanAyah} 
                  required={formData.statusAyah === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.pendidikanAyah}
                  onToggleConfirm={() => toggleFieldConfirm('pendidikanAyah')}
                />
                <select
                  disabled={formData.statusAyah === 'Meninggal' || formData.statusAyah === 'Tidak Diketahui'}
                  value={formData.pendidikanAyah || ''}
                  onChange={(e) => updateField('pendidikanAyah', 'PendidikanAyah', e.target.value)}
                  className={getSmallControlClass(formData.pendidikanAyah, !!confirmedFields.pendidikanAyah, 'cursor-pointer')}
                >
                  <option value="">-- Pilih Pendidikan --</option>
                  <option value="SD / Sederajat">SD / Sederajat</option>
                  <option value="SMP / Sederajat">SMP / Sederajat</option>
                  <option value="SMA / Sederajat">SMA / Sederajat</option>
                  <option value="D3 / Diploma">D3 / Diploma</option>
                  <option value="S1 / Sarjana">S1 / Sarjana</option>
                  <option value="S2 / Magister">S2 / Magister</option>
                  <option value="Tidak Sekolah">Tidak Sekolah</option>
                  <option value="-">- (Khusus Meninggal / Tidak Diketahui)</option>
                </select>
              </div>

              {/* 36. PekerjaanAyah */}
              <div>
                <FieldLabel 
                  title="Pekerjaan Utama Ayah" 
                  value={formData.pekerjaanAyah} 
                  required={formData.statusAyah === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.pekerjaanAyah}
                  onToggleConfirm={() => toggleFieldConfirm('pekerjaanAyah')}
                />
                <input
                  type="text"
                  disabled={formData.statusAyah === 'Meninggal' || formData.statusAyah === 'Tidak Diketahui'}
                  value={formData.pekerjaanAyah || ''}
                  onChange={(e) => updateField('pekerjaanAyah', 'PekerjaanAyah', e.target.value)}
                  className={getSmallControlClass(formData.pekerjaanAyah, !!confirmedFields.pekerjaanAyah)}
                  placeholder={formData.statusAyah === 'Meninggal' || formData.statusAyah === 'Tidak Diketahui' ? `Tidak wajib (${formData.statusAyah})` : "Contoh: Wiraswasta, Karyawan"}
                />
              </div>

              {/* 37. PenghasilanAyah */}
              <div>
                <FieldLabel 
                  title="Penghasilan Bulanan Ayah" 
                  value={formData.penghasilanAyah} 
                  required={formData.statusAyah === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.penghasilanAyah}
                  onToggleConfirm={() => toggleFieldConfirm('penghasilanAyah')}
                />
                <input
                  type="text"
                  required={formData.statusAyah === 'Masih Hidup'}
                  disabled={formData.statusAyah === 'Meninggal' || formData.statusAyah === 'Tidak Diketahui'}
                  value={formData.penghasilanAyah || ''}
                  onChange={(e) => updateField('penghasilanAyah', 'PenghasilanAyah', e.target.value)}
                  className={getSmallControlClass(formData.penghasilanAyah, !!confirmedFields.penghasilanAyah)}
                  placeholder={formData.statusAyah === 'Meninggal' || formData.statusAyah === 'Tidak Diketahui' ? `Tidak wajib (${formData.statusAyah})` : "Contoh: 3.500.000 atau -"}
                />
              </div>

              {/* 38. TlpAyah */}
              <div>
                <FieldLabel 
                  title="No Telepon / WA Ayah" 
                  value={formData.tlpAyah} 
                  required={formData.statusAyah === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.tlpAyah}
                  onToggleConfirm={() => toggleFieldConfirm('tlpAyah')}
                />
                <input
                  type="tel"
                  required={formData.statusAyah === 'Masih Hidup'}
                  disabled={formData.statusAyah === 'Meninggal' || formData.statusAyah === 'Tidak Diketahui'}
                  value={formData.tlpAyah || ''}
                  onChange={(e) => updateField('tlpAyah', 'TlpAyah', e.target.value)}
                  className={getSmallControlClass(formData.tlpAyah, !!confirmedFields.tlpAyah, 'font-mono')}
                  placeholder={formData.statusAyah === 'Meninggal' || formData.statusAyah === 'Tidak Diketahui' ? `Tidak wajib (${formData.statusAyah})` : "081234567890 atau -"}
                />
              </div>
            </div>
          </div>

          {/* Sub: DATA IBU KANDUNG */}
          <div className="space-y-3 bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-pink-900/30">
            <h4 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
              <span>👩 Data Ibu Kandung</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* 39. StatusIbu */}
              <div>
                <FieldLabel 
                  title="Status Ibu" 
                  value={formData.statusIbu} 
                  required
                  isSmall 
                  isConfirmed={confirmedFields.statusIbu}
                  onToggleConfirm={() => toggleFieldConfirm('statusIbu')}
                />
                <select
                  value={formData.statusIbu || ''}
                  onChange={(e) => updateField('statusIbu', 'StatusIbu', e.target.value)}
                  className={getSmallControlClass(formData.statusIbu, !!confirmedFields.statusIbu, 'cursor-pointer')}
                >
                  <option value="">-- Pilih Status Ibu --</option>
                  <option value="Masih Hidup">Masih Hidup</option>
                  <option value="Meninggal">Meninggal</option>
                  <option value="Tidak Diketahui">Tidak Diketahui / Tidak Ada Kontak</option>
                </select>
              </div>

              {/* 40. NamaIbu */}
              <div>
                <FieldLabel 
                  title="Nama Lengkap Ibu" 
                  value={formData.namaIbu} 
                  required={formData.statusIbu === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.namaIbu}
                  onToggleConfirm={() => toggleFieldConfirm('namaIbu')}
                />
                <input
                  type="text"
                  value={formData.namaIbu || ''}
                  onChange={(e) => updateField('namaIbu', 'NamaIbu', e.target.value)}
                  className={getSmallControlClass(formData.namaIbu, !!confirmedFields.namaIbu)}
                  placeholder="Nama Lengkap Ibu"
                />
              </div>

              {/* 41. PendidikanIbu */}
              <div>
                <FieldLabel 
                  title="Pendidikan Terakhir Ibu" 
                  value={formData.pendidikanIbu} 
                  required={formData.statusIbu === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.pendidikanIbu}
                  onToggleConfirm={() => toggleFieldConfirm('pendidikanIbu')}
                />
                <select
                  disabled={formData.statusIbu === 'Meninggal' || formData.statusIbu === 'Tidak Diketahui'}
                  value={formData.pendidikanIbu || ''}
                  onChange={(e) => updateField('pendidikanIbu', 'PendidikanIbu', e.target.value)}
                  className={getSmallControlClass(formData.pendidikanIbu, !!confirmedFields.pendidikanIbu, 'cursor-pointer')}
                >
                  <option value="">-- Pilih Pendidikan --</option>
                  <option value="SD / Sederajat">SD / Sederajat</option>
                  <option value="SMP / Sederajat">SMP / Sederajat</option>
                  <option value="SMA / Sederajat">SMA / Sederajat</option>
                  <option value="D3 / Diploma">D3 / Diploma</option>
                  <option value="S1 / Sarjana">S1 / Sarjana</option>
                  <option value="S2 / Magister">S2 / Magister</option>
                  <option value="Tidak Sekolah">Tidak Sekolah</option>
                  <option value="-">- (Khusus Meninggal / Tidak Diketahui)</option>
                </select>
              </div>

              {/* 42. PekerjaanIbu */}
              <div>
                <FieldLabel 
                  title="Pekerjaan Utama Ibu" 
                  value={formData.pekerjaanIbu} 
                  required={formData.statusIbu === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.pekerjaanIbu}
                  onToggleConfirm={() => toggleFieldConfirm('pekerjaanIbu')}
                />
                <input
                  type="text"
                  disabled={formData.statusIbu === 'Meninggal' || formData.statusIbu === 'Tidak Diketahui'}
                  value={formData.pekerjaanIbu || ''}
                  onChange={(e) => updateField('pekerjaanIbu', 'PekerjaanIbu', e.target.value)}
                  className={getSmallControlClass(formData.pekerjaanIbu, !!confirmedFields.pekerjaanIbu)}
                  placeholder={formData.statusIbu === 'Meninggal' || formData.statusIbu === 'Tidak Diketahui' ? `Tidak wajib (${formData.statusIbu})` : "Contoh: Ibu Rumah Tangga, Pedagang"}
                />
              </div>

              {/* 43. PenghasilanIbu */}
              <div>
                <FieldLabel 
                  title="Penghasilan Bulanan Ibu" 
                  value={formData.penghasilanIbu} 
                  required={formData.statusIbu === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.penghasilanIbu}
                  onToggleConfirm={() => toggleFieldConfirm('penghasilanIbu')}
                />
                <input
                  type="text"
                  required={formData.statusIbu === 'Masih Hidup'}
                  disabled={formData.statusIbu === 'Meninggal' || formData.statusIbu === 'Tidak Diketahui'}
                  value={formData.penghasilanIbu || ''}
                  onChange={(e) => updateField('penghasilanIbu', 'PenghasilanIbu', e.target.value)}
                  className={getSmallControlClass(formData.penghasilanIbu, !!confirmedFields.penghasilanIbu)}
                  placeholder={formData.statusIbu === 'Meninggal' || formData.statusIbu === 'Tidak Diketahui' ? `Tidak wajib (${formData.statusIbu})` : "Contoh: 1.500.000 atau -"}
                />
              </div>

              {/* 44. TlpIbu */}
              <div>
                <FieldLabel 
                  title="No Telepon / WA Ibu" 
                  value={formData.tlpIbu} 
                  required={formData.statusIbu === 'Masih Hidup'}
                  isSmall 
                  isConfirmed={confirmedFields.tlpIbu}
                  onToggleConfirm={() => toggleFieldConfirm('tlpIbu')}
                />
                <input
                  type="tel"
                  required={formData.statusIbu === 'Masih Hidup'}
                  disabled={formData.statusIbu === 'Meninggal' || formData.statusIbu === 'Tidak Diketahui'}
                  value={formData.tlpIbu || ''}
                  onChange={(e) => updateField('tlpIbu', 'TlpIbu', e.target.value)}
                  className={getSmallControlClass(formData.tlpIbu, !!confirmedFields.tlpIbu, 'font-mono')}
                  placeholder={formData.statusIbu === 'Meninggal' ? "Tidak wajib (Meninggal)" : "081234567890 atau -"}
                />
              </div>
            </div>
          </div>

          {/* Sub: DATA WALI MURID / PENANGGUNG JAWAB */}
          <div className={`space-y-3 p-4 sm:p-5 rounded-2xl border transition-all ${
            isWaliRequired 
              ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/40' 
              : 'bg-slate-950/40 border-slate-800'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <span>Data Wali Murid / Penanggung Jawab</span>
              </h4>
              {isWaliRequired ? (
                <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-950 border border-amber-500/70 px-2 py-0.5 rounded-full animate-pulse">
                  ⚠️ Wajib Diisi (Salah Satu / Kedua Orang Tua Meninggal atau Tidak Ada Kontak)
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-full">
                  Opsional (Kedua Orang Tua Masih Hidup & Ada Kontak)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* 46. NamaWali */}
              <div>
                <FieldLabel 
                  title="Nama Lengkap Wali" 
                  value={formData.namaWali} 
                  required={isWaliRequired} 
                  isSmall 
                  isConfirmed={confirmedFields.namaWali}
                  onToggleConfirm={() => toggleFieldConfirm('namaWali')}
                />
                <input
                  type="text"
                  required={isWaliRequired}
                  value={formData.namaWali || ''}
                  onChange={(e) => updateField('namaWali', 'NamaWali', e.target.value)}
                  className={getSmallControlClass(formData.namaWali, !!confirmedFields.namaWali)}
                  placeholder={isWaliRequired ? "Nama Lengkap Wali Pengganti (Wajib Diisi)" : "Nama Wali (isi - jika tidak ada)"}
                />
              </div>

              {/* 49. Hubungan */}
              <div>
                <FieldLabel 
                  title="Hubungan Kekerabatan" 
                  value={formData.hubungan} 
                  required={isWaliRequired} 
                  isSmall 
                  isConfirmed={confirmedFields.hubungan}
                  onToggleConfirm={() => toggleFieldConfirm('hubungan')}
                />
                <select
                  required={isWaliRequired}
                  value={formData.hubungan || ''}
                  onChange={(e) => updateField('hubungan', 'Hubungan', e.target.value)}
                  className={getSmallControlClass(formData.hubungan, !!confirmedFields.hubungan, 'cursor-pointer')}
                >
                  <option value="">-- Pilih Hubungan --</option>
                  <option value="Kakek / Nenek">Kakek / Nenek</option>
                  <option value="Paman / Bibi">Paman / Bibi</option>
                  <option value="Kakak Kandung">Kakak Kandung</option>
                  <option value="Orang Tua Asuh">Orang Tua Asuh</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* 47. PekerjaanWali */}
              <div>
                <FieldLabel 
                  title="Pekerjaan Wali" 
                  value={formData.pekerjaanWali} 
                  isSmall 
                  isConfirmed={confirmedFields.pekerjaanWali}
                  onToggleConfirm={() => toggleFieldConfirm('pekerjaanWali')}
                />
                <input
                  type="text"
                  value={formData.pekerjaanWali || ''}
                  onChange={(e) => updateField('pekerjaanWali', 'PekerjaanWali', e.target.value)}
                  className={getSmallControlClass(formData.pekerjaanWali, !!confirmedFields.pekerjaanWali)}
                  placeholder="Pekerjaan Wali"
                />
              </div>

              {/* 48. PenghasilanWali */}
              <div>
                <FieldLabel 
                  title="Penghasilan Wali" 
                  value={formData.penghasilanWali} 
                  isSmall 
                  isConfirmed={confirmedFields.penghasilanWali}
                  onToggleConfirm={() => toggleFieldConfirm('penghasilanWali')}
                />
                <input
                  type="text"
                  value={formData.penghasilanWali || ''}
                  onChange={(e) => updateField('penghasilanWali', 'PenghasilanWali', e.target.value)}
                  className={getSmallControlClass(formData.penghasilanWali, !!confirmedFields.penghasilanWali)}
                  placeholder="0"
                />
              </div>

              {/* 50. Tlp.Wali */}
              <div>
                <FieldLabel 
                  title="No Telepon / WA Wali" 
                  value={formData.tlpWali || formData['Tlp.Wali']} 
                  isSmall 
                  isConfirmed={confirmedFields.tlpWali}
                  onToggleConfirm={() => toggleFieldConfirm('tlpWali')}
                />
                <input
                  type="tel"
                  value={formData.tlpWali || formData['Tlp.Wali'] || ''}
                  onChange={(e) => {
                    updateField('tlpWali', 'Tlp.Wali', e.target.value);
                    updateField('Tlp.Wali', 'Tlp.Wali', e.target.value);
                  }}
                  className={getSmallControlClass(formData.tlpWali || formData['Tlp.Wali'], !!confirmedFields.tlpWali, 'font-mono')}
                  placeholder="081234567890"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Checkbox Requirement */}
        <div className="bg-slate-900/95 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-6 transition-all shadow-xl">
          <label className="flex items-start gap-3.5 cursor-pointer">
            <input
              id="checkbox-confirm-profile"
              type="checkbox"
              checked={isConfirmedByStudent}
              onChange={(e) => {
                setIsConfirmedByStudent(e.target.checked);
                if (e.target.checked) setValidationError(null);
              }}
              className="w-5 h-5 rounded-lg border-slate-700 bg-slate-950 text-yellow-400 focus:ring-yellow-400 mt-0.5 cursor-pointer shrink-0"
            />
            <div className="text-xs sm:text-sm text-slate-200">
              <strong className="font-bold text-white block text-sm sm:text-base">
                Pernyataan Konfirmasi & Pemutakhiran Data Siswa:
              </strong>
              <p className="text-slate-400 mt-1.5 leading-relaxed text-xs sm:text-sm">
                Saya menyatakan dengan sebenarnya bahwa seluruh data profil di atas telah saya tinjau, koreksi, dan pastikan kebenarannya secara lengkap sesuai dokumen resmi yang sah (Ijazah, KK, KTP).
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            id="btn-back-step-1"
            onClick={onBackToStep1}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-sm transition cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Pencarian</span>
          </button>

          <button
            type="submit"
            id="btn-confirm-step-2"
            disabled={!isConfirmedByStudent}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black px-8 py-4 rounded-2xl text-sm transition shadow-xl shadow-blue-600/30 cursor-pointer border border-blue-400/40"
          >
            <span>Simpan Biodata & Lanjut ke 3. Jadwal Pekerjaan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* POP-UP MODAL 1: BIODATA BELUM LENGKAP */}
      {showIncompleteModal && (
        <div
          id="modal-incomplete-biodata"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="relative w-full max-w-lg bg-gradient-to-br from-[#1E112A] via-[#1a0f1e] to-[#0F172A] border-2 border-rose-500/80 rounded-3xl p-6 sm:p-7 text-white shadow-2xl shadow-rose-950/80 space-y-5 animate-scaleUp">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowIncompleteModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon & Title */}
            <div className="flex items-center gap-3.5 pr-8">
              <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-400 shadow-lg shadow-rose-950/60 shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit',sans-serif]">
                  Biodata Belum Lengkap!
                </h3>
                <p className="text-xs text-rose-300 font-medium mt-0.5">
                  Terdapat <strong className="text-white font-bold">{incompleteErrors.length} kolom wajib</strong> yang belum terisi / belum sesuai:
                </p>
              </div>
            </div>

            {/* List of Missing Fields */}
            <div className="bg-slate-950/90 rounded-2xl p-3.5 border border-rose-500/30 max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
              {incompleteErrors.map((errMsg, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed font-medium">{errMsg}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              💡 <em>Tips: Periksa kolom-kolom bergaris <strong>merah</strong> di halaman biodata, lengkapi isiannya, lalu klik kembali tombol Simpan.</em>
            </p>

            <button
              type="button"
              autoFocus
              onClick={() => {
                setShowIncompleteModal(false);
                const alertEl = document.getElementById('validation-error-alert');
                if (alertEl) {
                  alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm transition shadow-xl shadow-rose-600/40 flex items-center justify-center gap-2 cursor-pointer border border-rose-400/50 active:scale-95"
            >
              <span>Lengkapi Kolom Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: DATA SUDAH LENGKAP & LANJUT KE TAHAP 3 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] border-2 border-indigo-500/50 rounded-3xl p-6 sm:p-7 text-white shadow-2xl shadow-indigo-950/80 space-y-5 animate-scaleUp">
            
            {/* Close Button */}
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon & Title */}
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-950 border border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-950/50">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white font-['Outfit',sans-serif]">
                  Data Biodata Sudah Lengkap!
                </h3>
                <p className="text-xs text-emerald-300 font-medium">
                  Siap Melanjutkan ke Tahap 3: Jadwal Pekerjaan
                </p>
              </div>
            </div>

            {/* Student Summary Card */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Nama Siswa:</span>
                <span className="font-bold text-white text-right">{formData.namaLengkap}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">No. PDKT / NISN:</span>
                <span className="font-mono font-bold text-yellow-300 text-right">
                  {formData.nopdkt || formData.idNumber || '-'} / {formData.nisn || formData.NISN || '-'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Status Yatim / Piatu:</span>
                <span className="font-bold text-indigo-300 text-right">
                  {formData.statusYatim || calculateSmartStatusYatim(formData.statusAyah, formData.statusIbu) || 'Lengkap'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Status Wali Murid:</span>
                <span className="font-bold text-slate-200 text-right">
                  {formData.namaWali ? `${formData.namaWali} (${formData.hubungan || 'Wali'})` : (isWaliRequired ? 'Wajib Diisi (Wali Pengganti)' : 'Sesuai Orang Tua (Opsional)')}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-emerald-400 text-right uppercase tracking-wider">
                  TERSIMPAN
                </span>
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full sm:w-1/3 py-3 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                autoFocus
                onClick={handleProceedToStep3}
                className="w-full sm:w-2/3 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm transition shadow-xl shadow-emerald-600/40 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/50 ring-2 ring-emerald-500/30 active:scale-95"
              >
                <span>Lanjut ke 3. Jadwal Pekerjaan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
