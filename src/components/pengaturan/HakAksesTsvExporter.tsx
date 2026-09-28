import React, { useState } from 'react';
import { Sparkles, Copy, Check, Download, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { INITIAL_SAMPLE_DATA } from '../../data/schemas';
import { ALL_32_ROLES } from '../../data/rolesData';

export default function HakAksesTsvExporter() {
  const [copied, setCopied] = useState(false);

  const rawHakAkses = INITIAL_SAMPLE_DATA.HAK_AKSES || [];

  const handleCopy15ColumnsTsv = () => {
    const roleIdMap: Record<string, string> = {};
    ALL_32_ROLES.forEach(r => {
      roleIdMap[r.namaRole] = r.id;
    });

    const headers = [
      'HakAksesID',
      'RoleID',
      'MenuID',
      'Create',
      'Read',
      'Update',
      'Delete',
      'Approve',
      'Export',
      'Import',
      'role',
      'dapatLihat',
      'dapatTambah',
      'dapatEdit',
      'dapatHapus'
    ];

    const rows = rawHakAkses.map(item => {
      const roleId = roleIdMap[item.role] || '';
      const canCreate = item.dapatTambah;
      const canRead = item.dapatLihat;
      const canUpdate = item.dapatEdit;
      const canDelete = item.dapatHapus;
      const canApprove = ['SUPERADMIN', 'ADMIN', 'KETUA_YAYASAN', 'KEPALA_SEKOLAH', 'WAKASEK_KURIKULUM', 'WAKASEK_KESISWAAN', 'BK', 'BENDAHARA'].includes(item.role) ? 'YA' : 'TIDAK';
      const canExport = canRead === 'YA' && !['GUEST', 'CALON_SISWA', 'ORTU_CALON_SISWA'].includes(item.role) ? 'YA' : 'TIDAK';
      const canImport = ['SUPERADMIN', 'ADMIN', 'SYSTEM_ADMINISTRATOR', 'DEVELOPER', 'OPERATOR'].includes(item.role) ? 'YA' : 'TIDAK';

      return [
        item.id,
        roleId,
        item.menuId,
        canCreate,
        canRead,
        canUpdate,
        canDelete,
        canApprove,
        canExport,
        canImport,
        item.role,
        item.dapatLihat,
        item.dapatTambah,
        item.dapatEdit,
        item.dapatHapus
      ].join('\t');
    });

    const fullTsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(fullTsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    });
  };

  const handleDownloadCsv = () => {
    const headers = ['id', 'role', 'menuId', 'dapatLihat', 'dapatTambah', 'dapatEdit', 'dapatHapus'];
    const rows = rawHakAkses.map(item => [
      item.id,
      item.role,
      item.menuId,
      item.dapatLihat,
      item.dapatTambah,
      item.dapatEdit,
      item.dapatHapus
    ].join(','));

    const fullCsv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'HAK_AKSES_MASTER_DATA.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy7ColumnsTsv = () => {
    const headers = ['id', 'role', 'menuId', 'dapatLihat', 'dapatTambah', 'dapatEdit', 'dapatHapus'];
    const rows = rawHakAkses.map(item => [
      item.id,
      item.role,
      item.menuId,
      item.dapatLihat,
      item.dapatTambah,
      item.dapatEdit,
      item.dapatHapus
    ].join('\t'));

    const fullTsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(fullTsv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    });
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Salin / Unduh Master Data HAK_AKSES ({rawHakAkses.length} Baris)</h3>
            <p className="text-xs text-slate-500 font-medium">Klik tombol di bawah untuk menyalin format lengkap 15 kolom (HakAksesID, RoleID, MenuID, CRUD, dll) atau 7 kolom.</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCopy15ColumnsTsv}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin 15 Kolom Lengkap (TSV)'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy7ColumnsTsv}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Salin format ringkas 7 kolom"
          >
            <Copy size={14} />
            <span>7 Kolom</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Download CSV file"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {copied && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <Check size={16} className="text-emerald-600 flex-shrink-0" />
          <span><strong>134 baris berhasil disalin!</strong> Sekarang buka Google Spreadsheet pada sheet <code>HAK_AKSES</code>, pilih sel <code>A1</code>, lalu tekan <code>Ctrl + V</code>.</span>
        </div>
      )}
    </div>
  );
}
