import { create } from 'zustand';
import { AppState, Student, Teacher, Gender } from './types';
import { normalizeClassName, getGoogleDriveDirectImageUrl } from './lib/utils';
import { db } from './data/db';
import { DEFAULT_APP_CONFIG } from './data/config';

export const cleanStudentClass = (raw: any): Student => {
  if (!raw) return raw;
  if (raw._cleanedStudent === true && raw.id && raw.name) return raw as Student;
  
  // Normalisasi ID dan NIS (Di Rombel KTCT Tambora: NIS adalah nopdkt / No. PDKT)
  const nopdkt = String(
    raw.nopdkt || 
    raw.NoPDKT || 
    raw.noPdkt || 
    raw['No. PDKT'] || 
    raw['No PDKT'] || 
    raw['No.PDKT'] || 
    raw['No PDKT MPLS'] ||
    raw.nis || 
    raw.NIS || 
    ''
  ).trim();
  const nis = nopdkt; // NIS itu nopdkt
  const nisn = String(raw.nisn || raw.NISN || raw['No NISN'] || raw['Nomor NISN'] || '').trim();
  const nik = String(raw.nik || raw.NIK || raw['No KTP / NIK'] || raw['Nomor NIK'] || '').trim();
  const rawId = String(raw.id || raw.ID || raw.StudentID || raw.siswaId || '').trim();
  
  // Deterministic unique ID fallback agar tidak pernah saling menimpa jika nopdkt kosong
  const id = (nopdkt && nopdkt !== '-') 
    ? nopdkt 
    : (nisn && nisn !== '-') 
    ? `NISN-${nisn}` 
    : (nik && nik !== '-') 
    ? `NIK-${nik}` 
    : (rawId && rawId !== '-') 
    ? rawId 
    : `SISWA-${String(raw.name || raw.NamaLengkap || raw.Nama || 'UNKNOWN').replace(/\s+/g, '_')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const name = String(
    raw.name || 
    raw.NamaLengkap || 
    raw.Nama || 
    raw['Nama Lengkap'] || 
    raw.nama || 
    raw.namaLengkap || 
    raw.NamaSiswa || 
    raw.nama_siswa || 
    raw['Nama Siswa'] || 
    raw['NAMA LENGKAP'] || 
    raw.NAMA || 
    raw.namaMurid || 
    raw['Nama Murid'] || 
    (nopdkt ? `Siswa (${nopdkt})` : nisn ? `Siswa (${nisn})` : '')
  ).trim();

  // Normalisasi Kelas (Prioritaskan kolom KelasSaatini dari Google Sheet)
  const rawClassCandidates = [
    raw.KelasSaatini,
    raw.KelasSaatIni,
    raw['Kelas Saat ini'],
    raw['Kelas Saat Ini'],
    raw['KelasSaatini'],
    raw['KelasSaatIni'],
    raw.class,
    raw.Kelas,
    raw.kelas,
    raw.rombel,
    raw.Rombel,
    raw.Tingkat,
    raw.tingkat
  ];
  let rawClass = '';
  for (const cand of rawClassCandidates) {
    if (cand !== undefined && cand !== null) {
      const s = String(cand).trim();
      if (s && s !== '-' && s !== 'undefined' && s !== 'null') {
        rawClass = s;
        break;
      }
    }
  }
  const assignedClass = rawClass ? (normalizeClassName(rawClass) || rawClass) : '';

  // Normalisasi Gender
  const genderRaw = String(raw.gender || raw.JenisKelamin || raw['Jenis Kelamin'] || raw['L/P'] || raw.JK || raw.jk || 'L').trim().toUpperCase();
  const gender: Gender = (genderRaw.startsWith('P') || genderRaw === 'PEREMPUAN' || genderRaw === 'WANITA') ? 'P' : 'L';

  // Normalisasi Tempat & Tanggal Lahir
  const pob = String(raw.pob || raw['Tempat Lahir'] || raw.TempatLahir || raw.tempatLahir || '').trim();
  const dob = String(raw.dob || raw.TanggalLahir || raw['Tanggal Lahir'] || raw.tanggalLahir || '').trim();

  // Normalisasi nomor HP / telepon
  const rawNoHp = raw.noHp || raw.NomorHP || raw['No HP'] || raw.no_hp || raw.telepon || raw.phone || raw.nomorHp || raw.nomor_hp || raw.kontak || raw.wa || raw.tlp || raw.tlpAyah || raw.tlpIbu || raw.tlpWali || '';
  
  // Normalisasi status dari Google Sheet
  let rawStatus = String(raw.Status || raw.status || raw['Status Terbaru'] || '').trim();
  let status = 'Aktif';
  if (rawStatus) {
    const sLow = rawStatus.toLowerCase();
    if (sLow === 'aktif' || sLow === 'active' || sLow === '1') {
      status = 'Aktif';
    } else if (sLow.includes('tidak') || sLow.includes('non')) {
      status = 'Tidak Aktif';
    } else if (sLow.includes('keluar') || sLow.includes('drop') || sLow === 'do') {
      status = 'Keluar';
    } else if (sLow.includes('pindah') || sLow.includes('mutasi') || sLow === 'transfer') {
      status = 'Pindah';
    } else if (sLow.includes('lulus') || sLow === 'graduated') {
      status = 'Lulus';
    } else if (sLow.includes('belum') || sLow === 'pending') {
      status = 'Belum';
    } else {
      status = rawStatus;
    }
  } else {
    status = 'Aktif';
  }

  // Data Ortu
  const namaAyah = String(raw.namaAyah || raw.NamaAyah || raw.fatherName || raw.parentName || '').trim();
  const namaIbu = String(raw.namaIbu || raw.NamaIbu || raw.namaIbuKandung || raw.NamaIbuKandung || '').trim();
  const namaWali = String(raw.namaWali || raw.NamaWali || '').trim();
  const parentName = String(raw.parentName || namaAyah || namaIbu || namaWali || 'Orang Tua').trim();

  const statusAyah = String(raw.statusAyah || raw.StatusAyah || (namaAyah.toLowerCase().includes('alm') ? 'Meninggal' : 'Masih Hidup')).trim();
  const statusIbu = String(raw.statusIbu || raw.StatusIbu || (namaIbu.toLowerCase().includes('alm') ? 'Meninggal' : 'Masih Hidup')).trim();

  let statusYatim = String(raw.statusYatim || raw.StatusYatim || '').trim();
  if (!statusYatim) {
    const aMeninggal = statusAyah.toLowerCase().includes('meninggal') || namaAyah.toLowerCase().includes('alm');
    const iMeninggal = statusIbu.toLowerCase().includes('meninggal') || namaIbu.toLowerCase().includes('alm');
    if (aMeninggal && iMeninggal) statusYatim = 'Yatim Piatu';
    else if (aMeninggal) statusYatim = 'Yatim';
    else if (iMeninggal) statusYatim = 'Piatu';
    else statusYatim = 'Lengkap';
  }

  const noKk = String(raw.noKk || raw.NomorKartuKeluarga || raw['No KK'] || raw.nokk || '').trim();
  const tahunMasuk = String(raw.tahunMasuk || raw.TahunMasuk || raw['Tahun Masuk'] || raw.ThnMasuk || raw['Thn Masuk'] || raw.tahun_masuk || raw['Tahun Angkatan'] || raw.angkatan || '').trim();

  // Normalisasi berkas dokumen jika ada nama field alternatif di sheet
  const akta = raw.aktaKelahiranUrl || raw.AktaKelahiran || raw.akteUrl || raw.Akte || raw.akta || raw.linkAkta || '';
  const kk = raw.kartuKeluargaUrl || raw.KartuKeluarga || raw.kkUrl || raw.KK || raw.kartuKeluarga || raw.linkKk || '';
  const kia = raw.kiaUrl || raw.KIA || raw.ktpAnakUrl || raw.ktpAnak || raw.linkKia || '';
  const ktpAyah = raw.ktpAyahUrl || raw.KTPAyah || raw.ktpAyah || '';
  const ktpIbu = raw.ktpIbuUrl || raw.KTPIbu || raw.ktpIbu || '';
  const ktpWali = raw.ktpWaliUrl || raw.KTPWali || raw.ktpWali || '';
  const ijazah = raw.ijazahUrl || raw.Ijazah || raw.linkIjazah || '';
  const rapor = raw.raporUrl || raw.Rapor || raw.rapotUrl || raw.Rapot || '';
  const suratPindah = raw.suratPindahUrl || raw.SuratPindah || raw['S.Pindah'] || raw.suratPindah || '';
  const suKet = raw.suKetUrl || raw.SuratKeterangan || raw.SuKet || raw.dokumenLainUrl || '';
  const suratDomisili = raw.suratDomisiliUrl || raw.SuratDomisili || raw['S.Domisili'] || raw.suratDomisili || '';
  const rawFoto = raw.fotoUrl || raw.PasFoto || raw.pasFoto || raw.Foto || raw.foto || raw.photo || raw.Photo || raw.avatar || raw.linkFoto || raw.LinkFoto || raw.pas_foto || raw.foto_url || '';
  const foto = rawFoto ? getGoogleDriveDirectImageUrl(rawFoto) : '';

  // Alamat detail, Kelurahan, RT, RW murni mengikuti tulisan di kolom Sheet
  const rawAddress = String(raw.address || raw.Alamat || raw.alamat || '').trim();
  let rawKel = String(raw.kelurahan || raw.Kelurahan || raw.kel || raw.Desa || raw.desa || '').trim();
  let rawRw = String(raw.rw || raw.RW || '').trim();
  let rawRt = String(raw.rt || raw.RT || '').trim();

  if (!rawKel && rawAddress) {
    // Cek jika ada pola Kelurahan: atau Desa: di alamat
    const matchKel = rawAddress.match(/(?:Kelurahan|Desa|Kel\.)\s+([A-Za-z\s]+?)(?:,|$|\s+RT|\s+RW)/i);
    if (matchKel && matchKel[1]) {
      rawKel = matchKel[1].trim();
    }
  }

  if (rawKel && (rawKel === rawKel.toUpperCase() || rawKel === rawKel.toLowerCase())) {
    rawKel = rawKel.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  }

  // Ekstraksi RW murni (Standar Dapodik: hanya angka murni misal '01', '05', tanpa tulisan 'RW')
  if (!rawRw && rawAddress) {
    const matchRw = rawAddress.match(/RW[\s.:]*0?([0-9]+)/i);
    if (matchRw && matchRw[1]) {
      const n = parseInt(matchRw[1], 10);
      rawRw = !isNaN(n) ? String(n < 10 ? '0' + n : n) : matchRw[1];
    }
  } else if (rawRw && rawRw !== '-') {
    const cleanRw = rawRw.replace(/^RW[\s.:]*/i, '').trim();
    const rwNum = cleanRw.replace(/[^0-9]/g, '');
    if (rwNum) {
      const n = parseInt(rwNum, 10);
      rawRw = !isNaN(n) ? String(n < 10 ? '0' + n : n) : rwNum;
    } else {
      rawRw = cleanRw;
    }
  }

  // Ekstraksi RT murni (Standar Dapodik: hanya angka murni misal '01', '05', tanpa tulisan 'RT')
  if (!rawRt && rawAddress) {
    const matchRt = rawAddress.match(/RT[\s.:]*0?([0-9]+)/i);
    if (matchRt && matchRt[1]) {
      const n = parseInt(matchRt[1], 10);
      rawRt = !isNaN(n) ? String(n < 10 ? '0' + n : n) : matchRt[1];
    }
  } else if (rawRt && rawRt !== '-') {
    const cleanRt = rawRt.replace(/^RT[\s.:]*/i, '').trim();
    const rtNum = cleanRt.replace(/[^0-9]/g, '');
    if (rtNum) {
      const n = parseInt(rtNum, 10);
      rawRt = !isNaN(n) ? String(n < 10 ? '0' + n : n) : rtNum;
    } else {
      rawRt = cleanRt;
    }
  }

  if (!rawRt) rawRt = '-';
  if (!rawRw) rawRw = '-';

  return {
      ...raw,
      id,
      nis: nopdkt || id,
      nopdkt: nopdkt || id,
      noPdkt: nopdkt || id,
      NoPDKT: nopdkt || id,
      NIS: nopdkt || id,
      nisn: nisn || undefined,
      NISN: nisn || undefined,
      nik: nik || undefined,
      NIK: nik || undefined,
      name: name || 'Siswa',
      nama: name || 'Siswa',
      Nama: name || 'Siswa',
      NamaLengkap: name || 'Siswa',
      namaLengkap: name || 'Siswa',
      class: assignedClass,
      KelasSaatIni: assignedClass,
      KelasSaatini: assignedClass,
      Kelas: assignedClass,
      kelas: assignedClass,
      rombel: assignedClass,
      gender,
      JenisKelamin: gender,
      pob: pob || undefined,
      TempatLahir: pob || undefined,
      tempatLahir: pob || undefined,
      'Tempat Lahir': pob || undefined,
      dob: dob || '',
      TanggalLahir: dob || '',
      tanggalLahir: dob || '',
      'Tanggal Lahir': dob || '',
      address: rawAddress,
      Alamat: rawAddress,
      alamat: rawAddress,
      parentName,
      
      // Dapodik
      tahunMasuk: tahunMasuk || undefined,
      TahunMasuk: tahunMasuk || undefined,
      anakKe: raw.anakKe || raw['Anak ke'] || raw.AnakKe || undefined,
      AnakKe: raw.AnakKe || raw.anakKe || raw['Anak ke'] || undefined,
      saudara: raw.saudara || raw.Saudara || undefined,
      Saudara: raw.Saudara || raw.saudara || undefined,
      agama: raw.agama || raw.Agama || 'Islam',
      Agama: raw.Agama || raw.agama || 'Islam',
      golonganDarah: raw.golonganDarah || raw['Golongan Darah'] || raw.GolonganDarah || undefined,
      GolonganDarah: raw.GolonganDarah || raw.golonganDarah || raw['Golongan Darah'] || undefined,
      tinggiBadan: raw.tinggiBadan || raw['TinggiBadan(cm)'] || raw.TinggiBadan || undefined,
      TinggiBadan: raw.TinggiBadan || raw.tinggiBadan || raw['TinggiBadan(cm)'] || undefined,
      beratBadan: raw.beratBadan || raw['BeratBadan(kg)'] || raw.BeratBadan || undefined,
      BeratBadan: raw.BeratBadan || raw.beratBadan || raw['BeratBadan(kg)'] || undefined,
      prestasi: raw.prestasi || raw.Prestasi || undefined,
      Prestasi: raw.Prestasi || raw.prestasi || undefined,
      hobi: raw.hobi || raw.Hobi || undefined,
      Hobi: raw.Hobi || raw.hobi || undefined,
      catatanPenting: raw.catatanPenting || raw['Catatan Penting'] || raw.CatatanPenting || undefined,
      CatatanPenting: raw.CatatanPenting || raw.catatanPenting || raw['Catatan Penting'] || undefined,

      // Alamat detail
      rt: rawRt,
      RT: rawRt,
      rw: rawRw,
      RW: rawRw,
      kelurahan: rawKel,
      Kelurahan: rawKel,
      kecamatan: raw.kecamatan || raw.Kecamatan || 'Tambora',
      Kecamatan: raw.kecamatan || raw.Kecamatan || 'Tambora',
      kota: raw.kota || raw.Kota || 'Jakarta Barat',
      Kota: raw.kota || raw.Kota || 'Jakarta Barat',
      provinsi: raw.provinsi || raw.Provinsi || 'DKI Jakarta',
      Provinsi: raw.provinsi || raw.Provinsi || 'DKI Jakarta',
      kodePos: raw.kodePos || raw.KodePos || '11220',
      KodePos: raw.kodePos || raw.KodePos || '11220',
      jenisTinggal: raw.jenisTinggal || raw.JenisTinggal || undefined,
      JenisTinggal: raw.JenisTinggal || raw.jenisTinggal || undefined,
      alatTransportasi: raw.alatTransportasi || raw.AlatTransportasi || undefined,
      AlatTransportasi: raw.AlatTransportasi || raw.alatTransportasi || undefined,
      noHp: rawNoHp ? String(rawNoHp).trim() : (raw.noHp || undefined),
      NomorHP: rawNoHp ? String(rawNoHp).trim() : (raw.NomorHP || raw.noHp || undefined),
      email: raw.email || raw['E-Mail'] || raw.Email || undefined,
      Email: raw.Email || raw.email || raw['E-Mail'] || undefined,
      sekolahAsal: raw.sekolahAsal || raw.AsalSekolah || raw.sekolah_asal || undefined,
      AsalSekolah: raw.AsalSekolah || raw.sekolahAsal || raw.sekolah_asal || undefined,
      skhun: raw.skhun || raw.SKHUN || undefined,
      SKHUN: raw.SKHUN || raw.skhun || undefined,
      penerimaKps: raw.penerimaKps || raw.PenerimaKPS || raw.kps || undefined,
      PenerimaKPS: raw.PenerimaKPS || raw.penerimaKps || raw.kps || undefined,
      ijazahNo: raw.ijazahNo || raw.NoIjazah || raw['No Ijazah'] || undefined,
      status: status || 'Aktif',
      Status: status || 'Aktif',

    // Orang Tua & Wali
    noKk: noKk || undefined,
    NomorKartuKeluarga: noKk || undefined,
    namaAyah: namaAyah || undefined,
    NamaAyah: namaAyah || undefined,
    fatherName: namaAyah || undefined,
    nikAyah: raw.nikAyah || raw.NIKAyah || undefined,
    NIKAyah: raw.NIKAyah || raw.nikAyah || undefined,
    tempatLahirAyah: raw.tempatLahirAyah || raw.TempatLahirAyah || undefined,
    TempatLahirAyah: raw.TempatLahirAyah || raw.tempatLahirAyah || undefined,
    tanggalLahirAyah: raw.tanggalLahirAyah || raw.TanggalLahirAyah || undefined,
    TanggalLahirAyah: raw.TanggalLahirAyah || raw.tanggalLahirAyah || undefined,
    pendidikanAyah: raw.pendidikanAyah || raw.PendidikanAyah || undefined,
    PendidikanAyah: raw.PendidikanAyah || raw.pendidikanAyah || undefined,
    pekerjaanAyah: raw.pekerjaanAyah || raw.PekerjaanAyah || undefined,
    PekerjaanAyah: raw.PekerjaanAyah || raw.pekerjaanAyah || undefined,
    penghasilanAyah: raw.penghasilanAyah || raw.PenghasilanAyah || undefined,
    PenghasilanAyah: raw.PenghasilanAyah || raw.penghasilanAyah || undefined,
    tlpAyah: raw.TeleponAyah || raw.tlpAyah || raw.TlpAyah || undefined,
    TeleponAyah: raw.TeleponAyah || raw.tlpAyah || raw.TlpAyah || undefined,
    statusAyah,
    StatusAyah: statusAyah,

    namaIbu: namaIbu || undefined,
    NamaIbu: namaIbu || undefined,
    namaIbuKandung: namaIbu || undefined,
    NamaIbuKandung: namaIbu || undefined,
    nikIbu: raw.nikIbu || raw.NIKIbu || undefined,
    NIKIbu: raw.NIKIbu || raw.nikIbu || undefined,
    tempatLahirIbu: raw.tempatLahirIbu || raw.TempatLahirIbu || undefined,
    TempatLahirIbu: raw.TempatLahirIbu || raw.tempatLahirIbu || undefined,
    tanggalLahirIbu: raw.tanggalLahirIbu || raw.TanggalLahirIbu || undefined,
    TanggalLahirIbu: raw.TanggalLahirIbu || raw.tanggalLahirIbu || undefined,
    pendidikanIbu: raw.pendidikanIbu || raw.PendidikanIbu || undefined,
    PendidikanIbu: raw.PendidikanIbu || raw.pendidikanIbu || undefined,
    pekerjaanIbu: raw.pekerjaanIbu || raw.PekerjaanIbu || undefined,
    PekerjaanIbu: raw.PekerjaanIbu || raw.pekerjaanIbu || undefined,
    penghasilanIbu: raw.penghasilanIbu || raw.PenghasilanIbu || undefined,
    PenghasilanIbu: raw.PenghasilanIbu || raw.penghasilanIbu || undefined,
    tlpIbu: raw.TeleponIbu || raw.tlpIbu || raw.TlpIbu || undefined,
    TeleponIbu: raw.TeleponIbu || raw.tlpIbu || raw.TlpIbu || undefined,
    statusIbu,
    StatusIbu: statusIbu,
    statusYatim,
    StatusYatim: statusYatim,

    namaWali: namaWali || undefined,
    NamaWali: namaWali || undefined,
    tempatLahirWali: raw.tempatLahirWali || raw.TempatLahirWali || undefined,
    TempatLahirWali: raw.TempatLahirWali || raw.tempatLahirWali || undefined,
    tglLahirWali: raw.TanggalLahirWali || raw.tglLahirWali || raw.TglLahirWali || undefined,
    TanggalLahirWali: raw.TanggalLahirWali || raw.tglLahirWali || raw.TglLahirWali || undefined,
    pendidikanWali: raw.pendidikanWali || raw.PendidikanWali || undefined,
    PendidikanWali: raw.PendidikanWali || raw.pendidikanWali || undefined,
    pekerjaanWali: raw.pekerjaanWali || raw.PekerjaanWali || undefined,
    PekerjaanWali: raw.PekerjaanWali || raw.pekerjaanWali || undefined,
    penghasilanWali: raw.penghasilanWali || raw.PenghasilanWali || undefined,
    PenghasilanWali: raw.PenghasilanWali || raw.penghasilanWali || undefined,
    hubunganWali: raw.hubunganWali || raw.Hubungan || undefined,
    Hubungan: raw.Hubungan || raw.hubunganWali || undefined,
    tlpWali: raw.TeleponWali || raw.tlpWali || raw['Tlp.Wali'] || undefined,
    TeleponWali: raw.TeleponWali || raw.tlpWali || raw['Tlp.Wali'] || undefined,

    // 12 Berkas Dokumen Resmi (Format PascalCase & format lama)
    AktaKelahiran: akta || raw.AktaKelahiran || raw.aktaKelahiranUrl || undefined,
    aktaKelahiranUrl: akta || raw.AktaKelahiran || raw.aktaKelahiranUrl,
    akteUrl: akta || raw.AktaKelahiran || raw.akteUrl,
    KartuKeluarga: kk || raw.KartuKeluarga || raw.kartuKeluargaUrl || undefined,
    kartuKeluargaUrl: kk || raw.KartuKeluarga || raw.kartuKeluargaUrl,
    kkUrl: kk || raw.KartuKeluarga || raw.kkUrl,
    KIA: kia || raw.KIA || raw.kiaUrl || undefined,
    kiaUrl: kia || raw.KIA || raw.kiaUrl,
    KTPAyah: ktpAyah || raw.KTPAyah || raw.ktpAyahUrl || undefined,
    ktpAyahUrl: ktpAyah || raw.KTPAyah || raw.ktpAyahUrl,
    KTPIbu: ktpIbu || raw.KTPIbu || raw.ktpIbuUrl || undefined,
    ktpIbuUrl: ktpIbu || raw.KTPIbu || raw.ktpIbuUrl,
    KTPWali: ktpWali || raw.KTPWali || raw.ktpWaliUrl || undefined,
    ktpWaliUrl: ktpWali || raw.KTPWali || raw.ktpWaliUrl,
    Ijazah: ijazah || raw.Ijazah || raw.ijazahUrl || undefined,
    ijazahUrl: ijazah || raw.Ijazah || raw.ijazahUrl,
    Rapor: rapor || raw.Rapor || raw.raporUrl || undefined,
    raporUrl: rapor || raw.Rapor || raw.raporUrl,
    rapotUrl: rapor || raw.Rapor || raw.rapotUrl,
    SuratPindah: suratPindah || raw.SuratPindah || raw.suratPindahUrl || undefined,
    suratPindahUrl: suratPindah || raw.SuratPindah || raw.suratPindahUrl,
    SuratKeterangan: suKet || raw.SuratKeterangan || raw.suKetUrl || undefined,
    suKetUrl: suKet || raw.SuratKeterangan || raw.suKetUrl,
    SuratDomisili: suratDomisili || raw.SuratDomisili || raw.suratDomisiliUrl || undefined,
    suratDomisiliUrl: suratDomisili || raw.SuratDomisili || raw.suratDomisiliUrl,
    PasFoto: foto || raw.PasFoto || undefined,
    pasFoto: foto || raw.pasFoto || '',
    Foto: foto || raw.Foto || undefined,
    foto: foto || raw.foto || '',
    photo: foto || raw.photo || '',
    fotoUrl: foto || raw.fotoUrl || '',
    _cleanedStudent: true,
  } as any;
};

const cleanTeacher = (raw: any): Teacher => {
  if (!raw) return raw;

  const id = raw.id || raw.GuruID || raw.guruId || raw.ID || crypto.randomUUID();
  const name = raw.name || raw.Nama || raw.NamaLengkap || raw.nama || raw.namaLengkap || raw.NamaGuru || '';
  const nip = String(raw.nip || raw.NIP || raw.nuptk || raw.NUPTK || raw.nik || raw.NIK || raw.GuruID || '').trim();
  const nik = String(raw.nik || raw.NIK || '').trim();
  const nuptk = String(raw.nuptk || raw.NUPTK || '').trim();
  const gelar = raw.gelar || raw.Gelar || raw.gelarAkademik || '';
  
  // Gender
  const genderRaw = String(raw.gender || raw.JenisKelamin || raw['Jenis Kelamin'] || raw['L/P'] || raw.JK || 'L').trim().toUpperCase();
  const gender: 'L' | 'P' = (genderRaw.startsWith('P') || genderRaw === 'PEREMPUAN' || genderRaw === 'WANITA') ? 'P' : 'L';

  const tempatLahir = raw.tempatLahir || raw.TempatLahir || raw['Tempat Lahir'] || '';
  const tanggalLahir = raw.tanggalLahir || raw.TanggalLahir || raw['Tanggal Lahir'] || '';
  const agama = raw.agama || raw.Agama || 'Islam';
  const alamat = raw.alamat || raw.Alamat || raw.address || '';
  
  // Jabatan / Class
  let assignedClassRaw = String(raw.class || raw.Jabatan || raw.jabatan || raw.waliKelas || raw.WaliKelas || raw['Wali Kelas'] || 'None').trim();
  let assignedClass = 'None';
  if (assignedClassRaw.toUpperCase().includes('KEPALA') || assignedClassRaw.toUpperCase() === 'KS') {
    assignedClass = 'Kepala Sekolah';
  } else if (assignedClassRaw.toUpperCase() === 'NONE' || assignedClassRaw === '-' || !assignedClassRaw) {
    assignedClass = 'None';
  } else if (/^[1-6][A-Z]?$/i.test(assignedClassRaw) || assignedClassRaw.toUpperCase().startsWith('KELAS')) {
    assignedClass = assignedClassRaw.toUpperCase().replace(/KELAS/g, '').replace(/[-_]/g, '').trim() || 'None';
  } else {
    assignedClass = assignedClassRaw;
  }

  const phone = String(raw.phone || raw.NoHP || raw['No HP'] || raw.noHp || raw.telepon || raw.no_hp || raw.kontak || raw.wa || '').trim();
  const email = raw.email || raw.Email || raw['E-Mail'] || '';
  const pendidikan = raw.pendidikan || raw.Pendidikan || raw['Pendidikan Terakhir'] || 'S1';
  const jurusan = raw.jurusan || raw.Jurusan || '';
  const statusKepegawaian = raw.statusKepegawaian || raw.StatusKepegawaian || raw['Status Kepegawaian'] || 'Tetap';
  const tmt = raw.tmt || raw.TMT || raw['Tgl Mulai Tugas'] || '';
  
  // Status
  let statusRaw = String(raw.status || raw.Status || 'Aktif').trim().toLowerCase();
  const status: 'Aktif' | 'Nonaktif' = statusRaw.includes('non') ? 'Nonaktif' : 'Aktif';

  const fotoUrl = raw.fotoUrl || raw.Foto || raw['Foto Profil'] || raw.foto || '';

  return {
    ...raw,
    id,
    nip: nip || nik || nuptk || '',
    nik: nik || undefined,
    nuptk: nuptk || undefined,
    name,
    gelar: gelar || undefined,
    gender,
    tempatLahir: tempatLahir || undefined,
    tanggalLahir: tanggalLahir || undefined,
    agama: agama || undefined,
    alamat: alamat || undefined,
    class: assignedClass,
    jabatan: assignedClass,
    phone,
    email,
    pendidikan: pendidikan || undefined,
    jurusan: jurusan || undefined,
    statusKepegawaian: statusKepegawaian || undefined,
    tmt: tmt || undefined,
    status,
    fotoUrl: fotoUrl || undefined,
    createdAt: raw.createdAt || raw.CreatedAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.UpdatedAt || new Date().toISOString(),
  };
};

const getInitialStudents = (): Student[] => {
  try {
    if (typeof db !== 'undefined' && db && typeof db.get === 'function') {
      const stored = db.get<Student>('students') || db.get<Student>('SISWA') || db.get<Student>('siswa');
      if (Array.isArray(stored) && stored.length > 0) {
        const cleaned = stored.map(cleanStudentClass).filter(s => s && (s.name || s.nama));
        if (cleaned.length > 0) {
          return cleaned;
        }
      }
    }
  } catch {}
  return [];
};

const getInitialTeachers = (): Teacher[] => {
  try {
    if (typeof db !== 'undefined' && db && typeof db.get === 'function') {
      const stored = db.get<Teacher>('teachers');
      if (Array.isArray(stored) && stored.length > 0) {
        const teacherMap = new Map<string, Teacher>();
        stored.forEach(raw => {
          const t = cleanTeacher(raw);
          if (t && t.name && t.name.trim().length > 1 && t.name.trim() !== 'undefined' && t.name.trim() !== '-') {
            const key = (t.nip && t.nip.trim()) || (t.nik && t.nik.trim()) || (t.nuptk && t.nuptk.trim()) || t.name.trim().toLowerCase();
            if (key && !teacherMap.has(key)) {
              teacherMap.set(key, t);
            }
          }
        });
        return Array.from(teacherMap.values());
      }
    }
  } catch {}
  return [];
};

function getInitialSettings() {
  const defaultConf = {
    scriptUrl: DEFAULT_APP_CONFIG.scriptUrl, 
    gasUrl: DEFAULT_APP_CONFIG.gasUrl,
    appName: DEFAULT_APP_CONFIG.appName, 
    schoolName: DEFAULT_APP_CONFIG.schoolName, 
    folderId: DEFAULT_APP_CONFIG.folderId, 
    folderSiswaId: DEFAULT_APP_CONFIG.folderSiswaId,
    spreadsheetId: DEFAULT_APP_CONFIG.spreadsheetId,
    tahunPelajaran: DEFAULT_APP_CONFIG.tahunPelajaran || '2026/2027', 
    semester: 'Ganjil',
    schoolLogoUrl: DEFAULT_APP_CONFIG.schoolLogoUrl,
    adminUsername: DEFAULT_APP_CONFIG.adminUsername,
    adminPassword: DEFAULT_APP_CONFIG.adminPassword
  };

  try {
    const saved = db.getSingle<any>('settings');
    if (saved && typeof saved === 'object') {
      const activeFolder = (!saved.folderId || saved.folderId === '13W6zz_g_nN-zGJdbquP4H4NvXrZZLk0j') 
        ? defaultConf.folderId 
        : saved.folderId;
      const rawTP = saved.tahunPelajaran || defaultConf.tahunPelajaran;
      const activeTP = rawTP === '2025/2026' ? '2026/2027' : rawTP;
      return {
        ...defaultConf,
        ...saved,
        folderId: activeFolder,
        tahunPelajaran: activeTP,
        semester: saved.semester === 'Genap' ? 'Genap' : 'Ganjil'
      };
    }
  } catch {}

  try {
    const local = localStorage.getItem('sista_settings');
    if (local) {
      const parsed = JSON.parse(local);
      const activeFolder = (!parsed.folderId || parsed.folderId === '13W6zz_g_nN-zGJdbquP4H4NvXrZZLk0j') 
        ? defaultConf.folderId 
        : parsed.folderId;
      const rawTP = parsed.tahunPelajaran || defaultConf.tahunPelajaran;
      const activeTP = rawTP === '2025/2026' ? '2026/2027' : rawTP;
      return {
        ...defaultConf,
        ...parsed,
        folderId: activeFolder,
        tahunPelajaran: activeTP,
        semester: parsed.semester === 'Genap' ? 'Genap' : 'Ganjil'
      };
    }
  } catch {}

  return defaultConf;
}

export const getInitialAuth = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const isAuthLocal = localStorage.getItem('sista_is_authenticated') === 'true';
    const isAuthSession = sessionStorage.getItem('sista_is_authenticated') === 'true';
    const authUserSession = sessionStorage.getItem('authenticated_user');
    const authUserLocal = localStorage.getItem('authenticated_user');
    const hasAuthUser = !!(authUserSession || authUserLocal);
    const hasRole = !!(sessionStorage.getItem('current_active_role_id') || localStorage.getItem('current_active_role_id'));
    return isAuthLocal || isAuthSession || (hasAuthUser && hasRole);
  } catch {
    return false;
  }
};

const INITIAL_STUDENTS_LIST = getInitialStudents();
const INITIAL_TEACHERS_LIST = getInitialTeachers();
const INITIAL_SETTINGS = getInitialSettings();

export const useStore = create<AppState>()((set) => ({
  isAuthenticated: getInitialAuth(),
  students: INITIAL_STUDENTS_LIST,
  teachers: INITIAL_TEACHERS_LIST,
  settings: INITIAL_SETTINGS,
  isLoading: false,
  error: null,
  lastSyncedAt: null,
  isSyncingGlobal: false,
  login: (userData?: any, roleId?: string) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sista_is_authenticated', 'true');
        sessionStorage.setItem('sista_is_authenticated', 'true');
        localStorage.setItem('ERP_active_portal', 'erp');
        sessionStorage.setItem('ERP_active_portal', 'erp');
        if (userData) {
          const serialized = typeof userData === 'string' ? userData : JSON.stringify(userData);
          localStorage.setItem('authenticated_user', serialized);
          sessionStorage.setItem('authenticated_user', serialized);
        }
        if (roleId) {
          localStorage.setItem('current_active_role_id', roleId);
          sessionStorage.setItem('current_active_role_id', roleId);
        }
      }
    } catch {}
    set({ isAuthenticated: true });
  },
  logout: () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sista_is_authenticated');
        sessionStorage.removeItem('sista_is_authenticated');
        localStorage.removeItem('authenticated_user');
        sessionStorage.removeItem('authenticated_user');
        localStorage.removeItem('current_active_role_id');
        sessionStorage.removeItem('current_active_role_id');
        localStorage.removeItem('portal_active_student_id');
        sessionStorage.removeItem('portal_active_student_id');
        localStorage.removeItem('current_auth_student_id');
        sessionStorage.removeItem('current_auth_student_id');
        localStorage.removeItem('portal_parent_student_id');
        sessionStorage.removeItem('portal_parent_student_id');
        localStorage.removeItem('current_user_session');
        sessionStorage.removeItem('current_user_session');
        localStorage.removeItem('ERP_active_tab');
        sessionStorage.removeItem('ERP_active_tab');
        localStorage.setItem('ERP_active_portal', 'public');
        sessionStorage.setItem('ERP_active_portal', 'public');
      }
    } catch {}
    set({ isAuthenticated: false, students: INITIAL_STUDENTS_LIST, teachers: INITIAL_TEACHERS_LIST });
  },
  setStudents: (students) => {
    const cleaned = students.map(cleanStudentClass);
    db.set('students', cleaned, { skipPush: true });
    set({ students: cleaned, error: null });
  },
  addStudent: (student) =>
    set((state) => {
      const cleaned = cleanStudentClass(student);
      const updatedList = [...state.students, cleaned];
      db.set('students', updatedList);
      return { students: updatedList };
    }),
  updateStudent: (id, data) =>
    set((state) => {
      const cleanId = String(id || '').trim();
      const cleanDataId = String(data.id || '').trim();
      const cleanDataNis = String(data.nis || (data as any).nopdkt || '').trim();
      const cleanDataNik = String(data.nik || '').trim();
      const cleanDataNisn = String(data.nisn || '').trim();

      let matched = false;
      const updatedList = state.students.map((s) => {
        const sId = String(s.id || '').trim();
        const sNis = String(s.nis || (s as any).nopdkt || '').trim();
        const sNik = String(s.nik || '').trim();
        const sNisn = String(s.nisn || '').trim();

        const isMatch = !matched && (
          (cleanId && sId === cleanId) ||
          (cleanId && sNis === cleanId) ||
          (cleanDataId && sId === cleanDataId) ||
          (cleanDataNis && sNis === cleanDataNis) ||
          (cleanDataNik && sNik && sNik === cleanDataNik) ||
          (cleanDataNisn && sNisn && sNisn === cleanDataNisn)
        );

        if (isMatch) {
          matched = true;
          const { _cleanedStudent, ...restOld } = s as any;
          return cleanStudentClass({ ...restOld, ...data, id: s.id || cleanDataId || cleanId, _cleanedStudent: false });
        }
        return s;
      });

      if (!matched && (cleanId || cleanDataId)) {
        const newStudent = cleanStudentClass({ ...data, id: cleanDataId || cleanId });
        updatedList.push(newStudent);
      }

      db.set('students', updatedList);
      return { students: updatedList };
    }),
  updateStudentsBulk: (updates) =>
    set((state) => {
      const updateMap = new Map(updates.map((u) => [u.id, u.data]));
      const updatedList = state.students.map((s) =>
        updateMap.has(s.id) ? cleanStudentClass({ ...s, ...updateMap.get(s.id), _cleanedStudent: false }) : s
      );
      db.set('students', updatedList);
      return { students: updatedList };
    }),
  deleteStudent: (id) =>
    set((state) => {
      const cleanId = String(id || '').trim();
      const updatedList = state.students.filter((s) => {
        const sId = String(s.id || '').trim();
        const sNis = String(s.nis || (s as any).nopdkt || (s as any).NoPDKT || '').trim();
        const sNisn = String(s.nisn || '').trim();
        const sNik = String(s.nik || '').trim();
        return sId !== cleanId && sNis !== cleanId && (cleanId.length > 5 ? (sNisn !== cleanId && sNik !== cleanId) : true);
      });
      db.set('students', updatedList);
      return { students: updatedList };
    }),
  setTeachers: (teachers) => {
    const cleaned = teachers
      .map(cleanTeacher)
      .filter(t => t && t.name && t.name.trim().length > 1 && t.name.trim() !== 'undefined' && t.name.trim() !== '-');
    
    // Deduplikasi berdasar NIP / NIK / NUPTK / Nama unik
    const teacherMap = new Map<string, Teacher>();
    cleaned.forEach(t => {
      const key = (t.nip && t.nip.trim()) || (t.nik && t.nik.trim()) || (t.nuptk && t.nuptk.trim()) || t.name.trim().toLowerCase();
      if (key) {
        const existing = teacherMap.get(key);
        if (existing) {
          teacherMap.set(key, { ...existing, ...t, id: existing.id || t.id });
        } else {
          teacherMap.set(key, t);
        }
      }
    });

    const uniqueTeachers = Array.from(teacherMap.values());
    db.set('teachers', uniqueTeachers, { skipPush: true });
    set({ teachers: uniqueTeachers, error: null });
  },
  addTeacher: (teacher) =>
    set((state) => {
      const cleaned = cleanTeacher(teacher);
      const updatedList = [...state.teachers, cleaned];
      db.set('teachers', updatedList);
      return { teachers: updatedList };
    }),
  updateTeacher: (id, data) =>
    set((state) => {
      const updatedList = state.teachers.map((t) => {
        const isMatch = t.id === id ||
          (t.nip && data.nip && String(t.nip).trim() === String(data.nip).trim()) ||
          (t.nik && data.nik && String(t.nik).trim() === String(data.nik).trim());
        return isMatch ? cleanTeacher({ ...t, ...data, id: t.id || id }) : t;
      });
      db.set('teachers', updatedList);
      return { teachers: updatedList };
    }),
  deleteTeacher: (id) =>
    set((state) => {
      const updatedList = state.teachers.filter((t) => t.id !== id && t.nip !== id);
      db.set('teachers', updatedList);
      return { teachers: updatedList };
    }),
  setSettings: (settings) => {
    const updated = {
      ...settings,
      semester: settings.semester === 'Genap' ? 'Genap' : 'Ganjil'
    };
    db.setSingle('settings', updated, { skipPush: true });
    set({ settings: updated });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setIsSyncingGlobal: (isSyncingGlobal) => set({ isSyncingGlobal }),
  clearAllData: () => {
    db.clearAll();
    set({
      students: [],
      teachers: [],
      lastSyncedAt: null,
      error: null
    });
  }
}));

// Hydrate Zustand store immediately when IndexedDB finishes its initial load (~10ms after boot)
if (typeof window !== 'undefined') {
  window.addEventListener('erp-db-synced', (e: any) => {
    if (e?.detail?.source === 'indexeddb') {
      const state = useStore.getState();
      if (state.students.length === 0) {
        const idbStudents = getInitialStudents();
        if (idbStudents.length > 0) {
          useStore.setState({ students: idbStudents });
        }
      }
      if (state.teachers.length === 0) {
        const idbTeachers = getInitialTeachers();
        if (idbTeachers.length > 0) {
          useStore.setState({ teachers: idbTeachers });
        }
      }
    }
  });
}
