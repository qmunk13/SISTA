import React, { useState } from 'react';
import { 
  Briefcase, ShieldCheck, AlertTriangle, FileText, CheckCircle2, 
  XCircle, Clock, ExternalLink, Building, X, Save, AlertCircle, Info, UserCheck
} from 'lucide-react';
import { Student } from '../../types';
import { db } from '../../data/db';
import { useStore } from '../../store';
import { autoSyncEngine } from '../../data/autoSyncEngine';

interface VerifikasiKerjaModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSaved?: (updatedStudent: Student) => void;
}

/**
 * Menentukan Kelompok Belajar Efektif Siswa (3x Pertemuan/Minggu):
 * - Jika status bekerja 'Aktif Bekerja' DAN dokumen terverifikasi -> 'Aktif Bekerja' (Shift Malam: Senin, Rabu, Minggu)
 * - Jika mengaku bekerja tapi belum ada bukti atau ditolak -> 'Tidak Bekerja' (Shift Siang: Senin, Kamis, Minggu)
 * - Jika tidak bekerja -> 'Tidak Bekerja' (Shift Siang)
 */
export function getStudentEffectiveGroup(student?: Student | null): {
  group: 'Aktif Bekerja' | 'Tidak Bekerja';
  scheduleDays: string[];
  scheduleLabel: string;
  isVerified: boolean;
  statusLabel: string;
} {
  if (!student) {
    return {
      group: 'Tidak Bekerja',
      scheduleDays: ['Senin', 'Kamis', 'Minggu'],
      scheduleLabel: 'Shift Siang (Senin, Kamis, Minggu)',
      isVerified: false,
      statusLabel: 'Reguler Siang'
    };
  }

  const isClaimingWork = student.statusBekerja === 'Aktif Bekerja' || 
    (student as any).pekerjaan === 'Bekerja' || 
    Boolean(student.pekerjaanSiswa && student.pekerjaanSiswa !== '-' && student.pekerjaanSiswa !== 'Tidak Bekerja');

  const isVerified = student.statusVerifikasiKerja === 'Terverifikasi';
  const isPending = student.statusVerifikasiKerja === 'Menunggu Verifikasi';

  // Strict Rule: Hanya yang TERVERIFIKASI dengan bukti yang berhak masuk Shift Malam
  if (isClaimingWork && isVerified) {
    return {
      group: 'Aktif Bekerja',
      scheduleDays: ['Senin', 'Rabu', 'Minggu'],
      scheduleLabel: '🌙 Shift Malam (Senin, Rabu, Minggu)',
      isVerified: true,
      statusLabel: 'Terverifikasi Bekerja'
    };
  }

  if (isClaimingWork && isPending) {
    return {
      group: 'Tidak Bekerja', // Sementara wajib siang sampai diverifikasi
      scheduleDays: ['Senin', 'Kamis', 'Minggu'],
      scheduleLabel: '☀️ Sementara Shift Siang (Menunggu Bukti)',
      isVerified: false,
      statusLabel: 'Menunggu Verifikasi Bukti'
    };
  }

  if (isClaimingWork && !isVerified) {
    return {
      group: 'Tidak Bekerja', // Ditolak / Belum ada bukti -> wajib shift siang
      scheduleDays: ['Senin', 'Kamis', 'Minggu'],
      scheduleLabel: '☀️ Shift Siang (Belum Ada Bukti Sah)',
      isVerified: false,
      statusLabel: 'Bukti Belum Valid'
    };
  }

  return {
    group: 'Tidak Bekerja',
    scheduleDays: ['Senin', 'Kamis', 'Minggu'],
    scheduleLabel: '☀️ Shift Siang (Senin, Kamis, Minggu)',
    isVerified: false,
    statusLabel: 'Tidak Bekerja (Reguler)'
  };
}

export default function VerifikasiKerjaModal({
  isOpen,
  onClose,
  student,
  onSaved
}: VerifikasiKerjaModalProps) {
  const { students, setStudents } = useStore();

  const [statusBekerja, setStatusBekerja] = useState<string>(() => student?.statusBekerja || 'Tidak Bekerja');
  const [pekerjaanSiswa, setPekerjaanSiswa] = useState<string>(() => student?.pekerjaanSiswa || '');
  const [namaTempatKerja, setNamaTempatKerja] = useState<string>(() => student?.namaTempatKerja || '');
  const [jamKerjaMulai, setJamKerjaMulai] = useState<string>(() => student?.jamKerjaMulai || '08:00');
  const [jamKerjaSelesai, setJamKerjaSelesai] = useState<string>(() => student?.jamKerjaSelesai || '17:00');
  const [suratKeteranganKerjaUrl, setSuratKeteranganKerjaUrl] = useState<string>(() => student?.suratKeteranganKerjaUrl || '');
  const [statusVerifikasiKerja, setStatusVerifikasiKerja] = useState<string>(() => student?.statusVerifikasiKerja || 'Belum Ada Bukti');
  const [catatanVerifikasiKerja, setCatatanVerifikasiKerja] = useState<string>(() => student?.catatanVerifikasiKerja || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if student changes
  React.useEffect(() => {
    if (student) {
      setStatusBekerja(student.statusBekerja || 'Tidak Bekerja');
      setPekerjaanSiswa(student.pekerjaanSiswa || '');
      setNamaTempatKerja(student.namaTempatKerja || '');
      setJamKerjaMulai(student.jamKerjaMulai || '08:00');
      setJamKerjaSelesai(student.jamKerjaSelesai || '17:00');
      setSuratKeteranganKerjaUrl(student.suratKeteranganKerjaUrl || '');
      setStatusVerifikasiKerja(student.statusVerifikasiKerja || (student.statusBekerja === 'Aktif Bekerja' ? 'Menunggu Verifikasi' : 'Belum Ada Bukti'));
      setCatatanVerifikasiKerja(student.catatanVerifikasiKerja || '');
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleQuickApprove = () => {
    setStatusBekerja('Aktif Bekerja');
    setStatusVerifikasiKerja('Terverifikasi');
    if (!catatanVerifikasiKerja) {
      setCatatanVerifikasiKerja('Dokumen surat keterangan bekerja / ID card telah diverifikasi valid oleh pihak sekolah. Siswa sah mengikuti Shift Malam.');
    }
  };

  const handleQuickReject = () => {
    setStatusBekerja('Tidak Bekerja');
    setStatusVerifikasiKerja('Ditolak');
    setCatatanVerifikasiKerja('Tidak dapat menunjukkan bukti dokumen kerja sah. Siswa dialihkan ke Shift Siang (Senin, Kamis, Minggu).');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const effectiveKelompok = (statusBekerja === 'Aktif Bekerja' && statusVerifikasiKerja === 'Terverifikasi')
        ? 'Aktif Bekerja'
        : 'Tidak Bekerja';

      const updatedStudent: Student = {
        ...student,
        statusBekerja: statusBekerja as any,
        kelompokBelajar: effectiveKelompok,
        pekerjaanSiswa,
        namaTempatKerja,
        jamKerjaMulai,
        jamKerjaSelesai,
        suratKeteranganKerjaUrl,
        statusVerifikasiKerja,
        catatanVerifikasiKerja,
        updatedAt: new Date().toISOString()
      };

      // Update store and db
      const allStudents = db.get<Student[]>('students') || students;
      const updatedList = allStudents.map(s => (s.id === student.id ? updatedStudent : s));
      setStudents(updatedList);
      db.set('students', updatedList);

      autoSyncEngine.queueDbKey('students');

      if (onSaved) {
        onSaved(updatedStudent);
      }
      onClose();
    } catch (err: any) {
      alert('Gagal menyimpan verifikasi: ' + (err?.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center font-bold">
              <Briefcase size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Verifikasi Status Pekerjaan & Shift Belajar
              </h3>
              <p className="text-xs text-slate-300">
                Siswa: <strong className="text-amber-300">{student.name}</strong> (Kelas {student.class})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Anti-Slop / Anti-Curang Rule Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-black text-amber-800">
              <ShieldCheck size={16} className="text-amber-600" />
              <span>Kebijakan Pembagian Shift & Validasi KTCT Tambora:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800/90 font-medium">
              Siswa hanya berhak masuk <strong>Shift Malam (Senin, Rabu, Minggu)</strong> jika <strong>terbukti aktif bekerja</strong> dengan melampirkan Surat Keterangan Kerja, ID Card, atau Bukti Pekerjaan Sah. Jika tidak ada bukti, sistem secara otomatis mengunci siswa di <strong>Shift Siang (Senin, Kamis, Minggu)</strong> untuk mencegah pemanfaatan izin fiktif.
            </p>
          </div>

          {/* Status Bekerja Toggle */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              1. Pengakuan Status Bekerja Siswa:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatusBekerja('Aktif Bekerja');
                  if (statusVerifikasiKerja === 'Belum Ada Bukti') {
                    setStatusVerifikasiKerja('Menunggu Verifikasi');
                  }
                }}
                className={`p-3 rounded-2xl border text-left font-bold transition flex items-center gap-2.5 ${
                  statusBekerja === 'Aktif Bekerja'
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  statusBekerja === 'Aktif Bekerja' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-400'
                }`}>
                  {statusBekerja === 'Aktif Bekerja' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs">Aktif Bekerja</div>
                  <div className="text-[10px] text-slate-500 font-normal">Mengajukan Sesi Shift Malam</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusBekerja('Tidak Bekerja');
                  setStatusVerifikasiKerja('Belum Ada Bukti');
                }}
                className={`p-3 rounded-2xl border text-left font-bold transition flex items-center gap-2.5 ${
                  statusBekerja === 'Tidak Bekerja'
                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  statusBekerja === 'Tidak Bekerja' ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                }`}>
                  {statusBekerja === 'Tidak Bekerja' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs">Tidak Bekerja</div>
                  <div className="text-[10px] text-slate-500 font-normal">Mengikuti Sesi Shift Siang</div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Detail Pekerjaan (Jika Bekerja) */}
          {statusBekerja === 'Aktif Bekerja' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Nama Tempat Kerja / Toko / Usaha:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PT Sumber Makmur / Toko Kelontong"
                    value={namaTempatKerja}
                    onChange={(e) => setNamaTempatKerja(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Posisi / Jenis Pekerjaan:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pramuniaga / Kurir / Penjaga Toko"
                    value={pekerjaanSiswa}
                    onChange={(e) => setPekerjaanSiswa(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Jam Kerja Mulai:
                  </label>
                  <input
                    type="time"
                    value={jamKerjaMulai}
                    onChange={(e) => setJamKerjaMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Jam Kerja Selesai:
                  </label>
                  <input
                    type="time"
                    value={jamKerjaSelesai}
                    onChange={(e) => setJamKerjaSelesai(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* URL Bukti Surat Keterangan / Foto ID Card */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Link / URL Bukti Surat Keterangan Kerja / ID Card / Pernyataan:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://drive.google.com/... atau link foto berkas"
                    value={suratKeteranganKerjaUrl}
                    onChange={(e) => setSuratKeteranganKerjaUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                  />
                  {suratKeteranganKerjaUrl && (
                    <a
                      href={suratKeteranganKerjaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl font-bold flex items-center gap-1 shrink-0 hover:bg-indigo-100 transition"
                    >
                      <ExternalLink size={13} />
                      <span>Buka</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Verifikasi oleh Sekolah */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              2. Keputusan Verifikasi Pihak Sekolah:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleQuickApprove}
                className={`p-3 rounded-2xl border text-center font-bold transition cursor-pointer ${
                  statusVerifikasiKerja === 'Terverifikasi'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-2 ring-emerald-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 size={18} className="mx-auto mb-1 text-emerald-600" />
                <div className="text-xs">Terverifikasi</div>
                <div className="text-[9.5px] text-emerald-700 font-medium">Sah Shift Malam</div>
              </button>

              <button
                type="button"
                onClick={() => setStatusVerifikasiKerja('Menunggu Verifikasi')}
                className={`p-3 rounded-2xl border text-center font-bold transition cursor-pointer ${
                  statusVerifikasiKerja === 'Menunggu Verifikasi'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-2 ring-amber-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock size={18} className="mx-auto mb-1 text-amber-600" />
                <div className="text-xs">Menunggu Bukti</div>
                <div className="text-[9.5px] text-amber-700 font-medium">Belum Valid</div>
              </button>

              <button
                type="button"
                onClick={handleQuickReject}
                className={`p-3 rounded-2xl border text-center font-bold transition cursor-pointer ${
                  statusVerifikasiKerja === 'Ditolak'
                    ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-xs ring-2 ring-rose-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <XCircle size={18} className="mx-auto mb-1 text-rose-600" />
                <div className="text-xs">Ditolak / Fiktif</div>
                <div className="text-[9.5px] text-rose-700 font-medium">Wajib Shift Siang</div>
              </button>
            </div>
          </div>

          {/* Catatan Verifikator */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Catatan Wali Kelas / Verifikator:
            </label>
            <textarea
              rows={2}
              value={catatanVerifikasiKerja}
              onChange={(e) => setCatatanVerifikasiKerja(e.target.value)}
              placeholder="Contoh: Bukti surat keterangan dari tempat kerja telah divalidasi..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Ringkasan Efek Sistem */}
          <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-700 flex items-center justify-between">
            <span className="font-bold text-[11px]">Penugasan Shift Otomatis:</span>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
              statusBekerja === 'Aktif Bekerja' && statusVerifikasiKerja === 'Terverifikasi'
                ? 'bg-indigo-600 text-white'
                : 'bg-blue-600 text-white'
            }`}>
              {statusBekerja === 'Aktif Bekerja' && statusVerifikasiKerja === 'Terverifikasi'
                ? '🌙 Shift Malam (Senin, Rabu, Minggu)'
                : '☀️ Shift Siang (Senin, Kamis, Minggu)'}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Keputusan Shift'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
