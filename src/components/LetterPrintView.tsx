import React, { useState, useEffect } from 'react';
import { X, Download, MessageCircle, Send, Copy, Eye, Check, ZoomIn, ZoomOut, Sparkles, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { StudentProfile, WorkInfo, StudySchedule } from '../types';

interface LetterPrintViewProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  work: WorkInfo;
  schedule: StudySchedule;
  initialShowWhatsApp?: boolean;
}

export const LetterPrintView: React.FC<LetterPrintViewProps> = ({
  isOpen,
  onClose,
  profile,
  work,
  schedule,
  initialShowWhatsApp = false,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(initialShowWhatsApp);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    if (initialShowWhatsApp) {
      setIsWhatsAppModalOpen(true);
    }
  }, [initialShowWhatsApp, isOpen]);

  if (!isOpen) return null;

  // Target WhatsApp number for Rombel: 0851-4180-9991 (6285141809991)
  const ROMBEL_WA_NUMBER = '6285141809991';

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const currentKelas =
    profile.KelasSaatini ||
    profile.kelasSaatIni ||
    profile.kelasRombel ||
    profile.kelas ||
    profile.tingkat ||
    'Paket C - Kelas X (Rombel Tambora)';

  // Nama file format: nopdkt_kelas_namasiswa
  const cleanNopdkt = (profile.nopdkt || profile.idNumber || '001').trim();
  const cleanKelas = currentKelas.trim().replace(/[\/\\?%*:|"<>]/g, '-');
  const cleanNama = (profile.namaLengkap || 'Siswa').trim().replace(/[\/\\?%*:|"<>]/g, '-');
  const pdfFileName = `${cleanNopdkt}_${cleanKelas}_${cleanNama}.pdf`;

  // Nomor Induk: Nodkt / NISN / NIK
  const nomorInduk = `${profile.nopdkt || profile.idNumber || '-'} / ${profile.nisn || profile.NISN || '-'} / ${profile.nik || profile.NIK || '-'}`;

  // Status Pekerjaan
  const statusPekerjaanText =
    work.statusBekerja === 'Aktif'
      ? `Aktif (Tempat Kerja: ${work.namaTempatKerja || '-'} - ${work.jenisPekerjaan || '-'})`
      : 'Tidak Bekerja (Fokus Belajar Penuh)';

  // Alamat Domisili Siswa
  const alamatText = `${profile.alamat || '-'}, RT ${profile.rt || '005'} / RW ${profile.rw || '002'}, Kel. ${profile.kelurahan || profile.Kelurahan || 'Tambora'}, ${profile.kecamatan || profile.Kecamatan || 'Tambora'}`;

  // Nama Orang Tua / Wali
  const namaOrtuWali =
    profile.namaOrangTua ||
    (profile.namaAyah ? `${profile.namaAyah} / ${profile.namaIbu || '-'}` : (profile.namaWali || '-'));

  // Generate Hari & Jam 1 s.d. 3
  const h1 = schedule.hariBelajar[0] || 'Hari 1';
  const j1 = (schedule.jadwalPerHari && schedule.jadwalPerHari[h1]) || schedule.jamBelajar;
  const h2 = schedule.hariBelajar[1] || 'Hari 2';
  const j2 = (schedule.jadwalPerHari && schedule.jadwalPerHari[h2]) || schedule.jamBelajar;
  const h3 = schedule.hariBelajar[2] || 'Hari 3';
  const j3 = (schedule.jadwalPerHari && schedule.jadwalPerHari[h3]) || schedule.jamBelajar;

  // Direct Download PDF (F4 / Folio 215 x 330 mm) without opening print dialog
  const handleDirectDownloadPdf = async () => {
    const element = document.getElementById('printable-letter-content');
    if (!element) return;

    try {
      setIsDownloadingPdf(true);
      setCopyToast('⏳ Menyiapkan dan mengunduh berkas PDF F4...');

      const canvas = await html2canvas(element, {
        scale: 2, // High resolution crisp rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // F4 / Folio: 215 mm x 330 mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [215, 330],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 215, 330);
      pdf.save(pdfFileName);

      setCopyToast(`✓ Berhasil download: ${pdfFileName}`);
      setTimeout(() => setCopyToast(null), 4000);
    } catch (err: any) {
      console.error('Download PDF error:', err);
      setCopyToast('Gagal mengunduh PDF. Silakan coba lagi.');
      setTimeout(() => setCopyToast(null), 3000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Generate Professional WhatsApp Message Text directly to Rombel 0851-4180-9991
  const generateWhatsAppMessage = () => {
    const lines = [
      `*SURAT PERNYATAAN KESANGGUPAN SISWA*`,
      `*ROMBONGAN BELAJAR KARANG TARUNA KECAMATAN TAMBORA*`,
      `--------------------------------------------------`,
      `Kepada Yth. Admin Rombel Karang Taruna Kecamatan Tambora,`,
      `Berikut saya sampaikan konfirmasi draf Surat Pernyataan Kesanggupan Belajar:`,
      ``,
      `📁 *NAMA FILE SURAT:*`,
      `*${pdfFileName}*`,
      ``,
      `📋 *IDENTITAS SISWA:*`,
      `• *Nama Lengkap Siswa:* ${profile.namaLengkap}`,
      `• *Nomor Induk (PDKT/NISN/NIK):* ${nomorInduk}`,
      `• *Tempat, Tanggal Lahir:* ${profile.tempatLahir}, ${profile.tanggalLahir}`,
      `• *Jenis Kelamin / Status:* ${profile.jenisKelamin || profile.JenisKelamin || 'Laki-laki'} | Status: ${profile.statusYatim || 'Bukan Yatim/Piatu'}`,
      `• *Kelas:* ${currentKelas}`,
      `• *Nomor WhatsApp:* ${profile.noHpWa || profile.NomorHP || '-'}`,
      `• *Nama Orang Tua / Wali:* ${namaOrtuWali}`,
      `• *Status Pekerjaan:* ${statusPekerjaanText}`,
      `• *Alamat Domisili Siswa:* ${alamatText}`,
      ``,
      `🗓️ *KESEPAKATAN JADWAL BELAJAR 3x SEMINGGU:*`,
      `1. *${h1}* : ${j1}`,
      `2. *${h2}* : ${j2}`,
      `3. *${h3}* : ${j3}`,
      ``,
      `⚖️ *PERNYATAAN KOMITMEN:*`,
      `Saya sanggup hadir belajar minimal 3x seminggu, mematuhi seluruh tata tertib, etika kesopanan, dan bersedia menerima sanksi tegas jika melanggar ketentuan Karang Taruna Tambora.`,
      `--------------------------------------------------`,
      `_Pendidikan Kesetaraan Rombel Karang Taruna Kecamatan Tambora_`
    ];
    return lines.join('\n');
  };

  const handleDirectSendWhatsApp = () => {
    const message = generateWhatsAppMessage();
    const encoded = encodeURIComponent(message);
    const waUrl = `https://api.whatsapp.com/send?phone=${ROMBEL_WA_NUMBER}&text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyWhatsAppText = () => {
    const message = generateWhatsAppMessage();
    navigator.clipboard.writeText(message);
    setCopyToast('✓ Teks draf surat WhatsApp berhasil disalin!');
    setTimeout(() => setCopyToast(null), 3500);
  };

  return (
    <div
      id="letter-print-modal"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static"
    >
      {/* Modal Wrapper - Fixed scrolling to the bottom by removing my-auto and adding pb-36 */}
      <div className="w-full max-w-4xl mx-auto p-2 sm:p-4 py-4 sm:py-8 pb-36 flex flex-col items-center">
        <div className="bg-white w-full rounded-2xl shadow-2xl overflow-visible print:shadow-none print:border-none print:max-w-full print:rounded-none">
          
          {/* MODAL TOOLBAR - SCREEN ONLY */}
          <div id="letter-print-toolbar" className="bg-slate-900 text-white p-4 sm:p-5 rounded-t-2xl border-b border-slate-800 print:hidden space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    <Eye className="w-3.5 h-3.5" />
                    <span>LIHAT DULU SEBELUM DOWNLOAD</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-indigo-950 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    <span>Ukuran Kertas: F4 / Folio (215 × 330 mm)</span>
                  </span>
                </div>
                <h3 className="text-base font-black text-white font-['Outfit',sans-serif] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Pratinjau Draf Surat Pernyataan Kesanggupan Siswa</span>
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* WhatsApp Button - Direct to Lihat Teks Pesan WA */}
                <button
                  type="button"
                  id="btn-open-wa-sender"
                  onClick={() => setIsWhatsAppModalOpen((prev) => !prev)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md border ${
                    isWhatsAppModalOpen
                      ? 'bg-emerald-500 text-white border-emerald-300 ring-2 ring-emerald-400/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white border-emerald-400/40 shadow-emerald-600/30'
                  }`}
                  title="Lihat Teks Pesan WA untuk Pengiriman ke WhatsApp Rombel 0851-4180-9991"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim ke WhatsApp</span>
                </button>

                {/* Direct Download PDF Button (No Print Dialog) */}
                <button
                  type="button"
                  id="btn-do-download-f4"
                  onClick={handleDirectDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/30 border border-blue-400/40"
                  title="Langsung Unduh PDF Ukuran F4"
                >
                  {isDownloadingPdf ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-yellow-300" />
                      <span>Download PDF (F4)</span>
                    </>
                  )}
                </button>

                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.max(0.75, prev - 0.1))}
                    className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                    title="Perkecil Tampilan"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono px-2 text-slate-300 font-bold">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomScale((prev) => Math.min(1.25, prev + 0.1))}
                    className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                    title="Perbesar Tampilan"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer border border-slate-700"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Guidelines info bar */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-300 gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>
                  <strong>Info:</strong> Berkas PDF akan diunduh langsung dengan nama: <strong className="text-yellow-300 font-mono">{pdfFileName}</strong>. Kirim ke WhatsApp langsung ditujukan ke nomor Rombel: <strong className="text-emerald-400">0851-4180-9991</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(!isWhatsAppModalOpen)}
                className="text-[11px] text-emerald-400 hover:underline font-bold shrink-0"
              >
                {isWhatsAppModalOpen ? 'Tutup Pratinjau Teks WA' : 'Lihat Teks Pesan WA'}
              </button>
            </div>
          </div>

          {/* TOAST NOTIFICATION */}
          {copyToast && (
            <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 text-center flex items-center justify-center gap-2 print:hidden">
              <Check className="w-4 h-4" />
              <span>{copyToast}</span>
            </div>
          )}

          {/* POPUP SENDER WHATSAPP INFO (LIHAT TEKS PESAN WA) */}
          {isWhatsAppModalOpen && (
            <div id="whatsapp-text-preview-box" className="p-4 sm:p-6 bg-slate-950 text-white border-b-2 border-emerald-500 print:hidden space-y-3 animate-fadeIn shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                      <span>Lihat Teks Pesan WA (Format Resmi Rombel)</span>
                      <span className="bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">Siap Dikirim</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Tujuan: <strong className="text-emerald-400 font-mono">0851-4180-9991</strong> • Nama Berkas: <strong className="text-yellow-300 font-mono">{pdfFileName}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDirectSendWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-2 px-4 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
                    title="Buka Aplikasi / Web WhatsApp Sekarang"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Buka WhatsApp Sekarang</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppText}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700 active:scale-95"
                    title="Salin Seluruh Teks Pesan"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Teks</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWhatsAppModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer border border-slate-800"
                    title="Tutup Teks Pesan WA"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Box of WhatsApp Text */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 max-h-56 overflow-y-auto text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                {generateWhatsAppMessage()}
              </div>
            </div>
          )}

          {/* PRINTABLE DOCUMENT CANVAS - EXACT F4 / FOLIO RATIO (215 × 330 mm) - TANPA KOP SURAT */}
          <div 
            className="p-4 sm:p-8 bg-slate-100/80 flex justify-center overflow-x-auto print:p-0 print:bg-white"
            style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
          >
            <div 
              id="printable-letter-content"
              className="print-f4-page bg-white w-full max-w-[215mm] min-h-[330mm] p-8 sm:p-12 text-slate-950 text-xs sm:text-sm leading-relaxed shadow-xl border border-slate-300 print:shadow-none print:border-none print:w-[215mm] print:min-h-[330mm] print:p-8 flex flex-col justify-between"
            >
              <div>
                {/* LETTER TITLE (TANPA KOP SURAT) */}
                <div className="text-center mb-6">
                  <h2 className="font-extrabold text-base sm:text-lg text-slate-950 uppercase tracking-wide">
                    SURAT PERNYATAAN KESANGGUPAN SISWA
                  </h2>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wide">
                    ROMBONGAN BELAJAR KARANG TARUNA KECAMATAN TAMBORA
                  </h3>
                  <div className="w-32 h-0.5 bg-slate-900 mx-auto mt-2"></div>
                </div>

                {/* PREAMBLE SESUAI INSTRUKSI */}
                <p className="text-xs sm:text-[13px] text-slate-900 font-medium mb-3 text-justify">
                  Saya yang bertanda tangan di bawah ini, siswa Rombongan Belajar Karang Taruna Kecamatan Tambora:
                </p>

                {/* STUDENT IDENTITY TABLE SESUAI PERMINTAAN */}
                <div className="mb-5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-300">
                  <table className="w-full text-xs sm:text-[13px] text-left">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700 w-44 sm:w-56">Nama Lengkap Siswa</td>
                        <td className="py-1.5 font-extrabold text-slate-950">: {profile.namaLengkap}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Nomor Induk</td>
                        <td className="py-1.5 font-mono font-bold text-slate-950">
                          : {nomorInduk}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Tempat, Tanggal Lahir</td>
                        <td className="py-1.5 text-slate-900">: {profile.tempatLahir}, {profile.tanggalLahir}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Jenis Kelamin / Status</td>
                        <td className="py-1.5 text-slate-900">: {profile.jenisKelamin || profile.JenisKelamin || 'Laki-laki'} | Status: {profile.statusYatim || 'Bukan Yatim/Piatu'}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Kelas</td>
                        <td className="py-1.5 font-bold text-slate-950">: {currentKelas}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Nomor WhatsApp</td>
                        <td className="py-1.5 font-mono text-slate-900">: {profile.noHpWa || profile.NomorHP || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Nama Orang Tua / Wali</td>
                        <td className="py-1.5 text-slate-900">: {namaOrtuWali}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-semibold text-slate-700">Status Pekerjaan</td>
                        <td className="py-1.5 text-slate-900">: {statusPekerjaanText}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-semibold text-slate-700 align-top">Alamat Domisili Siswa</td>
                        <td className="py-1.5 text-slate-900 align-top">: {alamatText}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* STATEMENT CLAUSES & COMMITMENT TABLE */}
                <div className="space-y-2.5 text-xs sm:text-[13px] text-justify leading-relaxed">
                  <p className="font-bold text-slate-950">
                    Menyatakan dengan sesungguhnya dan penuh tanggung jawab bahwa:
                  </p>

                  <div className="space-y-2.5">
                    {/* Point 1: 3x attendance */}
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-950">1.</span>
                      <div className="flex-1">
                        <strong className="text-slate-950">Komitmen Kehadiran Belajar Wajib 3 (Tiga) Kali Seminggu:</strong>
                        <p className="text-slate-800 mt-0.5">
                          Saya bersedia, sanggup, dan berkomitmen hadir secara disiplin mengikuti seluruh proses pembelajaran tatap muka minimal 3x dalam seminggu dengan rincian jadwal yang telah disepakati sebagai berikut:
                        </p>
                        
                        {/* Sub-Table of 3 Days */}
                        <div className="mt-2 grid grid-cols-3 gap-2 bg-indigo-50/80 p-2.5 rounded-lg border border-indigo-200 text-center text-[11px]">
                          <div className="border-r border-indigo-200 pr-1">
                            <span className="text-[9px] text-indigo-700 font-bold uppercase block">Sesi Hari Ke-1</span>
                            <strong className="text-slate-900 block text-xs">{h1}</strong>
                            <span className="text-indigo-950 font-mono text-[10px] font-semibold">{j1}</span>
                          </div>
                          <div className="border-r border-indigo-200 pr-1">
                            <span className="text-[9px] text-indigo-700 font-bold uppercase block">Sesi Hari Ke-2</span>
                            <strong className="text-slate-900 block text-xs">{h2}</strong>
                            <span className="text-indigo-950 font-mono text-[10px] font-semibold">{j2}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-indigo-700 font-bold uppercase block">Sesi Hari Ke-3</span>
                            <strong className="text-slate-900 block text-xs">{h3}</strong>
                            <span className="text-indigo-950 font-mono text-[10px] font-semibold">{j3}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Point 2: Code of conduct */}
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-950">2.</span>
                      <p className="flex-1 text-slate-800">
                        <strong className="text-slate-950">Kepatuhan Tata Tertib & Norma Kesopanan:</strong> Saya berjanji mematuhi seluruh tata tertib yang berlaku, menjaga ketertiban umum, menjunjung tinggi etika kesopanan, menghormati tutor pengajar, serta menaati seluruh petunjuk dan arahan Pengurus Karang Taruna Kecamatan Tambora.
                      </p>
                    </div>

                    {/* Point 3: Sanctions */}
                    <div className="flex items-start gap-2 bg-rose-50/70 p-2.5 rounded-lg border border-rose-200">
                      <span className="font-bold text-rose-950">3.</span>
                      <p className="flex-1 text-rose-950 text-[11px] sm:text-xs">
                        <strong className="text-rose-900">Konsekuensi Sanksi Tegas Pelanggaran:</strong> Apabila saya terbukti melanggar tata tertib, membolos, atau tidak hadir tanpa keterangan yang sah melebihi batas toleransi (3 kali berturut-turut), maka saya <strong>bersedia menerima sanksi tegas berupa pencabutan fasilitas belajar, pencabutan status bantuan/subsidi rombel Karang Taruna, serta sanksi administratif dan pengembalian kepada orang tua/wali</strong>.
                      </p>
                    </div>
                  </div>

                  <p className="text-slate-700 pt-1 text-justify text-[11px] sm:text-xs">
                    Demikian Surat Pernyataan Kesanggupan ini saya buat dengan sebenarnya dalam keadaan sadar, sehat jasmani dan rohani, serta tanpa adanya paksaan dari pihak manapun, untuk dijadikan pedoman resmi komitmen Siswa.
                  </p>
                </div>
              </div>

              {/* BOTTOM SIGNATURE BLOCK (F4 COMPLIANT WITH MATERAI 10K) */}
              <div className="pt-6 border-t border-slate-300">
                <div className="flex justify-between items-end text-xs sm:text-sm">
                  
                  {/* PENGURUS KARANG TARUNA */}
                  <div className="text-center w-52">
                    <p className="text-slate-600 text-[11px] mb-0.5">Mengetahui,</p>
                    <p className="font-bold text-slate-950 leading-tight">Pengurus Karang Taruna</p>
                    <p className="text-[11px] text-slate-700 leading-tight">Kecamatan Tambora</p>
                    
                    {/* Space for stamp */}
                    <div className="h-20 flex items-center justify-center text-slate-400 italic text-[10px]">
                      (Cap Stempel & Tanda Tangan)
                    </div>
                    
                    <p className="font-bold text-slate-950 border-t border-slate-900 pt-1">
                      Ketua Rombel Karang Taruna
                    </p>
                    <p className="text-[10px] text-slate-600">Kecamatan Tambora</p>
                  </div>

                  {/* SISWA PEMBUAT PERNYATAAN (MATERAI 10.000) */}
                  <div className="text-center w-60">
                    <p className="text-slate-700 text-[11px] mb-0.5">
                      Jakarta, {todayFormatted}
                    </p>
                    <p className="font-bold text-slate-950">Yang Membuat Pernyataan,</p>
                    
                    {/* Materai 10.000 Box Graphic */}
                    <div className="w-36 h-20 mx-auto my-2 border-2 border-dashed border-yellow-600/80 rounded-lg flex flex-col items-center justify-center bg-yellow-50 text-[10px] text-yellow-900 font-bold shadow-xs">
                      <span className="tracking-widest text-[9px]">MATERAI TEMPEL</span>
                      <span className="text-xs font-black text-slate-950">Rp 10.000</span>
                      <span className="text-[8px] text-slate-600 font-normal leading-tight text-center px-1">
                        (Tanda tangan mengenai sebagian materai & kertas)
                      </span>
                    </div>

                    <p className="font-black text-slate-950 border-t border-slate-900 pt-1 truncate">
                      ({profile.namaLengkap})
                    </p>
                    <p className="text-[10px] text-slate-600 font-mono">
                      No. PDKT: {profile.nopdkt || profile.idNumber || '-'}
                    </p>
                  </div>

                </div>

                {/* F4 Paper Identification Footer */}
                <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                   <span>Berkas: {pdfFileName}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

