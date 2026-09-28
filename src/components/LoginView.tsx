import React, { useState } from 'react';
import {
  User,
  Lock,
  ArrowRight,
  GraduationCap,
  Users,
  ShieldCheck,
  CheckCircle,
  IdCard,
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { StorageService } from '../services/storageService';
import { AuthService } from '../services/authService';

interface LoginViewProps {
  onLoginSuccess: (user: UserAccount) => void;
  onRequest2FA: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onRequest2FA,
}) => {
  const [activeRoleTab, setActiveRoleTab] = useState<UserRole>('SISWA');
  const [username, setUsername] = useState('0081234501');
  const [password, setPassword] = useState('ahmad001');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Self Registration Modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [regNisn, setRegNisn] = useState('');
  const [regSuccess, setRegSuccess] = useState<{ username: string; pass: string; nama: string } | null>(null);
  const [regError, setRegError] = useState('');

  // Switch Role tab presets for quick testing
  const handleSelectRoleTab = (role: UserRole) => {
    setActiveRoleTab(role);
    setErrorMsg('');

    switch (role) {
      case 'SISWA':
        setUsername('0081234501');
        setPassword('ahmad001');
        break;
      case 'GURU':
        setUsername('guru');
        setPassword('guru123');
        break;
      case 'ORANG_TUA':
        setUsername('ortu');
        setPassword('ortu123');
        break;
      case 'ADMIN':
        setUsername('admin');
        setPassword('admin123');
        break;
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan Password wajib diisi!');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const users = StorageService.getUsers();
      const passwords = StorageService.getPasswords();
      const inputTrim = username.trim().toLowerCase();

      let user = users.find(
        (u) => u.username.toLowerCase() === inputTrim ||
               (u.nopdkt && u.nopdkt.toLowerCase() === inputTrim)
      );

      // Cek fallback ke sheet USERS Google Spreadsheet
      if (!user) {
        const sheetUser = AuthService.findUserByIdentifier(inputTrim);
        if (sheetUser) {
          user = {
            id: sheetUser.id,
            username: sheetUser.username,
            nama: sheetUser.nama,
            name: sheetUser.nama,
            role: sheetUser.role as any,
            email: sheetUser.email,
            status: sheetUser.status,
            nopdkt: sheetUser.nipNisn,
            password: sheetUser.password
          };
        }
      }

      if (!user) {
        setErrorMsg('Pengguna tidak ditemukan dalam database atau sheet USERS.');
        return;
      }

      const userStatusUpper = String(user.status || '').toUpperCase();
      if (userStatusUpper !== 'AKTIF') {
        setErrorMsg(`Akun Anda saat ini berstatus "${user.status || 'Tidak Aktif'}". Hanya pengguna aktif yang dapat masuk. Silakan hubungi admin Rombel.`);
        return;
      }

      const rawUserFirstName = (user.nama || user.name || '').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      const userPdkt = (user.nopdkt || '').trim().toLowerCase().replace(/^pdkt-?/i, '');
      const dynamicGeneratedPass = `${rawUserFirstName}${userPdkt}`;

      const expectedPass = (passwords[user.username] || (user.nopdkt && passwords[user.nopdkt]) || (user as any).password || '').toLowerCase();
      const inputPass = password.trim().toLowerCase();

      const isValidPassword = 
        (expectedPass && inputPass === expectedPass) ||
        (dynamicGeneratedPass && inputPass === dynamicGeneratedPass);

      if (!isValidPassword) {
        setErrorMsg('Password salah. Password tidak sesuai dengan identitas pengguna.');
        return;
      }

      // If user has 2FA enabled, trigger 2FA modal
      if (user.twoFactorEnabled) {
        onRequest2FA(user);
      } else {
        StorageService.setSession(user);
        onLoginSuccess(user);
      }
    }, 400);
  };

  const handleProcessRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess(null);

    const clean = regNisn.trim();
    if (!clean) {
      setRegError('NISN tidak boleh kosong!');
      return;
    }

    const students = StorageService.getStudents();
    const student = students.find((s) => s.nisn === clean);

    if (!student) {
      setRegError('NISN tidak ditemukan dalam basis data siswa Rombel KTCT.');
      return;
    }

    const users = StorageService.getUsers();
    const existing = users.find((u) => u.username === clean);
    if (existing) {
      setRegError('Akun dengan NISN ini sudah terdaftar sebelumnya. Silakan langsung login.');
      return;
    }

    // Generate account: nama depan sebelum spasi + nomor pdkt
    const firstName = (student.nama || 'siswa').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const pdkt = (student.noPdkt || (student as any).nopdkt || (student as any).NoPDKT || (student as any).nis || '').toString().trim().replace(/^pdkt-?/i, '');
    const generatedPass = `${firstName}${pdkt || student.nisn.slice(-3)}`;
    const newUser: UserAccount = {
      idUser: 'U-' + Date.now().toString().slice(-5),
      username: clean,
      nama: student.nama,
      role: 'SISWA',
      status: 'AKTIF',
      kelas: student.kelas,
      jenjang: student.jenjang,
      linkFoto: student.linkFoto,
      nopdkt: pdkt,
      twoFactorEnabled: false,
    };

    StorageService.saveUser(newUser);
    StorageService.setPassword(clean, generatedPass);
    if (pdkt) StorageService.setPassword(pdkt, generatedPass);

    setRegSuccess({
      username: clean,
      pass: generatedPass,
      nama: student.nama,
    });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-[2.25rem] shadow-2xl p-6 sm:p-8 relative text-white animate-in zoom-in-95">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 mx-auto mb-3 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            PTS CBT ONLINE
          </h2>
          <p className="text-xs text-indigo-200 mt-1 font-medium">
            Penilaian Tengah Semester • Rombel Karang Taruna
          </p>
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Tahun Ajaran 2025/2026
          </span>
        </div>

        {/* Demo Persona Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-800/80 rounded-2xl mb-6 text-[11px] font-bold">
          {(['SISWA', 'ADMIN', 'ORANG_TUA'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleSelectRoleTab(r)}
              className={`py-2 rounded-xl transition ${
                activeRoleTab === r
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 'ORANG_TUA' ? 'Ortu' : r === 'ADMIN' ? 'Admin & Guru' : 'Siswa'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              {activeRoleTab === 'SISWA'
                ? 'NISN Siswa'
                : activeRoleTab === 'ORANG_TUA'
                ? 'Username Orang Tua'
                : 'Username Pegawai'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-4 top-3.5 text-indigo-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username atau NISN"
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-3.5 text-indigo-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password akun"
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl py-3 pl-11 pr-4 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 border border-rose-500/30 py-2 px-3 rounded-xl">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
          >
            <span>{loading ? 'Memverifikasi...' : 'MASUK KE APLIKASI'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Self-registration Link */}
        <div className="mt-5 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
          <p>
            Belum punya akun siswa?{' '}
            <button
              type="button"
              onClick={() => {
                setShowRegModal(true);
                setRegError('');
                setRegSuccess(null);
                setRegNisn('');
              }}
              className="text-indigo-400 hover:underline font-bold"
            >
              Registrasi Mandiri di sini
            </button>
          </p>
        </div>
      </div>

      {/* Student Self Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 text-white shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-black text-white text-center mb-1">
              Registrasi Akun Siswa Mandiri
            </h3>
            <p className="text-xs text-slate-400 text-center mb-5">
              Masukkan Nomor Induk Siswa Nasional (NISN) Anda
            </p>

            {regSuccess ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-300">
                  Pendaftaran Berhasil!
                </h4>
                <p className="text-xs text-slate-300">
                  Halo <strong>{regSuccess.nama}</strong>, akun Anda telah siap digunakan:
                </p>
                <div className="bg-slate-900 p-3 rounded-xl text-xs space-y-1 font-mono">
                  <p>Username (NISN): <strong>{regSuccess.username}</strong></p>
                  <p>Password: <strong className="text-emerald-400">{regSuccess.pass}</strong></p>
                </div>
                <button
                  onClick={() => {
                    setUsername(regSuccess.username);
                    setPassword(regSuccess.pass);
                    setShowRegModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  Gunakan untuk Login Sekarang
                </button>
              </div>
            ) : (
              <form onSubmit={handleProcessRegistration} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">Nomor Induk Siswa Nasional (NISN)</label>
                  <div className="relative">
                    <IdCard className="w-4 h-4 absolute left-3.5 top-3 text-indigo-400" />
                    <input
                      type="text"
                      value={regNisn}
                      onChange={(e) => setRegNisn(e.target.value)}
                      placeholder="Contoh: 0081234506"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Contoh NISN demo yang tersedia: <code className="text-indigo-300 font-mono">0081234506</code> (Nabila) atau <code className="text-indigo-300 font-mono">0081234507</code> (Bagus).
                  </p>
                </div>

                {regError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl text-center">
                    {regError}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Daftar Akun
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
