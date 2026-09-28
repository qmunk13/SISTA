import React, { useState } from 'react';
import { db } from '../../data/db';
import { FileInput, Save, CheckCircle2, Sliders, ToggleLeft, ToggleRight } from 'lucide-react';

export default function KonfigurasiFormTab() {
  const [successMsg, setSuccessMsg] = useState('');

  const [formConfig, setFormConfig] = useState(() => {
    const fromDb = db.get<any>('spmb_config');
    const existing = (Array.isArray(fromDb) && fromDb[0]) ? fromDb[0] : (fromDb && typeof fromDb === 'object' && !Array.isArray(fromDb) ? fromDb : null);
    return existing || {
      requireNisn: true,
      requireNik: true,
      requireNoKk: false,
      requireAsalSekolah: true,
      requireNilaiRapor: true,
      requirePrestasi: false,
      requireUploadBerkas: true,
      requireNoWaOrtu: true,
      jalurZonasiActive: true,
      jalurAfirmasiActive: true,
      jalurPrestasiActive: true,
      jalurMutasiActive: true,
      maxPilihanJurusan: 2,
      biayaPendaftaran: 0,
      pesanKonfirmasiWa: 'Halo Ayah/Bunda {namaOrtu}, pendaftaran ananda {namaSiswa} di Rombel Tambora telah kami terima dengan Nomor Registrasi: {noReg}. Silakan pantau hasil verifikasi berkas secara berkala.',
      petunjukKhusus: 'Pastikan seluruh data yang diisikan sesuai dengan Akta Kelahiran dan Kartu Keluarga yang berlaku.'
    };
  });

  const handleToggle = (key: string) => {
    setFormConfig((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormConfig((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.set('spmb_config', [formConfig]);
    setSuccessMsg('Konfigurasi Formulir Pendaftaran SPMB Berhasil Disimpan!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileInput className="text-indigo-600" size={20} />
            Kustomisasi Formulir Pendaftaran SPMB Online
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Atur bidang input wajib, aktivasi jalur seleksi, & pesan konfirmasi WhatsApp otomatis.</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs font-medium text-slate-700">
        {/* Field Wajib Pendaftaran */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <Sliders size={16} className="text-indigo-600" />
            <span>1. Pengaturan Bidang Input (Form Fields Required)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'requireNisn', label: 'Wajibkan Pengisian NISN', desc: 'Calon siswa harus mengisi NISN resmi Kemendikdasmen' },
              { key: 'requireNik', label: 'Wajibkan NIK KTP / KIA Siswa', desc: 'Nomor Induk Kependudukan 16 digit' },
              { key: 'requireNoKk', label: 'Wajibkan Nomor Kartu Keluarga (KK)', desc: 'Validasi domisili jalur zonasi' },
              { key: 'requireAsalSekolah', label: 'Wajibkan Asal Sekolah Sebelumnya', desc: 'Nama TK/PAUD atau SD asal' },
              { key: 'requireNilaiRapor', label: 'Wajibkan Input Nilai Rapor', desc: 'Digunakan untuk kalkulasi seleksi jalur prestasi' },
              { key: 'requirePrestasi', label: 'Wajibkan Sertifikat / Piagam Prestasi', desc: 'Untuk seleksi jalur talenta dan kejuaraan' },
              { key: 'requireUploadBerkas', label: 'Wajibkan Upload Foto / Dokumen PDF', desc: 'Scan KK, Akta, dan Ijazah / SKL' },
              { key: 'requireNoWaOrtu', label: 'Wajibkan Nomor WhatsApp Orang Tua', desc: 'Untuk pengiriman notifikasi dan pengumuman' }
            ].map(item => (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                  formConfig[item.key] ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs">{item.label}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                <div className={`text-xl font-bold ${formConfig[item.key] ? 'text-indigo-600' : 'text-slate-300'}`}>
                  {formConfig[item.key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jalur Pendaftaran Aktif */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <span>2. Jalur Masuk SPMB yang Dibuka</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'jalurZonasiActive', label: 'Jalur Zonasi' },
              { key: 'jalurAfirmasiActive', label: 'Jalur Afirmasi / KIP' },
              { key: 'jalurPrestasiActive', label: 'Jalur Prestasi' },
              { key: 'jalurMutasiActive', label: 'Jalur Pindahan Tugas' }
            ].map(item => (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className={`p-3 rounded-2xl border text-center cursor-pointer transition ${
                  formConfig[item.key] ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="text-sm">{item.label}</div>
                <span className={`text-[10px] font-bold mt-1 inline-block ${formConfig[item.key] ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {formConfig[item.key] ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pesan Otomatis & Petunjuk */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <span>3. Pesan Konfirmasi WhatsApp & Petunjuk Khusus</span>
          </h3>
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Format Template Pesan WhatsApp Konfirmasi:</label>
              <textarea
                name="pesanKonfirmasiWa"
                rows={3}
                value={formConfig.pesanKonfirmasiWa}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
              <p className="text-[10px] text-slate-400 mt-1">Variabel tersedia: <code className="text-indigo-600">{'{namaOrtu}'}</code>, <code className="text-indigo-600">{'{namaSiswa}'}</code>, <code className="text-indigo-600">{'{noReg}'}</code></p>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Petunjuk Khusus / Catatan Pendaftar:</label>
              <textarea
                name="petunjukKhusus"
                rows={2}
                value={formConfig.petunjukKhusus}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-md shadow-indigo-200 active:scale-95 transition"
          >
            <Save size={16} />
            <span>Simpan Konfigurasi Form SPMB</span>
          </button>
        </div>
      </form>
    </div>
  );
}
