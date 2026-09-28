import React, { useMemo } from 'react';
import { db } from '../../data/db';
import { ArsipDigital, SuratMasuk, SuratKeluar, MasterTemplateSurat } from '../../data/dokumenSeed';
import { 
  FolderArchive, Mail, Send, FileCode, ArrowRight, ShieldCheck, 
  Clock, CheckCircle2, AlertCircle, FileText, ChevronRight, Download,
  ExternalLink, Sparkles, Plus, Calendar, Building2, User
} from 'lucide-react';

interface DokumenDashboardTabProps {
  onNavigateTab: (tabId: string) => void;
}

export default function DokumenDashboardTab({ onNavigateTab }: DokumenDashboardTabProps) {
  const arsipList = useMemo(() => db.get<ArsipDigital>('arsip') || [], []);
  const suratMasukList = useMemo(() => db.get<SuratMasuk>('surat_masuk') || [], []);
  const suratKeluarList = useMemo(() => db.get<SuratKeluar>('surat_keluar') || [], []);
  const templateList = useMemo(() => db.get<MasterTemplateSurat>('template_surat') || [], []);

  // KPIs
  const totalArsip = arsipList.length;
  const totalSuratMasuk = suratMasukList.length;
  const disposisiPending = suratMasukList.filter(s => s.statusDisposisi === 'Menunggu Disposisi').length;
  const disposisiSelesai = suratMasukList.filter(s => s.statusDisposisi === 'Selesai').length;

  const totalSuratKeluar = suratKeluarList.length;
  const suratKeluarSah = suratKeluarList.filter(s => s.status === 'Diterbitkan / Sah').length;

  const totalTemplate = templateList.length;

  // Breakdown Arsip by Kategori
  const arsipByKategori = useMemo(() => {
    const counts: Record<string, number> = {};
    arsipList.forEach(a => {
      counts[a.kategori] = (counts[a.kategori] || 0) + 1;
    });
    return counts;
  }, [arsipList]);

  // Recent Surat Masuk
  const recentSuratMasuk = useMemo(() => {
    return [...suratMasukList].sort((a, b) => b.tanggalDiterima.localeCompare(a.tanggalDiterima)).slice(0, 4);
  }, [suratMasukList]);

  // Recent Surat Keluar
  const recentSuratKeluar = useMemo(() => {
    return [...suratKeluarList].sort((a, b) => b.tanggalSurat.localeCompare(a.tanggalSurat)).slice(0, 4);
  }, [suratKeluarList]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 4 KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Arsip Digital */}
        <div 
          onClick={() => onNavigateTab('arsip-digital')}
          className="p-5 rounded-3xl border border-sky-200/90 bg-sky-50/70 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-sky-600 flex items-center justify-center font-bold shadow-2xs border border-sky-100">
              <FolderArchive size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full text-sky-700 border border-sky-200/60">
              E-Repository
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              {totalArsip} Berkas
            </div>
            <div className="text-xs font-bold text-sky-800/80 mt-1 flex items-center justify-between">
              <span>SK, KOSP & Sertifikat</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* 2. Surat Masuk */}
        <div 
          onClick={() => onNavigateTab('surat-masuk')}
          className="p-5 rounded-3xl border border-indigo-200/90 bg-indigo-50/70 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-indigo-600 flex items-center justify-center font-bold shadow-2xs border border-indigo-100">
              <Mail size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full text-indigo-700 border border-indigo-200/60">
              Surat Masuk
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              {totalSuratMasuk} Surat
            </div>
            <div className="text-xs font-bold text-indigo-800/80 mt-1 flex items-center justify-between">
              <span>{disposisiPending} Perlu Disposisi • {disposisiSelesai} Tuntas</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* 3. Surat Keluar */}
        <div 
          onClick={() => onNavigateTab('surat-keluar')}
          className="p-5 rounded-3xl border border-emerald-200/90 bg-emerald-50/70 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-emerald-600 flex items-center justify-center font-bold shadow-2xs border border-emerald-100">
              <Send size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full text-emerald-700 border border-emerald-200/60">
              Surat Keluar
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              {totalSuratKeluar} Surat
            </div>
            <div className="text-xs font-bold text-emerald-800/80 mt-1 flex items-center justify-between">
              <span>{suratKeluarSah} Diterbitkan & Sah</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>

        {/* 4. Master Template */}
        <div 
          onClick={() => onNavigateTab('template-surat')}
          className="p-5 rounded-3xl border border-purple-200/90 bg-purple-50/70 shadow-xs flex flex-col justify-between transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-98"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-purple-600 flex items-center justify-center font-bold shadow-2xs border border-purple-100">
              <FileCode size={22} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/80 px-2.5 py-1 rounded-full text-purple-700 border border-purple-200/60">
              Template Baku
            </span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
              {totalTemplate} Format
            </div>
            <div className="text-xs font-bold text-purple-800/80 mt-1 flex items-center justify-between">
              <span>Auto-Generator Dokumen</span>
              <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surat Masuk Terbaru & Status Disposisi */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Surat Masuk & Disposisi Terbaru
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Surat kedinasan dan instansi yang masuk ke tata usaha
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigateTab('surat-masuk')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1"
            >
              <span>Kelola</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            {recentSuratMasuk.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                <FileText size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="font-bold text-slate-600 text-xs">Belum Ada Surat Masuk</p>
                <p className="text-[11px] text-slate-400">Entri surat masuk di sub-menu Surat Masuk & Disposisi.</p>
              </div>
            ) : (
              recentSuratMasuk.map((sm) => (
                <div 
                  key={sm.id}
                  className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 hover:bg-indigo-50/30 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      {sm.noAgenda}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      sm.statusDisposisi === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      sm.statusDisposisi === 'Menunggu Disposisi' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {sm.statusDisposisi}
                    </span>
                  </div>
                  <div className="font-black text-slate-900 text-xs line-clamp-1">{sm.perihal}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[220px] sm:max-w-xs">{sm.pengirim}</span>
                    <span className="font-mono text-slate-400">{sm.tanggalDiterima}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Surat Keluar Resmi Terbaru */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Penerbitan Surat Keluar Resmi
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Surat keterangan, undangan, tugas, dan rekomendasi sekolah
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigateTab('surat-keluar')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1"
            >
              <span>Kelola</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            {recentSuratKeluar.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                <FileText size={24} className="mx-auto text-slate-300 mb-1" />
                <p className="font-bold text-slate-600 text-xs">Belum Ada Surat Keluar</p>
                <p className="text-[11px] text-slate-400">Buat surat keluar baru di sub-menu Surat Keluar.</p>
              </div>
            ) : (
              recentSuratKeluar.map((sk) => (
                <div 
                  key={sk.id}
                  className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 hover:bg-emerald-50/30 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {sk.noSurat}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {sk.jenisSurat}
                    </span>
                  </div>
                  <div className="font-black text-slate-900 text-xs line-clamp-1">{sk.perihal}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[220px] sm:max-w-xs">Kepada: {sk.penerima}</span>
                    <span className="font-mono text-slate-400">{sk.tanggalSurat}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Distribusi Arsip & Layanan Persuratan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribusi Kategori Arsip Digital */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <FolderArchive size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Distribusi Kategori Arsip Digital
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Klasifikasi dokumen legalitas, kurikulum, dan sarpras
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigateTab('arsip-digital')}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 transition flex items-center gap-1"
            >
              <span>Detail</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {Object.entries(arsipByKategori).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada arsip terunggah</p>
            ) : (
              Object.entries(arsipByKategori).map(([kategori, count]) => {
                const countNum = Number(count) || 0;
                const pct = totalArsip > 0 ? Math.round((countNum / totalArsip) * 100) : 0;
                return (
                  <div key={kategori} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">{kategori}</span>
                      <span className="font-mono font-bold text-slate-900">{countNum} Berkas ({pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${Math.max(pct, countNum > 0 ? 8 : 0)}%` }} 
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions & Shortcut Box */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-md space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 text-sky-400 flex items-center justify-center font-bold backdrop-blur-xs">
                <Sparkles size={18} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Akses Cepat Persuratan & Arsip
              </h3>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Kelola tata naskah dinas resmi, auto-generate surat keterangan siswa, lembar disposisi kepala sekolah, dan arsip digital.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={() => onNavigateTab('surat-keluar')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition border border-white/10 group"
            >
              <div className="text-xs font-black text-emerald-300 group-hover:text-emerald-200">Buat Surat Keluar &rarr;</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Auto-numbering & cetak sah</div>
            </button>

            <button
              onClick={() => onNavigateTab('surat-masuk')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition border border-white/10 group"
            >
              <div className="text-xs font-black text-indigo-300 group-hover:text-indigo-200">Agenda Surat Masuk &rarr;</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Disposisi & tindak lanjut</div>
            </button>

            <button
              onClick={() => onNavigateTab('arsip-digital')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition border border-white/10 group"
            >
              <div className="text-xs font-black text-sky-300 group-hover:text-sky-200">Repositori Arsip &rarr;</div>
              <div className="text-[11px] text-slate-300 mt-0.5">SK, Dokumen & Akreditasi</div>
            </button>

            <button
              onClick={() => onNavigateTab('template-surat')}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-left transition border border-white/10 group"
            >
              <div className="text-xs font-black text-purple-300 group-hover:text-purple-200">Master Template &rarr;</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Format baku surat resmi</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
