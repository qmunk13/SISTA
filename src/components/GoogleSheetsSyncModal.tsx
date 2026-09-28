import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Folder,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Code2,
  Send,
  Sliders,
  X
} from 'lucide-react';
import {
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  syncRecordsToGoogleSheets,
  generateGASScriptCode,
  SPREADSHEET_URL,
  FOLDER_URL,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_PARENT_FOLDER_ID
} from '../lib/googleSheetsSync';
import { getAbsensiRecords, getPengajuanIzinList, getTodayDateString } from '../lib/storage';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynced?: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({ isOpen, onClose, onSynced }) => {
  const [config, setConfig] = useState(getGoogleSheetsConfig());
  const [webAppUrlInput, setWebAppUrlInput] = useState(config.gasWebAppUrl);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSpreadsheetId, setCopiedSpreadsheetId] = useState(false);
  const [copiedFolderId, setCopiedFolderId] = useState(false);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'sync' | 'config' | 'script'>('sync');

  if (!isOpen) return null;

  const gasCode = generateGASScriptCode(config.spreadsheetId, config.parentFolderId);

  const handleSaveConfig = () => {
    saveGoogleSheetsConfig({
      gasWebAppUrl: webAppUrlInput,
      autoSyncEnabled: config.autoSyncEnabled
    });
    setConfig(getGoogleSheetsConfig());
    setSyncStatusMessage({
      type: 'success',
      text: 'Pengaturan Google Sheets & Google Apps Script berhasil disimpan!'
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopySpreadsheetId = () => {
    navigator.clipboard.writeText(config.spreadsheetId);
    setCopiedSpreadsheetId(true);
    setTimeout(() => setCopiedSpreadsheetId(false), 2000);
  };

  const handleCopyFolderId = () => {
    navigator.clipboard.writeText(config.parentFolderId);
    setCopiedFolderId(true);
    setTimeout(() => setCopiedFolderId(false), 2000);
  };

  const handleSyncTodayHarian = async () => {
    setIsSyncing(true);
    setSyncStatusMessage({ type: 'info', text: 'Menyinkronkan presensi harian hari ini ke Google Spreadsheet...' });
    
    const today = getTodayDateString();
    const records = getAbsensiRecords().filter(r => r.tanggal === today);
    
    const result = await syncRecordsToGoogleSheets(records, 'harian');
    setIsSyncing(false);

    if (result.success) {
      setSyncStatusMessage({ type: 'success', text: result.message });
      setConfig(getGoogleSheetsConfig());
    } else {
      setSyncStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleSyncTodayIzin = async () => {
    setIsSyncing(true);
    setSyncStatusMessage({ type: 'info', text: 'Menyinkronkan data pengajuan izin ke Google Spreadsheet...' });
    
    const records = getPengajuanIzinList();
    const result = await syncRecordsToGoogleSheets(records, 'izin');
    setIsSyncing(false);

    if (result.success) {
      setSyncStatusMessage({ type: 'success', text: result.message });
      setConfig(getGoogleSheetsConfig());
    } else {
      setSyncStatusMessage({ type: 'error', text: result.message });
    }
  };

  const handleSyncAllHistory = async () => {
    setIsSyncing(true);
    setSyncStatusMessage({ type: 'info', text: 'Menyinkronkan seluruh histori presensi ke Google Spreadsheet...' });
    
    const records = getAbsensiRecords();
    const result = await syncRecordsToGoogleSheets(records, 'harian');
    setIsSyncing(false);

    if (result.success) {
      setSyncStatusMessage({ type: 'success', text: result.message });
      setConfig(getGoogleSheetsConfig());
    } else {
      setSyncStatusMessage({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-emerald-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600/50 p-2.5 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Integrasi Google Sheets & Drive</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Sinkronisasi data presensi secara langsung ke Google Spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-emerald-600/50 text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'sync'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Send className="w-4 h-4" />
            Sinkronisasi Data
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'config'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Pengaturan & ID Target
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`px-4 py-2.5 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'script'
                ? 'bg-white text-emerald-700 border-emerald-600 shadow-xs'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Kode Google Apps Script
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">

          {/* Alert Message */}
          {syncStatusMessage && (
            <div
              className={`p-4 rounded-xl flex items-start gap-3 border text-sm ${
                syncStatusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : syncStatusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {syncStatusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {syncStatusMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              {syncStatusMessage.type === 'info' && <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />}
              <div className="flex-1">
                <p>{syncStatusMessage.text}</p>
              </div>
            </div>
          )}

          {/* TAB 1: SINKRONISASI */}
          {activeTab === 'sync' && (
            <div className="space-y-6">

              {/* Target Spreadsheet Quick View Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-lg text-emerald-700">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Target Google Spreadsheet</h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {config.spreadsheetId}</p>
                    {config.lastSyncTime && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                        Terakhir Sync: {config.lastSyncTime}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <a
                    href={SPREADSHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Spreadsheet
                  </a>
                  <a
                    href={FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    Folder Drive
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">Presensi Harian Hari Ini</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                      {getTodayDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Kirim seluruh log kehadiran masuk & pulang siswa hari ini ke Google Spreadsheet.
                  </p>
                  <button
                    onClick={handleSyncTodayHarian}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                    Sync Presensi Harian
                  </button>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">Data Pengajuan & Bukti Izin</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                      Surat & Foto
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Kirim data permohonan izin, alasan, status verifikasi & foto bukti ke tab "Pengajuan Izin".
                  </p>
                  <button
                    onClick={handleSyncTodayIzin}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                    Sync Data Pengajuan Izin
                  </button>
                </div>
              </div>

              {/* Sync All Button */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Sinkronkan Seluruh Histori Presensi</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mengirimkan semua catatan presensi harian dari database aplikasi ke Google Spreadsheet.
                  </p>
                </div>
                <button
                  onClick={handleSyncAllHistory}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shrink-0 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Semua Histori
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: PENGATURAN & TARGET ID */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              
              {/* Spreadsheet ID Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Spreadsheet ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={config.spreadsheetId}
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 font-mono text-xs rounded-lg focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopySpreadsheetId}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    {copiedSpreadsheetId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSpreadsheetId ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Parent Folder ID Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Parent Folder Drive ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={config.parentFolderId}
                    className="flex-1 px-3 py-2 bg-slate-100 border border-slate-300 text-slate-800 font-mono text-xs rounded-lg focus:outline-hidden"
                  />
                  <button
                    onClick={handleCopyFolderId}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    {copiedFolderId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFolderId ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
              </div>

              {/* Web App URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  URL Deployment Google Apps Script Web App
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={webAppUrlInput}
                  onChange={(e) => setWebAppUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Masukkan URL Web App dari deployment Google Apps Script Anda untuk mengaktifkan sync langsung.
                </p>
              </div>

              {/* Save Settings Button */}
              <button
                onClick={handleSaveConfig}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
              >
                Simpan Pengaturan
              </button>

            </div>
          )}

          {/* TAB 3: KODE APPS SCRIPT & INSTRUKSI */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-xs space-y-2">
                <h4 className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Code2 className="w-4 h-4" />
                  Petunjuk Pemasangan 3 Langkah Mudah:
                </h4>
                <ol className="list-decimal list-inside space-y-1 font-medium pl-1">
                  <li>Buka Spreadsheet target Anda di Google Sheets, klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
                  <li>Hapus semua kode bawaan, lalu tempelkan (paste) kode di bawah ini.</li>
                  <li>Klik <strong>Terapkan (Deploy) &gt; Deployment baru &gt; Jenis: Aplikasi Web</strong>. Pilih <i>"Akses: Siapa Saja" (Anyone)</i> lalu klik Terapkan. Salin URL Web App yang dihasilkan ke tab Pengaturan.</li>
                </ol>
              </div>

              {/* Copy Code Button & Code Box */}
              <div className="relative">
                <div className="flex items-center justify-between bg-slate-800 text-slate-300 px-4 py-2 rounded-t-xl text-xs font-semibold">
                  <span>Google Apps Script (Code.gs)</span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Kode Tersalin!' : 'Salin Kode'}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-b-xl overflow-x-auto max-h-60 leading-relaxed border border-slate-800">
                  {gasCode}
                </pre>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-600">
              Spreadsheet Target: <code className="text-slate-800 font-mono font-bold">{config.spreadsheetId.slice(0, 10)}...</code>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
