import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../store';
import { Student, Teacher } from '../types';
import { 
  CLASSES, STANDARD_CLASSES, generateId, cn, formatDate, formatAge, 
  getGoogleDriveDirectImageUrl, getGoogleDriveThumbnailUrl, 
  standardizeDate, matchClass, getAllClasses, getActiveClasses, formatClassLabel, triggerPrint 
} from '../lib/utils';
import { 
  BarChart, Users, GraduationCap, DollarSign, ShieldAlert, Package, Download, 
  Printer, FileSpreadsheet, Upload, FileDown, CheckCircle2, AlertCircle, FileText, 
  Search, Filter, RefreshCw, Eye, ExternalLink, Award, Check, ChevronRight, 
  FolderDown, Sparkles, HelpCircle, ArrowRight, BookOpen, Layers, ShieldCheck, User,
  Heart, Calendar, CreditCard, BookMarked, Building2, Globe
} from 'lucide-react';
import { downloadMenuStructureExcel } from '../data/menuDataStructureExport';
import { 
  exportToExcel, exportTeachersToExcel, exportDocumentChecklistToExcel, importFromExcel, importTeachersFromExcel,
  downloadStudentMasterTemplate, downloadStudentExcelTemplate, downloadTeacherExcelTemplate,
  downloadAssessmentExcelTemplate, downloadFinanceExcelTemplate, downloadAttendanceExcelTemplate,
  downloadSarprasExcelTemplate, downloadBkExcelTemplate, downloadCbtQuestionExcelTemplate,
  downloadDokumenSuratExcelTemplate, downloadSpmbExcelTemplate,
  downloadPerpusExcelTemplate, downloadWaNotificationExcelTemplate, downloadEkskulExcelTemplate, downloadMadingExcelTemplate,
  downloadPortalPublikExcelTemplate,
  MASTER_SISWA_COLUMNS, MASTER_GURU_COLUMNS
} from '../lib/excel';
import { fetchFromGAS } from '../lib/api';
import { auditAllStudentsDapodik } from '../lib/dapodikValidator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LaporanPage() {
  const { 
    students, teachers, settings, addStudent, updateStudent, setStudents, setTeachers,
    setLoading, setIsSyncingGlobal, setLastSyncedAt 
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'import' | 'export' | 'print-pdf' | 'rekap'>('templates');

  // Filter and selection states for Export & Print
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [printDocType, setPrintDocType] = useState<'daftar-siswa' | 'f-sek' | 'kartu-kolektif' | 'kartu-satuan' | 'daftar-gtk'>('daftar-siswa');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Import State
  const [importCategory, setImportCategory] = useState<'siswa' | 'gtk'>('siswa');
  const [importMode, setImportMode] = useState<'UPDATE' | 'SKIP_EXISTING' | 'ADD_ALL'>('UPDATE');
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    fileName: string;
    parsedData: any[];
    category: 'siswa' | 'gtk';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const classesList = useMemo(() => {
    return Array.from(new Set([...getAllClasses(students), ...STANDARD_CLASSES])).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students]);
  const kepsek = teachers?.find(t => t.class === 'Kepala Sekolah' || (t.class && t.class.toLowerCase().includes('kepala')));
  const waliKelas = teachers?.find(t => matchClass(t.class, selectedClass || ''));

  // Selected student for single print (F-SEK or Single Card)
  const activeStudents = students.filter(s => s && s.status !== 'Pindah' && s.status !== 'Keluar' && s.status !== 'Lulus');
  const filteredStudents = activeStudents.filter(s => {
    const matchesClass = selectedClass ? matchClass(s.class, selectedClass) : true;
    const matchesSearch = studentSearch ? (
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.nis && s.nis.includes(studentSearch)) ||
      (s.nisn && s.nisn.includes(studentSearch))
    ) : true;
    return matchesClass && matchesSearch;
  });

  const selectedStudent = activeStudents.find(s => s.id === selectedStudentId) || filteredStudents[0] || activeStudents[0];

  // Auto sync function
  const triggerSync = async (updatedStudents?: Student[], updatedTeachers?: Teacher[]) => {
    if (!settings.scriptUrl) return;
    try {
      setLoading(true);
      setIsSyncingGlobal(true);
      await fetchFromGAS(settings.scriptUrl, {
        action: 'sync',
        data: updatedStudents || useStore.getState().students,
        teachers: updatedTeachers || useStore.getState().teachers,
        spreadsheetId: settings.spreadsheetId
      });
      setLastSyncedAt(new Date().toLocaleTimeString('id-ID'));
    } catch (e) {
      console.error("Auto sync failed:", e);
    } finally {
      setLoading(false);
      setIsSyncingGlobal(false);
    }
  };

  // ==========================================
  // IMPORT HANDLERS
  // ==========================================
  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      if (importCategory === 'siswa') {
        const parsed = await importFromExcel(file);
        if (parsed.length === 0) {
          alert("File tidak memiliki data siswa yang valid atau format header tidak dikenali.");
          return;
        }
        setImportPreview({
          fileName: file.name,
          parsedData: parsed,
          category: 'siswa'
        });
      } else {
        const parsed = await importTeachersFromExcel(file);
        if (parsed.length === 0) {
          alert("File tidak memiliki data Guru/GTK yang valid.");
          return;
        }
        setImportPreview({
          fileName: file.name,
          parsedData: parsed,
          category: 'gtk'
        });
      }
    } catch (err: any) {
      console.error(err);
      alert(`Gagal membaca file: ${err?.message || 'Format tidak dikenali'}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsProcessingImport(true);

    try {
      if (importPreview.category === 'siswa') {
        const currentStudents = [...useStore.getState().students];
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const now = new Date().toISOString();

        for (const imp of importPreview.parsedData) {
          if (!imp.name) continue;

          const existingIdx = currentStudents.findIndex(s => 
            (imp.nis && s.nis && String(s.nis).trim() === String(imp.nis).trim()) ||
            (imp.nisn && s.nisn && String(s.nisn).trim() === String(imp.nisn).trim()) ||
            (imp.nik && s.nik && String(s.nik).trim() === String(imp.nik).trim()) ||
            (s.name.toLowerCase().trim() === imp.name.toLowerCase().trim() && matchClass(s.class, imp.class || ''))
          );

          if (existingIdx !== -1) {
            if (importMode === 'UPDATE') {
              const prev = currentStudents[existingIdx];
              const updated: Student = {
                ...prev,
                name: imp.name || prev.name,
                class: imp.class || prev.class,
                nis: imp.nis || prev.nis,
                nisn: imp.nisn || prev.nisn,
                nik: imp.nik || prev.nik,
                gender: (imp.gender === 'P' || imp.gender === 'L') ? imp.gender : prev.gender,
                pob: imp.pob || prev.pob,
                dob: imp.dob || prev.dob,
                address: imp.address || prev.address,
                parentName: imp.parentName || imp.namaAyah || prev.parentName,
                status: imp.status || prev.status,
                tahunMasuk: imp.tahunMasuk || prev.tahunMasuk,
                anakKe: imp.anakKe || prev.anakKe,
                saudara: imp.saudara || prev.saudara,
                agama: imp.agama || prev.agama,
                golonganDarah: imp.golonganDarah || prev.golonganDarah,
                tinggiBadan: imp.tinggiBadan || prev.tinggiBadan,
                beratBadan: imp.beratBadan || prev.beratBadan,
                prestasi: imp.prestasi || prev.prestasi,
                hobi: imp.hobi || prev.hobi,
                catatanPenting: imp.catatanPenting || prev.catatanPenting,
                rt: imp.rt || prev.rt,
                rw: imp.rw || prev.rw,
                kelurahan: imp.kelurahan || prev.kelurahan,
                kecamatan: imp.kecamatan || prev.kecamatan,
                kota: imp.kota || prev.kota,
                provinsi: imp.provinsi || prev.provinsi,
                kodePos: imp.kodePos || prev.kodePos,
                jenisTinggal: imp.jenisTinggal || prev.jenisTinggal,
                alatTransportasi: imp.alatTransportasi || prev.alatTransportasi,
                noHp: imp.noHp || prev.noHp,
                email: imp.email || prev.email,
                sekolahAsal: imp.sekolahAsal || prev.sekolahAsal,
                skhun: imp.skhun || prev.skhun,
                penerimaKps: imp.penerimaKps || prev.penerimaKps,
                ijazahNo: imp.ijazahNo || prev.ijazahNo,
                noKk: imp.noKk || prev.noKk,
                namaAyah: imp.namaAyah || prev.namaAyah,
                nikAyah: imp.nikAyah || prev.nikAyah,
                pekerjaanAyah: imp.pekerjaanAyah || prev.pekerjaanAyah,
                tlpAyah: imp.tlpAyah || prev.tlpAyah,
                namaIbu: imp.namaIbu || prev.namaIbu,
                nikIbu: imp.nikIbu || prev.nikIbu,
                pekerjaanIbu: imp.pekerjaanIbu || prev.pekerjaanIbu,
                tlpIbu: imp.tlpIbu || prev.tlpIbu,
                namaWali: imp.namaWali || prev.namaWali,
                tlpWali: imp.tlpWali || prev.tlpWali,
                fotoUrl: imp.fotoUrl || prev.fotoUrl,
                updatedAt: now
              };
              currentStudents[existingIdx] = updated;
              useStore.getState().updateStudent(updated.id, updated);
              updatedCount++;
            } else if (importMode === 'SKIP_EXISTING') {
              skippedCount++;
            } else if (importMode === 'ADD_ALL') {
              const newStudent: Student = {
                id: generateId(),
                name: imp.name,
                class: imp.class || '1A',
                nis: imp.nis || generateId().slice(0, 8),
                nisn: imp.nisn,
                nik: imp.nik,
                gender: imp.gender || 'L',
                pob: imp.pob,
                dob: standardizeDate(imp.dob),
                address: imp.address || '',
                parentName: imp.parentName || imp.namaAyah || 'Orang Tua',
                status: imp.status || 'Aktif',
                tahunMasuk: imp.tahunMasuk,
                createdAt: now,
                updatedAt: now
              };
              currentStudents.push(newStudent);
              useStore.getState().addStudent(newStudent);
              addedCount++;
            }
          } else {
            const newStudent: Student = {
              id: generateId(),
              name: imp.name,
              class: imp.class || '1A',
              nis: imp.nis || generateId().slice(0, 8),
              nisn: imp.nisn,
              nik: imp.nik,
              gender: imp.gender || 'L',
              pob: imp.pob,
              dob: standardizeDate(imp.dob),
              address: imp.address || '',
              parentName: imp.parentName || imp.namaAyah || 'Orang Tua',
              status: imp.status || 'Aktif',
              tahunMasuk: imp.tahunMasuk,
              anakKe: imp.anakKe,
              saudara: imp.saudara,
              agama: imp.agama || 'Islam',
              golonganDarah: imp.golonganDarah,
              tinggiBadan: imp.tinggiBadan,
              beratBadan: imp.beratBadan,
              prestasi: imp.prestasi,
              hobi: imp.hobi,
              catatanPenting: imp.catatanPenting,
              rt: imp.rt,
              rw: imp.rw,
              kelurahan: imp.kelurahan,
              kecamatan: imp.kecamatan,
              kota: imp.kota,
              provinsi: imp.provinsi,
              kodePos: imp.kodePos,
              jenisTinggal: imp.jenisTinggal,
              alatTransportasi: imp.alatTransportasi,
              noHp: imp.noHp,
              email: imp.email,
              sekolahAsal: imp.sekolahAsal,
              skhun: imp.skhun,
              penerimaKps: imp.penerimaKps,
              ijazahNo: imp.ijazahNo,
              noKk: imp.noKk,
              namaAyah: imp.namaAyah,
              nikAyah: imp.nikAyah,
              pekerjaanAyah: imp.pekerjaanAyah,
              tlpAyah: imp.tlpAyah,
              namaIbu: imp.namaIbu,
              nikIbu: imp.nikIbu,
              pekerjaanIbu: imp.pekerjaanIbu,
              tlpIbu: imp.tlpIbu,
              namaWali: imp.namaWali,
              tlpWali: imp.tlpWali,
              fotoUrl: imp.fotoUrl,
              createdAt: now,
              updatedAt: now
            };
            currentStudents.push(newStudent);
            useStore.getState().addStudent(newStudent);
            addedCount++;
          }
        }
        await triggerSync(useStore.getState().students);
        alert(`Import Siswa Berhasil!\n• ${addedCount} Data Baru Ditambahkan\n• ${updatedCount} Data Diperbarui\n• ${skippedCount} Data Dilewati`);
      } else {
        // GTK Import
        const currentTeachers = [...useStore.getState().teachers];
        let addedCount = 0;
        let updatedCount = 0;
        const now = new Date().toISOString();

        for (const imp of importPreview.parsedData) {
          if (!imp.name) continue;
          const existingIdx = currentTeachers.findIndex(t => 
            (imp.nip && t.nip && String(t.nip).trim() === String(imp.nip).trim()) ||
            (imp.nik && t.nik && String(t.nik).trim() === String(imp.nik).trim()) ||
            (t.name.toLowerCase().trim() === imp.name.toLowerCase().trim())
          );

          if (existingIdx !== -1 && importMode === 'UPDATE') {
            const prev = currentTeachers[existingIdx];
            const updated: Teacher = {
              ...prev,
              name: imp.name || prev.name,
              nip: imp.nip || prev.nip,
              nik: imp.nik || prev.nik,
              nuptk: imp.nuptk || prev.nuptk,
              gender: imp.gender || prev.gender,
              tempatLahir: imp.tempatLahir || prev.tempatLahir,
              tanggalLahir: imp.tanggalLahir || prev.tanggalLahir,
              alamat: imp.alamat || prev.alamat,
              phone: imp.phone || prev.phone,
              email: imp.email || prev.email,
              class: imp.class || prev.class,
              jabatan: imp.jabatan || prev.jabatan,
              pendidikan: imp.pendidikan || prev.pendidikan,
              status: imp.status || prev.status,
              fotoUrl: imp.fotoUrl || prev.fotoUrl,
              updatedAt: now
            };
            currentTeachers[existingIdx] = updated;
            useStore.getState().updateTeacher(updated.id, updated);
            updatedCount++;
          } else {
            const newT: Teacher = {
              id: generateId(),
              name: imp.name,
              nip: imp.nip || `TCH-${Date.now().toString().slice(-4)}`,
              nik: imp.nik,
              nuptk: imp.nuptk,
              gender: imp.gender || 'L',
              tempatLahir: imp.tempatLahir,
              tanggalLahir: standardizeDate(imp.tanggalLahir),
              alamat: imp.alamat,
              phone: imp.phone || '',
              email: imp.email || '',
              class: imp.class || 'None',
              jabatan: imp.jabatan || imp.class || 'Guru',
              pendidikan: imp.pendidikan,
              status: imp.status || 'Aktif',
              fotoUrl: imp.fotoUrl,
              createdAt: now,
              updatedAt: now
            };
            currentTeachers.push(newT);
            useStore.getState().addTeacher(newT);
            addedCount++;
          }
        }
        await triggerSync(undefined, useStore.getState().teachers);
        alert(`Import GTK Berhasil!\n• ${addedCount} GTK Baru Ditambahkan\n• ${updatedCount} GTK Diperbarui`);
      }
      setImportPreview(null);
    } catch (err: any) {
      console.error(err);
      alert(`Terjadi kesalahan saat memproses import: ${err?.message || err}`);
    } finally {
      setIsProcessingImport(false);
    }
  };

  // ==========================================
  // PDF DOWNLOAD GENERATOR
  // ==========================================
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = `DAFTAR PESERTA DIDIK ${settings.schoolName ? settings.schoolName.toUpperCase() : 'SEKOLAH'}`;
    const subtitle = `KELAS: ${selectedClass || 'SEMUA KELAS'} | TAHUN PELAJARAN: ${settings.tahunPelajaran || '2026/2027'}`;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 20);

    const tableData = filteredStudents.map((s, idx) => [
      idx + 1,
      s.nis || '-',
      s.nisn || '-',
      s.nik || '-',
      s.name,
      s.class,
      s.gender,
      s.dob ? formatDate(s.dob) : '-',
      s.parentName || s.namaAyah || '-',
      s.noHp || s.tlpAyah || '-'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['No', 'NIS', 'NISN', 'NIK', 'Nama Lengkap', 'Kelas', 'L/P', 'Tgl Lahir', 'Nama Ortu/Wali', 'No HP']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 }
    });

    doc.save(`Daftar_Siswa_${selectedClass || 'Semua'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Sub-tabs configuration
  const subTabs = [
    { id: 'templates', label: '1. Pusat Template Excel', icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'import', label: '2. Pusat Import Excel/CSV', icon: Upload, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'export', label: '3. Pusat Ekspor Data', icon: Download, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'print-pdf', label: '4. Pusat Cetak & Dokumen PDF', icon: Printer, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'rekap', label: '5. Rekapitulasi & Statistik', icon: BarChart, color: 'text-teal-600', bg: 'bg-teal-50' },
  ] as const;

  return (
    <div className="space-y-6 w-full pb-16">
      
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100/80 shadow-2xs flex-shrink-0">
            <BarChart size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pusat Laporan, Template, Import, Ekspor & Cetak
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Hub terpadu seluruh template resmi, import data massal, ekspor Excel 70 kolom, cetak daftar, kartu pelajar, & F-SEK.
            </p>
          </div>
        </div>

        <button
          onClick={downloadMenuStructureExcel}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition cursor-pointer border border-amber-400 w-full lg:w-auto"
          title="Download file Excel pemetaan struktur menu dan sheet spreadsheet"
        >
          <FileSpreadsheet size={18} />
          <span>DOWNLOAD EXCEL STRUKTUR DATA (.XLSX)</span>
        </button>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 shadow-xs ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-300 ring-2 ring-slate-900'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-white' : tab.color} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PUSAT UNDUH TEMPLATE EXCEL & PANDUAN */}
      {/* ========================================================================= */}
      {activeSubTab === 'templates' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 p-5 rounded-3xl border border-emerald-200/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-emerald-950">Template Excel Resmi Standar Kemdikbud & Sekolah</h3>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Unduh template kosong siap pakai dengan format header yang sudah disesuaikan secara otomatis.
                </p>
              </div>
            </div>
          </div>

          {/* Grid of Templates */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Template 1: Master Siswa 70 Kolom */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
                    <Users size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-indigo-100/70 text-indigo-700 rounded-full text-[10px] font-bold">
                    70 Kolom Lengkap
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Master SISWA (70 Kolom)</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format resmi menyeluruh sesuai Sheet SISWA Dapodik. Memuat NISN, NIK, Ayah/Ibu/Wali, Kontak, Alamat, dan tautan berkas dokumen.
                </p>
              </div>
              <button 
                onClick={() => downloadStudentMasterTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Master (70 Kolom)</span>
              </button>
            </div>

            {/* Template 2: Siswa Ringkas 14 Kolom */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                    <CheckCircle2 size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100/70 text-emerald-700 rounded-full text-[10px] font-bold">
                    14 Kolom Cepat
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Import Siswa Ringkas</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format cepat berisi data pokok: NIS, NISN, NIK, Nama, Kelas, Jenis Kelamin, Tanggal Lahir, Alamat, dan Nama Orang Tua.
                </p>
              </div>
              <button 
                onClick={() => downloadStudentExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Ringkas (.xlsx)</span>
              </button>
            </div>

            {/* Template 3: Master Guru & GTK */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit">
                    <GraduationCap size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-purple-100/70 text-purple-700 rounded-full text-[10px] font-bold">
                    Guru & Tendik
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Master GURU / GTK</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format data pendidik dan tenaga kependidikan: NIP/NUPTK, NIK, Nama, Jabatan/Wali Kelas, Pendidikan Terakhir, No HP, & Email.
                </p>
              </div>
              <button 
                onClick={() => downloadTeacherExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Guru/GTK</span>
              </button>
            </div>

            {/* Template 4: Nilai Rapor & Asesmen */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                    <BookOpen size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100/70 text-amber-700 rounded-full text-[10px] font-bold">
                    Kurikulum Merdeka
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Nilai & Asesmen Rapor</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format penginputan Formatif TP, Sumatif Tengah Semester (STS), Sumatif Akhir (SAS), & Capaian Pembelajaran.
                </p>
              </div>
              <button 
                onClick={() => downloadAssessmentExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Nilai Rapor</span>
              </button>
            </div>

            {/* Template 5: Keuangan & Biaya */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl w-fit">
                    <DollarSign size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-teal-100/70 text-teal-700 rounded-full text-[10px] font-bold">
                    Kas & Tagihan
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Tagihan Keuangan & Biaya</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format rincian pos tagihan, iuran bulanan, nominal, status pembayaran, tanggal bayar, dan mutasi kas.
                </p>
              </div>
              <button 
                onClick={() => downloadFinanceExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Keuangan & Biaya</span>
              </button>
            </div>

            {/* Template 6: Presensi & Absensi */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl w-fit">
                    <Layers size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-sky-100/70 text-sky-700 rounded-full text-[10px] font-bold">
                    Absensi Kelas
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Presensi & Kehadiran</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format rekapitulasi kehadiran siswa bulanan (Hadir, Sakit, Izin, Alpa) dan persentase kehadiran.
                </p>
              </div>
              <button 
                onClick={() => downloadAttendanceExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Presensi</span>
              </button>
            </div>

            {/* Template 7: Sarpras & Inventaris */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit">
                    <Package size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-orange-100/70 text-orange-700 rounded-full text-[10px] font-bold">
                    Sarpras & Aset KIB
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Inventaris Sarpras</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format data barang, kode inventaris, kategori, kondisi fisik, ruangan, penanggung jawab, dan harga perolehan.
                </p>
              </div>
              <button 
                onClick={() => downloadSarprasExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Sarpras</span>
              </button>
            </div>

            {/* Template 8: BK & Catatan Konseling */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit">
                    <ShieldAlert size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-rose-100/70 text-rose-700 rounded-full text-[10px] font-bold">
                    BK & Prestasi
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template BK & Poin Pelanggaran</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format pencatatan konseling siswa, tanggal kejadian, poin pelanggaran, tindakan pembinaan, dan status kasus.
                </p>
              </div>
              <button 
                onClick={() => downloadBkExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template BK</span>
              </button>
            </div>

            {/* Template 9: Bank Soal CBT */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl w-fit">
                    <FileSpreadsheet size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-cyan-100/70 text-cyan-700 rounded-full text-[10px] font-bold">
                    Ujian Online CBT
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Bank Soal Ujian CBT</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format butir soal pilihan ganda A-E, kunci jawaban, dan bobot skor untuk diimport ke sistem ujian online.
                </p>
              </div>
              <button 
                onClick={() => downloadCbtQuestionExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Bank Soal</span>
              </button>
            </div>

            {/* Template 10: Dokumen & Agenda Surat */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl w-fit">
                    <FileText size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-sky-100/70 text-sky-700 rounded-full text-[10px] font-bold">
                    Agenda Persuratan
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Agenda Dokumen Surat</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format rekap surat masuk/keluar, nomor surat resmi, sifat surat, disposisi pimpinan, dan keterangan arsip.
                </p>
              </div>
              <button 
                onClick={() => downloadDokumenSuratExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Agenda Surat</span>
              </button>
            </div>

            {/* Template 11: SPMB Pendaftar */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                    <Sparkles size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100/70 text-amber-700 rounded-full text-[10px] font-bold">
                    Penerimaan Siswa
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Pendaftar SPMB Baru</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format calon peserta didik baru, asal sekolah, jalur afirmasi/zonasi/prestasi, dan kontak orang tua.
                </p>
              </div>
              <button 
                onClick={() => downloadSpmbExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template SPMB</span>
              </button>
            </div>

            {/* Template 12: Perpustakaan Digital */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
                    <BookOpen size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-indigo-100/70 text-indigo-700 rounded-full text-[10px] font-bold">
                    E-Perpustakaan
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template E-Perpustakaan (Katalog & Sirkulasi)</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Master katalog buku, nomor panggil/ISBN, lokasi rak, sirkulasi peminjaman siswa & GTK, serta denda.
                </p>
              </div>
              <button 
                onClick={() => downloadPerpusExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template E-Perpus</span>
              </button>
            </div>

            {/* Template 13: WhatsApp Gateway Log */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                    <Sparkles size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100/70 text-emerald-700 rounded-full text-[10px] font-bold">
                    WhatsApp Gateway
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Log Notifikasi WhatsApp</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format riwayat pengiriman pesan WA, broadcast presensi, pengumuman sekolah, dan tagihan wali murid.
                </p>
              </div>
              <button 
                onClick={() => downloadWaNotificationExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Log WA</span>
              </button>
            </div>

            {/* Template 14: Ekstrakurikuler & OSIS */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                    <Award size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100/70 text-amber-700 rounded-full text-[10px] font-bold">
                    Ekskul & OSIS
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Ekstrakurikuler & Penilaian Rapor</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Master ekskul (Pramuka, PMR, Futsal, Rohis, dsb.), daftar anggota rombel, jadwal, serta nilai rapor.
                </p>
              </div>
              <button 
                onClick={() => downloadEkskulExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Ekskul & Rapor</span>
              </button>
            </div>

            {/* Template 15: Mading & Berita Digital */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit">
                    <FileSpreadsheet size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-rose-100/70 text-rose-700 rounded-full text-[10px] font-bold">
                    Mading Digital
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Mading, Agenda & Berita Sekolah</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Format publikasi berita prestasi, agenda kegiatan sekolah, surat edaran, dan pengumuman daring.
                </p>
              </div>
              <button 
                onClick={() => downloadMadingExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Mading & Berita</span>
              </button>
            </div>

            {/* Template 16: Portal Publik & Website Resmi Sekolah */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl w-fit">
                    <Globe size={22} />
                  </div>
                  <span className="px-2.5 py-1 bg-sky-100/70 text-sky-700 rounded-full text-[10px] font-bold">
                    Portal Publik & Web
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-sm">Template Portal Publik & Web Profil Sekolah</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Konfigurasi website profil sekolah, visi misi, banner pengumuman, running text, dan suara komunitas.
                </p>
              </div>
              <button 
                onClick={() => downloadPortalPublikExcelTemplate()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Unduh Template Portal Publik</span>
              </button>
            </div>

          </div>

          {/* Column Guidelines Box */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <HelpCircle size={18} className="text-indigo-600" />
              <span>Panduan & Tips Pengisian Template Excel</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="font-bold text-slate-800">Format Tanggal</p>
                <p className="text-[11px] text-slate-500">Gunakan format standar <code className="bg-slate-200/60 px-1 py-0.5 rounded text-indigo-700">YYYY-MM-DD</code> (contoh: 2015-05-12) atau format teks tanggal Indonesia.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="font-bold text-slate-800">Penulisan NIK & NISN</p>
                <p className="text-[11px] text-slate-500">Format kolom NIK dan NISN sebagai <strong>Text</strong> di Excel agar angka 0 di depan tidak hilang.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="font-bold text-slate-800">Opsi Update Otomatis</p>
                <p className="text-[11px] text-slate-500">Sistem akan mencocokkan data berdasarkan NIS, NISN, atau Nama Siswa saat diimpor kembali.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PUSAT IMPORT EXCEL / CSV */}
      {/* ========================================================================= */}
      {activeSubTab === 'import' && (
        <div className="space-y-6 animate-in fade-in">
          
          <input 
            type="file" 
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv, .txt"
            className="hidden"
            onChange={handleSelectFile}
          />

          {/* Import Setup Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Upload size={18} className="text-blue-600" />
                <span>Pusat Import Data Massal</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pilih kategori data dan mode penanganan data sebelum mengunggah file Excel (.xlsx) atau CSV.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Step 1: Pilih Kategori Data */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  1. Pilih Kategori Data yang Akan Diimpor:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setImportCategory('siswa')}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition flex items-center gap-3",
                      importCategory === 'siswa'
                        ? "bg-indigo-50 border-indigo-400 text-indigo-950 font-extrabold shadow-xs"
                        : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Users size={20} className={importCategory === 'siswa' ? 'text-indigo-600' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs">Data Siswa</p>
                      <p className="text-[10px] text-slate-400 font-normal">70 Kolom / Ringkas</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportCategory('gtk')}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition flex items-center gap-3",
                      importCategory === 'gtk'
                        ? "bg-purple-50 border-purple-400 text-purple-950 font-extrabold shadow-xs"
                        : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <GraduationCap size={20} className={importCategory === 'gtk' ? 'text-purple-600' : 'text-slate-400'} />
                    <div>
                      <p className="text-xs">Data Guru & Tendik</p>
                      <p className="text-[10px] text-slate-400 font-normal">Pendidik & Pegawai</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Mode Import */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  2. Strategi Jika Data Sudah Ada (Duplikat):
                </label>
                <select
                  value={importMode}
                  onChange={(e: any) => setImportMode(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UPDATE">Perbarui Data Lama & Tambah Data Baru (Direkomendasikan)</option>
                  <option value="SKIP_EXISTING">Lewati Data Lama (Hanya Tambahkan yang Benar-Benar Baru)</option>
                  <option value="ADD_ALL">Tambahkan Semua Sebagai Data Baru</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Data dicocokkan otomatis berdasarkan NIS / NISN / NIK / NUPTK.
                </p>
              </div>
            </div>

            {/* Step 3: Drag & Drop / Select File Button */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 p-8 rounded-3xl text-center cursor-pointer transition group space-y-3"
            >
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto text-blue-600 group-hover:scale-110 transition-transform">
                <Upload size={26} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-900">Klik di Sini untuk Memilih File Excel atau CSV</p>
                <p className="text-xs text-slate-500 mt-1">Mendukung file .xlsx, .xls, .csv, atau .txt (Maksimal 25MB)</p>
              </div>
            </div>
          </div>

          {/* Interactive Import Preview Modal / Box */}
          {importPreview && (
            <div className="bg-white rounded-3xl border border-blue-200 shadow-xl overflow-hidden animate-in fade-in">
              <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={22} className="text-blue-200" />
                  <div>
                    <h4 className="font-black text-sm">Pratinjau Hasil Pembacaan File</h4>
                    <p className="text-xs text-blue-100">
                      File: <strong>{importPreview.fileName}</strong> • Terbaca: <strong>{importPreview.parsedData.length} baris data</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setImportPreview(null)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition"
                >
                  Tutup Preview
                </button>
              </div>

              {/* Preview Table */}
              <div className="p-4 max-h-80 overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 sticky top-0">
                      <th className="p-2 font-bold w-10">No</th>
                      <th className="p-2 font-bold">Identitas / NIS</th>
                      <th className="p-2 font-bold">Nama Lengkap</th>
                      <th className="p-2 font-bold">Kelas / Jabatan</th>
                      <th className="p-2 font-bold">L/P</th>
                      <th className="p-2 font-bold">Kontak / Ortu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.parsedData.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2 font-mono text-slate-700">{row.nis || row.nip || row.nisn || '-'}</td>
                        <td className="p-2 font-bold text-slate-900">{row.name || '-'}</td>
                        <td className="p-2 font-medium text-slate-700">{row.class || row.jabatan || '-'}</td>
                        <td className="p-2 text-slate-600">{row.gender || '-'}</td>
                        <td className="p-2 text-slate-500">{row.noHp || row.parentName || row.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importPreview.parsedData.length > 50 && (
                  <p className="text-center text-xs text-slate-400 py-2">
                    ...dan {importPreview.parsedData.length - 50} data lainnya
                  </p>
                )}
              </div>

              {/* Bottom Action Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Mode: <strong className="text-indigo-600">{importMode}</strong>
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setImportPreview(null)}
                    disabled={isProcessingImport}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={isProcessingImport}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-200 flex items-center gap-2"
                  >
                    {isProcessingImport ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Memproses Import...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Konfirmasi Import {importPreview.parsedData.length} Data</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PUSAT EKSPOR EXCEL & CSV */}
      {/* ========================================================================= */}
      {activeSubTab === 'export' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Filter Bar for Export */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Filter Rombel & Format Ekspor</h3>
              <p className="text-xs text-slate-500">Pilih kelas tertentu jika ingin mengunduh data per rombel.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter Rombel:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Kelas ({activeStudents.length} Siswa)</option>
                {classesList.map(c => (
                  <option key={c} value={c}>{formatClassLabel(c, true)} ({activeStudents.filter(s => matchClass(s.class, c)).length} Siswa)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Export Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 1. Ekspor Master Siswa 70 Kolom */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
                  <Users size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Master Data Siswa (70 Kolom)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Unduh seluruh database siswa beserta data orang tua, alamat, dan link berkas dokumen dalam format resmi 70 kolom.
                </p>
                <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50/70 p-2 rounded-xl">
                  {filteredStudents.length} Siswa Terpilih ({selectedClass ? formatClassLabel(selectedClass, true) : 'Semua Kelas'})
                </div>
              </div>
              <button
                onClick={() => exportToExcel(filteredStudents, `Data_Master_SISWA_${selectedClass || 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Master Siswa (.xlsx)</span>
              </button>
            </div>

            {/* 2. Ekspor Guru & GTK */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit">
                  <GraduationCap size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Data Guru & Tenaga Kependidikan</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Unduh daftar seluruh pendidik dan tenaga kependidikan (NIP, NUPTK, Jabatan, Wali Kelas, No HP, Email).
                </p>
                <div className="text-[11px] font-bold text-purple-700 bg-purple-50/70 p-2 rounded-xl">
                  {teachers.length} GTK Terdaftar
                </div>
              </div>
              <button
                onClick={() => exportTeachersToExcel(teachers, `Data_GTK_${new Date().toISOString().slice(0, 10)}.xlsx`)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Data GTK (.xlsx)</span>
              </button>
            </div>

            {/* 3. Ekspor Ringkasan Demografi */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl w-fit">
                  <BarChart size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Rekapitulasi & Demografi Siswa</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Rekapitulasi jumlah siswa per rombel, rasio gender (L/P), kelompok usia, dan statistik agama.
                </p>
                <div className="text-[11px] font-bold text-teal-700 bg-teal-50/70 p-2 rounded-xl">
                  Format Laporan Dinas Pendidikan
                </div>
              </div>
              <button
                onClick={() => {
                  const summaryData = classesList.map(c => {
                    const classStudents = activeStudents.filter(s => matchClass(s.class, c));
                    const l = classStudents.filter(s => s.gender === 'L').length;
                    const p = classStudents.filter(s => s.gender === 'P').length;
                    return {
                      "Rombongan Belajar": `Kelas ${c}`,
                      "Laki-laki (L)": l,
                      "Perempuan (P)": p,
                      "Total Siswa": classStudents.length
                    };
                  });
                  exportToExcel(summaryData, `Rekap_Demografi_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`, 'REKAP_DEMOGRAFI');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Rekap Demografi (.xlsx)</span>
              </button>
            </div>

            {/* 4. Ekspor Rekap Berkas & Dokumen Siswa */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                  <FolderDown size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Rekap Berkas & Dokumen Siswa</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Status kelengkapan Akta Kelahiran, KK, KTP Orang Tua, Ijazah, Rapor, dan Surat Pindah per siswa.
                </p>
                <div className="text-[11px] font-bold text-amber-700 bg-amber-50/70 p-2 rounded-xl">
                  {filteredStudents.length} Siswa Terpilih ({selectedClass ? `Kelas ${selectedClass}` : 'Semua Kelas'})
                </div>
              </div>
              <button
                onClick={() => {
                  exportDocumentChecklistToExcel(
                    filteredStudents,
                    `Ceklis_Kelengkapan_Berkas_Siswa_${selectedClass || 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`
                  );
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Ceklis Berkas (.xlsx)</span>
              </button>
            </div>

            {/* 5. Ekspor Data Orang Tua & Wali */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit">
                  <User size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Data Orang Tua & Wali Murid</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Rekapitulasi lengkap data Ayah, Ibu, dan Wali murid (NIK, Nama, Pendidikan, Pekerjaan, Penghasilan, Kontak HP, Alamat).
                </p>
                <div className="text-[11px] font-bold text-blue-700 bg-blue-50/70 p-2 rounded-xl">
                  {students.length} Peserta Didik Terdata
                </div>
              </div>
              <button
                onClick={() => {
                  const ortuRows: any[] = [];
                  let num = 1;
                  students.forEach((s) => {
                    if (s.namaAyah) {
                      ortuRows.push({
                        'No': num++,
                        'ID Siswa': s.nis || s.id,
                        'Nama Siswa': s.name,
                        'Kelas': s.class,
                        'Hubungan': 'Ayah Kandung',
                        'Nama Lengkap': s.namaAyah,
                        'NIK': s.nikAyah || '-',
                        'Status': s.statusAyah || 'Masih Hidup',
                        'Pekerjaan': s.pekerjaanAyah || '-',
                        'Pendidikan': s.pendidikanAyah || '-',
                        'Penghasilan': s.penghasilanAyah || '-',
                        'No HP / WA': s.tlpAyah || s.parentPhone || s.phone || '-'
                      });
                    }
                    if (s.namaIbu) {
                      ortuRows.push({
                        'No': num++,
                        'ID Siswa': s.nis || s.id,
                        'Nama Siswa': s.name,
                        'Kelas': s.class,
                        'Hubungan': 'Ibu Kandung',
                        'Nama Lengkap': s.namaIbu,
                        'NIK': s.nikIbu || '-',
                        'Status': s.statusIbu || 'Masih Hidup',
                        'Pekerjaan': s.pekerjaanIbu || '-',
                        'Pendidikan': s.pendidikanIbu || '-',
                        'Penghasilan': s.penghasilanIbu || '-',
                        'No HP / WA': s.tlpIbu || s.parentPhone || s.phone || '-'
                      });
                    }
                    if (s.namaWali) {
                      ortuRows.push({
                        'No': num++,
                        'ID Siswa': s.nis || s.id,
                        'Nama Siswa': s.name,
                        'Kelas': s.class,
                        'Hubungan': 'Wali Murid',
                        'Nama Lengkap': s.namaWali,
                        'NIK': s.nikWali || '-',
                        'Status': 'Wali',
                        'Pekerjaan': s.pekerjaanWali || '-',
                        'Pendidikan': s.pendidikanWali || '-',
                        'Penghasilan': s.penghasilanWali || '-',
                        'No HP / WA': s.tlpWali || s.parentPhone || s.phone || '-'
                      });
                    }
                  });
                  exportToExcel(ortuRows, `Data_Orang_Tua_Wali_${new Date().toISOString().slice(0, 10)}.xlsx`, 'ORANG_TUA_WALI');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Data Ortu & Wali (.xlsx)</span>
              </button>
            </div>

            {/* 6. Ekspor Data Siswa Yatim, Piatu & Yatim Piatu */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit">
                  <Heart size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Data Siswa Yatim & Piatu (Bansos/PIP)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pemetaan status kondisi orang tua siswa untuk penyaluran bantuan Program Indonesia Pintar (PIP), santunan, dan afirmasi.
                </p>
                <div className="text-[11px] font-bold text-rose-700 bg-rose-50/70 p-2 rounded-xl">
                  {students.filter(s => s.statusYatim && s.statusYatim !== 'Lengkap').length} Siswa Terdaftar Bantuan
                </div>
              </div>
              <button
                onClick={() => {
                  const rows = students.map((s, idx) => ({
                    'No': idx + 1,
                    'NIS': s.nis || s.id,
                    'NISN': s.nisn || '-',
                    'Nama Siswa': s.name,
                    'Kelas': s.class,
                    'Status Yatim': s.statusYatim || 'Lengkap',
                    'Nama Ayah': s.namaAyah || '-',
                    'Status Ayah': s.statusAyah || 'Masih Hidup',
                    'Nama Ibu': s.namaIbu || '-',
                    'Status Ibu': s.statusIbu || 'Masih Hidup',
                    'Nama Wali': s.namaWali || '-',
                    'No HP Wali/Ortu': s.tlpWali || s.tlpAyah || s.tlpIbu || s.parentPhone || s.phone || '-',
                    'Penerima PIP/KPS': s.penerimaKps === 'Ya' || s.noKip ? 'Ya' : 'Tidak',
                    'Alamat': s.address || '-'
                  }));
                  exportToExcel(rows, `Rekap_Siswa_Yatim_Piatu_${new Date().toISOString().slice(0, 10)}.xlsx`, 'YATIM_PIATU');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Data Yatim Piatu (.xlsx)</span>
              </button>
            </div>

            {/* 7. Ekspor Data Rombel & Wali Kelas */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit">
                  <Building2 size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Rombongan Belajar & Wali Kelas</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Struktur rombel kelas, tingkat pendidikan, wali kelas pengampu, kapasitas, dan rekap total siswa per kelas.
                </p>
                <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50/70 p-2 rounded-xl">
                  {classesList.length} Rombel Terdata
                </div>
              </div>
              <button
                onClick={() => {
                  const rows = classesList.map((c, idx) => {
                    const classStudents = activeStudents.filter(s => matchClass(s.class, c));
                    const l = classStudents.filter(s => s.gender === 'L').length;
                    const p = classStudents.filter(s => s.gender === 'P').length;
                    const wali = teachers.find(t => matchClass(t.class, c));
                    return {
                      'No': idx + 1,
                      'Nama Rombel / Kelas': `Kelas ${c}`,
                      'Wali Kelas': wali?.name || '-',
                      'NIP Wali Kelas': wali?.nip || wali?.nuptk || '-',
                      'No HP Wali': wali?.phone || '-',
                      'Siswa Laki-laki': l,
                      'Siswa Perempuan': p,
                      'Total Siswa': classStudents.length,
                      'Status': 'Aktif'
                    };
                  });
                  exportToExcel(rows, `Data_Rombel_dan_Wali_${new Date().toISOString().slice(0, 10)}.xlsx`, 'ROMBEL_KELAS');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Data Rombel (.xlsx)</span>
              </button>
            </div>

            {/* 8. Ekspor Roster Siswa Rombel */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl w-fit">
                  <Layers size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Roster Data Siswa Per Rombel</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Daftar urut absensi siswa per rombel beserta NIS, NISN, Gender, dan kontak orang tua siap cetak.
                </p>
                <div className="text-[11px] font-bold text-cyan-700 bg-cyan-50/70 p-2 rounded-xl">
                  {filteredStudents.length} Siswa ({selectedClass ? `Kelas ${selectedClass}` : 'Semua Rombel'})
                </div>
              </div>
              <button
                onClick={() => {
                  const rows = filteredStudents.map((s, idx) => ({
                    'No Urut': idx + 1,
                    'Kelas': s.class,
                    'NIS': s.nis || s.id,
                    'NISN': s.nisn || '-',
                    'Nama Lengkap Siswa': s.name,
                    'L/P': s.gender,
                    'Tempat Lahir': s.pob || '-',
                    'Tanggal Lahir': s.dob || '-',
                    'Nama Ortu/Wali': s.parentName || s.namaAyah || s.namaIbu || '-',
                    'Kontak Ortu': s.parentPhone || s.phone || s.tlpAyah || s.tlpIbu || s.tlpWali || '-',
                    'Status': s.status || 'Aktif'
                  }));
                  exportToExcel(rows, `Roster_Siswa_${selectedClass || 'Semua'}_${new Date().toISOString().slice(0, 10)}.xlsx`, 'ROSTER_ROMBEL');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Roster Rombel (.xlsx)</span>
              </button>
            </div>

            {/* 9. Ekspor Validasi Dapodik 2027 */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                  <ShieldCheck size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Validasi Data Dapodik 2027</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Laporan audit kepatuhan atribut wajib Dapodik (NISN 10 digit, NIK 16 digit, No KK, Ibu Kandung, Tahun Masuk).
                </p>
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50/70 p-2 rounded-xl">
                  Format Standar Kemendikdasmen 2027
                </div>
              </div>
              <button
                onClick={() => {
                  const auditData = auditAllStudentsDapodik(students);
                  const rows = auditData.results.map((r, idx) => ({
                    'No': idx + 1,
                    'NISN': r.nisn || '(Kosong)',
                    'Validitas NISN': r.validations.nisn.status.toUpperCase(),
                    'Catatan NISN': r.validations.nisn.message,
                    'Nama Lengkap Siswa': r.name,
                    'L/P': r.gender || '-',
                    'Kelas / Rombel': r.class,
                    'Tahun Masuk': r.tahunMasuk || '-',
                    'NIK Siswa': r.nik || '(Kosong)',
                    'Validitas NIK': r.validations.nik.status.toUpperCase(),
                    'Provinsi NIK': r.parsedNik ? r.parsedNik.provinceName : '-',
                    'Catatan NIK Dukcapil': r.validations.nik.message,
                    'No. KK': r.noKk || '(Kosong)',
                    'Validitas KK': r.validations.noKk.status.toUpperCase(),
                    'Nama Ibu Kandung': r.namaIbu || '(Kosong)',
                    'Validitas Ibu': r.validations.namaIbu.status.toUpperCase(),
                    'Catatan Ibu': r.validations.namaIbu.message,
                    'Nama Ayah': r.namaAyah || '-',
                    'Skor Kepatuhan (%)': `${r.complianceScore}%`,
                    'Status Dapodik 2027': r.overallStatus.replace(/_/g, ' '),
                    'Rekomendasi Perbaikan': r.suggestions.join(' | ') || 'Siap Sinkronisasi'
                  }));
                  exportToExcel(rows, `Audit_Validasi_Dapodik_2027_${new Date().toISOString().slice(0, 10)}.xlsx`, 'DAPODIK_2027');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Validasi Dapodik Cerdas (.xlsx)</span>
              </button>
            </div>

            {/* 10. Ekspor Mata Pelajaran & Kurikulum */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl w-fit">
                  <BookMarked size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Master Mata Pelajaran & KKM</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Daftar seluruh mata pelajaran, kategori kurikulum, beban JP mingguan, KKM/KKTP, dan guru pengampu.
                </p>
                <div className="text-[11px] font-bold text-violet-700 bg-violet-50/70 p-2 rounded-xl">
                  Kurikulum Merdeka 2026/2027
                </div>
              </div>
              <button
                onClick={() => {
                  const defaultMapel = [
                    { 'No': 1, 'Kode': 'PAI', 'Nama Mapel': 'Pendidikan Agama & Budi Pekerti', 'Kategori': 'Wajib Nasional', 'Jenjang': 'SD/MI', 'Kelas': 'Semua', 'JP': 4, 'KKM': 75, 'Guru Pengampu': teachers[0]?.name || '-' },
                    { 'No': 2, 'Kode': 'PKN', 'Nama Mapel': 'Pendidikan Pancasila', 'Kategori': 'Wajib Nasional', 'Jenjang': 'SD/MI', 'Kelas': 'Semua', 'JP': 4, 'KKM': 75, 'Guru Pengampu': teachers[1]?.name || '-' },
                    { 'No': 3, 'Kode': 'BIN', 'Nama Mapel': 'Bahasa Indonesia', 'Kategori': 'Wajib Nasional', 'Jenjang': 'SD/MI', 'Kelas': 'Semua', 'JP': 6, 'KKM': 75, 'Guru Pengampu': teachers[2]?.name || '-' },
                    { 'No': 4, 'Kode': 'MAT', 'Nama Mapel': 'Matematika', 'Kategori': 'Wajib Nasional', 'Jenjang': 'SD/MI', 'Kelas': 'Semua', 'JP': 5, 'KKM': 75, 'Guru Pengampu': teachers[0]?.name || '-' },
                    { 'No': 5, 'Kode': 'IPAS', 'Nama Mapel': 'Ilmu Pengetahuan Alam dan Sosial (IPAS)', 'Kategori': 'Wajib Nasional', 'Jenjang': 'SD/MI', 'Kelas': 'Fase B-C', 'JP': 5, 'KKM': 75, 'Guru Pengampu': teachers[1]?.name || '-' },
                    { 'No': 6, 'Kode': 'PJK', 'Nama Mapel': 'PJOK (Pendidikan Jasmani & Kesehatan)', 'Kategori': 'Wajib Nasional', 'Jenjang': 'SD/MI', 'Kelas': 'Semua', 'JP': 3, 'KKM': 75, 'Guru Pengampu': teachers[2]?.name || '-' },
                    { 'No': 7, 'Kode': 'SBK', 'Nama Mapel': 'Seni & Budaya', 'Kategori': 'Wajib Nasional', 'Jenjang': 'SD/MI', 'Kelas': 'Semua', 'JP': 3, 'KKM': 75, 'Guru Pengampu': teachers[0]?.name || '-' },
                    { 'No': 8, 'Kode': 'BIG', 'Nama Mapel': 'Bahasa Inggris', 'Kategori': 'Pilihan / Muatan Lokal', 'Jenjang': 'SD/MI', 'Kelas': 'Semua', 'JP': 2, 'KKM': 75, 'Guru Pengampu': teachers[1]?.name || '-' }
                  ];
                  exportToExcel(defaultMapel, `Data_Mata_Pelajaran_${new Date().toISOString().slice(0, 10)}.xlsx`, 'MATA_PELAJARAN');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-md shadow-violet-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Data Mapel (.xlsx)</span>
              </button>
            </div>

            {/* 11. Ekspor Tahun Ajaran & Kalender Pendidikan */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                  <Calendar size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Kalender Pendidikan & Hari Libur</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Agenda kalender akademik, jadwal ujian semester, libur nasional, dan cuti bersama tahun berjalan.
                </p>
                <div className="text-[11px] font-bold text-amber-700 bg-amber-50/70 p-2 rounded-xl">
                  Tahun Ajaran 2026/2027
                </div>
              </div>
              <button
                onClick={() => {
                  const calendarRows = [
                    { 'No': 1, 'Tanggal': '2026-07-13', 'Hari': 'Senin', 'Agenda Kegiatan': 'Hari Pertama Masuk Sekolah (MPLS)', 'Kategori': 'Agenda Akademik', 'Keterangan': 'Awal Tahun Pelajaran 2026/2027' },
                    { 'No': 2, 'Tanggal': '2026-08-17', 'Hari': 'Senin', 'Agenda Kegiatan': 'HUT Kemerdekaan RI Ke-81', 'Kategori': 'Libur Nasional', 'Keterangan': 'Upacara Bendera Sekolah' },
                    { 'No': 3, 'Tanggal': '2026-09-21', 'Hari': 'Senin', 'Agenda Kegiatan': 'Asesmen Sumatif Tengah Semester (STS)', 'Kategori': 'Evaluasi', 'Keterangan': 'Semester Ganjil' },
                    { 'No': 4, 'Tanggal': '2026-12-07', 'Hari': 'Senin', 'Agenda Kegiatan': 'Asesmen Sumatif Akhir Semester (SAS)', 'Kategori': 'Evaluasi', 'Keterangan': 'Semester Ganjil' },
                    { 'No': 5, 'Tanggal': '2026-12-18', 'Hari': 'Jumat', 'Agenda Kegiatan': 'Pembagian Rapor Semester Ganjil', 'Kategori': 'Pelaporan', 'Keterangan': 'Penerimaan Buku Laporan Pendidikan' },
                    { 'No': 6, 'Tanggal': '2026-12-21 s/d 2027-01-02', 'Hari': 'Senin-Sabtu', 'Agenda Kegiatan': 'Libur Akhir Semester Ganjil', 'Kategori': 'Libur Semester', 'Keterangan': 'Libur Sekolah' }
                  ];
                  exportToExcel(calendarRows, `Kalender_Pendidikan_2026_2027_${new Date().toISOString().slice(0, 10)}.xlsx`, 'KALENDER_PENDIDIKAN');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Kalender Libur (.xlsx)</span>
              </button>
            </div>

            {/* 12. Ekspor Tarif & Pos Biaya Sekolah */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                  <CreditCard size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Tarif Biaya & Pos Tagihan</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Daftar struktur tagihan resmi (Iuran Pendidikan, Seragam, Uang Pangkal, Buku/Modul) per tingkatan kelas.
                </p>
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50/70 p-2 rounded-xl">
                  Manajemen Keuangan Sekolah
                </div>
              </div>
              <button
                onClick={() => {
                  const feeRows = [
                    { 'No': 1, 'Kode Pos': 'BY-01', 'Nama Tagihan': 'Iuran Bulanan Kelas 1-3', 'Frekuensi': 'Bulanan', 'Nominal (Rp)': 150000, 'Tingkat Kelas': 'Kelas 1-3', 'Status': 'Wajib' },
                    { 'No': 2, 'Kode Pos': 'BY-02', 'Nama Tagihan': 'Iuran Bulanan Kelas 4-6', 'Frekuensi': 'Bulanan', 'Nominal (Rp)': 175000, 'Tingkat Kelas': 'Kelas 4-6', 'Status': 'Wajib' },
                    { 'No': 3, 'Kode Pos': 'SRG-01', 'Nama Tagihan': 'Paket Seragam Lengkap', 'Frekuensi': 'Tahunan', 'Nominal (Rp)': 650000, 'Tingkat Kelas': 'Siswa Baru', 'Status': 'Wajib' },
                    { 'No': 4, 'Kode Pos': 'BK-01', 'Nama Tagihan': 'Buku & Modul Pembelajaran', 'Frekuensi': 'Tahunan', 'Nominal (Rp)': 400000, 'Tingkat Kelas': 'Semua Kelas', 'Status': 'Wajib' },
                    { 'No': 5, 'Kode Pos': 'KGT-01', 'Nama Tagihan': 'Kegiatan Outing Class / Rihlah', 'Frekuensi': 'Insidental', 'Nominal (Rp)': 250000, 'Tingkat Kelas': 'Semua Kelas', 'Status': 'Pilihan' }
                  ];
                  exportToExcel(feeRows, `Data_Tarif_Pos_Biaya_${new Date().toISOString().slice(0, 10)}.xlsx`, 'TARIF_BIAYA');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Tarif Biaya (.xlsx)</span>
              </button>
            </div>

            {/* 13. Ekspor Agenda Harian & Jurnal Guru (KBM) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition">
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl w-fit">
                  <BookOpen size={22} />
                </div>
                <h4 className="font-black text-slate-900 text-sm">Ekspor Jurnal Harian & Agenda Guru (KBM)</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Catatan ketercapaian materi pembelajaran, asesmen formatif, presensi siswa di kelas, dan catatan tindak lanjut guru.
                </p>
                <div className="text-[11px] font-bold text-amber-700 bg-amber-50/70 p-2 rounded-xl">
                  Laporan Supervisi Akademik
                </div>
              </div>
              <button
                onClick={() => {
                  const sampleKBM = [
                    { 'No': 1, 'Tanggal': new Date().toISOString().slice(0, 10), 'Guru Pengampu': teachers[0]?.name || 'Guru Kelas', 'Mata Pelajaran': 'Pendidikan Pancasila', 'Kelas': selectedClass || '1A', 'Materi Pembelajaran': 'Mengenal Simbol-Simbol Garuda Pancasila', 'Kehadiran Siswa': 'Hadir Lengkap', 'Ketercapaian TP': 'Tercapai 95%', 'Catatan Guru': 'Siswa sangat aktif dalam diskusi kelompok' }
                  ];
                  exportToExcel(sampleKBM, `Jurnal_Agenda_Guru_KBM_${new Date().toISOString().slice(0, 10)}.xlsx`, 'AGENDA_GURU');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-200 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download Agenda KBM (.xlsx)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PUSAT CETAK & DOKUMEN PDF RESMI */}
      {/* ========================================================================= */}
      {activeSubTab === 'print-pdf' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Print Controller Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Printer size={18} className="text-purple-600" />
                  <span>Pilih Dokumen yang Ingin Dicetak</span>
                </h3>
                <p className="text-xs text-slate-500">Pratinjau langsung sebelum dicetak atau disimpan ke file PDF.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  <FileDown size={15} />
                  <span>Download File PDF</span>
                </button>
                <button
                  onClick={triggerPrint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-purple-200 transition active:scale-95 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Cetak Dokumen (Print)</span>
                </button>
              </div>
            </div>

            {/* Document Type Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
              {[
                { id: 'daftar-siswa', label: 'Daftar Siswa Resmi', icon: Users },
                { id: 'f-sek', label: 'Formulir F-SEK (Biodata)', icon: FileText },
                { id: 'kartu-kolektif', label: 'Kartu Pelajar (Kolektif)', icon: Award },
                { id: 'kartu-satuan', label: 'Kartu Pelajar (Per Siswa)', icon: User },
                { id: 'daftar-gtk', label: 'Daftar GTK / Guru', icon: GraduationCap },
              ].map((doc) => {
                const Icon = doc.icon;
                const isSelected = printDocType === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setPrintDocType(doc.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition active:scale-95",
                      isSelected
                        ? "bg-purple-50 border-purple-400 text-purple-950 font-black shadow-xs ring-2 ring-purple-300"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-bold"
                    )}
                  >
                    <Icon size={16} className={isSelected ? 'text-purple-600 mb-1' : 'text-slate-400 mb-1'} />
                    <span className="text-[11px] leading-tight">{doc.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Controls based on selected document */}
            <div className="flex flex-wrap items-center gap-3 pt-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              {(printDocType === 'daftar-siswa' || printDocType === 'kartu-kolektif') && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Pilih Kelas:</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="">Semua Kelas ({activeStudents.length} Siswa)</option>
                    {classesList.map(c => (
                      <option key={c} value={c}>{formatClassLabel(c, true)}</option>
                    ))}
                  </select>
                </div>
              )}

              {(printDocType === 'f-sek' || printDocType === 'kartu-satuan') && (
                <div className="flex flex-wrap items-center gap-2 w-full">
                  <label className="text-xs font-bold text-slate-600">Pilih Siswa:</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex-1 max-w-md"
                  >
                    {activeStudents.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.nis || 'No NIS'} - {formatClassLabel(s.class, true)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* LIVE PRINTABLE PREVIEW CONTAINER */}
          {/* ================================================================= */}
          <div id="printable-area" className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md printable-container printable-document max-w-5xl mx-auto overflow-x-auto text-slate-900 print:max-w-none print:w-full print:p-0 print:m-0 print:border-none">
            
            {/* 1. DOCUMENT TYPE: DAFTAR SISWA RESMI */}
            {printDocType === 'daftar-siswa' && (
              <div className="space-y-6">
                {/* Official Header Kop with Dual Logo */}
                <div className="flex items-center justify-between pb-4 border-b-4 border-double border-slate-900 gap-4">
                  <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                    {settings.logoUrl || settings.schoolLogoUrl ? (
                      <img src={settings.logoUrl || settings.schoolLogoUrl} alt="Logo Sekolah" className="w-18 h-18 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center font-black text-xs">LOGO</div>
                    )}
                  </div>
                  <div className="text-center flex-1 px-2">
                    <h3 className="text-xs uppercase tracking-wider font-semibold">
                      PEMERINTAH KABUPATEN / KOTA {settings.kabupaten?.toUpperCase() || 'BANDUNG'}
                    </h3>
                    <h2 className="text-xs uppercase tracking-wider font-bold">
                      DINAS PENDIDIKAN DAN KEBUDAYAAN
                    </h2>
                    <h1 className="text-lg font-black uppercase text-indigo-950">
                      {settings.namaSekolah?.toUpperCase() || settings.schoolName?.toUpperCase() || 'SISTA ROMBEL'}
                    </h1>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {settings.alamat || 'Jl. Pendidikan No. 123'} {settings.desa ? `, Desa ${settings.desa}` : ''} {settings.kecamatan ? `, Kec. ${settings.kecamatan}` : ''} {settings.kabupaten ? `, ${settings.kabupaten}` : ''} {settings.kodePos || ''}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      NPSN: {settings.npsn || '12345678'} | Email: {settings.email || 'sekolah@sch.id'} | Telp: {settings.telepon || settings.kontak || '-'}
                    </p>
                  </div>
                  <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                    {settings.schoolLogoUrl && settings.logoUrl && settings.schoolLogoUrl !== settings.logoUrl ? (
                      <img src={settings.schoolLogoUrl} alt="Logo Lembaga" className="w-18 h-18 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center text-indigo-800">
                        <Award size={20} />
                        <span className="text-[8px] font-black uppercase mt-0.5">RESMI</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center space-y-1">
                  <h2 className="text-base font-extrabold underline uppercase">
                    DAFTAR PESERTA DIDIK
                  </h2>
                  <p className="text-xs font-bold text-slate-700">
                    KELAS: {selectedClass || 'SEMUA KELAS'} | TAHUN PELAJARAN: {settings.tahunPelajaran || '2026/2027'}
                  </p>
                </div>

                {/* Summary Box */}
                <div className="flex justify-between items-center text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span>Total Siswa: <strong>{filteredStudents.length} Orang</strong></span>
                  <span>Laki-laki (L): <strong>{filteredStudents.filter(s => s.gender === 'L').length}</strong></span>
                  <span>Perempuan (P): <strong>{filteredStudents.filter(s => s.gender === 'P').length}</strong></span>
                </div>

                {/* Table */}
                <table className="w-full text-xs border-collapse border border-slate-900">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900">
                      <th className="border border-slate-900 p-2 text-center w-8">No</th>
                      <th className="border border-slate-900 p-2 text-center w-20">NIS</th>
                      <th className="border border-slate-900 p-2 text-center w-24">NISN</th>
                      <th className="border border-slate-900 p-2 text-left">Nama Peserta Didik</th>
                      <th className="border border-slate-900 p-2 text-center w-12">L/P</th>
                      <th className="border border-slate-900 p-2 text-left">Tempat, Tanggal Lahir</th>
                      <th className="border border-slate-900 p-2 text-left">Nama Orang Tua / Wali</th>
                      <th className="border border-slate-900 p-2 text-left">Alamat Domisili</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, idx) => (
                      <tr key={s.id}>
                        <td className="border border-slate-900 p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-900 p-1.5 text-center font-mono">{s.nis || '-'}</td>
                        <td className="border border-slate-900 p-1.5 text-center font-mono">{s.nisn || '-'}</td>
                        <td className="border border-slate-900 p-1.5 font-bold uppercase">{s.name}</td>
                        <td className="border border-slate-900 p-1.5 text-center">{s.gender}</td>
                        <td className="border border-slate-900 p-1.5">
                          {s.pob || '-'}, {s.dob ? formatDate(s.dob) : '-'}
                        </td>
                        <td className="border border-slate-900 p-1.5">{s.parentName || s.namaAyah || '-'}</td>
                        <td className="border border-slate-900 p-1.5 text-[11px]">{s.address || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signature Section */}
                <div className="flex justify-between items-start pt-8 text-xs">
                  <div className="text-center w-64">
                    <p>Mengetahui,</p>
                    <p className="font-bold">Kepala / Pimpinan</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline uppercase">{kepsek?.name || settings.kepalaSekolah || '( ............................................ )'}</p>
                    <p>NIP. {kepsek?.nip || kepsek?.nuptk || settings.nipKepalaSekolah || '-'}</p>
                  </div>
                  <div className="text-center w-64">
                    <p>{settings.kabupaten || 'Bandung'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold">Wali Kelas {selectedClass || ''}</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline uppercase">{waliKelas?.name || '......................................................'}</p>
                    <p>NIP. {waliKelas?.nip || waliKelas?.nuptk || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DOCUMENT TYPE: FORMULIR F-SEK (BIODATA SISWA) */}
            {printDocType === 'f-sek' && selectedStudent && (
              <div className="space-y-6">
                {/* Kop */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                  <div className="text-center w-full">
                    <h1 className="text-sm font-black uppercase text-indigo-950">
                      {settings.namaSekolah?.toUpperCase() || settings.schoolName?.toUpperCase() || 'SISTA ROMBEL'}
                    </h1>
                    <h2 className="text-xs font-bold underline uppercase mt-1">
                      LEMBAR DATA POKOK PESERTA DIDIK (F-SEK)
                    </h2>
                    <p className="text-[10px] text-slate-500">Tahun Ajaran {settings.tahunPelajaran || '2026/2027'}</p>
                  </div>
                </div>

                {/* Photo & Main Identity Header */}
                <div className="flex gap-6 items-start">
                  <div className="w-28 h-36 border-2 border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400 text-xs overflow-hidden flex-shrink-0">
                    {selectedStudent.fotoUrl ? (
                      <img src={getGoogleDriveDirectImageUrl(selectedStudent.fotoUrl)} alt="Foto" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="font-bold text-slate-400">PAS FOTO 3x4</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Nama Lengkap</span>
                      <span className="col-span-2 font-bold text-slate-900 uppercase">: {selectedStudent.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">NIS / NISN</span>
                      <span className="col-span-2 font-mono font-bold text-slate-900">: {selectedStudent.nis || '-'} / {selectedStudent.nisn || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">NIK (No KTP Siswa)</span>
                      <span className="col-span-2 font-mono text-slate-900">: {selectedStudent.nik || '-'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Rombel Saat Ini</span>
                      <span className="col-span-2 font-bold text-indigo-700">: Kelas {selectedStudent.class}</span>
                    </div>
                  </div>
                </div>

                {/* Section A: Identitas Diri */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold bg-slate-100 p-1.5 rounded text-slate-800 border-l-4 border-indigo-600 uppercase">
                    A. Keterangan Pribadi
                  </h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 w-48 text-slate-600">Jenis Kelamin</td>
                        <td className="py-1 font-medium">: {selectedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-600">Tempat, Tanggal Lahir</td>
                        <td className="py-1 font-medium">: {selectedStudent.pob || '-'}, {selectedStudent.dob ? formatDate(selectedStudent.dob) : '-'} ({selectedStudent.dob ? formatAge(selectedStudent.dob) : '-'})</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-600">Agama</td>
                        <td className="py-1 font-medium">: {selectedStudent.agama || 'Islam'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-600">Anak Ke / Jumlah Saudara</td>
                        <td className="py-1 font-medium">: Anak ke-{selectedStudent.anakKe || '1'} dari {selectedStudent.saudara || '1'} bersaudara</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-600">Alamat Tempat Tinggal</td>
                        <td className="py-1 font-medium">: {selectedStudent.address || '-'} (RT {selectedStudent.rt || '-'} / RW {selectedStudent.rw || '-'}, Kel. {selectedStudent.kelurahan || '-'}, Kec. {selectedStudent.kecamatan || '-'})</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section B: Orang Tua / Wali */}
                <div className="space-y-2 text-xs">
                  <h4 className="font-bold bg-slate-100 p-1.5 rounded text-slate-800 border-l-4 border-indigo-600 uppercase">
                    B. Keterangan Orang Tua / Wali
                  </h4>
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 w-48 text-slate-600">Nama Ayah Kandung</td>
                        <td className="py-1 font-bold">: {selectedStudent.namaAyah || selectedStudent.parentName || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-600">Pekerjaan / Telepon Ayah</td>
                        <td className="py-1">: {selectedStudent.pekerjaanAyah || '-'} / {selectedStudent.tlpAyah || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-600">Nama Ibu Kandung</td>
                        <td className="py-1 font-bold">: {selectedStudent.namaIbu || '-'}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 text-slate-600">Pekerjaan / Telepon Ibu</td>
                        <td className="py-1">: {selectedStudent.pekerjaanIbu || '-'} / {selectedStudent.tlpIbu || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan */}
                <div className="flex justify-between items-start pt-6 text-xs">
                  <div className="text-center w-60">
                    <p>Orang Tua / Wali Siswa</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline uppercase">{selectedStudent.namaAyah || selectedStudent.parentName || '........................................'}</p>
                  </div>
                  <div className="text-center w-60">
                    <p>{settings.kabupaten || 'Bandung'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold">Kepala / Pimpinan</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline uppercase">{kepsek?.name || settings.kepalaSekolah || 'NAMA PIMPINAN'}</p>
                    <p>NIP. {kepsek?.nip || settings.nipKepalaSekolah || '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. DOCUMENT TYPE: KARTU PELAJAR KOLEKTIF (GRID) */}
            {printDocType === 'kartu-kolektif' && (
              <div className="space-y-6">
                <div className="text-center pb-3 border-b border-slate-200">
                  <h3 className="font-extrabold text-sm uppercase">KARTU TANDA PELAJAR RESMI</h3>
                  <p className="text-xs text-slate-500">Kelas: {selectedClass || 'Semua'} ({filteredStudents.length} Kartu)</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredStudents.map(s => (
                    <div key={s.id} className="border-2 border-indigo-900 rounded-2xl p-4 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 relative overflow-hidden shadow-xs">
                      <div className="flex items-center gap-3 pb-2 border-b border-indigo-200">
                        <div className="w-8 h-8 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-xs">
                          SD
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-950 uppercase">{settings.schoolName || 'SISTA ROMBEL'}</p>
                          <p className="text-[8px] text-slate-500">KARTU TANDA PELAJAR</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-center mt-3">
                        <div className="w-16 h-20 rounded-lg bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300 flex-shrink-0">
                          {s.fotoUrl ? (
                            <img src={getGoogleDriveDirectImageUrl(s.fotoUrl)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={24} className="text-slate-400" />
                          )}
                        </div>
                        <div className="text-[10px] space-y-1 min-w-0 flex-1">
                          <p className="font-black text-indigo-950 uppercase truncate">{s.name}</p>
                          <p className="text-slate-600 font-mono">NIS: <strong>{s.nis || '-'}</strong> | NISN: <strong>{s.nisn || '-'}</strong></p>
                          <p className="text-slate-600">Kelas: <strong>{s.class}</strong> | JK: <strong>{s.gender}</strong></p>
                          <p className="text-slate-500 truncate text-[9px]">{s.dob ? formatDate(s.dob) : '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. DOCUMENT TYPE: KARTU PELAJAR SATUAN */}
            {printDocType === 'kartu-satuan' && selectedStudent && (
              <div className="max-w-md mx-auto space-y-6">
                {/* Front Side */}
                <div className="border-2 border-indigo-900 rounded-3xl p-5 bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 text-white relative shadow-xl overflow-hidden">
                  <div className="flex items-center gap-3 pb-3 border-b border-indigo-700/80">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">
                      SD
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">{settings.schoolName || 'SISTA ROMBEL'}</p>
                      <p className="text-[10px] text-indigo-200 tracking-widest uppercase">KARTU TANDA PELAJAR</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center mt-4">
                    <div className="w-20 h-24 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {selectedStudent.fotoUrl ? (
                        <img src={getGoogleDriveDirectImageUrl(selectedStudent.fotoUrl)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User size={32} className="text-indigo-300" />
                      )}
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-black text-sm uppercase text-amber-300">{selectedStudent.name}</p>
                      <p className="text-indigo-200 font-mono">NIS: {selectedStudent.nis || '-'}</p>
                      <p className="text-indigo-200 font-mono">NISN: {selectedStudent.nisn || '-'}</p>
                      <p className="text-indigo-200">Kelas: {selectedStudent.class}</p>
                      <p className="text-[10px] text-indigo-300">{selectedStudent.dob ? formatDate(selectedStudent.dob) : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Back Side */}
                <div className="border-2 border-slate-300 rounded-3xl p-5 bg-white text-slate-800 space-y-3 text-xs shadow-md">
                  <p className="font-extrabold text-center text-slate-900 border-b border-slate-200 pb-2">TATA TERTIB KARTU PELAJAR</p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                    <li>Kartu ini adalah kartu identitas resmi peserta didik.</li>
                    <li>Wajib dibawa setiap hari saat kegiatan belajar mengajar.</li>
                    <li>Jika menemukan kartu ini, harap mengembalikan ke pihak lembaga.</li>
                  </ol>
                  <div className="pt-4 text-center text-[10px] text-slate-500">
                    <p>{settings.schoolName || 'SISTA ROMBEL'}</p>
                    <p>{settings.alamat || 'Jl. Pendidikan No. 123'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. DOCUMENT TYPE: DAFTAR GTK / GURU */}
            {printDocType === 'daftar-gtk' && (
              <div className="space-y-6">
                {/* Official Header Kop with Dual Logo */}
                <div className="flex items-center justify-between pb-4 border-b-4 border-double border-slate-900 gap-4">
                  <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                    {settings.logoUrl || settings.schoolLogoUrl ? (
                      <img src={settings.logoUrl || settings.schoolLogoUrl} alt="Logo Sekolah" className="w-18 h-18 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center font-black text-xs">LOGO</div>
                    )}
                  </div>
                  <div className="text-center flex-1 px-2">
                    <h3 className="text-xs uppercase tracking-wider font-semibold">
                      PEMERINTAH KABUPATEN / KOTA {settings.kabupaten?.toUpperCase() || 'BANDUNG'}
                    </h3>
                    <h2 className="text-xs uppercase tracking-wider font-bold">
                      DINAS PENDIDIKAN DAN KEBUDAYAAN
                    </h2>
                    <h1 className="text-lg font-black uppercase text-indigo-950">
                      {settings.namaSekolah?.toUpperCase() || settings.schoolName?.toUpperCase() || 'SISTA ROMBEL'}
                    </h1>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {settings.alamat || 'Jl. Pendidikan No. 123'} {settings.desa ? `, Desa ${settings.desa}` : ''} {settings.kecamatan ? `, Kec. ${settings.kecamatan}` : ''} {settings.kabupaten ? `, ${settings.kabupaten}` : ''} {settings.kodePos || ''}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      NPSN: {settings.npsn || '12345678'} | Email: {settings.email || 'sekolah@sch.id'} | Telp: {settings.telepon || settings.kontak || '-'}
                    </p>
                  </div>
                  <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                    {settings.schoolLogoUrl && settings.logoUrl && settings.schoolLogoUrl !== settings.logoUrl ? (
                      <img src={settings.schoolLogoUrl} alt="Logo Lembaga" className="w-18 h-18 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center text-indigo-800">
                        <GraduationCap size={20} />
                        <span className="text-[8px] font-black uppercase mt-0.5">GTK</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center space-y-1">
                  <h2 className="text-base font-extrabold underline uppercase">
                    DAFTAR PENDIDIK & TENAGA KEPENDIDIKAN (GTK)
                  </h2>
                  <p className="text-xs font-bold text-slate-700">
                    TAHUN PELAJARAN: {settings.tahunPelajaran || '2026/2027'} | TOTAL: {teachers.length} ORANG
                  </p>
                </div>

                <table className="w-full text-xs border-collapse border border-slate-900">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900">
                      <th className="border border-slate-900 p-2 text-center w-8">No</th>
                      <th className="border border-slate-900 p-2 text-left">Nama Lengkap & Gelar</th>
                      <th className="border border-slate-900 p-2 text-center w-36">NIP / NUPTK</th>
                      <th className="border border-slate-900 p-2 text-center w-12">L/P</th>
                      <th className="border border-slate-900 p-2 text-left">Jabatan / Tugas</th>
                      <th className="border border-slate-900 p-2 text-left">Pendidikan</th>
                      <th className="border border-slate-900 p-2 text-center w-28">No. Telepon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((t, idx) => (
                      <tr key={t.id ? `lap-t-${t.id}-${idx}` : `lap-t-${idx}`}>
                        <td className="border border-slate-900 p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-900 p-1.5 font-bold uppercase">{t.name}</td>
                        <td className="border border-slate-900 p-1.5 text-center font-mono">{t.nip || t.nuptk || '-'}</td>
                        <td className="border border-slate-900 p-1.5 text-center">{t.gender}</td>
                        <td className="border border-slate-900 p-1.5">{t.class === 'None' ? (t.jabatan || 'Guru') : `Wali Kelas ${t.class}`}</td>
                        <td className="border border-slate-900 p-1.5">{t.pendidikan || '-'}</td>
                        <td className="border border-slate-900 p-1.5 text-center">{t.phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* GTK Official Signature */}
                <div className="flex justify-end items-start pt-8 text-xs">
                  <div className="text-center w-64">
                    <p>{settings.kabupaten || 'Bandung'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold">Kepala / Pimpinan Lembaga</p>
                    <div className="h-20"></div>
                    <p className="font-bold underline uppercase">{kepsek?.name || settings.kepalaSekolah || '( ............................................ )'}</p>
                    <p>NIP. {kepsek?.nip || kepsek?.nuptk || settings.nipKepalaSekolah || '-'}</p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REKAPITULASI & STATISTIK EKSEKUTIF */}
      {/* ========================================================================= */}
      {activeSubTab === 'rekap' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Siswa Aktif</p>
                <p className="text-xl font-black text-indigo-950">{activeStudents.length} <span className="text-xs font-normal text-slate-400">Anak</span></p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                <GraduationCap size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Pendidik & GTK</p>
                <p className="text-xl font-black text-purple-950">{teachers.length} <span className="text-xs font-normal text-slate-400">Orang</span></p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Layers size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Rombongan Belajar</p>
                <p className="text-xl font-black text-emerald-950">{classesList.length} <span className="text-xs font-normal text-slate-400">Kelas</span></p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Penerima KPS/PIP</p>
                <p className="text-xl font-black text-amber-950">
                  {activeStudents.filter(s => s.penerimaKps === 'Ya' || s.penerimaKps === 'KIP').length} <span className="text-xs font-normal text-slate-400">Siswa</span>
                </p>
              </div>
            </div>
          </div>

          {/* Rombel Table Summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Distribusi Peserta Didik Per Rombongan Belajar</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="p-3 font-bold">Rombel</th>
                    <th className="p-3 font-bold">Wali Kelas</th>
                    <th className="p-3 font-bold text-center">Laki-laki (L)</th>
                    <th className="p-3 font-bold text-center">Perempuan (P)</th>
                    <th className="p-3 font-bold text-center">Total Siswa</th>
                    <th className="p-3 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classesList.map(c => {
                    const classStudents = activeStudents.filter(s => matchClass(s.class, c));
                    const l = classStudents.filter(s => s.gender === 'L').length;
                    const p = classStudents.filter(s => s.gender === 'P').length;
                    const teacher = teachers.find(t => matchClass(t.class, c));
                    return (
                      <tr key={c} className="hover:bg-slate-50/80">
                        <td className="p-3 font-extrabold text-indigo-950">Kelas {c}</td>
                        <td className="p-3 text-slate-700">{teacher ? teacher.name : <span className="text-slate-400 italic">Belum ditentukan</span>}</td>
                        <td className="p-3 text-center font-bold text-blue-600">{l}</td>
                        <td className="p-3 text-center font-bold text-rose-600">{p}</td>
                        <td className="p-3 text-center font-extrabold text-slate-900">{classStudents.length}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedClass(c);
                              setActiveSubTab('print-pdf');
                              setPrintDocType('daftar-siswa');
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition"
                          >
                            Cetak Rombel
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
