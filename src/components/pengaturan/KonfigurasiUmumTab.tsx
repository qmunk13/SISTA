import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { Save, School, MapPin, Phone, Mail, Globe, User, CheckCircle2, RefreshCw, CloudUpload, Sparkles } from 'lucide-react';
import { fetchFromGAS } from '../../lib/api';

export default function KonfigurasiUmumTab() {
  const { settings, setSettings } = useStore();
  const [successMsg, setSuccessMsg] = useState('');
  const [isSyncingGas, setIsSyncingGas] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: settings.schoolName || 'ROMBEL TAMBORA',
    appName: settings.appName || 'ROMBEL TAMBORA',
    npsn: (settings as any).npsn || '10293847',
    jenjang: (settings as any).jenjang || 'Pendidikan Kesetaraan / Inklusif',
    statusSekolah: (settings as any).statusSekolah || 'Terakreditasi A',
    tahunPelajaran: settings.tahunPelajaran || '2026/2027',
    semester: (settings as any).semester || 'Semester Ganjil',
    schoolAddress: (settings as any).schoolAddress || 'Gedung Sasana Krida Karang Taruna , Jl. Laksa II No.12, RT.012 RW.002',
    city: (settings as any).city || 'Jakarta Barat',
    province: (settings as any).province || 'DKI Jakarta',
    postalCode: (settings as any).postalCode || '11220',
    schoolPhone: (settings as any).schoolPhone || '0851-4180-9991',
    schoolEmail: (settings as any).schoolEmail || 'rombelkatartambora@gmail.com',
    schoolWebsite: (settings as any).schoolWebsite || 'https://rombelktct.org',
    principalName: (settings as any).principalName || settings.principalName || 'Pimpinan Rombel KTCT',
    principalNip: (settings as any).principalNip || '-',
    bendaharaName: (settings as any).bendaharaName || 'Bendahara Rombel',
    operatorName: (settings as any).operatorName || 'Operator Sistem'
  });

  useEffect(() => {
    const saved = db.getSingle('profil_sekolah');
    if (saved) {
      setFormData(prev => ({ ...prev, ...saved }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...settings,
      ...formData
    };
    setSettings(updated);
    db.setSingle('profil_sekolah', formData);

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});

    // Sinkronkan ke sheet SETTING jika URL GAS tersedia
    if (settings.scriptUrl) {
      try {
        setIsSyncingGas(true);
        const settingRows = Object.keys(updated).map(k => ({
          Key: k,
          Value: typeof updated[k] === 'object' ? JSON.stringify(updated[k]) : String(updated[k] ?? '')
        }));
        await fetchFromGAS(settings.scriptUrl, {
          action: 'syncTable',
          table: 'SETTING',
          data: settingRows
        });
        setSuccessMsg('✅ Konfigurasi Profil Berhasil Disimpan & Disinkronkan ke Google Spreadsheet (Sheet SETTING)!');
      } catch (err: any) {
        setSuccessMsg('✅ Konfigurasi Profil Berhasil Disimpan Lokal & Server!');
      } finally {
        setIsSyncingGas(false);
      }
    } else {
      setSuccessMsg('✅ Konfigurasi Identitas & Profil Berhasil Disimpan!');
    }

    setTimeout(() => setSuccessMsg(''), 4500);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <School className="text-indigo-600" size={20} />
            Konfigurasi Profil & Identitas Lembaga
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Pengaturan identitas resmi yang tercantum pada rapor, kwitansi, SKL, & persuratan.</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs font-medium text-slate-700">
        {/* Section 1: Identitas Pokok */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <span>1. Identitas Pokok Lembaga</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Nama Resmi Lembaga:</label>
              <input
                type="text"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleChange}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Nama Singkat / Brand Aplikasi:</label>
              <input
                type="text"
                name="appName"
                value={formData.appName}
                onChange={handleChange}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">NPSN (Nomor Pokok Nasional):</label>
              <input
                type="text"
                name="npsn"
                value={formData.npsn}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Jenjang Pendidikan:</label>
              <select
                name="jenjang"
                value={formData.jenjang}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="SD / Madrasah Ibtidaiyah">SD / Madrasah Ibtidaiyah</option>
                <option value="SMP / Madrasah Tsanawiyah">SMP / Madrasah Tsanawiyah</option>
                <option value="SMA / MA / SMK">SMA / MA / SMK</option>
                <option value="PKBM / Pondok Pesantren">PKBM / Pondok Pesantren</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Status Akreditasi:</label>
              <input
                type="text"
                name="statusSekolah"
                value={formData.statusSekolah}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Tahun Ajaran Aktif:</label>
              <input
                type="text"
                name="tahunPelajaran"
                value={formData.tahunPelajaran}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Alamat & Kontak Resmi */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <MapPin size={16} className="text-indigo-600" />
            <span>2. Alamat Lengkap & Kontak Resmi</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1.5">Alamat Jalan / Gedung:</label>
              <input
                type="text"
                name="schoolAddress"
                value={formData.schoolAddress}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Kota / Kabupaten:</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Provinsi:</label>
              <input
                type="text"
                name="province"
                value={formData.province}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Kode Pos:</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Nomor Telepon Kantor:</label>
              <input
                type="text"
                name="schoolPhone"
                value={formData.schoolPhone}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Email Resmi Lembaga:</label>
              <input
                type="email"
                name="schoolEmail"
                value={formData.schoolEmail}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Website Resmi:</label>
              <input
                type="text"
                name="schoolWebsite"
                value={formData.schoolWebsite}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Pimpinan & Pejabat */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <User size={16} className="text-indigo-600" />
            <span>3. Pejabat & Penandatangan Dokumen</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Nama Pimpinan:</label>
              <input
                type="text"
                name="principalName"
                value={formData.principalName}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">NIP / NUPTK Pimpinan:</label>
              <input
                type="text"
                name="principalNip"
                value={formData.principalNip}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Bendahara:</label>
              <input
                type="text"
                name="bendaharaName"
                value={formData.bendaharaName}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Operator Data Pokok:</label>
              <input
                type="text"
                name="operatorName"
                value={formData.operatorName}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t">
          <p className="text-[11px] text-slate-500 font-medium">
            💡 Seluruh data profil ini otomatis disinkronkan ke sheet <b>SETTING</b> di Google Spreadsheet dan backend server.
          </p>
          <button
            type="submit"
            disabled={isSyncingGas}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-md shadow-indigo-200 active:scale-95 transition disabled:opacity-50 w-full sm:w-auto"
          >
            {isSyncingGas ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Menyinkronkan ke Spreadsheet...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Simpan Semua Perubahan Profil</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
