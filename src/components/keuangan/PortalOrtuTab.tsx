import React, { useState, useMemo } from 'react';
import { 
  UserCheck, Search, Wallet, CreditCard, Receipt, 
  Printer, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, 
  HelpCircle, Eye
} from 'lucide-react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { 
  KeuanganTagihan, KeuanganInvoice, KeuanganTabungan 
} from '../../data/keuanganSeed';

interface PortalOrtuTabProps {
  onPrintInvoice: (invoiceId: string) => void;
  onOpenPdfReport: (filterState: any) => void;
}

export default function PortalOrtuTab({ onPrintInvoice, onOpenPdfReport }: PortalOrtuTabProps) {
  const { students, settings } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Student
  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // DB Data
  const tagihanList = useMemo(() => db.get<KeuanganTagihan>('keuangan_tagihan') || [], []);
  const invoiceList = useMemo(() => db.get<KeuanganInvoice>('keuangan_invoices') || [], []);
  const tabunganList = useMemo(() => db.get<KeuanganTabungan>('keuangan_tabungan') || [], []);

  // Filtered for Current Student
  const studentTagihan = useMemo(() => {
    if (!currentStudent) return [];
    return tagihanList.filter(t => t.siswaId === currentStudent.id);
  }, [tagihanList, currentStudent]);

  const studentInvoices = useMemo(() => {
    if (!currentStudent) return [];
    return invoiceList.filter(i => i.siswaId === currentStudent.id);
  }, [invoiceList, currentStudent]);

  const studentTabungan = useMemo(() => {
    if (!currentStudent) return [];
    return tabunganList.filter(t => t.siswaId === currentStudent.id);
  }, [tabunganList, currentStudent]);

  // Tabungan Balance
  const tabunganSaldo = useMemo(() => {
    return studentTabungan.reduce((acc, t) => {
      const nom = Number(t.nominal) || 0;
      return t.jenis === 'SETOR' ? acc + nom : acc - nom;
    }, 0);
  }, [studentTabungan]);

  // Tagihan Totals
  const totalTagihanAsli = useMemo(() => {
    return studentTagihan.reduce((acc, t) => acc + (Number(t.nominalAsli || t.nominal) || 0), 0);
  }, [studentTagihan]);

  const totalTerbayar = useMemo(() => {
    return studentTagihan.reduce((acc, t) => acc + (Number(t.paidAmount) || 0), 0);
  }, [studentTagihan]);

  const sisaTunggakan = useMemo(() => {
    return studentTagihan.reduce((acc, t) => acc + (Number(t.nominal) || 0), 0);
  }, [studentTagihan]);

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Header & Student Selector */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <UserCheck size={20} className="text-emerald-600" />
            Portal Wali Murid (Parent Self-Service)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tampilan transparansi tagihan biaya pendidikan, bukti kuitansi, dan mutasi saldo tabungan ananda.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Pilih Siswa / Ananda:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none flex-1 md:w-64"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
            ))}
          </select>
        </div>
      </div>

      {currentStudent && (
        <>
          {/* Student Profile Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider inline-block">
                Peserta Didik Aktif
              </span>
              <h3 className="text-xl font-black">{currentStudent.name}</h3>
              <p className="text-xs text-slate-300">
                NIS: <span className="font-mono font-bold text-white">{currentStudent.nis || currentStudent.NISN || '-'}</span> • Kelas: <span className="font-bold text-white">{currentStudent.class}</span> • Wali Murid: <span className="text-slate-200">{currentStudent.parentName || (currentStudent as any).ortuNama || '-'}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenPdfReport({
                  year: String(new Date().getFullYear()),
                  mode: 'BULAN',
                  month: new Date().getMonth() + 1,
                  semester: 'SEMUA',
                  kelas: currentStudent.class,
                  label: `Laporan Keuangan Ananda ${currentStudent.name}`,
                  rows: [{
                    siswaId: currentStudent.id,
                    nis: currentStudent.nis || '-',
                    nama: currentStudent.name,
                    kelasNama: currentStudent.class,
                    totalTagihan: totalTagihanAsli,
                    totalBayar: totalTerbayar,
                    sisaTagihan: sisaTunggakan,
                    totalTabungan: tabunganSaldo,
                    jumlahTagihan: studentTagihan.length,
                  }],
                  summary: {
                    totalSiswa: 1,
                    totalTagihan: totalTagihanAsli,
                    totalBayar: totalTerbayar,
                    sisaTagihan: sisaTunggakan,
                    totalTabungan: tabunganSaldo,
                  }
                })}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Printer size={14} />
                <span>Cetak Rekap Ananda</span>
              </button>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Tagihan Keseluruhan</span>
              <div className="text-2xl font-black text-slate-900 font-mono">{fmtRp(totalTagihanAsli)}</div>
              <p className="text-[11px] text-slate-400 font-medium">Terbayar: <span className="text-emerald-700 font-bold font-mono">{fmtRp(totalTerbayar)}</span></p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Sisa Tagihan / Tunggakan</span>
              <div className="text-2xl font-black text-rose-600 font-mono">{fmtRp(sisaTunggakan)}</div>
              <p className="text-[11px] text-slate-400 font-medium">
                {sisaTunggakan === 0 ? 'Alhamdulillah, semua tagihan lunas' : `${studentTagihan.filter(t => t.status !== 'LUNAS').length} pos tagihan aktif`}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Saldo Tabungan Ananda</span>
              <div className="text-2xl font-black text-emerald-700 font-mono">{fmtRp(tabunganSaldo)}</div>
              <p className="text-[11px] text-emerald-600 font-medium">Dapat didebet sewaktu-waktu untuk pembayaran biaya sekolah</p>
            </div>
          </div>

          {/* Sub Sections: Tagihan List & Invoices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tagihan & Status */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={15} className="text-emerald-600" />
                  Daftar Tagihan & Status
                </h4>
                <span className="text-[11px] font-bold text-slate-500">{studentTagihan.length} Pos</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {studentTagihan.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">
                    Tidak ada catatan tagihan untuk siswa ini.
                  </div>
                ) : (
                  studentTagihan.map(t => (
                    <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{t.namaBiaya}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Periode: {t.periode} • Jatuh Tempo: {t.jatuhTempo}</div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="font-mono font-black text-slate-900">{fmtRp(t.nominal)}</div>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] inline-block ${
                          t.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' : t.status === 'SEBAGIAN' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Riwayat Kuitansi Invoice */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt size={15} className="text-indigo-600" />
                  Kuitansi Pembayaran Terbit
                </h4>
                <span className="text-[11px] font-bold text-slate-500">{studentInvoices.length} Invoice</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {studentInvoices.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">
                    Belum ada kuitansi pembayaran yang diterbitkan.
                  </div>
                ) : (
                  studentInvoices.map(inv => (
                    <div key={inv.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-mono font-black text-emerald-700">{inv.invoiceId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Tgl: {inv.tglBayar} • {inv.metode}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-black text-slate-900">{fmtRp(inv.total)}</div>
                        <button
                          onClick={() => onPrintInvoice(inv.invoiceId)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[10px] transition flex items-center gap-1"
                        >
                          <Printer size={11} />
                          <span>Kwitansi</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Riwayat Mutasi Tabungan */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet size={15} className="text-emerald-600" />
                Buku Tabungan & Mutasi Saldo
              </h4>
              <span className="text-xs font-black text-emerald-700 font-mono">Saldo: {fmtRp(tabunganSaldo)}</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {studentTabungan.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  Belum ada riwayat transaksi tabungan untuk siswa ini.
                </div>
              ) : (
                studentTabungan.map(tb => (
                  <div key={tb.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                          tb.jenis === 'SETOR' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {tb.jenis}
                        </span>
                        <span>{tb.catatan || '-'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Tgl: {tb.tanggal}</div>
                    </div>
                    <div className={`font-mono font-black ${tb.jenis === 'SETOR' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {tb.jenis === 'SETOR' ? `+ ${fmtRp(tb.nominal)}` : `- ${fmtRp(tb.nominal)}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
