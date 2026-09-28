import React from 'react';
import { useStore } from '../../store';

interface OfficialKopSuratProps {
  title?: string;
  nomorSurat?: string;
  subTitle?: string;
  compact?: boolean;
  showDocumentTitle?: boolean;
}

export const OfficialKopSurat: React.FC<OfficialKopSuratProps> = ({
  title,
  nomorSurat,
  subTitle,
  compact = false,
  showDocumentTitle = true
}) => {
  const { settings } = useStore();

  const schoolName = settings?.schoolName || 'ROMBEL KARANG TARUNA TAMBORA';
  const schoolAddress = settings?.schoolAddress || 'Gedung Sasana Krida Karang Taruna, Jl. Laksa II No.12, RT.012 RW.002, Kel. Jembatan Lima, Kec. Tambora, Jakarta Barat';
  const schoolPhone = settings?.schoolPhone || '0851-4180-9991';
  const schoolEmail = settings?.schoolEmail || 'rombelkatartambora@gmail.com';
  const npsn = (settings as any)?.npsn || settings?.schoolNpsn || 'P9960001';

  return (
    <div className="w-full text-slate-950 font-serif select-text">
      {/* Dual Logo Official Letterhead */}
      <div className={`flex items-center justify-between gap-4 pb-3 ${compact ? 'px-2' : 'px-4'}`}>
        {/* Logo Kiri: Karang Taruna Tambora / Lembaga */}
        <div className="shrink-0 flex items-center justify-center">
          <img
            src={settings?.schoolLogoUrl || '/logo_rombel.svg'}
            alt="Logo Karang Taruna Tambora"
            className={`${compact ? 'w-16 h-16' : 'w-20 h-20 sm:w-24 sm:h-24'} object-contain`}
            onError={(e: any) => {
              e.currentTarget.src = '/logo-rombel.png';
            }}
          />
        </div>

        {/* Teks Kop Tengah */}
        <div className="flex-1 text-center space-y-0.5">
          <h4 className={`${compact ? 'text-[11px]' : 'text-xs sm:text-sm'} font-bold tracking-widest text-slate-800 uppercase`}>
            PENGURUS KARANG TARUNA KECAMATAN TAMBORA
          </h4>
          <h2 className={`${compact ? 'text-sm' : 'text-base sm:text-lg'} font-black tracking-tight text-slate-950 uppercase leading-snug`}>
            PUSAT KEGIATAN BELAJAR & PENDIDIKAN INKLUSIF
          </h2>
          <h3 className={`${compact ? 'text-xs' : 'text-sm sm:text-base'} font-black text-indigo-950 uppercase`}>
            {schoolName}
          </h3>
          <p className={`${compact ? 'text-[9.5px]' : 'text-[10px] sm:text-[11px]'} text-slate-700 leading-tight font-sans font-medium`}>
            {schoolAddress}
          </p>
          <p className={`${compact ? 'text-[9px]' : 'text-[10px] sm:text-[10.5px]'} text-slate-600 font-sans`}>
            <span className="font-semibold">NPSN:</span> {npsn} &bull; <span className="font-semibold">Telp/WA:</span> {schoolPhone} &bull; <span className="font-semibold">Email:</span> {schoolEmail}
          </p>
        </div>

        {/* Logo Kanan: Lambang Pendidikan Nasional (Tut Wuri Handayani) */}
        <div className="shrink-0 flex items-center justify-center">
          <img
            src="/logo_tutwuri.svg"
            alt="Lambang Tut Wuri Handayani"
            className={`${compact ? 'w-16 h-16' : 'w-20 h-20 sm:w-24 sm:h-24'} object-contain`}
          />
        </div>
      </div>

      {/* Garis Ganda Pemisah Khas Kop Dinas Resmi (Garis Tebal 3px + Garis Tipis 1px) */}
      <div className="w-full">
        <div className="border-b-[3px] border-slate-900 w-full mb-[2px]" />
        <div className="border-b-[1px] border-slate-900 w-full mb-4" />
      </div>

      {/* Judul Dokumen (Jika Diaktifkan) */}
      {showDocumentTitle && title && (
        <div className="text-center space-y-1 mb-4">
          <h3 className={`${compact ? 'text-sm' : 'text-base sm:text-lg'} font-black uppercase tracking-wider text-slate-950 underline decoration-2 underline-offset-4`}>
            {title}
          </h3>
          {nomorSurat && (
            <p className="text-xs font-mono font-bold text-slate-700">
              Nomor: {nomorSurat}
            </p>
          )}
          {subTitle && (
            <p className="text-xs text-slate-600 font-medium italic">
              {subTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
