import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  UploadCloud, 
  Check, 
  ZoomIn, 
  Loader2, 
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { extractPdfPagesToImages, getLastExtractedPdfImages, PdfPageImage, storeExtractedPdfImages } from '../../utils/pdfExtractor';

interface PdfImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (dataUrl: string, pageNumber: number) => void;
  onApplyAllQuestions?: (pageImages: PdfPageImage[]) => void;
  targetQuestionNumber?: number;
  initialImages?: PdfPageImage[];
}

export const PdfImagePickerModal: React.FC<PdfImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  onApplyAllQuestions,
  targetQuestionNumber,
  initialImages = []
}) => {
  const [pages, setPages] = useState<PdfPageImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomImg, setZoomImg] = useState<{ url: string; label: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialImages && initialImages.length > 0) {
        setPages(initialImages);
      } else {
        const cached = getLastExtractedPdfImages();
        if (cached && cached.length > 0) {
          setPages(cached);
        }
      }
    }
  }, [isOpen, initialImages]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Mohon pilih berkas dengan format PDF (.pdf).');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const extracted = await extractPdfPagesToImages(file, 12);
      if (extracted.length > 0) {
        setPages(extracted);
        storeExtractedPdfImages(file.name, extracted);
      } else {
        setErrorMsg('Gagal mengekstrak halaman dari berkas PDF ini. Pastikan berkas PDF tidak terkunci kata sandi.');
      }
    } catch (err: any) {
      console.error('Error extracting PDF:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses berkas PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Pilih Gambar / Diagram dari Materi PDF
              </h3>
              <p className="text-xs text-slate-500">
                {targetQuestionNumber 
                  ? `Pasangkan gambar stimulus halaman PDF untuk Butir Soal Nomor ${targetQuestionNumber}`
                  : 'Pilih halaman dokumen PDF materi untuk dijadikan stimulus visual butir soal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Action Header / Upload New PDF */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-indigo-50 to-sky-50 rounded-2xl border border-indigo-100/70">
            <div className="space-y-0.5 max-w-md">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <FileText size={14} className="text-indigo-600" />
                <span>Dokumen PDF Materi Pembelajaran</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {pages.length > 0 
                  ? `Tersedia ${pages.length} halaman visual yang diekstrak dari dokumen PDF materi.`
                  : 'Unggah berkas PDF materi modul/buku untuk mengekstrak seluruh halaman & diagram secara otomatis.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5 transition">
                {isProcessing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Mengekstrak PDF...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={14} />
                    <span>{pages.length > 0 ? 'Unggah PDF Lain' : 'Unggah File PDF Materi'}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={isProcessing}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {pages.length > 0 && onApplyAllQuestions && (
                <button
                  type="button"
                  onClick={() => {
                    onApplyAllQuestions(pages);
                    onClose();
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                  title="Pasangkan halaman-halaman PDF ini secara berurutan ke butir soal"
                >
                  <Sparkles size={14} />
                  <span>Pasang Otomatis ke Seluruh Soal</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Gallery of Extracted PDF Pages */}
          {pages.length === 0 ? (
            <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center">
                <FileText size={28} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Belum Ada Gambar Halaman PDF</h4>
                <p className="text-xs text-slate-500">
                  Klik tombol <strong>Unggah File PDF Materi</strong> di atas untuk membaca dokumen PDF Anda dan mengekstrak diagram atau halaman materi secara otomatis.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {pages.map((p) => (
                <div
                  key={p.pageNumber}
                  className="group relative rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white shadow-2xs hover:shadow-md transition overflow-hidden flex flex-col"
                >
                  <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden flex items-center justify-center">
                    <img
                      src={p.dataUrl}
                      alt={p.label}
                      className="w-full h-full object-contain bg-white"
                      loading="lazy"
                    />

                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black rounded-md">
                      Hal. {p.pageNumber}
                    </div>

                    <button
                      type="button"
                      onClick={() => setZoomImg({ url: p.dataUrl, label: p.label })}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 text-white hover:bg-slate-900 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Perbesar Tampilan Halaman"
                    >
                      <ZoomIn size={12} />
                    </button>
                  </div>

                  <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50 flex-1 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-700 block truncate">
                      {p.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectImage(p.dataUrl, p.pageNumber);
                        onClose();
                      }}
                      className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check size={12} />
                      <span>Gunakan Gambar Ini</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 text-xs text-slate-500">
          <span>
            {pages.length > 0 ? `Total ${pages.length} Halaman Siap Digunakan` : 'Format didukung: PDF Dokumen Materi'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Lightbox Zoom */}
      {zoomImg && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setZoomImg(null)}
        >
          <div className="relative max-w-3xl max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <span className="font-bold text-xs text-slate-800">{zoomImg.label}</span>
              <button
                type="button"
                onClick={() => setZoomImg(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-2 max-h-[80vh] overflow-auto flex items-center justify-center">
              <img
                src={zoomImg.url}
                alt={zoomImg.label}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
