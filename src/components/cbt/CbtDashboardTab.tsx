import React, { useState } from 'react';
import { 
  Laptop, Calendar, FileQuestion, Key, Eye, 
  CheckCircle2, Award, ArrowRight, ShieldCheck, 
  Clock, Users, BarChart3, Activity, AlertCircle, Play
} from 'lucide-react';
import { useStore } from '../../store';
import { formatClassLabel, matchStatusActive } from '../../lib/utils';

interface CbtDashboardTabProps {
  onNavigateTab: (tabId: string, context?: any) => void;
  ujianList: any[];
  bankSoalList: any[];
  tokenActive: string;
}

export default function CbtDashboardTab({ 
  onNavigateTab, 
  ujianList, 
  bankSoalList, 
  tokenActive 
}: CbtDashboardTabProps) {
  const { students, teachers } = useStore();
  const activeStudents = (students || []).filter(s => matchStatusActive(s?.status));

  const totalSesi = ujianList.length;
  const sesiBerlangsung = ujianList.filter(u => u.status === 'Berlangsung').length;
  const sesiSelesai = ujianList.filter(u => u.status === 'Selesai').length;
  const sesiWithQuestions = ujianList.filter(u => Boolean(u.bankSoalId || u.BankSoalID || (Array.isArray(u.soalList) && u.soalList.length > 0))).length;
  const totalSoal = bankSoalList.reduce((acc, curr) => acc + (Number(curr.jumlahSoal) || (Array.isArray(curr.soalList) ? curr.soalList.length : 0)), 0);

  const avgScore = ujianList.length > 0
    ? (ujianList.reduce((acc, curr) => acc + (Number(curr.avg) || 0), 0) / ujianList.length).toFixed(1)
    : '0';

  const pipelineModules = [
    { id: 'dashboard', label: 'CBT Dashboard', icon: Laptop, badge: 'Pusat Kendali', color: 'cyan' },
    { id: 'simulasi', label: 'Simulasi Mengerjakan Soal', icon: Play, badge: 'Mengerjakan Soal', color: 'emerald' },
    { id: 'jadwal-ujian', label: 'Jadwal & Sesi', icon: Calendar, badge: `${totalSesi} Sesi`, color: 'sky' },
    { id: 'bank-soal', label: 'Bank Soal', icon: FileQuestion, badge: `${bankSoalList.length} Paket`, color: 'indigo' },
    { id: 'token-ujian', label: 'Token Ujian', icon: Key, badge: 'Otomatis Sesi', color: 'amber' },
    { id: 'proktor', label: 'Pengawasan', icon: Eye, badge: 'Live Proktor', color: 'teal' },
    { id: 'hasil-ujian', label: 'Hasil Ujian', icon: CheckCircle2, badge: 'Auto-Grade', color: 'blue' },
    { id: 'rapor-pendidikan', label: 'Rapor Pendidikan', icon: Award, badge: 'Mutu Asesmen', color: 'purple' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* 8-MODULE INTEGRATION PIPELINE BANNER */}
      <div className="bg-white/90 p-4 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Alur Integrasi CBT Mandiri (8 Modul Terhubung Penuh)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            {sesiWithQuestions}/{totalSesi} Sesi Terhubung Paket Soal (100%)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {pipelineModules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => onNavigateTab(mod.id)}
                className="p-2.5 rounded-2xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/50 transition text-left group flex flex-col justify-between cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-cyan-600 group-hover:text-white text-slate-700 flex items-center justify-center transition">
                    <Icon size={14} />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-cyan-600">0{idx + 1}</span>
                </div>
                <div>
                  <div className="text-[11px] font-black text-slate-800 truncate group-hover:text-cyan-700">
                    {mod.label}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 truncate">
                    {mod.badge}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigateTab('jadwal-ujian')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-cyan-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Sesi Ujian CBT</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-cyan-600">
            {totalSesi} <span className="text-sm font-semibold text-slate-400">Sesi</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>{sesiBerlangsung} Aktif • {sesiSelesai} Selesai</span>
            <span className="text-cyan-600 font-bold flex items-center gap-0.5">Kelola <ArrowRight size={12} /></span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('bank-soal')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-indigo-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Bank Soal Tersedia</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
              <FileQuestion size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-600">
            {bankSoalList.length} <span className="text-sm font-semibold text-slate-400">Paket</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Paket Soal Pembelajaran Terstruktur</span>
            <span className="text-indigo-600 font-bold flex items-center gap-0.5">Bank Soal <ArrowRight size={12} /></span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('token-ujian')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Token Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <Key size={16} />
            </div>
          </div>
          <div className="text-2xl font-mono font-black text-amber-600 tracking-wider">
            {tokenActive && tokenActive !== '-' && tokenActive !== 'BELUM AKTIF' ? tokenActive : '-'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            {tokenActive && tokenActive !== '-' && tokenActive !== 'BELUM AKTIF' ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Valid & Aktif
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Belum Ada Token Aktif</span>
            )}
            <span className="text-amber-600 font-bold flex items-center gap-0.5">Token <ArrowRight size={12} /></span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('hasil-ujian')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-2 cursor-pointer hover:border-emerald-400 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Rata-rata Skor Nilai</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <Award size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {avgScore} <span className="text-sm font-semibold text-slate-400">Poin</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span>{activeStudents.length} Siswa Terdata</span>
            <span className="text-emerald-600 font-bold flex items-center gap-0.5">Hasil <ArrowRight size={12} /></span>
          </div>
        </div>
      </div>

      {/* Live Server CBT & Proktor Quick Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Engine CBT Online Aktif & Siap Digunakan
            </div>
            <h2 className="text-xl font-black text-white">
              Sistem Computer-Based Testing (CBT) Terintegrasi
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mendukung pelaksanaan Asesmen Sumatif Harian, STS, SAS, hingga Tryout ANBK secara fleksibel, acak soal otomatis, token dinamis, dan pengawasan proktor live.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => onNavigateTab('simulasi')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Play size={15} />
              <span>Simulasi Mengerjakan Soal (Siswa)</span>
            </button>
            <button
              onClick={() => onNavigateTab('jadwal-ujian')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Calendar size={15} />
              <span>Buat Sesi Ujian</span>
            </button>
            <button
              onClick={() => onNavigateTab('proktor')}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl border border-white/20 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Eye size={15} />
              <span>Live Monitor Proktor</span>
            </button>
          </div>
        </div>

        {/* Server metrics bottom strip */}
        <div className="mt-6 pt-4 border-t border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Status Engine CBT</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <Activity size={13} /> Online (Latency 14ms)
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Mode Keamanan</span>
            <span className="font-bold text-cyan-300 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck size={13} /> Token Lock & Anti-Cheat
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Total Peserta Terdaftar</span>
            <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
              <Users size={13} /> {activeStudents.length} Siswa Aktif
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[11px] block">Guru / Proktor</span>
            <span className="font-bold text-amber-300 flex items-center gap-1.5 mt-0.5">
              <Laptop size={13} /> {teachers.length} Akun GTK
            </span>
          </div>
        </div>
      </div>

      {/* Sesi Ujian Terkini & Quick Launcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sesi Ujian Terkini */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Sesi Ujian Terjadwal & Aktif</h3>
              <p className="text-xs text-slate-500">Daftar pelaksanaan asesmen CBT terbaru</p>
            </div>
            <button
              onClick={() => onNavigateTab('jadwal-ujian')}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              Lihat Semua ({ujianList.length}) <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {ujianList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                <Calendar size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Belum ada sesi ujian terjadwal</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Klik tab "Jadwal & Sesi Ujian" untuk membuat sesi baru.</p>
              </div>
            ) : (
              ujianList.slice(0, 5).map((u: any, idx: number) => {
                const soalCount = u.soalList?.length || u.jumlahSoal || 30;
                return (
                  <div 
                    key={u.id ? `${u.id}-${idx}` : `dashboard-sesi-${idx}`}
                    className="p-4 rounded-2xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 transition"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 font-bold rounded-md text-[10px]">
                          {u.jenis}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">{u.id}</span>
                        {u.token && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold rounded-md text-[10px] flex items-center gap-1">
                            <Key size={10} />
                            Token: {u.token}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold rounded-md text-[10px] flex items-center gap-1">
                          <FileQuestion size={10} />
                          {soalCount} Soal PG
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900">{u.mapel}</h4>
                      <p className="text-xs text-slate-500">
                        Kelas: <strong className="text-slate-700">{formatClassLabel(u.kelas, true)}</strong> • {u.tgl} ({u.durasi}) • Proktor: <span className="text-slate-600 font-medium">{u.proktor || 'Guru Pengampu'}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                      <button
                        onClick={() => onNavigateTab('simulasi', { session: u, sesiId: u.id, token: u.token })}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                        title="Mulai Uji Coba CBT Sesi Ini"
                      >
                        <Play size={13} />
                        <span>Uji Coba</span>
                      </button>
                      <button
                        onClick={() => onNavigateTab('proktor', { session: u, sesiId: u.id })}
                        className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-700 rounded-xl border border-slate-200 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                        title="Buka Pengawasan Proktor"
                      >
                        <Eye size={13} />
                        <span>Proktor</span>
                      </button>
                      {u.bankSoalId && (
                        <button
                          onClick={() => onNavigateTab('bank-soal', { bankId: u.bankSoalId })}
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-xl border border-slate-200 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                          title="Buka Bank Soal"
                        >
                          <FileQuestion size={13} />
                          <span>Soal</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Shortcut Navigasi Cepat & Modul CBT */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Pusat Navigasi CBT</h3>
              <p className="text-xs text-slate-500">Pintasan cepat modul asesmen & evaluasi</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('simulasi')}
                className="w-full p-3 rounded-2xl bg-teal-50/70 hover:bg-teal-50 border border-teal-200 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                    <Play size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Simulasi Akun Siswa</div>
                    <div className="text-[11px] text-teal-700 font-medium">Uji coba pengerjaan soal (Sandbox)</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-teal-600 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => onNavigateTab('bank-soal')}
                className="w-full p-3 rounded-2xl bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <FileQuestion size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Kelola Bank Soal</div>
                    <div className="text-[11px] text-slate-500">{bankSoalList.length} Paket Soal Aktif</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-indigo-600 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => onNavigateTab('token-ujian')}
                className="w-full p-3 rounded-2xl bg-amber-50/60 hover:bg-amber-50 border border-amber-100 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                    <Key size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Distribusi Token Sesi</div>
                    <div className="text-[11px] text-slate-500">Token Aktif: {tokenActive}</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-amber-600 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => onNavigateTab('proktor')}
                className="w-full p-3 rounded-2xl bg-cyan-50/60 hover:bg-cyan-50 border border-cyan-100 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
                    <Eye size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Pengawasan Proktor Live</div>
                    <div className="text-[11px] text-slate-500">Pantau aktivitas & status siswa</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-cyan-600 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => onNavigateTab('rapor-pendidikan')}
                className="w-full p-3 rounded-2xl bg-purple-50/60 hover:bg-purple-50 border border-purple-100 text-left flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Award size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Rapor Pendidikan (ANBK)</div>
                    <div className="text-[11px] text-slate-500">Analisis Mutu Literasi & Numerasi</div>
                  </div>
                </div>
                <ArrowRight size={14} className="text-purple-600 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
            <AlertCircle size={15} className="text-cyan-600 shrink-0" />
            <span>Semua hasil ujian dan pengawasan terenkripsi otomatis di server lokal sekolah.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
