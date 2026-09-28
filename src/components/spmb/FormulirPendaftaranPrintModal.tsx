import React from 'react';
import { X, Printer, User, QrCode } from 'lucide-react';
import { useStore } from '../../store';
import { OfficialKopSurat } from '../common/OfficialKopSurat';
import { triggerPrint } from '../../lib/utils';

interface FormulirPendaftaranPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant?: any;
}

export const FormulirPendaftaranPrintModal: React.FC<FormulirPendaftaranPrintModalProps> = ({
  isOpen,
  onClose,
  applicant
}) => {
  const { settings } = useStore();
  const [isBlankForm, setIsBlankForm] = React.useState<boolean>(false);

  if (!isOpen) return null;

  const currentApplicant = applicant || {};
  const regCode = isBlankForm ? 'REG-............' : (currentApplicant.id || currentApplicant.noRegistrasi || currentApplicant.kodePendaftaran || 'REG-2026-001');
  const curYear = new Date().getFullYear();
  const academicYear = settings?.tahunPelajaran || `${curYear}/${curYear + 1}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden text-slate-900 border border-slate-200">
        {/* Top Action Bar (Excluded from Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight">Formulir Pendaftaran SPMB Resmi (Cetak / PDF)</h2>
            <p className="text-[11px] text-slate-300">Format Blangko Fisik Dual Logo Karang Taruna Tambora &amp; Tut Wuri Handayani</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBlankForm(!isBlankForm)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isBlankForm 
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' 
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isBlankForm ? '✓ Mode: Blangko Kosong Fisik' : 'Ganti ke Blangko Kosong'}
            </button>
            <button
              onClick={() => triggerPrint()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak Formulir (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Form Sheet */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-serif print:p-0 print:m-0" id="printable-spmb-form">
          <div className="max-w-3xl mx-auto space-y-4 text-slate-900">
            {/* Dual Logo Kop Surat */}
            <OfficialKopSurat
              title="FORMULIR PENDAFTARAN PESERTA DIDIK BARU (SPMB)"
              nomorSurat={`REG: ${regCode}`}
              subTitle={`Tahun Pelajaran ${academicYear}`}
            />

            {/* Quick Barcode & Photo Header Row */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-300 text-xs font-sans print:bg-transparent print:border-black">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white border border-slate-400 p-1 flex items-center justify-center">
                  <QrCode size={38} className="text-slate-900" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">KODE REGISTRASI RESMI:</span>
                  <span className="font-mono font-black text-sm text-indigo-950">{regCode}</span>
                  <span className="text-[10px] text-slate-600 block">
                    Jalur: {isBlankForm ? '[  ] Reguler   [  ] Zonasi   [  ] Prestasi / Afirmasi' : (currentApplicant.jalur || currentApplicant.jalurMasuk || 'Reguler / Zonasi')}
                  </span>
                </div>
              </div>

              {/* Pas Foto Box */}
              <div className="w-20 h-24 border-2 border-dashed border-slate-400 bg-white flex flex-col items-center justify-center text-center p-1 shrink-0">
                {!isBlankForm && currentApplicant.fileUrls?.pasFoto ? (
                  <img src={currentApplicant.fileUrls.pasFoto} alt="Pas Foto" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <User size={20} className="text-slate-400 mb-1" />
                    <span className="text-[8px] font-bold text-slate-500 uppercase leading-none">Pas Foto<br />3 x 4</span>
                  </>
                )}
              </div>
            </div>

            {/* I. DATA CALON PESERTA DIDIK */}
            <div className="space-y-1 font-sans text-xs">
              <h4 className="font-black text-xs uppercase bg-slate-100 p-1.5 border border-slate-300 print:bg-slate-200">
                I. IDENTITAS CALON PESERTA DIDIK
              </h4>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="w-48 py-1 text-slate-600 font-medium">1. Nama Lengkap (Sesuai Akta)</td>
                    <td className="w-4 py-1 font-bold">:</td>
                    <td className="py-1 font-black text-slate-900 uppercase">
                      {isBlankForm ? '....................................................................................................' : (currentApplicant.nama || currentApplicant.namaCalonSiswa || '-')}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">2. NISN / NIK</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1 font-mono">
                      {isBlankForm ? '........................................ / ........................................' : `${currentApplicant.nisn || '-'} / ${currentApplicant.nik || '-'}`}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">3. Tempat, Tanggal Lahir</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1">
                      {isBlankForm ? '........................................, ...... / ...... / ..........' : `${currentApplicant.tempatLahir || 'Jakarta'}, ${currentApplicant.tglLahir || '-'}`}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">4. Jenis Kelamin / Agama</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1">
                      {isBlankForm ? '[  ] Laki-laki    [  ] Perempuan  •  Agama: ........................................' : `${(currentApplicant.jk || 'L').toUpperCase().startsWith('L') ? 'Laki-laki' : 'Perempuan'} • ${currentApplicant.agama || 'Islam'}`}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">5. Alamat Tempat Tinggal</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1">
                      {isBlankForm ? '....................................................................................................' : (currentApplicant.alamat || 'Kecamatan Tambora, Jakarta Barat')}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">6. Asal Sekolah Sebelumnya</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1 font-medium">
                      {isBlankForm ? '....................................................................................................' : (currentApplicant.asalSekolah || '-')}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">7. Program Kesetaraan Dipilih</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1 font-bold text-indigo-900">
                      {isBlankForm ? '[  ] Paket A (Setara SD)    [  ] Paket B (Setara SMP)    [  ] Paket C (Setara SMA)' : (currentApplicant.pilihanJurusan || 'Paket A (Setara SD)')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* II. DATA ORANG TUA / WALI */}
            <div className="space-y-1 font-sans text-xs">
              <h4 className="font-black text-xs uppercase bg-slate-100 p-1.5 border border-slate-300 print:bg-slate-200">
                II. IDENTITAS ORANG TUA / WALI
              </h4>
              <table className="w-full border-collapse text-xs">
                <tbody>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="w-48 py-1 text-slate-600 font-medium">1. Nama Ayah Kandung / NIK</td>
                    <td className="w-4 py-1 font-bold">:</td>
                    <td className="py-1 font-bold">
                      {isBlankForm ? '....................................................................................................' : `${currentApplicant.namaAyah || '-'} ${currentApplicant.nikAyah ? `(NIK: ${currentApplicant.nikAyah})` : ''}`}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">2. Pekerjaan Ayah</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1">
                      {isBlankForm ? '....................................................................................................' : (currentApplicant.pekerjaanAyah || 'Wiraswasta / Karyawan')}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">3. Nama Ibu Kandung / NIK</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1 font-bold">
                      {isBlankForm ? '....................................................................................................' : `${currentApplicant.namaIbu || '-'} ${currentApplicant.nikIbu ? `(NIK: ${currentApplicant.nikIbu})` : ''}`}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200 py-1">
                    <td className="py-1 text-slate-600 font-medium">4. Nomor HP / WhatsApp Aktif</td>
                    <td className="py-1 font-bold">:</td>
                    <td className="py-1 font-mono font-bold text-emerald-800">
                      {isBlankForm ? '....................................................................................................' : (currentApplicant.noHp || currentApplicant.kontak || '-')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* III. KELENGKAPAN BERKAS FISIK */}
            <div className="space-y-1 font-sans text-xs">
              <h4 className="font-black text-xs uppercase bg-slate-100 p-1.5 border border-slate-300 print:bg-slate-200">
                III. CEKLIS KELENGKAPAN DOKUMEN PERSYARATAN
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 py-1">
                {[
                  '1. Fotokopi Kartu Keluarga (KK)',
                  '2. Fotokopi Akta Kelahiran',
                  '3. Fotokopi KTP Orang Tua / Wali',
                  '4. Pas Foto 3x4 (3 Lembar)',
                  '5. Fotokopi Ijazah / SKL Asal',
                  '6. Surat Pernyataan Kepatuhan Tata Tertib'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border border-slate-700 flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pakta Pernyataan & Tanda Tangan */}
            <div className="pt-4 font-sans text-xs space-y-6">
              <p className="text-[11px] text-slate-700 text-justify leading-relaxed">
                Data yang saya cantumkan di atas adalah benar dan sesuai dengan dokumen asli yang sah. Saya bersedia mematuhi segala peraturan dan tata tertib yang berlaku di Rombongan Belajar Karang Taruna Kecamatan Tambora.
              </p>

              <div className="grid grid-cols-2 text-center text-xs">
                <div className="space-y-1">
                  <p>Petugas Verifikator Panitia,</p>
                  <div className="h-16" />
                  <p className="font-bold underline uppercase">( Panitia SPMB Tambora )</p>
                </div>

                <div className="space-y-1">
                  <p>Jakarta, .............................. {curYear}</p>
                  <p>Calon Peserta Didik / Orang Tua,</p>
                  <div className="h-16" />
                  <p className="font-bold underline uppercase">( {applicant.nama || applicant.namaCalonSiswa} )</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
