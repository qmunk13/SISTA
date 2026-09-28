import React, { useState } from 'react';
import { Briefcase, Building, MapPin, Tag, ArrowLeft, ArrowRight, AlertCircle, Info, Sparkles, CheckCircle2, User } from 'lucide-react';
import { WorkInfo, StudentProfile } from '../types';

interface Tahap3WorkInfoProps {
  profile: StudentProfile;
  initialWork: WorkInfo | null;
  onSaveAndProceed: (work: WorkInfo) => void;
  onBackToStep2: () => void;
}

export const Tahap3WorkInfo: React.FC<Tahap3WorkInfoProps> = ({
  profile,
  initialWork,
  onSaveAndProceed,
  onBackToStep2,
}) => {
  const [statusBekerja, setStatusBekerja] = useState<'Aktif' | 'Tidak Aktif'>(
    initialWork?.statusBekerja || 'Aktif'
  );
  const [namaTempatKerja, setNamaTempatKerja] = useState(initialWork?.namaTempatKerja || '');
  const [jenisPekerjaan, setJenisPekerjaan] = useState(initialWork?.jenisPekerjaan || '');
  const [alamatTempatKerja, setAlamatTempatKerja] = useState(initialWork?.alamatTempatKerja || '');
  const [bidangUsaha, setBidangUsaha] = useState(initialWork?.bidangUsaha || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (statusBekerja === 'Aktif') {
      if (!namaTempatKerja.trim()) {
        setValidationError('Mohon isi nama tempat kerja, instansi, toko, atau usaha Anda.');
        return;
      }
      if (!jenisPekerjaan.trim()) {
        setValidationError('Mohon isi jenis pekerjaan atau posisi/jabatan Anda saat ini.');
        return;
      }
      if (!alamatTempatKerja.trim()) {
        setValidationError('Mohon isi alamat atau wilayah lokasi tempat kerja Anda.');
        return;
      }
    }

    const workData: WorkInfo = {
      statusBekerja,
      namaTempatKerja: statusBekerja === 'Aktif' ? namaTempatKerja.trim() : '-',
      jenisPekerjaan: statusBekerja === 'Aktif' ? jenisPekerjaan.trim() : 'Belum Bekerja / Pelajar Penuh',
      alamatTempatKerja: statusBekerja === 'Aktif' ? alamatTempatKerja.trim() : '-',
      bidangUsaha: statusBekerja === 'Aktif' ? (bidangUsaha.trim() || '-') : '-',
    };

    onSaveAndProceed(workData);
  };

  return (
    <div id="tahap3-work-container" className="space-y-6 sm:space-y-8 animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white rounded-3xl p-5 sm:p-8 shadow-2xl shadow-indigo-950/60 border border-indigo-500/30 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-950/90 to-indigo-900/90 border border-blue-400/40 text-blue-300 text-xs font-black px-3.5 py-1 rounded-full shadow-lg">
            <Briefcase className="w-3.5 h-3.5 text-yellow-400" />
            <span className="uppercase tracking-wider">Tahap 3: Jadwal Pekerjaan</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white font-['Outfit',sans-serif]">
            Informasi Status & Aktivitas Pekerjaan Siswa
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Program Rombel Karang Taruna dirancang ramah bagi pemuda pekerja. Mohon lengkapi data pekerjaan dan domisili aktivitas harian Anda untuk koordinasi belajar.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Error Notification */}
        {validationError && (
          <div className="bg-rose-950/80 border border-rose-500/60 text-rose-200 p-4 rounded-2xl text-sm flex items-center gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-semibold">{validationError}</span>
          </div>
        )}

        {/* Card Data Siswa Terkait */}
        <div className="bg-slate-900/85 backdrop-blur-xl rounded-3xl border border-slate-700/80 shadow-2xl p-5 sm:p-8 space-y-6">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-blue-600/30 border border-blue-400/40">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Outfit',sans-serif]">
                Verifikasi Status Pekerjaan: <span className="text-yellow-300">{profile.namaLengkap}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                No. PDKT: <strong className="text-slate-200">{profile.nopdkt || profile.idNumber}</strong> | NISN: <strong className="text-slate-200">{profile.nisn || profile.NISN || '-'}</strong> | Kelas: <strong className="text-blue-300">{profile.KelasSaatini || profile.kelasSaatIni || profile.kelasRombel || profile.kelas || 'Rombel Karang Taruna'}</strong>
              </p>
            </div>
          </div>

          {/* Radio Status Bekerja */}
          <div>
            <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-3">
              Apakah Anda Saat Ini Sedang Bekerja? <span className="text-yellow-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`p-5 rounded-2xl border-2 flex items-start gap-4 cursor-pointer transition-all duration-300 ${
                  statusBekerja === 'Aktif'
                    ? 'border-yellow-400/90 bg-gradient-to-br from-yellow-950/40 to-slate-900 shadow-xl shadow-yellow-950/40 ring-2 ring-yellow-400/20'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="statusBekerja"
                  value="Aktif"
                  checked={statusBekerja === 'Aktif'}
                  onChange={() => {
                    setStatusBekerja('Aktif');
                    setValidationError(null);
                  }}
                  className="mt-1 w-4 h-4 text-yellow-500 focus:ring-yellow-400 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <div>
                  <div className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                    <span>Ya, Sedang Bekerja</span>
                    <span className="text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      Pekerja Aktif
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Karyawan swasta, buruh pabrik, ojek online, wirausaha, toko, atau pekerja lepas.
                  </p>
                </div>
              </label>

              <label
                className={`p-5 rounded-2xl border-2 flex items-start gap-4 cursor-pointer transition-all duration-300 ${
                  statusBekerja === 'Tidak Aktif'
                    ? 'border-yellow-400/90 bg-gradient-to-br from-yellow-950/40 to-slate-900 shadow-xl shadow-yellow-950/40 ring-2 ring-yellow-400/20'
                    : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="statusBekerja"
                  value="Tidak Aktif"
                  checked={statusBekerja === 'Tidak Aktif'}
                  onChange={() => {
                    setStatusBekerja('Tidak Aktif');
                    setValidationError(null);
                  }}
                  className="mt-1 w-4 h-4 text-yellow-500 focus:ring-yellow-400 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <div>
                  <div className="font-extrabold text-sm sm:text-base text-white">
                    Belum Bekerja / Belajar Penuh
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Fokus penuh mengikuti pembelajaran kesetaraan Rombel Karang Taruna setiap sesi.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Form Detail Pekerjaan (Hanya jika Sedang Bekerja) */}
          {statusBekerja === 'Aktif' ? (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="inline-flex items-center gap-2 text-xs font-black text-yellow-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rincian Informasi Tempat & Bidang Pekerjaan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Tempat Kerja */}
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    Nama Tempat Kerja / Toko / Perusahaan <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-tempat-kerja"
                      type="text"
                      value={namaTempatKerja}
                      onChange={(e) => {
                        setNamaTempatKerja(e.target.value);
                        setValidationError(null);
                      }}
                      required={statusBekerja === 'Aktif'}
                      placeholder="Contoh: PT Maju Bersama / Toko Sumber Makmur"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-semibold outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                    />
                    <Building className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {/* Jenis Pekerjaan / Jabatan */}
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    Jenis Pekerjaan / Jabatan <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-jenis-pekerjaan"
                      type="text"
                      value={jenisPekerjaan}
                      onChange={(e) => {
                        setJenisPekerjaan(e.target.value);
                        setValidationError(null);
                      }}
                      required={statusBekerja === 'Aktif'}
                      placeholder="Contoh: Operator Produksi, Kasir, Kurir, Mekanik"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-semibold outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                    />
                    <Tag className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {/* Bidang Usaha */}
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    Bidang Usaha <span className="text-yellow-400">*</span>
                  </label>
                  <input
                    id="input-bidang-usaha"
                    type="text"
                    value={bidangUsaha}
                    onChange={(e) => setBidangUsaha(e.target.value)}
                    placeholder="Contoh: Manufaktur, Kuliner, Retail, Jasa Otomotif"
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-semibold outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                  />
                </div>

                {/* Alamat Tempat Kerja */}
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    Alamat / Wilayah Tempat Kerja <span className="text-yellow-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-alamat-kerja"
                      type="text"
                      value={alamatTempatKerja}
                      onChange={(e) => {
                        setAlamatTempatKerja(e.target.value);
                        setValidationError(null);
                      }}
                      required={statusBekerja === 'Aktif'}
                      placeholder="Contoh: Jl. Daan Mogot KM 11, Jakarta Barat"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white text-sm font-semibold outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
                    />
                    <MapPin className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-xs text-slate-300">
                Status siswa tercatat sebagai <strong>Belajar Penuh</strong>. Anda siap melanjutkan ke Tahap 4 untuk menentukan kesepakatan jadwal belajar 3x seminggu.
              </p>
            </div>
          )}
        </div>

        {/* Navigasi Tombol */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            id="btn-back-step-2"
            onClick={onBackToStep2}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-bold text-sm transition cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke 2. Review Biodata</span>
          </button>

          <button
            type="submit"
            id="btn-confirm-step-3"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black px-8 py-4 rounded-2xl text-sm transition shadow-xl shadow-blue-600/30 cursor-pointer border border-blue-400/40"
          >
            <span>Simpan & Lanjut ke 4. Kesepakatan Jadwal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
