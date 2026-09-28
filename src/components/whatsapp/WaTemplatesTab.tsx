import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MessageSquare, Copy, Check, X, Tag } from 'lucide-react';
import { WaTemplate } from '../../types';
import { db } from '../../data/db';

export default function WaTemplatesTab() {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WaTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<WaTemplate>>({
    namaTemplate: '',
    kategori: 'Presensi',
    deskripsi: '',
    pesan: '',
    variabelTersedia: ['{NAMA_SEKOLAH}', '{NAMA_SISWA}', '{KELAS}']
  });

  const loadTemplates = () => {
    setTemplates(db.get<WaTemplate>('wa_templates'));
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setFormData({
      namaTemplate: '',
      kategori: 'Pengumuman',
      deskripsi: '',
      pesan: `*PENGUMUMAN SEKOLAH*\n_{NAMA_SEKOLAH}_\n\nYth. Bapak/Ibu Wali Murid dari {NAMA_SISWA} ({KELAS}):\n\n[Tulis isi pengumuman di sini]\n\nTerima kasih.`,
      variabelTersedia: ['{NAMA_SEKOLAH}', '{NAMA_SISWA}', '{KELAS}']
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: WaTemplate) => {
    setEditingTemplate(t);
    setFormData({ ...t });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaTemplate || !formData.pesan) {
      alert('Nama template dan pesan wajib diisi!');
      return;
    }

    if (editingTemplate) {
      const updated = templates.map(t => t.id === editingTemplate.id ? { ...t, ...formData } : t);
      db.set('wa_templates', updated);
      setTemplates(updated as WaTemplate[]);
    } else {
      const newTpl: WaTemplate = {
        id: `TPL-KUST-${Date.now().toString().slice(-4)}`,
        namaTemplate: formData.namaTemplate || 'Template Baru',
        kategori: formData.kategori || 'Kustom',
        deskripsi: formData.deskripsi || 'Template kustom sekolah',
        pesan: formData.pesan || '',
        variabelTersedia: formData.variabelTersedia || ['{NAMA_SISWA}', '{KELAS}']
      };
      const updated = [newTpl, ...templates];
      db.set('wa_templates', updated);
      setTemplates(updated);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus template WhatsApp ini?')) {
      const updated = templates.filter(t => t.id !== id);
      db.set('wa_templates', updated);
      setTemplates(updated);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-sm font-black text-slate-900">Manajemen Template Notifikasi WhatsApp</h3>
          <p className="text-xs text-slate-400">Atur struktur pesan standar untuk absensi, keuangan, dan pengumuman</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} />
          <span>Buat Template Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                  {tpl.kategori}
                </span>
                <span className="font-mono text-[10px] text-slate-400 font-bold">{tpl.id}</span>
              </div>

              <h4 className="text-sm font-black text-slate-900">{tpl.namaTemplate}</h4>
              <p className="text-xs text-slate-500 mt-1">{tpl.deskripsi}</p>

              {/* Message Code Preview */}
              <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                {tpl.pesan}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleCopyText(tpl.id, tpl.pesan)}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1 cursor-pointer transition"
              >
                {copiedId === tpl.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedId === tpl.id ? 'Tersalin' : 'Salin Teks'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(tpl)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                  title="Edit Template"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                  title="Hapus Template"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingTemplate ? 'Edit Template WhatsApp' : 'Buat Template Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Atur pesan dan variabel otomatis</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Nama Template *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pengumuman Libur Hari Raya"
                  value={formData.namaTemplate || ''}
                  onChange={(e) => setFormData({ ...formData, namaTemplate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.kategori || 'Pengumuman'}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Presensi">Presensi</option>
                    <option value="Keuangan">Keuangan</option>
                    <option value="Pengumuman">Pengumuman</option>
                    <option value="Rapor & Nilai">Rapor & Nilai</option>
                    <option value="Undangan">Undangan</option>
                    <option value="Kustom">Kustom</option>
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Keterangan Singkat</label>
                  <input
                    type="text"
                    placeholder="Tujuan pengiriman pesan"
                    value={formData.deskripsi || ''}
                    onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Struktur Teks Pesan *</label>
                <textarea
                  rows={6}
                  required
                  value={formData.pesan || ''}
                  onChange={(e) => setFormData({ ...formData, pesan: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800"
                />
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition shadow-xs"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
