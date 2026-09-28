import React, { useState, useEffect } from 'react';
import { Plus, Users, Clock, MapPin, User, Edit2, Trash2, Tag, Calendar, Sparkles, X } from 'lucide-react';
import { EkskulItem } from '../../types';
import { db } from '../../data/db';

export default function EkskulMasterTab() {
  const [ekskulList, setEkskulList] = useState<EkskulItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EkskulItem | null>(null);

  const [formData, setFormData] = useState<Partial<EkskulItem>>({
    nama: '',
    kategori: 'Olahraga',
    pembinaNama: '',
    pembinaNip: '',
    pelatihNama: '',
    pelatihKontak: '',
    hariLatihan: 'Jumat',
    jamMulai: '14:30',
    jamSelesai: '16:30',
    lokasi: 'Lapangan Sekolah',
    kuotaMaksimal: 40,
    jumlahAnggota: 0,
    deskripsi: '',
    status: 'Aktif',
    fotoUrl: ''
  });

  const loadData = () => {
    setEkskulList(db.get<EkskulItem>('ekskul_items'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      nama: '',
      kategori: 'Olahraga',
      pembinaNama: '',
      pembinaNip: '',
      pelatihNama: '',
      pelatihKontak: '',
      hariLatihan: 'Jumat',
      jamMulai: '14:30',
      jamSelesai: '16:30',
      lokasi: 'Lapangan Sekolah',
      kuotaMaksimal: 40,
      jumlahAnggota: 0,
      deskripsi: '',
      status: 'Aktif',
      fotoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=500&auto=format&fit=crop&q=80'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: EkskulItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.pembinaNama) {
      alert('Nama ekskul dan pembina wajib diisi!');
      return;
    }

    if (editingItem) {
      const updated = ekskulList.map(item => item.id === editingItem.id ? { ...item, ...formData } : item);
      db.set('ekskul_items', updated);
      setEkskulList(updated as EkskulItem[]);
    } else {
      const newItem: EkskulItem = {
        id: `EKS-${Date.now().toString().slice(-4)}`,
        nama: formData.nama || '',
        kategori: formData.kategori || 'Olahraga',
        pembinaNama: formData.pembinaNama || '',
        pembinaNip: formData.pembinaNip,
        pelatihNama: formData.pelatihNama,
        pelatihKontak: formData.pelatihKontak,
        hariLatihan: formData.hariLatihan || 'Jumat',
        jamMulai: formData.jamMulai || '14:00',
        jamSelesai: formData.jamSelesai || '16:00',
        lokasi: formData.lokasi || 'Lingkungan Sekolah',
        kuotaMaksimal: Number(formData.kuotaMaksimal) || 30,
        jumlahAnggota: Number(formData.jumlahAnggota) || 0,
        deskripsi: formData.deskripsi || '',
        status: formData.status || 'Aktif',
        fotoUrl: formData.fotoUrl || 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=500&auto=format&fit=crop&q=80'
      };
      const updated = [newItem, ...ekskulList];
      db.set('ekskul_items', updated);
      setEkskulList(updated);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus unit ekstrakurikuler ini?')) {
      const updated = ekskulList.filter(item => item.id !== id);
      db.set('ekskul_items', updated);
      setEkskulList(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">Daftar Ekstrakurikuler Sekolah</h3>
          <p className="text-xs text-slate-400">Pilihan bakat, minat kepemimpinan, olahraga, seni & teknologi</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          <span>Tambah Ekskul Baru</span>
        </button>
      </div>

      {/* Grid of Clubs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ekskulList.map((club) => (
          <div
            key={club.id}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col group hover:border-blue-300 hover:shadow-md transition duration-200"
          >
            {/* Club Image Banner */}
            <div className="relative h-44 bg-slate-100 overflow-hidden shrink-0">
              <img
                src={club.fotoUrl}
                alt={club.nama}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black rounded-full shadow-xs">
                  {club.kategori}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-0.5 bg-emerald-500 text-white text-[10px] font-extrabold rounded-full shadow-xs">
                  {club.status}
                </span>
              </div>
            </div>

            {/* Club Details Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition">
                  {club.nama}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {club.deskripsi}
                </p>
              </div>

              {/* Schedule & Coach Details */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2 text-slate-600">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-blue-500 shrink-0" />
                  <span className="truncate"><strong>Pembina:</strong> {club.pembinaNama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-500 shrink-0" />
                  <span><strong>Jadwal:</strong> {club.hariLatihan}, {club.jamMulai} - {club.jamSelesai}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-rose-500 shrink-0" />
                  <span className="truncate"><strong>Lokasi:</strong> {club.lokasi}</span>
                </div>
              </div>

              {/* Member progress & Action buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Users size={15} className="text-slate-400" />
                  <span>{club.jumlahAnggota || 0} / {club.kuotaMaksimal} Anggota</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(club)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition"
                    title="Edit Ekskul"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(club.id)}
                    className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-xl transition"
                    title="Hapus Ekskul"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingItem ? 'Edit Informasi Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Atur jadwal pembina, instruktur, dan kuota anggota</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-extrabold text-slate-700 block mb-1">Nama Ekstrakurikuler *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sanggar Tari Tradisional Nusantara"
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.kategori || 'Olahraga'}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Olahraga">Olahraga</option>
                    <option value="Seni & Budaya">Seni & Budaya</option>
                    <option value="Kepemimpinan">Kepemimpinan</option>
                    <option value="Keagamaan">Keagamaan</option>
                    <option value="Sains & Teknologi">Sains & Teknologi</option>
                    <option value="Bahasa">Bahasa</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Nama Guru Pembina *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap & Gelar"
                    value={formData.pembinaNama || ''}
                    onChange={(e) => setFormData({ ...formData, pembinaNama: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Pelatih / Instruktur Luar</label>
                  <input
                    type="text"
                    placeholder="Nama Pelatih (Opsional)"
                    value={formData.pelatihNama || ''}
                    onChange={(e) => setFormData({ ...formData, pelatihNama: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kontak WhatsApp Pelatih</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.pelatihKontak || ''}
                    onChange={(e) => setFormData({ ...formData, pelatihKontak: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Hari Latihan Rutin</label>
                  <select
                    value={formData.hariLatihan || 'Jumat'}
                    onChange={(e) => setFormData({ ...formData, hariLatihan: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Jam Mulai</label>
                    <input
                      type="time"
                      value={formData.jamMulai || '14:00'}
                      onChange={(e) => setFormData({ ...formData, jamMulai: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Jam Selesai</label>
                    <input
                      type="time"
                      value={formData.jamSelesai || '16:00'}
                      onChange={(e) => setFormData({ ...formData, jamSelesai: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Lokasi Latihan</label>
                  <input
                    type="text"
                    placeholder="Lapangan Utama / Aula / Sanggar"
                    value={formData.lokasi || ''}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kuota Maksimal Murid</label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={formData.kuotaMaksimal || 30}
                    onChange={(e) => setFormData({ ...formData, kuotaMaksimal: parseInt(e.target.value) || 30 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-extrabold text-slate-700 block mb-1">URL Foto Banner / Dokumentasi</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.fotoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, fotoUrl: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-extrabold text-slate-700 block mb-1">Deskripsi & Tujuan Kegiatan</label>
                  <textarea
                    rows={3}
                    placeholder="Tulis ringkasan materi pembinaan karakter dan target prestasi..."
                    value={formData.deskripsi || ''}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Simpan Ekstrakurikuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
