import React, { useState, useEffect } from 'react';
import { GAS_TEMPLATE } from '../lib/constants';

interface GasPart {
  name: string;
  type: string;
  description: string;
  size: number;
  content: string;
}

export default function ExportGAS() {
  const [copiedMap, setCopiedMap] = useState<{ [key: string]: boolean }>({});
  const [codeGs, setCodeGs] = useState<string>(() => GAS_TEMPLATE || '');
  const [indexHtml, setIndexHtml] = useState<string>('');
  const [parts, setParts] = useState<GasPart[]>([]);
  const [loading, setLoading] = useState(!GAS_TEMPLATE);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'split' | 'monolith'>('split');
  const [selectedPartIndex, setSelectedPartIndex] = useState<number>(0);

  useEffect(() => {
    const safeFetchJson = async (url: string) => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { success: false, error: text || `HTTP ${res.status}` };
        }
      } catch (e: any) {
        return { success: false, error: e.message || 'Gagal terhubung ke server' };
      }
    };

    Promise.all([
      safeFetchJson('/api/gas/code'),
      safeFetchJson('/api/gas/html'),
      safeFetchJson('/api/gas/parts')
    ]).then(([codeData, htmlData, partsData]) => {
      if (codeData && codeData.success) {
        setCodeGs(codeData.code);
      } else if (codeData && codeData.error) {
        setError(codeData.error);
      }
      
      if (htmlData && htmlData.success) {
        setIndexHtml(htmlData.html);
      } else if (htmlData && htmlData.error) {
        setError(htmlData.error);
      }

      if (partsData && partsData.success && Array.isArray(partsData.parts)) {
        setParts(partsData.parts);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message || String(err));
      setLoading(false);
    });
  }, []);

  const fallbackCopy = (key: string, text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopiedMap(prev => ({ ...prev, [key]: true }));
        setTimeout(() => setCopiedMap(prev => ({ ...prev, [key]: false })), 2000);
      } else {
        console.error('Fallback copy command was unsuccessful');
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const handleCopy = (key: string, text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => {
            setCopiedMap(prev => ({ ...prev, [key]: true }));
            setTimeout(() => setCopiedMap(prev => ({ ...prev, [key]: false })), 2000);
          })
          .catch((err) => {
            console.warn('Clipboard write API failed, trying fallback:', err);
            fallbackCopy(key, text);
          });
      } else {
        fallbackCopy(key, text);
      }
    } catch (e) {
      console.warn('Clipboard copy block caught error, trying fallback:', e);
      fallbackCopy(key, text);
    }
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/30 shadow-sm h-32 flex flex-col justify-center items-center">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
            <span className="text-slate-300 text-sm font-semibold">Sedang merakit & membagi paket Google Apps Script...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="bg-slate-800/50 rounded-3xl border border-slate-700/30 h-[500px]"></div>
          <div className="bg-slate-800/50 rounded-3xl border border-slate-700/30 h-[500px]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-950/40 border border-rose-900/50 p-6 rounded-3xl text-rose-200">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-rose-500"></i> Gagal Membuat Bundel Google Apps Script
        </h3>
        <p className="text-sm text-rose-300">{error}</p>
        <p className="text-xs text-rose-400 mt-4 font-mono">
          Pastikan Anda telah melakukan compile/build aplikasi ini terlebih dahulu untuk menghasilkan file produksi di folder dist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Google Translate */}
      <div className="bg-amber-950/40 border border-amber-500/50 p-5 rounded-3xl text-amber-200 shadow-lg">
        <h3 className="text-base font-bold mb-2 flex items-center gap-2 text-amber-400">
          <i className="fas fa-exclamation-triangle text-amber-400 text-lg animate-pulse"></i> 
          SANGAT PENTING: Matikan 'Google Translate' Saat Buka Apps Script!
        </h3>
        <p className="text-sm text-amber-200/90 leading-relaxed">
          Jika browser Google Chrome Anda mengaktifkan <b>"Terjemahkan ke Bahasa Indonesia" (Auto-Translate)</b> saat membuka tab <code className="bg-amber-900/60 px-2 py-0.5 rounded text-amber-300 font-mono text-xs">script.google.com</code>, Chrome akan secara otomatis merubah kata kunci kode (misalnya merubah <code className="font-mono text-amber-300">version</code> menjadi <code className="font-mono text-amber-300">versi</code>, atau <code className="font-mono text-amber-300">const</code> menjadi <code className="font-mono text-amber-300">konst</code>). Hal inilah yang menyebabkan timbulnya error <code className="bg-rose-900/80 text-rose-200 px-2 py-0.5 rounded font-mono text-xs">SyntaxError: Pengidentifikasi 'versi' yang tidak terduga</code> saat disimpan.
        </p>
        <div className="mt-3 text-xs bg-amber-900/40 p-3 rounded-2xl border border-amber-700/40 flex flex-col gap-1 text-amber-300 font-medium">
          <span>💡 <b>Cara Mengatasi &amp; Mencegahnya:</b></span>
          <span>1. Klik ikon Google Translate di address bar Chrome (sebelah kanan atas) &rarr; pilih <b>"Tampilkan Asli" / "Show Original"</b>.</span>
          <span>2. Gunakan tombol <b>Copy/Download</b> di bawah per bagian tanpa terpengaruh penerjemahan otomatis.</span>
        </div>
      </div>

      {/* Header & Mode Switcher */}
      <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white mb-1 flex items-center gap-2">
            <i className="fas fa-file-export text-indigo-500"></i> Pusat Integrasi &amp; Pembuat Kode Google Apps Script
          </h2>
          <p className="text-slate-400 text-sm">
            Kode lengkap ERP telah dibagi menjadi beberapa bagian modular agar aman saat di-copy paste ke editor Google Apps Script tanpa membuat browser lag atau error.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-700/60 shrink-0">
          <button
            onClick={() => setActiveTab('split')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'split'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-cubes text-emerald-400"></i>
            <span>Mode Terbagi (Rekomendasi)</span>
          </button>
          <button
            onClick={() => setActiveTab('monolith')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'monolith'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <i className="fas fa-file-code text-amber-400"></i>
            <span>Mode File Tunggal</span>
          </button>
        </div>
      </div>

      {/* MODE 1: SPLIT PARTS (RECOMMENDED) */}
      {activeTab === 'split' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-2xl text-emerald-300 text-sm flex items-start gap-3">
            <i className="fas fa-check-circle text-emerald-400 text-lg mt-0.5"></i>
            <div>
              <span className="font-bold block text-emerald-200">Mode Terbagi Aktif ({parts.length + 1} File Dihasilkan)</span>
              <span>
                Dengan fitur ini, <code className="bg-emerald-900/60 text-emerald-200 font-mono px-1 rounded">Index.html</code> dipisah menjadi file <code className="font-mono text-emerald-200">Index.html</code>, <code className="font-mono text-emerald-200">CSS.html</code>, dan beberapa file <code className="font-mono text-emerald-200">JS_Part.html</code>. Anda tinggal membuat file dengan nama yang persis di Google Apps Script dan menempelkan kodenya satu per satu.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar File List */}
            <div className="lg:col-span-1 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                Daftar File yang Harus Dibuat di GAS:
              </h3>

              {/* 1. Code.gs item */}
              <div
                onClick={() => setSelectedPartIndex(-1)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  selectedPartIndex === -1
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center flex-shrink-0 justify-center font-bold text-xs">
                    GS
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                      Code.gs
                      <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded font-mono">Backend</span>
                    </div>
                    <div className="text-xs text-slate-400">Kode Backend &amp; Database Router</div>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-xs text-slate-500"></i>
              </div>

              {/* HTML Parts items */}
              {parts.map((p, idx) => {
                const pureName = p.name.replace('.html', '');
                const isSelected = selectedPartIndex === idx;
                const isMaster = p.name === 'Index.html';
                const isCss = p.name === 'CSS.html';

                return (
                  <div
                    key={p.name}
                    onClick={() => setSelectedPartIndex(idx)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        isMaster ? 'bg-indigo-500/20 text-indigo-400' :
                        isCss ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {isMaster ? 'UI' : isCss ? 'CSS' : `JS${idx - 1}`}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                          {p.name}
                          <span className="text-[10px] bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                            {(p.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">{p.description}</div>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right text-xs text-slate-500"></i>
                  </div>
                );
              })}
            </div>

            {/* Code Viewer Panel */}
            <div className="lg:col-span-2 space-y-4">
              {selectedPartIndex === -1 ? (
                /* Code.gs Viewer */
                <div className="bg-slate-800 rounded-3xl border border-slate-700/50 shadow-sm overflow-hidden flex flex-col h-[600px]">
                  <div className="bg-slate-900/80 p-4 border-b border-slate-700/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></span>
                      <div>
                        <span className="font-bold text-sm text-slate-100 block">Code.gs (Backend ERP)</span>
                        <span className="text-xs text-slate-400">Buat/Timpa file 'Kode.gs' atau 'Code.gs' di Apps Script</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy('codeGs', codeGs)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <i className={copiedMap['codeGs'] ? "fas fa-check text-green-400" : "far fa-copy"}></i>
                        {copiedMap['codeGs'] ? "Tersalin!" : "Salin Kode"}
                      </button>
                      <button
                        onClick={() => handleDownload('Code.gs', codeGs)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <i className="fas fa-download"></i> Unduh
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-y-auto flex-grow select-all scrollbar-hide">
                    <pre>{codeGs}</pre>
                  </div>
                </div>
              ) : parts[selectedPartIndex] ? (
                /* HTML Part Viewer */
                <div className="bg-slate-800 rounded-3xl border border-slate-700/50 shadow-sm overflow-hidden flex flex-col h-[600px]">
                  <div className="bg-slate-900/80 p-4 border-b border-slate-700/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100">{parts[selectedPartIndex].name}</span>
                          <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-md font-mono">
                            Nama File di GAS: <b>{parts[selectedPartIndex].name.replace('.html', '')}</b>
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{parts[selectedPartIndex].description}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(parts[selectedPartIndex].name, parts[selectedPartIndex].content)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <i className={copiedMap[parts[selectedPartIndex].name] ? "fas fa-check text-green-400" : "far fa-copy"}></i>
                        {copiedMap[parts[selectedPartIndex].name] ? "Tersalin!" : "Salin Kode"}
                      </button>
                      <button
                        onClick={() => handleDownload(parts[selectedPartIndex].name, parts[selectedPartIndex].content)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <i className="fas fa-download"></i> Unduh
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-y-auto flex-grow select-all scrollbar-hide">
                    <pre>{parts[selectedPartIndex].content}</pre>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Step-by-step guide for modular split mode */}
          <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700/50 shadow-sm space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <i className="fas fa-list-ol"></i> Panduan Langkah Demi Langkah Memasang File Terbagi di Google Apps Script
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">1</span>
                <h4 className="font-bold text-slate-200">Paste Code.gs</h4>
                <p className="text-slate-400 leading-relaxed">
                  Buka editor Apps Script. Hapus seluruh isi default <code className="text-amber-400">Kode.gs</code>, lalu salin dan tempelkan seluruh kode <code className="text-amber-400">Code.gs</code> di atas.
                </p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">2</span>
                <h4 className="font-bold text-slate-200">Buat File HTML Master</h4>
                <p className="text-slate-400 leading-relaxed">
                  Klik tombol <b>+ Tambah File</b> &gt; pilih <b>HTML</b>. Beri nama persis: <code className="text-emerald-400 font-mono">Index</code> (tanpa .html). Salin isi file <code className="text-emerald-400 font-mono">Index.html</code> ke dalamnya.
                </p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">3</span>
                <h4 className="font-bold text-slate-200">Buat File CSS &amp; JS Chunk</h4>
                <p className="text-slate-400 leading-relaxed">
                  Buat file HTML baru untuk setiap bagian sisanya: <code className="text-cyan-400 font-mono">CSS</code>, <code className="text-emerald-400 font-mono">JS_Part1</code>, <code className="text-emerald-400 font-mono">JS_Part2</code>, dsb. Tempelkan kodenya masing-masing.
                </p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">4</span>
                <h4 className="font-bold text-slate-200">Simpan &amp; Deploy Web App</h4>
                <p className="text-slate-400 leading-relaxed">
                  Klik <b>Simpan</b>, lalu klik <b>Terapkan (Deploy) &gt; Penerapan Baru</b>. Pilih <i>Aplikasi Web</i>, atur akses ke <i>"Siapa Saja"</i>, lalu klik <b>Terapkan</b>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: MONOLITHIC SINGLE FILE */}
      {activeTab === 'monolith' && (
        <div className="space-y-6">
          <div className="bg-amber-950/30 border border-amber-500/40 p-4 rounded-2xl text-amber-300 text-sm flex items-start gap-3">
            <i className="fas fa-info-circle text-amber-400 text-lg mt-0.5"></i>
            <div>
              <span className="font-bold block text-amber-200">Mode File Tunggal (Single Index.html Monolitik)</span>
              <span>
                Seluruh kode CSS dan JavaScript digabung menjadi 1 file <code className="font-mono text-amber-200">Index.html</code> raksasa. Jika browser Apps Script Anda terasa lambat saat memindahkan kode ini, disarankan beralih ke <b>Mode Terbagi</b> di atas.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Code.gs Card */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700/50 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="bg-slate-900/50 p-4 border-b border-slate-700/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="font-bold text-sm text-slate-200">Code.gs (Backend ERP)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy('codeGs', codeGs)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <i className={copiedMap['codeGs'] ? "fas fa-check text-green-400" : "far fa-copy"}></i>
                    {copiedMap['codeGs'] ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => handleDownload('Code.gs', codeGs)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <i className="fas fa-download"></i> Download
                  </button>
                </div>
              </div>
              <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-y-auto flex-grow select-all scrollbar-hide">
                <pre>{codeGs}</pre>
              </div>
            </div>

            {/* Index.html Card */}
            <div className="bg-slate-800 rounded-3xl border border-slate-700/50 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="bg-slate-900/50 p-4 border-b border-slate-700/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-sm text-slate-200">Index.html (Monolitik Single File)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy('indexHtml', indexHtml)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <i className={copiedMap['indexHtml'] ? "fas fa-check text-green-400" : "far fa-copy"}></i>
                    {copiedMap['indexHtml'] ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => handleDownload('Index.html', indexHtml)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <i className="fas fa-download"></i> Download
                  </button>
                </div>
              </div>
              <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-y-auto flex-grow select-all scrollbar-hide">
                <pre>{indexHtml}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

