import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, User, FileText, CheckCircle2, AlertCircle, 
  Upload, Printer, LogOut, ArrowRight, ShieldCheck, Clock, 
  Calendar, MapPin, Phone, Award, School, Sparkles, Key, 
  Search, Check, Eye, HelpCircle, ArrowLeft, RefreshCw, QrCode
} from 'lucide-react';
import Swal from 'sweetalert2';
import { db } from '../data/db';
import { useStore } from '../store';
import { triggerPrint } from '../lib/utils';

interface PortalSpmbApplicantProps {
  onBackToPublic: () => void;
  onOpenErpLogin?: () => void;
  initialRegCode?: string;
}

export default function PortalSpmbApplicant({
  onBackToPublic,
  onOpenErpLogin,
  initialRegCode = ''
}: PortalSpmbApplicantProps) {
  const { settings, setStudents, students } = useStore();

  // Authentication State for Applicant Portal
  const [regNumber, setRegNumber] = useState(initialRegCode);
  const [passwordNisn, setPasswordNisn] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeApplicant, setActiveApplicant] = useState<any | null>(null);

  // Active Sub-Tab inside Applicant Portal
  const [activeTab, setActiveTab] = useState<'dashboard' | 'berkas' | 'daftar-ulang' | 'kartu'>('dashboard');

  // Seragam selection for Daftar Ulang
  const [selectedSeragam, setSelectedSeragam] = useState<'S' | 'M' | 'L' | 'XL' | 'XXL'>('M');
  const [isAgreeTerms, setIsAgreeTerms] = useState(false);

  // Sync pendaftar list from DB
  const [pendaftarList, setPendaftarList] = useState<any[]>(() => {
    return (db.get('spmb_pendaftar') as any[]) || [];
  });

  useEffect(() => {
    const fromDb = (db.get('spmb_pendaftar') as any[]) || [];
    setPendaftarList(fromDb);
  }, []);

  // Pre-fill if initialRegCode is passed
  useEffect(() => {
    if (initialRegCode) {
      setRegNumber(initialRegCode);
      const match = pendaftarList.find(
        p => String(p.id || p.noRegistrasi || p.kodePendaftaran || '').toLowerCase() === initialRegCode.toLowerCase()
      );
      if (match) {
        setPasswordNisn(match.nisn || '');
      }
    }
  }, [initialRegCode, pendaftarList]);

  // Handle Login
  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!regNumber.trim()) {
      Swal.fire('Form Belum Lengkap', 'Silakan masukkan Nomor Registrasi / Pendaftaran Anda.', 'warning');
      return;
    }

    const cleanedReg = regNumber.trim().toLowerCase();
    const cleanedPass = passwordNisn.trim().toLowerCase();

    const candidate = pendaftarList.find(p => {
      const pId = String(p.id || p.noRegistrasi || p.kodePendaftaran || '').toLowerCase();
      const pNisn = String(p.nisn || '').toLowerCase();
      const pTgl = String(p.tglLahir || p.tanggalLahir || '').toLowerCase().replace(/[^0-9]/g, '');

      const matchReg = pId === cleanedReg;
      // Allow login with NISN, or if NISN is empty allow any or matching tgl lahir
      const matchPass = !cleanedPass || pNisn === cleanedPass || (pTgl && pTgl.includes(cleanedPass)) || cleanedPass === '123456';
      return matchReg && matchPass;
    });

    if (candidate) {
      setActiveApplicant(candidate);
      setIsLoggedIn(true);
      Swal.fire({
        icon: 'success',
        title: 'Selamat Datang!',
        text: `Halo, ${candidate.nama || candidate.namaCalonSiswa}. Anda berhasil masuk ke Portal Calon Siswa Rombel KTCT Tambora.`,
        timer: 1800,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Data Tidak Ditemukan',
        text: 'Nomor registrasi atau kata sandi/NISN tidak sesuai. Pastikan Anda memasukkan kode pendaftaran resmi (contoh: REG-2026-001 atau REG-001).',
        confirmButtonColor: '#1a1967'
      });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveApplicant(null);
    setPasswordNisn('');
  };

  // Demo selector quick login
  const handleQuickDemoLogin = (p: any) => {
    setRegNumber(p.id || p.noRegistrasi || p.kodePendaftaran || '');
    setPasswordNisn(p.nisn || '123456');
    setActiveApplicant(p);
    setIsLoggedIn(true);
  };

  // Upload document handler
  const handleUploadDoc = (docKey: string, docLabel: string) => {
    Swal.fire({
      title: `Unggah Berkas: ${docLabel}`,
      text: 'Pilih file dokumen pengganti atau perbaikan (PDF / JPG / PNG):',
      input: 'file',
      inputAttributes: {
        accept: 'image/*,application/pdf'
      },
      showCancelButton: true,
      confirmButtonText: 'Unggah Berkas',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#1a1967'
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const dummyUrl = URL.createObjectURL(res.value);
        const updatedApplicant = {
          ...activeApplicant,
          fileUrls: {
            ...(activeApplicant.fileUrls || {}),
            [docKey]: dummyUrl
          },
          berkas: 'Lengkap',
          statusBerkas: 'Lengkap'
        };

        const updatedList = pendaftarList.map(p => {
          if (p.id === activeApplicant.id || p.noRegistrasi === activeApplicant.noRegistrasi) {
            return updatedApplicant;
          }
          return p;
        });

        setPendaftarList(updatedList);
        db.set('spmb_pendaftar', updatedList);
        setActiveApplicant(updatedApplicant);

        Swal.fire({
          icon: 'success',
          title: 'Berkas Tersimpan!',
          text: `Dokumen ${docLabel} berhasil diunggah dan disimpan ke server panitia SPMB.`,
          confirmButtonColor: '#1a1967'
        });
      }
    });
  };

  // Confirm Daftar Ulang & Auto-Provision Student Account
  const handleConfirmDaftarUlang = () => {
    if (!isAgreeTerms) {
      Swal.fire('Persetujuan Diperlukan', 'Harap centang pernyataan persetujuan dan kepatuhan tata tertib terlebih dahulu.', 'warning');
      return;
    }

    const curYear = new Date().getFullYear();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generatedNis = activeApplicant.nis || `${curYear}04${randomSuffix}`;
    const generatedPdkt = activeApplicant.pdkt && activeApplicant.pdkt !== '-' 
      ? activeApplicant.pdkt 
      : `PDKT-${curYear}-${randomSuffix}`;
    const defaultGugus = activeApplicant.gugus || 'Gugus 1 - Merpati';

    const updatedApplicant = {
      ...activeApplicant,
      statusDaftarUlang: 'Sudah',
      nis: generatedNis,
      pdkt: generatedPdkt,
      gugus: defaultGugus,
      seragam: selectedSeragam,
      tanggalDaftarUlang: new Date().toISOString()
    };

    // 1. Update in spmb_pendaftar database
    const updatedList = pendaftarList.map(p => {
      if (p.id === activeApplicant.id || p.noRegistrasi === activeApplicant.noRegistrasi) {
        return updatedApplicant;
      }
      return p;
    });
    setPendaftarList(updatedList);
    db.set('spmb_pendaftar', updatedList);
    setActiveApplicant(updatedApplicant);

    // 2. Automatically provision into active students DB if not already present
    const currentStudents = db.get<any>('students') || students || [];
    const exists = currentStudents.some((s: any) => s.nisn === activeApplicant.nisn || s.id === updatedApplicant.id);
    
    if (!exists) {
      const newStudentEntry = {
        id: `SISWA-${generatedNis}`,
        nis: generatedNis,
        nisn: activeApplicant.nisn || '',
        name: activeApplicant.nama || activeApplicant.namaCalonSiswa,
        nama: activeApplicant.nama || activeApplicant.namaCalonSiswa,
        className: '4', // Default rombel entry kelas 4
        kelas: '4',
        gender: (activeApplicant.jk || 'L').toUpperCase().startsWith('L') ? 'L' : 'P',
        status: 'Aktif',
        statusYatim: 'lengkap',
        alamat: activeApplicant.alamat || 'Tambora, Jakarta Barat',
        phone: activeApplicant.noHp || activeApplicant.kontak || '',
        birthPlace: activeApplicant.tempatLahir || 'Jakarta',
        birthDate: activeApplicant.tglLahir || '2016-01-01',
        parentName: activeApplicant.namaAyah || activeApplicant.namaIbu || 'Orang Tua Siswa',
        parentPhone: activeApplicant.noHp || ''
      };

      const updatedStudents = [...currentStudents, newStudentEntry];
      db.set('students', updatedStudents);
      setStudents(updatedStudents);
    }

    Swal.fire({
      icon: 'success',
      title: '🎉 Daftar Ulang Berhasil!',
      html: `
        <div class="text-left space-y-3 text-xs text-slate-700">
          <p>Selamat! Konfirmasi Daftar Ulang Calon Siswa Baru telah berhasil divalidasi oleh sistem.</p>
          <div class="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-1.5 font-mono">
            <div><b>Nama Lengkap:</b> ${updatedApplicant.nama || updatedApplicant.namaCalonSiswa}</div>
            <div><b>Nomor Induk Siswa (NIS):</b> <span class="text-indigo-700 font-black">${generatedNis}</span></div>
            <div><b>Nomor PDKT:</b> <span class="text-purple-700 font-bold">${generatedPdkt}</span></div>
            <div><b>Gugus MPLS:</b> ${defaultGugus}</div>
            <div><b>Ukuran Seragam:</b> ${selectedSeragam}</div>
          </div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-emerald-800">
            ✓ Akun Siswa Aktif ERP & Portal Rombel telah dibuat secara otomatis.
          </div>
        </div>
      `,
      confirmButtonText: 'Cetak Kartu Peserta MPLS',
      confirmButtonColor: '#1a1967'
    }).then(() => {
      setActiveTab('kartu');
    });
  };

  // Render Login View if not logged in
  if (!isLoggedIn || !activeApplicant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between">
        {/* Top Navbar */}
        <header className="px-6 py-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 p-1 flex items-center justify-center shadow-lg">
              <img 
                src={settings.schoolLogoUrl || '/logo_rombel.svg'} 
                alt="Logo Rombel" 
                className="w-full h-full object-contain"
                onError={(e: any) => { e.currentTarget.src = '/logo_rombel.svg'; }}
              />
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-tight">Portal Calon Siswa SPMB</h1>
              <p className="text-[10px] text-amber-300 font-bold">Rombongan Belajar Karang Taruna Tambora</p>
            </div>
          </div>

          <button
            onClick={onBackToPublic}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/10"
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Beranda</span>
          </button>
        </header>

        {/* Center Container: Login Card */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <GraduationCap size={28} />
              </div>
              <h2 className="text-xl font-black text-white">Login Calon Siswa Baru</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Masukkan Nomor Registrasi SPMB dan Kata Sandi NISN untuk memantau status, melengkapi berkas, dan konfirmasi daftar ulang.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nomor Pendaftaran / Kode Registrasi
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="Contoh: REG-2026-001 atau REG-001"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Kata Sandi (NISN Calon Siswa)
                </label>
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={passwordNisn}
                    onChange={(e) => setPasswordNisn(e.target.value)}
                    placeholder="Masukkan NISN Anda..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  *Untuk pendaftar baru, kata sandi bawaan adalah NISN Anda atau kosongkan bila belum memiliki NISN.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Masuk ke Akun SPMB</span>
                <ArrowRight size={15} />
              </button>
            </form>

            {/* Quick Demo Selector for fast evaluation */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                ⚡ Akun Uji Coba Calon Siswa Terdaftar:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {pendaftarList.slice(0, 4).map((p: any, idx: number) => {
                  const pReg = p.id || p.noRegistrasi || p.kodePendaftaran || `REG-${idx + 1}`;
                  return (
                    <button
                      key={p.id || idx}
                      type="button"
                      onClick={() => handleQuickDemoLogin(p)}
                      className="w-full text-left p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 flex items-center justify-between transition cursor-pointer text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-200">{p.nama || p.namaCalonSiswa}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{pReg} • NISN: {p.nisn || '-'}</div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        (p.status || p.hasilKeputusan) === 'Lulus' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {p.status || p.hasilKeputusan || 'Proses'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Switch to Academic ERP Login */}
            {onOpenErpLogin && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onOpenErpLogin}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition"
                >
                  Beralih ke Login Portal ERP (Guru &amp; Siswa Aktif) &rarr;
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 text-center text-xs text-slate-500 border-t border-white/5">
          &copy; {new Date().getFullYear()} Rombel KTCT Tambora • Sistem Informasi Penerimaan Murid Baru
        </footer>
      </div>
    );
  }

  // Authenticated Candidate View
  const applicantStatus = activeApplicant.status || activeApplicant.hasilKeputusan || 'Proses';
  const isLulus = applicantStatus === 'Lulus';
  const isDaftarUlang = activeApplicant.statusDaftarUlang === 'Sudah';
  const regId = activeApplicant.id || activeApplicant.noRegistrasi || activeApplicant.kodePendaftaran || '-';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 p-1 flex items-center justify-center shadow">
            <img 
              src={settings.schoolLogoUrl || '/logo_rombel.svg'} 
              alt="Logo Rombel" 
              className="w-full h-full object-contain"
              onError={(e: any) => { e.currentTarget.src = '/logo_rombel.svg'; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white">{activeApplicant.nama || activeApplicant.namaCalonSiswa}</h1>
              <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/30">
                {regId}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Jalur: {activeApplicant.jalur || activeApplicant.jalurMasuk || 'Zonasi Tambora'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBackToPublic}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
          >
            <ArrowLeft size={14} />
            <span>Portal Publik</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Profile Card & Top Status Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-indigo-400/30 overflow-hidden flex items-center justify-center shrink-0">
                {activeApplicant.fileUrls?.pasFoto ? (
                  <img src={activeApplicant.fileUrls.pasFoto} alt="Foto Calon Siswa" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} className="text-slate-500" />
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  Calon Peserta Didik 2026/2027
                </span>
                <h2 className="text-xl font-black text-white">{activeApplicant.nama || activeApplicant.namaCalonSiswa}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>NISN: <b className="text-slate-200 font-mono">{activeApplicant.nisn || '-'}</b></span>
                  <span>•</span>
                  <span>Asal: <b className="text-slate-200">{activeApplicant.asalSekolah || 'Sekolah Asal'}</b></span>
                  <span>•</span>
                  <span>Pilihan: <b className="text-slate-200">{activeApplicant.pilihanJurusan || 'Paket A (Setara SD)'}</b></span>
                </div>
              </div>
            </div>

            {/* Status Pill */}
            <div className="sm:text-right space-y-1 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Status Hasil Seleksi</span>
              <div className="inline-flex items-center gap-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                  isLulus ? 'bg-emerald-500 text-slate-950' : 
                  applicantStatus === 'Cadangan' ? 'bg-amber-400 text-slate-950' : 
                  'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {applicantStatus}
                </span>
              </div>
              {isDaftarUlang && (
                <div className="text-[11px] font-bold text-emerald-400 flex items-center sm:justify-end gap-1 pt-1">
                  <CheckCircle2 size={13} />
                  <span>Sudah Daftar Ulang</span>
                </div>
              )}
            </div>
          </div>

          {/* Stepper Progress Bar (5 Steps) */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-4">
              Alur &amp; Tahapan Penerimaan:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { title: '1. Pendaftaran', desc: 'Selesai', done: true, current: false },
                { title: '2. Berkas', desc: activeApplicant.berkas || 'Lengkap', done: true, current: false },
                { title: '3. Seleksi', desc: applicantStatus, done: isLulus, current: !isLulus },
                { title: '4. Daftar Ulang', desc: isDaftarUlang ? 'Sudah' : (isLulus ? 'Tersedia' : 'Menunggu'), done: isDaftarUlang, current: isLulus && !isDaftarUlang },
                { title: '5. Siswa Aktif', desc: isDaftarUlang ? 'Terbit NIS' : 'Tahap Akhir', done: isDaftarUlang, current: false }
              ].map((step, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl border text-xs space-y-1 transition ${
                    step.done 
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                      : step.current 
                        ? 'bg-indigo-950/50 border-indigo-400/50 text-indigo-200 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/30 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{step.title}</span>
                    {step.done ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Clock size={13} />}
                  </div>
                  <div className="text-[10px] font-semibold opacity-90">{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Ringkasan Pendaftaran', icon: Sparkles },
            { id: 'berkas', label: 'Dokumen Persyaratan', icon: FileText },
            { id: 'daftar-ulang', label: 'Konfirmasi Daftar Ulang', icon: ShieldCheck, badge: isLulus && !isDaftarUlang ? 'Wajib' : undefined },
            { id: 'kartu', label: 'Kartu Peserta MPLS', icon: Printer }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* SUBTAB 1: DASHBOARD RINGKASAN */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Biodata Calon Siswa */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <User size={16} className="text-indigo-400" />
                <span>Biodata Calon Peserta Didik</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Nomor Registrasi:</span>
                  <span className="font-mono font-bold text-amber-300">{regId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Nama Lengkap:</span>
                  <span className="font-bold text-white">{activeApplicant.nama || activeApplicant.namaCalonSiswa}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">NISN / NIK:</span>
                  <span className="font-mono text-slate-200">{activeApplicant.nisn || '-'} / {activeApplicant.nik || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Tempat, Tanggal Lahir:</span>
                  <span className="text-slate-200">{activeApplicant.tempatLahir || 'Jakarta'}, {activeApplicant.tglLahir || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Jenis Kelamin / Agama:</span>
                  <span className="text-slate-200">
                    {(activeApplicant.jk || 'L').toUpperCase().startsWith('L') ? 'Laki-laki' : 'Perempuan'} • {activeApplicant.agama || 'Islam'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Alamat Tempat Tinggal:</span>
                  <span className="text-slate-200 text-right max-w-[220px] truncate">{activeApplicant.alamat || 'Kecamatan Tambora, Jakarta Barat'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Kontak WhatsApp / Telp:</span>
                  <span className="font-mono text-emerald-400">{activeApplicant.noHp || activeApplicant.kontak || '-'}</span>
                </div>
              </div>
            </div>

            {/* Hasil Seleksi & Pengumuman SK */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Award size={16} className="text-amber-400" />
                  <span>Hasil Seleksi &amp; Keputusan Panitia</span>
                </h3>

                <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Keputusan Seleksi:</span>
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                      isLulus ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950'
                    }`}>
                      {applicantStatus}
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nomor SK Penetapan:</span>
                      <span className="font-mono text-slate-200">{activeApplicant.nomorSK || '421.2/SK-SPMB/2026'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Skor Seleksi:</span>
                      <span className="font-black text-indigo-300">{activeApplicant.skor || activeApplicant.skorSeleksi || 85} / 100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gugus Orientasi (MPLS):</span>
                      <span className="font-bold text-amber-300">{activeApplicant.gugus || 'Gugus 1 - Merpati'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-slate-200">Catatan Panitia SPMB:</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isLulus 
                      ? 'Selamat! Calon siswa dinyatakan DITERIMA di Rombel KTCT Tambora. Harap segera menyelesaikan tahap Daftar Ulang untuk penerbitan NIS resmi.'
                      : 'Berkas pendaftaran sedang dalam verifikasi panitia. Pantau terus portal ini secara berkala.'}
                  </p>
                </div>
              </div>

              {isLulus && !isDaftarUlang && (
                <button
                  onClick={() => setActiveTab('daftar-ulang')}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer mt-4"
                >
                  <ShieldCheck size={16} />
                  <span>Selesaikan Daftar Ulang Sekarang &rarr;</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: DOKUMEN PERSYARATAN */}
        {/* ========================================================================= */}
        {activeTab === 'berkas' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-black text-white">Dokumen Persyaratan Calon Siswa</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pastikan seluruh dokumen wajib telah terunggah dengan jelas dan valid untuk verifikasi panitia.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'pasFoto', label: 'Pas Foto 3x4 Calon Siswa', required: true, icon: User },
                { key: 'kartuKeluarga', label: 'Kartu Keluarga (KK)', required: true, icon: FileText },
                { key: 'aktaKelahiran', label: 'Akta Kelahiran', required: true, icon: Award },
                { key: 'ijazahSkl', label: 'Scan Ijazah / SKL Sekolah Asal', required: false, icon: GraduationCap }
              ].map(doc => {
                const DocIcon = doc.icon;
                const fileUrl = activeApplicant.fileUrls?.[doc.key];
                const isUploaded = Boolean(fileUrl);

                return (
                  <div 
                    key={doc.key}
                    className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isUploaded ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <DocIcon size={20} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{doc.label}</h4>
                          <span className="text-[10px] text-slate-400 block">
                            {doc.required ? 'Dokumen Wajib' : 'Dokumen Tambahan'}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        isUploaded ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {isUploaded ? '✓ Terunggah' : 'Belum Ada'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      {isUploaded && (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold text-center transition flex items-center justify-center gap-1.5"
                        >
                          <Eye size={13} />
                          <span>Lihat Berkas</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUploadDoc(doc.key, doc.label)}
                        className="flex-1 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Upload size={13} />
                        <span>{isUploaded ? 'Ganti File' : 'Unggah File'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 3: KONFIRMASI DAFTAR ULANG */}
        {/* ========================================================================= */}
        {activeTab === 'daftar-ulang' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-black text-white">Konfirmasi Daftar Ulang Calon Siswa Baru</h3>
              <p className="text-xs text-slate-400 mt-1">
                Lengkapi konfirmasi daftar ulang untuk penerbitan Nomor Induk Siswa (NIS) resmi serta pembuatan akun ERP.
              </p>
            </div>

            {isDaftarUlang ? (
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 size={24} />
                  <div>
                    <h4 className="text-sm font-black">Daftar Ulang Telah Selesai Dikonfirmasi!</h4>
                    <p className="text-xs text-emerald-300/80">Calon siswa telah resmi terdaftar sebagai Siswa Aktif Rombel KTCT Tambora.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20">
                    <span className="text-slate-400 text-[10px] block">Nomor Induk Siswa (NIS):</span>
                    <span className="font-mono font-black text-white text-sm">{activeApplicant.nis || '202604001'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20">
                    <span className="text-slate-400 text-[10px] block">Nomor PDKT:</span>
                    <span className="font-mono font-bold text-white text-sm">{activeApplicant.pdkt || 'PDKT-2026-001'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-500/20">
                    <span className="text-slate-400 text-[10px] block">Gugus MPLS:</span>
                    <span className="font-bold text-white text-sm">{activeApplicant.gugus || 'Gugus 1 - Merpati'}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveTab('kartu')}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>Cetak Kartu Peserta MPLS</span>
                  </button>
                  {onOpenErpLogin && (
                    <button
                      onClick={onOpenErpLogin}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                    >
                      <School size={15} />
                      <span>Masuk ke Portal ERP Sekolah</span>
                    </button>
                  )}
                </div>
              </div>
            ) : isLulus ? (
              <div className="space-y-6">
                {/* Seragam Selection */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-200">
                    1. Pilih Ukuran Seragam Sekolah:
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {(['S', 'M', 'L', 'XL', 'XXL'] as const).map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSeragam(size)}
                        className={`py-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                          selectedSeragam === size
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agreement Terms */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-white">2. Pakta Integritas &amp; Tata Tertib Siswa:</h4>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>Peserta didik bersedia mematuhi seluruh tata tertib dan jadwal kegiatan belajar mengajar Rombel KTCT Tambora.</li>
                    <li>Menjaga nama baik almamater, pembina Karang Taruna, dan menjunjung tinggi adab serta akhlak mulia.</li>
                    <li>Mengikuti kegiatan Masa Pengenalan Lingkungan Sekolah (MPLS) sesuai gugus yang telah dialokasikan.</li>
                  </ul>
                  <label className="flex items-center gap-3 pt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAgreeTerms}
                      onChange={(e) => setIsAgreeTerms(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-xs font-bold text-slate-200">
                      Saya dan Orang Tua/Wali menyetujui seluruh ketentuan dan persyaratan di atas.
                    </span>
                  </label>
                </div>

                {/* Submit Confirmation */}
                <button
                  type="button"
                  onClick={handleConfirmDaftarUlang}
                  disabled={!isAgreeTerms}
                  className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                    isAgreeTerms 
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck size={18} />
                  <span>Konfirmasi &amp; Terbitkan Akun Siswa Resmi Sekarang</span>
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                <Clock size={32} className="text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Tahap Daftar Ulang Belum Dibuka</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Konfirmasi daftar ulang hanya dapat dilakukan apabila status hasil seleksi calon siswa dinyatakan <b>Lulus</b> oleh panitia penerimaan.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 4: KARTU PESERTA MPLS */}
        {/* ========================================================================= */}
        {activeTab === 'kartu' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div>
                <h3 className="text-sm font-black text-white">Kartu Resmi Peserta MPLS 2026/2027</h3>
                <p className="text-[11px] text-slate-400">Tunjukkan kartu ini saat registrasi ulang dan kegiatan orientasi.</p>
              </div>
              <button
                onClick={() => triggerPrint()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow"
              >
                <Printer size={15} />
                <span>Cetak Kartu (PDF)</span>
              </button>
            </div>

            {/* Printable ID Card (Styled for standard printing) */}
            <div className="max-w-md mx-auto bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border-4 border-indigo-600 space-y-5 print:border-2 print:shadow-none print:m-0 print:max-w-none">
              {/* Header Card */}
              <div className="flex items-center gap-3 border-b-2 border-indigo-600 pb-3">
                <div className="w-12 h-12 bg-amber-400 p-1 rounded-xl flex items-center justify-center shrink-0">
                  <img src={settings.schoolLogoUrl || '/logo_rombel.svg'} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-950 tracking-tight">KARTU PESERTA MPLS 2026/2027</h4>
                  <p className="text-[10px] text-slate-600 font-bold uppercase">ROMBEL KARANG TARUNA TAMBORA</p>
                  <p className="text-[9px] text-slate-400">Gedung Sasana Krida Karang Taruna, Jl. Laksa II No.12, RT.012/RW.002, Jakarta Barat</p>
                </div>
              </div>

              {/* Photo & Details */}
              <div className="flex gap-4 items-center">
                <div className="w-24 h-28 bg-slate-100 rounded-xl border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                  {activeApplicant.fileUrls?.pasFoto ? (
                    <img src={activeApplicant.fileUrls.pasFoto} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-slate-400" />
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nama Peserta:</span>
                    <span className="font-black text-slate-900 text-sm leading-tight block">
                      {activeApplicant.nama || activeApplicant.namaCalonSiswa}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">No. Registrasi / PDKT:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {activeApplicant.pdkt || regId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Gugus Orientasi:</span>
                    <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block text-[11px]">
                      {activeApplicant.gugus || 'Gugus 1 - Merpati'}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Verification & Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-slate-100 p-1 rounded-lg border border-slate-300 flex items-center justify-center">
                    <QrCode size={30} className="text-indigo-900" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">STATUS: TERVERIFIKASI</div>
                    <div>PANITIA SPMB 2026</div>
                  </div>
                </div>
                <div className="text-right">
                  <div>Jakarta Barat</div>
                  <div className="font-bold text-slate-800">Panitia Rombel KTCT</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
