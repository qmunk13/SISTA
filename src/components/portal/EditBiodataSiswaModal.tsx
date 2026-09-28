import React, { useState, useEffect } from 'react';
import { 
  X, Save, User, BookOpen, Briefcase, MapPin, 
  Users, FileText, CheckCircle2, AlertCircle, Sparkles,
  Phone, Mail, Calendar, ShieldCheck, HeartPulse, Building2
} from 'lucide-react';
import { Student } from '../../types';
import { useStore } from '../../store';
import { db } from '../../data/db';
import Swal from 'sweetalert2';

interface EditBiodataSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onSaved: (updatedStudent: Student) => void;
}

export default function EditBiodataSiswaModal({
  isOpen,
  onClose,
  student,
  onSaved
}: EditBiodataSiswaModalProps) {
  const { updateStudent } = useStore();
  const [activeSection, setActiveSection] = useState<'pokok' | 'akademik' | 'pekerjaan' | 'alamat' | 'ayah' | 'ibu' | 'wali' | 'berkas'>('pokok');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state initialized with all student fields
  const [formData, setFormData] = useState<Partial<Student>>({});

  useEffect(() => {
    if (student) {
      setFormData({
        // 1. Identitas Pokok
        name: student.name || (student as any).nama || '',
        nisn: student.nisn || '',
        nis: student.nis || (student as any).nopdkt || '',
        nik: student.nik || '',
        pob: student.pob || (student as any).tempatLahir || '',
        dob: student.dob || student.tanggalLahir || (student as any).tglLahir || '',
        gender: student.gender || (student as any).jenisKelamin || (student as any).jk || 'L',
        agama: student.agama || 'Islam',
        golonganDarah: student.golonganDarah || '-',
        anakKe: student.anakKe || '',
        saudara: student.saudara || '',
        tinggiBadan: student.tinggiBadan || '',
        beratBadan: student.beratBadan || '',
        hobi: student.hobi || '',
        prestasi: student.prestasi || '',
        catatanPenting: student.catatanPenting || '',

        // 2. Data Akademik
        class: student.class || (student as any).kelas || '',
        tahunMasuk: student.tahunMasuk || (student as any).TahunMasuk || '',
        tahunAjaran: student.tahunAjaran || '2026/2027',
        noPdkt: student.noPdkt || (student as any).nopdkt || '',
        status: student.status || 'AKTIF',
        sekolahAsal: student.sekolahAsal || '',
        ijazahNo: student.ijazahNo || student.skhun || '',

        // 3. Status Pekerjaan & Shift KTCT
        statusBekerja: student.statusBekerja || 'Tidak Bekerja',
        kelompokBelajar: student.kelompokBelajar || 'Tidak Bekerja',
        pekerjaanSiswa: student.pekerjaanSiswa || '',
        namaTempatKerja: student.namaTempatKerja || '',
        jamKerjaMulai: student.jamKerjaMulai || '',
        jamKerjaSelesai: student.jamKerjaSelesai || '',
        suratKeteranganKerjaUrl: student.suratKeteranganKerjaUrl || '',
        statusVerifikasiKerja: student.statusVerifikasiKerja || 'Belum Ada Bukti',

        // 4. Alamat & Kontak
        address: student.address || (student as any).alamat || '',
        rt: student.rt || (student as any).RT || '',
        rw: student.rw || (student as any).RW || '',
        kelurahan: student.kelurahan || (student as any).Kelurahan || (student as any).desa || '',
        kecamatan: student.kecamatan || (student as any).Kecamatan || '',
        kota: student.kota || (student as any).Kota || '',
        provinsi: student.provinsi || (student as any).Provinsi || 'DKI Jakarta',
        kodePos: student.kodePos || '',
        jenisTinggal: student.jenisTinggal || 'Bersama Orang Tua',
        alatTransportasi: student.alatTransportasi || 'Sepeda Motor',
        phone: student.phone || (student as any).noHp || (student as any).telepon || '',
        email: student.email || '',

        // 5. Data Ayah
        namaAyah: student.namaAyah || student.fatherName || '',
        nikAyah: student.nikAyah || '',
        tempatLahirAyah: student.tempatLahirAyah || '',
        tanggalLahirAyah: student.tanggalLahirAyah || '',
        pendidikanAyah: student.pendidikanAyah || '',
        pekerjaanAyah: student.pekerjaanAyah || student.fatherJob || '',
        penghasilanAyah: student.penghasilanAyah || '',
        tlpAyah: student.tlpAyah || student.parentPhone || '',
        statusAyah: student.statusAyah || 'Masih Hidup',

        // 6. Data Ibu
        namaIbu: student.namaIbu || (student as any).NamaIbu || '',
        nikIbu: student.nikIbu || '',
        tempatLahirIbu: student.tempatLahirIbu || '',
        tanggalLahirIbu: student.tanggalLahirIbu || '',
        pendidikanIbu: student.pendidikanIbu || '',
        pekerjaanIbu: student.pekerjaanIbu || student.motherJob || '',
        penghasilanIbu: student.penghasilanIbu || '',
        tlpIbu: student.tlpIbu || '',
        statusIbu: student.statusIbu || 'Masih Hidup',
        statusYatim: student.statusYatim || 'Lengkap',

        // 7. Data Wali
        namaWali: student.namaWali || '',
        tempatLahirWali: student.tempatLahirWali || '',
        tglLahirWali: student.tglLahirWali || '',
        pendidikanWali: student.pendidikanWali || '',
        pekerjaanWali: student.pekerjaanWali || '',
        penghasilanWali: student.penghasilanWali || '',
        hubunganWali: student.hubunganWali || '',
        tlpWali: student.tlpWali || '',

        // 8. Berkas & Dokumen
        noKk: student.noKk || (student as any).NoKK || '',
        penerimaKps: student.penerimaKps || 'Tidak',
        fotoUrl: student.fotoUrl || (student as any).pasFoto || '',
        aktaKelahiranUrl: student.aktaKelahiranUrl || (student as any).akteUrl || '',
        kartuKeluargaUrl: student.kartuKeluargaUrl || (student as any).kkUrl || '',
        ktpAyahUrl: student.ktpAyahUrl || '',
        ktpIbuUrl: student.ktpIbuUrl || '',
        ijazahUrl: student.ijazahUrl || '',
        raporUrl: student.raporUrl || (student as any).rapotUrl || '',
        dokumenLainUrl: student.dokumenLainUrl || student.berkasLainnyaUrl || ''
      });
    }
  }, [student]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Student, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.id) return;
    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const updatedData: Student = {
        ...student,
        ...formData,
        // Sinkronisasi nama & identitas pokok
        name: formData.name || student.name || (formData as any).nama || '',
        nama: formData.name || student.name || (formData as any).nama || '',
        panggilan: (formData as any).panggilan || student.panggilan || student.nickname || '',
        nickname: (formData as any).panggilan || student.nickname || student.panggilan || '',
        pob: formData.pob || student.pob || (student as any).tempatLahir || '',
        tempatLahir: formData.pob || student.pob || (student as any).tempatLahir || '',
        dob: formData.dob || student.dob || student.tanggalLahir || '',
        tanggalLahir: formData.dob || student.dob || student.tanggalLahir || '',
        gender: formData.gender || student.gender || 'L',
        jenisKelamin: formData.gender || student.gender || 'L',
        agama: formData.agama || student.agama || 'Islam',
        religion: formData.agama || student.agama || 'Islam',
        golonganDarah: formData.golonganDarah || student.golonganDarah || '-',
        bloodType: formData.golonganDarah || student.golonganDarah || '-',
        anakKe: formData.anakKe ?? student.anakKe ?? '',
        birthOrder: formData.anakKe ?? student.birthOrder ?? '',
        saudara: formData.saudara ?? student.saudara ?? '',
        siblingCount: formData.saudara ?? student.siblingCount ?? '',
        tinggiBadan: formData.tinggiBadan ?? student.tinggiBadan ?? '',
        height: formData.tinggiBadan ?? student.height ?? '',
        beratBadan: formData.beratBadan ?? student.beratBadan ?? '',
        weight: formData.beratBadan ?? student.weight ?? '',
        hobi: formData.hobi || student.hobi || '',
        hobby: formData.hobi || student.hobi || '',
        prestasi: formData.prestasi || student.prestasi || '',
        citaCita: formData.prestasi || student.citaCita || '',
        ambition: formData.prestasi || student.ambition || '',
        catatanPenting: formData.catatanPenting || student.catatanPenting || '',
        specialNeeds: formData.catatanPenting || student.specialNeeds || '',

        // Data Akademik
        class: formData.class || student.class || '',
        kelas: formData.class || student.class || '',
        tahunMasuk: formData.tahunMasuk || student.tahunMasuk || '',
        TahunMasuk: formData.tahunMasuk || student.tahunMasuk || '',
        entryYear: formData.tahunMasuk || student.tahunMasuk || '',
        tahunAjaran: formData.tahunAjaran || student.tahunAjaran || '2026/2027',
        academicYear: formData.tahunAjaran || student.tahunAjaran || '2026/2027',
        noPdkt: formData.noPdkt || student.noPdkt || '',
        nopdkt: formData.noPdkt || student.noPdkt || '',
        status: formData.status || student.status || 'AKTIF',
        sekolahAsal: formData.sekolahAsal || student.sekolahAsal || '',
        previousSchool: formData.sekolahAsal || student.sekolahAsal || '',
        ijazahNo: formData.ijazahNo || student.ijazahNo || '',
        skhun: formData.ijazahNo || student.skhun || '',
        diplomaNumber: formData.ijazahNo || student.diplomaNumber || '',

        // Status Bekerja & Shift KTCT
        statusBekerja: formData.statusBekerja || student.statusBekerja || 'Tidak Bekerja',
        workingStatus: formData.statusBekerja || student.statusBekerja || 'Tidak Bekerja',
        kelompokBelajar: formData.kelompokBelajar || student.kelompokBelajar || 'Tidak Bekerja',
        shiftBelajar: formData.kelompokBelajar || student.kelompokBelajar || 'Tidak Bekerja',
        workShift: formData.kelompokBelajar || student.kelompokBelajar || 'Tidak Bekerja',
        pekerjaanSiswa: formData.pekerjaanSiswa || student.pekerjaanSiswa || '',
        jenisPekerjaan: formData.pekerjaanSiswa || student.jenisPekerjaan || '',
        workPosition: formData.pekerjaanSiswa || student.workPosition || '',
        namaTempatKerja: formData.namaTempatKerja || student.namaTempatKerja || '',
        workPlace: formData.namaTempatKerja || student.workPlace || '',
        jamKerja: formData.jamKerjaMulai ? `${formData.jamKerjaMulai} - ${formData.jamKerjaSelesai || ''}` : (student.jamKerja || student.workHours || ''),
        workHours: formData.jamKerjaMulai ? `${formData.jamKerjaMulai} - ${formData.jamKerjaSelesai || ''}` : (student.jamKerja || student.workHours || ''),
        suratKeteranganKerjaUrl: formData.suratKeteranganKerjaUrl || student.suratKeteranganKerjaUrl || '',
        buktiSuratKerjaUrl: formData.suratKeteranganKerjaUrl || student.buktiSuratKerjaUrl || '',
        workCertificateUrl: formData.suratKeteranganKerjaUrl || student.workCertificateUrl || '',
        statusVerifikasiKerja: formData.statusVerifikasiKerja || student.statusVerifikasiKerja || 'Belum Ada Bukti',
        workVerificationStatus: formData.statusVerifikasiKerja || student.statusVerifikasiKerja || 'Belum Ada Bukti',

        // Alamat & Kontak
        address: formData.address || student.address || '',
        alamat: formData.address || student.alamat || '',
        rt: formData.rt || student.rt || '',
        rw: formData.rw || student.rw || '',
        kelurahan: formData.kelurahan || student.kelurahan || '',
        desa: formData.kelurahan || student.desa || '',
        village: formData.kelurahan || student.village || '',
        kecamatan: formData.kecamatan || student.kecamatan || '',
        district: formData.kecamatan || student.district || '',
        kota: formData.kota || student.kota || '',
        kabupaten: formData.kota || student.kabupaten || '',
        city: formData.kota || student.city || '',
        provinsi: formData.provinsi || student.provinsi || 'DKI Jakarta',
        province: formData.provinsi || student.province || 'DKI Jakarta',
        kodePos: formData.kodePos || student.kodePos || '',
        postalCode: formData.kodePos || student.postalCode || '',
        jenisTinggal: formData.jenisTinggal || student.jenisTinggal || 'Bersama Orang Tua',
        residenceType: formData.jenisTinggal || student.residenceType || 'Bersama Orang Tua',
        alatTransportasi: formData.alatTransportasi || student.alatTransportasi || 'Sepeda Motor',
        transportasi: formData.alatTransportasi || student.transportasi || 'Sepeda Motor',
        transportation: formData.alatTransportasi || student.transportation || 'Sepeda Motor',
        phone: formData.phone || student.phone || '',
        noHp: formData.phone || student.noHp || '',
        email: formData.email || student.email || '',

        // Data Ayah
        namaAyah: formData.namaAyah || student.namaAyah || student.fatherName || '',
        fatherName: formData.namaAyah || student.fatherName || student.namaAyah || '',
        nikAyah: formData.nikAyah || student.nikAyah || '',
        fatherNik: formData.nikAyah || student.fatherNik || '',
        tempatLahirAyah: formData.tempatLahirAyah || student.tempatLahirAyah || '',
        tanggalLahirAyah: formData.tanggalLahirAyah || student.tanggalLahirAyah || '',
        fatherBirth: (formData.tempatLahirAyah || formData.tanggalLahirAyah) ? `${formData.tempatLahirAyah || ''} ${formData.tanggalLahirAyah || ''}`.trim() : (student.fatherBirth || ''),
        pendidikanAyah: formData.pendidikanAyah || student.pendidikanAyah || '',
        fatherEducation: formData.pendidikanAyah || student.fatherEducation || '',
        pekerjaanAyah: formData.pekerjaanAyah || student.pekerjaanAyah || student.fatherJob || '',
        fatherJob: formData.pekerjaanAyah || student.fatherJob || student.pekerjaanAyah || '',
        penghasilanAyah: formData.penghasilanAyah || student.penghasilanAyah || '',
        fatherIncome: formData.penghasilanAyah || student.fatherIncome || '',
        tlpAyah: formData.tlpAyah || student.tlpAyah || student.parentPhone || '',
        fatherPhone: formData.tlpAyah || student.fatherPhone || student.tlpAyah || '',
        parentPhone: formData.tlpAyah || student.parentPhone || '',
        statusAyah: formData.statusAyah || student.statusAyah || 'Masih Hidup',
        fatherStatus: formData.statusAyah || student.fatherStatus || 'Masih Hidup',

        // Data Ibu
        namaIbu: formData.namaIbu || student.namaIbu || (student as any).NamaIbu || '',
        NamaIbu: formData.namaIbu || student.namaIbu || (student as any).NamaIbu || '',
        motherName: formData.namaIbu || student.motherName || student.namaIbu || '',
        nikIbu: formData.nikIbu || student.nikIbu || '',
        motherNik: formData.nikIbu || student.motherNik || '',
        tempatLahirIbu: formData.tempatLahirIbu || student.tempatLahirIbu || '',
        tanggalLahirIbu: formData.tanggalLahirIbu || student.tanggalLahirIbu || '',
        motherBirth: (formData.tempatLahirIbu || formData.tanggalLahirIbu) ? `${formData.tempatLahirIbu || ''} ${formData.tanggalLahirIbu || ''}`.trim() : (student.motherBirth || ''),
        pendidikanIbu: formData.pendidikanIbu || student.pendidikanIbu || '',
        motherEducation: formData.pendidikanIbu || student.motherEducation || '',
        pekerjaanIbu: formData.pekerjaanIbu || student.pekerjaanIbu || student.motherJob || '',
        motherJob: formData.pekerjaanIbu || student.motherJob || student.pekerjaanIbu || '',
        penghasilanIbu: formData.penghasilanIbu || student.penghasilanIbu || '',
        motherIncome: formData.penghasilanIbu || student.motherIncome || '',
        tlpIbu: formData.tlpIbu || student.tlpIbu || '',
        motherPhone: formData.tlpIbu || student.motherPhone || '',
        statusIbu: formData.statusIbu || student.statusIbu || 'Masih Hidup',
        motherStatus: formData.statusIbu || student.motherStatus || 'Masih Hidup',
        statusYatim: formData.statusYatim || student.statusYatim || 'Lengkap',
        orphanStatus: formData.statusYatim || student.orphanStatus || 'Lengkap',

        // Data Wali
        namaWali: formData.namaWali || student.namaWali || '',
        guardianName: formData.namaWali || student.guardianName || '',
        nikWali: formData.nikWali || student.nikWali || '',
        guardianNik: formData.nikWali || student.guardianNik || '',
        tempatLahirWali: formData.tempatLahirWali || student.tempatLahirWali || '',
        tglLahirWali: formData.tglLahirWali || student.tglLahirWali || '',
        pendidikanWali: formData.pendidikanWali || student.pendidikanWali || '',
        guardianEducation: formData.pendidikanWali || student.guardianEducation || '',
        pekerjaanWali: formData.pekerjaanWali || student.pekerjaanWali || '',
        guardianJob: formData.pekerjaanWali || student.guardianJob || '',
        penghasilanWali: formData.penghasilanWali || student.penghasilanWali || '',
        guardianIncome: formData.penghasilanWali || student.guardianIncome || '',
        hubunganWali: formData.hubunganWali || student.hubunganWali || '',
        guardianRelation: formData.hubunganWali || student.guardianRelation || '',
        tlpWali: formData.tlpWali || student.tlpWali || '',
        guardianPhone: formData.tlpWali || student.guardianPhone || '',

        // Berkas & Dokumen
        noKk: formData.noKk || student.noKk || '',
        NoKK: formData.noKk || student.noKk || '',
        kkNumber: formData.noKk || student.kkNumber || '',
        penerimaKps: formData.penerimaKps || student.penerimaKps || 'Tidak',
        fotoUrl: formData.fotoUrl || student.fotoUrl || '',
        pasFoto: formData.fotoUrl || student.pasFoto || '',
        aktaKelahiranUrl: formData.aktaKelahiranUrl || student.aktaKelahiranUrl || '',
        akteUrl: formData.aktaKelahiranUrl || student.akteUrl || '',
        aktaUrl: formData.aktaKelahiranUrl || student.aktaUrl || '',
        birthCertUrl: formData.aktaKelahiranUrl || student.birthCertUrl || '',
        kartuKeluargaUrl: formData.kartuKeluargaUrl || student.kartuKeluargaUrl || '',
        kkUrl: formData.kartuKeluargaUrl || student.kkUrl || '',
        ktpAyahUrl: formData.ktpAyahUrl || student.ktpAyahUrl || '',
        fatherKtpUrl: formData.ktpAyahUrl || student.fatherKtpUrl || '',
        ktpIbuUrl: formData.ktpIbuUrl || student.ktpIbuUrl || '',
        motherKtpUrl: formData.ktpIbuUrl || student.motherKtpUrl || '',
        ijazahUrl: formData.ijazahUrl || student.ijazahUrl || '',
        diplomaUrl: formData.ijazahUrl || student.diplomaUrl || '',
        raporUrl: formData.raporUrl || student.raporUrl || '',
        rapotUrl: formData.raporUrl || student.rapotUrl || '',
        reportCardUrl: formData.raporUrl || student.reportCardUrl || '',
        dokumenLainUrl: formData.dokumenLainUrl || student.dokumenLainUrl || '',
        berkasLainnyaUrl: formData.dokumenLainUrl || student.berkasLainnyaUrl || '',
        otherDocUrl: formData.dokumenLainUrl || student.otherDocUrl || '',

        updatedAt: nowIso
      };

      // 1. Update state through Zustand store
      if (updateStudent) {
        updateStudent(student.id, updatedData);
      }

      // 2. Update students table in db
      const allStudents = (db.get('students') as any[]) || [];
      const updatedStudents = allStudents.map(s => s.id === student.id ? { ...s, ...updatedData } : s);
      db.set('students', updatedStudents);

      // 3. Update siswa_rombel table in db
      const allRombel = (db.get('siswa_rombel') as any[]) || [];
      const updatedRombel = allRombel.map(s => (s.id === student.id || s.nisn === student.nisn) ? { ...s, ...updatedData } : s);
      db.set('siswa_rombel', updatedRombel);

      // 4. Trigger auto-sync engine to sync changes into Google Spreadsheet sheet SISWA & DAPODIK_VALIDASI
      if (typeof window !== 'undefined' && (window as any).__erpAutoSyncEngine?.queueDbKey) {
        (window as any).__erpAutoSyncEngine.queueDbKey('students');
      }

      onSaved(updatedData);

      await Swal.fire({
        icon: 'success',
        title: 'Biodata Berhasil Disimpan!',
        text: 'Data biodata siswa telah diperbarui dan otomatis disinkronkan ke database / sheet siswa.',
        confirmButtonColor: '#4f46e5',
        timer: 2000
      });

      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err?.message || 'Terjadi kesalahan saat menyimpan biodata.',
        confirmButtonColor: '#e11d48'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const SECTIONS = [
    { id: 'pokok', label: '1. Identitas Pokok', icon: User },
    { id: 'akademik', label: '2. Akademik & Rombel', icon: BookOpen },
    { id: 'pekerjaan', label: '3. Status Kerja & Shift', icon: Briefcase },
    { id: 'alamat', label: '4. Alamat & Kontak', icon: MapPin },
    { id: 'ayah', label: '5. Data Ayah', icon: Users },
    { id: 'ibu', label: '6. Data Ibu', icon: Users },
    { id: 'wali', label: '7. Data Wali', icon: Users },
    { id: 'berkas', label: '8. Berkas & Dokumen', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Edit Biodata Lengkap Siswa</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                  Auto-Sync Sheet
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {student.name} • NISN: {student.nisn || student.nis || '-'} • Kelas {student.class}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSection(s.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80'
                }`}
              >
                <Icon size={14} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Content Area */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. IDENTITAS POKOK */}
          {activeSection === 'pokok' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-900">
                <Sparkles size={16} className="text-indigo-600 shrink-0" />
                <span>Identitas pokok terhubung langsung dengan Data Pokok Pendidikan (Dapodik) Kemendikbudristek.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">NISN (10 Digit) *</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.nisn || ''}
                    onChange={(e) => handleChange('nisn', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">NIS / No. Induk Lokal</label>
                  <input
                    type="text"
                    value={formData.nis || ''}
                    onChange={(e) => handleChange('nis', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">NIK Siswa (16 Digit KTP/KK)</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.nik || ''}
                    onChange={(e) => handleChange('nik', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.pob || ''}
                    onChange={(e) => handleChange('pob', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.dob || ''}
                    onChange={(e) => handleChange('dob', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Jenis Kelamin</label>
                  <select
                    value={formData.gender || 'L'}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Agama</label>
                  <select
                    value={formData.agama || 'Islam'}
                    onChange={(e) => handleChange('agama', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Golongan Darah</label>
                  <select
                    value={formData.golonganDarah || '-'}
                    onChange={(e) => handleChange('golonganDarah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="-">-</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Anak Ke-</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.anakKe || ''}
                    onChange={(e) => handleChange('anakKe', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Jumlah Saudara Kandung</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.saudara || ''}
                    onChange={(e) => handleChange('saudara', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tinggi Badan (cm)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 165"
                    value={formData.tinggiBadan || ''}
                    onChange={(e) => handleChange('tinggiBadan', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Berat Badan (kg)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 55"
                    value={formData.beratBadan || ''}
                    onChange={(e) => handleChange('beratBadan', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Hobi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Membaca, Olahraga"
                    value={formData.hobi || ''}
                    onChange={(e) => handleChange('hobi', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Cita-Cita / Prestasi Utama</label>
                  <input
                    type="text"
                    placeholder="Contoh: Wirausaha, Programmer"
                    value={formData.prestasi || ''}
                    onChange={(e) => handleChange('prestasi', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold text-slate-700">Catatan Khusus / Riwayat Medis / Keistimewaan</label>
                  <textarea
                    rows={2}
                    placeholder="Tulis catatan jika siswa memiliki alergi, berkebutuhan khusus, atau informasi penting lainnya..."
                    value={formData.catatanPenting || ''}
                    onChange={(e) => handleChange('catatanPenting', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. AKADEMIK & ROMBEL */}
          {activeSection === 'akademik' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kelas / Rombel Belajar *</label>
                  <input
                    type="text"
                    required
                    value={formData.class || ''}
                    onChange={(e) => handleChange('class', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tahun Masuk Siswa</label>
                  <input
                    type="text"
                    placeholder="Contoh: 2026"
                    value={formData.tahunMasuk || ''}
                    onChange={(e) => handleChange('tahunMasuk', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tahun Ajaran Aktif</label>
                  <input
                    type="text"
                    value={formData.tahunAjaran || '2026/2027'}
                    onChange={(e) => handleChange('tahunAjaran', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">No. Registrasi / PDKT</label>
                  <input
                    type="text"
                    value={formData.noPdkt || ''}
                    onChange={(e) => handleChange('noPdkt', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status Keaktifan Siswa</label>
                  <select
                    value={formData.status || 'AKTIF'}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="TIDAK AKTIF">TIDAK AKTIF</option>
                    <option value="PINDAH">PINDAH</option>
                    <option value="LULUS">LULUS</option>
                    <option value="DROP_OUT">DROP OUT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Sekolah Asal</label>
                  <input
                    type="text"
                    placeholder="Nama Sekolah Sebelumnya"
                    value={formData.sekolahAsal || ''}
                    onChange={(e) => handleChange('sekolahAsal', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Nomor Seri Ijazah Sebelumnya / SKHUN</label>
                  <input
                    type="text"
                    placeholder="Contoh: DN-01/D-SD/13/0012345"
                    value={formData.ijazahNo || ''}
                    onChange={(e) => handleChange('ijazahNo', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. STATUS PEKERJAAN & SHIFT KTCT */}
          {activeSection === 'pekerjaan' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Ketentuan Shift Belajar KTCT:</span>
                  <p className="mt-0.5 text-amber-800">
                    Siswa berstatus <strong>Aktif Bekerja</strong> belajar pada <strong>Shift Malam (Senin, Rabu, Minggu)</strong>. Siswa <strong>Tidak Bekerja</strong> belajar pada <strong>Shift Siang (Senin, Kamis, Minggu)</strong>. Wajib melampirkan surat bukti kerja resmi untuk verifikasi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status Pekerjaan Siswa</label>
                  <select
                    value={formData.statusBekerja || 'Tidak Bekerja'}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChange('statusBekerja', val);
                      handleChange('kelompokBelajar', val);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Tidak Bekerja">Tidak Bekerja (Shift Siang: Sen, Kam, Min)</option>
                    <option value="Aktif Bekerja">Aktif Bekerja (Shift Malam: Sen, Rab, Min)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kelompok Shift Belajar</label>
                  <select
                    value={formData.kelompokBelajar || 'Tidak Bekerja'}
                    onChange={(e) => handleChange('kelompokBelajar', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Tidak Bekerja">Shift Siang (13:00 - 16:30)</option>
                    <option value="Aktif Bekerja">Shift Malam (18:30 - 21:00)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Instansi / Tempat Bekerja</label>
                  <input
                    type="text"
                    placeholder="Contoh: PT Sumber Makmur, Toko Berkah"
                    value={formData.namaTempatKerja || ''}
                    onChange={(e) => handleChange('namaTempatKerja', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Posisi / Jenis Pekerjaan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Karyawan Toko, Operator Pabrik, Kasir"
                    value={formData.pekerjaanSiswa || ''}
                    onChange={(e) => handleChange('pekerjaanSiswa', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Jam Mulai Kerja</label>
                  <input
                    type="time"
                    value={formData.jamKerjaMulai || ''}
                    onChange={(e) => handleChange('jamKerjaMulai', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Jam Selesai Kerja</label>
                  <input
                    type="time"
                    value={formData.jamKerjaSelesai || ''}
                    onChange={(e) => handleChange('jamKerjaSelesai', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Tautan Surat Keterangan Kerja / ID Card (Google Drive)</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/file/d/..."
                    value={formData.suratKeteranganKerjaUrl || ''}
                    onChange={(e) => handleChange('suratKeteranganKerjaUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status Verifikasi Dokumen Kerja</label>
                  <select
                    value={formData.statusVerifikasiKerja || 'Belum Ada Bukti'}
                    onChange={(e) => handleChange('statusVerifikasiKerja', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Belum Ada Bukti">Belum Ada Bukti</option>
                    <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                    <option value="Terverifikasi">Terverifikasi</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 4. ALAMAT & KONTAK */}
          {activeSection === 'alamat' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold text-slate-700">Alamat Lengkap (Jalan / Gang / No. Rumah)</label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">RT (Angka murni)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 005"
                    value={formData.rt || ''}
                    onChange={(e) => handleChange('rt', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">RW (Angka murni)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 002"
                    value={formData.rw || ''}
                    onChange={(e) => handleChange('rw', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kelurahan / Desa</label>
                  <input
                    type="text"
                    value={formData.kelurahan || ''}
                    onChange={(e) => handleChange('kelurahan', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kecamatan</label>
                  <input
                    type="text"
                    value={formData.kecamatan || ''}
                    onChange={(e) => handleChange('kecamatan', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={formData.kota || ''}
                    onChange={(e) => handleChange('kota', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Provinsi</label>
                  <input
                    type="text"
                    value={formData.provinsi || 'DKI Jakarta'}
                    onChange={(e) => handleChange('provinsi', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kode Pos</label>
                  <input
                    type="text"
                    value={formData.kodePos || ''}
                    onChange={(e) => handleChange('kodePos', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Jenis Tinggal</label>
                  <select
                    value={formData.jenisTinggal || 'Bersama Orang Tua'}
                    onChange={(e) => handleChange('jenisTinggal', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                    <option value="Wali">Wali</option>
                    <option value="Kos">Kos</option>
                    <option value="Asrama">Asrama</option>
                    <option value="Panti Asuhan">Panti Asuhan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Alat Transportasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jalan Kaki, Sepeda Motor, Angkot"
                    value={formData.alatTransportasi || ''}
                    onChange={(e) => handleChange('alatTransportasi', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">No. HP / WhatsApp Siswa *</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Siswa</label>
                  <input
                    type="email"
                    placeholder="nama@email.com"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. DATA AYAH KANDUNG */}
          {activeSection === 'ayah' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Lengkap Ayah</label>
                  <input
                    type="text"
                    value={formData.namaAyah || ''}
                    onChange={(e) => handleChange('namaAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">NIK Ayah (16 Digit)</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.nikAyah || ''}
                    onChange={(e) => handleChange('nikAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status Keberadaan Ayah</label>
                  <select
                    value={formData.statusAyah || 'Masih Hidup'}
                    onChange={(e) => handleChange('statusAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Masih Hidup">Masih Hidup</option>
                    <option value="Meninggal">Meninggal Dunia</option>
                    <option value="Tidak Diketahui">Tidak Diketahui</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tempat Lahir Ayah</label>
                  <input
                    type="text"
                    value={formData.tempatLahirAyah || ''}
                    onChange={(e) => handleChange('tempatLahirAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tanggal Lahir Ayah</label>
                  <input
                    type="date"
                    value={formData.tanggalLahirAyah || ''}
                    onChange={(e) => handleChange('tanggalLahirAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Pendidikan Terakhir Ayah</label>
                  <select
                    value={formData.pendidikanAyah || ''}
                    onChange={(e) => handleChange('pendidikanAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="">Pilih Pendidikan...</option>
                    <option value="Tidak Sekolah">Tidak Sekolah</option>
                    <option value="SD / Sederajat">SD / Sederajat</option>
                    <option value="SMP / Sederajat">SMP / Sederajat</option>
                    <option value="SMA / SMK / Sederajat">SMA / SMK / Sederajat</option>
                    <option value="D1 / D2 / D3">D1 / D2 / D3</option>
                    <option value="S1 / D4">S1 / D4</option>
                    <option value="S2 / S3">S2 / S3</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Pekerjaan Ayah</label>
                  <input
                    type="text"
                    placeholder="Contoh: Wiraswasta, Buruh, PNS"
                    value={formData.pekerjaanAyah || ''}
                    onChange={(e) => handleChange('pekerjaanAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Penghasilan Bulanan Ayah</label>
                  <select
                    value={formData.penghasilanAyah || ''}
                    onChange={(e) => handleChange('penghasilanAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="">Pilih Penghasilan...</option>
                    <option value="Kurang dari Rp 500.000">Kurang dari Rp 500.000</option>
                    <option value="Rp 500.000 - Rp 999.999">Rp 500.000 - Rp 999.999</option>
                    <option value="Rp 1.000.000 - Rp 1.999.999">Rp 1.000.000 - Rp 1.999.999</option>
                    <option value="Rp 2.000.000 - Rp 4.999.999">Rp 2.000.000 - Rp 4.999.999</option>
                    <option value="Rp 5.000.000 - Rp 20.000.000">Rp 5.000.000 - Rp 20.000.000</option>
                    <option value="Lebih dari Rp 20.000.000">Lebih dari Rp 20.000.000</option>
                    <option value="Tidak Berpenghasilan">Tidak Berpenghasilan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">No. HP / WhatsApp Ayah</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={formData.tlpAyah || ''}
                    onChange={(e) => handleChange('tlpAyah', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 6. DATA IBU KANDUNG */}
          {activeSection === 'ibu' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Lengkap Ibu Kandung *</label>
                  <input
                    type="text"
                    value={formData.namaIbu || ''}
                    onChange={(e) => handleChange('namaIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">NIK Ibu (16 Digit)</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.nikIbu || ''}
                    onChange={(e) => handleChange('nikIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status Keberadaan Ibu</label>
                  <select
                    value={formData.statusIbu || 'Masih Hidup'}
                    onChange={(e) => handleChange('statusIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Masih Hidup">Masih Hidup</option>
                    <option value="Meninggal">Meninggal Dunia</option>
                    <option value="Tidak Diketahui">Tidak Diketahui</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Status Yatim / Piatu</label>
                  <select
                    value={formData.statusYatim || 'Lengkap'}
                    onChange={(e) => handleChange('statusYatim', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Lengkap">Orang Tua Lengkap</option>
                    <option value="Yatim">Yatim (Ayah Meninggal)</option>
                    <option value="Piatu">Piatu (Ibu Meninggal)</option>
                    <option value="Yatim Piatu">Yatim Piatu (Kedua Meninggal)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tempat Lahir Ibu</label>
                  <input
                    type="text"
                    value={formData.tempatLahirIbu || ''}
                    onChange={(e) => handleChange('tempatLahirIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tanggal Lahir Ibu</label>
                  <input
                    type="date"
                    value={formData.tanggalLahirIbu || ''}
                    onChange={(e) => handleChange('tanggalLahirIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Pendidikan Terakhir Ibu</label>
                  <select
                    value={formData.pendidikanIbu || ''}
                    onChange={(e) => handleChange('pendidikanIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="">Pilih Pendidikan...</option>
                    <option value="Tidak Sekolah">Tidak Sekolah</option>
                    <option value="SD / Sederajat">SD / Sederajat</option>
                    <option value="SMP / Sederajat">SMP / Sederajat</option>
                    <option value="SMA / SMK / Sederajat">SMA / SMK / Sederajat</option>
                    <option value="D1 / D2 / D3">D1 / D2 / D3</option>
                    <option value="S1 / D4">S1 / D4</option>
                    <option value="S2 / S3">S2 / S3</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Pekerjaan Ibu</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ibu Rumah Tangga, Pedagang"
                    value={formData.pekerjaanIbu || ''}
                    onChange={(e) => handleChange('pekerjaanIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Penghasilan Bulanan Ibu</label>
                  <select
                    value={formData.penghasilanIbu || ''}
                    onChange={(e) => handleChange('penghasilanIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="">Pilih Penghasilan...</option>
                    <option value="Tidak Berpenghasilan">Tidak Berpenghasilan / IRT</option>
                    <option value="Kurang dari Rp 500.000">Kurang dari Rp 500.000</option>
                    <option value="Rp 500.000 - Rp 999.999">Rp 500.000 - Rp 999.999</option>
                    <option value="Rp 1.000.000 - Rp 1.999.999">Rp 1.000.000 - Rp 1.999.999</option>
                    <option value="Rp 2.000.000 - Rp 4.999.999">Rp 2.000.000 - Rp 4.999.999</option>
                    <option value="Rp 5.000.000 - Rp 20.000.000">Rp 5.000.000 - Rp 20.000.000</option>
                    <option value="Lebih dari Rp 20.000.000">Lebih dari Rp 20.000.000</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">No. HP / WhatsApp Ibu</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={formData.tlpIbu || ''}
                    onChange={(e) => handleChange('tlpIbu', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 7. DATA WALI SISWA */}
          {activeSection === 'wali' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600">
                Data wali diisi apabila siswa tidak tinggal bersama orang tua kandung atau diwakilkan oleh keluarga lain.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Lengkap Wali</label>
                  <input
                    type="text"
                    placeholder="Nama Wali Murid"
                    value={formData.namaWali || ''}
                    onChange={(e) => handleChange('namaWali', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Hubungan dengan Siswa</label>
                  <input
                    type="text"
                    placeholder="Contoh: Paman, Kakek, Kakak Kandung"
                    value={formData.hubunganWali || ''}
                    onChange={(e) => handleChange('hubunganWali', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Pekerjaan Wali</label>
                  <input
                    type="text"
                    placeholder="Pekerjaan Wali"
                    value={formData.pekerjaanWali || ''}
                    onChange={(e) => handleChange('pekerjaanWali', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Pendidikan Terakhir Wali</label>
                  <select
                    value={formData.pendidikanWali || ''}
                    onChange={(e) => handleChange('pendidikanWali', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="">Pilih Pendidikan...</option>
                    <option value="SD / Sederajat">SD / Sederajat</option>
                    <option value="SMP / Sederajat">SMP / Sederajat</option>
                    <option value="SMA / SMK / Sederajat">SMA / SMK / Sederajat</option>
                    <option value="D1 / D2 / D3">D1 / D2 / D3</option>
                    <option value="S1 / D4">S1 / D4</option>
                    <option value="S2 / S3">S2 / S3</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Penghasilan Bulanan Wali</label>
                  <input
                    type="text"
                    placeholder="Penghasilan Wali"
                    value={formData.penghasilanWali || ''}
                    onChange={(e) => handleChange('penghasilanWali', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">No. HP / Telepon Wali</label>
                  <input
                    type="text"
                    placeholder="08xxxxxxxxxx"
                    value={formData.tlpWali || ''}
                    onChange={(e) => handleChange('tlpWali', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 8. BERKAS & DOKUMEN DIGITAL */}
          {activeSection === 'berkas' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-900">
                Tautan berkas tersimpan aman di Google Drive sekolah / cloud storage. Masukkan link publik viewable atau link Drive.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">No. Kartu Keluarga (KK 16 Digit)</label>
                  <input
                    type="text"
                    maxLength={16}
                    value={formData.noKk || ''}
                    onChange={(e) => handleChange('noKk', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Penerima Bantuan KPS / KIP / PIP / PKH</label>
                  <select
                    value={formData.penerimaKps || 'Tidak'}
                    onChange={(e) => handleChange('penerimaKps', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="Tidak">Tidak</option>
                    <option value="Ya - KIP">Ya - Pemegang Kartu Indonesia Pintar (KIP)</option>
                    <option value="Ya - KPS">Ya - Kartu Perlindungan Sosial (KPS)</option>
                    <option value="Ya - PKH">Ya - Program Keluarga Harapan (PKH)</option>
                    <option value="Ya - KJP">Ya - Kartu Jakarta Pintar (KJP)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Link Pas Foto Resmi Siswa</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.fotoUrl || ''}
                    onChange={(e) => handleChange('fotoUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Link Akta Kelahiran</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.aktaKelahiranUrl || ''}
                    onChange={(e) => handleChange('aktaKelahiranUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Link Kartu Keluarga (KK)</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.kartuKeluargaUrl || ''}
                    onChange={(e) => handleChange('kartuKeluargaUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Link KTP Ayah</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.ktpAyahUrl || ''}
                    onChange={(e) => handleChange('ktpAyahUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Link KTP Ibu</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.ktpIbuUrl || ''}
                    onChange={(e) => handleChange('ktpIbuUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Link Ijazah / SKL</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.ijazahUrl || ''}
                    onChange={(e) => handleChange('ijazahUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Link Rapor Sebelumnya</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.raporUrl || ''}
                    onChange={(e) => handleChange('raporUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Link Dokumen Pendukung Lainnya</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.dokumenLainUrl || ''}
                    onChange={(e) => handleChange('dokumenLainUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Perubahan otomatis tersimpan ke memori lokal & antrean sinkronisasi spreadsheet.
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-200 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Save size={16} />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
