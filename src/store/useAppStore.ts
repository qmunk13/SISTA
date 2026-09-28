import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Student,
  Rombel,
  Subject,
  AttendanceRecord,
  GradeRecord,
  BehaviorRecord,
  FeePayment,
  ScheduleItem,
  SchoolInfo,
  AttendanceStatus,
} from '../types';
import { matchClass, matchStatusActive } from '../lib/utils';
const initialSchoolInfo: SchoolInfo = {
  name: 'ROMBEL TAMBORA',
  address: '',
  city: '',
  province: '',
  npsn: '',
  phone: '',
  email: '',
  academicYear: '2026/2027',
  semesterActive: 'Ganjil',
};

const initialStudents: Student[] = [];
const initialRombels: Rombel[] = [];
const initialSubjects: Subject[] = [];
const initialGrades: GradeRecord[] = [];
const initialBehaviorRecords: BehaviorRecord[] = [];
const initialFeePayments: FeePayment[] = [];
const initialSchedule: ScheduleItem[] = [];
const initialAttendanceRecords: AttendanceRecord[] = [];

interface AppState {
  schoolInfo: SchoolInfo;
  students: Student[];
  rombels: Rombel[];
  subjects: Subject[];
  attendanceRecords: AttendanceRecord[];
  grades: GradeRecord[];
  behaviorRecords: BehaviorRecord[];
  feePayments: FeePayment[];
  schedules: ScheduleItem[];

  // Active Filter state
  selectedRombelId: string;
  setSelectedRombelId: (id: string) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Actions - School
  updateSchoolInfo: (info: Partial<SchoolInfo>) => void;

  // Actions - Students
  addStudent: (student: Omit<Student, 'id' | 'behaviorPoints'>) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  deleteStudent: (id: string) => void;

  // Actions - Attendance
  markAttendance: (studentId: string, classId: string, status: AttendanceStatus, note?: string) => void;
  bulkMarkAttendance: (classId: string, date: string, status: AttendanceStatus) => void;
  addAttendanceRecord: (record: { studentId: string; classId: string; date: string; status: AttendanceStatus; checkInTime?: string }) => void;

  // Actions - Grades
  saveGrade: (grade: Omit<GradeRecord, 'id' | 'nilaiAkhir' | 'predikat'> & { id?: string }) => void;
  updateGrade: (record: { studentId: string; subjectId: string; semester: 'Ganjil' | 'Genap'; tugas: number; uts: number; uas: number; nilaiAkhir: number; capaianKompetensi: string }) => void;

  // Actions - Behavior
  addBehaviorRecord: (record: Omit<BehaviorRecord, 'id'>) => void;
  deleteBehaviorRecord: (id: string) => void;

  // Actions - Fee Payments
  markFeePaid: (feeId: string, date: string, invoiceNo: string) => void;
  addFeePayment: (payment: Omit<FeePayment, 'id'>) => void;
  updateFeeStatus: (studentId: string, month: string, status: any) => void;

  // Reset to default sample data
  resetToDefaults: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      schoolInfo: initialSchoolInfo,
      students: initialStudents,
      rombels: initialRombels,
      subjects: initialSubjects,
      attendanceRecords: initialAttendanceRecords,
      grades: initialGrades,
      behaviorRecords: initialBehaviorRecords,
      feePayments: initialFeePayments,
      schedules: initialSchedule,

      selectedRombelId: 'R11-IPA1',
      setSelectedRombelId: (id) => set({ selectedRombelId: id }),

      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      updateSchoolInfo: (info) =>
        set((state) => ({ schoolInfo: { ...state.schoolInfo, ...info } })),

      addStudent: (studentData) => {
        const id = `STD-${Date.now().toString().slice(-4)}`;
        const newStudent: Student = {
          nis: id,
          name: '',
          class: '1A',
          gender: 'L',
          dob: '',
          address: '',
          parentName: '',
          status: 'Aktif',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...studentData,
          id,
          behaviorPoints: 100,
        };
        set((state) => ({ students: [newStudent, ...state.students] }));
      },

      updateStudent: (id, updatedData) => {
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? { ...s, ...updatedData } : s)),
        }));
      },

      deleteStudent: (id) => {
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
          attendanceRecords: state.attendanceRecords.filter((a) => a.studentId !== id),
          grades: state.grades.filter((g) => g.studentId !== id),
          behaviorRecords: state.behaviorRecords.filter((b) => b.studentId !== id),
          feePayments: state.feePayments.filter((f) => f.studentId !== id),
        }));
      },

      markAttendance: (studentId, classId, status, note = '') => {
        const today = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        set((state) => {
          const existingIndex = state.attendanceRecords.findIndex(
            (a) => a.studentId === studentId && a.date === today
          );

          let updatedRecords = [...state.attendanceRecords];
          if (existingIndex >= 0) {
            updatedRecords[existingIndex] = {
              ...updatedRecords[existingIndex],
              status,
              time,
              note,
            };
          } else {
            updatedRecords.push({
              id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              studentId,
              classId,
              date: today,
              status,
              time,
              note,
            });
          }
          return { attendanceRecords: updatedRecords };
        });
      },

      bulkMarkAttendance: (classId, date, status) => {
        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const classStudents = get().students.filter((s) => (s.classId === classId || s.class === classId || matchClass(s.class, classId)) && matchStatusActive(s.status));

        set((state) => {
          let updated = [...state.attendanceRecords];
          classStudents.forEach((st) => {
            const idx = updated.findIndex((a) => a.studentId === st.id && a.date === date);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], status, time };
            } else {
              updated.push({
                id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                studentId: st.id,
                classId,
                date,
                status,
                time,
              });
            }
          });
          return { attendanceRecords: updated };
        });
      },

      saveGrade: (gradeData) => {
        const nilaiAkhir = Math.round(
          gradeData.nilaiTugas * 0.3 + gradeData.nilaiUTS * 0.3 + gradeData.nilaiUAS * 0.4
        );
        let predikat: 'A' | 'B' | 'C' | 'D' = 'D';
        if (nilaiAkhir >= 88) predikat = 'A';
        else if (nilaiAkhir >= 78) predikat = 'B';
        else if (nilaiAkhir >= 70) predikat = 'C';

        set((state) => {
          if (gradeData.id) {
            return {
              grades: state.grades.map((g) =>
                g.id === gradeData.id
                  ? { ...g, ...gradeData, nilaiAkhir, predikat }
                  : g
              ),
            };
          } else {
            // Check if record exists for same student, subject, semester, academicYear
            const existingIdx = state.grades.findIndex(
              (g) =>
                g.studentId === gradeData.studentId &&
                g.subjectId === gradeData.subjectId &&
                g.semester === gradeData.semester &&
                g.academicYear === gradeData.academicYear
            );

            if (existingIdx >= 0) {
              const updatedGrades = [...state.grades];
              updatedGrades[existingIdx] = {
                ...updatedGrades[existingIdx],
                ...gradeData,
                nilaiAkhir,
                predikat,
              };
              return { grades: updatedGrades };
            } else {
              const newGrade: GradeRecord = {
                id: `GRD-${Date.now()}`,
                ...gradeData,
                nilaiAkhir,
                predikat,
              };
              return { grades: [newGrade, ...state.grades] };
            }
          }
        });
      },

      addBehaviorRecord: (record) => {
        const newRecord: BehaviorRecord = {
          ...record,
          id: `BHV-${Date.now()}`,
        };

        set((state) => {
          // Adjust student points
          const updatedStudents = state.students.map((s) => {
            if (s.id === record.studentId) {
              const newPoints = record.type === 'Prestasi'
                ? s.behaviorPoints + record.points
                : s.behaviorPoints - Math.abs(record.points);
              return { ...s, behaviorPoints: Math.max(0, newPoints) };
            }
            return s;
          });

          return {
            behaviorRecords: [newRecord, ...state.behaviorRecords],
            students: updatedStudents,
          };
        });
      },

      deleteBehaviorRecord: (id) => {
        set((state) => ({
          behaviorRecords: state.behaviorRecords.filter((b) => b.id !== id),
        }));
      },

      markFeePaid: (feeId, date, invoiceNo) => {
        set((state) => ({
          feePayments: state.feePayments.map((f) =>
            f.id === feeId
              ? { ...f, status: 'Lunas', paymentDate: date, invoiceNo }
              : f
          ),
        }));
      },

      addFeePayment: (payment) => {
        const id = `FEE-${Date.now()}`;
        set((state) => ({
          feePayments: [{ ...payment, id }, ...state.feePayments],
        }));
      },

      addAttendanceRecord: (record) => {
        set((state) => {
          const existingIdx = state.attendanceRecords.findIndex(
            (a) => a.studentId === record.studentId && a.date === record.date
          );
          let updated = [...state.attendanceRecords];
          if (existingIdx >= 0) {
            updated[existingIdx] = { ...updated[existingIdx], status: record.status };
          } else {
            updated.push({
              id: `ATT-${Date.now()}`,
              studentId: record.studentId,
              classId: record.classId,
              date: record.date,
              status: record.status,
              time: record.checkInTime || '07:00',
            });
          }
          return { attendanceRecords: updated };
        });
      },

      updateGrade: (data) => {
        set((state) => {
          const existingIdx = state.grades.findIndex(
            (g) => g.studentId === data.studentId && g.subjectId === data.subjectId
          );
          let updated = [...state.grades];
          if (existingIdx >= 0) {
            updated[existingIdx] = {
              ...updated[existingIdx],
              nilaiTugas: data.tugas,
              nilaiUTS: data.uts,
              nilaiUAS: data.uas,
              nilaiAkhir: data.nilaiAkhir,
              catatan: data.capaianKompetensi,
            };
          }
          return { grades: updated };
        });
      },

      updateFeeStatus: (studentId, month, status) => {
        set((state) => {
          const existingIdx = state.feePayments.findIndex(
            (f) => f.studentId === studentId && f.month === month
          );
          let updated = [...state.feePayments];
          if (existingIdx >= 0) {
            updated[existingIdx] = { ...updated[existingIdx], status };
          } else {
            updated.push({
              id: `FEE-${Date.now()}`,
              studentId,
              month,
              amount: 450000,
              status,
            });
          }
          return { feePayments: updated };
        });
      },

      resetToDefaults: () => {
        set({
          schoolInfo: initialSchoolInfo,
          students: initialStudents,
          rombels: initialRombels,
          subjects: initialSubjects,
          attendanceRecords: initialAttendanceRecords,
          grades: initialGrades,
          behaviorRecords: initialBehaviorRecords,
          feePayments: initialFeePayments,
          schedules: initialSchedule,
          selectedRombelId: 'R11-IPA1',
        });
      },
    }),
    {
      name: 'sista-rombel-storage',
    }
  )
);
