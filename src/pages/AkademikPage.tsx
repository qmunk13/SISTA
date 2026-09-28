import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, BookOpen, Calendar, Users, BookMarked, CalendarCheck, 
  UserCheck, QrCode, PenTool, FileSpreadsheet, Award, TrendingUp, CheckCircle,
  FileText, CheckSquare, Zap, Percent, SlidersHorizontal, CheckCircle2, ChevronDown
} from 'lucide-react';
import { useStore } from '../store';
import { db } from '../data/db';
import { getSemestersList, getActiveSemester, setSemesterAndTahunAjaran, SemesterEntity } from '../lib/semester';
import { getMasterTahunAjaranDropdown, setActiveTahunAjaranAndSemesterSync } from '../utils/masterDropdowns';
import { matchStatusActive } from '../lib/utils';
import Kurikulum from './Kurikulum';
import AttendancePrint from './AttendancePrint';
import KenaikanKelas from './KenaikanKelas';
import JadwalRombelTab from '../components/akademik/JadwalRombelTab';
import SiswaKelasTab from '../components/akademik/SiswaKelasTab';
import AgendaGuruTab from '../components/akademik/AgendaGuruTab';
import AbsensiGuruTab from '../components/akademik/AbsensiGuruTab';
import QrScannerTab from '../components/akademik/QrScannerTab';
import InputNilaiTab from '../components/akademik/InputNilaiTab';
import RaporAkhirTab from '../components/akademik/RaporAkhirTab';
import PeringkatRankingTab from '../components/akademik/PeringkatRankingTab';
import PerizinanSiswaTab from '../components/akademik/PerizinanSiswaTab';
import InputAbsensiKelasTab from '../components/akademik/InputAbsensiKelasTab';
import PersentaseAbsensiTab from '../components/akademik/PersentaseAbsensiTab';
import CustomDropdown from '../components/common/CustomDropdown';

export default function AkademikPage() {
  const [activeSubTab, setActiveSubTab] = useState('persentase-absensi');
  const { students, teachers, settings, setSettings } = useStore();
  const currentTP = settings.tahunPelajaran || '2026/2027';
  const currentSem = (settings.semester === 'Genap' ? 'Genap' : 'Ganjil') as 'Ganjil' | 'Genap';
  
  const [semestersList, setSemestersList] = useState<SemesterEntity[]>(() => getSemestersList());
  const [activeSemester, setActiveSemester] = useState<SemesterEntity>(() => getActiveSemester(currentTP, currentSem));
  const masterTA = useMemo(() => getMasterTahunAjaranDropdown(), [settings.tahunPelajaran, semestersList]);

  useEffect(() => {
    const updated = getActiveSemester(settings.tahunPelajaran, settings.semester as any);
    setActiveSemester(updated);
    setSemestersList(getSemestersList());
  }, [settings.tahunPelajaran, settings.semester]);

  const handleSemesterChange = async (newTP: string, newSem: 'Ganjil' | 'Genap') => {
    const updatedSettings = {
      ...settings,
      tahunPelajaran: newTP,
      semester: newSem,
      activeAcademicYear: newTP,
      activeSemester: newSem
    };
    setSettings(updatedSettings);
    db.setSingle('settings', updatedSettings);

    const target = setSemesterAndTahunAjaran(newTP, newSem);
    setActiveSemester(target);
    setSemestersList(getSemestersList());
    await setActiveTahunAjaranAndSemesterSync(newTP, newSem);
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleDbUpdate = () => {
      setRefreshTrigger(prev => prev + 1);
      setActiveSemester(getActiveSemester(settings.tahunPelajaran, settings.semester as any));
      setSemestersList(getSemestersList());
    };
    window.addEventListener('erp-db-updated', handleDbUpdate);
    window.addEventListener('academic-semester-changed', handleDbUpdate);
    window.addEventListener('focus', handleDbUpdate);
    return () => {
      window.removeEventListener('erp-db-updated', handleDbUpdate);
      window.removeEventListener('academic-semester-changed', handleDbUpdate);
      window.removeEventListener('focus', handleDbUpdate);
    };
  }, [settings.tahunPelajaran, settings.semester]);

  const absensiList = useMemo(() => (db.get('absensi') as any[]) || [], [refreshTrigger]);
  const absensiGuruList = useMemo(() => (db.get('absensi_guru') as any[]) || [], [refreshTrigger]);
  const gradesMap = useMemo(() => (db.get('nilai_akademik_map') as any) || {}, [refreshTrigger]);

  // Calculate real metrics
  const presensiRate = useMemo(() => {
    if (!absensiList || absensiList.length === 0) return 0;
    const hadirCount = absensiList.filter((a: any) => a.status === 'H' || a.status === 'Hadir').length;
    return Math.round((hadirCount / absensiList.length) * 100);
  }, [absensiList]);

  const gradedStudentsCount = useMemo(() => {
    const keys = Object.keys(gradesMap);
    return keys.length;
  }, [gradesMap]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const guruHadirToday = useMemo(() => {
    return absensiGuruList.filter((g: any) => g.tanggal === todayStr && (g.status === 'Tepat Waktu' || g.status === 'Terlambat')).length;
  }, [absensiGuruList, todayStr]);
  const activeStudents = useMemo(() => students.filter(s => matchStatusActive(s.status)), [students]);

  const subTabs = [
    { id: 'persentase-absensi', label: 'Rekap & Analisis Persentase Kehadiran (%)', icon: Percent },
    { id: 'input-absensi-kelas', label: 'Input Absensi Kelas (H/S/I/A)', icon: Zap },
    { id: 'absensi-siswa', label: 'Buku Presensi & Cetak', icon: CalendarCheck },
    { id: 'dashboard', label: 'Dashboard Akademik', icon: GraduationCap },
    { id: 'agenda', label: 'Agenda Guru (Jurnal KBM)', icon: BookMarked },
    { id: 'perizinan-siswa', label: 'Perizinan & Surat Izin/Sakit', icon: FileText },
    { id: 'absensi-guru', label: 'Absensi Guru', icon: UserCheck },
    { id: 'qr-scanner', label: 'QR Scanner Portal', icon: QrCode },
    { id: 'input-nilai', label: 'Input Nilai', icon: PenTool },
    { id: 'rapor', label: 'Rapor Akhir', icon: FileSpreadsheet },
    { id: 'siswa-kelas', label: 'Data Siswa Kelas', icon: Users },
    { id: 'jadwal', label: 'Jadwal Rombel', icon: Calendar },
    { id: 'kurikulum', label: 'Kurikulum Kemendikdasmen', icon: BookOpen },
    { id: 'peringkat', label: 'Peringkat & Ranking', icon: Award },
    { id: 'kenaikan', label: 'Kenaikan Kelas', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Title & Semester Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 p-5 rounded-3xl border border-slate-200/80 shadow-xs no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80 shadow-2xs flex-shrink-0">
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Akademik & Kurikulum
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pengelolaan KBM, jadwal rombel, jurnal harian guru, presensi QR, penilaian Kurikulum Merdeka, rapor akhir, & promosi kelas.
            </p>
          </div>
        </div>

        {/* Interactive Semester & Tahun Ajaran Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50/80 border border-emerald-200/90 p-2 sm:p-2.5 rounded-2xl w-full sm:w-auto shadow-2xs">
          <div className="flex items-center gap-2 pl-1.5 pr-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></div>
            <div className="text-left hidden lg:block">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Semester & T.A</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            {/* Tahun Pelajaran Selector (Terhubung Langsung ke Sheet TAHUN_AJARAN) */}
            <div className="w-40">
              <CustomDropdown
                id="akademik-ta-select"
                value={activeSemester.tahunPelajaran || settings.tahunPelajaran || masterTA.activeYear}
                onChange={(val) => handleSemesterChange(val, (activeSemester.semesterType || 'Ganjil') as any)}
                options={masterTA.years.map((year) => ({
                  value: year,
                  label: `T.A ${year}`,
                  badge: year === masterTA.activeYear ? 'Aktif' : undefined
                }))}
                placeholder="Pilih Tahun Pelajaran..."
                buttonClassName="!py-1.5 !px-2.5 !bg-white !border-emerald-300 text-xs font-black text-emerald-950"
              />
            </div>

            {/* Semester Selector (Terhubung Langsung ke Sheet SEMESTER) */}
            <div className="flex items-center bg-white rounded-xl border border-emerald-300 p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSemesterChange(activeSemester.tahunPelajaran || settings.tahunPelajaran || masterTA.activeYear, 'Ganjil')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  (activeSemester.semesterType || 'Ganjil') === 'Ganjil'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Aktifkan Semester Ganjil (1) ke Sheet SEMESTER & SETTING"
              >
                Ganjil (1)
              </button>
              <button
                type="button"
                onClick={() => handleSemesterChange(activeSemester.tahunPelajaran || settings.tahunPelajaran || masterTA.activeYear, 'Genap')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                  (activeSemester.semesterType || 'Ganjil') === 'Genap'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Aktifkan Semester Genap (2) ke Sheet SEMESTER & SETTING"
              >
                Genap (2)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation: Mobile Dropdown Selector & Desktop Pill Tabs */}
      <div className="md:hidden bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs no-print">
        <CustomDropdown
          id="akademik-subtab-mobile"
          label="Pilih Sub-Menu Akademik:"
          value={activeSubTab}
          onChange={(val) => setActiveSubTab(val)}
          options={subTabs.map(tab => ({ value: tab.id, label: tab.label }))}
          placeholder="Pilih Sub-Menu..."
        />
      </div>

      {/* Sub Tabs (Desktop / Tablet) */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-print">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white/80 text-slate-600 hover:bg-white hover:text-indigo-600 border border-slate-200/80'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SubTab Views */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500">Rekap Nilai Terdata</span>
              <div className="text-3xl font-black text-indigo-600">
                {gradedStudentsCount > 0 ? `${gradedStudentsCount} Rekap` : '0 Data'}
              </div>
              <p className="text-[11px] text-slate-500">
                {gradedStudentsCount > 0 ? 'Asesmen TP/STS/SAS tersimpan' : 'Belum ada input nilai'}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500">Tingkat Presensi Siswa</span>
              <div className="text-3xl font-black text-emerald-600">
                {absensiList.length > 0 ? `${presensiRate}%` : '0%'}
              </div>
              <p className="text-[11px] text-slate-500">
                {absensiList.length > 0 ? `${absensiList.length} Log Presensi Tercatat` : 'Belum ada log presensi'}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500">Kehadiran Guru Hari Ini</span>
              <div className="text-3xl font-black text-purple-600">
                {teachers.length > 0 ? `${guruHadirToday} / ${teachers.length}` : '0 GTK'}
              </div>
              <p className="text-[11px] text-slate-500">
                {absensiGuruList.length > 0 ? `${absensiGuruList.length} Log Presensi Guru` : 'Presensi Guru Real-time'}
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500">Total Siswa Aktif</span>
              <div className="text-3xl font-black text-slate-900">
                {activeStudents.length} Siswa
              </div>
              <p className="text-[11px] text-slate-500">
                T.A {settings.tahunPelajaran || '2026/2027'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'persentase-absensi' && <PersentaseAbsensiTab />}
      {activeSubTab === 'input-absensi-kelas' && <InputAbsensiKelasTab />}
      {activeSubTab === 'kurikulum' && <Kurikulum />}
      {activeSubTab === 'jadwal' && <JadwalRombelTab />}
      {activeSubTab === 'siswa-kelas' && <SiswaKelasTab />}
      {activeSubTab === 'agenda' && <AgendaGuruTab />}
      {activeSubTab === 'absensi-siswa' && <AttendancePrint />}
      {activeSubTab === 'perizinan-siswa' && <PerizinanSiswaTab />}
      {activeSubTab === 'absensi-guru' && <AbsensiGuruTab />}
      {activeSubTab === 'qr-scanner' && <QrScannerTab />}
      {activeSubTab === 'input-nilai' && <InputNilaiTab />}
      {activeSubTab === 'rapor' && <RaporAkhirTab />}
      {activeSubTab === 'peringkat' && <PeringkatRankingTab />}
      {activeSubTab === 'kenaikan' && <KenaikanKelas />}
    </div>
  );
}
