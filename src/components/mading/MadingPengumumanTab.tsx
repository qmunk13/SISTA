import React, { useState, useEffect } from 'react';
import { Megaphone, FileText, Calendar, Users, Plus, Download, AlertCircle, Sparkles, X } from 'lucide-react';
import { MadingPengumuman } from '../../types';
import { db } from '../../data/db';

export default function MadingPengumumanTab() {
  const [announcements, setAnnouncements] = useState<MadingPengumuman[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<MadingPengumuman | null>(null);

  const [formData, setFormData] = useState<Partial<MadingPengumuman>>({
    nomorSurat: '',
    judul: '',
    konten: '',
    sasaran: 'Semua',
    prioritas: 'Biasa',
    lampiranUrl: ''
  });

  const loadData = () => {
    setAnnouncements(db.get<MadingPengumuman>('mading_pengumuman'));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.konten) {
      alert('Judul dan isi pengumuman wajib diisi!');
      return;
    }

    const newObj: MadingPengumuman = {
      id: `EDARAN-${Date.now().toString().slice(-4)}`,
      nomorSurat: formData.nomorSurat || `421.2/${Date.now().toString().slice(-4)}/SD-TMB/2026`,
      judul: formData.judul || '',
      tanggal: new Date().toISOString().split('T')[0],
      sasaran: formData.sasaran || 'Semua',
      prioritas: formData.prioritas || 'Biasa',
      konten: formData.konten || '',
      penulis: 'Kepala Sekolah & Tim Tata Usaha',
      lampiranUrl: formData.lampiranUrl || 'https://sista-rombel.sch.id/docs/edaran-resmi.pdf'
    };

    const updated = [newObj, ...announcements];
    db.set('mading_pengumuman', updated);
    setAnnouncements(updated);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Megaphone size={16} className="text-rose-600" />
            <span>Papan Surat Edaran & Pengumuman Kedinasan Resmi</span>
          </h3>
          <p className="text-xs text-slate-400">Pemberitahuan resmi dari Kepala Sekolah dan Dinas Pendidikan</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          <span>Buat Surat Edaran Baru</span>
        </button>
      </div>

      {/* List of Announcements */}
      <div className="space-y-4">
        {announcements.map((ann) => {
          const isUrgent = ann.prioritas === 'Penting' || ann.prioritas === 'Darurat';
          return (
            <div
              key={ann.id}
              className={`bg-white rounded-3xl p-5 sm:p-6 border shadow-xs transition ${
                isUrgent ? 'border-rose-300 ring-1 ring-rose-100 bg-gradient-to-r from-white via-rose-50/20 to-white' : 'border-slate-200/80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                      isUrgent ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {ann.prioritas}
                    </span>
                    <span className="font-mono text-xs text-slate-400 font-bold">
                      No: {ann.nomorSurat}
                    </span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Sasaran: <strong className="text-slate-800">{ann.sasaran}</strong>
                    </span>
                  </div>

                  <h4 className="text-base font-black text-slate-900">{ann.judul}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap pt-1">
                    {ann.konten}
                  </p>
                </div>

                <div className="shrink-0 flex sm:flex-col items-end justify-between gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-mono block">Diterbitkan:</span>
                    <span className="text-xs font-bold font-mono text-slate-700">{ann.tanggal}</span>
                  </div>

                  {ann.lampiranUrl && (
                    <a
                      href={ann.lampiranUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                    >
                      <Download size={13} />
                      <span>Lampiran PDF</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Buat Surat Edaran Baru</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Nomor Surat Resmi</label>
                <input
                  type="text"
                  placeholder="421.2/088/SD-TMB/2026"
                  value={formData.nomorSurat || ''}
                  onChange={(e) => setFormData({ ...formData, nomorSurat: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Judul / Perihal Edaran *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemberitahuan Libur Permulaan Puasa & Pembelajaran Daring"
                  value={formData.judul || ''}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Target Sasaran</label>
                  <select
                    value={formData.sasaran || 'Semua'}
                    onChange={(e) => setFormData({ ...formData, sasaran: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Semua">Semua (Umum)</option>
                    <option value="Wali Murid">Wali Murid</option>
                    <option value="Siswa">Siswa</option>
                    <option value="Guru & Tenaga Kependidikan">Guru & Tenaga Kependidikan</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Tingkat Prioritas</label>
                  <select
                    value={formData.prioritas || 'Biasa'}
                    onChange={(e) => setFormData({ ...formData, prioritas: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Biasa">Biasa</option>
                    <option value="Penting">Penting</option>
                    <option value="Darurat">Darurat / Mendesak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Isi Lengkap Edaran *</label>
                <textarea
                  rows={5}
                  required
                  value={formData.konten || ''}
                  onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
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
                  Terbitkan Edaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
