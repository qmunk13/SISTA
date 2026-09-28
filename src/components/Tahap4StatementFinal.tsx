import React, { useState } from 'react';
import { FileText, CheckCircle2, Copy, Download, ArrowLeft, ShieldCheck, AlertTriangle, FileSpreadsheet, Eye, Sparkles, Check, MessageCircle } from 'lucide-react';
import { StudentProfile, WorkInfo, StudySchedule, StatementDoc, FullSubmission } from '../types';

interface Tahap4StatementFinalProps {
  profile: StudentProfile;
  work: WorkInfo;
  schedule: StudySchedule;
  existingStatement: StatementDoc | null;
  onFinalSubmit: (statement: StatementDoc) => Promise<FullSubmission | null>;
  onBackToStep4: () => void;
  onPrintLetter: (openWhatsApp?: boolean) => void;
}

export const Tahap4StatementFinal: React.FC<Tahap4StatementFinalProps> = ({
  profile,
  work,
  schedule,
  existingStatement,
  onFinalSubmit,
  onBackToStep4,
  onPrintLetter,
}) => {
  const [agreementChecked, setAgreementChecked] = useState(
    existingStatement?.confirmedAgreement ?? false
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<FullSubmission | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const currentKelas =
    profile.KelasSaatini ||
    profile.kelasSaatIni ||
    profile.kelasRombel ||
    profile.kelas ||
    profile.tingkat ||
    'Paket C - Kelas X (Rombel Tambora)';

  // Format nama file: nopdkt_kelas_namasiswa
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

  const handleSubmitFinal = async () => {
    if (!agreementChecked) {
      setErrorMessage('Anda wajib menyetujui seluruh klausul pernyataan dan konsekuensi sanksi Karang Taruna.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const verificationCode = `KT-ROMBEL-${cleanNopdkt}-${Date.now().toString().slice(-4)}`;

    const statementData: StatementDoc = {
      hasMaterai: true,
      fileName: pdfFileName,
      fileType: 'application/pdf',
      fileSize: 245000,
      confirmedAgreement: true,
      verificationCode,
      uploadedAt: new Date().toISOString(),
    };

    try {
      const result = await onFinalSubmit(statementData);
      if (result) {
        setSubmissionResult(result);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan konfirmasi data akhir.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google Sheets TSV Row Generator (Ready to paste directly into Google Sheets)
  const generateGoogleSheetsRow = () => {
    const headers = [
      'Kode_Verifikasi',
      'No_PDKT',
      'NISN',
      'NIK',
      'Nama_Lengkap_Siswa',
      'Kelas',
      'Jenis_Kelamin',
      'Tempat_Tgl_Lahir',
      'No_WhatsApp',
      'Status_Yatim',
      'Nama_Orang_Tua_Wali',
      'Kelurahan',
      'Status_Bekerja',
      'Nama_Tempat_Kerja',
      'Jabatan_Pekerjaan',
      'Bidang_Usaha',
      'Alamat_Kerja',
      'KelasSaatini',
      'Hari_Belajar_3x',
      'Jam_Belajar',
      'Status_Surat_Materai_10k',
      'Nama_File_Surat',
      'Catatan_Siswa',
      'Status_Verifikasi_Admin',
    ];

    const values = [
      submissionResult?.statement?.verificationCode || `KT-${(profile.nopdkt || profile.idNumber || '000').slice(-4)}`,
      `'${profile.nopdkt || profile.idNumber || ''}`,
      `'${profile.nisn || profile.NISN || ''}`,
      `'${profile.nik || profile.NIK || ''}`,
      profile.namaLengkap,
      currentKelas,
      profile.jenisKelamin || profile.JenisKelamin || 'Laki-laki',
      `${profile.tempatLahir}, ${profile.tanggalLahir}`,
      `'${profile.noHpWa || profile.NomorHP || ''}`,
      profile.statusYatim || 'Lengkap',
      profile.namaOrangTua || profile.namaAyah || profile.namaIbu || profile.namaWali || '-',
      profile.kelurahan || profile.Kelurahan || '-',
      work.statusBekerja,
      work.namaTempatKerja || '-',
      work.jenisPekerjaan || '-',
      work.bidangUsaha || '-',
      work.alamatTempatKerja || '-',
      currentKelas,
      schedule.hariBelajar.join(', '),
      schedule.jamBelajar,
      'Lengkap Bermaterai Rp10.000',
      pdfFileName,
      schedule.catatanKomitmen || '-',
      'Menunggu Verifikasi Admin',
    ];

    return {
      headersText: headers.join('\t'),
      valuesText: values.join('\t'),
      fullTsv: `${headers.join('\t')}\n${values.join('\t')}`,
      csvText: values.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    };
  };

  const handleCopyGoogleSheets = (includeHeader = true) => {
    const { valuesText, fullTsv } = generateGoogleSheetsRow();
    const textToCopy = includeHeader ? fullTsv : valuesText;
    navigator.clipboard.writeText(textToCopy);
    setCopyToast(
      includeHeader
        ? '✓ Format Kolom + Data Google Sheets berhasil disalin ke clipboard!'
        : '✓ Baris data Google Sheets berhasil disalin!'
    );
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleDownloadCsv = () => {
    const { headersText, valuesText } = generateGoogleSheetsRow();
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      headersText.split('\t').map((h) => `"${h}"`).join(',') +
      '\n' +
      valuesText.split('\t').map((v) => `"${v}"`).join(',');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Rombel_KT_${profile.namaLengkap.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="tahap4-container" className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white rounded-3xl p-6 sm:p-9 shadow-2xl shadow-indigo-950/60 border border-indigo-500/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-950/90 to-indigo-900/90 border border-blue-400/40 text-blue-300 text-xs font-black px-3.5 py-1 rounded-full shadow-lg">
            <FileText className="w-3.5 h-3.5 text-yellow-400" />
            <span className="uppercase tracking-wider">Tahap 5 : Pernyataan & Kesanggupan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-['Outfit',sans-serif]">
            Surat Pernyataan Kesanggupan
          </h2>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-950/80 border border-rose-500/60 text-rose-200 p-4 rounded-2xl text-sm flex items-center gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Draft Surat Card Preview */}
      <div className="relative bg-slate-900/85 backdrop-blur-xl rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
              Dokumen Rombongan Belajar Karang Taruna Tambora
            </span>
            <h3 className="text-base sm:text-lg font-black text-white font-['Outfit',sans-serif]">
              Draf Surat Pernyataan Kesanggupan Siswa
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            {/* 1. LIHAT DULU SEBELUM DOWNLOAD BUTTON */}
            <button
              type="button"
              id="btn-preview-letter"
              onClick={() => onPrintLetter()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-95 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black transition shadow-lg shadow-yellow-500/20 cursor-pointer border border-yellow-300"
              title="Lihat Dulu Lembar Surat Sebelum Download (Pratinjau F4)"
            >
              <Eye className="w-4 h-4 text-slate-950" />
              <span>LIHAT DULU SEBELUM DOWNLOAD</span>
            </button>

            {/* 2. DIRECT DOWNLOAD PDF F4 */}
            <button
              type="button"
              id="btn-print-letter"
              onClick={() => onPrintLetter()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white px-4 py-2.5 rounded-xl text-xs font-black transition shadow-lg shadow-blue-600/30 cursor-pointer border border-blue-400/40"
              title="Langsung Download PDF Ukuran F4"
            >
              <Download className="w-4 h-4 text-yellow-300" />
              <span>Download PDF (F4)</span>
            </button>

            {/* 3. KIRIM KE WHATSAPP (LANGSUNG KE LIHAT TEKS PESAN WA) */}
            <button
              type="button"
              id="btn-wa-letter"
              onClick={() => onPrintLetter(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer border border-emerald-400/40"
              title="Kirim ke WhatsApp Rombel 0851-4180-9991 (Lihat Teks Pesan WA)"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim ke WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Paper Layout of Letter (Tanpa Kop Surat Sesuai Permintaan User) */}
        <div className="p-6 sm:p-8 bg-slate-950/50 space-y-6 text-slate-200 text-sm leading-relaxed border-b border-slate-800">
          <div className="text-center pb-4 border-b border-slate-800">
            <h4 className="font-black text-base sm:text-lg text-white uppercase tracking-wide font-['Outfit',sans-serif]">
              SURAT PERNYATAAN KESANGGUPAN Siswa
            </h4>
            <p className="text-xs text-yellow-400 font-black uppercase tracking-wider mt-1">
              ROMBONGAN BELAJAR KARANG TARUNA KECAMATAN TAMBORA
            </p>
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-slate-300 mb-3">
              Saya yang bertanda tangan di bawah ini, siswa Rombongan Belajar Karang Taruna Kecamatan Tambora:
            </p>
            <div className="bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-800 text-xs sm:text-[13px] space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-semibold">Nama Lengkap Siswa:</span>
                <span className="sm:col-span-2 text-white font-black">{profile.namaLengkap}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-semibold">Nomor Induk:</span>
                <span className="sm:col-span-2 text-yellow-300 font-mono font-bold">{nomorInduk}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-semibold">Tempat, Tanggal Lahir:</span>
                <span className="sm:col-span-2 text-slate-200">{profile.tempatLahir}, {profile.tanggalLahir}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-semibold">Jenis Kelamin / Status:</span>
                <span className="sm:col-span-2 text-slate-200">{profile.jenisKelamin || profile.JenisKelamin || 'Laki-laki'} | Status: {profile.statusYatim || 'Bukan Yatim/Piatu'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-semibold">Kelas:</span>
                <span className="sm:col-span-2 text-blue-300 font-bold">{currentKelas}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-semibold">Nomor WhatsApp:</span>
                <span className="sm:col-span-2 text-slate-200 font-mono">{profile.noHpWa || profile.NomorHP || '-'}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-semibold">Nama Orang Tua / Wali:</span>
                <span className="sm:col-span-2 text-slate-200">{namaOrtuWali}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 border-b border-slate-800/80 pb-2">
                <span className="text-slate-400 font-semibold">Status Pekerjaan:</span>
                <span className="sm:col-span-2 text-slate-200">{statusPekerjaanText}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                <span className="text-slate-400 font-semibold">Alamat Domisili Siswa:</span>
                <span className="sm:col-span-2 text-slate-200">{alamatText}</span>
              </div>
            </div>
          </div>

          {/* Isi Kesanggupan & Konsekuensi Tegas */}
          <div className="space-y-3">
            <p className="font-bold text-white">
              Dengan ini menyatakan dengan sesungguhnya bahwa:
            </p>
            <ol className="list-decimal list-outside pl-5 space-y-3 text-xs sm:text-sm text-slate-300">
              <li>
                <strong className="text-white">Kesanggupan Kehadiran Wajib 3x Seminggu:</strong> Saya sanggup dan berkomitmen hadir mengikuti kegiatan belajar secara aktif minimal <strong>3 (tiga) kali dalam seminggu</strong> pada hari dan sesi jam yang telah disepakati:
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-indigo-500/30 text-center">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase block">Hari 1</span>
                    <strong className="text-white block">{schedule.hariBelajar[0] || '-'}</strong>
                    <span className="text-slate-400 text-[11px] font-mono">{(schedule.jadwalPerHari && schedule.jadwalPerHari[schedule.hariBelajar[0]]) || schedule.jamBelajar}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-indigo-500/30 text-center">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase block">Hari 2</span>
                    <strong className="text-white block">{schedule.hariBelajar[1] || '-'}</strong>
                    <span className="text-slate-400 text-[11px] font-mono">{(schedule.jadwalPerHari && schedule.jadwalPerHari[schedule.hariBelajar[1]]) || schedule.jamBelajar}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-indigo-500/30 text-center">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase block">Hari 3</span>
                    <strong className="text-white block">{schedule.hariBelajar[2] || '-'}</strong>
                    <span className="text-slate-400 text-[11px] font-mono">{(schedule.jadwalPerHari && schedule.jadwalPerHari[schedule.hariBelajar[2]]) || schedule.jamBelajar}</span>
                  </div>
                </div>
              </li>
              <li>
                <strong className="text-white">Kepatuhan Tata Tertib:</strong> Saya berjanji mematuhi seluruh tata tertib, etika sopan santun, arahan pengurus Karang Taruna, dan petunjuk para tutor pengajar selama program berlangsung.
              </li>
              <li className="text-rose-200 bg-rose-950/60 p-4 rounded-2xl border border-rose-500/40">
                <strong className="text-rose-300">Konsekuensi Tegas Pelanggaran:</strong> Apabila saya terbukti melanggar tata tertib, membolos atau tidak hadir tanpa surat keterangan yang sah lebih dari batas toleransi (3 kali), maka saya <strong>bersedia menerima sanksi tegas berupa pencabutan hak fasilitas belajar, pencabutan subsidi/beasiswa rombel, serta sanksi administratif dari pengurus Karang Taruna</strong>.
              </li>
            </ol>
          </div>

          {/* Area Materai & Tanda Tangan */}
          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 border-t border-slate-800">
            <div className="text-xs text-slate-400 space-y-1">
              <span className="font-bold text-slate-200 block">Ketentuan Materai:</span>
              <p>• Menggunakan Materai Tempel Rp10.000 atau e-Meterai resmi.</p>
              <p>• Tanda tangan mengenai sebagian kertas dan sebagian materai.</p>
            </div>

            {/* Materai Box Graphic */}
            <div className="text-center w-52 p-4 bg-slate-900 border-2 border-dashed border-yellow-400/50 rounded-2xl shadow-lg">
              <div className="text-[11px] font-bold text-slate-400 mb-1.5">Materai Rp10.000</div>
              <div className="w-24 h-14 mx-auto bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center text-slate-950 text-xs font-black shadow-md">
                MATERAI<br />10.000
              </div>
              <div className="text-[11px] font-bold text-white mt-2 border-t border-slate-800 pt-1.5 truncate">
                ({profile.namaLengkap})
              </div>
            </div>
          </div>
        </div>

        {/* Section Persetujuan Akhir & Submit (Bagian Unggah File Dihapus) */}
        <div className="p-6 sm:p-8 bg-slate-900/90 space-y-6">
          {/* Checkbox Persetujuan Akhir */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5">
            <label className="flex items-start gap-3.5 cursor-pointer">
              <input
                id="checkbox-final-statement-agreement"
                type="checkbox"
                checked={agreementChecked}
                onChange={(e) => {
                  setAgreementChecked(e.target.checked);
                  if (e.target.checked) setErrorMessage(null);
                }}
                className="w-5 h-5 rounded-lg border-slate-700 bg-slate-900 text-yellow-500 focus:ring-yellow-400 mt-0.5 cursor-pointer"
              />
              <div className="text-xs sm:text-sm text-slate-200">
                <strong className="font-bold text-white block">
                  Konfirmasi Akhir & Kesanggupan Penuh (Wajib):
                </strong>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Saya menyatakan bahwa dokumen draf surat pernyataan di atas telah saya baca dan pahami secara seksama, dan saya bersedia mematuhi jadwal belajar 3x seminggu serta sanksi pengurus Karang Taruna tanpa pengecualian.
                </p>
              </div>
            </label>
          </div>

          {/* Final Submit Button */}
          {!submissionResult && (
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <button
                type="button"
                id="btn-back-step-4"
                onClick={onBackToStep4}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-sm transition cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke 4. Kesepakatan Jadwal</span>
              </button>

              <button
                type="button"
                id="btn-submit-final-confirmation"
                onClick={handleSubmitFinal}
                disabled={isSubmitting || !agreementChecked}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black px-8 py-4 rounded-2xl text-sm transition shadow-xl shadow-emerald-600/30 cursor-pointer border border-emerald-400/40"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Menyimpan Konfirmasi...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Kirim & Selesaikan Konfirmasi Data (100%)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* REKAPITULASI DATA AKHIR (GOOGLE SHEETS READY) */}
      {submissionResult && (
        <div id="rekapitulasi-akhir-card" className="relative bg-slate-900/90 backdrop-blur-xl rounded-3xl border-2 border-emerald-500 shadow-2xl p-6 sm:p-9 space-y-6 animate-fadeIn">
          {/* Success Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40">
                  Status: 100% Terverifikasi & Selesai
                </span>
                <h3 className="text-xl font-black text-white font-['Outfit',sans-serif] mt-1.5">
                  Rekapitulasi Data Akhir Siswa
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID Konfirmasi: {submissionResult.id} • Kode: {submissionResult.statement.verificationCode}
                </p>
              </div>
            </div>

            {/* Quick Copy Toast Notification */}
            {copyToast && (
              <div className="bg-emerald-950 text-emerald-200 border border-emerald-500/50 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{copyToast}</span>
              </div>
            )}
          </div>

          {/* Google Sheets Export Toolbar */}
          <div className="bg-slate-950 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">
                  Siap Disalin ke Google Sheets
                </h4>
                <p className="text-xs text-slate-400">
                  Format tabel tabulasi (TSV/CSV) yang rapi dan kompatibel langsung dengan spreadsheet pengurus.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                type="button"
                id="btn-copy-google-sheets-full"
                onClick={() => handleCopyGoogleSheets(true)}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-3 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95 border border-emerald-400/40"
              >
                <Copy className="w-4 h-4" />
                <span>Salin Format Google Sheets (Header + Data)</span>
              </button>

              <button
                type="button"
                id="btn-download-csv"
                onClick={handleDownloadCsv}
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-3 rounded-xl text-xs transition cursor-pointer border border-slate-700 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Unduh CSV</span>
              </button>
            </div>
          </div>

          {/* Tabular Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
            {/* Box 1: Identitas */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="font-black text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>1. Profil Siswa</span>
              </div>
              <div className="space-y-1.5 text-slate-300">
                <p><span className="text-slate-500">Nama:</span> <strong className="text-white">{profile.namaLengkap}</strong></p>
                <p><span className="text-slate-500">Nomor Induk:</span> <span className="font-mono text-yellow-400 font-semibold">{nomorInduk}</span></p>
                <p><span className="text-slate-500">TTL:</span> {profile.tempatLahir}, {profile.tanggalLahir}</p>
                <p><span className="text-slate-500">No. WA:</span> {profile.noHpWa || profile.NomorHP || '-'}</p>
                <p><span className="text-slate-500">Orang Tua / Wali:</span> {namaOrtuWali}</p>
                <p><span className="text-slate-500">Kelas:</span> {currentKelas}</p>
              </div>
            </div>

            {/* Box 2: Pekerjaan */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="font-black text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                <span>2. Status Pekerjaan</span>
              </div>
              <div className="space-y-1.5 text-slate-300">
                <p><span className="text-slate-500">Status:</span> <strong className="text-yellow-400">{work.statusBekerja}</strong></p>
                {work.statusBekerja === 'Aktif' ? (
                  <>
                    <p><span className="text-slate-500">Tempat Kerja:</span> {work.namaTempatKerja || '-'}</p>
                    <p><span className="text-slate-500">Jabatan:</span> {work.jenisPekerjaan || '-'}</p>
                    <p><span className="text-slate-500">Bidang:</span> {work.bidangUsaha || '-'}</p>
                    <p><span className="text-slate-500">Alamat Kerja:</span> {work.alamatTempatKerja || '-'}</p>
                  </>
                ) : (
                  <p className="text-slate-500 italic">Fokus belajar / belum bekerja.</p>
                )}
              </div>
            </div>

            {/* Box 3: Jadwal & Berkas */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="font-black text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>3. Jadwal & Surat Kesanggupan</span>
              </div>
              <div className="space-y-1.5 text-slate-300">
                <p><span className="text-slate-500">Hari (3x):</span> <strong className="text-emerald-400">{schedule.hariBelajar.join(', ')}</strong></p>
                <p><span className="text-slate-500">Jam:</span> {schedule.jamBelajar}</p>
                <p><span className="text-slate-500">Materai:</span> <span className="text-emerald-400 font-semibold">Rp10.000 (Terkonfirmasi)</span></p>
                <p><span className="text-slate-500">Berkas PDF:</span> <span className="font-mono text-yellow-300 break-all">{pdfFileName}</span></p>
                <p><span className="text-slate-500">Verifikasi:</span> <span className="bg-emerald-950 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/40">TERVALIDASI</span></p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
              <span>
                Seluruh 5 tahapan konfirmasi (Lihat Data, Review Biodata, Jadwal Pekerjaan, Kesepakatan Jadwal, dan Final Pernyataan) telah diselesaikan secara lengkap sesuai pedoman Rombel Karang Taruna.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
