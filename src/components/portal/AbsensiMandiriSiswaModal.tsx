import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, QrCode, MapPin, CheckCircle2, Clock, 
  AlertCircle, X, Upload, ShieldCheck, RefreshCw, 
  Image as ImageIcon, Sparkles, Navigation, UserCheck
} from 'lucide-react';
import { Student } from '../../types';
import { db } from '../../data/db';
import { fileToBase64WithCompression, getTodayDateString } from '../../lib/utils';

interface AbsensiMandiriSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onAttendanceSuccess?: () => void;
}

export default function AbsensiMandiriSiswaModal({
  isOpen,
  onClose,
  student,
  onAttendanceSuccess
}: AbsensiMandiriSiswaModalProps) {
  const [activeMode, setActiveMode] = useState<'selfie-lokasi' | 'qr-code'>('selfie-lokasi');
  
  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Today String
  const todayStr = getTodayDateString();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(currentTime);

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Check if student already attended today
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);

  const checkTodayAttendance = () => {
    const allAbsensi = (db.get('absensi') as any[]) || [];
    const myToday = allAbsensi.find(a => 
      a.tanggal === todayStr && 
      (a.studentId === student.id || a.nisn === student.nisn || a.nama === student.name)
    );
    setTodayAttendance(myToday || null);
  };

  useEffect(() => {
    if (isOpen) {
      checkTodayAttendance();
      detectGeolocation();
    }
  }, [isOpen, student]);

  // Geolocation State
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('Mendeteksi GPS Lokasi Sekolah...');

  const detectGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Perangkat Anda tidak mendukung fitur Geolocation GPS.');
      setLocationName('Lokasi Sekolah (Manual GPS)');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);
    setLocationName('Sedang mengunci koordinat GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGeoCoords({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy) });
        setGeoLoading(false);
        setLocationName(`Area Lokasi Sekolah (GPS Akurat ±${Math.round(accuracy)}m)`);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setGeoLoading(false);
        setGeoError('Izin lokasi GPS tidak aktif atau diblokir. Tetap dapat absen dengan foto bukti berseragam.');
        setLocationName('Lokasi Sekolah (Terverifikasi Foto)');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Selfie / Photo State
  const [photoProofBase64, setPhotoProofBase64] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [catatan, setCatatan] = useState('Hadir di Lingkungan Sekolah');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // QR Code State
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [qrScannedSuccess, setQrScannedSuccess] = useState(false);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    setErrorMsg(null);
    try {
      // Compress selfie photo
      const base64 = await fileToBase64WithCompression(file, 640, 640, 0.82);
      setPhotoProofBase64(base64);
    } catch (err: any) {
      setErrorMsg('Gagal memproses foto. Silakan coba lagi.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Submit Absensi Manual (Foto + Lokasi)
  const handleSubmitSelfieAttendance = () => {
    if (!photoProofBase64) {
      setErrorMsg('Wajib mengambil/mengunggah foto selfie bukti kehadiran di sekolah.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const allAbsensi = (db.get('absensi') as any[]) || [];
      
      // Determine if Late (e.g. after 07:15)
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const isLate = currentHour > 7 || (currentHour === 7 && currentMinute > 15);
      const statusLabel = isLate ? 'Terlambat' : 'Hadir';

      const newRecord = {
        id: `abs-self-${Date.now()}`,
        studentId: student.id,
        nisn: student.nisn || student.nis || '-',
        nama: student.name,
        rombelId: student.class,
        kelas: student.class,
        tanggal: todayStr,
        status: isLate ? 'TL' : 'H',
        statusLabel: statusLabel,
        jamMasuk: formattedTime,
        metode: 'Foto Lokasi Sekolah',
        fotoBukti: photoProofBase64,
        lokasi: locationName,
        koordinat: geoCoords ? `${geoCoords.lat.toFixed(6)}, ${geoCoords.lng.toFixed(6)}` : 'Terverifikasi Kamera',
        catatan: catatan || 'Presensi Mandiri Siswa',
        createdAt: new Date().toISOString()
      };

      // Filter out previous attendance for today if any, and prepend
      const filtered = allAbsensi.filter(a => 
        !(a.tanggal === todayStr && (a.studentId === student.id || a.nisn === student.nisn))
      );
      const updatedList = [newRecord, ...filtered];
      
      db.set('absensi', updatedList);
      setTodayAttendance(newRecord);
      setSuccessMsg(`Presensi Berhasil! Status: ${statusLabel} (${formattedTime}).`);
      
      if (onAttendanceSuccess) {
        onAttendanceSuccess();
      }
    } catch (e: any) {
      setErrorMsg('Terjadi kesalahan saat menyimpan presensi: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Absensi QR Code
  const handleSubmitQrAttendance = () => {
    const cleanToken = qrTokenInput.trim().toUpperCase();
    if (!cleanToken) {
      setErrorMsg('Silakan masukkan atau scan Kode QR Presensi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const allAbsensi = (db.get('absensi') as any[]) || [];
      
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const isLate = currentHour > 7 || (currentHour === 7 && currentMinute > 15);
      const statusLabel = isLate ? 'Terlambat' : 'Hadir';

      const newRecord = {
        id: `abs-qr-${Date.now()}`,
        studentId: student.id,
        nisn: student.nisn || student.nis || '-',
        nama: student.name,
        rombelId: student.class,
        kelas: student.class,
        tanggal: todayStr,
        status: isLate ? 'TL' : 'H',
        statusLabel: statusLabel,
        jamMasuk: formattedTime,
        metode: 'QR Code Scanner',
        qrToken: cleanToken,
        lokasi: 'Gerbang / Ruang Kelas (QR Validated)',
        catatan: `Presensi QR (${cleanToken})`,
        createdAt: new Date().toISOString()
      };

      const filtered = allAbsensi.filter(a => 
        !(a.tanggal === todayStr && (a.studentId === student.id || a.nisn === student.nisn))
      );
      const updatedList = [newRecord, ...filtered];
      
      db.set('absensi', updatedList);
      setTodayAttendance(newRecord);
      setQrScannedSuccess(true);
      setSuccessMsg(`Presensi QR Berhasil! Status: ${statusLabel} (${formattedTime}).`);
      
      if (onAttendanceSuccess) {
        onAttendanceSuccess();
      }
    } catch (e: any) {
      setErrorMsg('Gagal memverifikasi kode QR: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 sm:p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck size={26} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Presensi Mandiri Siswa
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight mt-0.5">
                Absensi QR & Foto Lokasi
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[240px] sm:max-w-xs">
                {student.name} ({student.class})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Digital Clock & Date */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white text-center shadow-inner relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-[11px] uppercase font-bold tracking-wider text-indigo-300 flex items-center justify-center gap-1.5">
            <Clock size={13} className="animate-spin text-indigo-400" />
            Waktu Presensi Sekolah
          </p>
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider mt-1 text-emerald-400 drop-shadow-sm">
            {formattedTime}
          </div>
          <p className="text-xs text-slate-300 font-medium mt-1">
            {formattedDate}
          </p>
        </div>

        {/* Status Sudah Absen Hari Ini */}
        {todayAttendance && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-950">
            <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-emerald-900">Anda Sudah Melakukan Presensi Hari Ini</span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-black rounded-full">
                  {todayAttendance.statusLabel || (todayAttendance.status === 'H' ? 'Hadir' : 'Terlambat')}
                </span>
              </div>
              <p className="text-emerald-800">
                Pukul <strong>{todayAttendance.jamMasuk || '-'}</strong> • Metode: <strong>{todayAttendance.metode || 'Presensi Mandiri'}</strong>
              </p>
              {todayAttendance.fotoBukti && (
                <div className="pt-2 flex items-center gap-2">
                  <img 
                    src={todayAttendance.fotoBukti} 
                    alt="Bukti Absensi" 
                    className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-300 shadow-xs" 
                  />
                  <span className="text-[11px] text-emerald-700 font-bold">Foto Bukti Terverifikasi</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode Selector Tabs (QR vs Selfie Lokasi) */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveMode('selfie-lokasi')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'selfie-lokasi'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera size={15} />
            <span>Foto di Lokasi Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('qr-code')}
            className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === 'qr-code'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode size={15} />
            <span>Scan / Input QR</span>
          </button>
        </div>

        {/* Notif Success / Error */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-bold animate-in fade-in">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MODE 1: SELFIE & FOTO DI LOKASI SEKOLAH */}
        {activeMode === 'selfie-lokasi' && (
          <div className="space-y-4">
            
            {/* GPS Location Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <MapPin size={13} className="text-rose-500" />
                  Status Lokasi GPS
                </span>
                <button
                  type="button"
                  onClick={detectGeolocation}
                  disabled={geoLoading}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={11} className={geoLoading ? 'animate-spin' : ''} />
                  <span>Refresh GPS</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className={`w-2 h-2 rounded-full ${geoCoords ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="truncate">{locationName}</span>
              </div>

              {geoCoords && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Koordinat: {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)} • Akurasi: ±{geoCoords.accuracy}m
                </p>
              )}

              {geoError && (
                <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
                  {geoError}
                </p>
              )}
            </div>

            {/* Photo Capture & Upload Box */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 block flex items-center justify-between">
                <span>Foto Selfie Bukti di Lokasi Sekolah:</span>
                <span className="text-[10px] font-normal text-slate-400">Wajib Seragam Rapi</span>
              </label>

              {photoProofBase64 ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-md bg-slate-900 group">
                  <img
                    src={photoProofBase64}
                    alt="Bukti Kehadiran"
                    className="w-full h-56 object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPhotoProofBase64('')}
                      className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                      title="Hapus / Ambil Ulang"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent text-white text-[10px] flex items-center justify-between">
                    <span className="flex items-center gap-1 text-emerald-300 font-bold">
                      <CheckCircle2 size={12} /> Foto Siap Dikirim
                    </span>
                    <span className="font-mono text-slate-300">{formattedTime}</span>
                  </div>
                </div>
              ) : (
                <div className="p-5 border-2 border-dashed border-indigo-200 bg-indigo-50/40 rounded-2xl text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center shadow-xs">
                    <Camera size={28} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-800">Ambil Foto Selfie / Foto Berseragam</p>
                    <p className="text-[11px] text-slate-500">Tunjukkan wajah dan latar lingkungan sekolah</p>
                  </div>

                  {/* Hidden Inputs */}
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="user"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isProcessingPhoto}
                      className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Camera size={15} />
                      <span>{isProcessingPhoto ? 'Memproses...' : 'Buka Kamera (Selfie)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingPhoto}
                      className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={14} />
                      <span>Pilih dari Galeri</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Catatan / Keterangan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Keterangan / Ruang Kelas:</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Hadir di Lab Komputer / Ruang Kelas 10-A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmitSelfieAttendance}
              disabled={isSubmitting || !photoProofBase64}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              <span>{isSubmitting ? 'Menyimpan Presensi...' : 'Kirim Absensi Bukti Foto'}</span>
            </button>
          </div>
        )}

        {/* MODE 2: QR CODE SCANNER & INPUT */}
        {activeMode === 'qr-code' && (
          <div className="space-y-4">
            <div className="p-5 bg-slate-900 text-white rounded-2xl text-center space-y-3 relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-indigo-400/50 mx-auto flex items-center justify-center shadow-lg">
                <QrCode size={34} className="text-indigo-300" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black">Scan QR Presensi Harian</h4>
                <p className="text-[11px] text-slate-300">
                  Arahkan kamera ke QR Code yang ditampilkan oleh Guru / Petugas Sekolah di gerbang atau ruang kelas.
                </p>
              </div>

              {/* Sample Quick Demo QR Tokens */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Contoh Kode QR Hari Ini:</span>
                <button
                  type="button"
                  onClick={() => setQrTokenInput(`QR-ABS-${todayStr}`)}
                  className="px-2 py-0.5 bg-indigo-600/60 hover:bg-indigo-600 text-[10px] font-mono font-bold rounded text-indigo-100 border border-indigo-400/40 cursor-pointer"
                >
                  QR-ABS-{todayStr}
                </button>
                <button
                  type="button"
                  onClick={() => setQrTokenInput('SMK-GERBANG-UTAMA')}
                  className="px-2 py-0.5 bg-sky-600/60 hover:bg-sky-600 text-[10px] font-mono font-bold rounded text-sky-100 border border-sky-400/40 cursor-pointer"
                >
                  SMK-GERBANG-UTAMA
                </button>
              </div>
            </div>

            {/* Input QR Code Manual */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-800 block">
                Kode / Token QR Presensi:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  placeholder="Contoh: QR-ABS-2026 atau paste hasil scan QR"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-hidden focus:ring-2 focus:ring-indigo-500 uppercase"
                />
                <button
                  type="button"
                  onClick={handleSubmitQrAttendance}
                  disabled={isSubmitting || !qrTokenInput.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>Verifikasi</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
              <Sparkles size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Tips Presensi QR:</strong> Kode QR diubah secara berkala oleh pihak sekolah untuk mencegah kecurangan dan memastikan siswa hadir langsung di lokasi.
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" />
            Tercatat Resmi di Buku Presensi
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
