import React, { useState, useEffect } from 'react';
import { CreditCard, QrCode, Printer, Download, Search, User, Sparkles, CheckCircle } from 'lucide-react';
import { Siswa } from '../../types';
import { db } from '../../data/db';

export default function PerpusKartuAnggotaTab() {
  const [students, setStudents] = useState<Siswa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Siswa | null>(null);

  useEffect(() => {
    const list = db.get<Siswa>('siswa');
    setStudents(list);
    if (list.length > 0) {
      setSelectedStudent(list[0]);
    }
  }, []);

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.nama.toLowerCase().includes(q) || (s.nis && s.nis.toLowerCase().includes(q)) || (s.kelas && s.kelas.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student Selector List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <User size={16} className="text-amber-500" />
              <span>Daftar Anggota / Siswa</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400 font-bold">{students.length} Siswa</span>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredStudents.map((s) => {
              const isSelected = selectedStudent?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`w-full p-2.5 rounded-2xl text-left text-xs transition flex items-center justify-between border cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                      : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-extrabold block truncate">{s.nama}</span>
                    <span className="text-[10px] text-slate-500 font-mono">NIS: {s.nis || s.id} • Kelas {s.kelas || '5A'}</span>
                  </div>
                  {isSelected && <CheckCircle size={14} className="text-amber-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Card Preview & Print Settings */}
        <div className="lg:col-span-2 space-y-5">
          {selectedStudent ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Kartu Anggota Perpustakaan Digital
                  </h3>
                  <p className="text-xs text-slate-400">Siap cetak standar ukuran ID Card ISO CR-80</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>Cetak Kartu</span>
                  </button>
                </div>
              </div>

              {/* Physical Card Mockup Preview (CR-80 ratio) */}
              <div className="flex justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div className="w-full max-w-md bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 text-white rounded-2xl shadow-xl overflow-hidden border border-amber-600/30 relative p-5 flex flex-col justify-between aspect-[1.586/1]">
                  {/* Top Bar on Card */}
                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 text-amber-300">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black tracking-wide uppercase">PERPUSTAKAAN DIGITAL</h4>
                        <p className="text-[9px] text-amber-200 font-medium">SISTA ROMBEL TERPADU</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full uppercase">
                      ANGGOTA RESMI
                    </span>
                  </div>

                  {/* Body on Card */}
                  <div className="flex items-center gap-4 my-auto">
                    {/* Photo Box */}
                    <div className="w-16 h-20 rounded-xl bg-white/10 border-2 border-amber-400/40 overflow-hidden flex items-center justify-center shrink-0">
                      {selectedStudent.fotoUrl ? (
                        <img src={selectedStudent.fotoUrl} alt={selectedStudent.nama} className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-amber-200/60" />
                      )}
                    </div>

                    {/* Student Identity */}
                    <div className="min-w-0 space-y-0.5 text-left">
                      <p className="text-[10px] text-amber-200/80 font-mono">NOMOR ANGGOTA / NIS</p>
                      <p className="text-sm font-black font-mono tracking-wider text-amber-300">
                        {selectedStudent.nis || selectedStudent.id}
                      </p>
                      <h5 className="text-sm font-extrabold text-white truncate max-w-[200px]">
                        {selectedStudent.nama}
                      </h5>
                      <p className="text-[11px] text-amber-200 font-medium">
                        Kelas: {selectedStudent.kelas || '5A'} • Siswa Aktif
                      </p>
                    </div>
                  </div>

                  {/* Bottom Bar: Barcode Simulator & Validity */}
                  <div className="border-t border-amber-500/30 pt-2.5 flex items-center justify-between">
                    <div className="text-[8px] text-amber-300/80">
                      <span>Berlaku s.d: </span>
                      <strong className="text-white font-mono">30 JUNI 2027</strong>
                    </div>

                    {/* Barcode Lines */}
                    <div className="bg-white px-2 py-1 rounded-md text-slate-900 font-mono text-[10px] tracking-[3px] font-bold">
                      ||| |||| || |||
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">📌 Petunjuk Cetak & Penggunaan:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-800">
                  <li>Kartu dapat dicetak pada kertas PVC Card atau kertas photo tebal 260gr.</li>
                  <li>Barcode pada kartu dapat langsung dipindai pada meja sirkulasi perpus untuk peminjaman mandiri cepat.</li>
                  <li>Masa aktif kartu berlaku selama siswa berstatus aktif terdaftar di sekolah.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              Pilih siswa dari daftar di samping untuk melihat preview kartu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
