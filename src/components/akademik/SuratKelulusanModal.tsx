import React, { useState } from 'react';
import { X, Printer, GraduationCap, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { useStore } from '../../store';
import { OfficialKopSurat } from '../common/OfficialKopSurat';
import { triggerPrint } from '../../lib/utils';

interface SuratKelulusanModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: any;
}

export const SuratKelulusanModal: React.FC<SuratKelulusanModalProps> = ({
  isOpen,
  onClose,
  student
}) => {
  const { settings, students } = useStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(student?.id || '');
  const [isBlankSkl, setIsBlankSkl] = useState<boolean>(false);

  const activeStudent = student || students.find(s => s.id === selectedStudentId) || students[0] || {};

  if (!isOpen) return null;

  const curYear = new Date().getFullYear();
  const academicYear = settings?.tahunPelajaran || `${curYear}/${curYear + 1}`;
  const noSurat = `421.2/088/SKL-KTCT/${curYear}`;
  const tanggalSurat = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const nilaiMapelList = [
    { mapel: 'Pendidikan Agama dan Budi Pekerti', nilai: 88 },
    { mapel: 'Pendidikan Pancasila (PPKn)', nilai: 86 },
    { mapel: 'Bahasa Indonesia', nilai: 90 },
    { mapel: 'Matematika', nilai: 85 },
    { mapel: 'Ilmu Pengetahuan Alam & Sosial (IPAS)', nilai: 87 },
    { mapel: 'Bahasa Inggris', nilai: 86 },
    { mapel: 'Seni Budaya & Prakarya', nilai: 89 },
    { mapel: 'Pendidikan Jasmani & Olahraga', nilai: 88 }
  ];

  const rataRata = (nilaiMapelList.reduce((acc, m) => acc + m.nilai, 0) / nilaiMapelList.length).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden text-slate-900 border border-slate-200">
        {/* Top Modal Bar (Excluded from Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <GraduationCap size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">Cetak Surat Keterangan Lulus (SKL) Resmi</h2>
              <p className="text-[11px] text-slate-300">Format Resmi Dual Logo Karang Taruna Tambora &amp; Tut Wuri Handayani</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBlankSkl(!isBlankSkl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isBlankSkl 
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' 
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="Cetak sebagai blangko SKL kosong untuk pengisian manual fisik"
            >
              {isBlankSkl ? '✓ Mode: Blangko Kosong' : 'Blangko SKL Kosong'}
            </button>
            <button
              onClick={() => triggerPrint()}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak SKL (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Printable Canvas */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-serif print:p-0 print:m-0" id="printable-skl-content">
          <div className="max-w-3xl mx-auto space-y-5 text-slate-900">
            {/* Dual Logo Official Header */}
            <OfficialKopSurat
              title="SURAT KETERANGAN KELULUSAN (SKL)"
              nomorSurat={noSurat}
              subTitle={`Tahun Pelajaran ${academicYear}`}
            />

            {/* Mukaddimah / Pernyataan */}
            <div className="text-xs sm:text-[13px] leading-relaxed text-justify space-y-3 font-sans">
              <p>
                Yang bertanda tangan di bawah ini, Kepala Pusat Kegiatan Belajar Masyarakat / Pimpinan Rombongan Belajar Karang Taruna Kecamatan Tambora, Kota Administrasi Jakarta Barat, menerangkan dengan sesungguhnya bahwa:
              </p>

              {/* Biodata Siswa */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 font-medium my-2 text-xs sm:text-[13px] print:bg-transparent print:border print:border-slate-800">
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-600">Nama Lengkap</span>
                  <span className="col-span-8 font-black text-slate-950 uppercase">
                    : {isBlankSkl ? '....................................................................................................' : (activeStudent.name || activeStudent.namaLengkap || '-')}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-600">Nomor Induk Siswa (NIS)</span>
                  <span className="col-span-8 font-mono font-bold">
                    : {isBlankSkl ? '........................................' : (activeStudent.nis || '202604001')}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-600">NISN / NIK</span>
                  <span className="col-span-8 font-mono">
                    : {isBlankSkl ? '........................................ / ........................................' : `${activeStudent.nisn || '-'} / ${activeStudent.nik || '-'}`}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-600">Tempat, Tanggal Lahir</span>
                  <span className="col-span-8">
                    : {isBlankSkl ? '........................................, ...... / ...... / ..........' : `${activeStudent.birthPlace || activeStudent.tempatLahir || 'Jakarta'}, ${activeStudent.birthDate || activeStudent.tanggalLahir || '12 Mei 2008'}`}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-600">Nama Orang Tua / Wali</span>
                  <span className="col-span-8">
                    : {isBlankSkl ? '....................................................................................................' : (activeStudent.parentName || activeStudent.namaAyah || 'Orang Tua Peserta Didik')}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-600">Program / Jenjang</span>
                  <span className="col-span-8 font-bold text-indigo-950">
                    : {isBlankSkl ? '[  ] Paket A (Setara SD)   [  ] Paket B (Setara SMP)   [  ] Paket C (Setara SMA)' : (activeStudent.jenjang || 'Pendidikan Kesetaraan (Paket A/B/C)')}
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 text-slate-600">Nomor Pokok Siswa (PDKT)</span>
                  <span className="col-span-8 font-mono font-bold text-purple-900">
                    : {isBlankSkl ? 'PDKT-....................' : (activeStudent.nopdkt || activeStudent.idNumber || 'PDKT-2026-001')}
                  </span>
                </div>
              </div>

              {/* Kalimat Pernyataan Kelulusan */}
              <p>
                Berdasarkan kriteria kelulusan peserta didik, hasil evaluasi pembelajaran semester ganjil dan genap, serta rapat pleno dewan guru pendidik Rombongan Belajar Karang Taruna Kecamatan Tambora, nama tersebut di atas dinyatakan:
              </p>

              {/* Status Box */}
              <div className="py-2.5 text-center my-2">
                <div className="inline-block border-2 border-slate-900 px-10 py-2 rounded-xl bg-emerald-50 text-emerald-950 font-black text-base sm:text-lg tracking-widest uppercase print:bg-white">
                  L U L U S
                </div>
              </div>

              <p>
                Dengan rincian nilai capaian asesmen sumatif akhir jenjang sebagai berikut:
              </p>

              {/* Tabel Nilai */}
              <table className="w-full border-collapse border border-slate-900 text-xs my-2">
                <thead>
                  <tr className="bg-slate-100 print:bg-slate-200 text-slate-950 font-black">
                    <th className="border border-slate-900 p-2 text-center w-12">No</th>
                    <th className="border border-slate-900 p-2 text-left">Mata Pelajaran</th>
                    <th className="border border-slate-900 p-2 text-center w-28">Nilai Ujian</th>
                    <th className="border border-slate-900 p-2 text-center w-36">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {nilaiMapelList.map((m, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-900 p-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-slate-900 p-1.5 font-medium">{m.mapel}</td>
                      <td className="border border-slate-900 p-1.5 text-center font-mono font-bold">
                        {isBlankSkl ? '......' : m.nilai}
                      </td>
                      <td className="border border-slate-900 p-1.5 text-center font-semibold text-emerald-800 print:text-black">
                        {isBlankSkl ? '............' : 'Tuntas'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black">
                    <td colSpan={2} className="border border-slate-900 p-2 text-right uppercase">Rata-rata Nilai Akhir:</td>
                    <td className="border border-slate-900 p-2 text-center font-mono text-sm text-indigo-950 print:text-black">
                      {isBlankSkl ? '......' : rataRata}
                    </td>
                    <td className="border border-slate-900 p-2 text-center text-emerald-800 print:text-black">
                      {isBlankSkl ? '............' : 'Sangat Baik (A)'}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="text-[12px] text-slate-700">
                Surat Keterangan Lulus ini bersifat sah dan dapat dipergunakan untuk keperluan melanjutkan jenjang pendidikan yang lebih tinggi atau kelengkapan administrasi lainnya sampai dengan diterbitkannya Ijazah resmi.
              </p>
            </div>

            {/* Tanda Tangan & Legalisasi */}
            <div className="pt-6 grid grid-cols-2 text-xs font-sans text-slate-900">
              <div className="space-y-1">
                <p className="font-bold">Mengetahui Orang Tua / Wali,</p>
                <div className="h-20" />
                <p className="font-bold underline uppercase">
                  ( {activeStudent.parentName || activeStudent.namaAyah || 'Orang Tua / Wali Siswa'} )
                </p>
              </div>

              <div className="text-right space-y-1">
                <p>Jakarta, {tanggalSurat}</p>
                <p className="font-bold">Kepala Satdik Rombel KTCT Tambora,</p>
                <div className="h-14 flex items-center justify-end pr-8">
                  {/* Cap Stempel Representatif */}
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-700/60 flex items-center justify-center text-[8px] font-black text-indigo-800/70 uppercase text-center leading-tight rotate-12">
                    ROMBEL<br />KTCT<br />TAMBORA
                  </div>
                </div>
                <p className="font-black underline uppercase text-slate-950">
                  {settings?.principalName || 'H. Ahmad Sobari, S.Pd., M.M.'}
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  NIP/NUPTK: {settings?.principalNip && settings.principalNip !== '-' ? settings.principalNip : '19750815 200212 1 004'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
