import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Building2,
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Award,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { Siswa, Guru, Kelas, Jurusan, Mapel } from '../../types';

interface SiskoModuleProps {
  siswaList: Siswa[];
  guruList: Guru[];
  kelasList: Kelas[];
  jurusanList?: Jurusan[];
  mapelList: Mapel[];
  onAddSiswa: (siswa: Siswa) => void;
  onAddGuru: (guru: Guru) => void;
}

export const SiskoModule: React.FC<SiskoModuleProps> = ({
  siswaList,
  guruList,
  kelasList,
  jurusanList = [],
  mapelList,
  onAddSiswa,
  onAddGuru
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'siswa' | 'guru' | 'kelas' | 'kenaikan'>('siswa');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiswaModal, setSelectedSiswaModal] = useState<Siswa | null>(null);

  // Form New Siswa
  const [newSiswa, setNewSiswa] = useState<Partial<Siswa>>({
    NamaLengkap: '',
    NISN: '',
    NIS: '',
    JenisKelamin: 'L',
    KelasID: 'KLS-10A',
    JurusanID: 'JUR-01',
    Status: 'AKTIF'
  });

  const handleCreateSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiswa.NamaLengkap || !newSiswa.NISN) return;
    const full: Siswa = {
      SiswaID: 'SIS-' + Math.floor(1000 + Math.random() * 9000),
      NIS: newSiswa.NIS || '2425' + Math.floor(1000 + Math.random() * 9000),
      NISN: newSiswa.NISN,
      NIK: '317101' + Math.floor(1000000000 + Math.random() * 9000000000),
      NamaLengkap: newSiswa.NamaLengkap,
      NamaPanggilan: newSiswa.NamaLengkap.split(' ')[0],
      JenisKelamin: (newSiswa.JenisKelamin as 'L' | 'P') || 'L',
      TempatLahir: 'Jakarta',
      TanggalLahir: '2008-01-01',
      Agama: 'Islam',
      Alamat: 'Jl. Merdeka No. ' + Math.floor(1 + Math.random() * 100),
      RT: '01', RW: '02', Desa: 'Tambora', Kecamatan: 'Tambora',
      Kabupaten: 'Jakarta Barat', Provinsi: 'DKI Jakarta', KodePos: '11230',
      NoHP: '0812' + Math.floor(10000000 + Math.random() * 90000000),
      Email: newSiswa.NamaLengkap.toLowerCase().replace(/\s+/g, '.') + '@siswa.sch.id',
      Ayah: 'Bpk. ' + newSiswa.NamaLengkap.split(' ')[0],
      Ibu: 'Ibu ' + newSiswa.NamaLengkap.split(' ')[0],
      NoHPAyah: '081300000000',
      NoHPIbu: '081300000000',
      KelasID: newSiswa.KelasID || 'KLS-10A',
      JurusanID: newSiswa.JurusanID || 'JUR-01',
      Status: 'AKTIF',
      Foto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250'
    };
    onAddSiswa(full);
    setNewSiswa({ NamaLengkap: '', NISN: '', NIS: '', JenisKelamin: 'L' });
  };

  const filteredSiswa = siswaList.filter(
    (s) =>
      s.NamaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.NISN.includes(searchQuery) ||
      s.KelasID.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('siswa')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'siswa'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Master Data Siswa
          </button>
          <button
            onClick={() => setActiveSubTab('guru')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'guru'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Master Data Guru
          </button>
          <button
            onClick={() => setActiveSubTab('kelas')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'kelas'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Kelas & Jurusan
          </button>
        </div>
      </div>

      {activeSubTab === 'siswa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Direktori Master Siswa ({filteredSiswa.length})</h3>
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa atau NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-200 text-xs font-semibold rounded-xl pl-9 pr-3 py-2 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Siswa</th>
                    <th className="p-3">NISN / NIS</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.map((s) => (
                    <tr key={s.SiswaID} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-800 flex items-center gap-2">
                        <img src={s.Foto} className="w-7 h-7 rounded-full object-cover" alt="" />
                        <span>{s.NamaLengkap}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-500">{s.NISN}</td>
                      <td className="p-3">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">{s.KelasID}</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          {s.Status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedSiswaModal(s)}
                          className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-slate-600 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Create */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs h-fit space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> Tambah Siswa Baru
            </h3>

            <form onSubmit={handleCreateSiswa} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newSiswa.NamaLengkap}
                  onChange={(e) => setNewSiswa({ ...newSiswa, NamaLengkap: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                  placeholder="Sesuai Ijazah"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase mb-1">NISN</label>
                <input
                  type="text"
                  required
                  value={newSiswa.NISN}
                  onChange={(e) => setNewSiswa({ ...newSiswa, NISN: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none"
                  placeholder="10 digit NISN"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Jenis Kelamin</label>
                  <select
                    value={newSiswa.JenisKelamin}
                    onChange={(e) => setNewSiswa({ ...newSiswa, JenisKelamin: e.target.value as 'L' | 'P' })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                  >
                    <option value="L">Laki-Laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Kelas</label>
                  <select
                    value={newSiswa.KelasID}
                    onChange={(e) => setNewSiswa({ ...newSiswa, KelasID: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none"
                  >
                    {kelasList.map((k) => (
                      <option key={k.KelasID} value={k.KelasID}>
                        {k.NamaKelas}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition mt-2"
              >
                Simpan Ke Database Master
              </button>
            </form>
          </div>
        </div>
      )}

      {activeSubTab === 'guru' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">Direktori Guru & Pendidik ({guruList.length})</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {guruList.map((g) => (
              <div key={g.GuruID} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {g.Nama.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{g.Nama}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">NIP: {g.NIP}</p>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                  <p>Jabatan: <strong className="text-slate-800">{g.Jabatan}</strong></p>
                  <p>Email: <strong className="text-slate-800">{g.Email}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'kelas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Daftar Kelas (Rombel)</h3>
            <div className="space-y-2">
              {kelasList.map((k) => (
                <div key={k.KelasID} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{k.NamaKelas}</h4>
                    <p className="text-[10px] text-slate-500">Ruangan: {k.Ruangan} | Tingkat {k.Tingkat}</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                    {k.Status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Daftar Jurusan / Program Keahlian</h3>
            <div className="space-y-2">
              {jurusanList.map((j) => (
                <div key={j.JurusanID} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900">{j.NamaJurusan}</h4>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">{j.Kode}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{j.Keterangan}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
