import React, { useState } from 'react';
import { Download, X, FileText, FileQuestion, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { getGoogleDriveDirectImageUrl, extractGoogleDriveFileId } from '../../lib/utils';

interface BerkasPreviewModalProps {
  previewDoc: { title: string; url: string; studentName: string } | null;
  onClose: () => void;
}

export default function BerkasPreviewModal({ previewDoc, onClose }: BerkasPreviewModalProps) {
  if (!previewDoc) return null;

  const [imgError, setImgError] = useState(false);
  const [retrySrc, setRetrySrc] = useState<string | null>(null);

  const driveId = extractGoogleDriveFileId(previewDoc.url);
  const titleLower = (previewDoc.title || '').toLowerCase();
  const isDirectImage = previewDoc.url.startsWith('data:image') || Boolean(previewDoc.url.match(/\.(jpeg|jpg|gif|png|webp|bmp)($|\?)/i));
  const isPhotoTitle = titleLower.includes('foto') || titleLower.includes('pas foto') || titleLower.includes('pasfoto');
  const isImage = isDirectImage || isPhotoTitle || (Boolean(driveId) && !previewDoc.url.toLowerCase().includes('.pdf'));
  const isPdf = previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.toLowerCase().includes('.pdf');

  const directImageUrl = retrySrc || getGoogleDriveDirectImageUrl(previewDoc.url);
  const driveEmbedUrl = driveId ? `https://drive.google.com/file/d/${driveId}/preview` : null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
        {/* Header Bar */}
        <div className="p-4 px-6 bg-slate-900/90 border-b border-slate-800 text-white flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                {previewDoc.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Siswa: <span className="text-amber-300 font-semibold">{previewDoc.studentName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={previewDoc.url}
              target="_blank"
              rel="noreferrer"
              download
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="Buka / Unduh Berkas Asli"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Buka Asli</span>
            </a>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 border border-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 flex-1 overflow-auto bg-slate-950 flex items-center justify-center min-h-[340px]">
          {isImage && !imgError ? (
            <div className="relative p-2 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-h-[72vh] flex items-center justify-center overflow-hidden">
              <img 
                src={directImageUrl} 
                alt={previewDoc.title}
                className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-md"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (driveId && !retrySrc) {
                    setRetrySrc(`https://drive.google.com/thumbnail?id=${driveId}&sz=w1200`);
                  } else {
                    setImgError(true);
                  }
                }}
              />
            </div>
          ) : isPdf && !driveEmbedUrl ? (
            <iframe
              src={previewDoc.url}
              title={previewDoc.title}
              className="w-full h-[72vh] rounded-2xl border border-slate-800 bg-white shadow-xl"
            />
          ) : driveEmbedUrl ? (
            <iframe
              src={driveEmbedUrl}
              title={previewDoc.title}
              className="w-full h-[72vh] rounded-2xl border border-slate-800 bg-white shadow-xl"
              allow="autoplay"
            />
          ) : (
            <div className="text-center p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl max-w-md space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <FileQuestion size={28} />
              </div>
              <div>
                <h4 className="font-extrabold text-white text-base">Tautan Berkas Cloud Eksternal</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Dokumen ini tersimpan secara aman di Google Drive. Klik tombol di bawah untuk membuka berkas pada tab browser baru.
                </p>
              </div>
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black transition shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <span>Buka Berkas di Tab Baru</span>
                <ArrowUpRight size={15} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
