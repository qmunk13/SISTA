import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Upload,
  Download,
  Edit2,
  Trash2,
  CreditCard,
  QrCode,
  CheckCircle2,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Filter,
  User as UserIcon,
  Image,
  Link as LinkIcon
} from 'lucide-react';
import { User, Siswa } from '../types';
import {
  getSiswaList,
  getKelasList,
  saveSiswaList,
  addSiswa,
  deleteSiswa,
  deleteInvalidSiswaWithHyphen
} from '../lib/storage';
import { downloadSiswaExcelTemplate, importSiswaFromExcel, exportSiswaToExcel } from '../lib/exportUtils';

interface DataSiswaViewProps {
  currentUser: User;
  onSelectView: (view: string, param?: any) => void;
}

export const DataSiswaView: React.FC<DataSiswaViewProps> = ({ currentUser, onSelectView }) => {
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyInvalid, setOnlyInvalid] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Form State
  const [formData, setFormData] = useState({
    nisn: '',
    nama: '',
    kelas: '',
    jenisKelamin: 'Laki-laki',
    noHp: '',
    alamat: '',
    fotoUrl: ''
  });

  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const classes = getKelasList();
  const siswaList = getSiswaList(selectedKelas);

  // Photo Upload Handler (Converts file to Base64 Data URL)
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran berkas foto maksimal 5MB!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, fotoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter students based on search, selected class, and invalid flag
  const filteredSiswa = siswaList.filter(s => {
    const nameStr = (s.nama || '').toLowerCase();
    const nisnStr = (s.nisn || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || nameStr.includes(q) || nisnStr.includes(q);
    const isInvalid = !s.nama || s.nama.trim() === '-' || s.nama.trim() === '' || !s.nisn || s.nisn.trim() === '-' || s.nisn.trim() === '';

    if (onlyInvalid) {
      return matchesSearch && isInvalid;
    }
    return matchesSearch;
  });

  const countInvalidTotal = siswaList.filter(s => 
    !s.nama || s.nama.trim() === '-' || s.nama.trim() === '' || 
    !s.nisn || s.nisn.trim() === '-' || s.nisn.trim() === ''
  ).length;

  const handleOpenAddModal = () => {
    setEditingSiswa(null);
    setFormData({
      nisn: '',
      nama: '',
      kelas: selectedKelas || classes[0] || '10-A',
      jenisKelamin: 'Laki-laki',
      noHp: '',
      alamat: '',
      fotoUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (siswa: Siswa) => {
    setEditingSiswa(siswa);
    setFormData({
      nisn: siswa.nisn || '',
      nama: siswa.nama || '',
      kelas: siswa.kelas || selectedKelas || '10-A',
      jenisKelamin: siswa.jenisKelamin || 'Laki-laki',
      noHp: siswa.noHp || '',
      alamat: siswa.alamat || '',
      fotoUrl: siswa.fotoUrl || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nisn.trim() || !formData.nama.trim()) {
      setMessage({ text: 'NISN dan Nama Lengkap wajib diisi!', success: false });
      return;
    }

    const kelasTarget = formData.kelas || selectedKelas || '10-A';

    if (editingSiswa) {
      // Edit
      const all = getSiswaList();
      const updated = all.map(s => s.id === editingSiswa.id ? {
        ...s,
        nisn: formData.nisn.trim(),
        nama: formData.nama.trim(),
        kelas: kelasTarget,
        jenisKelamin: formData.jenisKelamin,
        noHp: formData.noHp.trim() || '-',
        alamat: formData.alamat.trim() || '-',
        fotoUrl: formData.fotoUrl.trim()
      } : s);
      saveSiswaList(updated);
      setMessage({ text: 'Data siswa berhasil diperbarui!', success: true });
    } else {
      // Add
      const newSiswa: Siswa = {
        id: 'sw_' + Date.now(),
        nisn: formData.nisn.trim(),
        nama: formData.nama.trim(),
        kelas: kelasTarget,
        jenisKelamin: formData.jenisKelamin,
        tanggalLahir: '2009-01-01',
        agama: 'Islam',
        namaAyah: '-',
        namaIbu: '-',
        noHp: formData.noHp.trim() || '-',
        alamat: formData.alamat.trim() || '-',
        qrCodeUrl: formData.nisn.trim(),
        fotoUrl: formData.fotoUrl.trim()
      };
      addSiswa(newSiswa);
      setMessage({ text: 'Siswa baru berhasil ditambahkan!', success: true });
    }

    setIsModalOpen(false);
    triggerRefresh();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = (idOrNisn: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data siswa "${nama}"?`)) {
      const res = deleteSiswa(idOrNisn);
      setMessage({ text: res.message || `Data ${nama} berhasil dihapus.`, success: res.success });
      triggerRefresh();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteAllInvalid = () => {
    if (countInvalidTotal === 0) {
      setMessage({ text: "Tidak ada data siswa berkategori '-' atau kosong untuk dihapus.", success: true });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (confirm(`Ditemukan ${countInvalidTotal} data siswa berkategori '-' atau kosong.\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA HYPHEN ('-') ini secara permanen?`)) {
      const res = deleteInvalidSiswaWithHyphen();
      setMessage({ text: res.message, success: res.success });
      triggerRefresh();
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      importSiswaFromExcel(file, (importedSiswa) => {
        if (importedSiswa.length > 0) {
          const current = getSiswaList();
          const combined = [...current, ...importedSiswa];
          saveSiswaList(combined);
          setMessage({ text: `Berhasil mengimpor ${importedSiswa.length} data siswa dari Excel!`, success: true });
          triggerRefresh();
          setTimeout(() => setMessage(null), 4000);
        } else {
          setMessage({ text: 'Gagal membaca format Excel. Pastikan menggunakan template resmi.', success: false });
          setTimeout(() => setMessage(null), 4000);
        }
      });
      e.target.value = '';
    }
  };

  const handleExportAllSiswa = () => {
    exportSiswaToExcel(siswaList);
  };

  return (
    <div key={refreshKey} className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <span>Manajemen Data Siswa</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan direktori siswa, pembersihan data invalid ('-'), impor Excel, & Kartu Pelajar QR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Delete All Hyphen Data Button */}
          {countInvalidTotal > 0 && (
            <button
              onClick={handleDeleteAllInvalid}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer animate-pulse"
              title={`Hapus Semua (${countInvalidTotal}) Data Siswa Invalid '-'`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Data '-' ({countInvalidTotal})</span>
            </button>
          )}

          <button
            onClick={() => onSelectView('kartu-siswa')}
            className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Buka Generator Kartu Pelajar QR Otomatis"
          >
            <CreditCard className="w-4 h-4 text-amber-300" />
            <span>Generator Kartu QR</span>
          </button>

          <button
            onClick={downloadSiswaExcelTemplate}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Download Template Excel"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Template Excel</span>
          </button>

          <label className="cursor-pointer">
            <div className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
              <Upload className="w-4 h-4" />
              <span>Impor Excel</span>
            </div>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleExportAllSiswa}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 animate-fade-in ${
          message.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap lg:flex-nowrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select
            value={selectedKelas}
            onChange={e => setSelectedKelas(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="">Semua Kelas ({getSiswaList().length} Siswa)</option>
            {classes.map(c => (
              <option key={c} value={c}>Kelas {c}</option>
            ))}
          </select>

          {/* Filter Toggle: Only Show Invalid (-) */}
          <button
            type="button"
            onClick={() => setOnlyInvalid(!onlyInvalid)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              onlyInvalid 
                ? 'bg-rose-100 text-rose-800 border-rose-300 font-black' 
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${onlyInvalid ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>{onlyInvalid ? 'Menampilkan Hanya Data (-)' : `Filter Data '-' (${countInvalidTotal})`}</span>
          </button>
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari Nama / NISN..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center flex-wrap gap-2">
          <span>Direktori Siswa ({filteredSiswa.length} Data)</span>
          {countInvalidTotal > 0 && (
            <span className="text-[11px] text-rose-300 font-semibold bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-800/50 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Ditemukan {countInvalidTotal} siswa dengan nama/NISN '-'</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center w-12">No</th>
                <th className="px-4 py-3">Nama Lengkap</th>
                <th className="px-4 py-3">NISN</th>
                <th className="px-4 py-3 text-center">Kelas</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                    Tidak ada siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((s, idx) => {
                  const isHyphenData = !s.nama || s.nama.trim() === '-' || !s.nisn || s.nisn.trim() === '-';
                  const isAlumni = (s.kelas || '').includes('13') || 
                                   (s.kelas || '').toLowerCase().includes('alumni') || 
                                   (s.kelas || '').toLowerCase().includes('lulus') ||
                                   (s.status || '').toUpperCase() === 'LULUS' ||
                                   (s.status || '').toUpperCase() === 'ALUMNI';
                  return (
                    <tr 
                      key={s.id || s.nisn || `sw-${idx}`} 
                      className={`transition ${isHyphenData ? 'bg-rose-50/70 hover:bg-rose-100/70' : 'hover:bg-slate-50'}`}
                    >
                      {/* 1. No */}
                      <td className="px-3 py-3 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>

                      {/* 2. Nama Lengkap */}
                      <td className="px-4 py-3 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-500 text-xs shadow-2xs">
                            {s.fotoUrl ? (
                              <img src={s.fotoUrl} alt={s.nama} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-indigo-600 font-extrabold">{ (s.nama || '?').charAt(0).toUpperCase() }</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>{s.nama || '-'}</span>
                            {isHyphenData && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-rose-600 text-white rounded font-black tracking-wide inline-flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>'-'</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. NISN */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        {s.nisn || '-'}
                      </td>

                      {/* 4. Kelas */}
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                          isAlumni 
                            ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                            : 'bg-slate-100 border border-slate-200'
                        }`}>
                          {isAlumni ? '13' : (s.kelas || '-')}
                        </span>
                      </td>

                      {/* 5. Status */}
                      <td className="px-4 py-3 text-center">
                        {isHyphenData ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-md text-[10px] font-black">
                            Data '-'
                          </span>
                        ) : isAlumni ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-md text-[10px] font-bold">
                            Alumni
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-bold">
                            Aktif
                          </span>
                        )}
                      </td>

                      {/* 6. Aksi */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => onSelectView('kartu-siswa', s)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                            title="Cetak Kartu Pelajar QR"
                          >
                            <QrCode className="w-3.5 h-3.5 text-indigo-100" />
                            <span>Cetak Kartu QR</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 transition rounded-md hover:bg-slate-100 cursor-pointer"
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id || s.nisn, s.nama)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 transition rounded-md hover:bg-rose-100 cursor-pointer"
                            title="Hapus Data Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative border border-slate-200 shadow-xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-slate-800 mb-1">
              {editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Lengkapi informasi identitas siswa di bawah ini.</p>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  NISN (Nomor Induk Siswa Nasional) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nisn}
                  onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                  placeholder="e.g. 1001234561"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Nama lengkap..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Kelas
                  </label>
                  <select
                    value={formData.kelas}
                    onChange={e => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    {classes.map(c => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.jenisKelamin}
                    onChange={e => setFormData({ ...formData, jenisKelamin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  No. HP / WhatsApp Wali
                </label>
                <input
                  type="text"
                  value={formData.noHp}
                  onChange={e => setFormData({ ...formData, noHp: e.target.value })}
                  placeholder="081234567890"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={formData.alamat}
                  onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Alamat rumah..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              {/* Pas Foto Upload & Link Section */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Pas Foto Siswa (Upload File ATAU Tempel Link)
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-12 h-14 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center relative group">
                    {formData.fotoUrl ? (
                      <img src={formData.fotoUrl} alt="Foto Siswa" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-6 h-6 text-slate-400" />
                    )}
                    {formData.fotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, fotoUrl: '' }))}
                        className="absolute inset-0 bg-rose-950/80 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        title="Hapus Foto"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <label className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0">
                        <Upload className="w-3 h-3" />
                        <span>Upload Berkas</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">atau link URL:</span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={formData.fotoUrl}
                        onChange={e => setFormData({ ...formData, fotoUrl: e.target.value })}
                        placeholder="https://... (Link Gambar)"
                        className="w-full bg-white border border-slate-200 rounded-lg pl-7 pr-2 py-1 text-[11px] font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <LinkIcon className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
