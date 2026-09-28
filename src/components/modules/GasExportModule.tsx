import React, { useState } from 'react';
import { Code, Copy, Check, Download, FileCode, CheckCircle2 } from 'lucide-react';
import { INDEX_HTML_CONTENT, GAS_SPREADSHEET_ID, GAS_FOLDER_ID } from '../../data/gasCode';
import { GAS_TEMPLATE } from '../../lib/constants';

export const GasExportModule: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'code' | 'index'>('code');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownload = (content: string, fileName: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const currentContent = activeCodeTab === 'code' ? GAS_TEMPLATE : INDEX_HTML_CONTENT;
  const currentFileName = activeCodeTab === 'code' ? 'Code.gs' : 'Index.html';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-md border border-indigo-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-800 text-indigo-200 border border-indigo-700 text-xs font-semibold mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Google Apps Script (GAS) Production Ready
          </div>
          <h2 className="text-xl font-bold tracking-tight">Source Code Master Google Apps Script</h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
            Source code backend (<code className="font-mono text-amber-300">Code.gs</code>) dan frontend UI (<code className="font-mono text-emerald-300">Index.html</code>) siap dicolokkan ke Google Apps Script Editor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(currentContent)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-sm transition-colors flex items-center gap-2"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copiedCode ? 'Tersalin!' : 'Salin Kode'}
          </button>
          <button
            onClick={() => handleDownload(currentContent, currentFileName)}
            className="bg-white text-slate-800 hover:bg-slate-100 font-medium px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-indigo-600" /> Download {currentFileName}
          </button>
        </div>
      </div>

      {/* Tabs for Code.gs and Index.html */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCodeTab('code')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                activeCodeTab === 'code'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCode className="w-4 h-4" /> Code.gs (Backend Logic)
            </button>
            <button
              onClick={() => setActiveCodeTab('index')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
                activeCodeTab === 'index'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Code className="w-4 h-4" /> Index.html (Frontend UI)
            </button>
          </div>

          <span className="text-xs font-mono text-slate-500 hidden sm:inline">
            Spreadsheet ID: <strong className="text-slate-800">{GAS_SPREADSHEET_ID}</strong>
          </span>
        </div>

        {/* Code Editor Container */}
        <div className="bg-slate-900 p-4 overflow-x-auto max-h-[600px] scrollbar-thin">
          <pre className="font-mono text-xs text-slate-200 leading-relaxed">
            <code>{currentContent}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
