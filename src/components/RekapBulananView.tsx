import React, { useState } from 'react';
import {
  CalendarCheck,
  FileSpreadsheet,
  Filter,
  Users
} from 'lucide-react';
import { User } from '../types';
import { getSiswaList, getKelasList, getAbsensiRecords, getTodayDateString } from '../lib/storage';
import { exportRekapBulananToExcel } from '../lib/exportUtils';

interface RekapBulananViewProps {
  currentUser: User;
}

export const RekapBulananView: React.FC<RekapBulananViewProps> = ({ currentUser }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(getTodayDateString().substring(0, 7)); // 'YYYY-MM'
  const [selectedKelas, setSelectedKelas] = useState<string>('');

  const classes = getKelasList();
  
  // Set default selected class if empty
  if (!selectedKelas && classes.length > 0) {
    setSelectedKelas(classes[0]);
  }

  const studentList = getSiswaList(selectedKelas);
  const allRecords = getAbsensiRecords();

  // Parse Year & Month
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Build matrix map for each student
  const matrixData = studentList.map(siswa => {
    const dailyMap: Record<number, string> = {};
    let hadir = 0, sakit = 0, izin = 0, alpa = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayFormatted = day < 10 ? `0${day}` : `${day}`;
      const fullDate = `${selectedMonth}-${dayFormatted}`;
      const rec = allRecords.find(r => r.tanggal === fullDate && r.nisn.replace(/[^a-zA-Z0-9]/g, '') === siswa.nisn.replace(/[^a-zA-Z0-9]/g, ''));

      if (rec) {
        dailyMap[day] = rec.status;
        if (rec.status === 'Hadir') hadir++;
        else if (rec.status === 'Sakit') sakit++;
        else if (rec.status === 'Izin') izin++;
        else if (rec.status === 'Alpa') alpa++;
      } else {
        // Check if weekend (Sunday = 0)
        const d = new Date(year, month - 1, day);
        if (d.getDay() === 0) {
          dailyMap[day] = 'L'; // Libur Minggu
        } else {
          dailyMap[day] = '-';
        }
      }
    }

    return {
      siswa,
      dailyMap,
      summary: { hadir, sakit, izin, alpa }
    };
  });

  const handleExportExcel = () => {
    exportRekapBulananToExcel(selectedKelas, selectedMonth, matrixData, daysInMonth);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            <span>Rekapitulasi Matriks Bulanan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Tampilan rekap kehadiran tanggal 1 sampai {daysInMonth} bulan {selectedMonth}.</p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Rekap Matriks Excel</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Bulan</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Kelas</label>
          <select
            value={selectedKelas}
            onChange={e => setSelectedKelas(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 outline-none"
          >
            {classes.map(c => (
              <option key={c} value={c}>Kelas {c}</option>
            ))}
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600 ml-auto flex-wrap pt-3 sm:pt-0">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 text-white rounded text-[9px] flex items-center justify-center font-bold">H</span> Hadir</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 text-white rounded text-[9px] flex items-center justify-center font-bold">S</span> Sakit</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 text-white rounded text-[9px] flex items-center justify-center font-bold">I</span> Izin</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-500 text-white rounded text-[9px] flex items-center justify-center font-bold">A</span> Alpa</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-300 text-slate-700 rounded text-[9px] flex items-center justify-center font-bold">L</span> Libur</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
          <span>Matriks Presensi Kelas {selectedKelas} - Bulan {selectedMonth}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[9px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-2 py-2 text-center w-8 sticky left-0 bg-slate-50 z-10">No</th>
                <th className="px-3 py-2 min-w-[160px] sticky left-8 bg-slate-50 z-10 border-r border-slate-200">Nama Siswa</th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                  <th key={d} className="px-1 py-2 text-center w-7 border-r border-slate-200">{d}</th>
                ))}
                <th className="px-2 py-2 text-center bg-emerald-50 text-emerald-800 font-extrabold w-8">H</th>
                <th className="px-2 py-2 text-center bg-amber-50 text-amber-800 font-extrabold w-8">S</th>
                <th className="px-2 py-2 text-center bg-blue-50 text-blue-800 font-extrabold w-8">I</th>
                <th className="px-2 py-2 text-center bg-rose-50 text-rose-800 font-extrabold w-8">A</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {matrixData.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 6} className="py-12 text-center text-slate-400 font-semibold">
                    Tidak ada siswa ditemukan di kelas {selectedKelas}
                  </td>
                </tr>
              ) : (
                matrixData.map((row, idx) => (
                  <tr key={row.siswa.id} className="hover:bg-slate-50 transition">
                    <td className="px-2 py-2 text-center text-slate-400 font-mono sticky left-0 bg-white z-10">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-800 truncate sticky left-8 bg-white z-10 border-r border-slate-200">
                      {row.siswa.nama}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                      const code = row.dailyMap[d] || '-';
                      const badgeClasses = {
                        Hadir: 'bg-emerald-500 text-white font-bold',
                        Sakit: 'bg-amber-500 text-white font-bold',
                        Izin: 'bg-blue-500 text-white font-bold',
                        Alpa: 'bg-rose-500 text-white font-bold',
                        L: 'bg-slate-200 text-slate-500'
                      }[code] || 'text-slate-300';

                      const displayChar = code === 'Hadir' ? 'H' : code === 'Sakit' ? 'S' : code === 'Izin' ? 'I' : code === 'Alpa' ? 'A' : code === 'L' ? 'L' : '.';

                      return (
                        <td key={d} className="px-0.5 py-1 text-center border-r border-slate-100">
                          <span className={`inline-block w-5 h-5 leading-5 rounded text-[9px] text-center ${badgeClasses}`}>
                            {displayChar}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-extrabold text-emerald-700 bg-emerald-50/50">{row.summary.hadir}</td>
                    <td className="px-2 py-2 text-center font-extrabold text-amber-700 bg-amber-50/50">{row.summary.sakit}</td>
                    <td className="px-2 py-2 text-center font-extrabold text-blue-700 bg-blue-50/50">{row.summary.izin}</td>
                    <td className="px-2 py-2 text-center font-extrabold text-rose-700 bg-rose-50/50">{row.summary.alpa}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
