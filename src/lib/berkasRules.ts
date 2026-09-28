import { Student } from '../types';

export interface DocItemConfig {
  key: keyof Student | string;
  label: string;
  shortLabel: string;
  category: 'Identitas Siswa' | 'Identitas Pokok' | 'Identitas Orang Tua' | 'Riwayat Pendidikan' | 'Mutasi & Legalitas' | 'Administrasi Pendaftaran' | 'Pendukung Tambahan';
  defaultRequired: boolean;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
  iconName?: string;
}

export const STUDENT_DOC_CONFIGS: DocItemConfig[] = [
  {
    key: 'fotoUrl',
    label: '1. Pas Foto Siswa (3x4 / 4x6) (PasFoto)',
    shortLabel: 'Pas Foto',
    category: 'Identitas Siswa',
    defaultRequired: true,
    color: 'amber',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    description: 'Pas Foto resmi siswa berseragam rapi (3x4 atau 4x6)'
  },
  {
    key: 'aktaKelahiranUrl',
    label: '2. Akta Kelahiran (AktaKelahiran)',
    shortLabel: 'Akta',
    category: 'Identitas Pokok',
    defaultRequired: true,
    color: 'emerald',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    description: 'Surat Akta Kelahiran resmi dari Dukcapil'
  },
  {
    key: 'kartuKeluargaUrl',
    label: '3. Kartu Keluarga (KartuKeluarga)',
    shortLabel: 'KK',
    category: 'Identitas Pokok',
    defaultRequired: true,
    color: 'indigo',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    description: 'Kartu Keluarga terbaru yang memuat nama siswa'
  },
  {
    key: 'kiaUrl',
    label: '4. KIA / KTP Anak (KIA)',
    shortLabel: 'KIA',
    category: 'Identitas Siswa',
    defaultRequired: false,
    color: 'blue',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    description: 'Kartu Identitas Anak (KIA) usia di bawah 17 tahun'
  },
  {
    key: 'ktpAyahUrl',
    label: '5. KTP Ayah Kandung (KTPAyah)',
    shortLabel: 'KTP Ayah',
    category: 'Identitas Orang Tua',
    defaultRequired: true,
    color: 'sky',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    description: 'KTP Asli / Scan Ayah Kandung (Wajib jika masih hidup)'
  },
  {
    key: 'ktpIbuUrl',
    label: '6. KTP Ibu Kandung (KTPIbu)',
    shortLabel: 'KTP Ibu',
    category: 'Identitas Orang Tua',
    defaultRequired: true,
    color: 'pink',
    badgeBg: 'bg-pink-50',
    badgeText: 'text-pink-700',
    badgeBorder: 'border-pink-200',
    description: 'KTP Asli / Scan Ibu Kandung (Wajib jika masih hidup)'
  },
  {
    key: 'ijazahUrl',
    label: '7. Ijazah / SKL (Ijazah)',
    shortLabel: 'Ijazah',
    category: 'Riwayat Pendidikan',
    defaultRequired: false,
    color: 'purple',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    description: 'Ijazah / SKL jenjang sebelumnya (Wajib untuk Kelas 7-12)'
  },
  {
    key: 'ktpWaliUrl',
    label: '8. KTP Wali Murid (KTPWali)',
    shortLabel: 'KTP Wali',
    category: 'Identitas Orang Tua',
    defaultRequired: false,
    color: 'amber',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    description: 'KTP Wali Murid (Wajib jika Ayah atau Ibu telah meninggal)'
  },
  {
    key: 'raporUrl',
    label: '9. Buku Rapor / Nilai (Rapor)',
    shortLabel: 'Rapor',
    category: 'Riwayat Pendidikan',
    defaultRequired: false,
    color: 'cyan',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-200',
    description: 'Scan / Foto lembar buku rapor semester terakhir'
  },
  {
    key: 'suratPindahUrl',
    label: '10. Surat Pindah / Mutasi (S.Pindah)',
    shortLabel: 'S.Pindah',
    category: 'Mutasi & Legalitas',
    defaultRequired: false,
    color: 'rose',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    description: 'Surat Keterangan Pindah/Mutasi resmi dari sekolah asal'
  },
  {
    key: 'suKetUrl',
    label: '11. Surat Keterangan / SuKet (SuKet)',
    shortLabel: 'SuKet',
    category: 'Pendukung Tambahan',
    defaultRequired: false,
    color: 'teal',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    description: 'KIP, KPS, PKH, Piagam Prestasi, atau Surat Keterangan Sekolah'
  },
  {
    key: 'suratDomisiliUrl',
    label: '12. Surat Domisili / KIP (S.Domisili)',
    shortLabel: 'S.Domisili',
    category: 'Identitas Pokok',
    defaultRequired: false,
    color: 'violet',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    badgeBorder: 'border-violet-200',
    description: 'Surat Keterangan Domisili atau Kartu Indonesia Pintar'
  },
  {
    key: 'formPendaftaranUrl',
    label: '13. Form Pendaftaran (Form)',
    shortLabel: 'Form',
    category: 'Administrasi Pendaftaran',
    defaultRequired: false,
    color: 'blue',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    description: 'Formulir Pendaftaran Siswa Baru (Fisik / Digital Scan)'
  },
  {
    key: 'suratPernyataanUrl',
    label: '14. Surat Pernyataan (S.Pernyataan)',
    shortLabel: 'S.Pernyataan',
    category: 'Administrasi Pendaftaran',
    defaultRequired: false,
    color: 'emerald',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    description: 'Surat Pernyataan Tata Tertib & Ketaatan Orang Tua / Siswa'
  },
  {
    key: 'suratKesanggupanUrl',
    label: '15. Surat Kesanggupan (S.Kesanggupan)',
    shortLabel: 'S.Kesanggupan',
    category: 'Administrasi Pendaftaran',
    defaultRequired: false,
    color: 'amber',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    description: 'Surat Kesanggupan Pembiayaan & Keikutsertaan KBM Siswa'
  },
  {
    key: 'berkasLainnyaUrl',
    label: '16. Berkas Lainnya (BerkasLainnya)',
    shortLabel: 'Berkas Lain',
    category: 'Pendukung Tambahan',
    defaultRequired: false,
    color: 'purple',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    description: 'Dokumen lampiran tambahan, piagam penghargaan, atau berkas medis'
  }
];

export function isAyahDeceased(student?: Partial<Student> | null): boolean {
  if (!student) return false;
  const sAyah = String(student.statusAyah || (student as any)['StatusAyah'] || '').trim().toLowerCase();
  const sYatim = String(student.statusYatim || (student as any)['StatusYatim'] || (student as any)['Yatim/Piatu'] || '').trim().toLowerCase();
  return sAyah === 'meninggal' || sAyah === 'almarhum' || sAyah.includes('wafat') || sYatim === 'yatim' || sYatim === 'yatim piatu';
}

export function isIbuDeceased(student?: Partial<Student> | null): boolean {
  if (!student) return false;
  const sIbu = String(student.statusIbu || (student as any)['StatusIbu'] || '').trim().toLowerCase();
  const sYatim = String(student.statusYatim || (student as any)['StatusYatim'] || (student as any)['Yatim/Piatu'] || '').trim().toLowerCase();
  return sIbu === 'meninggal' || sIbu === 'almarhumah' || sIbu.includes('wafat') || sYatim === 'piatu' || sYatim === 'yatim piatu';
}

export function isGrade7To12(studentClass?: string): boolean {
  if (!studentClass) return false;
  const s = String(studentClass).trim().toUpperCase();
  if (/\b(VII|VIII|IX|X|XI|XII)\b/.test(s)) return true;
  if (s.includes('SMP') || s.includes('MTS') || s.includes('SMA') || s.includes('SMK') || s.includes('MA')) return true;
  const match = s.match(/\b(7|8|9|10|11|12)\b/) || s.match(/^([7-9]|1[0-2])/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num >= 7 && num <= 12;
  }
  const digits = s.replace(/[^0-9]/g, '');
  if (digits) {
    const num = parseInt(digits, 10);
    if (num >= 7 && num <= 12) return true;
  }
  return false;
}

export function getStudentDocRequirement(docKey: string, student: Student): { 
  required: boolean; 
  ruleLabel: string; 
  reason: string; 
  badgeType: 'mandatory' | 'conditional' | 'optional' 
} {
  switch (docKey) {
    case 'fotoUrl':
      return {
        required: true,
        ruleLabel: 'Wajib Ada',
        reason: 'Wajib ada untuk verifikasi profil resmi siswa',
        badgeType: 'mandatory'
      };
    case 'aktaKelahiranUrl':
      return {
        required: true,
        ruleLabel: 'Wajib Ada',
        reason: 'Wajib ada untuk validasi identitas pokok & NIK Dukcapil',
        badgeType: 'mandatory'
      };
    case 'kartuKeluargaUrl':
      return {
        required: true,
        ruleLabel: 'Wajib Ada',
        reason: 'Wajib ada untuk verifikasi nomor KK & susunan keluarga',
        badgeType: 'mandatory'
      };
    case 'ktpAyahUrl': {
      const ayahDead = isAyahDeceased(student);
      return {
        required: !ayahDead,
        ruleLabel: ayahDead ? 'Tidak Wajib (Almarhum)' : 'Wajib (Ayah Hidup)',
        reason: ayahDead ? 'Ayah telah almarhum/meninggal dunia' : 'Wajib diunggah selama Ayah masih hidup',
        badgeType: 'conditional'
      };
    }
    case 'ktpIbuUrl': {
      const ibuDead = isIbuDeceased(student);
      return {
        required: !ibuDead,
        ruleLabel: ibuDead ? 'Tidak Wajib (Almarhumah)' : 'Wajib (Ibu Hidup)',
        reason: ibuDead ? 'Ibu telah almarhumah/meninggal dunia' : 'Wajib diunggah selama Ibu masih hidup',
        badgeType: 'conditional'
      };
    }
    case 'ijazahUrl': {
      const is7to12 = isGrade7To12(student.class);
      return {
        required: is7to12,
        ruleLabel: is7to12 ? 'Wajib (Kelas 7-12)' : 'Tidak Wajib (SD)',
        reason: is7to12 ? 'Wajib ada untuk siswa jenjang Kelas 7-12 (SMP/SMA/SMK)' : 'Tidak wajib untuk jenjang SD (Kelas 1-6)',
        badgeType: 'conditional'
      };
    }
    case 'ktpWaliUrl': {
      const ayahDead = isAyahDeceased(student);
      const ibuDead = isIbuDeceased(student);
      const anyParentDead = ayahDead || ibuDead;
      return {
        required: anyParentDead,
        ruleLabel: anyParentDead ? 'Wajib (Orang Tua Wafat)' : 'Tidak Wajib',
        reason: anyParentDead ? 'Wajib ada karena Ayah / Ibu telah almarhum' : 'Tidak wajib apabila kedua orang tua masih hidup',
        badgeType: 'conditional'
      };
    }
    case 'kiaUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Kartu Identitas Anak (Opsional)',
        badgeType: 'optional'
      };
    case 'raporUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Buku Rapor / Lembar Nilai (Opsional)',
        badgeType: 'optional'
      };
    case 'suratPindahUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Surat Pindah / Mutasi (Hanya untuk siswa pindahan)',
        badgeType: 'optional'
      };
    case 'suKetUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Surat Keterangan / KIP / PIP / Prestasi (Opsional)',
        badgeType: 'optional'
      };
    case 'suratDomisiliUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Surat Domisili / Surat Keterangan Tempat Tinggal (Opsional)',
        badgeType: 'optional'
      };
    case 'formPendaftaranUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Formulir Pendaftaran Siswa (Opsional)',
        badgeType: 'optional'
      };
    case 'suratPernyataanUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Surat Pernyataan Orang Tua / Siswa (Opsional)',
        badgeType: 'optional'
      };
    case 'suratKesanggupanUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Surat Kesanggupan Pembiayaan & KBM (Opsional)',
        badgeType: 'optional'
      };
    case 'berkasLainnyaUrl':
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Berkas Tambahan / Dokumen Lainnya (Opsional)',
        badgeType: 'optional'
      };
    default:
      return {
        required: false,
        ruleLabel: 'Tidak Wajib',
        reason: 'Berkas Tambahan Lainnya (Opsional)',
        badgeType: 'optional'
      };
  }
}

export function getStudentDocValue(student: Student, docKey: keyof Student | string): string {
  if (!student) return '';
  const val = (student as any)[docKey];
  if (val && typeof val === 'string' && val.trim() !== '') return val.trim();

  switch (docKey) {
    case 'fotoUrl':
      return (
        student.fotoUrl ||
        student.pasFoto ||
        (student as any).PasFoto ||
        (student as any).foto ||
        (student as any).Foto ||
        (student as any)['Pas Foto'] ||
        (student as any)['Pas_Foto'] ||
        (student as any)['Foto Siswa'] ||
        (student as any)['FotoSiswa'] ||
        ''
      );
    case 'aktaKelahiranUrl':
      return student.akteUrl || (student as any).AktaKelahiran || (student as any).Akte || (student as any)['Akta Kelahiran'] || (student as any)['Akta'] || '';
    case 'kartuKeluargaUrl':
      return student.kkUrl || (student as any).KartuKeluarga || (student as any).KK || (student as any)['Kartu Keluarga'] || '';
    case 'kiaUrl':
      return student.ktpAnakUrl || (student as any).KIA || (student as any)['KTP Anak'] || (student as any)['Kartu Identitas Anak'] || '';
    case 'ktpAyahUrl':
      return (student as any).KTPAyah || (student as any)['KTP Ayah'] || (student as any).ktpAyah || '';
    case 'ktpIbuUrl':
      return (student as any).KTPIbu || (student as any)['KTP Ibu'] || (student as any).ktpIbu || '';
    case 'ijazahUrl':
      return (student as any).Ijazah || (student as any)['Ijazah'] || (student as any).SKL || (student as any)['Surat Keterangan Lulus'] || '';
    case 'ktpWaliUrl':
      return (student as any).KTPWali || (student as any)['KTP Wali'] || (student as any).ktpWali || '';
    case 'raporUrl':
      return student.rapotUrl || (student as any).Rapor || (student as any).Rapot || (student as any)['Buku Rapor'] || '';
    case 'suratPindahUrl':
      return (student as any)['S.Pindah'] || (student as any).SPindah || (student as any)['Surat Pindah'] || (student as any).suratPindah || '';
    case 'suKetUrl':
      return student.dokumenLainUrl || student.berkasUrl || (student as any).SuKet || (student as any)['Surat Keterangan'] || (student as any).suket || '';
    case 'suratDomisiliUrl':
      return student.kipUrl || (student as any)['S.Domisili'] || (student as any).SDomisili || (student as any)['Surat Domisili'] || (student as any).domisili || '';
    case 'formPendaftaranUrl':
      return student.formPendaftaranUrl || student.formUrl || (student as any).FormPendaftaran || (student as any).Form || (student as any)['Form Pendaftaran'] || '';
    case 'suratPernyataanUrl':
      return student.suratPernyataanUrl || student.sPernyataanUrl || student.pernyataanUrl || (student as any).SPernyataan || (student as any)['S.Pernyataan'] || (student as any)['Surat Pernyataan'] || '';
    case 'suratKesanggupanUrl':
      return student.suratKesanggupanUrl || student.sKesanggupanUrl || student.kesanggupanUrl || (student as any).SKesanggupan || (student as any)['S.Kesanggupan'] || (student as any)['Surat Kesanggupan'] || '';
    case 'berkasLainnyaUrl':
      return student.berkasLainnyaUrl || (student as any).BerkasLainnya || (student as any)['Berkas Lainnya'] || (student as any).berkasLainnya || '';
    default:
      return '';
  }
}

export function getStudentCompleteness(student: Student) {
  let uploadedStandardCount = 0;
  let requiredUploaded = 0;
  let requiredTotal = 0;
  const missingRequiredDocs: Array<{ key: string; label: string; reason: string }> = [];

  STUDENT_DOC_CONFIGS.forEach(doc => {
    const req = getStudentDocRequirement(String(doc.key), student);
    const val = getStudentDocValue(student, doc.key);
    const isPresent = Boolean(val && val.trim() !== '');

    if (isPresent) {
      uploadedStandardCount++;
    }

    if (req.required) {
      requiredTotal++;
      if (isPresent) {
        requiredUploaded++;
      } else {
        missingRequiredDocs.push({
          key: String(doc.key),
          label: doc.shortLabel,
          reason: req.reason
        });
      }
    }
  });

  const customDocs = Array.isArray(student.customDocs) ? student.customDocs : [];
  const customDocsCount = customDocs.length;
  const totalUploaded = uploadedStandardCount + customDocsCount;
  const totalPossible = STUDENT_DOC_CONFIGS.length + customDocsCount;

  const isComplete = requiredTotal > 0 ? requiredUploaded === requiredTotal : uploadedStandardCount >= 3;
  const percent = requiredTotal > 0 ? Math.round((requiredUploaded / requiredTotal) * 100) : 100;
  const overallPercent = Math.round((totalUploaded / totalPossible) * 100);

  return {
    uploadedCount: totalUploaded,
    uploadedStandardCount,
    customDocsCount,
    totalPossible,
    requiredUploaded,
    requiredTotal,
    missingRequiredDocs,
    missingRequiredCount: requiredTotal - requiredUploaded,
    isComplete,
    percent,
    overallPercent
  };
}
