import React, { useState, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { 
  X, Printer, Download, Image as ImageIcon, FileText, 
  Send, Copy, Check, MessageSquare, AlertTriangle, 
  CheckCircle2, Users, HeartPulse, Clock, Sparkles, 
  ChevronRight, Phone, ShieldCheck, RefreshCw
} from 'lucide-react';
import { formatClassLabel, getGoogleDriveDirectImageUrl } from '../../lib/utils';
import { Student } from '../../types';
import StudentPhoto from './StudentPhoto';

interface BeritaAcaraModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: string;
  selectedDate: string;
  sessionName: string;
  classStudents: Student[];
  attendanceMap: Record<string, { status: 'H' | 'S' | 'I' | 'A' | 'T' | ''; note: string; time?: string }>;
  summary: {
    total: number;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    terlambat: number;
    belumDiisi?: number;
    hadirPercentage: number;
  };
  waliKelas: any;
  kepsek: any;
  settings: any;
}

export default function BeritaAcaraModal({
  isOpen,
  onClose,
  selectedClass,
  selectedDate,
  sessionName,
  classStudents,
  attendanceMap,
  summary,
  waliKelas,
  kepsek,
  settings
}: BeritaAcaraModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'whatsapp'>('preview');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [filterParentStatus, setFilterParentStatus] = useState<'ALL' | 'ABSENT' | 'H'>('ALL');
  const [customNote, setCustomNote] = useState<string>('');

  const docRef = useRef<HTMLDivElement>(null);

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // List of students who are sick, permitted, absent, or late
  const absentStudents = useMemo(() => {
    return classStudents.filter(s => {
      const item = attendanceMap[s.id];
      return item && (item.status === 'S' || item.status === 'I' || item.status === 'A' || item.status === 'T');
    });
  }, [classStudents, attendanceMap]);

  // Build WhatsApp report text
  const waReportMessage = useMemo(() => {
    const school = settings.schoolName || settings.appName || 'Sekolah';
    const tp = settings.tahunPelajaran || '2026/2027';
    const classLabel = formatClassLabel(selectedClass, true);
    const waliName = waliKelas?.name || 'Wali Kelas';

    let text = `📋 *BERITA ACARA & LAPORAN PRESENSI KELAS*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🏫 *${school}*\n`;
    text += `📅 *Hari/Tanggal:* ${formattedDate}\n`;
    text += `⏰ *Sesi:* ${sessionName}\n`;
    text += `👥 *Kelas / Rombel:* ${classLabel}\n`;
    text += `👨‍🏫 *Wali Kelas:* ${waliName}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `📊 *RINGKASAN KEHADIRAN SISWA:*\n`;
    text += `• Total Siswa: *${summary.total} Orang*\n`;
    text += `• 🟢 Hadir: *${summary.hadir} Siswa (${summary.hadirPercentage}%)*\n`;
    text += `• 🟡 Sakit: *${summary.sakit} Siswa*\n`;
    text += `• 🔵 Izin: *${summary.izin} Siswa*\n`;
    text += `• 🔴 Alpa / Tanpa Ket: *${summary.alpa} Siswa*\n`;
    text += `• 🟠 Terlambat: *${summary.terlambat} Siswa*\n`;
    if (summary.belumDiisi && summary.belumDiisi > 0) {
      text += `• ⚪ Belum Diisi: *${summary.belumDiisi} Siswa*\n`;
    }
    text += `\n`;

    if (absentStudents.length > 0) {
      text += `⚠️ *RINCIAN SISWA TIDAK HADIR:*\n`;
      absentStudents.forEach((s, i) => {
        const item = attendanceMap[s.id] || { status: 'A', note: '' };
        let stLabel = 'ALPA';
        if (item.status === 'S') stLabel = 'SAKIT';
        else if (item.status === 'I') stLabel = 'IZIN';
        else if (item.status === 'T') stLabel = 'TERLAMBAT';

        text += `${i + 1}. *${s.name}* [${stLabel}]${item.note ? ` - Ket: ${item.note}` : ''}\n`;
      });
      text += `\n`;
    } else if (summary.hadir > 0 && summary.sakit === 0 && summary.izin === 0 && summary.alpa === 0 && (summary.belumDiisi === 0 || !summary.belumDiisi)) {
      text += `✨ *Alhamdulillah, seluruh siswa hadir 100% hari ini!*\n\n`;
    }

    if (customNote.trim()) {
      text += `📝 *Catatan Wali Kelas:*\n${customNote.trim()}\n\n`;
    }

    text += `📢 *Pemberitahuan Orang Tua/Wali:*\n`;
    text += `Bagi Bapak/Ibu wali murid yang putera/puterinya berhalangan hadir atau membutuhkan konfirmasi terkait absensi, silakan menghubungi wali kelas. Terima kasih atas perhatian dan kerja samanya.\n\n`;
    text += `_Laporan resmi dibuat otomatis via Aplikasi Presensi ${school}_`;

    return text;
  }, [settings, selectedClass, formattedDate, sessionName, waliKelas, summary, absentStudents, attendanceMap, customNote]);

  // Generate Image (PNG) with html2canvas
  const handleDownloadImage = async () => {
    if (!docRef.current) return;
    try {
      setIsGeneratingImage(true);
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      const cleanClassName = formatClassLabel(selectedClass, false).replace(/\s+/g, '_');
      link.download = `Berita_Acara_Presensi_${cleanClassName}_${selectedDate}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate image:', err);
      alert('Gagal membuat gambar. Silakan coba cetak PDF.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Generate PDF with jsPDF & html2canvas
  const handleDownloadPdf = async () => {
    if (!docRef.current) return;
    try {
      setIsGeneratingPdf(true);
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const cleanClassName = formatClassLabel(selectedClass, false).replace(/\s+/g, '_');
      pdf.save(`Berita_Acara_Presensi_${cleanClassName}_${selectedDate}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Gagal mengonversi ke PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy WhatsApp Text to Clipboard
  const handleCopyWaText = () => {
    navigator.clipboard.writeText(waReportMessage);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Open WhatsApp Web with report message
  const handleSendToWhatsAppGroup = () => {
    const encoded = encodeURIComponent(waReportMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Send single student personal message to parent
  const handleSendPersonalWaToParent = (student: Student) => {
    const item = attendanceMap[student.id] || { status: 'H', note: '' };
    const rawPhone = student.parentPhone || student.teleponOrtu || (student as any).noHp || (student as any).noHpOrtu || '';
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const school = settings.schoolName || settings.appName || 'Sekolah';
    const statusLabels: Record<string, string> = {
      H: 'HADIR',
      S: 'SAKIT',
      I: 'IZIN',
      A: 'ALPA (Tanpa Keterangan)',
      T: 'TERLAMBAT'
    };

    let personalMsg = `Yth. Bapak/Ibu Orang Tua/Wali dari *${student.name}* (Kelas ${formatClassLabel(selectedClass, false)}),\n\n`;
    personalMsg += `Kami dari pihak sekolah *${school}* menginformasikan laporan presensi harian pada hari *${formattedDate}*:\n`;
    personalMsg += `• Status Kehadiran: *${statusLabels[item.status] || 'HADIR'}*\n`;
    if (item.note) {
      personalMsg += `• Keterangan/Catatan: ${item.note}\n`;
    }
    personalMsg += `\nMohon kerjasamanya dan terima kasih.\n\n_Wali Kelas: ${waliKelas?.name || 'Wali Kelas'}_`;

    const encoded = encodeURIComponent(personalMsg);
    if (cleanPhone && cleanPhone.length > 5) {
      window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300 font-bold flex-shrink-0 border border-white/10">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base">Cetak Berita Acara & Bagikan ke WhatsApp</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {formatClassLabel(selectedClass, true)}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Konversi otomatis ke Gambar (PNG), Dokumen PDF, atau kirim langsung ke WhatsApp Wali Murid.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action & Tab Switcher Bar */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={14} />
              <span>Dokumen Berita Acara</span>
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-4 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare size={14} />
              <span>Kirim ke WhatsApp ({summary.total} Siswa)</span>
            </button>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-xl font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isGeneratingImage ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <ImageIcon size={13} />
              )}
              <span>{isGeneratingImage ? 'Memproses...' : 'Jadikan Gambar (PNG)'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isGeneratingPdf ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>{isGeneratingPdf ? 'Memproses...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer size={13} />
              <span>Cetak Kertas</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60">
          {activeTab === 'preview' ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Optional Custom Note Banner */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700 flex-shrink-0">Catatan Khusus Berita Acara:</span>
                <input
                  type="text"
                  placeholder="Tambahkan catatan khusus kelas hari ini (opsional)..."
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Berita Acara Document Content (Target for html2canvas & Print) */}
              <div
                ref={docRef}
                id="berita-acara-doc"
                className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-300 shadow-md text-black font-sans text-xs leading-relaxed"
                style={{ minHeight: '800px', backgroundColor: '#ffffff' }}
              >
                {/* Kop Surat Resmi */}
                <div className="border-b-2 border-black pb-4 mb-5 flex items-center gap-4">
                  {settings.logoUrl && (
                    <img
                      src={getGoogleDriveDirectImageUrl(settings.logoUrl)}
                      alt="Logo Sekolah"
                      className="w-16 h-16 object-contain flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="flex-1 text-center">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-black">
                      {settings.schoolName || settings.appName || 'SEKOLAH INDONESIA'}
                    </h2>
                    <p className="text-[11px] font-medium text-slate-800">
                      {settings.address || 'Alamat Sekolah / Lembaga Pendidikan'}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      Tahun Pelajaran {settings.tahunPelajaran || '2026/2027'} &bull; Semester {settings.semester || 'Ganjil'}
                    </p>
                  </div>
                  <div className="w-16 flex-shrink-0"></div>
                </div>

                {/* Judul Berita Acara */}
                <div className="text-center mb-6">
                  <h1 className="text-sm sm:text-base font-black uppercase underline tracking-wide text-black">
                    BERITA ACARA & DAFTAR PRESENSI HARIAN SISWA
                  </h1>
                  <p className="text-[11px] font-bold text-slate-800 mt-1">
                    Nomor: BA-ABS/{formatClassLabel(selectedClass, false).replace(/\s+/g, '')}/{selectedDate.replace(/-/g, '')}
                  </p>
                </div>

                {/* Info Rombel & Waktu */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-3.5 rounded-xl border border-slate-300 mb-5 text-[11px]">
                  <div className="space-y-1">
                    <div><strong>Kelas / Rombel:</strong> {formatClassLabel(selectedClass, true)}</div>
                    <div><strong>Hari / Tanggal:</strong> {formattedDate}</div>
                    <div><strong>Sesi Presensi:</strong> {sessionName}</div>
                  </div>
                  <div className="space-y-1">
                    <div><strong>Wali Kelas:</strong> {waliKelas?.name || 'Belum Ditentukan'} {waliKelas?.nip ? `(NIP: ${waliKelas.nip})` : ''}</div>
                    <div><strong>Total Siswa:</strong> {summary.total} Orang</div>
                    <div><strong>Tingkat Kehadiran:</strong> <span className="font-black text-emerald-700">{summary.hadirPercentage}%</span></div>
                  </div>
                </div>

                {/* Summary Badges Box */}
                <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold mb-5">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800">
                    <div>HADIR (H)</div>
                    <div className="text-base font-black">{summary.hadir}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800">
                    <div>SAKIT (S)</div>
                    <div className="text-base font-black">{summary.sakit}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-300 text-blue-800">
                    <div>IZIN (I)</div>
                    <div className="text-base font-black">{summary.izin}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-800">
                    <div>ALPA (A)</div>
                    <div className="text-base font-black">{summary.alpa}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-orange-50 border border-orange-300 text-orange-800">
                    <div>TELAT (T)</div>
                    <div className="text-base font-black">{summary.terlambat}</div>
                  </div>
                </div>

                {/* Tabel Siswa Berita Acara */}
                <table className="w-full border-collapse border border-black text-[10px] mb-6">
                  <thead>
                    <tr className="bg-slate-100 text-black">
                      <th className="border border-black p-1.5 text-center w-8 font-black">No</th>
                      <th className="border border-black p-1.5 text-center w-24 font-black">NISN / NIS</th>
                      <th className="border border-black p-1.5 text-left font-black">Nama Siswa</th>
                      <th className="border border-black p-1.5 text-center w-10 font-black">L/P</th>
                      <th className="border border-black p-1.5 text-center w-20 font-black">Status</th>
                      <th className="border border-black p-1.5 text-left font-black">Keterangan / Alasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((s, idx) => {
                      const item = attendanceMap[s.id] || { status: '', note: '' };
                      const statusName: Record<string, string> = { 
                        H: 'HADIR', 
                        S: 'SAKIT', 
                        I: 'IZIN', 
                        A: 'ALPA', 
                        T: 'TERLAMBAT',
                        '': 'BELUM DIISI'
                      };
                      return (
                        <tr key={s.id || idx} className={item.status && item.status !== 'H' ? 'bg-amber-50/40' : ''}>
                          <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                          <td className="border border-black p-1 text-center font-mono">{s.nisn || (s as any).NISN || s.nis || '-'}</td>
                          <td className="border border-black p-1 font-bold">{s.name}</td>
                          <td className="border border-black p-1 text-center">{s.gender || 'L'}</td>
                          <td className={`border border-black p-1 text-center font-black ${
                            item.status === 'H' ? 'text-emerald-700' :
                            item.status === 'S' ? 'text-amber-700' :
                            item.status === 'I' ? 'text-blue-700' :
                            item.status === 'A' ? 'text-rose-700' :
                            item.status === 'T' ? 'text-orange-700' : 'text-slate-400'
                          }`}>
                            {statusName[item.status] || '-'}
                          </td>
                          <td className="border border-black p-1 text-slate-700">{item.note || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {customNote && (
                  <div className="mb-6 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[10px]">
                    <strong>Catatan Tambahan:</strong> {customNote}
                  </div>
                )}

                {/* Tanda Tangan */}
                <div className="grid grid-cols-2 text-center text-[11px] mt-8 pt-4">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala Sekolah</p>
                    <div className="h-16"></div>
                    <p className="font-black underline text-black">{kepsek?.name || settings.headmasterName || 'Kepala Sekolah'}</p>
                    <p className="text-[10px] text-slate-700">NIP: {kepsek?.nip || settings.headmasterNip || '-'}</p>
                  </div>
                  <div>
                    <p>{settings.kota || settings.city || 'Jakarta'}, {formattedDate}</p>
                    <p className="font-bold">Wali Kelas {formatClassLabel(selectedClass, false)}</p>
                    <div className="h-16"></div>
                    <p className="font-black underline text-black">{waliKelas?.name || 'Wali Kelas'}</p>
                    <p className="text-[10px] text-slate-700">NIP: {waliKelas?.nip || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* WhatsApp Tab */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* WhatsApp Message Preview Box */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">Pesan Ringkasan untuk Grup WhatsApp Kelas</h4>
                      <p className="text-[11px] text-slate-500">Kirim teks laporan ke grup WA orang tua murid dalam 1 kali klik.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyWaText}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedSuccess ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>{copiedSuccess ? 'Tersalin!' : 'Salin Teks'}</span>
                    </button>
                    <button
                      onClick={handleSendToWhatsAppGroup}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Send size={13} />
                      <span>Kirim ke WhatsApp Grup</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/60 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {waReportMessage}
                </div>
              </div>

              {/* Direct Personal Message per Parent */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                      <Users size={16} className="text-indigo-600" />
                      Kirim Pesan Personal ke Orang Tua Siswa
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Hubungi langsung orang tua siswa terkait status kehadiran putera/puterinya hari ini.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setFilterParentStatus('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        filterParentStatus === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Semua ({classStudents.length})
                    </button>
                    <button
                      onClick={() => setFilterParentStatus('ABSENT')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        filterParentStatus === 'ABSENT' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Tidak Hadir ({absentStudents.length})
                    </button>
                    <button
                      onClick={() => setFilterParentStatus('H')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        filterParentStatus === 'H' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      Hadir ({summary.hadir})
                    </button>
                  </div>
                </div>

                <div className="mt-4 divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {classStudents
                    .filter(s => {
                      const item = attendanceMap[s.id];
                      if (filterParentStatus === 'ABSENT') return item && item.status !== 'H';
                      if (filterParentStatus === 'H') return !item || item.status === 'H';
                      return true;
                    })
                    .map(student => {
                      const item = attendanceMap[student.id] || { status: 'H', note: '' };
                      const parentPhone = student.parentPhone || student.teleponOrtu || (student as any).noHp || '-';
                      const hasPhone = parentPhone && parentPhone !== '-' && parentPhone.replace(/\D/g, '').length > 5;

                      const statusBadge = {
                        H: { label: 'Hadir', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        S: { label: 'Sakit', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
                        I: { label: 'Izin', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
                        A: { label: 'Alpa', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
                        T: { label: 'Terlambat', bg: 'bg-orange-50 text-orange-700 border-orange-200' }
                      }[item.status] || { label: 'Hadir', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

                      return (
                        <div key={student.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition">
                          <div className="flex items-center gap-3">
                            <StudentPhoto student={student} size="sm" />
                            <div>
                              <div className="font-black text-slate-900 text-xs flex items-center gap-2">
                                <span>{student.name}</span>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${statusBadge.bg}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>No. Orang Tua: <strong className="text-slate-600">{parentPhone}</strong></span>
                                {item.note && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="text-amber-700 italic">Ket: {item.note}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleSendPersonalWaToParent(student)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                          >
                            <Phone size={12} />
                            <span>Kirim WA Orang Tua</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
