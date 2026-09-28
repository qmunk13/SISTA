import React, { useState, useMemo } from 'react';
import { db } from '../../data/db';
import { Calendar, Plus, Edit2, Trash2, X, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export default function JadwalKegiatanTab() {
  const [events, setEvents] = useState<any[]>(() => {
    const fromDb = db.get<any>('agenda');
    return Array.isArray(fromDb) ? fromDb : [];
  });

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    judul: '',
    kategori: 'Akademik',
    status: 'Akan Datang',
    keterangan: ''
  });

  const [notification, setNotification] = useState('');

  const saveToDb = (newList: any[]) => {
    setEvents(newList);
    db.set('agenda', newList);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      judul: '',
      kategori: 'Akademik',
      status: 'Akan Datang',
      keterangan: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      tanggal: item.tanggal || '',
      judul: item.judul || '',
      kategori: item.kategori || 'Akademik',
      status: item.status || 'Akan Datang',
      keterangan: item.keterangan || ''
    });
    setShowModal(true);
  };

  const handleDelete = (id: string, judul: string) => {
    if (window.confirm(`Hapus agenda kegiatan "${judul}"?`)) {
      const updated = events.filter(e => e.id !== id);
      saveToDb(updated);
      setNotification('Agenda kegiatan berhasil dihapus.');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const updated = events.map(ev => ev.id === editingItem.id ? { ...ev, ...formData } : ev);
      saveToDb(updated);
      setNotification('Agenda kegiatan berhasil diperbarui!');
    } else {
      const newItem = {
        id: String(Date.now()),
        ...formData
      };
      saveToDb([...events, newItem]);
      setNotification('Agenda kegiatan baru berhasil ditambahkan!');
    }
    setShowModal(false);
    setTimeout(() => setNotification(''), 3000);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="text-purple-600" size={20} />
            Jadwal Kalender Kerja & Kegiatan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Kelola agenda kegiatan tahunan, upacara, rapat guru, dan asesmen.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs shadow-xs transition active:scale-95"
        >
          <Plus size={15} />
          <span>Tambah Agenda Baru</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {events.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-dashed rounded-2xl">
          <Calendar size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-600 text-sm">Belum Ada Agenda Kalender</p>
          <p className="text-xs text-slate-400 mt-1">Klik tombol 'Tambah Agenda Baru' untuk membuat jadwal kegiatan lembaga.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px] border-b">
              <tr>
                <th className="p-3.5 pl-4">No</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Nama Kegiatan / Agenda</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5">Keterangan</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {events.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 pl-4 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">{item.tanggal}</td>
                  <td className="p-3.5 font-bold text-indigo-950">{item.judul}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                      {item.kategori}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500 max-w-xs truncate">{item.keterangan || '-'}</td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-lg transition"
                        title="Edit Agenda"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.judul)}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition"
                        title="Hapus Agenda"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add / Edit Agenda */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="text-purple-600" size={18} />
                {editingItem ? 'Edit Agenda Kegiatan' : 'Tambah Agenda Kegiatan Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Pelaksanaan:</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Kegiatan / Agenda:</label>
                <input
                  type="text"
                  placeholder="Contoh: Rapat Dewan Guru Awal Semester"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori:</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Akademik">Akademik</option>
                    <option value="Ujian">Ujian / Asesmen</option>
                    <option value="Upacara">Upacara</option>
                    <option value="Rapat">Rapat Dinas</option>
                    <option value="Kegiatan">Kegiatan Siswa</option>
                    <option value="Rapor">Rapor / Kelulusan</option>
                    <option value="Libur">Libur</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Kegiatan:</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Berlangsung">Sedang Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditunda">Ditunda</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan / Catatan Tambahan:</label>
                <textarea
                  rows={2}
                  placeholder="Lokasi, pakaian yang dikenakan, atau instruksi..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
