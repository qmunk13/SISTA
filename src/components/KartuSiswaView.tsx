import React, { useRef, useState } from 'react';
import {
  CreditCard,
  Printer,
  QrCode,
  ArrowLeft,
  Building2,
  Sparkles,
  Search,
  Users,
  CheckCircle2
} from 'lucide-react';
import { Siswa, User } from '../types';
import { getSiswaList, getSiswaByNisn } from '../lib/storage';
import { useStore } from '../store';

interface KartuSiswaViewProps {
  currentUser: User;
  siswaParam?: Siswa | null;
  onBack?: () => void;
}

export const KartuSiswaView: React.FC<KartuSiswaViewProps> = ({
  currentUser,
  siswaParam,
  onBack
}) => {
  const { settings } = useStore();
  const allSiswa = getSiswaList() || [];
  
  // Determine initial target student
  let initialSiswa: Siswa | null = siswaParam || null;
  if (!initialSiswa && currentUser.role === 'siswa') {
    const nisn = currentUser.nisn || currentUser.username;
    initialSiswa = getSiswaByNisn(nisn);
  }

  if (!initialSiswa) {
    initialSiswa = allSiswa[0] || {
      id: 'sw_demo',
      nisn: currentUser.nisn || '1001234561',
      nama: currentUser.nama,
      kelas: currentUser.kelas || '10-A',
      jenisKelamin: 'Laki-laki',
      nomorHpOrangTua: '081234567890',
      qrCodeUrl: currentUser.nisn || '1001234561'
    };
  }

  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(initialSiswa.id);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [selectedKelas, setSelectedKelas] = useState<string>('SEMUA');
  const [selectedStatus, setSelectedStatus] = useState<string>('SEMUA');

  const cardRef = useRef<HTMLDivElement>(null);

  const getStatusBadge = (statusStr?: string) => {
    const st = (statusStr || 'AKTIF').toUpperCase();
    if (st === 'AKTIF') {
      return {
        label: 'AKTIF',
        cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
      };
    }
    if (st === 'LULUS' || st === 'ALUMNI') {
      return {
        label: 'LULUS',
        cls: 'bg-purple-500/20 text-purple-300 border-purple-400/30'
      };
    }
    if (st === 'TIDAK AKTIF' || st === 'NONAKTIF') {
      return {
        label: 'TIDAK AKTIF',
        cls: 'bg-rose-500/20 text-rose-300 border-rose-400/30'
      };
    }
    if (st === 'PINDAH' || st === 'KELUAR') {
      return {
        label: st,
        cls: 'bg-amber-500/20 text-amber-300 border-amber-400/30'
      };
    }
    return {
      label: st || 'AKTIF',
      cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30'
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredSiswaList = allSiswa.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.nisn.includes(searchTerm);
    
    const sKelasClean = (s.kelas || s.kelasSaatIni || '').toUpperCase().trim();
    const sKelasId = (s.kelasId || '').toUpperCase().trim();
    const sStatusClean = (s.status || 'AKTIF').toUpperCase().trim();

    let matchesKelas = selectedKelas === 'SEMUA';
    if (!matchesKelas) {
      const selK = selectedKelas.toUpperCase().trim();
      if (selK === '13' || selK === 'L13' || selK.includes('ALUMNI') || selK.includes('LULUS')) {
        matchesKelas = sStatusClean === 'LULUS' || sStatusClean === 'ALUMNI' || sKelasClean.includes('13') || sKelasId === 'L13';
      } else {
        matchesKelas = sKelasClean === selK || sKelasId === selK || sKelasClean.includes(selK);
      }
    }

    let matchesStatus = selectedStatus === 'SEMUA';
    if (!matchesStatus) {
      const selSt = selectedStatus.toUpperCase().trim();
      if (selSt === 'LULUS' || selSt === 'ALUMNI') {
        matchesStatus = sStatusClean === 'LULUS' || sStatusClean === 'ALUMNI' || sKelasClean.includes('13') || sKelasId === 'L13';
      } else {
        matchesStatus = sStatusClean === selSt;
      }
    }

    return matchesSearch && matchesKelas && matchesStatus;
  });

  const selectedSiswa: Siswa | null = 
    filteredSiswaList.find(s => s.id === selectedSiswaId) || 
    filteredSiswaList[0] || 
    initialSiswa || 
    allSiswa[0] || 
    null;

  const uniqueKelas = Array.from(new Set(allSiswa.map(s => s.kelas))).filter(Boolean);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedKelas('SEMUA');
    setSelectedStatus('SEMUA');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full tracking-wider">
              Generator Kartu Otomatis
            </span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2 mt-1">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>Kartu Pelajar Digital & QR Code</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Pembuat Kartu Siswa Otomatis dengan QR Code NISN terintegrasi scanner presensi.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              batchMode ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{batchMode ? 'Mode Tunggal' : 'Cetak Massal'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Cetak Kartu ({batchMode ? filteredSiswaList.length : 1})</span>
          </button>
        </div>
      </div>

      {/* Selector Toolbar for Admins/Staff */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="SEMUA">Semua Kelas / Rombel ({allSiswa.length})</option>
            {uniqueKelas.map(k => (
              <option key={k} value={k}>Kelas {k}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="SEMUA">Semua Status Siswa</option>
            <option value="AKTIF">Status: AKTIF</option>
            <option value="TIDAK AKTIF">Status: TIDAK AKTIF</option>
            <option value="LULUS">Status: LULUS / ALUMNI</option>
            <option value="PINDAH">Status: PINDAH</option>
            <option value="KELUAR">Status: KELUAR</option>
            <option value="BELUM">Status: BELUM</option>
          </select>
        </div>

        {!batchMode && (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
            {filteredSiswaList.length === 0 ? (
              <span className="text-xs text-slate-400 italic p-2">Tidak ada siswa ditemukan dengan filter ini.</span>
            ) : (
              filteredSiswaList.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSiswaId(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    s.id === selectedSiswa?.id 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>{s.nama}</span>
                  <span className="text-[10px] opacity-75 font-mono">({s.nisn})</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* SINGLE CARD DISPLAY */}
      {!batchMode && (
        <div className="flex justify-center p-4">
          {!selectedSiswa ? (
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Siswa Tidak Ditemukan</h4>
              <p className="text-xs text-slate-500">
                Tidak ada data siswa yang cocok dengan filter pencarian, kelas, atau status yang dipilih.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            <div
              ref={cardRef}
              className="w-full max-w-md bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border-2 border-indigo-500/30 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[290px]"
            >
              {/* Background elements */}
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

              {/* Header Card */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-wide text-white font-display">KARTU PELAJAR DIGITAL</h3>
                    <p className="text-[9px] uppercase tracking-widest text-indigo-300 font-bold">Rombel KTCT Tambora</p>
                  </div>
                </div>
                {(() => {
                  const st = getStatusBadge(selectedSiswa?.status);
                  return (
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${st.cls}`}>
                      {st.label}
                    </span>
                  );
                })()}
              </div>

              {/* Center Info + Pas Foto + QR Code */}
              <div className="my-5 flex items-center justify-between gap-3">
                {/* Pas Foto Preview */}
                <div className="w-16 h-20 bg-slate-800/80 rounded-xl border border-white/20 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                  {selectedSiswa?.fotoUrl ? (
                    <img src={selectedSiswa.fotoUrl} alt={selectedSiswa.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-1">
                      <Users className="w-6 h-6 text-indigo-300 mx-auto opacity-70" />
                      <span className="text-[8px] text-slate-400 font-bold block mt-0.5">PAS FOTO</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nama Lengkap</p>
                    <h4 className="font-extrabold text-sm text-white leading-tight truncate">{selectedSiswa?.nama || '-'}</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">NISN</p>
                      <p className="font-mono text-xs font-extrabold text-amber-300">{selectedSiswa?.nisn || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Kelas</p>
                      <p className="font-bold text-xs text-indigo-200">{selectedSiswa?.kelas || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Real QR Code Generator */}
                <div className="p-1.5 bg-white rounded-xl shadow-xl border-2 border-indigo-400/40 shrink-0 text-center flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(selectedSiswa?.nisn || '0000000000')}`}
                    alt={`QR ${selectedSiswa?.nisn || ''}`}
                    className="w-16 h-16 rounded-lg object-contain bg-white"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <p className="text-[7px] font-mono font-bold text-slate-800 mt-0.5 uppercase tracking-tight">PRESENSI</p>
                </div>
              </div>

            {/* Bottom Card Footer */}
            <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[9px] text-slate-400">
              <span>Tahun Ajaran {settings?.tahunPelajaran || '2026/2027'}</span>
              <span className="font-mono text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> VALIDATED QR
              </span>
            </div>
          </div>
          )}
        </div>
      )}

      {/* BATCH PRINT MODE */}
      {batchMode && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-2 print:hidden">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Menampilkan {filteredSiswaList.length} kartu pelajar siap cetak (Status: {selectedStatus}, Rombel: {selectedKelas}). Gunakan tombol "Cetak Kartu" untuk mencetak ke kertas/PVC.</span>
            </span>
          </p>

          {filteredSiswaList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-800 text-sm">Siswa Tidak Ditemukan</h4>
              <p className="text-xs text-slate-500">
                Tidak ada data siswa yang sesuai dengan kombinasi pencarian, kelas, atau status yang dipilih.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSiswaList.map(s => {
              const st = getStatusBadge(s.status);
              return (
                <div
                  key={s.id}
                  className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-500/30 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[240px] break-inside-avoid"
                >
                  <div className="flex justify-between items-start border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs tracking-wide text-white">KARTU PELAJAR DIGITAL</h3>
                        <p className="text-[8px] uppercase tracking-widest text-indigo-300 font-bold">Rombel KTCT Tambora</p>
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>

                  <div className="my-3 flex items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nama Siswa</p>
                        <h4 className="font-extrabold text-sm text-white truncate">{s.nama}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">NISN</p>
                          <p className="font-mono text-xs font-bold text-amber-300">{s.nisn}</p>
                        </div>
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Kelas</p>
                          <p className="font-bold text-xs text-indigo-200">{s.kelas || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-indigo-300 shrink-0 text-center">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(s.nisn)}`}
                        alt={`QR ${s.nisn}`}
                        className="w-16 h-16 rounded object-contain bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[8px] text-slate-400">
                    <span>TA {settings?.tahunPelajaran || '2026/2027'}</span>
                    <span className="font-mono text-emerald-400 font-bold">QR VALIDATED</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </div>
  );
};
