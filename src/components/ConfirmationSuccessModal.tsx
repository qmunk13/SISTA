import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Download, MessageCircle, ArrowRight, ExternalLink, FileSpreadsheet, FolderCheck, Check, Sparkles } from 'lucide-react';
import { StudentProfile, WorkInfo, StudySchedule, StatementDoc, FullSubmission } from '../types';

interface ConfirmationSuccessModalProps {
  isOpen: boolean;
  profile: StudentProfile;
  work: WorkInfo;
  schedule: StudySchedule;
  statement: StatementDoc;
  submission: FullSubmission;
  onResetToBeginning: () => void;
  onDownloadPdf: () => void;
}

export const ConfirmationSuccessModal: React.FC<ConfirmationSuccessModalProps> = ({
  isOpen,
  profile,
  work,
  schedule,
  statement,
  submission,
  onResetToBeginning,
  onDownloadPdf,
}) => {
  const [hasSentWa, setHasSentWa] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  if (!isOpen) return null;

  const currentKelas =
    profile.KelasSaatini ||
    'Rombel Tambora';

  const cleanNopdkt = (profile.nopdkt || profile.idNumber || '001').trim();
  const cleanKelas = currentKelas.trim().replace(/[\/\\?%*:|"<>]/g, '-');
  const cleanNama = (profile.namaLengkap || 'Siswa').trim().replace(/[\/\\?%*:|"<>]/g, '-');
  const pdfFileName = `${cleanNopdkt}_${cleanKelas}_${cleanNama}.pdf`;
  const photoFileName = `${cleanNopdkt} ${profile.namaLengkap}.jpg`;

  const drivePhotoUrl = 'https://drive.google.com/drive/folders/1nxSpZEe3ar1_icNZGsWzLLbz3U_oBFQO?dmr=1&ec=wgc-drive-[module]-goto';
  const drivePdfUrl = 'https://drive.google.com/drive/folders/1MY3oIwIIj05zlZCL4BF-3TVsbx4tG3TQ?dmr=1&ec=wgc-drive-[module]-goto';
  const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1iqO_qA0J9tWhU1dLbSrUWyu3nK53pEJGfyKgseBOE7E/edit';

  const waTargetNumber = '0851-4180-9991';
  const waTargetInt = '6285141809991';

  // Format ID Number: No. PDKT / NISN / NIK
  const idNumberFormatted = `No. PDKT: ${cleanNopdkt} / NISN: ${profile.nisn || profile.NISN || '-'} / NIK: ${profile.nik || profile.NIK || '-'}`;

  const handleSendWhatsApp = () => {
    // Notify backend
    fetch(`/api/submissions/${submission.id}/mark-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'kirim_wa' }),
    }).catch((e) => console.log('WA action log:', e));

    setHasSentWa(true);

    const waMessage = `*KONFIRMASI DATA SISWA & SURAT PERNYATAAN KESANGGUPAN*
*ROMBONGAN BELAJAR KARANG TARUNA KECAMATAN TAMBORA*

Assalamualaikum Wr. Wb. / Salam Karang Taruna,
Telah berhasil diselesaikan konfirmasi data dan surat pernyataan kesanggupan siswa:

• *Nama Lengkap:* ${profile.namaLengkap}
• *ID Number:* ${idNumberFormatted}
• *Tempat, Tanggal Lahir:* ${profile.tempatLahir}, ${profile.tanggalLahir}
• *Nomor WhatsApp Siswa:* ${profile.noHpWa || profile.NomorHP || '-'}
• *Kelas Saat Ini:* ${currentKelas}
• *Status Bekerja:* ${work.statusBekerja}${work.statusBekerja === 'Aktif' ? ` (${work.namaTempatKerja} - ${work.jenisPekerjaan})` : ''}

*KESEPAKATAN JADWAL BELAJAR (WAJIB 3X SEMINGGU):*
• Hari 1: ${schedule.hariBelajar[0] || '-'} (${(schedule.jadwalPerHari && schedule.jadwalPerHari[schedule.hariBelajar[0]]) || schedule.jamBelajar})
• Hari 2: ${schedule.hariBelajar[1] || '-'} (${(schedule.jadwalPerHari && schedule.jadwalPerHari[schedule.hariBelajar[1]]) || schedule.jamBelajar})
• Hari 3: ${schedule.hariBelajar[2] || '-'} (${(schedule.jadwalPerHari && schedule.jadwalPerHari[schedule.hariBelajar[2]]) || schedule.jamBelajar})

*SURAT PERNYATAAN & DOKUMEN MATERAI:*
• *Status Materai:* Sah Rp10.000 (Terkonfirmasi)
• *Kode Verifikasi:* ${statement.verificationCode}
• *Nama Berkas PDF:* ${pdfFileName}
• *Tautan Google Drive PDF:* ${drivePdfUrl}
• *Tautan Google Drive Foto:* ${drivePhotoUrl}
• *Google Spreadsheet Resmi (1iqO_qA0J9tWhU1dLbSrUWyu3nK53pEJGfyKgseBOE7E):*
${spreadsheetUrl}

Data telah otomatis tersimpan di Sheet SISWA, KONFIRMASI, JADWAL, REKAP_HARI, REKAP_SUDAH, dan REKAP_STATUS_AKSI.
Mohon berkas terlampir dapat diverifikasi. Terima kasih!`;

    const waUrl = `https://api.whatsapp.com/send?phone=${waTargetInt}&text=${encodeURIComponent(waMessage)}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadPdf = () => {
    // Notify backend
    fetch(`/api/submissions/${submission.id}/mark-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'download_pdf' }),
    }).catch((e) => console.log('PDF action log:', e));

    setHasDownloaded(true);
    onDownloadPdf();
  };

  return (
    <div
      id="popup-konfirmasi-selesai-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div
        id="popup-konfirmasi-selesai-card"
        className="relative w-full max-w-2xl bg-gradient-to-br from-[#0B0F19] via-[#161B2E] to-[#0B0F19] text-white rounded-3xl border-2 border-emerald-500/80 shadow-2xl shadow-emerald-950/50 overflow-hidden my-auto"
      >
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header Banner */}
        <div className="relative p-5 sm:p-7 pb-4 border-b border-slate-800 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/30 mx-auto">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/90 px-3 py-0.5 rounded-full border border-emerald-500/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>100% SUDAH KONFIRMASI & TERSIMPAN</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-['Outfit',sans-serif]">
              Konfirmasi Data Siswa Berhasil!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
              Seluruh data biodata, jadwal belajar 3x seminggu, dan pernyataan bermaterai telah tervalidasi dan tersimpan secara otomatis.
            </p>
          </div>
        </div>

        {/* Detailed Identification Card requested by user */}
        <div className="relative p-5 sm:p-7 space-y-4 text-xs sm:text-sm">
          {/* Main Student Info Box */}
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-inner">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-yellow-400 tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rincian Konfirmasi Siswa</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40">
                SUDAH KONFIRMASI
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-slate-400 sm:w-28 font-semibold shrink-0">A.N (Nama Siswa):</span>
                <span className="text-white font-black text-sm sm:text-base">{profile.namaLengkap}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-slate-400 sm:w-28 font-semibold shrink-0">ID Number:</span>
                <span className="text-yellow-300 font-mono font-bold break-all">{idNumberFormatted}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-slate-400 sm:w-28 font-semibold shrink-0">TTL:</span>
                <span className="text-slate-200">{profile.tempatLahir}, {profile.tanggalLahir}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-slate-400 sm:w-28 font-semibold shrink-0">Nomor WA:</span>
                <span className="text-slate-200 font-mono font-bold">{profile.noHpWa || profile.NomorHP || '-'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="text-slate-400 sm:w-28 font-semibold shrink-0">Kelas:</span>
                <span className="text-cyan-300 font-bold">{currentKelas}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 pt-1 border-t border-slate-800">
                <span className="text-slate-400 sm:w-28 font-semibold shrink-0">Jadwal Belajar:</span>
                <span className="text-emerald-300 font-bold">
                  {schedule.hariBelajar.join(', ')} ({schedule.jamBelajar})
                </span>
              </div>
            </div>
          </div>

          {/* Automated Cloud Storage Status Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
            {/* Google Sheets Status */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-white block">Google Spreadsheet Terhubung</span>
                <span className="text-slate-400 block text-[10px]">
                  Tersimpan di Sheet <strong>SISWA</strong>, <strong>KONFIRMASI</strong>, <strong>JADWAL</strong>, <strong>REKAP_HARI</strong>, & <strong>REKAP_SUDAH</strong>
                </span>
              </div>
            </div>

            {/* Google Drive Status */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
              <FolderCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-white block">Google Drive Berkas</span>
                <span className="text-slate-400 block text-[10px]">
                  Foto ({photoFileName}) & Dokumen PDF ({pdfFileName})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Button 1: Kirim ke WhatsApp Pengurus */}
              <button
                type="button"
                id="btn-popup-kirim-wa"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold px-4 py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-600/30 border border-emerald-400/40"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>
                  {hasSentWa ? '✓ Buka Ulang WA Pengurus' : `Kirim PDF ke WA (${waTargetNumber})`}
                </span>
              </button>

              {/* Button 2: Unduh PDF F4 */}
              <button
                type="button"
                id="btn-popup-download-pdf"
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold px-4 py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-blue-600/30 border border-blue-400/40"
              >
                <Download className="w-4 h-4 text-yellow-300" />
                <span>
                  {hasDownloaded ? '✓ Unduh Ulang Surat (F4)' : 'Unduh Surat PDF (F4)'}
                </span>
              </button>
            </div>

            {/* Primary Action Button: Selesai & Kembali ke Tampilan Awal (Untuk Siswa Lain) */}
            <button
              type="button"
              id="btn-popup-kembali-ke-awal"
              onClick={onResetToBeginning}
              className="w-full inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 active:scale-95 text-slate-950 font-black px-6 py-4 rounded-2xl text-sm sm:text-base transition shadow-xl shadow-yellow-500/25 cursor-pointer border border-yellow-300 hover:shadow-yellow-500/40 mt-1"
            >
              <span>Selesai & Kembali ke Tampilan Awal (Input Data Siswa Lain)</span>
              <ArrowRight className="w-5 h-5 text-slate-950 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
