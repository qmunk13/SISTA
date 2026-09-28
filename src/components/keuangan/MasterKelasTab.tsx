import React, { useState } from 'react';
import { Plus, Edit3, Trash2, X, Save, School, Check } from 'lucide-react';
import { db } from '../../data/db';
import { KeuanganKelas } from '../../data/keuanganSeed';

export default function MasterKelasTab() {
  const [kelasList, setKelasList] = useState<KeuanganKelas[]>(() => {
    return db.get<KeuanganKelas>('keuangan_kelas') || [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KeuanganKelas | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    nama: '',
    wali: '',
    aktif: true,
  });

  const saveKelasToDb = (newList: KeuanganKelas[]) => {
    setKelasList(newList);
    db.set('keuangan_kelas', newList);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      id: `KLS_${Date.now()}`,
      nama: '',
      wali: '',
      aktif: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: KeuanganKelas) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      nama: item.nama,
      wali: item.wali || '',
      aktif: item.aktif !== false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus master kelas ini?')) {
      const updated = kelasList.filter(k => k.id !== id);
      saveKelasToDb(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      alert('Nama kelas harus diisi');
      return;
    }

    if (editingItem) {
      const updated = kelasList.map(k => k.id === editingItem.id ? { ...k, ...formData } : k);
      saveKelasToDb(updated);
    } else {
      const newItem: KeuanganKelas = {
        id: formData.id || `KLS_${Date.now()}`,
        nama: formData.nama,
        wali: formData.wali,
        aktif: formData.aktif,
        createdAt: new Date().toISOString(),
      };
      saveKelasToDb([...kelasList, newItem]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <School size={20} className="text-emerald-600" />
            Master Rombel & Kelas Belajar
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar rombongan belajar (Paket A, B, C), wali kelas, & status keaktifan kelas.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 active:scale-95"
        >
          <Plus size={15} />
          <span>+ Tambah Kelas Baru</span>
        </button>
      </div>

      {/* Grid of Classes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kelasList.map(k => (
          <div key={k.id} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between group hover:border-slate-300 transition">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">{k.id}</span>
                <h3 className="text-base font-black text-slate-900">{k.nama}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                k.aktif !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {k.aktif !== false ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-400 block mb-0.5">Wali Kelas / Pengampu:</span>
              <span className="font-bold text-slate-800">{k.wali || 'Belum Ditentukan'}</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
              <button
                onClick={() => handleOpenEdit(k)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 rounded-xl font-bold text-xs transition flex items-center gap-1"
              >
                <Edit3 size={13} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(k.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Hapus"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add/Edit Kelas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <School size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {editingItem ? 'Edit Kelas' : 'Tambah Kelas Baru'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ID Kelas</label>
                <input
                  type="text"
                  value={formData.id}
                  disabled={!!editingItem}
                  onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  required
                  placeholder="misal: Kelas 4, Kelas 7..."
                  value={formData.nama}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Wali Kelas / Guru</label>
                <input
                  type="text"
                  placeholder="misal: Ustadz Ahmad, S.Pd..."
                  value={formData.wali}
                  onChange={(e) => setFormData(prev => ({ ...prev, wali: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={formData.aktif ? '1' : '0'}
                  onChange={(e) => setFormData(prev => ({ ...prev, aktif: e.target.value === '1' }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="1">Aktif</option>
                  <option value="0">Nonaktif</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Simpan Kelas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
