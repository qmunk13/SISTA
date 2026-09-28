import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Plus, CheckCircle2, Clock3, Tag, X } from 'lucide-react';
import { MadingAgenda } from '../../types';
import { db } from '../../data/db';

export default function MadingAgendaTab() {
  const [agendas, setAgendas] = useState<MadingAgenda[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<MadingAgenda>>({
    judul: '',
    kategori: 'Akademik',
    tanggalMulai: '',
    tanggalSelesai: '',
    waktu: '07:30 - 12:00',
    lokasi: 'Sekolah',
    deskripsi: '',
    status: 'Akan Datang'
  });

  const loadData = () => {
    setAgendas(db.get<MadingAgenda>('mading_agenda'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.tanggalMulai) {
      alert('Judul dan tanggal kegiatan wajib diisi!');
      return;
    }

    const newItem: MadingAgenda = {
      id: `AGENDA-${Date.now().toString().slice(-4)}`,
      judul: formData.judul || '',
      kategori: formData.kategori || 'Akademik',
      tanggalMulai: formData.tanggalMulai || '',
      tanggalSelesai: formData.tanggalSelesai || formData.tanggalMulai,
      waktu: formData.waktu || '07:30 - 12:00',
      lokasi: formData.lokasi || 'Lingkungan Sekolah',
      deskripsi: formData.deskripsi || '',
      status: formData.status as any || 'Akan Datang'
    };

    const updated = [newItem, ...agendas];
    db.set('mading_agenda', updated);
    setAgendas(updated);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Calendar size={16} className="text-rose-600" />
            <span>Kalender Akademik & Agenda Kegiatan Sekolah</span>
          </h3>
          <p className="text-xs text-slate-400">Jadwal ujian, rapat komite, class meeting, dan hari libur resmi</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          <span>Tambah Agenda Baru</span>
        </button>
      </div>

      {/* Timeline List of Agendas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agendas.map((agenda) => {
          const isOngoing = agenda.status === 'Berlangsung';
          const isUpcoming = agenda.status === 'Akan Datang';
          return (
            <div
              key={agenda.id}
              className={`bg-white rounded-3xl p-5 border shadow-xs flex flex-col justify-between space-y-3 transition ${
                isOngoing ? 'border-amber-300 ring-1 ring-amber-100 bg-amber-50/20' : 'border-slate-200/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold border border-slate-200">
                    {agenda.kategori}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    isOngoing 
                      ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse' 
                      : isUpcoming
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {agenda.status}
                  </span>
                </div>

                <h4 className="text-sm font-black text-slate-900 leading-snug">{agenda.judul}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{agenda.deskripsi}</p>
              </div>

              {/* Schedule Details */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5 font-bold font-mono text-slate-700">
                  <Calendar size={13} className="text-rose-500 shrink-0" />
                  <span>{agenda.tanggalMulai}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-500 shrink-0" />
                  <span className="truncate">{agenda.waktu}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <MapPin size={13} className="text-blue-500 shrink-0" />
                  <span className="truncate font-medium">{agenda.lokasi}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Tambah Agenda Sekolah</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Nama Agenda / Kegiatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pentas Seni & Gelar Karya P5"
                  value={formData.judul || ''}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.kategori || 'Akademik'}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Akademik">Akademik / Ujian</option>
                    <option value="Kesiswaan & OSIS">Kesiswaan & OSIS</option>
                    <option value="Rapat & Pertemuan">Rapat & Pertemuan</option>
                    <option value="Hari Libur">Hari Libur Resmi</option>
                    <option value="Peringatan Nasional">Peringatan Nasional</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Status</label>
                  <select
                    value={formData.status || 'Akan Datang'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Akan Datang">Akan Datang</option>
                    <option value="Berlangsung">Berlangsung</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Tanggal Kegiatan *</label>
                  <input
                    type="date"
                    required
                    value={formData.tanggalMulai || ''}
                    onChange={(e) => setFormData({ ...formData, tanggalMulai: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Waktu Pelaksanaan</label>
                  <input
                    type="text"
                    placeholder="08:00 - 12:00"
                    value={formData.waktu || ''}
                    onChange={(e) => setFormData({ ...formData, waktu: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Lokasi Tempat</label>
                <input
                  type="text"
                  placeholder="Aula Utama / Lapangan / Ruang Kelas"
                  value={formData.lokasi || ''}
                  onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Keterangan / Deskripsi Acara</label>
                <textarea
                  rows={3}
                  value={formData.deskripsi || ''}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition shadow-xs cursor-pointer"
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
