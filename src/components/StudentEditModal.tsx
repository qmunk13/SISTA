import React, { useState, useRef } from 'react';
import {
  X,
  User,
  MapPin,
  GraduationCap,
  Users,
  FileCheck,
  Camera,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { StudentProfile, JenjangType } from '../types';

export interface StudentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  onSave: (updated: StudentProfile) => void;
  role?: 'student' | 'parent' | 'admin';
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
];

export const StudentEditModal: React.FC<StudentEditModalProps> = ({
  isOpen,
  onClose,
  student,
  onSave,
  role = 'student',
}) => {
  const [activeTab, setActiveTab] = useState<'IDENTITAS' | 'ALAMAT' | 'AKADEMIK' | 'KELUARGA' | 'BERKAS'>('IDENTITAS');
  const [formData, setFormData] = useState<StudentProfile>({ ...student });
  const [photoError, setPhotoError] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync formData whenever modal opens with new student
  React.useEffect(() => {
    if (isOpen) {
      setFormData({ ...student });
      setSavedSuccess(false);
      setPhotoError(false);
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  // Handle local file upload and resize via Canvas
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormData((prev) => ({
            ...prev,
            linkFoto: compressedDataUrl,
            pasFoto: compressedDataUrl,
          }));
          setPhotoError(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalNama = (formData.namaLengkap || formData.nama || '').trim();
    if (!finalNama) return;

    const updated: StudentProfile = {
      ...formData,
      nama: finalNama,
      namaLengkap: finalNama,
      linkFoto: formData.linkFoto?.trim() || formData.pasFoto?.trim() || '',
      pasFoto: formData.linkFoto?.trim() || formData.pasFoto?.trim() || '',
      waliMurid: formData.namaAyah || formData.namaIbu || formData.namaWali || formData.waliMurid || '',
      teleponWali: formData.tlpAyah || formData.tlpIbu || formData.tlpWali || formData.nomorHP || formData.teleponWali || '',
    };

    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const getRoleTitle = () => {
    if (role === 'parent') return 'Perbarui Biodata Anak & Data Keluarga';
    if (role === 'admin') return 'Edit Data Siswa & Buku Induk';
    return 'Perbarui Biodata Diri Siswa';
  };

  const getRoleSubtitle = () => {
    if (role === 'parent') {
      return 'Lengkapi informasi putra/putri serta data kontak orang tua / wali untuk kelengkapan administrasi sekolah.';
    }
    if (role === 'admin') {
      return 'Manajemen lengkap profil siswa dan kelengkapan berkas Buku Induk Pokok.';
    }
    return 'Pastikan data pribadi, nomor kontak, tempat tanggal lahir, dan alamat Anda selalu akurat dan terbaru.';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-t-3xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {getRoleTitle()}
                </h2>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {role === 'parent' ? 'Orang Tua' : role === 'student' ? 'Siswa CBT' : 'Admin'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                {getRoleSubtitle()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto scrollbar-none px-4 sm:px-6">
          {[
            { id: 'IDENTITAS', label: '1. Identitas & Fisik', icon: User },
            { id: 'ALAMAT', label: '2. Alamat & Kontak', icon: MapPin },
            { id: 'AKADEMIK', label: '3. Riwayat & Bantuan', icon: GraduationCap },
            { id: 'KELUARGA', label: '4. Keluarga & Wali', icon: Users },
            { id: 'BERKAS', label: '5. Dokumen Persyaratan', icon: FileCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3 sm:px-4 font-bold text-xs flex items-center gap-2 border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form Body */}
        <form id="studentEditForm" onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs text-white">
          {savedSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Data berhasil disimpan dan disinkronkan ke seluruh sistem! Menutup...</span>
            </div>
          )}

          {/* TAB 1: IDENTITAS & FISIK */}
          {activeTab === 'IDENTITAS' && (
            <div className="space-y-4">
              {/* Photo & Basic Credentials */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0 text-center">
                  <img
                    src={photoError || !formData.linkFoto ? AVATAR_PRESETS[0] : formData.linkFoto}
                    alt={formData.nama}
                    onError={() => setPhotoError(true)}
                    className="w-24 h-24 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-xl"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-[11px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-1 mx-auto shadow"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Ganti Foto</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold block">Pilih Avatar Siap Pakai atau Masukkan URL Foto</label>
                    <span className="text-[10px] text-slate-500">Mendukung upload dari HP/Laptop</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {AVATAR_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, linkFoto: preset, pasFoto: preset });
                          setPhotoError(false);
                        }}
                        className={`w-9 h-9 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                          formData.linkFoto === preset ? 'border-indigo-500 ring-2 ring-indigo-400' : 'border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={preset} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <input
                    type="url"
                    placeholder="Atau tempelkan tautan URL gambar (https://...)"
                    value={formData.linkFoto || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, linkFoto: e.target.value, pasFoto: e.target.value });
                      setPhotoError(false);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* NISN & NOPDKT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.nisn}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-mono font-bold cursor-not-allowed opacity-80"
                  />
                  <span className="text-[10px] text-indigo-400 mt-0.5 block">Terkunci sebagai ID Login Akun CBT</span>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    NOPDKT (Nomor Induk KTCT)
                  </label>
                  <input
                    type="text"
                    placeholder="KTCT-2025-..."
                    value={formData.nopdkt || `KTCT-${formData.tahunMasuk || '2025'}-${formData.nisn.slice(-4)}`}
                    onChange={(e) => setFormData({ ...formData, nopdkt: e.target.value })}
                    disabled={role === 'student'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tahun Masuk</label>
                  <input
                    type="text"
                    value={formData.tahunMasuk || '2025'}
                    onChange={(e) => setFormData({ ...formData, tahunMasuk: e.target.value })}
                    disabled={role === 'student'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Nama Lengkap & Jenis Kelamin */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-bold mb-1">
                    Nama Lengkap Siswa <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap sesuai Ijazah / Akta"
                    value={formData.namaLengkap || formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value, nama: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jenisKelamin || 'L'}
                    onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              {/* Tempat & Tanggal Lahir, NIK Siswa */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jakarta"
                    value={formData.tempatLahir || ''}
                    onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggalLahir || '2010-01-01'}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">NIK Siswa (16 Digit)</label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="317301..."
                    value={formData.nik || ''}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Anak Ke-, Saudara, Agama, Golongan Darah */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Anak Ke-</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={formData.anakKe || 1}
                    onChange={(e) => setFormData({ ...formData, anakKe: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Dari .. Saudara</label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={formData.saudara || 2}
                    onChange={(e) => setFormData({ ...formData, saudara: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Agama</label>
                  <select
                    value={formData.agama || 'Islam'}
                    onChange={(e) => setFormData({ ...formData, agama: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Konghucu">Konghucu</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Golongan Darah</label>
                  <select
                    value={formData.golonganDarah || 'O'}
                    onChange={(e) => setFormData({ ...formData, golonganDarah: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                    <option value="-">Tidak Tahu / Belum Cek</option>
                  </select>
                </div>
              </div>

              {/* Tinggi, Berat, Hobi, Prestasi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Tinggi Badan (cm)</label>
                  <input
                    type="number"
                    min={70}
                    max={220}
                    placeholder="155"
                    value={formData.tinggiBadan || ''}
                    onChange={(e) => setFormData({ ...formData, tinggiBadan: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Berat Badan (kg)</label>
                  <input
                    type="number"
                    min={15}
                    max={150}
                    placeholder="48"
                    value={formData.beratBadan || ''}
                    onChange={(e) => setFormData({ ...formData, beratBadan: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Hobi</label>
                  <input
                    type="text"
                    placeholder="Membaca, Olahraga, Menggambar"
                    value={formData.hobi || ''}
                    onChange={(e) => setFormData({ ...formData, hobi: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Prestasi</label>
                  <input
                    type="text"
                    placeholder="Juara Lomba, Pramuka, dll."
                    value={formData.prestasi || ''}
                    onChange={(e) => setFormData({ ...formData, prestasi: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Catatan Penting */}
              <div>
                <label className="block text-slate-400 font-bold mb-1">Catatan Penting / Khusus</label>
                <input
                  type="text"
                  placeholder="Kondisi kesehatan khusus, alergi, atau catatan pembimbing"
                  value={formData.catatanPenting || ''}
                  onChange={(e) => setFormData({ ...formData, catatanPenting: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 2: ALAMAT & KONTAK */}
          {activeTab === 'ALAMAT' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Alamat Tempat Tinggal Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Nama Jalan, Gang, Nomor Rumah / Blok RT RW"
                  value={formData.alamat || ''}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">RT</label>
                  <input
                    type="text"
                    placeholder="005"
                    value={formData.rt || ''}
                    onChange={(e) => setFormData({ ...formData, rt: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">RW</label>
                  <input
                    type="text"
                    placeholder="03"
                    value={formData.rw || ''}
                    onChange={(e) => setFormData({ ...formData, rw: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kelurahan / Desa</label>
                  <input
                    type="text"
                    placeholder="Tambora"
                    value={formData.kelurahan || ''}
                    onChange={(e) => setFormData({ ...formData, kelurahan: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kecamatan</label>
                  <input
                    type="text"
                    placeholder="Tambora"
                    value={formData.kecamatan || ''}
                    onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    placeholder="Jakarta Barat"
                    value={formData.kota || ''}
                    onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Provinsi</label>
                  <input
                    type="text"
                    placeholder="DKI Jakarta"
                    value={formData.provinsi || ''}
                    onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kode Pos</label>
                  <input
                    type="text"
                    placeholder="11220"
                    value={formData.kodePos || ''}
                    onChange={(e) => setFormData({ ...formData, kodePos: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Jenis Tempat Tinggal</label>
                  <select
                    value={formData.jenisTinggal || 'Bersama Orang Tua'}
                    onChange={(e) => setFormData({ ...formData, jenisTinggal: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Bersama Orang Tua">Bersama Orang Tua</option>
                    <option value="Bersama Wali">Bersama Wali / Kerabat</option>
                    <option value="Kost">Kost / Asrama</option>
                    <option value="Panti Asuhan">Panti Asuhan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Alat Transportasi ke Sekolah</label>
                  <select
                    value={formData.alatTransportasi || 'Jalan Kaki'}
                    onChange={(e) => setFormData({ ...formData, alatTransportasi: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="Jalan Kaki">Jalan Kaki</option>
                    <option value="Sepeda">Sepeda</option>
                    <option value="Sepeda Motor">Sepeda Motor</option>
                    <option value="Angkutan Umum">Angkutan Umum</option>
                    <option value="Ojek Online">Ojek Online</option>
                    <option value="Mobil Pribadi">Mobil Pribadi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nomor HP / WhatsApp Siswa</label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={formData.nomorHP || ''}
                    onChange={(e) => setFormData({ ...formData, nomorHP: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Alamat Email Siswa</label>
                  <input
                    type="email"
                    placeholder="siswa@ktct.sch.id"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AKADEMIK & BANTUAN */}
          {activeTab === 'AKADEMIK' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Status Siswa</label>
                  <select
                    disabled={role === 'student' || role === 'parent'}
                    value={formData.status || 'AKTIF'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-60"
                  >
                    <option value="AKTIF">AKTIF (Dapat Ikut Ujian CBT)</option>
                    <option value="BELUM">BELUM REGISTRASI LENGKAP</option>
                    <option value="TIDAK AKTIF">TIDAK AKTIF / CUTI</option>
                    <option value="PINDAH">PINDAH ROMBEL / SEKOLAH</option>
                    <option value="KELUAR">KELUAR / LULUS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Jenjang Pendidikan</label>
                  <select
                    disabled={role === 'student' || role === 'parent'}
                    value={formData.jenjang || 'Paket B'}
                    onChange={(e) => setFormData({ ...formData, jenjang: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-60"
                  >
                    <option value="Paket A">Paket A (Setara SD / Kelas 4 - 6)</option>
                    <option value="Paket B">Paket B (Setara SMP / Kelas 7 - 9)</option>
                    <option value="Paket C">Paket C (Setara SMA / Kelas 10 - 12)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Kelas Saat Ini</label>
                  <select
                    disabled={role === 'student' || role === 'parent'}
                    value={formData.kelasSaatini || formData.kelas || '9'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kelas: e.target.value,
                        kelasSaatini: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-60"
                  >
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((k) => (
                      <option key={k} value={k.toString()}>
                        Kelas {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(role === 'student' || role === 'parent') && (
                <p className="text-[11px] text-amber-400 bg-amber-950/30 border border-amber-800/40 p-2.5 rounded-xl">
                  Catatan: Jenjang dan Tingkat Kelas dikunci oleh Administrator. Hubungi pengurus jika ingin mengajukan mutasi atau kenaikan kelas.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Rombongan Belajar (Rombel)</label>
                  <input
                    type="text"
                    disabled={role === 'student' || role === 'parent'}
                    value={formData.rombel || 'Rombel KTCT Tambora'}
                    onChange={(e) => setFormData({ ...formData, rombel: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Asal Sekolah Sebelumnya</label>
                  <input
                    type="text"
                    placeholder="Contoh: SD Negeri Tambora 01"
                    value={formData.asalSekolah || ''}
                    onChange={(e) => setFormData({ ...formData, asalSekolah: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nomor Peserta UN / SKHUN / Ijazah</label>
                  <input
                    type="text"
                    placeholder="DN-01/D-SD/13/..."
                    value={formData.skhun || ''}
                    onChange={(e) => setFormData({ ...formData, skhun: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Penerima Bantuan (KIP / PKH / KPS / KJP)</label>
                  <select
                    value={formData.penerimaKPS || 'Tidak'}
                    onChange={(e) => setFormData({ ...formData, penerimaKPS: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="Tidak">Tidak Menerima</option>
                    <option value="Ya (KIP)">Ya - Penerima Kartu Indonesia Pintar (KIP)</option>
                    <option value="Ya (PKH)">Ya - Program Keluarga Harapan (PKH)</option>
                    <option value="Ya (KPS)">Ya - Kartu Perlindungan Sosial (KPS)</option>
                    <option value="Ya (KJP)">Ya - Kartu Jakarta Pintar (KJP Plus)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ORANG TUA & WALI */}
          {activeTab === 'KELUARGA' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">
                    Nomor Kartu Keluarga (KK - 16 Digit)
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    placeholder="3173010101100001"
                    value={formData.nomorKartuKeluarga || ''}
                    onChange={(e) => setFormData({ ...formData, nomorKartuKeluarga: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Status Keberadaan Orang Tua</label>
                  <select
                    value={formData.statusYatim || 'Lengkap'}
                    onChange={(e) => setFormData({ ...formData, statusYatim: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="Lengkap">Orang Tua Lengkap</option>
                    <option value="Yatim">Yatim (Ayah Telah Tiada)</option>
                    <option value="Piatu">Piatu (Ibu Telah Tiada)</option>
                    <option value="Yatim Piatu">Yatim Piatu</option>
                  </select>
                </div>
              </div>

              {/* DATA AYAH */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    Data Ayah Kandung
                  </span>
                  <select
                    value={formData.statusAyah || 'Masih Hidup'}
                    onChange={(e) => setFormData({ ...formData, statusAyah: e.target.value as any })}
                    className="bg-slate-900 text-slate-300 text-[11px] font-bold border border-slate-700 rounded-lg px-2 py-1"
                  >
                    <option value="Masih Hidup">Masih Hidup</option>
                    <option value="Meninggal">Sudah Meninggal</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Nama Ayah</label>
                    <input
                      type="text"
                      placeholder="Nama lengkap Ayah"
                      value={formData.namaAyah || ''}
                      onChange={(e) => setFormData({ ...formData, namaAyah: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">NIK Ayah (16 Digit)</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="3173..."
                      value={formData.nikAyah || ''}
                      onChange={(e) => setFormData({ ...formData, nikAyah: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">No. Telp / HP Ayah</label>
                    <input
                      type="text"
                      placeholder="0812..."
                      value={formData.tlpAyah || ''}
                      onChange={(e) => setFormData({ ...formData, tlpAyah: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      placeholder="Jakarta"
                      value={formData.tempatLahirAyah || ''}
                      onChange={(e) => setFormData({ ...formData, tempatLahirAyah: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Tgl Lahir Ayah</label>
                    <input
                      type="date"
                      value={formData.tanggalLahirAyah || ''}
                      onChange={(e) => setFormData({ ...formData, tanggalLahirAyah: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Pendidikan Ayah</label>
                    <select
                      value={formData.pendidikanAyah || 'SMA/Sederajat'}
                      onChange={(e) => setFormData({ ...formData, pendidikanAyah: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    >
                      <option value="SD/Sederajat">SD/Sederajat</option>
                      <option value="SMP/Sederajat">SMP/Sederajat</option>
                      <option value="SMA/Sederajat">SMA/Sederajat</option>
                      <option value="D1/D2/D3">D1/D2/D3</option>
                      <option value="S1/D4">S1/D4</option>
                      <option value="S2/S3">S2/S3</option>
                      <option value="Tidak Sekolah">Tidak Sekolah</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Pekerjaan Ayah</label>
                    <input
                      type="text"
                      placeholder="Wiraswasta / Karyawan"
                      value={formData.pekerjaanAyah || ''}
                      onChange={(e) => setFormData({ ...formData, pekerjaanAyah: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* DATA IBU */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                    Data Ibu Kandung
                  </span>
                  <select
                    value={formData.statusIbu || 'Masih Hidup'}
                    onChange={(e) => setFormData({ ...formData, statusIbu: e.target.value as any })}
                    className="bg-slate-900 text-slate-300 text-[11px] font-bold border border-slate-700 rounded-lg px-2 py-1"
                  >
                    <option value="Masih Hidup">Masih Hidup</option>
                    <option value="Meninggal">Sudah Meninggal</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Nama Ibu</label>
                    <input
                      type="text"
                      placeholder="Nama lengkap Ibu"
                      value={formData.namaIbu || ''}
                      onChange={(e) => setFormData({ ...formData, namaIbu: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">NIK Ibu (16 Digit)</label>
                    <input
                      type="text"
                      maxLength={16}
                      placeholder="3173..."
                      value={formData.nikIbu || ''}
                      onChange={(e) => setFormData({ ...formData, nikIbu: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">No. Telp / HP Ibu</label>
                    <input
                      type="text"
                      placeholder="0812..."
                      value={formData.tlpIbu || ''}
                      onChange={(e) => setFormData({ ...formData, tlpIbu: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      placeholder="Jakarta"
                      value={formData.tempatLahirIbu || ''}
                      onChange={(e) => setFormData({ ...formData, tempatLahirIbu: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Tgl Lahir Ibu</label>
                    <input
                      type="date"
                      value={formData.tanggalLahirIbu || ''}
                      onChange={(e) => setFormData({ ...formData, tanggalLahirIbu: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Pendidikan Ibu</label>
                    <select
                      value={formData.pendidikanIbu || 'SMA/Sederajat'}
                      onChange={(e) => setFormData({ ...formData, pendidikanIbu: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    >
                      <option value="SD/Sederajat">SD/Sederajat</option>
                      <option value="SMP/Sederajat">SMP/Sederajat</option>
                      <option value="SMA/Sederajat">SMA/Sederajat</option>
                      <option value="D1/D2/D3">D1/D2/D3</option>
                      <option value="S1/D4">S1/D4</option>
                      <option value="S2/S3">S2/S3</option>
                      <option value="Tidak Sekolah">Tidak Sekolah</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Pekerjaan Ibu</label>
                    <input
                      type="text"
                      placeholder="Ibu Rumah Tangga / Karyawan"
                      value={formData.pekerjaanIbu || ''}
                      onChange={(e) => setFormData({ ...formData, pekerjaanIbu: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* DATA WALI */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="font-bold text-white text-xs flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Data Wali (Diisi jika siswa tinggal bersama wali / bukan orang tua kandung)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Nama Wali</label>
                    <input
                      type="text"
                      placeholder="Nama lengkap Wali"
                      value={formData.namaWali || ''}
                      onChange={(e) => setFormData({ ...formData, namaWali: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Hubungan Keluarga</label>
                    <input
                      type="text"
                      placeholder="Paman / Bibi / Kakek / Kakak"
                      value={formData.hubungan || ''}
                      onChange={(e) => setFormData({ ...formData, hubungan: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">No. Telp / HP Wali</label>
                    <input
                      type="text"
                      placeholder="0812..."
                      value={formData.tlpWali || ''}
                      onChange={(e) => setFormData({ ...formData, tlpWali: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KELENGKAPAN BERKAS & DOKUMEN */}
          {activeTab === 'BERKAS' && (
            <div className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-2xl text-xs text-indigo-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-white">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  Status Kepemilikan & Penyerahan Dokumen Persyaratan
                </p>
                <p className="text-[11px] text-slate-400">
                  Periksa kelengkapan berkas fisik atau salinan digital yang telah Anda serahkan kepada panitia pengurus KTCT.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: 'aktaKelahiran', label: 'Akta Kelahiran Siswa' },
                  { key: 'kartuKeluarga', label: 'Kartu Keluarga (KK)' },
                  { key: 'kia', label: 'Kartu Identitas Anak (KIA)' },
                  { key: 'ktpAyah', label: 'KTP Ayah' },
                  { key: 'ktpIbu', label: 'KTP Ibu' },
                  { key: 'ijazah', label: 'Ijazah Sebelumnya' },
                  { key: 'ktpWali', label: 'KTP Wali' },
                  { key: 'rapor', label: 'Buku Rapor Terakhir' },
                  { key: 'sPindah', label: 'Surat Pindah (S.Pindah)' },
                  { key: 'suKet', label: 'Surat Keterangan (SuKet)' },
                  { key: 'sDomisili', label: 'Surat Domisili (S.Domisili)' },
                ].map((item) => (
                  <div key={item.key} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <span className="font-medium text-slate-300 text-xs pr-2">{item.label}</span>
                    <select
                      value={(formData as any)[item.key] || 'Ada'}
                      onChange={(e) => setFormData({ ...formData, [item.key]: e.target.value })}
                      className={`text-xs font-bold rounded-lg px-2 py-1 border ${
                        (formData as any)[item.key] === 'Ada'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700/50'
                          : (formData as any)[item.key] === 'Belum'
                          ? 'bg-amber-950 text-amber-300 border-amber-700/50'
                          : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      <option value="Ada">Ada / Lengkap</option>
                      <option value="Belum">Belum / Kurang</option>
                      <option value="Tidak Ada">Tidak Ada</option>
                      <option value="Tidak Perlu">Tidak Perlu</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-950/80 rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const tabs: ('IDENTITAS' | 'ALAMAT' | 'AKADEMIK' | 'KELUARGA' | 'BERKAS')[] = [
                  'IDENTITAS',
                  'ALAMAT',
                  'AKADEMIK',
                  'KELUARGA',
                  'BERKAS',
                ];
                const idx = tabs.indexOf(activeTab);
                if (idx > 0) setActiveTab(tabs[idx - 1]);
              }}
              disabled={activeTab === 'IDENTITAS'}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 text-xs font-bold transition"
            >
              ← Tab Sebelumnya
            </button>
            <button
              type="button"
              onClick={() => {
                const tabs: ('IDENTITAS' | 'ALAMAT' | 'AKADEMIK' | 'KELUARGA' | 'BERKAS')[] = [
                  'IDENTITAS',
                  'ALAMAT',
                  'AKADEMIK',
                  'KELUARGA',
                  'BERKAS',
                ];
                const idx = tabs.indexOf(activeTab);
                if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
              }}
              disabled={activeTab === 'BERKAS'}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 text-xs font-bold transition"
            >
              Tab Selanjutnya →
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              form="studentEditForm"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Biodata</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
