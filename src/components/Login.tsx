import React, { useState } from 'react';
import { db } from '../data/db';
import { SPMBPendaftar, User, Siswa } from '../types';
import { Key, UserCheck, ArrowLeft, ArrowRight, ShieldCheck, Database, School } from 'lucide-react';

interface LoginProps {
  onBackToHome: () => void;
  onAutoLogin: (user: User) => void;
  initialKode?: string;
}

export default function Login({ onBackToHome, onAutoLogin, initialKode = '' }: LoginProps) {
  const [kodeDaftar, setKodeDaftar] = useState(initialKode);
  const [matchedCandidate, setMatchedCandidate] = useState<SPMBPendaftar | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Registration Flow States
  const [step, setStep] = useState<1 | 2>(1);
  const [generatedNis, setGeneratedNis] = useState('');
  const [generatedUser, setGeneratedUser] = useState('');
  const [generatedPass, setGeneratedPass] = useState('');

  const handleCariPendaftaran = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setMatchedCandidate(null);

    if (!kodeDaftar) {
      setErrorMsg('Harap masukkan Kode Pendaftaran.');
      return;
    }

    const list = db.get<SPMBPendaftar>('spmb_pendaftar');
    const matched = list.find(
      p => p.kodePendaftaran.trim().toUpperCase() === kodeDaftar.trim().toUpperCase()
    );

    if (matched) {
      if (matched.status === 'Diterima') {
        setMatchedCandidate(matched);
      } else {
        setErrorMsg(`Status pendaftaran Anda saat ini adalah "${matched.status}". Hanya pendaftar dengan status "Diterima" yang dapat melakukan registrasi akun.`);
      }
    } else {
      setErrorMsg('Kode Pendaftaran tidak ditemukan. Pastikan format benar.');
    }
  };

  const handleGenerateAkun = () => {
    if (!matchedCandidate) return;

    Swal.fire({
      title: 'Generate Akun & NIS?',
      text: 'Sistem akan otomatis menerbitkan Nomor Induk Siswa (NIS) dan akun login ERP.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Terbitkan!',
      cancelButtonText: 'Batal'
    }).then((res: any) => {
      if (res.isConfirmed) {
        Swal.fire({
          title: 'Memproses...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        setTimeout(() => {
          Swal.close();

          const randomNis = `20261100${Math.floor(10 + Math.random() * 90)}`;
          const cleanName = matchedCandidate.nama.split(' ')[0].toLowerCase();
          const username = cleanName + matchedCandidate.kodePendaftaran.split('-')[1];
          const password = Math.random().toString(36).slice(-8);

          // Add to Siswa db
          const newSiswa: Siswa = {
            id: `SIS_${username}`,
            nisn: matchedCandidate.nisn,
            nama: matchedCandidate.nama,
            jk: matchedCandidate.jk === 'Laki-laki' ? 'L' : 'P',
            tglLahir: matchedCandidate.tglLahir,
            status: 'AKTIF',
            kelasId: '10', // Default kelas 10 untuk siswa baru
            noHp: matchedCandidate.noHp,
            alamat: matchedCandidate.alamat,
            namaAyah: matchedCandidate.namaAyah,
            namaIbu: matchedCandidate.namaIbu,
            agama: matchedCandidate.agama
          };

          // Add to Users db
          const newUser: User = {
            id: `USR_${username}`,
            username: username,
            role: 'SISWA',
            name: matchedCandidate.nama,
            status: 'AKTIF',
            kelasId: '10',
            siswaIds: `SIS_${username}`,
            password: password
          };

          db.insert<any>('siswa', newSiswa);
          db.insert<any>('users', { ...newUser, passHash: password }); // we save plane text password for simple auth

          // Update Status SPMB so they cannot register again
          db.update<SPMBPendaftar>('spmb_pendaftar', 'kodePendaftaran', matchedCandidate.kodePendaftaran, {
            status: 'Diterima' // keep accepted but already registered
          });

          setGeneratedNis(randomNis);
          setGeneratedUser(username);
          setGeneratedPass(password);
          setStep(2);

          Swal.fire(
            'Sukses!',
            'Akun ERP & NIS berhasil diterbitkan.',
            'success'
          );
        }, 1500);
      }
    });
  };

  const handleAutoLoginClick = () => {
    const users = db.get<any>('users');
    const matched = users.find((u: any) => u.username === generatedUser);
    if (matched) {
      onAutoLogin(matched);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950 text-white">
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-700/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-700/20 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-lg bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 p-8 md:p-10 animate-fade-in-up">
        {step === 1 ? (
          <div className="space-y-6">
            <button 
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition text-sm font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Home
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-8 h-8 text-blue-300" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">Portal SPMB Online</h2>
              <p className="text-blue-200 mt-2 text-sm leading-relaxed">
                Registrasi Akun Akademik & NIS bagi calon siswa yang telah dinyatakan Diterima.
              </p>
            </div>

            <form onSubmit={handleCariPendaftaran} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">KODE PENDAFTARAN</label>
                <div className="relative">
                  <Key className="absolute left-4 top-4 text-blue-400 w-5 h-5" />
                  <input 
                    type="text" 
                    value={kodeDaftar}
                    onChange={(e) => setKodeDaftar(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all font-mono" 
                    placeholder="PDKT2026-XXXXXX"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-200 rounded-2xl text-xs leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {!matchedCandidate ? (
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Verifikasi Kode <ArrowRight className="w-4 h-4" />
                </button>
              ) : null}
            </form>

            {matchedCandidate && (
              <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4 animate-scale-in">
                <div className="border-b border-white/10 pb-3">
                  <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block">Data Terverifikasi</span>
                  <h4 className="text-xl font-bold text-white mt-1">{matchedCandidate.nama}</h4>
                  <p className="text-xs text-slate-400">NISN: {matchedCandidate.nisn}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Jenis Kelamin</span>
                    <span className="font-bold">{matchedCandidate.jk}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Tanggal Lahir</span>
                    <span className="font-bold">{matchedCandidate.tglLahir}</span>
                  </div>
                </div>

                <button 
                  onClick={handleGenerateAkun}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" /> Generate NIS & Akun ERP
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-scale-in">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
            
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Akun Berhasil Diterbitkan!</h2>
              <p className="text-slate-400 text-sm mt-1">Gunakan akun ini untuk masuk ke portal ERP Sekolah.</p>
            </div>

            <div className="p-6 bg-slate-900 border border-white/10 rounded-3xl space-y-4 text-left">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NAMA SISWA</span>
                  <span className="font-bold text-white text-base">{matchedCandidate?.nama}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NIS BARU</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">{generatedNis}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold">USERNAME ERP</span>
                  <span className="font-mono font-bold text-white text-sm bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-lg">{generatedUser}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                  <span className="text-xs text-slate-400 font-bold">PASSWORD ERP</span>
                  <span className="font-mono font-bold text-white text-sm bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-lg">{generatedPass}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleAutoLoginClick}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-blue-600/30 transition"
              >
                Masuk Otomatis ke ERP <ArrowRight className="w-4 h-4 inline ml-1.5" />
              </button>
              
              <button 
                onClick={onBackToHome}
                className="w-full border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-2xl transition text-sm"
              >
                Kembali ke Beranda Publik
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

declare const Swal: any;
