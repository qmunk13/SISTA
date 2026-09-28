import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText, 
  FileCheck, 
  Eye, 
  Edit3, 
  Send,
  User,
  Calendar,
  Phone,
  MapPin,
  GraduationCap,
  Award,
  Heart,
  Image,
  Upload,
  CheckCircle2,
  X,
  Printer
} from 'lucide-react';
import { UserSession } from '../types/schema';

interface SpmbModuleProps {
  userSession: UserSession;
  dbData: Record<string, any[]>;
  setDbData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  activeSubTab?: string;
}

export const SpmbModule: React.FC<SpmbModuleProps> = ({ userSession, dbData, setDbData, activeSubTab }) => {
  const [activeTab, setActiveTab] = useState<'pendaftar' | 'formulir_publik' | 'cek_status'>('pendaftar');

  React.useEffect(() => {
    if (activeSubTab) {
      if (activeSubTab === 'formulir') {
        setActiveTab('formulir_publik');
      } else {
        setActiveTab('pendaftar');
      }
    }
  }, [activeSubTab]);
  const [searchKode, setSearchKode] = useState('');
  const [statusResult, setStatusResult] = useState<any | null>(null);

  // Selected Registrant for Detail Modal (36 fields view)
  const [selectedRegistrant, setSelectedRegistrant] = useState<any | null>(null);

  // Comprehensive 36 Fields Form State
  const [form, setForm] = useState({
    kodePendaftaran: '',
    tanggalDaftar: new Date().toISOString().split('T')[0],
    status: 'Pending',
    nama: '',
    nisn: '',
    nik: '',
    nis: '',
    tempatLahir: 'Jakarta',
    tglLahir: '2011-05-15',
    jk: 'Laki-laki',
    agama: 'Islam',
    golonganDarah: 'O',
    tinggiBadan: '155',
    beratBadan: '48',
    alamat: '',
    namaAyah: '',
    pekerjaanAyah: 'Wiraswasta',
    namaIbu: '',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    noHp: '',
    alamatOrtu: '',
    kelas: 'Paket C (SMA)',
    tahunMasuk: '2026',
    riwayatPendidikan: '',
    prestasi: '-',
    hobi: '-',
    catatanPenting: '-',
    pasFoto: '',
    kk: '',
    akta: '',
    ktpKia: '',
    ktpOrtu: '',
    ijazah: '',
    rapor: '',
    domisili: '',
    catatanAdmin: 'Berkas Baru Pendaftaran SPMB 2026'
  });

  const pendaftarList = dbData['SPMB_PENDAFTAR'] || [];

  const handleFieldChange = (field: string, val: string) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleDaftarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.nik) {
      alert('Mohon isi minimal Nama Lengkap dan NIK Siswa!');
      return;
    }

    const autoKode = form.kodePendaftaran || `PDKT2026-${Math.floor(100 + Math.random() * 900)}`;
    const newRecord = {
      ...form,
      kodePendaftaran: autoKode,
      alamatOrtu: form.alamatOrtu || form.alamat,
    };

    setDbData(prev => ({
      ...prev,
      SPMB_PENDAFTAR: [newRecord, ...(prev['SPMB_PENDAFTAR'] || [])]
    }));

    alert(`Pendaftaran Siswa Baru Berhasil Dikirim!\nKode ID: ${autoKode}`);
    setForm({
      kodePendaftaran: '',
      tanggalDaftar: new Date().toISOString().split('T')[0],
      status: 'Pending',
      nama: '',
      nisn: '',
      nik: '',
      nis: '',
      tempatLahir: 'Jakarta',
      tglLahir: '2011-05-15',
      jk: 'Laki-laki',
      agama: 'Islam',
      golonganDarah: 'O',
      tinggiBadan: '155',
      beratBadan: '48',
      alamat: '',
      namaAyah: '',
      pekerjaanAyah: 'Wiraswasta',
      namaIbu: '',
      pekerjaanIbu: 'Ibu Rumah Tangga',
      noHp: '',
      alamatOrtu: '',
      kelas: 'Paket C (SMA)',
      tahunMasuk: '2026',
      riwayatPendidikan: '',
      prestasi: '-',
      hobi: '-',
      catatanPenting: '-',
      pasFoto: '', kk: '', akta: '', ktpKia: '', ktpOrtu: '', ijazah: '', rapor: '', domisili: '',
      catatanAdmin: 'Berkas Baru Pendaftaran SPMB 2026'
    });
    setActiveTab('pendaftar');
  };

  const handleUpdateStatus = (kode: string, newStatus: string) => {
    setDbData(prev => {
      const updated = (prev['SPMB_PENDAFTAR'] || []).map(p => {
        if (p.kodePendaftaran === kode) {
          return { ...p, status: newStatus, catatanAdmin: `Status diubah menjadi ${newStatus} oleh ${userSession.name}` };
        }
        return p;
      });
      return { ...prev, SPMB_PENDAFTAR: updated };
    });
  };

  const handleCekStatus = () => {
    const found = pendaftarList.find(p => p.kodePendaftaran === searchKode || p.nisn === searchKode || p.nik === searchKode);
    setStatusResult(found || 'NOT_FOUND');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Module Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase mb-2">
            <UserPlus className="w-3.5 h-3.5" /> MODUL SPMB & PPDB 2026
          </div>
          <h2 className="text-xl font-black text-slate-800">Pendaftaran Siswa Baru (36 Kolom SISTA)</h2>
          <p className="text-xs text-slate-500">Kelola 36 isian formulir lengkap pendaftaran Paket A, B, C dan verifikasi berkas.</p>
        </div>

        <button
          onClick={() => setActiveTab('formulir_publik')}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> + Tambah Pendaftaran (36 Isian)
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/60 border border-slate-200 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('pendaftar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'pendaftar' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" /> Data Pendaftar SPMB ({pendaftarList.length})
        </button>
        <button
          onClick={() => setActiveTab('formulir_publik')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'formulir_publik' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4" /> Formulir Pendaftaran (36 Fields)
        </button>
        <button
          onClick={() => setActiveTab('cek_status')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'cek_status' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4" /> Cek Status Kelulusan
        </button>
      </div>

      {/* TAB 1: DATA PENDAFTAR ADMIN TABLE */}
      {activeTab === 'pendaftar' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Verifikasi Berkas & Kelulusan SPMB</h3>
              <p className="text-xs text-slate-500">Klik baris data untuk melihat seluruh 36 kolom isian pendaftaran.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-4">Kode Pendaftaran</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Nama Lengkap</th>
                  <th className="p-4">NIK / NISN</th>
                  <th className="p-4">Kelas Target</th>
                  <th className="p-4">No. HP / WA</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendaftarList.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono text-blue-600 font-bold">{p.kodePendaftaran}</td>
                    <td className="p-4 text-slate-500">{p.tanggalDaftar}</td>
                    <td className="p-4 font-bold text-slate-800">{p.nama}</td>
                    <td className="p-4 font-mono text-slate-600">
                      <div>NIK: {p.nik || '-'}</div>
                      <div className="text-[10px] text-slate-400">NISN: {p.nisn || '-'}</div>
                    </td>
                    <td className="p-4 font-semibold text-purple-700">{p.kelas || 'Paket C'}</td>
                    <td className="p-4 font-mono text-slate-600">{p.noHp || '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                        p.status === 'Diterima' ? 'bg-emerald-100 text-emerald-700' : p.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => setSelectedRegistrant(p)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-blue-200"
                          title="Lihat Detail 36 Field"
                        >
                          <Eye className="w-3.5 h-3.5" /> 36 Field
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(p.kodePendaftaran, 'Diterima')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition"
                        >
                          Terima
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(p.kodePendaftaran, 'Perbaikan')}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shadow-sm transition"
                        >
                          Revisi
                        </button>
                        <button
                          onClick={() => {
                            setDbData(prev => ({
                              ...prev,
                              SPMB_PENDAFTAR: (prev['SPMB_PENDAFTAR'] || []).filter(item => item.kodePendaftaran !== p.kodePendaftaran)
                            }));
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-lg text-xs transition border border-rose-200"
                          title="Hapus Pendaftar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FORMULIR PENDAFTARAN LENGKAP (36 FIELDS) */}
      {activeTab === 'formulir_publik' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm max-w-4xl mx-auto space-y-6">
          <div className="border-b border-slate-100 pb-4 text-center md:text-left">
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full uppercase">
              FORMULIR RESMI 36 FIELDS SISTA
            </span>
            <h3 className="font-black text-slate-800 text-2xl mt-2">Formulir Isian Pendaftaran Siswa Baru</h3>
            <p className="text-xs text-slate-500">Lengkapi 36 variabel identitas, fisik, orang tua, dan berkas persyaratan.</p>
          </div>

          <form onSubmit={handleDaftarSubmit} className="space-y-8 text-xs">
            {/* SEKSI 1: INFORMASI SYSTEM & PENDAFTARAN */}
            <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-800 text-sm text-blue-700 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Seksi 1: Informasi Pendaftaran & System
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">1. Kode Pendaftaran (Opsional/Auto)</label>
                  <input
                    type="text"
                    value={form.kodePendaftaran}
                    onChange={(e) => handleFieldChange('kodePendaftaran', e.target.value)}
                    placeholder="Auto: PDKT2026-xxx"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">2. Tanggal Pendaftaran</label>
                  <input
                    type="date"
                    value={form.tanggalDaftar}
                    onChange={(e) => handleFieldChange('tanggalDaftar', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">3. Status Awal</label>
                  <select
                    value={form.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-amber-600"
                  >
                    <option value="Pending">Pending (Verifikasi)</option>
                    <option value="Diterima">Diterima</option>
                    <option value="Tidak Diterima">Tidak Diterima</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">22. Pilihan Kelas / Rombel *</label>
                  <select
                    value={form.kelas}
                    onChange={(e) => handleFieldChange('kelas', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-blue-600"
                  >
                    <option value="Paket A (Setara SD)">Paket A (Setara SD)</option>
                    <option value="Paket B (Setara SMP)">Paket B (Setara SMP)</option>
                    <option value="Paket C (Setara SMA)">Paket C (Setara SMA)</option>
                    <option value="Kelas 10 SMA">Kelas 10 SMA</option>
                    <option value="Kelas 11 SMA">Kelas 11 SMA</option>
                    <option value="Kelas 12 SMA">Kelas 12 SMA</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">23. Tahun Masuk</label>
                  <input
                    type="text"
                    value={form.tahunMasuk}
                    onChange={(e) => handleFieldChange('tahunMasuk', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">7. NIS Sekolah (Kosongkan jika baru)</label>
                  <input
                    type="text"
                    value={form.nis}
                    onChange={(e) => handleFieldChange('nis', e.target.value)}
                    placeholder="Nomor Induk Sekolah"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 2: DATA PRIBADI SISWA */}
            <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-800 text-sm text-blue-700 flex items-center gap-2">
                <User className="w-4 h-4" /> Seksi 2: Data Biodata Siswa
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">4. Nama Lengkap Siswa *</label>
                  <input
                    type="text"
                    required
                    value={form.nama}
                    onChange={(e) => handleFieldChange('nama', e.target.value)}
                    placeholder="Sesuai KTP/KK/Akta"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">5. NISN (10 Digit)</label>
                  <input
                    type="text"
                    value={form.nisn}
                    onChange={(e) => handleFieldChange('nisn', e.target.value)}
                    placeholder="0081234567"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">6. NIK (16 Digit) *</label>
                  <input
                    type="text"
                    required
                    maxLength={16}
                    value={form.nik}
                    onChange={(e) => handleFieldChange('nik', e.target.value)}
                    placeholder="3171012304900001"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">8. Tempat Lahir</label>
                  <input
                    type="text"
                    value={form.tempatLahir}
                    onChange={(e) => handleFieldChange('tempatLahir', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">9. Tanggal Lahir</label>
                  <input
                    type="date"
                    value={form.tglLahir}
                    onChange={(e) => handleFieldChange('tglLahir', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">10. Jenis Kelamin</label>
                  <select
                    value={form.jk}
                    onChange={(e) => handleFieldChange('jk', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">11. Agama</label>
                  <select
                    value={form.agama}
                    onChange={(e) => handleFieldChange('agama', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">12. Golongan Darah</label>
                  <select
                    value={form.golonganDarah}
                    onChange={(e) => handleFieldChange('golonganDarah', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                    <option value="-">-</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">13. Tinggi Badan (cm)</label>
                  <input
                    type="number"
                    value={form.tinggiBadan}
                    onChange={(e) => handleFieldChange('tinggiBadan', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">14. Berat Badan (kg)</label>
                  <input
                    type="number"
                    value={form.beratBadan}
                    onChange={(e) => handleFieldChange('beratBadan', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">15. Alamat Lengkap Siswa</label>
                  <input
                    type="text"
                    value={form.alamat}
                    onChange={(e) => handleFieldChange('alamat', e.target.value)}
                    placeholder="Jl. Pekojan Raya No. 10, RT 01/02"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">35. Keterangan Domisili / RTRW</label>
                  <input
                    type="text"
                    value={form.domisili}
                    onChange={(e) => handleFieldChange('domisili', e.target.value)}
                    placeholder="Kelurahan Pekojan, Kecamatan Tambora"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 3: DATA ORANG TUA */}
            <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-800 text-sm text-blue-700 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Seksi 3: Data Orang Tua / Wali
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">16. Nama Ayah Kandung</label>
                  <input
                    type="text"
                    value={form.namaAyah}
                    onChange={(e) => handleFieldChange('namaAyah', e.target.value)}
                    placeholder="Nama Lengkap Ayah"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">17. Pekerjaan Ayah</label>
                  <input
                    type="text"
                    value={form.pekerjaanAyah}
                    onChange={(e) => handleFieldChange('pekerjaanAyah', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">18. Nama Ibu Kandung</label>
                  <input
                    type="text"
                    value={form.namaIbu}
                    onChange={(e) => handleFieldChange('namaIbu', e.target.value)}
                    placeholder="Nama Lengkap Ibu"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">19. Pekerjaan Ibu</label>
                  <input
                    type="text"
                    value={form.pekerjaanIbu}
                    onChange={(e) => handleFieldChange('pekerjaanIbu', e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">20. No. WhatsApp / Telepon Aktif *</label>
                  <input
                    type="text"
                    required
                    value={form.noHp}
                    onChange={(e) => handleFieldChange('noHp', e.target.value)}
                    placeholder="081234567890"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">21. Alamat Orang Tua</label>
                  <input
                    type="text"
                    value={form.alamatOrtu}
                    onChange={(e) => handleFieldChange('alamatOrtu', e.target.value)}
                    placeholder="Sama dengan alamat siswa"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 4: RIWAYAT & CATATAN */}
            <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-800 text-sm text-blue-700 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Seksi 4: Riwayat Pendidikan, Prestasi & Catatan
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">24. Riwayat Pendidikan / Sekolah Asal</label>
                  <input
                    type="text"
                    value={form.riwayatPendidikan}
                    onChange={(e) => handleFieldChange('riwayatPendidikan', e.target.value)}
                    placeholder="SMPN 111 Jakarta / SD Tambora"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">25. Catatan Prestasi Siswa</label>
                  <input
                    type="text"
                    value={form.prestasi}
                    onChange={(e) => handleFieldChange('prestasi', e.target.value)}
                    placeholder="Juara 1 Futsal / Lomba Lukis"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">26. Hobi & Minat</label>
                  <input
                    type="text"
                    value={form.hobi}
                    onChange={(e) => handleFieldChange('hobi', e.target.value)}
                    placeholder="Membaca, Olahraga, Musik"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">27. Catatan Penting / Medis</label>
                  <input
                    type="text"
                    value={form.catatanPenting}
                    onChange={(e) => handleFieldChange('catatanPenting', e.target.value)}
                    placeholder="Alergi, Kebutuhan Khusus"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* SEKSI 5: UNGGAH DOKUMEN DIGITAL (BERKAS 28-34) */}
            <div className="space-y-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
              <h4 className="font-extrabold text-slate-800 text-sm text-blue-700 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Seksi 5: Status Dokumen Persyaratan Digital (Berkas 28 - 34)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                {[
                  { key: 'pasFoto', num: 28, label: 'Pas Foto 3x4' },
                  { key: 'kk', num: 29, label: 'Kartu Keluarga' },
                  { key: 'akta', num: 30, label: 'Akta Kelahiran' },
                  { key: 'ktpKia', num: 31, label: 'KTP / KIA Siswa' },
                  { key: 'ktpOrtu', num: 32, label: 'KTP Orang Tua' },
                  { key: 'ijazah', num: 33, label: 'Ijazah Terakhir' },
                  { key: 'rapor', num: 34, label: 'Rapor Terakhir' },
                ].map((doc) => (
                  <div key={doc.key} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-700">{doc.num}. {doc.label}</p>
                    <select
                      value={(form as any)[doc.key] || 'Ada'}
                      onChange={(e) => handleFieldChange(doc.key, e.target.value)}
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold"
                    >
                      <option value="Ada">Ada / Terverifikasi</option>
                      <option value="Proses">Dalam Proses</option>
                      <option value="Belum">Belum Ada</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* SEKSI 6: CATATAN ADMIN (36) */}
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
              <label className="font-bold text-amber-900 block">36. Catatan Internal Admin / Petugas Verifikasi SPMB</label>
              <textarea
                rows={2}
                value={form.catatanAdmin}
                onChange={(e) => handleFieldChange('catatanAdmin', e.target.value)}
                className="w-full p-3 bg-white border border-amber-200 rounded-xl text-xs outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-xs shadow-lg transition flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Simpan Form Pendaftaran (Lengkap 36 Kolom)
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: CEK STATUS KELULUSAN */}
      {activeTab === 'cek_status' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <h3 className="font-extrabold text-slate-800 text-xl">Cek Status Hasil Seleksi SPMB</h3>
            <p className="text-xs text-slate-500 mt-1">Masukkan Kode Pendaftaran, NISN, atau NIK Anda</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchKode}
              onChange={(e) => setSearchKode(e.target.value)}
              placeholder="Contoh: PDKT2026-001 atau NIK/NISN"
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-xs font-mono outline-none focus:border-emerald-500 shadow-sm"
            />
            <button
              onClick={handleCekStatus}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
            >
              Cari Data
            </button>
          </div>

          {statusResult === 'NOT_FOUND' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-700 text-xs font-medium">
              Kode Pendaftaran, NIK, atau NISN tidak ditemukan. Harap periksa kembali.
            </div>
          )}

          {statusResult && statusResult !== 'NOT_FOUND' && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-fade-in text-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <span className="font-mono text-xs text-blue-600 font-bold">{statusResult.kodePendaftaran}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  statusResult.status === 'Diterima' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {statusResult.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{statusResult.nama}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">NIK: {statusResult.nik} | NISN: {statusResult.nisn || '-'}</p>
                <p className="text-xs text-purple-700 font-bold mt-1">Program Target: {statusResult.kelas || 'Paket C'}</p>
              </div>
              <button
                onClick={() => setSelectedRegistrant(statusResult)}
                className="w-full py-2 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Lihat Rincian 36 Field Isian Pendaftaran
              </button>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL: SHOWS ALL 36 FIELDS */}
      {selectedRegistrant && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl text-slate-800 text-xs">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 font-mono font-bold rounded-md text-[10px]">
                    {selectedRegistrant.kodePendaftaran}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                    selectedRegistrant.status === 'Diterima' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    Status: {selectedRegistrant.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedRegistrant.nama}</h3>
                <p className="text-[11px] text-slate-500">Formulir Pendaftaran Siswa Baru (Lengkap 36 Field System)</p>
              </div>
              <button
                onClick={() => setSelectedRegistrant(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid 36 Fields Display */}
            <div className="space-y-4">
              {/* Seksi 1: System */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">Identitas Pendaftaran (1 - 3 & 22-23)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><span className="text-slate-400 block">1. Kode Pendaftaran:</span> <strong className="font-mono">{selectedRegistrant.kodePendaftaran}</strong></div>
                  <div><span className="text-slate-400 block">2. Tanggal Daftar:</span> <strong>{selectedRegistrant.tanggalDaftar}</strong></div>
                  <div><span className="text-slate-400 block">3. Status:</span> <strong>{selectedRegistrant.status}</strong></div>
                  <div><span className="text-slate-400 block">22. Rombel/Kelas:</span> <strong className="text-purple-700">{selectedRegistrant.kelas || 'Paket C'}</strong></div>
                </div>
              </div>

              {/* Seksi 2: Biodata Siswa */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">Biodata Diri Siswa (4 - 15)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><span className="text-slate-400 block">4. Nama Lengkap:</span> <strong className="text-slate-900">{selectedRegistrant.nama}</strong></div>
                  <div><span className="text-slate-400 block">5. NISN:</span> <strong className="font-mono">{selectedRegistrant.nisn || '-'}</strong></div>
                  <div><span className="text-slate-400 block">6. NIK:</span> <strong className="font-mono">{selectedRegistrant.nik || '-'}</strong></div>
                  <div><span className="text-slate-400 block">7. NIS Sekolah:</span> <strong>{selectedRegistrant.nis || '-'}</strong></div>
                  <div><span className="text-slate-400 block">8. Tempat Lahir:</span> <strong>{selectedRegistrant.tempatLahir || '-'}</strong></div>
                  <div><span className="text-slate-400 block">9. Tanggal Lahir:</span> <strong>{selectedRegistrant.tglLahir || '-'}</strong></div>
                  <div><span className="text-slate-400 block">10. Jenis Kelamin:</span> <strong>{selectedRegistrant.jk || '-'}</strong></div>
                  <div><span className="text-slate-400 block">11. Agama:</span> <strong>{selectedRegistrant.agama || '-'}</strong></div>
                  <div><span className="text-slate-400 block">12. Gol. Darah:</span> <strong>{selectedRegistrant.golonganDarah || '-'}</strong></div>
                  <div><span className="text-slate-400 block">13. Tinggi Badan:</span> <strong>{selectedRegistrant.tinggiBadan} cm</strong></div>
                  <div><span className="text-slate-400 block">14. Berat Badan:</span> <strong>{selectedRegistrant.beratBadan} kg</strong></div>
                  <div><span className="text-slate-400 block">15. Alamat Siswa:</span> <strong>{selectedRegistrant.alamat || '-'}</strong></div>
                </div>
              </div>

              {/* Seksi 3: Orang Tua */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">Orang Tua & Kontak (16 - 21)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><span className="text-slate-400 block">16. Nama Ayah:</span> <strong>{selectedRegistrant.namaAyah || '-'}</strong></div>
                  <div><span className="text-slate-400 block">17. Pekerjaan Ayah:</span> <strong>{selectedRegistrant.pekerjaanAyah || '-'}</strong></div>
                  <div><span className="text-slate-400 block">18. Nama Ibu:</span> <strong>{selectedRegistrant.namaIbu || '-'}</strong></div>
                  <div><span className="text-slate-400 block">19. Pekerjaan Ibu:</span> <strong>{selectedRegistrant.pekerjaanIbu || '-'}</strong></div>
                  <div><span className="text-slate-400 block">20. No. WhatsApp:</span> <strong className="font-mono text-emerald-600">{selectedRegistrant.noHp || '-'}</strong></div>
                  <div><span className="text-slate-400 block">21. Alamat Ortu:</span> <strong>{selectedRegistrant.alamatOrtu || selectedRegistrant.alamat || '-'}</strong></div>
                </div>
              </div>

              {/* Seksi 4: Riwayat & Berkas */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <p className="font-extrabold text-blue-700 text-xs uppercase tracking-wider">Riwayat, Prestasi & Berkas (24 - 36)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><span className="text-slate-400 block">24. Sekolah Asal:</span> <strong>{selectedRegistrant.riwayatPendidikan || '-'}</strong></div>
                  <div><span className="text-slate-400 block">25. Prestasi:</span> <strong>{selectedRegistrant.prestasi || '-'}</strong></div>
                  <div><span className="text-slate-400 block">26. Hobi:</span> <strong>{selectedRegistrant.hobi || '-'}</strong></div>
                  <div><span className="text-slate-400 block">27. Catatan Penting:</span> <strong>{selectedRegistrant.catatanPenting || '-'}</strong></div>
                  <div><span className="text-slate-400 block">35. Domisili RTRW:</span> <strong>{selectedRegistrant.domisili || '-'}</strong></div>
                  <div><span className="text-slate-400 block">36. Catatan Admin:</span> <strong className="text-amber-700">{selectedRegistrant.catatanAdmin || '-'}</strong></div>
                </div>

                {/* Berkas status checklist */}
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1 font-bold">Dokumen Digital Persyaratan (28-34):</span>
                  <div className="flex flex-wrap gap-2">
                    {['pasFoto', 'kk', 'akta', 'ktpKia', 'ktpOrtu', 'ijazah', 'rapor'].map(b => (
                      <span key={b} className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold">
                        ✓ {b.toUpperCase()}: {selectedRegistrant[b] || 'Ada'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Cetak Formulir
              </button>
              <button
                onClick={() => setSelectedRegistrant(null)}
                className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
