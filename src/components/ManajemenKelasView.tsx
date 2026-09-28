import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Users,
  CheckCircle2
} from 'lucide-react';
import { User } from '../types';
import { getKelasList, saveKelasList, getSiswaList } from '../lib/storage';

interface ManajemenKelasViewProps {
  currentUser: User;
}

export const ManajemenKelasView: React.FC<ManajemenKelasViewProps> = ({ currentUser }) => {
  const [classList, setClassList] = useState<string[]>(getKelasList());
  const [newKelasName, setNewKelasName] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);

  const allSiswa = getSiswaList();

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKelasName.trim().toUpperCase();
    if (!clean) return;

    if (classList.includes(clean)) {
      alert(`Kelas ${clean} sudah ada di dalam daftar!`);
      return;
    }

    const updated = [...classList, clean].sort();
    setClassList(updated);
    saveKelasList(updated);
    setNewKelasName('');
    setMessage(`Kelas ${clean} berhasil ditambahkan!`);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStartEdit = (index: number, currentVal: string) => {
    setEditingIndex(index);
    setEditingValue(currentVal);
  };

  const handleSaveEdit = (index: number) => {
    const clean = editingValue.trim().toUpperCase();
    if (!clean) return;

    const updated = [...classList];
    updated[index] = clean;
    updated.sort();

    setClassList(updated);
    saveKelasList(updated);
    setEditingIndex(null);
    setMessage(`Nama kelas berhasil diperbarui menjadi ${clean}!`);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteClass = (kelasName: string) => {
    const studentCount = allSiswa.filter(s => s.kelas === kelasName).length;
    if (studentCount > 0) {
      if (!confirm(`Terdapat ${studentCount} siswa di dalam kelas ${kelasName}. Yakin ingin menghapus kelas ini?`)) {
        return;
      }
    }

    const updated = classList.filter(c => c !== kelasName);
    setClassList(updated);
    saveKelasList(updated);
    setMessage(`Kelas ${kelasName} berhasil dihapus.`);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Manajemen Struktur Kelas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Tambah, ubah, atau hapus rombel/kelas di sekolah.</p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Add New Class Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">Tambah Kelas / Rombel Baru</h3>
        <form onSubmit={handleAddClass} className="flex gap-3">
          <input
            type="text"
            value={newKelasName}
            onChange={e => setNewKelasName(e.target.value)}
            placeholder="Nama kelas (e.g. 10-D, 11-MIPA-1)..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rombel</span>
          </button>
        </form>
      </div>

      {/* Class List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
          <span>Daftar Kelas Aktif ({classList.length} Kelas)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-5 py-3">Nama Kelas / Rombel</th>
                <th className="px-5 py-3 text-center">Jumlah Siswa Terdaftar</th>
                <th className="px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classList.map((c, idx) => {
                const count = allSiswa.filter(s => s.kelas === c).length;
                const isEditing = editingIndex === idx;

                return (
                  <tr key={c} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={e => setEditingValue(e.target.value)}
                            className="bg-indigo-50 border border-indigo-300 rounded-lg px-2 py-1 font-bold text-xs outline-none"
                          />
                          <button
                            onClick={() => handleSaveEdit(idx)}
                            className="px-3 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded-lg"
                          >
                            Simpan
                          </button>
                        </div>
                      ) : (
                        <span>Kelas {c}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{count} Siswa</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(idx, c)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition"
                          title="Edit Kelas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
