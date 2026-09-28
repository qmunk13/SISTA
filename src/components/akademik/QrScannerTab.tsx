import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { matchStatusActive, getLocalDateString } from '../../lib/utils';
import { exportToExcel } from '../../lib/excel';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, Camera, CheckCircle2, AlertCircle, Sparkles, 
  UserCheck, Users, Clock, ShieldCheck, Volume2, ArrowRight, 
  RefreshCw, Zap, CameraOff, Download, Search, Filter, Laptop
} from 'lucide-react';

export default function QrScannerTab() {
  const { students, teachers, settings } = useStore();

  const [activeView, setActiveView] = useState<'scanner' | 'log'>('scanner');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const [manualCode, setManualCode] = useState('');
  const [searchLog, setSearchLog] = useState('');
  const [filterRole, setFilterRole] = useState<'SEMUA' | 'SISWA' | 'GURU'>('SEMUA');

  const [lastScannedResult, setLastScannedResult] = useState<{
    success: boolean;
    type: 'SISWA' | 'GURU';
    name: string;
    idCode: string;
    subtext: string;
    time: string;
    actionType: 'Masuk' | 'Pulang';
    message: string;
  } | null>(null);

  // QR Logs from sheet QR_LOG
  const [qrLogs, setQrLogs] = useState<any[]>(() => {
    return (db.get('qr_log') as any[]) || [];
  });

  // Recent scans feed
  const [recentScanHistory, setRecentScanHistory] = useState<any[]>(() => {
    return (db.get('recent_qr_scans') as any[]) || [];
  });

  // Keep logs in sync with DB events
  useEffect(() => {
    const handleDbUpdate = (e: any) => {
      if (!e.detail || e.detail.key === 'qr_log' || e.detail.key === 'absensi') {
        const updated = (db.get('qr_log') as any[]) || [];
        setQrLogs(updated);
        setRecentScanHistory((db.get('recent_qr_scans') as any[]) || []);
      }
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    return () => window.removeEventListener('erp-db-updated', handleDbUpdate);
  }, []);

  // Audio Beep Effect Generator
  const playBeep = (isSuccess = true) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 220, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio context might be restricted
    }
  };

  // Helper to persist to QR_LOG and ABSENSI sheets
  const persistQrLog = (logItem: any) => {
    const current = (db.get('qr_log') as any[]) || [];
    const updated = [logItem, ...current];
    db.set('qr_log', updated);
    setQrLogs(updated);
    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'qr_log' } }));
  };

  // Core Processing Engine
  const processQrInput = (rawCode: string) => {
    if (!rawCode.trim()) return;
    const cleanCode = rawCode.trim();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const today = getLocalDateString(now);
    const hour = now.getHours();

    // 1. Check Teacher
    const matchedTeacher = teachers.find(t => 
      (t.nip && t.nip.trim() === cleanCode) ||
      (t.nik && t.nik.trim() === cleanCode) ||
      (t.id && t.id.trim() === cleanCode) ||
      t.name.toLowerCase().includes(cleanCode.toLowerCase())
    );

    if (matchedTeacher) {
      playBeep(true);
      const isMorning = hour < 12;
      const actionType = isMorning ? 'Masuk' : 'Pulang';
      const status = isMorning ? (hour < 7 ? 'Tepat Waktu' : 'Terlambat') : 'Tepat Waktu';

      // 1A. Save to absensi_guru (sheet ABSENSI_GURU)
      const currentGuruAbsensi = (db.get('absensi_guru') as any[]) || [];
      const updatedGuruAbsensi = [
        {
          id: `absg-${Date.now()}`,
          tanggal: today,
          teacherId: matchedTeacher.id,
          nama: matchedTeacher.name,
          nip: matchedTeacher.nip || '-',
          jamMasuk: isMorning ? timeStr : '06:45:00',
          jamPulang: !isMorning ? timeStr : '-',
          status: status,
          metode: 'QR Scanner Real-time',
          keterangan: `Presensi QR ${actionType} otomatis terverifikasi`
        },
        ...currentGuruAbsensi
      ];
      db.set('absensi_guru', updatedGuruAbsensi);
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'absensi_guru' } }));

      // 1B. Save directly to sheet QR_LOG
      const logRecord = {
        id: `QR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        QRLogID: `QRLOG-${Date.now()}`,
        Tanggal: today,
        timestamp: `${today} ${timeStr}`,
        UserID: matchedTeacher.nip || matchedTeacher.id,
        nopdkt: matchedTeacher.nip || matchedTeacher.id,
        nama: matchedTeacher.name,
        role: 'GURU',
        kelas: matchedTeacher.class || '-',
        typeScan: actionType.toLowerCase(),
        QRCode: cleanCode,
        deviceInfo: 'Portal Scanner Real-time',
        Device: 'Webcam / Barcode Reader',
        Browser: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
        status: 'Berhasil',
        Status: status,
        Keterangan: `Presensi Guru ${actionType} Terekam (${timeStr})`,
        CreatedAt: new Date().toISOString()
      };
      persistQrLog(logRecord);

      const result = {
        success: true,
        type: 'GURU' as const,
        name: matchedTeacher.name,
        idCode: matchedTeacher.nip || matchedTeacher.id,
        subtext: `Tenaga Pendidik / Wali Kelas ${matchedTeacher.class || '-'}`,
        time: timeStr,
        actionType: actionType as any,
        message: `Selamat ${isMorning ? 'Pagi' : 'Sore'}, ${matchedTeacher.name}! Presensi ${actionType} Guru berhasil dicatat ke QR_LOG.`
      };

      setLastScannedResult(result);
      const newHistory = [result, ...recentScanHistory.slice(0, 9)];
      setRecentScanHistory(newHistory);
      db.set('recent_qr_scans', newHistory);
      setManualCode('');
      return;
    }

    // 2. Check Student
    const matchedStudent = students.find(s => 
      (s.nisn && s.nisn.trim() === cleanCode) ||
      (s.nis && s.nis.trim() === cleanCode) ||
      (s.id && s.id.trim() === cleanCode) ||
      (s.nik && s.nik.trim() === cleanCode) ||
      s.name.toLowerCase().includes(cleanCode.toLowerCase())
    );

    if (matchedStudent) {
      if (!matchStatusActive(matchedStudent.status)) {
        playBeep(false);
        // Log rejected scan
        const logRecord = {
          id: `QR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          QRLogID: `QRLOG-${Date.now()}`,
          Tanggal: today,
          timestamp: `${today} ${timeStr}`,
          UserID: matchedStudent.nisn || matchedStudent.id,
          nopdkt: matchedStudent.nisn || matchedStudent.id,
          nama: matchedStudent.name,
          role: 'SISWA',
          kelas: matchedStudent.class || '-',
          typeScan: 'ditolak',
          QRCode: cleanCode,
          deviceInfo: 'Portal Scanner Real-time',
          Device: 'Webcam / Barcode Reader',
          Browser: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
          status: 'Ditolak',
          Status: 'Non-Aktif',
          Keterangan: `Siswa Non-Aktif (${matchedStudent.status || 'Keluar'})`,
          CreatedAt: new Date().toISOString()
        };
        persistQrLog(logRecord);

        setLastScannedResult({
          success: false,
          type: 'SISWA',
          name: matchedStudent.name,
          idCode: `NISN: ${matchedStudent.nisn || matchedStudent.nis || '-'}`,
          subtext: `Status: ${matchedStudent.status || 'Non-Aktif'} (Kelas ${matchedStudent.class})`,
          time: timeStr,
          actionType: 'Masuk',
          message: `Presensi Ditolak: Siswa berstatus ${matchedStudent.status || 'Non-Operasional'} (Pindah/Lulus/Keluar).`
        });
        setManualCode('');
        return;
      }

      playBeep(true);
      const isMorning = hour < 12;
      const actionType = isMorning ? 'Masuk' : 'Pulang';

      // 2A. Save to absensi (sheet ABSENSI)
      const currentAbsensi = (db.get('absensi') as any[]) || [];
      const existingIdx = currentAbsensi.findIndex((a: any) => 
        (a.studentId === matchedStudent.id || (matchedStudent.nisn && a.nisn === matchedStudent.nisn) || (a.name && a.name.toLowerCase() === matchedStudent.name.toLowerCase())) &&
        a.date === today
      );

      const recordItem = {
        id: existingIdx >= 0 ? currentAbsensi[existingIdx].id : `abs-${matchedStudent.id}-${today}`,
        studentId: matchedStudent.id,
        nisn: matchedStudent.nisn || (matchedStudent as any).NISN || matchedStudent.nis || '-',
        name: matchedStudent.name,
        class: matchedStudent.class,
        date: today,
        time: timeStr,
        status: 'H',
        statusLabel: 'Hadir',
        note: `Presensi QR ${actionType} pada ${timeStr}`,
        type: actionType,
        method: 'QR Scanner Real-time'
      };

      let updatedAbsensi: any[];
      if (existingIdx >= 0) {
        updatedAbsensi = [...currentAbsensi];
        updatedAbsensi[existingIdx] = { ...updatedAbsensi[existingIdx], ...recordItem };
      } else {
        updatedAbsensi = [recordItem, ...currentAbsensi];
      }
      db.set('absensi', updatedAbsensi);
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'absensi' } }));

      // 2B. Save directly to sheet QR_LOG
      const logRecord = {
        id: `QR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        QRLogID: `QRLOG-${Date.now()}`,
        Tanggal: today,
        timestamp: `${today} ${timeStr}`,
        UserID: matchedStudent.nisn || matchedStudent.id,
        nopdkt: matchedStudent.nisn || matchedStudent.id,
        nama: matchedStudent.name,
        role: 'SISWA',
        kelas: matchedStudent.class || '-',
        typeScan: actionType.toLowerCase(),
        QRCode: cleanCode,
        deviceInfo: 'Portal Scanner Real-time',
        Device: 'Webcam / Barcode Reader',
        Browser: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
        status: 'Berhasil',
        Status: 'Hadir',
        Keterangan: `Presensi Siswa ${actionType} Tercatat (${timeStr})`,
        CreatedAt: new Date().toISOString()
      };
      persistQrLog(logRecord);

      const result = {
        success: true,
        type: 'SISWA' as const,
        name: matchedStudent.name,
        idCode: `NISN: ${matchedStudent.nisn || matchedStudent.nis || '-'}`,
        subtext: `Peserta Didik - Kelas ${matchedStudent.class}`,
        time: timeStr,
        actionType: actionType as any,
        message: `Presensi Siswa Berhasil! Selamat Belajar, ${matchedStudent.name}. Tercatat di sheet ABSENSI & QR_LOG.`
      };

      setLastScannedResult(result);
      const newHistory = [result, ...recentScanHistory.slice(0, 9)];
      setRecentScanHistory(newHistory);
      db.set('recent_qr_scans', newHistory);
      setManualCode('');
      return;
    }

    // 3. Not Found
    playBeep(false);
    const logRecord = {
      id: `QR_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      QRLogID: `QRLOG-${Date.now()}`,
      Tanggal: today,
      timestamp: `${today} ${timeStr}`,
      UserID: cleanCode,
      nopdkt: cleanCode,
      nama: 'Tidak Dikenali',
      role: 'UNKNOWN',
      kelas: '-',
      typeScan: 'gagal',
      QRCode: cleanCode,
      deviceInfo: 'Portal Scanner Real-time',
      Device: 'Webcam / Barcode Reader',
      Browser: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
      status: 'Gagal',
      Status: 'Tidak Ditemukan',
      Keterangan: `ID "${cleanCode}" tidak terdaftar di database`,
      CreatedAt: new Date().toISOString()
    };
    persistQrLog(logRecord);

    setLastScannedResult({
      success: false,
      type: 'SISWA',
      name: 'Kode QR Tidak Dikenali',
      idCode: cleanCode,
      subtext: 'Data tidak terdaftar di database',
      time: timeStr,
      actionType: 'Masuk',
      message: `ID/Kode "${cleanCode}" tidak cocok dengan data Guru atau Siswa manapun.`
    });
  };

  // --- Real-time Camera QR Scanner Engine (html5-qrcode) ---
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    setTimeout(() => {
      try {
        const scanner = new Html5Qrcode('qr-reader-container');
        html5QrCodeRef.current = scanner;

        scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            processQrInput(decodedText);
          },
          () => {
            // ignore scan frame errors
          }
        ).catch((err) => {
          console.warn('Camera start error:', err);
          setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser.');
          setIsCameraActive(false);
        });
      } catch (err: any) {
        setCameraError(err?.message || 'Inisialisasi kamera gagal.');
        setIsCameraActive(false);
      }
    }, 200);
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (e) {
        console.warn('Stop scanner error:', e);
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Hardware Barcode Scanner Listener (Enter Key buffer)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an active input, skip global capture
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          processQrInput(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [students, teachers]);

  // Filtered QR Logs
  const filteredLogs = qrLogs.filter((log) => {
    const matchSrch = searchLog
      ? (log.nama || '').toLowerCase().includes(searchLog.toLowerCase()) ||
        (log.UserID || log.nopdkt || '').toLowerCase().includes(searchLog.toLowerCase()) ||
        (log.QRCode || '').toLowerCase().includes(searchLog.toLowerCase())
      : true;

    const matchR = filterRole === 'SEMUA' ? true : log.role === filterRole;
    return matchSrch && matchR;
  });

  const handleExportLogsExcel = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada log presensi untuk diekspor.');
      return;
    }
    const rows = filteredLogs.map((l, idx) => ({
      No: idx + 1,
      'Log ID': l.QRLogID || l.id,
      'Tanggal': l.Tanggal,
      'Timestamp': l.timestamp || l.CreatedAt,
      'Peran': l.role || 'SISWA',
      'NISN / NIP': l.UserID || l.nopdkt,
      'Nama Lengkap': l.nama,
      'Kelas / Jabatan': l.kelas,
      'Jenis Presensi': l.typeScan,
      'Status': l.status || l.Status,
      'Keterangan': l.Keterangan,
      'Perangkat': l.deviceInfo || l.Device
    }));
    exportToExcel(rows, `Sheet_QR_LOG_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Sub-Navigation */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
            <QrCode size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">Presensi Barcode & QR Scanner Real-time</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                <Zap size={10} className="fill-emerald-600" /> Sinkron QR_LOG & ABSENSI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Pemindaian kartu pelajar siswa & guru langsung masuk ke sheet <b>QR_LOG</b> dan <b>ABSENSI</b> secara instan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveView('scanner')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'scanner' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera size={14} />
            <span>Scanner Live</span>
          </button>
          <button
            onClick={() => setActiveView('log')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeView === 'log' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} />
            <span>Sheet QR_LOG ({qrLogs.length})</span>
          </button>
        </div>
      </div>

      {activeView === 'scanner' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Scanner Area */}
          <div className="lg:col-span-7 space-y-5">
            {/* Main Scanner Box */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white text-center space-y-5 relative overflow-hidden shadow-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                  Pusat Pemindaian Otomatis
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Laptop size={12} /> Auto-detect Barcode Reader
                </span>
              </div>

              {/* Camera Video Stream or Fallback Viewfinder */}
              <div className="w-64 h-64 mx-auto relative rounded-3xl border-2 border-dashed border-indigo-400/60 bg-slate-800/60 flex flex-col items-center justify-center p-2 overflow-hidden">
                {isCameraActive ? (
                  <div id="qr-reader-container" className="w-full h-full rounded-2xl overflow-hidden"></div>
                ) : (
                  <>
                    <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-indigo-400"></div>
                    <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-indigo-400"></div>
                    <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-indigo-400"></div>
                    <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-indigo-400"></div>
                    
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse shadow-lg shadow-cyan-500"></div>

                    <QrCode size={64} className="text-indigo-300 opacity-60 mb-2" />
                    <span className="text-[11px] text-slate-300 font-medium">Area Fokus Pemindaian</span>
                  </>
                )}
              </div>

              {cameraError && (
                <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 p-2.5 rounded-xl">
                  {cameraError}
                </div>
              )}

              {/* Camera Toggle Button */}
              <div className="flex justify-center">
                {isCameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                  >
                    <CameraOff size={15} />
                    <span>Matikan Kamera</span>
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                  >
                    <Camera size={15} />
                    <span>Aktifkan Kamera Webcam</span>
                  </button>
                )}
              </div>

              {/* Manual Code Input Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  processQrInput(manualCode);
                }}
                className="flex items-center gap-2 pt-2 border-t border-slate-800"
              >
                <input
                  type="text"
                  placeholder="Ketik atau tembak barcode kartu (NISN, NIP, atau ID)..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                >
                  Scan & Catat
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Scan Result & Realtime Feed */}
          <div className="lg:col-span-5 space-y-4">
            {/* Latest Result Card */}
            {lastScannedResult ? (
              <div className={`p-5 rounded-3xl border-2 transition-all space-y-3 animate-in zoom-in-95 ${
                lastScannedResult.success 
                  ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950 shadow-md shadow-emerald-100' 
                  : 'bg-rose-50/70 border-rose-400 text-rose-950 shadow-md shadow-rose-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    lastScannedResult.success ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {lastScannedResult.success ? `✓ Terverifikasi (${lastScannedResult.type})` : '✕ Gagal Dikenali'}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-600">
                    ⏰ {lastScannedResult.time}
                  </span>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${
                    lastScannedResult.success ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                  }`}>
                    {lastScannedResult.name.charAt(0)}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <h4 className="font-black text-sm text-slate-900 leading-tight">{lastScannedResult.name}</h4>
                    <div className="text-[11px] font-mono font-bold text-indigo-700">{lastScannedResult.idCode}</div>
                    <div className="text-[10px] text-slate-600">{lastScannedResult.subtext}</div>
                  </div>
                </div>

                <p className="text-xs font-medium pt-2 border-t border-slate-200/60 leading-relaxed">
                  {lastScannedResult.message}
                </p>
              </div>
            ) : (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-400 space-y-2">
                <Clock size={32} className="mx-auto text-slate-300" />
                <h4 className="font-bold text-slate-700 text-sm">Menunggu Hasil Pemindaian</h4>
                <p className="text-xs text-slate-400">Scan QR Code siswa atau guru untuk melihat informasi kehadiran di sini.</p>
              </div>
            )}

            {/* Recent Scans History Feed */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Riwayat Pemindaian Terkini</span>
                <span className="text-[10px] font-bold text-indigo-600 cursor-pointer" onClick={() => setActiveView('log')}>
                  Lihat Semua Sheet QR_LOG →
                </span>
              </h4>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {recentScanHistory.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat scan sesi ini.</p>
                ) : (
                  recentScanHistory.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/70 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                          item.type === 'GURU' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.type === 'GURU' ? 'G' : 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-500">{item.subtext}</div>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-slate-600 pl-2">
                        {item.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Log View: Complete Sheet QR_LOG Table & Export */
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Arsip Log Pemindaian Kartu (Sheet QR_LOG)</h3>
              <p className="text-xs text-slate-500">
                Total {qrLogs.length} transaksi pemindaian barcode/QR terekam di sistem dengan penanda waktu presisi.
              </p>
            </div>

            <button
              onClick={handleExportLogsExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-emerald-200"
            >
              <Download size={14} />
              <span>Export Sheet QR_LOG (.xlsx)</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, NISN, NIP, atau kode QR..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['SEMUA', 'SISWA', 'GURU'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setFilterRole(role)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    filterRole === role
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">Waktu Pemindaian</th>
                  <th className="p-3">Peran</th>
                  <th className="p-3">ID / NISN / NIP</th>
                  <th className="p-3">Nama Lengkap</th>
                  <th className="p-3">Kelas / Rombel</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      Tidak ada catatan QR_LOG yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-600">{log.timestamp || log.Tanggal}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          log.role === 'GURU' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {log.role || 'SISWA'}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">{log.UserID || log.nopdkt || log.QRCode}</td>
                      <td className="p-3 font-bold text-slate-900">{log.nama}</td>
                      <td className="p-3 text-slate-600">{log.kelas || '-'}</td>
                      <td className="p-3 font-semibold uppercase text-slate-700">{log.typeScan || 'Masuk'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          (log.status === 'Berhasil' || log.Status === 'Hadir' || log.status === 'Hadir')
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.status || log.Status || 'Berhasil'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">{log.Keterangan}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
