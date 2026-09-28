import * as pdfjsLib from 'pdfjs-dist';

// Set up worker source safely
if (typeof window !== 'undefined') {
  try {
    const version = pdfjsLib.version || '6.3.289';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('PDF.js worker setup warning:', e);
  }
}

export interface PdfPageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
  label: string;
}

/**
 * Cache global untuk menyimpan gambar halaman PDF yang baru saja diunggah dalam sesi ini
 */
const IN_MEMORY_PDF_IMAGES: Record<string, PdfPageImage[]> = {};

export function storeExtractedPdfImages(key: string, images: PdfPageImage[]) {
  IN_MEMORY_PDF_IMAGES[key] = images;
  IN_MEMORY_PDF_IMAGES['LAST_UPLOADED_PDF'] = images;
  try {
    // Simpan hingga 4 halaman pertama ke sessionStorage untuk persistensi saat modal ditutup
    if (typeof window !== 'undefined') {
      const lightweight = images.slice(0, 4).map(img => ({
        pageNumber: img.pageNumber,
        label: img.label,
        dataUrl: img.dataUrl
      }));
      sessionStorage.setItem('sista_last_pdf_pages', JSON.stringify(lightweight));
    }
  } catch (e) {
    // Abaikan batas kuota storage
  }
}

export function getLastExtractedPdfImages(): PdfPageImage[] {
  if (IN_MEMORY_PDF_IMAGES['LAST_UPLOADED_PDF']?.length) {
    return IN_MEMORY_PDF_IMAGES['LAST_UPLOADED_PDF'];
  }
  try {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem('sista_last_pdf_pages');
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch {
    // Ignore
  }
  return [];
}

/**
 * Ekstraksi halaman-halaman dari berkas PDF menjadi dataUrl gambar JPEG beresolusi tinggi
 */
export async function extractPdfPagesToImages(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  maxPages: number = 10
): Promise<PdfPageImage[]> {
  try {
    let data: Uint8Array;
    if (fileOrBuffer instanceof File) {
      const buf = await fileOrBuffer.arrayBuffer();
      data = new Uint8Array(buf);
    } else if (fileOrBuffer instanceof ArrayBuffer) {
      data = new Uint8Array(fileOrBuffer);
    } else {
      data = fileOrBuffer;
    }

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, maxPages);
    const results: PdfPageImage[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        // Skala 1.25 - 1.5 memberikan ketajaman visual gambar diagram yang ideal tanpa ukuran file berlebihan
        const viewport = page.getViewport({ scale: 1.35 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // Gunakan any untuk menghindari ketidakcocokan tipe internal render task pdfjs
        await (page.render(renderContext as any).promise);

        // Ekspor ke JPEG dengan kualitas 0.82 (tajam & ringan)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        results.push({
          pageNumber: pageNum,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          label: `Halaman ${pageNum} Dokumen PDF Materi`
        });
      } catch (pageErr) {
        console.warn(`Gagal merender halaman PDF #${pageNum}:`, pageErr);
      }
    }

    if (results.length > 0) {
      storeExtractedPdfImages('LAST_UPLOADED_PDF', results);
    }

    return results;
  } catch (err) {
    console.error('Ekstraksi halaman PDF gagal:', err);
    return [];
  }
}

/**
 * Ekstraksi teks bacaan materi dari berkas PDF (untuk payload materiText yang ringan & cepat)
 */
export async function extractPdfText(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  maxPages: number = 25
): Promise<string> {
  try {
    let data: Uint8Array;
    if (fileOrBuffer instanceof File) {
      const buf = await fileOrBuffer.arrayBuffer();
      data = new Uint8Array(buf);
    } else if (fileOrBuffer instanceof ArrayBuffer) {
      data = new Uint8Array(fileOrBuffer);
    } else {
      data = fileOrBuffer;
    }

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
      cMapPacked: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = Math.min(pdf.numPages, maxPages);
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
        if (pageText.trim()) {
          fullText += `\n--- Halaman ${pageNum} ---\n` + pageText.trim();
        }
      } catch (pageErr) {
        console.warn(`Gagal membaca teks halaman #${pageNum}:`, pageErr);
      }
    }

    return fullText.trim();
  } catch (err) {
    console.warn('Ekstraksi teks PDF gagal:', err);
    return '';
  }
}
