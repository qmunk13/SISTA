import React, { useMemo, useState, useEffect } from 'react';
import { 
  X, UserCheck, CreditCard, Receipt, Wallet, Printer, 
  CheckCircle2, Clock, AlertCircle, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { 
  KeuanganTagihan, KeuanganInvoice, KeuanganTabungan 
} from '../../data/keuanganSeed';
import {
  normalizeTagihanRow,
  deduplicateTagihanList,
  normalizePembayaranRow,
  deduplicatePembayaranList,
  normalizeTabunganRow,
  deduplicateTabunganList
} from '../../lib/keuanganNormalizers';

function getValidArray(...keys: string[]): any[] {
  for (const k of keys) {
    const val = db.get<any>(k);
    if (Array.isArray(val) && val.length > 0) return val;
  }
  return [];
}

interface DetailSiswaKeuanganModalProps {
  siswaId: string;
  onClose: () => void;
  onPrintInvoice: (invoiceId: string) => void;
}

export default function DetailSiswaKeuanganModal({ siswaId, onClose, onPrintInvoice }: DetailSiswaKeuanganModalProps) {
  const { students } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'TAGIHAN' | 'INVOICE' | 'TABUNGAN'>('TAGIHAN');
  const [dbVersion, setDbVersion] = useState(0);

  useEffect(() => {
    const handleDbChange = () => {
      setDbVersion(v => v + 1);
    };
    window.addEventListener('erp-db-updated', handleDbChange);
    window.addEventListener('erp-db-synced', handleDbChange);
    window.addEventListener('erp-keuangan-updated', handleDbChange);
    window.addEventListener('erp-keuangan-cleared', handleDbChange);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbChange);
      window.removeEventListener('erp-db-synced', handleDbChange);
      window.removeEventListener('erp-keuangan-updated', handleDbChange);
      window.removeEventListener('erp-keuangan-cleared', handleDbChange);
    };
  }, []);

  const student = useMemo(() => {
    const q = String(siswaId || '').trim().toLowerCase();
    return students.find(s => 
      String(s.id).toLowerCase() === q ||
      String(s.nis || '').toLowerCase() === q ||
      String(s.nisn || '').toLowerCase() === q ||
      String(s.nopdkt || (s as any).NoPDKT || '').toLowerCase() === q ||
      String((s as any).registrationCode || (s as any).no_pendaftaran || '').toLowerCase() === q ||
      String(s.name || '').trim().toLowerCase() === q
    );
  }, [students, siswaId, dbVersion]);

  const validStudentKeys = useMemo(() => {
    const keys = new Set<string>();
    const addKey = (val: any) => {
      if (!val) return;
      const str = String(val).trim().toLowerCase();
      if (!str || str === '-') return;
      keys.add(str);
      if (/^\d+$/.test(str)) {
        keys.add(str.padStart(3, '0'));
        keys.add(String(Number(str)));
      }
    };
    addKey(siswaId);
    if (student) {
      addKey(student.id);
      addKey(student.nis);
      addKey(student.nisn);
      addKey(student.nopdkt);
      addKey((student as any).NoPDKT);
      addKey((student as any).registrationCode);
      addKey((student as any).no_pendaftaran);
    }
    return keys;
  }, [siswaId, student, dbVersion]);

  const studentNameLower = (student?.name || '').trim().toLowerCase();

  // DB Data (Normalized from Google Spreadsheet & local DB)
  const allTagihan = useMemo(() => {
    const raw = getValidArray('keuangan_tagihan', 'TAGIHAN', 'tagihan');
    const norm = raw.map((r: any, idx: number) => normalizeTagihanRow(r, idx, students));
    return deduplicateTagihanList(norm);
  }, [students, dbVersion]);

  const allInvoices = useMemo(() => {
    const raw = getValidArray('keuangan_invoices', 'keuangan_pembayaran', 'PEMBAYARAN', 'INVOICE');
    const norm = raw.map((r: any, idx: number) => normalizePembayaranRow(r, idx, students));
    return deduplicatePembayaranList(norm);
  }, [students, dbVersion]);

  const allTabungan = useMemo(() => {
    const raw = getValidArray('keuangan_tabungan', 'TABUNGAN', 'tabungan');
    const norm = raw.map((r: any, idx: number) => normalizeTabunganRow(r, idx, students));
    return deduplicateTabunganList(norm);
  }, [students, dbVersion]);

  const studentTagihan = useMemo(() => {
    return allTagihan.filter(t => {
      const tId = String(t.siswaId || (t as any).SiswaID || t.nopdkt || (t as any).NoPDKT || '').trim().toLowerCase();
      const tNopdkt = String(t.nopdkt || (t as any).NoPDKT || '').trim().toLowerCase();
      const tNis = String(t.nis || '').trim().toLowerCase();
      const tNama = String(t.namaSiswa || (t as any).NamaSiswa || '').trim().toLowerCase();
      return (tId && validStudentKeys.has(tId)) || (tNopdkt && validStudentKeys.has(tNopdkt)) || (tNis && validStudentKeys.has(tNis)) || (studentNameLower && tNama === studentNameLower);
    });
  }, [allTagihan, validStudentKeys, studentNameLower]);

  const studentInvoices = useMemo(() => {
    return allInvoices.filter(i => {
      const iId = String(i.siswaId || (i as any).SiswaID || (i as any).nopdkt || (i as any).NoPDKT || '').trim().toLowerCase();
      const iNama = String(i.namaSiswa || (i as any).NamaSiswa || '').trim().toLowerCase();
      return (iId && validStudentKeys.has(iId)) || (studentNameLower && iNama === studentNameLower);
    });
  }, [allInvoices, validStudentKeys, studentNameLower]);

  const studentTabungan = useMemo(() => {
    return allTabungan.filter(t => {
      const tId = String(t.siswaId || (t as any).SiswaID || (t as any).nopdkt || (t as any).NoPDKT || '').trim().toLowerCase();
      const tNama = String(t.namaSiswa || (t as any).NamaSiswa || '').trim().toLowerCase();
      return (tId && validStudentKeys.has(tId)) || (studentNameLower && tNama === studentNameLower);
    });
  }, [allTabungan, validStudentKeys, studentNameLower]);

  // Summaries
  const totalTagihan = useMemo(() => {
    return studentTagihan.reduce((acc, t) => acc + (Number(t.totalTagihan || t.nominalAsli || t.nominal) || 0), 0);
  }, [studentTagihan]);

  const totalTerbayar = useMemo(() => {
    const fromTagihan = studentTagihan.reduce((acc, t) => acc + (Number(t.paidAmount) || Number((t as any).totalBayar) || (t.status === 'LUNAS' ? Number(t.totalTagihan || t.nominalAsli || t.nominal) : 0)), 0);
    const fromInvoices = studentInvoices.reduce((acc, inv) => acc + (Number(inv.total ?? inv.nominal ?? 0) || 0), 0);
    return Math.max(fromTagihan, fromInvoices);
  }, [studentTagihan, studentInvoices]);

  const sisaTagihan = useMemo(() => {
    return studentTagihan.reduce((acc, t) => {
      if (t.status === 'LUNAS') return acc;
      const s = (t as any).sisaTagihan !== undefined ? Number((t as any).sisaTagihan) : Number(t.nominal || 0);
      return acc + s;
    }, 0);
  }, [studentTagihan]);

  const totalTabungan = useMemo(() => {
    return studentTabungan.reduce((acc, t) => {
      const nom = Number(t.nominal) || 0;
      return t.jenis === 'SETOR' ? acc + nom : acc - nom;
    }, 0);
  }, [studentTabungan]);

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  if (!student) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full space-y-4">
          <p className="text-sm font-bold text-slate-800">Data siswa tidak ditemukan</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider">Buku Kas & Ledger Siswa</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Profile Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">{student.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                NIS: <span className="font-mono font-bold text-slate-800">{student.nis || student.nisn || '-'}</span> • Kelas: <span className="font-bold text-slate-800">{student.class}</span> • Wali: <span className="font-medium text-slate-700">{student.parentName || (student as any).ortuNama || '-'}</span>
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full uppercase">
              {student.status || 'Aktif'}
            </span>
          </div>

          {/* 4 Metrics Mini Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Tagihan</span>
              <div className="font-black text-slate-900 font-mono text-sm">{fmtRp(totalTagihan)}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Terbayar</span>
              <div className="font-black text-emerald-700 font-mono text-sm">{fmtRp(totalTerbayar)}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold text-rose-600 uppercase">Sisa Tunggakan</span>
              <div className="font-black text-rose-600 font-mono text-sm">{fmtRp(sisaTagihan)}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">Saldo Tabungan</span>
              <div className="font-black text-emerald-700 font-mono text-sm">{fmtRp(totalTabungan)}</div>
            </div>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveSubTab('TAGIHAN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'TAGIHAN' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard size={13} />
              <span>Tagihan & Tunggakan ({studentTagihan.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('INVOICE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'INVOICE' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Receipt size={13} />
              <span>Bukti Pembayaran ({studentInvoices.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('TABUNGAN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'TABUNGAN' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Wallet size={13} />
              <span>Mutasi Tabungan ({studentTabungan.length})</span>
            </button>
          </div>

          {/* Sub Tab Content */}
          {activeSubTab === 'TAGIHAN' && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Pos Tagihan</th>
                    <th className="p-3">Periode</th>
                    <th className="p-3 text-right">Tagihan Asli</th>
                    <th className="p-3 text-right">Terbayar</th>
                    <th className="p-3 text-right">Sisa Tagihan</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentTagihan.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">Tidak ada tagihan untuk siswa ini.</td>
                    </tr>
                  ) : (
                    studentTagihan.map(t => {
                      const tot = Number(t.totalTagihan || t.nominalAsli || t.nominal || 0);
                      const paid = Number(t.paidAmount ?? (t as any).totalBayar ?? (t.status === 'LUNAS' ? tot : 0));
                      const sisa = t.status === 'LUNAS' ? 0 : Number((t as any).sisaTagihan ?? (t as any).sisa ?? Math.max(0, tot - paid));
                      return (
                        <tr key={t.id}>
                          <td className="p-3 font-bold text-slate-900">{t.namaBiaya}</td>
                          <td className="p-3 font-mono text-slate-600">{t.periode}</td>
                          <td className="p-3 text-right font-mono">{fmtRp(tot)}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">{fmtRp(paid)}</td>
                          <td className="p-3 text-right font-mono font-black text-rose-600">{fmtRp(sisa)}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              t.status === 'LUNAS' ? 'bg-emerald-100 text-emerald-800' : t.status === 'SEBAGIAN' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'INVOICE' && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">No. Invoice</th>
                    <th className="p-3">Tanggal Bayar</th>
                    <th className="p-3">Metode</th>
                    <th className="p-3 text-right">Total (Rp)</th>
                    <th className="p-3 pr-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">Belum ada riwayat pembayaran untuk siswa ini.</td>
                    </tr>
                  ) : (
                    studentInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td className="p-3 font-mono font-black text-emerald-700">{inv.invoiceId}</td>
                        <td className="p-3 font-mono text-slate-600">{inv.tglBayar}</td>
                        <td className="p-3 font-semibold">{inv.metode}</td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">{fmtRp(inv.total)}</td>
                        <td className="p-3 pr-4 text-center">
                          <button
                            onClick={() => onPrintInvoice(inv.invoiceId)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[10px] transition inline-flex items-center gap-1"
                          >
                            <Printer size={11} />
                            <span>Cetak Kwitansi</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'TABUNGAN' && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-black text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3 text-center">Jenis</th>
                    <th className="p-3 text-right">Nominal (Rp)</th>
                    <th className="p-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {studentTabungan.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">Belum ada transaksi tabungan untuk siswa ini.</td>
                    </tr>
                  ) : (
                    studentTabungan.map(tb => (
                      <tr key={tb.id}>
                        <td className="p-3 font-mono text-slate-600">{tb.tanggal}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                            tb.jenis === 'SETOR' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {tb.jenis}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-mono font-black ${tb.jenis === 'SETOR' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {tb.jenis === 'SETOR' ? `+ ${fmtRp(tb.nominal)}` : `- ${fmtRp(tb.nominal)}`}
                        </td>
                        <td className="p-3 text-slate-600">{tb.catatan || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
