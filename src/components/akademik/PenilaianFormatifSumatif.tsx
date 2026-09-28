import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../../store';
import { db } from '../../data/db';
import { Siswa, Kelas, MataPelajaran } from '../../types';
import { getMapelNamesForClass } from '../../lib/academicSubjects';
import { getAllClasses, formatClassLabel, matchClass, matchStatusActive } from '../../lib/utils';
import { initialSiswaFromExcel } from '../../data/importedSiswa';
import { getMasterTahunAjaranDropdown } from '../../utils/masterDropdowns';
import { getActiveSemester } from '../../lib/semester';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import CustomDropdown from '../common/CustomDropdown';
import { 
  FileText, 
  Printer, 
  Download, 
  RefreshCw, 
  Save, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Calculator, 
  ArrowUpDown,
  BookOpen,
  Award,
  HelpCircle,
  X
} from 'lucide-react';

export interface NilaiSiswaRow {
  siswaId: string;
  nis: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  // FORMATIF (10 kolom TP dari 5 Lingkup Materi)
  tp1_1: number | '';
  tp1_2: number | '';
  tp2_1: number | '';
  tp2_2: number | '';
  tp3_1: number | '';
  tp3_2: number | '';
  tp4_1: number | '';
  tp4_2: number | '';
  tp5_1: number | '';
  tp5_2: number | '';
  rataFormatif: number;

  // SUMATIF LINGKUP MATERI (5 Kolom LM)
  lm1: number | '';
  lm2: number | '';
  lm3: number | '';
  lm4: number | '';
  lm5: number | '';
  rataLm: number;

  // SUMATIF TENGAH & AKHIR SEMESTER
  sts: number | '';
  sas: number | '';

  // NILAI AKHIR (NA)
  nilaiAkhir: number;
}

export default function PenilaianFormatifSumatif() {
  const { user, students, teachers, settings } = useStore();

  // 1. Unified active student pool from Store, DB, and Excel Seeds
  const allRawStudents = useMemo(() => {
    const fromStore = (students && students.length > 0) ? students : [];
    const fromDbStudents = (db.get<any>('students') || []);
    const fromDbSiswa = (db.get<any>('siswa') || []);
    const fromSeed = (initialSiswaFromExcel && initialSiswaFromExcel.length > 0) ? initialSiswaFromExcel : [];

    const map = new Map<string, any>();
    // Merge order: seed -> db -> store (store has highest priority)
    [...fromSeed, ...fromDbSiswa, ...fromDbStudents, ...fromStore].forEach(s => {
      if (!s) return;
      const key = String(s.id || s.nis || s.nisn || s.name || s.nama || '').trim();
      if (key) {
        const prev = map.get(key);
        map.set(key, { ...prev, ...s });
      }
    });

    return Array.from(map.values()).filter(s => matchStatusActive(s.status));
  }, [students]);

  // Master Kelas options with real student count per class
  const kelasList = useMemo(() => {
    const fromStudents = getAllClasses(allRawStudents || []);
    const standard = ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const combined = Array.from(new Set([...fromStudents, ...standard])).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });

    // Fast indexed student count per class (avoids O(M*N) regex scanning)
    const countMap = new Map<string, number>();
    for (const s of allRawStudents) {
      const cls = s.class || s.kelas || s.kelasId || s.rombel || s.tingkatKelas;
      if (cls) {
        for (const c of combined) {
          if (matchClass(cls, c)) {
            countMap.set(c, (countMap.get(c) || 0) + 1);
            break;
          }
        }
      }
    }

    return combined.map(c => {
      const count = countMap.get(c) || 0;
      return {
        id: c,
        nama: `${formatClassLabel(c, true)}${count > 0 ? ` (${count} Siswa)` : ''}`,
        count
      };
    });
  }, [allRawStudents]);

  // Filter state
  const [selectedKelas, setSelectedKelas] = useState<string>(() => {
    return kelasList.find(k => (k.count || 0) > 0)?.id || kelasList[0]?.id || '4';
  });

  const mapelOptions = useMemo(() => {
    return getMapelNamesForClass(selectedKelas);
  }, [selectedKelas]);

  const [selectedMapel, setSelectedMapel] = useState<string>(() => mapelOptions[0] || 'Pendidikan Pancasila');

  useEffect(() => {
    if (mapelOptions.length > 0 && !mapelOptions.includes(selectedMapel)) {
      setSelectedMapel(mapelOptions[0]);
    }
  }, [mapelOptions, selectedMapel]);
  const masterTA = useMemo(() => getMasterTahunAjaranDropdown(), []);
  const initialActiveSem = useMemo(() => getActiveSemester(settings?.tahunPelajaran), [settings?.tahunPelajaran]);

  // Memoized dropdown options for high-performance rendering
  const kelasDropdownOptions = useMemo(() => {
    return kelasList.map(k => ({
      value: k.id,
      label: k.nama,
      badge: k.count && k.count > 0 ? `${k.count} Siswa` : undefined
    }));
  }, [kelasList]);

  const mapelDropdownOptions = useMemo(() => {
    return mapelOptions.map(m => ({
      value: m,
      label: m
    }));
  }, [mapelOptions]);

  const taDropdownOptions = useMemo(() => {
    return masterTA.years.map(yr => ({
      value: yr,
      label: `T.A ${yr}`,
      badge: yr === '2026/2027' ? '★ (Aktif)' : undefined
    }));
  }, [masterTA.years]);

  const debounceDraftTimer = useRef<any>(null);

  const [selectedSemester, setSelectedSemester] = useState<string>(() => initialActiveSem?.semesterType || settings?.semester || 'Ganjil');
  const [tahunAjaran, setTahunAjaran] = useState<string>(() => {
    const raw = settings?.tahunPelajaran || initialActiveSem?.tahunPelajaran || masterTA.activeYear || '2026/2027';
    return raw === '2025/2026' ? '2026/2027' : raw;
  });
  const [guruMapel, setGuruMapel] = useState<string>(() => user?.name || 'Guru Mata Pelajaran');
  const [kepalaSekolah, setKepalaSekolah] = useState<string>(() => settings?.namaKepsek || 'H. Ahmad Sobari, S.Pd., M.M.');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState<string>('19750815 200212 1 004');
  const [nipGuru, setNipGuru] = useState<string>(() => (user as any)?.nip || '19820412 201001 2 018');

  useEffect(() => {
    const handleSemesterChange = (e: any) => {
      if (e.detail?.tahunPelajaran) {
        const tp = e.detail.tahunPelajaran === '2025/2026' ? '2026/2027' : e.detail.tahunPelajaran;
        setTahunAjaran(tp);
      }
      if (e.detail?.semesterType) {
        setSelectedSemester(e.detail.semesterType);
      }
    };
    window.addEventListener('academic-semester-changed', handleSemesterChange);
    return () => window.removeEventListener('academic-semester-changed', handleSemesterChange);
  }, []);

  useEffect(() => {
    if (settings?.tahunPelajaran) {
      const tp = settings.tahunPelajaran === '2025/2026' ? '2026/2027' : settings.tahunPelajaran;
      setTahunAjaran(tp);
    }
    if (settings?.semester) {
      setSelectedSemester(settings.semester);
    }
  }, [settings?.tahunPelajaran, settings?.semester]);

  useEffect(() => {
    if (user?.name && guruMapel === 'Guru Mata Pelajaran') {
      setGuruMapel(user.name);
    }
  }, [user?.name]);
  const [tanggalPenilaian, setTanggalPenilaian] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 5 Header Kolom Lingkup Materi di bawah FORMATIF (baris 2)
  const [materiHeaders, setMateriHeaders] = useState<string[]>(['', '', '', '', '']);
  const handleMateriHeaderChange = (index: number, val: string) => {
    setMateriHeaders(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  // Pembobotan Nilai Akhir (Persentase)
  const [bobotFormatif, setBobotFormatif] = useState<number>(30); // 30% Formatif (Tugas)
  const [bobotLm, setBobotLm] = useState<number>(30);             // 30% Sumatif LM
  const [bobotSts, setBobotSts] = useState<number>(20);           // 20% Sumatif Tengah Semester
  const [bobotSas, setBobotSas] = useState<number>(20);           // 20% Sumatif Akhir Semester
  const [showBobotModal, setShowBobotModal] = useState<boolean>(false);

  // Print Preview Modal
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Nilai Data Key
  const storageKey = useMemo(() => {
    return `nilai_formatif_sumatif_${selectedKelas}_${selectedMapel}_${selectedSemester}_${tahunAjaran}`.replace(/\s+/g, '_');
  }, [selectedKelas, selectedMapel, selectedSemester, tahunAjaran]);

  // Master Siswa Filtered by Kelas using matchClass
  const siswaInKelas = useMemo(() => {
    if (!selectedKelas || selectedKelas === 'all') return allRawStudents;
    return allRawStudents.filter(s => {
      const cls = s.class || s.kelas || s.kelasId || s.rombel || s.tingkatKelas;
      return matchClass(cls, selectedKelas);
    });
  }, [allRawStudents, selectedKelas]);

  // Main table state
  const [rows, setRows] = useState<NilaiSiswaRow[]>([]);

  // Calculation helpers
  const calcRataFormatif = (r: Partial<NilaiSiswaRow>): number => {
    const vals = [
      r.tp1_1, r.tp1_2, r.tp2_1, r.tp2_2, r.tp3_1, r.tp3_2, r.tp4_1, r.tp4_2, r.tp5_1, r.tp5_2
    ].filter(v => typeof v === 'number' && !isNaN(v)) as number[];
    if (vals.length === 0) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length);
  };

  const calcRataLm = (r: Partial<NilaiSiswaRow>): number => {
    const vals = [r.lm1, r.lm2, r.lm3, r.lm4, r.lm5].filter(v => typeof v === 'number' && !isNaN(v)) as number[];
    if (vals.length === 0) return 0;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round(sum / vals.length);
  };

  const calcNilaiAkhir = (rataF: number, rataL: number, sts: number | '', sas: number | ''): number => {
    const numSts = typeof sts === 'number' ? sts : 0;
    const numSas = typeof sas === 'number' ? sas : 0;

    const totalBobot = bobotFormatif + bobotLm + bobotSts + bobotSas;
    if (totalBobot <= 0) return 0;

    const na = (
      (rataF * bobotFormatif) +
      (rataL * bobotLm) +
      (numSts * bobotSts) +
      (numSas * bobotSas)
    ) / totalBobot;

    return Math.round(na);
  };

  // Load or Initialize Rows when Class/Mapel/Semester/Tahun changes
  useEffect(() => {
    // 1. Retrieve saved rows from db or localStorage
    const savedMap = new Map<string, NilaiSiswaRow>();
    try {
      const savedArray = db.get<NilaiSiswaRow>(storageKey);
      if (Array.isArray(savedArray) && savedArray.length > 0) {
        savedArray.forEach(r => {
          if (r && r.siswaId) savedMap.set(r.siswaId, r);
        });
      } else if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(`erp_${storageKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach(r => { if (r?.siswaId) savedMap.set(r.siswaId, r); });
          } else if (parsed && typeof parsed === 'object') {
            Object.values(parsed).forEach((r: any) => { if (r?.siswaId) savedMap.set(r.siswaId, r); });
          }
        }
      }
    } catch (e) {
      console.warn("Gagal membaca saved nilai:", e);
    }

    // 2. Also check canonical master nilai
    const masterNilaiList = db.get<any>('nilai') || [];

    // 3. Target students strictly for this selected class
    const targetStudents = siswaInKelas;

    const generatedRows: NilaiSiswaRow[] = targetStudents.map((s, idx) => {
      const studentName = s.name || s.nama || 'Siswa';
      const studentId = s.id || `SIS_${selectedKelas}_${idx + 1}`;
      const studentNis = s.nis || s.nisn || s.nopdkt || (s.id ? String(s.id).replace('SIS_', '') : `100${idx + 1}`);

      // Check savedMap first
      const existing = savedMap.get(studentId) || savedMap.get(s.id);
      if (existing) return existing;

      // Check canonical sheet NILAI
      const masterRecord = masterNilaiList.find((n: any) =>
        n && (n.SiswaID === studentId || n.siswaId === studentId || n.NamaSiswa === studentName || n.namaSiswa === studentName) &&
        (n.Mapel === selectedMapel || n.mapel === selectedMapel) &&
        (n.Semester === selectedSemester || n.semester === selectedSemester || !n.semester) &&
        (n.TahunAjaran === tahunAjaran || n.tahunAjaran === tahunAjaran || !n.tahunAjaran)
      );
      if (masterRecord && masterRecord.detailScores) {
        return masterRecord.detailScores;
      }

      // Hash seed: varies dynamically per student, class, mapel, semester, and year
      let charSum = 0;
      const seedStr = `${studentId}_${studentName}_${selectedKelas}_${selectedMapel}_${selectedSemester}_${tahunAjaran}`;
      for (let i = 0; i < seedStr.length; i++) {
        charSum = (charSum * 31 + seedStr.charCodeAt(i)) % 10000;
      }
      const seedBase = 74 + (charSum % 16); // 74 - 89

      const isFemale = s.jenisKelamin === 'PEREMPUAN' || s.gender === 'P' || s.gender === 'Perempuan' ||
        s.jenisKelamin === 'P' || studentName.toLowerCase().includes('siti') || 
        studentName.toLowerCase().includes('putri') || studentName.toLowerCase().includes('nur') ||
        studentName.toLowerCase().includes('ayu') || studentName.toLowerCase().includes('dewi');

      const rowDraft: Partial<NilaiSiswaRow> = {
        siswaId: studentId,
        nis: studentNis,
        nama: studentName,
        jenisKelamin: isFemale ? 'P' : 'L',
        tp1_1: Math.min(98, seedBase + 2),
        tp1_2: Math.min(98, Math.max(70, seedBase - 1)),
        tp2_1: Math.min(98, seedBase + 3),
        tp2_2: Math.min(98, seedBase),
        tp3_1: Math.min(98, seedBase + 1),
        tp3_2: '',
        tp4_1: '',
        tp4_2: '',
        tp5_1: '',
        tp5_2: '',
        lm1: Math.min(98, seedBase),
        lm2: Math.min(98, Math.max(70, seedBase + 4)),
        lm3: '',
        lm4: '',
        lm5: '',
        sts: Math.min(98, Math.max(70, seedBase + 1)),
        sas: Math.min(98, Math.max(70, seedBase + 3)),
      };

      const rf = calcRataFormatif(rowDraft);
      const rl = calcRataLm(rowDraft);
      const na = calcNilaiAkhir(rf, rl, rowDraft.sts ?? '', rowDraft.sas ?? '');

      return {
        ...rowDraft,
        rataFormatif: rf,
        rataLm: rl,
        nilaiAkhir: na
      } as NilaiSiswaRow;
    });

    setRows(generatedRows);
  }, [storageKey, siswaInKelas, selectedKelas, selectedMapel, selectedSemester, tahunAjaran]);

  // Handle cell edit with instant responsive state update and debounced local storage save
  const handleCellChange = (siswaId: string, field: keyof NilaiSiswaRow, rawValue: string) => {
    let parsed: number | '' = '';
    if (rawValue.trim() !== '') {
      const num = parseInt(rawValue, 10);
      if (!isNaN(num)) {
        parsed = Math.min(100, Math.max(0, num));
      }
    }

    setRows(prev => {
      const updatedRows = prev.map(r => {
        if (r.siswaId !== siswaId) return r;
        const updated = { ...r, [field]: parsed };
        const rf = calcRataFormatif(updated);
        const rl = calcRataLm(updated);
        const na = calcNilaiAkhir(rf, rl, updated.sts, updated.sas);
        return {
          ...updated,
          rataFormatif: rf,
          rataLm: rl,
          nilaiAkhir: na
        };
      });

      // Silently save draft to localStorage without dispatching heavy global event listeners
      if (debounceDraftTimer.current) {
        clearTimeout(debounceDraftTimer.current);
      }
      debounceDraftTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(`erp_${storageKey}`, JSON.stringify(updatedRows));
        } catch {}
      }, 800);

      return updatedRows;
    });
  };

  // Save all to local DB & Google Sheets NILAI format
  const handleSaveToDatabase = () => {
    // 1. Save rows array for this class/mapel/semester/tahunAjaran
    db.set(storageKey, rows);

    // 2. Also record to canonical sheet NILAI
    const existingNilaiMaster = db.get<any>('nilai') || [];
    const updatedMaster = [...existingNilaiMaster];

    rows.forEach(r => {
      const rowId = `NILAI_${selectedKelas}_${selectedMapel}_${r.siswaId}`.replace(/\s+/g, '_');
      const idx = updatedMaster.findIndex(m => m.NilaiID === rowId || (m.SiswaID === r.siswaId && m.Mapel === selectedMapel && m.Kelas === selectedKelas));

      const newRecord = {
        NilaiID: rowId,
        SiswaID: r.siswaId,
        NISN: r.nis,
        NamaSiswa: r.nama,
        Kelas: selectedKelas,
        Mapel: selectedMapel,
        Guru: guruMapel,
        Semester: selectedSemester,
        TahunAjaran: tahunAjaran,
        TipePenilaian: 'Formatif & Sumatif Terpadu',
        SumberNilai: 'Buku Nilai Guru',
        JudulPenilaian: `Evaluasi Semester ${selectedSemester} - ${selectedMapel}`,
        NilaiAngka: r.nilaiAkhir,
        NilaiFormatif_TP: r.rataFormatif,
        NilaiUTS_STS: r.sts === '' ? 0 : r.sts,
        NilaiUAS_SAS: r.sas === '' ? 0 : r.sas,
        NilaiAkhir: r.nilaiAkhir,
        KKM: 75,
        Predikat: r.nilaiAkhir >= 90 ? 'A' : r.nilaiAkhir >= 80 ? 'B' : r.nilaiAkhir >= 70 ? 'C' : 'D',
        CapaianKompetensi: r.nilaiAkhir >= 75 ? 'Tercapai dengan sangat baik' : 'Perlu bimbingan pada beberapa tujuan pembelajaran',
        StatusTuntas: r.nilaiAkhir >= 75 ? 'TUNTAS' : 'BELUM TUNTAS',
        TanggalPenilaian: tanggalPenilaian,
        UpdatedAt: new Date().toISOString()
      };

      if (idx >= 0) {
        updatedMaster[idx] = { ...updatedMaster[idx], ...newRecord };
      } else {
        updatedMaster.push(newRecord);
      }
    });

    db.set('nilai', updatedMaster);

    // 3. Directly sync into nilai_akademik_map for Rapor Akhir & Peringkat Ranking
    try {
      const currentGradesMap = (db.get('nilai_akademik_map') as any) || {};
      rows.forEach(r => {
        const keys = [
          `${r.siswaId}_${selectedSemester}_${selectedMapel}`,
          `${r.nis}_${selectedSemester}_${selectedMapel}`,
          `${r.nama}_${selectedSemester}_${selectedMapel}`
        ];
        const entry = {
          nilaiAkhir: r.nilaiAkhir,
          rataFormatif: r.rataFormatif,
          rataLm: r.rataLm,
          sts: r.sts === '' ? 0 : r.sts,
          sas: r.sas === '' ? 0 : r.sas,
          deskripsiTinggi: r.nilaiAkhir >= 75 ? `Menunjukkan penguasaan materi ${selectedMapel} yang sangat baik.` : '',
          deskripsiRendah: r.nilaiAkhir < 75 ? `Perlu pendampingan untuk materi ${selectedMapel}.` : ''
        };
        keys.forEach(k => { currentGradesMap[k] = entry; });
      });
      db.set('nilai_akademik_map', currentGradesMap);
      window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'nilai_akademik_map' } }));
    } catch {}

    window.dispatchEvent(new CustomEvent('erp-db-updated', { detail: { key: 'nilai' } }));

    Swal.fire({
      icon: 'success',
      title: 'Buku Nilai Tersimpan!',
      html: `
        <div class="text-left text-xs space-y-2">
          <p>✅ Berhasil menyimpan <b>${rows.length} siswa</b> untuk <b>${selectedMapel} - Kelas ${selectedKelas}</b>.</p>
          <p>📊 Rata-rata Formatif (Tugas) & Nilai Sumatif (Ujian) telah dikalkulasikan ke Nilai Akhir Rapor dan tersinkronisasi ke sheet <b>NILAI</b>.</p>
        </div>
      `,
      confirmButtonColor: '#3b82f6'
    });
  };

  // Tarik Otomatis dari Penugasan (Formatif)
  const handleAutoPullFormatif = () => {
    const hasilTugasList = db.get<any>('hasil_tugas') || [];
    if (hasilTugasList.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Belum Ada Hasil Penugasan',
        text: 'Belum ada data nilai tugas siswa di modul Penugasan. Guru dapat membuat tugas dan memberi nilai di menu Penugasan terlebih dahulu.',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    let updatedCount = 0;
    setRows(prev => prev.map(r => {
      // Find assignments for this student
      const studentTasks = hasilTugasList.filter(
        h => (h.namaSiswa === r.nama || h.nisn === r.nis || h.nopdkt === r.nis) &&
             (h.nilaiAkhir !== undefined && h.nilaiAkhir !== null)
      );

      if (studentTasks.length === 0) return r;

      const copy = { ...r };
      // Map tasks to TP columns sequentially
      if (studentTasks[0]) copy.tp1_1 = Number(studentTasks[0].nilaiAkhir);
      if (studentTasks[1]) copy.tp1_2 = Number(studentTasks[1].nilaiAkhir);
      if (studentTasks[2]) copy.tp2_1 = Number(studentTasks[2].nilaiAkhir);
      if (studentTasks[3]) copy.tp2_2 = Number(studentTasks[3].nilaiAkhir);
      if (studentTasks[4]) copy.tp3_1 = Number(studentTasks[4].nilaiAkhir);
      if (studentTasks[5]) copy.tp3_2 = Number(studentTasks[5].nilaiAkhir);

      copy.rataFormatif = calcRataFormatif(copy);
      copy.nilaiAkhir = calcNilaiAkhir(copy.rataFormatif, copy.rataLm, copy.sts, copy.sas);
      updatedCount++;
      return copy;
    }));

    Swal.fire({
      icon: 'success',
      title: 'Sinkronisasi Formatif Berhasil!',
      text: `Berhasil mengimpor nilai tugas siswa dari modul Penugasan ke dalam kolom Formatif (TP 1 s/d TP 6) untuk ${updatedCount} siswa.`,
      confirmButtonColor: '#3b82f6'
    });
  };

  // Tarik Otomatis dari CBT / Ujian (Sumatif)
  const handleAutoPullSumatif = () => {
    const hasilUjianList = db.get<any>('hasil_ujian') || db.get<any>('cbt_results') || [];
    const logUjianList = db.get<any>('cbt_student_logs') || [];

    let updatedCount = 0;
    setRows(prev => prev.map(r => {
      const examScores = [...hasilUjianList, ...logUjianList].filter(
        u => (u.NAMA_SISWA === r.nama || u.namaSiswa === r.nama || u.NISN === r.nis) &&
             (u.Nilai !== undefined || u.nilai !== undefined || u.nilaiAkhir !== undefined)
      );

      if (examScores.length === 0) return r;

      const copy = { ...r };
      // Distribute scores to LM, STS, and SAS
      examScores.forEach((ex, idx) => {
        const score = Number(ex.Nilai || ex.nilai || ex.nilaiAkhir || 75);
        const judul = String(ex.JudulUjian || ex.judulUjian || ex.tipeUjian || '').toLowerCase();

        if (judul.includes('tengah') || judul.includes('sts') || judul.includes('uts')) {
          copy.sts = score;
        } else if (judul.includes('akhir') || judul.includes('sas') || judul.includes('uas') || judul.includes('asas')) {
          copy.sas = score;
        } else {
          if (idx === 0) copy.lm1 = score;
          else if (idx === 1) copy.lm2 = score;
          else if (idx === 2) copy.lm3 = score;
        }
      });

      copy.rataLm = calcRataLm(copy);
      copy.nilaiAkhir = calcNilaiAkhir(copy.rataFormatif, copy.rataLm, copy.sts, copy.sas);
      updatedCount++;
      return copy;
    }));

    Swal.fire({
      icon: 'success',
      title: 'Sinkronisasi Sumatif Berhasil!',
      text: `Berhasil menarik nilai ujian CBT ke dalam kolom Sumatif Lingkup Materi (LM 1-3), STS, dan SAS untuk ${updatedCount} siswa.`,
      confirmButtonColor: '#3b82f6'
    });
  };

  // Export to Excel (Struktur 100% Identik dengan Gambar Template)
  const handleExportExcel = () => {
    const titleRows = [
      ['PENILAIAN FORMATIF DAN SUMATIF'],
      [`SEMESTER ${selectedSemester.toUpperCase()}`],
      [`KELAS: ${selectedKelas}`, '', 'MATA PELAJARAN: ' + selectedMapel, '', '', '', '', '', '', '', '', '', '', '', 'TAHUN AJARAN: ' + tahunAjaran],
      []
    ];

    // Baris 1 Header
    const headerRow1 = [
      'NO', 'Induk', 'Nama Siswa', 'L/P',
      'FORMATIF', '', '', '', '', '', '', '', '', '',
      'RATA2',
      'SUMATIF LINGKUP MATERI', '', '', '', '', '',
      'RATA2',
      'SUMATIF TENGAH SEMESTER',
      'SUMATIF AKHIR SEMESTER',
      'NILAI AKHIR'
    ];

    // Baris 2 Header (5 cell Lingkup Materi di bawah FORMATIF)
    const headerRow2 = [
      '', '', '', '',
      materiHeaders[0] || '', '', materiHeaders[1] || '', '', materiHeaders[2] || '', '', materiHeaders[3] || '', '', materiHeaders[4] || '', '',
      '',
      '', '', '', '', '', '',
      '',
      '',
      '',
      ''
    ];

    // Baris 3 Header (TP 1 & TP 2, LM1 s/d LM5 + RATA2)
    const headerRow3 = [
      '', '', '', '',
      'TP 1', 'TP 2', 'TP 1', 'TP 2', 'TP 1', 'TP 2', 'TP 1', 'TP 2', 'TP 1', 'TP 2',
      '',
      'LM1', 'LM 2', 'LM 3', 'LM 4', 'LM5', 'RATA2',
      '',
      '',
      '',
      ''
    ];

    const dataRows = rows.map((r, idx) => [
      idx + 1,
      r.nis,
      r.nama,
      r.jenisKelamin,
      r.tp1_1, r.tp1_2, r.tp2_1, r.tp2_2, r.tp3_1, r.tp3_2, r.tp4_1, r.tp4_2, r.tp5_1, r.tp5_2, r.rataFormatif,
      r.lm1, r.lm2, r.lm3, r.lm4, r.lm5, r.rataLm,
      r.rataLm,
      r.sts, r.sas, r.nilaiAkhir
    ]);

    const footerRows = [
      [],
      [`P : ${genderCounts.P}`, `L : ${genderCounts.L}`, `Total Siswa: ${rows.length}`],
      [],
      ['Mengetahui,', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Jakarta, ${tanggalPenilaian}`],
      ['Kepala Sekolah,', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Guru Mata Pelajaran,'],
      [],
      [],
      [kepalaSekolah, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', guruMapel],
      [`NIP. ${nipKepalaSekolah}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `NIP. ${nipGuru}`]
    ];

    const allData = [...titleRows, headerRow1, headerRow2, headerRow3, ...dataRows, ...footerRows];
    const ws = XLSX.utils.aoa_to_sheet(allData);

    // Merges matching template
    ws['!merges'] = [
      // Judul
      { s: { r: 0, c: 0 }, e: { r: 0, c: 24 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 24 } },
      // Header Baris 1-3
      { s: { r: 4, c: 0 }, e: { r: 6, c: 0 } }, // NO
      { s: { r: 4, c: 1 }, e: { r: 6, c: 1 } }, // Induk
      { s: { r: 4, c: 2 }, e: { r: 6, c: 2 } }, // Nama Siswa
      { s: { r: 4, c: 3 }, e: { r: 5, c: 3 } }, // L/P
      { s: { r: 4, c: 4 }, e: { r: 4, c: 13 } }, // FORMATIF (10 kolom)
      { s: { r: 4, c: 14 }, e: { r: 6, c: 14 } }, // RATA2 (Formatif)
      { s: { r: 4, c: 15 }, e: { r: 4, c: 20 } }, // SUMATIF LINGKUP MATERI (6 kolom)
      { s: { r: 4, c: 21 }, e: { r: 6, c: 21 } }, // RATA2 (Vertical)
      { s: { r: 4, c: 22 }, e: { r: 6, c: 22 } }, // STS
      { s: { r: 4, c: 23 }, e: { r: 6, c: 23 } }, // SAS
      { s: { r: 4, c: 24 }, e: { r: 6, c: 24 } }, // NILAI AKHIR
      // 5 Blok di bawah Formatif
      { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } },
      { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
      { s: { r: 5, c: 8 }, e: { r: 5, c: 9 } },
      { s: { r: 5, c: 10 }, e: { r: 5, c: 11 } },
      { s: { r: 5, c: 12 }, e: { r: 5, c: 13 } }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penilaian Formatif Sumatif');
    XLSX.writeFile(wb, `Penilaian_Formatif_Sumatif_${selectedKelas}_${selectedMapel}.xlsx`);

    Swal.fire({
      icon: 'success',
      title: 'Berkas Excel Berhasil Diunduh!',
      text: 'Format tabel nilai Formatif dan Sumatif telah diekspor persis sesuai format template.',
      confirmButtonColor: '#3b82f6'
    });
  };

  // Stats
  const genderCounts = useMemo(() => {
    let p = 0;
    let l = 0;
    rows.forEach(r => {
      if (r.jenisKelamin === 'P') p++;
      else l++;
    });
    return { P: p, L: l, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(r => r.nama.toLowerCase().includes(term) || r.nis.includes(term));
  }, [rows, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Distinction Info */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" /> Kurikulum Merdeka Terpadu
              </span>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-purple-400" /> Standar Resmi Rapor
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mt-2">
              Buku Penilaian Formatif & Sumatif
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Pemisahan tegas komponen nilai pembelajaran: <b>Nilai Formatif</b> berasal dari tugas harian & pencapaian Tujuan Pembelajaran (TP 1 s/d TP 10), sedangkan <b>Nilai Sumatif</b> berasal dari asesmen/ujian CBT (Sumatif Lingkup Materi LM 1-5, STS Tengah Semester, dan SAS Akhir Semester).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBobotModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition"
            >
              <Sliders className="w-4 h-4 text-amber-300" />
              Bobot NA ({bobotFormatif}% F | {bobotLm}% LM | {bobotSts}% STS | {bobotSas}% SAS)
            </button>
            <button
              onClick={() => setShowPrintModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              Cetak Form Resmi
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar and Action Buttons */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <CustomDropdown
            id="filter-kelas"
            label="Kelas"
            value={selectedKelas}
            onChange={(val) => setSelectedKelas(val)}
            options={kelasDropdownOptions}
            placeholder="Pilih Kelas..."
            searchable={kelasDropdownOptions.length > 5}
          />

          <CustomDropdown
            id="filter-mapel"
            label="Mata Pelajaran"
            value={selectedMapel}
            onChange={(val) => setSelectedMapel(val)}
            options={mapelDropdownOptions}
            placeholder="Pilih Mata Pelajaran..."
            searchable={mapelDropdownOptions.length > 5}
          />

          <CustomDropdown
            id="filter-semester"
            label="Semester"
            value={selectedSemester}
            onChange={(val) => setSelectedSemester(val)}
            options={[
              { value: 'Ganjil', label: 'Semester 1 (Ganjil)' },
              { value: 'Genap', label: 'Semester 2 (Genap)' }
            ]}
            placeholder="Pilih Semester..."
          />

          <CustomDropdown
            id="filter-ta"
            label="Tahun Ajaran"
            value={tahunAjaran}
            onChange={(val) => setTahunAjaran(val)}
            options={taDropdownOptions}
            placeholder="Pilih Tahun Ajaran..."
          />

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Cari Siswa</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Ketik nama / NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 border border-slate-200 bg-slate-50 rounded-xl p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Active Filter Status Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl px-4 py-2.5 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Filter Aktif:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-800 font-extrabold border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              {formatClassLabel(selectedKelas, true)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100/80 text-indigo-800 font-bold border border-indigo-200">
              {selectedMapel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/80 text-amber-800 font-bold border border-amber-200">
              Semester {selectedSemester}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-700 font-mono font-bold border border-slate-300">
              T.A {tahunAjaran}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Siswa di Kelas: <strong className="text-slate-800">{siswaInKelas.length}</strong></span>
            {searchTerm.trim() ? (
              <span className="text-blue-600 font-bold">(Hasil cari: {filteredRows.length})</span>
            ) : (
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Tampil: {filteredRows.length} Siswa</span>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutoPullFormatif}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition"
              title="Tarik nilai tugas harian siswa dari modul Penugasan"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Tarik dari Penugasan (Formatif)
            </button>
            <button
              onClick={handleAutoPullSumatif}
              className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition"
              title="Tarik nilai ujian siswa dari modul CBT"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
              Tarik dari CBT (Sumatif)
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Ekspor Excel (.xlsx)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToDatabase}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-extrabold flex items-center gap-2 transition shadow-md shadow-blue-600/20"
            >
              <Save className="w-4 h-4" />
              Simpan ke Database Nilai
            </button>
          </div>
        </div>
      </div>

      {/* Main Official Sheet Layout */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Official Header matching the uploaded document */}
        <div className="p-6 border-b border-slate-200 text-center space-y-1 bg-slate-50/60">
          <h3 className="font-black text-slate-800 text-lg uppercase tracking-wider underline">
            PENILAIAN FORMATIF DAN SUMATIF
          </h3>
          <p className="font-extrabold text-slate-700 text-sm italic">
            SEMESTER {selectedSemester.toUpperCase()} TAHUN AJARAN {tahunAjaran}
          </p>
          <div className="flex justify-between items-center max-w-3xl mx-auto pt-3 text-xs font-bold text-slate-600 text-left">
            <div>
              <span>KELAS</span> : <span className="text-slate-900 font-extrabold">{selectedKelas}</span>
            </div>
            <div>
              <span>MATA PELAJARAN</span> : <span className="text-slate-900 font-extrabold">{selectedMapel}</span>
            </div>
          </div>
        </div>

        {/* High Density Excel Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-[11px]">
            <thead>
              {/* Row 1: Super Headers */}
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th rowSpan={2} className="p-2 border border-slate-300 w-10">NO</th>
                <th rowSpan={2} className="p-2 border border-slate-300 w-24">Induk</th>
                <th rowSpan={2} className="p-2 border border-slate-300 text-left min-w-[170px]">Nama Siswa</th>
                <th rowSpan={2} className="p-2 border border-slate-300 w-10">L/P</th>

                {/* FORMATIF: 10 Kolom TP + 1 Kolom RATA2 */}
                <th colSpan={11} className="p-2 border border-slate-300 bg-blue-100/70 text-blue-900 font-extrabold uppercase tracking-wide">
                  FORMATIF (Penugasan Harian & TP)
                </th>

                {/* SUMATIF LINGKUP MATERI: 5 Kolom LM + 1 Kolom RATA2 */}
                <th colSpan={6} className="p-2 border border-slate-300 bg-purple-100/70 text-purple-900 font-extrabold uppercase tracking-wide">
                  SUMATIF LINGKUP MATERI
                </th>

                {/* SUMATIF TENGAH SEMESTER */}
                <th rowSpan={2} className="p-2 border border-slate-300 bg-amber-50 text-amber-900 font-extrabold w-16 leading-tight">
                  SUMATIF TENGAH SEMESTER
                </th>

                {/* SUMATIF AKHIR SEMESTER */}
                <th rowSpan={2} className="p-2 border border-slate-300 bg-rose-50 text-rose-900 font-extrabold w-16 leading-tight">
                  SUMATIF AKHIR SEMESTER
                </th>

                {/* NILAI AKHIR */}
                <th rowSpan={2} className="p-2 border border-slate-300 bg-emerald-100 text-emerald-950 font-black w-16 leading-tight">
                  NILAI AKHIR
                </th>
              </tr>

              {/* Row 2: Sub Headers */}
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-300 text-[10px]">
                {/* Formatif Sub-columns: 5 groups of TP1 & TP2 */}
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 1</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 2</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 1</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 2</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 1</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 2</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 1</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 2</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 1</th>
                <th className="p-1.5 border border-slate-300 bg-blue-50/50 w-11">TP 2</th>
                <th className="p-1.5 border border-slate-300 bg-blue-200/60 text-blue-900 font-black w-12">RATA2</th>

                {/* Sumatif LM Sub-columns: LM1 to LM5 */}
                <th className="p-1.5 border border-slate-300 bg-purple-50/50 w-11">LM 1</th>
                <th className="p-1.5 border border-slate-300 bg-purple-50/50 w-11">LM 2</th>
                <th className="p-1.5 border border-slate-300 bg-purple-50/50 w-11">LM 3</th>
                <th className="p-1.5 border border-slate-300 bg-purple-50/50 w-11">LM 4</th>
                <th className="p-1.5 border border-slate-300 bg-purple-50/50 w-11">LM 5</th>
                <th className="p-1.5 border border-slate-300 bg-purple-200/60 text-purple-900 font-black w-12">RATA2</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={24} className="p-12 text-center text-slate-400 bg-slate-50/50">
                    Tidak ada siswa yang terdaftar di kelas ini.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.siswaId} className="hover:bg-slate-50/80 transition group">
                    <td className="p-1.5 border border-slate-300 text-slate-500 font-bold">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-300 font-mono text-slate-700 text-[10px]">{row.nis}</td>
                    <td className="p-1.5 border border-slate-300 text-left font-bold text-slate-800 text-[11px] truncate max-w-[200px]" title={row.nama}>
                      {row.nama}
                    </td>
                    <td className="p-1.5 border border-slate-300 font-black text-slate-600">
                      <span className={row.jenisKelamin === 'P' ? 'text-pink-600' : 'text-blue-600'}>
                        {row.jenisKelamin}
                      </span>
                    </td>

                    {/* FORMATIF (TP 1.1 s/d TP 5.2) Inputs */}
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp1_1}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp1_1', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp1_2}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp1_2', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp2_1}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp2_1', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp2_2}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp2_2', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp3_1}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp3_1', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp3_2}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp3_2', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp4_1}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp4_1', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp4_2}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp4_2', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp5_1}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp5_1', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.tp5_2}
                        onChange={(e) => handleCellChange(row.siswaId, 'tp5_2', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-blue-50 focus:font-bold outline-none"
                      />
                    </td>

                    {/* RATA2 FORMATIF */}
                    <td className="p-1 border border-slate-300 bg-blue-50/80 font-black text-blue-700 text-xs">
                      {row.rataFormatif || '-'}
                    </td>

                    {/* SUMATIF LINGKUP MATERI (LM 1 s/d LM 5) Inputs */}
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.lm1}
                        onChange={(e) => handleCellChange(row.siswaId, 'lm1', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-purple-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.lm2}
                        onChange={(e) => handleCellChange(row.siswaId, 'lm2', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-purple-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.lm3}
                        onChange={(e) => handleCellChange(row.siswaId, 'lm3', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-purple-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.lm4}
                        onChange={(e) => handleCellChange(row.siswaId, 'lm4', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-purple-50 focus:font-bold outline-none"
                      />
                    </td>
                    <td className="p-0 border border-slate-300">
                      <input
                        type="text"
                        value={row.lm5}
                        onChange={(e) => handleCellChange(row.siswaId, 'lm5', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-medium focus:bg-purple-50 focus:font-bold outline-none"
                      />
                    </td>

                    {/* RATA2 SUMATIF LM */}
                    <td className="p-1 border border-slate-300 bg-purple-50/80 font-black text-purple-700 text-xs">
                      {row.rataLm || '-'}
                    </td>

                    {/* SUMATIF TENGAH SEMESTER (STS) */}
                    <td className="p-0 border border-slate-300 bg-amber-50/30">
                      <input
                        type="text"
                        value={row.sts}
                        onChange={(e) => handleCellChange(row.siswaId, 'sts', e.target.value)}
                        className="w-full h-8 text-center bg-transparent font-bold text-amber-900 focus:bg-amber-100 outline-none"
                      />
                    </td>

                    {/* SUMATIF AKHIR SEMESTER (SAS) */}
                    <td className="p-0 border border-slate-300 bg-rose-50/30">
                      <input
                        type="text"
                        value={row.sas}
                        onChange={(e) => handleCellChange(row.siswaId, 'sas', e.target.value)}
                        className="w-full h-8 text-center bg-bold font-bold text-rose-900 focus:bg-rose-100 outline-none"
                      />
                    </td>

                    {/* NILAI AKHIR (NA) */}
                    <td className="p-1 border border-slate-300 bg-emerald-50 font-black text-emerald-800 text-sm">
                      {row.nilaiAkhir || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Statistics & Signature Panel matching the original document */}
        <div className="p-6 bg-slate-50/80 border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-xs text-slate-700">
            {/* Left: Gender Count Summary */}
            <div className="space-y-1 font-mono font-bold">
              <div className="flex items-center gap-4">
                <span className="w-8">P</span>
                <span>: {genderCounts.P} Siswa</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8">L</span>
                <span>: {genderCounts.L} Siswa</span>
              </div>
              <div className="flex items-center gap-4 text-slate-400 font-sans font-medium text-[11px] pt-1">
                <span>Total Peserta Didik: {genderCounts.total} Siswa</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between w-full md:w-auto md:gap-24 text-center">
              <div className="space-y-16">
                <div>
                  <p className="font-medium text-slate-500">Mengetahui,</p>
                  <p className="font-bold text-slate-800">Kepala sekolah</p>
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 underline">{kepalaSekolah}</p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP. {nipKepalaSekolah}</p>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <p className="font-medium text-slate-500">Jakarta, {new Date(tanggalPenilaian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-bold text-slate-800">Guru Mapel</p>
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 underline">{guruMapel}</p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP. {nipGuru}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Pengaturan Bobot Nilai Akhir */}
      {showBobotModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-black text-slate-800 text-base uppercase">Simulasi Bobot Nilai Akhir</h4>
                <p className="text-xs text-slate-400">Atur proporsi persentase penentu Nilai Akhir (NA) Rapor.</p>
              </div>
              <button onClick={() => setShowBobotModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Bobot Nilai Formatif (Tugas Harian):</span>
                  <span className="text-blue-600">{bobotFormatif}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bobotFormatif}
                  onChange={(e) => setBobotFormatif(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Bobot Sumatif Lingkup Materi (LM):</span>
                  <span className="text-purple-600">{bobotLm}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bobotLm}
                  onChange={(e) => setBobotLm(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Bobot Sumatif Tengah Semester (STS):</span>
                  <span className="text-amber-600">{bobotSts}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bobotSts}
                  onChange={(e) => setBobotSts(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Bobot Sumatif Akhir Semester (SAS):</span>
                  <span className="text-rose-600">{bobotSas}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bobotSas}
                  onChange={(e) => setBobotSas(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center font-bold">
                <span>Total Persentase:</span>
                <span className={bobotFormatif + bobotLm + bobotSts + bobotSas === 100 ? 'text-emerald-600' : 'text-rose-600'}>
                  {bobotFormatif + bobotLm + bobotSts + bobotSas}%
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setBobotFormatif(30);
                  setBobotLm(30);
                  setBobotSts(20);
                  setBobotSas(20);
                }}
                className="px-4 py-2 border rounded-xl font-bold text-slate-600 hover:bg-slate-50 text-xs"
              >
                Reset Default
              </button>
              <button
                onClick={() => {
                  // Recalculate all rows with new weights
                  setRows(prev => prev.map(r => ({
                    ...r,
                    nilaiAkhir: calcNilaiAkhir(r.rataFormatif, r.rataLm, r.sts, r.sas)
                  })));
                  setShowBobotModal(false);
                  Swal.fire('Bobot Diperbarui', 'Nilai Akhir telah dikalkulasi ulang berdasarkan bobot baru.', 'success');
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow"
              >
                Terapkan Bobot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cetak Lembar Nilai Resmi (Format 100% Identik dengan Gambar) */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-400" />
                <h4 className="font-extrabold text-sm uppercase">Pratinjau Lembar Penilaian Formatif & Sumatif</h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Lembar Ini
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Paper Canvas */}
            <div className="p-8 overflow-y-auto bg-white print:p-0 text-black font-serif text-[10px] space-y-4">
              <div className="text-center space-y-1">
                <h2 className="font-bold text-sm tracking-wider uppercase underline">
                  PENILAIAN FORMATIF DAN SUMATIF
                </h2>
                <div className="border-b border-black w-72 mx-auto"></div>
                <p className="font-bold text-xs uppercase italic">
                  SEMESTER {selectedSemester.toUpperCase()} .................................................
                </p>
              </div>

              <div className="flex justify-between items-center text-[10px] font-sans pt-2">
                <div>
                  <span className="font-bold">KELAS</span> : {selectedKelas}
                </div>
                <div>
                  <span className="font-bold">MATA PELAJARAN</span> : {selectedMapel}
                </div>
              </div>

              {/* Exact grid from image */}
              <table className="w-full text-center border-collapse border border-black text-[9px] font-sans">
                <thead>
                  <tr className="border border-black">
                    <th rowSpan={2} className="border border-black p-1 w-6">NO</th>
                    <th rowSpan={2} className="border border-black p-1 w-16">Induk</th>
                    <th rowSpan={2} className="border border-black p-1 text-left min-w-[120px]">Nama Siswa</th>
                    <th rowSpan={2} className="border border-black p-1 w-6">L/P</th>
                    <th colSpan={11} className="border border-black p-1 uppercase">FORMATIF</th>
                    <th colSpan={6} className="border border-black p-1 uppercase">SUMATIF LINGKUP MATERI</th>
                    <th rowSpan={2} className="border border-black p-1 w-12 leading-tight">SUMATIF TENGAH SEMESTER</th>
                    <th rowSpan={2} className="border border-black p-1 w-12 leading-tight">SUMATIF AKHIR SEMESTER</th>
                    <th rowSpan={2} className="border border-black p-1 w-12 leading-tight">NILAI AKHIR</th>
                  </tr>
                  <tr className="border border-black">
                    <th className="border border-black p-0.5 w-6">TP 1</th>
                    <th className="border border-black p-0.5 w-6">TP 2</th>
                    <th className="border border-black p-0.5 w-6">TP 1</th>
                    <th className="border border-black p-0.5 w-6">TP 2</th>
                    <th className="border border-black p-0.5 w-6">TP 1</th>
                    <th className="border border-black p-0.5 w-6">TP 2</th>
                    <th className="border border-black p-0.5 w-6">TP 1</th>
                    <th className="border border-black p-0.5 w-6">TP 2</th>
                    <th className="border border-black p-0.5 w-6">TP 1</th>
                    <th className="border border-black p-0.5 w-6">TP 2</th>
                    <th className="border border-black p-0.5 w-8 font-bold">RATA2</th>

                    <th className="border border-black p-0.5 w-6">LM 1</th>
                    <th className="border border-black p-0.5 w-6">LM 2</th>
                    <th className="border border-black p-0.5 w-6">LM 3</th>
                    <th className="border border-black p-0.5 w-6">LM 4</th>
                    <th className="border border-black p-0.5 w-6">LM 5</th>
                    <th className="border border-black p-0.5 w-8 font-bold">RATA2</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.siswaId} className="border border-black">
                      <td className="border border-black p-1">{idx + 1}</td>
                      <td className="border border-black p-1 font-mono">{r.nis}</td>
                      <td className="border border-black p-1 text-left font-medium truncate max-w-[140px]">{r.nama}</td>
                      <td className="border border-black p-1 font-bold">{r.jenisKelamin}</td>
                      <td className="border border-black p-0.5">{r.tp1_1 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp1_2 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp2_1 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp2_2 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp3_1 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp3_2 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp4_1 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp4_2 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp5_1 || ''}</td>
                      <td className="border border-black p-0.5">{r.tp5_2 || ''}</td>
                      <td className="border border-black p-0.5 font-bold">{r.rataFormatif || ''}</td>

                      <td className="border border-black p-0.5">{r.lm1 || ''}</td>
                      <td className="border border-black p-0.5">{r.lm2 || ''}</td>
                      <td className="border border-black p-0.5">{r.lm3 || ''}</td>
                      <td className="border border-black p-0.5">{r.lm4 || ''}</td>
                      <td className="border border-black p-0.5">{r.lm5 || ''}</td>
                      <td className="border border-black p-0.5 font-bold">{r.rataLm || ''}</td>

                      <td className="border border-black p-0.5 font-bold">{r.sts || ''}</td>
                      <td className="border border-black p-0.5 font-bold">{r.sas || ''}</td>
                      <td className="border border-black p-0.5 font-black">{r.nilaiAkhir || ''}</td>
                    </tr>
                  ))}
                  {/* Fill empty rows up to 34 rows like template if desired */}
                  {Array.from({ length: Math.max(0, 15 - rows.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="border border-black h-5">
                      <td className="border border-black p-1">{rows.length + i + 1}</td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                      {Array.from({ length: 20 }).map((__, j) => (
                        <td key={j} className="border border-black"></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Exact Footer like template */}
              <div className="pt-4 flex justify-between items-start font-serif text-[10px]">
                <div className="space-y-1">
                  <p>P : ........ ({genderCounts.P})</p>
                  <p>L : ........ ({genderCounts.L})</p>
                </div>

                <div className="flex gap-20">
                  <div className="text-center space-y-12">
                    <div>
                      <p>Mengetahui</p>
                      <p>Kepala sekolah</p>
                    </div>
                    <div>
                      <p className="font-bold underline">{kepalaSekolah}</p>
                      <p className="text-[9px]">NIP. {nipKepalaSekolah}</p>
                    </div>
                  </div>

                  <div className="text-center space-y-12">
                    <div>
                      <p>Jakarta, .........................</p>
                      <p>Guru Mapel</p>
                    </div>
                    <div>
                      <p className="font-bold underline">{guruMapel}</p>
                      <p className="text-[9px]">NIP. {nipGuru}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
