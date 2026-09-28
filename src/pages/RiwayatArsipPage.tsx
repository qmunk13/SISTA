import React, { useState, useMemo } from 'react';
import { 
  Archive, History, Award, DollarSign, GraduationCap, ShieldCheck, 
  Layers, ArrowUpRight, FileSpreadsheet, CheckCircle2
} from 'lucide-react';
import { useStore } from '../store';
import { db } from '../data/db';
import AlumniList from './AlumniList';
import MutasiList from './MutasiList';
import LogAuditDigitalTab from '../components/riwayat/LogAuditDigitalTab';
import RiwayatKeuanganTab from '../components/riwayat/RiwayatKeuanganTab';
import RiwayatGtkTab from '../components/riwayat/RiwayatGtkTab';
import CustomDropdown from '../components/common/CustomDropdown';

export default function RiwayatArsipPage() {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const { students } = useStore();

  const alumniCount = useMemo(() => {
    const fromStudents = students.filter(s => s && s.status === 'Lulus').length;
    const fromDb = ((db.get('alumni') as any[]) || []).length;
    return Math.max(fromStudents, fromDb);
  }, [students]);

  const mutasiCount = useMemo(() => {
    const fromStudents = students.filter(s => s && (s.status === 'Pindah' || s.status === 'Keluar')).length;
    const fromDb = ((db.get('mutasi') as any[]) || []).length;
    return Math.max(fromStudents, fromDb);
  }, [students]);

  const auditLogsCount = useMemo(() => {
    const logs = (db.get('audit_logs') as any[]) || [];
    return logs.length;
  }, []);

  const totalHistorisKas = useMemo(() => {
    const trx = (db.get('riwayat_keuangan_historis') as any[]) || [];
    return trx.reduce((acc, curr) => acc + (curr.nominal || 0), 0);
  }, []);

  const subTabs = [
    { id: 'dashboard', label: 'Dashboard Arsip', icon: Archive },
    { id: 'log-audit', label: 'Log Audit Keamanan', icon: ShieldCheck },
    { id: 'alumni', label: 'Data Alumni', icon: Award },
    { id: 'mutasi', label: 'Mutasi & Keluar', icon: History },
    { id: 'riwayat-keuangan', label: 'Riwayat Keuangan', icon: DollarSign },
    { id: 'riwayat-guru', label: 'Riwayat Guru & Staf', icon: GraduationCap },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100/80 shadow-2xs flex-shrink-0">
            <Archive size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Riwayat Digital & Arsip Log
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pusat track record digital alumni, mutasi siswa, riwayat transaksi keuangan lama, & audit log perubahan sistem.
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation: Mobile Dropdown Selector & Desktop Pill Tabs */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <CustomDropdown
          id="riwayat-subtab-mobile"
          label="Pilih Sub-Menu Arsip & Riwayat:"
          value={activeSubTab}
          onChange={(val) => setActiveSubTab(val)}
          options={subTabs.map(tab => ({ value: tab.id, label: tab.label }))}
          placeholder="Pilih Sub-Menu..."
        />
      </div>

      {/* Sub Tabs Desktop */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-violet-600 border border-slate-200/80'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub Tab Contents */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => setActiveSubTab('log-audit')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-violet-300 transition cursor-pointer group space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Log Audit Digital</span>
                <ShieldCheck size={18} className="text-violet-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-3xl font-black text-slate-900">
                {auditLogsCount} Log
              </div>
              <p className="text-[11px] text-slate-500">
                Riwayat aktivitas sistem terverifikasi
              </p>
            </div>

            <div 
              onClick={() => setActiveSubTab('alumni')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition cursor-pointer group space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Total Alumni Terarsip</span>
                <Award size={18} className="text-indigo-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-3xl font-black text-indigo-600">
                {alumniCount} Alumni
              </div>
              <p className="text-[11px] text-slate-500">
                Lulusan T.A lampau terdaftar
              </p>
            </div>

            <div 
              onClick={() => setActiveSubTab('mutasi')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition cursor-pointer group space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Mutasi & Keluar</span>
                <History size={18} className="text-rose-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-3xl font-black text-rose-600">
                {mutasiCount} Catatan
              </div>
              <p className="text-[11px] text-slate-500">
                Riwayat pindah sekolah / DO
              </p>
            </div>

            <div 
              onClick={() => setActiveSubTab('riwayat-keuangan')}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition cursor-pointer group space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Jurnal Kas Lampau</span>
                <DollarSign size={18} className="text-emerald-600 group-hover:scale-110 transition" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                {totalHistorisKas === 0 ? 'Rp 0' : `Rp ${totalHistorisKas.toLocaleString('id-ID')}`}
              </div>
              <p className="text-[11px] text-slate-500">
                {totalHistorisKas === 0 ? 'Belum ada data transaksi arsip' : 'Total transaksi arsip'}
              </p>
            </div>
          </div>

          {/* Quick Access Action Grid */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Archive size={18} className="text-violet-600" />
              Pusat Eksplorasi Rekam Jejak Digital Sekolah
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div 
                onClick={() => setActiveSubTab('log-audit')}
                className="p-4 rounded-2xl bg-violet-50/60 border border-violet-100 hover:bg-violet-100/60 transition cursor-pointer"
              >
                <h4 className="font-black text-violet-900 text-sm mb-1">Audit Trail & Keamanan Sistem</h4>
                <p className="text-violet-700 leading-relaxed">
                  Lacak siapa yang menambah, mengedit, atau menghapus data siswa, keuangan, dan nilai.
                </p>
              </div>

              <div 
                onClick={() => setActiveSubTab('riwayat-keuangan')}
                className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 hover:bg-emerald-100/60 transition cursor-pointer"
              >
                <h4 className="font-black text-emerald-900 text-sm mb-1">Arsip Pembukuan Kas & Tagihan</h4>
                <p className="text-emerald-700 leading-relaxed">
                  Lihat kwitansi pembayaran iuran siswa alumni, pencairan dana BOS terdahulu, serta rekap gaji tahun lalu.
                </p>
              </div>

              <div 
                onClick={() => setActiveSubTab('riwayat-guru')}
                className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 hover:bg-indigo-100/60 transition cursor-pointer"
              >
                <h4 className="font-black text-indigo-900 text-sm mb-1">Portofolio & Rekam Jejak GTK</h4>
                <p className="text-indigo-700 leading-relaxed">
                  Daftar guru pengampu mapel, penetapan wali kelas periode lampau, dan catatan sertifikasi pendidik.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'log-audit' && <LogAuditDigitalTab />}
      {activeSubTab === 'alumni' && <AlumniList />}
      {activeSubTab === 'mutasi' && <MutasiList />}
      {activeSubTab === 'riwayat-keuangan' && <RiwayatKeuanganTab />}
      {activeSubTab === 'riwayat-guru' && <RiwayatGtkTab />}
    </div>
  );
}
