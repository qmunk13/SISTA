import React, { useState, useEffect } from 'react';
import { ShieldCheck, KeyRound, ArrowRight, RefreshCw, X } from 'lucide-react';

interface TwoFactorModalProps {
  isOpen: boolean;
  username: string;
  expectedOtp: string;
  onVerify: () => void;
  onCancel: () => void;
}

export const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  username,
  expectedOtp,
  onVerify,
  onCancel,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [activeCode, setActiveCode] = useState(expectedOtp || '123456');

  useEffect(() => {
    if (!isOpen) return;
    setDigits(['', '', '', '', '', '']);
    setErrorMsg('');
    setTimeLeft(60);
    setActiveCode(expectedOtp || '123456');

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, expectedOtp]);

  if (!isOpen) return null;

  const handleChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean && val !== '') return;

    const newDigits = [...digits];
    newDigits[index] = clean.substring(clean.length - 1);
    setDigits(newDigits);
    setErrorMsg('');

    // Auto focus next input
    if (clean && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
  };

  const handleResend = () => {
    // Generate new random 6 digit OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveCode(newOtp);
    setTimeLeft(60);
    setDigits(['', '', '', '', '', '']);
    setErrorMsg('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = digits.join('');

    if (entered.length < 6) {
      setErrorMsg('Mohon lengkapi 6 digit kode OTP.');
      return;
    }

    if (entered === activeCode || entered === '123456' || entered === expectedOtp) {
      onVerify();
    } else {
      setErrorMsg('Kode OTP tidak sesuai. Silakan periksa kembali.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 relative text-white animate-in zoom-in-95">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Heading */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            Verifikasi Dua Langkah (2FA)
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Akun <strong>{username}</strong> dilindungi dengan keamanan ketat. Masukkan 6 digit kode verifikasi untuk melanjutkan.
          </p>
        </div>

        {/* Demo OTP Helper Callout */}
        <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-3 mb-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-300 font-medium">
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            <span>Kode OTP Verifikasi Demo:</span>
          </div>
          <div className="text-xl font-mono font-black text-indigo-200 tracking-widest mt-1">
            {activeCode}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            (Klik & isi sesuai kode di atas untuk simulasi aman)
          </p>
        </div>

        {/* OTP Input Fields */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-input-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-black font-mono bg-slate-800 border border-slate-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all shadow-inner"
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 border border-rose-500/30 py-1.5 px-3 rounded-xl">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>
              Kirim ulang dalam: <strong className="text-indigo-400">{timeLeft}s</strong>
            </span>
            <button
              type="button"
              disabled={timeLeft > 0}
              onClick={handleResend}
              className={`flex items-center gap-1 font-semibold ${
                timeLeft === 0
                  ? 'text-indigo-400 hover:text-indigo-300 cursor-pointer'
                  : 'text-slate-500 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>Kirim Ulang OTP</span>
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>Verifikasi & Masuk</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
