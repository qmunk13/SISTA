import React, { useState, useMemo } from 'react';
import { Printer, X, ShieldCheck, Scissors } from 'lucide-react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { KeuanganInvoice } from '../../data/keuanganSeed';
import { triggerPrint } from '../../lib/utils';
import { normalizePembayaranRow, deduplicatePembayaranList } from '../../lib/keuanganNormalizers';

interface KwitansiInvoiceModalProps {
  invoiceId: string;
  onClose: () => void;
}

// Konversi Angka ke Kalimat Terbilang Rupiah Resmi
function terbilangRupiah(nominal: number): string {
  const angka = Math.floor(Math.abs(nominal || 0));
  if (angka === 0) return 'Nol Rupiah';

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function toWords(n: number): string {
    if (n < 12) return satuan[n];
    if (n < 20) return toWords(n - 10) + ' Belas';
    if (n < 100) return toWords(Math.floor(n / 10)) + ' Puluh' + (n % 10 !== 0 ? ' ' + toWords(n % 10) : '');
    if (n < 200) return 'Seratus' + (n % 100 !== 0 ? ' ' + toWords(n % 100) : '');
    if (n < 1000) return toWords(Math.floor(n / 100)) + ' Ratus' + (n % 100 !== 0 ? ' ' + toWords(n % 100) : '');
    if (n < 2000) return 'Seribu' + (n % 1000 !== 0 ? ' ' + toWords(n % 1000) : '');
    if (n < 1000000) return toWords(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 !== 0 ? ' ' + toWords(n % 1000) : '');
    if (n < 1000000000) return toWords(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 !== 0 ? ' ' + toWords(n % 1000000) : '');
    if (n < 1000000000000) return toWords(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 !== 0 ? ' ' + toWords(n % 1000000000) : '');
    return toWords(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 !== 0 ? ' ' + toWords(n % 1000000000000) : '');
  }

  return toWords(angka).trim() + ' Rupiah';
}

export default function KwitansiInvoiceModal({ invoiceId, onClose }: KwitansiInvoiceModalProps) {
  const { settings, students } = useStore();
  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>('A4');
  const [printLayout, setPrintLayout] = useState<'half' | 'full'>('half'); // 'half' = 2 rangkap (arsip & siswa), 'full' = 1 lembar

  const allInvoices = useMemo(() => {
    const raw = db.get<any>('keuangan_invoices') || 
                db.get<any>('keuangan_pembayaran') || 
                db.get<any>('PEMBAYARAN') || [];
    const normalized = raw.map((r: any, idx: number) => normalizePembayaranRow(r, idx, students));
    return deduplicatePembayaranList(normalized);
  }, [students]);

  const invoice = useMemo(() => {
    if (!invoiceId) return null;
    const cleanTarget = String(invoiceId).trim().toLowerCase();
    const alphaTarget = cleanTarget.replace(/[^a-z0-9]/g, '');

    return allInvoices.find(i => {
      const invId = String(i.invoiceId || i.id || (i as any).pembayaranId || (i as any).PembayaranID || '').trim().toLowerCase();
      const invAlpha = invId.replace(/[^a-z0-9]/g, '');
      return invId === cleanTarget || invAlpha === alphaTarget;
    });
  }, [allInvoices, invoiceId]);

  const handlePrint = () => {
    triggerPrint();
  };

  const fmtRp = (n: number) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

  if (!invoice) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 text-center max-w-sm w-full space-y-4">
          <p className="text-sm font-bold text-slate-800">Invoice tidak ditemukan</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold">
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const terbilangText = terbilangRupiah(invoice.total);

  // Komponen Tunggal Kwitansi Resmi
  const SingleKwitansi = ({ rangkapLabel }: { rangkapLabel?: string }) => (
    <div className="receipt-box border border-slate-300 p-5 sm:p-6 bg-white text-slate-900 space-y-3.5 print:border print:border-black print:p-4 text-xs">
      {/* Header & Kop Resmi */}
      <div className="border-b-2 border-slate-900 pb-3">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-0.5">
            <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-950">
              {settings?.schoolName || 'ROMBEL KARANG TARUNA KECAMATAN TAMBORA'}
            </h1>
            <p className="text-[11px] text-slate-600 font-medium">
              {settings?.address || 'Kecamatan Tambora, Kota Administrasi Jakarta Barat'} • Telp: {settings?.phone || '021-63851123'}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              NPSN: {settings?.npsn || 'P9960001'} • Email: info@rombeltambora.sch.id
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="inline-block border-2 border-emerald-700 bg-emerald-50 text-emerald-800 font-black px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider print:border-black print:bg-white print:text-black">
              KWITANSI SAH
            </div>
            {rangkapLabel && (
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 block print:text-black">
                {rangkapLabel}
              </div>
            )}
            <div className="text-[11px] font-mono font-bold text-slate-600 mt-1">
              No: <span className="text-slate-950 font-black">{invoice.invoiceId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Identitas Siswa & Transaksi */}
      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs print:bg-transparent print:border print:border-black">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-24 text-slate-500 font-medium">Telah Terima Dari</span>
            <span className="text-slate-900 font-bold">: {invoice.namaSiswa}</span>
          </div>
          <div className="flex">
            <span className="w-24 text-slate-500 font-medium">Kelas / Rombel</span>
            <span className="text-slate-800 font-semibold">: {invoice.namaKelas || '-'}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex">
            <span className="w-24 text-slate-500 font-medium">Tanggal Bayar</span>
            <span className="text-slate-900 font-bold font-mono">: {invoice.tglBayar}</span>
          </div>
          <div className="flex">
            <span className="w-24 text-slate-500 font-medium">Metode Bayar</span>
            <span className="text-emerald-700 font-black uppercase">: {invoice.metode}</span>
          </div>
        </div>
      </div>

      {/* Terbilang */}
      <div className="p-2.5 bg-slate-100/70 border border-slate-200 rounded-lg text-xs italic font-serif text-slate-800 print:bg-transparent print:border print:border-black">
        <span className="font-sans font-bold not-italic text-slate-600 mr-2">Uang Sejumlah:</span>
        "{terbilangText}"
      </div>

      {/* Tabel Rincian Pos Pembayaran */}
      <div>
        <table className="w-full text-xs border-collapse border border-slate-300 print:border-black">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] print:bg-transparent print:border-b print:border-black">
              <th className="py-1.5 px-2 border border-slate-300 print:border-black text-center w-8">No</th>
              <th className="py-1.5 px-2 border border-slate-300 print:border-black text-left">Rincian Pos Biaya / Keterangan</th>
              <th className="py-1.5 px-2 border border-slate-300 print:border-black text-center w-24">Periode</th>
              <th className="py-1.5 px-2 border border-slate-300 print:border-black text-right w-32">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 print:divide-black">
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-2 text-center border border-slate-300 print:border-black font-mono">{idx + 1}</td>
                  <td className="py-1.5 px-2 border border-slate-300 print:border-black font-semibold text-slate-900">{it.namaBiaya}</td>
                  <td className="py-1.5 px-2 text-center border border-slate-300 print:border-black font-mono text-slate-700">{it.periode}</td>
                  <td className="py-1.5 px-2 text-right border border-slate-300 print:border-black font-mono font-bold text-slate-900">{fmtRp(it.nominal)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-1.5 px-2 text-center border border-slate-300 print:border-black font-mono">1</td>
                <td className="py-1.5 px-2 border border-slate-300 print:border-black font-semibold text-slate-900">Pembayaran Tagihan Sekolah</td>
                <td className="py-1.5 px-2 text-center border border-slate-300 print:border-black font-mono text-slate-700">-</td>
                <td className="py-1.5 px-2 text-right border border-slate-300 print:border-black font-mono font-bold text-slate-900">{fmtRp(invoice.total)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-black print:bg-transparent">
              <td colSpan={3} className="py-2 px-2 text-right uppercase border border-slate-300 print:border-black text-slate-800">
                Total Penerimaan:
              </td>
              <td className="py-2 px-2 text-right border border-slate-300 print:border-black font-mono text-emerald-800 text-sm print:text-black">
                {fmtRp(invoice.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {invoice.catatan && (
        <div className="text-[11px] text-slate-600">
          <span className="font-bold text-slate-700">Catatan: </span>
          {invoice.catatan}
        </div>
      )}

      {/* Titimangsa & Tanda Tangan */}
      <div className="pt-2 grid grid-cols-2 gap-4 text-xs text-center">
        <div className="space-y-9">
          <p className="text-slate-600">Penyetor / Siswa / Wali Murid,</p>
          <div className="font-bold text-slate-950 border-b border-slate-400 inline-block px-4 pb-0.5">
            ( {invoice.namaSiswa.split(' ')[0]} / Wali )
          </div>
        </div>

        <div className="space-y-9">
          <p className="text-slate-600">
            Jakarta Barat, {invoice.tglBayar}
            <br />
            <span className="font-medium text-[11px]">Bendahara / Kasir Sekolah,</span>
          </p>
          <div className="font-bold text-slate-950 border-b border-slate-400 inline-block px-4 pb-0.5">
            ( {invoice.createdBy || 'Petugas Kasir'} )
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Dynamic Print CSS for A4 & F4 page geometry */}
      <style>{`
        @page {
          size: ${paperSize === 'F4' ? '215mm 330mm' : 'A4'} portrait;
          margin: 8mm;
        }
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="print-area bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none animate-in fade-in zoom-in-95">
        
        {/* Modal Controls Bar - Hidden when Printing */}
        <div className="no-print bg-slate-900 text-white px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck size={19} className="text-emerald-400" />
            <div>
              <span className="text-xs font-black uppercase tracking-wider block">Kwitansi Sah (Invoice)</span>
              <span className="text-[10px] text-slate-400 font-mono">Format Siap Cetak Langsung</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Paper Size Switcher */}
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
              <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Kertas:</span>
              <button
                type="button"
                onClick={() => setPaperSize('A4')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${paperSize === 'A4' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
              >
                A4 (210×297)
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('F4')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${paperSize === 'F4' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
              >
                F4 / Folio (215×330)
              </button>
            </div>

            {/* Layout Switcher */}
            <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintLayout('half')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${printLayout === 'half' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
                title="1 Lembar berisi 2 rangkap: 1 untuk sekolah dan 1 untuk siswa"
              >
                2 Rangkap (1/2 Hal)
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('full')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition ${printLayout === 'full' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
                title="1 Rangkap penuh satu lembar"
              >
                1 Lembar Penuh
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Printer size={15} />
              <span>Cetak Sekarang</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="printable-area" className="p-6 sm:p-8 space-y-6 print:p-0 print:m-0 print:space-y-4">
          {printLayout === 'half' ? (
            <div className="space-y-6 print:space-y-4">
              {/* Rangkap 1: Arsip Sekolah */}
              <SingleKwitansi rangkapLabel="LEMBAR 1: UNTUK ARSIP SEKOLAH / BENDAHARA" />

              {/* Garis Potong Perforated */}
              <div className="flex items-center justify-center gap-2 text-slate-400 font-mono text-[10px] print:text-black py-1">
                <Scissors size={14} className="rotate-180" />
                <span className="tracking-widest">------------------ POTONG DI SINI ------------------</span>
                <Scissors size={14} />
              </div>

              {/* Rangkap 2: Siswa / Wali Murid */}
              <SingleKwitansi rangkapLabel="LEMBAR 2: UNTUK PESERTA DIDIK / WALI MURID" />
            </div>
          ) : (
            <div>
              <SingleKwitansi rangkapLabel="BUKTI PEMBAYARAN SAH KASIR" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
