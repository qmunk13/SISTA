import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, Users, CheckCircle, X, UserPlus } from 'lucide-react';
import { EkskulItem, EkskulMember, Siswa } from '../../types';
import { db } from '../../data/db';

export default function EkskulAnggotaTab() {
  const [members, setMembers] = useState<EkskulMember[]>([]);
  const [ekskulList, setEkskulList] = useState<EkskulItem[]>([]);
  const [students, setStudents] = useState<Siswa[]>([]);
  const [selectedEkskulFilter, setSelectedEkskulFilter] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    ekskulId: '',
    siswaId: '',
    jabatan: 'Anggota' as const,
    tanggalBergabung: new Date().toISOString().split('T')[0]
  });

  const loadData = () => {
    setMembers(db.get<EkskulMember>('ekskul_members'));
    setEkskulList(db.get<EkskulItem>('ekskul_items'));
    setStudents(db.get<Siswa>('siswa'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      ekskulId: ekskulList.length > 0 ? ekskulList[0].id : '',
      siswaId: students.length > 0 ? students[0].id : '',
      jabatan: 'Anggota',
      tanggalBergabung: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    const club = ekskulList.find(c => c.id === formData.ekskulId);
    const student = students.find(s => s.id === formData.siswaId);

    if (!club || !student) {
      alert('Pilih ekskul dan siswa yang valid!');
      return;
    }

    // Check duplicate
    const exists = members.some(m => m.ekskulId === club.id && m.siswaId === student.id);
    if (exists) {
      alert('Siswa ini sudah terdaftar di ekskul tersebut!');
      return;
    }

    const newMember: EkskulMember = {
      id: `MBR-${Date.now().toString().slice(-4)}`,
      ekskulId: club.id,
      ekskulNama: club.nama,
      siswaId: student.id,
      nis: student.nis || student.id,
      namaSiswa: student.nama,
      kelas: student.kelas || '5A',
      jabatan: formData.jabatan,
      tanggalBergabung: formData.tanggalBergabung,
      status: 'Aktif'
    };

    const updatedMembers = [newMember, ...members];
    db.set('ekskul_members', updatedMembers);

    // Update club member count (+1)
    const updatedClubs = ekskulList.map(c => {
      if (c.id === club.id) {
        return { ...c, jumlahAnggota: (c.jumlahAnggota || 0) + 1 };
      }
      return c;
    });
    db.set('ekskul_items', updatedClubs);

    setMembers(updatedMembers);
    setEkskulList(updatedClubs);
    setIsModalOpen(false);
  };

  const handleDeleteMember = (member: EkskulMember) => {
    if (confirm(`Hapus ${member.namaSiswa} dari keanggotaan ${member.ekskulNama}?`)) {
      const updatedMembers = members.filter(m => m.id !== member.id);
      db.set('ekskul_members', updatedMembers);

      // Decrement count
      const updatedClubs = ekskulList.map(c => {
        if (c.id === member.ekskulId) {
          return { ...c, jumlahAnggota: Math.max(0, (c.jumlahAnggota || 1) - 1) };
        }
        return c;
      });
      db.set('ekskul_items', updatedClubs);

      setMembers(updatedMembers);
      setEkskulList(updatedClubs);
    }
  };

  const filteredMembers = members.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchQuery = m.namaSiswa.toLowerCase().includes(q) || m.nis.toLowerCase().includes(q) || m.ekskulNama.toLowerCase().includes(q);
    const matchEkskul = selectedEkskulFilter === 'Semua' || m.ekskulId === selectedEkskulFilter;
    return matchQuery && matchEkskul;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa, NIS, atau ekstrakurikuler..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedEkskulFilter}
            onChange={(e) => setSelectedEkskulFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="Semua">Semua Ekskul</option>
            {ekskulList.map(c => (
              <option key={c.id} value={c.id}>{c.nama}</option>
            ))}
          </select>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <UserPlus size={16} />
            <span>Registrasi Anggota</span>
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Nama Siswa & NIS</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4">Ekstrakurikuler</th>
                <th className="py-3.5 px-4">Jabatan Organisasi</th>
                <th className="py-3.5 px-4">Tgl Bergabung</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    Tidak ada data anggota ekstrakurikuler ditemukan
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block">{member.namaSiswa}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">NIS: {member.nis}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      Kelas {member.kelas}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-blue-600 block">{member.ekskulNama}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        member.jabatan === 'Ketua' 
                          ? 'bg-amber-50 text-amber-800 border-amber-300' 
                          : member.jabatan === 'Wakil Ketua'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {member.jabatan}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {member.tanggalBergabung}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteMember(member)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                        title="Keluarkan Anggota"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Registrasi Anggota Baru</h3>
                  <p className="text-xs text-slate-400">Daftarkan siswa ke unit ekstrakurikuler</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Pilih Ekstrakurikuler *</label>
                <select
                  value={formData.ekskulId}
                  onChange={(e) => setFormData({ ...formData, ekskulId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {ekskulList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nama} ({c.kategori}) - {c.jumlahAnggota}/{c.kuotaMaksimal}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Pilih Siswa Terdaftar *</label>
                <select
                  value={formData.siswaId}
                  onChange={(e) => setFormData({ ...formData, siswaId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.kelas || '5A'} - NIS: {s.nis || s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Jabatan dalam Ekskul</label>
                  <select
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Ketua">Ketua</option>
                    <option value="Wakil Ketua">Wakil Ketua</option>
                    <option value="Sekretaris">Sekretaris</option>
                    <option value="Bendahara">Bendahara</option>
                    <option value="Anggota Utama">Anggota Utama</option>
                    <option value="Anggota">Anggota</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Tgl Bergabung</label>
                  <input
                    type="date"
                    value={formData.tanggalBergabung}
                    onChange={(e) => setFormData({ ...formData, tanggalBergabung: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-xs"
                >
                  Daftarkan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
