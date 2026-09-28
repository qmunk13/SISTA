import React, { useState } from 'react';
import { db } from '../../data/db';
import { Save, Globe, Sparkles, CheckCircle2, MessageSquare, Video, Share2 } from 'lucide-react';

export default function CmsPublikTab() {
  const [successMsg, setSuccessMsg] = useState('');

  const [cmsConfig, setCmsConfig] = useState(() => {
    const fromDb = db.get<any>('web_config');
    const existing = (Array.isArray(fromDb) && fromDb[0]) ? fromDb[0] : (fromDb && typeof fromDb === 'object' && !Array.isArray(fromDb) ? fromDb : null);
    return existing || {
      heroHeadline: 'Pendidikan Inklusif & Berkualitas Di Tambora',
      heroSubheadline: 'Pusat Pendidikan Inklusif Terpadu Karang Taruna Kecamatan Tambora. Mewujudkan kesetaraan akses pendidikan unggul, pengembangan potensi karakter, serta keterampilan digital generasi muda.',
      runningText: '🔥 PENDAFTARAN PESERTA DIDIK BARU (PPDB) ROMBEL KTCT TAMBORA TAHUN AJARAN 2026/2027 TELAH DIBUKA! PROGRAM PENDIDIKAN BERBASIS MASYARAKAT. DAFTAR SEKARANG JUGA!',
      sambutanKepsek: 'Selamat datang di portal resmi Rombel Tambora. Kami berkomitmen untuk menyelenggarakan program pembelajaran yang inklusif, terpadu, dan berorientasi pada pengembangan potensi serta karakter mulia peserta didik.',
      visiSekolah: 'Mewujudkan lembaga pendidikan gratis, inklusif, dan berkualitas unggul untuk mencetak generasi muda Kecamatan Tambora yang mandiri, berkarakter mulia, cerdas, berdaya saing tinggi, dan berjiwa kepemimpinan.',
      misiSekolah: '1. Menyelenggarakan kegiatan belajar mengajar secara holistik, terpadu, dan berorientasi pada kompetensi industri abad ke-21.\n2. Menanamkan nilai-nilai religiusitas, akhlak mulia, disiplin, dan tanggung jawab sosial melalui program pembiasaan ibadah harian.\n3. Menyediakan akses pendidikan gratis 100% tanpa pungutan biaya bagi keluarga prasejahtera dengan dukungan penuh Karang Taruna Tambora.\n4. Membangun kemitraan strategis dengan dunia usaha, perguruan tinggi, dan instansi pemerintahan untuk penyaluran lulusan.',
      videoProfilUrl: '',
      waConsultation: '0851-4180-9991',
      instagramUrl: 'https://instagram.com/rombelktct',
      facebookUrl: 'https://facebook.com/rombelktct',
      youtubeUrl: 'https://youtube.com/@rombelktct'
    };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCmsConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    db.set('web_config', [cmsConfig]);
    setSuccessMsg('Pengaturan CMS Portal Publik Berhasil Disimpan & Aktif!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Globe className="text-blue-600" size={20} />
            CMS & Tampilan Portal Publik
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Kelola banner hero utama, visi misi, teks sambutan pimpinan, dan tautan sosial media.</p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs font-medium text-slate-700">
        {/* Banner Hero */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            <span>1. Hero Banner Beranda</span>
          </h3>
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Judul Utama Banner (Headline):</label>
              <input
                type="text"
                name="heroHeadline"
                value={cmsConfig.heroHeadline}
                onChange={handleChange}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Sub-Headline / Slogan Banner:</label>
              <textarea
                name="heroSubheadline"
                rows={2}
                value={cmsConfig.heroSubheadline}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Teks Berjalan Pengumuman (Running Text Marquee):</label>
              <input
                type="text"
                name="runningText"
                value={cmsConfig.runningText}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Sambutan & Visi Misi */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-600" />
            <span>2. Sambutan Pimpinan & Profil Visi Misi</span>
          </h3>
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Teks Sambutan Pimpinan:</label>
              <textarea
                name="sambutanKepsek"
                rows={3}
                value={cmsConfig.sambutanKepsek}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Visi:</label>
                <textarea
                  name="visiSekolah"
                  rows={3}
                  value={cmsConfig.visiSekolah}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Misi (Gunakan Baris Baru / Angka):</label>
                <textarea
                  name="misiSekolah"
                  rows={3}
                  value={cmsConfig.misiSekolah}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Video & Media Sosial */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-slate-900 text-sm border-b pb-2 flex items-center gap-2">
            <Share2 size={16} className="text-emerald-600" />
            <span>3. Video Profil YouTube & Kontak Media Sosial</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Link Video Profil (YouTube URL):</label>
              <input
                type="text"
                name="videoProfilUrl"
                value={cmsConfig.videoProfilUrl}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp Konsultasi SPMB:</label>
              <input
                type="text"
                name="waConsultation"
                value={cmsConfig.waConsultation}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Akun Instagram Resmi:</label>
              <input
                type="text"
                name="instagramUrl"
                value={cmsConfig.instagramUrl}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Kanal YouTube Resmi:</label>
              <input
                type="text"
                name="youtubeUrl"
                value={cmsConfig.youtubeUrl}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-md shadow-blue-200 active:scale-95 transition"
          >
            <Save size={16} />
            <span>Simpan Konten Portal Publik</span>
          </button>
        </div>
      </form>
    </div>
  );
}
