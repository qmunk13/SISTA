import React, { useState } from 'react';
import { MockDb } from '../utils/mockDb';
import { db } from '../data/db';
import { Pendaftar, User } from '../types';

interface PortalSiswaSpmbProps {
  currentApplicant: Pendaftar;
  onLogout: () => void;
  onSwitchToERP: (username: string) => void;
}

export default function PortalSiswaSpmb({ currentApplicant, onLogout, onSwitchToERP }: PortalSiswaSpmbProps) {
  const [applicant, setApplicant] = useState<Pendaftar>(currentApplicant);
  const [berkasPhoto, setBerkasPhoto] = useState(applicant.berkas?.photo || '');
  const [berkasKk, setBerkasKk] = useState(applicant.berkas?.kk || '');
  const [berkasAkta, setBerkasAkta] = useState(applicant.berkas?.akta || '');
  const [activeTab, setActiveTab] = useState<'status' | 'berkas' | 'bantuan'>('status');

  const handleUploadBerkas = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBerkas = {
      photo: berkasPhoto || 'Sudah_Diunggah_Pas_Foto.jpg',
      kk: berkasKk || 'Sudah_Diunggah_KK.pdf',
      akta: berkasAkta || 'Sudah_Diunggah_Akta.pdf'
    };

    // Update inside MockDb
    const list = [...MockDb.pendaftar];
    const index = list.findIndex(p => p.kodePendaftaran === applicant.kodePendaftaran);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        berkas: updatedBerkas
      };
      MockDb.pendaftar = list;
      setApplicant(list[index]);

      Swal.fire({
        icon: 'success',
        title: 'Berkas Berhasil Diupload',
        text: 'Berkas Anda telah tersimpan dan siap diverifikasi oleh panitia.',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#4f46e5'
      });
    }
  };

  const handleDaftarUlang = () => {
    // Generate official student and parent accounts in MockDb
    const list = [...MockDb.pendaftar];
    const index = list.findIndex(p => p.kodePendaftaran === applicant.kodePendaftaran);
    if (index === -1) return;

    // Check if student already exist
    const isSiswaExist = MockDb.siswa.some(s => s.nisn === applicant.nisn);
    if (isSiswaExist) {
      Swal.fire({
        icon: 'info',
        title: 'Akun Sudah Ada',
        text: 'Anda telah menyelesaikan daftar ulang sebelumnya.',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#4f46e5'
      });
      return;
    }

    const getKelasId = (lvl: string) => {
      const match = (MockDb.kelas || []).find(k => k.nama === lvl || k.id === lvl);
      if (match) return match.id;
      if (lvl === '4') return 'A4';
      if (lvl === '5') return 'A5';
      if (lvl === '6') return 'A6';
      if (lvl === '7') return 'B7';
      if (lvl === '8') return 'B8';
      if (lvl === '9') return 'B9';
      if (lvl === '10') return 'C10';
      if (lvl === '11') return 'C11';
      if (lvl === '12') return 'C12';
      return 'B7';
    };

    const nextPdkt = applicant.kodePendaftaran || 'PDKT-UNKNOWN';
    const nis = nextPdkt; // Di Rombel KTCT Tambora: NIS adalah nopdkt (No. PDKT)
    const liveSiswaList = db.get<any>('siswa') || [];

    const newSiswa: any = {
      id: nextPdkt,
      nopdkt: nextPdkt,
      noPdkt: nextPdkt,
      NoPDKT: nextPdkt,
      nis: nextPdkt,
      NIS: nextPdkt,
      nisn: applicant.nisn,
      nama: applicant.nama,
      jk: applicant.jk,
      tglLahir: applicant.tglLahir,
      agama: 'Islam',
      namaAyah: applicant.namaAyah || '-',
      namaIbu: applicant.namaIbu || '-',
      noHp: applicant.noHp || '-',
      kelasId: getKelasId(applicant.kelas), // Default Kelas Baru sesuai Master Data
      alamat: applicant.alamat,
      kodePos: applicant.kodePos || '11200',
      fotoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      status: 'AKTIF'
    };

    // Append to master databases (MockDb and live DB)
    MockDb.siswa = [...MockDb.siswa, newSiswa];
    if (!liveSiswaList.some((s: any) => s.nisn === newSiswa.nisn)) {
      db.set('siswa', [...liveSiswaList, newSiswa]);
    }

    // Student Account Password logic: first name (lowercase) + No. PDKT
    const firstName = (newSiswa.nama || 'siswa').trim().split(/\s+/)[0].toLowerCase();
    const studentPassword = firstName + nextPdkt;

    // Student Account
    const studentUser: User = {
      id: 'USR_' + newSiswa.nisn,
      username: newSiswa.nisn,
      role: 'SISWA',
      name: newSiswa.nama,
      password: studentPassword,
      aktif: true,
      mustChangePass: false
    };

    // Parent Account
    const parentUser: User = {
      id: 'USR_ORTU_' + newSiswa.nisn,
      username: 'ortu_' + newSiswa.nisn,
      role: 'ORANG_TUA',
      name: 'Orang Tua ' + newSiswa.nama,
      siswaIds: newSiswa.id,
      password: 'sandi123',
      aktif: true,
      mustChangePass: false
    };

    // Append to MockDb.users
    const updatedUsers = [...MockDb.users];
    if (!updatedUsers.some(u => u.username === studentUser.username)) {
      updatedUsers.push(studentUser);
    }
    if (!updatedUsers.some(u => u.username === parentUser.username)) {
      updatedUsers.push(parentUser);
    }
    MockDb.users = updatedUsers;

    // Append to live DB.users
    const liveUsersList = db.get<User>('users') || [];
    const nextLiveUsers = [...liveUsersList];
    if (!nextLiveUsers.some(u => u.username === studentUser.username)) {
      nextLiveUsers.push(studentUser);
    }
    if (!nextLiveUsers.some(u => u.username === parentUser.username)) {
      nextLiveUsers.push(parentUser);
    }
    db.set('users', nextLiveUsers);

    // Update status to admitted with register completed in MockDb
    list[index] = {
      ...list[index],
      status: 'Diterima',
      catatanAdmin: 'Daftar Ulang Selesai. Selamat Belajar!'
    };
    MockDb.pendaftar = list;
    setApplicant(list[index]);

    // Update status to admitted in live DB
    const livePendaftar = db.get<any>('spmb_pendaftar') || [];
    const liveIndex = livePendaftar.findIndex((p: any) => p.kodePendaftaran === applicant.kodePendaftaran);
    if (liveIndex !== -1) {
      livePendaftar[liveIndex] = {
        ...livePendaftar[liveIndex],
        status: 'Diterima',
        catatanAdmin: 'Daftar Ulang Selesai. Selamat Belajar!'
      };
      db.set('spmb_pendaftar', livePendaftar);
    }

    MockDb.log(applicant.nama, 'SPMB_RE_REGISTER_COMPLETE', { nis, username: newSiswa.nisn });

    Swal.fire({
      icon: 'success',
      title: 'Daftar Ulang Berhasil!',
      html: `
        <div class="text-left text-xs space-y-2 mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800">
          <p class="text-emerald-400 font-bold text-center text-sm mb-2">🎉 Selamat Bergabung!</p>
          <p><strong>Nama Lengkap:</strong> ${newSiswa.nama}</p>
          <p><strong>Nomor PDKT Siswa:</strong> <span class="text-amber-400 font-mono font-bold">${nextPdkt}</span></p>
          <p><strong>Nomor Induk Siswa (NIS):</strong> <span class="text-indigo-400 font-mono font-bold">${nis}</span></p>
          <p><strong>Username ERP Siswa:</strong> <span class="text-indigo-400 font-mono font-bold">${newSiswa.nisn}</span></p>
          <p><strong>Sandi ERP Siswa:</strong> <span class="text-emerald-400 font-mono font-bold">${studentPassword}</span></p>
          <p><strong>Username ERP Orang Tua:</strong> <span class="text-indigo-400 font-mono font-bold">ortu_${newSiswa.nisn}</span></p>
          <p><strong>Sandi ERP Orang Tua:</strong> <span class="text-indigo-400 font-mono font-bold">sandi123</span></p>
          <p class="text-[10px] text-slate-500 italic mt-2">Gunakan detail akun di atas untuk login awal Anda di ERP Rombel KTCT.</p>
        </div>
      `,
      confirmButtonText: 'Masuk ke Portal ERP',
      confirmButtonColor: '#4f46e5',
      background: '#1e293b',
      color: '#f8fafc'
    }).then(() => {
      onSwitchToERP(newSiswa.nisn);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header bar */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-lg flex items-center justify-center text-white">
            <i className="fas fa-id-card text-sm"></i>
          </div>
          <div>
            <span className="text-xs font-black text-white uppercase tracking-wider block">PORTAL CALON SISWA</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{applicant.nama} ({applicant.kodePendaftaran})</span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-red-500/20"
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>Keluar Portal</span>
        </button>
      </header>

      {/* Content wrapper */}
      <main className="max-w-4xl w-full mx-auto p-6 md:p-8 flex-grow space-y-6 relative z-10">
        
        {/* Step progress bar */}
        <div className="bg-slate-900/50 border border-slate-850 p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1.5 border-l-2 border-indigo-500">Alur Penerimaan Siswa Baru</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-indigo-500/20 flex flex-col justify-between">
              <span className="text-[10px] text-indigo-400 font-black">Langkah 1</span>
              <h5 className="text-xs font-black text-white mt-1">Registrasi Formulir</h5>
              <span className="text-[9px] text-emerald-400 font-bold mt-1.5"><i className="fas fa-check-circle mr-1"></i> Selesai</span>
            </div>

            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              applicant.berkas?.photo || berkasPhoto ? 'bg-slate-950/60 border-indigo-500/20' : 'bg-slate-900/40 border-slate-850'
            }`}>
              <span className="text-[10px] text-indigo-400 font-black">Langkah 2</span>
              <h5 className="text-xs font-black text-white mt-1">Unggah Persyaratan</h5>
              {applicant.berkas?.photo || berkasPhoto ? (
                <span className="text-[9px] text-emerald-400 font-bold mt-1.5"><i className="fas fa-check-circle mr-1"></i> Berkas Diunggah</span>
              ) : (
                <span className="text-[9px] text-amber-400 font-bold mt-1.5"><i className="fas fa-exclamation-circle mr-1"></i> Perlu Tindakan</span>
              )}
            </div>

            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              applicant.status !== 'Pending' ? 'bg-slate-950/60 border-indigo-500/20' : 'bg-slate-900/40 border-slate-850'
            }`}>
              <span className="text-[10px] text-indigo-400 font-black">Langkah 3</span>
              <h5 className="text-xs font-black text-white mt-1">Seleksi / Pengumuman</h5>
              {applicant.status === 'Diterima' ? (
                <span className="text-[9px] text-emerald-400 font-bold mt-1.5"><i className="fas fa-check-circle mr-1"></i> LOLOS SELEKSI</span>
              ) : applicant.status === 'Tidak Diterima' ? (
                <span className="text-[9px] text-red-400 font-bold mt-1.5"><i className="fas fa-times-circle mr-1"></i> Tidak Lolos</span>
              ) : (
                <span className="text-[9px] text-slate-400 font-bold mt-1.5"><i className="fas fa-clock mr-1"></i> Dalam Proses</span>
              )}
            </div>

            <div className={`p-3 rounded-xl border flex flex-col justify-between ${
              MockDb.siswa.some(s => s.nisn === applicant.nisn) ? 'bg-slate-950/60 border-indigo-500/20' : 'bg-slate-900/40 border-slate-850'
            }`}>
              <span className="text-[10px] text-indigo-400 font-black">Langkah 4</span>
              <h5 className="text-xs font-black text-white mt-1">Daftar Ulang / NIS</h5>
              {MockDb.siswa.some(s => s.nisn === applicant.nisn) ? (
                <span className="text-[9px] text-emerald-400 font-bold mt-1.5"><i className="fas fa-check-circle mr-1"></i> Resmi Menjadi Siswa</span>
              ) : (
                <span className="text-[9px] text-slate-500 font-bold mt-1.5">Belum Selesai</span>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition ${activeTab === 'status' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
          >
            <i className="fas fa-chart-line mr-2"></i> Status Kelulusan
          </button>
          
          <button
            onClick={() => setActiveTab('berkas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition ${activeTab === 'berkas' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
          >
            <i className="fas fa-file-upload mr-2"></i> Upload Berkas Mandiri
          </button>
        </div>

        {/* Tab content 1: Status Kelulusan */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Main Status */}
              <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-3xl space-y-4 flex flex-col justify-between md:col-span-2">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Status Berkas & Kelayakan</span>
                  <div className="flex items-center gap-3">
                    <span className={`px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider ${
                      applicant.status === 'Diterima' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      applicant.status === 'Tidak Diterima' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {applicant.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mt-2">
                    Evaluasi pendaftaran didasarkan pada kelengkapan berkas pas foto, KK, akta kelahiran, serta nilai prestasi akademis calon siswa.
                  </p>
                </div>

                {applicant.catatanAdmin && (
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850">
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">Pesan Panitia Admisi:</span>
                    <p className="text-xs italic text-slate-300 mt-1">"{applicant.catatanAdmin}"</p>
                  </div>
                )}
              </div>

              {/* Card 2: Student Profil overview */}
              <div className="bg-slate-900/60 border border-slate-850 p-6 rounded-3xl space-y-3 text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Ringkasan Pendaftar</span>
                
                <div className="space-y-2 pt-1">
                  <div>
                    <span className="text-slate-500">Nama Lengkap</span>
                    <p className="font-bold text-white text-xs mt-0.5">{applicant.nama}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">NISN</span>
                    <p className="font-mono text-white text-xs mt-0.5">{applicant.nisn}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Kelas & Jalur Belajar</span>
                    <p className="font-bold text-white text-xs mt-0.5">Kelas {applicant.kelas} ({applicant.jurusan})</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daftar Ulang Portal Claimer if accepted! */}
            {applicant.status === 'Diterima' && (
              <div className="bg-gradient-to-tr from-emerald-950/20 to-slate-900/50 border border-emerald-500/20 p-8 rounded-[2rem] space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 text-xl">
                    <i className="fas fa-trophy animate-bounce"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">🎉 Selamat! Anda Dinyatakan Lolos Seleksi</h3>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      Anda telah resmi diterima sebagai calon siswa di Rombel KTCT Tambora. Langkah terakhir untuk mengaktifkan keanggotaan Anda adalah mengonfirmasi daftar ulang untuk mendapatkan <strong>Nomor Induk Siswa (NIS)</strong> dan <strong>Akun Portal ERP</strong> secara instan.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  {MockDb.siswa.some(s => s.nisn === applicant.nisn) ? (
                    <button
                      onClick={() => onSwitchToERP(applicant.nisn)}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      <i className="fas fa-university"></i>
                      <span>Masuk Portal ERP Sekarang</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDaftarUlang}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-emerald-500/15 cursor-pointer"
                    >
                      <i className="fas fa-check-circle"></i>
                      <span>Konfirmasi Daftar Ulang & Dapatkan NIS</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab content 2: Upload Berkas */}
        {activeTab === 'berkas' && (
          <div className="bg-slate-900 border border-slate-850 p-6 rounded-3xl space-y-6">
            <div>
              <h3 className="text-sm font-black text-white">Kelengkapan Dokumen Syarat Masuk</h3>
              <p className="text-xs text-slate-400 mt-1">Unggah berkas dalam format gambar atau PDF untuk mempermudah verifikasi kelulusan oleh panitia pelaksana.</p>
            </div>

            <form onSubmit={handleUploadBerkas} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                  <span className="font-bold text-white block">1. Pas Foto Calon Siswa <span className="text-red-500">*</span></span>
                  <p className="text-[10px] text-slate-500">Ukuran 3x4 berwarna dengan latar belakang merah/biru.</p>
                  <input
                    type="text"
                    placeholder="Masukkan URL foto atau nama file"
                    value={berkasPhoto}
                    onChange={(e) => setBerkasPhoto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-white text-xs outline-none mt-2"
                  />
                  {(applicant.berkas?.photo || berkasPhoto) && (
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1"><i className="fas fa-check-circle mr-1"></i> Pas Foto Terdeteksi</span>
                  )}
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                  <span className="font-bold text-white block">2. Kartu Keluarga (KK) <span className="text-red-500">*</span></span>
                  <p className="text-[10px] text-slate-500">Foto/Scan kartu keluarga asli terbaru.</p>
                  <input
                    type="text"
                    placeholder="Masukkan URL file atau nama file"
                    value={berkasKk}
                    onChange={(e) => setBerkasKk(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-white text-xs outline-none mt-2"
                  />
                  {(applicant.berkas?.kk || berkasKk) && (
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1"><i className="fas fa-check-circle mr-1"></i> KK Terdeteksi</span>
                  )}
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-2">
                  <span className="font-bold text-white block">3. Akta Kelahiran <span className="text-red-500">*</span></span>
                  <p className="text-[10px] text-slate-500">Foto/Scan akta kelahiran asli resmi.</p>
                  <input
                    type="text"
                    placeholder="Masukkan URL file atau nama file"
                    value={berkasAkta}
                    onChange={(e) => setBerkasAkta(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-white text-xs outline-none mt-2"
                  />
                  {(applicant.berkas?.akta || berkasAkta) && (
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1"><i className="fas fa-check-circle mr-1"></i> Akta Terdeteksi</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Simpan & Upload Dokumen
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      <footer className="mt-auto bg-slate-900 border-t border-slate-850 px-6 py-4 text-center text-[11px] text-slate-500">
        © 2026 ERP ROMBEL KTCT. Panitia SPMB Rombel Karang Taruna Tambora.
      </footer>
    </div>
  );
}
