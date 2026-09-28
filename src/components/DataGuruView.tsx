import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Mail,
  Phone
} from 'lucide-react';
import { User, Guru } from '../types';
import { getGuruList, getKelasList, saveGuruList } from '../lib/storage';

interface DataGuruViewProps {
  currentUser: User;
}

export const DataGuruView: React.FC<DataGuruViewProps> = ({ currentUser }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGuru, setEditingGuru] = useState<Guru | null>(null);

  const [formData, setFormData] = useState({
    nip: '',
    nama: '',
    jk: 'L' as 'L' | 'P',
    tempatLahir: '',
    tglLahir: '',
    nik: '',
    noHp: '',
    email: '',
    mapel: '',
    kelas: [] as string[],
    status: 'AKTIF' as 'AKTIF' | 'TIDAK AKTIF',
    role: 'guru' as 'guru' | 'wakel' | 'admin'
  });

  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const classes = getKelasList();
  const guruList = getGuruList();

  const filteredGuru = guruList.filter(g => {
    const q = searchQuery.toLowerCase();
    const nama = (g.nama || '').toLowerCase();
    const nip = (g.nip || '').toLowerCase();
    const nik = (g.nik || '').toLowerCase();
    const mapel = (g.mapel || g.mataPelajaran || '').toLowerCase();
    const email = (g.email || '').toLowerCase();
    const noHp = (g.noHp || '').toLowerCase();
    const kelasStr = (Array.isArray(g.kelas) ? g.kelas.join(' ') : (g.kelas || g.kelasAjar || '')).toLowerCase();

    return nama.includes(q) || nip.includes(q) || nik.includes(q) || mapel.includes(q) || email.includes(q) || noHp.includes(q) || kelasStr.includes(q);
  });

  const handleOpenAdd = () => {
    setEditingGuru(null);
    setFormData({
      nip: '',
      nama: '',
      jk: 'L',
      tempatLahir: '',
      tglLahir: '',
      nik: '',
      noHp: '',
      email: '',
      mapel: '',
      kelas: [],
      status: 'AKTIF',
      role: 'guru'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (guru: Guru) => {
    setEditingGuru(guru);
    let assignedClasses: string[] = [];
    if (typeof guru.kelas === 'string') {
      assignedClasses = guru.kelas.split(',').map(k => k.trim()).filter(Boolean);
    } else if (Array.isArray(guru.kelas)) {
      assignedClasses = guru.kelas;
    } else if (guru.kelasAjar) {
      assignedClasses = [guru.kelasAjar];
    }

    setFormData({
      nip: guru.nip || '',
      nama: guru.nama || '',
      jk: (guru.jk === 'P' ? 'P' : 'L'),
      tempatLahir: guru.tempatLahir || '',
      tglLahir: guru.tglLahir || '',
      nik: guru.nik || '',
      noHp: guru.noHp || '',
      email: guru.email || '',
      mapel: guru.mapel || guru.mataPelajaran || '',
      kelas: assignedClasses,
      status: (guru.status === 'TIDAK AKTIF' ? 'TIDAK AKTIF' : 'AKTIF'),
      role: (guru.role as any) || 'guru'
    });
    setIsModalOpen(true);
  };

  const handleToggleClass = (kelasName: string) => {
    setFormData(prev => {
      const exists = prev.kelas.includes(kelasName);
      if (exists) {
        return { ...prev, kelas: prev.kelas.filter(k => k !== kelasName) };
      } else {
        return { ...prev, kelas: [...prev.kelas, kelasName] };
      }
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return;

    const currentList = getGuruList();
    const kelasStr = formData.kelas.join(', ');

    const payload: Partial<Guru> = {
      ...formData,
      mapel: formData.mapel,
      mataPelajaran: formData.mapel,
      kelas: kelasStr,
      kelasAjar: kelasStr,
      username: formData.nip || (editingGuru?.username) || ('guru_' + Date.now())
    };

    if (editingGuru) {
      const updated = currentList.map(g => g.id === editingGuru.id ? { ...g, ...payload } : g);
      saveGuruList(updated);
      setMessage({ text: 'Data guru berhasil diperbarui!', success: true });
    } else {
      const newGuru: Guru = {
        id: 'gr_' + Date.now(),
        ...payload
      } as Guru;
      saveGuruList([...currentList, newGuru]);
      setMessage({ text: 'Guru baru berhasil ditambahkan!', success: true });
    }

    setIsModalOpen(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteGuru = (id: string, nama: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data guru ${nama}?`)) {
      const currentList = getGuruList();
      saveGuruList(currentList.filter(g => g.id !== id));
      setMessage({ text: `Data guru ${nama} berhasil dihapus.`, success: true });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Manajemen Data Guru & Tenaga Pendidik</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Pengelolaan direktori pendidik, NIP, NIK, penugasan mata pelajaran & wali kelas.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center">
        <span className="text-xs font-bold text-slate-600">Total Guru Terdaftar: {guruList.length} Pendidik</span>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari NIP / Nama / Mapel / NIK..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none"
          />
        </div>
      </div>

      {/* Teacher Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
          <span>Direktori Tenaga Pendidik</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-center w-10">No</th>
                <th className="px-4 py-3">Guru</th>
                <th className="px-3 py-3 text-center">Jenis Kelamin</th>
                <th className="px-4 py-3">Tempat, Tgl Lahir</th>
                <th className="px-4 py-3">NIK</th>
                <th className="px-4 py-3">No. Telepon / Email</th>
                <th className="px-4 py-3">Mapel / Kelas</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuru.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    Tidak ada data guru ditemukan.
                  </td>
                </tr>
              ) : (
                filteredGuru.map((g, idx) => {
                  const displayMapel = g.mapel || g.mataPelajaran || '-';
                  const displayKelas = g.kelasAjar || (Array.isArray(g.kelas) ? g.kelas.join(', ') : g.kelas) || '-';
                  const isAktif = g.status !== 'TIDAK AKTIF';

                  return (
                    <tr key={g.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{g.nama}</div>
                        {g.nip && <div className="text-[10px] font-mono text-slate-400">NIP: {g.nip}</div>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          g.jk === 'P' ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {g.jk === 'P' ? 'Perempuan' : 'Laki-laki'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {g.tempatLahir || g.tglLahir ? (
                          <div>
                            <div>{g.tempatLahir || '-'}</div>
                            <div className="text-[10px] text-slate-400">{g.tglLahir || ''}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 font-medium">
                        {g.nik || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {g.noHp && (
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{g.noHp}</span>
                          </div>
                        )}
                        {g.email && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{g.email}</span>
                          </div>
                        )}
                        {!g.noHp && !g.email && <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-indigo-700">{displayMapel}</div>
                        <div className="text-[10px] text-slate-500 font-medium">Kelas: {displayKelas}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          isAktif ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {isAktif ? 'AKTIF' : 'TIDAK AKTIF'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(g)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                            title="Edit Guru"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGuru(g.id, g.nama)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title="Hapus Guru"
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

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-slate-800 mb-1">
              {editingGuru ? 'Edit Data Guru' : 'Tambah Guru Baru'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Lengkapi data identitas pendidik, NIP, NIK, nomor telepon, dan kelas binaan.</p>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={e => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="e.g. 198203152008011002"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">NIK (16 Digit)</label>
                  <input
                    type="text"
                    value={formData.nik}
                    onChange={e => setFormData({ ...formData, nik: e.target.value })}
                    placeholder="e.g. 3175010101820001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Lengkap Guru (dengan Gelar) *</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={e => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="e.g. Dra. Hani Rahmawati, M.Pd."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Jenis Kelamin</label>
                  <select
                    value={formData.jk}
                    onChange={e => setFormData({ ...formData, jk: e.target.value as 'L' | 'P' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.tempatLahir}
                    onChange={e => setFormData({ ...formData, tempatLahir: e.target.value })}
                    placeholder="Kota Lahir"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tglLahir}
                    onChange={e => setFormData({ ...formData, tglLahir: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">No. Telepon / HP (WA)</label>
                  <input
                    type="text"
                    value={formData.noHp}
                    onChange={e => setFormData({ ...formData, noHp: e.target.value })}
                    placeholder="e.g. 081234567890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alamat Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. guru@rombel.sch.id"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={formData.mapel}
                    onChange={e => setFormData({ ...formData, mapel: e.target.value })}
                    placeholder="e.g. Matematika"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Keaktifan</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as 'AKTIF' | 'TIDAK AKTIF' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="TIDAK AKTIF">TIDAK AKTIF</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Peran Akses Aplikasi</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                >
                  <option value="guru">Guru / Wali Kelas Standard</option>
                  <option value="wakel">Wakil Kepala Sekolah (Akses Rekap & Laporan)</option>
                  <option value="admin">Administrator Penuh</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Kelas Binaan (Wali Kelas)</label>
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-32 overflow-y-auto">
                  {classes.map(c => {
                    const isSelected = formData.kelas.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleToggleClass(c)}
                        className={`p-2 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                          isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
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
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

