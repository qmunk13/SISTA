import React, { useRef } from 'react';
import { Printer, X, Download, BarChart3, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store';
import { triggerPrint } from '../../lib/utils';

interface LaporanPdfModalProps {
  filterState: {
    year: string;
    mode: string;
    month: number;
    semester: string;
    kelas: string;
    label: string;
    rows: any[];
    summary: {
      totalSiswa: number;
      totalTagihan: number;
      totalBayar: number;
      sisaTagihan: number;
      totalTabungan: number;
    };
  };
  onClose: () => void;
}

export default function LaporanPdfModal({ filterState, onClose }: LaporanPdfModalProps) {
  const { settings } = useStore();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    triggerPrint();
  };

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none animate-in fade-in zoom-in-95">
        
        {/* Modal Header Controls (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider">Preview Laporan Rekapitulasi Keuangan</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={13} />
              <span>Cetak / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div id="printable-area" ref={printRef} className="printable-container p-8 sm:p-10 space-y-6 text-slate-900 font-sans print:p-0 print:m-0 print:border-none">
          {/* Official Kop Sekolah */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-950">
              {settings?.schoolName || 'PKBM / SEKOLAH CERDAS BANGSA'}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {settings?.address || 'Jl. Pendidikan Karakter No. 10, Jakarta Pusat'} • Telp: {settings?.phone || '021-5556789'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              NPSN: {settings?.npsn || '69988221'} • Kode Satdik: 31710022
            </p>
          </div>

          {/* Title */}
          <div className="text-center space-y-0.5">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              LAPORAN REKAPITULASI KEUANGAN & PEMBAYARAN TAGIHAN
            </h2>
            <p className="text-xs text-slate-600 font-bold">
              {filterState.label} {filterState.kelas ? `• ${filterState.kelas}` : '• Semua Rombel'}
            </p>
          </div>

          {/* 4 Metrics Summary Grid */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs border border-slate-200 rounded-2xl p-3 bg-slate-50">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Siswa</span>
              <span className="text-sm font-black text-slate-900 font-mono">{filterState.summary.totalSiswa}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Tagihan</span>
              <span className="text-sm font-black text-slate-900 font-mono">{fmtRp(filterState.summary.totalTagihan)}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-700 font-bold uppercase block">Penerimaan (Bayar)</span>
              <span className="text-sm font-black text-emerald-700 font-mono">{fmtRp(filterState.summary.totalBayar)}</span>
            </div>
            <div>
              <span className="text-[10px] text-rose-700 font-bold uppercase block">Sisa Tunggakan</span>
              <span className="text-sm font-black text-rose-700 font-mono">{fmtRp(filterState.summary.sisaTagihan)}</span>
            </div>
          </div>

          {/* Main Table */}
          <div className="space-y-1">
            <table className="w-full text-[11px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 uppercase font-black text-[9px] border-b border-slate-300">
                  <th className="p-2 border border-slate-300 w-8 text-center">No</th>
                  <th className="p-2 border border-slate-300 text-left">NIS</th>
                  <th className="p-2 border border-slate-300 text-left">Nama Siswa</th>
                  <th className="p-2 border border-slate-300 text-left">Kelas</th>
                  <th className="p-2 border border-slate-300 text-right">Tagihan (Rp)</th>
                  <th className="p-2 border border-slate-300 text-right">Terbayar (Rp)</th>
                  <th className="p-2 border border-slate-300 text-right">Sisa Tagihan (Rp)</th>
                  <th className="p-2 border border-slate-300 text-right">Tabungan (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filterState.rows.map((r, idx) => (
                  <tr key={r.siswaId} className="even:bg-slate-50/50">
                    <td className="p-2 border border-slate-300 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 font-mono text-slate-600">{r.nis}</td>
                    <td className="p-2 border border-slate-300 font-bold text-slate-900">{r.nama}</td>
                    <td className="p-2 border border-slate-300">{r.kelasNama}</td>
                    <td className="p-2 border border-slate-300 text-right font-mono">{fmtRp(r.totalTagihan)}</td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-bold text-emerald-800">{fmtRp(r.totalBayar)}</td>
                    <td className="p-2 border border-slate-300 text-right font-mono font-bold text-rose-700">{fmtRp(r.sisaTagihan)}</td>
                    <td className="p-2 border border-slate-300 text-right font-mono text-slate-700">{fmtRp(r.totalTabungan)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-900 text-slate-900 text-[10px]">
                <tr>
                  <td colSpan={4} className="p-2 text-right uppercase">TOTAL KESELURUHAN:</td>
                  <td className="p-2 text-right font-mono border border-slate-300">{fmtRp(filterState.summary.totalTagihan)}</td>
                  <td className="p-2 text-right font-mono border border-slate-300 text-emerald-900">{fmtRp(filterState.summary.totalBayar)}</td>
                  <td className="p-2 text-right font-mono border border-slate-300 text-rose-800">{fmtRp(filterState.summary.sisaTagihan)}</td>
                  <td className="p-2 text-right font-mono border border-slate-300">{fmtRp(filterState.summary.totalTabungan)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-center">
            <div className="space-y-12">
              <p className="text-slate-600">Mengetahui,<br /><strong>Kepala Satuan Pendidikan</strong></p>
              <div className="font-bold text-slate-900 underline underline-offset-4">
                ( {settings?.principalName || '............................................'} )
              </div>
            </div>

            <div className="space-y-12">
              <p className="text-slate-600">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br /><strong>Bendahara Keuangan</strong></p>
              <div className="font-bold text-slate-900 underline underline-offset-4">
                ( {settings?.treasurerName || '............................................'} )
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
