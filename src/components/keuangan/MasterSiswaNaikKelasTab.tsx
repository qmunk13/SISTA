import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, Search, Plus, ArrowUpRight, FileSpreadsheet, 
  Trash2, Edit3, X, Save, ArrowRight, CheckCircle2, UserCheck
} from 'lucide-react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { KeuanganKelas } from '../../data/keuanganSeed';
import { fetchFromGAS } from '../../lib/api';

export default function MasterSiswaNaikKelasTab() {
  const { students, setStudents, addStudent, updateStudent, deleteStudent, settings } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelas, setFilterKelas] = useState('');

  const [kelasList] = useState<KeuanganKelas[]>(() => {
    return db.get<KeuanganKelas>('keuangan_kelas') || [];
  });

  // Modal States
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [isNaikKelasModalOpen, setIsNaikKelasModalOpen] = useState(false);

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    id: '',
    nis: '',
    nisn: '',
    name: '',
    class: 'Kelas 4',
    parentName: '',
    parentPhone: '',
    status: 'Aktif',
  });

  // Naik Kelas Form State
  const [naikKelasForm, setNaikKelasForm] = useState({
    fromKelas: 'Kelas 4',
    toKelas: 'Kelas 5',
    onlyActive: true,
  });

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchTerm.toLowerCase();
      const nama = String(s.name || '').toLowerCase();
      const nis = String(s.nis || s.nisn || '').toLowerCase();
      const k = String(s.class || s.kelas || '').toLowerCase();
      const ortu = String(s.parentName || s.ortuNama || '').toLowerCase();
      const matchesQ = !searchTerm || nama.includes(q) || nis.includes(q) || ortu.includes(q);
      const matchesKelas = !filterKelas || k === filterKelas.toLowerCase() || k.includes(filterKelas.toLowerCase());
      return matchesQ && matchesKelas;
    });
  }, [students, searchTerm, filterKelas]);

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      id: `SIS_${Date.now()}`,
      nis: '',
      nisn: '',
      name: '',
      class: kelasList[0]?.nama || 'Kelas 4',
      parentName: '',
      parentPhone: '',
      status: 'Aktif',
    });
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (s: any) => {
    setEditingStudent(s);
    setStudentForm({
      id: s.id,
      nis: s.nis || '',
      nisn: s.nisn || '',
      name: s.name || '',
      class: s.class || s.kelas || 'Kelas 4',
      parentName: s.parentName || s.ortuNama || '',
      parentPhone: s.parentPhone || s.ortuHp || s.phone || '',
      status: s.status || 'Aktif',
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim()) {
      alert('Nama siswa harus diisi');
      return;
    }

    let nextStudents = [...students];
    if (editingStudent) {
      const updated = {
        ...editingStudent,
        ...studentForm,
      };
      updateStudent(editingStudent.id, updated);
      nextStudents = students.map(s => s.id === editingStudent.id ? { ...s, ...updated } : s);
    } else {
      const created = {
        id: studentForm.id || `SIS_${Date.now()}`,
        ...studentForm,
      } as any;
      addStudent(created);
      nextStudents = [...students, created];
    }

    if (settings.scriptUrl) {
      fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: nextStudents,
        teachers: useStore.getState().teachers,
        spreadsheetId: settings.spreadsheetId
      }).catch(err => console.warn("Sync error:", err));
    }

    setIsStudentModalOpen(false);
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (window.confirm(`Hapus siswa "${name}"?`)) {
      deleteStudent(id);
      const nextStudents = students.filter(s => s.id !== id);
      if (settings.scriptUrl) {
        fetchFromGAS(settings.scriptUrl, {
          action: 'sync',
          data: nextStudents,
          teachers: useStore.getState().teachers,
          spreadsheetId: settings.spreadsheetId
        }).catch(err => console.warn("Sync error:", err));
      }
    }
  };

  // Kenaikan Kelas Massal Execution
  const handleExecuteNaikKelas = (e: React.FormEvent) => {
    e.preventDefault();
    const { fromKelas, toKelas, onlyActive } = naikKelasForm;

    if (!fromKelas || !toKelas) {
      alert('Pilih kelas asal dan kelas tujuan');
      return;
    }
    if (fromKelas === toKelas) {
      alert('Kelas asal dan kelas tujuan tidak boleh sama');
      return;
    }

    const matched = students.filter(s => {
      const c = String(s.class || s.kelas || '').toLowerCase();
      const from = fromKelas.toLowerCase();
      const isClassMatch = c === from || c.includes(from);
      if (!isClassMatch) return false;
      if (onlyActive) {
        const st = String(s.status || 'Aktif').toLowerCase();
        return !st.includes('tidak') && st !== 'nonaktif' && st !== 'keluar' && st !== 'lulus';
      }
      return true;
    });

    if (matched.length === 0) {
      alert(`Tidak ada siswa di ${fromKelas} yang memenuhi kriteria.`);
      return;
    }

    if (!window.confirm(`Yakin memindahkan ${matched.length} siswa dari "${fromKelas}" ke "${toKelas}"?`)) {
      return;
    }

    const updatedStudents = students.map(s => {
      const isTarget = matched.some(m => m.id === s.id);
      if (isTarget) {
        return { ...s, class: toKelas, kelas: toKelas, updatedAt: new Date().toISOString() };
      }
      return s;
    });

    setStudents(updatedStudents);
    if (settings.scriptUrl) {
      fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: updatedStudents,
        teachers: useStore.getState().teachers,
        spreadsheetId: settings.spreadsheetId
      }).catch(err => console.warn("Sync error:", err));
    }
    setIsNaikKelasModalOpen(false);
    alert(`Berhasil menaikkan / memindahkan ${matched.length} siswa ke ${toKelas}!`);
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredStudents.map((s, idx) => ({
      'No': idx + 1,
      'ID Siswa': s.id,
      'NIS': s.nis || '',
      'NISN': s.nisn || '',
      'Nama Siswa': s.name,
      'Kelas': s.class || '',
      'Nama Orang Tua': s.parentName || (s as any).ortuNama || '',
      'No. HP Ortu': s.parentPhone || (s as any).ortuHp || '',
      'Status': s.status || 'Aktif',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, `Data_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header & Main Actions */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-emerald-600" />
            Master Siswa & Kenaikan Kelas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen data induk peserta didik & proses kenaikan kelas massal per tahun ajaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsNaikKelasModalOpen(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 active:scale-95"
          >
            <ArrowUpRight size={15} />
            <span>⬆️ Naik Kelas Massal</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenAddStudent}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={15} />
            <span>+ Tambah Siswa Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa, NIS, atau wali murid..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={13} />
              </button>
            )}
          </div>

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="">Semua Kelas</option>
            {kelasList.map(k => (
              <option key={k.id} value={k.nama}>{k.nama}</option>
            ))}
          </select>
        </div>

        <span className="text-[11px] font-bold text-slate-500 self-center">
          {filteredStudents.length} Siswa Terdaftar
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200 tracking-wider">
              <tr>
                <th className="p-3.5 pl-4">NIS / NISN</th>
                <th className="p-3.5">Nama Siswa</th>
                <th className="p-3.5">Kelas / Rombel</th>
                <th className="p-3.5">Nama Wali Murid</th>
                <th className="p-3.5">No. HP Ortu</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 space-y-2">
                    <Users size={36} className="mx-auto text-slate-300" />
                    <p className="font-bold text-slate-600 text-sm">Tidak Ada Data Siswa</p>
                    <p className="text-xs text-slate-400">Silakan sesuaikan pencarian atau tambah siswa baru.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 pl-4 font-mono font-bold text-slate-600">{s.nis || s.nisn || '-'}</td>
                    <td className="p-3.5 font-bold text-slate-900 text-sm">{s.name}</td>
                    <td className="p-3.5 font-bold text-blue-700">{s.class || '-'}</td>
                    <td className="p-3.5 text-slate-800">{s.parentName || (s as any).ortuNama || '-'}</td>
                    <td className="p-3.5 font-mono text-slate-600">{s.parentPhone || (s as any).ortuHp || s.phone || '-'}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800">
                        {s.status || 'Aktif'}
                      </span>
                    </td>
                    <td className="p-3.5 pr-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditStudent(s)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Siswa"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(s.id, s.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Siswa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit Siswa */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Users size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
              </div>
              <button onClick={() => setIsStudentModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIS</label>
                  <input
                    type="text"
                    required
                    placeholder="Nomor Induk Siswa"
                    value={studentForm.nis}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, nis: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={studentForm.class}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, class: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.nama}>{k.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap..."
                  value={studentForm.name}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Wali Murid (Ortu)</label>
                  <input
                    type="text"
                    placeholder="Nama orang tua..."
                    value={studentForm.parentName}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, parentName: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. HP / WA Wali</label>
                  <input
                    type="text"
                    placeholder="08xxxx..."
                    value={studentForm.parentPhone}
                    onChange={(e) => setStudentForm(prev => ({ ...prev, parentPhone: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Keaktifan</label>
                <select
                  value={studentForm.status}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                  <option value="Pindah">Pindah</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Keluar">Keluar</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Data Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kenaikan Kelas Massal */}
      {isNaikKelasModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ArrowUpRight size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Kenaikan Kelas Massal</h3>
              </div>
              <button onClick={() => setIsNaikKelasModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteNaikKelas} className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 leading-relaxed font-medium">
                Pilih kelas asal dan kelas tujuan. Sistem akan memindahkan seluruh siswa aktif dari rombel asal ke rombel tujuan secara otomatis dan aman.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Asal</label>
                  <select
                    value={naikKelasForm.fromKelas}
                    onChange={(e) => setNaikKelasForm(prev => ({ ...prev, fromKelas: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.nama}>{k.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Tujuan</label>
                  <select
                    value={naikKelasForm.toKelas}
                    onChange={(e) => setNaikKelasForm(prev => ({ ...prev, toKelas: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.nama}>{k.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kriteria Siswa</label>
                <select
                  value={naikKelasForm.onlyActive ? '1' : '0'}
                  onChange={(e) => setNaikKelasForm(prev => ({ ...prev, onlyActive: e.target.value === '1' }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="1">Hanya Siswa Berstatus Aktif</option>
                  <option value="0">Semua Siswa di Kelas Asal</option>
                </select>
              </div>

              <div className="text-[11px] text-slate-400 font-medium">
                Catatan: Tagihan & riwayat invoice masa lampau tidak berubah agar arsip pembukuan keuangan tetap terjaga.
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNaikKelasModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <ArrowUpRight size={14} />
                  <span>Proses Kenaikan Kelas &rarr;</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
