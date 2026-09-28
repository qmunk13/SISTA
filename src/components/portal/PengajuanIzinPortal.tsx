import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Camera, Upload, CheckCircle2, Clock, XCircle, 
  Calendar, AlertCircle, Eye, Trash2, Send, Info, X, ShieldCheck,
  Sparkles, Check, Phone, User
} from 'lucide-react';
import { 
  StudentPermission, PermissionType, getPermissions, 
  addPermission, deletePermission, compressImageFile, getDatesInRange 
} from '../../lib/permissionService';
import { Student } from '../../types';
import { formatClassLabel } from '../../lib/utils';

interface PengajuanIzinPortalProps {
  student: Student;
  submittedBy: 'Siswa' | 'Orang Tua';
  parentDefaultName?: string;
  parentDefaultPhone?: string;
}

export default function PengajuanIzinPortal({
  student,
  submittedBy,
  parentDefaultName = '',
  parentDefaultPhone = ''
}: PengajuanIzinPortalProps) {
  const [permissions, setPermissions] = useState<StudentPermission[]>(() => getPermissions());

  // Form states
  const [type, setType] = useState<PermissionType>('Sakit');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [proofImageBase64, setProofImageBase64] = useState<string>('');
  const [applicantName, setApplicantName] = useState(
    submittedBy === 'Orang Tua' 
      ? (parentDefaultName || student.parentName || student.namaAyah || student.namaIbu || 'Orang Tua / Wali')
      : student.name
  );
  const [applicantPhone, setApplicantPhone] = useState(
    parentDefaultPhone || student.parentPhone || student.phone || student.noHp || ''
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lightbox Preview Modal
  const [viewProofItem, setViewProofItem] = useState<StudentPermission | null>(null);

  // Filter permissions for this student
  const studentPermissions = useMemo(() => {
    return permissions.filter(p => 
      p.studentId === student.id || 
      (p.nisn && p.nisn === student.nisn) || 
      p.studentName.toLowerCase() === student.name.toLowerCase()
    );
  }, [permissions, student]);

  // Sync list when student changes
  useEffect(() => {
    setApplicantName(
      submittedBy === 'Orang Tua' 
        ? (parentDefaultName || student.parentName || student.namaAyah || student.namaIbu || 'Orang Tua / Wali')
        : student.name
    );
    setApplicantPhone(
      parentDefaultPhone || student.parentPhone || student.phone || student.noHp || ''
    );
  }, [student, submittedBy, parentDefaultName, parentDefaultPhone]);

  // Calculate day count
  const dayCount = useMemo(() => {
    return getDatesInRange(startDate, endDate).length;
  }, [startDate, endDate]);

  // Handle Photo Capture / Upload with Auto-compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImageFile(file, 1200, 0.72);
      setProofImageBase64(compressed);
    } catch (err) {
      alert('Gagal memproses gambar foto. Pastikan format JPG/PNG valid.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      alert('Mohon isi alasan / keterangan perizinan dengan jelas.');
      return;
    }

    // Validation: Require proof photo for 'Sakit' and recommended for 'Izin'
    if (type === 'Sakit' && !proofImageBase64) {
      const confirmNoPhoto = window.confirm(
        'Perhatian: Untuk izin Sakit, disarankan mengunggah foto surat dokter/resep. Lanjutkan pengajuan tanpa foto?'
      );
      if (!confirmNoPhoto) return;
    }

    try {
      setIsSubmitting(true);
      addPermission({
        studentId: student.id,
        studentName: student.name,
        studentClass: student.class,
        nisn: student.nisn || '',
        type,
        startDate,
        endDate,
        daysCount: dayCount,
        reason: reason.trim(),
        proofImageUrl: proofImageBase64,
        submittedBy,
        applicantName,
        applicantPhone,
      });

      // Refresh list
      setPermissions(getPermissions());

      // Reset form
      setReason('');
      setProofImageBase64('');
      setSuccessMessage('Pengajuan izin berhasil dikirim dan sedang menunggu verifikasi wali kelas!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      alert('Terjadi kesalahan saat menyimpan pengajuan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel / Delete pending
  const handleCancelPermission = (id: string) => {
    if (window.confirm('Batalkan pengajuan izin ini?')) {
      const updated = deletePermission(id);
      setPermissions(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-2 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-start gap-3.5">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shrink-0">
            <FileText size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">
              {submittedBy === 'Orang Tua' ? 'Surat Izin & Pemberitahuan Sakit Anak' : 'Form Pengajuan Izin / Sakit Mandiri'}
            </h3>
            <p className="text-xs text-indigo-100 max-w-2xl leading-relaxed mt-0.5">
              Siswa: <strong>{student.name}</strong> ({formatClassLabel(student.class)}) • Silakan ajukan izin dengan melampirkan foto bukti surat dokter atau surat izin dari orang tua.
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-bold animate-in fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid: Form Input (Left) & Riwayat Pengajuan (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Pengajuan */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-rose-500" />
              <span>Buat Surat Pengajuan Izin Baru</span>
            </h4>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
              {dayCount} Hari
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Pilih Kategori */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Kategori Izin *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'Sakit', label: '🩺 Sakit', color: 'rose' },
                  { key: 'Izin', label: '📝 Izin Keperluan', color: 'amber' },
                  { key: 'Dispensasi', label: '🏆 Dispensasi', color: 'indigo' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setType(item.key as PermissionType)}
                    className={`py-2.5 px-2 rounded-2xl font-black text-xs border transition-all text-center ${
                      type === item.key 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Petunjuk jenis */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
                <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {type === 'Sakit' && 'Wajib upload foto Surat Keterangan Dokter, Resep Obat, atau Surat Istirahat dari Klinik.'}
                  {type === 'Izin' && 'Wajib upload foto Surat Permohonan Izin tertulis bertanda tangan Orang Tua / Wali.'}
                  {type === 'Dispensasi' && 'Upload surat tugas resmi kegiatan/lomba luar sekolah.'}
                </span>
              </div>
            </div>

            {/* 2. Rentang Tanggal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Dari Tanggal *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) setEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Sampai Tanggal *</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>

            {/* 3. Alasan / Keterangan */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Alasan & Keterangan Lengkap *</label>
              <textarea
                rows={3}
                placeholder="Contoh: Mengalami demam dan batuk pilek sejak semalam, disarankan dokter istirahat di rumah."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                required
              />
            </div>

            {/* 4. Upload / Ambil Foto Bukti (Kamera / Galeri) */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">
                Foto Bukti {type === 'Sakit' ? '(Surat Dokter / Resep)' : '(Surat Ortu / Undangan)'} *
              </label>

              <div className="border-2 border-dashed border-slate-200 hover:border-rose-300 rounded-2xl p-4 text-center bg-slate-50/60 transition">
                {proofImageBase64 ? (
                  <div className="space-y-2">
                    <div className="relative inline-block">
                      <img 
                        src={proofImageBase64} 
                        alt="Preview Bukti" 
                        className="max-h-40 rounded-xl object-contain shadow-xs border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setProofImageBase64('')}
                        className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md transition"
                        title="Hapus / Ganti Foto"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 size={12} /> Foto siap dikirim
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                      <Camera size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">Ambil Foto Surat atau Pilih File</p>
                      <p className="text-[11px] text-slate-400">Dukungan Kamera HP & Galeri (JPG / PNG)</p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95">
                      <Upload size={14} />
                      <span>Pilih / Foto Sekarang</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                {isCompressing && (
                  <p className="text-[11px] text-indigo-600 font-semibold mt-2 animate-pulse">
                    Sedang mengompres gambar...
                  </p>
                )}
              </div>
            </div>

            {/* 5. Data Pengaju */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Nama Pengaju (Ortu/Siswa)</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  placeholder="08123456789"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs shadow-md shadow-rose-200 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Izin / Sakit'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Riwayat Pengajuan Izin Siswa */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" />
                <span>Riwayat & Status Pengajuan ({studentPermissions.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">Real-time</span>
            </div>

            {studentPermissions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <CheckCircle2 size={32} className="text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-xs">Belum Ada Riwayat Perizinan</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Gunakan form di samping jika {student.name} berhalangan hadir karena sakit atau ada keperluan penting.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {studentPermissions.map((item) => {
                  const isSakit = item.type === 'Sakit';
                  const isIzin = item.type === 'Izin';
                  const isPending = item.status === 'Menunggu';
                  const isApproved = item.status === 'Disetujui';
                  const isRejected = item.status === 'Ditolak';

                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isPending 
                          ? 'bg-amber-50/50 border-amber-200' 
                          : isApproved 
                          ? 'bg-emerald-50/40 border-emerald-200' 
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              isSakit ? 'bg-rose-100 text-rose-700' : isIzin ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {isSakit ? '🩺 Sakit' : isIzin ? '📝 Izin' : '🏆 Dispensasi'}
                            </span>
                            <span className="font-bold text-xs text-slate-800">
                              {item.daysCount} Hari ({item.startDate} {item.startDate !== item.endDate && `s/d ${item.endDate}`})
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isPending && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-black text-[10px] flex items-center gap-1">
                              <Clock size={11} /> Menunggu
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] flex items-center gap-1">
                              <CheckCircle2 size={11} /> Disetujui
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-black text-[10px] flex items-center gap-1">
                              <XCircle size={11} /> Ditolak
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Alasan & Proof thumbnail */}
                      <div className="flex items-start justify-between gap-3 text-xs">
                        <p className="text-slate-700 leading-relaxed font-medium flex-1">
                          "{item.reason}"
                        </p>
                        {item.proofImageUrl && (
                          <button
                            type="button"
                            onClick={() => setViewProofItem(item)}
                            className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-slate-300 hover:ring-2 hover:ring-rose-500 transition relative group"
                            title="Klik untuk memperbesar foto surat"
                          >
                            <img 
                              src={item.proofImageUrl} 
                              alt="Bukti Foto" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] transition-opacity font-bold">
                              <Eye size={12} />
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Verification / Review Notes */}
                      {isApproved && (
                        <div className="p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-0.5">
                          <div className="font-bold flex items-center gap-1">
                            <Check size={12} /> Disetujui oleh {item.reviewedBy || 'Wali Kelas'}
                          </div>
                          <p className="text-[10px] text-emerald-800">
                            {item.reviewNotes || 'Status presensi telah otomatis diperbarui menjadi Sakit/Izin.'}
                          </p>
                        </div>
                      )}

                      {isRejected && (
                        <div className="p-2.5 bg-rose-100/70 border border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-0.5">
                          <div className="font-bold flex items-center gap-1 text-rose-800">
                            <X size={12} /> Ditolak oleh {item.reviewedBy || 'Sekolah'}
                          </div>
                          <p className="text-[10px] text-rose-800">
                            Alasan: {item.reviewNotes || 'Bukti foto tidak sesuai / tidak valid.'}
                          </p>
                        </div>
                      )}

                      {/* Footer: Date & Cancel Action if pending */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                        <span>Diajukan: {new Date(item.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => handleCancelPermission(item.id)}
                            className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                          >
                            <Trash2 size={11} /> Batalkan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal: Fullscreen View of Proof Photo */}
      {viewProofItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-3">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-black text-slate-900 text-sm">
                  Bukti Foto Surat {viewProofItem.type}
                </h4>
                <p className="text-[11px] text-slate-500">{viewProofItem.studentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewProofItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4">
              <div className="bg-slate-950 rounded-2xl p-2 flex items-center justify-center max-h-[380px] overflow-hidden">
                <img 
                  src={viewProofItem.proofImageUrl} 
                  alt="Bukti Foto Lengkap" 
                  className="max-h-[360px] w-auto object-contain rounded-xl"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {viewProofItem.startDate} s/d {viewProofItem.endDate} ({viewProofItem.daysCount} Hari)
              </span>
              <button
                type="button"
                onClick={() => setViewProofItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
