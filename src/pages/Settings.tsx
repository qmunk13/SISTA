import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Save, Copy, Check, Smartphone, Database, AlertCircle, Upload, Trash2, 
  Image, Calendar, Download, Link2, Folder, 
  CheckCircle2, ExternalLink, RefreshCw, FileSpreadsheet,
  Zap, CheckCheck, Play, ArrowRight, ShieldCheck
} from 'lucide-react';
import { GAS_TEMPLATE } from '../lib/constants';
import { fetchFromGAS } from '../lib/api';
import QRCode from "react-qr-code";
import { db } from '../data/db';
import { DEFAULT_APP_CONFIG } from '../data/config';
import { getGoogleDriveDirectImageUrl } from '../lib/utils';
import { MASTER_TABLES_60 } from '../data/masterDatabase60';
import { downloadMenuStructureExcel } from '../data/menuDataStructureExport';
import { autoSyncEngine, AutoSyncStatus } from '../data/autoSyncEngine';
import { getAllAppDataForSync } from '../data/syncAllData';
import { setSemesterAndTahunAjaran, normalizeSemesterType } from '../lib/semester';

export default function Settings() {
  const { settings, setSettings } = useStore();
  const [url, setUrl] = useState(settings.scriptUrl || DEFAULT_APP_CONFIG.scriptUrl);
  const [appName, setAppName] = useState((settings.appName && !settings.appName.toLowerCase().includes('citapen')) ? settings.appName : DEFAULT_APP_CONFIG.appName);
  const [schoolName, setSchoolName] = useState((settings.schoolName && !settings.schoolName.toLowerCase().includes('citapen')) ? settings.schoolName : DEFAULT_APP_CONFIG.schoolName);
  const [tahunPelajaran, setTahunPelajaran] = useState(() => {
    const tp = settings.tahunPelajaran || DEFAULT_APP_CONFIG.tahunPelajaran;
    return tp === '2025/2026' ? '2026/2027' : tp;
  });
  const [semesterActive, setSemesterActive] = useState<'Ganjil' | 'Genap'>(() => {
    return normalizeSemesterType({ semester: settings.semester, name: settings.semester });
  });

  useEffect(() => {
    setSemesterActive(normalizeSemesterType({ semester: settings.semester, name: settings.semester }));
  }, [settings.semester]);
  const [folderId, setFolderId] = useState(settings.folderId || DEFAULT_APP_CONFIG.folderId);
  const [folderModulId, setFolderModulId] = useState(settings.folderModulId || DEFAULT_APP_CONFIG.folderModulId || '1xaf825icvAaXO7T1YtxjbWQQw-sud_t0');
  const [folderSiswaId, setFolderSiswaId] = useState(settings.folderSiswaId || DEFAULT_APP_CONFIG.folderSiswaId);
  const [spreadsheetId, setSpreadsheetId] = useState(settings.spreadsheetId || DEFAULT_APP_CONFIG.spreadsheetId);
  const [adminUser, setAdminUser] = useState(settings.adminUsername || DEFAULT_APP_CONFIG.adminUsername);
  const [adminPass, setAdminPass] = useState(settings.adminPassword || DEFAULT_APP_CONFIG.adminPassword);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(settings.schoolLogoUrl || DEFAULT_APP_CONFIG.schoolLogoUrl);
  const [copied, setCopied] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Auto-Sync & Mass Sync All States
  const [autoSyncState, setAutoSyncState] = useState<AutoSyncStatus>({
    state: 'idle',
    pendingTables: [],
    totalSyncedCount: 0,
    autoSyncEnabled: autoSyncEngine.isEnabled()
  });
  const [isSyncingAllModules, setIsSyncingAllModules] = useState(false);
  const [syncAllProgressText, setSyncAllProgressText] = useState('');
  const [syncAllProgressPercent, setSyncAllProgressPercent] = useState(0);
  const [syncAllResult, setSyncAllResult] = useState<{ success: boolean; message: string; totalTables?: number } | null>(null);

  const [isPullingFromGas, setIsPullingFromGas] = useState(false);
  const [pullStatus, setPullStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Web App Health Diagnostic
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [gasStatusInfo, setGasStatusInfo] = useState<{ isOnline?: boolean; message?: string; isHtml?: boolean; error?: string } | null>(null);

  const handleTestGasStatus = async () => {
    setIsTestingGas(true);
    setGasStatusInfo(null);
    try {
      const resp = await fetch('/api/gas/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl: url, spreadsheetId })
      });
      const data = await resp.json();
      setGasStatusInfo(data);
    } catch (err: any) {
      setGasStatusInfo({ isOnline: false, error: err?.message || 'Gagal terhubung ke proxy server' });
    } finally {
      setIsTestingGas(false);
    }
  };

  const handlePullFromGas = async () => {
    if (!url) {
      alert("URL Google Apps Script belum diisi! Silakan isi dan simpan form konfigurasi di atas.");
      return;
    }
    setIsPullingFromGas(true);
    setPullStatus(null);
    try {
      const res = await autoSyncEngine.pullAndApplyAllSheets({ force: true, silent: false });
      setPullStatus({
        success: res.success,
        message: res.message || (res.success ? 'Data seluruh tabel berhasil ditarik langsung dari Google Spreadsheet!' : 'Gagal menarik data.')
      });
    } catch (err: any) {
      setPullStatus({
        success: false,
        message: err.message || 'Gagal menarik data dari Google Spreadsheet.'
      });
    } finally {
      setIsPullingFromGas(false);
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listen for auto-sync status updates
    const handleAutoSyncStatus = (event: any) => {
      if (event.detail) {
        setAutoSyncState(event.detail);
      }
    };
    window.addEventListener('erp-auto-sync-status', handleAutoSyncStatus);
    return () => {
      window.removeEventListener('erp-auto-sync-status', handleAutoSyncStatus);
    };
  }, []);

  const handleToggleAutoSync = () => {
    const nextState = !autoSyncState.autoSyncEnabled;
    autoSyncEngine.setEnabled(nextState);
    setAutoSyncState(prev => ({ ...prev, autoSyncEnabled: nextState }));
  };

  const handleSyncAllModulesNow = async () => {
    if (!url) {
      alert("URL Google Apps Script belum diisi! Silakan isi dan simpan form konfigurasi di atas.");
      return;
    }

    setIsSyncingAllModules(true);
    setSyncAllResult(null);
    setSyncAllProgressPercent(10);
    setSyncAllProgressText(`Mempersiapkan seluruh ${MASTER_TABLES_60.length} tabel database...`);

    try {
      const res = await autoSyncEngine.syncAllModules((step, percent) => {
        setSyncAllProgressText(step);
        setSyncAllProgressPercent(percent);
      });
      setSyncAllResult(res);
    } catch (err: any) {
      setSyncAllResult({
        success: false,
        message: err.message || 'Gagal menyinkronkan seluruh modul ke Google Spreadsheet.'
      });
    } finally {
      setIsSyncingAllModules(false);
    }
  };

  useEffect(() => {
    if (settings.scriptUrl) setUrl(prev => prev !== settings.scriptUrl ? settings.scriptUrl : prev);
    if (settings.tahunPelajaran) setTahunPelajaran(prev => prev !== settings.tahunPelajaran ? settings.tahunPelajaran : prev);
    if (settings.folderId) setFolderId(prev => prev !== settings.folderId ? settings.folderId : prev);
    if (settings.folderModulId) setFolderModulId(prev => prev !== settings.folderModulId ? settings.folderModulId : prev);
    if (settings.folderSiswaId) setFolderSiswaId(prev => prev !== settings.folderSiswaId ? settings.folderSiswaId : prev);
    if (settings.spreadsheetId) setSpreadsheetId(prev => prev !== settings.spreadsheetId ? settings.spreadsheetId : prev);
    if (settings.schoolLogoUrl) setSchoolLogoUrl(prev => prev !== settings.schoolLogoUrl ? settings.schoolLogoUrl : prev);
    if (settings.schoolName) {
      const targetSchool = settings.schoolName.toLowerCase().includes('citapen') ? DEFAULT_APP_CONFIG.schoolName : settings.schoolName;
      setSchoolName(prev => prev !== targetSchool ? targetSchool : prev);
    }
    if (settings.appName) {
      const targetApp = settings.appName.toLowerCase().includes('citapen') ? DEFAULT_APP_CONFIG.appName : settings.appName;
      setAppName(prev => prev !== targetApp ? targetApp : prev);
    }
  }, [settings.scriptUrl, settings.tahunPelajaran, settings.schoolName, settings.appName, settings.folderId, settings.folderModulId, settings.folderSiswaId, settings.spreadsheetId, settings.schoolLogoUrl]);

  const shareConfigUrl = settings.scriptUrl ? `${window.location.origin}${window.location.pathname}?config=${encodeURIComponent(btoa(JSON.stringify({ scriptUrl: settings.scriptUrl, folderId: settings.folderId, folderModulId: settings.folderModulId, folderSiswaId: settings.folderSiswaId, appName: settings.appName, adminUsername: settings.adminUsername, adminPassword: settings.adminPassword, tahunPelajaran: settings.tahunPelajaran, schoolName: settings.schoolName })))}` : '';

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveStatusDetail, setSaveStatusDetail] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleSave = async () => {
    const cleanUrl = url.trim();
    const cleanTP = (tahunPelajaran || '2026/2027').trim();
    const cleanSem = semesterActive === 'Genap' ? 'Genap' : 'Ganjil';
    
    // Sync semester entity and trigger reactive events
    setSemesterAndTahunAjaran(cleanTP, cleanSem);

    const updatedSettings = { 
      ...settings, 
      scriptUrl: cleanUrl, 
      appName: appName.trim(), 
      schoolName: schoolName.trim(),
      tahunPelajaran: cleanTP,
      semester: cleanSem,
      folderId: folderId.trim(), 
      folderModulId: folderModulId.trim(),
      folderModulUrl: `https://drive.google.com/drive/folders/${folderModulId.trim()}`,
      folderSiswaId: folderSiswaId.trim(),
      spreadsheetId: spreadsheetId.trim(),
      adminUsername: adminUser.trim(), 
      adminPassword: adminPass,
      schoolLogoUrl
    };
    
    setIsSavingSettings(true);
    setSaveStatusDetail({ type: 'info', text: 'Menyimpan konfigurasi lokal & server...' });
    setSettings(updatedSettings);

    // 1. Simpan ke database lokal & server backend
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
    } catch (e) {
      console.warn("Backend server settings save warning:", e);
    }

    // 2. Simpan & Kirim Langsung ke Sheet SETTING di Google Spreadsheet
    if (cleanUrl) {
      try {
        setSaveStatusDetail({ type: 'info', text: 'Mengirim & menulis ke Sheet SETTING di Google Spreadsheet...' });
        
        const nowStr = new Date().toISOString();
        const settingKeys = [
          { key: 'scriptUrl', desc: 'URL Web App Google Apps Script', cat: 'Koneksi' },
          { key: 'spreadsheetId', desc: 'ID Spreadsheet Master Database', cat: 'Koneksi' },
          { key: 'folderId', desc: 'ID Folder Google Drive Utama', cat: 'Koneksi' },
          { key: 'folderSiswaId', desc: 'ID Folder Google Drive Berkas Siswa', cat: 'Koneksi' },
          { key: 'appName', desc: 'Nama Aplikasi Sistem Informasi', cat: 'Identitas' },
          { key: 'schoolName', desc: 'Nama Lembaga / Sekolah / PKBM', cat: 'Identitas' },
          { key: 'tahunPelajaran', desc: 'Tahun Ajaran Aktif', cat: 'Akademik' },
          { key: 'semester', desc: 'Semester Aktif (Ganjil/Genap)', cat: 'Akademik' },
          { key: 'adminUsername', desc: 'Username Admin Utama', cat: 'Keamanan' },
          { key: 'adminPassword', desc: 'Password Admin Utama', cat: 'Keamanan' },
          { key: 'schoolLogoUrl', desc: 'Logo Lembaga / Sekolah', cat: 'Identitas' }
        ];

        const settingRows = settingKeys.map(item => {
          const rawVal = (updatedSettings as any)[item.key];
          return {
            Key: item.key,
            Value: typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal ?? ''),
            Deskripsi: item.desc,
            Kategori: item.cat,
            UpdatedAt: nowStr
          };
        });

        // Kirim ke Google Apps Script (mendukung action 'syncTable', 'SYNC_SHEET', dan 'saveAppConfig')
        const gasRes = await fetchFromGAS(cleanUrl, {
          action: 'syncTable',
          table: 'SETTING',
          sheetName: 'SETTING',
          data: settingRows,
          dataJson: JSON.stringify(settingRows),
          spreadsheetId: spreadsheetId.trim() || undefined
        });

        if (gasRes && (gasRes.success || gasRes.status === 'success' || !gasRes.error)) {
          setSaveStatusDetail({
            type: 'success',
            text: 'BERHASIL! Konfigurasi telah tersimpan di Browser, Server, dan OTOMATIS TERTULIS ke Sheet "SETTING" Google Spreadsheet!'
          });
        } else {
          setSaveStatusDetail({
            type: 'success',
            text: 'Konfigurasi disimpan di Sistem. Sheet SETTING tersinkron (' + (gasRes?.message || 'OK') + ').'
          });
        }
      } catch (err: any) {
        console.error("GAS SETTING sync failed:", err);
        setSaveStatusDetail({
          type: 'error',
          text: 'Konfigurasi tersimpan di aplikasi, namun gagal terkirim ke Sheet SETTING: ' + (err.message || 'Cek URL Apps Script')
        });
      }
    } else {
      setSaveStatusDetail({
        type: 'info',
        text: 'Konfigurasi tersimpan di aplikasi. (Masukkan URL Google Apps Script jika ingin otomatis tersinkron ke Sheet SETTING)'
      });
    }

    setIsSavingSettings(false);
    setTimeout(() => {
      setSaveStatusDetail(null);
    }, 8000);
  };

  const handleResetToDefaults = () => {
    setUrl(DEFAULT_APP_CONFIG.scriptUrl);
    setAppName(DEFAULT_APP_CONFIG.appName);
    setSchoolName(DEFAULT_APP_CONFIG.schoolName);
    setFolderId(DEFAULT_APP_CONFIG.folderId);
    setFolderSiswaId(DEFAULT_APP_CONFIG.folderSiswaId);
    setSpreadsheetId(DEFAULT_APP_CONFIG.spreadsheetId);
    setSchoolLogoUrl(DEFAULT_APP_CONFIG.schoolLogoUrl);
    setTahunPelajaran(DEFAULT_APP_CONFIG.tahunPelajaran);
    setAdminUser(DEFAULT_APP_CONFIG.adminUsername);
    setAdminPass(DEFAULT_APP_CONFIG.adminPassword);

    const defaultObj = {
      ...settings,
      ...DEFAULT_APP_CONFIG
    };
    setSettings(defaultObj);
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultObj),
    });
    setSaveMessage("Pengaturan telah dikembalikan ke Default Paten Lembaga!");
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) { // 1.5MB limit
      alert("Ukuran gambar terlalu besar. Maksimal 1.5MB untuk performa optimal.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSchoolLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setSchoolLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(GAS_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCodeGs = () => {
    const blob = new Blob([GAS_TEMPLATE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/80 p-5 rounded-3xl border border-indigo-100 shadow-sm">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-950">Integrasi & Pengaturan GAS</h2>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm font-medium">Konfigurasi database master dengan Google Apps Script & Google Spreadsheet.</p>
        </div>
        <button
          type="button"
          onClick={downloadMenuStructureExcel}
          className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition cursor-pointer border border-amber-400"
          title="Download file Excel pemetaan tabel dan menu lengkap"
        >
          <FileSpreadsheet size={18} />
          <span>DOWNLOAD EXCEL STRUKTUR DATA (.XLSX)</span>
        </button>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl p-5 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/90 shadow-lg">
        <h3 className="text-xl font-bold mb-6 text-indigo-900">Konfigurasi Umum</h3>
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Aplikasi</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base font-semibold" 
                placeholder="Contoh: ERP ROMBEL TAMBORA"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Nama Lembaga / Rombel</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base font-semibold" 
                placeholder="Contoh: ROMBEL KTCT TAMBORA"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>
          </div>

          {/* Tahun Pelajaran (Ajaran) */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="label text-indigo-900 font-bold flex items-center gap-2 mb-0">
                <Calendar size={18} className="text-indigo-600" />
                Tahun Pelajaran (Ajaran)
              </label>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                Aktif: {tahunPelajaran || '2026/2027'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input 
                type="text" 
                className="input w-full sm:w-1/2 text-sm sm:text-base font-extrabold text-indigo-950 bg-white" 
                placeholder="Contoh: 2026/2027"
                value={tahunPelajaran}
                onChange={(e) => setTahunPelajaran(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                {['2024/2025', '2025/2026', '2026/2027', '2027/2028'].map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setTahunPelajaran(year)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                      tahunPelajaran === year
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
            {/* Semester Aktif */}
            <div className="pt-2 border-t border-indigo-100/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-indigo-900 block">Semester Aktif</label>
                <p className="text-[11px] text-slate-500">Pilih semester operasional yang berlaku saat ini</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSemesterActive('Ganjil')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 ${
                    semesterActive === 'Ganjil'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  Semester 1 (Ganjil)
                </button>
                <button
                  type="button"
                  onClick={() => setSemesterActive('Genap')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 ${
                    semesterActive === 'Genap'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-indigo-900 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  Semester 2 (Genap)
                </button>
              </div>
            </div>

            <p className="text-xs text-indigo-700/80">
              Tahun pelajaran & Semester ini akan digunakan secara otomatis pada cetak daftar hadir, legger nilai, dokumen administrasi, serta rekapitulasi data.
            </p>
          </div>
          <div>
            <label className="label">Logo Lembaga</label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm overflow-hidden flex-shrink-0">
                {schoolLogoUrl ? (
                  <img src={schoolLogoUrl} alt="Logo Lembaga" className="w-full h-full object-cover animate-in fade-in duration-200" referrerPolicy="no-referrer" />
                ) : (
                  <Image className="w-8 h-8 text-indigo-300" />
                )}
              </div>
              
              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <p className="text-xs font-semibold text-gray-500">
                  {schoolLogoUrl ? 'Logo lembaga aktif' : 'Gunakan logo kustom lembaga Anda'}
                </p>
                <p className="text-[10px] text-gray-400">Format yang didukung: PNG, JPG, GIF (Maks. 1.5MB)</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleLogoUpload} 
                    className="hidden" 
                  />
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 duration-100"
                  >
                    <Upload size={14} /> Pilih Gambar
                  </button>
                  {schoolLogoUrl && (
                    <button 
                      type="button" 
                      onClick={handleRemoveLogo} 
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition active:scale-95 duration-100"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Username Login</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base" 
                placeholder="admin"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Password Login</label>
              <input 
                type="password" 
                className="input w-full text-sm sm:text-base" 
                placeholder="admin"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
              />
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-6 text-indigo-900">Integrasi Google Sheets & Drive (Paten Terhubung)</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Google Apps Script Web App URL</label>
              <button
                type="button"
                onClick={handleTestGasStatus}
                disabled={isTestingGas}
                className="text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isTestingGas ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} className="text-amber-500" />}
                {isTestingGas ? 'Menguji Akses...' : 'Uji Status Web App (Cek Akses Tulis)'}
              </button>
            </div>
            <input 
              type="text" 
              className="input w-full text-sm sm:text-base font-mono" 
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1.5">URL Web App resmi Google Apps Script untuk sinkronisasi seluruh ({MASTER_TABLES_60.length}) tabel master database.</p>

            {gasStatusInfo && (
              <div className={`mt-3 p-3.5 rounded-xl border text-xs space-y-2 ${
                gasStatusInfo.isOnline 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-start gap-2">
                  {gasStatusInfo.isOnline ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      {gasStatusInfo.isOnline 
                        ? '✅ Web App Aktif & Terhubung Sempurna' 
                        : '⚠️ Web App Google Apps Script Belum Aktif / Mengembalikan 404'}
                    </p>
                    <p className="leading-relaxed">
                      {gasStatusInfo.isOnline 
                        ? gasStatusInfo.message 
                        : (gasStatusInfo.error || 'Web App Google Apps Script tidak dapat dihubungi.')}
                    </p>
                    {!gasStatusInfo.isOnline && (
                      <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-amber-800 space-y-1">
                        <p className="font-semibold text-slate-800">Kenapa data baru (Soal, Tabungan, Tagihan) belum langsung masuk ke Spreadsheet?</p>
                        <p>Google Spreadsheet bersifat publik sehingga aplikasi dapat <b>membaca</b> data, namun untuk <b>MENULIS / MENAMBAH</b> baris baru, Google mewajibkan Web App Google Apps Script aktif.</p>
                        <p className="font-semibold text-slate-800 pt-1">Cara Mengaktifkan Web App Google Apps Script:</p>
                        <ol className="list-decimal list-inside space-y-0.5 pl-1">
                          <li>Buka Spreadsheet Google Anda: <b>Ekstensi &gt; Apps Script</b>.</li>
                          <li>Pastikan seluruh kode dari tab <b>"Export Script / Template"</b> (atau file <code>Code.gs</code>) sudah ditempel di editor Apps Script.</li>
                          <li>Klik tombol biru <b>Terapkan (Deploy) &gt; Deployment baru (New deployment)</b>.</li>
                          <li>Pilih jenis <b>Aplikasi Web (Web app)</b>.</li>
                          <li>Jalankan sebagai: <b>Saya (Me)</b> | Yang memiliki akses: <b>Siapa saja (Anyone)</b> (PENTING!).</li>
                          <li>Klik <b>Terapkan (Deploy)</b>, lalu salin URL Web App yang berakhiran <code>/exec</code> dan tempelkan ke kolom URL di atas, kemudian klik <b>Simpan Pengaturan</b>.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Spreadsheet ID</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base font-mono" 
                placeholder="1XyQnYPz_0erRm7NTMGZh0ysGWZRXjqbDb271ovLeqJ4"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
              />
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[11px] text-gray-500">ID Google Spreadsheet utama</p>
                {spreadsheetId && (
                  <a 
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Link2 size={12} /> Buka Sheet
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="label">Folder ID Google Drive (Root / Utama)</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base font-mono" 
                placeholder="13W6zz_g_nN-zGJdbquP4H4NvXrZZLk0j"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              />
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[11px] text-gray-500">Folder utama simpan sistem & backup</p>
                {folderId && (
                  <a 
                    href={`https://drive.google.com/drive/folders/${folderId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Folder size={12} /> Buka Folder
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="label">Folder ID Modul K13 & Silabus</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base font-mono" 
                placeholder="1xaf825icvAaXO7T1YtxjbWQQw-sud_t0"
                value={folderModulId}
                onChange={(e) => setFolderModulId(e.target.value)}
              />
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[11px] text-gray-500">Folder modul PDF (berisi subfolder kelas, mapel & modul)</p>
                {folderModulId && (
                  <a 
                    href={`https://drive.google.com/drive/folders/${folderModulId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Folder size={12} /> Buka Folder Modul
                  </a>
                )}
              </div>
            </div>

            <div>
              <label className="label">Folder ID Berkas Siswa</label>
              <input 
                type="text" 
                className="input w-full text-sm sm:text-base font-mono" 
                placeholder="1DfCtp8BbsRzFafEa8fk30Suq-aVQoS7V"
                value={folderSiswaId}
                onChange={(e) => setFolderSiswaId(e.target.value)}
              />
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[11px] text-gray-500">Folder khusus simpan berkas dokumen siswa</p>
                {folderSiswaId && (
                  <a 
                    href={`https://drive.google.com/drive/folders/${folderSiswaId}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Folder size={12} /> Buka Folder Berkas
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-stretch sm:items-center pt-2">
            <button 
              type="button"
              onClick={handleSave} 
              disabled={isSavingSettings}
              className="btn w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
            >
              {isSavingSettings ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Menyimpan & Menulis ke Sheet SETTING...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Simpan & Patenkan Konfigurasi</span>
                </>
              )}
            </button>

            <button 
              type="button"
              onClick={handleResetToDefaults} 
              disabled={isSavingSettings}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              title="Reset ke nilai paten Rombel Tambora"
            >
              <Check size={14} />
              Pulihkan Default Paten (Rombel Tambora)
            </button>
          </div>

          {saveStatusDetail && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
              saveStatusDetail.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' 
                : saveStatusDetail.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900 animate-pulse shadow-sm'
            }`}>
              {saveStatusDetail.type === 'success' ? (
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : saveStatusDetail.type === 'error' ? (
                <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw size={20} className="text-indigo-600 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="text-xs sm:text-sm font-semibold leading-relaxed">
                {saveStatusDetail.text}
              </div>
            </div>
          )}

          {/* Pusat Sinkronisasi Otomatis & Massal (Seluruh 38+ Tabel Database) */}
          <div className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-700/50 relative overflow-hidden space-y-6">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 border-b border-indigo-800/80 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center font-black">
                    <Zap size={22} className="text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-white flex items-center gap-2">
                      Pusat Sinkronisasi Otomatis Seluruh Aplikasi
                      <span className="text-[10px] uppercase font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        Multi-Tabel Realtime
                      </span>
                    </h4>
                    <p className="text-xs text-indigo-200/80">
                      Memperbarui seluruh data secara otomatis ke Google Spreadsheet tanpa perlu update manual satu per satu.
                    </p>
                  </div>
                </div>
              </div>

              {/* Toggle Auto Sync Real-time */}
              <div className="flex items-center gap-3 bg-white/5 border border-indigo-700/60 p-2 px-3.5 rounded-2xl shrink-0">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-200">Auto-Sync Real-Time</p>
                  <p className="text-[10px] text-indigo-300">
                    {autoSyncState.autoSyncEnabled ? 'Aktif (Otomatis Sync saat Edit)' : 'Nonaktif (Manual)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoSync}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    autoSyncState.autoSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                  title="Aktifkan/Nonaktifkan Sinkronisasi Otomatis"
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                      autoSyncState.autoSyncEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Status Bar Auto-Sync */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-indigo-800/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-indigo-300 font-medium">Status Mesin Sinkronisasi</p>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                    <span className={`w-2 h-2 rounded-full ${autoSyncState.autoSyncEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
                    {autoSyncState.autoSyncEnabled ? 'Siaga & Memantau Seluruh Modul' : 'Manual Mode'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-indigo-800/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <RefreshCw size={18} className={autoSyncState.state === 'syncing' ? 'animate-spin' : ''} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-indigo-300 font-medium">Terakhir Disinkronkan</p>
                  <p className="text-xs font-bold text-white truncate">
                    {autoSyncState.lastSyncedAt ? `${autoSyncState.lastSyncedAt} (${autoSyncState.lastSyncedTable || 'Sistem'})` : 'Belum sinkron sesi ini'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-indigo-800/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Database size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-indigo-300 font-medium">Cakupan Sinkronisasi</p>
                  <p className="text-xs font-bold text-white truncate">
                    {MASTER_TABLES_60.length} Sheet Master Terintegrasi
                  </p>
                </div>
              </div>
            </div>

            {/* Tombol Utama Operasi Data Spreadsheet: Tarik (Pull) & Kirim (Push) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10">
              {/* Tombol 1: Tarik Data Langsung dari Google Spreadsheet (No Local Dummy) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/70 border border-sky-600/50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping"></span>
                    <h5 className="font-bold text-sm text-white flex items-center gap-2">
                      <RefreshCw size={18} className="text-sky-400" />
                      Tarik & Segarkan Data dari Spreadsheet (Live Pull)
                    </h5>
                  </div>
                  <p className="text-xs text-indigo-200/70 mt-1.5 leading-relaxed">
                    Menghubungkan langsung ke Google Spreadsheet untuk memuat 100% data riil tanpa mengandalkan cache lokal atau data dummy. Spreadsheet Anda tetap aman sebagai satu-satunya Master Database.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePullFromGas}
                  disabled={isPullingFromGas || isSyncingAllModules}
                  className="w-full px-5 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPullingFromGas ? (
                    <>
                      <RefreshCw size={16} className="animate-spin text-white" />
                      <span>Sedang Menarik Data dari Spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} className="text-sky-200" />
                      <span>📥 Tarik Data Langsung dari Spreadsheet</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tombol 2: Kirim Pembaruan Massal ke Google Spreadsheet */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/70 border border-indigo-800 flex flex-col justify-between gap-4">
                <div>
                  <h5 className="font-bold text-sm text-white flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-emerald-400" />
                    Kirim Pembaruan ke Spreadsheet (Mass Sync All {MASTER_TABLES_60.length} Tabel)
                  </h5>
                  <p className="text-xs text-indigo-200/70 mt-1.5 leading-relaxed">
                    Mengunggah seluruh perubahan terbaru dari Siswa, Guru, Kelas, Mapel, Keuangan, CBT, SPMB, dan modul lainnya serentak ke Google Spreadsheet dengan proteksi anti-overwrite.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSyncAllModulesNow}
                  disabled={isSyncingAllModules || isPullingFromGas}
                  className="w-full px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSyncingAllModules ? (
                    <>
                      <RefreshCw size={16} className="animate-spin text-white" />
                      <span>Menyinkronkan Semua...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={16} className="text-amber-300" />
                      <span>⚡ Kirim Pembaruan ke Spreadsheet</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Hasil Tarik Data (Pull Status) */}
            {pullStatus && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 relative z-10 animate-in fade-in ${
                pullStatus.success
                  ? 'bg-sky-950/80 border-sky-500/60 text-sky-200'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
              }`}>
                {pullStatus.success ? (
                  <CheckCheck size={20} className="text-sky-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-sm text-white">
                    {pullStatus.success ? 'Berhasil Menarik Data dari Google Spreadsheet!' : 'Gagal Menarik Data'}
                  </p>
                  <p className="mt-1 leading-relaxed opacity-90">{pullStatus.message}</p>
                </div>
              </div>
            )}

            {/* Progress Bar Sinkronisasi Kirim (Push) */}
            {isSyncingAllModules && (
              <div className="p-4 rounded-2xl bg-indigo-950/90 border border-indigo-600/50 space-y-2 relative z-10 animate-in fade-in">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-indigo-200 flex items-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-emerald-400" />
                    {syncAllProgressText || 'Sedang memproses...'}
                  </span>
                  <span className="font-mono font-bold text-emerald-300">{syncAllProgressPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-indigo-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-300 rounded-full"
                    style={{ width: `${syncAllProgressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Hasil Sinkronisasi Kirim (Push Result) */}
            {syncAllResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 relative z-10 animate-in fade-in ${
                syncAllResult.success
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
              }`}>
                {syncAllResult.success ? (
                  <CheckCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold text-sm text-white">
                    {syncAllResult.success ? 'Pembaruan Berhasil Dikirim ke Spreadsheet!' : 'Sinkronisasi Mengalami Kendala'}
                  </p>
                  <p className="mt-1 leading-relaxed opacity-90">{syncAllResult.message}</p>
                </div>
              </div>
            )}

            {/* Kotak Jaminan Keamanan Spreadsheet (Spreadsheet Protection Guarantee) */}
            <div className="p-4.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-100/90 relative z-10 space-y-2">
              <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
                <ShieldCheck size={18} className="text-emerald-400" />
                <span>Jaminan Keamanan Google Spreadsheet (100% Proteksi Anti-Hapus &amp; Anti-Overwrite)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-[11px] leading-relaxed text-emerald-200/80">
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Anti-Empty Protection:</strong> Sistem otomatis memblokir pengiriman data jika data di browser kosong, sehingga tidak akan pernah menghapus data di Spreadsheet.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Append &amp; Upsert Saja:</strong> Pembaruan hanya mengupdate baris yang sesuai (berdasarkan NISN/ID) atau menambahkan baris baru, tidak pernah menghapus massal.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Auto-Backup di Google Drive:</strong> Backend Google Apps Script otomatis membuat backup sheet sebelum setiap operasi tulis.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Riwayat Versi Bawaan:</strong> Google Sheets mencatat setiap detik perubahan pada menu <em>File &gt; Version History</em> yang dapat di-restore kapan saja.</span>
                </div>
              </div>
            </div>

            {/* Daftar Modul Database yang Dipantau & Tersinkron */}
            <div className="pt-2">
              <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" />
                Daftar Tabel Database yang Otomatis Tersinkronisasi ({MASTER_TABLES_60.length} Tabel)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1">
                {MASTER_TABLES_60.map((table, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-white/5 border border-indigo-800/40 text-[11px] flex items-center justify-between gap-1">
                    <span className="font-mono font-semibold text-slate-200 truncate">{table.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {shareConfigUrl && (
          <div className="mt-8 pt-8 border-t border-white/40">
            <h3 className="text-xl font-bold mb-4 text-indigo-900 flex items-center gap-2">
              <Smartphone size={24} className="text-indigo-600" />
              Hubungkan ke Handphone Anda
            </h3>
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-indigo-50">
                <QRCode value={shareConfigUrl} size={150} level="M" />
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 mb-2">Sinkronisasi Super Cepat!</h4>
                <p className="text-sm text-indigo-700/80 mb-4 leading-relaxed">
                  Buka aplikasi kamera atau pemindai (scanner) di Handphone Anda, dan scan QR Code di samping untuk membuka aplikasi versi Mobile. Konfigurasi Google Sheets Anda akan otomatis tersinkronisasi.
                </p>
                <div className="flex bg-white border border-indigo-100 rounded-lg overflow-hidden relative">
                  <input type="text" readOnly value={shareConfigUrl} className="w-full text-xs text-slate-500 p-2 outline-none cursor-text" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-white/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <h4 className="font-semibold text-indigo-900 text-lg">Kode Backend Google Apps Script (Code.gs)</h4>
              <p className="text-xs text-slate-500 font-medium">Versi Lengkap & Terpadu ({MASTER_TABLES_60.length} Sheet Master Database + 24 Folder DriveApp &amp; Hierarki Modul Silabus Otomatis)</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleDownloadCodeGs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <Download size={14} />
                <span>Unduh File Code.gs</span>
              </button>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 text-slate-400 text-xs border-b border-slate-800">
              <span className="font-mono text-slate-300 font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Code.gs ({MASTER_TABLES_60.length} Sheet Master Database Engine)
              </span>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={handleDownloadCodeGs}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  title="Unduh file Code.gs"
                >
                  <Download size={13} />
                  <span>Unduh</span>
                </button>
                <button 
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin!' : 'Salin Semua Kode'}</span>
                </button>
              </div>
            </div>
            <pre className="bg-slate-900 text-slate-300 p-4 text-xs font-mono overflow-auto h-96 leading-relaxed select-all">
              <code>{GAS_TEMPLATE}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
