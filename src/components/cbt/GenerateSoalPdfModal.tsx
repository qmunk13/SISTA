import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Upload, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  HelpCircle, 
  RefreshCw, 
  Save, 
  BookOpen, 
  Layers,
  FileCheck,
  Info,
  Image as ImageIcon,
  Search,
  CheckCheck,
  Eye,
  Loader2,
  Trash2,
  ImageOff
} from 'lucide-react';
import Swal from 'sweetalert2';
import { SoalPilihanGanda, BankSoalPackage, cleanConceptName, sanitizeNoModul } from '../../data/soalGenerator';
import { generateSoalFromPdfWithAI, checkAiExamStatus } from '../../lib/aiExamService';
import { CustomDropdown } from '../common/CustomDropdown';
import { db } from '../../data/db';
import { getMapelNamesForClass } from '../../lib/academicSubjects';
import { autoSyncEngine } from '../../data/autoSyncEngine';
import { extractPdfText } from '../../utils/pdfExtractor';
import { MASTER_SILABUS_DATA, MasterSilabusItem } from '../../data/masterSilabusData';
import { saveBulkQuestionsDirect } from '../../services/cbtQuestionDirectService';

interface GenerateSoalPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pkg: BankSoalPackage) => void;
  onJadikanJadwal?: (pkg: BankSoalPackage) => void;
  initialSilabusItem?: any;
  defaultKelas?: string;
  defaultMapel?: string;
}

export const GenerateSoalPdfModal: React.FC<GenerateSoalPdfModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onJadikanJadwal,
  initialSilabusItem,
  defaultKelas = '4',
  defaultMapel = 'Bahasa Indonesia'
}) => {
  const [sourceType, setSourceType] = useState<'upload' | 'url' | 'text'>('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pdfUrl, setPdfUrl] = useState('');
  const [materiText, setMateriText] = useState('');
  
  const [mapel, setMapel] = useState(defaultMapel);
  const [topik, setTopik] = useState('');
  const [temaModul, setTemaModul] = useState('');
  const [kelas, setKelas] = useState(defaultKelas);
  const [jenisUjian, setJenisUjian] = useState<string>('Sumatif Akhir Semester (SAS)');
  const [semester, setSemester] = useState<string>('1 (Ganjil)');
  const [jumlahSoal, setJumlahSoal] = useState<number>(20);
  const [guruName, setGuruName] = useState('Guru Pengampu Mata Pelajaran');
  const [tingkatKesulitan, setTingkatKesulitan] = useState<'mudah' | 'sedang' | 'tantangan'>('mudah');

  // MASTER_SILABUS Checklist States & Search Filter
  const [selectedSilabusKeys, setSelectedSilabusKeys] = useState<string[]>([]);
  const [silabusSearch, setSilabusSearch] = useState('');
  const [silabusSemesterFilter, setSilabusSemesterFilter] = useState<'ALL' | '1' | '2'>('ALL');

  // Retrieve Master Silabus list (from local db or MASTER_SILABUS_DATA) with auto-linked PDF URLs
  const allSilabusList = React.useMemo(() => {
    const fromDb = db.get('master_silabus');
    const baseList = (Array.isArray(fromDb) && fromDb.length > 0) ? fromDb : (MASTER_SILABUS_DATA || []);
    
    // Cross-reference materi_digital and silabus_data to fetch PDF URLs
    const materiDigital = (db.get('materi_digital') as any[]) || [];
    const silabusData = (db.get('silabus_data') as any[]) || [];
    
    return baseList.map((item: any) => {
      let existingUrl = String(item.pdfUrl || item.FileUrl || item.fileUrl || item.linkMateri || item.link || item.url || item.linkModul || item.tautan || '').trim();
      
      if (!existingUrl) {
        // Find in materi_digital by noModul & mapel
        const normItemMapel = (item.mataPelajaran || item.NamaMapel || item.mapel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normItemModul = String(item.noModul || item.modul || '');
        const matchedMateri = materiDigital.find((m: any) => {
          const mMapel = (m.mapel || m.NamaMapel || m.mataPelajaran || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const mModul = String(m.noModul || m.modul || '');
          return (mMapel && normItemMapel && (mMapel.includes(normItemMapel) || normItemMapel.includes(mMapel))) && 
                 (!normItemModul || mModul === normItemModul);
        });
        if (matchedMateri) {
          existingUrl = String(matchedMateri.fileUrl || matchedMateri.FileUrl || matchedMateri.pdfUrl || matchedMateri.link || '').trim();
        }
      }

      if (!existingUrl) {
        // Find in silabus_data by id or kodeSubTugas
        const matchedSilabus = silabusData.find((s: any) => 
          (s.id && s.id === item.id) || 
          (s.kodeSubTugas && s.kodeSubTugas === item.kodeSubTugas)
        );
        if (matchedSilabus) {
          existingUrl = String(matchedSilabus.fileUrl || matchedSilabus.FileUrl || matchedSilabus.pdfUrl || matchedSilabus.linkMateri || '').trim();
        }
      }

      return {
        ...item,
        pdfUrl: existingUrl || item.pdfUrl || '',
        fileUrl: existingUrl || item.fileUrl || '',
        FileUrl: existingUrl || item.FileUrl || ''
      };
    });
  }, []);

  const getSilabusKey = (item: any) => {
    return item.id ? String(item.id) : `M${item.noModul || item.modul || 1}-S${item.subKe || item.noSubModul || 1}-${item.topikSubTugas || item.judulSubModul || ''}`;
  };

  // Filter Silabus by selected Kelas & Mapel
  const filteredSilabus = React.useMemo(() => {
    const normMapel = (mapel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normKelas = String(kelas || '').replace(/\D/g, '');

    return allSilabusList.filter((item: any) => {
      // 1. Filter Kelas
      const itemKelas = String(item.kelas || item.tingkat || '').replace(/\D/g, '');
      if (normKelas && itemKelas && normKelas !== itemKelas) {
        return false;
      }

      // 2. Filter Mapel
      const itemMapel = (item.mataPelajaran || item.NamaMapel || item.mapel || item.singkatan || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!normMapel) return true;

      if (itemMapel === normMapel || itemMapel.includes(normMapel) || normMapel.includes(itemMapel)) {
        return true;
      }

      // Alias matcher for standard school subjects
      const aliases: Record<string, string[]> = {
        'indo': ['indonesia', 'bindo'],
        'ingg': ['inggris', 'bing'],
        'mtk': ['matematika'],
        'matematika': ['mtk'],
        'pai': ['agama', 'islam'],
        'agama': ['pai', 'islam'],
        'pancasila': ['ppkn', 'pkn', 'kewarganegaraan'],
        'ppkn': ['pancasila', 'pkn'],
        'ipa': ['ipas', 'alam'],
        'ipas': ['ipa', 'ips'],
        'ips': ['sosial'],
        'pjok': ['olahraga', 'jasmani'],
        'plbj': ['lingkungan', 'jakarta', 'budaya'],
        'seni': ['budaya', 'rupa', 'musik'],
        'tik': ['informatika', 'komputer'],
        'informatika': ['tik', 'komputer']
      };

      for (const [key, matchArr] of Object.entries(aliases)) {
        if (normMapel.includes(key)) {
          if (matchArr.some(m => itemMapel.includes(m)) || itemMapel.includes(key)) return true;
        }
      }

      return false;
    });
  }, [allSilabusList, mapel, kelas]);

  // Display filter with search keyword & semester inside checklist
  const displaySilabusList = React.useMemo(() => {
    return filteredSilabus.filter((item: any) => {
      if (silabusSemesterFilter !== 'ALL') {
        const itemSem = String(item.semester || '').toUpperCase();
        if (silabusSemesterFilter === '1' && !(itemSem.includes('I') || itemSem.includes('1') || itemSem.includes('GANJIL'))) {
          return false;
        }
        if (silabusSemesterFilter === '2' && !(itemSem.includes('II') || itemSem.includes('2') || itemSem.includes('GENAP'))) {
          return false;
        }
      }

      if (silabusSearch.trim()) {
        const q = silabusSearch.toLowerCase();
        const noM = String(item.noModul || item.modul || '');
        const tema = String(item.temaModul || item.namaModulBab || '').toLowerCase();
        const sub = String(item.subKe || item.noSubModul || '').toLowerCase();
        const t = String(item.topikSubTugas || item.judulSubModul || '').toLowerCase();
        if (!noM.includes(q) && !tema.includes(q) && !sub.includes(q) && !t.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [filteredSilabus, silabusSemesterFilter, silabusSearch]);

  const updateTopicFromItems = (items: any[]) => {
    if (items.length === 0) {
      setTopik('');
      setTemaModul('');
      return;
    }

    // Automatically collect any PDF URLs from all selected silabus items
    const collectedPdfUrls = items
      .map((it: any) => String(it.pdfUrl || it.FileUrl || it.fileUrl || it.linkMateri || it.link || it.url || it.linkModul || it.tautan || '').trim())
      .filter(Boolean);

    const uniquePdfUrls = Array.from(new Set(collectedPdfUrls));
    if (uniquePdfUrls.length > 0) {
      setPdfUrl(uniquePdfUrls.join('\n'));
      setSourceType('url');
    }

    if (items.length === 1) {
      const it = items[0];
      const singleTopic = cleanConceptName(it.topikSubTugas || it.judulSubModul || it.temaModul || '');
      setTopik(singleTopic);
      setTemaModul(cleanConceptName(it.temaModul || it.namaModulBab || ''));
    } else {
      const cleanTopics = items.map((it: any) => 
        cleanConceptName(it.topikSubTugas || it.judulSubModul || '')
      ).filter(Boolean);
      const uniqueTopics = Array.from(new Set(cleanTopics));
      setTopik(uniqueTopics.join('; '));
      const uniqueTemas = Array.from(new Set(items.map((it: any) => cleanConceptName(it.temaModul || it.namaModulBab || '')).filter(Boolean))).join(', ');
      setTemaModul(uniqueTemas);
    }
  };

  const handleToggleSilabusItem = (item: any) => {
    const key = getSilabusKey(item);
    let updated: string[];
    if (selectedSilabusKeys.includes(key)) {
      updated = selectedSilabusKeys.filter(k => k !== key);
    } else {
      updated = [...selectedSilabusKeys, key];
    }
    setSelectedSilabusKeys(updated);

    const selectedItems = filteredSilabus.filter((it: any) => updated.includes(getSilabusKey(it)));
    updateTopicFromItems(selectedItems);
  };

  const handleSelectAllVisibleSilabus = () => {
    const visibleKeys = displaySilabusList.map(it => getSilabusKey(it));
    const merged = Array.from(new Set([...selectedSilabusKeys, ...visibleKeys]));
    setSelectedSilabusKeys(merged);
    const selectedItems = filteredSilabus.filter((it: any) => merged.includes(getSilabusKey(it)));
    updateTopicFromItems(selectedItems);
  };

  const handleClearSilabusSelection = () => {
    setSelectedSilabusKeys([]);
    setTopik('');
    setTemaModul('');
  };

  const handleUseSilabusPdf = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const pdf = String(item.pdfUrl || item.FileUrl || item.fileUrl || item.linkMateri || item.link || item.url || item.linkModul || item.tautan || '').trim();
    if (pdf) {
      setPdfUrl(pdf);
      setSourceType('url');
    }
    const key = getSilabusKey(item);
    if (!selectedSilabusKeys.includes(key)) {
      const updated = [...selectedSilabusKeys, key];
      setSelectedSilabusKeys(updated);
      const selectedItems = filteredSilabus.filter((it: any) => updated.includes(getSilabusKey(it)));
      updateTopicFromItems(selectedItems);
    }
  };

  // Dynamic Mapel from Sheet MAPEL filtered by Class
  const availableMapelList = React.useMemo(() => {
    const list = getMapelNamesForClass(kelas);
    return list.length > 0 ? list : [
      'Bahasa Indonesia', 'Matematika', 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', 
      'Pendidikan Pancasila', 'Bahasa Inggris', 'PJOK', 'Pendidikan Agama Islam', 'Informatika'
    ];
  }, [kelas]);

  // Ensure mapel is in list when kelas changes
  useEffect(() => {
    if (availableMapelList.length > 0 && !availableMapelList.includes(mapel)) {
      setMapel(availableMapelList[0]);
    }
  }, [availableMapelList]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; model: string }>({ available: true, model: 'gemini-3.8-flash' });

  // Generated results
  const [generatedQuestions, setGeneratedQuestions] = useState<SoalPilihanGanda[]>([]);
  const [ringkasanMateri, setRingkasanMateri] = useState<string>('');
  const [sourceInfo, setSourceInfo] = useState<string>('');
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'form' | 'results'>('form');
  const [extractedTextPreview, setExtractedTextPreview] = useState<string>('');
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [showExtractedTextModal, setShowExtractedTextModal] = useState<boolean>(false);

  // Background text extraction for uploaded PDF files
  useEffect(() => {
    if (selectedFiles.length > 0) {
      let isCancelled = false;
      setIsExtractingText(true);
      (async () => {
        try {
          let combined = '';
          for (const file of selectedFiles) {
            const txt = await extractPdfText(file, 30);
            if (txt.trim()) {
              combined += `\n\n=== BERKAS: ${file.name} ===\n` + txt.trim();
            }
          }
          if (!isCancelled) {
            setExtractedTextPreview(combined.trim());
          }
        } catch (err) {
          console.warn('[PDF Text Background Extract]', err);
        } finally {
          if (!isCancelled) {
            setIsExtractingText(false);
          }
        }
      })();
      return () => {
        isCancelled = true;
      };
    } else {
      setExtractedTextPreview('');
      setIsExtractingText(false);
    }
  }, [selectedFiles]);

  useEffect(() => {
    checkAiExamStatus().then(st => setAiStatus(st));
  }, []);

  useEffect(() => {
    if (initialSilabusItem) {
      const sMapel = initialSilabusItem.mataPelajaran || initialSilabusItem.NamaMapel || initialSilabusItem.mapel || defaultMapel;
      const sTopik = initialSilabusItem.topikSubTugas || initialSilabusItem.judulSubModul || initialSilabusItem.topik || '';
      const sTema = initialSilabusItem.temaModul || initialSilabusItem.namaModulBab || '';
      const sKelas = String(initialSilabusItem.kelas || defaultKelas).replace(/[A-Za-z]/g, '').trim() || defaultKelas;
      const sUrl = initialSilabusItem.pdfUrl || initialSilabusItem.FileUrl || initialSilabusItem.fileUrl || initialSilabusItem.linkMateri || '';

      setMapel(sMapel);
      setTopik(sTopik);
      setTemaModul(sTema);
      setKelas(sKelas);
      const initKey = getSilabusKey(initialSilabusItem);
      setSelectedSilabusKeys([initKey]);
      if (sUrl) {
        setPdfUrl(sUrl);
        setSourceType('url');
      }
    }
  }, [initialSilabusItem, defaultKelas, defaultMapel]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      const validPdfs: File[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
          validPdfs.push(f);
        }
      }

      if (validPdfs.length === 0) {
        alert('Mohon pilih file berkas dengan format PDF (.pdf)');
        return;
      }

      const combined = [...selectedFiles, ...validPdfs];
      // Filter duplicate by name & size
      const uniqueFiles = combined.filter((file, index, self) =>
        index === self.findIndex((t) => t.name === file.name && t.size === file.size)
      );

      setSelectedFiles(uniqueFiles);
      setErrorMsg(null);

      if (!topik && uniqueFiles.length > 0) {
        if (uniqueFiles.length === 1) {
          const cleanName = uniqueFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[_.-]/g, ' ');
          setTopik(cleanName);
        } else {
          setTopik(`Materi Gabungan ${uniqueFiles.length} Bab/Modul PDF`);
        }
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updated);
  };

  const handleStartGenerate = async () => {
    setErrorMsg(null);

    // Smart source detection:
    // If files uploaded, use files
    // If pdfUrl is available (from silabus or typed), use url
    // If silabus items are checked, use silabus curriculum
    // If text is provided, use text
    // If topik is provided, proceed smoothly!
    const hasFiles = selectedFiles.length > 0;
    const hasPdfUrl = Boolean(pdfUrl.trim());
    const hasSilabusChecked = selectedSilabusKeys.length > 0;
    const hasText = Boolean(materiText.trim());
    const hasTopik = Boolean(topik.trim());

    if (!hasFiles && !hasPdfUrl && !hasSilabusChecked && !hasText && !hasTopik) {
      setErrorMsg('Silakan centang materi silabus pada daftar di atas atau unggah berkas PDF.');
      return;
    }

    if (!mapel.trim()) {
      setErrorMsg('Silakan isi nama Mata Pelajaran.');
      return;
    }

    setIsLoading(true);
    setLoadingStep(selectedFiles.length > 1 
      ? `Membaca dan memproses ${selectedFiles.length} dokumen PDF materi pembelajaran...` 
      : hasPdfUrl
      ? 'Membaca dokumen PDF materi dari tautan silabus pembelajaran...'
      : 'Menelaah materi silabus Kurikulum Merdeka...'
    );

    try {
      // Ekstraksi teks materi dari dokumen PDF yang diunggah
      let extractedPdfTextContent = '';
      if (hasFiles) {
        // Use extracted text from background preview or extract from all files
        extractedPdfTextContent = extractedTextPreview;
        if (!extractedPdfTextContent) {
          for (let fi = 0; fi < selectedFiles.length; fi++) {
            const file = selectedFiles[fi];
            try {
              setLoadingStep(`Membaca isi teks konsep dan materi dari dokumen PDF (${fi + 1}/${selectedFiles.length}: ${file.name})...`);
              const fileText = await extractPdfText(file, 25);
              if (fileText.trim()) {
                extractedPdfTextContent += `\n\n=== DOKUMEN MATERI: ${file.name} ===\n` + fileText.trim();
              }
            } catch (textErr) {
              console.warn(`Ekstraksi teks dari ${file.name} dilewati:`, textErr);
            }
          }
        }
      }

      setTimeout(() => {
        setLoadingStep('Menelaah teks, konsep, definisi, dan fakta materi Kurikulum Merdeka...');
      }, 1500);

      setTimeout(() => {
        setLoadingStep(`Menyusun butir soal pilihan ganda berstimulus materi dan kunci jawaban...`);
      }, 3500);

      const parsedUrls = pdfUrl
        .split(/[\n,]+/)
        .map(u => u.trim())
        .filter(u => u.length > 0);

      // Compile rich syllabus curriculum text if no direct upload/pdf text
      let compiledMaterialText = (sourceType === 'text' ? materiText.trim() : '') || extractedPdfTextContent || '';
      if (!compiledMaterialText && hasSilabusChecked) {
        const selectedItems = filteredSilabus.filter((it: any) => selectedSilabusKeys.includes(getSilabusKey(it)));
        compiledMaterialText = selectedItems.map((it: any, idx: number) => 
          `Topik Pembelajaran: ${cleanConceptName(it.topikSubTugas || it.judulSubModul || it.temaModul || '')}. Pokok Bahasan: ${cleanConceptName(it.temaModul || it.namaModulBab || '')}.`
        ).join('\n\n');
      } else if (!compiledMaterialText && hasTopik) {
        compiledMaterialText = `Mata Pelajaran: ${mapel}, Kelas: ${kelas}, Topik: ${cleanConceptName(topik)}, Pokok Bahasan: ${cleanConceptName(temaModul || topik)}.`;
      }

      const effectivePdfUrl = hasPdfUrl ? (parsedUrls[0] || pdfUrl.trim()) : undefined;
      const effectivePdfUrls = hasPdfUrl ? parsedUrls : undefined;

      const res = await generateSoalFromPdfWithAI({
        files: hasFiles ? selectedFiles : undefined,
        pdfUrl: effectivePdfUrl,
        pdfUrls: effectivePdfUrls,
        materiText: compiledMaterialText || undefined,
        mapel,
        topik: cleanConceptName(topik || 'Materi Pembelajaran'),
        temaModul: temaModul ? cleanConceptName(temaModul) : undefined,
        kelas,
        jumlahSoal,
        guru: guruName,
        tingkatKesulitan
      });

      if (res.soalList && res.soalList.length > 0) {
        setGeneratedQuestions(res.soalList);
        setRingkasanMateri(res.ringkasanDokumen || '');
        setSourceInfo(res.source || 'Gemini 2.5 Flash');
        setIsFallbackMode(Boolean(res.isFallback));
        setPreviewTab('results');
      } else {
        throw new Error('AI tidak mengembalikan butir soal. Pastikan berkas PDF memiliki teks materi yang jelas.');
      }
    } catch (err: any) {
      console.error('Error generate soal from PDF:', err);
      const msg = String(err.message || err);
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        setErrorMsg('Layanan AI Gemini sedang mengalami lonjakan antrean trafik (503 High Demand). Silakan coba lagi beberapa saat lagi.');
      } else {
        setErrorMsg(err.message || 'Gagal memproses dokumen PDF.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleSaveToBankSoal = (openSchedule = false) => {
    if (generatedQuestions.length === 0) return;

    const cleanK = String(kelas).replace(/\D/g, '') || '4';
    const paket = ['4', '5', '6'].includes(cleanK) ? 'A' : ['7', '8', '9'].includes(cleanK) ? 'B' : 'C';
    const newId = `BNK-AI-${paket}${cleanK}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPackage: BankSoalPackage & { 
      jenisUjian?: string; 
      JenisUjian?: string;
      semester?: string;
      Semester?: string;
    } = {
      id: newId,
      BankSoalID: newId,
      mapel,
      Mapel: mapel,
      kelas: cleanK,
      Kelas: cleanK,
      jenisUjian,
      JenisUjian: jenisUjian,
      semester,
      Semester: semester,
      kurikulum: 'Kurikulum Merdeka (Telaah AI Dokumen PDF)',
      Kurikulum: 'Kurikulum Merdeka (Telaah AI Dokumen PDF)',
      guru: guruName,
      Guru: guruName,
      jumlahSoal: generatedQuestions.length,
      JumlahSoal: generatedQuestions.length,
      tipeSoal: 'Pilihan Ganda (Auto-Grading AI)',
      TipeSoal: 'Pilihan Ganda (Auto-Grading AI)',
      kesulitan: 'Sedang (Proporsional)',
      Kesulitan: 'Sedang (Proporsional)',
      status: 'Siap Digunakan',
      Status: 'Siap Digunakan',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      topik,
      temaModul: temaModul || ringkasanMateri || 'Dokumen PDF Materi Terverifikasi',
      kodeSubTugas: `PDF-${Date.now().toString().slice(-4)}`,
      soalList: generatedQuestions
    };

    // Save to cbt_bank_soal & cbt_questions & BANK_SOAL
    const existingBank = (db.get('cbt_bank_soal') || db.get('cbt_questions') || db.get('BANK_SOAL') || []) as any[];
    const updated = [newPackage, ...(Array.isArray(existingBank) ? existingBank : [])];
    db.set('cbt_bank_soal', updated);
    db.set('cbt_questions', updated);
    db.set('BANK_SOAL', updated);

    // Save each question into SOAL and cbt_exam_questions
    const existingQuestions = (db.get('cbt_exam_questions') || db.get('SOAL') || []) as any[];
    const formattedIndividual = generatedQuestions.map((q, idx) => ({
      id: `SOAL-${newId}-${idx + 1}`,
      DetailSoalID: `SOAL-${newId}-${idx + 1}`,
      ujianId: newId,
      UjianID: newId,
      bankSoalId: newId,
      BankSoalID: newId,
      mapel,
      Mapel: mapel,
      kelas: cleanK,
      Kelas: cleanK,
      jenisUjian,
      JenisUjian: jenisUjian,
      semester,
      Semester: semester,
      nomor: idx + 1,
      Nomor: idx + 1,
      pertanyaan: q.pertanyaan,
      Pertanyaan: q.pertanyaan,
      opsiA: q.opsi.a,
      opsiB: q.opsi.b,
      opsiC: q.opsi.c,
      opsiD: q.opsi.d,
      opsiE: q.opsi.e || '',
      kunciJawaban: q.kunci.toUpperCase(),
      KunciJawaban: q.kunci.toUpperCase(),
      bobot: q.bobot || 5,
      Bobot: q.bobot || 5,
      pembahasan: q.pembahasan || '',
      Pembahasan: q.pembahasan || '',
      tipe: 'Pilihan Ganda',
      TipeSoal: 'Pilihan Ganda',
      sumber: 'Telaah AI PDF'
    }));

    db.set('cbt_exam_questions', [...formattedIndividual, ...(Array.isArray(existingQuestions) ? existingQuestions : [])]);
    db.set('SOAL', [...formattedIndividual, ...(Array.isArray(existingQuestions) ? existingQuestions : [])]);

    // Otomatis simpan langsung butiran soal & paket ke Google Spreadsheet (Sheet BANK_SOAL & SOAL)
    saveBulkQuestionsDirect(newPackage, formattedIndividual).catch(err => {
      console.warn('[GenerateSoalPdfModal] Direct push error:', err);
    });

    try {
      autoSyncEngine.queueDbKey('cbt_bank_soal');
      autoSyncEngine.queueDbKey('SOAL');
    } catch (e) {
      console.warn('Auto sync trigger notice:', e);
    }

    onSuccess(newPackage);
    if (openSchedule && onJadikanJadwal) {
      onJadikanJadwal(newPackage);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between border-b border-indigo-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Sparkles size={24} className="text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">
                  AI Soal Generator dari Dokumen PDF
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Menghasilkan butir soal kontekstual yang 100% akurat dari isi, fakta, dan konsep di dalam dokumen PDF materi Anda.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setPreviewTab('form')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 ${
              previewTab === 'form'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} />
            <span>1. Sumber Dokumen PDF & Parameter</span>
          </button>

          <button
            onClick={() => generatedQuestions.length > 0 && setPreviewTab('results')}
            disabled={generatedQuestions.length === 0}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 ${
              previewTab === 'results'
                ? 'bg-white text-indigo-700 border-t-2 border-indigo-600 shadow-xs'
                : generatedQuestions.length > 0
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 opacity-50 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 size={14} className={generatedQuestions.length > 0 ? 'text-emerald-500' : ''} />
            <span>2. Hasil Soal & Stimulus Gambar PDF</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle size={16} className="text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Perhatian</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {previewTab === 'form' ? (
            <div className="space-y-6">
              {/* Pilihan Sumber PDF */}
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2">
                  Metode Masukan Dokumen PDF Materi:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSourceType('upload')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      sourceType === 'upload'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <Upload size={18} className={sourceType === 'upload' ? 'text-indigo-600' : 'text-slate-400'} />
                    <p className="text-xs font-black mt-2">Unggah Berkas PDF</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pilih dokumen PDF langsung dari komputer</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('url')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      sourceType === 'url'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <LinkIcon size={18} className={sourceType === 'url' ? 'text-indigo-600' : 'text-slate-400'} />
                    <p className="text-xs font-black mt-2">Tautan Google Drive / URL</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Link dokumen PDF yang sudah online</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceType('text')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      sourceType === 'text'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <BookOpen size={18} className={sourceType === 'text' ? 'text-indigo-600' : 'text-slate-400'} />
                    <p className="text-xs font-black mt-2">Salin Teks Materi PDF</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tempel isi bab/bacaan spesifik dari PDF</p>
                  </button>
                </div>
              </div>

              {/* Source Input Box */}
              {sourceType === 'upload' && (
                <div className="space-y-3">
                  <div className="p-5 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30 text-center relative hover:bg-indigo-50/50 transition-all">
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,.pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-2 shadow-xs">
                        <Upload size={24} />
                      </div>
                      <p className="text-xs font-black text-slate-800">
                        Pilih Berkas Dokumen PDF (Bisa 1 atau Banyak PDF Sekaligus)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                        Klik atau seret file PDF materi / bab / silabus ke sini. AI akan membaca seluruh dokumen untuk menyusun paket soal ujian terpadu.
                      </p>
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-slate-700">
                        <span>Berkas PDF Terpilih ({selectedFiles.length} file)</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          Total: {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {selectedFiles.map((f, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <FileCheck size={14} className="text-emerald-600 shrink-0" />
                              <span className="font-bold text-slate-800 truncate">{f.name}</span>
                              <span className="text-[10px] text-slate-400">({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(idx);
                              }}
                              className="text-slate-400 hover:text-rose-600 text-xs font-black px-1.5 py-0.5 rounded cursor-pointer"
                              title="Hapus berkas ini"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Ekstraksi Teks PDF */}
                  {selectedFiles.length > 0 && (
                    <div>
                      {isExtractingText ? (
                        <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 rounded-xl">
                          <Loader2 size={15} className="animate-spin text-indigo-600 shrink-0" />
                          <span>Membaca dan mengekstrak seluruh teks materi dari {selectedFiles.length} berkas PDF...</span>
                        </div>
                      ) : extractedTextPreview ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-bold">Teks Dokumen PDF Berhasil Diekstrak:</span>{' '}
                              <span>{extractedTextPreview.length.toLocaleString()} karakter terbaca dari {selectedFiles.length} file</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowExtractedTextModal(true)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            <Eye size={12} />
                            Pratinjau Teks PDF
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
                          <Info size={15} className="text-amber-600 shrink-0" />
                          <span>Dokumen PDF ini tampaknya berupa scan gambar/diagram. AI akan membaca halaman secara visual, atau Anda dapat melengkapi teks materi di bawah.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {sourceType === 'url' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700">
                      Tautan Google Drive / URL Berkas PDF (Bisa 1, 2, 3, atau Banyak Link):
                    </label>
                    {(() => {
                      const detected = pdfUrl
                        .split(/[\n,]+/)
                        .map(u => u.trim())
                        .filter(u => u.length > 0);
                      return detected.length > 0 ? (
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          {detected.length} Tautan PDF Terdeteksi
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <textarea
                    rows={4}
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="Tempel 1 atau banyak tautan di sini, satu link per baris atau dipisah koma. Contoh:&#10;https://drive.google.com/file/d/1A2B3C.../view&#10;https://drive.google.com/file/d/4D5E6F.../view&#10;https://sekolah.id/modul/bab3.pdf"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                  <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Sparkles size={13} className="text-indigo-600" />
                      Mendukung Multi-Link Google Drive & Web PDF:
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      Anda dapat memasukkan <b>2, 3, atau lebih link materi sekaligus</b> (misal: Buku Siswa Bab 1, Bab 2, dan Rangkuman PDF). Sistem AI akan menggabungkan materi dari seluruh dokumen tersebut menjadi bank butir soal komprehensif.
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      *Pastikan izin akses tautan Google Drive disetel ke <i>"Siapa saja yang memiliki tautan" (Anyone with link / Viewer)</i>.
                    </p>
                  </div>
                </div>
              )}

              {sourceType === 'text' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700">
                    Salinan Teks Materi / Bacaan dari PDF:
                  </label>
                  <textarea
                    rows={6}
                    value={materiText}
                    onChange={(e) => setMateriText(e.target.value)}
                    placeholder="Tempelkan paragraf, definisi, atau materi bacaan dari dokumen PDF di sini..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {/* Metadata Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                {/* Mata Pelajaran Filter from Sheet MAPEL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Mata Pelajaran (Sheet MAPEL):
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Sesuai Kelas
                    </span>
                  </div>
                  <CustomDropdown
                    value={mapel}
                    onChange={(val) => setMapel(String(val))}
                    options={availableMapelList.map(m => ({ value: m, label: m }))}
                    className="w-full"
                  />
                </div>

                {/* Jenis Ujian Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Jenis Ujian CBT:
                  </label>
                  <CustomDropdown
                    value={jenisUjian}
                    onChange={(val) => setJenisUjian(String(val))}
                    options={[
                      { value: "Sumatif Akhir Semester (SAS)", label: "Sumatif Akhir Semester (SAS)" },
                      { value: "Sumatif Tengah Semester (STS)", label: "Sumatif Tengah Semester (STS)" },
                      { value: "Penilaian Akhir Tahun (PAT / SAT)", label: "Penilaian Akhir Tahun (PAT / SAT)" },
                      { value: "Asesmen Formatif Harian", label: "Asesmen Formatif Harian" },
                      { value: "Ujian Sekolah (US)", label: "Ujian Sekolah (US)" },
                      { value: "Try Out Asesmen Nasional (ANBK)", label: "Try Out Asesmen Nasional (ANBK)" },
                    ]}
                    className="w-full"
                  />
                </div>

                {/* Semester Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Semester:
                  </label>
                  <CustomDropdown
                    value={semester}
                    onChange={(val) => setSemester(String(val))}
                    options={[
                      { value: "1 (Ganjil)", label: "Semester 1 (Ganjil)" },
                      { value: "2 (Genap)", label: "Semester 2 (Genap)" },
                    ]}
                    className="w-full"
                  />
                </div>

                {/* Kelas / Rombel */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kelas / Rombel:
                  </label>
                  <CustomDropdown
                    value={kelas}
                    onChange={(val) => setKelas(String(val))}
                    options={[
                      { value: "4", label: "Kelas 4 (SD / Paket A)" },
                      { value: "5", label: "Kelas 5 (SD / Paket A)" },
                      { value: "6", label: "Kelas 6 (SD / Paket A)" },
                      { value: "7", label: "Kelas 7 (SMP / Paket B)" },
                      { value: "8", label: "Kelas 8 (SMP / Paket B)" },
                      { value: "9", label: "Kelas 9 (SMP / Paket B)" },
                      { value: "10", label: "Kelas 10 (SMA / Paket C)" },
                      { value: "11", label: "Kelas 11 (SMA / Paket C)" },
                      { value: "12", label: "Kelas 12 (SMA / Paket C)" },
                    ]}
                    className="w-full"
                  />
                </div>

                {/* CEKLIS MATERI MASTER_SILABUS */}
                <div className="col-span-1 md:col-span-2 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/60 border border-indigo-100 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                        <BookOpen size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-slate-900 tracking-tight">
                            Pilih Materi Silabus (MASTER_SILABUS):
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {mapel} • Kelas {kelas}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Centang materi di bawah untuk otomatis mengisi Topik & Bab materi (tanpa perlu ketik manual).
                        </p>
                      </div>
                    </div>

                    {/* Filter Semester & Pencarian Cepat */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 text-[11px] font-bold shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setSilabusSemesterFilter('ALL')}
                          className={`px-2 py-1 rounded-lg transition ${silabusSemesterFilter === 'ALL' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Semua
                        </button>
                        <button
                          type="button"
                          onClick={() => setSilabusSemesterFilter('1')}
                          className={`px-2 py-1 rounded-lg transition ${silabusSemesterFilter === '1' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Sem 1 (Ganjil)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSilabusSemesterFilter('2')}
                          className={`px-2 py-1 rounded-lg transition ${silabusSemesterFilter === '2' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Sem 2 (Genap)
                        </button>
                      </div>

                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={silabusSearch}
                          onChange={(e) => setSilabusSearch(e.target.value)}
                          placeholder="Cari modul / topik..."
                          className="pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 w-36 sm:w-44 focus:w-48 focus:outline-none focus:border-indigo-500 transition-all shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Toolbar Aksi & Status Centang */}
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-indigo-100/70">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllVisibleSilabus}
                        disabled={displaySilabusList.length === 0}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                      >
                        <CheckCheck size={13} />
                        <span>Pilih Semua ({displaySilabusList.length})</span>
                      </button>
                      {selectedSilabusKeys.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSilabusSelection}
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <X size={13} />
                          <span>Batal Pilih</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px]">
                      {selectedSilabusKeys.length > 0 ? (
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>{selectedSilabusKeys.length} materi tercentang</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          {displaySilabusList.length} butir materi tersedia
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabel Daftar Ceklis Silabus */}
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 shadow-2xs">
                    {displaySilabusList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        {filteredSilabus.length === 0 ? (
                          <p>
                            Tidak ada butir silabus untuk <b>{mapel}</b> Kelas <b>{kelas}</b> di <code>MASTER_SILABUS</code>.
                            <br />
                            <span className="text-[11px] text-slate-500">Anda dapat mengetikkan Topik Pembelajaran secara langsung pada kolom di bawah.</span>
                          </p>
                        ) : (
                          <p>Tidak ada butir materi yang cocok dengan pencarian atau filter semester saat ini.</p>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs text-[10px] font-black text-slate-600 uppercase border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="w-10 py-2 px-2.5 text-center">Pilih</th>
                              <th className="w-24 py-2 px-2.5">No. Modul</th>
                              <th className="w-44 py-2 px-2.5">Tema Modul</th>
                              <th className="w-20 py-2 px-2.5 text-center">Sub Ke</th>
                              <th className="py-2 px-2.5">Topik Sub Tugas</th>
                              <th className="w-24 py-2 px-2.5 text-right">PDF</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {displaySilabusList.map((item: any) => {
                              const key = getSilabusKey(item);
                              const isChecked = selectedSilabusKeys.includes(key);
                              const hasPdf = Boolean(item.pdfUrl || item.FileUrl || item.fileUrl || item.linkMateri);

                              return (
                                <tr
                                  key={key}
                                  onClick={() => handleToggleSilabusItem(item)}
                                  className={`cursor-pointer transition select-none ${
                                    isChecked 
                                      ? 'bg-indigo-50/80 hover:bg-indigo-100/70 text-indigo-950 font-medium' 
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <td className="py-2 px-2.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 pointer-events-none"
                                    />
                                  </td>
                                  <td className="py-2 px-2.5 whitespace-nowrap">
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-mono font-bold text-[11px] border border-indigo-100">
                                      Modul {item.noModul || item.modul || '-'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 font-semibold text-slate-800 max-w-[180px] truncate" title={item.temaModul || item.namaModulBab}>
                                    {item.temaModul || item.namaModulBab || '-'}
                                  </td>
                                  <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                    <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-md font-bold text-[10px] border border-cyan-100">
                                      {item.subKe || `Unit ${item.noSubModul || 1}`}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 font-medium text-slate-700">
                                    {item.topikSubTugas || item.judulSubModul || '-'}
                                  </td>
                                  <td className="py-2 px-2.5 text-right whitespace-nowrap">
                                    {hasPdf ? (
                                      <button
                                        type="button"
                                        onClick={(e) => handleUseSilabusPdf(item, e)}
                                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold transition inline-flex items-center gap-1 shadow-2xs"
                                        title="Gunakan Berkas PDF dari Silabus Ini"
                                      >
                                        <FileCheck size={11} />
                                        <span>Pakai PDF</span>
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-slate-300">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Topik / Bab Materi Pembelajaran */}
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-2 flex-wrap">
                      <span>Topik / Bab Materi Pembelajaran:</span>
                      {selectedSilabusKeys.length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          Otomatis terisi dari {selectedSilabusKeys.length} Ceklis Silabus (Tidak perlu ketik manual)
                        </span>
                      )}
                    </label>
                    {selectedSilabusKeys.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSilabusSelection}
                        className="text-[10px] text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        Reset / Ketik Manual
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={topik}
                    onChange={(e) => setTopik(e.target.value)}
                    placeholder="Otomatis terisi saat mencentang materi di atas, atau ketik topik jika tanpa silabus..."
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold focus:outline-none transition-all ${
                      selectedSilabusKeys.length > 0
                        ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950 focus:border-indigo-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  {selectedSilabusKeys.length > 0 && temaModul && (
                    <p className="text-[11px] text-indigo-600 mt-1 font-medium flex items-center gap-1">
                      <span className="font-bold">Tema Modul:</span> {temaModul}
                    </p>
                  )}
                </div>

                {/* Tingkat Kesulitan Soal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Tingkat Kesulitan Soal:
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Fokus Inti Materi PDF
                    </span>
                  </div>
                  <CustomDropdown
                    value={tingkatKesulitan}
                    onChange={(val) => setTingkatKesulitan(val as any)}
                    options={[
                      { value: "mudah", label: "Mudah & Ramah Siswa (Fokus Inti Materi PDF)" },
                      { value: "sedang", label: "Sedang (Pemahaman & Contoh Nyata Materi PDF)" },
                      { value: "tantangan", label: "Tantangan (Penerapan Materi PDF)" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles size={14} className="text-amber-500" />
                  <span>Didukung Gemini 3.8 Flash Engine</span>
                </div>

                <button
                  type="button"
                  onClick={handleStartGenerate}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{loadingStep || 'Sedang Memproses...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Analisis PDF & Generate Soal AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Results Tab */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Daftar Soal Asesmen Berbasis Dokumen PDF
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Total {generatedQuestions.length} Butir Soal (Pilihan Ganda Terstandar)
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200">
                    {sourceInfo ? `✓ ${sourceInfo}` : '✓ 100% Konten Asli PDF'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs font-bold text-slate-900 leading-relaxed">
                          {q.pertanyaan}
                        </p>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Bobot: {q.bobot || 5} Poin
                      </span>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-8">
                      {(['a', 'b', 'c', 'd', ...(q.opsi.e ? ['e'] : [])] as const).map((key) => {
                        const optText = q.opsi[key];
                        if (!optText) return null;
                        const isCorrect = q.kunci === key;
                        return (
                          <div
                            key={key}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] uppercase ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {key}
                            </span>
                            <span className="text-xs">{optText}</span>
                            {isCorrect && (
                              <span className="ml-auto text-[10px] font-black text-emerald-600 uppercase">
                                Kunci
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPreviewTab('form')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  ← Kembali / Generate Ulang
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveToBankSoal(false)}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Save size={15} />
                    <span>Simpan ke Bank Soal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveToBankSoal(true)}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <FileCheck size={16} />
                    <span>Simpan & Jadikan Sesi Ujian Baru →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Pratinjau Teks Dokumen PDF yang Terbaca AI */}
      {showExtractedTextModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600" size={18} />
                <h3 className="text-sm font-bold text-slate-800">
                  Pratinjau Teks Dokumen PDF ({extractedTextPreview.length.toLocaleString()} Karakter Terbaca)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExtractedTextModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50/50 select-text">
              {extractedTextPreview || 'Tidak ada teks yang dapat diekstrak dari dokumen ini.'}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-white text-xs">
              <span className="text-slate-500">
                Teks di atas akan dijadikan dasar pembentukan butir soal secara 100% kontekstual oleh AI.
              </span>
              <button
                type="button"
                onClick={() => setShowExtractedTextModal(false)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
